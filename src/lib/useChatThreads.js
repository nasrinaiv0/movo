import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { apiUrl, isNativeApp } from './platform';
import { supabase } from './supabaseClient';
import { newRecordId } from './recordId';
import {
  CHAT_IDLE_MS, chatHistoryGeneration, deviceThread, deviceThreads, hasDeviceThread, historyThreads, identifyChatMessages,
  mergeChatMessages, readActiveChat, saveActiveChat, saveDeviceMessages,
} from './chatHistory';

export async function chatAccessToken(session) {
  const { data, error } = await supabase.auth.getSession();
  if (error || (data?.session?.user && data.session.user.id !== session?.user?.id)) return null;
  return data?.session?.access_token || session?.access_token;
}

async function getChat(token, query) {
  if (!token) throw new Error('invalid_session');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(apiUrl('/api/nasrinai/chat?' + new URLSearchParams(query)), {
      headers: { Authorization: 'Bearer ' + token }, signal: controller.signal,
    });
    if (!response.ok) throw new Error('history_load_failed');
    return await response.json();
  } finally { clearTimeout(timeout); }
}

export default function useChatThreads({ session, cloudMode, blocked, clearComposer }) {
  const owner = session?.user?.id ? 'user.' + session.user.id : 'guest';
  const cloud = Boolean(session?.user?.id && cloudMode && supabase);
  const activeKey = `movo.ai.active.v1.${owner}.${cloud ? 'cloud' : 'device'}`;
  const [initial] = useState(() => readActiveChat(activeKey));
  const [generation] = useState(chatHistoryGeneration);
  const active = useRef(initial);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(Boolean(initial));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState({ rows: [], next: null, status: '' });
  const [deviceRows, setDeviceRows] = useState([]);
  const [deviceHistoryError, setDeviceHistoryError] = useState(false);
  const [deviceHistoryLoading, setDeviceHistoryLoading] = useState(false);
  const [olderOffset, setOlderOffset] = useState(null);
  const [historyError, setHistoryError] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const threadEpoch = useRef(0);
  const listEpoch = useRef(0);
  const mounted = useRef(true);
  const pending = useRef([]);
  const saving = useRef(null);
  const timer = useRef(null);
  const hold = useRef(false);
  hold.current = blocked || loading;

  const remember = useCallback((thread) => {
    active.current = thread;
    saveActiveChat(activeKey, thread);
  }, [activeKey]);

  const flushDevice = useCallback(() => {
    if (saving.current) return saving.current;
    if (!pending.current.length) return Promise.resolve(true);
    saving.current = (async () => {
      while (pending.current.length) {
        const { thread, items } = pending.current[0];
        await saveDeviceMessages(owner, thread, items, generation);
        pending.current.shift();
      }
      if (mounted.current) setStorageError(false);
      return true;
    })().catch(() => {
      // Keep the unsaved conversation on screen if device storage is full or blocked.
      if (mounted.current) setStorageError(true);
      return false;
    }).finally(() => { saving.current = null; });
    return saving.current;
  }, [generation, owner]);

  const startNew = useCallback((discardDraft = false) => {
    if (pending.current.length) {
      const before = active.current;
      flushDevice().then((saved) => {
        if (saved && mounted.current && active.current === before && !hold.current) startNew(discardDraft);
      });
      return false;
    }
    threadEpoch.current += 1;
    remember(null);
    setMessages([]);
    setOlderOffset(null);
    setLoading(false);
    setHistoryError(false);
    clearComposer(discardDraft);
    return true;
  }, [clearComposer, flushDevice, remember]);

  const checkIdle = useCallback(function check() {
    clearTimeout(timer.current);
    const thread = active.current;
    if (!thread) return;
    const remaining = CHAT_IDLE_MS - (Date.now() - thread.activity);
    if (remaining <= 0 && !hold.current) {
      startNew();
      return;
    }
    timer.current = setTimeout(check, remaining > 0 ? remaining : 1000);
  }, [startNew]);

  const touch = useCallback(() => {
    checkIdle();
    if (active.current) remember({ ...active.current, activity: Date.now() });
    checkIdle();
    return active.current;
  }, [checkIdle, remember]);

  const appendDevice = (items) => {
    const thread = { ...active.current, id: active.current?.id || newRecordId(), activity: Date.now() };
    remember(thread);
    const identified = identifyChatMessages(items);
    pending.current.push({ thread, items: identified });
    flushDevice();
    setMessages((current) => [...current, ...identified]);
    checkIdle();
  };

  const attachCloud = (cloudId) => {
    if (!cloudId) return;
    const linking = active.current?.cloudId !== cloudId;
    const id = active.current?.id || cloudId;
    const thread = { id, cloudId, activity: Date.now() };
    remember(thread);
    if (linking && (hasDeviceThread(owner, id) || pending.current.length)) {
      pending.current.push({ thread, items: [] });
      flushDevice();
    }
    setOlderOffset((offset) => offset === null ? null : offset + 2);
    checkIdle();
  };

  const loadThread = useCallback(async (thread, offset = 0, includeDevice = false) => {
    const epoch = ++threadEpoch.current;
    setLoading(true);
    setHistoryError(false);
    try {
      if (includeDevice) {
        const local = await deviceThread(owner, thread.id).catch(() => {
          if (epoch === threadEpoch.current) setHistoryError(true);
          return null;
        });
        if (epoch !== threadEpoch.current) return;
        setMessages(local?.messages || []);
      }
      if (cloud && thread.cloudId) {
        const token = await chatAccessToken(sessionRef.current);
        const result = await getChat(token, { conversationId: thread.cloudId, messageOffset: offset });
        if (epoch !== threadEpoch.current) return;
        setMessages((current) => mergeChatMessages(result.messages || [], current));
        setOlderOffset(result.nextMessageOffset ?? null);
      }
    } catch {
      if (epoch === threadEpoch.current) setHistoryError(true);
    } finally {
      if (epoch === threadEpoch.current) setLoading(false);
    }
  }, [cloud, owner]);

  useEffect(() => {
    mounted.current = true;
    if (initial) loadThread(initial, 0, true);
    const resume = () => { if (document.visibilityState !== 'hidden') checkIdle(); };
    checkIdle();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    window.addEventListener('pageshow', resume);
    const nativeResume = isNativeApp() ? CapApp.addListener('resume', checkIdle) : null;
    return () => {
      mounted.current = false;
      threadEpoch.current += 1;
      listEpoch.current += 1;
      clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
      window.removeEventListener('pageshow', resume);
      nativeResume?.then((handle) => handle.remove()).catch(() => {});
    };
  }, [checkIdle, cloud, initial, loadThread]);

  useEffect(() => { checkIdle(); }, [blocked, loading, checkIdle]);

  const loadList = async (offset = 0) => {
    const epoch = ++listEpoch.current;
    if (!cloud) {
      setHistoryPage({ rows: [], next: null, status: '' });
      return;
    }
    setHistoryPage((current) => ({ rows: offset ? current.rows : [], next: offset || null, status: 'loading' }));
    try {
      const token = await chatAccessToken(sessionRef.current);
      const result = await getChat(token, { history: '1', offset });
      if (epoch !== listEpoch.current) return;
      setHistoryPage((current) => ({
        rows: [...new Map([...(offset ? current.rows : []), ...(result.conversations || [])].map((row) => [row.id, row])).values()],
        next: result.nextOffset ?? null, status: '',
      }));
    } catch {
      if (epoch === listEpoch.current) setHistoryPage((current) => ({ ...current, status: 'error' }));
    }
  };

  const loadDeviceList = async () => {
    setDeviceHistoryError(false);
    setDeviceHistoryLoading(true);
    try {
      await flushDevice();
      const rows = await deviceThreads(owner);
      if (mounted.current) setDeviceRows(rows);
    } catch {
      if (mounted.current) setDeviceHistoryError(true);
    } finally {
      if (mounted.current) setDeviceHistoryLoading(false);
    }
  };

  const openHistory = () => {
    touch();
    setHistoryOpen(true);
    loadDeviceList();
    loadList();
  };

  const openThread = async (thread) => {
    if (pending.current.length && !await flushDevice()) return;
    if (!mounted.current) return;
    threadEpoch.current += 1;
    clearComposer(false);
    const next = { id: thread.id, cloudId: thread.cloudId, activity: Date.now() };
    remember(next);
    setMessages([]);
    setOlderOffset(null);
    setHistoryError(false);
    setHistoryOpen(false);
    loadThread(next, 0, true);
    checkIdle();
  };

  const loadOlder = () => {
    if (active.current) loadThread(active.current, olderOffset ?? 0, historyError && olderOffset === null);
  };

  return {
    messages, setMessages, loading, historyError, storageError,
    touch, appendDevice, attachCloud, startNew, mounted, threadEpoch,
    historyOpen, openHistory, closeHistory: () => setHistoryOpen(false), openThread,
    rows: historyOpen ? historyThreads(deviceRows, historyPage.rows) : [],
    deviceHistoryError, deviceHistoryLoading, loadDeviceList,
    listStatus: historyPage.status, listMore: historyPage.next !== null && historyPage.status === '',
    loadMore: () => loadList(historyPage.next ?? 0),
    olderOffset, loadOlder,
  };
}
