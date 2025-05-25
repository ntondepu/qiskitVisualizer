import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import http from 'node:http'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001', // Your Flask server
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  publicDir: 'public',
  build: {
    outDir: '../server/static',
    emptyOutDir: true,
  }
})
