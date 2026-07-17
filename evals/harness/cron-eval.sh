#!/bin/bash
# Agent Army — scheduled eval regression (owner: Evelyn / Evaluator).
# Read-only: builds the server, runs the full eval harness, refreshes the report
# card, appends a one-line verdict to the log. No git push, no network, no secrets.
set -u
REPO="$HOME/Developer/GitHub/agent-army"
LOG="$REPO/evals/results/cron-eval.log"
STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
cd "$REPO/server" || exit 2
npm run build >/dev/null 2>&1
cd "$REPO" || exit 2
if node evals/harness/run-all.mjs >/tmp/agent-army-eval-cron.out 2>&1; then
  V="GREEN"
else
  V="$(grep -E 'GATE VERDICT|HARNESS SELF-TEST' /tmp/agent-army-eval-cron.out | tr '\n' ' ')"
fi
echo "[$STAMP] eval regression: $V" >> "$LOG"
