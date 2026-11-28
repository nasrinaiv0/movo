import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { chatRequest, transactionShareCard } from '../lib/friendChat';
import { newRecordId } from '../lib/recordId';
import { money } from '../lib/format';
import { t as tr } from '../lib/i18n';
import Icon from './Icon';
import FriendImportControls from './FriendImportControls';
import './FriendMessages.css';

export function FriendPhoto({ name, photo }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo]);
  const valid = typeof photo === 'string' && photo.startsWith('data:image/jpeg;base64,/') && photo.length <= 90000;
  return <span className="friend-chat-avatar" aria-hidden="true">{valid && !failed
    ? <img src={photo} alt="" onError={() => setFailed(true)} />
    : Array.from(name || '?')[0]?.toUpperCase()}</span>;
}

function statusMessage(error) {
  switch (error?.code) {
    case 'sign_in_required': return tr('Your session expired. Sign in again to use Chat.');
    case 'verified_account_required': return tr('Verify your account to use Chat.');
    case 'friend_connection_required': return tr('This friend connection is no longer available.');
    case 'message_rate_limit': return tr('Too many messages. Try again in a minute.');
    case 'chat_update_pending': return tr('Chats need a database update before they can be used.');
    case 'invalid_message': return tr('Review the message and try again.');
    case 'invalid_transaction_card': return tr('Review the transaction card and try again.');
    case 'chat_network': return tr('Could not connect to Chats. Check your connection.');
    default: return tr('Chats are unavailable right now. Try again.');
  }
}

function stamp(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';
}

function SharedCard({ card }) {
  if (!card) return null;
  return <div className="friend-shared-transaction" aria-label={tr('Shared transaction')}>
    <span className="friend-shared-kind">{tr('Shared transaction')} · {tr(card.type || 'Transaction')}</span>
    <strong dir="auto">{money(card.amount, card.currency)}</strong>
    <small>{card.date}</small>
    {card.description && <span dir="auto">{card.description}</span>}
    {card.category && <small dir="auto">{card.category}</small>}
    <small>{tr('Information only — no payment was sent.')}</small>
  </div>;
}

export function useFriendInbox(session, enabled = true) {
  const owner = session?.user?.id, token = session?.access_token;
  const auth = useMemo(() => ({ user: { id: owner }, access_token: token }), [owner, token]);
  const identity = `${owner || ''}:${token || ''}`;
  const [snapshot, setSnapshot] = useState({ identity, friends: null, error: '' });
  const scope = useRef(null);
  const refresh = useRef(() => {});
  useEffect(() => {
    const current = { active: true, photos: false, request: null };
    scope.current = current;
    setSnapshot({ identity, friends: null, error: '' });
    if (!enabled || !auth.user.id || !auth.access_token) return () => { current.active = false; };
    function load(fullPhotos = false) {
      if (document.hidden || !current.active) return;
      current.request?.abort();
      const request = new AbortController(); current.request = request;
      const full = fullPhotos || !current.photos;
      chatRequest(auth, full ? 'inbox' : 'inbox_brief', {}, request.signal).then(result => {
        if (!current.active || request.signal.aborted) return;
        if (full) current.photos = true;
        setSnapshot(previous => ({ identity, error: '', friends: (result.friends || []).map(friend => ({
          ...friend, photo: full ? friend.photo : previous.friends?.find(item => item.id === friend.id)?.photo || '',
        })) }));
      }).catch(cause => { if (current.active && !request.signal.aborted && cause.name !== 'AbortError')
        setSnapshot(previous => ({ ...previous, error: statusMessage(cause), sessionExpired: cause.code === 'sign_in_required', friends: cause.code === 'sign_in_required' ? null : previous.friends })); });
    }
    refresh.current = load;
    load();
    const onReturn = () => { if (!document.hidden) load(true); };
    document.addEventListener('visibilitychange', onReturn);
    const timer = window.setInterval(() => load(), 30000);
    return () => { current.active = false; current.request?.abort(); window.clearInterval(timer); document.removeEventListener('visibilitychange', onReturn); };
  }, [auth, identity, enabled]);
  return { sessionExpired: enabled && snapshot.identity === identity && snapshot.sessionExpired === true, friends: enabled && snapshot.identity === identity ? snapshot.friends : null,
    error: enabled && snapshot.identity === identity ? snapshot.error : '', reload: () => refresh.current(),
    remove: id => {
      scope.current?.request?.abort();
      setSnapshot(previous => previous.identity === identity ? { ...previous, friends: previous.friends?.filter(friend => friend.id !== id) ?? null } : previous);
    } };
}

