/**
 * ==============================================================
 *  NEW WINE CHURCH — Configuration Vite
 *  - React 19 (Fast Refresh)
 *  - Alias @ → src/ pour des imports propres
 *  - Proxy /api → backend Laravel (8000) en dev
 *  - Compression Gzip + Brotli en production
 *  - PWA différée à la Phase 7 (incompatibilité Vite 8 actuelle)
 * ==============================================================
 */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import compression from 'vite-plugin-compression'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Résolution du chemin __dirname en mode ESM.
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  // Charge les variables VITE_* depuis .env / .env.local.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      // Compression Gzip pour les assets statiques (production).
      compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240, // ne compresse que les fichiers > 10 Ko
      }),
      // Compression Brotli (meilleur ratio que gzip, supporté par tous navigateurs modernes).
      compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 10240,
      }),
    ],

    // Alias d'imports : `@/components/...` au lieu de `../../components/...`
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    // === Serveur de développement ===
    server: {
      port: 5173,
      strictPort: true,
      host: 'localhost',
      open: false,
      // Proxy : /api/* du frontend → http://localhost:8000/api/*
      // Ainsi axios peut appeler "/api/sermons" sans souci de CORS en dev.
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        '/sanctum': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        '/storage': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    // === Build de production ===
    build: {
      target: 'es2020',
      sourcemap: false,
      cssCodeSplit: true,
      // Code splitting manuel pour les bundles gros (vendor libraries lourdes).
      // Vite 8 (Rolldown) exige `manualChunks` sous forme de fonction.
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.match(/[\\/]node_modules[\\/](react|react-dom|react-router-dom|scheduler)[\\/]/)) {
              return 'react-vendor'
            }
            if (id.includes('@tanstack/react-query') || id.includes('node_modules/axios/')) {
              return 'query-vendor'
            }
            if (id.includes('video.js') || id.includes('hls.js')) {
              return 'video-vendor'
            }
            if (id.includes('agora-rtc-sdk-ng')) {
              return 'agora-vendor'
            }
            if (id.includes('@tiptap/')) {
              return 'tiptap-vendor'
            }
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n-vendor'
            }
            if (id.includes('@radix-ui/')) {
              return 'radix-vendor'
            }
            return undefined
          },
        },
      },
      chunkSizeWarningLimit: 800,
    },

    // === Preview (test local du build) ===
    preview: {
      port: 4173,
      strictPort: true,
    },
  }
})
