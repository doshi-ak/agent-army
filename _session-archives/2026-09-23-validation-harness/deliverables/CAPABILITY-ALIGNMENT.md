# Capability Alignment — the rough spec vs. what Claude Code actually does

Every claim below was checked against official documentation on **21 July 2026**. Where the rough spec and the docs disagree, the docs win and the spec has been adjusted. Where the rough spec was right, that is stated too.

Sources, all fetched this session:

- Hooks reference — https://code.claude.com/docs/en/hooks
- Agent teams — https://code.claude.com/docs/en/agent-teams
- Run Claude Code programmatically (headless) — https://code.claude.com/docs/en/headless
- Extend Claude with skills — https://code.claude.com/docs/en/skills
- Claude Code GitHub Actions — https://code.claude.com/docs/en/github-actions
- claude-code-action setup — https://github.com/anthropics/claude-code-action/blob/main/docs/setup.md

---

## 1. `asyncRewake` is not a hook event

The rough spec lists the native hooks to adopt as "TeammateIdle/asyncRewake/PostToolBatch/SessionStart". Three of those four are real events. `asyncRewake` is **a boolean field on a command hook handler**, not an event you can subscribe to:

> `asyncRewake` — If `true`, runs in the background and wakes Claude on exit code 2. Implies `async`.

A settings file with an `"asyncRewake"` key at the event level loads with an unknown-event error and silently never fires — which is exactly the failure C08's fixture seeds, and exactly the class of defect that would otherwise have been written into the build as a feature.

Correct usage:

```json
{
  "hooks": {
    "TeammateIdle": [
      { "hooks": [ { "type": "command", "command": "./wake.sh", "asyncRewake": true } ] }
    ]
  }
}
```

One more correction in the same fixture: `TeammateIdle` **does not support matchers**. A matcher set on it is silently ignored.

## 2. The three real events, and what they actually do

| Event | Fires | Can block? |
|---|---|---|
| `SessionStart` | Session begins or resumes. Matchers: `startup`, `resume`, `clear`, `compact`, `fork` | No — context only |
| `PostToolBatch` | After a full batch of parallel tool calls resolves, before the next model call. No matcher | **Yes** — exit 2 stops the agentic loop |
| `TeammateIdle` | An agent-team teammate is about to go idle. No matcher | **Yes** — exit 2 keeps the teammate working |

`TeammateIdle` is the native replacement for the hand-rolled STATE-mtime liveness check, and the rough spec was right to want it. But it only fires for **agent teams**, which is the next item.

`SessionStart` also carries `reloadSkills: true`, which re-scans skill directories after the hook completes — the supported way to install a skill and use it in the same session.

## 3. Agent teams are native now — and they cap the vision

The build hand-rolled BOARD.md, STATE-mtime liveness and Terminal spawns. Claude Code ships this natively, disabled by default:

```json
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
```

What you get for free: a shared task list at `~/.claude/tasks/{team-name}/`, per-agent mailboxes at `~/.claude/teams/{team-name}/inboxes/{agent-name}.json`, automatic message delivery, idle notification to the lead, file-locked task claiming, and dependency unblocking. Team name is `session-` plus the first eight characters of the session ID.

Also worth knowing: `TeamCreate` and `TeamDelete` **no longer exist**, and `team_name` on the Agent tool is accepted but ignored. Any orchestration logic in the build that calls those tools is dead code.

**Three limitations that bound the "agents can do anything, spawning sub-agents at will" vision:**

1. **No nested teams.** Teammates cannot spawn their own teammates; only the lead manages the team. The fleet is one level deep, not recursive.
2. **No session resumption for in-process teammates.** `/resume` and `/rewind` do not restore them, and the lead may try to message teammates that no longer exist. A fleet that survives a restart is not something you get from agent teams today.
3. **No background subagents from in-process teammates.** A teammate's background work cannot outlive the lead's process; asking for one returns an error.

These are not reasons to abandon the vision. They are the reasons Evelyn's evals need to assert the ceiling honestly rather than measuring against a capability that does not exist yet.

## 4. The human-gate guardrail is natively enforced

The rough spec wants every money, outbound and real-world action to pause for a human gate, and Wilbet's job is to verify the guardrail cannot be faked. The platform already enforces the hardest part:

> A teammate cannot approve a permission prompt or supply consent on your behalf, and a teammate that was denied an action cannot relay it to another teammate to bypass the check. In auto mode, the classifier treats an approval claim relayed from another agent as untrusted input rather than confirmation from you.

