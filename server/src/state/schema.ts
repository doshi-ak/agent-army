/**
 * State-file schema: parsers + serializers for the three `_team/` files
 * (M2-owned, per ./README.md). PLAN.md §5 grammar.
 *
 * Round-trip is the M2 acceptance test: parse(serialize(x)) deep-equals x for
 * every field we own. We deliberately parse a small, controlled YAML subset
 * (scalars, null, empty arrays, and block sequences of flat objects) instead
 * of pulling a YAML dependency — the warehouse rule is no new runtime deps for
 * what we fully control, and we control both sides of this round-trip.
 *
 * HARD BOUNDARY (PLAN.md §3.8): pure data. No model calls, no agent dispatch.
 */

// ------------------------------------------------------------------ types

export type Status =
  | "DONE"
  | "DONE_WITH_CONCERNS"
  | "NEEDS_CONTEXT"
  | "BLOCKED"
  | "IN_PROGRESS"
  | "IDLE";

export const STATUS_VOCAB: readonly Status[] = [
  "DONE",
  "DONE_WITH_CONCERNS",
  "NEEDS_CONTEXT",
  "BLOCKED",
  "IN_PROGRESS",
  "IDLE",
];

export interface TeamMember {
  agent: string;
  role: string;
  status: Status;
}

export interface WorkItem {
  task: string;
  owner: string;
  claimed_at: string; // ISO-8601
  eta: string; // ISO-8601 or "" when open-ended
}

export interface Blocker {
  desc: string;
}

/** The machine-readable mirror carried in STATE.md's YAML frontmatter. */
export interface StateDoc {
  project: string;
  team: TeamMember[];
  active_work: WorkItem[];
  blockers: Blocker[];
  last_manager_tick: string | null; // ISO-8601 or null
}

export interface ProgressEntry {
  timestamp: string;
  actor: string;
  event: string;
  outcome: string;
}

export interface RoleRow {
  role: string;
  agentFile: string;
  sourceTemplate: string;
  history: string;
}

// ------------------------------------------------------- STATE.md frontmatter

/** Split `---\n...\n---\n<body>`; throws if the frontmatter fence is absent. */
export function splitFrontmatter(markdown: string): { fm: string; body: string } {
  const m = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) {
    throw new Error(
      "STATE.md is missing its `---` YAML frontmatter fence. It may be corrupt — re-run team_init or restore from PROGRESS.md history.",
    );
  }
  return { fm: m[1], body: markdown.slice(m[0].length) };
}

function stripComment(line: string): string {
  // Only whole-line comments are used in our files; leave inline `#` in values.
  return line.replace(/^\s*#.*$/, "");
}

/** Parse the controlled YAML subset in STATE.md frontmatter into a StateDoc. */
export function parseState(markdown: string): StateDoc {
  const { fm } = splitFrontmatter(markdown);
  const lines = fm.split(/\r?\n/);
  const doc: StateDoc = {
    project: "",
    team: [],
    active_work: [],
    blockers: [],
    last_manager_tick: null,
  };

  let i = 0;
  while (i < lines.length) {
    const raw = stripComment(lines[i]);
    if (raw.trim() === "") {
      i++;
      continue;
    }
    const kv = raw.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) {
      i++;
      continue;
    }
    const key = kv[1];
    const inline = kv[2].trim();

    // Block sequence: `key:` with no inline value, followed by `  - ...` items.
    if (inline === "" && key !== "project") {
      const items: Record<string, string>[] = [];
      i++;
      let current: Record<string, string> | null = null;
      while (i < lines.length) {
        const seq = lines[i].match(/^\s*-\s+([A-Za-z0-9_]+):\s*(.*)$/);
        const cont = lines[i].match(/^\s{4,}([A-Za-z0-9_]+):\s*(.*)$/);
        if (seq) {
          current = {};
          current[seq[1]] = unquote(seq[2].trim());
          items.push(current);
          i++;
        } else if (cont && current) {
          current[cont[1]] = unquote(cont[2].trim());
          i++;
        } else {
          break;
        }
      }
      assignArray(doc, key, items);
      continue;
    }

    // Scalars / null / empty-array-inline.
    if (inline === "[]") {
      assignArray(doc, key, []);
    } else if (inline === "null") {
      if (key === "last_manager_tick") doc.last_manager_tick = null;
    } else if (key === "project") {
      doc.project = unquote(inline);
    } else if (key === "last_manager_tick") {
      doc.last_manager_tick = unquote(inline) || null;
    }
    i++;
  }
  return doc;
}

