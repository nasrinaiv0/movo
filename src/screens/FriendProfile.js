import React, { useRef, useState } from 'react';
import FriendFinanceSummary from '../components/FriendFinanceSummary';
import { errorMessage } from '../components/FriendsSheet';
import { SubHeader } from '../components/ui';
import { useConfirm } from '../components/ConfirmDialog';
import { friendsRequest } from '../lib/friends';
import { t as tr } from '../lib/i18n';

/*
 * A friend's own page (owner request 2026-11-16), opened from the Friends list. It shows everything that friend chose
 * to share with you (their latest money summary, with charts), what you share with them, and the actions for the
 * connection: share or stop sharing, remove, report or block. Only the friend's name and their shared snapshot are
 * shown; MOVO shares nothing else between friends.
 */
export default function FriendProfile({ c }) {
  const { friendPage: friend, session, friendFinance, goBack, openFriends, notify } = c;
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const back = () => { goBack('Menu'); openFriends(); };

  async function run(action, payload, onSuccess) {
    if (lock.current || !session?.access_token) return;
    lock.current = true; setBusy(true); setError('');
    try { onSuccess(await friendsRequest(session, action, payload)); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); lock.current = false; }
  }

  async function safety(action, payload) {
    const blocking = action === 'block';
    const title = blocking ? tr('Block user') : tr('Report to MOVO');
    if (!(await confirm({ title, message: blocking ? tr('Blocking removes the connection and stops future friend requests.')
      : tr('MOVO support will review your report.'), confirmLabel: title, danger: blocking, icon: 'shield' }))) return;
    run(action, payload, () => {
      notify(blocking ? tr('User blocked.') : tr('Report sent.'));
      if (blocking) back();
    });
  }

  async function remove() {
    if (busy || !(await confirm({ title: tr('Remove friend?'), message: tr('Remove {name} from your friends list?', { name: friend.name }),
      confirmLabel: tr('Remove'), icon: 'user', danger: true }))) return;
    run('remove', { connectionId: friend.id }, () => { notify(tr('Friend removed.')); back(); });
  }

  if (!friend?.id || !session?.access_token) return <>
    <SubHeader title={tr('Friends')} onBack={back} />
    <div className="card pad friend-page-empty"><p>{tr('This friend connection is no longer available.')}</p></div>
  </>;

  return <>
    <SubHeader title={tr('Friend')} onBack={back} />
    <div className="friend-page">
      <FriendFinanceSummary key={friend.id} page friend={friend} session={session} finance={friendFinance} busy={busy} run={run}
        onSafety={safety} onRemove={remove} onClose={back} errorMessage={errorMessage} />
      {error && <p className="friends-note friends-error" role="alert">{error}</p>}
    </div>
  </>;
}
