import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { dirname, resolve } from 'path'
import { copyFileSync, existsSync, mkdirSync } from 'fs'

const SPA_STATIC_ROUTES = ['features', 'framework', 'demo', 'pricing']

// Cloudflare Pages SPA routing: serve index.html as 404.html
function cloudflareSPA() {
  let outDir

  return {
    name: 'cloudflare-spa',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const src = resolve(outDir, 'index.html')
      const fallbackFiles = [
        resolve(outDir, '404.html'),
        ...SPA_STATIC_ROUTES.map((route) => resolve(outDir, route, 'index.html')),
      ]
      // Retry up to 3 times — Dropbox can briefly lock files
      for (let i = 0; i < 3; i++) {
        try {
          if (existsSync(src)) {
            fallbackFiles.forEach((dest) => {
              mkdirSync(dirname(dest), { recursive: true })
              copyFileSync(src, dest)
            })
            return
          }
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
    emptyOutDir: false,
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
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
  },
})
