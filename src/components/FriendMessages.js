import React, { useCallback, useEffect, useRef, useState } from 'react';
import { chatRequest, transactionShareCard } from '../lib/friendChat';
import { newRecordId } from '../lib/recordId';
import { money } from '../lib/format';
import { t as tr } from '../lib/i18n';
import Icon from './Icon';
import { AccountOptions } from './AccountPicker';
import { eligibleFriendImportAccounts, friendImportAlreadySaved } from '../lib/friendTransactionImport';
import './FriendMessages.css';

function FriendPhoto({ name, photo }) {
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
    case 'invalid_transaction_card': return tr('Review the transaction card and try again.');
    case 'chat_network': return tr('Could not connect to Chats. Check your connection.');
    case 'shared_transaction_unavailable': return tr('This transaction is no longer available to review.');
    case 'share_acceptance_required': return tr('Accept this shared transaction before importing it.');
    case 'share_import_not_confirmed': return tr('Import is not confirmed in the cloud yet. Sync and retry.');
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

export function FriendChatsDirectory({ session, onSelect }) {
  const [friends, setFriends] = useState(null);
  const [error, setError] = useState('');
  const photosFetched = useRef(false);
  const load = useCallback((signal, refreshPhotos = false) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const full = refreshPhotos || !photosFetched.current;
    chatRequest(session, full ? 'inbox' : 'inbox_brief', {}, signal).then(result => {
      if (signal?.aborted) return;
      if (full) photosFetched.current = true;
      setFriends(previous => (result.friends || []).map(friend => ({
        ...friend, photo: full ? friend.photo : previous?.find(item => item.id === friend.id)?.photo || '',
      })));
      setError('');
    }).catch(cause => { if (!signal?.aborted && cause.name !== 'AbortError') setError(statusMessage(cause)); });
  }, [session]);
  useEffect(() => {
    const controller = new AbortController();
    photosFetched.current = false;
    load(controller.signal);
    const onReturn = () => { if (!document.hidden) load(controller.signal, true); };
    document.addEventListener('visibilitychange', onReturn);
    const timer = window.setInterval(() => { if (!document.hidden) load(controller.signal); }, 30000);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener('visibilitychange', onReturn); };
  }, [load]);
  return <section className="friend-chats" aria-label={tr('Private chats')}>
    {error && <p className="friends-note friends-error" role="alert">{error} <button type="button" onClick={() => load()}>{tr('Retry')}</button></p>}
    {friends === null && !error && <p role="status" className="friends-note">{tr('Loading…')}</p>}
    {friends?.length === 0 && <p className="friends-note">{tr('No conversations yet. Add a friend to start chatting.')}</p>}
    {friends?.map(friend => <button className="friend-chat-inbox-row" type="button" key={friend.id} onClick={() => onSelect(friend)}>
      <FriendPhoto name={friend.name} photo={friend.photo} />
      <span className="friend-chat-inbox-text"><strong dir="auto">{friend.name}</strong><small dir="auto">{friend.lastMessage || tr('Tap to start a chat')}</small></span>
      {friend.unread > 0 && <span className="friend-chat-unread" aria-label={tr('{count} unread messages', { count: friend.unread })}>{friend.unread > 99 ? '99+' : friend.unread}</span>}
      <Icon name="chevron" size={16} />
    </button>)}
  </section>;
}


