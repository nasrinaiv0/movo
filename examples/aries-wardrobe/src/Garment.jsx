import { memo, useId } from 'react';
import { garmentFor, WARDROBE } from './garments';

const MIRROR = 'translate(360 0) scale(-1 1)';
const TEE_SLEEVE = 'M132 237q-10-2-16 7l12 6 8-6Z';
const BADGES = { jacket: 'translate(209 245) scale(.48)', cap: 'translate(181 81) scale(.67)' };
const CUFF_DETAILS = {
  varsity: 'm111 250 13 6m-14-3 12 6',
  bomber: 'm112 250 12 6',
  denim: 'm113 250 12 6m-13-3 11 5',
  puffer: 'm116 239 12 8m-16-4 12 8m-14-4 11 8',
  race: 'm127 237-11 15m15-14-11 15',
};
const DISPLAY_SLEEVE_DETAILS = {
  varsity: 'm108 276 13 5m-14-1 13 5m132-9-13 5m14-1-13 5',
  denim: 'm110 275 12 5m128-5-12 5',
  bomber: 'm108 277 13 5m131-5-13 5',
  puffer: 'm115 248 14 6m-17 3 15 6m-17 3 15 6m-17 3 15 6m122-33-14 6m17 3-15 6m17 3-15 6m17 3-15 6',
  race: 'm130 236-15 39m20-36-16 37m111-40 15 39m-20-36 16 37',
};

const TRACK_STRIPE = 'M138 295q-1 8-1 15';
const SHOE_SOLE = 'M137 317q14 3 31-1l1 3q-1 4-6 4h-23q-4 0-3-6Z';

export function BrandBars({ fill = 'currentColor' }) {
  return <g fill={fill}>
    <rect x="0" y="13" width="5" height="8" rx="2.5" transform="rotate(18 2.5 17)" />
    <rect x="7" y="7" width="5" height="14" rx="2.5" transform="rotate(13 9.5 14)" />
    <rect x="14" y="1" width="5" height="20" rx="2.5" transform="rotate(9 16.5 11)" />
  </g>;
}

function Fabric({ shape, color }) {
  const shade = useId();
  return <>
    <defs>
      <linearGradient id={shade} x1="0%" y1="6%" x2="97%" y2="91%">
        <stop stopColor="#fff1d8" stopOpacity=".37" />
        <stop offset=".43" stopColor="#fff1d8" stopOpacity=".04" />
        <stop offset=".73" stopColor="#29201a" stopOpacity=".07" />
        <stop offset="1" stopColor="#29201a" stopOpacity=".37" />
      </linearGradient>
    </defs>
    <path className="garment-fabric" d={shape} fill={color} stroke={color} strokeWidth="1.8" />
    <path d={shape} fill={`url(#${shade})`} />
  </>;
}

export function Garment({ category, item, choice, part, display = false }) {
  const color = choice.color || item.color;
  const trim = choice.trim || (color === item.color ? item.trim : (color === '#e2c7a0' ? '#6b523f' : '#f4e5c3'));
  const arm = part === 'leftArm' || part === 'rightArm';
  const pantsLeg = category === 'pants' && (part === 'leftLeg' || part === 'rightLeg');
  const mirrored = part === 'rightArm' || part === 'rightLeg';
  const shape = arm ? item.extra || TEE_SLEEVE : pantsLeg ? item.extra : item.shape;
  const fabric = (arm && choice.sleeves) || color;
  return <g transform={mirrored ? MIRROR : undefined} strokeLinejoin="round" strokeLinecap="round">
    <Fabric shape={shape} color={fabric} />
    {arm && category === 'jacket' && <path d={CUFF_DETAILS[item.id]} fill="none" stroke={choice.sleeves ? color : trim} strokeWidth="2" />}
    {pantsLeg && display && <>
      <path d="M138 299q15 4 28 0l-1 13q-14 5-28 0Z" fill={color} stroke={color} strokeWidth="2" />
      <path d="M139 310q12 3 25 0" fill="none" stroke={trim} strokeWidth="2" strokeOpacity=".82" />
    </>}
    {pantsLeg && item.id === 'track' && <path d={display ? TRACK_STRIPE : 'm138 294-1 11'} fill="none" stroke={trim} strokeWidth="2.5" />}
    {category === 'shoes' && <path d={SHOE_SOLE} fill={item.id === 'trail' ? '#44392e' : trim} />}
    {category === 'cap' && <path d="M191 108q23-6 48 1l8 5q-9 6-27 1Z" fill="#282018" fillOpacity=".19" />}
    {!arm && !pantsLeg && <path d={item.detail} fill="none" stroke={trim} strokeWidth="2.5" />}
    {category === 'jacket' && !arm && item.id === 'denim' && <path d="m151 225-10 10 13 10 7-8Zm58 0 10 10-13 10-7-8Z" fill={trim} />}
    {category === 'jacket' && !arm && item.id === 'puffer' && <path d="M147 228q-10 2-21 15m87-15q10 2 21 15" fill="none" stroke="#fff5df" strokeWidth="5" />}
    {BADGES[category] && !arm && <g transform={BADGES[category]}><BrandBars fill={trim} /></g>}
  </g>;
}

export const GarmentPreview = memo(function GarmentPreview({ category, choice }) {
  const item = garmentFor(category, choice);
  if (!item) return <span className="empty-garment" aria-hidden="true">−</span>;
  const paired = category === 'shoes' || category === 'pants';
  const jacket = category === 'jacket';
  const color = choice.color || item.color;
  const sleeve = choice.sleeves || color;
  return <svg viewBox={WARDROBE[category].viewBox} aria-hidden="true" focusable="false">
    {jacket && <>
      <path d="M152 225q28 9 56 0l13 60q-41 13-82 0Z" fill={color} />
      <path d="M152 225q28 9 56 0l13 60q-41 13-82 0Z" fill="#17251c" fillOpacity=".26" />
      <Fabric shape="M131 233q-13 3-18 16l-8 28q-2 7 5 10l11 3 12-24Zm98 0q13 3 18 16l8 28q2 7-5 10l-11 3-12-24Z" color={sleeve} />
      <path d={DISPLAY_SLEEVE_DETAILS[item.id]} fill="none" stroke={choice.sleeves ? color : (choice.trim || item.trim)}
        strokeWidth={item.id === 'puffer' ? 1.6 : 2.5} strokeLinecap="round" />
    </>}
    <Garment category={category} item={item} choice={choice} part={paired ? 'leftLeg' : 'body'} display />
    {jacket && <path d="M180 240v47m0-40 4 2" fill="none" stroke={choice.trim || item.trim} strokeWidth="2" strokeLinecap="round" />}
    {paired && <Garment category={category} item={item} choice={choice} part="rightLeg" display />}
    {category === 'pants' && <Garment category={category} item={item} choice={choice} part="body" />}
  </svg>;
});
