# Phase 2 — YAML·명령 계약 fail-closed

- 상태: `PASS`
- baseline HEAD: `4f6d0654483c1e73398eb3d6cee0ce9d71aa729d`
- 주 파일: `scripts/check_skill_drift.sh`, `scripts/check_skill_commands.mjs`
- 허용 경로: 두 검사기, command/structure fixture와 inventory, gate controls, 이 계획·증거
- 금지 경로: 네 SKILL 본문·generator runtime

## 작업 전 계약

- 시작 전에 존재한 K-1 변경(`check_skill_drift.sh`, `unparseable-frontmatter`, gate controls)은
  내용과 대조를 확인한 뒤 채택 또는 보완한다. 임의 복구하지 않는다.
- SKILL frontmatter와 `agents/openai.yaml`은 실제 YAML mapping으로 파싱되어야 한다.
- CLI 필수 인자는 오류 문자열에서 추측하지 않고 명시적 inventory contract가 소유한다.
- inventory와 문서 어느 한쪽을 지워 공허하게 통과할 수 없어야 한다.

## As-built

- 시작 전에 존재한 K-1 변경은 목표와 대조가 일치해 채택했다. PyYAML이 없으면 RED다.
- 같은 parser로 `agents/openai.yaml`도 mapping과 필수 문자열 필드를 검증하도록 보완했다.
- `dev_game/generator/scripts/cli-contracts.json`을 leaf CLI 인자 정본으로 추가했다.
- 명령 검사기는 오류 문구가 아니라 `requiredAll`, `requiredOneOf`, `knownFlags`를 사용한다.
- contract 플래그가 실제 소스 문자열에 없거나, 오류 문구가 contract 밖 필수를 선언하면 RED다.
- `hidden-required-flag`와 `unparseable-openai-yaml` 대조를 추가했다.

## 증거

- `check_skill_commands.mjs`: exit 0, 현재 명령 7개.
- `check_skill_drift.sh --skip-user`: exit 0, 네 스킬 구조 GREEN.
- `check_skill_gate_controls.mjs`: exit 0, 31종(음성 3/양성 28).
- 따옴표가 닫히지 않은 openai YAML: 정확한 YAML parse 사유로 exit 1.
- 오류 문구가 `token needed`인 leaf CLI에서 contract의 `--token`을 문서가 생략: exit 1.

## 스킬·계약 대조

- `skill-creator`가 요구하는 YAML 실파싱과 필수 UI 필드 존재를 검사한다.
- `factory:make`, `factory:production-gate`, `factory:imagegen`의 실제 parse branch에 존재하는
  플래그만 contract에 선언했다.
- command inventory는 문서가 보존할 책임, CLI contracts는 실행기가 받는 인자를 소유해 역할을
  분리했다.

## 판정

- 판정: `PASS` — 자체 검증, 2026-08-16
