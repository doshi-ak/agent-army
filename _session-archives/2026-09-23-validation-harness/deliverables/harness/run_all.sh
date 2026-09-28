#!/usr/bin/env bash
# Run the 13x5 validation matrix end to end.
#
#   bash harness/run_all.sh                      # full 65-case matrix
#   bash harness/run_all.sh --only C07-T3,C13-T1 # specific cases
#   bash harness/run_all.sh --condition C08      # all five criteria for one condition
#   bash harness/run_all.sh --dry-run            # plan only, no model calls
#   bash harness/run_all.sh --resume             # skip cases that already passed
#
# Environment:
#   SKILL_UNDER_TEST     default $HOME/.claude/skills/troubleshoot
#   SANDBOX_ROOT         default ./.sandbox
#   GUARDED_PATHS        colon-separated trees that must not change (see run_case.sh)
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
SANDBOX="${SANDBOX_ROOT:-$ROOT/.sandbox}"

ONLY=""; CONDITION=""; DRY=0; RESUME=0; SKIP_PREFLIGHT=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --only) ONLY="$2"; shift 2 ;;
    --condition) CONDITION="$2"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    --resume) RESUME=1; shift ;;
    --skip-preflight) SKIP_PREFLIGHT=1; shift ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    *) echo "run_all: unknown option $1" >&2; exit 2 ;;
  esac
done

echo "=== agent-army validation matrix ==="
echo "sandbox: $SANDBOX"

if [[ $SKIP_PREFLIGHT -eq 0 ]]; then
  bash "$HERE/preflight.sh" || { echo "run_all: aborting on preflight failure"; exit 1; }
fi

python3 "$HERE/gen_cases.py"

# --- select cases ------------------------------------------------------------
mapfile -t CASE_IDS < <(python3 - "$HERE/cases.json" "$ONLY" "$CONDITION" <<'PY'
import json, sys
cases = json.load(open(sys.argv[1]))["cases"]
only = [c.strip() for c in sys.argv[2].split(",") if c.strip()]
cond = sys.argv[3].strip()
for c in cases:
    if only and c["case_id"] not in only:
        continue
    if cond and c["condition_id"] != cond:
        continue
    print(c["case_id"])
PY
)
echo "selected: ${#CASE_IDS[@]} case(s)"

if [[ $DRY -eq 1 ]]; then
  printf '  %s\n' "${CASE_IDS[@]}"
  echo "run_all: dry run, no model calls made"
  exit 0
fi

# --- build sandbox (preserve results on resume) ------------------------------
if [[ $RESUME -eq 1 && -d "$SANDBOX/results" ]]; then
  echo "run_all: resuming, existing results preserved"
else
  bash "$HERE/build_sandbox.sh" "$SANDBOX" || exit 3
fi
mkdir -p "$SANDBOX/results"

# --- execute -----------------------------------------------------------------
PASSED=0; FAILED=0; SKIPPED=0; i=0
for CID in "${CASE_IDS[@]}"; do
  i=$((i+1))
  if [[ $RESUME -eq 1 ]]; then
    PRIOR="$(python3 - "$HERE/cases.json" "$CID" "$SANDBOX" <<'PY'
import json, os, sys
c = next(x for x in json.load(open(sys.argv[1]))["cases"] if x["case_id"] == sys.argv[2])
p = os.path.join(sys.argv[3], c["artifact"])
print(json.load(open(p))["verdict"] if os.path.exists(p) else "NONE")
PY
)"
    if [[ "$PRIOR" == "PASS" ]]; then
      echo "[$i/${#CASE_IDS[@]}] $CID: already PASS, skipping"
      SKIPPED=$((SKIPPED+1)); PASSED=$((PASSED+1)); continue
    fi
  fi

  echo "[$i/${#CASE_IDS[@]}] $CID: running"
  bash "$HERE/run_case.sh" "$CID" "$SANDBOX"
  if python3 "$HERE/evaluate.py" "$CID" "$SANDBOX"; then
    PASSED=$((PASSED+1))
  else
    FAILED=$((FAILED+1))
  fi
done

echo
echo "run_all: $PASSED passed, $FAILED failed, $SKIPPED skipped as already-passing"

python3 "$HERE/build_report.py" "$SANDBOX"
python3 "$HERE/gate.py" "$SANDBOX"
GATE_RC=$?

echo
echo "artifacts:"
echo "  $SANDBOX/results/REPORT.md"
echo "  $SANDBOX/results/report.html"
echo "  $SANDBOX/results/results.json"
echo "  $SANDBOX/results/gate.json"
echo "  $SANDBOX/results/<case-id>/  (per-case raw envelopes, transcripts, fs manifests)"
exit $GATE_RC
