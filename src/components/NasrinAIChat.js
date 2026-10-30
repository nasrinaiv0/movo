import Icon, { NasrinMark } from './Icon';
import NasrinAIMessage from './NasrinAIMessage';
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { readImageText } from '../lib/ocr';
import { t as tr, rich, getLanguage } from '../lib/i18n';
import { parseLogMessage } from '../lib/chatLog';
import { money, shown, formatDate } from '../lib/format';
import { Tile } from './ui';
import { SubIcon } from '../screens/Subscriptions';
import { catalogFor } from '../lib/subscriptions';

const ackKey = (id) => `movo.ai.ack.v1.${id}`;
const readAck = (id) => { try { return !!id && localStorage.getItem(ackKey(id)) === '1'; } catch { return false; } };
const MAX = 1600;
const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
import './NasrinAIChat.css';

function friendlyError(code) {
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

const PHASE_LABELS = { reading: 'Reading your records…', thinking: 'Thinking…', almost: 'Almost there…' };

/** A record logged from chat: what was saved, where, and a one-tap undo. */
function LogCard({ items, removed, show, onUndo }) {
  return <div className="chat-log-card">
    {items.map(row => {
      const gone = removed.includes(row.id);
      const sign = row.transaction_type === 'income' ? '+' : '−';
      return <div key={row.id} className={`chat-log-row${gone ? ' gone' : ''}`}>
        {catalogFor(row.merchant) ? <SubIcon sub={{ name: row.merchant }} size={40} /> : <Tile name={row.merchant} size={40} radius={12} />}
        <span className="chat-log-main"><strong>{row.merchant}</strong><small>{[tr(row.category), row.accountName, new Date(row.occurred_at).toDateString() === new Date().toDateString() ? tr('Today') : formatDate(row.occurred_at, { month: 'short', day: 'numeric' }, 'md')].filter(Boolean).join(' · ')}</small></span>
        <span className={`chat-log-amount ${row.transaction_type}`}>{sign}{shown(show, money(row.amount, row.currency))}</span>
        <span className="chat-log-status">{gone
          ? <span className="muted">{tr('Removed')}</span>
          : <><span className="ok"><Icon name="check" size={13} strokeWidth={2.6} />{tr('Added to your transactions')}</span><button type="button" className="link-button" onClick={() => onUndo(row.id)}>{tr('Undo')}</button></>}
        </span>
      </div>;
    })}
  </div>;
}

export default function NasrinAIChat({ session, cloudMode, onOpenLegal, onSignIn, onLog, onUndoLog, shortcuts = [], show = true }) {
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
        if (active) setError(tr('Your previous chat could not be loaded. You can still start a new conversation.'));
      }
    };
    loadHistory();
    return () => { active = false; };
  }, [session?.user?.id, cloudMode, newConversationPending]);

  const send = async (event) => {
    event?.preventDefault();
    const message = draft.trim();
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
      } catch (cause) {
        setMessages((current) => [...current, { role: 'assistant', local: true, content: cause.message === 'account_required' ? tr('Add an account in Wallet first, then I can log this for you.') : tr('That could not be saved. Please try again.') }]);
      } finally { setBusy(false); inputRef.current?.focus(); }
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
        body: JSON.stringify({ message, conversationId, consent: privacyAccepted, language: getLanguage().code })
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

  const toggleMic = () => {
    if (listening) { recognition.current?.stop(); return; }
    if (!SpeechRecognition) { setError(tr('Voice input is not supported in this browser.')); return; }
    const rec = new SpeechRecognition(); recognition.current = rec;
    const base = draft ? `${draft.trimEnd()} ` : '';
    rec.lang = navigator.language || 'en-US'; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (e) => setDraft(`${base}${Array.from(e.results).map(r => r[0].transcript).join('')}`.slice(0, MAX));
    rec.onerror = (e) => { if (e.error === 'not-allowed') setError(tr('Allow microphone access to dictate your message.')); };
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
          {['Spent 250 on Grab', 'Salary 50000', 'Summarize my recent spending', 'Which categories cost me the most?'].map((prompt) =>
            <button key={prompt} type="button" onClick={() => { setDraft(prompt); inputRef.current?.focus(); }}><span>{prompt}</span><Icon name="arrow" size={15} strokeWidth={2} /></button>
          )}
        </div>
      </div>}
      {messages.map((message, index) => message.role === 'log' ? <article key={index} className="movo-ai-message log">
        <span className="movo-ai-message-label">{tr('NasrinAI')}</span>
        <LogCard items={message.items} removed={message.removed} show={show} onUndo={(id) => undo(index, id)} />
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
        <textarea id="movo-ai-prompt" ref={inputRef} rows="2" maxLength={MAX} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={attaching ? tr('Reading your photo…') : listening ? tr('Listening…') : tr('Log “Grab 250” or ask NasrinAI…')} disabled={busy} enterKeyHint="enter" />
        <div className="movo-ai-composer-bar">
          <button type="button" className="movo-ai-circle" onClick={() => fileRef.current?.click()} disabled={busy || attaching} aria-label={tr('Attach a photo or file')} title={tr('Attach a photo or file')}>{attaching ? <span className="spinner" aria-hidden="true" /> : <Icon name="plus" size={16} strokeWidth={2.2} />}</button>
          <span className="movo-ai-composer-gap" />
          <button type="button" className={`movo-ai-circle${listening ? ' live' : ''}`} onClick={toggleMic} disabled={busy} aria-pressed={listening} aria-label={listening ? tr('Stop dictation') : tr('Dictate a message')} title={listening ? tr('Stop dictation') : tr('Dictate a message')}><Icon name={listening ? 'stop' : 'mic'} size={16} strokeWidth={2} /></button>
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
