import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import FriendsDiscovery from './FriendsDiscovery';
import Icon from './Icon';
import { Sheet } from './ui';
import { useConfirm } from './ConfirmDialog';
import { t as tr } from '../lib/i18n';
import { nativePlatform } from '../lib/platform';
import { friendDisplayName, friendInviteToken, friendInviteUrl, copyFriendInvite, friendsRequest, shareFriendInvite } from '../lib/friends';

export function friendErrorMessage(error) {
  switch (error?.code) {
    case 'invite_unavailable': return tr('This invite is expired, used or replaced.');
    case 'own_invite': return tr('This is your own friend invite.');
    case 'friend_limit': return tr('One of these accounts has reached the friends limit.');
    case 'sign_in_required': return tr('Your session expired. Sign in again to use Friends.');
    case 'friends_network': return tr('Could not connect to Friends. Check your connection and try again.');
    case 'friends_update_pending': return tr('Friends is being updated. Try again shortly.');
    case 'invalid_friend_handle': return tr('Use 3–24 letters, numbers or underscores.');
    case 'friend_handle_taken': return tr('That MOVO username is already taken.');
    case 'friend_handle_required': return tr('Set a MOVO username before you send a request.');
    case 'friend_request_received': return tr('This person has already sent you a request. Check your Friends list.');
    case 'already_friends': return tr('You are already friends.');
    case 'friend_rate_limit': return tr('Too many requests. Try again later.');
    case 'friend_request_unavailable': return tr('This friend request is unavailable or expired.');
    case 'friend_connection_required': return tr('This friend connection is no longer available.');
    case 'invalid_friend_summary': return tr('Check the summary details and try again.');
    case 'verified_account_required': return tr('Verify your account to use Friends.');
    default: return tr('Friends are unavailable right now. Try again.');
  }
}

export default function FriendsSheet({ onClose, ...props }) {
  return <Sheet title={tr('Friends')} className="friends-sheet" onClose={onClose}><FriendsContent {...props} /></Sheet>;
}

