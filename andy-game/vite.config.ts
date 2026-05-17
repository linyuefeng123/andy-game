import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('react-dom') || id.includes('react/') || id.includes('react-router-dom')) return 'vendor-react';
            if (id.includes('zustand')) return 'vendor-zustand';
            return 'vendor';
          }
        },
      },
    },
    cssCodeSplit: true,
    target: 'es2020',
    reportCompressedSize: false,
  },
})
