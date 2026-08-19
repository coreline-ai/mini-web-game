import { defineConfig } from 'vite';
import { createRuntimeAssetDeliveryPlugin } from './scripts/runtime-asset-delivery.mjs';

// publicDir을 쓰지 않는다. `assets/`를 통째로 복사하던 이전 판은 배포물과 보관물의 경계를
// 빌드 후 삭제(dist/_source rm)로 지켰다 — 그건 경계가 아니라 사후 청소다. 이제 매니페스트의
// runtime 항목만 dist에 들어가고, 그 목록·SHA-256·바이트 예산을 qa:dist-runtime이 검증한다.
export default defineConfig({
  publicDir: false,
  plugins: [createRuntimeAssetDeliveryPlugin()],
  server: { host: '0.0.0.0' },
  build: { chunkSizeWarningLimit: 2048 },
});
