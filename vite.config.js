import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { copyFileSync, existsSync } from 'fs'

// Cloudflare Pages SPA routing: serve index.html as 404.html
function cloudflareSPA() {
  return {
    name: 'cloudflare-spa',
    closeBundle() {
      const src = resolve('dist/index.html')
      const dest = resolve('dist/404.html')
      // Retry up to 3 times — Dropbox can briefly lock files
      for (let i = 0; i < 3; i++) {
        try {
          if (existsSync(src)) { copyFileSync(src, dest); return }
        } catch { /* retry */ }
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflareSPA(),
  ],
  cacheDir: 'C:/Users/teddy/.vite-cache/skillcascade',
  build: {
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks: {
          'd3': ['d3'],
          'recharts': ['recharts'],
          'framer-motion': ['framer-motion'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
