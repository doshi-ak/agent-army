# What This System Can Actually Do For You

*A plain-English guide to real jobs Multi-Agent MCP can run — for Akash, written so no
technical background is required. Every capability named below is grounded in the
project's plan (`PLAN.md`) and the two sample workflows already designed for it. Nothing
here is a promise beyond what those documents describe.*

---

## How to read this document

The system you're building does two things, over and over, in different combinations:

- **Pattern A — Research, then a recommendation, then you decide.** A team of agents
  goes and finds things out, weighs the evidence, and hands you a decision to make. This
  is the pattern behind the prediction-market sample (Sample Use Case 1): agents
  research markets, argue about the trade, and stop at your door — nothing gets bet
  without you saying yes.
- **Pattern B — Build a pipeline of drafts, queue them up, and wait for you to publish.**
  A team of agents researches, drafts, and schedules content, but nothing goes out the
  door — a post, a comment, an email — until you personally approve that exact item.
  This is the pattern behind the LinkedIn sample (Sample Use Case 2).
- **Pattern C — Build or fix the system itself.** The same team structure can point at
  code instead of markets or content: reading a codebase, planning changes, writing
  code, and verifying it — because that's literally what this project's own `builder`
  and `verifier` roles do (PLAN §6, the `agent-manager` and catalog roles).

Below are 8–12 concrete jobs built by extending these three patterns honestly — not by
inventing new capabilities the plan doesn't support. Each one follows the same five-part
format:

1. **What you say** — the one sentence you'd actually type. You describe the outcome;
   you never write code or configure tools.
2. **What the team does on its own** — mapped to the actual tools and roles in
   `PLAN.md` §4 (tool inventory) and §6 (role catalog).
3. **What comes back to you, and where** — which files, which dashboard.
4. **What always stops and waits for you** — money and anything sent/posted/submitted,
   full stop.
5. **The honest limits** — where this costs real money in tokens, where the quality
   ceiling is the underlying AI models' ceiling (not magic), and where a human's
   judgment still matters more than the team's.

---

## 1. Morning markets briefing (Pattern A)

**What you say:** *"Every morning, check my watchlist markets and portfolio, tell me
what moved overnight and why, and flag anything that needs a decision from me today."*

**What the team does on its own:** A research-agent role pulls market data and news
(the same kind of deterministic ingestion the prediction-market sample specifies —
snapshots, not guesses), a second agent screens for what's actually moved enough to
matter, and — following the sample's council pattern — cross-checks the "why" against
at least one independent source before writing it down. `progress_log` timestamps every
finding; `state_write` puts anything decision-worthy into `_team/STATE.md`'s Active Work
or Blockers section.

**What comes back to you, and where:** A short morning note plus `_team/dashboard.html`
(self-contained HTML, auto-refreshed on every state change — PLAN §7 M4), with the
"needs your decision today" items pulled into `## Blockers`.

**What always stops for your approval:** Any trade, any order, any money movement. Per
PLAN's explicit non-goal: "no autonomous money/outbound (hard gate, permanent)." The
system only ever proposes.

**Honest limits:** This is a summarization-and-triage job — cited evidence gets it
attention faster than the market otherwise would, but the underlying research quality is
bounded by whatever model does the reading. Token cost scales with how many markets you
watch and how often you refresh; a watchlist checked every 15 minutes costs meaningfully
more than one checked daily. You still have to actually read the note and decide.

---

## 2. Prediction-market research desk, paper mode (Pattern A — the flagship case)

**What you say:** *"Run the prediction-market research pipeline in paper mode — find
mispriced contracts, have the council review them, and show me what it would have bet,
with sources, but place nothing."*

**What the team does on its own:** This is Sample Use Case 1 almost verbatim, and it's
the system's own designated flagship regression test (PLAN §8). A deterministic
ingestion step snapshots market data; a rule-based scanner filters to a short candidate
list; category-routed research agents produce structured forecasts (probability, edge,
sources, confidence); a seven-role council reviews each candidate (Resolution Auditor,
Evidence Auditor, Quant/Microstructure Analyst, Base-Rate/Calibration Analyst, Devil's
Advocate, Compliance/Terms Analyst, Portfolio Risk Manager — each can veto); a risk
engine checks position limits; and because the mode is Paper, the flow terminates at a
simulated trade — it never reaches the step that would submit an order to a venue API.

**What comes back to you, and where:** Every recommendation lands in `_team/PROGRESS.md`
with its sources and evidence attached — "none logged bare" is the system's own
eval standard (`EVALS-DRAFT.md` B(1)). `_team/STATE.md` shows which agents ran and
anything blocked. The dashboard reflects the paper trade.

**What always stops for your approval:** Everything past "paper." Moving from Mode A
(paper) to Mode B (any live trading) is a separate, explicit, human-gated decision the
source design calls out — and even inside live mode, the first tier is "human approval
for every trade." No exceptions live in this system.

