import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        ws: true,
        configure: (proxy, options) => {
          // Important for session cookies to work
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Origin', 'http://localhost:5173');
          });
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['Access-Control-Allow-Origin'] = 'http://localhost:5173';
            proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
          });
        }
      }
    },
    // Enable CORS for development
    cors: {
      origin: 'http://localhost:5001',
      credentials: true
    }
  },
  
  build: {
    outDir: '../server/static',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[hash].[ext]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      }
    }
  },
  
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url))
    }
  },
  
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCaseOnly'
    }
  }
});
