# Common Game Systems Checklist — Reusable Starter Features

> 목적: 신규 게임을 만들 때 장르와 상관없이 반복해서 들어가는 공통 기능을 빠뜨리지 않기 위한 체크리스트다. 이 문서는 `Game Production Template`의 Foundation 구현 단계에 포함한다.

## 1. 공통 씬/화면

| 필수도 | 화면/씬 | 역할 | 완료 기준 |
|---|---|---|---|
| P0 | Boot / Preload | 엔진 초기화, 에셋 로딩, 폰트/오디오 unlock 준비 | 진행률 표시, 로딩 실패 fallback, 다음 씬 전환 |
| P0 | First Loading Screen | 사용자가 “멈춤”으로 느끼지 않게 현재 로딩 상태 표시 | 로고, progress bar, percent/text, 팁 1개 이상 |
| P0 | Title / Home | 게임 시작 진입점 | Play, Shop/Ranking/Settings 진입 가능 |
| P0 | Gameplay | 핵심 루프 실행 | 입력, 충돌, 점수, 게임오버 동작 |
| P0 | Pause | 일시정지/재개 | 게임 시간·음악·스폰 정지, Resume/Home 가능 |
| P0 | Game Over / Result | 점수 정산과 재시작 | Score/Best/Coin/Retry/Home 표시 |
| P1 | Tutorial / First Run Help | 첫 플레이 조작 안내 | 3초 이내 이해, 다시 보지 않기 저장 |
| P1 | Settings | 음소거/진동/품질/데이터 초기화 | 설정 저장, 게임 중 즉시 반영 |
| P1 | Shop / Collection | 스킨/배경/아이템 해금 | 보유/가격/선택 상태 표시 |
| P1 | Ranking / Records | 최고 기록/최근 기록 | local 또는 backend 기록 표시 |
| P2 | Daily Mission / Achievement | 복귀 동기 | 진행률, 보상 수령, 일일 리셋 |
| P2 | Notice / Event | 운영 공지/시즌 | remote config 또는 local manifest 대응 |

## 2. 공통 시스템 모듈

| 필수도 | 시스템 | 포함 기능 | QA 포인트 |
|---|---|---|---|
| P0 | Asset Loader | 이미지/오디오/폰트 preload, manifest 기반 로딩 | 누락 asset key 감지, 로딩 실패 처리 |
| P0 | Scene State Manager | Boot/Home/Game/Pause/GameOver 흐름 | 중복 씬 launch, pause/resume 꼬임 없음 |
| P0 | Input Manager | 터치/마우스/키보드 입력 정규화 | 한 손 조작, HUD 오터치 방지 |
| P0 | Save Data | best, coins, owned items, settings 저장 | localStorage 예외/깨진 JSON 복구 |
| P0 | Audio Manager | BGM/SFX/UI, mute, pause/resume | 홈/일시정지/백그라운드에서 음악 정지 |
| P0 | Object Pool | 적/투사체/코인/이펙트 재사용 | 장시간 플레이 메모리 증가 없음 |
| P0 | Score Manager | 점수, 콤보, 보너스, 최고점 | 공식과 표시값 일치 |
| P1 | Economy Manager | 코인, 구매, 보상, 이어하기 비용 | 중복 지급/음수 코인 방지 |
| P1 | Difficulty Manager | 시간/점수/스테이지 기반 난이도 | 30초/60초/120초 곡선 검증 |
| P1 | Effects Manager | 파티클, 화면 흔들림, 플래시, 텍스트 | 과도한 플래시/성능 저하 없음 |
| P1 | Haptic Manager | 진동 피드백 | 지원 기기만 호출, 설정으로 끄기 가능 |
| P1 | Analytics Hooks | 세션 길이, 사망 원인, 재시작률 | 개인정보 없이 이벤트만 수집 |
| P2 | Remote Config | 밸런스/공지/이벤트 설정 | 오프라인 fallback |
| P2 | Ad/IAP Adapter | 광고, 이어하기, 상품 구매 | 실패/취소/중복 지급 방지 |

## 3. 첫 로딩 화면 표준

### 3.1 필수 구성

| 요소 | 기준 |
|---|---|
| 로고/게임명 | 첫 0.5초 안에 표시 |
| 진행률 바 | 실제 preload progress와 연결 |
| 퍼센트 텍스트 | 0~100% 또는 `Loading assets...` 표시 |
| 로딩 팁 | 조작/목표/보상 팁을 2~5개 랜덤 표시 |
| 움직임 | 작은 캐릭터/아이콘/점 애니메이션으로 정지감 제거 |
| 실패 처리 | 10~15초 이상 로딩 실패 시 Retry 안내 |

### 3.2 로딩 QA

| 테스트 | 통과 기준 |
|---|---|
| 느린 네트워크 | 진행률이 갱신되고 멈춤처럼 보이지 않음 |
| 누락 에셋 | 콘솔 에러만 나지 않고 fallback 화면 또는 명확한 메시지 표시 |
| 첫 오디오 unlock | 사용자 입력 후 오디오가 정상 재생됨 |
| 모바일 세로 화면 | 로고/바/팁이 노치/하단바에 겹치지 않음 |
| 재진입 | 홈→게임→홈 반복 시 preload가 중복 폭주하지 않음 |

## 4. 신규 게임 Foundation 완료 기준

P0 Foundation은 아래가 모두 되어야 “구현 시작 가능”으로 본다.

- [ ] Boot/Loading/Home/Game/Pause/GameOver 씬 존재
- [ ] 에셋 manifest 기반 preload
- [ ] 로딩 진행률 UI
- [ ] SFX 1개 이상 + BGM 1개 이상 로딩
- [ ] mute/pause/background 오디오 제어
- [ ] 저장소 wrapper
- [ ] 공통 버튼/패널 UI kit
- [ ] 기준 해상도와 safe area 규칙
- [ ] `npm run build` 또는 엔진별 build 통과
- [ ] `npm run smoke`로 구조/필수 파일/순환 import/`--no-sfx` 검증 통과
- [ ] `npm run asset-qa`로 이미지·오디오 자동 QA 통과
- [ ] `npm run browser-smoke`로 실제 브라우저 canvas 렌더/PLAY 진입 통과
- [ ] 로딩/홈/게임/게임오버 smoke flow 통과

## 5. 자동 QA 스크립트 표준

| 명령 | 자동 확인 항목 | 실패 예시 |
|---|---|---|
| `npm run smoke` | 생성 파일 목록, Phaser import, config 순환 import 방지, normal/`--no-sfx` 출력, force 삭제 안전성, invalid spec 실패 경로 | Scene이 `Phaser.Scene`을 쓰지만 import 없음 |
| `npm run asset-qa` | manifest 파일 존재, SVG viewBox/외부 리소스/스크립트, sprite 용량, WAV duration/peak/silence, audio disabled 일관성 | `--no-sfx`인데 WAV가 생성됨 |
| `npm run browser-smoke` | generated app install/build/preview, 모바일 viewport canvas 생성, PLAY 클릭 후 console/page error 없음 | 순환 import로 canvas가 안 뜸 |
| `npm run qa` | 위 검증 전체 실행 | 릴리즈 전 통합 게이트 실패 |

문서 기준은 사람이 확인할 항목을 정의하고, 위 스크립트는 반복 가능한 최소 자동 검증을 담당한다. 둘 중 하나만 있으면 부족하며, 신규 게임 템플릿에는 둘 다 포함한다.
