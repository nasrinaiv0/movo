import Icon, { NasrinMark } from './Icon';
import NasrinAIMessage from './NasrinAIMessage';
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { readImageText } from '../lib/ocr';
import { t as tr, rich, getLanguage } from '../lib/i18n';
import { parseLogMessage } from '../lib/chatLog';
import { money, shown, formatDate } from '../lib/format';
import { Tile } from './ui';
import { MovoMark } from './MovoLogo';
import { SubIcon } from '../screens/Subscriptions';
import { catalogFor } from '../lib/subscriptions';
import { MOVO_FINANCIAL_SUGGESTIONS, MOVO_PLACEHOLDER_EXAMPLES } from '../lib/movoPrompts';

const ackKey = (id) => `movo.ai.ack.v1.${id}`;
const readAck = (id) => { try { return !!id && localStorage.getItem(ackKey(id)) === '1'; } catch { return false; } };
const MAX = 1600;
const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
import './NasrinAIChat.css';

function friendlyError(code) {
  if (code === 'nasrinai_scope_unconfirmed') return tr('NasrinAI did not confirm it used only your Movo data, so its reply was not shown.');
  if (code === 'sign_in_required' || code === 'invalid_session') return tr('Sign in to MOVO to use your private financial copilot.');
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
        <span className="chat-log-main"><strong>{row.merchant}</strong><small>{[tr(row.category), row.accountName, new Date(row.occurred_at).toDateString() === new Date().toDateString() ? tr('Today') : formatDate(row.occurred_at, { month: 'short', day: 'numeric' }, 'md')].filter(Boolean).join(' · ')}</small></span>
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

export default function NasrinAIChat({ session, cloudMode, onOpenLegal, onSignIn, onLog, onUndoLog, onViewLog, onLocalAnswer, shortcuts = [], show = true }) {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const requestEpochRef = useRef(0);
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
  const [privacyAccepted, setPrivacyAccepted] = useState(() => readAck(session?.user?.id));
  const [consentOpen, setConsentOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [speaking, setSpeaking] = useState(-1);
  const recognition = useRef(null);
  const fileRef = useRef(null);
  const [newConversationPending, setNewConversationPending] = useState(() => {
    try { return !!session?.user?.id && window.sessionStorage.getItem('movo.ai.newConversation.' + session.user.id) === 'true'; } catch { return false; }
  });
  const [phase, setPhase] = useState('reading');
  // Invalidate in-flight UI work whenever the signed-in identity or cloud mode changes.
  useEffect(() => {
    requestEpochRef.current += 1;
    setMessages([]);
    setConversationId(null);
    setDraft('');
    setError('');
    setBusy(false);
    setPrivacyAccepted(readAck(session?.user?.id));
  }, [session?.user?.id, cloudMode]);
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

  useEffect(() => { if (typeof endRef.current?.scrollIntoView === 'function') endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  useEffect(() => {
    if (busy || !voiceRef.current || !pendingVoiceTextsRef.current.length) return;
    const next = pendingVoiceTextsRef.current.shift();
    if (next) sendRef.current?.(null, next);
  }, [busy]);

  useEffect(() => {
    let active = true;
    const loadHistory = async () => {
      const accepted = readAck(session?.user?.id);
      setPrivacyAccepted(accepted);
      setConsentOpen(!!session?.user && cloudMode && !accepted);
      if (!session?.user || !cloudMode || !supabase) { setMessages([]); setConversationId(null); return; }
      if (newConversationPending) { setMessages([]); setConversationId(null); return; }
      // One clean start per account after the MOVO-only change, so an older thread that quoted outside material is not
      // reopened (or fed back as context). Earlier chats stay in the account; they are just not reopened.
      try {
        const freshKey = 'movo.ai.fresh.v2.' + session.user.id;
        if (localStorage.getItem(freshKey) !== '1') { localStorage.setItem(freshKey, '1'); setMessages([]); setConversationId(null); return; }
      } catch { /* storage unavailable: load as usual */ }
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        const token = data?.session?.access_token || session?.access_token;
        if (sessionError || !token) return;
        const response = await fetch('/api/nasrinai/chat', { headers: { Authorization: 'Bearer ' + token } });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'history_load_failed');
        if (active) {
          setConversationId(result.conversationId || null);
          setMessages(Array.isArray(result.messages) ? result.messages.map((item) => ({ role: item.role, content: item.content })) : []);
        }
      } catch {
        if (active) setError(tr('Your previous chat could not be loaded. You can still start a new conversation.'));
      }
    };
    loadHistory();
    return () => { active = false; };
  }, [session?.user?.id, cloudMode, newConversationPending]);

  const send = async (event, spoken) => {
    event?.preventDefault?.();
    const message = String(spoken ?? draft).trim();
    if (!message || busy) return;
    // Logging is handled on this device and never sent to NasrinAI, so it needs no sign-in or AI consent.
    const entries = onLog ? parseLogMessage(message) : [];
    if (entries.length) {
      setError(''); setDraft('');
      setMessages((current) => [...current, { role: 'user', content: message, local: true }]);
      setBusy(true);
      try {
        const items = await onLog(entries);
        setMessages((current) => [...current, { role: 'log', items, removed: [] }]);
        const added = items.filter(i => !i.duplicateOf).length;
        say(added ? tr('Logged {n} record(s).', { n: added }) : tr('That was already logged, so I did not add it twice.'));
      } catch (cause) {
        const content = cause.message === 'account_required' ? tr('Add an account or card in Wallet first, then I can log this for you.') : tr('That could not be saved. Please try again.');
        setMessages((current) => [...current, { role: 'assistant', local: true, content }]); say(content);
      } finally { setBusy(false); if (!voiceRef.current) inputRef.current?.focus(); }
      return;
    }
    // Common questions are answered at once from the records on this device; nothing is sent to NasrinAI.
    const local = onLocalAnswer ? onLocalAnswer(message) : null;
    if (local) {
      setError(''); setDraft('');
      setMessages((current) => [...current, { role: 'user', content: message, local: true }, { role: 'assistant', content: local, local: true }]);
      say(local);
      return;
    }
    if (!session?.user || !cloudMode || !supabase) {
      setDraft('');
      setMessages((current) => [...current, { role: 'user', content: message, local: true }, { role: 'assistant', local: true, content: tr('I can log records here on this device. Try “Spent 250 on Grab”, “Salary 50000”, or several lines at once. Sign in to ask me questions about your money.') }]);
      return;
    }
    if (!privacyAccepted) {
      setConsentOpen(true);
      return;
    }
    const requestEpoch = requestEpochRef.current;
    const requestUserId = session?.user?.id || null;
    const isCurrentRequest = () => requestEpochRef.current === requestEpoch && (session?.user?.id || null) === requestUserId;
    setError('');
    setDraft('');
    setMessages((current) => [...current, { role: 'user', content: message }]);
    setBusy(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!isCurrentRequest()) return;
      const accessToken = sessionData?.session?.access_token || session?.access_token;
      if (sessionError || !accessToken) throw new Error('invalid_session');
      const ask = () => fetch('/api/nasrinai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
        body: JSON.stringify({ message, conversationId, consent: privacyAccepted, language: getLanguage().code, voiceMode: voiceRef.current })
      });
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
      if (result.conversationId) setConversationId(result.conversationId);
      setNewConversationPending(false);
      try { if (session?.user?.id) window.sessionStorage.removeItem('movo.ai.newConversation.' + session.user.id); } catch { /* storage unavailable */ }
      setMessages((current) => [...current, { role: 'assistant', content: result.reply }]);
      say(result.reply, result.audioParts);
    } catch (cause) {
      if (!isCurrentRequest()) return;
      setMessages((current) => current.filter((item, index) => !(index === current.length - 1 && item.role === 'user' && item.content === message)));
      setDraft(message);
      // The short code lets support find the exact cause in the server log; it carries no personal data.
      const code = /^[a-z_]{3,60}$/.test(cause.message || '') ? cause.message : 'chat_request_failed';
      setError(`${friendlyError(code)} ${tr('Error code: {code}', { code })}`);
    } finally {
      if (isCurrentRequest()) {
        setBusy(false);
        inputRef.current?.focus();
      }
    }
  };

  const logAnyway = async (index, row) => {
    try {
      const [added] = await onLog([row.entry], true);
      setMessages((current) => current.map((m, i) => (i === index ? { ...m, items: m.items.map(x => (x.id === row.id ? added : x)) } : m)));
    } catch { setError(tr('That could not be saved. Please try again.')); }
  };

  const undo = async (index, id) => {
    try {
      await onUndoLog?.(id);
      setMessages((current) => current.map((m, i) => (i === index ? { ...m, removed: [...m.removed, id] } : m)));
    } catch { setError(tr('That record could not be removed. Please try again.')); }
  };

  const accept = () => {
    try { localStorage.setItem(ackKey(session.user.id), '1'); } catch { /* storage unavailable: accepted for this visit */ }
    setPrivacyAccepted(true); setConsentOpen(false); setError('');
    inputRef.current?.focus();
  };

  const append = (text) => setDraft((cur) => `${cur ? `${cur.trimEnd()}\n` : ''}${text}`.slice(0, MAX));

  /* Hands-free voice uses NasrinAI's model-backed STT and TTS through the
     authenticated MOVO proxy. Audio stays transient; no provider key reaches the browser. */
  const voiceRef = useRef(false);
  const spokenRef = useRef('');
  const sendRef = useRef(null);
  const audioQueueRef = useRef([]);
  const audioPlayingRef = useRef(false);
  const currentAudioRef = useRef(null);
  const deviceSpeechRef = useRef(null);
  const speechStartRef = useRef(0);
  const loudFramesRef = useRef(0);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const frameRef = useRef(null);
  const heardSpeechRef = useRef(false);
  const lastVoiceAtRef = useRef(0);
  const transcribingRef = useRef(false);
  const transcriptionQueueRef = useRef(Promise.resolve());
  sendRef.current = send;
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
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') { spokenRef.current = ''; return; }
    const words = plain(text).slice(0, 600); if (!words) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(words); u.lang = getLanguage().code || navigator.language || 'en-US';
    // While the device voice talks, the mic treats input like playback echo (louder, sustained sound to interrupt).
    const end = () => { if (deviceSpeechRef.current === u) { deviceSpeechRef.current = null; audioPlayingRef.current = false; } spokenRef.current = ''; };
    u.onend = end; u.onerror = end;
    deviceSpeechRef.current = u; audioPlayingRef.current = true;
    synth.speak(u);
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
    deviceSpeechRef.current = null;
    audioPlayingRef.current = false;
    window.speechSynthesis?.cancel();
  };

  const stopVoice = () => {
    voiceRef.current = false; setListening(false);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    try { recorderRef.current?.stop?.(); } catch { /* already stopped */ }
    recorderRef.current = null;
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
    audioContextRef.current?.close?.().catch(() => {});
    audioContextRef.current = null;
    pendingVoiceTextsRef.current = [];
    stopPlayback();
    spokenRef.current = '';
  };

  const transcribeSegment = (blob) => {
    if (!blob || blob.size < 120 || blob.size > 2_400_000 || !voiceRef.current) return;
    transcriptionQueueRef.current = transcriptionQueueRef.current
      .then(() => transcribeSegmentNow(blob))
      .catch(() => {});
  };

  const transcribeSegmentNow = async (blob) => {
    if (!voiceRef.current) return;
    transcribingRef.current = true;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || session?.access_token;
      if (!token || !voiceRef.current) return;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
      const response = await fetch('/api/nasrinai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'transcribe', audioBase64: btoa(binary), mime: blob.type || 'audio/webm', consent: privacyAccepted })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'transcription_unavailable');
      const text = String(result.text || '').trim();
      if (text && voiceRef.current) {
        const spoken = spokenRef.current;
        const heard = text.toLowerCase().split(/\s+/).filter(Boolean);
        const echo = spoken && heard.length && heard.filter(word => spoken.includes(word)).length / heard.length >= 0.7;
        if (!echo) {
          stopPlayback();
          if (busyRef.current) pendingVoiceTextsRef.current.push(text);
          else sendRef.current?.(null, text);
        }
      }
    } catch {
      if (voiceRef.current) setError(tr('Voice transcription is temporarily unavailable. Please try again.'));
    } finally { transcribingRef.current = false; }
  };

  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (!voiceRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      const context = audioContextRef.current;
      if (!context || typeof MediaRecorder === 'undefined') throw new Error('voice_not_supported');
      if (context.state === 'suspended') await context.resume().catch(() => {});
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024; source.connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      let recorder = null;
      let chunks = [];
      let segmentStart = 0;
      const beginSegment = () => {
        if (!voiceRef.current || recorder?.state === 'recording') return;
        const mime = ['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(type => MediaRecorder.isTypeSupported(type)) || '';
        try { recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); }
        catch { recorder = new MediaRecorder(stream); }
        chunks = []; segmentStart = Date.now();
        recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const hasSpeech = heardSpeechRef.current;
          heardSpeechRef.current = false;
          if (hasSpeech) transcribeSegment(blob);
          if (voiceRef.current) setTimeout(beginSegment, 100);
        };
        recorder.start();
        recorderRef.current = recorder;
      };
      beginSegment();
      const detect = () => {
        if (!voiceRef.current) return;
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i += 1) { const v = (samples[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / samples.length);
        const now = Date.now();
        // A short burst during TTS may be speaker echo. Require sustained, louder
        // input before treating it as barge-in; then stop playback immediately.
        if (audioPlayingRef.current) {
          loudFramesRef.current = rms > 0.095 ? loudFramesRef.current + 1 : 0;
          if (loudFramesRef.current >= 5) {
            stopPlayback();
            loudFramesRef.current = 0;
            heardSpeechRef.current = true;
            lastVoiceAtRef.current = now;
          }
        } else if (rms > 0.045) {
          if (!heardSpeechRef.current) speechStartRef.current = now;
          heardSpeechRef.current = true; lastVoiceAtRef.current = now;
        }
        if (recorder?.state === 'recording') {
          // Speech ends after a short pause (or 12 s of talking); silent stretches are discarded every 8 s so the
          // next sentence is not cut short or sent with a minute of silence in front of it.
          if (heardSpeechRef.current ? (now - lastVoiceAtRef.current > 950 || now - speechStartRef.current > 12000) : now - segmentStart > 8000) recorder.stop();
        }
        frameRef.current = requestAnimationFrame(detect);
      };
      frameRef.current = requestAnimationFrame(detect);
    } catch {
      setError(tr('Allow microphone access and use a browser that supports audio recording to talk with NasrinAI.'));
      stopVoice();
    }
  };

  const toggleMic = () => {
    if (voiceRef.current) { stopVoice(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(tr('Model-backed voice input is not supported in this browser.'));
      return;
    }
    if (!session?.user || !cloudMode || !privacyAccepted) {
      if (!privacyAccepted) setConsentOpen(true);
      else setError(tr('Sign in to MOVO to use voice chat.'));
      return;
    }
    // iOS/Safari only allow sound that starts inside a tap: create and resume the audio context here, and prime the
    // device voice, before the first await.
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) { setError(tr('Model-backed voice input is not supported in this browser.')); return; }
    try {
      const context = new AudioContextClass();
      context.resume?.().catch?.(() => {});
      const silent = context.createBuffer(1, 1, 22050); const tick = context.createBufferSource();
      tick.buffer = silent; tick.connect(context.destination); tick.start(0);
      audioContextRef.current = context;
    } catch { setError(tr('Model-backed voice input is not supported in this browser.')); return; }
    try { const synth = window.speechSynthesis; if (synth && typeof SpeechSynthesisUtterance !== 'undefined') { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } } catch { /* optional */ }
    setError(''); voiceRef.current = true; setListening(true);
    startVoice();
  };
  useEffect(() => () => {
    voiceRef.current = false;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    try { recorderRef.current?.stop?.(); } catch { /* cleanup */ }
    streamRef.current?.getTracks?.().forEach(track => track.stop());
    audioContextRef.current?.close?.().catch(() => {});
    window.speechSynthesis?.cancel();
  }, []);

  const speak = (text, index) => {
    const synth = window.speechSynthesis; if (!synth) return;
    if (speaking === index) { synth.cancel(); setSpeaking(-1); return; }
    synth.cancel(); const u = new SpeechSynthesisUtterance(text);
    u.onend = () => setSpeaking(-1); u.onerror = () => setSpeaking(-1);
    setSpeaking(index); synth.speak(u);
  };

  const attach = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
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
    if (item.say) { setMessages((current) => [...current, { role: 'user', content: tr(item.label), local: true }, { role: 'assistant', content: item.say(), local: true }]); return; }
    item.run?.();
  };

  const reset = () => {
    setMessages([]);
    setConversationId(null);
    setDraft('');
    setError('');
    setNewConversationPending(true);
    try { if (session?.user?.id) window.sessionStorage.setItem('movo.ai.newConversation.' + session.user.id, 'true'); } catch { /* storage unavailable */ }
  };

  return <section className="movo-ai-chat" ref={chatRef} aria-label={tr('NasrinAI financial copilot')}>
    <header className="movo-ai-chat-header">
      <div className="movo-ai-avatar" aria-hidden="true"><NasrinMark size={24} state={busy ? phase : undefined} /></div>
      <div className="movo-ai-heading"><h1>{tr('NasrinAI')}</h1><p>{tr('Private financial copilot · MOVO')}</p></div>
      <a className="movo-ai-open-site" href="https://nasrinai.com" target="_blank" rel="noopener noreferrer" aria-label={tr('Open NasrinAI.com in a new tab')} title={tr('NasrinAI.com')}><Icon name="external" size={17} strokeWidth={2} /></a>
      <button type="button" className="movo-ai-reset" onClick={reset} disabled={busy} aria-label={tr('Start a new chat')} title={tr('Start a new chat')}><Icon name="plus" size={18} strokeWidth={2} /></button>
    </header>
    <div className="movo-ai-thread" role="log" aria-live="polite" aria-label={tr('Conversation')}>
      {!messages.length && <div className="movo-ai-welcome">
        <h2>{tr('Your money, with context.')}</h2>
        <p>{tr('Ask about spending, income, categories, accounts, or budgets. NasrinAI receives a limited, user-scoped snapshot—not access to your MOVO database.')}</p>
        <div className="movo-ai-suggestions">
          {MOVO_FINANCIAL_SUGGESTIONS.map(({ label, prompt }) =>
            <button key={label} type="button" onClick={() => send(null, prompt)} disabled={busy} aria-label={label}><span>{label}</span><Icon name="arrow" size={15} strokeWidth={2} /></button>
          )}
        </div>
      </div>}
      {messages.map((message, index) => message.role === 'log' ? <article key={index} className="movo-ai-message log">
        <span className="movo-ai-message-label">{tr('NasrinAI')}</span>
        <LogCard items={message.items} removed={message.removed} show={show} onUndo={(id) => undo(index, id)} onLogAnyway={(row) => logAnyway(index, row)} onView={onViewLog} />
      </article> : <article key={index} className={'movo-ai-message ' + message.role}>
        <span className="movo-ai-message-label">{message.role === 'user' ? tr('You') : tr('NasrinAI')}</span>
        {message.role === 'user' ? <p className="movo-ai-user-text">{message.content}</p> : <NasrinAIMessage content={message.content} />}
        {message.role === 'assistant' && typeof window !== 'undefined' && window.speechSynthesis && <button type="button" className="movo-ai-listen" onClick={() => speak(message.content, index)} aria-label={speaking === index ? tr('Stop reading aloud') : tr('Read aloud')}><Icon name={speaking === index ? 'stop' : 'speaker'} size={14} strokeWidth={2} />{speaking === index ? tr('Stop') : tr('Listen')}</button>}
      </article>)}
      {busy && <div className="movo-ai-thinking" role="status"><span className="movo-ai-thinking-orb" aria-hidden="true"><NasrinMark size={22} state={phase} /></span><span key={phase} className="movo-ai-thinking-label">{tr(PHASE_LABELS[phase])}</span></div>}
      <div ref={endRef} />
    </div>
    {error && <div className="movo-ai-error" role="alert"><Icon name="info" size={16} strokeWidth={2} /><p>{error}</p><button type="button" aria-label={tr('Dismiss message')} onClick={() => setError('')}><Icon name="close" size={14} strokeWidth={2} /></button></div>}
    {!session?.user || !cloudMode
      ? <div className="movo-ai-signin compact"><p>{tr('Logging works on this device. Sign in to ask NasrinAI about your money.')}</p><button type="button" className="link-button" onClick={onSignIn}>{tr('Sign in to MOVO')}</button></div>
      : !privacyAccepted && <button type="button" className="movo-ai-review" onClick={() => setConsentOpen(true)}><Icon name="lock" size={16} strokeWidth={2} />{tr('Review and accept to start chatting')}</button>}
          <form className="movo-ai-composer" ref={composerRef} onSubmit={send}>
        <input ref={fileRef} type="file" accept="image/*,.txt,.csv,text/plain,text/csv" hidden onChange={attach} aria-label={tr('Attach a photo or file')} />
        {shortcuts.length > 0 && <div className="movo-ai-shortcuts" role="toolbar" aria-label={tr('Shortcuts')}>
          {shortcuts.map((item) => <button key={item.id} type="button" onClick={() => runShortcut(item)} disabled={busy}><Icon name={item.icon} size={14} strokeWidth={2} />{tr(item.label)}</button>)}
        </div>}
        <label className="sr-only" htmlFor="movo-ai-prompt">{tr('Message NasrinAI')}</label>
        {/* Enter starts a new line; only the send button sends. */}
        <textarea id="movo-ai-prompt" ref={inputRef} rows="2" maxLength={MAX} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={attaching ? tr('Reading your photo…') : listening ? tr('Listening…') : tr(MOVO_PLACEHOLDER_EXAMPLES[placeholderIndex])} className="movo-ai-prompt-input" disabled={busy} enterKeyHint="enter" />
        <div className="movo-ai-composer-bar">
          <button type="button" className="movo-ai-circle" onClick={() => fileRef.current?.click()} disabled={busy || attaching} aria-label={tr('Attach a photo or file')} title={tr('Attach a photo or file')}>{attaching ? <span className="spinner" aria-hidden="true" /> : <Icon name="plus" size={16} strokeWidth={2.2} />}</button>
          <span className="movo-ai-composer-gap" />
          <button type="button" className={`movo-ai-circle${listening ? ' live' : ''}`} onClick={toggleMic} disabled={busy && !listening} aria-pressed={listening} aria-label={listening ? tr('End voice conversation') : tr('Talk with NasrinAI')} title={listening ? tr('End voice conversation') : tr('Talk with NasrinAI')}><Icon name={listening ? 'stop' : 'mic'} size={16} strokeWidth={2} /></button>
          <button type="submit" className="movo-ai-circle movo-ai-send" disabled={busy || !draft.trim()} aria-label={tr('Send message')}>{busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="arrowUp" size={16} strokeWidth={2.4} />}</button>
        </div>
      </form>
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
        <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => setConsentOpen(false)}>{tr('Not now')}</button><button type="button" className="primary-button" onClick={accept} autoFocus>{tr('I understand')}</button></div>
      </div>
    </div>}
  </section>;
}
