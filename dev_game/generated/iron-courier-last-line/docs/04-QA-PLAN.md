# 04. QA 계획 — 철갑특송: 라스트 라인

## 완료 증거 원칙

빌드 성공이나 Home 화면 표시만으로 완료를 주장하지 않는다. 요구사항별로 코드, 자동 assertion, 실제 브라우저 조작, 캡처, 콘솔 로그, 장시간 성능 결과를 연결한다. 캡처에서 결함이 발견되면 수정 후 같은 조건으로 재캡처하고 전체 관련 게이트를 다시 실행한다.

## 대상 환경

| viewport | 용도 |
|---|---|
| 844×390 | 작은 모바일 가로 |
| 932×430 | 큰 모바일 가로 |
| 1280×720 | 디자인 기준/데스크톱 최소 |
| 1920×1080 | PC 고해상도 |

모바일은 touch emulation, DPR 2 이상도 추가 확인한다. Chrome 계열을 기준으로 하되 Safari/iOS와 Android Chrome에서 오디오 unlock, pointer cancel, visibilitychange를 실기기 smoke한다.

## 실행 게이트

프로젝트 경로를 `dev_game/generated/iron-courier-last-line`로 지정한다.

```bash
npm install
npm run build
npm --prefix dev_game run factory:qa
npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/iron-courier-last-line --require-gpt-imagegen
npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/iron-courier-last-line
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/iron-courier-last-line --viewports 844x390,932x430,1280x720,1920x1080
npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/iron-courier-last-line --viewports 844x390,932x430,1280x720,1920x1080
npm --prefix dev_game run factory:hq-screen-quality-qa -- --project dev_game/generated/iron-courier-last-line
npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/iron-courier-last-line --require-gpt-imagegen --viewports 844x390,932x430,1280x720,1920x1080
```

게이트가 가로 viewport를 지원하지 않는다면 별도 browser test로 동일 조건을 증명하되 기존 게이트를 완화하거나 삭제하지 않는다.

## 기능 테스트 매트릭스

| ID | 시나리오 | 조작/조건 | 합격 기준 |
|---|---|---|---|
| F-01 | Home→Game | PLAY click/tap | 1초 내 Game, stage BGM, 오류 0 |
| F-02 | 이동/점프 | 좌우+Space/touch | 속도/방향 정상, 코요테 80ms, 버퍼 100ms |
| F-03 | 조준/사격 | 8방향+J/touch | 다음 tick 발사, 방향 일치, rifle 무한 |
| F-04 | 특수무기 | pickup 후 소진 | ammo 정확, 0에서 rifle 자동복귀 |
| F-05 | 수류탄 | K/touch | fuse/포물선/광역피해/수량 정확 |
| F-06 | 피격 | 연속 projectile | 900ms 무적, HP/flash/SFX 한 번씩 |
| F-07 | 적 4종 | 각 단독+혼합 | role별 패턴, telegraph, death score 1회 |
| F-08 | 구조 기술자 | captive 해제/접근 | score 750, vehicle repair credit 140 한 번 |
| F-09 | 구조 의무병 | HP<65에서 구조 | HP +35, max 100, score 한 번 |
| F-10 | 포병 | 선택 구조 | 12초, 2.2초 간격, 팀 피해 규칙 정상 |
| F-11 | 호위 | 3 waves | 위협 시 정지, clear 시 이동, end 도달 |
| F-12 | 차량 실패 | vehicle HP 0 | checkpoint retry, stale wave/timer 0 |
| F-13 | 파괴 연쇄 | fuel drum 3개 인접 | 지연 연쇄, 양 팀 피해, 중복 점수 0 |
| F-14 | 미니보스 | 전 패턴/격파 | arena lock, 3패턴, 약점 배율, 해제 |
| F-15 | 아이언 몰 | HP threshold 통과 | 3 phase 순서, 이전 탄/marker/loop 정리 |
| F-16 | Pause | Esc/button/blur | simulation·BGM·loop 멈춤, resume 복원 |
| F-17 | Result | boss death | 점수 항목 일치, best 저장, retry/home |
| F-18 | 재시작 | 연속 5회 | listener/collider/score/projectile 중복 0 |

## 장르 핵심 assertion

- 30초 내 이동, 점프, 기본 사격, 첫 적 처치, 파괴 피드백을 모두 경험한다.
- 10~15초마다 적 조합·고저차·보급·구조·파괴·환경 중 하나가 바뀐다.
- 실제 median clear time 420~600초.
- 플레이어가 정적 이미지가 아니며 idle/run/jump/shoot/hurt/death가 runtime에서 적용된다.
- 전방 적을 조준할 때 자동조준이 뒤쪽 적을 선택하지 않는다.
- 방패병은 전면 감소/배후 증폭이 있고 폭발로 경직 가능하다.
- 호위는 장식이 아니라 차량 HP·정지·실패·완료 상태를 갖는다.
- 환경 폭발이 적에게 실제 피해를 준다.
- 최종 보스 phase는 단순 속도 상승만이 아니라 노출 부위와 공격군이 바뀐다.

## 캡처 매트릭스

각 상태를 844×390, 932×430, 1280×720에서 캡처하고 대표 상태는 1920×1080도 남긴다.

