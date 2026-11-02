import React, { memo, useEffect, useId, useState } from 'react';
import { W, H, rng, hash, defaultThemeFor, findSticker, useCustomStickers } from '../lib/stickers';
import { money, shown } from '../lib/format';
import { canAnimate } from '../lib/motion';
import { EmvChip, Contactless } from './EmvChip';
import BrandLogo from './BrandLogo';
import { t as tr } from '../lib/i18n';
import { institutionLogoUrl } from '../lib/institutions';
import { cardFaceFor, cardTypeLabel, finishOf } from '../lib/cardFaces';
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

/* Geometric patterns for premium finishes (hexagons, triangles, chevrons, scales, diamonds), one per card from its
   id. Each line is drawn twice, a light edge and a dark cut, so it reads as engraved metal; a fade keeps the text
   side calm. */
const PATTERNS = {
  hex: { w: 56, h: 97, d: 'M28 0 L56 16.2 L56 48.5 L28 64.7 L0 48.5 L0 16.2 Z M28 64.7 V97' },
  tri: { w: 56, h: 97, d: 'M0 0 L56 97 M56 0 L0 97 M0 48.5 H56 M0 0 H56' },
  chevron: { w: 64, h: 36, d: 'M0 36 L32 4 L64 36 M0 18 L32 -14 L64 18' },
  scales: { w: 60, h: 30, d: 'M0 30 A30 30 0 0 1 60 30 M-30 0 A30 30 0 0 1 30 0 M30 0 A30 30 0 0 1 90 0' },
  diamond: { w: 52, h: 52, d: 'M26 0 L52 26 L26 52 L0 26 Z M26 12 L40 26 L26 40 L12 26 Z' },
};
function GeoPattern({ u, w, h, seed, dark }) {
  const keys = Object.keys(PATTERNS);
  const k = keys[hash(seed || 'card') % keys.length]; const p = PATTERNS[k];
  return <>
    <defs>
      <pattern id={`${u}pl`} width={p.w} height={p.h} patternUnits="userSpaceOnUse" patternTransform="translate(1 1.4)"><path d={p.d} fill="none" stroke="#fff" strokeOpacity={dark ? '.55' : '.22'} strokeWidth="1.4" /></pattern>
      <pattern id={`${u}pd`} width={p.w} height={p.h} patternUnits="userSpaceOnUse"><path d={p.d} fill="none" stroke="#000" strokeOpacity={dark ? '.16' : '.28'} strokeWidth="1.4" /></pattern>
      <linearGradient id={`${u}pf`} x1="0" y1="0" x2="1" y2=".4"><stop offset=".05" stopColor="#fff" stopOpacity=".25" /><stop offset=".55" stopColor="#fff" stopOpacity="1" /></linearGradient>
      <mask id={`${u}pm`}><rect width={w} height={h} fill={`url(#${u}pf)`} /></mask>
    </defs>
    <g mask={`url(#${u}pm)`}>
      <rect width={w} height={h} fill={`url(#${u}pl)`} />
      <rect width={w} height={h} fill={`url(#${u}pd)`} />
    </g>
  </>;
}

