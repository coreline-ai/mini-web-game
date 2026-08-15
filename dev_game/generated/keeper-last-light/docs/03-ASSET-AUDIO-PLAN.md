# 03-ASSET-AUDIO-PLAN — Keeper of the Last Light

모든 런타임 에셋은 **이 게임을 위해 새로 생성**되었고 프로젝트 안에 자족적으로 들어 있다.
공유·복사·심볼릭 링크 에셋은 없다(`assetIsolation.mode: per-game`).

## 취득 경로 — Path A

`asset-plan.json` → `factory:imagegen`(codex exec → built-in image_gen) → 검증·재시도 →
크로마 제거·3px 침식·자홍 중화 → 런타임 WebP 수출 → **생성 영수증 발급**.

영수증(`provenance.outputSha256` + `runId` + `generatedAt`)은 파이프라인이 자동으로 붙이며,
게이트가 파일을 다시 해시해 대조한다. 이 게임은 저장소에서 **영수증을 가진 첫 게임**이다.

## 이미지 에셋

| 그룹 | id | 역할 | 소유 |
|---|---|---|---|
| 배경 | `stage-1`…`stage-5` | 스테이지 날씨(맑음→옅은 안개→짙은 안개→폭풍→여명) | 등대·암초·바다 |
| 스프라이트 | `ship-cargo` / `ship-fishing` / `ship-ferry` | 인도 대상 선박 3종 | 런타임 |
| 스프라이트 | `ship-wreck` | 난파 연출용 교체 텍스처 | 런타임 |
| UI | `btn-lamp` | 신호 램프(주 입력 대상) | UI |
| UI | `btn-pause` | 일시정지 아이콘 | UI |
| UI | `panel-code` | 신호 코드 패널 판 | UI |
| FX | `fx-beam-pulse` | 램프 발광 | 런타임 FX |
| FX | `fx-route-ring` | 인도 성공 링(따뜻한 호박색) | 런타임 FX |
| FX | `fx-wreck-flash` | 오답·충격(차가운 강청색 — 성공과 색으로 구분) | 런타임 FX |
| FX | `fx-sea-spray` | 난파 물보라 | 런타임 FX |

성공과 실패 FX의 **색 계열을 반대로** 잡은 것은 의도적이다. 형태가 아니라 색만으로도
결과를 구분할 수 있어야 작은 화면에서 읽힌다.

## 시트 정책

다프레임 스프라이트 시트는 **쓰지 않는다**. image_gen이 구조적으로 가장 자주 실패하는
주문(셀 경계 잘림)이라 계약이 단일 스프라이트를 기본값으로 정했고, 이 게임의 배는
트윈으로 움직이므로 시트가 필요 없다.

## 배경 규약

- 프롬프트에 `No ships, no boats`를 명시해 시각 소유권 이중화를 원천 차단(결함 클래스 B)
- 중앙 플레이 영역은 저디테일, 디테일은 외곽에 집중
- 한글·점수·버튼 문구는 이미지에 굽지 않는다
- 네이티브 출력이 제작 규격에 못 미치면 §2.0.5 Declared Resample 규칙에 따라
  원본을 `assets/_source/`에 보존하고 `nativeSize`를 기록한 뒤 리샘플

## 오디오

절차적 WAV로 생성하며(외부 서비스 없음), 전부 이 게임 전용이다.

| 파일 | 트리거 | 설계 의도 |
|---|---|---|
| `pulse-short.wav` | 단점 입력 | 맑은 종 계열 |
| `pulse-long.wav` | 장점 입력 | **단점과 같은 음색을 길게** — 같은 램프로 들려야 한다 |
| `route-accepted.wav` | 인도 성공 | 상승 3음 |
| `wreck.wav` | 오답·난파 | 저역 충격 + 노이즈 |
| `stage-clear.wav` | 스테이지 통과 | 무적 2회(등대 정체성) |
| `home-loop.wav` | 홈 BGM | 파도 + 낮은 무적 페달 |
| `gameplay-loop.wav` | 게임 BGM | 같은 바다에 맥박 추가 |

## 오디오 상태 규약 (결함 클래스 H)

- BGM 핸들은 전역 하나. 같은 키가 재생 중이면 재생성하지 않는다.
- 일시정지·도움말에서 `pauseMusic()`, 복귀에서 `resumeMusic()`.
- 홈 이동·게임 종료에서 `stopMusic()`.
- mute는 저장되는 전역 상태이며 SFX에도 적용된다.