/** Only the recipient can act on a shared card; no ledger change occurs here. */
function RecipientCardAction({ message, status, ready, busy, ownedTransactions, accounts,
  accountId, transferToAccountId, onAccountChange, onTransferChange, onDecision, onReviewImport, cloudMode }) {
  const alreadySaved = friendImportAlreadySaved(ownedTransactions, message.id);
  const compatible = eligibleFriendImportAccounts(message.card, accounts);
  const transfer = message.card?.type === 'transfer';
  const destinationOptions = compatible.filter(account => account.id !== accountId);
  const mapped = !!accountId && (!transfer || (!!transferToAccountId && transferToAccountId !== accountId));
  return <div className="friend-chat-recipient-review" aria-label={tr('Shared transaction review')}>
    {!ready && <p className="friends-note" role="status">{tr('Checking transaction sharing permissions…')}</p>}
    {ready && status === 'imported' && <p className="friend-import-success"><Icon name="check" size={16} />{tr('Already imported to your MOVO account')}</p>}
    {ready && status === 'declined' && <div className="friend-chat-choice">
      <span className="friends-note">{tr('You declined this transaction.')}</span>
      <button type="button" disabled={busy} onClick={() => onDecision('accept_share', message.id)}>{tr('Review again')}</button>
    </div>}
    {ready && !status && <div className="friend-chat-choice">
      <button type="button" className="friend-import-accept" disabled={busy} onClick={() => onDecision('accept_share', message.id)}>
        <Icon name="check" size={16}/>{tr('Accept for review')}
      </button>
      <button type="button" disabled={busy} onClick={() => onDecision('decline_share', message.id)}>{tr('Decline')}</button>
    </div>}
    {ready && status === 'accepted' && alreadySaved && <div className="friend-chat-choice">
      <p className="friends-note">{tr('Saved on this device. Cloud confirmation may still be pending.')}</p>
      {cloudMode && <button type="button" disabled={busy} onClick={() => onDecision('confirm_share_import', message.id)}>{tr('Check cloud confirmation')}</button>}
    </div>}
    {ready && status === 'accepted' && !alreadySaved && <div className="friend-chat-import-form">
      <p className="friends-note">{tr('Accepted for review. No transaction has been added yet.')}</p>
      {compatible.length === 0 ? <p className="friends-note friends-error">{tr('Add a wallet account with the shared currency before importing.')}</p> : <>
        <label>{tr('Import into your account')}
          <select aria-label={tr('Import into your account')} value={accountId} onChange={event => { onAccountChange(event.target.value); onTransferChange(''); }}>
            <option value="">{tr('Choose account')}</option>
            <AccountOptions accounts={compatible} currency />
          </select>
        </label>
        {transfer && <label>{tr('Destination account')}
          <select aria-label={tr('Destination account')} value={transferToAccountId} disabled={!accountId} onChange={event => onTransferChange(event.target.value)}>
            <option value="">{tr('Choose account')}</option>
            <AccountOptions accounts={destinationOptions} currency />
          </select>
        </label>}
        <button type="button" className="primary-button" disabled={busy || !mapped || !onReviewImport}
          onClick={() => onReviewImport({ message, accountId, transferToAccountId, connectionId: message.connectionId })}>
          <Icon name="receipt" size={17}/>{tr('Review and import')}
        </button>
      </>}
      <button type="button" className="friend-chat-decline-after" disabled={busy} onClick={() => onDecision('decline_share', message.id)}>{tr('Decline instead')}</button>
      <p className="friends-note">{tr('Saving creates a record only in your own ledger. It does not send money.')}</p>
    </div>}
  </div>;
}

