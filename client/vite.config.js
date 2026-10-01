import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      // The app is offline-capable for the shell but every screen is data-driven,
      // so a background refresh behind a stale shell would show numbers that no
      // longer match the server. `prompt` leaves the update decision to the app
      // instead, which is where the reload prompt lives.
      injectRegister: null,
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'CTU Clean Track',
        short_name: 'CTU Clean Track',
        description:
          'Classroom cleanliness monitoring for Cebu Technological University - Naga Extension Campus.',
        // Relative, so the app works when served from a subpath as well as root.
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#f7f7f8',
        background_color: '#f7f7f8',
        categories: ['education', 'productivity'],
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/pwa-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // API responses are per-user and change constantly; precaching them would
        // put one student's reports in another student's cache. The shell is
        // precached, the network handles everything else.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Never serve a cached API response to a request that needs live data.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        // Off by default: a service worker in dev serves stale modules and makes
        // every change look like it did not apply.
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
