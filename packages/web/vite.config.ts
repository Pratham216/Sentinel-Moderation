import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:4000',
      '/communities': { target: 'http://localhost:4000', changeOrigin: true },
      '/posts': 'http://localhost:4000',
      '/audit': 'http://localhost:4000',
      '/webhooks': 'http://localhost:4000',
      '/healthz': 'http://localhost:4000',
      '/readyz': 'http://localhost:4000',
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
});
