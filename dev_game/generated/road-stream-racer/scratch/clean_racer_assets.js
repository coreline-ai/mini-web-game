import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'assets');

// 에지 페더링 및 디헤일로(De-halo) 처리 함수
async function cleanAsset(relativeSrcPath) {
  const fullPath = path.join(ASSETS_DIR, relativeSrcPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${fullPath}`);
    return;
  }

  console.log(`Processing asset: ${relativeSrcPath}...`);
  const image = await Jimp.read(fullPath);
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const cloned = image.clone();

  // 픽셀 스캔 및 가장자리 부드럽게 보정
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = image.bitmap.data[idx];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      const a = image.bitmap.data[idx + 3];

      // 배경 색상이 아주 어두운 노이즈(Halo)인 경우 투명하게 날림
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      if (brightness < 12 && a > 0) {
        cloned.bitmap.data[idx + 3] = 0; // 알파를 0으로
        continue;
      }

      // 경계선 페더링 처리 (알파 값 조율)
      if (a > 0 && a < 255) {
        // 주변 8픽셀 검사
        let hasTransparentNeighbor = false;
        let neighborAlphaSum = 0;
        let neighborCount = 0;

        for (let ny = -1; ny <= 1; ny++) {
          for (let nx = -1; nx <= 1; nx++) {
            if (nx === 0 && ny === 0) continue;
            const px = x + nx;
            const py = y + ny;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const nIdx = (py * width + px) * 4;
              const na = image.bitmap.data[nIdx + 3];
              if (na === 0) {
                hasTransparentNeighbor = true;
              }
              neighborAlphaSum += na;
              neighborCount++;
            } else {
              hasTransparentNeighbor = true;
            }
          }
        }

        if (hasTransparentNeighbor) {
          // 투명한 픽셀과 접하는 최외곽 반투명 픽셀은 알파를 감쇄하여 스무딩
          const avgAlpha = neighborAlphaSum / neighborCount;
          cloned.bitmap.data[idx + 3] = Math.round(a * (avgAlpha / 255) * 0.85);
        }
      }
    }
  }

  // 원본 덮어쓰기 저장
  await cloned.write(fullPath);
  console.log(`Successfully optimized and saved: ${relativeSrcPath}`);
}

async function run() {
  const assetsToClean = [
    'characters/player-car.png',
    'vehicles/traffic-blue.png',
    'vehicles/traffic-yellow.png',
    'vehicles/traffic-truck.png',
    'items/coin.png',
    'obstacles/cone.png',
    'obstacles/barricade.png',
    'ui/btn-frame.png',
    'ui/btn-pause.png',
    'ui/btn-boost.png'
  ];

  for (const asset of assetsToClean) {
    try {
      await cleanAsset(asset);
    } catch (err) {
      console.error(`Failed to process ${asset}:`, err);
    }
  }
  console.log('All asset processing finished!');
}

run();
