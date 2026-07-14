# HANDOFF — MCP Workspace Consolidation

> **⚠️ STATUS UPDATE (2026-07-11, verified on disk):** This handoff is **mostly executed** —
> by parallel sessions coordinating via `~/Claude/Code/MCP-Builder/_coordination/BOARD.md`,
> which is now the live coordination surface and supersedes this file for remaining work.
> - ✅ Steps 0–3: all four servers are in the warehouse; `streamdeck-mcp-server` was found
>   and recovered there too (15 server folders total).
> - ✅ Step 4 (partial): strays rehomed — CES draft → `~/Claude/Cowork/Public Speaking/`,
>   Vida-Flo → `~/Claude/Cowork/Finance Tasks/`. `PROJECT_STATE.md` still in Location B.
> - ⬜ Step 5 (retire Location B) and Step 6 (factory `CLAUDE.md`) remain — queued as
>   P3/P4 on the BOARD. The Tavily-key note in step 5's rehoming still applies.
> Read the BOARD before acting on anything below.

> **Purpose:** Self-contained instructions for a fresh Claude Code session to consolidate
> Akash's fragmented MCP-build workspace. Architected 2026-07-06 during the revival of the
> Multi-Agent Orchestration project (see `CLOSEOUT.md` beside this file for that history).
> Everything below was verified on disk on 2026-07-06 unless marked UNVERIFIED.

- **Owner:** Akash (`4t8c26bxkk@privaterelay.appleid.com`), macOS (darwin 25.5.0), Node v26.3.0
- **Status:** ~~Architecture decided; implementation NOT started~~ → see status update above
- **Ask the user before any deletion. Moves and copies described here are pre-approved in principle; confirm the step list before executing it.**

---

## 1. The problem

MCP-build activity is fragmented across three locations, each created for a reason that
no longer holds:

| # | Location | What it is | Verified contents (2026-07-06) |
|---|---|---|---|
| A | `/Users/doshi/claude-mcp-servers` | The original build/delivery repo ("warehouse"). Has the canonical `CLAUDE.md` build rules. | `bear-mcp-server`, `notion-calendar-mcp-server`, `notion-mcp-server`, `robinhood-mcp-server`, `claude-agent-mcp-server`, `fireflies-mcp-server`, `yoodli-mcp-server`, `taskboard-coordination`, `vernacular-corpus`, `cowork-plugins`, `bear-notes.plugin`, `bear.mcpb`, `CLAUDE.md` |
| B | `/Users/doshi/Claude/Cowork/MCP Center of Excellence/MCP Center of Excellence` (note the accidental double-nesting) | Cowork project folder that ALSO accumulated four complete server builds plus strays. Has `PROJECT_STATE.md` (living memory, last updated 2026-07-05 21:48). | `claude-api-mcp-server` (built, 22 tools), `events-mcp-server` (source complete, needs local build), `playwright-mcp-server` (built+verified, 19 tools, has `CLAUDE_CODE_MIGRATION.md`), `tavily-mcp-server` (closed 2026-07-05), `PROJECT_STATE.md`, plus two non-MCP strays: `CES-2027-Call-for-Speakers-Application-Draft.md`, `Vida-Flo-Cancellation-*` (md + pdf) |
| C | `/Users/doshi/Claude/Code/MCP-Builder/` | The new home for MCP-build **activity** in Claude Code — one folder per project. | `Multi-Agent Orchestration/` (live project: agents + routing spec + this file), `Elgato Stream Deck/` (contains `streamdeck-mcp-closeout.docx`) |

Akash is migrating all mcp-build activity away from Cowork into Claude Code (location C).
The confusion: where should code, context, and future builds live?

## 2. The architecture (decided — implement this)

**Separate build activity from runtime artifacts. Move context, not code homes.**

- **Warehouse — `~/claude-mcp-servers/`** — the single canonical home for ALL MCP server
  and plugin **source code and builds**. Every server folder lives here, including the four
  currently stranded in location B. Its `CLAUDE.md` (local-vs-remote rule, TS SDK gotchas,
  verify-before-done) remains the build law and stays where it is.
- **Factory — `~/Claude/Code/MCP-Builder/<Project>/`** — one folder per build *effort*:
  specs, research, handoffs, orchestration files, closeouts. Claude Code sessions start
  here. Code written during a project goes into the warehouse via absolute paths, never
  into the project folder.
- **Location B — retire.** After its contents are rehomed it becomes an empty shell with a
  pointer README. Cowork keeps being useful for non-build automation; it is no longer a
  build venue.

Rationale:
- Server folders are pointed at by runtime registrations (plugin manifests, `.mcpb`
  bundles, any future `claude mcp add` entries). One stable code home means registrations
  never silently break. **Verified 2026-07-06:** `claude_desktop_config.json` →
  `mcpServers` is EMPTY; `~/.claude.json` → no `mcpServers` entries top-level or
  per-project; installed desktop extensions are only Anthropic-directory ones
  (`ant.dir.*`). So today the breakage risk lives in **Cowork plugin manifests and
  `.mcpb` bundles** (e.g. `~/claude-mcp-servers/cowork-plugins/`, `bear-notes.plugin`,
  `bear.mcpb`) — audit those before/after moving anything (step 3).
- `node_modules` are platform-specific, but locations A/B/C are all on the same Mac, so
  moving folders locally is safe — still re-run the Rule-3 verify after moving.
- Factory/warehouse matches what Akash already started doing by hand (creating
  `MCP-Builder/Multi-Agent Orchestration/` and `MCP-Builder/Elgato Stream Deck/`).

## 3. Implementation steps (in order)

