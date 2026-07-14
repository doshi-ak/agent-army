import { useMemo, useState } from "react";

/* ────────────────────────────── data (source of truth: PLAN.md v1.1) ── */

type Status = "shipped" | "building" | "designed";

const STATUS_META: Record<Status, { label: string; bg: string; fg: string }> = {
  shipped: { label: "Shipped", bg: "var(--ok-soft)", fg: "var(--ok)" },
  building: { label: "In build", bg: "var(--warn-soft)", fg: "var(--warn)" },
  designed: { label: "Designed", bg: "var(--muted-chip)", fg: "var(--ink-soft)" },
};

const MILESTONES: { id: string; name: string; plain: string; status: Status; owner: string }[] = [
  { id: "M1", name: "Server core", plain: "The engine: sets up a project's team, creates/retires agents, assigns roles", status: "designed", owner: "Executor — next up" },
  { id: "M2", name: "State engine + manager", plain: "The memory: the three team files plus the manager's maintenance loop", status: "designed", owner: "Executor (after M1)" },
  { id: "M3", name: "Skills plugin", plain: "The controls: the words you say to run everything", status: "designed", owner: "Executor" },
  { id: "M4", name: "Dashboard", plain: "The window: a live page showing what every agent is doing", status: "designed", owner: "Executor" },
  { id: "M5", name: "Guide + evals + 3-surface test", plain: "The proof: this guide finalized, 10 graded tests, verified on all three apps", status: "building", owner: "Architect (guide) + Executor" },
];

type Role = { name: string; team: string; job: string; source: string; status: Status };

const ROLES: Role[] = [
  { name: "agent-manager", team: "Management", job: "The team's chief of staff: keeps the whiteboard, logbook, and org chart current; proposes new tests and role improvements", source: "New (this build)", status: "designed" },
  { name: "researcher", team: "Operations", job: "Answers questions with cited, multi-source research", source: "Orchestration v1", status: "shipped" },
  { name: "inbox-ops", team: "Operations", job: "Triage for email, calendar, and messages — drafts only, never sends", source: "Orchestration v1", status: "shipped" },
  { name: "finance-markets", team: "Operations", job: "Portfolio and market analysis — strictly read-only, proposes but never trades", source: "Orchestration v1", status: "shipped" },
  { name: "builder", team: "Operations", job: "Writes code and builds servers; nothing is done until it compiles and runs", source: "Orchestration v1", status: "shipped" },
  { name: "writer", team: "Operations", job: "Turns research and data into polished documents, decks, and pages", source: "Orchestration v1", status: "shipped" },
  { name: "verifier", team: "Quality", job: "Adversarial quality gate: tries to break deliverables before you see them", source: "Orchestration v1", status: "shipped" },
  { name: "debugger", team: "Engineering", job: "Hunts down why something is broken and pinpoints the fix", source: "Superteam library", status: "designed" },
  { name: "systems-architect", team: "Engineering", job: "Designs how the pieces fit together before anyone builds", source: "Superteam library", status: "designed" },
  { name: "regression-test-engineer", team: "Quality", job: "Makes sure new changes never silently break old features", source: "Superteam library", status: "designed" },
  { name: "ci-cd-engineer", team: "Engineering", job: "Automates the build-test-release pipeline", source: "Superteam library", status: "designed" },
  { name: "forward-deployed-engineer", team: "Engineering", job: "Drops into a new environment and gets things working end-to-end", source: "Superteam library", status: "designed" },
  { name: "code-reviewer", team: "Quality", job: "Reads every change for bugs, clarity, and safety", source: "Superteam library", status: "designed" },
  { name: "security-auditor", team: "Quality", job: "Checks for leaked secrets, unsafe commands, and risky patterns", source: "Superteam library", status: "designed" },
  { name: "docs-writer", team: "Operations", job: "Keeps documentation accurate and readable as the code evolves", source: "Superteam library", status: "designed" },
  { name: "performance-engineer", team: "Engineering", job: "Finds and fixes what's slow", source: "Superteam library", status: "designed" },
];