export function FriendChatsDirectory({ session, onSelect, onAdd, search = '', selectedId, inbox }) {
  const local = useFriendInbox(session, !inbox);
  const { friends, error, reload } = inbox || local;
  const matches = friends?.filter(friend => friend.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <section className="friend-chats" aria-label={tr('Private chats')}>
    {error && <p className="friends-note friends-error" role="alert">{error} <button type="button" onClick={reload}>{tr('Retry')}</button></p>}
    {friends === null && !error && <div className="friend-inbox-skeleton" role="status" aria-label={tr('Loading…')}><span /><span /><span /></div>}
    {friends?.length === 0 && <div className="friends-workspace-state"><Icon name="message" size={32} /><h2>{tr('Start a conversation')}</h2><p>{tr('No conversations yet. Add a friend to start chatting.')}</p>{onAdd && <button type="button" className="primary-button" onClick={onAdd}>{tr('Add friend')}</button>}</div>}
    {friends?.length > 0 && matches.length === 0 && <p className="friends-note" role="status">{tr('No chats match your search.')}</p>}
    {matches?.map(friend => <button className="friend-chat-inbox-row" type="button" key={friend.id} aria-current={selectedId === friend.id ? 'true' : undefined} onClick={() => onSelect(friend)}>
      <FriendPhoto name={friend.name} photo={friend.photo} />
      <span className="friend-chat-inbox-text"><strong dir="auto">{friend.name}</strong><small dir="auto">{friend.lastMessage || tr('Tap to start a chat')}</small></span>
      <span className="friend-chat-inbox-meta">{friend.updatedAt && <time dateTime={friend.updatedAt}>{stamp(friend.updatedAt)}</time>}
      {friend.unread > 0 && <span className="friend-chat-unread" aria-label={tr('{count} unread messages', { count: friend.unread })}>{friend.unread > 99 ? '99+' : friend.unread}</span>}</span>
    </button>)}
  </section>;
}

export function FriendConversation({ session, friend, transactions = [], importAccounts = [], onImport, onBack, onOpenProfile, drafts, onReportMessage }) {
  const [thread, setThread] = useState(null);
  const seenMessages = useRef(null);
  const [arrivals, setArrivals] = useState(new Set());
  const heading = useRef(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const draftKey = `${session?.user?.id || ''}:${friend.id}`;
  const [text, setText] = useState(() => drafts?.get(draftKey)?.text || '');
  const [picker, setPicker] = useState(false);
  const [reporting, setReporting] = useState(false);
  const reportMenu = useRef(null);
  const reportCancel = useRef(null);
  const wasReporting = useRef(false);
  useEffect(() => { if (!onReportMessage) setReporting(false); }, [onReportMessage]);
  useEffect(() => {
    if (reporting) reportCancel.current?.focus();
    else if (wasReporting.current) reportMenu.current?.querySelector('summary')?.focus();
    wasReporting.current = reporting;
  }, [reporting]);
  const [selected, setSelected] = useState('');
  const [includeDescription, setIncludeDescription] = useState(false);
  const [includeCategory, setIncludeCategory] = useState(false);
  const retryId = useRef(drafts?.get(draftKey)?.retryId || null);
  const sendLock = useRef(false);
  const lifecycle = useRef(null);
  const scopeKey = `${draftKey}:${session?.access_token || ''}`;
  if (lifecycle.current?.key !== scopeKey) {
    lifecycle.current?.controller.abort();
    lifecycle.current = { key: scopeKey, controller: new AbortController() };
  }
  const scope = lifecycle.current;
  const [threadScope, setThreadScope] = useState(scopeKey);
  const visibleThread = threadScope === scopeKey ? thread : null;
  const requestSequence = useRef(0);
  const isCurrent = () => lifecycle.current === scope && !scope.controller.signal.aborted;
  const messages = useRef(null);
  const atLatest = useRef(true);
  const firstLoad = useRef(true);
  const priorMessageCount = useRef(null);
  const readingPosition = useRef(drafts?.get(draftKey));
  const initialUnread = useRef({ key: scopeKey, count: friend.unread });
  if (initialUnread.current.key !== scopeKey) initialUnread.current = { key: scopeKey, count: friend.unread };
  const [showLatest, setShowLatest] = useState(false);
  const [unreadBoundary, setUnreadBoundary] = useState(null);
  const jumpLatest = () => { end.current?.scrollIntoView?.({ block: 'nearest' }); atLatest.current = true; setShowLatest(false); };
  useEffect(() => {
    if (scope.controller.signal.aborted) scope.controller = new AbortController();
    sendLock.current = false; setSending(false);
    return () => scope.controller.abort();
  }, [scope]);
  useEffect(() => { if (threadScope === scopeKey) drafts?.set(draftKey, { ...drafts.get(draftKey), text, retryId: retryId.current }); }, [text, sending, drafts, draftKey, threadScope, scopeKey]);
  const end = useRef(null);
  const accessibleTxs = transactions.filter(tx => transactionShareCard(tx)).slice(0, 50);
  const picked = accessibleTxs.find(tx => String(tx.id) === selected);
  const card = transactionShareCard(picked, { description: includeDescription, category: includeCategory });
  const identity = session?.user?.id;
  const token = session?.access_token;
  const auth = useMemo(() => ({ user: { id: identity }, access_token: token }), [identity, token]);
  const [decisions, setDecisions] = useState(null);
  const importAvailable = Boolean(onImport && identity);
  useEffect(() => {
    setDecisions(null);
    if (!importAvailable) return undefined;
    const controller = new AbortController();
    chatRequest(session, 'decisions', { connectionId: friend.id }, controller.signal).then(result => {
      if (!controller.signal.aborted && result.atomicImport === true && Array.isArray(result.decisions))
        setDecisions(Object.fromEntries(result.decisions.filter(d => ['accepted','declined','imported'].includes(d.status)).map(d => [d.messageId,d.status])));
    }).catch(() => { /* missing migration or rollout gate: informational cards only */ });
    return () => controller.abort();
  }, [session, identity, friend.id, importAvailable]);
  const load = useCallback((signal) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const activeSignal = signal || scope.controller.signal;
    const sequence = ++requestSequence.current;
    chatRequest(auth, 'open', { connectionId: friend.id }, activeSignal).then(result => {
      if (activeSignal.aborted || lifecycle.current !== scope || sequence !== requestSequence.current) return;
      if (firstLoad.current && initialUnread.current.count > 0) setUnreadBoundary(result.messages?.filter(message => message.senderId !== identity).slice(-initialUnread.current.count)[0]?.id || null);
      const ids = new Set((result.messages || []).map(message => message.id));
      setArrivals(seenMessages.current ? new Set([...ids].filter(id => !seenMessages.current.has(id))) : new Set());
      seenMessages.current = ids; setThread(result); setError('');
      if (!document.hidden) chatRequest(auth, 'read', { connectionId: friend.id }, activeSignal).catch(() => {});
    }).catch(cause => { if (!activeSignal.aborted && lifecycle.current === scope && sequence === requestSequence.current && cause.name !== 'AbortError') {
      setError(statusMessage(cause));
      if (['sign_in_required', 'friend_connection_required'].includes(cause.code)) { setThread(null); setDecisions(null); }
    } });
  }, [auth, identity, friend.id, scope]);
  useEffect(() => {
    readingPosition.current = drafts?.get(draftKey);
    seenMessages.current = null; setArrivals(new Set());
    setThreadScope(scopeKey); setThread(null); setError(''); setText(drafts?.get(draftKey)?.text || ''); setSelected(''); setPicker(false); setReporting(false); retryId.current = drafts?.get(draftKey)?.retryId || null; firstLoad.current = true; atLatest.current = true; setUnreadBoundary(null);
    const controller = new AbortController();
    load(controller.signal);
    const onReturn = () => { if (!document.hidden) load(controller.signal); };
    document.addEventListener('visibilitychange', onReturn);
    const timer = window.setInterval(() => { if (!document.hidden) load(controller.signal); }, 18000);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener('visibilitychange', onReturn); };
  }, [load, draftKey, drafts, scopeKey]);
  useEffect(() => {
    if (!thread || (!firstLoad.current && priorMessageCount.current === thread.messages?.length)) return;
    priorMessageCount.current = thread.messages?.length;
    const saved = readingPosition.current;
    if (firstLoad.current && saved?.atLatest === false && Number.isFinite(saved.scrollTop) && messages.current) {
      messages.current.scrollTop = saved.scrollTop; atLatest.current = false; setShowLatest(true);
    } else if (firstLoad.current || atLatest.current) jumpLatest();
    else setShowLatest(true);
    firstLoad.current = false;
  }, [thread]);

  async function send(kind, payload) {
    if (sendLock.current || !isCurrent()) return;
    sendLock.current = true;
    const clientId = retryId.current || newRecordId();
    retryId.current = clientId;
    setSending(true); setError('');
    try {
      await chatRequest(session, 'send', { connectionId: friend.id, clientId, kind, ...payload }, scope.controller.signal);
      if (!isCurrent()) return;
      atLatest.current = true;
      retryId.current = null;
      if (kind === 'text') setText('');
      else { setSelected(''); setPicker(false); setIncludeDescription(false); setIncludeCategory(false); }
      load();
    } catch (cause) { if (isCurrent()) {
      setError(statusMessage(cause));
      if (['sign_in_required', 'friend_connection_required'].includes(cause.code)) { setThread(null); setDecisions(null); }
    } }
    finally { if (isCurrent()) { setSending(false); sendLock.current = false; } }
  }

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [friend.id]);
  const grouped = (previous, message) => previous && message && previous.senderId === message.senderId
    && message.id !== unreadBoundary && new Date(previous.createdAt).toDateString() === new Date(message.createdAt).toDateString()
    && new Date(message.createdAt) - new Date(previous.createdAt) >= 0 && new Date(message.createdAt) - new Date(previous.createdAt) <= 300000;

  return <section className="friend-conversation" aria-label={tr('Private conversation')}>
    <header className="friend-chat-heading" ref={heading} tabIndex={-1} aria-label={friend.name}>
      <button type="button" className="friend-chat-back" onClick={onBack} aria-label={tr('Back to chats')}><Icon name="back" size={20} /></button>
      <button type="button" className="friend-chat-profile" onClick={onOpenProfile} disabled={!onOpenProfile} aria-label={tr('Profile for {name}', { name: visibleThread?.name || friend.name })}>
        <FriendPhoto name={visibleThread?.name || friend.name} photo={visibleThread?.photo || friend.photo} />
        <span><strong dir="auto" role="heading" aria-level={1}>{visibleThread?.name || friend.name}</strong><small>{tr('MOVO friend · private chat')}</small></span>{onOpenProfile && <Icon name="chevron" size={16} />}
      </button>
      {onReportMessage && <details ref={reportMenu} className="friend-chat-options" onKeyDown={event => {
        if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary').focus(); }
      }}><summary aria-label={tr('Conversation options')}><Icon name="more" size={20} /></summary>
        <button type="button" onClick={event => { setReporting(true); event.currentTarget.closest('details').open = false; }}>{tr('Report a message')}</button></details>}
    </header>
    {reporting && onReportMessage && <div className="friend-report-guidance"><p>{tr('Choose a received message to report.')}</p><button ref={reportCancel} type="button" className="friends-secondary" onClick={() => setReporting(false)}>{tr('Cancel')}</button></div>}
    <div ref={messages} className="friend-chat-messages" tabIndex={0} onScroll={() => {
      const node = messages.current; atLatest.current = node.scrollHeight - node.scrollTop - node.clientHeight < 64;
      if (atLatest.current) setShowLatest(false);
      drafts?.set(draftKey, { ...drafts.get(draftKey), scrollTop: node.scrollTop, atLatest: atLatest.current });
    }} role="log" aria-label={tr('Messages')} aria-live="polite" aria-relevant="additions">
      {visibleThread === null && !error && <p className="friends-note" role="status">{tr('Loading messages…')}</p>}
      {visibleThread?.messages?.length === 0 && <p className="friends-note">{tr('Say hello! Only you and this friend can see these messages.')}</p>}
      {visibleThread?.messages?.map((message, index) => <React.Fragment key={message.id}>
        {(index === 0 || new Date(message.createdAt).toDateString() !== new Date(visibleThread.messages[index - 1].createdAt).toDateString()) && <div className="friend-chat-day"><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time></div>}
        {unreadBoundary === message.id && <span className="friend-chat-day">{tr('Unread messages')}</span>}
        <article className={'friend-chat-bubble' + (message.senderId === identity ? ' mine' : '') + (grouped(visibleThread.messages[index - 1], message) ? ' grouped' : '') + (arrivals.has(message.id) ? ' just-arrived' : '')}>
        {message.kind === 'transaction' ? <SharedCard card={message.card} /> : <p dir="auto">{message.body}</p>}
        {importAvailable && decisions !== null && message.kind === 'transaction' && message.senderId !== identity &&
          <FriendImportControls key={`${identity}:${friend.id}:${message.id}`} session={session} connectionId={friend.id} message={message}
            initialStatus={decisions[message.id] || 'unreviewed'} accounts={importAccounts} onImport={onImport} />}
        {reporting && onReportMessage && message.senderId !== identity && <button type="button" className="friend-message-report" onClick={async () => {
          const done = await onReportMessage?.(friend, message); if (isCurrent() && done) setReporting(false);
        }}>{tr('Report this message')}</button>}
        <time className={grouped(message, visibleThread.messages[index + 1]) ? 'sr-only' : undefined} dateTime={message.createdAt} aria-label={new Date(message.createdAt).toLocaleString()}>{stamp(message.createdAt)}</time>
      </article></React.Fragment>)}
      <span ref={end} />
    </div>
    {showLatest && <button type="button" className="friend-jump-latest" onClick={jumpLatest}>{tr('Jump to latest')}</button>}
    {error && <p className="friends-note friends-error" role="alert">{error} <button type="button" onClick={() => load()}>{tr('Retry')}</button></p>}

    {picker && <div className="friend-chat-picker" id="friend-transaction-picker">
      <p className="friends-note">{tr('Choose only the details you want your friend to see. No account, card, receipt or payment credentials are shared.')}</p>
      <label><span>{tr('Your recent transactions')}</span>
        <select value={selected} onChange={event => { setSelected(event.target.value); retryId.current = null; }}>
          <option value="">{tr('Select a transaction')}</option>
          {accessibleTxs.map(tx => <option key={tx.id} value={tx.id}>{tx.date?.slice(0, 10)} · {tx.type} · {money(tx.origAmount ?? tx.amount, tx.origCurrency || tx.currency)}</option>)}
        </select>
      </label>
      {card && <>
        <label className="friend-chat-checkbox"><input type="checkbox" checked={includeDescription} onChange={e => { setIncludeDescription(e.target.checked); retryId.current = null; }} />{tr('Include description')}</label>
        <label className="friend-chat-checkbox"><input type="checkbox" checked={includeCategory} onChange={e => { setIncludeCategory(e.target.checked); retryId.current = null; }} />{tr('Include category')}</label>
        <SharedCard card={card} />
        <button type="button" className="primary-button" disabled={sending} onClick={() => send('transaction', { card })}>
          <Icon name="send" size={17} />{sending ? tr('Sending…') : tr('Send this transaction card')}
        </button>
      </>}
      {!accessibleTxs.length && <p className="friends-note">{tr('You have no eligible transactions to share.')}</p>}
    </div>}
    <form className="friend-chat-composer" onSubmit={event => { event.preventDefault(); if (text.trim()) send('text', { body: text }); }}>
    <button type="button" className="friend-chat-toggle" aria-expanded={picker} aria-controls="friend-transaction-picker" disabled={sending || !visibleThread} onClick={() => { setPicker(value => !value); setSelected(''); retryId.current = null; }}>
      <Icon name="quickActionShare" size={20} /><span className="sr-only">{picker ? tr('Close transaction sharing') : tr('Share a transaction')}</span>
    </button>
      <label className="sr-only" htmlFor="friend-chat-message">{tr('Message')}</label>
      <input id="friend-chat-message" type="text" maxLength={2000} value={threadScope === scopeKey ? text : ''} disabled={sending} placeholder={tr('Message…')}
        onChange={event => { setText(event.target.value); retryId.current = null; }} />
      <button type="submit" className="friend-chat-send" disabled={sending || !text.trim() || !visibleThread} aria-busy={sending || undefined} aria-label={sending ? tr('Sending…') : tr('Send message')}><Icon name="send" size={19} /></button>
    </form>
    <details className="friends-note friend-chat-disclosure"><summary><Icon name="shield" size={14} />{tr('Privacy & sharing')}</summary><p>{tr('Messages are stored online, visible to your friend and removed when the friendship is deleted. Shared cards never move money or automatically change either balance.')}</p></details>
  </section>;
}
