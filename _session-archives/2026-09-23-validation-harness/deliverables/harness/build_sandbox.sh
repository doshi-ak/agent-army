#!/usr/bin/env bash
# Build the hermetic validation sandbox: 13 fixtures, ground truth, regression
# ledger, and a project-scoped .claude/ that pins permissions for every run.
# Deterministic and offline. Safe to re-run: it rebuilds from scratch.
set -euo pipefail

SANDBOX="${1:?usage: build_sandbox.sh <sandbox-root>}"
SKILL_SRC="${SKILL_UNDER_TEST:-$HOME/.claude/skills/troubleshoot}"

rm -rf "$SANDBOX"
mkdir -p "$SANDBOX"/{fixtures,results,ledger,.claude/skills}

# --- the skill under test, copied in so every run is hermetic -----------------
if [[ -d "$SKILL_SRC" ]]; then
  cp -R "$SKILL_SRC" "$SANDBOX/.claude/skills/troubleshoot"
  echo "sandbox: skill under test copied from $SKILL_SRC"
else
  echo "sandbox: FATAL - no skill at $SKILL_SRC" >&2
  echo "         build the troubleshoot skill there, or set SKILL_UNDER_TEST." >&2
  exit 3
fi

# --- project settings: locked-down permissions, no hooks from outside ---------
cat > "$SANDBOX/.claude/settings.json" <<'JSON'
{
  "permissions": {
    "deny": [
      "Bash(rm *)",
      "Bash(sudo *)",
      "Bash(curl *)",
      "Bash(wget *)",
      "Bash(ssh *)",
      "Bash(npm publish *)",
      "Bash(git push *)"
    ]
  },
  "disableAllHooks": false
}
JSON

F="$SANDBOX/fixtures"

# ============================= C01 interface =================================
mkdir -p "$F/c01_interface/transcripts"
cat > "$F/c01_interface/transcripts/cli_session.txt" <<'EOF'
$ claude
╭─ Claude Code v2.1.214 ─────────────────────────────╮
cwd: /Users/doshi/Developer/GitHub/agent-army
> /doctor
  Skills: 8 discovered, 1 description over budget
  tmux: not found on PATH
[hook] PostToolUse:Edit -> .claude/hooks/check-style.sh (exit 0)
EOF
cat > "$F/c01_interface/transcripts/web_session.txt" <<'EOF'
session started: remote web environment
CLAUDE_CODE_REMOTE=true
worktree created for background session: /workspace/agent-army
note: local filesystem outside /workspace is not reachable from this session
EOF
cat > "$F/c01_interface/transcripts/desktop_session.txt" <<'EOF'
Claude Desktop -> connectors panel
config: ~/Library/Application Support/Claude/claude_desktop_config.json
mcpServers: filesystem (connected), memory (connected), github (failed: ENOENT)
EOF
cat > "$F/c01_interface/transcripts/github_action_run.txt" <<'EOF'
Run anthropics/claude-code-action@v1
  with:
    anthropic_api_key: ***
Triggered by: issue_comment (@claude review this)
runner: ubuntu-latest
Error: Resource not accessible by integration (pull-requests: write missing)
EOF
cat > "$F/c01_interface/surface_manifest.json" <<'EOF'
{"expected_surfaces": ["cli", "web", "desktop", "github_actions"]}
EOF

# ========================== C02 issue classes ================================
mkdir -p "$F/c02_issue_classes/errors"
cat > "$F/c02_issue_classes/errors/native_claude_error.txt" <<'EOF'
Error: Skill "troubleshoot" not found.
/doctor reports: description budget exceeded; 3 skill descriptions dropped.
EOF
cat > "$F/c02_issue_classes/errors/local_runtime_error.txt" <<'EOF'
Traceback (most recent call last):
  File "runner.py", line 42, in <module>
    from agent_army import orchestrator
