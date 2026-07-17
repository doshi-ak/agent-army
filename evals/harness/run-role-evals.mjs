#!/usr/bin/env node
/**
 * Agent Army — per-role conformance eval (Evelyn / Evaluator).
 *
 * The library ships 200+ agent role files. Behavioral evals for each (does the
 * debugger actually debug?) are a future, cost-disclosed tier that needs real
 * model dispatch. THIS runner is the objective, runnable-now gate: every role
 * file must satisfy the authoring CONTRACT (PLAN §6 + §10.5 agentskills.io
 * format law + RULES no-secrets) before it is fit to deploy. A role that fails
 * the contract is "loose shrapnel" — this catches it statically, for all 232.
 *
 * Verdicts per role: PASS (contract clean) / WARN (deployable but flawed) /
 * FAIL (unfit: no frontmatter, no name/description, empty body, or a secret).
 *
 * Writes evals/results/roles.json (consumed by the dashboard) + prints a summary.
 * Run: node evals/harness/run-role-evals.mjs
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");
// Paths are env-overridable so the meta-suite (test-the-tester) can point this
// runner at fixtures without clobbering the real results.
const LIB = process.env.ROLE_EVAL_LIB || path.join(REPO, "agents", "agents");  // the 232-role library
const CURATED = process.env.ROLE_EVAL_CURATED || path.join(REPO, "server", "roles"); // curated v1 catalog
const OUT_DIR = process.env.ROLE_EVAL_OUT ? path.dirname(process.env.ROLE_EVAL_OUT) : path.resolve(__dirname, "..", "results");
const OUT = process.env.ROLE_EVAL_OUT || path.join(OUT_DIR, "roles.json");

const KNOWN_MODELS = new Set(["haiku", "sonnet", "opus", "fable", "inherit", "claude-opus-4-8",
  "claude-sonnet-5", "claude-haiku-4-5", "claude-fable-5"]);
// Secret shapes we must never ship in a role file (RULES §1/§4 no-secrets).
const SECRET_PATTERNS = [
  [/\bsk-[A-Za-z0-9]{20,}/, "OpenAI-style key"],
  [/\bghp_[A-Za-z0-9]{20,}/, "GitHub token"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key"],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key block"],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, "Slack token"],
];

function listRoleFiles(root) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...listRoleFiles(full));
    else if (entry.name.endsWith(".md")
      && !["README.md", "ATTRIBUTION.md", "MERGES.md", "CHANGELOG.md"].includes(entry.name))
      out.push(full);
  }
  return out;
}

/** Parse a --- frontmatter --- block into a flat key→value map (best-effort YAML-lite). */
function parseFrontmatter(text) {
  if (!text.startsWith("---")) return { fm: null, body: text };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { fm: null, body: text };
  const raw = text.slice(3, end).trim();
  const body = text.slice(end + 4).trim();
  const fm = {};
  // Handles YAML block scalars (key: >- / > / |) by folding the indented
  // continuation lines into the value. The old line-regex read only the marker
  // char as the value — 6 rich multi-line descriptions scored as "<20 chars"
  // (false WARN, caught 2026-07-17). Not a YAML engine; enough for role files.
  const lines = raw.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (/^[>|][+-]?$/.test(val)) {
      const parts = [];
      while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || lines[i + 1].trim() === "")) {
        parts.push(lines[++i].trim());
      }
      val = parts.join(" ").trim();
    }
    fm[m[1].toLowerCase()] = val.replace(/^["']|["']$/g, "").trim();
  }
  return { fm, body };
}

