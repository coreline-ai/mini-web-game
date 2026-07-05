# New Game Start Guide — Idea-first dev_game 제작 절차

> 목적: 새 게임 아이디어가 생겼을 때 `dev_game`을 고정 템플릿 생성기가 아니라 **LLM 게임 제작 스튜디오**처럼 사용해, 기획 → 기술설계 → 구현 → 에셋/사운드 → QA까지 진행하는 절차를 고정한다. 최종 목표는 단순 데모가 아니라 **고품질 1차 프로덕션급 데모**다.

## 0. 핵심 규칙

```text
기존 archetype은 가능한 게임의 한계가 아니다.
기존 archetype은 빠르게 시작하기 위한 참고 패턴이다.
```

따라서 사용자가 “새로운 형식의 게임”을 요청하면 기존 dodge starter에 이름과 에셋만 바꿔 끼워 넣지 않는다. 먼저 아이디어를 분석하고, 기존 패턴이 맞지 않으면 새 게임 루프와 시스템을 직접 설계한다. 또한 공통 런타임 에셋을 재사용하지 않는다. 새 게임의 이미지/오디오/배경은 항상 해당 게임 전용으로 신규 생성해 `dev_game/generated/<game-id>/assets/**` 안에 둔다.

## 1. 신규 아이디어 시작 순서

1. **아이디어 원문 저장**
   - 예: `한 손 드래그로 자동차를 좌우 이동시키며 경찰과 트럭을 피하는 레이싱 게임`
2. **Game Director 분석**
   - 한줄 피치, 핵심 재미, 조작, 실패 조건, 반복 동기, 차별점을 정의한다.
3. **Pattern Fit Decision**
   - 기존 archetype과 70% 이상 같으면 시작점으로 사용한다.
   - 70% 미만이면 공통 shell만 쓰고 gameplay는 custom-loop로 설계한다.
4. **GDD 작성**
   - `docs/01-GDD.md`: 30초 루프, 점수, 난이도, 보상, 에셋/사운드 목록.
5. **기술 설계 작성**
   - `docs/02-TECH-DESIGN.md`: 씬, 엔티티, 시스템, 입력, 충돌, 데이터 구조.
6. **구현 범위 결정**
   - Foundation만 생성할지, 장르 고유 액션까지 구현할지 명시한다.
7. **starter 또는 custom project 생성**
   - 기존 CLI로 Foundation을 만들고 필요한 경우 `src/entities`, `src/systems`, `src/config`를 추가 구현한다.
8. **자동 QA + 장르별 QA**
   - build, browser smoke뿐 아니라 핵심 액션이 실제 동작하는지 검증한다.
9. **Adversarial Review**
   - “이게 기존 게임 스킨만 바꾼 것 아닌가?”를 반드시 검토한다.

상세 제작 파이프라인은 [`llm-game-studio-pipeline.md`](llm-game-studio-pipeline.md)를 따르고, 완료 판정은 [`production-demo-quality-contract.md`](production-demo-quality-contract.md)를 따른다.

## 2. Foundation 생성 명령

기존 `dev_game/generator`는 공통 Foundation을 빠르게 만들기 위한 도구다. 이것만으로 모든 장르가 완성되는 것은 아니다.

```bash
cd dev_game/generator
cp examples/poop-dodge.spec.json examples/my-new-game.spec.json
# my-new-game.spec.json 수정

node src/cli.mjs \
  --spec examples/my-new-game.spec.json \
  --out ../generated/my-new-game \
  --force

cd ..
npm run factory:qa
```

생성된 게임 실행:

```bash
cd dev_game/generated/my-new-game
npm install
npm run dev
npm run build
```

완료 보고 전 production-demo gate:

```bash
npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/my-new-game
```

## 3. Custom-loop 구현 기준

아래 중 하나라도 해당하면 기존 starter를 그대로 사용하지 말고 custom-loop로 확장한다.

| 조건 | 예시 | 필요한 조치 |
|---|---|---|
| 핵심 조작이 다름 | 리듬 탭, 물리 점프, 병합 퍼즐 | Input/System 새로 구현 |
| 공간 구조가 다름 | 차선 레이싱, 행성 회전, 격자 퍼즐 | World/Lane/Grid/Physics 시스템 추가 |
| 위험 판정이 다름 | 타이밍 판정, 탄막, AI 추격 | Collision/Pattern 시스템 추가 |
| 성장/선택이 핵심 | 로그라이트 스킬, 합성, 업그레이드 | Progression/Choice 시스템 추가 |
| 에셋만 바꾸면 다른 게임처럼 안 보임 | 똥피하기를 레이싱이라 부르는 경우 | 장르 고유 연출/액션 재구현 |