export function FriendsContent({ session, inviteToken, onSignIn, onInviteHandled, onOpenSummary }) {
  const socialAvailable = Boolean(onOpenSummary);
  const signedIn = Boolean(session?.user?.id && session.access_token);
  const [friends, setFriends] = useState(null);
  const [directory, setDirectory] = useState(null);
  const [directoryError, setDirectoryError] = useState('');
  const reload = () => setRefresh(value => value + 1);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(inviteToken ? 'join' : 'list');
  const [refresh, setRefresh] = useState(0);
  const [incoming, setIncoming] = useState('');
  const [lookup, setLookup] = useState(inviteToken || '');
  const [preview, setPreview] = useState(null);
  const [name, setName] = useState('');
  const [invite, setInvite] = useState(null);
  const [activeUntil, setActiveUntil] = useState(null);
  const [inviteClock, setInviteClock] = useState(Date.now);
  const lock = useRef(false);
  const confirm = useConfirm();
  const validName = friendDisplayName(name);
  const hasActiveInvite = Date.parse(activeUntil) > inviteClock;
  const url = invite && Date.parse(invite.expiresAt) > inviteClock ? friendInviteUrl(invite.token) : '';
  const platform = nativePlatform();

  useEffect(() => {
    if (!signedIn) return undefined;
    const controller = new AbortController();
    friendsRequest({ access_token: session.access_token }, 'list', {}, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;
        setListError('');
        setFriends(result.friends);
        setActiveUntil(result.activeInviteUntil);
        setInvite(current => current && result.activeInviteUntil && Date.parse(current.expiresAt) === Date.parse(result.activeInviteUntil) ? current : null);
      })
      .catch(cause => { if (!controller.signal.aborted) setListError(friendErrorMessage(cause)); });
    if (socialAvailable) friendsRequest({ access_token: session.access_token }, 'directory', {}, controller.signal)
      .then(result => { if (!controller.signal.aborted) { setDirectory(result); setDirectoryError(''); } })
      .catch(cause => { if (!controller.signal.aborted) setDirectoryError(friendErrorMessage(cause)); });
    function refreshOnReturn() {
      if (!document.hidden) setRefresh(value => value + 1);
    }
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => {
      controller.abort();
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, [signedIn, session?.access_token, refresh, socialAvailable]);

  useEffect(() => {
    if (!signedIn || !lookup || mode !== 'join') return undefined;
    const controller = new AbortController();
    setPreview(null);
    setError('');
    friendsRequest({ access_token: session.access_token }, 'preview', { token: lookup }, controller.signal)
      .then(result => { if (!controller.signal.aborted) setPreview(result); })
      .catch(cause => { if (!controller.signal.aborted) { setError(friendErrorMessage(cause)); setLookup(''); } });
    return () => controller.abort();
  }, [signedIn, session?.access_token, lookup, mode]);

  useEffect(() => {
    if (!invite) return undefined;
    const timer = window.setTimeout(() => setInviteClock(Date.now()), Math.max(0, Date.parse(invite.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [invite]);

  function showMode(next) {
    setMode(next);
    if (next !== mode && next !== 'join') setRefresh(value => value + 1);
    setError('');
    setNotice('');
  }

  async function run(action, payload, onSuccess) {
    if (lock.current || !signedIn) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      onSuccess(await friendsRequest(session, action, payload));
    } catch (cause) {
      setError(friendErrorMessage(cause));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  function openIncoming(event) {
    event.preventDefault();
    const token = friendInviteToken(incoming);
    if (!token) return setError(tr('Enter a valid MOVO invite link.'));
    setError('');
    setLookup(token);
  }

  async function share(copyOnly = false) {
    if (!url || busy) return;
    setError('');
    try {
      const outcome = copyOnly ? await copyFriendInvite(url).then(() => 'copied') : await shareFriendInvite(url, tr('MOVO friend invite'));
      if (outcome === 'copied') setNotice(tr('Invite link copied.'));
    } catch (cause) {
      if (cause?.name !== 'AbortError') setError(tr('Sharing is unavailable. Scan the QR or select and copy the link.'));
    }
  }

  function createInvite(event) {
    event.preventDefault();
    if (!validName) return;
    run('create', { name: validName }, result => {
      setInvite(result);
      setInviteClock(Date.now());
      setActiveUntil(result.expiresAt);
      setRefresh(value => value + 1);
    });
  }

  function acceptInvite(event) {
    event.preventDefault();
    if (!validName || !lookup || !preview || preview.connected) return;
    run('accept', { token: lookup, name: validName }, result => {
      onInviteHandled?.();
      setLookup('');
      setIncoming('');
      setPreview(null);
      showMode('list');
      setNotice(tr('You and {name} are now friends.', { name: result.name }));
    });
  }

  async function removeFriend(friend) {
    if (busy || !(await confirm({
      title: tr('Remove friend?'), message: tr('Remove {name} from your friends list?', { name: friend.name }),
      confirmLabel: tr('Remove'), icon: 'user', danger: true,
    }))) return;
    run('remove', { connectionId: friend.id }, () => {
      setFriends(current => current?.filter(item => item.id !== friend.id) ?? null);
      setNotice(tr('Friend removed.'));
    });
  }

  async function safetyAction(action, payload) {
    const blocking = action === 'block';
    const title = blocking ? tr('Block user') : tr('Report to MOVO');
    if (!(await confirm({ title, message: blocking ? tr('Blocking removes the connection and stops future friend requests.')
      : tr('MOVO support will review your report.'), confirmLabel: title, danger: blocking, icon: 'shield' }))) return;
    run(action, payload, () => {
      if (blocking) reload();
      setNotice(blocking ? tr('User blocked.') : tr('Report sent.'));
    });
  }

  const nameField = <label className="friends-field"><span>{tr('Name friends will see')}</span>
    <input value={name} onChange={event => setName(event.target.value)} autoComplete="off" maxLength={80} required />
  </label>;

  return <div className="friends-content">
      {!signedIn ? <div className="friends-empty">
        <Icon name="userPlus" size={26} />
        <p>{tr('Sign in to send or accept a friend invite.')}</p>
        <button type="button" className="primary-button" onClick={onSignIn}>{tr('Sign in')}</button>
      </div> : <>
        <nav className={`friends-tabs${socialAvailable ? ' friends-tabs-expanded' : ''}`} aria-label={tr('Friends')}>
          <button type="button" disabled={busy} aria-pressed={mode === 'list'} onClick={() => showMode('list')}>{tr('Friends')}</button>
          {socialAvailable && <button type="button" disabled={busy} aria-pressed={mode === 'search'} onClick={() => showMode('search')}>{tr('Add friend')}</button>}
          <button type="button" disabled={busy} aria-pressed={mode === 'invite'} onClick={() => showMode('invite')}>{tr('Invite')}</button>
          <button type="button" disabled={busy} aria-pressed={mode === 'join'} onClick={() => showMode('join')}>{tr('Join')}</button>
        </nav>
        {mode === 'search' && (directory ? <FriendsDiscovery directory={directory} busy={busy} run={run} reload={reload} /> :
          <><p className="friends-note" role={directoryError ? 'alert' : 'status'}>{directoryError || tr('Loading…')}</p>
            {directoryError && <button type="button" className="friends-secondary" onClick={reload}>{tr('Try again')}</button>}</>)}
        {mode === 'list' && <>
          {directory?.requests?.length > 0 && <div className="friends-content"><h3>{tr('Friend requests')}</h3>
            <ul className="friends-list friends-directory-results">{directory.requests.map(request => <li key={request.id}>
              <b dir="ltr">@{request.handle}</b><div className="friends-actions">
                <button type="button" className="friends-secondary" disabled={busy} onClick={() => run('accept_request', { requestId: request.id }, reload)}>{tr('Accept')}</button>
                <button type="button" className="friends-secondary" disabled={busy} onClick={() => run('decline_request', { requestId: request.id }, reload)}>{tr('Decline')}</button>
              </div>
              <div className="friends-actions friends-safety">
                <button type="button" className="friends-secondary" disabled={busy} onClick={() => safetyAction('report', { requestId: request.id })}>{tr('Report to MOVO')}</button>
                <button type="button" className="friends-secondary" disabled={busy} onClick={() => safetyAction('block', { requestId: request.id })}>{tr('Block user')}</button>
              </div>
            </li>)}</ul>
          </div>}

          {friends === null && !listError && <p className="friends-note" role="status">{tr('Loading…')}</p>}
          {friends?.length === 0 && <div className="friends-empty">
            <Icon name="userPlus" size={26} />
            <p>{tr('Your friends will appear here after they accept an invite.')}</p>
            <button type="button" className="primary-button" onClick={() => showMode(socialAvailable ? 'search' : 'invite')}>{tr('Add a friend')}</button>
          </div>}
          {friends?.length > 0 && <ul className="friends-list">
            {friends.map(friend => <li key={friend.id}>
              {onOpenSummary ? <button type="button" className="friends-open-summary" disabled={busy} onClick={() => onOpenSummary(friend)}
                aria-label={tr('Summary for {name}', { name: friend.name })}>
                <span aria-hidden="true" className="friends-initial">{Array.from(friend.name)[0]?.toLocaleUpperCase()}</span>
                <b dir="auto">{friend.name}</b><Icon name="chevron" size={16} />
              </button> : <><span aria-hidden="true" className="friends-initial">{Array.from(friend.name)[0]?.toLocaleUpperCase()}</span>
                <b dir="auto">{friend.name}</b></>}
              <button type="button" disabled={busy} onClick={() => removeFriend(friend)} aria-label={tr('Remove {name}', { name: friend.name })}><Icon name="close" size={18} /></button>
            </li>)}
          </ul>}
          {listError && <><p className="friends-note friends-error" role="alert">{listError}</p>
            <button type="button" className="friends-secondary" onClick={() => { setListError(''); setRefresh(value => value + 1); }}>{tr('Try again')}</button></>}
        </>}
        {mode === 'invite' && <>
          {url ? <div className="friends-invite">
            <QRCodeSVG className="friends-qr" value={url} size={164} level="M" marginSize={4} title={tr('Friend invite QR code')} />
            <label className="friends-field"><span>{tr('Invite link')}</span><input dir="ltr" readOnly value={url} onFocus={event => event.target.select()} /></label>
            <div className="friends-actions">
              <button type="button" className="primary-button" onClick={() => share()}><Icon name="send" size={17} />{tr('Share invite')}</button>
              <button type="button" className="friends-secondary" onClick={() => share(true)}><Icon name="copy" size={17} />{tr('Copy link')}</button>
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
        {mode === 'join' && (preview ? <form className="friends-form" onSubmit={acceptInvite}>
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
        {notice && <p className="friends-note friends-success" role="status">{notice}</p>}
        {error && <p className="friends-note friends-error" role="alert">{error}</p>}
      </>}
    </div>;
}
