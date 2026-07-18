/**
 * M6.3 (push half) — Telegram SEND-ONLY push.  ⚠️ BUILD-GATED — NO AKASH, NO SEND.
 *
 * Pushes a one-line notification to Telegram (e.g. "Manus task X: done"). It is
 * deliberately, provably SEND-ONLY:
 *
 *   • It calls ONLY the sendMessage method.
 *   • It NEVER calls getUpdates and NEVER calls setWebhook. The shared bot token
 *     drives a single-consumer bridge (taskboard-coordination/telegram_sync.py);
 *     a second consumer polling getUpdates or claiming the webhook would steal
 *     updates and silently break that bridge (ratified M6.3 constraint).
 *
 *   Gated on Akash's buttons (RULES §1 — outbound + secrets):
 *     • TELEGRAM_BOT_TOKEN   rotated token, env only, never tracked
 *     • TELEGRAM_CHAT_ID     destination chat, env only
 *     • M6_ENABLED=1         hard kill-switch; absent ⇒ dry-run, never sends
 *
 * Default is DRY-RUN: inert until Akash sets the env. Safe to import/test/read.
 */

const TELEGRAM_API = (token) => `https://api.telegram.org/bot${token}/sendMessage`;

// Guardrail asserted in code, not just prose: the only endpoint this module may
// ever build is sendMessage. If this list ever grows, the send-only property is
// broken — the test asserts it stays exactly this.
export const ALLOWED_METHODS = Object.freeze(["sendMessage"]);

/** Build the send-only request — pure, no I/O, testable. */
export function buildPushRequest(text, { token, chatId } = {}) {
  return {
    url: TELEGRAM_API(token ?? "<TELEGRAM_BOT_TOKEN>"),
    method: "POST",
    body: { chat_id: chatId ?? "<TELEGRAM_CHAT_ID>", text: String(text), disable_notification: false },
  };
}

/**
 * Push a notification. Returns {sent, dryRun, request, response?, reason}.
 * NEVER sends unless M6_ENABLED is truthy AND both token + chat id are present.
 */
export async function sendPush(text, { fetchImpl = fetch, env = process.env } = {}) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  const enabled = env.M6_ENABLED === "1" || env.M6_ENABLED === "true";
  const request = buildPushRequest(text, { token, chatId });

  if (!enabled) return { sent: false, dryRun: true, request, reason: "M6_ENABLED not set — kill-switch open, dry-run only" };
  if (!token || !chatId) return { sent: false, dryRun: true, request, reason: "TELEGRAM_BOT_TOKEN/CHAT_ID absent — cannot send (RULES §1)" };

  const res = await fetchImpl(request.url, {
    method: request.method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request.body),
  });
  return { sent: true, dryRun: false, request, response: { status: res.status } };
}
