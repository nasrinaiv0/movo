import Icon, { NasrinMark } from './Icon';
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { readImageText } from '../lib/ocr';
import { t as tr } from '../lib/i18n';

const ackKey = (id) => `movo.ai.ack.v1.${id}`;
const readAck = (id) => { try { return !!id && localStorage.getItem(ackKey(id)) === '1'; } catch { return false; } };
const MAX = 1600;
const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

function friendlyError(code) {
  if (code === 'sign_in_required' || code === 'invalid_session') return 'Sign in to MOVO to use your private financial copilot.';
  if (code === 'nasrinai_not_configured') return 'NasrinAI is not configured on the MOVO server yet.';
  if (code === 'conversation_not_found') return 'This conversation is not available in your account.';
  if (code === 'financial_context_consent_required') return 'Please confirm consent before sharing financial context with NasrinAI.';
  if (code === 'nasrinai_auth_rejected') return 'MOVO reached NasrinAI, but the service rejected its server authentication. This is a configuration issue; please try again later.';
  if (code === 'nasrinai_rate_limited') return 'NasrinAI is temporarily busy. Please wait a moment and try again.';
  if (code === 'nasrinai_timeout') return 'NasrinAI took too long to respond. Your request was not saved; please try again.';
  if (code === 'nasrinai_unreachable') return 'MOVO could not connect to NasrinAI. Please check your connection and try again.';
  if (code === 'nasrinai_request_rejected' || code === 'invalid_nasrinai_response' || code === 'nasrinai_conversation_missing') return 'NasrinAI could not process this request format. Please try a shorter question or contact support if it continues.';
  return 'NasrinAI could not answer right now. Please try again shortly.';
}

const PHASE_LABELS = { reading: 'Reading your records…', thinking: 'Thinking…', almost: 'Almost there…' };