const SKILLS = [
  { name: "team:init", say: "Set up an agent team in this project", does: "Deploys the whole harness into the current folder: agents, the three team files, server wiring, and the dashboard. In a brand-new project it also offers to build custom skills for that environment.", note: "Safe to re-run; never overwrites your work." },
  { name: "team:new-task", say: "Have the team handle X", does: "Takes a task, picks the right agents, hands each one full context, and logs the work in the team files.", note: "This is the everyday command." },
  { name: "team:new-agent", say: "Add a debugger to the team", does: "Creates a new agent from a role template, customized with your project's context.", note: "" },
  { name: "team:retire-agent", say: "Retire the docs agent", does: "Removes an agent — archived, never hard-deleted, so it can come back.", note: "" },
  { name: "team:assign-role", say: "Make that agent a security auditor", does: "Re-roles an existing agent from the specialties catalog.", note: "" },
  { name: "team:skill-forge", say: "Build this project its own skills", does: "Walks through creating custom Agent Skills for your specific project, following the agentskills.io standard.", note: "Fires automatically in net-new environments." },
  { name: "team:status", say: "How's the team doing?", does: "Reads the team files and gives you the picture — plus refreshes the dashboard.", note: "" },
  { name: "team:manager", say: "Run team maintenance", does: "The agent-manager reviews everything: stale work, missing tests, role tune-ups, throughput ideas. You approve; it applies.", note: "The iteration loop from the spec." },
];

const FILES = [
  { f: "_team/STATE.md", plain: "The whiteboard — who's on the team, who's doing what right now, what's blocked" },
  { f: "_team/PROGRESS.md", plain: "The logbook — a permanent, timestamped record of everything that happened" },
  { f: "_team/ROLES.md", plain: "The org chart — each role, where it came from, and how it's been refined" },
  { f: "_team/dashboard.html", plain: "The window — double-click to watch the team work; refreshes itself" },
  { f: ".claude/agents/", plain: "The staff — one file per agent; your Claude session reads these automatically" },
];

const RUNBOOK = [
  { q: "The team's tools don't show up", a: "The server likely isn't built yet in this copy of the project. In the project folder, run the two setup commands from Quick Start (npm install, npm run build), then restart the Claude session." },
  { q: "\"/plugin install\" can't find the plugin", a: "Add the marketplace first: /plugin marketplace add <the multi-agent-mcp repo>. Then install. Restart the session after installing." },
  { q: "On the web version, the team looks out of date", a: "That's expected — the web version syncs when the project syncs to GitHub. Ask any session to \"commit and push the team state,\" then reload." },
  { q: "An agent seems stuck", a: "Say \"run team maintenance\" — the manager flags stale work and recommends what to do. Nothing is auto-killed without you." },
  { q: "Can agents spend money or send emails?", a: "No. By design, every trade, purchase, send, or publish stops and waits for your explicit approval. This is permanent and not configurable off." },
];

const GLOSSARY = [
  { t: "MCP server", d: "A small helper program Claude can call for specific jobs. This one is the team's filing system — it never thinks or writes code itself." },
  { t: "Plugin", d: "An installable add-on for Claude Code. Ours adds the team:* commands." },
  { t: "Skill", d: "A recipe Claude follows when you say a certain phrase. \"team:init\" is a skill." },
  { t: "Agent", d: "A specialist copy of Claude with one job and only the tools that job needs." },
  { t: "Harness", d: "Everything above, wired together in one project and ready to work." },
];

/* ────────────────────────────── small pieces ── */

function Badge({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span
      className="mono inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold"
      style={{ background: m.bg, color: m.fg }}
    >
      {m.label}
    </span>
  );
}

