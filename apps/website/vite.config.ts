import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  envDir: false,
  envPrefix: 'SYMINDX_PUBLIC_',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/ollama': {
        target: 'http://127.0.0.1:11434',
        rewrite: (path) => path.replace(/^\/ollama/, '') || '/',
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
});
