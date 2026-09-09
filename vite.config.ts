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
    },
    clearScreen: false,
    server: {
      port: 5173,
      strictPort: true,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    envPrefix: ['VITE_', 'TAURI_'],
    build: {
      target: ['chrome120', 'firefox120', 'safari17'],
      rollupOptions: {
        output: {
          manualChunks: {
            codemirror: [
              '@codemirror/view',
              '@codemirror/state',
              '@codemirror/commands',
              '@codemirror/language',
            ],
          },
        },
      },
    },
  };
});
