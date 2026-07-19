# 05. 적대적 검토 — 이 게임이 단순 리스킨이 아닌가?

## 검토 결론

설계상 `철갑특송: 라스트 라인`은 낙하물 회피형 Foundation이나 기존 런앤건 작품의 이름/이미지만 바꾼 결과가 아니다. 그러나 **구조 연계, 실제 호위 실패, 양 팀 환경 피해, 보스 부위/페이즈 전환이 런타임에서 증명될 때만** 이 결론이 성립한다. 아래 실패 신호가 보이면 custom-loop 구현 미달이다.

## 차별성 증거

| 축 | 일반 템플릿/장르 기본 | 본 게임의 고유 규칙 | 증거 |
|---|---|---|---|
| 진행 | 적을 쏘고 우측 이동 | 구조 선택이 HP·차량·포격으로 다음 전투 변경 | rescue event와 결과 기록 |
| 보호 대상 | 배경 차량 | HP 500, 위협 정지, 3 waves, 실패/완전 호위 | escort state/capture/assertion |
| 환경 | 장식 폭발 | 양 팀 피해, 지연 연쇄, 단계 점수 | chain damage 자동 테스트 |
| 전투 리듬 | 일반 wave 반복 | 보행→구조→수직전→호위→미니보스→강제전진 | 8 segment pacing evidence |
| 최종 보스 | 큰 HP 단일 패턴 | 파츠 노출과 공격군이 바뀌는 3페이즈 | phase별 capture와 stale cleanup |
| 세계관 | 군대/전쟁 차용 | 해양 구난망과 산업 약탈 세력 | visual bible/original asset provenance |

## 악마의 변호인 질문

### 1. 실제로는 좌우 이동하며 총만 쏘는가?

그럴 위험이 높다. 구조가 점수 팝업에 그치거나 차량이 자동 스크립트로 통과하면 핵심 차별성이 사라진다. 기술자 구조 전후 vehicle HP, 호위 중 위협 정지, 차량 파괴 실패를 기계 assertion으로 증명한다.

### 2. 적 4종이 색만 다른 같은 AI인가?

금지한다. 기본병은 3점사, 방패병은 전면 감소/근접 진격, 폭파병은 곡사 지역 봉쇄, 드론은 공중 고저차 압박을 가져야 한다. silhouette-only contact sheet와 패턴 로그로 확인한다.

### 3. 3페이즈가 HP threshold마다 탄속만 오르는가?

그렇다면 실패다. 각 페이즈는 공격 목록, 노출 부위, 코어 배율, 이동 방식이 바뀌어야 한다. 전환 때 이전 phase projectile/marker/audio를 정리해야 하며 각 phase 캡처가 육안으로도 달라야 한다.

### 4. HD 에셋이 실제 플레이에서 정적 배경/스탠딩 이미지인가?

플레이어 idle/run/jump/shoot/hurt/death와 적 attack/death가 runtime에서 호출되어야 한다. source sheet 존재는 증거가 아니며 중간 프레임 capture와 animation key 상태가 필요하다.

### 5. 모바일 우선이 단지 화면 크기 조절인가?

작은 가로 화면에서 터치 UI가 전투를 가리거나 조준이 자유 마우스 기준이면 실패다. 8방향 보정, 약한 자동조준, 자동 근접/구조, 특수무기 자동복귀가 실제 조작 복잡도를 낮춰야 한다.

## 가장 큰 위험과 완화

| 우선 | 위험 | 조기 신호 | 완화/게이트 |
|---:|---|---|---|
| 1 | 에셋 일관성 붕괴 | 포즈마다 얼굴·무기·비율 변화 | 기준 5포즈 승인 후 한 프레임씩 생성 |
| 2 | 7~10분 대신 짧은 샘플 | world x는 길지만 encounter가 비어 있음 | 10~15초 novelty log, median clear 측정 |
| 3 | 터치 UI 전투 방해 | 엄지가 적/탄/HP를 가림 | 844×390 실기기 capture, layout bounds |
| 4 | 풀 재사용 lifecycle race | 숨은 적 피격/중복 점수 | inactive 불변식, restart 10회 soak |
| 5 | 폭발이 경고를 가림 | 미사일 marker/적탄 실종 | VFX alpha/scale 제한, 위험 레이어 상위 |
| 6 | 보스 scope 과다 | 파츠만 있고 패턴 연결 안 됨 | phase별 vertical slice 순차 완성 |
| 7 | 오디오 상태 누수 | Home에서 Stage BGM/engine 지속 | scene transition loop count assertion |
| 8 | IP 유사성 | 특정 유명작 캐릭터/차량/포즈 연상 | prompt 금지어, 독자 motif review, 재생성 |

