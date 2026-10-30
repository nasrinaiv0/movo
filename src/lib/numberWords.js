/*
 * Turns spelled-out amounts into digits so spoken or typed sentences can be logged:
 * "two pesos" → "2 pesos", "one hundred fifty" → "150", "dalawang daan" → "200", "five thousand" → "5000".
 */
const UNITS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  isa: 1, isang: 1, dalawa: 2, dalawang: 2, tatlo: 3, tatlong: 3, apat: 4, apatna: 4, lima: 5, limang: 5, anim: 6, pito: 7, pitong: 7, walo: 8, walong: 8, siyam: 9, sampu: 10, sampung: 10 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALES = { hundred: 100, daan: 100, raan: 100, thousand: 1000, libo: 1000, million: 1e6, milyon: 1e6 };
const WORD = new RegExp(`\\b(?:${[...Object.keys(UNITS), ...Object.keys(TENS), ...Object.keys(SCALES), 'na', 'and', 'a'].join('|')})\\b`, 'i');

export function wordsToNumbers(text = '') {
  const tokens = String(text).split(/(\s+|-)/);
  const out = []; let run = []; // run of number-ish tokens (with separators)
  const flush = () => {
    const words = run.filter(t => t.trim() && t !== '-').map(t => t.toLowerCase());
    const value = parseRun(words);
    if (value === null) out.push(...run); else { const lead = run.findIndex(t => t.trim() && t !== '-'); out.push(...run.slice(0, lead), String(value)); const tail = run.slice(run.length - [...run].reverse().findIndex(t => t.trim() && t !== '-')); out.push(...tail); }
    run = [];
  };
  tokens.forEach(tok => {
    if (!tok.trim() || tok === '-') { if (run.length) run.push(tok); else out.push(tok); return; }
    if (WORD.test(tok) && WORD.exec(tok)[0].length === tok.replace(/[.,!?]+$/, '').length) run.push(tok);
    else { if (run.length) flush(); out.push(tok); }
  });
  if (run.length) flush();
  return out.join('');
}

function parseRun(words) {
  const clean = words.map(w => w.replace(/[.,!?]+$/, ''));
  if (!clean.some(w => w in UNITS || w in TENS || w in SCALES)) return null;
  if (clean.every(w => w === 'a' || w === 'and' || w === 'na')) return null;
  let total = 0; let current = 0; let seen = false;
  for (const w of clean) {
    if (w in UNITS) { current += UNITS[w]; seen = true; }
    else if (w in TENS) { current += TENS[w]; seen = true; }
    else if (w in SCALES) { const s = SCALES[w]; if (s === 100) current = (current || 1) * 100; else { total += (current || 1) * s; current = 0; } seen = true; }
    else if (w === 'a' && !seen) current = 1; // "a hundred"
  }
  return seen ? total + current : null;
}
