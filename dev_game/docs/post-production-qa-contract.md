# Post-Production QA Contract — 후보정 공통 결함 클래스와 강제 규칙

> 게임은 한 번에 완성되지 않는다. 빌드/게이트를 통과한 뒤에도 실제 플레이 캡처에서 반드시 결함이 나온다.
> 이 문서는 여러 게임에서 반복 관측된 결함을 **게임 종류와 무관한 결함 클래스**로 일반화하고,
> 각 클래스의 증상 시그니처 → 원인 패턴 → 수정 규칙 → 기계 검증 방법을 강제 계약으로 정의한다.

## 0. 비협상 원칙

```text
"눈으로 봤을 때 괜찮음" is not evidence.
A defect found in capture is fixed and re-captured, never downgraded to a known gap.
Every visible shape in a final capture must have a declared identity.
```

- 캡처/영상에서 발견된 결함은 수정 → **결함이 재현되던 동일 조건에서** 재캡처 → 게이트 재실행까지 완료해야 닫힌다.
- 결함과 무관한 경로의 통과 캡처를 수정 증거로 사용하는 것을 금지한다.
- 사용자의 자연어 지적은 아래 결함 클래스로 번역해 기록하고, 다음 게임의 사전 점검 항목으로 승격한다.

## 1. 자연어 증상 → 결함 클래스 번역표

| 사용자 표현 (예시) | 결함 클래스 |
|---|---|
| "한 번만 나오고 다시 안 나와", "어느 순간부터 안 보여" | A. Entity Lifecycle Race |
| "이미지가 2개로 겹쳐 보여", "움직이는데 뒤에 하나 더 있어" | B. Visual Singularity 위반 |
| "이 네모/라인은 뭐야?", "조준선이 타깃 같아" | C. UI–Gameplay 시각 분리 실패 |
| "게임이 갈수록 안 어려워져", "잘할수록 쉬워져" | D. Difficulty Axis 종속 |
| "끝이 없어", "다음 스테이지 조건이 뭐야?", "보상이 뭐야?" | E. Progression/Terminal 불완결 |
| "아까는 됐는데 지금 또 그래" | F. 증거 부재 (회귀 검출 불가) |
| "음악이 겹쳐 들려", "pause인데 소리가 나", "소리가 아예 안 나" | H. Audio State 위반 |
| "버튼이 눌린 채로 있어", "두 번 누르면 이상해져", "연타하면 꼬여" | I. Input Robustness 위반 |
| "새로고침하니 기록이 사라졌어", "탭 갔다 오니 게임이 망가져" | J. Persistence/Session 불연속 |
| "오래 하면 느려져", "리트라이 반복하면 버벅여" | K. Long-Run 불안정 |
| "에셋이 저화질이야", "화면이 흐릿해", "프로토타입 UI처럼 보여" | L. Asset Fidelity 위반 |

번역 결과는 해당 게임의 `docs/06-FINAL-QA-SUMMARY.md`에 남긴다.

## 2. 결함 클래스별 강제 규칙

### A. Entity Lifecycle Contract — tween/respawn 경쟁 조건

**문제 클래스**: 비동기 연출(tween/timer)과 엔티티 재활용(respawn/pool reuse)의 경쟁 조건.

**증상 시그니처** (하나라도 보이면 이 클래스 의심):

- 엔티티가 처음 한 번만 나오고 다시 안 나옴
- 내부 상태는 active인데 화면에 안 보임 (보이지 않는 것이 점수/충돌에 계속 반응)
- 재등장 엔티티가 반투명하거나 크기/회전이 이전 상태에 오염됨
- 빠른 연속 히트에서만 재현되고 천천히 플레이하면 정상 (타이밍 의존 = 경쟁 조건 확정 신호)

**원인 패턴**: 소멸 연출 tween(fade-out N ms)과 respawn 타이머(M ms)가 독립적으로 스케줄되어,
M < N일 때 reset(`alpha:1`) 직후 살아있던 이전 tween이 마지막 프레임(`alpha:0`)을 덮어씀.

**수정 규칙**:

1. **순서 보장**: respawn/재활성화는 소멸 tween의 `onComplete` 이후에만 스케줄한다. 두 타이머를 병렬로 돌리지 않는다.
2. **Reset 시 정화**: 재활용 직전 `killTweensOf(entity)`로 해당 엔티티 대상 tween을 전부 제거하고 관련 delayed call/timer를 취소한 뒤,
   `alpha / visible / active / scale / angle / body(enable, velocity)`를 명시적 기본값으로 복원한다.
   생성 시 초기값에 의존하지 말고 reset 함수가 전체 시각+물리 상태를 소유한다.
