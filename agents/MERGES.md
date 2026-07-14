# Merge & Deduplication Log

How 288 ingested agents became 232 unique ones.

## 1. Exact-name duplicates (41)

41 agents existed in **both** repos under an identical filename. Each was kept **once**, using whichever repo's file was larger (richer prompt). Marked ⚫ *both* in the roster. Examples: `ai-engineer`, `security-auditor`, `python-pro`, `code-reviewer`, `data-scientist`. (3 of these — `prompt-engineer`, `business-analyst`, `ui-designer` — also had a *third* synonym in wshobson; see below.)

## 2. Semantic duplicates (15)

Same role, different name across the two repos. Collapsed to one entry — **the larger file wins and keeps its own name**; the other is dropped. Marked ⟲ in the roster.

| VoltAgent name | wshobson synonym | Kept | Dropped |
|---|---|---|---|
| `rust-engineer` | `rust-pro` | **`rust-engineer`** | ~~`rust-pro`~~ |
| `django-developer` | `django-pro` | **`django-pro`** | ~~`django-developer`~~ |
| `fastapi-developer` | `fastapi-pro` | **`fastapi-developer`** | ~~`fastapi-pro`~~ |
| `csharp-developer` | `csharp-pro` | **`csharp-developer`** | ~~`csharp-pro`~~ |
| `java-architect` | `java-pro` | **`java-pro`** | ~~`java-architect`~~ |
| `elixir-expert` | `elixir-pro` | **`elixir-expert`** | ~~`elixir-pro`~~ |
| `terraform-engineer` | `terraform-specialist` | **`terraform-specialist`** | ~~`terraform-engineer`~~ |
| `kubernetes-specialist` | `kubernetes-architect` | **`kubernetes-architect`** | ~~`kubernetes-specialist`~~ |
| `database-administrator` | `database-admin` | **`database-admin`** | ~~`database-administrator`~~ |
| `devops-incident-responder` | `devops-troubleshooter` | **`devops-troubleshooter`** | ~~`devops-incident-responder`~~ |
| `architect-reviewer` | `architect-review` | **`architect-review`** | ~~`architect-reviewer`~~ |
| `accessibility-tester` | `accessibility-expert` | **`accessibility-tester`** | ~~`accessibility-expert`~~ |
| `prompt-engineer` | `prompt-crafter` | **`prompt-engineer`** | ~~`prompt-crafter`~~ |
| `business-analyst` | `startup-analyst` | **`startup-analyst`** | ~~`business-analyst`~~ |
| `ui-designer` | `ui-ux-designer` | **`ui-ux-designer`** | ~~`ui-designer`~~ |

## 3. Kept separate on purpose

Borderline pairs where the roles genuinely differ were **not** merged, e.g. `backend-architect` vs `backend-developer`, `docs-architect` vs `documentation-engineer`, `ml-engineer` vs `machine-learning-engineer` (VoltAgent itself ships both), `code-review-preshipment` vs `code-reviewer`. Reasonable people could merge a few of these; the bias here is to preserve distinct prompts rather than lose coverage.
