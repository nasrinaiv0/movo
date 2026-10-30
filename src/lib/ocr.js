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

/** Downscale to ~1600px and boost contrast in greyscale: OCR is faster and more accurate on clean, even text. */
async function prepare(file) {
  const bitmap = await (window.createImageBitmap ? window.createImageBitmap(file) : Promise.reject(new Error('unsupported')));
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return enhance(canvas);
}

/** Greyscale + contrast stretch (5th–95th percentile), in place. */
export function enhance(canvas) {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height); const d = img.data;
    const hist = new Uint32Array(256);
    for (let i = 0; i < d.length; i += 4) { const y = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 | 0; d[i] = y; hist[y] += 1; }
    const total = d.length / 4; let lo = 0; let hi = 255; let acc = 0;
    for (let v = 0; v < 256; v += 1) { acc += hist[v]; if (acc > total * 0.05) { lo = v; break; } }
    acc = 0; for (let v = 255; v >= 0; v -= 1) { acc += hist[v]; if (acc > total * 0.05) { hi = v; break; } }
    const range = Math.max(1, hi - lo);
    for (let i = 0; i < d.length; i += 4) { const y = Math.max(0, Math.min(255, ((d[i] - lo) * 255) / range)); d[i] = y; d[i + 1] = y; d[i + 2] = y; }
    ctx.putImageData(img, 0, 0);
  } catch { /* canvas unavailable: use the plain image */ }
  return canvas;
}

/** Start loading the OCR engine early (e.g. when the scanner opens) so the first scan is quicker. */
export const warmUpOcr = () => { getWorker().catch(() => {}); };

export async function readImageText(file) {
  if (!file || !/^image\//.test(file.type || '')) throw new Error('Choose a photo or image file.');
  if (file.size > 15 * 1024 * 1024) throw new Error('That image is larger than 15 MB.');
  const [worker, image] = await Promise.all([getWorker(), prepare(file).catch(() => file)]);
  const { data } = await worker.recognize(image);
  return (data?.text || '').replace(/[ \t]+\n/g, '\n').trim();
}

/*
 * Invoices and e-receipts as PDF, read on this device with a self-hosted pdf.js (scripts disabled). Text PDFs are
 * read directly; scanned PDFs fall back to OCR of the first page.
 */
export async function readPdfText(file) {
  if (!file || !(file.type === 'application/pdf' || /\.pdf$/i.test(file.name || ''))) throw new Error('Choose a PDF file.');
  if (file.size > 15 * 1024 * 1024) throw new Error('That file is larger than 15 MB.');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = '/ocr/pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, disableFontFace: true, enableXfa: false }).promise;
  try {
    const lines = [];
    for (let n = 1; n <= Math.min(doc.numPages, 3); n += 1) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      let row = []; let lastY = null;
      content.items.forEach(item => {
        const y = Math.round(item.transform?.[5] ?? 0);
        if (lastY !== null && Math.abs(y - lastY) > 2) { lines.push(row.join(' ')); row = []; }
        if (item.str) row.push(item.str); lastY = y;
      });
      if (row.length) lines.push(row.join(' '));
    }
    const text = lines.map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
    if (text.replace(/\W/g, '').length >= 20) return text;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: Math.min(2, 1600 / page.getViewport({ scale: 1 }).width) });
    const canvas = document.createElement('canvas'); canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const worker = await getWorker();
    const { data } = await worker.recognize(enhance(canvas));
    return (data?.text || '').replace(/[ \t]+\n/g, '\n').trim();
  } finally { doc.destroy(); }
}

/** Any supported file: photo, screenshot, receipt image or PDF invoice. */
export const readDocumentText = (file) => ((file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '')) ? readPdfText(file) : readImageText(file));

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

const GUESS = [
  ['Food & drinks', /jollibee|mcdo|mcdonald|kfc|chowking|starbucks|coffee|cafe|restaurant|grill|pizza|burger|inasal|greenwich|bakery|milk ?tea/i],
  ['Groceries', /supermarket|grocery|puregold|savemore|robinsons|landmark|7-?eleven|alfamart|ministop|market/i],
  ['Transport', /grab|angkas|joyride|shell|petron|caltex|seaoil|toll|easytrip|autosweep|lrt|mrt|parking|fuel|gas/i],
  ['Bills', /meralco|maynilad|manila water|pldt|globe|smart|converge|sky|electric|water|internet|bill/i],
  ['Subscriptions', /netflix|spotify|youtube|disney|apple\.com|icloud|google|prime/i],
  ['Health', /mercury|watsons|southstar|pharma|drug|clinic|hospital|dental|medical/i],
  ['Shopping', /lazada|shopee|uniqlo|h&m|zara|miniso|mall|department|store/i],
  ['Entertainment', /cinema|movie|ticket|concert|game|steam|playstation/i],
];
export const guessCategory = (text = '') => (GUESS.find(([, re]) => re.test(text)) || ['Other'])[0];
