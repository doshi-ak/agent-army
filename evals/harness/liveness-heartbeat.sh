#!/bin/bash
# Evelyn — 5-minute liveness heartbeat. Stamps STATE_Evelyn.md's heartbeat line
# and snapshots every peer STATE file's freshness (flags >2h stale as likely-dead,
# per RULES HARD GATES). Read-only on peers; writes only Evelyn's own files.
set -u
COORD="$HOME/Claude/Code/MCP-Builder/_coordination"
STATE="$COORD/STATE_Evelyn.md"
SNAP="$COORD/STATE_Evelyn.liveness.md"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
NOW_S="$(date -u +%s)"

{
  echo "# Peer liveness — snapshot by Evelyn's heartbeat"
  echo "_Updated: $NOW (auto, every 5 min)_"
  echo ""
  echo "| Session | STATE mtime (UTC) | Age | Flag |"
  echo "|---|---|---|---|"
  for f in "$COORD"/STATE_*.md; do
    [ "$f" = "$SNAP" ] && continue
    name="$(basename "$f" .md | sed 's/^STATE_//')"
    m_s="$(stat -f %m "$f" 2>/dev/null || echo "$NOW_S")"
    age=$(( (NOW_S - m_s) / 60 ))
    flag="alive"
    [ "$age" -gt 120 ] && flag="⚠️ STALE >2h — likely dead"
    printf "| %s | %s | %sm | %s |\n" "$name" "$(date -u -r "$m_s" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null)" "$age" "$flag"
  done
} > "$SNAP"

# Bump Evelyn's own heartbeat line (create/replace a single marked line).
if grep -q '^_Heartbeat:' "$STATE" 2>/dev/null; then
  tmp="$(mktemp)"; sed "s|^_Heartbeat:.*|_Heartbeat: $NOW (auto, every 5 min)_|" "$STATE" > "$tmp" && mv "$tmp" "$STATE"
else
  printf '\n_Heartbeat: %s (auto, every 5 min)_\n' "$NOW" >> "$STATE"
fi
