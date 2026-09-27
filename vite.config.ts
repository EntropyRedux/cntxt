import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['katex'],
    },
    optimizeDeps: {
      entries: ['index.html'],
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'zustand',
        'lucide-react',
        'canvas-confetti',
        'marked',
        'katex',
        '@codemirror/state',
        '@codemirror/view',
        '@codemirror/language',
        '@codemirror/commands',
        '@codemirror/search',
        '@codemirror/autocomplete',
        '@codemirror/lang-markdown',
        '@codemirror/lang-javascript',
        '@codemirror/lang-python',
        '@codemirror/lang-html',
        '@codemirror/lang-css',
        '@codemirror/lang-json',
        '@codemirror/lang-sql',
        '@codemirror/lang-rust',
        '@codemirror/lang-cpp',
        '@lezer/highlight',
        '@tauri-apps/api/core',
        '@tauri-apps/api/event',
        '@tauri-apps/api/window',
      ],
    },
    clearScreen: false,
    server: {
      port: 5173,
      strictPort: true,
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/src-tauri/target/**', '**/playwright-report/**', '**/test-results/**', '**/contextpad_replica_ai-studio/**'],
      },
      warmup: {
        clientFiles: [
          './src/main.tsx',
          './src/App.tsx',
          './src/index.css',
        ],
      },
    },
    envPrefix: ['VITE_', 'TAURI_'],
    test: {
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    },
    esbuild: {
      sourcemap: false,
      legalComments: 'none',
    },
    build: {
      target: 'esnext',
      modulePreload: { polyfill: false },
      sourcemap: false,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 2500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('katex')) return 'vendor-katex';
              if (id.includes('@codemirror') || id.includes('@lezer')) return 'vendor-codemirror';
              if (id.includes('lucide-react')) return 'vendor-lucide';
              if (id.includes('react') || id.includes('zustand')) return 'vendor-react';
              return 'vendor';
            }
          },
        },
      },
    },
  };
});
