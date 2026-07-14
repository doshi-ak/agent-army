#!/usr/bin/env bash
# Install the agent superteam into a Claude Code agents directory.
# Agents are flattened (names are globally unique) so they work regardless of
# whether your Claude Code version scans .claude/agents/ recursively.
#
#   ./install.sh /path/to/project     # -> <project>/.claude/agents/
#   ./install.sh --global             # -> ~/.claude/agents/
#   ./install.sh --dry-run /path      # show what would be copied
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)/agents"
DRY=0
TARGET_ROOT=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    --global)  TARGET_ROOT="$HOME" ;;
    *)         TARGET_ROOT="$arg" ;;
  esac
done

if [[ -z "$TARGET_ROOT" ]]; then
  echo "usage: $0 [--global | <project-dir>] [--dry-run]" >&2
  exit 1
fi

DEST="$TARGET_ROOT/.claude/agents"
count=$(find "$SRC" -name '*.md' | wc -l | tr -d ' ')
echo "Installing $count agents -> $DEST"

if [[ "$DRY" -eq 1 ]]; then
  find "$SRC" -name '*.md' -exec basename {} \; | sort
  echo "(dry run — nothing copied)"
  exit 0
fi

mkdir -p "$DEST"
find "$SRC" -name '*.md' -exec cp {} "$DEST/" \;
echo "Done. $(find "$DEST" -name '*.md' | wc -l | tr -d ' ') agents now in $DEST"
