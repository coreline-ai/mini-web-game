import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// assets/를 publicDir로 쓰면 그 안의 _source/(마스터 PNG·리샘플 원본)까지 dist에 복사된다.
// 마스터는 재생성·감사를 위한 보관물이지 배포물이 아니다 — 그대로 두면 dist가 수십 MB로
// 부풀고 런타임 전달 예산을 넘긴다. 빌드 후 배포본에서만 제거한다(원본은 그대로 보존).
function dropSourceMasters() {
  return {
    name: 'drop-source-masters',
    closeBundle() {
      const dir = path.resolve('dist/_source');
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  publicDir: 'assets',
  plugins: [dropSourceMasters()],
  server: { host: '0.0.0.0' },
  build: { chunkSizeWarningLimit: 2048 },
});
