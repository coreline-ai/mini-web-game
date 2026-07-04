import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

// assets/ 폴더를 publicDir로 사용 → 파일이 사이트 루트(/)에서 서빙된다.
// 빌드(=배포)는 GitHub Pages 프로젝트 경로(/mini-web-game/)에 맞춰 base를 고정하고,
// dev 서버는 루트(./)로 유지해 로컬 접속(localhost:5180)이 그대로 동작하게 한다.
export default defineConfig(({ command }) => ({
  root: projectRoot,
  publicDir: 'assets',
  base: command === 'build' ? '/mini-web-game/' : './',
  // 5173은 다른 프로젝트가 점유 중이므로 전용 포트 5180 고정
  server: {
    host: true,
    port: 5180,
    strictPort: true,
    allowedHosts: ['.trycloudflare.com'],
  },
  build: { outDir: 'dist', emptyOutDir: true },
}));
