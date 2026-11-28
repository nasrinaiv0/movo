import React, { useEffect, useRef, useState } from 'react';
import { chatRequest } from '../lib/friendChat';
import { t as tr } from '../lib/i18n';

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export default function FriendImportControls({ session, connectionId, message, initialStatus, accounts = [], onImport }) {
  const ownerId = session?.user?.id;
  const card = message?.card;
  const [status, setStatus] = useState(initialStatus);
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [attempt, setAttempt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const active = useRef(true);
  const gate = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const eligible = accounts.filter(a => a.user_id === ownerId && !a.is_archived && !a.linkedAccountId
    && a.currency === card?.currency && UUID.test(a.id) && ['bank','card','e_wallet','cash','investment','other'].includes(a.account_type));
  const valid = UUID.test(ownerId || '') && UUID.test(connectionId || '') && UUID.test(message?.id || '')
    && message.senderId !== ownerId && ['expense','income','transfer'].includes(card?.type)
    && /^[A-Z]{3}$/.test(card?.currency || '') && /^20\d{2}-\d{2}-\d{2}$/.test(card?.date || '');
  if (!valid) return null;
  const transfer = card.type === 'transfer';
  const mapped = eligible.some(a => a.id === source) && (!transfer || (destination !== source && eligible.some(a => a.id === destination)));
  async function decide(action) {
    if (gate.current || attempt || status === 'imported') return;
    gate.current = true; setBusy(true); setNotice('');
    try {
      const result = await chatRequest(session, action, { connectionId, messageId: message.id });
      if (result.messageId !== message.id || !['accepted','declined','imported'].includes(result.status)) throw new Error('invalid_decision');
      if (active.current) setStatus(result.status);
    } catch { if (active.current) setNotice(tr('Could not verify your decision. Retry when connected.')); }
    finally { gate.current = false; if (active.current) setBusy(false); }
  }
  async function submit() {
    if (gate.current || status !== 'accepted' || (!attempt && !mapped)) return;
    const mapping = attempt || { ownerId, connectionId, messageId: message.id, accountId: source, destinationId: transfer ? destination : null, date: card.date };
    gate.current = true; setAttempt(mapping); setBusy(true); setNotice('');
    try {
      const receipt = await onImport(mapping);
      if (receipt?.ownerId !== ownerId || receipt?.messageId !== message.id || receipt?.transactionId !== message.id || receipt?.status !== 'imported') throw new Error('invalid_receipt');
      if (active.current) { setStatus('imported'); setNotice(receipt.refreshed ? '' : tr('Saved securely. Refresh your cloud records to see the change.')); }
    } catch { if (active.current) setNotice(tr('Import not confirmed. Retry the same accounts; no offline transaction was created.')); }
    finally { gate.current = false; if (active.current) setBusy(false); }
  }
  return <div className="friend-import-controls" aria-label={tr('Receive shared transaction')}>
    {status === 'imported' ? <p role="status">{tr('Imported to your records')}</p> : <>
      <p>{status === 'accepted' ? tr('Accepted. Choose your own accounts before saving.') : status === 'declined' ? tr('Declined. No transaction was added.') : tr('Review this card before accepting. No money is moved.')}</p>
      {!attempt && <div className="friend-import-actions">
        {status !== 'accepted' && <button className="primary-button" type="button" disabled={busy} onClick={() => decide('accept_share')}>{tr('Accept')}</button>}
        {status !== 'declined' && <button type="button" disabled={busy} onClick={() => decide('decline_share')}>{tr('Decline')}</button>}
      </div>}
      {status === 'accepted' && <>
        <label>{tr('Your account')}<select value={source} disabled={busy || Boolean(attempt)} onChange={e => { setSource(e.target.value); setDestination(''); }}>
          <option value="">{tr('Select an account')}</option>{eligible.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select></label>
        {transfer && <label>{tr('Receiving account')}<select value={destination} disabled={busy || Boolean(attempt)} onChange={e => setDestination(e.target.value)}>
          <option value="">{tr('Select an account')}</option>{eligible.filter(a => a.id !== source).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select></label>}
        <p>{tr('Shared calendar date')}: {card.date} · {tr('No payment is sent.')}</p>
        <button type="button" className="primary-button" disabled={busy || (!attempt && !mapped)} onClick={submit}>{busy ? tr('Saving…') : attempt ? tr('Retry same import') : tr('Save to my transactions')}</button>
      </>}
    </>}
    {notice && <p role="status">{notice}</p>}
  </div>;
}
