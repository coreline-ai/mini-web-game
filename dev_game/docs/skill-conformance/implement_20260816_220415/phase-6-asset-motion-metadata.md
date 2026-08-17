# Phase 6 — asset↔motion 범위·순서·UI 메타데이터

- 상태: `PASS`
- 허용 경로: asset/motion SKILL·references, 네 openai.yaml, structure gate/fixture, 새 corpus, 계획·증거
- 금지 경로: factory/polish SKILL 본문·generator runtime

## 작업 전 계약

- dev_game의 새 프레임/VFX는 motion 설계 PASS 후 factory Path A/B가 생성·provenance를 소유한다.
- standalone 생성과 승인 프레임 픽셀 보존 교정은 asset 스킬이 직접 수행한다.
- 복합 요청은 `motion 설계 PASS → asset/factory 산출 PASS → motion runtime QA PASS`다.
- openai metadata는 25~64자 short description과 `$skill-name`을 포함한 짧은 default prompt를 쓴다.

## As-built

- asset frontmatter와 본문을 `standalone 생성 | 승인 프레임 픽셀 보존 교정`으로 한정하고,
  dev_game 신규 생성은 motion 설계 뒤 factory Path A/B로 전달하도록 분리했다.
- motion frontmatter·본문·prompt reference에 `설계 PASS → 생성/교정 PASS → runtime PASS` 순서를
  명시하고, dev_game의 생성·provenance 소유자는 factory임을 고정했다.
- `ai-art-pipeline.md`에 승인 프레임 교정도 motion 목표값 확인 없이 시작하지 않는 규칙을 추가했다.
- 네 `agents/openai.yaml`을 25~64자 설명과 `$skill-name` 1문장 prompt로 재작성했다.
- 구조 검사와 대조군에 설명 길이·skill token 누락 사례를 추가했다.
- Phase 중 발견한 factory/polish 서술 축약은 허용 경로 밖이므로 즉시 원복했다. 계약을 소급
  완화하지 않았으며, 필요 시 Phase 7의 선행 계약 뒤 별도 다이어트로 처리한다.

## 증거

- routing corpus: 총 8사례. dev_game 신규 시트→motion/factory, standalone 신규→asset,
  승인 프레임 교정→asset, 복합 작업→motion/asset/motion 순서를 각각 고정했다.
- `quick_validate.py` 네 스킬: 모두 `Skill is valid!`, exit 0.
- `check_skill_drift.sh --skip-user`: 네 구조·symlink·trigger 모두 GREEN, exit 0.
- `check_skill_gate_controls.mjs`: 35종(음성 4/양성 31) 전부 기대대로, exit 0.
- metadata audit: 설명 길이 factory 58, polish 53, asset 61, motion 60; 네 prompt 모두 `$skill-name` 포함.
- 링크 audit: 깨진 상대 Markdown 링크 0건. 명령 검사: 9개 계약 GREEN.
- SKILL line count: factory 318, polish 179, asset 103, motion 102; 500행 상한 이내.

## 스킬·계약 대조

- ai-art pipeline 역할표와 asset/motion SKILL·두 prompt reference가 모두 dev_game 신규 생성의
  소유자를 factory Path A/B로, 설계/runtime 판정을 motion으로 말한다.
- asset 직접 실행은 standalone과 승인 프레임 픽셀 보존 교정뿐이며, 서로의 description도 같은
  경계를 선언한다.
- 자동 검사는 구조·경로·메타데이터 회귀만 증명한다. 실제 에셋·모션 품질 판정은 각 단계의
  대조표와 runtime PASS가 담당한다.

## 판정

- 판정: `자체 검증 PASS`
- 미해결 P0/P1: 0건
