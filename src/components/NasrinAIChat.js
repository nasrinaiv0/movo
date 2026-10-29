import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function friendlyError(code) {
  if (code === 'sign_in_required' || code === 'invalid_session') return 'Sign in to MOVO to use your private financial copilot.';
  if (code === 'nasrinai_not_configured') return 'NasrinAI is not configured on the MOVO server yet.';
  if (code === 'conversation_not_found') return 'This conversation is not available in your account.';
  if (code === 'financial_context_consent_required') return 'Please confirm consent before sharing financial context with NasrinAI.';
  return 'NasrinAI could not answer right now. Please try again shortly.';
}

export default function NasrinAIChat({ session, cloudMode, accounts = [], transactions = [], stats = {} }) {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (typeof endRef.current?.scrollIntoView === 'function') endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  useEffect(() => {
    let active = true;
    const loadHistory = async () => {
      setPrivacyAccepted(false);
      if (!session?.user || !cloudMode || !supabase) { setMessages([]); setConversationId(null); return; }
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

  const reset = () => {
    setMessages([]);
    setConversationId(null);
    setDraft('');
    setError('');
  };

  return <section className="movo-ai-chat" aria-label="NasrinAI financial copilot">
    <header className="movo-ai-chat-header">
      <div className="movo-ai-avatar" aria-hidden="true">N</div>
      <div className="movo-ai-heading"><h1>NasrinAI</h1><p>Private financial copilot · MOVO</p></div>
      <a className="movo-ai-open-site" href="https://nasrinai.com" target="_blank" rel="noreferrer">NasrinAI.com ↗</a>
      <button type="button" className="movo-ai-reset" onClick={reset} disabled={busy} aria-label="Start a new chat" title="Start a new chat">＋</button>
    </header>
    <div className="movo-ai-privacy" role="note">
      <span aria-hidden="true">🔒</span>
      <span><strong>Your account stays isolated.</strong> When you opt in, MOVO sends a limited selection of your own records to NasrinAI for the reply. Other users cannot access your accounts, transactions, budgets, or chats.</span>
    </div>
    <div className="movo-ai-thread" role="log" aria-live="polite" aria-label="Conversation">
      {!messages.length && <div className="movo-ai-welcome">
        <h2>Your money, with context.</h2>
        <p>Ask about spending, income, categories, accounts, or budgets. NasrinAI receives a limited, user-scoped snapshot—not access to your MOVO database.</p>
        <div className="movo-ai-suggestions">
          {['Summarize my recent spending', 'Which categories cost me the most?', 'How am I doing against my budgets?'].map((prompt) =>
            <button key={prompt} type="button" onClick={() => setDraft(prompt)}>{prompt}</button>
          )}
        </div>
      </div>}
      {messages.map((message, index) => <article key={index} className={'movo-ai-message ' + message.role}>
        <span className="movo-ai-message-label">{message.role === 'user' ? 'You' : 'NasrinAI'}</span>
        <p>{message.content}</p>
      </article>)}
      {busy && <div className="movo-ai-thinking" role="status"><span /><span /><span /> NasrinAI is thinking…</div>}
      <div ref={endRef} />
    </div>
    {error && <p className="movo-ai-error" role="alert">{error}</p>}
    {!session?.user || !cloudMode ? <div className="movo-ai-signin"><p>Sign in to securely connect your MOVO finances.</p></div> : <>
      <label className="movo-ai-consent"><input type="checkbox" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} /> <span>I agree to send the limited financial context needed to answer my question to NasrinAI.</span></label>
      <form className="movo-ai-composer" onSubmit={send}>
        <label className="sr-only" htmlFor="movo-ai-prompt">Message NasrinAI</label>
        <textarea id="movo-ai-prompt" ref={inputRef} rows="2" maxLength="1600" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask NasrinAI about your finances…" disabled={busy} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(e); } }} />
        <button type="submit" className="movo-ai-send" disabled={busy || !draft.trim() || !privacyAccepted} aria-label="Send message">{busy ? '…' : '↑'}</button>
      </form></>}
    <p className="movo-ai-footnote">AI can make mistakes. Verify important calculations. Financial actions are not performed from chat.</p>
  </section>;
}