## 4. 실제 프로젝트 형식 참고 기준

신규 게임이 starter를 넘어 실제 게임 프로젝트가 될 때는 현재 저장소 루트의 `Don't Get Pooped!` 구현을 참고한다. 단, 참고는 코드 구조·문서 형식·검증 방식 참고만 의미한다. gameplay를 강제로 동일하게 만들거나 기존 에셋을 런타임에 재사용하라는 뜻이 아니다.

| 실제 프로젝트 경로 | 참고할 내용 |
|---|---|
| `src/scenes/` | Home/Game/Pause/Shop/Ranking/Settings 등 실제 씬 분리 방식 |
| `src/systems/` | 점수, 코인, 난이도, 스폰, 파워업, 보스, 음악 시스템 분리 방식 |
| `src/entities/` | 플레이어 등 독립 엔티티 클래스 구조 |
| `src/ui/` | 공통 UI kit, 배경/viewport 처리 방식 |
| `src/config/` | 게임 밸런스/스테이지/아이템 설정 분리 방식 |
| `assets/manifest.json` | 실제 에셋 manifest 구성 방식 |
| `assets/audio/audio-manifest.json` | SFX/BGM 목록과 트리거 정리 방식 |
| `docs/DEV-GUIDE.md` | 구현/실행/검증 가이드 작성 방식 |
| `docs/impl-plan-mvp.md` | MVP 구현 계획 형식 |
| `docs/scenario-full.md` | 시나리오/스테이지/이벤트 문서화 형식 |

## 5. starter와 production-demo game의 차이

| 구분 | `dev_game` Foundation starter | production-demo game |
|---|---|---|
| 목적 | 빠른 실행 가능한 뼈대 | 아이디어 고유 재미와 품질이 검증된 1차 프로덕션급 데모 |
| 기획 | spec 일부 필드 | GDD + 기술설계 + QA 기준 |
| 씬 | Boot/Loading/Home/Game/Pause/GameOver | 필요 시 Shop/Settings/Result/Tutorial 등 추가 |
| gameplay | 기본 회피/수집 | 아이디어별 custom entity/system |
| 에셋 | placeholder SVG/WAV 가능 | 주요 에셋 PNG/WebP 권장, 배경 3종 이상, 비율/스타일 보존 |
| 검증 | `factory:qa` | build + browser + 장르별 gameplay smoke + asset/audio QA + production-demo QA + visual-layout QA |

## 6. 완료 기준

신규 아이디어 게임은 아래를 모두 통과해야 한다.

- [ ] 아이디어가 `01-GDD.md`로 정리됨
- [ ] 기존 archetype 사용 여부와 이유가 명시됨
- [ ] 기존 archetype이 맞지 않을 경우 `custom-loop` 설계가 있음
- [ ] `02-TECH-DESIGN.md`에 씬/엔티티/시스템이 구체화됨
- [ ] `npm run build` 통과
- [ ] browser smoke에서 canvas 렌더와 PLAY 진입 확인
- [ ] 장르별 핵심 액션이 실제로 동작함
- [ ] 에셋이 검은 박스/깨진 이미지/비율 왜곡 없이 보임
- [ ] `factory:production-demo-qa`와 `factory:visual-layout-qa` 통과
- [ ] `window.__GAME_LAYOUT_BOUNDS__`로 UI bounds를 노출함
- [ ] 스테이지/테마 배경 3종 이상이 canvas 기준 크기 이상으로 존재함
- [ ] `assets/asset-manifest.json`에 `qualityTier: "production-demo"`가 있음
- [ ] 모든 manifest entry에 `provenance.source: "generated-for-game"`와 현재 game id가 있음
- [ ] 이미지/오디오/배경이 기존 프로젝트나 다른 게임의 파일을 직접 참조하지 않음
- [ ] `assetIsolation.mode: "per-game"`과 `noSharedRuntimeAssets: true`가 manifest에 있음
- [ ] 오디오가 홈/게임/일시정지 상태에 맞게 재생/정지됨
- [ ] Adversarial Review에서 “스킨만 바꾼 기존 게임” 지적을 통과

## 7. 완료 보고 템플릿

```text
게임명:
한줄 컨셉:
제작 판단: archetype 시작 / hybrid / custom-loop
주요 구현 파일:
실제 동작하는 핵심 액션:
검증 명령:
브라우저 smoke 결과:
미구현/다음 단계:
```
