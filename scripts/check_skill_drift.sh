#!/usr/bin/env bash
set -euo pipefail

# Verify the single-source skill topology.
#
#   skills/<name>/            THE single source of truth — the only real copy, edit here only
#   .claude/skills/<name>     symlink -> ../../skills/<name>   (Claude Code, repo level)
#   .agents/skills/<name>     symlink -> ../../skills/<name>   (Codex/OpenAI, repo level)
#   ${CODEX_HOME}/skills/<name>    optional installed copy — must match the source
#   ${CLAUDE_HOME}/skills/<name>   optional installed copy — must match the source
#
# Repo-level drift is structurally impossible while the symlinks are intact, so this
# script checks link INTEGRITY rather than diffing content. User-level installs are real
# copies (the repo may be unmounted), so those are diffed and reported as stale.
#
# It also checks the one place where docs restate a gate's hardcoded constants, since that
# pair drifts the same silent way a duplicated file does.
#
# Read-only: never repairs. Use install_game_factory_skill.sh repo to fix.
#
# Usage: ./scripts/check_skill_drift.sh [--skip-user] [--skills-root <dir>]
#   (runnable from any cwd)
#
# --skills-root runs ONLY the document-structure check against the given directory. Fixtures
# have no symlinks and no install, so running topology checks on them would fail for reasons
# unrelated to what the fixture tests — and a control that fails for the wrong reason proves
# nothing (계약 §0.1).

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_LINK_ROOTS=(.claude/skills .agents/skills)
SKIP_USER=0
SKILLS_ROOT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-user) SKIP_USER=1; shift ;;
    --skills-root) SKILLS_ROOT="${2:?--skills-root needs a directory}"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

