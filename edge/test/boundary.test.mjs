/**
 * §3.8 ARCHITECTURE BOUNDARY GUARD — the rule that was only prose until now.
 *
 * PLAN §3.8 / the ratified M6 row: "the SERVER still never calls out — M6
 * components are session-side/edge adapters." That holds only if `server/`
 * never reaches into `edge/`. `edge/` legitimately contains outbound HTTP
 * (Manus, Telegram); if any server module ever imports it, the server gains a
 * network path transitively and §3.8 is silently broken — the compiled-output
 * scan (EVAL-10) would not necessarily catch an indirect import chain.
 *
 * Cody's standing thesis, applied to my own lane: a confidently-stated rule with
 * no command behind it is not enforced. This file is the command.
 *
 * Run: node --test edge/test/boundary.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, "..", "..");

/** Every file under a dir matching an extension set. */
function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules") continue;
      walk(p, exts, out);
    } else if (exts.some((x) => e.name.endsWith(x))) {
      out.push(p);
    }
  }
  return out;
}

test("§3.8: no server SOURCE file imports or references edge/ (server must stay outbound-free)", () => {
  const files = walk(path.join(REPO, "server", "src"), [".ts"]);
  assert.ok(files.length > 0, "expected server/src to contain TypeScript sources");
  const offenders = [];
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    // any import/require/dynamic-import that resolves into edge/
    if (/(?:from|require\(|import\()\s*['"][^'"]*(?:^|\/|\.\.\/)edge\//.test(src) ||
        /['"][^'"]*\/edge\/[^'"]*['"]/.test(src)) {
      offenders.push(path.relative(REPO, f));
    }
  }
  assert.deepEqual(offenders, [], `server/src must never import from edge/ — §3.8 violated by: ${offenders.join(", ")}`);
});

test("§3.8: no server COMPILED output references edge/ (catches indirect/transitive leaks)", () => {
  const files = walk(path.join(REPO, "server", "dist"), [".js"]);
  assert.ok(files.length > 0, "expected server/dist to be built — run: cd server && npm run build");
  const offenders = files.filter((f) => /\/edge\/|['"][^'"]*edge\/[a-z-]+\.mjs/.test(fs.readFileSync(f, "utf8")))
    .map((f) => path.relative(REPO, f));
  assert.deepEqual(offenders, [], `compiled server must not reference edge/: ${offenders.join(", ")}`);
});

test("edge outbound modules are NOT reachable from the server's dependency graph", () => {
  // The two modules that can perform network I/O. Neither may appear anywhere
  // in the server tree — source or compiled.
  const outbound = ["manus-offload", "telegram-push"];
  const serverFiles = [
    ...walk(path.join(REPO, "server", "src"), [".ts"]),
    ...walk(path.join(REPO, "server", "dist"), [".js"]),
  ];
  const hits = [];
  for (const f of serverFiles) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of outbound) if (src.includes(m)) hits.push(`${path.relative(REPO, f)} → ${m}`);
  }
  assert.deepEqual(hits, [], `server must not reference edge outbound modules: ${hits.join(", ")}`);
});

test("edge modules do not import the server (edge stays a standalone adapter layer)", () => {
  // Keeps the seam one-directional: edge talks to the server through the M2 MCP
  // tools at runtime, not by importing its internals (BUILD-RULES §4).
  const files = walk(path.join(REPO, "edge"), [".mjs"]).filter((f) => !f.includes("/test/"));
  const offenders = files.filter((f) => /(?:from|require\(|import\()\s*['"][^'"]*server\/(?:src|dist)\//.test(fs.readFileSync(f, "utf8")))
    .map((f) => path.relative(REPO, f));
  assert.deepEqual(offenders, [], `edge/ must not import server internals: ${offenders.join(", ")}`);
});
