import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';

const PROJECT_ROOT = '/Users/iriver/hwan/projects/mini-web-game/dev_game/generated/road-stream-racer';
const TARGET_DIR = path.join(PROJECT_ROOT, 'assets/ui');

const SOURCES = {
  'racer_ui_header.png': '/Users/iriver/.gemini/antigravity/brain/942b4943-369c-4abe-86e3-d157f4069871/racer_ui_header_empty_1783561550814.png',
  'racer_ui_home.png': '/Users/iriver/.gemini/antigravity/brain/942b4943-369c-4abe-86e3-d157f4069871/racer_ui_home_1783561562152.png',
  'racer_ui_pause.png': '/Users/iriver/.gemini/antigravity/brain/942b4943-369c-4abe-86e3-d157f4069871/racer_ui_pause_1783561574586.png',
  'racer_icon_coin.png': '/Users/iriver/.gemini/antigravity/brain/942b4943-369c-4abe-86e3-d157f4069871/racer_icon_coin_1783561587789.png',
  'racer_icon_speed.png': '/Users/iriver/.gemini/antigravity/brain/942b4943-369c-4abe-86e3-d157f4069871/racer_icon_speed_1783561600652.png',
  'racer_icon_level.png': '/Users/iriver/.gemini/antigravity/brain/942b4943-369c-4abe-86e3-d157f4069871/racer_icon_level_1783561613986.png'
};

// 둥근 사각형 클리핑 마스크 적용 헬퍼
function applyRoundedRectMask(image, radius) {
  const w = image.bitmap.width;
  const h = image.bitmap.height;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const px = Math.abs(x - w / 2);
      const py = Math.abs(y - h / 2);

      const limitX = w / 2 - radius;
      const limitY = h / 2 - radius;

      if (px > limitX && py > limitY) {
        // 모서리 원형 컷 영역
        const cx = limitX;
        const cy = limitY;
        const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);

        if (dist > radius) {
          image.bitmap.data[idx + 3] = 0; // 완전 투명
        } else if (dist > radius - 3) {
          // 경계 안티에일리어싱 페더링
          const ratio = (radius - dist) / 3;
          image.bitmap.data[idx + 3] = Math.round(image.bitmap.data[idx + 3] * ratio);
        }
      }
    }
  }
}

// 원형 클리핑 마스크 적용 헬퍼 (미니 아이콘용)
function applyCircleMask(image) {
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  const r = w / 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const dx = x - w / 2;
      const dy = y - h / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > r) {
        image.bitmap.data[idx + 3] = 0;
      } else if (dist > r - 3) {
        const ratio = (r - dist) / 3;
        image.bitmap.data[idx + 3] = Math.round(image.bitmap.data[idx + 3] * ratio);
      }
    }
  }
}

async function processImage(srcPath, destName) {
  console.log(`Processing image ${srcPath} -> ${destName}...`);
  let image = await Jimp.read(srcPath);

  // 1. 헤더 패널의 경우 Y축 중앙의 슬림한 가로형 플레이트 영역만 크롭
  if (destName === 'racer_ui_header.png') {
    // 1024x1024의 중앙 Y 340~680 영역 크롭 (높이 340)
    image = image.crop({ x: 20, y: 340, w: 984, h: 344 });
  }

  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const cloned = image.clone();

  // 2. 기본 크로마키 배경 투명화 및 네온 글로우 강도 보정
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = image.bitmap.data[idx];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];

      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

      // 감도 향상: 어두운 회색 노이즈 기준을 42로 조정
      if (brightness < 42) {
        cloned.bitmap.data[idx + 3] = 0;
      } else if (brightness < 80) {
        const ratio = (brightness - 42) / (80 - 42);
        cloned.bitmap.data[idx + 3] = Math.round(ratio * 255);
      }
    }
  }

  // 3. 용도별 형상 기하학적 클리핑 마스크 씌우기
  if (destName === 'racer_ui_header.png') {
    applyRoundedRectMask(cloned, 64);
  } else if (destName.startsWith('racer_ui_')) {
    applyRoundedRectMask(cloned, 160); // 버튼용 둥근 모서리 마스킹
  } else if (destName.startsWith('racer_icon_')) {
    applyCircleMask(cloned); // 미니 원형 아이콘 마스킹
  }

  // 4. 저장
  const destPath = path.join(TARGET_DIR, destName);
  await cloned.write(destPath);
  console.log(`Saved polished asset to: ${destPath}`);
}

async function run() {
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  for (const [destName, srcPath] of Object.entries(SOURCES)) {
    try {
      await processImage(srcPath, destName);
    } catch (err) {
      console.error(`Error processing ${destName}:`, err);
    }
  }
  console.log('Premium GUI assets processing complete!');
}

run();
