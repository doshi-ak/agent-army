/**
 * M6.2 — Dispatcher policy (PURE LOGIC — no secrets, no network, no outbound).
 *
 * Decides whether an intake task should be offloaded to an external worker
 * (Manus) and computes the dedup key that stops the same task from being
 * dispatched twice. This is the only M6 module that is NOT gated on Akash's
 * credential buttons: it reasons over task records + the project's own
 * _team/PROGRESS.md history, and never calls out.
 *
 * §3.8 boundary: this file lives in edge/, not server/. It contains no MCP
 * server code. State mutations it decides on are applied by calling the M2
 * `progress_log` tool (see ingest-to-progress.mjs) — the server stays the
 * single writer of _team/ files.
 */

/**
 * Deterministic dedup key for an intake task. Two intake events that describe
 * the same unit of external work must produce the same key so find_duplicate
 * can suppress the second dispatch. Prefer an explicit upstream id; fall back
 * to a normalized title so a re-fired webhook without an id still dedups.
 */
export function dedupKey(task) {
  if (!task || typeof task !== "object") throw new TypeError("task must be an object");
  const explicit = task.manus_task_id || task.task_id || task.dedup_key;
  if (explicit) return `id:${String(explicit).trim()}`;
  const title = String(task.title ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!title) throw new Error("task has neither an id nor a title — cannot dedup");
  return `title:${title}`;
}

/**
 * Has this task already been dispatched? Scans PROGRESS.md text (the narrative
 * record) for the task's dedup key, which offloadTask stamps into its log line.
 * `progressText` is the raw contents of _team/PROGRESS.md.
 */
export function findDuplicate(task, progressText) {
  const key = dedupKey(task);
  return typeof progressText === "string" && progressText.includes(key);
}

/**
 * The dispatch decision. Returns {dispatch: boolean, reason, key}. A task is
 * dispatched only when it is (a) not already in the log and (b) scoped to an
 * external-worker owner. Anything user_approval_required routes to the human
 * gate instead of an autonomous dispatch (RULES §1) — decided here, enforced
 * by the caller never firing offload on gate=true.
 */
export function decideDispatch(task, progressText) {
  const key = dedupKey(task);
  if (task.user_approval_required) {
    return { dispatch: false, gate: true, reason: "user_approval_required — routes to human gate (RULES §1)", key };
  }
  const externalOwners = new Set(["manus", "relay", "cowork"]);
  if (!externalOwners.has(String(task.owner_tool ?? "").toLowerCase())) {
    return { dispatch: false, gate: false, reason: `owner_tool '${task.owner_tool}' is not an external worker — stays local`, key };
  }
  if (findDuplicate(task, progressText)) {
    return { dispatch: false, gate: false, reason: `duplicate — ${key} already in PROGRESS.md`, key };
  }
  return { dispatch: true, gate: false, reason: "net-new external-worker task", key };
}
