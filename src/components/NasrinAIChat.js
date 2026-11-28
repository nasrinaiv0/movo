import { startDeviceSpeech, setAudioSessionType } from '../lib/deviceSpeech';
import { usePlan } from '../lib/PlanContext';
import Icon, { NasrinMark } from './Icon';
import NasrinAIMessage from './NasrinAIMessage';
import ChatChart from './ChatChart';
import { categoryOf } from '../lib/categories';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { readImageText } from '../lib/ocr';
import { t as tr, rich, getLanguage } from '../lib/i18n';
import { parseLogMessage } from '../lib/chatLog';
import { money, shown, formatDate } from '../lib/format';
import { Sheet, Tile } from './ui';
import { MovoMark } from './MovoLogo';
import { SubIcon } from '../screens/Subscriptions';
import { catalogFor } from '../lib/subscriptions';
import { MOVO_FINANCIAL_SUGGESTIONS, MOVO_PLACEHOLDER_EXAMPLES } from '../lib/movoPrompts';
import { readAIConsent, setAIConsent, watchAIConsent } from '../lib/aiConsent';
import legalCore from '../lib/legalCore.json';

const readAck = readAIConsent;
const MAX = 1600;
import './NasrinAIChat.css';
import { apiUrl } from '../lib/platform';
import useChatThreads, { chatAccessToken } from '../lib/useChatThreads';
import { identifyChatMessages } from '../lib/chatHistory';

function friendlyError(code) {
  if (code === 'content_not_supported') return tr('This request or response was not supported by our safety checks. Try rephrasing your finance question.');
  if (code === 'nasrinai_scope_unconfirmed') return tr('NasrinAI did not confirm it used only your Movo data, so its reply was not shown.');
  if (code === 'sign_in_required' || code === 'invalid_session') return tr('Sign in to MOVO to use your private financial copilot.');
  if (code === 'pro_required') return tr('Free can read your stored balances and transactions. Pro unlocks full NasrinAI. Use Add transaction to record expenses.');
  if (code === 'nasrinai_not_configured') return tr('NasrinAI is not configured on the MOVO server yet.');
  if (code === 'conversation_not_found') return tr('This conversation is not available in your account.');
  if (code === 'financial_context_consent_required') return tr('Please confirm consent before sharing financial context with NasrinAI.');
  if (code === 'nasrinai_auth_rejected') return tr('MOVO reached NasrinAI, but the service rejected its server authentication. This is a configuration issue; please try again later.');
  if (code === 'nasrinai_rate_limited') return tr('NasrinAI is temporarily busy. Please wait a moment and try again.');
  if (code === 'nasrinai_timeout') return tr('NasrinAI took too long to respond. Your request was not saved; please try again.');
  if (code === 'nasrinai_unreachable') return tr('MOVO could not connect to NasrinAI. Please check your connection and try again.');
  if (code === 'nasrinai_request_rejected' || code === 'invalid_nasrinai_response' || code === 'nasrinai_conversation_missing') return tr('NasrinAI could not process this request format. Please try a shorter question or contact support if it continues.');
  return tr('NasrinAI could not answer right now. Please try again shortly.');
}

const TRANSIENT = new Set(['nasrinai_request_failed', 'nasrinai_timeout', 'nasrinai_unreachable', 'chat_request_failed', 'invalid_nasrinai_response']);

const PHASE_LABELS = { reading: 'Reading your records…', thinking: 'Thinking…', almost: 'Almost there…' };

/** A record logged from chat: what was saved, where, and a one-tap undo. */
function LogCard({ items, removed, show, onUndo, onLogAnyway, onView }) {
  return <div className="chat-log-card">
    {items.map(row => {
      const gone = removed.includes(row.id);
      const sign = row.transaction_type === 'income' ? '+' : '−';
      return <div key={row.id} className={`chat-log-row${gone ? ' gone' : ''}${row.duplicateOf ? ' duplicate' : ' added'}`}>
        {catalogFor(row.merchant) ? <SubIcon sub={{ name: row.merchant }} size={40} /> : <Tile name={row.merchant} size={40} radius={12} />}
        <span className="chat-log-main"><strong>{row.merchant}</strong><small>{[tr(categoryOf(row.category).label), row.accountName, new Date(row.occurred_at).toDateString() === new Date().toDateString() ? tr('Today') : formatDate(row.occurred_at, { month: 'short', day: 'numeric' }, 'md')].filter(Boolean).join(' · ')}</small></span>
        <span className={`chat-log-amount ${row.transaction_type}`}>{sign}{shown(show, money(row.amount, row.currency))}</span>
        <span className="chat-log-status">{row.duplicateOf
          ? <><span className="dup"><Icon name="info" size={13} strokeWidth={2.4} />{tr('Already logged on {date}. Not added twice.', { date: formatDate(row.duplicateOf.occurred_at, { month: 'short', day: 'numeric' }, 'md') })}</span><button type="button" className="link-button" onClick={() => onLogAnyway(row)}>{tr('Log anyway')}</button></>
          : gone
          ? <span className="muted">{tr('Removed')}</span>
          : <><span className="ok"><span className="chat-log-mark" aria-hidden="true"><MovoMark size={16} /></span>{tr('Added to your transactions')}</span><span className="chat-log-actions">{onView && <button type="button" className="link-button" onClick={() => onView(row)}>{tr('View')}</button>}<button type="button" className="link-button" onClick={() => onUndo(row.id)}>{tr('Undo')}</button></span></>}
        </span>
      </div>;
    })}
  </div>;
}

/** Reads a recorded audio Blob. Blob.arrayBuffer is missing on older iOS Safari (before 14), so fall back to FileReader. */
const blobBuffer = (blob) => (typeof blob.arrayBuffer === 'function' ? blob.arrayBuffer() : new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error);
  reader.readAsArrayBuffer(blob);
}));

export default function NasrinAIChat(props) {
  return <ChatSession key={JSON.stringify([props.session?.user?.id || null, Boolean(props.cloudMode)])} {...props} />;
}