/* Default face art, after the owner's mockups: gradient base, soft highlight, and one motif per palette. */
const CardFaceArt = memo(function CardFaceArt({ face, orientation, seed }) {
  const raw = useId(); const u = `f${raw.replace(/[^a-z0-9]/gi, '')}`;
  const P = orientation === 'portrait';
  const w = P ? 540 : 856; const h = P ? 856 : 540;
  const g = face.glow;
  let motif = null;
  if (face.motif === 'sweep') {
    const curve = P ? 'M0 600 C 170 560 370 470 540 330' : 'M300 540 C 500 420 660 300 856 250';
    motif = <>
      <path d={P ? `${curve} L540 856 L0 856 Z` : `${curve} L856 540 Z`} fill={`url(#${u}pan)`} />
      <path d={curve} fill="none" stroke={g} strokeWidth="22" opacity=".35" filter={`url(#${u}b)`} />
      <path d={curve} fill="none" stroke={g} strokeWidth="2.6" opacity=".95" strokeLinecap="round" />
      {face.spark && <ellipse cx={P ? 470 : 760} cy={P ? 395 : 280} rx="70" ry="10" fill={face.spark} opacity=".8" filter={`url(#${u}b)`} transform={`rotate(-28 ${P ? 470 : 760} ${P ? 395 : 280})`} />}
    </>;
  } else if (face.motif === 'cross') {
    const beams = P ? ['M-40 470 L560 300 L580 360 L-20 540 Z', 'M80 250 L600 700 L560 760 L40 310 Z'] : ['M260 560 L880 120 L900 190 L300 600 Z', 'M330 -20 L880 470 L840 520 L290 30 Z'];
    const lines = P ? ['M0 505 L540 335', 'M60 280 L540 720'] : ['M280 580 L870 150', 'M310 0 L860 495'];
    motif = <>
      {beams.map(d => <path key={d} d={d} fill={g} opacity=".16" filter={`url(#${u}b)`} />)}
      {lines.map(d => <path key={d} d={d} stroke={g} strokeWidth="2" opacity=".75" fill="none" />)}
      <circle cx={P ? 300 : 560} cy={P ? 410 : 330} r="60" fill={g} opacity=".35" filter={`url(#${u}b)`} />
    </>;
  } else if (face.motif === 'rings') {
    const cx = P ? 560 : 880; const cy = P ? 860 : 600;
    motif = [520, 400, 290].map((r, i) => <circle key={r} cx={cx} cy={cy} r={P ? r * .8 : r} fill="#fff" fillOpacity={.035 + i * .015} stroke={g} strokeOpacity=".28" strokeWidth="2" />);
  } else if (face.motif === 'waves') {
    const y = P ? 560 : 330;
    const wave = (dy) => `M0 ${y + dy} C ${w * .3} ${y + dy - 60} ${w * .6} ${y + dy + 60} ${w} ${y + dy - 20}`;
    motif = <>
      <path d={`${wave(0)} L${w} ${h} L0 ${h} Z`} fill="#000" opacity=".1" />
      <path d={`${wave(70)} L${w} ${h} L0 ${h} Z`} fill="#000" opacity=".1" />
      {[0, 28, 70].map(dy => <path key={dy} d={wave(dy)} stroke={g} strokeWidth="2.4" opacity=".7" fill="none" />)}
    </>;
  } else if (face.motif === 'stripes') {
    motif = (face.stripes || []).map((c, i) => {
      const bw = P ? 30 : 52; const x0 = (P ? 455 : 660) + i * bw; const lean = P ? 120 : 220;
      return <polygon key={c} points={`${x0},0 ${x0 + bw},0 ${x0 + bw - lean},${h} ${x0 - lean},${h}`} fill={c} />;
    });
  } else if (face.motif === 'facets') {
    const lines = P ? ['M0 330 L540 120', 'M120 0 L540 600', 'M0 700 L540 380', 'M300 856 L80 0', 'M540 820 L0 520'] : ['M0 380 L856 60', 'M260 0 L856 470', 'M420 540 L856 180', 'M560 540 L250 0', 'M0 120 L500 540'];
    motif = <>
      <path d={P ? 'M120 0 L540 600 L540 0 Z' : 'M260 0 L856 470 L856 0 Z'} fill="#fff" opacity=".05" />
      <path d={P ? 'M0 700 L540 380 L540 856 L0 856 Z' : 'M420 540 L856 180 L856 540 Z'} fill="#000" opacity=".12" />
      <g stroke={g} strokeWidth="1.4" opacity=".5" fill="none">{lines.map(d => <path key={d} d={d} />)}</g>
    </>;
  } else if (face.motif === 'pastel') {
    const dots = [];
    for (let r = 0; r < 4; r += 1) for (let c = 0; c < 9; c += 1) dots.push(<circle key={`${r}-${c}`} cx={(P ? 300 : 560) + c * 26} cy={36 + r * 26} r="2.4" fill="#fff" opacity=".8" />);
    const y = P ? 620 : 380;
    motif = <>
      <circle cx={P ? 80 : 120} cy={h} r={P ? 320 : 300} fill={face.c3} opacity=".55" filter={`url(#${u}b)`} />
      {dots}
      <path d={`M0 ${y} C ${w * .3} ${y - 50} ${w * .6} ${y + 40} ${w} ${y - 30} L${w} ${h} L0 ${h} Z`} fill="#fff" opacity=".35" />
    </>;
  }
  return <svg className="ccx-art" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${u}bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={face.c1} />{face.c3 && <stop offset=".55" stopColor={face.c3} />}<stop offset="1" stopColor={face.c2} /></linearGradient>
      <linearGradient id={`${u}pan`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".1" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      <radialGradient id={`${u}hl`} cx=".18" cy=".1" r=".7"><stop offset="0" stopColor="#fff" stopOpacity={face.ink === 'dark' ? '.35' : '.14'} /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      <filter id={`${u}b`} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="14" /></filter>
      <linearGradient id={`${u}sh`} x1="0" y1="0" x2="1" y2="1"><stop offset=".25" stopColor="#fff" stopOpacity="0" /><stop offset=".45" stopColor="#fff" stopOpacity=".55" /><stop offset=".52" stopColor="#fff" stopOpacity=".1" /><stop offset=".7" stopColor="#fff" stopOpacity="0" /></linearGradient>
    </defs>
    <rect width={w} height={h} fill={`url(#${u}bg)`} />
    <rect width={w} height={h} fill={`url(#${u}hl)`} />
    {motif}
    {face.geo && <GeoPattern u={u} w={w} h={h} seed={seed} dark={face.ink === 'dark'} />}
    {face.sheen && <rect width={w} height={h} fill={`url(#${u}sh)`} />}
  </svg>;
});

const NETWORKS = { visa: 'Visa', mastercard: 'Mastercard', 'american express': 'American Express', amex: 'American Express', discover: 'Discover', jcb: 'JCB', unionpay: 'UnionPay' };

/*
 * A payment card laid out like a real one:
 *   top: institution logo + name · type label (Card, Bank, E-wallet…)
 *   then: EMV chip + contactless symbol
 *   bottom: masked number, balance · card network
 * Any sticker can sit behind it; with none, a palette matched to the institution is drawn.
 */
export default function CardArt({ a, show, styleId, preview, compact, displayMode = 'details', visibleFields = {}, cardNetwork = '', orientation = 'landscape' }) {
  const custom = useCustomStickers();
  const remoteSticker = isStorageStickerId(styleId);
  const [remoteUrl, setRemoteUrl] = useState('');
  useEffect(() => { let active = true; setRemoteUrl(''); if (remoteSticker) resolvePremiumStickerUrl(storageStickerPath(styleId)).then(url => { if (active) setRemoteUrl(url); }).catch(() => { if (active) setRemoteUrl(''); }); return () => { active = false; }; }, [styleId, remoteSticker]);
  const sticker = remoteSticker || finishOf(styleId) ? null : resolveSticker(styleId, custom);
  const theme = sticker || (!remoteSticker && preview ? defaultThemeFor(a.id) : null);
  const finish = finishOf(styleId);
  const face = finish || (theme || remoteSticker ? null : cardFaceFor(a));
  const ink = theme ? theme.ink : face ? face.ink : 'light';
  const network = String(cardNetwork || a.cardNetwork || a.card_network || '').toLowerCase();
  const networkName = NETWORKS[network] || '';
  const details = displayMode === 'details';
  const showName = visibleFields.accountName !== false;
  const showNumber = visibleFields.cardNumber !== false && details;
  const showBalance = visibleFields.balance !== false;
  const institutionLogo = institutionLogoUrl(a.institution_name) || institutionLogoUrl(a.name);
  const credit = a.cardKind === 'credit';
  return <div className={`credit-card ccx orientation-${orientation}${theme || remoteSticker ? ' has-sticker' : ' ccx-default'} ink-${ink}`} style={face ? { '--card-tint': face.c2, '--card-tint-2': face.c1 } : undefined}>
    {theme && <StickerArt theme={theme} compact={compact} />}{remoteSticker && remoteUrl && <img className="cc-storage-sticker" src={remoteUrl} alt="" aria-hidden="true" loading="lazy" />}
    {face && <CardFaceArt face={face} orientation={orientation} seed={a.id || a.name} />}
    {theme?.video && <span className="cc-live" aria-label={tr('Live wallpaper')}>{tr('LIVE')}</span>}
    <div className="ccx-face">
      <div className="ccx-head">
        <span className="ccx-brand"><span className="ccx-logo"><BrandLogo src={institutionLogo} size={128} fallback={<i aria-hidden="true">{(a.institution_name || a.name || '?').trim().charAt(0).toUpperCase()}</i>} /></span>{showName && <span className="ccx-name">{a.institution_name || a.name}</span>}</span>
        {details && <span className="ccx-type">{tr(cardTypeLabel(a, face))}</span>}
      </div>
      <div className="ccx-chiprow"><EmvChip finish={a.chip || face?.chip || 'gold'} className="ccx-chip" />{a.contactless !== false && <Contactless className="ccx-nfc" />}</div>
      <div className="ccx-foot">
        <div className="ccx-figures">
          {showNumber && <span className="ccx-number">{`•••• •••• •••• ${a.mask || '••••'}`}</span>}
          {!showNumber && showBalance && <small className="ccx-caption">{credit ? tr('Available credit') : tr('Balance')}</small>}
          {showBalance && <b className="ccx-balance">{shown(show, money(a.balance, a.currency))}</b>}
        </div>
        {networkName && <span className={`ccx-net net-${network.replace(/[^a-z]/g, '-')}`} role="img" aria-label={networkName}>{network === 'mastercard' ? <><i /><i /></> : networkName}</span>}
      </div>
    </div>
  </div>;
}
