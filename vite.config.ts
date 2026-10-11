import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Squishy Chess',
        short_name: 'Squishy',
        description: 'Pastel, squishy chess for tablets.',
        theme_color: '#ffd6e8',
        background_color: '#fff4f8',
        display: 'standalone',
        orientation: 'landscape',
        // Keep this identity stable: changing it can create a separate installed app.
        // Relative ids resolve against the start_url origin, not the manifest directory.
        id: 'squishy-chess',
        start_url: './',
        scope: './',
        related_applications: [
          { platform: 'webapp', url: './manifest.webmanifest', id: 'squishy-chess' },
        ],
        prefer_related_applications: false,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
    }),
  ],
})

