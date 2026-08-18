import { defineConfig } from 'vite';
import { createRuntimeAssetDeliveryPlugin } from './scripts/runtime-asset-delivery.mjs';

export default defineConfig(({ command }) => ({
  publicDir: false,
  // GitHub Pages serves this project below the repository path. Keep local
  // development portable while making production entry URLs explicit.
  // 상대 경로로 통일한다. 빌드에 절대 base 를 박으면 로컬 preview 가 번들을 못 찾아
  // (404 /mini-web-game/...) 브라우저 게이트가 **영원히 통과할 수 없다** — 실측으로 확인했다.
  // Pages 는 이 앱을 /mini-web-game/last-light-zero-hour/ 아래에 두므로 문서 기준 상대 경로가
  // 절대 경로와 같은 곳을 가리킨다. pages-artifact-smoke 도 같은 접두사로 서빙한다.
  base: './',
  plugins: [createRuntimeAssetDeliveryPlugin()],
  // Scoped only to Cloudflare Quick Tunnel subdomains so the temporary public
  // playtest URL can reach this Vite development server.
  server: { host: '0.0.0.0', allowedHosts: ['.trycloudflare.com'] },
  build: { chunkSizeWarningLimit: 2048 },
}));
