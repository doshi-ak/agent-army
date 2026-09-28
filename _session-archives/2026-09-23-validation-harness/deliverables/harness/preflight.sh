#!/usr/bin/env bash
# Fail fast and specifically. Every dependency the harness uses is checked here,
# including the exact CLI flags, so a run never dies halfway with a vague error.
set -uo pipefail

FAIL=0
ok()   { printf '  ok    %s\n' "$1"; }
bad()  { printf '  FAIL  %s\n' "$1"; FAIL=1; }
warn() { printf '  warn  %s\n' "$1"; }

echo "preflight: binaries"
for b in claude python3 git diff find; do
  if command -v "$b" >/dev/null 2>&1; then ok "$b"; else bad "$b not on PATH"; fi
done
# jq is not used by the harness itself, only convenient for inspecting artifacts.
if command -v jq >/dev/null 2>&1; then ok "jq (optional)"; else warn "jq absent; artifacts are still readable with python3 -m json.tool"; fi

echo "preflight: claude version"
if command -v claude >/dev/null 2>&1; then
  CV="$(claude --version 2>/dev/null | head -1)"
  ok "claude --version -> ${CV:-unknown}"
else
  bad "claude CLI missing; install from https://www.npmjs.com/package/@anthropic-ai/claude-code"
fi

echo "preflight: required CLI flags"
HELP="$(claude --help 2>/dev/null || true)"
for flag in --print --output-format --json-schema --allowed-tools --permission-mode --max-turns --settings --append-system-prompt; do
  if grep -q -- "$flag" <<<"$HELP"; then ok "$flag"
  else
    # --allowedTools and --allowed-tools have both spellings across versions
    alt="${flag//-/}"
    if grep -qi -- "${alt}" <<<"$HELP"; then warn "$flag not literal; a variant spelling is present"
    else bad "$flag unsupported by this claude version"; fi
  fi
done

echo "preflight: skill under test"
SKILL="${SKILL_UNDER_TEST:-$HOME/.claude/skills/troubleshoot}"
if [[ -f "$SKILL/SKILL.md" ]]; then ok "SKILL.md at $SKILL"
else bad "no SKILL.md at $SKILL (set SKILL_UNDER_TEST to override)"; fi

echo "preflight: canonical defect-memory root"
CANON="${DEFECT_MEMORY_ROOT:-$HOME/Claude/Code/_defect-memory}"
if [[ -d "$(dirname "$CANON")" ]]; then ok "parent of $CANON exists"
else warn "$(dirname "$CANON") missing; C13 will create it on first run"; fi

echo "preflight: authentication"
if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then ok "ANTHROPIC_API_KEY set"
elif claude auth status >/dev/null 2>&1; then ok "claude auth status reports logged in"
else bad "no ANTHROPIC_API_KEY and claude auth status not clean"; fi

echo "preflight: harness files"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for f in cases.json conditions.json criteria.json schemas/diagnostic_report.schema.json \
         build_sandbox.sh run_case.sh evaluate.py build_report.py gate.py fs_manifest.py; do
  [[ -f "$HERE/$f" ]] && ok "$f" || bad "$f missing"
done

echo
if [[ $FAIL -eq 0 ]]; then echo "preflight: PASS"; exit 0
else echo "preflight: FAIL - resolve the items above before running the matrix"; exit 1; fi
