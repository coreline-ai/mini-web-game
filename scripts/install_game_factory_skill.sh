#!/usr/bin/env bash
set -euo pipefail

# Install / repair the dev_game skills (game-factory, game-polish).
#
# Topology:
#   skills/<name>/            THE single source of truth — edit here only
#   .claude/skills/<name>     repo symlink -> ../../skills/<name>   (Claude Code)
#   .agents/skills/<name>     repo symlink -> ../../skills/<name>   (Codex/OpenAI)
#   ${CODEX_HOME}/skills/     user-level COPY (repo may be unmounted)
#   ${CLAUDE_HOME}/skills/    user-level COPY
#
# Repo level uses symlinks so the two runtimes read one file and cannot drift.
# User level stays a copy on purpose — it must survive the repo being unavailable.
#
# Usage: ./scripts/install_game_factory_skill.sh [codex|claude|repo|all|--dest <path>]  (default: codex)
#   --dest <path>  install into any skills directory — for shell-capable hosts other than
#                  Codex and Claude Code. The art path still needs the Codex CLI as a sidecar;
#                  a host without shell access cannot use these skills at all.
#   codex   copy to ${CODEX_HOME:-~/.codex}/skills
#   claude  copy to ${CLAUDE_HOME:-~/.claude}/skills
#   repo    verify/repair the in-repo symlinks (no writes outside the repo)
#   all     repo + codex + claude

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_LINK_ROOTS=(.claude/skills .agents/skills)
TARGET="${1:-codex}"

# Discovery rule (shared with check_skill_drift.sh): a skill is a directory under skills/
# that contains a SKILL.md. Adding a skill therefore needs no edit here.
SKILLS=()
for _skill_md in "$ROOT"/skills/*/SKILL.md; do
  [[ -f "$_skill_md" ]] || continue
  SKILLS+=("$(basename "$(dirname "$_skill_md")")")
done
if [[ ${#SKILLS[@]} -eq 0 ]]; then
  echo "No skills found under $ROOT/skills/*/SKILL.md" >&2
  exit 1
fi

# Copy one skill into a user-level skills root, replacing any previous install.
# Staged through a temp dir so an interrupted copy cannot leave a half-written skill.
install_to() {
  local dest_root="$1" label="$2" name="$3"
  local dest="$dest_root/$name"
  local tmp="$dest.tmp.$$"
  mkdir -p "$dest_root"
  rm -rf "$tmp"
  cp -R "$ROOT/skills/$name" "$tmp"
  rm -rf "$dest"
  mv "$tmp" "$dest"
  echo "  installed: $dest ($label)"
}

install_user() {
  local dest_root="$1" label="$2"
  for name in "${SKILLS[@]}"; do
    install_to "$dest_root" "$label" "$name"
  done
}

# Verify the in-repo symlinks; recreate the ones that are missing or mispointed.
# A real directory where a symlink belongs is NOT auto-deleted — that would discard
# content the user may not have backed up. Report it and let a human decide.
repair_repo_links() {
  local rc=0
  for root in "${REPO_LINK_ROOTS[@]}"; do
    for name in "${SKILLS[@]}"; do
      local link="$ROOT/$root/$name"
      local want="../../skills/$name"
      mkdir -p "$ROOT/$root"
      if [[ -L "$link" && "$(readlink "$link")" == "$want" && -f "$link/SKILL.md" ]]; then
        echo "  ok: $root/$name -> $want"
      elif [[ -d "$link" && ! -L "$link" ]]; then
        echo "  MANUAL: $root/$name is a real directory. Back it up, remove it, then re-run." >&2
        rc=1
      else
        rm -f "$link"
        ln -s "$want" "$link"
        echo "  repaired: $root/$name -> $want"
      fi
    done
  done
  return "$rc"
}

case "$TARGET" in
  codex)
    install_user "${CODEX_HOME:-$HOME/.codex}/skills" "Codex"
    echo "Restart Codex, then invoke it with: Use \$game-factory to create a new mobile portrait arcade game."
    ;;
  claude)
    install_user "${CLAUDE_HOME:-$HOME/.claude}/skills" "Claude Code"
    echo "Restart Claude Code, then invoke it with /game-factory or ask: 새 게임 만들어줘."
    ;;
  repo)
    repair_repo_links
    echo "Repo-level skills are symlinks to skills/ — Claude Code and Codex read one source."
    ;;
  all)
    repair_repo_links
    install_user "${CODEX_HOME:-$HOME/.codex}/skills" "Codex"
    install_user "${CLAUDE_HOME:-$HOME/.claude}/skills" "Claude Code"
    echo "Restart Codex (\$game-factory) and Claude Code (/game-factory) to pick up the skills."
    ;;
  --dest)
    DEST="${2:-}"
    if [[ -z "$DEST" ]]; then echo "Usage: $0 --dest <skills-dir>" >&2; exit 1; fi
    install_user "$DEST" "custom"
    echo "Restart the host so it rescans $DEST."
    ;;
  *)
    echo "Usage: $0 [codex|claude|repo|all|--dest <path>]" >&2
    exit 1
    ;;
esac
