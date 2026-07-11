/**
 * Shared infrastructure for the Multi-Agent MCP server (M1-owned).
 *
 * Per PLAN.md §7: this module is M1's shared infra — response format, error
 * helpers, path resolution, frontmatter parsing. Read-only to every other
 * block after M1 lands. Cross-block needs go to the Architect, not here.
 *
 * HARD BOUNDARY (PLAN.md §3.8): this server manages, tracks, and serves
 * file/state only. It never runs models and never spawns agents. No module
 * in this package may execute an LLM call or dispatch an agent.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
export const SERVER_NAME = "multi-agent-mcp";
export const SERVER_VERSION = "0.1.0";
/** Error whose message is safe and actionable for the calling model. */
export class ToolError extends Error {
}
/**
 * Success result: human-readable summary line + pretty JSON, plus
 * structuredContent for clients that consume the output schema.
 */
export function ok(summary, data) {
    return {
        content: [
            { type: "text", text: `${summary}\n\n${JSON.stringify(data, null, 2)}` },
        ],
        structuredContent: data,
    };
}
/** Error result. Message must tell the caller what to do next. */
export function fail(message) {
    return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
    };
}
/** Wrap a handler so ToolError/unexpected errors become actionable failures. */
export async function guarded(fn) {
    try {
        return await fn();
    }
    catch (error) {
        if (error instanceof ToolError)
            return fail(error.message);
        const msg = error instanceof Error ? error.message : String(error);
        return fail(`Unexpected failure: ${msg}`);
    }
}
// ---------------------------------------------------------------- paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** server/roles/ — the pre-built specialties catalog, sibling of dist/. */
export function roleTemplatesDir() {
    return path.resolve(__dirname, "..", "roles");
}
/** Absolute path to this server's compiled entry point (for .mcp.json). */
export function serverEntryPath() {
    return path.resolve(__dirname, "index.js");
}
/**
 * Resolve and validate the target project directory. Falls back to the
 * server process cwd (Claude Code launches project-scope stdio servers
 * with cwd = project root).
 */
export function resolveProjectDir(projectDir) {
    const dir = path.resolve(projectDir ?? process.cwd());
    if (!fs.existsSync(dir)) {
        throw new ToolError(`Project directory does not exist: ${dir}. Pass an absolute path to an existing project root in 'projectDir'.`);
    }
    if (!fs.statSync(dir).isDirectory()) {
        throw new ToolError(`Not a directory: ${dir}. 'projectDir' must be a project root, not a file.`);
    }
    return dir;
}
export const teamDir = (root) => path.join(root, "_team");
export const archiveDir = (root) => path.join(teamDir(root), "archive");
export const agentsDir = (root) => path.join(root, ".claude", "agents");
export const stateFile = (root) => path.join(teamDir(root), "STATE.md");
export const progressFile = (root) => path.join(teamDir(root), "PROGRESS.md");
export const rolesFile = (root) => path.join(teamDir(root), "ROLES.md");
/** Require the _team/ harness; actionable error if missing. */
export function requireHarness(root) {
    if (!fs.existsSync(teamDir(root))) {
        throw new ToolError(`No _team/ harness found in ${root}. Run team_init on this project first.`);
    }
}
// ---------------------------------------------------------------- naming
const NAME_RE = /^[a-z][a-z0-9-]{1,63}$/;
/** Validate an agent/role name: lowercase, digits, hyphens; blocks traversal. */
export function validateName(name, what) {
    if (!NAME_RE.test(name)) {
        throw new ToolError(`Invalid ${what} name '${name}'. Use 2-64 chars: lowercase letters, digits, hyphens; must start with a letter (e.g. 'api-debugger').`);
    }
    return name;
}
/**
 * Minimal YAML-frontmatter parser: flat `key: value` pairs only. Enough for
 * agent/role definition files; full state-schema parsing is M2's job
 * (src/state/ — see its README).
 */
export function parseFrontmatter(markdown) {
    const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match)
        return { fm: {}, body: markdown };
    const fm = {};
    for (const line of match[1].split(/\r?\n/)) {
        const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!kv)
            continue;
        let value = kv[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        fm[kv[1]] = value;
    }
    return { fm, body: markdown.slice(match[0].length) };
}
export function nowIso() {
    return new Date().toISOString();
}
/** Timestamp suitable for archive filenames: 2026-07-11T190432Z */
export function fileStamp() {
    return nowIso().replace(/\.\d{3}Z$/, "Z").replace(/:/g, "");
}
//# sourceMappingURL=shared.js.map