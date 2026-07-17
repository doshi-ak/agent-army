# BUILD-RULES — the law for anyone touching `server/` (and `plugin/`)

*Promised by PLAN §9.5 item 1; authored by the Architect Jul 17 2026 (closes coordination ledger D3).
Distilled from the warehouse `~/claude-mcp-servers/CLAUDE.md` build law + this repo's ratified rulings.
If a rule here conflicts with PLAN.md, PLAN wins — flag it, don't improvise.*

1. **§3.8 boundary (block-rejection criterion):** the server manages, tracks, and serves state. It **never
   runs models, never spawns agents/processes, never makes network calls.** Dispatch is session-side only.
   Any implementation crossing this line fails review regardless of quality. Enforced by EVAL-10 and
   `arch-conformance.sh` A7 (grep for LLM clients / `child_process` / outbound fetch in shipped `dist/`).

2. **Transport:** local stdio MCP server. No HTTP transport, no ports, no daemons. Registration is via the
   project's `.mcp.json`; state travels with the repo via git.

3. **Verify before done:** a change is not complete until `npm test` passes AND
   `node evals/harness/run-all.mjs` is green at the new HEAD. "Builds clean" is not "verified."

4. **Frozen interfaces:** `server/src/state/schema.ts` exports and the five writers in `state/writers.ts`
   are the stable M2 surface. Downstream (M3 skills, M4 dashboard) consumes the schema-parsed objects from
   `team_status` — **never re-parse the markdown**.

5. **Role catalog single-source:** `server/roles/*.md` is canonical; `plugin/agents/*.md` is a build-time
   copy — re-sync with `cp server/roles/*.md plugin/agents/`, never edit either side independently.

6. **Only the Executor writes product code** (RULES hard gate; `_coordination/ARCHITECTURE.md` A9). Eval
   harness and docs have their own owners; a found-defect fix in product files still lands through the
   Executor's lane or with an explicit disclosed exception on the BOARD.

7. **Commit hygiene:** verified work on `main`; WIP goes to a branch. Push after every landed commit —
   unpushed work is single-copy on one laptop (ledger C3 exists because this rule didn't).

8. **No fabricated infrastructure:** never document a scheduler, hook, or verifier as live without the
   command that proves it (`ARCHITECTURE.md` A8/A10). Claims carry a timestamp + command.
