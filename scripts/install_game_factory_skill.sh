#!/usr/bin/env bash
set -euo pipefail

# Install the game-factory skill for Codex and/or Claude Code.
# Usage: ./scripts/install_game_factory_skill.sh [codex|claude|all]   (default: codex)

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/skills/game-factory"
TARGET="${1:-codex}"

if [[ ! -f "$SRC/SKILL.md" ]]; then
  echo "Missing skill source: $SRC/SKILL.md" >&2
  exit 1
fi

install_to() {
  local dest_root="$1" label="$2"
  local dest="$dest_root/game-factory"
  mkdir -p "$dest_root"
  rm -rf "$dest"
  cp -R "$SRC" "$dest"
  echo "Installed game-factory skill to: $dest ($label)"
}

case "$TARGET" in
  codex)
    install_to "${CODEX_HOME:-$HOME/.codex}/skills" "Codex"
    echo "Restart Codex, then invoke it with: Use \$game-factory to create a new mobile portrait arcade game."
    ;;
  claude)
    install_to "${CLAUDE_HOME:-$HOME/.claude}/skills" "Claude Code"
    echo "Restart Claude Code, then invoke it with /game-factory or ask: 새 게임 만들어줘."
    ;;
  all)
    install_to "${CODEX_HOME:-$HOME/.codex}/skills" "Codex"
    install_to "${CLAUDE_HOME:-$HOME/.claude}/skills" "Claude Code"
    echo "Restart Codex (\$game-factory) and Claude Code (/game-factory) to pick up the skill."
    ;;
  *)
    echo "Usage: $0 [codex|claude|all]" >&2
    exit 1
    ;;
esac
