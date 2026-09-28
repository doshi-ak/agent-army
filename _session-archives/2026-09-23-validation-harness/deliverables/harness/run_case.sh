#!/usr/bin/env bash
# Execute one case of the 65-case matrix and capture every artifact the
# evaluator needs. Never fails the whole run on a case failure: it records the
# outcome and exits 0 so run_all.sh can complete the matrix.
#
#   run_case.sh <case-id> <sandbox-root>
set -uo pipefail

CASE_ID="${1:?usage: run_case.sh <case-id> <sandbox-root>}"
SANDBOX="${2:?usage: run_case.sh <case-id> <sandbox-root>}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

OUT="$SANDBOX/results/$CASE_ID"
mkdir -p "$OUT"

# --- read the case definition ------------------------------------------------
read_case() { python3 - "$HERE/cases.json" "$CASE_ID" "$1" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
case = next(c for c in data["cases"] if c["case_id"] == sys.argv[2])
v = case[sys.argv[3]]
print(v if isinstance(v, str) else json.dumps(v))
PY
}

FIXTURE="$(read_case fixture)"
PROBE="$(read_case probe)"
SECOND_PROBE="$(read_case second_probe)"
RUN_MODE="$(read_case run_mode)"
PERM_MODE="$(read_case permission_mode)"
MAX_TURNS="$(read_case max_turns)"
ALLOWED="$(read_case allowed_tools)"

# --- per-case working directory ---------------------------------------------
WORK="$SANDBOX/runs/$CASE_ID"
rm -rf "$WORK"; mkdir -p "$WORK"
cp -R "$SANDBOX/fixtures/$FIXTURE/." "$WORK/"
cp -R "$SANDBOX/.claude" "$WORK/.claude"
mkdir -p "$WORK/_defect-memory"
export DEFECT_MEMORY_ROOT="$WORK/_defect-memory"

# --- guarded paths: everything the run must not touch ------------------------
GUARDED_DEFAULT="$HOME/.claude:$HOME/.claude.json:$HOME/Library/Application Support/Claude:$HOME/Developer/GitHub/agent-army:$HOME/Claude/Code/MCP-Builder/_coordination"
IFS=':' read -r -a GUARDED <<< "${GUARDED_PATHS:-$GUARDED_DEFAULT}"
python3 "$HERE/fs_manifest.py" write "$OUT/fs-before.sha" "${GUARDED[@]}" >/dev/null 2>&1

# --- flag spelling differs across versions -----------------------------------
HELP="$(claude --help 2>/dev/null || true)"
if grep -q -- "--allowed-tools" <<<"$HELP"; then TOOLS_FLAG="--allowed-tools"; else TOOLS_FLAG="--allowedTools"; fi

SCHEMA="$(cat "$HERE/schemas/diagnostic_report.schema.json")"
CONTRACT="$HERE/contract.md"

invoke_json() {  # $1 = prompt, $2 = output file
  ( cd "$WORK" && \
    claude -p "$1" \
      --output-format json \
      --json-schema "$SCHEMA" \
      "$TOOLS_FLAG" "$ALLOWED" \
      --permission-mode "$PERM_MODE" \
      --max-turns "$MAX_TURNS" \
      --append-system-prompt "$(cat "$CONTRACT")" \
      > "$2" 2> "$OUT/stderr.log" )
  echo $?
}

invoke_stream() {  # $1 = prompt, $2 = output jsonl
  ( cd "$WORK" && \
    claude -p "$1" \
      --output-format stream-json --verbose \
      "$TOOLS_FLAG" "$ALLOWED" \
      --permission-mode "$PERM_MODE" \
      --max-turns "$MAX_TURNS" \
      --append-system-prompt "$(cat "$CONTRACT")" \
      > "$2" 2> "$OUT/stderr.log" )
  echo $?
}

START=$(date -u +%s)
case "$RUN_MODE" in
  json_schema)
    RC=$(invoke_json "$PROBE" "$OUT/run1.json")
    RC2="n/a"
    ;;
  double_run)
    RC=$(invoke_json "$PROBE" "$OUT/run1.json")
    RC2=$(invoke_json "$SECOND_PROBE" "$OUT/run2.json")
    ;;
  stream_json)
    RC=$(invoke_stream "$PROBE" "$OUT/transcript.jsonl")
    RC2="n/a"
    ;;
  *)
    echo "run_case: unknown run_mode $RUN_MODE" >&2; exit 2 ;;
esac
END=$(date -u +%s)

python3 "$HERE/fs_manifest.py" write "$OUT/fs-after.sha" "${GUARDED[@]}" >/dev/null 2>&1

# --- run metadata ------------------------------------------------------------
python3 - "$OUT/run-meta.json" "$CASE_ID" "$RUN_MODE" "$RC" "$RC2" "$START" "$END" "$WORK" <<'PY'
import json, sys
out, cid, mode, rc, rc2, start, end, work = sys.argv[1:9]
json.dump({
    "case_id": cid, "run_mode": mode,
    "exit_code_run1": int(rc) if rc.isdigit() else rc,
    "exit_code_run2": int(rc2) if rc2.isdigit() else rc2,
    "started_utc": int(start), "ended_utc": int(end),
    "duration_s": int(end) - int(start),
    "workdir": work,
}, open(out, "w"), indent=2)
PY

echo "run_case: $CASE_ID done (mode=$RUN_MODE rc=$RC rc2=$RC2 ${START}->${END})"
exit 0
