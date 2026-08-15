# 03 · Asset & Audio Plan — Night Market Wok

## 격리 원칙

모든 런타임 자산은 이 게임 전용으로 새로 생성되며 `dev_game/generated/night-market-wok/assets/**` 안에만 존재한다. 루트·공용 자산 참조, 심링크, 타 게임 자산 재사용은 금지다. manifest는 `assetIsolation.mode: "per-game"`, `generatedFor: "night-market-wok"`, `noSharedRuntimeAssets: true`를 선언한다.

## 생성 경로

Path A(자동) — `asset-plan.json` → `factory:imagegen` → `codex exec` 내장 image_gen. 이 세션의 호스트는 이미지 생성 능력이 없으므로 shell-out 어댑터로 동작했다. provenance는 스크립트가 기록한다(`method: codex-gpt-imagegen-skill`, `sourceSkill: imagegen`, `promptHash`).

해상도 규격과 declared resample은 [production-demo-quality-contract §2.0.5](../../../docs/production-demo-quality-contract.md#205-공통-고해상도-에셋-규격--authoritative-source)를 따른다. 이 문서는 숫자를 복제하지 않는다.

## 자산 목록 (20개)

| 그룹 | id | role | 용도 |
|---|---|---|---|
| 배경 3 | stage-1..3 | stage-background | 서빙 수에 따라 크로스페이드되는 야시장 시간대 |
| 캐릭터 | player | player | 요리사 4프레임 시트 — 조리 성공 시 1회 재생 |
| 손님 3 | cust-regular / hurried / grumpy | target | 좌석에 앉는 서빙 대상. 실루엣·색으로 구분 |
| 재료 5 | ing-noodle / broth / scallion / pork / egg | item | 하단 버튼 아이콘 + 티켓 단계 아이콘 겸용 |
| 완성품 | collectible | collectible | 서빙 시 손님에게 날아가는 국수 그릇 |
| 실패 | hazard | hazard | 오조작 시 웍에서 터지는 탄 웍 버스트 |
| UI 3 | btn-frame / btn-pause / order-ticket | ui-icon, ui-panel | 버튼과 주문 티켓 패널 |
| FX 3 | fx-hit / fx-collect / fx-combo | feedback | 오조작 / 단계 성공 / 서빙 완료 |

**티켓 패널 규칙:** 내부는 완전히 비어 있어야 한다. 요리명·단계 수·재료 아이콘은 전부 런타임에 그린다. 이미지에 글자를 굽지 않는다.

## 오디오

| 트리거 | 파일 | 상태 규칙 |
|---|---|---|
| 게임플레이 BGM | `audio/game_loop.wav` | 게임 씬에서만 재생. 일시정지·홈 이동·백그라운드 전환 시 정지 |
| 단계 성공 | `audio/collect.wav` (0.3) | 짧게, 연타 시 겹치지 않게 낮은 볼륨 |
| 서빙 완료 | `audio/collect.wav` (0.6) | 단계 성공과 볼륨으로 구분 |
| 오조작 | `audio/hit.wav` (0.5) | 화면 흔들림과 동기 |
| 손님 이탈 | `audio/hit.wav` (0.55) | 플래시와 동기 |
| 종료 | `audio/game_over.wav` | BGM 정지 후 재생 |

BGM 핸들은 `AudioManager` 단일 인스턴스만 사용한다(씬 재진입 시 중복 재생 금지).
