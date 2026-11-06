import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const demoPage = new URL('../../docs/demo/index.html', import.meta.url);

/** Serves the generated talk page at /demo/ while the dev server runs; it is not part of the app bundle. */
function demoPageInDev(): Plugin {
  return {
    name: 'demo-page-in-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0];
        if (path !== '/demo' && path !== '/demo/' && path !== '/demo/index.html') return next();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(readFileSync(demoPage, 'utf8'));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), demoPageInDev()],
});
