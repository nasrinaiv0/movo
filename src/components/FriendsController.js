import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { friendCardImage } from '../lib/friendCardImage';
import './FriendsConnect.css';
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

export function useFriendsController({ session, inviteToken, onInviteHandled, routeMode = 'chats', onNavigate, enabled = true, confirmAction, onConnectionRemoved, onConnectionsChanged }) {
  const socialAvailable = true;
  const signedIn = Boolean(enabled && session?.user?.id && session.access_token);
  const owner = session?.user?.id || '';
  const key = `${owner}:${session?.access_token || ''}:${enabled}`;
  const lifecycle = useRef(null);
  if (lifecycle.current?.key !== key) {
    lifecycle.current?.controller.abort();
    lifecycle.current = { key, controller: new AbortController() };
  }
  const [stateOwner, setStateOwner] = useState(owner);
  const scope = lifecycle.current;
  const current = () => lifecycle.current === scope && !scope.controller.signal.aborted;
  const [friends, setFriends] = useState(null);
  const [directory, setDirectory] = useState(null);
  const [directoryError, setDirectoryError] = useState('');
  const reload = () => { setRefresh(value => value + 1); onConnectionsChanged?.(); };
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [listError, setListError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const mode = routeMode;
  const setMode = onNavigate;
  const [refresh, setRefresh] = useState(0);
  const [incoming, setIncoming] = useState('');
  const [lookup, setLookup] = useState(inviteToken || '');
  const [preview, setPreview] = useState(null);
  const [name, setName] = useState('');
  const [invite, setInvite] = useState(null);
  const [activeUntil, setActiveUntil] = useState(null);
  const [inviteClock, setInviteClock] = useState(Date.now);
  const lock = useRef(false);
  const card = useRef(null);
  const recordFailure = useCallback((cause, setMessage) => {
    setMessage(friendErrorMessage(cause));
    if (cause?.code === 'sign_in_required') {
      setSessionExpired(true); setFriends(null); setDirectory(null); setInvite(null); setPreview(null);
    }
  }, []);
  const inheritedConfirm = useConfirm();
  const confirm = confirmAction || inheritedConfirm;
  useEffect(() => {
    setStateOwner(owner); setFriends(null); setDirectory(null); setListError(''); setDirectoryError('');
    setError(''); setNotice(''); setName(''); setInvite(null); setActiveUntil(null);
    setIncoming(''); setLookup(''); setPreview(null); setScanning(false); setBusy(false); lock.current = false;
  }, [owner, enabled]);
  useEffect(() => {
    if (scope.controller.signal.aborted) scope.controller = new AbortController();
    lock.current = false; setBusy(false); setSessionExpired(false);
    return () => scope.controller.abort();
  }, [scope]);
  useEffect(() => { if (inviteToken) { setLookup(inviteToken); setPreview(null); } }, [inviteToken, owner]);
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
      .catch(cause => { if (!controller.signal.aborted) recordFailure(cause, setListError); });
    if (socialAvailable) friendsRequest({ access_token: session.access_token }, 'directory', {}, controller.signal)
      .then(result => { if (!controller.signal.aborted) { setDirectory(result); setDirectoryError(''); } })
      .catch(cause => { if (!controller.signal.aborted) recordFailure(cause, setDirectoryError); });
    function refreshOnReturn() {
      if (!document.hidden) setRefresh(value => value + 1);
    }
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => {
      controller.abort();
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, [signedIn, session?.access_token, refresh, socialAvailable, recordFailure]);

  useEffect(() => {
    if (!signedIn || !lookup || mode !== 'join') return undefined;
    const controller = new AbortController();
    setPreview(null);
    setError('');
    friendsRequest({ access_token: session.access_token }, 'preview', { token: lookup }, controller.signal)
      .then(result => { if (!controller.signal.aborted) setPreview(result); })
      .catch(cause => { if (!controller.signal.aborted) { recordFailure(cause, setError); setLookup(''); } });
    return () => controller.abort();
  }, [signedIn, session?.access_token, lookup, mode, recordFailure]);

  useEffect(() => {
    if (!invite) return undefined;
    const timer = window.setTimeout(() => setInviteClock(Date.now()), Math.max(0, Date.parse(invite.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [invite]);

  function showMode(next) {
    setScanning(false);
    setMode(next);
    setError('');
    setNotice('');
  }

  async function run(action, payload, onSuccess) {
    if (lock.current || !signedIn || !current()) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await friendsRequest(session, action, payload, scope.controller.signal);
      if (current()) onSuccess?.(result);
    } catch (cause) {
      if (current()) recordFailure(cause, setError);
    } finally {
      if (current()) { setBusy(false); lock.current = false; }
    }
  }

  function openIncoming(event) {
    event.preventDefault();
    const token = friendInviteToken(incoming);
    if (!token) return setError(tr('Enter a valid MOVO invite link.'));
    setError('');
    setLookup(token);
  }

  function scanned(value) {
    const token = friendInviteToken(value);
    if (!token) { setError(tr('Enter a valid MOVO invite link.')); return; }
    setError(''); setScanning(false); setMode('join'); setIncoming(''); setLookup(token);
  }

  const connectMethods = <div className="friend-connect-methods" role="group" aria-label={tr('Add friend')}>
    <button type="button" onClick={() => { showMode('join'); setLookup(''); setPreview(null); setScanning(true); }}><Icon name="scan" size={19} />{tr('Scan QR code')}</button>
    <button type="button" onClick={() => { showMode('join'); setLookup(''); setPreview(null); }}><Icon name="link" size={19} />{tr('Paste invite link')}</button>
  </div>;

  async function share(copyOnly = false) {
    if (!url || busy || lock.current || !current()) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const image = copyOnly ? undefined : await friendCardImage(card.current?.querySelector('svg.friends-qr'), invite.name, tr('An invite can be used once and expires after 24 hours.'));
      const outcome = copyOnly ? await copyFriendInvite(url).then(() => 'copied') : await shareFriendInvite(url, tr('MOVO friend invite'), image);
      if (current() && outcome === 'downloaded') setNotice(tr('Profile QR image downloaded.'));
      if (current() && outcome === 'copied') setNotice(tr('Invite link copied.'));
    } catch (cause) {
      if (current() && cause?.name !== 'AbortError') setError(tr('Sharing is unavailable. Scan the QR or select and copy the link.'));
    } finally { if (current()) { lock.current = false; setBusy(false); } }
  }

  function createInvite(event) {
    event.preventDefault();
    if (!validName) return;
    run('create', { name: validName }, result => {
      setInvite({ ...result, name: validName });
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
      reload(); showMode('list');
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
      onConnectionRemoved?.(friend.id); showMode('chats'); setNotice(tr('Friend removed.'));
    });
  }

  async function safetyAction(action, payload) {
    const blocking = action === 'block';
    const title = blocking ? tr('Block user') : tr('Report to MOVO');
    if (!(await confirm({ title, message: blocking ? tr('Blocking removes the connection and stops future friend requests.')
      : tr('Send this connection to MOVO support for review?'), confirmLabel: title, danger: blocking, icon: 'shield' }))) return;
    run(action, payload, () => {
      if (blocking) { onConnectionRemoved?.(payload.connectionId); reload(); showMode('chats'); }
      setNotice(blocking ? tr('User blocked.') : tr('Report sent.'));
    });
  }

  const nameField = <label className="friends-field"><span>{tr('Name friends will see')}</span>
    <input value={name} onChange={event => setName(event.target.value)} autoComplete="off" maxLength={80} required />
  </label>;

  return { sessionExpired, signedIn: signedIn && stateOwner === owner, friends: stateOwner === owner ? friends : null,
    directory: stateOwner === owner ? directory : null, directoryError, listError, error, notice, busy,
    mode, showMode, run, reload, safetyAction, removeFriend, connectMethods, nameField, scanning, scanned,
    setScanning, preview, setPreview, lookup, setLookup, incoming, setIncoming, openIncoming, acceptInvite,
    createInvite, validName, url, invite, hasActiveInvite, card, share, platform, setInvite, setActiveUntil,
    setRefresh, setNotice, onInviteHandled };
}
