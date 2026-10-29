import React, { useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import CardArt from './CardArt';
import { Sheet, Chips } from './ui';
import { THEMES, GENRES, WALLPAPER_THEMES, WALLPAPER_GENRES, useCustomStickers, addCustomSticker, removeCustomSticker } from '../lib/stickers';

const ALL = [...WALLPAPER_THEMES, ...THEMES];

const PAGE = 18;

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
    return q ? base.filter(t => `${t.name} ${t.genre || ''}`.toLowerCase().includes(q)) : base;
  }, [genre, query, custom]);
  const upload = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    setError('');
    try { const s = await addCustomSticker(f); onPick(s.id); } catch (err) { setError(err.message); }
  };
  const mine = (t) => t.custom;
  return <Sheet title="Card Style" subtitle="Pick a sticker. Your bank name, chip and number always stay clear." onClose={onClose} label="Card style">
    <div className="style-preview"><CardArt a={account} show={show} holder={holder} styleId={current} /></div>
    <label className="style-search"><Icon name="search" size={18} /><input type="search" placeholder={`Search ${ALL.length}+ stickers`} aria-label="Search card stickers" value={query} onChange={e => { setQuery(e.target.value); setLimit(PAGE); }} /></label>
    <Chips label="Sticker collections" items={genres} value={genre} onChange={g => { setGenre(g); setLimit(PAGE); }} />
    <div className="style-grid" role="list">
      <button type="button" role="listitem" className={`style-tile${!current ? ' selected' : ''}`} onClick={() => onPick('')} aria-label="Classic, no sticker" aria-pressed={!current}>
        <CardArt a={account} show={show} styleId="" /><span>Classic</span>{!current && <i className="style-check"><Icon name="check" size={14} strokeWidth={2.6} /></i>}
      </button>
      <button type="button" role="listitem" className="style-tile upload" onClick={() => file.current?.click()} aria-label="Upload your own sticker">
        <span className="upload-box"><Icon name="plus" size={26} /></span><span>Upload yours</span>
      </button>
      {list.slice(0, limit).map(t => <div className="style-cell" role="listitem" key={t.id}>
        <button type="button" className={`style-tile${current === t.id ? ' selected' : ''}`} onClick={() => onPick(t.id)} aria-label={`${t.name} sticker`} aria-pressed={current === t.id}>
          <CardArt a={account} show={show} styleId={t.id} compact /><span>{t.name}</span>{current === t.id && <i className="style-check"><Icon name="check" size={14} strokeWidth={2.6} /></i>}
        </button>
        {mine(t) && <button type="button" className="style-remove" aria-label={`Remove ${t.name}`} onClick={() => { removeCustomSticker(t.id); if (current === t.id) onPick(''); }}><Icon name="close" size={14} strokeWidth={2.4} /></button>}
      </div>)}
    </div>
    {!list.length && <p className="empty">No stickers match “{query}”.</p>}
    {list.length > limit && <button type="button" className="manage-button" onClick={() => setLimit(limit + PAGE)}><Icon name="down" size={18} /> Show more ({list.length - limit} left)</button>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <input ref={file} type="file" accept="image/*" hidden onChange={upload} aria-label="Choose a sticker image" />
    <p className="style-note">Tip: upload your own artwork (a 1712 × 1080 px image fills the card at full sharpness). Stickers stay on this device.</p>
  </Sheet>;
}