3. **판정 가드**: `visible === false || active === false || alpha < 임계값`인 엔티티는 점수·충돌·입력 판정에서 제외한다.
4. **상태 전환 일괄 정리**: 스테이지 전환·pause·게임오버·retry 시 풀 전체의 stale tween/timer를 일괄 정리한다.

**기계 검증**:

- 자동 플레이로 연속 10회 이상 히트-리스폰 사이클 후 매 사이클 대상 엔티티의
  `alpha === 1 && visible === true && active === true`를 JSON 샘플로 기록·assert.
- 소멸 연출 시간보다 짧은 간격의 연타 입력을 의도적으로 주입해 경쟁 조건을 유발해 본다.

### B. Visual Singularity Contract — 논리 엔티티 1개 = visible 스프라이트 1개

**문제 클래스**: 배경 아트에 구워진(baked) 요소와 런타임 스프라이트의 중복 표현.

**증상 시그니처**:

- 플레이어/포탑/발사대가 2개로 겹쳐 보임
- 런타임 엔티티가 움직일 때 배경에 고정된 유령 복제본이 남음
- 배경의 장식 요소(그려진 과녁, 차량 등)가 실제 게임플레이 엔티티와 혼동됨

**원인 패턴**: AI 생성 배경이 장면 전체를 그리면서 게임플레이 주체까지 포함 → 그 위에 런타임 스프라이트를 또 올림.

**수정 규칙**:

1. **소유권 결정**: 시각 요소마다 배경 소유(정적) / 런타임 소유(동적) 중 하나만 선택한다. 둘 다 갖지 않는다.
2. **분리 구조**: 정적 본체는 배경에 두고 동적인 부분만 소형 런타임 FX로 분리한다 (예: 배경 캐논 + 런타임 muzzle flash). 겹침 문제의 표준 해법.
3. **프롬프트 단계 예방**: 배경 imagegen 프롬프트에 게임플레이 엔티티(플레이어·타깃·적) 배제를 명시하거나,
   포함시킬 경우 런타임 스프라이트를 만들지 않는다는 결정을 `03-ASSET-AUDIO-PLAN.md`에 기록한다.
4. **유사 형상 완화**: 배경에 게임플레이 엔티티와 유사한 형상이 있으면 런타임 엔티티에 외곽선·글로우·스케일 차이 등
   구분 신호를 부여하거나 배경을 재생성한다.

**기계 검증**:

- 캡처 상태 샘플에 논리 엔티티당 visible 스프라이트 수를 기록하고 `duplicateVisibleEntities: 0`을 assert.
- 대표 게임플레이 프레임에서 주요 엔티티의 텍스처 키 목록을 덤프해 의도된 키와 대조.

### C. UI–Gameplay 시각 분리 계약

**문제 클래스**: 조준선·커서·디버그 도형이 게임플레이 오브젝트로 오인됨.

**증상 시그니처**:

- 조준 UI(crosshair)가 타깃/해저드와 같은 시각 언어(두꺼운 링, 채워진 원)를 사용
- 사용자가 화면 요소의 정체를 물어봄 ("이 네모 라인은 뭐야?") — 시각 언어 실패의 직접 신호
- 이전 발사/피격/결과 그래픽이 다음 상태까지 잔존

**수정 규칙**:

1. **조준/커서 UI는 게임 오브젝트와 다른 시각 언어**: 얇은 선, 낮은 채도, hollow, 뚜렷한 스타일 차이.
   게임 오브젝트처럼 렌더링된 조준 PNG는 얇은 벡터형 reticle로 교체한다.
2. **모든 사각형/스트로크의 정체 분류**: 최종 캡처에 보이는 모든 외곽선·박스를
   ① 의도된 렌더 요소(playfield 경계 등 — 유지하되 역할을 GDD에 기록)
   ② 디버그 잔재(physics debug, bounds 표시 — 무조건 제거)
   로 분류한다. **분류되지 않은 도형이 하나라도 있으면 미통과.**
