#!/usr/bin/env node
/**
 * Agent Army — harness meta-evals (Evelyn / Evaluator): "test the tester."
 *
 * An eval harness you haven't validated is worthless. This suite proves the
 * harness actually DETECTS breakage instead of rubber-stamping green:
 *   T1  negative tests — the role runner must FAIL a no-frontmatter file, a
 *       secret-bearing file, a bad-name file, and PASS a clean one (run against
 *       throwaway fixtures, not the real library).
 *   T2  invariants — the published result files' arithmetic must be self-consistent.
 *   T3  regression lock — the two known non-conformant library roles must still
 *       be caught (guards against someone quietly loosening the name rule).
 *   T4  dashboard integrity — building the dashboard over a synthetic FAIL must
 *       roll the whole page up to RED / "SOMETHING IS BROKEN".
 *
 * Writes evals/results/harness-meta.json + prints a summary. Exit 1 on any failure.
 * Run: node evals/harness/run-meta-evals.mjs   (run the functional + role suites first)
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVALS = path.resolve(__dirname, "..");
const RES = path.join(EVALS, "results");
const ROLE_RUNNER = path.join(__dirname, "run-role-evals.mjs");
const DASH_RUNNER = path.join(__dirname, "build-dashboard.mjs");

const results = [];
const check = (id, title, fn) => {
  try { fn(); results.push({ id, title, status: "PASS" }); console.log(`  ✓ ${id} ${title}`); }
  catch (e) { results.push({ id, title, status: "FAIL", detail: String(e.message || e) }); console.log(`  ✗ ${id} ${title}\n      ${e.message || e}`); }
};

// ---- T1: negative tests against fixtures ----
check("META-T1", "role runner detects broken/secret/bad-name roles and passes a clean one", () => {
  const fx = mkdtempSync(path.join(tmpdir(), "role-fx-"));
  const emptyCurated = mkdtempSync(path.join(tmpdir(), "curated-empty-"));
  const outFile = path.join(fx, "out.json");
  try {
    // one clean role
    fs.writeFileSync(path.join(fx, "clean-role.md"),
      `---\nname: clean-role\ndescription: Use this agent when you need a well-formed fixture role for testing the harness.\ntools: Read\nmodel: haiku\n---\n\n${"You are a clean fixture role. ".repeat(20)}`);
    // no frontmatter
    fs.writeFileSync(path.join(fx, "no-fm.md"), "Just a body, no frontmatter at all.\n".repeat(10));
    // embedded secret
    fs.writeFileSync(path.join(fx, "leaky-role.md"),
      `---\nname: leaky-role\ndescription: A role that accidentally embeds a secret key which must be caught by the scanner.\n---\n\nkey = sk-abcdefghijklmnopqrstuvwxyz012345\n${"body ".repeat(60)}`);
    // bad name (uppercase + dot)
    fs.writeFileSync(path.join(fx, "Bad.Name.md"),
      `---\nname: Bad.Name\ndescription: A role whose name violates the lowercase-hyphen contract and must fail the gate.\n---\n\n${"body text ".repeat(40)}`);

    execFileSync(process.execPath, [ROLE_RUNNER], {
      env: { ...process.env, ROLE_EVAL_LIB: fx, ROLE_EVAL_CURATED: emptyCurated, ROLE_EVAL_OUT: outFile },
      stdio: "pipe",
    });
    // exit code is nonzero on fail — execFileSync throws; so catch to still read output
    throw new Error("role runner should have exited nonzero (fixtures contain FAILs)");
  } catch (e) {
    // Expected: nonzero exit because fixtures contain failures. Read the JSON it wrote.
    const data = JSON.parse(fs.readFileSync(outFile, "utf8"));
    const byName = Object.fromEntries([...data.failures, ...data.warnings].map((r) => [r.name, r]));
    assert.equal(data.scope.combined.fail, 3, `expected exactly 3 FAILs (no-fm, leaky, bad-name); got ${data.scope.combined.fail}`);
    assert.ok(data.failures.some((f) => /no valid.*frontmatter/i.test(f.reasons.join(""))), "must flag the no-frontmatter file");
    assert.ok(data.failures.some((f) => /secret/i.test(f.reasons.join(""))), "must flag the embedded secret");
    assert.ok(data.failures.some((f) => /lowercase-hyphen|> 64|not lowercase/i.test(f.reasons.join(""))), "must flag the bad name");
    assert.ok(data.scope.combined.pass >= 1, "the clean fixture role must PASS");
  } finally {
    rmSync(fx, { recursive: true, force: true });
    rmSync(emptyCurated, { recursive: true, force: true });
  }
});

// ---- T2: result-file invariants ----
check("META-T2", "published result files are internally self-consistent", () => {
  const roles = JSON.parse(fs.readFileSync(path.join(RES, "roles.json"), "utf8"));
  const c = roles.scope.combined;
  assert.equal(c.pass + c.warn + c.fail, c.total, "roles pass+warn+fail must equal total");
  const catSum = Object.values(roles.byCategory).reduce((n, t) => n + t.total, 0);
  assert.equal(catSum, c.total, "per-category totals must sum to the combined total");

  const fnl = JSON.parse(fs.readFileSync(path.join(RES, "functional.json"), "utf8"));
  assert.equal(fnl.axis1.pass + fnl.axis1.fail, fnl.axis1.scoreable, "functional pass+fail must equal scoreable");
  assert.equal(fnl.axis1.floorMet, fnl.axis1.fail === 0 && fnl.axis1.scoreable > 0, "axis1 floor flag must match zero-fail reality");
  assert.equal(fnl.axis2.floorMet, fnl.axis2.guardrailBreaches === 0, "axis2 floor flag must match zero-breach reality");
});

// ---- T3: adaptive library-baseline regression lock ----
// The two originally-flagged dotted-name roles (dotnet-framework-4.8-expert,
// powershell-5.1-expert) were FIXED after Evelyn routed them — so a lock that
// hardcodes those filenames is brittle. Detector integrity is proven by META-T1
// (fixtures). This lock instead holds the *baseline*: the library must stay
// contract-clean; ANY new FAIL trips it. Bump the allowlist only with a reason.
const KNOWN_ACCEPTABLE_LIBRARY_FAILS = new Set([]); // was {dotnet…, powershell…}; both fixed 2026-07-17.
check("META-T3", "library conformance baseline holds — no NEW contract failures", () => {
  const roles = JSON.parse(fs.readFileSync(path.join(RES, "roles.json"), "utf8"));
  const unexpected = roles.failures.filter((f) => !KNOWN_ACCEPTABLE_LIBRARY_FAILS.has(f.name));
  assert.equal(unexpected.length, 0,
    `new/unexpected library contract failures (fix the file or justify in the allowlist): ${unexpected.map((f) => f.name).join(", ") || "none"}`);
});

// ---- T4: dashboard rolls up RED on a synthetic failure ----
check("META-T4", "dashboard rolls up to RED when any suite reports a failure", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "dash-fx-"));
  const outHtml = path.join(tmp, "d.html");
  try {
    fs.writeFileSync(path.join(tmp, "functional.json"), JSON.stringify({
      suite: "functional-mcp", generatedAt: "x",
      axis1: { scoreable: 2, pass: 1, fail: 1, blocked: 0, floorMet: false },
      axis2: { guardrailBreaches: 0, floorMet: true },
      cases: [{ id: "X", dod: "D", title: "synthetic", status: "FAIL", detail: "boom", guardrail: false }], notes: [],
    }));
    execFileSync(process.execPath, [DASH_RUNNER], {
      env: { ...process.env, EVAL_RESULTS_DIR: tmp, EVAL_DASHBOARD_OUT: outHtml }, stdio: "pipe",
    });
    const html = fs.readFileSync(outHtml, "utf8");
    assert.ok(/SOMETHING IS BROKEN/.test(html), "synthetic FAIL must produce the RED headline");
    assert.ok(!/ALL GOOD/.test(html), "must NOT claim ALL GOOD when a check failed");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ---- write + summarize ----
const fail = results.filter((r) => r.status === "FAIL").length;
fs.mkdirSync(RES, { recursive: true });
fs.writeFileSync(path.join(RES, "harness-meta.json"), JSON.stringify({
  suite: "harness-meta", generatedAt: new Date().toISOString(),
  total: results.length, pass: results.length - fail, fail, cases: results,
}, null, 2), "utf8");

console.log(`\nHarness meta-evals: ${results.length - fail}/${results.length} passed`);
console.log(`Results: ${path.join(RES, "harness-meta.json")}`);
process.exit(fail > 0 ? 1 : 0);
