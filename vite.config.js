import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build version: 2024-10-29-v2
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5001'
    }
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      }
    }
  },
  plugins: [react()]
});