3. **일시 그래픽 수명 관리**: 발사/임팩트/콤보 팝업 등 일시 FX는 명시적 수명 + 상태 전환 시 강제 정리. 다음 씬/스테이지/리트라이 잔존 금지.
4. **결과 스탬프 단일성**: PERFECT/MISS 등 피드백 스탬프는 항상 최신 1개만 표시하고 이전 스탬프는 새 스탬프 전에 제거한다.

**기계 검증**:

- 상태 샘플에 `lingeringShotGraphics: 0`, `staleResultStamps: 0` 기록.
- 조준 UI의 활성 텍스처 키를 덤프해 UI 전용 키(예: `reticle_ui`)인지 assert — 게임 오브젝트용 텍스처의 UI 재사용을 차단.

### D. Difficulty Axis Independence — 난이도 축 독립성

**문제 클래스**: 난이도 스케일링 변수가 플레이어가 되돌릴 수 있는 리소스에 종속됨.

**증상 시그니처**:

- 잘하는 플레이어일수록 게임이 안 어려워짐 (히트 보너스로 시간이 늘면 `timeLeft` 기반 난이도가 후퇴/정체)
- 난이도 곡선이 플레이 실력과 무관하게 요동침

**수정 규칙**:

1. 난이도 입력은 **단조 증가(monotonic) 변수만** 사용: `elapsedSeconds`, 누적 진행 카운터(hits/waves/distance), `stageIndex/stageBonus`.
2. 보상(시간 추가, 생명 회복)이 난이도 입력을 되돌리지 않는지 설계 단계에서 확인한다.
   불변식: **보상이 플레이를 연장해도 압박은 계속 상승한다.**
3. 복합식 권장: `difficulty = base(elapsed) + progress(hits) + stageBonus` — 시간·실력·진행 세 축이 모두 상승 압력에 기여.
4. `02-TECH-DESIGN.md`에 난이도 함수의 입력 변수와 각 변수의 단조성 여부를 명시한다.

**기계 검증**:

- 자동 플레이 로그에서 시간순 난이도 파라미터(스폰 간격, 이동 속도 등)를 샘플링해 **non-decreasing**인지 assert.
- 특히 보상 발동 직후 프레임에서 난이도가 하락하지 않는지 확인.

### E. Progression & Terminal State Completeness — 진행·종료 완결성

**문제 클래스**: 스테이지 구조·종료 조건·보상이 암묵적이거나 한쪽 결말만 존재.

**수정 규칙**:

1. **스테이지 계약 명시**: 각 스테이지마다 (목표 임계값, 달성 보상, 다음 상태) 3요소를 config 데이터로 선언한다. 코드에 흩어진 매직 넘버 금지.
2. **양방향 터미널 상태 필수**: 실패 종료(타이머/생명 소진 → GAME OVER)와 승리 종료(최종 스테이지 목표 달성 → ALL CLEAR)가
   둘 다 구현·도달 가능해야 한다. 실패 종료만 있는 무한 게임은 GDD에 명시적 설계 결정으로 기록된 경우에만 허용.
3. **보상 계층 구분**: 런 단위 보상(점수/시간/콤보)과 영구 경제(상점/업그레이드)를 구분하고 MVP 범위를 GDD와 완료 보고에 명시한다.
   범위 밖 항목은 known gap이 아니라 **scoped-out**으로 분류한다.
4. **옵션 최소 세트**: Home(사운드 토글), Pause(RESUME/HOME), GameOver(RETRY/HOME)는 프로덕션 데모의 최소 옵션 계약이다.

**기계 검증**:

- 모든 스테이지 전환 프레임 + 두 터미널 상태 프레임을 캡처 매트릭스에 포함. 도달 스테이지를 상태 샘플에 수치로 기록.
- 스테이지 전환 시 보상 적용(점수/시간 가산)이 실제 상태 변화로 확인되는지 전환 전후 샘플 비교.

### F. Machine-Assertable Evidence — 기계 검증 가능한 증거 계약

**문제 클래스**: "눈으로 봤을 때 괜찮음"은 재현 불가능하고 회귀 검출이 안 됨.

**수정 규칙**:

1. 캡처 세션마다 **상태 샘플 JSON**을 함께 저장한다 (`qa-captures/**/*-samples.json`). 최소 필드:
   - `browserErrors / pageErrors / unhandledRejections: 0`
   - `duplicateVisibleEntities: 0` (논리 엔티티별)
   - `lingeringTransientGraphics: 0`
   - 핵심 UI 요소의 활성 텍스처 키 (의도 키와 대조)
   - 도달 최고 스테이지, 도달한 터미널 상태 목록
   - 리스폰 사이클 후 엔티티 `alpha/visible/active` 값