// Safety UI uses the canonical translation catalogue. No message text is transmitted.
function AIReportControl({ session, messageId }) {
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('');
  const request = useRef(null);
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);
  async function submit(event) {
    event.preventDefault();
    if (!reason || request.current || status === 'sent') return;
    const controller = new AbortController();
    request.current = controller;
    setStatus('sending');
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const token = await chatAccessToken(session);
      if (!token || controller.signal.aborted) throw new Error('session');
      const response = await fetch(apiUrl('/api/nasrinai/chat'), {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'report', messageId, reason })
      });
      const result = await response.json().catch(() => ({}));
      if (request.current === controller) setStatus(response.ok && result.ok === true && typeof result.reportId === 'string' ? 'sent' : 'error');
    } catch {
      if (request.current === controller) setStatus('error');
    } finally {
      clearTimeout(timer);
      if (request.current === controller) request.current = null;
    }
  }
  return <details className="movo-ai-report">
    <summary>{tr('Report AI response')}</summary>
    <form onSubmit={submit}>
      <p>{tr('Send a response reference and reason to MOVO for safety review. Your report does not send a new AI request.')}</p>
      <label>{tr('AI report reason')}
        <select value={reason} onChange={event => setReason(event.target.value)} disabled={status === 'sending' || status === 'sent'} required>
          <option value="">{tr('Choose an AI report reason')}</option><option value="harmful">{tr('AI response: harmful or abusive')}</option><option value="deceptive">{tr('AI response: deceptive or unsafe advice')}</option><option value="privacy">{tr('AI response: privacy concern')}</option><option value="other">{tr('AI response: other concern')}</option>
        </select>
      </label>
      <button type="submit" className="secondary-button" disabled={!reason || status === 'sending' || status === 'sent'}>{status === 'sending' ? tr('Sending AI report…') : tr('Submit report')}</button>
      <p role="status" aria-live="polite">{status === 'sent' ? tr('Report received.') : status === 'error' ? tr('Report not received. Try again, or contact support@nasrinai.com.') : ''}</p>
    </form>
  </details>;
}

