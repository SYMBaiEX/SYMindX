# Modernization build checklist

User direction: work on main; build in GPT-6 Luna fleets using a dynamic task queue. Maximum concurrency is three workers plus the orchestrator. Completed inventory is reused; workers implement scoped changes and compile them. Runtime behavior tests remain outside the authorized checks until explicitly requested.

## Main integration

- [x] Commit the supported v0.1 runtime and audit cleanup on main: `a9a08b7`.
- [x] Preserve the existing portal/module refactor in its own main checkpoint: `10d71e0`.
- [x] Commit runtime contracts and local tooling on main: `54451ad`.
- [x] Pin the supported CI toolchain and actions on main: `94aa5b0`.
- [x] Commit final SDK, shared contract, package and web changes on main: `f97824c`.
- [x] Push the completed runtime/tooling checkpoints to origin/main.
- [x] Push final fleet integration after local checks; keep local editor configuration separate.

## Fleet 1: completed

- [x] **A / runtime contracts:** discriminated provider, message, event and schema types; validate all persisted JSON and injected provider results; snapshot caller-owned configuration; export named contracts. Owner: runtime source worker.
- [x] **B / SDK migration:** migrate current OpenAI/Groq/OpenRouter portal code, converters, usage, tool helpers and MCP integration from mixed beta/v1 APIs to coherent current AI SDK contracts. Owner: SDK source worker.
- [x] **C / dependencies:** update the supported compiler/Bun types/formatter and build launchers; reconcile all live manifests/workspaces; align SDK family versions and locks with migrated source. Owner: dependency worker; orchestrator reconciled final web metadata and ledger after integration.

## Dynamic follow-up queue

- [x] **D / scaffolding:** make create-symindx generate the supported v0.1 API, schema and Bun commands; eliminate obsolete SDK dependencies and generated runtime calls.
- [x] **E / CLI redirect:** remove global install/npx side effects and point local tooling at the real supported CLI; update package references.
- [x] **F / web/tooling:** build a typed local v0.1 console and migrate coherent web build packages/configuration. Source owner: runtime worker; manifests/locks owner: dependency worker.
- [x] **G / active references:** update development rules, hooks, setup/build/container entry points and current guides; retain historical audit/preimage contents.
- [x] **H / verification:** frozen installs, strict types, formatting, bundles/declarations, SDK contract compilation, workspace/reference residual scan, and preservation comparison. Record passed/failed/skipped checks.

## Rules and acceptance

- Each worker owns exact files. A queued task starts when its dependencies are satisfied and a slot opens.
- Source migrations accompany breaking SDK updates; no version-only upgrades that knowingly break consumers.
- SDK-specific types stay behind adapters; supported runtime contracts remain independent.
- No live model calls, external messaging, deployment, existing database mutation, global installs, or force pushes.
- Dependency metadata/install access is authorized for this update. Use official sources and disable lifecycle scripts.
- Report changes and compiler evidence briefly. A completed review alone does not close a build task.
- Historical apps/docs/legacy and audit records are evidence, not active version promises; preserve their original contents.
## Fleet 2: shared contract repairs

- [x] **B-context:** repair context timestamps, optional fields and utility contracts. Owner: orchestrator after the web worker released the slice following a shell usage-limit rejection.
- [x] **B-contracts:** compile root corrections to indexed guards, canonical exports, agent imports and result metadata. Owner: orchestrator.
- [x] **B-errors:** repair structured error/logging contracts. Owner: dependency worker when SDK parameter helpers are stable.

Each task closes on source changes and compiler evidence. The legacy workspace remains outside the supported runtime; its complete historical error count is not represented by the scoped SDK compiler.

## Final gate result

- Fresh SDK7 portal project plus transitive contracts: **0 diagnostics**. This is not the entire legacy application build.
- Fresh website install, strict types, Vite assets and static Storybook: **pass**. Catalog chunks exceed 500 KiB; no application/browser interaction tests were run.
- Runtime and scaffolder compile/build provenance at the pre-CLI checkpoint: **matched** their passing records.
- Workspace metadata: **29 registered packages**, with 115 active dependency names reconciled across 35 live manifests.
- Preserved tooling/web/scaffolder preimages: **57 of 57 hashes match**.
- Clean Linux CI: **pass** for runtime, scaffolder, website and SDK gates. Behavior tests, live providers/MCP and Docker execution: **not run**. See the gate records and ROADMAP.md.

The final source/config provenance check matched all 159 current recorded inputs. Workflow and Compose YAML syntax also passed. See [README.md](README.md) for the integrated scope and [ROADMAP.md](ROADMAP.md) for release behavior work.

## Clean Linux CI follow-up

- [x] Runtime frozen install, format, types and library/CLI/declarations build.
- [x] Scaffolder and website frozen installs, strict types and builds.
- [x] Fix the SDK barrel's reference to an ignored local-only declaration; compile from tracked inputs and verify clean Linux CI. Owner: SDK coding worker.
- [x] Record final remote CI result and close the queue.

The CI repair is pushed on main as `cc94846`. No compiler input depends on an untracked local declaration. Remote outcomes and the initially failed/resolved check are retained in [ci-validation.json](ci-validation.json).

## Agent CLI follow-up

The dedicated [CLI checklist](CLI-CHECKLIST.md) tracks the new chat/code/build commands, workspace tools, API sessions, native Codex backend, setup and current compile evidence. Its record supersedes the prior runtime hash snapshot.