2. 스크린샷·영상·contact sheet는 **JSON 샘플과 같은 세션에서** 생성한다 — 증거 간 시점 불일치 방지.
3. 수치 하나라도 실패하면 캡처 전체를 통과 증거로 사용 금지. 수정 → 재캡처 → 재샘플.

### G. Fix → Re-capture Loop — 재캡처 루프 규칙

1. 캡처/영상에서 발견된 GUI·레이어링·모션·애니메이션·생명주기·예외 문제는 수정 후 **반드시 재캡처 + 게이트 재실행**.
   known gap으로 강등해 완료 보고에 넣는 것을 금지한다.
2. **자연어 지적 → 결함 클래스 번역**(§1 번역표)을 `06-FINAL-QA-SUMMARY.md`에 기록하고, 반복 관측된 클래스는 이 문서에 승격한다.
3. 수정 후 검증은 **결함이 재현되던 조건(연타, 특정 스테이지, 특정 해상도)에서** 수행한다.
   결함과 무관한 경로의 통과를 증거로 쓰지 않는다.
4. **Before/after 증거 페어**: 수정 전에 결함이 보이는 기준 캡처(baseline)를 먼저 저장한다.
   "고쳐졌다"는 before/after 비교로만 증명된다. baseline 없이 after만 있는 수정 보고는 미완성이다.
5. **회귀 누적**: 닫힌 결함의 재현 시나리오(입력 패턴, 씬/스테이지, 뷰포트, assert 값)를
   `docs/07-REGRESSION-CHECKLIST.md`에 추가한다. 이후 모든 후보정 세션은 **시작 시 이 목록 전체를 재실행**해
   이전 수정이 되살아나지 않았는지 확인한 뒤 새 증상에 착수한다.
6. **심각도 트리아지**: 결함이 복수일 때 수정 순서는
   ① crash/예외/진행 불가 → ② 게임플레이 로직 오류(판정·점수·난이도·생명주기) → ③ 시각/레이아웃 → ④ 코스메틱.
   ①·②가 열려 있는 세션은 ③·④만 고치고 닫을 수 없다.

### H. Audio State Contract — 오디오 상태/중복 재생

**문제 클래스**: BGM/SFX의 상태 제어 실패와 인스턴스 중복.

**증상 시그니처**:

- home→game→home 반복 후 BGM이 겹쳐 들림 (재진입마다 새 인스턴스 생성)
- pause/home/백그라운드 탭 상태에서 gameplay 음악이 계속 재생됨
- 첫 터치 이후에도 무음 (오디오 unlock 실패)
- mute 설정이 씬 전환 후 풀림, SFX가 판정 이벤트와 어긋나게 발화

**원인 패턴**: 씬 재진입 시 기존 인스턴스 stop 없이 새 BGM 생성; `visibilitychange` 미처리;
mute/volume 상태가 전역 AudioManager가 아닌 씬 로컬에 존재.

**수정 규칙**:

1. BGM은 전역 싱글턴 핸들 1개로 관리한다. 씬 재진입 시 기존 인스턴스를 stop/reuse하고 절대 중복 생성하지 않는다.
2. gameplay BGM은 pause·home·백그라운드 3상태 모두에서 정지/일시정지된다 (`visibilitychange` 처리 포함).
3. mute/volume은 저장소 연동 전역 상태이며 모든 씬에서 즉시 반영된다.
4. SFX 트리거는 판정 이벤트와 1:1로 연결한다. 시각 피드백만 있고 소리가 없는(또는 그 반대) 판정을 금지한다.

**기계 검증**:

- 상태 샘플에 `activeBgmInstances`(항상 ≤ 1)와 씬별 `isPlaying` 상태 기록.
- home→game→home 3회 반복 후 BGM 인스턴스 수 assert.
- pause 진입/백그라운드 전환 시점의 재생 상태를 샘플로 남긴다.

### I. Input Robustness Contract — 입력 견고성/중복 트리거

**문제 클래스**: 연타·멀티터치·전환 중 입력에 의한 상태 붕괴.

**증상 시그니처**:

- pause 아이콘이 눌린 시각 상태로 고착됨
- RETRY/PLAY 더블탭으로 씬이 중복 launch되어 타이머/스폰이 2배로 돌아감
- 씬 전환 애니메이션 중 입력이 다음 씬으로 새어 들어감
- pause 오버레이 아래의 게임이 입력에 반응함, 멀티터치 시 조작이 꼬임

