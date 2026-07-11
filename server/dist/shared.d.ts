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
export declare const SERVER_NAME = "multi-agent-mcp";
export declare const SERVER_VERSION = "0.1.0";
export interface ToolResult {
    [key: string]: unknown;
    content: Array<{
        type: "text";
        text: string;
        [key: string]: unknown;
    }>;
    structuredContent?: Record<string, unknown>;
    isError?: boolean;
}
/** Error whose message is safe and actionable for the calling model. */
export declare class ToolError extends Error {
}
/**
 * Success result: human-readable summary line + pretty JSON, plus
 * structuredContent for clients that consume the output schema.
 */
export declare function ok(summary: string, data: Record<string, unknown>): ToolResult;
/** Error result. Message must tell the caller what to do next. */
export declare function fail(message: string): ToolResult;
/** Wrap a handler so ToolError/unexpected errors become actionable failures. */
export declare function guarded(fn: () => Promise<ToolResult>): Promise<ToolResult>;
/** server/roles/ — the pre-built specialties catalog, sibling of dist/. */
export declare function roleTemplatesDir(): string;
/** Absolute path to this server's compiled entry point (for .mcp.json). */
export declare function serverEntryPath(): string;
/**
 * Resolve and validate the target project directory. Falls back to the
 * server process cwd (Claude Code launches project-scope stdio servers
 * with cwd = project root).
 */
export declare function resolveProjectDir(projectDir?: string): string;
export declare const teamDir: (root: string) => string;
export declare const archiveDir: (root: string) => string;
export declare const agentsDir: (root: string) => string;
export declare const stateFile: (root: string) => string;
export declare const progressFile: (root: string) => string;
export declare const rolesFile: (root: string) => string;
/** Require the _team/ harness; actionable error if missing. */
export declare function requireHarness(root: string): void;
/** Validate an agent/role name: lowercase, digits, hyphens; blocks traversal. */
export declare function validateName(name: string, what: string): string;
export interface Frontmatter {
    fm: Record<string, string>;
    body: string;
}
/**
 * Minimal YAML-frontmatter parser: flat `key: value` pairs only. Enough for
 * agent/role definition files; full state-schema parsing is M2's job
 * (src/state/ — see its README).
 */
export declare function parseFrontmatter(markdown: string): Frontmatter;
export declare function nowIso(): string;
/** Timestamp suitable for archive filenames: 2026-07-11T190432Z */
export declare function fileStamp(): string;
//# sourceMappingURL=shared.d.ts.map