// Shapes share Aries' original 360 × 360 coordinate system. Each style owns its silhouette and trim.
const item = (id, name, color, trim, shape, detail, extra) => ({ id, name, color, trim, shape, detail, extra });
const SCARF = 'M130 207c-7 5-10 17-2 22 15 11 51 14 78 8l2 16 14 22c7 4 15 1 16-5l-10-16c-2-10-5-18-10-23 6-3 11-3 14-7q4-10-4-14Z M196 229l-2 40q8 7 17 0l-2-35Z';

export const WARDROBE = {
  shirt: { label: 'T-shirts', singular: 'T-shirt', viewBox: '105 215 150 87', styles: [
    item('crew', 'Everyday crew', '#478066', '#dcf0cf', 'M150 227h60q17 1 24 16l3 14-14 5-3 22q-40 12-80 0l-3-22-14-5 3-14q7-15 24-16Z', 'M160 232q20 17 40 0m-58 48q38 11 76 0'),
    item('stripe', 'Marina stripe', '#46718f', '#e7d6b1', 'M149 228h62q15 1 26 18l-10 15-7-4v27q-40 10-80 0v-27l-7 4-10-15q11-17 26-18Z', 'M140 249h80m-80 8h80m-80 8h80m-80 8h80'),
    item('pocket', 'Pocket tee', '#b76c52', '#f8ccad', 'M151 226h58q20 3 28 20l-10 14-6-3-3 25q-38 11-76 0l-3-25-6 3-10-14q8-17 28-20Z', 'M196 249h16v11l-8 5-8-5ZM160 232q20 14 40 0'),
    item('star', 'Stargazer', '#746193', '#f7d593', 'M150 227h60q16 2 24 15l5 11-14 7-6 25q-39 10-78 0l-6-25-14-7 5-11q8-13 24-15Z', 'm180 245 4 8 9 1-7 7 2 9-8-4-8 4 2-9-7-7 9-1Z'),
    item('ringer', 'Ringer tee', '#dfad59', '#794945', 'M149 228h62q10 2 24 12l9 15-18 8-7-6v28q-39 11-78 0v-28l-7 6-18-8 9-15q14-10 24-12Z', 'm119 252 15 7m107-7-15 7m-66-26q20 13 40 0'),
  ] },
  jacket: { label: 'Jackets', singular: 'Jacket', viewBox: '102 214 156 89', styles: [
    item('denim', 'Indigo denim', '#466685', '#e5bc91', 'M153 224q-20 0-29 23l-3 31 11 10 38 3-4-42-13-25Z M207 224q20 0 29 23l3 31-11 10-38 3 4-42 13-25Z', 'm151 231-7 13 15 6m50-19 7 13-15 6m-69 8h17v9l-8 4-9-4ZM228 258h-17v9l8 4 9-4ZM128 282h34m36 0h34', 'M130 236q-15-3-21 19l13 6 14-18Z'),
    item('varsity', 'Varsity jacket', '#944f59', '#f5d2a4', 'M151 225q-23 0-28 21l-4 28q1 12 14 15l39 2-4-42-17-24Z M209 225q23 0 28 21l4 28q-1 12-14 15l-39 2 4-42 17-24Z', 'm153 232 14 24 4 31m36-55-14 24-4 31m-58-5h32m34 0h32m-94-16 17-5m56 0 17 5m-87-15h11', 'M131 236q-14-3-21 17l13 7 13-16Z'),
    item('bomber', 'Field bomber', '#69764a', '#e4dda9', 'M150 226q-25 0-31 23l-1 22q0 18 18 20l32 2-2-46-16-21Z M210 226q25 0 31 23l1 22q0 18-18 20l-32 2 2-46 16-21Z', 'm147 231 16 15v39m50-54-16 15v39m-69-8h36m32 0h36m-98-8 15-8m62 0 15 8', 'M131 235q-17-3-22 21l14 6 13-17Z'),
    item('race', 'Racing jacket', '#8e353e', '#e9b369', 'M156 221q-21 1-32 23l-4 43 49 4-4-48-9-22Z M204 221q21 1 32 23l4 43-49 4 4-48 9-22Z', 'm158 228-21 18m65-18 21 18m-95 26h21m62 0h21m-67-20 1 30m29-30-1 30', 'M131 235q-13 0-22 20l13 7 15-18Z'),
    item('puffer', 'Cloud puffer', '#795e88', '#e3c8e5', 'M153 223q-25-1-32 25l-4 18q-2 25 18 26l35 1-3-47-14-23Z M207 223q25-1 32 25l4 18q2 25-18 26l-35 1 3-47 14-23Z', 'M126 248h33m42 0h33m-112 11h39m38 0h39m-119 12h45m32 0h45m-117 11h41m30 0h41', 'M132 234q-17-4-24 19l13 9 16-18Z'),
  ] },
  cap: { label: 'Caps', singular: 'Cap', viewBox: '126 55 126 75', styles: [
    item('classic', 'Ballpark cap', '#397455', '#d6e9b8', 'M138 105q3-40 40-43 37 0 46 36l22 11q7 4-4 8l-50-6q-27 10-54-6Z', 'M140 102q26 10 53 4l42 6m-56-47q-14 12-13 38m22-14h7'),
    item('trucker', 'Mesh trucker', '#477091', '#efce9d', 'M135 107q0-28 19-37 20-11 45-5 22 5 27 36l18 9q8 6-4 8l-46-6q-32 9-59-5Z', 'M140 101q27 9 54 5l43 7m-56-47q-12 13-12 37m-21-18 12 11m-9-16 11 10m-16 1 13 12'),
    item('flat', 'Sunday flat cap', '#8b624a', '#e7caa4', 'M131 103q13-29 50-29 38 0 50 24l18 9q4 6-10 9l-42-4q-36 10-66-9Z', 'M137 101q29 11 59 6l42 6m-74-32q24-7 49 7'),
    item('cycling', 'Sprint cap', '#a75355', '#ffe0ac', 'M140 105q0-34 29-40 41-8 53 33l19 3q-5 16-24 20l-25-7q-28 6-52-9Z', 'M143 101q21 9 50 7m-12-42q-10 17-10 39m16-40q-9 16-8 40m23 5q18 5 32-4'),
    item('cord', 'Corduroy cap', '#765b85', '#e8cde8', 'M137 102q7-33 34-38 36-8 55 37l21 11q6 8-11 8l-39-8q-28 8-60-10Z', 'M141 99q27 12 56 8l41 9m-73-46q-11 10-11 31m17-31q-10 12-10 34m18-35q-10 13-10 36m19-35q-10 15-10 37'),
  ] },
  scarf: { label: 'Scarves', singular: 'Scarf', viewBox: '114 199 134 85', styles: [
    item('alpine', 'Alpine knit', '#637153', '#e5d8ad', SCARF, 'M131 219q45 14 96 0m-96 6q45 14 92 1m-14 17 15 22m-13-25 19 26'),
    item('cabin', 'Cabin plaid', '#a6504a', '#f3c791', SCARF, 'M131 217q46 16 96 0m-91 11q46 13 88-4m-76-6-3 12m18-8-1 12m18-11v12m17-12 4 11m15-8 4 10m-7 8 10 14m-3-16 10 14'),
    item('midnight', 'Midnight rib', '#414951', '#bec7cf', SCARF, 'M138 216l-2 11m9-9-1 12m8-10-1 12m8-11-1 13m8-12-1 13m8-12v13m7-12v13m7-12 1 11m6-12 1 11m6-12 2 10m5-12 2 10m6-12 1 8'),
    item('marina', 'Marina stripe', '#507b91', '#eaf1ec', SCARF, 'M127 222q49 20 105-1m-102 6q49 19 100-1m-13 39 16-6m-13 12 16-5m-40-5 13 1m-13 4 13 2'),
    item('toast', 'Toast fringe', '#bc865a', '#f6ddbd', SCARF, 'M132 219q45 15 95-2m-30 46 11 1m-11 1-1 6m6-6v7m5-7 1 6m12-6 13-5m-11 7 3 6m1-7 4 6m1-8 4 6'),
  ] },
  pants: { label: 'Pants', singular: 'Pants', viewBox: '125 258 110 61', styles: [
    item('field', 'Field cargos', '#5b6343', '#b8b895', 'M131 270q49 7 98 0l3 19q-13 13-42 14l-10-7-10 7q-29-1-42-14Z', 'M133 276q47 7 94 0m-91 6h19v11h-17Zm88 0h-19v11h17Zm-44-4v11', 'M140 284h28l-1 23q-15 5-30 0Z'),
    item('chinos', 'Weekend chinos', '#b08d62', '#f2d6aa', 'M133 269q47 8 94 0l3 19q-12 12-40 15l-10-8-10 8q-28-3-40-15Z', 'm137 278 13 7m73-7-13 7m-28-4v12M135 285h15v11h-12Zm90 0h-15v11h12Z', 'M141 285h27l-3 22q-13 4-27 0Z'),
    item('cargo', 'Utility cargos', '#6a7955', '#e0d8a8', 'M131 268q49 7 98 0l4 21q-15 14-43 14l-10-7-10 7q-28 0-43-14Z', 'M132 278q48 7 96 0m-91 6h15v10h-13Zm86 0h-15v10h13Z', 'M138 285h31l-2 23q-16 6-32 0Z'),
    item('joggers', 'Cargo joggers', '#606074', '#e2d7df', 'M131 270q49 10 98 0l4 17q-16 13-43 17l-10-9-10 9q-27-4-43-17Z', 'M132 275q48 8 96 0m-51 6-5 8m11-8 5 8M137 287h16v10h-13Zm86 0h-16v10h13Z', 'M139 285h32l-5 22q-13 5-26 0Z'),
    item('track', 'Track pants', '#a15154', '#f5cf99', 'M130 270q50 7 100 0l3 21q-14 10-42 12l-11-8-11 8q-28-2-42-12Z', 'M134 275l-2 14m7-14-2 17m89-17 2 14m-7-14 2 17m-67-12q24 5 48 0', 'M138 283h30v24q-16 6-31 0Z'),
  ] },
  shoes: { label: 'Shoes', singular: 'Shoes', viewBox: '125 291 110 42', styles: [
    item('court', 'Court sneakers', '#458581', '#f4e7cf', 'M136 314q2-9 10-7l11 2 9-4 5 12q0 6-5 6h-26q-7 0-4-9Z', 'M139 319h28m-23-8 10 2m-12 1 10 2'),
    item('trail', 'Trail boots', '#82583d', '#f0c28d', 'M140 300h24l4 13q7 10-3 10h-27q-5 0-3-7Z', 'M138 319h30m-24-15h10m-11 4h10m-11 4h10'),
    item('low', 'Low-top trainers', '#435f76', '#fae9ce', 'M137 314q4-10 12-8l8 3 9-5 4 13q1 6-5 6h-26q-6 0-2-9Z', 'M140 316l7-1 6-7m-8 2 9 2m-11 1 8 1m10-1 6-2'),
    item('high', 'Retro high-tops', '#675e99', '#efddf5', 'M141 298h22l1 12q10 7 4 13h-29q-7-1-3-9Z', 'M138 319h29m-24-16h10m-11 4h12m-13 4h13'),
    item('runner', 'Street runners', '#3c4245', '#c8c9c6', 'M137 313q3-7 11-7l9 2 7-6 6 12 2 5-6 4h-28q-7-2-1-10Z', 'M140 315l10-2 9 4m-14-6 10 1m3-4 6 2m-7 3 9 3'),
  ] },
};

