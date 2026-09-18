import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['katex'],
    },
    clearScreen: false,
    server: {
      port: 5173,
      strictPort: true,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    envPrefix: ['VITE_', 'TAURI_'],
    test: {
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    },
    build: {
      target: ['chrome120', 'firefox120', 'safari17'],
      modulePreload: { polyfill: false },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/katex')) {
              return 'katex';
            }
          },
        },
      },
    },
  };
});