**Step 0 — Pre-flight audit (do first, read-only).**
```bash
# Any absolute paths into location B or A inside plugin manifests / bundles?
grep -rl "Center of Excellence" ~/claude-mcp-servers/cowork-plugins ~/claude-mcp-servers/bear-notes.plugin 2>/dev/null
grep -rlo "/Users/doshi/[^\"]*" ~/claude-mcp-servers/cowork-plugins --include='*.json' 2>/dev/null | sort -u
# Re-confirm no mcpServers entries appeared since 2026-07-06:
python3 -c "import json;print(json.load(open('/Users/doshi/Library/Application Support/Claude/claude_desktop_config.json')).get('mcpServers'))"
python3 -c "import json;d=json.load(open('/Users/doshi/.claude.json'));print(d.get('mcpServers'), [p for p,c in d.get('projects',{}).items() if c.get('mcpServers')])"
```
Record every hit; each is a path to update in step 5.

**Step 1 — Move the four stranded servers B → A.**
```bash
cd "/Users/doshi/Claude/Cowork/MCP Center of Excellence/MCP Center of Excellence"
mv claude-api-mcp-server events-mcp-server playwright-mcp-server tavily-mcp-server /Users/doshi/claude-mcp-servers/
```

**Step 2 — Verify each moved server (warehouse Rule 3).**
For each of the four: `npm install && npm run build`, then boot and confirm it lists its
tools (`npx @modelcontextprotocol/inspector node dist/index.js`, or a stdio smoke test).
Known state from `PROJECT_STATE.md`: `events-mcp-server` has never been built locally
(npm was sandbox-blocked in Cowork) — expect to build it for the first time; it needs env
vars `PARTIFUL_AUTH_TOKEN`, `LUMA_API_KEY`, `EVENTBRITE_TOKEN` at runtime, not to compile.

**Step 3 — Fix any references found in step 0** to point at the new
`~/claude-mcp-servers/<server>` paths; re-test whatever they belong to.

**Step 4 — Rehome the context files from B.**
- `PROJECT_STATE.md` → merge its still-true content into per-project factory folders:
  the four servers' entries become a short `README-status` note in each moved server
  folder (or a `MCP-Builder/<name>/` project folder if work continues), and its
  architecture-decisions section belongs in the warehouse `CLAUDE.md` only if a rule is
  genuinely new (most duplicate existing rules — do NOT bloat the rule file).
- `CES-2027-Call-for-Speakers-Application-Draft.md` → `~/Claude/Cowork/Public Speaking/`
  (existing Cowork project). Confirm with Akash.
- `Vida-Flo-Cancellation-*` → not MCP work; propose `~/Claude/Cowork/Finance Tasks/` or
  wherever Akash keeps consumer-admin paperwork. Confirm with Akash.

**Step 5 — Retire location B.** Leave only a `README.md`: "This project moved. Server
code: `~/claude-mcp-servers/`. Build projects: `~/Claude/Code/MCP-Builder/`. Retired
2026-07-XX." Do not delete the folder itself without Akash's explicit OK (Cowork session
history may still reference it).

**Step 6 — Stamp the factory.** Create `/Users/doshi/Claude/Code/MCP-Builder/CLAUDE.md`
with the factory/warehouse rule so every project session inherits it:
- New build effort → new `MCP-Builder/<Project>/` folder.
- All MCP server/plugin source → `~/claude-mcp-servers/` (read its CLAUDE.md first).
- Closeouts/handoffs stay in the project folder.

**Step 7 — Report** what moved, what was rebuilt and verified (with output), every
reference updated, and anything left open.

## 4. Open questions / loose ends for this session

1. **`streamdeck-mcp` source is MISSING.** `PROJECT_STATE.md` says it was built, installed
   and registered on 2026-07-05 (two parts: `bridge-plugin/` + `mcp-server/`, bridge on
   `127.0.0.1:28196`, plugin UUID `com.anthropic.mcp-bridge`), but the folder exists in
   neither A nor B. Only `MCP-Builder/Elgato Stream Deck/streamdeck-mcp-closeout.docx`
   exists. Find the source (check that .docx's contents for the delivery path, Stream Deck's
   Plugins folder `~/Library/Application Support/com.elgato.StreamDeck/Plugins/`, Trash,
   and any git history) before assuming it must be rebuilt. Ask Akash if not found.
2. **Tavily API key:** `PROJECT_STATE.md` (location B) embeds a Tavily dev key in plain
   text. When rehoming that file's content, drop the key; remind Akash to rotate it and
   keep keys in env/keychain per warehouse rules.
3. **`claude` CLI not on PATH** in non-interactive shells (`command not found`,
   2026-07-06). Harmless for desktop-app usage; note it if scripting `claude mcp` commands.
4. **UNVERIFIED:** whether anything else on the machine references location B by absolute
   path (Spotlight-level sweep: `grep -rl "MCP Center of Excellence" ~/Claude ~/claude-mcp-servers --include='*.json' --include='*.md' -s`). Run it in step 0.

## 5. What NOT to do

- Do NOT move or rename `~/claude-mcp-servers` itself.
- Do NOT copy `node_modules`/`dist` across machines/platforms (macOS↔Linux); on this
  single Mac, moving is fine but always re-verify builds.
- Do NOT merge `PROJECT_STATE.md` wholesale into any CLAUDE.md — extract, don't paste.
- Do NOT delete anything (folders, strays, the retired shell) without Akash's explicit OK.
- Do NOT touch `~/Claude/Code/MCP-Builder/Multi-Agent Orchestration/` contents — that
  project is live and owned by another session; this handoff file is its output, not its
  workspace.
