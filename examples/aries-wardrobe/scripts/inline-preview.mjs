// Build a portable copy that opens offline without a local HTTP server.
import { readFile, writeFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const index = await readFile(new URL('index.html', dist), 'utf8');
const script = /<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/;
const stylesheet = /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/;
const [js, css] = await Promise.all([script, stylesheet].map(pattern =>
  readFile(new URL(index.match(pattern)[1], dist), 'utf8')
));
const html = index
  .replace(script, () => `<script type="module">${js.replaceAll(/<\/script/gi, '<\\/script')}</script>`)
  .replace(stylesheet, () => `<style>${css}</style>`);
await writeFile(new URL('preview.html', dist), html);
