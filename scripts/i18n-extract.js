/*
 * Lists every interface string that needs a translation.
 * Collects tr()/rich() keys plus human-readable literals from data lists that are translated where shown.
 * Usage: node scripts/i18n-extract.js > keys.json   (or require('./i18n-extract').extract())
 */
const fs = require('fs'); const path = require('path');
const parser = require('@babel/parser');
const SRC = path.join(__dirname, '..', 'src');
const walkDir = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? (e.name === 'i18n' ? [] : walkDir(path.join(d, e.name))) : [path.join(d, e.name)]));
const files = walkDir(SRC).filter(f => /\.js$/.test(f) && !/\.test\.js$|setupTests|reportWebVitals|wallpapers\.js|Dashboard\.js/.test(f));
const NON_UI_CALLS = /^(localStorage|sessionStorage|document|window|console|setSheet|setPref|setView|go|openLegal|querySelector|matchMedia|addEventListener|removeEventListener|fetch|require|createElement|setAttribute|getItem|setItem|removeItem|toLocaleDateString|toLocaleTimeString|toLocaleString|test|replace|match|split|startsWith|endsWith|includes|indexOf|join|padStart|DateTimeFormat|NumberFormat|DisplayNames|URLSearchParams|setFilter|setWalletFilter|setTxFilter|setNFilter|setRange|setTab|setMode|setGenre|setWv|from|select|eq|order|insert|update|upsert|delete|limit|gte|lt|toDataURL|toBlob|createWorker|getUserMedia|setPointerCapture|animate|h|toFixed|scrollTo|scrollIntoView|focus|get|has|set|setNow|onPick|setPhase|setPendingLog|notifyLocal|onChange|setForm|setDraft)$/;
const DATA_FILES = /(screens|components)\/|lib\/(format|stickers|autoLog|ocr|csvImport|demoData)\.js|App\.js/;
const human = (s) => /[A-Za-z]{2}/.test(s) && !/^[a-z0-9_.\-/#:@%]+$/.test(s.trim()) && !/^[A-Z][a-z]+([A-Z][a-z]*)+$/.test(s.trim()) && !/^[A-Z0-9_]+$/.test(s.trim()) && !/^(https?:|mailto:|data:|\/|\.|#|var\(|rgba?\(|[a-z-]+:)/.test(s.trim()) && !/[{}<>=]|=>|\$\{/.test(s) && !/^[a-z]+[A-Z][A-Za-z]*$/.test(s.trim()) && !/^[a-z]{2}-[A-Z]{2}$/.test(s.trim()) && !/^\S+\.\S+$/.test(s.trim());
// Names, brands, sample merchants and internal identifiers that are never translated.
const IGNORE = new Set(['Apple', 'Facebook', 'Google', 'Apple Pay', 'Google Pay', 'GCash', 'Visa', 'Mastercard', 'NasrinAI', 'NasrinAI.com', 'PHP', 'DELETE', 'English',
  'Nasrin Abubakar', 'Metrobank', 'Metrobank Savings', 'BPI Savings', 'GoTyme Bank', 'Asia/Manila', 'xMidYMid slice', 'input, textarea, select', 'MOVO App', 'Version 1.0.0',
  'Sample', 'Manual', 'CSV Import', 'Automation', 'Philippines Data Privacy Act of 2012']);

function extract() {
const keys = new Set();
for (const f of files) {
  const isDemo = /lib\/demoData\.js$/.test(f.replace(/\\/g, '/'));
  const code = fs.readFileSync(f, 'utf8');
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  const isData = DATA_FILES.test(f.replace(/\\/g, '/'));
  const visit = (node, stack) => {
    if (!node || typeof node.type !== 'string') return;
    const parent = stack[stack.length - 1];
    if (node.type === 'CallExpression' && ['tr', 't', 'rich'].includes(node.callee.name) && node.arguments[0]?.type === 'StringLiteral' && /lib\/i18n|tr\b/.test(code)) {
      if (node.callee.name !== 't' || /lib\/(format|i18n)\.js$/.test(f) || /import \{ t \}/.test(code)) keys.add(node.arguments[0].value);
    }
    if (isDemo && node.type === 'StringLiteral' && parent?.type === 'ObjectProperty' && parent.value === node && ['title', 'body'].includes(parent.key.name)) keys.add(node.value);
    if (isData && !isDemo && node.type === 'StringLiteral' && human(node.value)) {
      const inImport = stack.some(n => n.type === 'ImportDeclaration' || n.type === 'ExportAllDeclaration');
      const isKey = parent && parent.type === 'ObjectProperty' && parent.key === node;
      const attr = [...stack].reverse().find(n => n.type === 'JSXAttribute');
      const badAttr = attr && /^(className|key|type|role|id|htmlFor|name|value|href|src|accept|style|rel|target|inputMode|autoComplete|pattern|d|viewBox|transform|patternTransform|gradientTransform)$/.test(attr.name.name);
      const call = [...stack].reverse().find(n => n.type === 'CallExpression');
      const callee = call && (call.callee.name || call.callee.property?.name);
      const badCall = call && NON_UI_CALLS.test(callee || '') && !(['tr', 'rich'].includes(callee));
      const binary = parent && (parent.type === 'BinaryExpression' || parent.type === 'SwitchCase');
      if (!inImport && !isKey && !badAttr && !badCall && !binary) keys.add(node.value);
    }
    stack.push(node);
    for (const k of Object.keys(node)) { if (k === 'loc' || k === 'extra') continue; const v = node[k]; if (Array.isArray(v)) v.forEach(c => visit(c, stack)); else if (v && typeof v.type === 'string') visit(v, stack); }
    stack.pop();
  };
  visit(ast.program, []);
}
return [...keys].filter(k => k.trim() && !/^support@/.test(k) && !IGNORE.has(k)).sort();
}

module.exports = { extract };
if (require.main === module) process.stdout.write(JSON.stringify(extract(), null, 1));
