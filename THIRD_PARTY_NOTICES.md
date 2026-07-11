# Third-party notices

## Role templates (`server/roles/`)

Nine of the ten v1 role templates are copied (bodies verbatim, frontmatter
re-headed with a role-contract block and provenance line) from the
`agent-superteam` aggregation at `~/Developer/GitHub/agent-superteam`
(assembled 2026-07-10), which redistributes MIT-licensed agent definitions from:

- [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) — MIT
- [wshobson/agents](https://github.com/wshobson/agents) — MIT

Per-file provenance is recorded in each template's `provenance:` frontmatter line:

| multi-agent-mcp role | agent-superteam source | Upstream origin |
|---|---|---|
| `debugger` | `04-quality-security/debugger.md` | both (identical) |
| `systems-architect` | `04-quality-security/architect-review.md` | both (semantic merge) |
| `regression-test-engineer` | `04-quality-security/test-automator.md` | both (identical) |
| `ci-cd-engineer` | `03-infrastructure/deployment-engineer.md` | both (identical) |
| `forward-deployed-engineer` | `01-core-development/fullstack-developer.md` | VoltAgent |
| `code-reviewer` | `04-quality-security/code-reviewer.md` | both (identical) |
| `security-auditor` | `04-quality-security/security-auditor.md` | both (identical) |
| `docs-writer` | `08-business-product/technical-writer.md` | VoltAgent |
| `performance-engineer` | `04-quality-security/performance-engineer.md` | both (identical) |

`agent-manager` is net-new for this project (PLAN.md §6 spec); no upstream source.

Both upstream projects are MIT-licensed; this notice satisfies the attribution
requirement. For maintained versions of any individual agent, see the upstream
repos — these are point-in-time curated copies.

## obra/superpowers (MIT)
Patterns adapted (no code copied): the verification-before-completion gate concept and
the RED-GREEN-REFACTOR skill-authoring loop (planned for team:skill-forge, M3), and the
subagent status vocabulary informing STATE.md's status enum. Source:
https://github.com/obra/superpowers — Jesse Vincent, MIT license. Discourse
cross-examination pattern in the build team's verifier adapted from
spencermarx/open-code-review (Apache-2.0) — concept only, no code imported.
