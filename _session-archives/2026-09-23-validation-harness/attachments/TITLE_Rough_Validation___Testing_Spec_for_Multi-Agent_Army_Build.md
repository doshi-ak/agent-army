# TITLE: Rough Validation & Testing Spec for Multi-Agent Army Build

> [!NOTE] optimized now built by claude as of july 18 2026

> [!CAUTION] 🟡 wshobson — we took the 235 agents but not its 175 skills / 109 commands / plugin-eval framework.
> 🟡 DesktopCommander (real-world execution) and mulmoclaude (15+ messaging bridges, local-first memory) are vision-relevant but unwired.

## Context 
### Sources:

GitHub Repo Local: /Users/doshi/Developer/GitHub/agent-army
Local Coordination Folder: /Users/doshi/Claude/Code/MCP-Builder/_coordination



## AUDIT CHECKLIST

### Conditions:
* Troubleshoot skill must be optimized for Claude Code interface regardless of specifics (GitHub repo connection, local session, Claude Code Web, Desktop, CLI, etc)
* Troubleshoot skill must engage, own, execute and excel at full lifecycle of bug, defect, error management across any type of issue (native Claude error, local error, Claude config files or data directory error, API response code, MCP error, reconciliation in failed build that was developed off a public GitHub Repo, evaluate technical docs like architecture, system flows, terminal output, code transcripts, etc. to identify issues, errors, validation defects, etc.
* Reference authoritative and highly upvoted GitHub repos and Developer Security, Cybersecurity, Regression Engineer resources to validate solution architecture, CI/CD best practices, automation scripts via postman + Jenkins
* Skill also has full capacity for database engineering, solutioning and triage including AWS S3 buckets, SQL databases, AWS Redshift, Oracle DWH, etc.
* Skill also has full capacity for language model architecture triage and solutioning using ML Ops best practices for locally built and running models, diagnostics for inference time failure, runtime defects, training data defects, pre-training and model architecture as well as "off-the-shelf services" such as AWS Bedrock, AWS Sagemaker, OpenAI API, Anthropic API, etc.
* Full lifecycle above includes: diagnostics, root cause identification, triage,
* User may provide no context when deploying skill, skill must be able to start conducting diff and regression analysis starting with logical locations (errors within the environment current session is building in, local drive, run diagnostic commands for, check Claude cache and data directory for other coding sessions (especially those consuming significant token bandwidth),
* If user indicates its a Claude-based error, must reference Anthropic's latest official live docs, GitHub repos and if needed other authoritative sources and cross-reference against terminal checks on '/Users/doshi/Library/Application Support/Claude' + /Users/doshi/.claude + '/Users/doshi/Library/Application Support/Claude/local-agent-mode-sessions/ ~/.claude/settings.json, ~/.claude.json, claude_desktop_config.json
* If session in which skill is invoked is a Cloud session check cloud environment, github repo local, matching cloud github repo, and run diff check between local and cloud
* check all active connectors and plugins tied to all active sessions
* If session in which skill is invoked is a local session then check local environment variables, all other active sessions also running
* only when systems diagnostics + systematic trial and error returns absolutely no indication of error source, then ask the user yes/no questions for any level of context including, screenshot of issue, brief description, filepath, terminal output, if issue arose from local or cloud session, if it occured in cowork or another claude env (design, cowork, etc.) or a different application (chrome, perplexity, mcp wrapper, local file service, etc.)
* skill must create durable log folder to create via STATE.md and operating system that allows it to reference previously resolved issue, old defects, know truths about system architecture, previous claude defects, this folder needs to be built in lives in /Users/doshi/Claude/Code and needs to be added to and maintained as the canonical history source. this serves as an iterative feedback loop, future defects are resolved faster, pinpointed quicker, solutions architected more effectively by having an updating STATE.md file functioning as living memory and an accompanying CLAUDE.md instructional file that allows it to operate off prior context, have baselines for new solutions by building off prior fixes, etc. third file created is OOO.md which is order of operations, a refined, updated standard operating procedure and decision tree that the skill can retrieve upon invocation as an immediate deployment guide across all steps in the lifecycle: diagnostics, root cause identification, solutions architecture, validation and regression testing etc.

### ⠀Definition of Done:
Goal conditions are ONLY fulfilled once all 13 conditions have been executed against 5 core testing criteria below with 100% success rate including auditable result deliverables (for total of 65 test cases and 65 verifiable technical results output).
* Eval loops with full success criteria mapping, v
* validation testing
* regression testing
* end-to-end automation scripts
* sandboxed deployment
* test result deliverables for the 5 testing criteria below for user and 3rd party auditing

### ⠀Hard Rule
Any identified failures must be re-architected across every condition impacted by failure model and re-run against all five testing criteria until definition of done is satisfied for each condition.
instance orchestration we hand-rolled with Terminal spawns.

b


# CREATE SESSION 6 RUNNING ON FABLE 5 ULTRACODE

IT DEPLOYS 
- [religa/multi_mcp: Multi-Model chat, code review and analysis MCP Server for Claude Code](https://github.com/religa/multi_mcp)
  
- troubleshooting skill

# HOW TO DEPLOY IN PRACTICE

DURABLE SET OF SKILLS WRAPPED IN A PLUG-IN THAT INVOKE MANY ACTIONS WITHOUT LENGTHY PROMPTING OR ENGAGEMENT NEEDED

WHAT ELEMENTS OF THE MULTIPLE REPOS 



## CLARITY FOR ME
### WHAT AGENT-ARMY IS TRULY CAPABLE OF

BUILDING SOFTWARE YES, BUT THAT CAN ONLY BE A SMALL PART. NEED TO SEE EVAL PERFORMANCE ACROSS ALL SAMPLE USE CASES 


LEARN THE DIFFERENCE across cron jobs, github actions, automations, webhooks and what actually is in the agent-army architecture

### HOW TO USE HARNESSES, WHAT KINDS OF HARNESSES ARE THERE, AND WHAT DO THEY DO


## HOW TO USE HOOKS, WHAT KIND OF HOOKS, AND WEHAT DO THEY DO


## LOOPS/CRONJOBS



# TRAIN IS LEAVING THE STATION: LAST CALL FOR INTEGRATION

## AT THE TOP, WHAT IS THE DECISION TREE FOR WHEN AN MCP, API, BUILD, LOGIC, ARCHITECTURE NEEDS TO BE FOUNDATIONALLY BUILT INTO AGENT-ARMY VERSUS AFER THE FACT
- HEARD 2 SESSIONS SAY 2 DIFFERENT THINGS, THE LATER MORE CONTEXT AWARE ONE CITED A REPO AND SAID ADDITIONAL MCP’S SHOULD **NOT** be central to the build for some reason or the other (long gone Terminal session)

# TEST TYPES
## DIFF-CHECK 

ACROSS ALL 5 HTMLs

Any conflicts in the source repos?

## AUTOMATION TESTING

## SMOKE TEST

## SANDBOX TEST DEPLOYMENT

## EVALS IN SANDBOX ENV
* ### EVAL HOOKS SPECIFICALLY
* ### EVAL FOR EACH HARNESSES SPECIFICALLY

## CODE REVIEW




incoming, wilbet's been given a huge task as we see the light at the end of the tunnel. Cody's responsible for line-by-line code review and redlining of eval results that are available as of now. Might put Olga on this too. By the way, noticing random sessions popping up in my Claude code which I'm DEFINITELY NOT MAD ABOUT. that rigor and agent deployment is exactly what i wanted from the five of you and its what i want my agent-army to build. be sure to ask wilbet for the work hes been given because no doubt some of it extends to other sessions.

but back to the random sessions that popped up with weird names like functional beacon, effervescent hearth, and cheerful-jellyfish, have a few questions just out of curiosity

* who spun them up?
* what automation, app, service, etc spun them up?
* are they considered sub-agents?
* what exactly is their role? and who assigned it?
* are they active? when i first saw them popup i approved a few permissions but now I haven't heard from them in a long while. 
* how does this match the kind of power my agent-army build will have to deploy sub-agents at will, iterate on tasks, build out constant execution, etc? going to stop there bcecause wilbet already has the schpeel for my vision and evelyn is building specs to measure that vision against reality so yeah. as long as those two are on the same page and everyone else is full steeam ahead

⠀



⠀



evals specific to harnesses
do we need plugins and skills for quick deployment?
html guide?
how does desktop buddy // M5stack / es32 directly fit in with this build that might be different than it’s value generally?
combione last 5 htmls
does desktop commander need a deeper integration
fundamentally whats the decision tree for when this build needs a deep mcp integration at the architecture/design level and when it can just use an existing mcp that was built as a sever separately
ultimately will the place it lives and runs off of be the github repo or /claude-mcp-servers 
diff check on all htmls for conflicting
how to use the 200+ agents
what prompt do we need to send relay and manus for them to get on board with this
what value exactly does adding the relay and manus into the build do? what’s the incremental? are they now integral to the agent army ro thje icing on top?
need to review the evals across a variety of tasks
how i create new agent roles
at two different points sessions recommended that perplexity mcp needed to be a part of the initial build and anotehr said that per source githubs 
need 6 session -> truthseeker (not attached to the build, doesnt even help with the build, external auditor job is only to check the facts, laser eye for discrpenaciy)
[What is the Model Context Protocol \(MCP\)?](https://modelcontextprotocol.io/docs/getting-started/intro)
[Claude Artifact](https://claude.ai/code/artifact/05b8f41c-a9d5-4871-9ae2-ca5a2bdbf74b)

This is a substantial, well-defined audit request — and it's squarely the watchdog's job. Let me be honest about structure: I'll deliver the grounded, answerable parts now (the cross-repo/path discrepancies, the session-deployment conflicts, and the definitive cron/webhook/automation/loop resolution you asked Olga/Cody to make), and kick off the inspiration-source diff-check against the live build in parallel.
Let me load the web tool and start both the local cross-repo audit and the source fetches at once.
Local map surfaces the first discrepancies immediately. Now let me diff the inspiration sources against the live build while I check the cross-repo specifics — batching the source fetches with a local structure check:
The diff-check is already surfacing high-value findings. Let me fetch the remaining consequential sources, then synthesize the full deliverable:
I now have enough for a definitive answer across every part of your request. Let me write the comprehensive findings to a durable coordination doc (so all sessions and any spawned sub-agents read it), then surface it on the BOARD and route the autonomy resolution to Olga + Cody by name.
Now surfacing it to the fleet on the BOARD, routing the autonomy resolution to Olga + Cody by name:
The work spanned ~1 hour of wall-clock (the WebFetches were slow), so my "01:56" header is now ~57 min stale against the real 02:54 — exactly the clock-discipline I hold others to, so I'll correct my own first:
Timestamps corrected. Let me record this in STATE, then give you the consolidated answer:
Done. Full detail is in ~[SOURCE-DIFF-CHECK.md](https://claude.ai/Claude/Code/MCP-Builder/_coordination/SOURCE-DIFF-CHECK.md)~, surfaced to all sessions on the BOARD, with the autonomy ruling routed to Olga + Cody by name. Here's the consolidated answer to each thing you asked.
# 1\. Cross-repo / path discrepancies
* **agent-army** (8f9b343) is the one true build. **agent-superteam** (a0b9e33) is cleanly archived — I count-verified the fold: **235 agents = 235** in agent-army/agents, no orphans.
* multi-agent-orchestration **has TWO stale local copies** — ~/multi-agent-orchestration *and* ~/Claude/Code/MCP-Builder/Multi-Agent Orchestration, both retired (954ae5c), same remote. That's the one real path defect (a delete-both cleanup, Akash's button). No git-truth conflicts between the live repos.

⠀2. Conflicts vs the source / inspiration repos — the biggest finding
I live-fetched 8 sources and diffed each against the build. The headline: **agent-army reinvented mechanisms its own inspiration sources already provide.**
* 🔴 claude-mpm **(not attributed) already solved the exact problem that killed the fleet 4× tonight** — auto-pause/resume at context thresholds + an HTTP /inject external-wake endpoint. We hand-rolled BOARD + STATE-mtime + manual revive instead.
* 🔴 superpowers — we took the *concept* but not its engine (the 7-stage workflow, TDD RED-GREEN-REFACTOR, systematic-debugging skills). Our 8 team-* skills aren't its methodology skills.
* 🔴 mkXultra/claude_code_setup — its CCM (spawns/manages Claude instances) + Chat-MCP is native multi-instance orchestration we hand-rolled with Terminal spawns.
* 🟡 wshobson — we took the 235 agents but not its 175 skills / 109 commands / plugin-eval framework.
* 🟡 DesktopCommander (real-world execution) and mulmoclaude (15+ messaging bridges, local-first memory) are vision-relevant but unwired.

⠀3. Historical vs current architecture conflicts
> [!CAUTION] All already caught and logged this session: the RELAY #8 "no background push" fabrication (retracted by #9), the 4×/day PROGRESS-HEAD drift (fixed by design), the fictional-cron era, the fabricated 0e06f12 attestation (still open), the hardcoded "M3/M4 not built" falsehood, and the model-column fiction (roster says Opus/Haiku, ≥2 seats silently on Fable 5).
# 4\. Session-deployment conflicts
Mostly turn-based-sessions-reading-a-fast-moving-world: **Excelcius** revived on stale HEAD and pushed a RED commit (d0d7508) to origin without running the full harness; **Evelyn**'s adjudication IDs collided with the ledger's and conflated two eval root-causes; **Olga** re-broadcast the false claim without checking and posted while her STATE read dead; the **two-Wilbet** write-collision on STATE. All caught, adjudicated, and green now.
# 5\. 🎯 The cron / webhook / automation / loop resolution (routed to Olga + Cody to ratify)
The definitive answer to "what keeps the agents running without human oversight":
> [!IMPORTANT] * **cron** = dead (never fired on this Mac). **launchd** = the working *machine* floor (sensor + eval), not the agents. **loops/hooks** = fragile, session-scoped, die on process exit.
> * **The only tier that runs LLM agents laptop-shut with no human = GitHub Actions** (scheduled cron: workflows + @claude webhooks in the cloud). It's spec'd (M6/B6) and **one** /install-github-app **click from you away** — the single highest-leverage unlock for the entire "runs without me" vision.
* Plus native hooks we should adopt instead of reinventing: TeammateIdle (the native version of our STATE-mtime liveness), asyncRewake, PostToolBatch, SessionStart.

⠀6. Surfaced to the fleet
The doc + a detailed BOARD post are addressed to Olga + Cody (ratify the autonomy ruling and the adopt-vs-reinvent call), Excelcius + Evelyn, and all spun-off sub-agents — with **Part 5** capturing your full capability scope (errands → trade execution → autonomous site builds → 1M-follower social → $10M paid-media → health scaffolding → real-world logistics) as the acceptance bar, which is exactly why Evelyn's evals are the crux.
One honesty note: I fetched the 8 consequential sources; I skipped agentskills.io (a directory), the API-key retrieve doc (auth-gated, would fail), and the GitHub webhook *discussion* thread (its content is covered by the official Actions docs I did fetch). If you want those three specifically chased down, say so and I'll add them.
The two things only you can move remain: /install-github-app (the autonomy unlock) and **M6 credentials**.
RELAY #10 lands directly on me — Akash wants the large mandate decomposed into a **work breakdown posted on the BOARD** so peers see what lands in their lanes, plus a **Wilbet↔Evelyn sync** on the vision-vs-reality specs. That's a concrete, well-scoped deliverable built straight from the diff-check I just produced. Let me post it, framed as a proposal for Olga to route (she owns orchestration, I own the breakdown).
Work breakdown posted (timestamp verified against real clock — no future-stamp this time). Let me record it and continue the watch:
RELAY #10's asks for me are done. To recap what landed this turn:
**Work breakdown posted (item 2)** — I decomposed the diff-check mandate into a lane-assigned table on the BOARD, framed as a proposal for Olga to route (she owns orchestration; I own the decomposition). It's organized by leverage:
* **Tier-1 (autonomy unlock):** GitHub Actions install → **Akash**; native hooks TeammateIdle/asyncRewake/PostToolBatch/SessionStart → **Cody**(arch)→**Excelcius**(impl); claude-mpm session-continuity → **Cody**; B5 scheduled task → **me**.
* **Tier-2 (source gaps):** superpowers methodology skills, wshobson's 175-skill/plugin-eval framework, mkXultra's CCM/Chat-MCP, DesktopCommander real-world exec, mulmoclaude messaging bridges — each routed to the right lane.
* **Cleanup + attribution hygiene.**

⠀**Wilbet↔Evelyn same-page split proposed (item 3)** — the division Akash wants us synced on: **Evelyn writes** the capability→eval specs (one scenario per vision class — errands, trade execution, autonomous site builds, social growth, paid-media, health, logistics — each asserting the money/outbound/real-world guardrail pauses for a human gate); **I audit** that those evals actually exercise the guardrail at every step, can't fake-green, and map to a role that can execute. She builds the measuring stick; I verify it measures the right thing and can't be gamed. Awaiting her confirm on the BOARD.
**Cody's redline lane (item 1) acknowledged** — his line-by-line eval redline is the depth pass under my breadth audit; I offered to feed him any discrepancy I catch, so the eval layer gets both.
The monitor (bdbkwhli3) holds the watch for the next real signals — Evelyn's sync confirmation, Cody's redline findings, work-breakdown commits, or the big one: your /install-github-app producing the credential files that unblock M6 and the true autonomy tier. Nothing else needs me until one of those lands.


have you caught any discrepancies across:
* local file paths like _coordination, local github folder, various repos containing different elements over the course of this build (e.g. agent-army, agent-superteam, https://github.com/doshi-ak/multi-agent-orchestration.git)
* Conflicts in the source and inspiration public repos that influenced this build?
* conflicts between historical architectural design, earlier entries in STATE.md files, BOARD.md files and other project context versus the current architecture?
* Any conflicts in how different sessions like Evelyn, Excelcius, Olga, and Agent Cody Banks are deploying this work?

⠀And two last things:
Can you resolve the role of Cron jobs, webhooks, automations, and loops and have Olga or Cody identify which of those does agent-army use to keep the agents consistently running, iterating, self-improving and executing against tasks without human oversight.
and then some context since you weren't here for the original inception and architecture of the build. it started with evaluating multiple popular github repos and other sources on agent skills, webhooks etc.
Below is a giant set of URLs, you need to start a diff check excercise as the original architecture was meant to cross-integrate the strongest parts of each build to create a set of highly versatile agents that can be deployed against virtually any task from completely everyday online errands like submitting returns or clearing inboxes to complex algorithm and workflow deployment like brokerage account optimization and trade execution, to prediction market probability theory and kelly criterion anaylsis and execution via MCPs wrapped around APIs, to build entire sites from test to deployment without a single second of human inttervention, to self-managing and growing a user's linkedin or instagram to 1 million followers completely autonomously, to optimizing and managing paid campaigns UGC creators, from creative asset development and vidoe development via midjourney our claude design or canva or calude cowork design and artifact design skills to versionining and exporting to purchasing ad space to optimzing ROAS and selecting correct audience demographic and focuses, deploying 10 million plus in spend on paid media DSPs, SSPs, maintaining a network of young UGC creators to build organic brand growth. Deeply research health issues and then take care of all the scaffoldign from setting doctors appointments with insurance info, making phone calls and using AI voice bots to communicate while a transcription tool feeeds them the langauge to actuall interpret the call. to real time deployment to pick up daughter from elementary school by rapidly hiring and pa¥ing a personal driver that is background vetted and checked because you are held up in the a meeting or atlanta traffic.
That was a lot but the bottom line, these agents can do ANYTHING hence evelyn's sole focus on creating strong evals.
list is below, conduct your diff-check to ascertain if anything
make sure these tasks and requirements are surfaced with all 4 other main sessions and all sub-agents i see have spunoff in smaller agents.

## GITHUB REPO REVIEW

What elements from each did we incorproate and why?

CAn we ensure no code, logic, or architectural conflicts between components combined

Can we run one more audit on these githubs to identify what capabilities, components etc were not incorporated into our build and why
**GUARDRAIL:** dont fabricate a reason -> if it was an oversight or miss thats OK
`
### GitHub Links hi 

* [Github Actions webhook configuration for claude integration · community · Discussion \#189984](https://github.com/orgs/community/discussions/189984)

* [Agent Skills Overview](https://agentskills.io/home)

* [obra/superpowers: An agentic skills framework & software development methodology that works.](https://github.com/obra/superpowers#)

* [Claude Code GitHub Actions - Claude Code Docs](https://code.claude.com/docs/en/github-actions)

* [wshobson/agents: Multi-harness agentic plugin marketplace for Claude Code, Codex CLI, Cursor, OpenCode, GitHub Copilot, and Gemini CLI](https://github.com/wshobson/agents)

* https://github.com/mkXultra/claude_code_setup

* https://github.com/receptron/mulmoclaude

* [bobmatnyc/claude-mpm: Claude Multi-Agent Project Manager — multi-channel orchestration, GitHub-first SDK mode, and plugin system for Claude](https://github.com/bobmatnyc/claude-mpm)


* https://github.com/wonderwhy-er/DesktopCommanderMCP

* [Get API Key - Claude API Reference](https://platform.claude.com/docs/en/api/admin/api_keys/retrieve)

* [Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
* [overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview.md)
* [Hooks reference - Claude Code Docs](https://code.claude.com/docs/en/hooks)

* [Github Actions webhook configuration for claude integration · community · Discussion \#189984](https://github.com/orgs/community/discussions/189984)

* [Agent Skills Overview](https://agentskills.io/home)

* [obra/superpowers: An agentic skills framework & software development methodology that works.](https://github.com/obra/superpowers#)

* [Claude Code GitHub Actions - Claude Code Docs](https://code.claude.com/docs/en/github-actions)

* [wshobson/agents: Multi-harness agentic plugin marketplace for Claude Code, Codex CLI, Cursor, OpenCode, GitHub Copilot, and Gemini CLI](https://github.com/wshobson/agents)

* https://github.com/mkXultra/claude_code_setup

* https://github.com/receptron/mulmoclaude

* [bobmatnyc/claude-mpm: Claude Multi-Agent Project Manager — multi-channel orchestration, GitHub-first SDK mode, and plugin system for Claude](https://github.com/bobmatnyc/claude-mpm)


* https://github.com/wonderwhy-er/DesktopCommanderMCP

* [Get API Key - Claude API Reference](https://platform.claude.com/docs/en/api/admin/api_keys/retrieve)

* [Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
* [overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview.md)
* [Hooks reference - Claude Code Docs](https://code.claude.com/docs/en/hooks)\\ 



* have you caught any discrepancies across:

* local file paths like _coordination , local github folder, various repos containing different elements over the course of this build (e.g. agent-army, agent-superteam, ~[https://github.com/doshi-ak/multi-agent-orchestration.git](https://github.com/doshi-ak/multi-agent-orchestration.git)~) 
* Conflicts in the source and inspiration public repos that influenced this build?