export default function NasrinAIChat({ session, cloudMode, onOpenLegal, onSignIn }) {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
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
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!busy) return undefined;
    setPhase('reading');
    const toThinking = setTimeout(() => setPhase('thinking'), 1400);
    const toAlmost = setTimeout(() => setPhase('almost'), 7000);
    return () => { clearTimeout(toThinking); clearTimeout(toAlmost); };
  }, [busy]);

  useEffect(() => { if (typeof endRef.current?.scrollIntoView === 'function') endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  useEffect(() => {
    let active = true;
    const loadHistory = async () => {
      const accepted = readAck(session?.user?.id);
      setPrivacyAccepted(accepted);
      setConsentOpen(!!session?.user && cloudMode && !accepted);
      if (!session?.user || !cloudMode || !supabase) { setMessages([]); setConversationId(null); return; }
      if (newConversationPending) { setMessages([]); setConversationId(null); return; }
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
        if (active) setError('Your previous chat could not be loaded. You can still start a new conversation.');
      }
    };
    loadHistory();
    return () => { active = false; };
  }, [session?.user?.id, cloudMode, newConversationPending]);

  const send = async (event) => {
    event?.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    if (!session?.user || !cloudMode || !supabase) {
      setError('Sign in to MOVO first. Private financial chat is disabled in local/demo mode.');
      return;
    }
    if (!privacyAccepted) {
      setConsentOpen(true);
      return;
    }
    setError('');
    setDraft('');
    setMessages((current) => [...current, { role: 'user', content: message }]);
    setBusy(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || session?.access_token;
      if (sessionError || !accessToken) throw new Error('invalid_session');
      const response = await fetch('/api/nasrinai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
        body: JSON.stringify({ message, conversationId, consent: privacyAccepted })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'chat_request_failed');
      if (result.conversationId) setConversationId(result.conversationId);
      setNewConversationPending(false);
      try { if (session?.user?.id) window.sessionStorage.removeItem('movo.ai.newConversation.' + session.user.id); } catch { /* storage unavailable */ }
      setMessages((current) => [...current, { role: 'assistant', content: result.reply }]);
    } catch (cause) {
      setMessages((current) => current.filter((item, index) => !(index === current.length - 1 && item.role === 'user' && item.content === message)));
      setDraft(message);
      setError(friendlyError(cause.message));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const accept = () => {
    try { localStorage.setItem(ackKey(session.user.id), '1'); } catch { /* storage unavailable: accepted for this visit */ }
    setPrivacyAccepted(true); setConsentOpen(false); setError('');
    inputRef.current?.focus();
  };

  const append = (text) => setDraft((cur) => `${cur ? `${cur.trimEnd()}\n` : ''}${text}`.slice(0, MAX));

  const toggleMic = () => {
    if (listening) { recognition.current?.stop(); return; }
    if (!SpeechRecognition) { setError('Voice input is not supported in this browser.'); return; }
    const rec = new SpeechRecognition(); recognition.current = rec;
    const base = draft ? `${draft.trimEnd()} ` : '';
    rec.lang = navigator.language || 'en-US'; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (e) => setDraft(`${base}${Array.from(e.results).map(r => r[0].transcript).join('')}`.slice(0, MAX));
    rec.onerror = (e) => { if (e.error === 'not-allowed') setError('Allow microphone access to dictate your message.'); };
    rec.onend = () => { setListening(false); inputRef.current?.focus(); };
    setError(''); setListening(true); rec.start();
  };
  useEffect(() => () => { recognition.current?.abort?.(); window.speechSynthesis?.cancel(); }, []);

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
        if (!text) throw new Error('No readable text was found in that photo.');
        append(`From my photo (${file.name || 'image'}):\n${text}`);
      } else if (/^text\/|\.(csv|txt)$/i.test(file.type || file.name)) {
        if (file.size > 512 * 1024) throw new Error('Text files must be 512 KB or smaller.');
        append(`From ${file.name}:\n${(await file.text()).slice(0, 1400)}`);
      } else throw new Error('Attach a photo, or a .txt or .csv file.');
    } catch (cause) { setError(cause.message || 'Could not read that file.'); }
    finally { setAttaching(false); inputRef.current?.focus(); }
  };

  const reset = () => {
    setMessages([]);
    setConversationId(null);
    setDraft('');
    setError('');
    setNewConversationPending(true);
    try { if (session?.user?.id) window.sessionStorage.setItem('movo.ai.newConversation.' + session.user.id, 'true'); } catch { /* storage unavailable */ }
  };

  return <section className="movo-ai-chat" aria-label="NasrinAI financial copilot">
    <header className="movo-ai-chat-header">
      <div className="movo-ai-avatar" aria-hidden="true"><NasrinMark size={24} state={busy ? phase : undefined} /></div>
      <div className="movo-ai-heading"><h1>NasrinAI</h1><p>Private financial copilot · MOVO</p></div>
      <a className="movo-ai-open-site" href="https://nasrinai.com" target="_blank" rel="noopener noreferrer" aria-label="Open NasrinAI.com in a new tab" title="NasrinAI.com"><Icon name="external" size={17} strokeWidth={2} /></a>
      <button type="button" className="movo-ai-reset" onClick={reset} disabled={busy} aria-label="Start a new chat" title="Start a new chat"><Icon name="plus" size={18} strokeWidth={2} /></button>
    </header>
    <div className="movo-ai-thread" role="log" aria-live="polite" aria-label="Conversation">
      {!messages.length && <div className="movo-ai-welcome">
        <h2>{tr('Your money, with context.')}</h2>
        <p>Ask about spending, income, categories, accounts, or budgets. NasrinAI receives a limited, user-scoped snapshot—not access to your MOVO database.</p>
        <div className="movo-ai-suggestions">
          {['Summarize my recent spending', 'Which categories cost me the most?', 'How am I doing against my budgets?'].map((prompt) =>
            <button key={prompt} type="button" onClick={() => { setDraft(prompt); inputRef.current?.focus(); }}><span>{prompt}</span><Icon name="arrow" size={15} strokeWidth={2} /></button>
          )}
        </div>
      </div>}
      {messages.map((message, index) => <article key={index} className={'movo-ai-message ' + message.role}>
        <span className="movo-ai-message-label">{message.role === 'user' ? 'You' : 'NasrinAI'}</span>
        <p>{message.content}</p>
        {message.role === 'assistant' && typeof window !== 'undefined' && window.speechSynthesis && <button type="button" className="movo-ai-listen" onClick={() => speak(message.content, index)} aria-label={speaking === index ? 'Stop reading aloud' : 'Read aloud'}><Icon name={speaking === index ? 'stop' : 'speaker'} size={14} strokeWidth={2} />{speaking === index ? 'Stop' : 'Listen'}</button>}
      </article>)}
      {busy && <div className="movo-ai-thinking" role="status"><span className="movo-ai-thinking-orb" aria-hidden="true"><NasrinMark size={22} state={phase} /></span><span key={phase} className="movo-ai-thinking-label">{PHASE_LABELS[phase]}</span></div>}
      <div ref={endRef} />
    </div>
    {error && <div className="movo-ai-error" role="alert"><Icon name="info" size={16} strokeWidth={2} /><p>{error}</p><button type="button" aria-label="Dismiss message" onClick={() => setError('')}><Icon name="close" size={14} strokeWidth={2} /></button></div>}
    {!session?.user || !cloudMode ? <div className="movo-ai-signin"><p>Sign in to securely connect your MOVO finances.</p><button type="button" className="primary-button" onClick={onSignIn}>{tr('Sign in to MOVO')}</button></div> : <>
      {!privacyAccepted && <button type="button" className="movo-ai-review" onClick={() => setConsentOpen(true)}><Icon name="lock" size={16} strokeWidth={2} />Review and accept to start chatting</button>}
      <form className="movo-ai-composer" onSubmit={send}>
        <input ref={fileRef} type="file" accept="image/*,.txt,.csv,text/plain,text/csv" hidden onChange={attach} aria-label="Attach a photo or file" />
        <button type="button" className="movo-ai-circle" onClick={() => fileRef.current?.click()} disabled={busy || attaching} aria-label="Attach a photo or file" title="Attach a photo or file">{attaching ? <span className="spinner" aria-hidden="true" /> : <Icon name="plus" size={16} strokeWidth={2.2} />}</button>
        <label className="sr-only" htmlFor="movo-ai-prompt">Message NasrinAI</label>
        <textarea id="movo-ai-prompt" ref={inputRef} rows="1" maxLength={MAX} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={attaching ? 'Reading your photo…' : listening ? 'Listening…' : 'Ask NasrinAI…'} disabled={busy} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(e); } }} />
        <button type="button" className={`movo-ai-circle${listening ? ' live' : ''}`} onClick={toggleMic} disabled={busy} aria-pressed={listening} aria-label={listening ? 'Stop dictation' : 'Dictate a message'} title={listening ? 'Stop dictation' : 'Dictate a message'}><Icon name={listening ? 'stop' : 'mic'} size={16} strokeWidth={2} /></button>
        <button type="submit" className="movo-ai-circle movo-ai-send" disabled={busy || !draft.trim()} aria-label="Send message">{busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="arrowUp" size={16} strokeWidth={2.4} />}</button>
      </form></>}
    {consentOpen && <div className="movo-ai-consent-backdrop" role="presentation">
      <div className="movo-ai-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="movo-ai-consent-title">
        <span className="movo-ai-consent-mark" aria-hidden="true"><NasrinMark size={30} /></span>
        <h2 id="movo-ai-consent-title">Before you start</h2>
        <ul>
          <li><Icon name="lock" size={16} strokeWidth={2} /><span>MOVO shares a limited selection of your own records with NasrinAI for each reply. Other users can never access your data or chats.</span></li>
          <li><Icon name="info" size={16} strokeWidth={2} /><span>AI can make mistakes. Verify important calculations.</span></li>
          <li><Icon name="shield" size={16} strokeWidth={2} /><span>Financial actions are not performed from chat.</span></li>
        </ul>
        <p className="movo-ai-consent-legal">By continuing you consent to share limited financial context with NasrinAI, as described in the <button type="button" onClick={() => onOpenLegal?.('PrivacyPolicy')}>Privacy Policy</button> and <button type="button" onClick={() => onOpenLegal?.('TermsOfService')}>Terms</button>.</p>
        <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => setConsentOpen(false)}>Not now</button><button type="button" className="primary-button" onClick={accept} autoFocus>I understand</button></div>
      </div>
    </div>}
  </section>;
}
