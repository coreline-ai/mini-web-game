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

    name = re.search(r'^name:\s*(.+?)\s*$', fm, re.M)
    if not name or not name.group(1).strip():
        bad.append(f"{d.name}/SKILL.md: frontmatter name이 비어 있다")
    elif name.group(1).strip().strip('"\'') != d.name:
        bad.append(f"{d.name}/SKILL.md: frontmatter name이 디렉터리와 다르다 ({name.group(1).strip()})")

    desc = re.search(r'^description:\s*(.*)$', fm, re.M)
    if not desc or not desc.group(1).strip().strip('"\''):
        bad.append(f"{d.name}/SKILL.md: frontmatter description이 비어 있다 — "
                   "설명이 없으면 이 스킬은 어떤 요청에도 선택되지 않는다")

    # agents/openai.yaml — Codex UI가 읽는 층. SKILL과 같은 범위를 말해야 한다.
    yml = d / "agents" / "openai.yaml"
    if not yml.exists():
        bad.append(f"{d.name}/agents/openai.yaml이 없다")
        continue
    y = yml.read_text(encoding="utf-8")
    if not re.search(r'^interface:\s*$', y, re.M):
        bad.append(f"{d.name}/agents/openai.yaml: 최상위 interface: 블록이 없다")
        continue
    for field in ("display_name", "short_description", "default_prompt"):
        fm2 = re.search(rf'^\s+{field}:\s*(.*)$', y, re.M)
        if not fm2 or not fm2.group(1).strip().strip('"\''):
            bad.append(f"{d.name}/agents/openai.yaml: interface.{field}가 없거나 비어 있다")

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