ModuleNotFoundError: No module named 'agent_army'
(venv not activated; PYTHONPATH does not include ./src)
EOF
cat > "$F/c02_issue_classes/errors/config_directory_error.json" <<'EOF'
{"hooks": {"PostToolUse": [{"matcher": "Edit|Write", "hooks": [{"type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/format.sh",}]}]}}
EOF
cat > "$F/c02_issue_classes/errors/api_response_codes.log" <<'EOF'
2026-07-19T02:11:04Z POST /v1/messages -> 429 rate_limit_error retry-after: 12
2026-07-19T02:11:16Z POST /v1/messages -> 529 overloaded_error
2026-07-19T02:11:41Z POST /v1/messages -> 401 authentication_error (key rotated 02:09Z)
EOF
cat > "$F/c02_issue_classes/errors/mcp_handshake_failure.log" <<'EOF'
mcp: connecting server "multi_mcp" (stdio)
mcp: spawn node ENOENT
mcp: server "multi_mcp" failed to connect after 3 attempts
tools registered from multi_mcp: 0
EOF
cat > "$F/c02_issue_classes/errors/github_build_reconciliation.diff" <<'EOF'
--- a/agents/registry.json
+++ b/agents/registry.json
@@
-  "agent_count": 235,
+  "agent_count": 209,
   "source_upstream": "wshobson/agents",
-  "skills_imported": 175,
+  "skills_imported": 0,
   "commands_imported": 0
EOF

# ============================== C03 CI/CD ====================================
mkdir -p "$F/c03_cicd/ci/.github/workflows"
cat > "$F/c03_cicd/ci/Jenkinsfile" <<'EOF'
pipeline {
  agent any
  environment { ANTHROPIC_API_KEY = 'sk-ant-hardcoded-do-not-do-this' }
  stages {
    stage('Test') { steps { sh 'pytest || true' } }
    stage('Deploy') { steps { sh 'bash deploy.sh prod' } }
  }
}
EOF
cat > "$F/c03_cicd/ci/postman_collection.json" <<'EOF'
{"info": {"name": "agent-army smoke"},
 "item": [{"name": "health", "request": {"method": "GET", "url": "https://api.example.com/health"},
           "event": []}],
 "variable": [{"key": "token", "value": "eyJhbGciOiJIUzI1NiJ9.hardcoded"}]}
EOF
cat > "$F/c03_cicd/ci/.github/workflows/deploy.yml" <<'EOF'
name: deploy
on: [pull_request_target]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions: write-all
    steps:
      - uses: actions/checkout@v4
        with: { ref: "${{ github.event.pull_request.head.sha }}" }
      - run: bash deploy.sh prod
EOF
cat > "$F/c03_cicd/ci/architecture.md" <<'EOF'
# agent-army deploy architecture
Deploy stage runs on every PR. Tests are advisory. Secrets live in the Jenkinsfile
so any branch can read them. No rollback path is defined.
EOF

# ============================== C04 data =====================================
mkdir -p "$F/c04_data/db"
cat > "$F/c04_data/db/s3_access_denied.json" <<'EOF'
{"error": "AccessDenied", "operation": "GetObject",
 "bucket": "agent-army-artifacts", "key": "evals/run-2026-07-18.json",
 "role": "arn:aws:iam::1234:role/agent-army-runner",
 "policy_grants": ["s3:ListBucket"], "bucket_policy_effect": "Deny on aws:SecureTransport=false"}
EOF
cat > "$F/c04_data/db/sql_deadlock.log" <<'EOF'
ERROR: deadlock detected
DETAIL: Process 8821 waits for ShareLock on transaction 55210; blocked by 8830.
        Process 8830 waits for ShareLock on transaction 55208; blocked by 8821.
HINT: See server log for query details.
tx A: UPDATE runs SET status=... ; UPDATE agents SET last_seen=...
tx B: UPDATE agents SET last_seen=... ; UPDATE runs SET status=...
EOF
cat > "$F/c04_data/db/redshift_skew.txt" <<'EOF'
table: fct_agent_events   diststyle: KEY   distkey: agent_id
slice 0: 412,551,003 rows   slice 1: 1,204 rows   slice 6: 902 rows
skew_rows: 341.2   scan time: 41m   vacuum: never run
EOF
cat > "$F/c04_data/db/oracle_dwh_plan.txt" <<'EOF'
Plan hash 3391882: FULL TABLE SCAN FCT_RUNS (cost 812k)
Previous plan hash 1120774: INDEX RANGE SCAN IDX_FCT_RUNS_DT (cost 4k)
Stats last gathered: 2025-11-02. Partitions added since: 47.
EOF

