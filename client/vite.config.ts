import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

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
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      /**
       * A new deploy must reach the entrance tablet without anyone thinking to
       * clear a cache. `autoUpdate` takes the new service worker the moment it
       * is ready rather than waiting for every tab to close — on a device that
       * is never closed, prompting would mean never updating.
       */
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'TimeGate',
        short_name: 'TimeGate',
        description: 'Clock in and out at work.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#fbfcfd',
        theme_color: '#006bbb',
        lang: 'en-GB',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        /**
         * The shell is precached so the screen at the door opens instantly on
         * bad wifi. Fonts are included because a punch screen that renders in a
         * fallback face for two seconds looks broken.
         */
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],

        /**
         * **Nothing under /api is ever cached or served from a cache.**
         *
         * A cached punch response would record a time that already passed, and
         * a cached timesheet would show hours that are no longer true. Being
         * offline has to fail loudly — the screen says so and disables the
         * keypad — rather than succeed against a stale copy.
         */
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],

        /** Take over immediately, so a reload lands on the new version. */
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: { enabled: false },
    }),
  ],
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
