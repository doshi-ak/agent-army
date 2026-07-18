#!/usr/bin/env node
/**
 * Agent Army — eval summary dashboard (Evelyn / Evaluator).
 *
 * Aggregates every eval suite's machine-readable results (evals/results/*.json)
 * into ONE self-contained HTML page that a non-technical human can read at a
 * glance — the "flip-phone grandmother" standard: traffic-light status, plain
 * English, no jargon, and an explicit sign-off table that forces Cody Banks,
 * Excelcius, and Olga to cross-reference and audit.
 *
 * Reads:  evals/results/functional.json, roles.json, harness-meta.json (optional)
 *         + presence of evals/INTEGRATION-DECISION-EVAL.md
 * Writes: evals/DASHBOARD.html  (self-contained — safe to publish as an Artifact)
 * Run:    node evals/harness/build-dashboard.mjs
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVALS = path.resolve(__dirname, "..");
const RES = process.env.EVAL_RESULTS_DIR || path.join(EVALS, "results");
const OUT = process.env.EVAL_DASHBOARD_OUT || path.join(EVALS, "DASHBOARD.html");

const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(RES, f), "utf8")); } catch { return null; } };
const functional = read("functional.json");
const roles = read("roles.json");
const meta = read("harness-meta.json");
const scenarios = read("scenarios.json");
const sl = read("session-layer.json");
const hasIntegration = fs.existsSync(path.join(EVALS, "INTEGRATION-DECISION-EVAL.md"));

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

// ---- roll up an overall traffic light (severity-aware, no false alarms) ----
// ENGINE failures (the core software or a safety rule) are a true alarm → RED.
// LIBRARY failures (a bundled job-description file with a bad name) must be
// fixed but do NOT mean the engine is broken → ORANGE with an honest headline.
// Warnings / can't-test-yet → AMBER. All clear → GREEN.
let engineFails = 0, libraryFails = 0, needsAttention = 0, cantRunYet = 0;
if (functional) { engineFails += functional.axis1.fail + functional.axis2.guardrailBreaches; cantRunYet += functional.axis1.blocked; }
if (meta) { engineFails += (meta.fail || 0); }
if (roles) { libraryFails += roles.scope.combined.fail; needsAttention += roles.scope.combined.warn; }
if (scenarios) { engineFails += (scenarios.scenarios || []).filter((x) => x.status !== "PASS").length; }
if (sl) {
  engineFails += (sl.cases || []).filter((c) => c.status === "FAIL").length;
  cantRunYet += (sl.cases || []).filter((c) => c.status === "BLOCKED").length;
}
const hardFails = engineFails + libraryFails;

const overall = engineFails > 0 ? "RED"
  : libraryFails > 0 ? "ORANGE"
  : (needsAttention > 0 || cantRunYet > 0) ? "AMBER" : "GREEN";
const OV = {
  GREEN: { emoji: "🟢", word: "ALL GOOD", plain: "Everything we can check right now is working. Nothing is broken.", color: "#1a8a4a" },
  AMBER: { emoji: "🟡", word: "NEEDS A LOOK", plain: "Nothing is broken, but some things need tidying up or can't be tested yet.", color: "#b8860b" },
  ORANGE: { emoji: "🟠", word: "ENGINE OK — A FEW FILES NEED FIXING", plain: `The core software passed every test. But ${libraryFails} of the bundled "job-description" files have a problem that must be fixed before shipping. Details below.`, color: "#d35400" },
  RED: { emoji: "🔴", word: "SOMETHING IS BROKEN", plain: "A core check or a safety rule failed. A person must fix it before this ships.", color: "#c0392b" },
}[overall];

const when = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
const pill = (level) => ({ PASS: "✅ Working", WARN: "⚠️ Needs tidying", FAIL: "❌ Broken", BLOCKED: "⏳ Can't test yet" }[level] || level);

// ---- suite cards ----
const cards = [];

if (functional) {
  const rows = functional.cases.map((c) => `
    <tr class="lv-${c.status}">
      <td class="mono">${esc(c.id)}</td>
      <td>${esc(c.title)}</td>
      <td>${esc(c.dod)}</td>
      <td class="st">${pill(c.status)}</td>
      <td class="detail">${c.detail ? esc(c.detail) : "&mdash;"}</td>
    </tr>`).join("");
  cards.push(`
  <section class="card">
    <h2>1 &middot; Does the engine work?</h2>
    <p class="lede">These are the ${functional.axis1.scoreable + functional.axis1.blocked} core checks of the Agent Army "engine" &mdash; the part that creates the team, tracks who is doing what, and keeps an honest logbook. Think of it like a car's dashboard warning lights: green means the part was tested and is fine.</p>
    <div class="tiles">
      <div class="tile ok"><b>${functional.axis1.pass}</b><span>checks passed</span></div>
      <div class="tile ${functional.axis1.fail ? "bad" : "ok"}"><b>${functional.axis1.fail}</b><span>checks failed</span></div>
      <div class="tile ${functional.axis2.guardrailBreaches ? "bad" : "ok"}"><b>${functional.axis2.guardrailBreaches}</b><span>safety-rule breaches</span></div>
      <div class="tile wait"><b>${functional.axis1.blocked}</b><span>can't test yet*</span></div>
    </div>
    <table><thead><tr><th>ID</th><th>What it checks</th><th>Requirement</th><th>Result</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>
    ${functional.notes?.length ? `<div class="notes"><b>Things we noticed:</b><ul>${functional.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>` : ""}
    <p class="foot">*"Can't test yet" means the part isn't built yet (the plugin and the live dashboard are later steps) &mdash; it is NOT a failure.</p>
  </section>`);
}

if (roles) {
  const c = roles.scope.combined;
  const catRows = Object.entries(roles.byCategory).sort((a, b) => b[1].fail - a[1].fail || b[1].warn - a[1].warn)
    .map(([name, t]) => `<tr class="${t.fail ? "lv-FAIL" : t.warn ? "lv-WARN" : "lv-PASS"}"><td>${esc(name)}</td><td>${t.total}</td><td>${t.pass}</td><td>${t.warn}</td><td>${t.fail}</td></tr>`).join("");
  const failRows = roles.failures.map((f) => `<tr class="lv-FAIL"><td class="mono">${esc(f.name)}</td><td class="detail">${esc(f.reasons.join("; "))}</td></tr>`).join("");
  cards.push(`
  <section class="card">
    <h2>2 &middot; Are the ${c.total} "job description" files clean?</h2>
    <p class="lede">Agent Army ships a library of ${c.total} ready-made worker profiles (a "debugger", a "writer", and so on). Each is a text file with a name and a job description. This checks every one follows the rules: has a proper name, a real description, actual instructions, and &mdash; importantly &mdash; contains no passwords or secret keys.</p>
    <div class="tiles">
      <div class="tile ok"><b>${c.pass}</b><span>fully clean</span></div>
      <div class="tile ${c.warn ? "warn" : "ok"}"><b>${c.warn}</b><span>usable, need tidying</span></div>
      <div class="tile ${c.fail ? "bad" : "ok"}"><b>${c.fail}</b><span>must be fixed</span></div>
    </div>
    ${failRows ? `<h3>Must be fixed</h3><table><thead><tr><th>Profile</th><th>Problem</th></tr></thead><tbody>${failRows}</tbody></table>` : "<p class='good'>✅ No profile is broken.</p>"}
    <h3>By category</h3>
    <table><thead><tr><th>Category</th><th>Total</th><th>Clean</th><th>Tidy-ups</th><th>Broken</th></tr></thead><tbody>${catRows}</tbody></table>
    <p class="foot">"Need tidying" is usually a missing tool-list or model note &mdash; the profile still works, it's just not fully spelled out. ${esc(roles.note)}</p>
  </section>`);
}

if (scenarios) {
  const rows = (scenarios.scenarios || []).map((x) => `
    <tr class="lv-${x.status === "PASS" ? "PASS" : "FAIL"}">
      <td class="mono">${esc(x.id)}</td><td>${esc(x.title)}</td>
      <td class="st">${x.status === "PASS" ? "✅ Passed" : "❌ Failed"}</td>
      <td><b>${x.weighted}</b>/100</td>
      <td class="detail">${(x.dims || []).map((d) => `${esc(d.name)} ${d.score}`).join(" · ") || "&mdash;"}</td>
    </tr>`).join("");
  cards.push(`
  <section class="card">
    <h2>3 &middot; Does it actually run your real projects?</h2>
    <p class="lede">The three sample projects you gave us, run end-to-end through the real system: the <b>prediction-market research lab</b> (paper mode &mdash; it recommends, it never trades), the <b>LinkedIn content engine</b> (drafts everything, publishes nothing without you), and the <b>online-course launch</b> (all spending and sending waits for your approval). Each is scored on five things: does the paperwork match reality, is every action logged with sources, does anything sneak past your approval, does the manager loop catch problems, and does the dashboard tell the truth. Passing needs 80/100.</p>
    <div class="tiles">
      <div class="tile ${scenarios.axis3?.floorMet ? "ok" : "bad"}"><b>${scenarios.axis3?.score ?? "?"}</b><span>overall score /100</span></div>
      <div class="tile ok"><b>${(scenarios.scenarios || []).filter((x) => x.status === "PASS").length}/${(scenarios.scenarios || []).length}</b><span>projects passing</span></div>
    </div>
    <table><thead><tr><th>ID</th><th>Project</th><th>Result</th><th>Score</th><th>Breakdown</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="foot">The most important line: in every project, money moves, posts publish, and decisions get made <b>only</b> when a human approves. The tests plant temptations and verify nothing crosses.</p>
  </section>`);
}

if (sl) {
  const rows = (sl.cases || []).map((c) => `
    <tr class="lv-${c.status}">
      <td class="mono">${esc(c.id)}</td><td>${esc(c.title)}</td><td class="st">${pill(c.status)}</td>
      <td class="detail">${esc(String(c.evidence || "")).slice(0, 260)}${String(c.evidence || "").length > 260 ? "&hellip;" : ""}</td>
    </tr>`).join("");
  cards.push(`
  <section class="card">
    <h2>4 &middot; Does it work the way a person actually uses it?</h2>
    <p class="lede">Everything above tests the machinery directly. This section tests the <b>human path</b>: installing the plugin the way you would, typing plain-English requests ("set this project up for an agent team") and confirming the right skill wakes up and does its job &mdash; plus proving the safety rails hold (pushing code, deleting files, and network calls stay behind your approval).</p>
    <div class="tiles">
      <div class="tile ok"><b>${(sl.cases || []).filter((c) => c.status === "PASS").length}</b><span>passed</span></div>
      <div class="tile ${(sl.cases || []).some((c) => c.status === "FAIL") ? "bad" : "ok"}"><b>${(sl.cases || []).filter((c) => c.status === "FAIL").length}</b><span>failed</span></div>
      <div class="tile wait"><b>${(sl.cases || []).filter((c) => c.status === "BLOCKED").length}</b><span>awaiting a surface run</span></div>
    </div>
    <table><thead><tr><th>ID</th><th>What it checks</th><th>Result</th><th>Evidence (abridged)</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="foot">Recorded by a live session with pasted evidence &mdash; a missing or out-of-date record shows as "can't test yet", never as a pass. Full detail: <span class="mono">evals/results/session-layer.json</span>.</p>
  </section>`);
}

cards.push(`
  <section class="card">
    <h2>5 &middot; Should we bolt on outside tools? (Perplexity, Tavily, &hellip;)</h2>
    <p class="lede">A judgment question, not a pass/fail one: when someone offers a shiny outside tool (a web-search add-on like Perplexity or Tavily, an outside worker service), should Agent Army swallow it whole, keep it at arm's length, or skip it? The rule of thumb, from the project's own architecture: keep outside tools <b>separate and swappable</b> unless there's a strong reason not to &mdash; fewer moving parts, less that can break.</p>
    <div class="tiles">
      <div class="tile ${hasIntegration ? "ok" : "wait"}"><b>${hasIntegration ? "✓" : "…"}</b><span>${hasIntegration ? "analysis written" : "analysis in progress"}</span></div>
    </div>
    <p class="foot">Full scored analysis: <span class="mono">evals/INTEGRATION-DECISION-EVAL.md</span> ${hasIntegration ? "(ready to read)" : "(being drafted)"}.</p>
  </section>`);

// ---- sign-off (forcing function) ----
const signoff = `
  <section class="card signoff">
    <h2>6 &middot; Who has checked this? (sign-off)</h2>
    <p class="lede">Evals only matter if people actually read them. Each teammate below must cross-reference these results against their own area and initial the box. An unsigned row means "nobody has audited this yet."</p>
    <table><thead><tr><th>Teammate</th><th>Their job here</th><th>What to cross-check</th><th>Signed?</th></tr></thead><tbody>
      <tr><td><b>Cody Banks</b><br><span class="role">Architect</span></td><td>Owns the blueprint</td><td>Do the passing checks match what the plan (PLAN.md) promised? Are the "can't test yet" items really just later steps?</td><td class="sign">☐ initials ____ date ____</td></tr>
      <tr><td><b>Excelcius</b><br><span class="role">Builder</span></td><td>Writes the code</td><td>Fix the broken items above. Re-run the checks. Confirm green before calling a milestone done.</td><td class="sign">☐ initials ____ date ____</td></tr>
      <tr><td><b>Olga</b><br><span class="role">Orchestrator</span></td><td>Keeps everyone honest</td><td>Confirm this page's status matches git-truth and gets reported to Akash. Flag any stale/ignored row.</td><td class="sign">☐ initials ____ date ____</td></tr>
    </tbody></table>
  </section>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agent Army — Eval Report Card</title>
<style>
  :root { color-scheme: light dark; --bg:#f6f7f9; --card:#fff; --ink:#1a1f26; --mut:#5b6572; --line:#e3e7ec; --ok:#1a8a4a; --warn:#b8860b; --bad:#c0392b; --wait:#4a6da7; }
  @media (prefers-color-scheme: dark){ :root{ --bg:#0f1319; --card:#171d26; --ink:#e8ecf1; --mut:#9aa5b1; --line:#28303b; } }
  :root[data-theme="dark"]{ --bg:#0f1319; --card:#171d26; --ink:#e8ecf1; --mut:#9aa5b1; --line:#28303b; }
  :root[data-theme="light"]{ --bg:#f6f7f9; --card:#fff; --ink:#1a1f26; --mut:#5b6572; --line:#e3e7ec; }
  * { box-sizing:border-box; } html,body{ margin:0; }
  body { background:var(--bg); color:var(--ink); font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; padding:24px 16px 64px; }
  .wrap { max-width:1000px; margin:0 auto; }
  .hero { border-radius:18px; padding:28px 26px; color:#fff; background:${OV.color}; box-shadow:0 6px 24px rgba(0,0,0,.14); }
  .hero .big { font-size:clamp(30px,6vw,46px); font-weight:800; letter-spacing:-.5px; margin:2px 0 6px; }
  .hero .plain { font-size:clamp(16px,2.4vw,20px); opacity:.96; max-width:60ch; }
  .hero .meta { margin-top:14px; font-size:14px; opacity:.9; }
  h1.name { font-size:15px; text-transform:uppercase; letter-spacing:2px; opacity:.85; margin:0; font-weight:700; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:22px 22px; margin-top:20px; }
  .card h2 { font-size:21px; margin:0 0 6px; }
  .card h3 { font-size:15px; text-transform:uppercase; letter-spacing:.5px; color:var(--mut); margin:22px 0 8px; }
  .lede { color:var(--ink); max-width:74ch; margin:0 0 14px; }
  .tiles { display:flex; flex-wrap:wrap; gap:12px; margin:6px 0 8px; }
  .tile { flex:1 1 130px; border:1px solid var(--line); border-radius:12px; padding:14px; text-align:center; background:var(--bg); }
  .tile b { display:block; font-size:32px; font-weight:800; line-height:1; }
  .tile span { font-size:12.5px; color:var(--mut); display:block; margin-top:6px; }
  .tile.ok b{ color:var(--ok);} .tile.bad b{ color:var(--bad);} .tile.warn b{ color:var(--warn);} .tile.wait b{ color:var(--wait);}
  .tbl-scroll, table { width:100%; }
  table { border-collapse:collapse; margin-top:8px; font-size:14px; display:table; overflow-x:auto; }
  th,td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { font-size:12px; text-transform:uppercase; letter-spacing:.4px; color:var(--mut); }
  td.st,.sign { white-space:nowrap; } .mono{ font-family:ui-monospace,Menlo,Consolas,monospace; font-size:13px; }
  .detail { color:var(--mut); font-size:13px; }
  tr.lv-FAIL td { background:rgba(192,57,43,.09); } tr.lv-WARN td { background:rgba(184,134,11,.08); }
  tr.lv-BLOCKED td { background:rgba(74,109,167,.08); }
  .notes { background:var(--bg); border:1px solid var(--line); border-radius:10px; padding:10px 14px; margin-top:14px; font-size:14px; }
  .notes ul { margin:6px 0 0; padding-left:20px; } .notes li { margin:4px 0; }
  .foot { color:var(--mut); font-size:13px; margin-top:12px; } .good{ color:var(--ok); font-weight:600; }
  .signoff .role { font-size:12px; color:var(--mut); } .sign { font-family:ui-monospace,monospace; font-size:12.5px; color:var(--mut); }
  .legend { display:flex; flex-wrap:wrap; gap:16px; margin-top:16px; font-size:13.5px; color:var(--mut); }
  footer { text-align:center; color:var(--mut); font-size:12.5px; margin-top:28px; }
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <h1 class="name">Agent Army &mdash; Eval Report Card</h1>
    <div class="big">${OV.emoji} ${OV.word}</div>
    <div class="plain">${OV.plain}</div>
    <div class="meta">Last checked: ${when} &nbsp;·&nbsp; ${hardFails} broken &nbsp;·&nbsp; ${needsAttention} need tidying &nbsp;·&nbsp; ${cantRunYet} can't test yet</div>
  </header>

  <div class="legend">
    <span>✅ Working = tested and fine</span>
    <span>⚠️ Needs tidying = works, but not perfect</span>
    <span>❌ Broken = must be fixed before shipping</span>
    <span>⏳ Can't test yet = the part isn't built yet</span>
  </div>

  ${cards.join("\n")}
  ${signoff}

  <footer>
    Generated automatically from the eval harness by Evelyn (Evaluator). This page reads live result files &mdash;
    re-run the checks and rebuild to refresh. Every claim here is machine-checked against the real software, not hand-written.
  </footer>
</div>
<script>
  // Respect an artifact host's theme toggle if present.
  try { var t = document.documentElement.getAttribute('data-theme'); if(t) document.documentElement.setAttribute('data-theme', t); } catch(e){}
</script>
</body>
</html>`;

fs.writeFileSync(OUT, html, "utf8");

// Also emit an Artifact-compatible variant (style + body content only — no
// doctype/html/head/body wrapper; the Artifact host supplies those).
const styleBlock = (html.match(/<style>[\s\S]*?<\/style>/) || [""])[0];
const bodyInner = (html.match(/<body>([\s\S]*?)<\/body>/) || [null, ""])[1];
const ARTIFACT_OUT = process.env.EVAL_DASHBOARD_OUT
  ? OUT.replace(/\.html$/, ".artifact.html")
  : path.join(EVALS, "DASHBOARD.artifact.html");
fs.writeFileSync(ARTIFACT_OUT, `${styleBlock}\n${bodyInner}`, "utf8");

console.log(`Dashboard written: ${OUT}  (overall: ${overall} — ${hardFails} fail / ${needsAttention} warn / ${cantRunYet} blocked)`);
