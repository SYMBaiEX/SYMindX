# SYMindX development instructions

## Supported v0.1

Work in `packages/runtime/`. Read its README and `docs/v0.1/IMPLEMENTATION.md` before changing contracts. The prior architecture and audit are retained in `docs/legacy/` and `docs/audit-2026-10-03.md`.

- Use GPT-6 Luna for delegated work. Do not select GPT-5.6 or older agent profiles.
- Preserve existing work in the legacy trees. Scope implementations to the supported package unless migration is explicitly requested.
- Inspect Git status before editing. Do not reset, stash, or overwrite unrelated changes.
- Install with `bun install --cwd packages/runtime --frozen-lockfile --ignore-scripts`.
- Run `bun run typecheck` and `bun run build` from a normal local checkout. See the package guide for direct commands on Windows UNC paths.
- Do not run checks that contact model providers, messaging services, public endpoints, or existing databases. Offline verification must use temporary files, injected providers, and loopback servers.
- Keep the API loopback-only and require its bearer token. The current API is a single local owner's interface, not a multiuser service.
- Never import legacy runtime modules into the supported package without a scoped migration and demonstrated contract compatibility.
- Keep documented capabilities consistent with implemented behavior. Semantic memory, learning, autonomy, MCP, web dashboards, and remote deployment remain future work.

## Agent path

`loadCharacter`/`parseCharacter` -> `SYMindXRuntime.registerCharacter` -> `start` (SQLite and provider composition) -> `sendMessage` (queue, scoped recall, emotion, provider/tool loop, atomic turn commit) -> `stop` (cancel queued/active work and close SQLite).

Custom tools are trusted application code. Write tools require per-request approval from that application, support cooperative cancellation, and must provide their own idempotency/recovery guarantees.