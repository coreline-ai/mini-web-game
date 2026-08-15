# 02-TECH-DESIGN — Keeper of the Last Light

## 씬 구성

| 씬 | 역할 |
|---|---|
| Boot | Phaser 부팅 |
| Loading | 런타임 WebP·오디오 로드, 로드 실패를 `window.__KEEPER_ASSET_ERRORS__`에 남김 |
| Home | 첫 플레이 5요소 선언, 코드표 열람, 사운드 토글, 최고 점수 |
| Game | 커스텀 루프 전부 |
| Pause | 일시정지 + 도움말(같은 오버레이, `data.help`로 분기) |
| GameOver | 승/패 터미널, 점수·인도 척수·도달 스테이지·난파 수 |

## 좌표계 — 디자인 단위와 논리 캔버스

논리 캔버스는 **1170×2532**로 390×844의 정수배(×3)다. Phaser 3.60+에는 `resolution` 옵션이 없어 논리 캔버스가 그대로 백킹 스토어이므로, 논리 캔버스를 CSS 크기와 같게 두면 게임 전체가 1x로 그려진 뒤 브라우저가 확대한다 — 어떤 고해상도 에셋을 써도 흐릿해진다.

`src/game/config/theme.js`의 `U = SPEC.canvas.width / 390`과 `px(n)`/`font(n)`이 단일 원본이며, 화면 안의 **모든 절대 픽셀값**은 이 함수를 거친다. `visual-layout-qa`의 backingScale assert가 이 계약을 검사한다.

## 시스템

| 파일 | 책임 |
|---|---|
| `config/keeperConfig.js` | **Rules Contract 단일 원본** — 코드표, 스테이지 계약, 판정 임계, 점수 |
| `config/theme.js` | 디자인 단위 스케일, §2.0.25 버튼 토큰, 테마 파생 팔레트 |
| `systems/SignalCodec.js` | 기호↔코드 번역, 접두사 기반 판정(`pending`/`complete`/`wrong`) |
| `systems/PatternInput.js` | 누름 길이 → 펄스, 멀티터치 차단, 유휴 리셋, 전환 중 잠금 |
| `entities/Ship.js` | 등장→대기→항로/난파 생명주기, 인내심 게이지, 상태 스냅샷 |
| `systems/ShipRouting.js` | 고정 풀(6), 등장 스케줄, 동시 대기 상한, 인내심 소진 감시 |
| `systems/StageDirector.js` | 스테이지 진행, 쿼타 판정, 승리 터미널 |
| `systems/AudioManager.js` | BGM 단일 핸들, SFX, mute 전역 상태 |
| `systems/LayoutRegistry.js` | `window.__GAME_LAYOUT_BOUNDS__` 공표 |
| `systems/SaveData.js` | 설정·최고 점수 저장(손상 시 기본값 복구) |

## 판정 흐름

```
pointerdown → PatternInput.beginPress()   (멀티터치면 거부)
pointerup   → endPress() → 누름 길이 ≥ longPressMs ? 'l' : 's'
            → buffer.push(pulse) → GameScene.onPulse()
            → focusShip() = 인내심이 가장 적게 남은 대기 배
            → SignalCodec.judge(buffer, ship.expectedCode())
                 'pending'  → 계속 입력
                 'complete' → resolveShip(성공)
                 'wrong'    → resolveShip(실패, 인내심 45% 즉시 차감)
```

접두사가 깨지는 순간 `wrong`을 내는 것이 중요하다. 코드 길이가 찰 때까지 기다리면 플레이어가 틀린 걸 모른 채 남은 펄스를 헛되이 넣는다.

## 생명주기 규약 (결함 클래스 A)

- 상태 전이는 **트윈 `onComplete` 안에서만** 일어난다. 도착 트윈이 끝나기 전에는 `WAITING`이 되지 않고, 퇴장 트윈이 끝나기 전에는 `RETIRED`가 되지 않는다.
- 재사용 시 `killTweensOf` + 알파/각도/스케일/가시성 전체 리셋.
- `RETIRED` 배는 `focusShip()`·판정·점수에서 완전히 제외된다.
- 고정 풀(6개)이라 리트라이를 반복해도 오브젝트가 누적되지 않는다(결함 클래스 K).

## 시각 소유권 (결함 클래스 B)

| 대상 | 소유 |
|---|---|
| 등대 탑, 암초, 바다, 날씨 | **배경 이미지** |
| 배, 인내심 게이지, 요청 기호 | **런타임 스프라이트** |
| 광선 펄스, 성공 링, 난파 섬광, 물보라 | **런타임 FX** |

배경 프롬프트에 "No ships, no boats"를 명시해 배가 배경에 구워지는 것을 원천 차단했다.

## 난이도 축 (결함 클래스 D)

`StageDirector`는 스테이지 인덱스와 `elapsedMs`만 참조한다. 남은 인내심·점수·콤보는 난이도 계산에 절대 들어가지 않는다 — 들어가면 잘할수록 쉬워지는 역주행이 생긴다.

## 상태 흐름

```
Boot → Loading → Home ─PLAY→ Game ⇄ Pause(일시정지/도움말)
                                 ├─ 쿼타 달성 ×5 → GameOver(win)
                                 └─ 난파 3회    → GameOver(loss)
                          GameOver ─RETRY→ Game (스테이지 1부터 완전 초기화)
                                   └─HOME→ Home
```

## QA 훅

`GameScene.qaSnapshot()`이 점수·콤보·난파·스테이지·풀 상태·입력 버퍼·활성 트윈/타이머·오디오 스냅샷을 반환한다. 캡처 어댑터가 이것을 상태 샘플 JSON으로 기록한다.