export const CATEGORIES = Object.keys(WARDROBE);
export const PALETTE = [
  { name: 'Pine', color: '#42745c' },
  { name: 'Lake', color: '#456d96' },
  { name: 'Mulberry', color: '#805f90' },
  { name: 'Brick', color: '#ab5b4d' },
  { name: 'Honey', color: '#cb9340' },
  { name: 'Oat', color: '#e2c7a0' },
  { name: 'Ink', color: '#41474c' },
];

export function garmentFor(category, choice) {
  return WARDROBE[category].styles.find(style => style.id === choice?.id);
}

export const LOOKS = [
  { name: 'Signature', expression: 'waving', outfit: {
    shirt: { id: 'crew', color: '#ecdfbe' }, jacket: { id: 'varsity', color: '#235743', trim: '#ece0bf', sleeves: '#e8d6ac' },
    cap: { id: 'classic', color: '#235743' }, pants: { id: 'cargo', color: '#39453e' }, shoes: { id: 'court', color: '#285b48' },
  } },
  { name: 'Midnight', expression: 'welcome', outfit: {
    shirt: { id: 'star', color: '#333c3e' }, jacket: { id: 'bomber', color: '#303538', trim: '#c9c6b8' },
    cap: { id: 'trucker', color: '#303538' }, pants: { id: 'joggers', color: '#3f4546' }, shoes: { id: 'runner', trim: '#c8c9c6' },
  } },
  { name: 'Alpine', expression: 'happy', outfit: {
    shirt: { id: 'stripe', color: '#547150' }, jacket: { id: 'puffer', color: '#eee0c6', trim: '#ae9273' },
    cap: { id: 'cord', color: '#6b7952' }, pants: { id: 'field', color: '#67734b', trim: '#b5ae8c' }, shoes: { id: 'trail' },
  } },
  { name: 'Urban', expression: 'waving', outfit: {
    shirt: { id: 'pocket', color: '#e9dcc4' }, jacket: { id: 'denim', color: '#3d5f7a', trim: '#e1c7a0' },
    cap: { id: 'flat', color: '#bd9566' }, pants: { id: 'chinos' }, shoes: { id: 'low' },
  } },
  { name: 'Champion', expression: 'welcome', outfit: {
    shirt: { id: 'ringer', color: '#f0d9a7' }, jacket: { id: 'race', color: '#81333a', trim: '#e9b369' },
    cap: { id: 'cycling', color: '#8e4547' }, pants: { id: 'track', color: '#ecdfc5', trim: '#7d3c3d' }, shoes: { id: 'high', color: '#8e4547' },
  } },
];
