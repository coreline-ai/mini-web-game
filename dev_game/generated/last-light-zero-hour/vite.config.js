import { defineConfig } from 'vite';
import { createRuntimeAssetDeliveryPlugin } from './scripts/runtime-asset-delivery.mjs';

export default defineConfig({
  publicDir: false,
  plugins: [createRuntimeAssetDeliveryPlugin()],
  // Scoped only to Cloudflare Quick Tunnel subdomains so the temporary public
  // playtest URL can reach this Vite development server.
  server: { host: '0.0.0.0', allowedHosts: ['.trycloudflare.com'] },
  build: { chunkSizeWarningLimit: 2048 },
});
