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
        // Explicit identity: GitHub Pages projects share one origin, and without an id Chrome
        // derives it from start_url, which can collide with another installed app's scope
        id: 'squishy-chess',
        start_url: './',
        scope: './',
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