function assignArray(doc: StateDoc, key: string, items: Record<string, string>[]): void {
  if (key === "team") {
    doc.team = items.map((o) => ({
      agent: o.agent ?? "",
      role: o.role ?? "",
      status: (STATUS_VOCAB.includes(o.status as Status) ? o.status : "IDLE") as Status,
    }));
  } else if (key === "active_work") {
    doc.active_work = items.map((o) => ({
      task: o.task ?? "",
      owner: o.owner ?? "",
      claimed_at: o.claimed_at ?? "",
      eta: o.eta ?? "",
    }));
  } else if (key === "blockers") {
    doc.blockers = items.map((o) => ({ desc: o.desc ?? "" }));
  }
}

function unquote(v: string): string {
  // q() below always double-quotes via JSON.stringify, so reverse it with
  // JSON.parse (not a bare slice) — otherwise escaped characters (a literal
  // `"` becomes `\"`) survive as literal backslashes and the round-trip
  // corrupts the value. Single-quote handling is a defensive fallback only
  // for hand-edited files; q() never emits it.
  if (v.startsWith('"') && v.endsWith('"')) {
    try {
      return JSON.parse(v) as string;
    } catch {
      return v.slice(1, -1);
    }
  }
  if (v.startsWith("'") && v.endsWith("'")) {
    return v.slice(1, -1);
  }
  return v;
}

/** Quote a scalar iff it needs it (empty, or YAML-significant chars). */
function q(v: string): string {
  if (v === "" || /[:#\[\]{}'"\n]|^\s|\s$/.test(v)) return JSON.stringify(v);
  return v;
}

/** Serialize a StateDoc back to the canonical frontmatter block (no fences). */
export function serializeState(doc: StateDoc): string {
  const out: string[] = [];
  out.push(`project: ${q(doc.project)}`);

  const seq = (key: string, rows: Record<string, string>[]): void => {
    if (rows.length === 0) {
      out.push(`${key}: []`);
      return;
    }
    out.push(`${key}:`);
    for (const row of rows) {
      Object.entries(row).forEach(([k, v], idx) => {
        out.push(`${idx === 0 ? "  - " : "    "}${k}: ${q(v)}`);
      });
    }
  };

  seq("team", doc.team.map((t) => ({ agent: t.agent, role: t.role, status: t.status })));
  seq(
    "active_work",
    doc.active_work.map((w) => ({
      task: w.task,
      owner: w.owner,
      claimed_at: w.claimed_at,
      eta: w.eta,
    })),
  );
  seq("blockers", doc.blockers.map((b) => ({ desc: b.desc })));
  out.push(`last_manager_tick: ${doc.last_manager_tick === null ? "null" : q(doc.last_manager_tick)}`);
  return out.join("\n");
}

/** Render a full STATE.md: frontmatter mirror + human-readable tables, kept in sync. */
export function renderStateMd(doc: StateDoc): string {
  const teamRows = doc.team.map((t) => `| ${t.agent} | ${t.role} | ${t.status} |`).join("\n");
  const workRows = doc.active_work
    .map((w) => `| ${w.task} | ${w.owner} | ${w.claimed_at} | ${w.eta} |`)
    .join("\n");
  const blockers = doc.blockers.length ? doc.blockers.map((b) => `- ${b.desc}`).join("\n") : "(none)";
  const tick = doc.last_manager_tick ?? "(never run)";
  return `---
${serializeState(doc)}
---

# STATE.md — current truth for ${doc.project}

<!-- Maintained by the multi-agent-mcp server tools. Status vocabulary:
     DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED | IN_PROGRESS | IDLE -->

## Team

| Agent | Role | Status |
|---|---|---|
${teamRows}

## Active Work

| Task | Owner | Claimed at | ETA |
|---|---|---|---|
${workRows}

## Blockers

${blockers}

## Last Manager Tick

${tick}
`;
}

// ------------------------------------------------------------- PROGRESS.md

/** `- [ISO timestamp] <actor> — <event>: <outcome>` (em dash separator). */
const PROGRESS_RE = /^-\s*\[([^\]]+)\]\s*(.+?)\s+—\s+([^:]+):\s*(.*)$/;

export function parseProgress(markdown: string): ProgressEntry[] {
  const out: ProgressEntry[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const m = line.match(PROGRESS_RE);
    if (!m) continue;
    out.push({
      timestamp: m[1].trim(),
      actor: m[2].trim(),
      event: m[3].trim(),
      outcome: m[4].trim(),
    });
  }
  return out;
}

export function formatProgress(e: ProgressEntry): string {
  return `- [${e.timestamp}] ${e.actor} — ${e.event}: ${e.outcome}`;
}

// --------------------------------------------------------------- ROLES.md

/** `| Role | Agent file | Source template | History |` registry rows. */
export function parseRoles(markdown: string): RoleRow[] {
  const out: RoleRow[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith("|")) continue;
    const cells = t.slice(1, t.endsWith("|") ? -1 : undefined).split("|").map((c) => c.trim());
    if (cells.length < 4) continue;
    // Skip header + separator rows.
    if (cells[0].toLowerCase() === "role" || /^-+$/.test(cells[0].replace(/\s/g, ""))) continue;
    out.push({
      role: cells[0],
      agentFile: cells[1],
      sourceTemplate: cells[2],
      history: cells[3],
    });
  }
  return out;
}

