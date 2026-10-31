import React, { memo, useEffect, useId, useState } from 'react';
import { W, H, rng, hash, defaultThemeFor, findSticker, useCustomStickers } from '../lib/stickers';
import { money, shown } from '../lib/format';
import { canAnimate } from '../lib/motion';
import { EmvChip, Contactless } from './EmvChip';
import { t as tr } from '../lib/i18n';
import { institutionLogoUrl } from '../lib/institutions';
import { isStorageStickerId, storageStickerPath, resolvePremiumStickerUrl } from '../lib/premiumStickers';

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
export default function CardArt({ a, show, styleId, holder, preview, compact, displayMode = 'details', visibleFields = {}, cardNetwork = '', orientation = 'landscape' }) {
  const custom = useCustomStickers();
  const remoteSticker = isStorageStickerId(styleId);
  const [remoteUrl, setRemoteUrl] = useState('');
  useEffect(() => { let active = true; setRemoteUrl(''); if (remoteSticker) resolvePremiumStickerUrl(storageStickerPath(styleId)).then(url => { if (active) setRemoteUrl(url); }).catch(() => { if (active) setRemoteUrl(''); }); return () => { active = false; }; }, [styleId, remoteSticker]);
  const sticker = remoteSticker ? null : resolveSticker(styleId, custom);
  const theme = sticker || (!remoteSticker && preview ? defaultThemeFor(a.id) : null);
  const ink = theme ? theme.ink : 'light';
  const number = `•••• •••• •••• ${a.mask || '••••'}`;
  const network = String(cardNetwork || a.cardNetwork || a.card_network || '').toLowerCase();
  const showName = visibleFields.accountName !== false;
  const showNumber = visibleFields.cardNumber !== false && displayMode === 'details';
  const showHolder = visibleFields.holderName !== false && displayMode === 'details';
  const showBalance = visibleFields.balance !== false;
  const networkName = ({ visa: 'Visa', mastercard: 'Mastercard', 'american express': 'American Express', amex: 'American Express', discover: 'Discover', jcb: 'JCB', unionpay: 'UnionPay' })[network] || '';
  const institutionLogo = institutionLogoUrl(a.institution_name);
  return <div className={`credit-card orientation-${orientation}${theme ? ' has-sticker' : ` brand-${a.brand || 'blue'}`} ink-${ink}`}>
    {theme && <StickerArt theme={theme} compact={compact} />}{remoteSticker && remoteUrl && <img className="cc-storage-sticker" src={remoteUrl} alt="" aria-hidden="true" loading="lazy" />}{theme?.video && <span className="cc-live" aria-label={tr('Live wallpaper')}>{tr('LIVE')}</span>}
    <div className="cc-face">
    <div className="cc-top">
      <span className="cc-logo">{institutionLogo ? <img className="cc-institution-logo" src={institutionLogo} alt="" width="30" height="30" loading="lazy" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} /> : <i aria-hidden="true">{(a.institution_name || a.name || '?').trim().charAt(0).toUpperCase()}</i>}{showName && <span className="cc-name">{a.institution_name || a.name}</span>}</span>
      <span className={'cc-net network-' + network.replace(/[^a-z]/g, '-')} aria-label={networkName || undefined}>{networkName && <span className="cc-network-mark" role="img" aria-label={networkName}>{network === 'mastercard' ? <><i /><i /></> : networkName}</span>}</span>
    </div>
    <span className="cc-mid"><EmvChip finish={a.chip || 'gold'} className="cc-chip" />{a.contactless && <Contactless className="cc-nfc" />}{displayMode === 'details' && a.cardKind && <span className="cc-kind">{a.cardKind === 'credit' ? tr('Credit') : tr('Debit')}</span>}</span>
    <div className={'cc-bottom' + (displayMode === 'amount' ? ' cc-bottom-amount' : '')}>
      <div className="cc-id">{showNumber && <span className="cc-number">{number}</span>}{showHolder && holder && <small className="cc-holder">{holder}</small>}</div>
      {showBalance && <b className="cc-balance">{shown(show, money(a.balance, a.currency))}</b>}
    </div>
    </div>
  </div>;
}
