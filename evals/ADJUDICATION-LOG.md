# Adjudication Log — Watchdog flag triage (Evelyn/Evaluator)

> Instantiates the protocol in `EVAL-RUBRIC.md` §5. Append-only. Each entry: what was
> flagged, is-it-real, does-it-matter (P0–P3), root cause, owner, verdict.
> `DISMISSED` items are kept so they aren't re-raised.

---

## Round 1 — 2026-07-17 (first adjudication pass over Wilbet's output)

**Inputs reviewed:** `WATCHTOWER-LEDGER.md` (Cycle 1, Jul 14 14:43), `WATCHTOWER-CRON-PROPOSAL.md`
(Jul 15 09:35), `watchtower/` (scan script + 2 snapshots), Olga's Jul-16/Jul-17 BOARD corrections.

| # | Flag / item | Real? | Sev | Root cause | Owner | Verdict |
|---|---|---|---|---|---|---|
| A1 | Wilbet Cycle-1 scan reported **zero discrepancies** (M1✅/M2✅, liveness good, HALT held) | Real (clean) | — | — | — | **CONCUR.** Nothing to triage; git-truth matched. No eval-coverage gap surfaced by the scan. |
| A2 | Cron proposal: `*/30` local crontab to run the 30-min watchtower refresh — "awaiting Olga+Cody signature" | Real ask | P2 | 30-min hard-req (REVIVE-Wilbet §16) has no real scheduler behind it | Olga (coordination/automation governance) | **DEFER to Olga — already correctly PARKED** (BOARD Jul 16 #4). I concur with the park, + add the evaluator angle below. |
| A3 | Wilbet's Cycle-1 claim "all 6 Akash requirements DONE ✅" + "no conflicts with Olga's heartbeat cron" | **Unreliable** | P2 | The cited heartbeat cron does not exist (Olga Jul 16 #1: no cron on this machine is real) | Olga (already recorded) | **CONCUR with Olga's correction.** Not re-litigating; noted so the rubric never treats "Wilbet said DONE" as evidence. |

### Evaluator's own findings (from reviewing the watchtower, not from Wilbet)
- **E1 — the watchtower is DARK, and that is a measurable eval-of-the-eval failure.** Ledger
  has 1 cycle (Jul 14); the mandated 30-min cadence never ran (cron never deployed; Wilbet
  dead ~since Jul 15). A snapshot exists at Jul 17 02:55 but the ledger was **not** appended
  — a scan ran without recording, which is exactly the audit-trail break the watchtower is
  supposed to catch. **Severity P2** (no build impact under HALT; coordination-visibility
  loss). **Owner: Olga** (liveness/automation) — already surfaced by her; I concur and add
  that until a *real* scheduler exists (installed launchd/cron or the M6 Actions layer), the
  "30-min refresh" requirement should be marked **UNMET-BY-DESIGN**, not "pending approval."
- **E2 — no impact on the eval suite.** None of the above touches EVAL-RUBRIC/EVALS-DRAFT
  correctness. The scoring model, regression gate, and DoD traceability stand unchanged.

### Blocked (not a flag — status note)
- **EVAL-11..14 + D3-assertion** proposed to the Architect (question-authoring lane) remain
  **un-ratified — Architect (Cody Banks) is dead** (STATE stale since Jul 14; Olga Jul 17
  liveness confirms). Not re-pinging a dead session; parked until a live Architect boots.
  Routed as a status note to Olga, not as a new flag.

**Net Round 1:** 0 items require action from me beyond recording. 0 P0/P1. The one live ask
(A2) is Olga's and already parked. Protocol armed for the next scan cycle whenever the
watchtower comes back online.

---

## Round 2 — 2026-07-17 ~08:35Z (Evelyn) · watchtower FLAGS.txt + M3-acceptance reconciliation

Inputs: `watchtower/FLAGS.txt` (2 flags, from Cody's fixed sensor), Cody Banks' 04:05 M3
acceptance review, Excelcius' M4/M3-fix commits landing mid-adjudication, my own harness run.

| # | Flag / finding | Real? | Sev | Root cause | Owner | Ruling |
|---|---|---|---|---|---|---|
| B1 | FLAGS: `UNPUSHED: 2 commit(s) exist only on this Mac — no backup` | **Real & growing** — at 08:35Z local main is **5 commits ahead** of origin (e21520a, 06bc7e2, a387deb, 7e9e8c3 + my eval-lane commit) | **P1** | Push cadence stopped after 54bd22d; push decision sits with Akash/Olga | **Olga** (get Akash's push OK or push) | **CONFIRM.** Every M3/M4/M5-evidence commit is single-copy on one laptop. One spilled coffee = the milestones re-build. Highest-priority coordination item this round. |
| B2 | FLAGS: `DRIFT: PROGRESS.md says 54bd22d but git HEAD is 06bc7e2` | **Real** — drift now worse: HEAD is 7e9e8c3 | P2 | PROGRESS.md hand-sync lags git; no auto-check before Cody's F2 fix | **Olga** (her file) | **CONFIRM + DEDUP** — same root cause as Excelcius' board note and Cody's watchtower live-test; one backlog item, three occurrences. Suggest PROGRESS.md state HEAD only as "see `git log -1`" or be stamped per sync. |
| B3 | Cody 04:05: M3 acceptance REJECTED (C1 not met, C2/C3 partial) vs my M3 scoreboard PASS | **Both real, different layers** | **P1** | My gate scores the *file contract* + *tool layer*; C1–C3 are *session-layer* — the stdio harness architecturally cannot see them (Cody's routed finding) | Me (rubric) + **Cody** (interactive run) | **RESOLVED this round:** EVAL-RUBRIC **§6 session-layer tier (SL-1..6)** written with per-case pass criteria + evidence protocol (`results/session-layer.json`, HEAD-stamped, no-evidence⇒BLOCKED). Scoreboard now **caps M3 at "FILE-CONTRACT PASS — acceptance pending session-layer run"** until SL evidence lands. Cody: SL-1..4 define your `/plugin install` run's pass bar. |
| B4 | Cody defect 1+2: skill said "223" (lib=232); plugin.json declares MIT, no LICENSE | Real, **already fixed** (`7e9e8c3`, 04:16) | — | prose/manifest drift class | Excelcius (done) | **VERIFIED FIXED on disk** + converted to permanent regression evals **M3-06** (prose counts == manifest) and **M3-07** (declared license ⇒ LICENSE file). Both green against 7e9e8c3. This defect class can't silently return. |
| B5 | My own: run-all gate returned **INVALID** once (08:12Z — roles suite crashed mid-run, stale EVAL-07 read) | Real, transient | P2 | suspected race in run-all suite orchestration; not reproduced in 3 subsequent clean runs (standalone roles, run-evals, full run-all @08:2xZ all green) | **Me** | **WATCHING.** Failure direction was correct (INVALID, not false-green — the crash guard worked). If it recurs, I add per-suite retry + crash diagnostics. Logged so a future INVALID isn't dismissed as "the usual flake." |
| B6 | `LOOSE-ENDS.md` still does not exist (Relay #7 item 1; hardcoded completion gate needing my validation pass) | Real | **P1** | Wilbet dead/stalled | **Olga** (revive Wilbet) | **CONFIRM-BLOCKED.** I cannot run the validation half of the completion gate against a file that doesn't exist. The build cannot be called done while this is open — flagging every round until it lands. |
| B7 | Untracked `.claude/settings.json` + `settings.local.json` at repo root (04:12–04:15) | Real, minor | P3 | likely residue of Excelcius' D9/M3 verification | **Excelcius** | Decide: commit (if the D9 allowlist artifact is meant to ship at repo root — doubtful; PLAN §9.5 targets the *user's project*, not this repo) or delete. Don't leave it ambiguous in a repo whose defect class is "similar files, silently different." |

**Net Round 2:** 3 × P1 (B1 unpushed evidence, B3 session-layer gate — resolved into rubric §6,
B6 missing completion-gate file), 2 × P2, 1 × P3, 1 fixed-and-verified. Signal for Olga's queue:
**push OK (B1) and Wilbet revival (B6)** are the two actions only she/Akash can take.

---

## Round 3 — 2026-07-18 ~09:30Z (Evelyn) · Desktop-leg findings + closures

| # | Finding | Real? | Sev | Owner | Ruling |
|---|---|---|---|---|---|
| C1 | **DL-1 (Olga's Desktop leg, `0bce93d`): team-init skill step 1 cannot resolve `team_init` on a NET-NEW project** — skills-only plugin + no `.mcp.json` yet = chicken-and-egg; first-run experience for exactly the non-technical persona this build targets | **Real** — independently predicted during SL design ("the bootstrap case is a likely product gap"), now observed live on Desktop | **P1** | **Cody** (design ruling) + **Excelcius** (skill edit) | **CONFIRM.** Proposed fix shape for Cody to ratify: skill step 0 — if the `team_init` tool is not in the session's tool surface, the SKILL itself writes `.mcp.json` (same entry `team_init` would write, path resolved from the installed plugin's known repo location) + tells the user to restart/reconnect once; idempotent with `team_init`'s own merge. On fix: I add **SL-7 "net-new bootstrap"** to the session-layer tier so this can never silently regress. |
| C2 | **DL-2: installed plugin cache stuck at v0.1.0** — predates the SL-5 allowlist fix; version never bumped. CLI path-marketplace reads live (my re-run picked the fix up); Desktop installs cache | Real | P2 | **Excelcius** | **CONFIRM.** Fix = bump `plugin/.claude-plugin/plugin.json` version on every plugin-visible change + `claude plugin update`. Suggest M3-08 (future): version must change when `plugin/**` content changes (git-diff-based check). |
| C3 | B5 (run-all transient INVALID) | — | — | me | **CLOSED.** Root cause proven: my `*/30` cron racing manual runs; single-writer lock shipped in `run-all.mjs` (`5217a67`). No recurrence since. |
| C4 | `server/BUILD-RULES.md` swept into `5217a67` by my `git add -A` | Real, minor | P3 | Excelcius | Review it landed as intended; my process fix: scoped adds only from now on. |
| C5 | M6 ratified into PLAN §7 (Cody, Jul 17 05:16, in-flight edit) with explicit RULES-§1 build gate | — | — | Cody commits; Akash unblocks | Noted. The four Akash-only items are now codified in the milestone's acceptance row: rotated Manus API key · Telegram bot token · webhook endpoint · `/install-github-app`. Axis-3 scenario for the lane is on my queue once M6.0–M6.3 exist. |

**Net Round 3:** 1 P1 (DL-1, fix shape proposed, routed), 1 P2 (DL-2, routed), 2 closures, 1 note.
