import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const isTauriBuild = Boolean(process.env.TAURI_ENV_PLATFORM);

export default defineConfig({
  plugins: [
    react(),
    ...(!isTauriBuild
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icons/icon.svg'],
            manifest: {
              name: 'Solitaire Collections',
              short_name: 'Solitaire',
              description: 'An offline collection of solitaire card games.',
              lang: 'ja',
              start_url: '/',
              display: 'standalone',
              background_color: '#08251f',
              theme_color: '#0d5c4a',
              icons: [
                {
                  src: '/icons/icon.svg',
                  sizes: 'any',
                  type: 'image/svg+xml',
                  purpose: 'any maskable',
                },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
              navigateFallback: '/index.html',
              maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
            },
          }),
        ]
      : []),
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
