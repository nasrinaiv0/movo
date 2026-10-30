import React, { useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import CardArt from './CardArt';
import { Sheet, Chips } from './ui';
import { THEMES, GENRES, WALLPAPER_THEMES, WALLPAPER_GENRES, useCustomStickers, addCustomSticker, removeCustomSticker } from '../lib/stickers';
import { t as tr } from '../lib/i18n';

const ALL = [...WALLPAPER_THEMES, ...THEMES];

const PAGE = 18;
/* Display names follow the app language: collection names and palette/motif words are translated. */
const nameOf = (t) => (t.custom || t.video ? t.name : t.wallpaper ? `${tr(t.genre)} ${t.name.split(' ').pop()}` : `${tr(t.palette.n)} ${tr(t.motif.n)}`);

export default function CardStyleSheet({ account, show, holder, current, onPick, onClose }) {
  const custom = useCustomStickers();
  const [genre, setGenre] = useState('All');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [error, setError] = useState('');
  const file = useRef(null);
  const genres = ['All', ...(custom.length ? ['Mine'] : []), ...WALLPAPER_GENRES, ...GENRES];
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = genre === 'Mine' ? custom : genre === 'All' ? [...custom, ...ALL] : ALL.filter(t => t.genre === genre);
    return q ? base.filter(t => `${t.name} ${nameOf(t)} ${t.genre || ''} ${tr(t.genre || '')}`.toLowerCase().includes(q)) : base;
  }, [genre, query, custom]);
  const upload = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    setError('');
    try { const s = await addCustomSticker(f); onPick(s.id); } catch (err) { setError(tr(err.message)); }
  };
  const mine = (t) => t.custom;
  return <Sheet title={tr('Card Style')} subtitle={tr('Pick a sticker. Your bank name, chip and number always stay clear.')} onClose={onClose} label={tr('Card style')}>
    <div className="style-preview"><CardArt a={account} show={show} holder={holder} styleId={current} /></div>
    <label className="style-search"><Icon name="search" size={18} /><input type="search" placeholder={tr('Search {n}+ stickers', { n: ALL.length })} aria-label={tr('Search card stickers')} value={query} onChange={e => { setQuery(e.target.value); setLimit(PAGE); }} /></label>
    <Chips label={tr('Sticker collections')} items={genres.map(g => ({ key: g, label: tr(g) }))} value={genre} onChange={g => { setGenre(g); setLimit(PAGE); }} />
    <div className="style-grid" role="list">
      <button type="button" role="listitem" className={`style-tile${!current ? ' selected' : ''}`} onClick={() => onPick('')} aria-label={tr('Classic, no sticker')} aria-pressed={!current}>
        <CardArt a={account} show={show} styleId="" /><span>{tr('Classic')}</span>{!current && <i className="style-check"><Icon name="check" size={14} strokeWidth={2.6} /></i>}
      </button>
      <button type="button" role="listitem" className="style-tile upload" onClick={() => file.current?.click()} aria-label={tr('Upload your own sticker')}>
        <span className="upload-box"><Icon name="plus" size={26} /></span><span>{tr('Upload yours')}</span>
      </button>
      {list.slice(0, limit).map(t => <div className="style-cell" role="listitem" key={t.id}>
        <button type="button" className={`style-tile${current === t.id ? ' selected' : ''}`} onClick={() => onPick(t.id)} aria-label={tr('{name} sticker', { name: nameOf(t) })} aria-pressed={current === t.id}>
          <CardArt a={account} show={show} styleId={t.id} compact /><span>{nameOf(t)}</span>{current === t.id && <i className="style-check"><Icon name="check" size={14} strokeWidth={2.6} /></i>}
        </button>
        {mine(t) && <button type="button" className="style-remove" aria-label={tr('Remove {name}', { name: t.name })} onClick={() => {
          const removed = removeCustomSticker(t.id);
          if (!removed) { setError(tr('Could not remove this sticker because browser storage is unavailable or full. Free storage and try again.')); return; }
          if (current === t.id) onPick('');
        }}><Icon name="close" size={14} strokeWidth={2.4} /></button>}
      </div>)}
    </div>
    {!list.length && <p className="empty">{tr('No stickers match “{query}”.', { query })}</p>}
    {list.length > limit && <button type="button" className="manage-button" onClick={() => setLimit(limit + PAGE)}><Icon name="down" size={18} /> {tr('Show more ({n} left)', { n: list.length - limit })}</button>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" hidden onChange={upload} aria-label={tr('Choose a sticker image')} />
    <p className="style-note">{tr('Upload PNG, JPEG, WebP, GIF or AVIF up to 10 MB. Images are cropped to the card ratio and saved on this device only; they are not synced to your cloud account.')}</p>
  </Sheet>;
}