// --------------------------------------------------------------- manager

export interface ManagerReport {
  staleClaims: { task: string; owner: string; eta: string }[];
  idleAgents: string[];
  progressSinceLastTick: number;
  evalGap: string | null;
  recommendations: string[];
}

/**
 * Pure manager-tick computation (no I/O) — the core of the `manager_tick`
 * tool, factored out so it's unit-testable against fixtures. Given the parsed
 * state, progress log, an eval-file count, and the current epoch, returns the
 * recommendations report. Read-only: it decides nothing, it advises.
 */
export function computeManagerTick(
  doc: StateDoc,
  progress: ProgressEntry[],
  evalFileCount: number,
  now: number,
): ManagerReport {
  const staleClaims = doc.active_work
    .filter((w) => {
      if (!w.eta) return false;
      const eta = Date.parse(w.eta);
      return Number.isFinite(eta) && now > eta;
    })
    .map((w) => ({ task: w.task, owner: w.owner, eta: w.eta }));

  const idleAgents = doc.team.filter((t) => t.status === "IDLE").map((t) => t.agent);

  const lastTick = doc.last_manager_tick ? Date.parse(doc.last_manager_tick) : NaN;
  const progressSinceLastTick = Number.isFinite(lastTick)
    ? progress.filter((e) => Date.parse(e.timestamp) > lastTick).length
    : progress.length;

  const evalGap =
    evalFileCount === 0
      ? "No eval cases found in evals/ — generate at least one acceptance case per active work item."
      : null;

  const recommendations: string[] = [];
  for (const s of staleClaims) {
    recommendations.push(
      `Stale claim: "${s.task}" (owner ${s.owner}) is past its ETA ${s.eta} — reassign, extend, or mark blocked.`,
    );
  }
  for (const a of idleAgents) {
    recommendations.push(`Idle agent "${a}" — assign from the active queue or retire.`);
  }
  if (evalGap) recommendations.push(evalGap);
  if (recommendations.length === 0) {
    recommendations.push("No action needed: no stale claims, no idle agents, eval coverage present.");
  }

  return { staleClaims, idleAgents, progressSinceLastTick, evalGap, recommendations };
}
