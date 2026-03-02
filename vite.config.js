import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { copyFileSync } from 'fs'

// Cloudflare Pages SPA routing: serve index.html as 404.html
function cloudflareSPA() {
  return {
    name: 'cloudflare-spa',
    closeBundle() {
      copyFileSync(resolve('dist/index.html'), resolve('dist/404.html'))
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