export function FriendConversation({ session, friend, transactions = [], ownedTransactions = [], accounts = [], cloudMode = false, onReviewImport, onBack }) {
  const [thread, setThread] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [decisionsReady, setDecisionsReady] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [decisionBusy, setDecisionBusy] = useState('');
  const [importAccounts, setImportAccounts] = useState({});
  const [importDestinations, setImportDestinations] = useState({});
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [picker, setPicker] = useState(false);
  const [selected, setSelected] = useState('');
  const [includeDescription, setIncludeDescription] = useState(false);
  const [includeCategory, setIncludeCategory] = useState(false);
  const retryId = useRef(null);
  const end = useRef(null);
  const accessibleTxs = transactions.filter(tx => transactionShareCard(tx)).slice(0, 50);
  const picked = accessibleTxs.find(tx => String(tx.id) === selected);
  const card = transactionShareCard(picked, { description: includeDescription, category: includeCategory });
  const identity = session?.user?.id;
  const load = useCallback((signal) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    chatRequest(session, 'open', { connectionId: friend.id }, signal).then(result => {
      if (signal?.aborted) return;
      setThread(result); setError('');
      if (!document.hidden) chatRequest(session, 'read', { connectionId: friend.id }, signal).catch(() => {});
    }).catch(cause => { if (!signal?.aborted && cause.name !== 'AbortError') setError(statusMessage(cause)); });
    chatRequest(session, 'decisions', { connectionId: friend.id }, signal).then(result => {
      if (signal?.aborted) return;
      setDecisions(Object.fromEntries((result.decisions || []).map(item => [item.messageId, item.status])));
      setDecisionsReady(true);
      setDecisionError('');
    }).catch(cause => {
      if (signal?.aborted || cause.name === 'AbortError') return;
      setDecisionsReady(false);
      setDecisionError(statusMessage(cause));
    });
  }, [session, friend.id]);
  useEffect(() => {
    setThread(null); setDecisions({}); setDecisionsReady(false); setError(''); setDecisionError(''); setText(''); setSelected(''); setPicker(false); retryId.current = null;
    const controller = new AbortController();
    load(controller.signal);
    const onReturn = () => { if (!document.hidden) load(controller.signal); };
    document.addEventListener('visibilitychange', onReturn);
    const timer = window.setInterval(() => { if (!document.hidden) load(controller.signal); }, 18000);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener('visibilitychange', onReturn); };
  }, [load]);
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'nearest' }); }, [thread?.messages?.length]);

  async function decide(action, messageId) {
    if (decisionBusy || !decisionsReady) return;
    setDecisionBusy(messageId); setDecisionError('');
    try {
      const result = await chatRequest(session, action, { connectionId: friend.id, messageId });
      setDecisions(prev => ({ ...prev, [messageId]: result.status }));
    } catch (cause) { setDecisionError(statusMessage(cause)); }
    finally { setDecisionBusy(''); }
  }

  async function send(kind, payload) {
    if (sending) return;
    const clientId = retryId.current || newRecordId();
    retryId.current = clientId;
    setSending(true); setError('');
    try {
      await chatRequest(session, 'send', { connectionId: friend.id, clientId, kind, ...payload });
      retryId.current = null;
      if (kind === 'text') setText('');
      else { setSelected(''); setPicker(false); setIncludeDescription(false); setIncludeCategory(false); }
      load();
    } catch (cause) { setError(statusMessage(cause)); }
    finally { setSending(false); }
  }

  return <section className="friend-conversation" aria-label={tr('Private conversation')}>
    <header className="friend-chat-heading">
      <button type="button" className="friend-chat-back" onClick={onBack} aria-label={tr('Back to chats')}><Icon name="back" size={20} /></button>
      <FriendPhoto name={thread?.name || friend.name} photo={thread?.photo || friend.photo} />
      <div><strong dir="auto">{thread?.name || friend.name}</strong><small>{tr('MOVO friend · private chat')}</small></div>
    </header>
    <div className="friend-chat-messages" role="log" aria-label={tr('Messages')} aria-live="polite" aria-relevant="additions">
      {thread === null && !error && <p className="friends-note" role="status">{tr('Loading messages…')}</p>}
      {thread?.messages?.length === 0 && <p className="friends-note">{tr('Say hello! Only you and this friend can see these messages.')}</p>}
      {thread?.messages?.map(message => <article key={message.id} className={'friend-chat-bubble' + (message.senderId === identity ? ' mine' : '')}>
        {message.kind === 'transaction' ? <>
          <SharedCard card={message.card} />
          {message.senderId !== identity && <RecipientCardAction message={{ ...message, connectionId: friend.id }}
            status={decisions[message.id]} ready={decisionsReady} busy={decisionBusy === message.id}
            ownedTransactions={ownedTransactions} accounts={accounts} cloudMode={cloudMode}
            accountId={importAccounts[message.id] || ''} transferToAccountId={importDestinations[message.id] || ''}
            onAccountChange={value => setImportAccounts(old => ({ ...old, [message.id]: value }))}
            onTransferChange={value => setImportDestinations(old => ({ ...old, [message.id]: value }))}
            onDecision={decide} onReviewImport={onReviewImport}/>}
        </> : <p dir="auto">{message.body}</p>}
        <time dateTime={message.createdAt}>{stamp(message.createdAt)}</time>
      </article>)}
      <span ref={end} />
    </div>
    {error && <p className="friends-note friends-error" role="alert">{error}</p>}
    {decisionError && <p className="friends-note friends-error" role="alert">{decisionError}
      <button type="button" onClick={() => load()}>{tr('Retry')}</button></p>}
    <form className="friend-chat-composer" onSubmit={event => { event.preventDefault(); if (text.trim()) send('text', { body: text }); }}>
      <label className="sr-only" htmlFor="friend-chat-message">{tr('Message')}</label>
      <input id="friend-chat-message" type="text" maxLength={2000} value={text} disabled={sending} placeholder={tr('Message…')}
        onChange={event => { setText(event.target.value); retryId.current = null; }} />
      <button type="submit" className="friend-chat-send" disabled={sending || !text.trim() || !thread} aria-label={tr('Send message')}><Icon name="send" size={19} /></button>
    </form>
    <button type="button" className="friend-chat-toggle" disabled={sending || !thread} onClick={() => { setPicker(value => !value); setSelected(''); retryId.current = null; }}>
      <Icon name="quickActionShare" size={17} />{picker ? tr('Close transaction sharing') : tr('Share a transaction')}
    </button>
    {picker && <div className="friend-chat-picker">
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
    <p className="friends-note friend-chat-disclosure">{tr('Messages are stored online, visible to your friend and removed when the friendship is deleted. Shared cards never move money or automatically change either balance.')}</p>
  </section>;
}
