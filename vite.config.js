import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

const PROD_API_URL = 'https://jih-api.ethicalint.com';
const DEVTUNNEL_API_URL = 'https://ls6cx6sb-8080.inc1.devtunnels.ms';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: DEVTUNNEL_API_URL, // Switch to PROD_API_URL when needed
        changeOrigin: true,
        secure: false,
        headers: {
          'ngrok-skip-browser-warning': '69420',
          'Accept': 'application/json',
        },
      },
    },
  },
});
