import React, { useState } from 'react';
import { t as tr } from '../lib/i18n';

export default function FriendsDiscovery({ directory, busy, run, reload, section = 'all' }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState(null);
  const [acknowledged, setAcknowledged] = useState({ at: null, handles: [] });
  const outgoing = Array.isArray(directory.outgoing) ? directory.outgoing : null;
  const requested = new Set([...(outgoing || []).map(row => row.handle).filter(Boolean), ...(acknowledged.at === directory ? acknowledged.handles : [])]);
  const [handle, setHandle] = useState(directory.handle || '');
  const [discoverable, setDiscoverable] = useState(directory.discoverable === true);
  const validHandle = value => /^[a-z0-9_]{3,24}$/.test(value.trim().toLowerCase());

  return <div className="friends-content">
    {section !== 'settings' && <><form className="friends-form" onSubmit={event => {
      event.preventDefault();
      if (validHandle(search)) run('search', { handle: search }, result => setResults(result.people));
    }}>
      <label className="friends-field"><span>{tr('Search MOVO usernames')}</span>
        <input dir="ltr" value={search} onChange={event => { setSearch(event.target.value); setResults(null); }} maxLength={24} autoCapitalize="none" autoComplete="off" spellCheck={false} />
      </label>
      <button type="submit" className="primary-button" disabled={busy || !validHandle(search)}>{tr('Search')}</button>
    </form>
    {results?.length === 0 && <p className="friends-note" role="status">{tr('No discoverable users matched.')}</p>}
    {results?.length > 0 && <ul className="friends-list friends-directory-results">
      {results.map(person => <li key={person.handle}>
        <b dir="ltr">@{person.handle}</b>
        <button type="button" className="friends-secondary" disabled={busy || !directory.handle || requested.has(person.handle)}
          onClick={() => run('request', { handle: person.handle }, () => { setAcknowledged(current => ({ at: directory, handles: current.at === directory ? [...current.handles, person.handle] : [person.handle] })); reload(); })}>
          {tr(requested.has(person.handle) ? 'Request sent' : 'Send request')}
        </button>
      </li>)}
    </ul>}
    <section className="friends-outgoing" aria-label={tr('Sent requests')}>
      <h3>{tr('Sent requests')}</h3>
      {outgoing === null ? <div className="friends-note" role="status"><p>{tr('Request status is unavailable. Try again when connected.')}</p><button type="button" className="friends-secondary" disabled={busy} onClick={reload}>{tr('Try again')}</button></div>
        : outgoing.length === 0 ? <p className="friends-note" role="status">{tr('No pending requests.')}</p>
        : <ul className="friends-list friends-directory-results">{outgoing.map(row => <li key={row.id}><div><b dir={row.handle ? 'ltr' : 'auto'}>{row.handle ? `@${row.handle}` : tr('Pending request')}</b><small>{tr('Awaiting response')}</small></div>
          <button type="button" className="friends-secondary" disabled={busy} onClick={() => run('cancel_request', { requestId: row.id }, reload)}>{tr('Cancel request')}</button></li>)}</ul>}
    </section>
    </>}
    {section !== 'search' && <><form className="friends-form friends-directory-settings" onSubmit={event => {
      event.preventDefault();
      if (validHandle(handle)) run('set_directory', { handle, discoverable }, reload);
    }}>
      <label className="friends-field"><span>{tr('Your MOVO username')}</span>
        <input dir="ltr" value={handle} onChange={event => setHandle(event.target.value)} maxLength={24} autoCapitalize="none" autoComplete="off" spellCheck={false} />
      </label>
      <p className="friends-note">{tr('Use 3–24 letters, numbers or underscores. Set a username to send friend requests.')}</p>
      <label className="friends-option"><input type="checkbox" checked={discoverable} onChange={event => setDiscoverable(event.target.checked)} />{tr('Let people find my username')}</label>
      <button type="submit" className="friends-secondary" disabled={busy || !validHandle(handle) || (handle === directory.handle && discoverable === directory.discoverable)}>{tr('Save discovery settings')}</button>
    </form>
    {directory.blocked?.length > 0 && <div className="friends-content"><h3>{tr('Blocked users')}</h3>
      <ul className="friends-list friends-directory-results">{directory.blocked.map(person => <li key={person.handle || person.id}>
        <b dir="auto">{person.handle ? `@${person.handle}` : tr('Blocked user')}</b><button type="button" className="friends-secondary" disabled={busy}
          onClick={() => run('unblock', { blockId: person.id }, reload)}>{tr('Unblock')}</button>
      </li>)}</ul>
    </div>}
    </>}
  </div>;
}
