/**
 * Dashboard rendering (M4 block, PLAN.md §4/§7, DoD 7).
 *
 * Self-contained HTML, no external requests (no CDN CSS/JS, no remote fonts/
 * images — everything inline). Reads the same M2-owned schema module
 * team_status already reads (the one sanctioned cross-block seam); never
 * hand-parses the state files itself.
 *
 * HARD BOUNDARY (PLAN.md §3.8): pure read + render. No model calls, no agent
 * dispatch, no writes outside `_team/dashboard.html`.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  parseState,
  parseProgress,
  parseRoles,
  type StateDoc,
  type ProgressEntry,
} from "../state/schema.js";
import {
  agentsDir,
  archiveDir,
  parseFrontmatter,
  progressFile,
  rolesFile,
  stateFile,
  teamDir,
} from "../shared.js";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isOverdue(eta: string, now: number): boolean {
  if (!eta) return false;
  const t = Date.parse(eta);
  return !Number.isNaN(t) && t < now;
}

function statusBadge(status: string): string {
  const colors: Record<string, string> = {
    DONE: "#1a7f37",
    DONE_WITH_CONCERNS: "#9a6700",
    NEEDS_CONTEXT: "#9a6700",
    BLOCKED: "#cf222e",
    IN_PROGRESS: "#0969da",
    IDLE: "#57606a",
  };
  const color = colors[status] ?? "#57606a";
  return `<span style="display:inline-block;padding:1px 8px;border-radius:10px;font-size:.75rem;font-weight:600;color:#fff;background:${color}">${escapeHtml(status)}</span>`;
}

interface RosterRow {
  agent: string;
  role: string;
  status: string;
}

/**
 * The team roster, source of truth = `.claude/agents/*.md` on disk — the
 * same source `agent_list`/`team_status` already use (agent_create never
 * auto-populates STATE.md's `## Team` table, so trusting `doc.team` alone
 * silently drops every agent nobody separately ran `state_write
 * (op: upsert_agent)` for). `doc.team` is layered in ONLY for its `status`
 * field, which has no other source; agents with no STATE.md status entry
 * yet default to IDLE (STATUS_VOCAB's baseline, matching a freshly-staffed
 * agent with no explicit status set).
 */
function buildRoster(root: string, doc: StateDoc): RosterRow[] {
  const dir = agentsDir(root);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md")) : [];
  const statusByAgent = new Map(doc.team.map((m) => [m.agent, m.status]));
  return files
    .map((f) => {
      const name = f.replace(/\.md$/, "");
      const { fm } = parseFrontmatter(fs.readFileSync(path.join(dir, f), "utf8"));
      return { agent: name, role: fm.role ?? "(unknown)", status: statusByAgent.get(name) ?? "IDLE" };
    })
    .sort((a, b) => a.agent.localeCompare(b.agent));
}

