# Game DD — Raster Sprites (PNG)

AI 카탈로그 이미지(ChatGPT 생성)를 자동 슬라이스하여 **배경 투명 처리**한 게임용 PNG 에셋.
기존 `assets/*.svg` 세트와 **공존**하며, 이 폴더(`assets/sprites/`)는 래스터 전용 루트다.

## 규격
- 배경: 투명(edge flood-fill로 검정 배경 제거)
- 스타일: cute mobile casual chibi, 두꺼운 외곽선
- 원본: 1024×1920 카탈로그 이미지, 항목별 콘텐츠 bbox로 타이트 크롭(패딩 6px)

## 카테고리 (총 86개)
| 폴더 | 개수 | 내용 |
|------|------|------|
| `characters/players/` | 8 | 소년/소녀/직장인/닌자/우주인/토끼/고양이/오리 |
| `enemies/poop/` | 34 | 기본3·큰3·회전8f·작은6·황금3·독3·새5·가짜3 |
| `enemies/boss/` | 4 | 변기 보스 4단계 |
| `items/` | 9 | 우산·슬리퍼·자석·시계·번개 / 코인2 / 하트2 |
| `backgrounds/` | 8 | 도시·공원·학교·지하철·우주·사막·빙하·용암 |
| `effects/common/` | 4 | 폭발·연기·별링·별폭발 |
| `effects/hazard/` | 3 | 독 바닥 효과 3단계 |
| `ui/` | 10 | 스코어패널·일시정지(대)·버튼8종 |
| `messages/` | 3 | WARNING / FANTASTIC! / GAME OVER |
| `animations/` | 3 | 걷기8f·똥회전8f·보스공격12f 스트립(전체) |

## 사용 메모
- `manifest.json`에 전 항목 경로와 픽셀 크기(dimensions) 수록 → Phaser preload에 활용.
- `animations/*`는 멀티프레임 시트(전체 스트립). 회전 똥은 개별 프레임도 `enemies/poop/poop_spin_f1..f8.png`로 제공.
- 자동 슬라이스 특성상 일부 항목(예: `item_lightning` 하단 라벨 잔상, `poison_floor_1` 인접 병합)에 미세 잔상이 있을 수 있음 → 필요 시 수동 보정.
- 검증용 전체 미리보기: `_contact_sheet.png`.