**Honest limits — read this one carefully:** The source research behind this exact
sample is blunt about it: in a live 2026 benchmark, six frontier models trading real
capital every 15–45 minutes on Kalshi lost between **16.0% and -30.8%**, and research
volume didn't correlate with better outcomes. A second 2026 benchmark found only **two
of seven** LLMs tested made money on Polymarket, despite all of them sounding confident.
The design's own conclusion, quoted directly: *"LLMs are useful analysts, but dangerous
autonomous traders."* This use case is valuable as a research army, not as a trading
bot — see "The honest ceiling" at the end of this document. **One gap to flag:** PLAN's
current v1 role catalog (debugger, systems-architect, code-reviewer, etc.) doesn't ship
the seven specialist council roles this scenario needs by name — building them requires
either customizing an existing role with task context or generating a new one via the
skill-forge flow. That path isn't settled in the plan yet (`EVALS-DRAFT.md` flags this
directly) — flagging it here rather than promising it works today.

---

## 3. Content pipeline with a hard publish gate (Pattern B — the second flagship case)

**What you say:** *"Build me a LinkedIn content strategy and a month of draft posts and
comments based on what's working for creators in my niche — but don't post or comment
anything without me approving it first."*

**What the team does on its own:** This mirrors Sample Use Case 2's task list, minus the
autonomous-posting language that use case's own document used (and which this system's
guardrails override — more below). Agents draft: a content-strategy playbook
cross-checked against social-growth and LinkedIn-algorithm research (refreshed
bi-monthly and monthly, per the source doc's own cadence); an audit of creators in your
niche and of your own post history; a draft content calendar with captions; and draft
text for any planned comments.

**What comes back to you, and where:** Every draft lands in `_team/PROGRESS.md`,
attributed and timestamped. `_team/STATE.md`'s `## Active Work` holds in-flight
calendar drafts and research cycles; `## Blockers` holds every drafted post or comment
"parked pending Akash's approval" — that's the resting state, not a pass-through.

**What always stops for your approval:** Any LinkedIn post or comment, before it's
scheduled or published, through any tool (Hootsuite, browser control, Taplio, or
anything else). Any third-party tool account build-out or authentication that would let
the team act on your behalf. Any outbound pitch toward speaking or monetization
opportunities. This is a deliberate correction: the source instructions for this use
case actually say "autonomous execution... using [user input] to complete tasks
autonomously" and list "scheduling the posts on LinkedIn via browser controls" and
"leaving LinkedIn 5 daily comments" as scheduled tasks with **no approval gate stated
anywhere in that document**. This system does not implement it that way — the
per-item human-approval gate comes from this project's own non-negotiable rule ("nothing
is sent, posted, submitted, accepted, or deleted without Akash's explicit instruction
for that specific item") and overrides the source doc's language, including its
"proactive execution" clause.

**Honest limits:** Draft quality depends on the research the agents actually find —
garbage sources in, garbage strategy out, so spot-check the cited research yourself
occasionally. The 5-daily-comments task, done honestly with drafts-only, means you
personally clear five drafts a day if you want that cadence kept — the system removes
the writing labor, not the approval labor. Token cost scales with research-refresh
frequency (twice-monthly and monthly cadences are already fairly disciplined, per the
source doc).

---

## 4. Competitive research briefs (Pattern A)

**What you say:** *"Every week, tell me what our three main competitors changed —
pricing, features, hires, messaging — with sources, and flag anything that needs a
response from me."*

**What the team does on its own:** A `researcher`-style agent (mapped from PLAN §6's
role catalog and this project's own routing spec) pulls public information, cross-checks
claims across sources the way the prediction-market council cross-checks evidence, and
files findings via `progress_log`. Anything time-sensitive goes into `## Active Work`.

**What comes back to you, and where:** A weekly brief plus the dashboard's running log.

**What always stops for your approval:** Nothing here touches money or sends anything —
this is the closest thing in this list to a "no gate needed" job. But if a finding
prompts an outbound action (an email, a public statement), that action gets the same
draft-only treatment as case 3.

**Honest limits:** This is bounded by what's publicly findable and by the research
model's judgment about what's actually material versus noise — a brief is only as good
as the sources behind it, and every claim should carry its citation so you can check it
yourself.

---

## 5. Job-search engine (Pattern A)

**What you say:** *"Find roles that match this profile, research each company, and
draft tailored applications — but don't submit anything without me reviewing it."*

**What the team does on its own:** Research agents screen postings against criteria
(the same "deterministic filter before expensive reasoning" logic the prediction-market
design uses to avoid wasting strong models on low-value scanning), then draft
company-specific materials for the ones that clear the filter.

**What comes back to you, and where:** Draft applications and a company-research packet
per role, logged to `PROGRESS.md`; the candidate shortlist sits in `## Active Work`
until you act.

**What always stops for your approval:** Every submission — this is outbound
communication to a third party, so it gets the same per-item gate as any LinkedIn post
in case 3.

**Honest limits:** Cover-letter and resume-tailoring quality is bounded by the writing
model's ceiling, same as any other drafting job here — worth a human pass before it goes
out, not because the system is careless, but because it's your name on the application.

---

## 6. Newsletter production pipeline (Pattern B)

**What you say:** *"Research and draft a weekly newsletter on [topic] — sources,
summary, my commentary slots — and queue it up. Don't send it until I approve the final
draft."*

**What the team does on its own:** Same shape as case 3: research refresh on a
schedule, draft assembly, calendar tracking in `## Active Work`.

**What comes back to you, and where:** Draft issues in the state files, ready for your
edit pass, dashboard showing the publication queue.

**What always stops for your approval:** Send. Nothing goes to a subscriber list
without your explicit go-ahead on that specific issue.

**Honest limits:** Same drafting-quality ceiling as case 3; if your commentary is what
makes the newsletter yours, budget the time to actually write those slots — the team
can't manufacture your voice.

---

## 7. Personal CRM and follow-up drafting (Pattern A/B hybrid)

**What you say:** *"Look at who I haven't followed up with in two weeks and draft a
short note for each — don't send any of them."*

**What the team does on its own:** An agent reviews contacts/threads it has access to,
identifies staleness, and drafts notes — the same gated-comms shape this project already
enforces for its `inbox-ops` role ("draft-only; never sends/deletes without explicit
per-item instruction," per this folder's own routing spec).

**What comes back to you, and where:** A queued list of drafts in state files, with the
"who and why" reasoning attached so you're not guessing why the system flagged someone.

**What always stops for your approval:** Every send, individually.

**Honest limits:** This is only as good as the access it's given (calendar, email,
notes) — and drafting the *right* tone for a specific relationship is a judgment call
the team can approximate but you should skim before sending.

---

## 8. Codebase maintenance sweeps (Pattern C)

**What you say:** *"Go through the codebase, find dead code, outdated dependencies, and
missing tests, fix what's safe to fix, and tell me what needs my judgment call."*

**What the team does on its own:** This is literally what the `builder` role plus
`verifier` gate already do in this project's own routing spec — code changes get built,
then adversarially checked, with the verifier reporting PASS/FAIL rather than fixing
things itself. `manager_tick` (PLAN §4) is the same idea applied to the team's own
progress: it scans for stale claims and gaps and returns a recommendations report rather
than silently acting.

**What comes back to you, and where:** A PROGRESS.md trail of what changed and why, plus
a verifier report on anything risky enough to need your sign-off.

**What always stops for your approval:** Anything the verifier can't confirm is safe —
and per this project's own process rule, a FAILed verification goes back to the
*producing* agent with a defect list; the verifier itself never patches it.

**Honest limits:** "Safe to fix automatically" is a narrower category than it sounds —
dependency bumps and dead-code removal are usually low-risk; anything touching business
logic or public interfaces deserves your eyes regardless of what passed automated
checks.

---

## 9. Startup-MVP build sprints (Pattern C)

**What you say:** *"Here's the spec for [idea]. Build a working first version, verified
end to end, and tell me what's left before it's real."*

**What the team does on its own:** This is the MCP-build playbook this whole project was
bootstrapped with (`cowork-mcp-builder-agent-team copy.md`, referenced throughout
PLAN.md) — a plan gets written first (non-overlapping ownership blocks), builders each
own a block, and nothing is marked done until it's actually built and verified (boot the
server, list its tools, confirm behavior) rather than just written.

**What comes back to you, and where:** A working repo, a `PLAN.md`-equivalent showing
the ownership split, and a verification report per block.

**What always stops for your approval:** Any deployment that goes outbound (publishing,
pushing to a shared environment, spending real money on infrastructure) — the pattern's
"verify before done" discipline never substitutes for your sign-off on shipping.

**Honest limits:** Speed here is real, but so is token cost — a full build sprint with
several parallel builder agents is not a "free" way to get software; it's a fast way to
get a first draft that still needs your product judgment on scope and priorities.

---

## 10. Backlog-clearing sweep (Pattern C)

**What you say:** *"Here's 600 open tasks/tickets. Triage them, close what's stale or
duplicate, draft resolutions for what's clear-cut, and give me a short list of what
actually needs a decision."*

**What the team does on its own:** Triage-and-classify is exactly the shape of
`manager_tick`'s job at the team level (stale-claim detection, progress deltas) scaled
up to a real backlog — a team of role-catalog agents (e.g., `docs-writer`,
`code-reviewer`) can each own a slice, logging every disposition to `PROGRESS.md` for an
audit trail.

**What comes back to you, and where:** A disposition log for all 600 (closed/merged/
flagged), and a short curated list of the ones that need your judgment, in
`## Blockers`.

**What always stops for your approval:** Anything that closes, deletes, or changes
status in a system of record outside this project's own state files requires the same
explicit-per-item instruction this project's comms guardrail already requires for
sending anything — closing someone else's ticket is an action on a shared system, not a
private draft.

**Honest limits:** With 600 items, token cost adds up fast if every item gets a full
agent pass — the efficient version filters deterministically first (like the
prediction-market design's "let code reduce the universe before spending model calls on
it") and only spends real reasoning on the ambiguous remainder.

---

## 11. Event/trip planning ops (Pattern A/B hybrid)

**What you say:** *"Plan [event/trip] — research options, build an itinerary and
budget, draft the booking requests — don't book or pay for anything."*

**What the team does on its own:** Research agents compare options against your
constraints (cost, dates, logistics) and draft a plan; nothing here differs structurally
from case 1's research-and-recommend shape.

**What comes back to you, and where:** An itinerary and budget in the state files, plus
draft booking requests/emails ready for your review.

**What always stops for your approval:** Any payment, any booking confirmation, any
message sent to a vendor — money and outbound, the same two hard gates as everywhere
else in this document.

**Honest limits:** Real-time availability (flights, reservations) changes fast; a
research pass from an hour ago can be stale by the time you approve — expect to
re-confirm before you actually book.

---

## 12. Market monitoring with a decision queue (Pattern A, standing job)

**What you say:** *"Keep an eye on [sector/companies/markets] continuously and only
interrupt me when something crosses a threshold I'd actually act on."*

**What the team does on its own:** This is the prediction-market design's own
"monitoring tiers" idea (Tier 1: aggressive monitoring on things you're already exposed
to; Tier 2: a watchlist checked less often; Tier 3: cheap broad scanning, no expensive
model calls unless a deterministic filter flags something) applied generally — the
insight from that source document is explicit: *"More agents are not the answer by
themselves. The answer is triage, queues, and strict escalation thresholds."*

**What comes back to you, and where:** Silence, until a threshold fires — then an
interrupt with the finding and its sources, filed to `## Blockers`.

**What always stops for your approval:** Any action the finding suggests taking — this
job's entire value is surfacing the decision, not making it.

**Honest limits:** Getting the thresholds right takes iteration — too sensitive and
you're interrupted constantly (defeats the purpose); too loose and you miss things. Plan
to tune this over the first few weeks rather than expecting it calibrated on day one.

---

## The honest ceiling

Two things this document should not oversell, because the source material is explicit
about both:

**1. "Self-improving" means better prompts and better tests, not a smarter model.**
`manager_tick` (PLAN §4) is the mechanism: it looks at stale claims, progress gaps, and
role-utilization, and returns a *recommendations report* — new eval cases, ROLES.md
refinements, state hygiene fixes. The prediction-market design's own prompt-iteration
protocol is the same idea in miniature: a losing trade triggers a retrospective, a new
prompt version runs in shadow mode next to the old one, and only a new version that
*measurably* beats the old one on real outcomes gets promoted. That is real iteration —
but it's iteration on the *instructions and tests*, layered on top of whatever the
underlying Claude models can do. The system does not get smarter than its models by
running longer. It gets better *organized* — sharper prompts, better role definitions,
tighter eval coverage — which is a genuinely different and more modest claim.

**2. The system's own flagship use case is itself the proof that autonomous execution
is the wrong target.** The cited evidence in Sample Use Case 1 is blunt: six frontier
models trading real money on Kalshi lost 16–31% in a live 2026 benchmark; only two of
seven models tested made money on Polymarket in a separate benchmark; and research
volume didn't correlate with better trading outcomes. The source document's own
conclusion is the design principle this whole system is built around: *"LLMs are useful
analysts, but dangerous autonomous traders."* The value of Multi-Agent MCP isn't that it
lets AI act on your behalf faster — every pattern in this document, from markets to
LinkedIn to code, routes decisions and anything sent/posted/paid back to you before it
becomes real. The value is the **gated analyst-army pattern**: many research and drafting
agents working in parallel, checked against each other, with a full paper trail — and a
door that only you can open at the end.

---

*Sources: `PLAN.md` (§0.1, §4, §6, §8, §10.6, §10.7, §9); `_coordination/SAMPLE-USE-CASE/`
(both use cases in full, including the mermaid workflow); `evals/EVALS-DRAFT.md`. No
capability described above goes beyond what those documents specify; where the plan
doesn't yet settle an implementation detail (case 2's council-role gap), that's called
out explicitly rather than assumed.*
