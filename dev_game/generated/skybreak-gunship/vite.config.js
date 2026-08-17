import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'assets',
  server: { host: '0.0.0.0' },
  build: { chunkSizeWarningLimit: 2048 },
});
