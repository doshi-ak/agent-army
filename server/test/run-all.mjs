#!/usr/bin/env node
/**
 * Runs every M2 test/*.test.mjs file in this directory in sequence.
 *
 * Each file is a self-contained script (plain node:assert, no test
 * framework — see manager.test.mjs's header comment for why) that throws on
 * failure. This runner just sequences them under one `npm test` entry point
 * and reports a clear pass/fail summary per file.
 *
 * Requires `npm run build` first — every test file imports from ../dist/.
 */
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".test.mjs"))
  .sort();

let failed = 0;
for (const f of files) {
  console.log(`\n=== ${f} ===`);
  try {
    await import(path.join(dir, f));
  } catch (err) {
    failed++;
    console.error(`\n✗ ${f} FAILED:`);
    console.error(err);
  }
}

console.log("\n" + "=".repeat(60));
if (failed > 0) {
  console.error(`${failed}/${files.length} test file(s) FAILED.`);
  process.exit(1);
} else {
  console.log(`All ${files.length} test file(s) passed.`);
}