**원인 패턴**: 상태 전이 버튼에 one-shot 가드 없음; 씬 전환 시 이전 씬 입력 미차단;
`pointerdown`만 처리하고 `pointerup/out` 시각 복원 누락; 오버레이가 입력을 통과시킴.

**수정 규칙**:

1. 씬/상태 전이를 일으키는 버튼은 **1회 발화 후 즉시 disable** (one-shot guard). 전이 완료 또는 취소 시에만 재활성화.
2. 씬 전환 시작 시점에 이전 씬의 입력을 차단한다.
3. pause/모달 오버레이는 하부 게임플레이 입력을 완전히 차단한다.
4. 버튼 시각 상태(pressed)는 `pointerup`/`pointerout`에서 반드시 복원한다.
5. 멀티터치 정책을 명시한다 (첫 포인터 기준 등). 정책 없는 다중 포인터 처리 금지.

**기계 검증**:

- 자동화로 전이 버튼 더블/트리플 탭을 주입한 뒤 활성 씬 목록·씬 스택 수·중복 타이머 여부 assert.
- pause↔resume 10회 반복 후 timeScale·스폰 간격·버튼 시각 상태 확인.

### J. Persistence & Session Continuity — 지속성/세션 연속성

**문제 클래스**: 저장 데이터와 브라우저 세션 이벤트(reload/visibility/resize)에 대한 견고성 부재.

**증상 시그니처**:

- 리로드 후 best score/사운드 설정이 초기화됨
- 손상된 localStorage로 부팅이 실패하거나 흰 화면
- 탭을 백그라운드에 뒀다 돌아오면 타이머가 폭주(거대 delta)하거나 게임 상태가 붕괴
- 리사이즈/회전 시 레이아웃이 깨진 채 유지됨

**수정 규칙**:

1. 저장 wrapper는 깨진 JSON/누락 키를 기본값으로 복구한다. 저장 실패가 게임 진행을 막지 않는다.
2. best score·설정은 리로드 후 유지되어야 한다.
3. `visibilitychange` 시 자동 pause 또는 delta clamp로 시간 폭주를 차단한다.
4. resize/orientation 변경 시 safe-area와 레이아웃을 재계산한다.

**기계 검증**:

- 플레이→리로드→상태 샘플 비교로 best/설정 유지 assert.
- 손상 데이터 주입 후 정상 부팅 확인.
- visibility 토글 전후 `timeLeft`/게임 상태 연속성 assert.

### K. Long-Run Stability — 장시간 실행 안정성

**문제 클래스**: 리소스 누수로 인한 점진적 성능 저하. A 클래스(생명주기)의 만성형.

**증상 시그니처**:

- 플레이가 길어질수록 프레임이 떨어짐
- retry를 반복할수록 점점 느려지거나 이펙트가 중복됨
- 씬 재시작 후 이벤트가 2번씩 발화함

**원인 패턴**: 풀 미회수, 씬 재시작 시 이벤트 리스너/타이머 중복 등록, tween 누적, retry가 부분 리셋만 수행.

**수정 규칙**:

1. 씬 `shutdown`/`destroy`에서 리스너·타이머·tween을 전량 해제한다.
2. 오브젝트 풀은 상한을 갖고, 회수 실패를 탐지한다.
3. retry/스테이지 전환은 **완전한 상태 리셋**이다. 부분 리셋으로 누적을 허용하지 않는다.

**기계 검증**:

- 2분 이상 자동 플레이 + retry 5회 반복 중 `activeTweens`/타이머 수/displayList 크기/FPS를 주기 샘플링.
- 정상 상태 기준 대비 단조 증가(누수 신호)가 없는지 assert.

### L. Asset Fidelity Contract — 최종 화면 에셋 품질 / DPR 정합성

**문제 클래스**: 파일 단위 에셋은 존재하지만 최종 렌더 화면이 저해상도, 흐릿한 배경, 평면 런타임 사각형, 임시 UI 조합처럼 보이는 품질 불일치. 특히 논리 캔버스(`390x844` 등), 브라우저 CSS 크기, 실제 캔버스 backing store, 원본 이미지 픽셀, 디스플레이 DPR이 서로 맞지 않아 다운샘플링 후 다시 업스케일되는 구조.

