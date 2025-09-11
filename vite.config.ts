import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Vite config for multi-page (popup + newtab) and background script bundling
export default defineConfig({
  base: '',
  plugins: [react()],
  build: {
    target: 'es2019',
    sourcemap: true,
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'public/popup.html'),
        newtab: resolve(__dirname, 'public/newtab.html'),
        // Background service worker entry (bundled to dist/background.js)
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'background.js';
          return 'assets/[name]-[hash].js';
        },
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
