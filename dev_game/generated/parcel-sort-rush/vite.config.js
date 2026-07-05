import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'assets',
  server: { host: '0.0.0.0', allowedHosts: true },
  preview: { host: '0.0.0.0', allowedHosts: true },
  build: { chunkSizeWarningLimit: 2048 },
});
