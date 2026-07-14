# Skybreak Gunship — Polish Pass 5 (2026-07-14)

## 증상

- Home `90초 작전` 설명 하단 여백이 상단보다 좁음.
- 보병이 엄폐할 때 에너지 사각형처럼 보임.
- 기관포·유도 미사일의 발사 플랫폼과 실물 projectile이 보이지 않음.
- 무기 입력 시 오디오 unlock/전투 피드백이 불명확함.

## 수정

- Home mission panel을 336×88, y507로 조정.
- GameScene에 hero gunship runtime sprite와 chin-gun/missile rack launch point 추가.
- 기관포를 orange ballistic streak + muzzle flash로 변경.
- 유도 미사일을 실제 missile sprite + cyan launch flash/trail로 표시.
- cover 상태를 low barricade silhouette로 변경하고 병사 sprite를 유지.
- 무기 버튼에서 AudioManager.unlock을 보장하고 무기 레이어 볼륨 조정.

## 증거

- `generated/skybreak-gunship/qa-captures/polish-04-home-spacing.png`
- `generated/skybreak-gunship/qa-captures/polish-04-game-gunship.png`
- `generated/skybreak-gunship/qa-captures/polish-04-gun-fire.png`
- `generated/skybreak-gunship/qa-captures/polish-04-missile-fire.png`
- `generated/skybreak-gunship/qa-captures/polish-04-soldier-cover.png`

## 검증

- Build: PASS (36 modules)
- Clarity: PASS (17 assertions), browserErrors 0
- Input hostility: PASS
- Combat: PASS (13/13)
- Lifecycle: PASS (120초, Retry 5회, pool/audio bounded)
