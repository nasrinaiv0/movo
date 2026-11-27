import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Icon from './Icon';
import { MovoMark } from './MovoLogo';
import { t as tr } from '../lib/i18n';
import './FriendsConnect.css';

const FriendQrScanner = React.lazy(() => import('./FriendQrScanner'));

export default function FriendInvitations({ controller: c }) {
  const { mode, url, card, invite, directory, share, platform, createInvite, nameField, busy, validName,
    hasActiveInvite, run, setInvite, setActiveUntil, setRefresh, setNotice, preview, connectMethods,
    scanning, scanned, setScanning, acceptInvite, setLookup, setPreview, onInviteHandled, showMode,
    openIncoming, incoming, setIncoming, lookup } = c;
  return <div className="friends-content">
        {mode === 'invite' && <>
          {url ? <div className="friends-invite">
            <div ref={card} className="friend-profile-card" aria-label={tr('Friend invite profile card')}>
              <span className="friend-profile-initial" aria-hidden="true">{Array.from(invite.name || '')[0]?.toLocaleUpperCase()}</span>
              <h3 dir="auto">{invite.name}</h3>
              {directory?.handle && <span className="friend-profile-handle" dir="ltr">@{directory.handle}</span>}
              <QRCodeSVG className="friends-qr" value={url} size={224} level="M" marginSize={4} title={tr('Friend invite QR code')} />
              <span className="friend-profile-brand"><MovoMark size={21} tone="mono" />MOVO</span>
              <small className="friend-profile-expiry">{tr('An invite can be used once and expires after 24 hours.')}</small>
            </div>
            <label className="friends-field"><span>{tr('Invite link')}</span><input dir="ltr" readOnly value={url} onFocus={event => event.target.select()} /></label>
            <div className="friends-actions">
              <button type="button" className="primary-button" disabled={busy} onClick={() => share()}><Icon name="send" size={17} />{tr('Share profile')}</button>
              <button type="button" className="friends-secondary" disabled={busy} onClick={() => share(true)}><Icon name="copy" size={17} />{tr('Copy link')}</button>
            </div>
            <p className="friends-note">{platform === 'ios' ? tr('Choose AirDrop in the share sheet.') : platform === 'android' ? tr('Choose Quick Share when it appears in the share sheet.') : tr('Ask a friend to scan the QR with their phone camera.')}</p>
          </div> : <form className="friends-form" onSubmit={createInvite}>
            {nameField}
            <button type="submit" className="primary-button" disabled={busy || !validName}>{hasActiveInvite ? tr('Replace invite') : tr('Create invite')}</button>
          </form>}
          <p className="friends-note">{tr('An invite can be used once and expires after 24 hours.')}</p>
          {hasActiveInvite && <button type="button" className="friends-secondary" disabled={busy}
            onClick={() => run('revoke', {}, () => { setInvite(null); setActiveUntil(null); setRefresh(value => value + 1); setNotice(tr('Invite revoked.')); })}>{tr('Revoke invite')}</button>}
        </>}
        {mode === 'join' && !preview && connectMethods}
        {mode === 'join' && scanning ? <React.Suspense fallback={<p role="status">{tr('Loading…')}</p>}><FriendQrScanner onScan={scanned} onClose={() => setScanning(false)} /></React.Suspense> : mode === 'join' && (preview ? <form className="friends-form" onSubmit={acceptInvite}>
          <div className="friends-recipient"><Icon name="user" size={20} /><strong dir="auto">{preview.name}</strong></div>
          {preview.connected ? <p className="friends-note">{tr('You are already friends.')}</p> : <>
            {nameField}
            <button type="submit" className="primary-button" disabled={busy || !validName}>{tr('Accept invite')}</button>
          </>}
          <button type="button" className="friends-secondary" disabled={busy} onClick={() => {
            setLookup(''); setPreview(null); onInviteHandled?.(); showMode('list');
          }}>{preview.connected ? tr('Done') : tr('Cancel')}</button>
        </form> : <form className="friends-form" onSubmit={openIncoming}>
          <label className="friends-field"><span>{tr('Paste invite link')}</span>
            <input dir="ltr" value={incoming} onChange={event => setIncoming(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={350} />
          </label>
          <button type="submit" className="primary-button" disabled={!incoming.trim() || Boolean(lookup)}>{lookup ? tr('Loading…') : tr('Review invite')}</button>
        </form>)}
  </div>;
}
