import { defineConfig } from 'vite';
import { createRuntimeAssetDeliveryPlugin } from './scripts/runtime-asset-delivery.mjs';

export default defineConfig({
  publicDir: false,
  plugins: [createRuntimeAssetDeliveryPlugin()],
  server: { host: '0.0.0.0', allowedHosts: true },
  preview: { host: '0.0.0.0', allowedHosts: true },
  build: { chunkSizeWarningLimit: 2048 },
});
