import { defineConfig } from 'vite';
import { createRuntimeAssetDeliveryPlugin } from './scripts/runtime-asset-delivery.mjs';

export default defineConfig({
  publicDir: false,
  plugins: [createRuntimeAssetDeliveryPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5188,
    strictPort: true,
    allowedHosts: ['others-extreme-creatures-embassy.trycloudflare.com'],
  },
  build: { chunkSizeWarningLimit: 2048 },
});
