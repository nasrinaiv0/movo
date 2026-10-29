import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function friendlyError(code) {
  if (code === 'sign_in_required' || code === 'invalid_session') return 'Sign in to MOVO to use your private financial copilot.';
  if (code === 'nasrinai_not_configured') return 'NasrinAI is not configured on the MOVO server yet.';
  if (code === 'conversation_not_found') return 'This conversation is not available in your account.';
  return 'NasrinAI could not answer right now. Please try again shortly.';
}

export default function NasrinAIChat({ session, cloudMode, accounts = [], transactions = [], stats = {} }) {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  const send = async (event) => {
    event?.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    if (!session?.user || !cloudMode || !supabase) {
      setError('Sign in to MOVO first. Private financial chat is disabled in local/demo mode.');
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
        body: JSON.stringify({ message, conversationId })
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
      <span><strong>Your data stays yours.</strong> Answers use only your signed-in MOVO records. Other users cannot access your accounts, transactions, budgets, or chats.</span>
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
    {!session?.user || !cloudMode ? <div className="movo-ai-signin"><p>Sign in to securely connect your MOVO finances.</p></div> :
      <form className="movo-ai-composer" onSubmit={send}>
        <label className="sr-only" htmlFor="movo-ai-prompt">Message NasrinAI</label>
        <textarea id="movo-ai-prompt" ref={inputRef} rows="2" maxLength="4000" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask NasrinAI about your finances…" disabled={busy} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(e); } }} />
        <button type="submit" className="movo-ai-send" disabled={busy || !draft.trim()} aria-label="Send message">{busy ? '…' : '↑'}</button>
      </form>}
    <p className="movo-ai-footnote">AI can make mistakes. Verify important calculations. Financial actions are not performed from chat.</p>
  </section>;
}