| 캡처 ID | 필수 상태 | 프레임 조건 | 확인 항목 |
|---|---|---|---|
| C-01 | Loading | 30~70% | progress, 배경 품질, 텍스트 clipping |
| C-02 | Home | idle | PLAY, title, safe area, 배경/캐릭터 대비 |
| C-03 | 초기 전투 | run+shoot 중간 프레임 | animation 적용, 방향, touch UI |
| C-04 | 구조 성공 | medic/engineer 효과 | 아이콘 의미, score, 플레이 방해 여부 |
| C-05 | 장갑차 호위 | vehicle critical+wave | escort HP, 내부 면, 적/UI 겹침 |
| C-06 | 미니보스 | cargo marker+attack | telegraph 가독성, arena, weak point |
| C-07 | 교량 혼전 | 6+ 적과 연쇄 폭발 | projectile/위험 marker 가독성, FPS |
| C-08 | 최종보스 | phase 1/2/3 각 1장 | 파츠, 약점, HP, phase 차이 |
| C-09 | Pause | active battle 위 overlay | BGM pause, panel fit, touch 차단 |
| C-10 | Result | win | 점수/구조/시간/HP, 버튼, 저장값 |
| C-11 | retry | 실패 직후/respawn | stale VFX/적/marker 없음 |

저장 경로: `qa-captures/<date>/<viewport>/<capture-id>.png`. capture metadata에 commit/worktree 상태, viewport, DPR, stage x, player HP, active enemy/projectile count, console error count를 기록한다.

## 시각 QA 체크리스트

- canvas 중앙/비율 유지, letterbox가 입력 좌표와 일치.
- HUD, pause, score, ammo, HP, boss/escort meter가 safe area 안에 있음.
- 터치 joystick/shoot/jump/grenade가 서로·게임 필수 HUD와 겹치지 않음.
- 플레이어 얼굴/무기 및 적 4종 실루엣이 모바일에서 읽힘.
- 스프라이트 방향이 이동·사격 방향과 일치.
- 프레임 전환 중 baseline 흔들림/미끄러짐 없음.
- body/weapon 잘림, chroma residue, gray box, black box, alpha hole 없음.
- 보스/차량 파츠 연결부가 비거나 뒤집히지 않음.
- far/mid/near/world/entity/VFX/UI z-order 정상.
- near layer와 폭발이 적탄·경고·약점을 가리지 않음.
- UI image 안에 AI 생성 글자/워터마크/중복 아이콘 없음.
- 정비율 버튼과 9-slice 패널이 늘어나지 않음.
- 디버그 rect, 브라우저/OS overlay, reticle 잔상 없음.

## 오디오 QA

1. 최초 사용자 gesture 전 autoplay 오류 없음.
2. Home/Stage/Boss/Result music이 동시에 2개 재생되지 않음.
3. pause, tab background, Home 전환 때 music과 engine/ambience loop 정지.
4. resume 시 scene에 유효한 loop만 한 번 복원.
5. rifle voice limit로 clipping/과포화 없음.
6. boss telegraph, vehicle critical, player hurt가 BGM 위에서 들림.
7. 설정 volume 0 및 복구, 저장/재실행 정상.

## Lifecycle/회귀 테스트

매 defect 수정 후 원래 repro와 다음 공통 시퀀스를 수행한다.

```text
Home → Game → 30초 사격 → Pause/Resume 3회 → player death
→ checkpoint retry → escort fail → retry → mini boss → Home
→ Game restart → final boss phase transition → Result → retry
```

각 전환 후 확인:

- console/page/unhandled rejection/missing asset 오류 0
- inactive entity collider/score 0
- 활성 timer/tween/listener가 baseline으로 복귀
- held input 0
- audio loop 중복 0
- 보스 marker/탄환/약점 stale state 0

## 성능 테스트

- 10분 soak: active enemy 18, projectile budget 근접, 폭발 8+ 동시.
- frame time p95 ≤ 20ms 목표, 1초 이상 지속되는 45FPS 미만 구간 0.
- JS heap가 warm-up 이후 지속 우상향하지 않음.
- restart 10회 후 pool/listener 수가 최초 run 대비 증가하지 않음.
- stage 첫 진입 3초 이하, 초기 runtime asset 150MB 이하 목표.
- lowFx에서 파편/연기 45%, 경고 marker 100% 유지.

## 프로덕션 완료 체크

- [x] 5개 핵심 문서 존재
- [x] `asset-manifest.json` production-demo/isolation/provenance 충족
- [x] 캔버스 이상 배경 3개 이상
- [x] 게임 전용 player/enemy/vehicle/boss/UI/audio 에셋
- [x] GDD 필수 기능 F-01~F-18 구현 및 핵심 완주 흐름 검증
- [x] 필수 상태 대표 캡처 및 4개 viewport 자동 캡처 검수
- [x] build와 모든 production gate 통과
- [x] console/runtime/missing asset 치명 오류 0
- [x] 캡처 후 발견 결함 수정 및 동일 조건 재검증
- [x] `docs/06-FINAL-QA-SUMMARY.md`에 명령 결과·캡처·수정 기록
- [x] `docs/07-REGRESSION-CHECKLIST.md`에 발견 defect repro 보존

추가로 600초 soak와 Game↔Result 10회 재시작 회귀를 통과했다. 실기기 Safari/Android 오디오·발열 및 사람 기준 median clear time은 배포 후보 단계의 별도 검증 범위다.

하나라도 증거가 없거나 간접적이면 완료가 아니라 `production-demo 미통과`로 기록한다.