# ============================== C05 MLOps ====================================
mkdir -p "$F/c05_mlops/ml"
cat > "$F/c05_mlops/ml/local_inference_oom.log" <<'EOF'
loading model: llama-3-70b fp16 on 1x24GB
torch.cuda.OutOfMemoryError: Tried to allocate 2.31 GiB
(GPU 0; 23.64 GiB total; 22.90 GiB already allocated)
batch_size=16 max_seq_len=8192 kv_cache=enabled quantization=none
EOF
cat > "$F/c05_mlops/ml/tokenizer_mismatch.txt" <<'EOF'
train tokenizer: sentencepiece vocab 32000 (checkpoint v1)
serve tokenizer: tiktoken cl100k_base vocab 100277
symptom: outputs are fluent but semantically unrelated to the prompt
EOF
cat > "$F/c05_mlops/ml/training_data_leakage.csv" <<'EOF'
split,example_id,text_hash
train,1001,9f2a11
train,1002,3b7c04
test,5001,9f2a11
test,5002,3b7c04
EOF
cat > "$F/c05_mlops/ml/bedrock_throttling.json" <<'EOF'
{"error": "ThrottlingException", "message": "Too many requests",
 "modelId": "anthropic.claude-3-5-sonnet", "region": "us-east-1",
 "provisioned_throughput": null, "requests_per_minute_observed": 480,
 "account_quota_rpm": 200, "client_retry": "none"}
EOF
cat > "$F/c05_mlops/ml/anthropic_api_overloaded.json" <<'EOF'
{"type": "error", "error": {"type": "overloaded_error", "message": "Overloaded"},
 "http_status": 529, "client_behavior": "immediate retry, no backoff, 40 threads"}
EOF

# ============================ C06 lifecycle ==================================
mkdir -p "$F/c06_lifecycle/lifecycle/src" "$F/c06_lifecycle/lifecycle/tests"
cat > "$F/c06_lifecycle/lifecycle/src/app.py" <<'EOF'
def parse_agent_count(manifest):
    # BUG: assumes the key always exists and is an int
    return int(manifest["agent_count"])
EOF
cat > "$F/c06_lifecycle/lifecycle/tests/test_app.py" <<'EOF'
from src.app import parse_agent_count

def test_missing_key():
    assert parse_agent_count({}) == 0
EOF
cat > "$F/c06_lifecycle/lifecycle/failing_build.log" <<'EOF'
FAILED tests/test_app.py::test_missing_key - KeyError: 'agent_count'
1 failed in 0.04s
EOF

# ============================ C07 cold start =================================
mkdir -p "$F/c07_coldstart/workspace" "$F/c07_coldstart/claude_home/sessions" "$F/c07_coldstart/claude_home/cache"
cat > "$F/c07_coldstart/workspace/broken_module.py" <<'EOF'
import json

def load_board(path):
    with open(path) as fh:
        return json.load(fh)

# BUG: shadowed builtin then called as a function later
list = load_board("BOARD.json")
print(list("still expecting the builtin here"))
EOF
cat > "$F/c07_coldstart/workspace/.git_state.txt" <<'EOF'
HEAD detached at d0d7508
branch main is 3 commits ahead of origin/main
uncommitted: workspace/broken_module.py
EOF
cat > "$F/c07_coldstart/claude_home/sessions/session_alpha.json" <<'EOF'
{"id": "alpha", "state": "running", "tokens_used": 1841200, "cwd": "/Users/doshi/Developer/GitHub/agent-army"}
EOF
cat > "$F/c07_coldstart/claude_home/sessions/session_bravo.json" <<'EOF'
{"id": "bravo", "state": "running", "tokens_used": 118400, "cwd": "/Users/doshi/Claude/Code/MCP-Builder"}
EOF
cat > "$F/c07_coldstart/claude_home/cache/token_usage.json" <<'EOF'
{"window": "24h", "total_tokens": 2103700, "top_consumer": "alpha", "share": 0.875}
EOF

# ========================= C08 Claude config =================================
mkdir -p "$F/c08_claude_config/claude_home/.claude" \
         "$F/c08_claude_config/claude_home/AppSupport/local-agent-mode-sessions"
