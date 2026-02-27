import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
          'three': ['three'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
