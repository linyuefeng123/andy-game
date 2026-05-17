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
            if (id.includes('react-router') || id.includes('@remix-run')) return 'vendor-router';
            if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
            if (id.includes('zustand')) return 'vendor-zustand';
            return 'vendor';
          }
        },
      },
    },
    cssCodeSplit: true,
    target: 'es2020',
    reportCompressedSize: false,
    modulePreload: {
      resolveDependencies(filename, deps) {
        // Don't preload framer-motion chunk — it's not needed for first paint
        return deps.filter(d => !d.includes('vendor-motion'));
      },
    },
  },
})