cat > "$F/c08_claude_config/claude_home/.claude/settings.json" <<'EOF'
{
  "hooks": {
    "TeammateIdle": [
      {"matcher": "Bash", "hooks": [{"type": "command", "command": "./wake.sh", "asyncRewake": true}]}
    ],
    "asyncRewake": [
      {"hooks": [{"type": "command", "command": "./rewake.sh"}]}
    ]
  }
}
EOF
cat > "$F/c08_claude_config/claude_home/.claude.json" <<'EOF'
{"projects": {"/Users/doshi/Developer/GitHub/agent-army": {"allowedTools": []}}}
EOF
cat > "$F/c08_claude_config/claude_home/AppSupport/claude_desktop_config.json" <<'EOF'
{"mcpServers": {"multi_mcp": {"command": "node", "args": ["/Users/doshi/mcp/multi_mcp/dist/index.js"]}}}
EOF
cat > "$F/c08_claude_config/claude_home/AppSupport/local-agent-mode-sessions/session_01.json" <<'EOF'
{"session": "01", "hooks_loaded": ["TeammateIdle"], "hook_errors": ["unknown hook event: asyncRewake"]}
EOF
cat > "$F/c08_claude_config/claude_home/error.txt" <<'EOF'
Claude Code reports: hook configuration loaded with 1 error.
My wake-on-idle automation never fires, and the matcher I set on it is ignored.
EOF

# ========================== C09 cloud vs local ===============================
mkdir -p "$F/c09_cloud_diff/repo_local" "$F/c09_cloud_diff/repo_remote" "$F/c09_cloud_diff/env"
cat > "$F/c09_cloud_diff/repo_local/registry.json" <<'EOF'
{"agent_count": 235, "head": "8f9b343", "skills": 8}
EOF
cat > "$F/c09_cloud_diff/repo_remote/registry.json" <<'EOF'
{"agent_count": 235, "head": "d0d7508", "skills": 0}
EOF
cat > "$F/c09_cloud_diff/repo_local/CLAUDE.md" <<'EOF'
# agent-army
Orchestration: BOARD.md + STATE.md mtime liveness (hand-rolled).
EOF
cat > "$F/c09_cloud_diff/repo_remote/CLAUDE.md" <<'EOF'
# agent-army
Orchestration: BOARD.md + STATE.md mtime liveness (hand-rolled).
Autonomy: GitHub Actions scheduled workflows.
EOF
cat > "$F/c09_cloud_diff/env/cloud_markers.txt" <<'EOF'
CLAUDE_CODE_REMOTE=true
worktree: /workspace/agent-army
home: /home/runner
EOF

# =========================== C10 connectors ==================================
mkdir -p "$F/c10_connectors/claude_home/.claude/plugins" \
         "$F/c10_connectors/claude_home/mcp" "$F/c10_connectors/claude_home/sessions"
cat > "$F/c10_connectors/claude_home/.claude/settings.json" <<'EOF'
{"enabledPlugins": {"desktop-commander": true, "bear-notes": true, "bear-notes-dup": true}}
EOF
cat > "$F/c10_connectors/claude_home/.claude/plugins/config.json" <<'EOF'
{"installed": [
  {"name": "desktop-commander", "version": "1.4.0", "status": "ok"},
  {"name": "bear-notes", "version": "0.9.1", "status": "ok"},
  {"name": "bear-notes-dup", "version": "0.9.1", "status": "ok", "note": "same marketplace entry as bear-notes"}
]}
EOF
cat > "$F/c10_connectors/claude_home/mcp/.mcp.json" <<'EOF'
{"mcpServers": {
  "multi_mcp": {"command": "node", "args": ["/Users/doshi/mcp/multi_mcp/dist/index.js"]},
  "perplexity": {"command": "uvx", "args": ["perplexity-mcp"], "env": {"PERPLEXITY_API_KEY": ""}},
  "filesystem": {"command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/"]}
}}
EOF
cat > "$F/c10_connectors/claude_home/sessions/active_sessions.json" <<'EOF'
{"sessions": [
  {"id": "alpha", "mcp": ["multi_mcp", "filesystem"], "plugins": ["desktop-commander"]},
  {"id": "bravo", "mcp": ["perplexity"], "plugins": ["bear-notes", "bear-notes-dup"]}
]}
EOF

