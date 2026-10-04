# SYMindX development instructions

## Layout

Work in `packages/agent` (`@symindx/agent`). The CLI is `apps/cli`, the website is `apps/website`, and documentation is `apps/docs`. `packages/runtime` and `mind-agents/` have been removed.

- Use GPT-6 Luna for delegated work unless the user explicitly selects another available model. The latest user request controls fleet routing.
- Inspect Git status before editing. Do not reset, stash, or overwrite unrelated changes.
- `packages/agent` has no dependencies and no lockfile. `bun run typecheck` checks it. `bun run cli` and `bun run agent` start `apps/cli`.
- Authorized dependency maintenance may read official documentation, release pages, and package-registry metadata, and perform project-scoped installs with lifecycle scripts disabled. Runtime checks must use temporary files, injected providers, and loopback servers; do not contact live model/messaging services or existing databases.
- Keep documented capabilities consistent with the code that is actually wired up.

## Current fleet workflow

- Work on main as requested. The orchestrator owns Git commits, merges, and pushes; workers do not mutate Git.
- Follow apps/docs/modernization/CHECKLIST.md. Coding workers own explicit non-overlapping paths. Assign queued implementation tasks when a worker finishes.
- Reuse the completed inventory rather than repeating broad reviews. Implement, compile, and return concise evidence.
