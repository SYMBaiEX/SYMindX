# Current SYMindX development

The agent package is [packages/agent](../../packages/agent). The CLI, website, and docs are under [apps](../../apps). Follow [AGENTS.md](../../AGENTS.md) and the [implementation queue](../../apps/docs/modernization/CHECKLIST.md).

Install package-scoped dependencies with lifecycle scripts disabled, then build from the repo root with `bun run build`. Start the runtime with `bun run start` and the terminal with `bun run cli`.

Historical architecture, generation templates and analysis guides are preserved in apps/docs/legacy/cursor.
