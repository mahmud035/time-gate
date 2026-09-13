import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

/**
 * Production is same-origin: one Express server serves the built client and
 * `/api/*`, so the browser only ever talks to one origin and cookies stay
 * first-party.
 *
 * This dev proxy mirrors that exactly, so a cookie that works locally works in
 * production for the same reasons. Never point the client at the API's own
 * origin — that would make every cookie third-party.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: false,
      },
    },
  },
});
