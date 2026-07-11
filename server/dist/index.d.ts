#!/usr/bin/env node
/**
 * Multi-Agent MCP server — entry point.
 *
 * Turns a Claude Code project into a coordinated agent team's shared
 * filing system: harness scaffolding, agent lifecycle, role catalog,
 * and (from M2) the state engine and manager loop.
 *
 * Transport: stdio (local, single-user — warehouse Rule 1: the access path
 * is local files, so LOCAL MCP). Logs go to stderr only; stdout is reserved
 * for the JSON-RPC stream.
 *
 * HARD BOUNDARY (PLAN.md §3.8): this server manages, tracks, and serves
 * state. It NEVER runs models and NEVER spawns agents — dispatch belongs
 * to the hosting Claude session.
 */
export {};
//# sourceMappingURL=index.d.ts.map