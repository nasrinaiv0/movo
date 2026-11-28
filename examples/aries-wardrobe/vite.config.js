import { defineConfig, transformWithEsbuild } from 'vite';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'movo-original-jsx',
    enforce: 'pre',
    transform(code, id) {
      if (id.endsWith('/original/components/AriesMascot.js')) {
        return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
      }
    },
  }],
  optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'] },
  esbuild: { jsx: 'automatic' },
});
