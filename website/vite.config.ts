import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const API_ORIGIN = 'http://127.0.0.1:8000';

export default defineConfig({
  envDir: false,
  envPrefix: 'SYMINDX_PUBLIC_',
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: API_ORIGIN,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api(?=\/|$)/, '') || '/',
        configure(proxy) {
          proxy.on('proxyReq', (proxyRequest) => {
            proxyRequest.setHeader('origin', API_ORIGIN);
            proxyRequest.removeHeader('referer');
          });
        },
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
});
