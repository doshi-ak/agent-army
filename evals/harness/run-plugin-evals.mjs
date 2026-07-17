#!/usr/bin/env node
/**
 * Agent Army — M3 plugin conformance evals (Evelyn / Evaluator).
 *
 * M3 ships a Claude Code PLUGIN (skills + manifest + bundled roles), not server
 * tools — so the stdio MCP harness can't drive it. This runner is the objective
 * M3 gate: manifest validity, the 8 required skills present, and every SKILL.md
 * conforming to the agentskills.io format contract (PLAN §10.5) + the M3 spec
 * (PLAN §7). Live "/plugin install" is a surface-matrix item (needs a real Code
 * session); this proves the shipped artifact is structurally correct.
 *
 * Writes evals/results/plugin.json (milestone M3) + prints a summary. Exit 1 on FAIL.
 * Run: node evals/harness/run-plugin-evals.mjs
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");
const PLUGIN = path.join(REPO, "plugin");
const OUT_DIR = path.resolve(__dirname, "..", "results");
const OUT = path.join(OUT_DIR, "plugin.json");

// The 8 skills M3 must ship (PLAN §7 M3 acceptance).
const REQUIRED_SKILLS = ["team-init", "team-new-task", "team-new-agent", "team-retire-agent",
  "team-assign-role", "team-skill-forge", "team-status", "team-manager"];

const checks = [];
const add = (id, title, milestone, fn) => {
  try { fn(); checks.push({ id, title, milestone, status: "PASS", detail: "" }); }
  catch (e) { checks.push({ id, title, milestone, status: "FAIL", detail: String(e.message || e) }); }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

function parseFrontmatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const fm = {};
  for (const line of text.slice(3, end).split("\n")) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) fm[m[1].toLowerCase()] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return { fm, body: text.slice(end + 4) };
}

// M3-01: plugin manifest exists and is valid.
add("M3-01", "plugin.json manifest exists and is valid JSON with a name", "M3", () => {
  const mf = path.join(PLUGIN, ".claude-plugin", "plugin.json");
  assert(fs.existsSync(mf), ".claude-plugin/plugin.json missing");
  const json = JSON.parse(fs.readFileSync(mf, "utf8"));
  assert(typeof json.name === "string" && json.name.length > 0, "manifest needs a non-empty 'name'");
});

// M3-02: all 8 required skills are present.
add("M3-02", "all 8 required skills are present (PLAN §7)", "M3", () => {
  const skillsDir = path.join(PLUGIN, "skills");
  assert(fs.existsSync(skillsDir), "plugin/skills/ missing");
  const present = new Set(fs.readdirSync(skillsDir));
  const missing = REQUIRED_SKILLS.filter((s) => !present.has(s));
  assert(missing.length === 0, `missing skills: ${missing.join(", ")}`);
});

// M3-03: every SKILL.md conforms to the agentskills.io format contract.
add("M3-03", "every SKILL.md conforms (name==dir, ≤64 lc-hyphen, description ≤1024, body <500 lines)", "M3", () => {
  const skillsDir = path.join(PLUGIN, "skills");
  const problems = [];
  for (const dir of fs.readdirSync(skillsDir)) {
    const md = path.join(skillsDir, dir, "SKILL.md");
    if (!fs.existsSync(md)) { problems.push(`${dir}: no SKILL.md`); continue; }
    const parsed = parseFrontmatter(fs.readFileSync(md, "utf8"));
    if (!parsed) { problems.push(`${dir}: no frontmatter`); continue; }
    const { fm, body } = parsed;
    if (!fm.name) problems.push(`${dir}: missing name`);
    else {
      if (fm.name !== dir) problems.push(`${dir}: name '${fm.name}' != dir`);
      if (!/^[a-z0-9-]+$/.test(fm.name)) problems.push(`${dir}: name not lowercase-hyphen`);
      if (fm.name.length > 64) problems.push(`${dir}: name > 64 chars`);
    }
    if (!fm.description) problems.push(`${dir}: missing description`);
    else if (fm.description.length > 1024) problems.push(`${dir}: description > 1024 chars`);
    if (body.split("\n").length > 500) problems.push(`${dir}: body > 500 lines`);
  }
  assert(problems.length === 0, problems.join("; "));
});

// M3-04: skill-forge skill exists (DoD 5 net-new nudge target) — supersedes the
// stdio harness's BLOCKED EVAL-11.
add("M3-04", "team-skill-forge skill exists and is documented (DoD 5)", "M3", () => {
  const md = path.join(PLUGIN, "skills", "team-skill-forge", "SKILL.md");
  assert(fs.existsSync(md), "team-skill-forge/SKILL.md missing");
  const parsed = parseFrontmatter(fs.readFileSync(md, "utf8"));
  assert(parsed && /skill/i.test(parsed.fm.description || ""), "skill-forge description should describe skill authoring");
});

// M3-05: bundled roles/agents are shipped with the plugin.
add("M3-05", "plugin bundles role/agent definitions", "M3", () => {
  const hasRoles = fs.existsSync(path.join(PLUGIN, "roles")) && fs.readdirSync(path.join(PLUGIN, "roles")).length > 0;
  const hasAgents = fs.existsSync(path.join(PLUGIN, "agents")) && fs.readdirSync(path.join(PLUGIN, "agents")).length > 0;
  assert(hasRoles || hasAgents, "plugin ships no bundled roles or agents");
});

// M3-06: numeric library-count claims in skill prose must match the manifest.
// Regression eval for the Architect's Jul-17 M3 defect: team-new-agent/SKILL.md
// said "223 curated community agents" while agents/manifest.json holds 232 —
// a shipped skill stating a wrong number that a session reads verbatim.
add("M3-06", "skill prose library counts match agents/manifest.json", "M3", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(REPO, "agents", "manifest.json"), "utf8"));
  const libCount = Array.isArray(manifest) ? manifest.length : (manifest.agents?.length ?? manifest.count);
  assert(Number.isInteger(libCount) && libCount > 0, "agents/manifest.json has no readable count");
  const skillsDir = path.join(PLUGIN, "skills");
  const bad = [];
  for (const dir of fs.readdirSync(skillsDir)) {
    const file = path.join(skillsDir, dir, "SKILL.md");
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      if (!/community agents|agent library/i.test(line)) continue;
      // Only 3-digit-plus claims refer to the library (the curated catalog is 10).
      for (const m of line.matchAll(/\b(\d{3,4})\b/g)) {
        if (Number(m[1]) !== libCount) bad.push(`${dir}: says ${m[1]}, manifest has ${libCount}`);
      }
    }
  }
  assert(bad.length === 0, `stale library counts in skill prose: ${bad.join("; ")}`);
});

// M3-07: a declared license must ship its LICENSE file (Architect's Jul-17 defect:
// plugin.json says MIT, no LICENSE anywhere in the repo).
add("M3-07", "declared license has a LICENSE file in repo or plugin root", "M3", () => {
  const mf = path.join(PLUGIN, ".claude-plugin", "plugin.json");
  const json = JSON.parse(fs.readFileSync(mf, "utf8"));
  if (!json.license) return; // nothing declared, nothing owed
  const candidates = ["LICENSE", "LICENSE.md", "LICENSE.txt"]
    .flatMap((n) => [path.join(REPO, n), path.join(PLUGIN, n)]);
  assert(candidates.some((p) => fs.existsSync(p)),
    `plugin.json declares "${json.license}" but no LICENSE file exists in repo or plugin root`);
});

const fail = checks.filter((c) => c.status === "FAIL").length;
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  suite: "plugin-m3", milestone: "M3", generatedAt: new Date().toISOString(),
  total: checks.length, pass: checks.length - fail, fail, checks,
}, null, 2), "utf8");

console.log(`M3 plugin conformance: ${checks.length - fail}/${checks.length} pass`);
for (const c of checks) console.log(`  ${c.status === "PASS" ? "✓" : "✗"} ${c.id} ${c.title}${c.detail ? " — " + c.detail : ""}`);
console.log(`Results: ${OUT}`);
process.exit(fail > 0 ? 1 : 0);
