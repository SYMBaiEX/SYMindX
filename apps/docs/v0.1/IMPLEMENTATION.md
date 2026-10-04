# SYMindX v0.1 implementation record

Date: 2026-10-03. Repository baseline: `main`, commit `558f7f64fb545d6b7ba93be07f3868a201139352`, including existing uncommitted work.

## Decision and release status

Build a small new runtime around the useful SYMindX concepts: explicit characters, scoped durable memory, bounded emotion state, and permitted tools. The [full audit](../audit-2026-10-03.md) supports rebuilding selected components rather than repairing every legacy abstraction in place.

The implementation is a **v0.1 candidate**, not a certified solid release. Its independent installation, formatting, strict TypeScript checks, library/CLI bundle, and declaration build pass locally. No new runtime behavior tests, application startup, or real provider calls have been performed. The user-facing testing choice remains unanswered; session instructions require an explicit request before adding or running implementation tests.

The supported surface recorded here was `packages/runtime/`. That SQLite runtime server is not part of v2; the library is `packages/agent`. Old runtime, provider, integration, web, and scaffolder code retained the defects in the audit. A passing new-package build does not repair or validate those legacy trees.

## Implemented system

| Area | v0.1 contract |
| --- | --- |
| Initialization | Explicit file-backed SQLite; registered or persisted version-1 characters; validated provider and tool composition. |
| Agents | One composed provider and state per character; bounded serial execution per agent. |
| Message path | Validate -> queue -> scoped recent history -> bounded emotion -> provider/tool loop -> atomic messages/state commit. |
| Memory | SQLite history and state; queries scoped by agent and conversation; complete-turn transactions and stale-state conflict checks. |
| Emotion | Optional English word heuristic, bounded valence/arousal, per-turn decay; no claim of learning or psychological inference. |
| Providers | Explicit offline echo and OpenAI-compatible Chat Completions adapters; deadlines, response bounds, redirect rejection, output-token cap, sanitized errors. |
| Tools | Character allowlist, restricted schemas, application-owned write approvals, audit before execution, deadlines and cooperative cancellation. |
| Events/shutdown | Unsubscribe function; observer failure isolation; request cancellation and queue drain; SQLite close and listener cleanup. |
| CLI | Init, agents, chat, serve, help, version; exclusive character-file creation, persisted/demo selection, SIGINT/SIGTERM cleanup. |
| API | Loopback-only bearer authentication; readiness, agents, chat and history; strict request fields, body/deadline limits, sanitized errors. |
| Packaging | Side-effect-free library entry; Bun CLI entry; generated declarations; no third-party runtime dependencies. |

The source trace is `characters.ts` -> `runtime.ts.start` -> `sendMessage` -> `providers.ts` / `tools.ts` -> `storage.ts.commitTurn` -> `runtime.ts.stop`. It was inspected and compiled, not executed as an end-to-end behavior demonstration.

### Material constraints

- This is a single local owner's runtime. The API token grants access to all loaded agents/history; conversations are not user accounts or authorization boundaries.
- SQLite stores plaintext messages and successful tool output. The database must be a dedicated v0.1 file on a local filesystem. Its ownership/schema guard rejects foreign or future databases.
- Recall is a recent-message window bounded by characters, not tokenized or semantic retrieval. Prior tool transcripts remain durable but are omitted from recall.
- Emotion is shared across an agent's conversations. There is no semantic memory, learning, autonomy, MCP, multimodal input, external extension, web UI, or remote/container API deployment in this package.
- A custom handler that ignores AbortSignal can outlive shutdown. Custom code is trusted; it is not sandboxed.
- External tool effects and conversation commits are separate. A tool may succeed before a later provider failure or process crash. Audit records do not contain recovery data; no exactly-once guarantee or automatic retry is provided.
- The adapter requires the selected endpoint to support the documented Chat Completions protocol and `max_completion_tokens`. Compatibility with a real provider remains unverified.
- Disk retention, deletion/export controls, request/cost metrics, and persistent background jobs are future work.

## Focused cleanup and preservation

The implementation baseline recorded 123 dirty-file records in [baseline.json](baseline.json). The existing portal refactor, deletions, untracked provider work, agent configuration changes, and root lockfiles were preserved.

Two baseline files intentionally gained supported v0.1 entry points. Their exact former contents remain at `apps/docs/legacy/original-README.md` and `apps/docs/legacy/root-package.json`. Independent verification matched all 123 baseline hashes/existence states using these two relocation mappings. The root package-lock also matches its Git baseline. No reset, stash, commit, push, branch change, or live data migration occurred.

Additional integration changes:

- Root commands now select the isolated package; legacy build/CLI commands require explicit `legacy:*` selection.
- Removed the old workspace and root runtime dependency/hook setup from the supported root manifest. The complete former manifest is retained; new-package dependency resolution does not include those old workspaces.
- Archived four obsolete automatic CI/deployment workflows under `apps/docs/legacy/workflows/`, preserving their contents. The new workflow compiles only the supported package with read-only permissions; it does not publish, deploy, or message external services.
- Replaced obsolete root capability/instruction descriptions with current contracts, while retaining historical copies.
- Added SQLite WAL/shared-memory sidecars to ignore rules.
- Copied the original ignored audit report to the tracked `apps/docs/` area for a permanent decision record.