function teamTable(roster: RosterRow[]): string {
  if (roster.length === 0) return "<p><em>No agents staffed yet — run team-new-agent.</em></p>";
  const rows = roster
    .map(
      (m) =>
        `<tr><td>${escapeHtml(m.agent)}</td><td>${escapeHtml(m.role)}</td><td>${statusBadge(m.status)}</td></tr>`,
    )
    .join("\n");
  return `<table><thead><tr><th>Agent</th><th>Role</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function activeWorkTable(doc: StateDoc, now: number): string {
  if (doc.active_work.length === 0) return "<p><em>No active work claimed.</em></p>";
  const rows = doc.active_work
    .map((w) => {
      const overdue = isOverdue(w.eta, now);
      const etaCell = w.eta
        ? `<span style="${overdue ? "color:#cf222e;font-weight:600" : ""}">${escapeHtml(w.eta)}${overdue ? " (overdue)" : ""}</span>`
        : "<em>open-ended</em>";
      return `<tr${overdue ? ' style="background:#fff1f0"' : ""}><td>${escapeHtml(w.task)}</td><td>${escapeHtml(w.owner)}</td><td>${escapeHtml(w.claimed_at)}</td><td>${etaCell}</td></tr>`;
    })
    .join("\n");
  return `<table><thead><tr><th>Task</th><th>Owner</th><th>Claimed</th><th>ETA</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function blockersList(doc: StateDoc): string {
  if (doc.blockers.length === 0) return "<p>None. ✅</p>";
  return `<ul>${doc.blockers.map((b) => `<li>${escapeHtml(b.desc)}</li>`).join("\n")}</ul>`;
}

function progressTail(entries: ProgressEntry[], n: number): string {
  if (entries.length === 0) return "<p><em>No progress logged yet.</em></p>";
  const tail = entries.slice(-n).reverse();
  const rows = tail
    .map(
      (e) =>
        `<li><code>${escapeHtml(e.timestamp)}</code> <strong>${escapeHtml(e.actor)}</strong> — ${escapeHtml(e.event)}: ${escapeHtml(e.outcome)}</li>`,
    )
    .join("\n");
  return `<ul style="font-size:.85rem;line-height:1.6">${rows}</ul>`;
}

/** Render `_team/dashboard.html` content from the current on-disk state. Pure function of the files' contents + `now`. */
export function renderDashboardHtml(root: string, now: number): string {
  const projectName = path.basename(root);
  const hasHarness = fs.existsSync(teamDir(root));
  if (!hasHarness) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(projectName)} — team dashboard</title></head><body><p>No _team/ harness yet. Run team_init.</p></body></html>\n`;
  }

  const doc = parseState(fs.readFileSync(stateFile(root), "utf8"));
  const progress = fs.existsSync(progressFile(root))
    ? parseProgress(fs.readFileSync(progressFile(root), "utf8"))
    : [];
  const roles = fs.existsSync(rolesFile(root))
    ? parseRoles(fs.readFileSync(rolesFile(root), "utf8"))
    : [];
  const archivedCount = fs.existsSync(archiveDir(root))
    ? fs.readdirSync(archiveDir(root)).filter((f) => f.endsWith(".md")).length
    : 0;
  const overdueCount = doc.active_work.filter((w) => isOverdue(w.eta, now)).length;
  const roster = buildRoster(root, doc);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(doc.project || projectName)} — team dashboard</title>
<meta http-equiv="refresh" content="0" disabled>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#1f2328;background:#fff}
  h1{font-size:1.4rem;margin-bottom:.1rem}
  .meta{color:#57606a;font-size:.85rem;margin-bottom:1.5rem}
  h2{font-size:1.05rem;margin-top:2rem;border-bottom:1px solid #d0d7de;padding-bottom:.3rem}
  table{border-collapse:collapse;width:100%;font-size:.9rem}
  th,td{text-align:left;padding:.4rem .6rem;border-bottom:1px solid #eaeef2}
  th{color:#57606a;font-weight:600}
  code{background:#f6f8fa;padding:1px 5px;border-radius:4px;font-size:.85em}
  .stat{display:inline-block;margin-right:1.5rem;font-size:.85rem;color:#57606a}
  .stat b{color:#1f2328;font-size:1.1rem;display:block}
  .warn{color:#cf222e;font-weight:600}
</style>
</head>
<body>
<h1>${escapeHtml(doc.project || projectName)} — team dashboard</h1>
<p class="meta">Generated ${escapeHtml(new Date(now).toISOString())} · self-contained, no external requests · regenerates on every state mutation</p>

<div>
  <span class="stat"><b>${roster.length}</b>agents</span>
  <span class="stat"><b>${archivedCount}</b>archived</span>
  <span class="stat"><b>${doc.active_work.length}</b>active work</span>
  <span class="stat${overdueCount > 0 ? " warn" : ""}"><b>${overdueCount}</b>overdue</span>
  <span class="stat"><b>${doc.blockers.length}</b>blockers</span>
  <span class="stat"><b>${roles.length}</b>role registrations</span>
</div>

<h2>Team</h2>
${teamTable(roster)}

<h2>Active work</h2>
${activeWorkTable(doc, now)}

<h2>Blockers</h2>
${blockersList(doc)}

<h2>Last manager tick</h2>
<p>${doc.last_manager_tick ? `<code>${escapeHtml(doc.last_manager_tick)}</code>` : "<em>Never ticked — run team-manager.</em>"}</p>

<h2>Recent progress (last 15)</h2>
${progressTail(progress, 15)}
</body>
</html>
`;
}

/** Regenerate `_team/dashboard.html` on disk. Returns the file path written. */
export function refreshDashboard(root: string, now: number): string {
  const file = path.join(teamDir(root), "dashboard.html");
  fs.mkdirSync(teamDir(root), { recursive: true });
  fs.writeFileSync(file, renderDashboardHtml(root, now), "utf8");
  return file;
}
