/*
 * On-device text recognition. Images never leave the browser: the OCR engine, its WebAssembly core and the
 * English model are self-hosted under /public/ocr and loaded only the first time someone scans or attaches a photo.
 */
let workerPromise = null;

function getWorker() {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(({ createWorker }) => createWorker('eng', 1, {
      workerPath: '/ocr/worker.min.js', corePath: '/ocr/core', langPath: '/ocr/lang', gzip: true, workerBlobURL: false,
    })).catch((err) => { workerPromise = null; throw err; });
  }
  return workerPromise;
}

/** Downscale large photos first: OCR is faster and just as accurate at ~1600px. */
async function prepare(file) {
  const bitmap = await (window.createImageBitmap ? window.createImageBitmap(file) : Promise.reject(new Error('unsupported')));
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas;
}

export async function readImageText(file) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Choose a photo or image file.');
  if (file.size > 15 * 1024 * 1024) throw new Error('That image is larger than 15 MB.');
  const [worker, image] = await Promise.all([getWorker(), prepare(file).catch(() => file)]);
  const { data } = await worker.recognize(image);
  return (data?.text || '').replace(/[ \t]+\n/g, '\n').trim();
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const num = (s) => Number(String(s).replace(/[,\s]/g, ''));
const AMOUNT = /(?:₱|php|p)?\s*(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})|\d+\.\d{2})\b/gi;

function findDate(text) {
  let m = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}|\d{2})\b/);
  if (m) { const y = m[3].length === 2 ? `20${m[3]}` : m[3]; return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; }
  m = text.match(/\b([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i);
  if (m && MONTHS.includes(m[1].toLowerCase())) return `${m[3]}-${String(MONTHS.indexOf(m[1].toLowerCase()) + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return '';
}

/** Best-effort fields from receipt or payment-confirmation text; people always review before saving. */
export function parseReceipt(text = '') {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let amount = 0;
  const totalLine = lines.find(l => /\b(grand\s*total|total\s*(amount|due)?|amount\s*(due|paid)|you\s*paid|amount)\b/i.test(l) && !/sub\s*-?\s*total/i.test(l));
  if (totalLine) { const hits = [...totalLine.matchAll(AMOUNT)]; if (hits.length) amount = num(hits[hits.length - 1][1]); }
  if (!amount) { const all = [...text.matchAll(AMOUNT)].map(h => num(h[1])).filter(n => n > 0 && n < 1e9); if (all.length) amount = Math.max(...all); }
  const merchant = (lines.find(l => /[a-z]{3}/i.test(l) && !/\d{4,}|receipt|invoice|official|tin\b|vat|date|time|cashier/i.test(l)) || '').replace(/[^\w&'.\- ]/g, '').trim().slice(0, 60);
  return { amount: Math.round(amount * 100) / 100, merchant, date: findDate(text) };
}