function ChatSession({ session, cloudMode, onOpenLegal, onSignIn, onLog, onUndoLog, onViewLog, onLocalAnswer, onLocalChart, shortcuts = [], show = true }) {
  const [draft, setDraft] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setPlaceholderIndex((index) => (index + 1) % MOVO_PLACEHOLDER_EXAMPLES.length), 2600);
    return () => window.clearInterval(timer);
  }, []);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const pendingVoiceTextsRef = useRef([]);
  busyRef.current = busy;
  const [error, setError] = useState('');
  const { can, requireFeature } = usePlan();
  const [privacyAccepted, setPrivacyAccepted] = useState(() => readAck(session?.user?.id));
  const privacyAcceptedRef = useRef(privacyAccepted);
  privacyAcceptedRef.current = privacyAccepted;
  const [consentOpen, setConsentOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [speaking, setSpeaking] = useState(-1);
  const [transcribing, setTranscribing] = useState(false);
  const [recordAction, setRecordAction] = useState(false);
  // The iPhone's level meter can read pure silence after the mic starts; then voice falls back to tap-to-finish.
  const [voiceManual, setVoiceManual] = useState(false);
  const fileRef = useRef(null);
  const [phase, setPhase] = useState('reading');
  const clearComposer = useCallback((discardDraft) => {
    setError('');
    if (discardDraft) setDraft('');
  }, []);
  const chatBlocked = busy || listening || attaching || transcribing || speaking >= 0 || recordAction;
  const threads = useChatThreads({ session, cloudMode, blocked: chatBlocked, clearComposer });
  const { messages, setMessages, appendDevice, touch, loading, threadEpoch: requestEpochRef } = threads;
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const composerRef = useRef(null);
  const chatRef = useRef(null);
  // The composer is pinned above the tab bar; the thread keeps room for its current height.
  useEffect(() => {
    const el = composerRef.current; const host = chatRef.current;
    if (!el || !host || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => host.style.setProperty('--composer-h', `${Math.ceil(el.offsetHeight)}px`));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = inputRef.current; if (!el) return;
    el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);

  useEffect(() => {
    if (!busy) return undefined;
    setPhase('reading');
    const toThinking = setTimeout(() => setPhase('thinking'), 1400);
    const toAlmost = setTimeout(() => setPhase('almost'), 7000);
    return () => { clearTimeout(toThinking); clearTimeout(toAlmost); };
  }, [busy]);

  const newestMessage = messages.at(-1);
  useEffect(() => { if (typeof endRef.current?.scrollIntoView === 'function') endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [newestMessage, busy]);

  // Transcribed voice is dictation first: keep it visible and editable in the composer.
  // If a segment finishes while chat is busy, append it after the request settles instead of auto-sending it.
  useEffect(() => {
    if (busy || !pendingVoiceTextsRef.current.length) return;
    const queued = pendingVoiceTextsRef.current.splice(0);
    if (queued.length) setDraft((current) => [current.trim(), ...queued].filter(Boolean).join(' ').slice(0, MAX));
  }, [busy]);

  const userId = session?.user?.id;
  const needsConsent = can('fullAI') && Boolean(userId && cloudMode);
  useEffect(() => {
    if (needsConsent && !readAck(userId)) setConsentOpen(true);
  }, [needsConsent, userId]);

  const send = async (event, spoken) => {
    event?.preventDefault?.();
    const message = String(spoken ?? draft).trim();
    if (!message || busyRef.current || loading) return;
    const thread = touch();
    const conversationId = thread?.cloudId || null;
    const requestEpoch = requestEpochRef.current;
    const isCurrentRequest = () => threads.mounted.current && requestEpochRef.current === requestEpoch;
    const localUser = { role: 'user', content: message, local: true };
    // Logging is handled on this device and never sent to NasrinAI, so it needs no sign-in or AI consent.
    const entries = onLog && can('fullAI') ? parseLogMessage(message) : [];
    if (entries.length) {
      setError(''); setDraft('');
      busyRef.current = true;
      setBusy(true);
      try {
        const items = await onLog(entries);
        if (!isCurrentRequest()) return;
        const added = items.filter(i => !i.duplicateOf).length;
        const content = added ? tr('Logged {n} record(s).', { n: added }) : tr('That was already logged, so I did not add it twice.');
        appendDevice([localUser, { role: 'log', items, removed: [], content }]);
        say(content);
      } catch (cause) {
        if (!isCurrentRequest()) return;
        const content = cause.message === 'account_required' ? tr('Add an account or card in Wallet first, then I can log this for you.') : tr('That could not be saved. Please try again.');
        appendDevice([localUser, { role: 'assistant', content }]); say(content);
      } finally {
        if (isCurrentRequest()) { busyRef.current = false; setBusy(false); if (!voiceRef.current) inputRef.current?.focus(); }
      }
      return;
    }
    // A request for a chart, graph, breakdown or trend is drawn at once from the records on this device, online or
    // offline and on any plan (lib/chatCharts); nothing is sent to NasrinAI.
    const drawn = onLocalChart ? onLocalChart(message) : null;
    if (drawn?.chart) {
      setError(''); setDraft('');
      appendDevice([localUser, { role: 'assistant', content: drawn.text, chart: drawn.chart }]);
      say(drawn.text);
      return;
    }
    // Common questions are answered at once from the records on this device; nothing is sent to NasrinAI.
    const local = onLocalAnswer ? onLocalAnswer(message) : null;
    if (local) {
      setError(''); setDraft('');
      appendDevice([localUser, { role: 'assistant', content: local }]);
      say(local);
      return;
    }
    if (!can('fullAI')) {
      setDraft('');
      appendDevice([localUser, { role: 'assistant', content: 'Free can read your stored balances and transactions. Pro unlocks full NasrinAI. Use Add transaction to record expenses.' }]);
      return;
    }
    if (!session?.user || !cloudMode || !supabase) {
      setDraft('');
      appendDevice([localUser, { role: 'assistant', content: tr('I can log records here on this device. Try “Spent 250 on Grab”, “Salary 50000”, or several lines at once. Sign in to ask me questions about your money.') }]);
      return;
    }
    if (!privacyAccepted) {
      setConsentOpen(true);
      return;
    }
    setError('');
    setDraft('');
    const [optimistic] = identifyChatMessages([{ role: 'user', content: message }]);
    setMessages((current) => [...current, optimistic]);
    busyRef.current = true;
    setBusy(true);
    try {
      const accessToken = await chatAccessToken(session);
      if (!isCurrentRequest()) return;
      if (!accessToken) throw new Error('invalid_session');
      const ask = () => {
        if (!privacyAcceptedRef.current) throw new Error('financial_context_consent_required');
        return fetch(apiUrl('/api/nasrinai/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
        body: JSON.stringify({ message, conversationId, consent: privacyAccepted, language: getLanguage().code, voiceMode: voiceRef.current })
        });
      };
      let response = await ask();
      let result = await response.json().catch(() => ({}));
      // A momentary NasrinAI failure is retried once before telling the person.
      if (!response.ok && TRANSIENT.has(result.error || 'chat_request_failed') && isCurrentRequest()) {
        await new Promise(resolve => setTimeout(resolve, 1200));
        if (!isCurrentRequest()) return;
        response = await ask(); result = await response.json().catch(() => ({}));
      }
      if (!isCurrentRequest()) return;
      if (!response.ok) throw new Error(result.error || 'chat_request_failed');
      threads.attachCloud(result.conversationId);
      const saved = result.messages?.length ? result.messages
        : [optimistic, ...identifyChatMessages([{ role: 'assistant', content: result.reply }])];
      setMessages((current) => [...current.filter((item) => item.id !== optimistic.id), ...saved]);
      say(result.reply, result.audioParts);
    } catch (cause) {
      if (!isCurrentRequest()) return;
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
      setDraft(message);
      // The short code lets support find the exact cause in the server log; it carries no personal data.
      const code = /^[a-z_]{3,60}$/.test(cause.message || '') ? cause.message : 'chat_request_failed';
      setError(`${friendlyError(code)} ${tr('Error code: {code}', { code })}`);
    } finally {
      if (isCurrentRequest()) {
        busyRef.current = false;
        setBusy(false);
        inputRef.current?.focus();
      }
    }
  };

  const logAnyway = async (index, row) => {
    if (recordAction || !requireFeature('fullAI')) return;
    setRecordAction(true);
    try {
      const [added] = await onLog([row.entry], true);
      setMessages((current) => current.map((m, i) => (i === index ? { ...m, items: m.items.map(x => (x.id === row.id ? added : x)) } : m)));
    } catch { setError(tr('That could not be saved. Please try again.')); }
    finally { setRecordAction(false); }
  };

  const undo = async (index, id) => {
    if (recordAction || !requireFeature('fullAI')) return;
    setRecordAction(true);
    try {
      // The app asks first; a cancelled confirmation leaves the record and the chat as they were.
      if (await onUndoLog?.(id) === false) return;
      setMessages((current) => current.map((m, i) => (i === index ? { ...m, removed: [...m.removed, id] } : m)));
    } catch { setError(tr('That record could not be removed. Please try again.')); }
    finally { setRecordAction(false); }
  };

  const accept = () => {
    setAIConsent(session.user.id, true);
    setPrivacyAccepted(true); setConsentOpen(false); setError('');
    inputRef.current?.focus();
  };

  const append = (text) => setDraft((cur) => `${cur ? `${cur.trimEnd()}\n` : ''}${text}`.slice(0, MAX));

  /* Hands-free voice uses NasrinAI's model-backed STT and TTS through the
     authenticated MOVO proxy. Audio stays transient; no provider key reaches the browser. */
  const voiceRef = useRef(false);
  const spokenRef = useRef('');
  const audioQueueRef = useRef([]);
  const audioPlayingRef = useRef(false);
  const currentAudioRef = useRef(null);
  const deviceSpeechRef = useRef(null);
  const listenSpeechRef = useRef(null);
  const speechStartRef = useRef(0);
  const loudFramesRef = useRef(0);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const captureFinalizersRef = useRef(new Set());
  const audioContextRef = useRef(null);
  const frameRef = useRef(null);
  const heardSpeechRef = useRef(false);
  const lastVoiceAtRef = useRef(0);
  const voiceGenerationRef = useRef(0);
  const transcriptionAbortRef = useRef(null);
  const pendingSegmentsRef = useRef(0);
  const segmentTimerRef = useRef(null);
  const transcriptionQueueRef = useRef(Promise.resolve());
  const finalSegmentRef = useRef(false);
  const voiceMountedRef = useRef(true);
  const plain = (text) => String(text || '').replace(/```[\s\S]*?```/g, ' ').replace(/[*_#>`|]/g, '').replace(/^\s*[-•]\s+/gm, '').replace(/\s+/g, ' ').trim();

  // Speech playback goes through the AudioContext that was created and resumed inside the mic tap, so iOS/Safari
  // autoplay rules allow it; if decoding fails it tries an <audio> element, and if that is blocked it reads the reply
  // with the device voice instead of staying silent.
  const playClip = (bytes, mime) => new Promise((resolve, reject) => {
    const context = audioContextRef.current;
    const viaElement = () => {
      const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      const audio = new Audio(url);
      const done = (ok) => { URL.revokeObjectURL(url); if (currentAudioRef.current?.el === audio) currentAudioRef.current = null; ok ? resolve() : reject(new Error('blocked')); };
      currentAudioRef.current = { el: audio, stop: () => { audio.pause(); done(true); } };
      audio.onended = () => done(true); audio.onerror = () => done(false);
      audio.play().catch(() => done(false));
    };
    if (!context || typeof context.decodeAudioData !== 'function') { viaElement(); return; }
    const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    let settled = false;
    const onDecoded = (buffer) => {
      if (settled) return; settled = true;
      if (!voiceRef.current) { resolve(); return; }
      const node = context.createBufferSource(); node.buffer = buffer; node.connect(context.destination);
      const entry = { stop: () => { try { node.stop(); } catch { /* already ended */ } } };
      currentAudioRef.current = entry;
      node.onended = () => { if (currentAudioRef.current === entry) currentAudioRef.current = null; resolve(); };
      if (context.state === 'suspended') context.resume().catch(() => {});
      node.start();
    };
    const onFailed = () => { if (settled) return; settled = true; viaElement(); };
    try { const pending = context.decodeAudioData(copy, onDecoded, onFailed); pending?.then?.(onDecoded, onFailed); } catch { onFailed(); }
  });

  const playVoiceParts = (parts, text) => {
    if (!Array.isArray(parts) || !parts.length) return false;
    audioQueueRef.current = parts.slice(0, 100);
    audioPlayingRef.current = true;
    const finish = () => { audioPlayingRef.current = false; spokenRef.current = ''; };
    const playNext = () => {
      if (!voiceRef.current || !audioQueueRef.current.length) { finish(); return; }
      const part = audioQueueRef.current.shift();
      let bytes;
      try {
        const binary = atob(part.data);
        bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      } catch { playNext(); return; }
      playClip(bytes, part.mime || 'audio/mpeg').then(playNext, () => {
        // Playback blocked: read the reply with the device voice rather than staying silent.
        audioQueueRef.current = []; audioPlayingRef.current = false;
        speakWithDevice(text);
      });
    };
    playNext();
    return true;
  };

  function speakWithDevice(text) {
    deviceSpeechRef.current?.cancel?.();
    const end = () => {
      deviceSpeechRef.current = null;
      audioPlayingRef.current = false;
      spokenRef.current = '';
    };
    const controller = startDeviceSpeech(plain(text).slice(0, 1800), {
      language: getLanguage().code || navigator.language || 'en-US',
      onEnd: end,
      onError: () => { end(); setError(tr('Couldn’t play the reply. Turn off silent mode or raise the volume, then try again.')); }
    });
    if (!controller) { end(); setError(tr('Speech playback is not available on this device.')); return; }
    deviceSpeechRef.current = controller;
    audioPlayingRef.current = true;
  }

  function say(text, audioParts) {
    if (!voiceRef.current) return;
    spokenRef.current = plain(text).toLowerCase().slice(0, 1200);
    if (audioParts?.length && playVoiceParts(audioParts, text)) return;
    speakWithDevice(text);
  }

  const stopPlayback = () => {
    audioQueueRef.current = [];
    try { currentAudioRef.current?.stop?.(); } catch { /* already stopped */ }
    currentAudioRef.current = null;
    deviceSpeechRef.current?.cancel?.();
    deviceSpeechRef.current = null;
    listenSpeechRef.current?.cancel?.();
    listenSpeechRef.current = null;
    audioPlayingRef.current = false;
    try { window.speechSynthesis?.cancel(); } catch { /* unavailable device speech engine */ }
  };

  const stopVoice = (discard = false) => {
    // An intentional Stop drains captured speech. Failure, interruption and
    // leaving the page discard unfinished audio and invalidate every old callback.
    finalSegmentRef.current = !discard && recorderRef.current?.state === 'recording';
    voiceRef.current = false; setListening(false); setVoiceManual(false);
    clearTimeout(segmentTimerRef.current);
    segmentTimerRef.current = null;
    if (discard) {
      voiceGenerationRef.current += 1;
      transcriptionAbortRef.current?.abort();
      transcriptionAbortRef.current = null;
      transcriptionQueueRef.current = Promise.resolve();
      pendingSegmentsRef.current = 0;
      heardSpeechRef.current = false;
      setTranscribing(false);
    }
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (discard) [...captureFinalizersRef.current].forEach(release => release());
    const recorder = recorderRef.current;
    const stream = streamRef.current;
    const context = audioContextRef.current;
    recorderRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
    let releaseTimer;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      clearTimeout(releaseTimer);
      captureFinalizersRef.current.delete(release);
      stream?.getTracks?.().forEach(track => track.stop());
      context?.close?.().catch(() => {});
      if (!voiceRef.current) setAudioSessionType('auto');
    };
    if (!discard && recorder?.state === 'recording') {
      // stop() emits the final encoded data asynchronously. Keep the microphone
      // and audio session alive until onstop, otherwise Safari can lose this clip.
      const onStopped = recorder.onstop;
      recorder.onstop = (...args) => { release(); onStopped?.(...args); };
      captureFinalizersRef.current.add(release);
      // A broken recorder must never retain microphone access indefinitely.
      releaseTimer = setTimeout(release, 1500);
    } else release();
    try { recorder?.stop?.(); } catch { release(); }
    stopPlayback();
    spokenRef.current = '';
  };

  useEffect(() => watchAIConsent(session?.user?.id, accepted => {
    privacyAcceptedRef.current = accepted;
    setPrivacyAccepted(accepted);
    if (!accepted) stopVoice(true);
    // Current resources are held in refs; one subscription per account session.
  }), [session?.user?.id]);

  const failVoice = (cause) => {
    stopVoice(true);
    const code = cause?.message;
    setError(code === 'invalid_session' || code === 'sign_in_required' || code === 'pro_required'
      ? friendlyError(code)
      : code === 'transcription_busy' ? friendlyError('nasrinai_rate_limited')
        : tr('Voice transcription is temporarily unavailable. Please try again.'));
  };

  const transcribeSegment = (blob, generation) => {
    if (!voiceMountedRef.current || generation !== voiceGenerationRef.current || !blob || blob.size < 120) return;
    // Bound transient audio held in memory if a connection is too slow.
    if (blob.size > 2_400_000 || pendingSegmentsRef.current >= 3) { failVoice(); return; }
    const accountEpoch = requestEpochRef.current;
    pendingSegmentsRef.current += 1;
    transcriptionQueueRef.current = transcriptionQueueRef.current
      .then(() => transcribeSegmentNow(blob, generation, accountEpoch))
      .catch(() => {})
      .finally(() => { if (generation === voiceGenerationRef.current) pendingSegmentsRef.current -= 1; });
  };

  const transcribeSegmentNow = async (blob, generation, accountEpoch) => {
    const isCurrent = () => voiceMountedRef.current && generation === voiceGenerationRef.current && accountEpoch === requestEpochRef.current;
    if (!isCurrent()) return;
    const controller = new AbortController();
    transcriptionAbortRef.current = controller;
    setTranscribing(true);
    let deadline;
    let onAbort;
    try {
      const request = async () => {
        const token = await chatAccessToken(session);
        if (!isCurrent() || controller.signal.aborted) return null;
        if (!token) throw new Error('invalid_session');
        const bytes = new Uint8Array(await blobBuffer(blob));
        if (!isCurrent() || controller.signal.aborted) return null;
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
        const response = await fetch(apiUrl('/api/nasrinai/chat'), {
          method: 'POST', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ action: 'transcribe', audioBase64: btoa(binary), mime: blob.type || 'audio/webm', consent: privacyAccepted })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'transcription_unavailable');
        if (typeof result.text !== 'string') throw new Error('transcription_unavailable');
        return result.text.trim();
      };
      const text = await Promise.race([request(), new Promise((_, reject) => {
        onAbort = () => reject(new Error('voice_cancelled'));
        controller.signal.addEventListener('abort', onAbort, { once: true });
        deadline = setTimeout(() => { reject(new Error('transcription_timeout')); controller.abort(); }, 40000);
      })]);
      if (text && isCurrent()) {
        const spoken = spokenRef.current;
        const heard = text.toLowerCase().split(/\s+/).filter(Boolean);
        const echo = spoken && heard.length && heard.filter(word => spoken.includes(word)).length / heard.length >= 0.7;
        if (!echo) {
          touch();
          stopPlayback();
          // Do not auto-submit or immediately clear the recognized words. Showing them in
          // the composer lets the user verify/correct dictation before sending financial data.
          if (busyRef.current) pendingVoiceTextsRef.current.push(text);
          else setDraft((current) => [current.trim(), text].filter(Boolean).join(' ').slice(0, MAX));
          setError('');
        }
      }
    } catch (cause) {
      if (isCurrent()) failVoice(cause);
    } finally {
      clearTimeout(deadline);
      controller.signal.removeEventListener('abort', onAbort);
      if (transcriptionAbortRef.current === controller) {
        transcriptionAbortRef.current = null;
        if (voiceMountedRef.current) setTranscribing(false);
      }
    }
  };

  const startVoice = async (generation, accountEpoch) => {
    const isCurrent = () => voiceMountedRef.current && voiceRef.current && generation === voiceGenerationRef.current && accountEpoch === requestEpochRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (!isCurrent()) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      stream.getTracks().forEach(track => track.addEventListener?.('ended', () => { if (isCurrent()) failVoice(); }, { once: true }));
      const context = audioContextRef.current;
      if (!context || typeof MediaRecorder === 'undefined') throw new Error('voice_not_supported');
      // iOS can leave the context 'interrupted' (not just 'suspended') once the microphone starts.
      if (context.state !== 'running') await context.resume().catch(() => {});
      if (!isCurrent()) return;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024; source.connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      let recorder = null;
      let segmentStart = 0;
      let peakRms = 0;
      let deadFrames = 0;
      let manual = false;
      const beginSegment = () => {
        if (!isCurrent() || recorder?.state === 'recording') return;
        try {
          const mime = typeof MediaRecorder.isTypeSupported === 'function'
            ? ['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(type => MediaRecorder.isTypeSupported(type)) || '' : '';
          try { recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); }
          catch { recorder = new MediaRecorder(stream); }
          const chunks = []; segmentStart = Date.now(); peakRms = 0;
          const activeRecorder = recorder;
          activeRecorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
          activeRecorder.onstop = () => {
            if (!voiceMountedRef.current || generation !== voiceGenerationRef.current || accountEpoch !== requestEpochRef.current) return;
            const blob = new Blob(chunks, { type: activeRecorder.mimeType || 'audio/webm' });
            const final = finalSegmentRef.current && !voiceRef.current;
            finalSegmentRef.current = false;
            const hasSpeech = heardSpeechRef.current || (final && Date.now() - segmentStart >= 600 && peakRms >= 0.006);
            heardSpeechRef.current = false;
            // When stopped manually, always check a sufficiently long final clip: quiet
            // speech on iOS may fall below the visual voice-activity threshold.
            if (hasSpeech || (final && Date.now() - segmentStart >= 600)) transcribeSegment(blob, generation);
            if (isCurrent()) segmentTimerRef.current = setTimeout(beginSegment, 100);
          };
          activeRecorder.onerror = () => { if (isCurrent()) failVoice(); };
          recorderRef.current = recorder;
          recorder.start();
        } catch (cause) { if (isCurrent()) failVoice(cause); }
      };
      beginSegment();
      const detect = () => {
        if (!isCurrent()) return;
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        let flat = true;
        for (let i = 0; i < samples.length; i += 1) { if (samples[i] !== 128) flat = false; const v = (samples[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / samples.length);
        // A real microphone is never perfectly flat. About 1.5 s of exact zeros means the meter is not receiving the
        // mic (seen on iPhone): keep recording and let the person tap the mic when they are done.
        if (!manual) {
          deadFrames = flat ? deadFrames + 1 : 0;
          if (deadFrames > 90 && !heardSpeechRef.current) {
            manual = true; setVoiceManual(true);
            if (context.state !== 'running') context.resume().catch(() => {});
          }
        }
        peakRms = Math.max(peakRms, rms);
        const now = Date.now();
        // A short burst during TTS may be speaker echo. Require sustained, louder
        // input before treating it as barge-in; then stop playback immediately.
        if (audioPlayingRef.current) {
          loudFramesRef.current = rms > 0.07 ? loudFramesRef.current + 1 : 0;
          if (loudFramesRef.current >= 5) {
            stopPlayback();
            loudFramesRef.current = 0;
            heardSpeechRef.current = true;
            lastVoiceAtRef.current = now;
          }
        } else if (rms > 0.01) {
          if (!heardSpeechRef.current) speechStartRef.current = now;
          heardSpeechRef.current = true; lastVoiceAtRef.current = now;
        }
        if (recorder?.state === 'recording' && manual) {
          // Tap-to-finish: one clip until the mic is tapped, sent every 55 s so long dictation is not lost.
          if (now - segmentStart > 55000) { heardSpeechRef.current = true; recorder.stop(); }
        } else if (recorder?.state === 'recording') {
          // Speech ends after a short pause (or 12 s of talking); silent stretches are discarded every 8 s so the
          // next sentence is not cut short or sent with a minute of silence in front of it.
          if (heardSpeechRef.current ? (now - lastVoiceAtRef.current > 950 || now - speechStartRef.current > 12000) : now - segmentStart > 8000) recorder.stop();
        }
        frameRef.current = requestAnimationFrame(detect);
      };
      frameRef.current = requestAnimationFrame(detect);
    } catch {
      if (!isCurrent()) return;
      setError(tr('Allow microphone access and use a browser that supports audio recording to talk with NasrinAI.'));
      stopVoice(true);
    }
  };

  const toggleMic = () => {
    if (voiceRef.current) { stopVoice(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(tr('Model-backed voice input is not supported in this browser.'));
      return;
    }
    if (!requireFeature('fullAI')) return;
    if (!session?.user || !cloudMode || !privacyAccepted) {
      if (!privacyAccepted) setConsentOpen(true);
      else setError(tr('Sign in to MOVO to use voice chat.'));
      return;
    }
    stopVoice(true);
    // iOS/Safari only allow sound that starts inside a tap: create and resume the audio context here, and prime the
    // device voice, before the first await.
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) { setError(tr('Model-backed voice input is not supported in this browser.')); return; }
    // A call-style audio session records and speaks even with the iPhone silent switch on (Safari/iOS 16.4+).
    setAudioSessionType('play-and-record');
    try {
      const context = new AudioContextClass();
      context.resume?.().catch?.(() => {});
      const silent = context.createBuffer(1, 1, 22050); const tick = context.createBufferSource();
      tick.buffer = silent; tick.connect(context.destination); tick.start(0);
      audioContextRef.current = context;
    } catch { stopVoice(true); setError(tr('Model-backed voice input is not supported in this browser.')); return; }
    try { const synth = window.speechSynthesis; if (synth && typeof SpeechSynthesisUtterance !== 'undefined') { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } } catch { /* optional */ }
    setError(''); voiceRef.current = true; setListening(true);
    startVoice(voiceGenerationRef.current, requestEpochRef.current);
  };
  useEffect(() => {
    voiceMountedRef.current = true;
    const hidden = () => { if (document.visibilityState === 'hidden') stopVoice(true); };
    const leave = () => stopVoice(true);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', leave);
    return () => {
      voiceMountedRef.current = false;
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', leave);
      stopVoice(true);
    };
    // Cleanup uses refs so every render shares the current capture/request.
  }, []);

  const speak = (text, index) => {
    const release = () => { if (!voiceRef.current) setAudioSessionType('auto'); };
    if (speaking === index) {
      listenSpeechRef.current?.cancel?.();
      listenSpeechRef.current = null;
      setSpeaking(-1);
      release();
      return;
    }
    listenSpeechRef.current?.cancel?.();
    setError('');
    // Media playback, not ambient sound: the iPhone silent switch would otherwise mute the reply.
    if (!voiceRef.current) setAudioSessionType('playback');
    const controller = startDeviceSpeech(text, {
      language: getLanguage().code || navigator.language || 'en-US',
      onEnd: () => { listenSpeechRef.current = null; setSpeaking(-1); release(); },
      onError: () => {
        listenSpeechRef.current = null; setSpeaking(-1); release();
        setError(tr('Couldn’t play the reply. Turn off silent mode or raise the volume, then try again.'));
      }
    });
    if (!controller) {
      setSpeaking(-1); release();
      setError(tr('Speech playback is not available on this device.'));
      return;
    }
    listenSpeechRef.current = controller;
    setSpeaking(index);
  };

  const attach = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (!requireFeature('fullAI')) return;
    setError(''); setAttaching(true);
    try {
      if (/^image\//.test(file.type)) {
        const text = await readImageText(file);
        if (!text) throw new Error(tr('No readable text was found in that photo.'));
        append(`${tr('From my photo ({name}):', { name: file.name || tr('image') })}\n${text}`);
      } else if (/^text\/|\.(csv|txt)$/i.test(file.type || file.name)) {
        if (file.size > 512 * 1024) throw new Error(tr('Text files must be 512 KB or smaller.'));
        append(`${tr('From {name}:', { name: file.name })}\n${(await file.text()).slice(0, 1400)}`);
      } else throw new Error(tr('Attach a photo, or a .txt or .csv file.'));
    } catch (cause) { setError(tr(cause.message || 'Could not read that file.')); }
    finally { setAttaching(false); inputRef.current?.focus(); }
  };

  // Shortcuts: log actions open MOVO's own forms; read actions answer here from this device's records (never sent to NasrinAI).
  const runShortcut = (item) => {
    touch();
    const request = { role: 'user', content: tr(item.label) };
    if (item.draw) {
      const drawn = item.draw();
      if (drawn?.chart) appendDevice([request, { role: 'assistant', content: drawn.text, chart: drawn.chart }]);
      return;
    }
    if (item.say) { appendDevice([request, { role: 'assistant', content: item.say() }]); return; }
    item.run?.();
  };

  return <section className="movo-ai-chat" ref={chatRef} aria-label={tr('NasrinAI financial copilot')}
    onPointerDownCapture={touch} onKeyDownCapture={touch} onTouchMoveCapture={touch} onWheelCapture={touch}>
    <header className="movo-ai-chat-header">
      <div className="movo-ai-avatar" aria-hidden="true"><NasrinMark size={24} state={busy ? phase : undefined} /></div>
      <div className="movo-ai-heading"><h1>{tr('NasrinAI')}</h1><p>{tr('Private financial copilot · MOVO')}</p></div>
      <a className="movo-ai-open-site" href="https://nasrinai.com" target="_blank" rel="noopener noreferrer" aria-label={tr('Open NasrinAI.com in a new tab')} title={tr('NasrinAI.com')}><Icon name="external" size={17} strokeWidth={2} /></a>
      <button type="button" className="movo-ai-reset" onClick={threads.openHistory} disabled={chatBlocked || loading} aria-label={tr('Chat history')} title={tr('Chat history')}><Icon name="clock" size={18} strokeWidth={2} /></button>
      <button type="button" className="movo-ai-reset" onClick={() => threads.startNew(true)} disabled={chatBlocked} aria-label={tr('Start a new chat')} title={tr('Start a new chat')}><Icon name="plus" size={18} strokeWidth={2} /></button>
    </header>
    <div className="movo-ai-thread" role="log" aria-live="polite" aria-label={tr('Conversation')}>
      {loading && <span className="movo-ai-history-status" role="status"><span className="spinner" />{tr('Loading…')}</span>}
      {!loading && threads.olderOffset !== null && <button type="button" className="link-button movo-ai-history-more" disabled={chatBlocked} onClick={threads.loadOlder}>{tr('Earlier messages')}</button>}
      {!messages.length && !loading && <div className="movo-ai-welcome">
        <h2>{tr('Your money, with context.')}</h2>
        <p>{tr('Ask about spending, income, categories, accounts, or budgets. NasrinAI receives a limited, user-scoped snapshot—not access to your MOVO database.')}</p>
        <div className="movo-ai-suggestions">
          {MOVO_FINANCIAL_SUGGESTIONS.map(({ label, prompt }) =>
            <button key={label} type="button" onClick={() => send(null, prompt)} disabled={busy || loading} aria-label={label}><span>{label}</span><Icon name="arrow" size={15} strokeWidth={2} /></button>
          )}
        </div>
      </div>}
      {messages.map((message, index) => message.role === 'log' ? <article key={message.id || index} className="movo-ai-message log">
        <span className="movo-ai-message-label">{tr('NasrinAI')}</span>
        <LogCard items={message.items} removed={message.removed} show={show} onUndo={(id) => undo(index, id)} onLogAnyway={(row) => logAnyway(index, row)} onView={onViewLog} />
      </article> : <article key={message.id || index} className={'movo-ai-message ' + message.role}>
        <span className={'movo-ai-message-label' + (message.role === 'user' ? ' sr-only' : '')}>{message.role === 'user' ? tr('You') : tr('NasrinAI')}</span>
        {message.role === 'user' ? <p className="movo-ai-user-text">{message.content}</p> : <NasrinAIMessage content={message.content} />}
        {message.role === 'assistant' && message.reportable === true && session?.user?.id && <AIReportControl key={message.id} session={session} messageId={message.id} />}
        {message.chart && <ChatChart chart={message.chart} fmt={(value) => shown(show, money(value))} />}
        {message.role === 'assistant' && typeof window !== 'undefined' && window.speechSynthesis && <button type="button" className={`movo-ai-listen${speaking === index ? ' is-speaking' : ''}`} onClick={() => speak(message.content, index)} aria-label={speaking === index ? tr('Stop reading aloud') : tr('Read aloud')}><Icon name={speaking === index ? 'stop' : 'speaker'} size={14} strokeWidth={2} />{speaking === index ? tr('Stop') : tr('Listen')}</button>}
      </article>)}
      {busy && <div className="movo-ai-thinking" role="status"><span className="movo-ai-thinking-orb" aria-hidden="true"><NasrinMark size={22} state={phase} /></span><span key={phase} className="movo-ai-thinking-label">{tr(PHASE_LABELS[phase])}</span></div>}
      <div ref={endRef} />
    </div>
    {threads.historyError && <p className="movo-ai-history-status" role="alert">{tr('Your previous chat could not be loaded. You can still start a new conversation.')} <button type="button" className="link-button" disabled={chatBlocked || loading} onClick={threads.loadOlder}>{tr('Try again')}</button></p>}
    {threads.storageError && <p className="movo-ai-history-status" role="alert">{tr('Chat history could not be saved on this device.')}</p>}
    {error && <div className="movo-ai-error" role="alert"><Icon name="info" size={16} strokeWidth={2} /><p>{error}</p><button type="button" aria-label={tr('Dismiss message')} onClick={() => setError('')}><Icon name="close" size={14} strokeWidth={2} /></button></div>}
    {!session?.user || !cloudMode
      ? <div className="movo-ai-signin compact"><p>{tr('Logging works on this device. Sign in to ask NasrinAI about your money.')}</p><button type="button" className="link-button" onClick={onSignIn}>{tr('Sign in to MOVO')}</button></div>
      : !privacyAccepted && <button type="button" className="movo-ai-review" onClick={() => setConsentOpen(true)}><Icon name="lock" size={16} strokeWidth={2} />{tr('Review and accept to start chatting')}</button>}
          <form className="movo-ai-composer" ref={composerRef} onSubmit={send}>
        <input ref={fileRef} type="file" accept="image/*,.txt,.csv,text/plain,text/csv" hidden onChange={attach} aria-label={tr('Attach a photo or file')} />
        {shortcuts.length > 0 && <div className="movo-ai-shortcuts" role="toolbar" aria-label={tr('Shortcuts')}>
          {shortcuts.map((item) => <button key={item.id} type="button" onClick={() => runShortcut(item)} disabled={busy || loading}><Icon name={item.icon} size={14} strokeWidth={2} />{tr(item.label)}</button>)}
        </div>}
        <label className="sr-only" htmlFor="movo-ai-prompt">{tr('Message NasrinAI')}</label>
        {/* Enter starts a new line; only the send button sends. */}
        <textarea id="movo-ai-prompt" ref={inputRef} rows="2" maxLength={MAX} value={draft} onChange={(e) => { touch(); setDraft(e.target.value); }} placeholder={attaching ? tr('Reading your photo…') : listening ? (voiceManual ? tr('Listening — tap the mic when you’re done') : tr('Listening — pause briefly to transcribe')) : tr(MOVO_PLACEHOLDER_EXAMPLES[placeholderIndex])} className="movo-ai-prompt-input" disabled={busy} enterKeyHint="enter" />
        <div className="movo-ai-composer-bar">
          <button type="button" className="movo-ai-circle" onClick={() => fileRef.current?.click()} disabled={busy || attaching} aria-label={tr('Attach a photo or file')} title={tr('Attach a photo or file')}>{attaching ? <span className="spinner" aria-hidden="true" /> : <Icon name="plus" size={16} strokeWidth={2.2} />}</button>
          <span className="movo-ai-composer-gap" />
          <button type="button" className={`movo-ai-circle${listening ? ' live' : ''}`} onClick={toggleMic} disabled={busy && !listening} aria-pressed={listening} aria-label={listening ? tr('End voice conversation') : tr('Talk with NasrinAI')} title={listening ? tr('End voice conversation') : tr('Talk with NasrinAI')}><Icon name={listening ? 'stop' : 'mic'} size={16} strokeWidth={2} /></button>
          <button type="submit" className="movo-ai-circle movo-ai-send" disabled={busy || loading || !draft.trim()} aria-label={tr('Send message')}>{busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="arrowUp" size={16} strokeWidth={2.4} />}</button>
        </div>
      </form>
    {threads.historyOpen && <Sheet title={tr('Chat history')} onClose={threads.closeHistory} className="movo-ai-history-sheet">
      {threads.rows.length > 0 && <div className="sheet-list">
        {threads.rows.map((thread) => <button key={thread.id} type="button" className="sheet-card" onClick={() => threads.openThread(thread)}>
          <Icon name="message" size={18} />
          <span className="account-main">
            <strong>{thread.title || tr('Conversation')}</strong>
            {thread.updatedAt && <small>{formatDate(thread.updatedAt, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</small>}
          </span>
          <Icon name="chevron" size={16} />
        </button>)}
      </div>}
      {(threads.listStatus === 'loading' || threads.deviceHistoryLoading) && <p className="movo-ai-history-status" role="status">{tr('Loading…')}</p>}
      {threads.listStatus === 'error' && <p className="movo-ai-history-status" role="alert">{tr('Your previous chat could not be loaded. You can still start a new conversation.')} <button type="button" className="link-button" onClick={threads.loadMore}>{tr('Try again')}</button></p>}
      {threads.deviceHistoryError && <p className="movo-ai-history-status" role="alert">{tr('Your previous chat could not be loaded. You can still start a new conversation.')} <button type="button" className="link-button" onClick={threads.loadDeviceList}>{tr('Try again')}</button></p>}
      {!threads.listStatus && !threads.deviceHistoryLoading && !threads.deviceHistoryError && !threads.rows.length && <p className="empty">{tr('No saved chats yet.')}</p>}
      {threads.listMore && <button type="button" className="link-button movo-ai-history-more" onClick={threads.loadMore}>{tr('More chats')}</button>}
    </Sheet>}
    {consentOpen && <div className="movo-ai-consent-backdrop" role="presentation">
      <div className="movo-ai-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="movo-ai-consent-title" aria-describedby="movo-ai-context-disclosure">
        <span className="movo-ai-consent-mark" aria-hidden="true"><NasrinMark size={30} /></span>
        <h2 id="movo-ai-consent-title">{tr('Before you start')}</h2>
        <ul>
          <li id="movo-ai-context-disclosure"><Icon name="lock" size={16} strokeWidth={2} /><span>{tr('When you send a message, MOVO sends it with a limited, account-scoped snapshot of relevant account labels, recent transactions and budgets to NasrinAI. This consent is separate from accepting the Terms of Service.')}</span></li>
          <li><Icon name="info" size={16} strokeWidth={2} /><span>{tr('AI can make mistakes. Verify important calculations.')}</span></li>
          <li><Icon name="shield" size={16} strokeWidth={2} /><span>{tr('Financial actions are not performed from chat.')}</span></li>
        </ul>
        <p className="movo-ai-consent-legal">{rich('By continuing you consent to share limited financial context with NasrinAI, as described in the {privacy} and {terms}.', { privacy: <button type="button" onClick={() => onOpenLegal?.('PrivacyPolicy')}>{tr('Privacy Policy')}</button>, terms: <button type="button" onClick={() => onOpenLegal?.('TermsOfService')}>{tr('Terms')}</button> })}</p>
        <p className="movo-ai-consent-reason" lang="en">{legalCore.aiConsentShort[0]}</p>
        <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => setConsentOpen(false)}>{tr('Not now')}</button><button type="button" className="primary-button" onClick={accept} autoFocus>{tr('I understand')}</button></div>
      </div>
    </div>}
  </section>;
}
