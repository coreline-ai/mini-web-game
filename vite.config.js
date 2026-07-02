import { defineConfig } from 'vite';

// assets/ 폴더를 publicDir로 사용 → 파일이 사이트 루트(/)에서 서빙된다.
// 예) assets/backgrounds/bg_city.svg  ->  /backgrounds/bg_city.svg
export default defineConfig({
  publicDir: 'assets',
  // 5173은 다른 프로젝트가 점유 중이므로 전용 포트 5180 고정
  server: {
    host: true,
    port: 5180,
    strictPort: true,
    allowedHosts: ['.trycloudflare.com'],
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