**증상 시그니처**:

- 사용자가 "에셋이 저화질", "화면 퀄리티가 낮다", "프로토타입 같다"고 지적
- 해상도 게이트는 통과하지만 실제 캡처에서 배경이 뭉개지거나 UI가 평면 도형처럼 보임
- 전체 화면 상태(Loading/Home/Game/Pause/GameOver) 중 일부가 고화질 배경과 어울리지 않는 임시 패널/버튼만 사용
- 뉴스/카드/버튼 등 반복 UI가 고해상도 DPR 캡처에서 픽셀/압축/스케일링 결함을 보임
- 일부 HUD만 DOM으로 보정하고 뉴스/카드/버튼은 캔버스 텍스트나 저해상도 생성 텍스처로 남아 화면 품질이 섞여 보임
- 원본 배경은 커 보이지만 Phaser 내부에서 작은 논리 캔버스로 축소된 뒤 CSS로 다시 확대되어 전체가 흐려짐
- 버튼/사운드/일시정지 아이콘이 소스 알파 박스나 런타임 스케일 기준을 넘어서 잘림
- 몬스터/적/캐릭터가 원본 프레임보다 크게 표시되거나 비정수 스케일로 흔들려 선명도가 떨어짐

**수정 규칙**:

1. **화면 단위 기준**: 파일 해상도만 보지 말고 최종 캡처에서 Loading, Home, Game, Pause, GameOver의 화면 단위 품질을 판정한다.
2. **논리 캔버스와 물리 캔버스 분리**: 논리 캔버스는 좌표계일 뿐 품질 승인 해상도가 아니다. `asset-manifest.json` 또는 QA 샘플에 `logicalCanvas`, `maxTargetDpr`(모바일 기본값 3), `physicalCanvasTarget = logicalCanvas * maxTargetDpr`를 선언한다.
3. **DPR backing store 보장**: 작은 논리 캔버스를 CSS로 늘리는 구조만으로 완료 처리하지 않는다. Phaser `resolution`/scale 설정 또는 고해상도 논리 캔버스 전략으로 실제 `canvas.width/height`가 목표 DPR 물리 크기를 충족해야 한다. 고해상도 논리 캔버스(`1080x1920` 등)로 전환할 경우 좌표, 폰트, 물리 속도, hit zone, safe-area 수치를 함께 스케일링하고 문서화한다.
4. **배경 기준**: 전면 배경/스크린 셸 원본은 cover-fit 후에도 물리 캔버스를 업스케일 없이 덮어야 한다. 예: `390x844` 논리 캔버스 DPR3 목표는 최소 `1170x2532`; `430x932` DPR3 목표는 최소 `1290x2796`. 가능하면 `1440x3120` 이상처럼 여유 있는 세로형 소스를 생성한다. `1080x1920`은 모든 모바일 DPR3 상황의 만능 기준이 아니다.
5. **역할별 소스 픽셀 기준**: 중요한 런타임 에셋은 `sourcePixels >= renderedLogicalPixels * maxTargetDpr`를 만족해야 한다. 적/캐릭터가 모바일에서 90~130 logical px로 보이면 프레임은 최소 384px, 권장 512px 이상이다. HUD/아이콘은 최소 256px, 권장 512px 이상 소스나 동등한 코드 네이티브 벡터/그래픽으로 구현한다.
6. **UI 에셋 기준**: 반복 패널, 카드, 액션 버튼은 고해상도 9-slice/코드 네이티브 그래픽/안전 패딩 텍스처로 만든다. 텍스트 버튼은 소스 텍스처 내부에 글자를 굽지 말고 런타임 텍스트와 안정적인 배경 구조를 분리한다. 아이콘은 알파 bbox와 여백을 검사해 오른쪽/하단/상단 잘림을 금지한다.
7. **UI 소유권 일관성**: 한 화면의 주요 읽기/입력 UI는 같은 렌더링 계층과 품질 정책으로 통일한다. DOM/CSS를 쓰는 것은 가능하지만, 일부 HUD만 DOM으로 땜질하고 뉴스/카드/버튼은 저해상도 캔버스 텍스트로 남기는 혼합 품질은 미통과다. 각 UI의 `renderOwner`(`phaser`, `dom-css`, `generated-texture`)를 샘플에 기록한다.
8. **프롬프트 예방**: 배경 imagegen 프롬프트에는 플레이어/적/카드/버튼/텍스트 같은 런타임 UI가 구워지지 않도록 명시한다. 런타임 스프라이트와 겹칠 가능성이 있으면 배경을 재생성하거나 런타임 소유권을 제거한다.
9. **재생성 우선 판단**: 소스 자체가 저해상도, 잘림, 과투명, 알파 박스 오염, 압축 잔여물, 잘못된 방향을 포함하면 CSS 필터/샤픈/임시 확대가 아니라 신규 생성 또는 소스 수정으로 해결한다. 런타임 스케일/크롭/anchor가 원인이면 코드에서 고친다.
10. **뉴스/콘텐츠 밀도**: 같은 화면 품질 결함이 콘텐츠 반복감에서 오면 이벤트 데이터 쿼터와 중복 검사를 함께 적용한다.
11. **원인 분류 후 수정**: L 결함은 최소한 `source-too-small`, `backing-store-too-small`, `runtime-stretch`, `alpha-bbox-clipping`, `bad-background-removal`, `wrong-direction`, `mixed-ui-ownership` 중 하나로 원인을 분류한 뒤 수정한다.
12. **에셋 품질 상승 루프**: 역할별 목표 표시 크기와 DPR 기준을 먼저 계산하고, 생성/수정 프롬프트에 방향·패딩·투명 배경·텍스트 금지·배경 내 런타임 오브젝트 금지를 명시한다. 통합 후에는 source/crop/runtime contact sheet로 확인한다.