function evalRole(file, categoryRoot) {
  const rel = path.relative(categoryRoot, file);
  const category = rel.includes(path.sep) ? rel.split(path.sep)[0] : "(root)";
  const stem = path.basename(file, ".md");
  const text = fs.readFileSync(file, "utf8");
  const { fm, body } = parseFrontmatter(text);
  const reasons = [];
  let level = "PASS";
  const fail = (r) => { reasons.push("FAIL: " + r); level = "FAIL"; };
  const warn = (r) => { reasons.push("WARN: " + r); if (level === "PASS") level = "WARN"; };

  if (!fm) { fail("no valid --- frontmatter --- block"); }
  else {
    if (!fm.name) fail("missing 'name'");
    else {
      if (!/^[a-z0-9-]+$/.test(fm.name)) fail(`'name' not lowercase-hyphen: '${fm.name}'`);
      if (fm.name.length > 64) fail("'name' > 64 chars (agentskills.io limit)");
      if (fm.name !== stem) warn(`'name' ('${fm.name}') != filename ('${stem}')`);
    }
    if (!fm.description) fail("missing 'description'");
    else {
      if (fm.description.length < 20) warn("'description' < 20 chars (too thin to route on)");
      if (fm.description.length > 1024) fail("'description' > 1024 chars (agentskills.io limit)");
    }
    // Omitting 'model'/'tools' is the NATIVE SUBAGENT DEFAULT (inherit), not a
    // defect: the library is 232 upstream-verbatim templates whose provenance we
    // preserve, and PLAN §9.6 tiering assigns models at deploy time — a pinned
    // model in a role file would fight the tiering policy. Downgraded WARN→INFO
    // (adjudicated 2026-07-17; was 100+8 warns). Whether the CURATED 10 should
    // pin minimal tool sets is an architecture call — routed to the Architect
    // (BOARD 2026-07-17). INFO is reported in counts, never in warn lists.
    const info = (r) => reasons.push("INFO: " + r);
    if (!fm.model) info("no 'model' declared (inherits session model — native default)");
    else if (!KNOWN_MODELS.has(fm.model.toLowerCase())) warn(`unknown model '${fm.model}'`);
    if (!fm.tools) info("no 'tools' declared (inherits session tools — native default)");
  }
  if (!body || body.length < 200) fail(`body too short (${body.length} chars) — no real instructions`);
  for (const [re, label] of SECRET_PATTERNS)
    if (re.test(text)) fail(`possible embedded secret (${label})`);

  return { file: path.relative(REPO, file), name: fm?.name ?? stem, category, level, reasons };
}

const libFiles = listRoleFiles(LIB).map((f) => evalRole(f, LIB));
const curatedFiles = listRoleFiles(CURATED).map((f) => evalRole(f, CURATED));
const all = [...libFiles, ...curatedFiles];

const tally = (arr) => ({
  total: arr.length,
  pass: arr.filter((r) => r.level === "PASS").length,
  warn: arr.filter((r) => r.level === "WARN").length,
  fail: arr.filter((r) => r.level === "FAIL").length,
});
const byCategory = {};
for (const r of all) {
  const c = (byCategory[r.category] ??= { total: 0, pass: 0, warn: 0, fail: 0 });
  c.total++; c[r.level.toLowerCase()]++;
}

const result = {
  suite: "role-conformance",
  generatedAt: new Date().toISOString(),
  scope: { library: tally(libFiles), curated: tally(curatedFiles), combined: tally(all) },
  byCategory,
  failures: all.filter((r) => r.level === "FAIL").map((r) => ({ file: r.file, name: r.name, reasons: r.reasons })),
  warnings: all.filter((r) => r.level === "WARN").map((r) => ({ file: r.file, name: r.name, reasons: r.reasons })),
  note: "Static contract gate only (frontmatter/name/description/body/no-secrets). Behavioral per-role evals (does the role DO its job?) are a future cost-disclosed tier requiring model dispatch.",
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 2), "utf8");

const c = result.scope.combined;
console.log(`Role conformance: ${c.total} roles · PASS ${c.pass} · WARN ${c.warn} · FAIL ${c.fail}`);
console.log(`  library ${result.scope.library.total} (${result.scope.library.fail} fail, ${result.scope.library.warn} warn) · curated ${result.scope.curated.total} (${result.scope.curated.fail} fail)`);
if (result.failures.length) {
  console.log("  FAILURES:");
  for (const f of result.failures.slice(0, 20)) console.log(`   ✗ ${f.file} — ${f.reasons.join("; ")}`);
  if (result.failures.length > 20) console.log(`   … +${result.failures.length - 20} more`);
}
console.log(`Results: ${OUT}`);
process.exit(result.scope.combined.fail > 0 ? 1 : 0);
