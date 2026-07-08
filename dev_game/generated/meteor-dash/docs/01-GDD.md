# 01 · Game Design Document — Meteor Dash

## Concept
Dodge falling meteors and catch stars in deep space.

- **Core fantasy:** one-hand survival under escalating pressure.
- **Control:** drag only — the whole game is readable with one thumb.
- **Win/lose:** survive as long as possible; a single hit from a "Meteor" ends the run.

## 30-second core loop
1. Move to dodge falling **Meteor**.
2. Optionally grab **Star** for score (60 each).
3. Difficulty ramps every 14s (faster spawns, faster fall).
4. Get hit → GAME OVER → see score/best → retry in one tap.

## Progression & stages
The demo presents at least 3 visually distinct stage/theme backgrounds that swap as the
run escalates, so the player *feels* progress, not just a rising number.

## Reward loop
Score is skill; best-score persistence is the long-term hook. Cosmetic stage variety
keeps repeated runs fresh without pay-to-win.

## Differentiation
This is a first production-demo, not a reskin: it must have real art direction, game
feel (juice), audio, and multi-stage presentation. See 05-ADVERSARIAL-REVIEW.md.


## 종료 구조 (설계 결정 — 폴리시 계약 §E)
Meteor Dash는 **엔드리스 서바이벌**이다: 승리 터미널 없이 실패 종료(피격 → GAME OVER)만 존재하며, 이는 명시적 설계 결정이다. 목표는 최고 점수 경쟁(best 저장). 스테이지 구조는 SPEC.difficulty(rampEverySeconds 15, maxLevel 12) config로 선언되며 레벨업마다 배경 크로스페이드로 시각화된다.

## 시나리오 이벤트 (폴리시 세션 #1 확장)
- **METEOR SHOWER**: 18초 후 22초 주기 — 경고 배너 1.6s → 4.2s 폭풍(스폰 간격 1/3) → 생존 보너스 +50×레벨.
- **SHIELD 파워업**: 12초 후 16초 주기 확률 드랍 — 획득 시 1회 피격 무효(링 장착 표시), 피격 흡수 시 0.8s 무적 깜빡임.
