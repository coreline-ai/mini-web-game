# 07 · Regression Checklist — Bullseye Rush

1. **타이밍 명중**: aimX가 과녁 중심 ±10px일 때 탭 → 명중. 중심 34% 이내면 'BULLSEYE xN' 팝+콤보 증가, 밖이면 '+30'+콤보 리셋.
2. **라운드 전환**: 모든 과녁 파괴 → 'CLEAR +bonus' → 0.7s 후 ROUND N+1 배너(배너 중 발사 잠금 locked=true → 해제).
3. **미스 3 실패**: 과녁 없는 지점으로 3발 → MISS 카운트 3/3 → 게임오버(reason misses). 씬 종료 후 __BULLSEYE_DEBUG__.get() throw 없음.
4. **화살 소진 실패**: 화살 0 + 공중 화살 소멸 + 과녁 잔존 → 게임오버(reason arrows). 화살 0일 때 탭해도 발사 안 됨.
5. **보너스 별**: R3+ 확률 등장, 명중 시 '+1 ARROW'+ARROWS 증가.
6. **manifest 무결성**: asset-manifest.json에 hazard/collectible 만료 엔트리 없음, qualityTier production-demo (아트 재실행 후에도).
