const config = require('../../vercel.json');
test('receipt OCR WebAssembly is explicitly allowed without enabling arbitrary JS eval', () => {
  const primary = config.headers.find(header => header.source === '/(.*)');
  const csp = primary.headers.find(header => header.key === 'Content-Security-Policy').value;
  expect(csp).toMatch(/script-src 'self' 'wasm-unsafe-eval'/);
  expect(csp).not.toMatch(/'unsafe-eval'/);
  expect(csp).toMatch(/worker-src 'self' blob:/);
});
