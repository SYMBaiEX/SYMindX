# Modernization build checklist

User direction: work on main; build in GPT-6 Luna fleets using a dynamic task queue. Maximum concurrency is three workers plus the orchestrator. Completed inventory is reused; workers implement scoped changes and compile them. Runtime behavior tests remain outside the authorized checks until explicitly requested.

## Main integration

- [x] Commit the supported v0.1 runtime and audit cleanup on main: `a9a08b7`.
- [x] Preserve the existing portal/module refactor in its own main checkpoint: `10d71e0`.
- [ ] Commit the verified modernization changes on main.
- [ ] Push main after final integration checks; keep local editor configuration separate.

## Fleet 1 â€” coding now

- [x] **A / runtime contracts:** discriminated provider, message, event and schema types; validate all persisted JSON and injected provider results; snapshot caller-owned configuration; export named contracts. Owner: runtime source worker.
- [ ] **B / SDK migration:** migrate current OpenAI/Groq/OpenRouter portal code, converters, usage, tool helpers and MCP integration from mixed beta/v1 APIs to coherent current AI SDK contracts. Owner: SDK source worker.
- [x] **C / dependencies:** update the supported compiler/Bun types/formatter and build launchers; reconcile all live manifests/workspaces; align SDK family versions and locks with migrated source. Owner: dependency worker (manifest/lock/CI ownership retained during fleet 2).

## Dynamic follow-up queue

- [x] **D / scaffolding:** make create-symindx generate the supported v0.1 API, schema and Bun commands; eliminate obsolete SDK dependencies and generated runtime calls.
- [x] **E / CLI redirect:** remove global install/npx side effects and point local tooling at the real supported CLI; update package references.
- [ ] **F / web/tooling:** build a typed local v0.1 console and migrate coherent web build packages/configuration. Source owner: runtime worker; manifests/locks owner: dependency worker.
- [x] **G / active references:** update development rules, hooks, setup/build/container entry points and current guides; retain historical audit/preimage contents.
- [ ] **H / verification:** frozen installs, strict types, formatting, bundles/declarations, SDK contract compilation, workspace/reference residual scan, and preservation comparison. Record passed/failed/skipped checks.

## Rules and acceptance

- Each worker owns exact files. A queued task starts when its dependencies are satisfied and a slot opens.
- Source migrations accompany breaking SDK updates; no version-only upgrades that knowingly break consumers.
- SDK-specific types stay behind adapters; supported runtime contracts remain independent.
- No live model calls, external messaging, deployment, existing database mutation, global installs, or force pushes.
- Dependency metadata/install access is authorized for this update. Use official sources and disable lifecycle scripts.
- Report changes and compiler evidence briefly. A completed review alone does not close a build task.
- Historical docs/legacy and audit records are evidence, not active version promises; preserve their original contents.