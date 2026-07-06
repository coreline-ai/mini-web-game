# 05 · Adversarial Review — Castle Archer

## "dodge 템플릿 리스킨 아니냐"에 대한 반박 (구체 근거)
1. **입력 의미가 다르다**: Foundation의 드래그=이동 코드는 GameScene에서 제거됐다. 드래그는 AimShotSystem의 조준각 계산에 배선되고 궁수는 고정이다. (GameScene.update에 targetX 추적 코드 없음)
2. **판정 소유가 다르다**: 승부 판정은 player×hazard 원힛이 아니라 arrow×hazard(수동 발사 명중)와 성벽 라인 돌파(WaveGateSystem.damageGate)다. 신규 시스템 2개(AimShot/WaveGate) 348줄이 실제 런타임에 배선되어 있다.
3. **실패 구조가 다르다**: 원힛 즉사 → 거점 HP 3 + 회복(물약) 경제. Foundation에 없는 상태(gateHp/wave/shield hp)와 UI(하트/WAVE 배너)가 런타임에 존재한다.
4. **적 구성이 다르다**: 매 5번째 방패병(2HP, 텍스처 스왑, 파괴 단계)과 헤드샷 대역 판정은 스포너 재사용만으로는 불가능한 로직이다.
5. **에셋이 전용이다**: 고블린/방패 고블린/물약/화살/하트/성채 배경 3종 — 전부 이 게임 전용 신규 생성(assetIsolation per-game), 타 게임과 체크섬 공유 없음.

## 남는 리스크 (정직)
- Spawner의 낙하 스폰 흐름 자체는 재사용 — 단, 진군 속도/회전 제거/구성(configureNewMonsters)으로 의미를 바꿨다. "위에서 아래로 온다"는 공간 문법은 세로 모바일 방어전의 표준이라 판단.
- 물약이 스스로 떨어지는 것은 dodge 문법의 잔재 — 후속 확장에서 "웨이브 클리어 보상 드롭"으로 바꾸면 더 정합적.
