# 05 · Adversarial Review — Firebreak Commander

## Reskin 판정

기존 falling-object starter와 입력, 공간, 판정, 자원, 목표, 종료 구조가 모두 다릅니다. Foundation은 scene lifecycle만 남기고 gameplay는 10x15 deterministic grid와 `FireSimulationSystem` 중심으로 교체했습니다.

## 주요 공격 질문

### 물 투하만 반복하면 되는가?

헬기는 water/fuel 비용과 cooldown이 있으며 5회 반복 시 물이 0이 됩니다. 60/120/160초의 예고된 spot fire가 남아 있어 water-only 기준 해법은 tick 347에 필수 목표를 잃습니다.

### 방화선으로 보호구역만 감싸면 되는가?

남쪽 최종 화점은 마을과 변전소 인접 셀에 예고 후 발생합니다. refuge ring만 반복하는 해법은 tick 347에 두 남쪽 목표를 잃습니다. 검증된 3성 해법은 중간 방화선과 HELI, 늦은 ENGINE 배치를 함께 사용합니다.

### 확산이 운처럼 보이지 않는가?

배열 순서 독립 buffer, seed, 고정 tick을 사용하고 3틱 위험 셀과 wind change를 공개합니다. 예고 없는 ember jump는 금지합니다.

### 작은 격자가 조작하기 어려운가?

36px cell을 그대로 정밀 탭하게 두지 않고 drag 보간, cell snap, target preview를 사용합니다. command button은 최소 64px hit area입니다.

### 성능을 시각 효과로 잃지 않는가?

150 cells를 2Hz로 갱신하고 렌더와 분리합니다. 최종 fire/smoke/water는 pool과 명시적 active 상한을 사용합니다.

### 예고된 화점도 불공정하지 않은가?

각 화점은 stage data에 warningTick/triggerTick을 함께 두고 5초 전에 HUD와 전용 경고음을 냅니다. 위치도 고정되어 학습과 재현이 가능하며 화면 밖 즉시 발화는 없습니다.

### 현재 완료인가?

코어·에셋·오디오·scene-first artboard·실제 입력·밸런스·장시간 lifecycle QA가 완료되었습니다. 최종 배포 가능 판정은 `06-FINAL-QA-SUMMARY.md`의 production gate 결과를 단일 근거로 사용합니다.
