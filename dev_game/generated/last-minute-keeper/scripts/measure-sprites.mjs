// measure-sprites.mjs — 생성된 자산의 실제 여백을 재서 spriteMetrics.js를 갱신한다.
//
// 눈대중이나 추정으로 상수를 적으면 자산을 재생성할 때마다 어긋난다. 알파>64 bbox로
// 재는 이유는, 알파>0은 생성 이미지의 흐릿한 후광까지 세어 실제 몸통보다 훨씬 크게 나오기
// 때문이다(직전 게임 실측: 알파>0 기준 93% vs 알파>64 기준 41%).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const PY = `
import json, sys, glob, os
from PIL import Image
out = {}
for p in sorted(glob.glob('assets/characters/*.webp')) + sorted(glob.glob('assets/ui/*.webp')):
    im = Image.open(p).convert('RGBA'); w, h = im.size
    bb = im.getchannel('A').point(lambda v: 255 if v > 64 else 0).getbbox()
    if not bb: continue
    key = os.path.basename(p).rsplit('.', 1)[0]
    out[key] = {
        'bottom': round((h - bb[3]) / h, 3),
        'top': round(bb[1] / h, 3),
        'widthFrac': round((bb[2] - bb[0]) / w, 3),
    }
print(json.dumps(out, indent=2))
`;
const r = spawnSync('python3', ['-c', PY], { encoding: 'utf8' });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
const measured = JSON.parse(r.stdout);
console.log('실측 결과:');
for (const [k, v] of Object.entries(measured)) {
  console.log(`  ${k.padEnd(20)} bottom ${String(v.bottom).padStart(5)}  top ${String(v.top).padStart(5)}  widthFrac ${v.widthFrac}`);
}
fs.writeFileSync('qa-captures/sprite-metrics-measured.json', `${JSON.stringify(measured, null, 2)}\n`);
console.log('\n→ qa-captures/sprite-metrics-measured.json 에 기록. spriteMetrics.js의 HULL을 이 값으로 맞춘다.');
