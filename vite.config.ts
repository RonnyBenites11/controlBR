import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          framework: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          validation: ['zod'],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'BABY RONNYS · Inventario y Lives',
        short_name: 'Baby Ronnys',
        description: 'Inventario y ventas Live de calzado infantil',
        lang: 'es-PE',
        theme_color: '#527969',
        background_color: '#f6f7f2',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Solo el shell de la app: jamás cachear Auth, datos ni comprobantes.
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
