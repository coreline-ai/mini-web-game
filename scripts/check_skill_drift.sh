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
# Usage: ./scripts/check_skill_drift.sh [--skip-user]   (runnable from any cwd)

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_LINK_ROOTS=(.claude/skills .agents/skills)
SKIP_USER=0
[[ "${1:-}" == "--skip-user" ]] && SKIP_USER=1

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