# 문서 구조 검사. 스킬 선택은 frontmatter가 먼저 하고, Codex UI는 agents/openai.yaml이 먼저
# 보여준다. 둘 중 하나가 깨지면 SKILL.md 본문이 아무리 정확해도 스킬이 잘못 뽑히거나 잘못
# 설명된다. 다이어트는 이 두 층을 가장 먼저 건드리므로 여기에 바닥을 깔아 둔다.
check_structure() {
  python3 - "$1" <<'PYEOF'
import re, sys
from pathlib import Path

# frontmatter는 **실제 로더가 읽는 대로** 검사한다.
#
# 이전 판은 fence·name·description을 정규식으로만 확인했다. 그래서 description 안의
# 따옴표 없는 콜론처럼 **YAML 문법을 깨뜨리는 입력을 통과시켰다** — 정규식은 `name:` 이라는
# 글자가 있는지만 보고, 그 블록이 매핑으로 파싱되는지는 묻지 않기 때문이다.
#
# 실측(2026-08-16): `description: … mode: correcting …` 이 들어간 SKILL.md에 대해
#   quick_validate            Invalid YAML in frontmatter (line 2, column 379)
#   check_skill_drift.sh      exit 0        ← 통과시켰다
# 스킬이 로드되지 않는 상태인데 게이트는 초록이었다.
try:
    import yaml
except ImportError:
    print("ERR python3에 yaml 모듈이 없다 — frontmatter를 로더와 같은 방식으로 검사할 수 없다")
    print("ERR 검사를 건너뛰지 않는다: 확인할 수 없는 것은 통과가 아니다")
    sys.exit(1)

root = Path(sys.argv[1])
bad = []
seen = 0

for d in sorted(p for p in root.iterdir() if p.is_dir()):
    md = d / "SKILL.md"
    if not md.exists():
        continue
    seen += 1
    text = md.read_text(encoding="utf-8")

    # frontmatter fence — 여는 --- 와 닫는 --- 가 모두 있어야 한다
    m = re.match(r"\A---\n(.*?)\n---\n", text, re.S)
    if not m:
        bad.append(f"{d.name}/SKILL.md: frontmatter fence가 없거나 닫히지 않았다 (--- ... ---)")
        continue
    fm = m.group(1)

    # fence 안이 실제로 YAML 매핑으로 읽히는가. 여기서 걸리면 스킬이 로드되지 않는다.
    try:
        parsed = yaml.safe_load(fm)
    except yaml.YAMLError as exc:
        where = ""
        mark = getattr(exc, "problem_mark", None)
        if mark is not None:
            where = f" (frontmatter {mark.line + 1}행 {mark.column + 1}열)"
        bad.append(f"{d.name}/SKILL.md: frontmatter가 YAML로 파싱되지 않는다{where} — "
                   f"{getattr(exc, 'problem', exc)}. 따옴표 없는 콜론이 가장 흔한 원인이다")
        continue
    if not isinstance(parsed, dict):
        bad.append(f"{d.name}/SKILL.md: frontmatter가 매핑이 아니다 ({type(parsed).__name__})")
        continue

    name = parsed.get("name")
    if not isinstance(name, str) or not name.strip():
        bad.append(f"{d.name}/SKILL.md: frontmatter name이 비어 있거나 문자열이 아니다")
    elif name.strip() != d.name:
        bad.append(f"{d.name}/SKILL.md: frontmatter name이 디렉터리와 다르다 ({name.strip()})")

    desc = parsed.get("description")
    if not isinstance(desc, str) or not desc.strip():
        bad.append(f"{d.name}/SKILL.md: frontmatter description이 비어 있다 — "
                   "설명이 없으면 이 스킬은 어떤 요청에도 선택되지 않는다")

    # agents/openai.yaml — Codex UI가 읽는 층. SKILL과 같은 범위를 말해야 한다.
    yml = d / "agents" / "openai.yaml"
    if not yml.exists():
        bad.append(f"{d.name}/agents/openai.yaml이 없다")
        continue
    y = yml.read_text(encoding="utf-8")
    try:
        y_parsed = yaml.safe_load(y)
    except yaml.YAMLError as exc:
        mark = getattr(exc, "problem_mark", None)
        where = f" ({mark.line + 1}행 {mark.column + 1}열)" if mark is not None else ""
        bad.append(f"{d.name}/agents/openai.yaml: YAML로 파싱되지 않는다{where} — "
                   f"{getattr(exc, 'problem', exc)}")
        continue
    if not isinstance(y_parsed, dict):
        bad.append(f"{d.name}/agents/openai.yaml: 최상위 값이 매핑이 아니다")
        continue
    interface = y_parsed.get("interface")
    if not isinstance(interface, dict):
        bad.append(f"{d.name}/agents/openai.yaml: 최상위 interface: 매핑이 없다")
        continue
    for field in ("display_name", "short_description", "default_prompt"):
        value = interface.get(field)
        if not isinstance(value, str) or not value.strip():
            bad.append(f"{d.name}/agents/openai.yaml: interface.{field}가 없거나 비어 있다")
    short = interface.get("short_description")
    if isinstance(short, str) and not 25 <= len(short.strip()) <= 64:
        bad.append(f"{d.name}/agents/openai.yaml: interface.short_description은 25~64자여야 한다 "
                   f"(현재 {len(short.strip())}자)")
    default = interface.get("default_prompt")
    skill_token = f"${d.name}"
    if isinstance(default, str) and skill_token not in default:
        bad.append(f"{d.name}/agents/openai.yaml: interface.default_prompt가 {skill_token}을 명시하지 않는다")

if seen == 0:
    print(f"ERR {root}에 SKILL.md를 가진 디렉터리가 없다 — 공허한 통과를 거부한다")
    sys.exit(1)
for b in bad:
    print(f"ERR {b}")
sys.exit(1 if bad else 0)
PYEOF
}

# fixture 모드 — 구조 검사만 돌린다 (위 --skills-root 주석 참조)
if [[ -n "$SKILLS_ROOT" ]]; then
  echo "== skill document structure (fixture: $SKILLS_ROOT) =="
  if check_structure "$SKILLS_ROOT"; then
    echo "  OK  frontmatter fence/name/description, agents/openai.yaml 필수 필드"
    echo "skill structure: OK"
    exit 0
  fi
  echo "skill structure: DRIFT DETECTED" >&2
  exit 1
fi

# Discovery rule (shared with install_game_factory_skill.sh): a skill is a directory under
# skills/ that contains a SKILL.md. Anything else there — a loose .md, a stray folder — is
# not a skill. Discovering rather than listing means adding a skill needs no script edit,
# which is where a hardcoded list silently falls behind.
SKILLS=()
for _skill_md in "$ROOT"/skills/*/SKILL.md; do
  [[ -f "$_skill_md" ]] || continue
  SKILLS+=("$(basename "$(dirname "$_skill_md")")")
done
if [[ ${#SKILLS[@]} -eq 0 ]]; then
  echo "No skills found under $ROOT/skills/*/SKILL.md — refusing to report a vacuous pass." >&2
  exit 1
fi

fail=0
note() { printf '  %s\n' "$1"; }
err() { printf '  FAIL: %s\n' "$1" >&2; fail=1; }