function Cmd({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="flex items-center justify-between gap-3 rounded border px-3 py-2"
      style={{ borderColor: "var(--line)", background: "var(--paper-raised)" }}
    >
      <code className="mono min-w-0 flex-1 overflow-x-auto whitespace-pre text-[13px]">{text}</code>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className="mono shrink-0 rounded border px-2 py-1 text-[11px] font-semibold transition-colors"
        style={{
          borderColor: copied ? "var(--ok)" : "var(--line)",
          color: copied ? "var(--ok)" : "var(--ink-soft)",
          background: copied ? "var(--ok-soft)" : "transparent",
        }}
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}

function Section({ eyebrow, title, children }: { eyebrow?: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
      <h2 className="display mb-3 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/* ────────────────────────────── tabs ── */

function Overview() {
  return (
    <div>
      <Section eyebrow="What this is" title="A staffing agency and filing system for AI agents, inside any project">
        <p className="mb-3 max-w-[65ch] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          Multi-Agent MCP turns any folder or repo into a coordinated team: specialist agents with defined
          roles, three plain-text team files that never lose the plot, a manager that keeps everything
          tuned, and a dashboard you can watch. You talk to one Claude session; it staffs, dispatches,
          and tracks the rest.
        </p>
        <p className="max-w-[65ch] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          One rule is load-bearing: <strong style={{ color: "var(--ink)" }}>the server is the filing
          system, not the brain.</strong> It manages state and roles; your Claude session does all the
          thinking and dispatching. And nothing that touches money or sends anything outward ever runs
          without your explicit OK.
        </p>
      </Section>

      <Section eyebrow="Build status" title="Where the build stands">
        <div className="flex flex-col gap-2">
          {MILESTONES.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded border px-4 py-3"
              style={{ borderColor: "var(--line)", background: "var(--paper-raised)" }}
            >
              <span className="mono w-8 text-sm font-bold" style={{ color: "var(--signal)" }}>{m.id}</span>
              <span className="display w-52 font-semibold">{m.name}</span>
              <span className="min-w-[16rem] flex-1 text-sm" style={{ color: "var(--ink-soft)" }}>{m.plain}</span>
              <span className="mono text-xs" style={{ color: "var(--ink-soft)" }}>{m.owner}</span>
              <Badge status={m.status} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm" style={{ color: "var(--ink-soft)" }}>
          Honest reading: the design is complete and ratified; construction starts with M1. This guide
          updates as milestones ship — badges above are the truth, not the ambition.
        </p>
      </Section>

      <Section eyebrow="Deployment at a glance" title="The three facts that matter">
        <ol className="flex max-w-[70ch] list-decimal flex-col gap-2 pl-5 leading-relaxed">
          <li><strong>Where it lives:</strong> one private GitHub repo (<code className="mono text-[13px]">multi-agent-mcp</code>) holding the server, the plugin, and this guide.</li>
          <li><strong>How it deploys:</strong> install the plugin once per machine, then say <em>"set up an agent team in this project"</em> in any folder — that's the whole deployment.</li>
          <li><strong>Where it works:</strong> Claude Code Desktop, Terminal, and Web. Desktop + Terminal share your Mac's files live; Web syncs through GitHub.</li>
        </ol>
      </Section>

      <Section eyebrow="Who built it" title="The build team">
        <p className="max-w-[70ch] text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          Three coordinated Claude sessions: <strong style={{ color: "var(--ink)" }}>Architect</strong> (Desktop — spec, tests, this guide),{" "}
          <strong style={{ color: "var(--ink)" }}>Orchestrator</strong> (Terminal — routing, changelog, cleanliness),{" "}
          <strong style={{ color: "var(--ink)" }}>Executor</strong> (Kiro — construction). They coordinate through shared files in{" "}
          <code className="mono text-[12px]">MCP-Builder/_coordination/</code> — the same pattern this product ships to you.
        </p>
      </Section>
    </div>
  );
}

function QuickStart() {
  const [surface, setSurface] = useState<"desktop" | "cli" | "web">("desktop");
  const steps: Record<string, { note: string; items: { label: string; cmd?: string }[] }> = {
    desktop: {
      note: "Claude Code in the Mac desktop app.",
      items: [
        { label: "1 · Add the marketplace (once per machine) — paste into the Claude Code input:", cmd: "/plugin marketplace add doshi-ak/multi-agent-mcp" },
        { label: "2 · Install the plugin:", cmd: "/plugin install multi-agent-mcp@multi-agent-mcp" },
        { label: "3 · Open the project folder you want a team in, then say:", cmd: "Set up an agent team in this project" },
        { label: "4 · Give it work:", cmd: "Have the team research X and draft a one-pager" },
        { label: "5 · Watch: double-click _team/dashboard.html in the project folder." },
      ],
    },
    cli: {
      note: "The claude command in Terminal. Same commands — type them in the session.",
      items: [
        { label: "1 · In Terminal, go to your project and start Claude:", cmd: "cd ~/path/to/your-project && claude" },
        { label: "2 · Add marketplace + install (once per machine):", cmd: "/plugin marketplace add doshi-ak/multi-agent-mcp" },
        { label: "3 · Install:", cmd: "/plugin install multi-agent-mcp@multi-agent-mcp" },
        { label: "4 · Deploy the team:", cmd: "Set up an agent team in this project" },
        { label: "5 · Check on things anytime:", cmd: "How's the team doing?" },
      ],
    },
    web: {
      note: "claude.ai/code, working on a GitHub repo. The repo carries everything.",
      items: [
        { label: "1 · Make sure the project repo already has a team (set up once from Desktop or Terminal, then pushed)." },
        { label: "2 · Open the repo in Claude Code Web — the server and team files arrive with the clone." },
        { label: "3 · Work normally:", cmd: "Have the team pick up the next task from STATE" },
        { label: "4 · Before you leave, sync:", cmd: "Commit and push the team state" },
        { label: "5 · Honest limit: Web sees the repo, not your Mac. Desktop/Terminal sync instantly; Web syncs at push/pull." },
      ],
    },
  };
  const s = steps[surface];
  return (
    <div>
      <div
        className="mb-6 rounded border px-4 py-3 text-sm"
        style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--ink)" }}
      >
        <strong>Timing note:</strong> these commands go live when Milestone 3 ships. They're shown now because
        they're final per the spec — this page is the contract the build is being tested against.
      </div>
      <div className="mb-5 flex gap-2">
        {(["desktop", "cli", "web"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setSurface(k)}
            className="display rounded px-3 py-1.5 text-sm font-semibold transition-colors"
            style={{
              background: surface === k ? "var(--signal)" : "var(--muted-chip)",
              color: surface === k ? "#fff" : "var(--ink-soft)",
            }}
          >
            {k === "desktop" ? "Desktop app" : k === "cli" ? "Terminal (CLI)" : "Web"}
          </button>
        ))}
      </div>
      <p className="mb-4 text-sm" style={{ color: "var(--ink-soft)" }}>{s.note}</p>
      <div className="flex flex-col gap-3">
        {s.items.map((it, i) => (
          <div key={i}>
            <div className="mb-1 text-sm font-medium">{it.label}</div>
            {it.cmd && <Cmd text={it.cmd} />}
          </div>
        ))}
      </div>
      <div className="mt-8">
        <div className="eyebrow mb-1">Actually-quick guide</div>
        <p className="max-w-[65ch] text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          Install once → open any project → <em>"set up an agent team in this project"</em> →{" "}
          <em>"have the team do X"</em> → open the dashboard. That's the entire product.
        </p>
      </div>
    </div>
  );
}

function Architecture() {
  return (
    <div>
      <Section eyebrow="The one picture" title="Your session thinks. The server files. The dashboard shows.">
        <div className="flex flex-wrap items-stretch gap-3">
          {[
            { t: "Your Claude session", d: "Runs the agents, makes every decision, dispatches all work", accent: true },
            { t: "Multi-Agent MCP server", d: "Files everything: team roster, roles, state. Never runs AI, never spawns agents", accent: false },
            { t: "_team/ files + dashboard", d: "The permanent record — readable by you, any session, any surface", accent: false },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="max-w-[15rem] rounded border-2 px-4 py-3"
                style={{
                  borderColor: b.accent ? "var(--signal)" : "var(--line)",
                  background: "var(--paper-raised)",
                }}
              >
                <div className="display text-sm font-bold">{b.t}</div>
                <div className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>{b.d}</div>
              </div>
              {i < 2 && <span className="mono text-lg" style={{ color: "var(--signal)" }}>→</span>}
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          This boundary is a hard constraint from the spec (PLAN §3.8): if an implementation ever makes the
          server call an AI model or spawn an agent, it fails review automatically. It keeps the system
          debuggable — everything the team "knows" is in files you can open.
        </p>
      </Section>

      <Section eyebrow="The team files" title="Five things appear in your project">
        <div className="flex flex-col gap-2">
          {FILES.map((f) => (
            <div
              key={f.f}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded border px-4 py-2.5"
              style={{ borderColor: "var(--line)", background: "var(--paper-raised)" }}
            >
              <code className="mono w-56 shrink-0 text-[13px] font-semibold" style={{ color: "var(--signal)" }}>{f.f}</code>
              <span className="min-w-[16rem] flex-1 text-sm" style={{ color: "var(--ink-soft)" }}>{f.plain}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Continuity" title="How three apps stay one team">
        <p className="max-w-[70ch] text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          The whole system is files in your project, and the server ships inside the repo — so any surface
          that opens the project gets the identical team. Desktop and Terminal share your Mac's disk in
          real time. Web works on the GitHub copy: it's fully capable, and it catches up (and shares back)
          whenever the repo syncs. No surface has a degraded feature set — only a different sync moment.
        </p>
      </Section>
    </div>
  );
}

function Roles() {
  const [team, setTeam] = useState("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"name" | "status" | "team">("team");
  const teams = ["All", ...Array.from(new Set(ROLES.map((r) => r.team)))];
  const rows = useMemo(() => {
    let r = ROLES.filter(
      (x) =>
        (team === "All" || x.team === team) &&
        (q === "" || (x.name + x.job + x.source).toLowerCase().includes(q.toLowerCase())),
    );
    const ord: Record<Status, number> = { shipped: 0, building: 1, designed: 2 };
    r = [...r].sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name)
      : sort === "status" ? ord[a.status] - ord[b.status] || a.name.localeCompare(b.name)
      : a.team.localeCompare(b.team) || a.name.localeCompare(b.name),
    );
    return r;
  }, [team, q, sort]);

  return (
    <div>
      <p className="mb-4 max-w-[70ch] text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        The v1 catalog: 7 operating agents that exist today, plus 10 specialties curated from a
        232-role community library (VoltAgent + wshobson, MIT-licensed, attributed). Deliberately
        curated — a team hires the specialist a task needs, never all 232 at once.
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {teams.map((t) => (
          <button
            key={t}
            onClick={() => setTeam(t)}
            className="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
            style={{
              borderColor: team === t ? "var(--signal)" : "var(--line)",
              background: team === t ? "var(--signal-soft)" : "transparent",
              color: team === t ? "var(--signal)" : "var(--ink-soft)",
            }}
          >
            {t}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search roles…"
          className="ml-auto rounded border px-3 py-1.5 text-sm"
          style={{ borderColor: "var(--line)", background: "var(--paper-raised)", color: "var(--ink)" }}
        />
      </div>
      <div className="overflow-x-auto rounded border" style={{ borderColor: "var(--line)" }}>
        <table className="w-full border-collapse text-sm" style={{ background: "var(--paper-raised)" }}>
          <thead>
            <tr className="text-left" style={{ borderBottom: "2px solid var(--line)" }}>
              {([["name", "Role"], ["team", "Team"], ["", "What it does (plain English)"], ["", "Source"], ["status", "Status"]] as const).map(
                ([key, label], i) => (
                  <th key={i} className="px-3 py-2.5">
                    {key ? (
                      <button
                        onClick={() => setSort(key as typeof sort)}
                        className="display flex items-center gap-1 text-xs font-bold uppercase tracking-wide"
                        style={{ color: sort === key ? "var(--signal)" : "var(--ink-soft)" }}
                      >
                        {label} {sort === key ? "▾" : ""}
                      </button>
                    ) : (
                      <span className="display text-xs font-bold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>{label}</span>
                    )}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} style={{ borderBottom: "1px solid var(--line)" }}>
                <td className="mono whitespace-nowrap px-3 py-2.5 text-[13px] font-semibold">{r.name}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs" style={{ color: "var(--ink-soft)" }}>{r.team}</td>
                <td className="min-w-[18rem] px-3 py-2.5 leading-snug" style={{ color: "var(--ink-soft)" }}>{r.job}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs" style={{ color: "var(--ink-soft)" }}>{r.source}</td>
                <td className="px-3 py-2.5"><Badge status={r.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-sm" style={{ color: "var(--ink-soft)" }}>No roles match — clear the search or pick another team.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Skills() {
  return (
    <div>
      <p className="mb-5 max-w-[70ch] text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        Eight commands cover everything. You don't memorize syntax — say the plain-English version and
        the right skill fires.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SKILLS.map((s) => (
          <div key={s.name} className="rounded border p-4" style={{ borderColor: "var(--line)", background: "var(--paper-raised)" }}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <code className="mono text-[13px] font-bold" style={{ color: "var(--signal)" }}>{s.name}</code>
            </div>
            <div className="mb-2 text-sm italic" style={{ color: "var(--ink)" }}>“{s.say}”</div>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>{s.does}</p>
            {s.note && <p className="mt-2 text-xs font-medium" style={{ color: "var(--warn)" }}>{s.note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Runbook() {
  return (
    <div>
      <Section eyebrow="When something's off" title="Fix-it guide">
        <div className="flex flex-col gap-3">
          {RUNBOOK.map((r, i) => (
            <div key={i} className="rounded border p-4" style={{ borderColor: "var(--line)", background: "var(--paper-raised)" }}>
              <div className="display mb-1 text-sm font-bold">{r.q}</div>
              <p className="max-w-[75ch] text-[13px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>{r.a}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section eyebrow="Words, translated" title="Glossary">
        <div className="flex flex-col gap-2">
          {GLOSSARY.map((g) => (
            <div key={g.t} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded border px-4 py-2.5" style={{ borderColor: "var(--line)", background: "var(--paper-raised)" }}>
              <span className="display w-28 shrink-0 text-sm font-bold">{g.t}</span>
              <span className="min-w-[16rem] flex-1 text-[13px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>{g.d}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section eyebrow="Non-negotiable" title="The guardrails">
        <ul className="flex max-w-[70ch] list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          <li>No agent ever trades, moves money, or changes orders. Proposals come to you.</li>
          <li>Nothing is sent, posted, submitted, or deleted without your explicit OK on that item.</li>
          <li>No secrets in any team file, ever — keys live in your keychain, not in the repo.</li>
          <li>Every agent sees only the tools its job needs.</li>
        </ul>
      </Section>
    </div>
  );
}

/* ────────────────────────────── shell ── */

const TABS = [
  { id: "overview", label: "Overview", el: <Overview /> },
  { id: "quickstart", label: "Quick Start", el: <QuickStart /> },
  { id: "architecture", label: "Architecture", el: <Architecture /> },
  { id: "roles", label: "Roles", el: <Roles /> },
  { id: "skills", label: "Skills", el: <Skills /> },
  { id: "runbook", label: "Runbook", el: <Runbook /> },
];

export default function App() {
  const [tab, setTab] = useState("overview");
  return (
    <div className="min-h-screen" style={{ background: "var(--paper)" }}>
      <header className="border-b px-5 pb-0 pt-8 sm:px-10" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto max-w-5xl">
          <div className="eyebrow mb-2">Field Guide · v0.9 (spec-accurate draft · updates as milestones ship)</div>
          <h1 className="display text-3xl font-bold sm:text-4xl">Multi-Agent MCP</h1>
          <p className="mt-2 max-w-[65ch] text-[15px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            Deploy a coordinated team of AI agents into any project — with a manager, a memory, and a
            dashboard. No engineering degree required.
          </p>
          <nav className="mt-6 flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="display rounded-t border-x border-t px-4 py-2 text-sm font-semibold transition-colors"
                style={{
                  borderColor: tab === t.id ? "var(--line)" : "transparent",
                  background: tab === t.id ? "var(--paper-raised)" : "transparent",
                  color: tab === t.id ? "var(--signal)" : "var(--ink-soft)",
                  marginBottom: "-1px",
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="px-5 py-8 sm:px-10">
        <div className="mx-auto max-w-5xl">{TABS.find((t) => t.id === tab)?.el}</div>
      </main>
      <footer className="border-t px-5 py-6 sm:px-10" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto max-w-5xl text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          Built by the Architect session against PLAN.md v1.1 · role templates courtesy of VoltAgent &
          wshobson agent libraries (MIT) · skill standard: agentskills.io · Coordination board:{" "}
          <code className="mono">MCP-Builder/_coordination/BOARD.md</code>
        </div>
      </footer>
    </div>
  );
}