## Scope 공격

현재 MVP에 포병 구조 대상이 선택 목표로 포함되어 있으나 필수 완료 기준은 기술자·의무병 2종이다. 일정이 위험할 때 포병의 고급 연출을 줄일 수 있지만 `구조 시스템 자체`, 호위, 연쇄 파괴, 적 4종, 미니보스, 3페이즈 보스, 모바일 조작은 줄일 수 없다. 멀티플레이, 캐릭터 선택, 장비 제작, 다중 스테이지는 추가하지 않는다.

## 밸런스 공격

- 이동속도만 높이면 교량이 쉬워지고, 탄속만 높이면 터치 플레이가 불공정해진다. 적 조합, telegraph, 공간, 자원, 동시 수를 독립 축으로 조정한다.
- 방패병+폭파병 조합은 이동 공간을 모두 막을 수 있다. 안전 탈출선 하나와 400ms 이상 telegraph를 보장한다.
- 호위 차량이 플레이어보다 빨라 화면 밖으로 나가면 실패다. 카메라/차량 bounds와 위협 정지를 함께 검증한다.
- 보스 페이즈 3의 공격은 최소 하나의 안전 해법이 항상 화면 안에 있어야 한다.
- assist는 선택형이고 결과에 기록하되 플레이 진입을 막지 않는다.

## 시각 공격

- 4K 원본이라는 이유만으로 품질을 인정하지 않는다. runtime 표시 크기에서 흐리거나 과축소되어 정보가 사라지면 실패다.
- 차량/기계 파츠의 내부 면이 alpha 제거로 빈 경우 코드 tint나 배경으로 숨기지 않고 재생성한다.
- 배경의 화재·경고색이 적탄과 겹치면 배경 채도/명도를 낮춘다.
- foreground와 큰 폭발은 gameplay warning layer 아래에 두지 않는다.
- UI에 AI가 만든 읽을 수 없는 글자나 장식 숫자가 있으면 폐기한다.

## 기술 공격

다음 현상은 production blocker다.

1. scene restart마다 collider/listener/timer 수 증가
2. inactive/transparent entity가 collision 또는 score 생성
3. boss phase transition 뒤 이전 marker/projectile/loop 잔류
4. touch pointer cancel 뒤 사격/이동 held 고착
5. pause/Home에서 gameplay audio 계속 재생
6. localStorage 파싱 오류로 boot 중단
7. canvas letterbox와 touch 좌표 불일치
8. 에셋 missing을 fallback 도형으로 조용히 대체

## Red-team 플레이 시나리오

1. 사격을 누른 채 앱을 background→foreground한다.
2. pause/resume을 호위 wave spawn 순간에 반복한다.
3. 연료통 폭발과 적 사망, checkpoint 진입을 같은 프레임에 만든다.
4. 보스 HP threshold를 큰 로켓 피해로 두 단계 건너뛴다.
5. phase transition 중 Home→restart한다.
6. 차량 HP 1과 player death를 같은 tick에 만든다.
7. localStorage에 깨진 JSON/구버전 schema를 주입한다.
8. 844×390에서 양 엄지를 누른 채 grenade와 pause를 교차한다.
9. 10회 연속 restart 후 최초 run과 entity/pool/listener 수를 비교한다.
10. 네트워크 cache 없이 reload하여 missing asset과 load time을 확인한다.

## 출시 전 반증 기준

아래 중 하나라도 참이면 "고품질 프로덕션 데모" 주장을 반증한다.

- Result까지 실제 플레이 불가 또는 clear time 420초 미만/600초 초과
- 구조 결과가 후속 게임 상태를 바꾸지 않음
- 차량 파괴가 실패를 만들지 않음
- 파괴물이 적에게 피해를 주지 않음
- 적 4종 중 하나가 동일 AI/실루엣 재색칠
- 아이언 몰 phase별 공격군/노출부위 차이가 없음
- 플레이어 핵심 animation이 runtime에 적용되지 않음
- 게임 전용 provenance가 없는 핵심 에셋 존재
- 필수 viewport에서 HUD/touch overlap 또는 offscreen
- console 오류, missing asset, stale entity/audio 상태 존재
- production gate 또는 캡처 기반 재검증 미통과

## 최종 판정 방식

문서의 의도가 아니라 현행 worktree, 브라우저 실행, 자동 assertion, 캡처, manifest를 요구사항별로 대조한다. 증거가 불충분하면 통과로 추정하지 않는다. 모든 반증 기준이 제거된 뒤에만 완료를 선언한다.
