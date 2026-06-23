import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    host: 'localhost',
    open: true,
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/dist/**'
      ]
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        headers: {
          'Connection': 'keep-alive'
        }
      },
      '/uploads': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      },
      '/fonts': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        bypass: (req) => {
          if (req.url?.endsWith('.ttf') || req.url?.endsWith('.woff') || req.url?.endsWith('.woff2') || req.url?.endsWith('.otf')) {
            return req.url;
          }
        }
      },
      '/supervisor': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
