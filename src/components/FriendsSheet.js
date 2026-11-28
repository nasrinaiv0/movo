/* Full-page Friends workspace. Legacy filename retained for source/tooling compatibility; no sheet UI. */
import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import ProfileAvatar from './ProfileAvatar';
import FriendsDiscovery from './FriendsDiscovery';
import FriendInvitations from './FriendInvitations';
import { FriendChatsDirectory, FriendConversation, FriendPhoto } from './FriendMessages';
import { t as tr } from '../lib/i18n';
import './FriendsWorkspace.css';

const TITLES = { chats: 'Chats', chat: 'Conversation', detail: 'Friend profile', profile: 'My profile', search: 'Add friend', invite: 'QR invitation', join: 'Review invite', settings: 'Friends settings', list: 'Chats' };

function Action({ icon, children, onClick, danger = false, disabled }) {
  return <button type="button" className={'friends-workspace-action' + (danger ? ' danger' : '')} onClick={onClick} disabled={disabled}>
    <Icon name={icon} size={20} /><span>{children}</span><Icon name="chevron" size={16} />
  </button>;
}

export default function FriendsWorkspace({ controller: c, session, friend, user, onNavigate, onBack, onSignIn,
  onEditProfile, onOpenSummary, onHelp, onPrivacy, onAccountSettings, transactions = [], importAccounts = [], onImport, drafts, inbox }) {
  const [search, setSearch] = useState('');
  const title = useRef(null);
  const mode = c.mode === 'list' ? 'chats' : c.mode;
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [mode]);
  const navigate = (next, selected) => onNavigate(next, selected);
  const directoryState = c.directory ? null : <div className="friends-workspace-state" role={c.directoryError ? 'alert' : 'status'}>
    <p>{c.directoryError || tr('Loading…')}</p>{c.directoryError && <button type="button" className="friends-secondary" onClick={c.reload}>{tr('Try again')}</button>}
  </div>;
  const requests = c.directory?.requests || [];
  const settings = mode === 'settings';
  const sessionExpired = c.sessionExpired || inbox?.sessionExpired;
  return <section className={'friends-workspace friends-workspace-' + mode} aria-label={tr('Friends')}>
    {mode !== 'chat' && <header className="friends-workspace-header">
      <button type="button" className="friends-icon-button" onClick={() => { if (mode === 'join') c.onInviteHandled?.(); onBack(); }} aria-label={tr('Back')}><Icon name="back" size={22} /></button>
      <div><span className="friends-workspace-eyebrow">MOVO · {tr('Friends')}</span><h1 ref={title} tabIndex={-1}>{tr(TITLES[mode] || 'Friends')}</h1></div>
      {mode === 'chats' ? <button type="button" className="friends-own-profile" onClick={() => navigate('profile')} aria-label={tr('My profile')}><ProfileAvatar user={user} /></button>
        : null}
    </header>}
    {!c.signedIn || sessionExpired ? <div className="friends-workspace-state"><Icon name="user" size={32} /><h2>{tr('Your people, in MOVO')}</h2><p>{sessionExpired ? tr('Your session expired. Sign in again to use Friends.') : tr('Sign in to send or accept a friend invite.')}</p><button type="button" className="primary-button" onClick={onSignIn}>{tr('Sign in')}</button></div> : <>
      <div className="friends-workspace-layout">
        {(mode === 'chats' || mode === 'chat') && <aside className="friends-workspace-inbox" aria-label={tr('Chats')}>
          {mode === 'chat' && <div className="friends-rail-heading"><div><span className="friends-workspace-eyebrow">MOVO · {tr('Friends')}</span><h2>{tr('Chats')}</h2></div><button type="button" className="friends-own-profile" onClick={() => navigate('profile')} aria-label={tr('My profile')}><ProfileAvatar user={user} /></button></div>}
          <div className="friends-inbox-tools"><label className="friends-inbox-search"><Icon name="search" size={18} /><span className="sr-only">{tr('Search chats')}</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={tr('Search chats')} /></label>
            <button type="button" className="friends-icon-button friends-add-button" onClick={() => navigate('search')} aria-label={tr('Add friend')}><Icon name="userPlus" size={21} /></button></div>
          {requests.length > 0 && <button type="button" className="friends-request-prompt" onClick={() => navigate('search')}>{tr('Friend requests')}<span>{requests.length}</span><Icon name="chevron" size={16} /></button>}
          <FriendChatsDirectory inbox={inbox} session={session} search={search} selectedId={mode === 'chat' ? friend?.id : null} onSelect={value => navigate('chat', value)} onAdd={() => navigate('search')} />
        </aside>}
        {mode === 'chats' && <div className="friends-workspace-welcome"><Icon name="message" size={40} /><h2>{tr('A little closer to your people')}</h2><p>{tr('Choose a conversation to catch up or share a transaction card.')}</p><p className="friends-note">{tr('Shared cards never move money.')}</p></div>}
        {(mode === 'chat' || mode === 'detail') && !friend && <div className="friends-workspace-state"><p>{tr('Choose a conversation to catch up or share a transaction card.')}</p><button type="button" className="primary-button" onClick={() => navigate('chats')}>{tr('Back to chats')}</button></div>}
        {mode === 'chat' && friend && <div className="friends-workspace-thread"><FriendConversation key={friend.id} session={session} friend={friend} onBack={onBack} onOpenProfile={() => navigate('detail', friend)}
          transactions={transactions} importAccounts={importAccounts} onImport={onImport} drafts={drafts}
          onReportMessage={c.directory?.messageReportsAvailable === true ? c.reportMessage : undefined} /></div>}
        {mode === 'detail' && friend && <div className="friends-workspace-body">
          <div className="friends-profile-hero"><FriendPhoto name={friend.name} photo={friend.photo} /><h2 dir="auto">{friend.name}</h2>{friend.handle && <p dir="ltr">@{friend.handle}</p>}<span className="friends-profile-status">{tr('MOVO friend')}</span></div>
          <button type="button" className="primary-button" onClick={() => navigate('chat', friend)}><Icon name="message" size={18} />{tr('Open chat')}</button>
          <div className="friends-workspace-group"><Action icon="wallet" onClick={() => onOpenSummary(friend)}>{tr('Shared summary & permissions')}</Action></div>
          <p className="friends-note">{tr('Only information explicitly shared with you appears in a summary. Manage or revoke your sharing there.')}</p>
          <div className="friends-workspace-group"><Action icon="shield" disabled={c.busy} onClick={() => c.safetyAction('report', { connectionId: friend.id })}>{tr('Report to MOVO')}</Action>
            <Action icon="shield" danger disabled={c.busy} onClick={() => c.safetyAction('block', { connectionId: friend.id })}>{tr('Block user')}</Action>
            <Action icon="user" danger disabled={c.busy} onClick={() => c.removeFriend(friend)}>{tr('Remove friend')}</Action></div>
        </div>}
        {mode === 'profile' && <div className="friends-workspace-body"><div className="friends-profile-hero"><ProfileAvatar user={user} /><h2 dir="auto">{user.name}</h2>{c.directory?.handle && <p dir="ltr">@{c.directory.handle}</p>}<p>{tr('Your profile photo is visible to accepted MOVO friends in Chats. Removing it hides it from their conversations.')}</p></div>
          <button type="button" className="primary-button" onClick={onEditProfile}>{tr('Edit profile')}</button>
          <div className="friends-workspace-group"><Action icon="scan" onClick={() => navigate('invite')}>{tr('Share profile')}</Action><Action icon="settings" onClick={() => navigate('settings')}>{tr('Friends settings')}</Action></div>
          {c.friends && <p className="friends-profile-overview"><span>{tr('Friends')}</span><strong>{c.friends.length}</strong></p>}
        </div>}
        {(mode === 'search' || settings) && <div className="friends-workspace-body">
          {settings ? <><h2>{tr('Profile & discovery')}</h2><p className="friends-note">{tr('Choose how people can find you. Your financial records stay private unless you explicitly share a summary or card.')}</p></> : <><h2>{tr('Find your people')}</h2><p className="friends-note">{tr('Search MOVO usernames')}</p>{c.connectMethods}</>}
          {directoryState}
          {c.directory && <FriendsDiscovery key={settings ? 'settings' : 'search'} directory={c.directory} busy={c.busy} run={c.run} reload={c.reload} section={settings ? 'settings' : 'search'} />}
          {!settings && requests.length > 0 && <section className="friends-incoming-requests"><h2>{tr('Friend requests')}</h2>{requests.map(request => <article key={request.id} className="friends-request-card"><strong dir="ltr">@{request.handle}</strong><div className="friends-actions"><button type="button" className="primary-button" disabled={c.busy} onClick={() => c.run('accept_request', { requestId: request.id }, c.reload)}>{tr('Accept')}</button><button type="button" className="friends-secondary" disabled={c.busy} onClick={() => c.run('decline_request', { requestId: request.id }, c.reload)}>{tr('Decline')}</button></div><details><summary>{tr('Safety options')}</summary><Action icon="shield" onClick={() => c.safetyAction('report', { requestId: request.id })} disabled={c.busy}>{tr('Report to MOVO')}</Action><Action icon="shield" danger onClick={() => c.safetyAction('block', { requestId: request.id })} disabled={c.busy}>{tr('Block user')}</Action></details></article>)}</section>}
          {settings && <><h2>{tr('Privacy & sharing')}</h2><div className="friends-workspace-group"><Action icon="user" onClick={() => navigate('chats')}>{tr('Per-friend sharing & revocation')}</Action><Action icon="userPlus" onClick={() => navigate('search')}>{tr('Friend requests')}</Action></div>
            <h2>{tr('Help & safety')}</h2><div className="friends-workspace-group"><Action icon="shield" onClick={onAccountSettings}>{tr('Account security & deletion')}</Action><Action icon="shield" onClick={onPrivacy}>{tr('Privacy Policy')}</Action><Action icon="help" onClick={onHelp}>{tr('Help Center')}</Action></div></>}
        </div>}
        {(mode === 'invite' || mode === 'join') && <div className="friends-workspace-body"><FriendInvitations controller={c} /></div>}
      </div>
      {c.notice && <p className="friends-workspace-feedback friends-success" role="status">{c.notice}</p>}
      {(c.error || c.listError) && <p className="friends-workspace-feedback friends-error" role="alert">{c.error || c.listError}{c.listError && <button type="button" className="friends-secondary" onClick={c.reload}>{tr('Try again')}</button>}</p>}
    </>}
  </section>;
}

export { friendErrorMessage } from './FriendsController';
