/**
 * Helper subprocess for progress-concurrency.test.mjs. Appends N lines to a
 * PROGRESS.md file using the real, frozen M1 writer (appendProgress), run as
 * a *separate OS process* per caller so the parent test exercises genuine
 * concurrent file writes — not just interleaved async calls inside one
 * event loop, which wouldn't prove anything about O_APPEND atomicity.
 *
 * Usage: node concurrency-worker.mjs <projectRoot> <actorName> <lineCount>
 */
import { appendProgress } from "../../dist/state/writers.js";

const [, , root, actor, countStr] = process.argv;
const count = Number(countStr);

for (let i = 0; i < count; i++) {
  const ok = appendProgress(root, actor, "stress", `line-${i}`);
  if (!ok) {
    console.error(`appendProgress returned false for ${actor} line-${i} (PROGRESS.md missing?)`);
    process.exit(1);
  }
}