Teammate permission prompts surface **in the lead session**, and teammates inherit the lead's permission mode at spawn. So the guardrail evals should assert on this native behaviour — a relayed-approval attempt that gets refused is a *pass* — rather than only testing a hand-rolled guard that a future refactor could quietly remove. The one designed exception is plan approval, which the lead grants without prompting you.

## 5. The autonomy tier — mostly right, with a better credential path

The rough spec's ruling holds up: GitHub Actions is the tier that runs unattended in the cloud, and `/install-github-app` is real. Two refinements:

- **Workflow setup is optional.** As of v2.1.187 you can install just the GitHub App and skip the workflow and secret steps.
- **The "M6 credentials" blocker has a way around it.** Beyond `ANTHROPIC_API_KEY`, the action supports `CLAUDE_CODE_OAUTH_TOKEN` (Pro and Max users generate it with `claude setup-token`) and **Workload Identity Federation**, which exchanges the workflow's GitHub OIDC token for a short-lived Anthropic token — no static secret to create, store or rotate. WIF needs admin access to the Anthropic organisation, an issuer registered at `https://token.actions.githubusercontent.com`, and `id-token: write` on the workflow.

Least-privilege for the workflow is `contents: write`, `pull-requests: write`, `issues: write` — not the `write-all` that C03's fixture seeds.

## 6. What actually makes 65 auditable results possible

The rough spec asks for 65 verifiable technical results without saying how they get verified. These four mechanisms are what the harness is built on, and all four are current:

- **`--json-schema`** with `--output-format json` returns the answer in `structured_output` conforming to a schema you supply. This is the single feature that turns "read 65 transcripts" into "evaluate 65 typed objects". An invalid schema now fails loudly rather than silently returning unstructured text.
- **`--permission-mode dontAsk`** denies anything outside your allow rules and the read-only command set. It is the CI-safe mode, and T4 depends on it.
- **`--output-format stream-json --verbose`** gives the tool-call trace T5 uses to verify allowlist conformance from evidence rather than self-report.
- **Exit codes are zero-versus-non-zero only.** There is no published enumerated exit-code table for `-p`; the harness branches on zero versus non-zero and reads the structured output for the reason. (SIGTERM is the one documented value: 143.)

One flag deliberately **not** used: `--bare`. It skips auto-discovery of skills, hooks, plugins, MCP servers and CLAUDE.md — which is right for reproducible CI but would unload the very skill under test. The harness gets reproducibility instead by copying the skill into a hermetic sandbox with its own project-scoped `.claude/settings.json`.

## 7. Skill-layer facts the spec relies on

- Skills are `SKILL.md` files under `.claude/skills/`; project scope is read from the working directory, which is why the sandbox copy works.
- Frontmatter fields used or relevant here: `name`, `description`, `allowed-tools`, `disable-model-invocation`, `user-invocable`, `context: fork`, `model`, and `hooks`. Only `name`, `description`, `license`, `compatibility`, `metadata` and `allowed-tools` are in the portable Agent Skills standard; the rest are Claude Code extensions.
- **Hooks can be declared in skill frontmatter**, scoped to the skill's lifetime and cleaned up when it finishes. The `once: true` field is honoured *only* in skill frontmatter — ignored in settings files and agent frontmatter.
- `allowed-tools` grants pre-approval; it does not block other tools. Pair it with deny rules when restriction is the goal.
- User-invoked skills work in `-p` mode: put `/skill-name` in the prompt string.
- **`/doctor`** diagnoses why a skill is not appearing or triggering, including a description budget overflowing and silently dropping keywords — the exact failure C02's `native_claude_error` fixture seeds.

## 8. Open items this document does not resolve

- Whether the 235-agent roster's model column matches what the seats actually run. That is a fleet-inventory question, not a documentation question, and the harness does not test it.
- Whether `multi_mcp`, DesktopCommander and mulmoclaude should be foundational or bolt-on. The decision tree the rough spec asks for is a build-architecture call; what documentation settles is only that plugin-bundled MCP servers get a scoped tool name (`mcp__plugin_<plugin>_<server>__<tool>`), so any hook matcher written against the bare server key silently never fires. That is a concrete reason to decide deliberately rather than drift.
- The three sources skipped in the earlier diff-check (the agentskills.io directory, the auth-gated API-key retrieve page, the GitHub webhook discussion thread) remain unchased.