**기계 검증**:

- 배경/스크린 에셋 크기, 파일 크기, 알파, bbox padding, provenance, 뉴스 이벤트 쿼터를 검사하는 HQ 전용 QA를 실행한다.
- `390x844`, `430x932`, `1080x1920` 캡처에서 레이아웃 겹침과 픽셀 컴포지트 이상이 없는지 확인한다. 흐림/잘림 지적이 DPR 문제라면 같은 repro DPR에서 before/after를 남긴다.
- 상태 샘플에 `devicePixelRatio`, `maxTargetDpr`, `canvasCssSize`, `canvasBackingStoreSize`, `backingScale`, `logicalCanvas`, `physicalCanvasTarget`을 기록하고 `backingScale >= min(devicePixelRatio, maxTargetDpr)` 또는 문서화된 고해상도 논리 캔버스 전략을 assert한다.
- 핵심 배경은 cover-fit 계산 후 `sourceWidth/sourceHeight >= requiredCoverSourceSize`를 assert한다. 런타임 sprites/UI/icons/buttons는 `sourceFrameSize >= renderedLogicalSize * sampledTargetDpr`를 assert하고 업스케일 항목을 실패로 기록한다.
- 아이콘/버튼/스탬프는 `sourceAlphaBbox`, `runtimeBounds`, `safePadding`, `clippedEdges: []`, `outOfBounds: []`를 샘플에 기록한다. `getBounds()`만 통과하고 실제 알파가 잘린 경우는 실패다.
- before/after 캡처를 같은 화면 상태로 보존하고, 최종 캡처의 핵심 텍스처 키와 렌더 소유권(`phaser`, `dom-css`, `generated-texture`)을 상태 샘플에 기록한다.
- DOM/CSS UI를 쓰는 경우 상태 샘플에 `textOverflow: []`, `outOfBounds: []`, `fontLoaded: true`, UI 소유권을 기록한다.

## 3. 파이프라인 배치

| 결함 클래스 | 적용 시점 |
|---|---|
| D(난이도 축), E(진행/종료) | 계획 단계 — GDD/Tech-design 필수 항목 |
| A(생명주기), B(단일성), C(UI 분리), H(오디오 상태), I(입력 견고성) | 구현 규칙 + 캡처 QA 검사 항목 |
| J(지속성/세션), K(장시간 안정성), L(에셋 품질) | 캡처 QA 검사 항목 + 전용 스윕(리로드/visibility/장시간 자동 플레이/HQ 화면 검사) |
| F(수치 증거), G(재캡처 루프·회귀 누적·트리아지) | Evidence handling + 완료 기준 |

## 4. 관련 문서

- `dev_game/docs/production-demo-quality-contract.md` — 최초 완성 기준 (이 문서는 그 이후의 반복 보정 기준)
- `dev_game/docs/llm-game-studio-pipeline.md` — 전체 파이프라인
- `dev_game/docs/qa-evidence/` — 게임별 durable QA 증거 요약
