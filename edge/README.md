# `edge/` — M6 External Automation Lane (session-side / edge adapters)

**Ratified:** PLAN.md §7 M6 row (Architect, Jul 17). **Owner:** Executor.
**Spec:** `_coordination/Manus-Cowork-Relay-Integration/M6-INTEGRATION-BRIEF.md` (Manus
contract is fact-checked there — do not re-derive it).

## The one architectural rule: `edge/` is not `server/`

§3.8 says the **MCP server never calls out** — it manages, tracks, and serves state and
nothing else. M6 needs outbound calls (Manus, Telegram), so those live **here in `edge/`,
never in `server/`**. `server/` must never import from `edge/`. Every `_team/` state change
an edge adapter decides on is applied by calling the **M2 `progress_log` tool** — the server
stays the single writer of state.

## What is built vs. what is GATED on Akash

| Module | M6 block | Status | Gate |
|---|---|---|---|
| `dispatcher.mjs` | M6.2 dispatcher policy | ✅ **built + tested** | none — pure logic over task + PROGRESS.md |
| `intake.mjs` | M6.0 webhook intake normalizer | ✅ **built + tested** | none — pure normalization; the live receiver endpoint is gated |
| `ingest-to-progress.mjs` | M6.3 ingestion half | ✅ **built + tested** | none — builds the one PROGRESS.md line; applied via `progress_log` |
| `manus-offload.mjs` | M6.1 Manus v2 offload | ⚠️ **authored, dry-run only** | `MANUS_API_KEY` + `M6_ENABLED` + registered callback endpoint |
| `telegram-push.mjs` | M6.3 push half (send-only) | ⚠️ **authored, dry-run only** | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` + `M6_ENABLED` |
| M6.4 always-on API-Claude lane | — | ⬜ **not started** | `/install-github-app` + API key + public HTTPS host |

The gated adapters are **inert until Akash provides the buttons.** They read secrets from
`process.env` at call time (never from a tracked file, RULES §4), and default to **dry-run**:
with `M6_ENABLED` unset they return the request they *would* send and perform no network I/O.

## Kill-switch

`M6_ENABLED` is a hard master switch. Absent or `0` ⇒ every outbound adapter is dry-run and
sends nothing. Set `M6_ENABLED=1` (with the relevant secret env vars) to arm live sending.
Unsetting it instantly disarms — no code change, no redeploy.

## Live round-trip acceptance (GATED — cannot run until the buttons exist)

The M6 acceptance test in PLAN §7 — `intake → dedup → offload → callback → push` on a fixture
task with **zero secrets in tracked files** — needs the rotated Manus key, the Telegram token,
and the registered webhook endpoint. Until Akash provides them, the pieces are unit-tested in
isolation (`edge/test/`) and the live round-trip is **explicitly unverified**, not faked.

## What Akash needs to provide (the four buttons)

1. **Rotated Manus API key** → `MANUS_API_KEY` (env/secret store, never tracked).
2. **Rotated Telegram bot token + chat id** → `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`.
3. **A public webhook endpoint** registered as Manus's account-level callback.
4. **`/install-github-app`** — enables the M6.4 always-on lane (runs with the laptop closed).
