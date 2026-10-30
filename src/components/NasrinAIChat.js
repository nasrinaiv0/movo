import Icon, { NasrinMark } from './Icon';
import NasrinAIMessage from './NasrinAIMessage';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import './NasrinAIChat.css';

function friendlyError(code) {
  if (code === 'sign_in_required' || code === 'invalid_session') return 'Sign in to MOVO to use your private financial copilot.';
  if (code === 'nasrinai_not_configured') return 'NasrinAI is not configured on the MOVO server yet.';
  if (code === 'nasrinai_scope_unconfirmed') return 'MOVO could not verify that NasrinAI kept this request isolated to MOVO. No answer was accepted. Please try again later.';
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

function readNewConversationPending(userId, cloudMode) {
  if (!userId) return false;
  const pendingKey = 'movo.ai.newConversation.' + userId;
  try {
    if (window.sessionStorage.getItem(pendingKey) === 'true') return true;
    if (!cloudMode) return false;
    const isolationKey = 'movo.ai.contextIsolation.v1.' + userId;
    if (window.localStorage.getItem(isolationKey) !== 'true') {
      // Mark the one-time privacy rollout before any legacy conversation can
      // load. If either storage operation fails, default to a clean chat.
      window.sessionStorage.setItem(pendingKey, 'true');
      window.localStorage.setItem(isolationKey, 'true');
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export default function NasrinAIChat({ session, cloudMode, onOpenLegal, onSignIn }) {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [initialNewConversationPending] = useState(() => readNewConversationPending(session?.user?.id, cloudMode));
  const newConversationPendingRef = useRef(initialNewConversationPending);
  const [phase, setPhase] = useState('reading');
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const visibleUserIdRef = useRef(session?.user?.id || null);
  // Invalidates pending responses when the active identity or storage mode changes.
  const requestEpochRef = useRef(0);

  // Clear the previous account's visible chat before paint when identity or
  // storage mode changes. Never leave one user's messages on screen while the
  // next user's history request is still in flight.
  useLayoutEffect(() => {
    const userId = session?.user?.id || null;
    const identityChanged = visibleUserIdRef.current !== userId;
    visibleUserIdRef.current = userId;
    if (identityChanged || !cloudMode) {
      // A late response from the previous identity must never be appended to
      // the next user's visible chat or restore that user's draft/error.
      requestEpochRef.current += 1;
      setMessages([]);
      setConversationId(null);
      setDraft('');
      setError('');
      setPrivacyAccepted(false);
      setBusy(false);
    }
    newConversationPendingRef.current = readNewConversationPending(userId, cloudMode);
  }, [session?.user?.id, cloudMode]);

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
      setPrivacyAccepted(false);
      if (!session?.user || !cloudMode || !supabase) { setMessages([]); setConversationId(null); return; }
      let storedNewConversation = false;
      try { storedNewConversation = !!session?.user?.id && window.sessionStorage.getItem('movo.ai.newConversation.' + session.user.id) === 'true'; } catch { storedNewConversation = true; }
      if (newConversationPendingRef.current || storedNewConversation) { setMessages([]); setConversationId(null); return; }
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
  }, [session?.user?.id, cloudMode]);

  const send = async (event) => {
    event?.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    if (!session?.user || !cloudMode || !supabase) {
      setError('Sign in to MOVO first. Private financial chat is disabled in local/demo mode.');
      return;
    }
    if (!privacyAccepted) {
      setError('Please confirm that you want to share limited financial context with NasrinAI for this chat.');
      return;
    }
    const requestUserId = session?.user?.id || null;
    const requestEpoch = requestEpochRef.current;
    const isCurrentRequest = () => requestEpoch === requestEpochRef.current
      && visibleUserIdRef.current === requestUserId;
    setError('');
    setDraft('');
    setMessages((current) => [...current, { role: 'user', content: message }]);
    setBusy(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!isCurrentRequest()) return;
      const accessToken = sessionData?.session?.access_token || session?.access_token;
      if (sessionError || !accessToken) throw new Error('invalid_session');
      const response = await fetch('/api/nasrinai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
        body: JSON.stringify({ message, conversationId, consent: privacyAccepted })
      });
      const result = await response.json().catch(() => ({}));
      if (!isCurrentRequest()) return;
      if (!response.ok) throw new Error(result.error || 'chat_request_failed');
      if (result.conversationId) setConversationId(result.conversationId);
      newConversationPendingRef.current = false;
      try { if (session?.user?.id) window.sessionStorage.removeItem('movo.ai.newConversation.' + session.user.id); } catch { /* storage unavailable */ }
      setMessages((current) => [...current, { role: 'assistant', content: result.reply }]);
    } catch (cause) {
      if (!isCurrentRequest()) return;
      setMessages((current) => current.filter((item, index) => !(index === current.length - 1 && item.role === 'user' && item.content === message)));
      setDraft(message);
      setError(friendlyError(cause.message));
    } finally {
      if (isCurrentRequest()) {
        setBusy(false);
        inputRef.current?.focus();
      }
    }
  };

  const reset = () => {
    setMessages([]);
    setConversationId(null);
    setDraft('');
    setError('');
    newConversationPendingRef.current = true;
    try { if (session?.user?.id) window.sessionStorage.setItem('movo.ai.newConversation.' + session.user.id, 'true'); } catch { /* storage unavailable */ }
  };

  return <section className="movo-ai-chat" aria-label="NasrinAI financial copilot">
    <header className="movo-ai-chat-header">
      <div className="movo-ai-avatar" aria-hidden="true"><NasrinMark size={24} state={busy ? phase : undefined} /></div>
      <div className="movo-ai-heading"><h1>NasrinAI</h1><p>Private financial copilot · MOVO</p></div>
      <a className="movo-ai-open-site" href="https://nasrinai.com" target="_blank" rel="noopener noreferrer" aria-label="Open NasrinAI.com in a new tab" title="NasrinAI.com"><Icon name="external" size={17} strokeWidth={2} /></a>
      <button type="button" className="movo-ai-reset" onClick={reset} disabled={busy} aria-label="Start a new chat" title="Start a new chat"><Icon name="plus" size={18} strokeWidth={2} /></button>
    </header>
    <div className="movo-ai-privacy" id="movo-ai-context-disclosure" role="note">
      <span className="movo-ai-privacy-icon" aria-hidden="true"><Icon name="lock" size={16} strokeWidth={2} /></span>
      <span><strong>What you share when you opt in.</strong> When you check the box and send a message, MOVO sends your message and a limited, account-scoped snapshot of relevant account labels, recent transactions, and budgets to NasrinAI to generate a reply. This is separate from accepting the Terms of Service. You can use the rest of MOVO without this chat-specific consent. <strong>Your account stays isolated.</strong> The context is limited to your own account-scoped records; other users are not given access to your accounts, transactions, budgets, or chats. <strong>Conversation isolation.</strong> Each message is processed independently; earlier replies shown in this thread are not sent to NasrinAI as context. If this thread contains unrelated older replies, use the + button to start a clean MOVO chat.</span>
    </div>
    <div className="movo-ai-thread" role="log" aria-live="polite" aria-label="Conversation">
      {!messages.length && <div className="movo-ai-welcome">
        <h2>Your money, with context.</h2>
        <p>Ask about spending, income, categories, accounts, or budgets. NasrinAI receives a limited, user-scoped snapshot—not access to your MOVO database.</p>
        <div className="movo-ai-suggestions">
          {['Summarize my recent spending', 'Which categories cost me the most?', 'How am I doing against my budgets?'].map((prompt) =>
            <button key={prompt} type="button" onClick={() => { setDraft(prompt); inputRef.current?.focus(); }}><span>{prompt}</span><Icon name="arrow" size={15} strokeWidth={2} /></button>
          )}
        </div>
      </div>}
      {messages.map((message, index) => <article key={index} className={'movo-ai-message ' + message.role}>
        <span className="movo-ai-message-label">{message.role === 'user' ? 'You' : 'NasrinAI'}</span>
        <NasrinAIMessage content={message.content} />
      </article>)}
      {busy && <div className="movo-ai-thinking" role="status"><span className="movo-ai-thinking-orb" aria-hidden="true"><NasrinMark size={22} state={phase} /></span><span key={phase} className="movo-ai-thinking-label">{PHASE_LABELS[phase]}</span></div>}
      <div ref={endRef} />
    </div>
    {error && <div className="movo-ai-error" role="alert"><Icon name="info" size={16} strokeWidth={2} /><p>{error}</p><button type="button" aria-label="Dismiss message" onClick={() => setError('')}><Icon name="close" size={14} strokeWidth={2} /></button></div>}
    {!session?.user || !cloudMode ? <div className="movo-ai-signin"><p>Sign in to securely connect your MOVO finances.</p><button type="button" className="primary-button" onClick={onSignIn}>Sign in to MOVO</button></div> : <>
      <div className="movo-ai-consent"><input id="movo-ai-consent" type="checkbox" aria-describedby="movo-ai-context-disclosure" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} /><label htmlFor="movo-ai-consent">I consent to share my message and limited financial context with NasrinAI for this conversation.</label></div>
      <div className="movo-ai-legal-links"><button type="button" onClick={() => onOpenLegal?.('PrivacyPolicy')}>Privacy Policy</button><span aria-hidden="true">·</span><button type="button" onClick={() => onOpenLegal?.('TermsOfService')}>Terms of Service</button></div>
      <form className="movo-ai-composer" onSubmit={send}>
        <p id="movo-ai-send-disabled-reason" className="movo-ai-consent-reason">{!privacyAccepted ? 'To send a message, review the Privacy Policy and explicitly opt in above. MOVO does not send your chat message or financial context until you submit it with consent checked.' : !draft.trim() ? 'Enter a message to enable Send. Your message and limited financial context are shared only when you submit with consent checked.' : busy ? 'NasrinAI is responding; Send is unavailable until the reply finishes.' : 'Ready to send: your message and limited financial context will be shared with NasrinAI for this reply.'}</p>
        <label className="sr-only" htmlFor="movo-ai-prompt">Message NasrinAI</label>
        <textarea id="movo-ai-prompt" ref={inputRef} rows="2" maxLength="1600" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask NasrinAI about your finances…" disabled={busy} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(e); } }} />
        <button type="submit" className="movo-ai-send" disabled={busy || !draft.trim() || !privacyAccepted} aria-label="Send message" aria-describedby="movo-ai-send-disabled-reason" aria-busy={busy}>{busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="arrowUp" size={18} strokeWidth={2.2} />}</button>
      </form></>}
    <p className="movo-ai-footnote">AI can make mistakes. Verify important calculations. Financial actions are not performed from chat.</p>
  </section>;
}
