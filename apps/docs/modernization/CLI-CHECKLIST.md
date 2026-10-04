# SYMindX agent CLI build

Baseline: main at 2528be0, synchronized with origin/main. Existing .serena/ remains user-owned. The newly approved .env.local is ignored and must never be staged, copied to validation, or printed.

Maximum fleet: three GPT-6 Luna coding workers and the orchestrator. No broad repeat audit. No implementation tests or live backend requests are authorized by this build request; use strict types, formatting, bundles/declarations and clean compile CI.

- [x] CLI commands: agent chat/code/build, setup/create, list/show/history, task input, JSON output, slash commands, help and cancellation. Owner: CLI worker.
- [x] Workspace tools: bounded list/read/search/write/run, path/symlink protections, stale-write detection, explicit effect approval and process cancellation. Owner: tools worker.
- [x] API sessions/config: dedicated per-workspace state, provider/character setup, scoped sessions, mode prompts and tool composition. Owner: session worker.
- [x] Local Codex backend: existing login, JSON event handling, bounded process lifecycle, workspace sandbox policy and durable SYMindX conversation. Owner: orchestrator.
- [x] Install/setup: local command bridge, opt-in environment-file loading, package exports, CLI guide and root references. Owner: orchestrator.
- [x] Integrated static gates, source provenance, commit/push main and clean Linux CI. Owner: orchestrator.

The API backend requires a tool-capable OpenAI-compatible Chat Completions model. Codex uses the installed native CLI and its own authentication; API keys are not passed into its subprocess. Command execution is trusted local code, not an OS sandbox, unless the selected backend supplies one.

## Integrated evidence

Frozen install, strict types (0 diagnostics), formatting, launcher syntax and library/CLI/declarations build pass in fresh local staging. Source inputs byte-match the checkout; verified build artifacts are copied to ignored runtime/dist for local use. [cli-validation.json](cli-validation.json) records hashes and limitations. Approval cancellation is integrated. Main source checkpoint `a007bd1` is pushed to origin/main. [Clean Linux CI](https://github.com/SYMBaiEX/SYMindX/actions/runs/37173551463) passes frozen install, formatting, strict types, launcher syntax and bundles/declarations. No behavior or live backend task was run.
