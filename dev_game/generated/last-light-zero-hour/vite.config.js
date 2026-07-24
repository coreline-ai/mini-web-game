import { defineConfig } from 'vite';
import { createRuntimeAssetDeliveryPlugin } from './scripts/runtime-asset-delivery.mjs';

export default defineConfig(({ command }) => ({
  publicDir: false,
  // GitHub Pages serves this project below the repository path. Keep local
  // development portable while making production entry URLs explicit.
  base: command === 'build' ? '/mini-web-game/last-light-zero-hour/' : './',
  plugins: [createRuntimeAssetDeliveryPlugin()],
  // Scoped only to Cloudflare Quick Tunnel subdomains so the temporary public
  // playtest URL can reach this Vite development server.
  server: { host: '0.0.0.0', allowedHosts: ['.trycloudflare.com'] },
  build: { chunkSizeWarningLimit: 2048 },
}));
