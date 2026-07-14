# Agent Superteam

A **deduplicated merge of two Claude Code agent libraries** — [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) and [wshobson/agents](https://github.com/wshobson/agents) — into one non-overlapping roster of **232 agents**.

- **288** agent definitions ingested (154 VoltAgent + 134 wshobson)
- **56** removed as duplicates (41 exact-name + 15 synonymous roles)
- **232** unique agents kept, organized into 9 domains + a super-agent tier

Every duplicate was resolved by **keeping the richer (larger) definition under its native name**; dropped synonyms are documented in [`MERGES.md`](./MERGES.md). Full provenance per agent is in [`manifest.json`](./manifest.json).

## Install

Agents live under [`agents/`](./agents) grouped by domain. To use them in a project:

```bash
# Flatten all agents into a project's .claude/agents/ (names are globally unique)
./install.sh /path/to/your/project

# …or install globally for all projects
./install.sh --global
```

Each file is a standard Claude Code subagent (YAML frontmatter + system prompt), copied verbatim from its source repo. Read an agent before enabling it — these are community-authored prompts that can invoke tools.

## Provenance legend

🟡 VoltAgent-only  ·  🟢 wshobson-only  ·  ⚫ in both (kept once)

## Roster

| Domain | Agents |
|---|---|
| [★ Super Agents — Orchestration & Meta](#super-agents) | 27 |
| [01 · Core Development & Architecture](#01-core-development) | 16 |
| [02 · Language Specialists](#02-language-specialists) | 41 |
| [03 · Infrastructure, Cloud & DevOps](#03-infrastructure) | 19 |
| [04 · Quality, Security & Testing](#04-quality-security) | 25 |
| [05 · Data & AI](#05-data-ai) | 15 |
| [06 · Developer Experience, Docs & Tooling](#06-developer-experience) | 28 |
| [07 · Specialized & Hardware Domains](#07-specialized-domains) | 19 |
| [08 · Business, Product & Marketing](#08-business-product) | 30 |
| [09 · Research & Analysis](#09-research-analysis) | 12 |
| **Total** | **232** |

<a id="super-agents"></a>
### ★ Super Agents — Orchestration & Meta  (27)

| Agent | Source |
|---|---|
| `agent-installer` | 🟡 volt |
| `agent-organizer` | 🟡 volt |
| `architect` | 🟢 wsho |
| `codebase-orchestrator` | 🟡 volt |
| `conductor-validator` | 🟢 wsho |
| `context-manager` | ⚫ both |
| `error-coordinator` | 🟡 volt |
| `eval-judge` | 🟢 wsho |
| `eval-orchestrator` | 🟢 wsho |
| `implement` | 🟢 wsho |
| `it-ops-orchestrator` | 🟡 volt |
| `knowledge-synthesizer` | 🟡 volt |
| `multi-agent-coordinator` | 🟡 volt |
| `orchestrate` | 🟢 wsho |
| `performance-monitor` | 🟡 volt |
| `qa` | 🟢 wsho |
| `review` | 🟢 wsho |
| `session-end` | 🟢 wsho |
| `session-start` | 🟢 wsho |
| `task-distributor` | 🟡 volt |
| `task-executor` | 🟢 wsho |
| `tdd-orchestrator` | 🟢 wsho |
| `team-debugger` | 🟢 wsho |
| `team-implementer` | 🟢 wsho |
| `team-lead` | 🟢 wsho |
| `team-reviewer` | 🟢 wsho |
| `workflow-orchestrator` | 🟡 volt |

<a id="01-core-development"></a>
### 01 · Core Development & Architecture  (16)

| Agent | Source |
|---|---|
| `api-designer` | 🟡 volt |
| `backend-architect` | 🟢 wsho |
| `backend-developer` | 🟡 volt |
| `database-architect` | 🟢 wsho |
| `design-bridge` | 🟡 volt |
| `design-system-architect` | 🟢 wsho |
| `electron-pro` | 🟡 volt |
| `event-sourcing-architect` | 🟢 wsho |
| `frontend-developer` | ⚫ both |
| `fullstack-developer` | 🟡 volt |
| `graphql-architect` | ⚫ both |
| `microservices-architect` | 🟡 volt |
| `mobile-developer` | ⚫ both |
| `monorepo-architect` | 🟢 wsho |
| `ui-ux-designer` ⟲ | ⚫ both |
| `websocket-engineer` | 🟡 volt |

<a id="02-language-specialists"></a>
### 02 · Language Specialists  (41)

| Agent | Source |
|---|---|
| `angular-architect` | 🟡 volt |
| `bash-pro` | 🟢 wsho |
| `c-pro` | 🟢 wsho |
| `cpp-pro` | ⚫ both |
| `csharp-developer` ⟲ | ⚫ both |
| `django-pro` ⟲ | ⚫ both |
| `dotnet-architect` | 🟢 wsho |
| `dotnet-core-expert` | 🟡 volt |
| `dotnet-framework-4.8-expert` | 🟡 volt |
| `elixir-expert` ⟲ | ⚫ both |
| `expo-react-native-expert` | 🟡 volt |
| `fastapi-developer` ⟲ | ⚫ both |
| `flutter-expert` | ⚫ both |
| `golang-pro` | ⚫ both |
| `haskell-pro` | 🟢 wsho |
| `ios-developer` | 🟢 wsho |
| `java-pro` ⟲ | ⚫ both |
| `javascript-pro` | ⚫ both |
| `julia-pro` | 🟢 wsho |
| `kotlin-specialist` | 🟡 volt |
| `laravel-specialist` | 🟡 volt |
| `minecraft-bukkit-pro` | 🟢 wsho |
| `nextjs-developer` | 🟡 volt |
| `node-specialist` | 🟡 volt |
| `php-pro` | ⚫ both |
| `posix-shell-pro` | 🟢 wsho |
| `powershell-5.1-expert` | 🟡 volt |
| `powershell-7-expert` | 🟡 volt |
| `python-pro` | ⚫ both |
| `rails-expert` | 🟡 volt |
| `react-specialist` | 🟡 volt |
| `ruby-pro` | 🟢 wsho |
| `rust-engineer` ⟲ | ⚫ both |
| `scala-pro` | 🟢 wsho |
| `spring-boot-engineer` | 🟡 volt |
| `sql-pro` | ⚫ both |
| `swift-expert` | 🟡 volt |
| `symfony-specialist` | 🟡 volt |
| `temporal-python-pro` | 🟢 wsho |
| `typescript-pro` | ⚫ both |
| `vue-expert` | 🟡 volt |

<a id="03-infrastructure"></a>
### 03 · Infrastructure, Cloud & DevOps  (19)

| Agent | Source |
|---|---|
| `azure-infra-engineer` | 🟡 volt |
| `cloud-architect` | ⚫ both |
| `database-admin` ⟲ | ⚫ both |
| `deployment-engineer` | ⚫ both |
| `devops-engineer` | 🟡 volt |
| `devops-troubleshooter` ⟲ | ⚫ both |
| `docker-expert` | 🟡 volt |
| `hybrid-cloud-architect` | 🟢 wsho |
| `incident-responder` | ⚫ both |
| `kubernetes-architect` ⟲ | ⚫ both |
| `network-engineer` | ⚫ both |
| `observability-engineer` | 🟢 wsho |
| `platform-engineer` | 🟡 volt |
| `security-engineer` | 🟡 volt |
| `service-mesh-expert` | 🟢 wsho |
| `sre-engineer` | 🟡 volt |
| `terraform-specialist` ⟲ | ⚫ both |
| `terragrunt-expert` | 🟡 volt |
| `windows-infra-admin` | 🟡 volt |

<a id="04-quality-security"></a>
### 04 · Quality, Security & Testing  (25)

| Agent | Source |
|---|---|
| `accessibility-tester` ⟲ | ⚫ both |
| `ad-security-reviewer` | 🟡 volt |
| `ai-writing-auditor` | 🟡 volt |
| `architect-review` ⟲ | ⚫ both |
| `backend-security-coder` | 🟢 wsho |
| `chaos-engineer` | 🟡 volt |
| `code-review-preshipment` | 🟢 wsho |
| `code-reviewer` | ⚫ both |
| `compliance-auditor` | 🟡 volt |
| `debugger` | ⚫ both |
| `error-detective` | ⚫ both |
| `frontend-security-coder` | 🟢 wsho |
| `gdpr-ccpa-compliance` | 🟡 volt |
| `malware-analyst` | 🟢 wsho |
| `mobile-security-coder` | 🟢 wsho |
| `penetration-tester` | 🟡 volt |
| `performance-engineer` | ⚫ both |
| `playwright` | 🟢 wsho |
| `powershell-security-hardening` | 🟡 volt |
| `qa-expert` | 🟡 volt |
| `security-auditor` | ⚫ both |
| `test-automator` | ⚫ both |
| `threat-modeling-expert` | 🟢 wsho |
| `ui-ux-tester` | 🟡 volt |
| `ui-visual-validator` | 🟢 wsho |

<a id="05-data-ai"></a>
### 05 · Data & AI  (15)

| Agent | Source |
|---|---|
| `ai-engineer` | ⚫ both |
| `data-analyst` | 🟡 volt |
| `data-engineer` | ⚫ both |
| `data-scientist` | ⚫ both |
| `database-optimizer` | ⚫ both |
| `llm-architect` | 🟡 volt |
| `machine-learning-engineer` | 🟡 volt |
| `ml-engineer` | ⚫ both |
| `mlops-engineer` | ⚫ both |
| `model-advisor` | 🟢 wsho |
| `nlp-engineer` | 🟡 volt |
| `postgres-pro` | 🟡 volt |
| `prompt-engineer` ⟲ | ⚫ both |
| `reinforcement-learning-engineer` | 🟡 volt |
| `vector-database-engineer` | 🟢 wsho |

<a id="06-developer-experience"></a>
### 06 · Developer Experience, Docs & Tooling  (28)

| Agent | Source |
|---|---|
| `build-engineer` | 🟡 volt |
| `c4-code` | 🟢 wsho |
| `c4-component` | 🟢 wsho |
| `c4-container` | 🟢 wsho |
| `c4-context` | 🟢 wsho |
| `cli-developer` | 🟡 volt |
| `dependency-manager` | 🟡 volt |
| `deploy-with-verification` | 🟢 wsho |
| `docs-architect` | 🟢 wsho |
| `documentation-engineer` | 🟡 volt |
| `dx-optimizer` | ⚫ both |
| `git-workflow-manager` | 🟡 volt |
| `legacy-modernizer` | ⚫ both |
| `mcp-developer` | 🟡 volt |
| `mermaid-expert` | 🟢 wsho |
| `policy-enforcer` | 🟢 wsho |
| `powershell-module-architect` | 🟡 volt |
| `powershell-ui-architect` | 🟡 volt |
| `prod-logs-health-check` | 🟢 wsho |
| `readme-generator` | 🟡 volt |
| `receipt-verifier` | 🟢 wsho |
| `refactoring-specialist` | 🟡 volt |
| `reference-builder` | 🟢 wsho |
| `review-policy-author` | 🟢 wsho |
| `slack-expert` | 🟡 volt |
| `tooling-engineer` | 🟡 volt |
| `tutorial-engineer` | 🟢 wsho |
| `visual-asset-generator` | 🟡 volt |

<a id="07-specialized-domains"></a>
### 07 · Specialized & Hardware Domains  (19)

| Agent | Source |
|---|---|
| `api-documenter` | ⚫ both |
| `arm-cortex-expert` | 🟢 wsho |
| `blockchain-developer` | ⚫ both |
| `embedded-systems` | 🟡 volt |
| `fintech-engineer` | 🟡 volt |
| `firmware-analyst` | 🟢 wsho |
| `game-developer` | 🟡 volt |
| `healthcare-admin` | 🟡 volt |
| `hipaa-compliance` | 🟡 volt |
| `image-generator` | 🟢 wsho |
| `iot-engineer` | 🟡 volt |
| `m365-admin` | 🟡 volt |
| `mobile-app-developer` | 🟡 volt |
| `payment-integration` | ⚫ both |
| `quant-analyst` | ⚫ both |
| `reverse-engineer` | 🟢 wsho |
| `risk-manager` | ⚫ both |
| `seo-specialist` | 🟡 volt |
| `unity-developer` | 🟢 wsho |

<a id="08-business-product"></a>
### 08 · Business, Product & Marketing  (30)

| Agent | Source |
|---|---|
| `assumption-mapping` | 🟡 volt |
| `backlog-grooming` | 🟡 volt |
| `content-marketer` | ⚫ both |
| `content-quality-editor` | 🟡 volt |
| `customer-success-manager` | 🟡 volt |
| `customer-support` | 🟢 wsho |
| `growth-loops` | 🟡 volt |
| `hr-pro` | 🟢 wsho |
| `legal-advisor` | ⚫ both |
| `license-engineer` | 🟡 volt |
| `product-manager` | 🟡 volt |
| `project-manager` | 🟡 volt |
| `sales-automator` | 🟢 wsho |
| `sales-engineer` | 🟡 volt |
| `scrum-master` | 🟡 volt |
| `seo-authority-builder` | 🟢 wsho |
| `seo-cannibalization-detector` | 🟢 wsho |
| `seo-content-auditor` | 🟢 wsho |
| `seo-content-planner` | 🟢 wsho |
| `seo-content-refresher` | 🟢 wsho |
| `seo-content-writer` | 🟢 wsho |
| `seo-keyword-strategist` | 🟢 wsho |
| `seo-meta-optimizer` | 🟢 wsho |
| `seo-snippet-hunter` | 🟢 wsho |
| `seo-structure-architect` | 🟢 wsho |
| `social-publishing-publisher` | 🟢 wsho |
| `startup-analyst` ⟲ | ⚫ both |
| `technical-writer` | 🟡 volt |
| `ux-researcher` | 🟡 volt |
| `wordpress-master` | 🟡 volt |

<a id="09-research-analysis"></a>
### 09 · Research & Analysis  (12)

| Agent | Source |
|---|---|
| `ab-test-analysis` | 🟡 volt |
| `cohort-analysis` | 🟡 volt |
| `competitive-analyst` | 🟡 volt |
| `data-researcher` | 🟡 volt |
| `first-principles-thinking` | 🟡 volt |
| `gallery-researcher` | 🟢 wsho |
| `market-researcher` | 🟡 volt |
| `project-idea-validator` | 🟡 volt |
| `research-analyst` | 🟡 volt |
| `scientific-literature-researcher` | 🟡 volt |
| `search-specialist` | ⚫ both |
| `trend-analyst` | 🟡 volt |

## Files

- `agents/<domain>/*.md` — the agent definitions
- `manifest.json` — machine-readable roster (agent → domain → origin → source repo → size)
- `MERGES.md` — every dedup decision
- `ATTRIBUTION.md` — upstream sources & licenses
- `install.sh` — copy agents into a target `.claude/agents/`

⟲ = a semantic merge: two synonymous agents collapsed to the richer one (see `MERGES.md`).
