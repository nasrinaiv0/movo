import React, { memo, useId } from 'react';
import { W, H, rng, hash, defaultThemeFor, findSticker, useCustomStickers } from '../lib/stickers';
import { money, shown } from '../lib/format';
import { canAnimate } from '../lib/motion';
import { EmvChip, Contactless } from './EmvChip';

const build = (node, key) => {
  if (!node) return null;
  if (Array.isArray(node)) return React.createElement(React.Fragment, { key }, ...node.map((n, i) => build(n, i)));
  return React.createElement(node.tag, { key, ...(node.props || {}) }, ...node.kids.map((k, i) => build(k, i)));
};

/* Vector artwork only: crisp at any size and DPI. */
export const StickerArt = memo(function StickerArt({ theme, compact }) {
  const raw = useId(); const u = `s${raw.replace(/[^a-z0-9]/gi, '')}`;
  if (theme.custom) return <img className="sticker-art" src={theme.src} alt="" draggable="false" />;
  if (theme.wallpaper) {
    if (theme.video && !compact && canAnimate()) return <video className="sticker-art" src={theme.video} poster={theme.src} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" disablePictureInPicture />;
    return <img className="sticker-art" src={compact ? theme.thumb : theme.src} alt="" loading="lazy" decoding="async" draggable="false" />;
  }
  const { palette: p, motif } = theme; const r = rng(hash(theme.id));
  const light = theme.ink === 'light';
  return <svg className="sticker-art" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" shapeRendering="geometricPrecision" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id={`${u}m`} cx=".38" cy=".34"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor={p.c} /></radialGradient>
      <radialGradient id={`${u}b`} cx=".35" cy=".3"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor={p.g} stopOpacity=".18" /></radialGradient>
      <linearGradient id={`${u}fl`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={p.g} /><stop offset=".6" stopColor={p.c} stopOpacity=".8" /><stop offset="1" stopColor={p.c} stopOpacity="0" /></linearGradient>
      <linearGradient id={`${u}ff`} x1="0" y1="0" x2="1" y2="0"><stop offset=".1" stopColor="#000" /><stop offset=".55" stopColor="#fff" /></linearGradient>
      <mask id={`${u}fade`}><rect width={W} height={H} fill={`url(#${u}ff)`} /></mask>
      <filter id="blur6" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
      <filter id="blur24" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="24" /></filter>
      <linearGradient id={`${u}sc`} x1="0" y1="0" x2="0" y2="1"><stop offset=".5" stopColor={light ? '#000' : '#fff'} stopOpacity="0" /><stop offset="1" stopColor={light ? '#000' : '#fff'} stopOpacity={light ? '.5' : '.55'} /></linearGradient>
    </defs>
    <rect width={W} height={H} fill={p.bg[1]} />
    {build(motif.draw(r, p, u), 'm')}
    <rect width={W} height={H} fill={`url(#${u}sc)`} />
  </svg>;
});

export const resolveSticker = (id, list) => findSticker(id, list);

/* A bank card with reserved room for logo/name, chip, network, number and holder over any sticker. */
export default function CardArt({ a, show, styleId, holder, preview, compact }) {
  const custom = useCustomStickers();
  const sticker = resolveSticker(styleId, custom);
  const theme = sticker || (preview ? defaultThemeFor(a.id) : null);
  const ink = theme ? theme.ink : 'light';
  const number = `•••• •••• •••• ${a.mask || '••••'}`;
  return <div className={`credit-card${theme ? ' has-sticker' : ` brand-${a.brand || 'blue'}`} ink-${ink}`}>
    {theme && <StickerArt theme={theme} compact={compact} />}{theme?.video && <span className="cc-live" aria-label="Live wallpaper">LIVE</span>}
    <div className="cc-face">
    <div className="cc-top">
      <span className="cc-logo"><i aria-hidden="true">{(a.name || '?').trim().charAt(0).toUpperCase()}</i><span className="cc-name">{a.name}</span></span>
      <span className="cc-net">{a.institution_name}</span>
    </div>
    <span className="cc-mid"><EmvChip finish={a.chip || 'gold'} className="cc-chip" />{a.contactless && <Contactless className="cc-nfc" />}{a.cardKind && <span className="cc-kind">{a.cardKind === 'credit' ? 'Credit' : 'Debit'}</span>}</span>
    <div className="cc-bottom">
      <div className="cc-id"><span className="cc-number">{number}</span>{holder && <small className="cc-holder">{holder}</small>}</div>
      <b>{shown(show, money(a.balance, a.currency))}</b>
    </div>
    </div>
  </div>;
}
