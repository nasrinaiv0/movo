/*
 * Amount keypad maths. Expressions are kept as a token list and evaluated with normal precedence by a tiny parser
 * (never eval). Results are rounded to centavos.
 */
export const OPS = { '+': (a, b) => a + b, '−': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => (b === 0 ? NaN : a / b) };
const round = (n) => Math.round(n * 100) / 100;

export function tokenize(expr) {
  return expr.match(/\d+(?:\.\d*)?|\.\d+|[+−×÷]/g) || [];
}

export function evaluate(expr) {
  const tokens = tokenize(expr);
  if (!tokens.length) return 0;
  if (OPS[tokens[tokens.length - 1]]) tokens.pop();
  const values = []; const ops = [];
  tokens.forEach((t, i) => (i % 2 === 0 ? values.push(Number(t)) : ops.push(t)));
  // × and ÷ first, then + and − left to right
  for (let i = 0; i < ops.length;) {
    if (ops[i] === '×' || ops[i] === '÷') { values.splice(i, 2, OPS[ops[i]](values[i], values[i + 1])); ops.splice(i, 1); } else i += 1;
  }
  let total = values[0];
  ops.forEach((op, i) => { total = OPS[op](total, values[i + 1]); });
  return Number.isFinite(total) ? round(total) : NaN;
}

const lastNumber = (expr) => (expr.match(/(\d+(?:\.\d*)?|\.\d+)$/) || [''])[0];
const fmt = (n) => String(round(n));

/** Applies one keypad key to the expression string and returns the next expression. */
export function press(expr, key) {
  const last = expr.slice(-1);
  if (key === 'AC') return '';
  if (key === '⌫') return expr.slice(0, -1);
  if (key === '=') { const v = evaluate(expr); return Number.isFinite(v) && v !== 0 ? fmt(v) : expr; }
  if (OPS[key]) {
    if (!expr) return '';
    return OPS[last] ? expr.slice(0, -1) + key : expr + key;
  }
  if (key === '%') {
    const num = lastNumber(expr); if (!num) return expr;
    const head = expr.slice(0, -num.length); const op = head.slice(-1);
    const base = (op === '+' || op === '−') ? evaluate(head.slice(0, -1)) : 1;
    return head + fmt((base * Number(num)) / 100);
  }
  const num = lastNumber(expr);
  if (key === '.') return num.includes('.') ? expr : expr + (num ? '.' : '0.');
  if (num.includes('.') && num.split('.')[1].length >= 2) return expr; // centavos only
  if (num.replace('.', '').length >= 12) return expr;
  if (num === '0' && key !== '.') return expr.slice(0, -1) + (key === '00' ? '0' : key);
  if (!num && key === '00') return expr + '0';
  return expr + key;
}