This does not claim the legacy code is unused everywhere or safe to delete. Large architectural removals were avoided because they would overlap existing work or require product decisions.

## Model routing and skills

The user-owned orchestration skill now routes all delegates explicitly to `gpt-6-luna`; metadata version is 1.3.0. All eight user-owned agent profiles pin GPT-6 Luna and retain their role-specific reasoning settings. Three GPT-6 Luna agents handled provider integration, storage/preservation, and CLI/API/skill updates, including independent review rounds. Generic agents with explicit model overrides were used because an already-loaded custom-role schema cannot be changed by editing its profile file.

The skill validator and TOML parsing passed. A scan of user-owned skill/profile sources found no older model-routing instructions. Bundled vendor documentation containing dated product history was preserved; historical audit model descriptions were not rewritten.

## Validation evidence

Environment: Windows Bun 1.3.10; TypeScript 5.8.3; pinned Bun declarations 1.3.10; Prettier 3.6.2. The package lock is independent of the original root locks.

| Check | Result | Scope/limit |
| --- | --- | --- |
| Skill validation and 8 profile parses | Pass | Updated user-owned routing configuration. |
| Original dirty-file preservation | Pass | All 123 records, with exact copies for the two changed root files. |
| Frozen dependency installation | Pass | Fresh local Windows staging directory; lifecycle scripts disabled; no parent node_modules. |
| Formatting | Pass | All new runtime source/build scripts, using explicit package configuration. |
| Strict typecheck | Pass | New package, including no unchecked indexing, exact optional fields, unused variables/parameters, return/fallthrough checks. |
| Library/CLI bundle and declarations | Pass | Clean staged package and direct build in the actual checkout; 4 bundled outputs plus declaration files/maps. |
| Source integration reviews | Pass with fixes | Composition, queues, scoping, CAS, policy, provider boundaries, API, CLI, shutdown and documentation. Does not prove behavior. |
| Automated runtime/storage/provider/API/CLI tests | Not added or run | Awaiting the user's testing choice. |
| Dedicated lint rules | Not configured | Formatting and compiler diagnostics are the available static gates; neither substitutes for a behavior suite. |
| Linux CI and other platforms | Not run | Workflow is authored; no remote run was triggered. |
| Live model / external tools / messaging | Not run | No keys, external accounts, or model actions exercised. |
| Docker / remote deployment | Not supported or run | API deliberately binds to loopback; legacy container files are not v0.1 deployment artifacts. |
| Legacy full builds/tests | Not rerun | Their failures and validation limits remain in the audit. |

### Failures encountered and resolved or bounded

- Initial new-package checks caught exact-optional field errors and incorrect Bun server type annotations; fixed.
- The accepted `maxOutputTokens` setting was initially omitted from provider payloads; fixed and inspected.
- Reviews caught caller-mutable queued approvals, provider-owned result mutation, undisposed provider error bodies, early DB creation on invalid serve settings, and unawaited HTTP shutdown; fixed.
- Parent editor settings affected one formatted source file in staging; package formatting now explicitly ignores parent EditorConfig and uses its own configuration.
- Bun 1.3.10 package scripts failed on the Windows/WSL UNC path because CMD changed directory. Direct commands work in the actual checkout; normal local Windows package scripts pass.
- Bun's lockfile rename failed on the UNC path. The exact package manifest was installed in a fresh local directory, its generated lock copied into the package, and frozen installation passed there. The original root lockfiles were unchanged. The runtime guide documents the supported local-directory/WSL alternatives.

## Completion roadmap

### 1. Prove the smallest useful runtime

Complete offline behavior gates using temporary databases and injected providers/transports, without live accounts:

- Character validation and no-overwrite scaffolding.
- Import without startup; persisted character/history/state after restart; no recall leakage between agents or conversations.
- Atomic turn rollback on failure/cancellation and stale-state conflicts across two runtime instances.
- Queue saturation, ordering, cancellation while queued, provider/tool deadlines, and cleanup on SIGINT/SIGTERM.
- Tool allowlist/approval/schema enforcement; denied calls never execute; audit records survive failed turns; runaway tool rounds are bounded.
- Provider request shape, tool-call round-trip, malformed/oversized/incomplete response rejection, abort, error sanitization, and no credential forwarding on redirects.
- API auth, host/origin policy, body limits, strict fields, history limits, and request cancellation.
- CLI init/chat/agents/serve and packaged artifacts on Windows and Linux.

Then add those gates to CI. A solid v0.1 label depends on these results, not on the number of modules or successful bundling.

### 2. Run one product pilot

Explicitly configure one real provider and one read-only tool. Use a dedicated database and a defined sustained-conversation task. Measure recall correctness, cost/latency, failure recovery, and whether optional emotion improves the experience. Add token budgeting and basic operational metrics before expanding.

### 3. Restore differentiated features selectively

If the pilot demonstrates value, port bounded memory summarization/retrieval and the useful character/context concepts into the new contracts. Compare their benefit against the simpler baseline. Add learning or autonomy only with explicit objectives, durable job state, budget limits, cancellation, and reviewable actions.

### 4. Expand interfaces and integrations

Choose one real integration or standards-based MCP adapter, then a dashboard showing actual runtime data. Remote deployment requires a separate ownership/auth/TLS model, not a loopback bind exception. Decommission legacy trees only after their retained capabilities have either migrated or been rejected as product work.