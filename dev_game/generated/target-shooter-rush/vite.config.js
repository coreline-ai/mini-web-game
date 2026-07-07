import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'assets',
  server: {
    host: '0.0.0.0',
    port: 5188,
    strictPort: true,
    allowedHosts: ['others-extreme-creatures-embassy.trycloudflare.com'],
  },
  build: { chunkSizeWarningLimit: 2048 },
});