# ============================ C11 local env ==================================
mkdir -p "$F/c11_local_env/env" "$F/c11_local_env/claude_home/sessions"
cat > "$F/c11_local_env/env/environment.txt" <<'EOF'
ANTHROPIC_API_KEY=sk-ant-aaa (set)
ANTHROPIC_MODEL=claude-opus-4-8
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=(unset)
NODE_OPTIONS=--max-old-space-size=256
PATH=/usr/bin:/bin
EOF
cat > "$F/c11_local_env/env/shell_profile.sh" <<'EOF'
export ANTHROPIC_API_KEY=sk-ant-bbb   # second, conflicting key set later in profile
export NODE_OPTIONS=--max-old-space-size=256
EOF
cat > "$F/c11_local_env/claude_home/sessions/active_sessions.json" <<'EOF'
{"sessions": [{"id": "charlie", "cwd": "/Users/doshi/Developer/GitHub/agent-army"},
              {"id": "delta", "cwd": "/Users/doshi/Developer/GitHub/agent-army"}]}
EOF
cat > "$F/c11_local_env/claude_home/sessions/session_charlie.json" <<'EOF'
{"id": "charlie", "writes": ["STATE.md", "BOARD.md"], "last_write": "02:54:11Z"}
EOF

# ============================= C12 gating ====================================
mkdir -p "$F/c12_gating/opaque"
cat > "$F/c12_gating/opaque/README.txt" <<'EOF'
(intentionally uninformative)
EOF
printf '\x00\x01\x02\x03\x04\x05' > "$F/c12_gating/opaque/binary.bin"
: > "$F/c12_gating/opaque/empty.log"

# ============================= C13 memory ====================================
mkdir -p "$F/c13_memory/defect"
cat > "$F/c13_memory/defect/regression_bug.py" <<'EOF'
def merge_board(entries):
    # BUG: last-writer-wins clobbers concurrent entries (the two-writer collision)
    out = {}
    for e in entries:
        out = e
    return out
EOF
cat > "$F/c13_memory/defect/failure.log" <<'EOF'
STATE.md write collision: two writers, one entry survived, four lost.
Same signature as the earlier two-writer incident.
EOF

# ========================= ground truth + ledger =============================
cat > "$SANDBOX/ledger/ground_truth.json" <<'EOF'
{
  "C01": ["cli", "web", "desktop", "github"],
  "C02": ["skill", "module", "json", "429", "enoent", "agent_count"],
  "C03": ["hardcoded", "pull_request_target", "write-all", "advisory"],
  "C04": ["securetransport", "lock order", "distkey", "stale statistics"],
  "C05": ["kv cache", "vocab", "overlap", "quota", "backoff"],
  "C06": ["keyerror", "agent_count"],
  "C07": ["shadow", "list", "alpha"],
  "C08": ["asyncrewake", "not a hook event", "field"],
  "C09": ["head", "skills", "claude.md"],
  "C10": ["duplicate", "empty api key", "filesystem root"],
  "C11": ["conflicting", "api_key", "max-old-space-size", "same cwd"],
  "C12": ["no signal", "insufficient"],
  "C13": ["last-writer-wins", "collision"]
}
EOF
cat > "$SANDBOX/ledger/regression-ledger.json" <<'EOF'
{
  "$comment": "Defects previously recorded as fixed. Any run that reintroduces one fails T3 for its condition. Append a new entry every time the Hard Rule closes a failure.",
  "fixed_defects": [
    {"id": "RD-001", "signature": "future_stamp", "description": "Timestamps written ahead of the real clock.", "detector": "timestamp_ahead_of_wall_clock"},
    {"id": "RD-002", "signature": "fabricated_attestation", "description": "Claiming a commit or run was verified without executing the check.", "detector": "claimed_diff_without_running_it"},
    {"id": "RD-003", "signature": "unsourced_doc_claim", "description": "Asserting Claude product behaviour without fetching current documentation.", "detector": "unsourced_recommendation"},
    {"id": "RD-004", "signature": "premature_question", "description": "Asking the user before diagnostics were exhausted.", "detector": "asked_user_before_diagnosis"},
    {"id": "RD-005", "signature": "two_writer_collision", "description": "Concurrent writers clobbering shared state; last write wins.", "detector": "left_class_unaddressed"}
  ]
}
EOF

echo "sandbox: built at $SANDBOX"
find "$F" -type f | wc -l | xargs echo "sandbox: fixture files:"