echo "== source of truth =="
for name in "${SKILLS[@]}"; do
  src="$ROOT/skills/$name"
  if [[ -L "$src" ]]; then
    err "skills/$name is a symlink; the source of truth must be a real directory"
  elif [[ ! -f "$src/SKILL.md" ]]; then
    err "skills/$name/SKILL.md is missing"
  elif ! grep -qx "name: $name" "$src/SKILL.md"; then
    err "skills/$name/SKILL.md frontmatter name does not match directory ($name)"
  else
    note "OK  skills/$name/SKILL.md ($(wc -l <"$src/SKILL.md" | tr -d ' ') lines)"
  fi
done

echo "== repo symlinks =="
for root in "${REPO_LINK_ROOTS[@]}"; do
  for name in "${SKILLS[@]}"; do
    link="$ROOT/$root/$name"
    want="../../skills/$name"
    if [[ ! -e "$link" && ! -L "$link" ]]; then
      err "$root/$name is missing (expected symlink -> $want)"
    elif [[ ! -L "$link" ]]; then
      err "$root/$name is a real directory, not a symlink — repo copies must not exist"
    elif [[ "$(readlink "$link")" != "$want" ]]; then
      err "$root/$name points to '$(readlink "$link")', expected '$want'"
    elif [[ ! -f "$link/SKILL.md" ]]; then
      err "$root/$name is a broken symlink (does not resolve to SKILL.md)"
    else
      note "OK  $root/$name -> $want"
    fi
  done
done

echo "== skill document structure =="
if check_structure "$ROOT/skills"; then
  note "OK  frontmatter fence/name/description, agents/openai.yaml 필수 필드"
else
  fail=1
fi

echo "== gate constants vs docs =="
# The Path B checklist in ai-art-pipeline.md restates values the gate hardcodes. If someone
# edits the gate's accepted set, a hand-written manifest can start failing against a doc that
# still lists the old value — so the doc has to name every accepted value.
node "$ROOT/scripts/check_doc_constants.mjs" || fail=1

if [[ "$SKIP_USER" == "1" ]]; then
  echo "== user installs == (skipped)"
else
  echo "== user installs =="
  check_user() {
    local root="$1" label="$2"
    [[ -d "$root" ]] || { note "--  $label not installed ($root)"; return; }
    for name in "${SKILLS[@]}"; do
      local dest="$root/$name"
      if [[ ! -d "$dest" ]]; then
        note "--  $label: $name not installed"
      elif diff -r -x '.DS_Store' "$ROOT/skills/$name" "$dest" >/dev/null 2>&1; then
        note "OK  $label: $name up to date"
      else
        err "$label: $name is STALE — re-run scripts/install_game_factory_skill.sh"
      fi
    done
  }
  check_user "${CODEX_HOME:-$HOME/.codex}/skills" "Codex"
  check_user "${CLAUDE_HOME:-$HOME/.claude}/skills" "Claude Code"
fi

# 스킬 선택은 frontmatter description으로 먼저 일어난다. 두 스킬이 같은 트리거 단어를 들고
# 있으면 본문을 읽기 전에 둘 다 후보가 되고, 어느 쪽이 뽑힐지는 운이다. 실측(2026-08-16):
# game-factory가 "post-production game QA"를 자기 트리거로 선언해 game-polish와 겹쳤다.
echo
if ! python3 - "$ROOT" <<'PYEOF'
import re, sys
from pathlib import Path
root = Path(sys.argv[1])
TRIGGERS = ["post-production", "qa fix pass", "후보정", "새 게임", "sprite sheet",
            "sprite-sheet", "frame spacing", "spritesheet spacing", "easing"]
descs = {}
for d in sorted((root / "skills").iterdir()):
    f = d / "SKILL.md"
    if not f.exists():
        continue
    m = re.search(r'^description:\s*"?(.*?)"?\s*$', f.read_text(encoding="utf-8"), re.M | re.S)
    if m:
        descs[d.name] = m.group(1).lower()
bad = []
for t in TRIGGERS:
    owners = [n for n, v in descs.items() if t in v]
    if len(owners) > 1:
        bad.append((t, owners))
for t, owners in bad:
    print(f'ERR frontmatter trigger "{t}" is claimed by {owners} — descriptions must be mutually exclusive')
sys.exit(1 if bad else 0)
PYEOF
then
  fail=1
else
  note "OK  frontmatter triggers are mutually exclusive"
fi

echo
if [[ "$fail" == "0" ]]; then
  echo "skill topology: OK"
else
  echo "skill topology: DRIFT DETECTED" >&2
  exit 1
fi
