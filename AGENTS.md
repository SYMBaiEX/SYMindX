# SYMindX development instructions

## Layout

Work in `packages/agent` (`@symindx/agent`) and `packages/orchestration` (`@symindx/orchestration`). The CLI is `apps/cli`, the website is `apps/website`, and documentation is `apps/docs`. `packages/runtime` and `mind-agents/` stay removed.

- Use GPT-6 Luna for delegated work unless the user explicitly selects another available model. The latest user request controls fleet routing.
- Inspect Git status before editing. Do not reset, stash, or overwrite unrelated changes.
- `packages/agent` remains the in-process mind. It has no dependencies and no lockfile. `bun run typecheck` checks `@symindx/agent` and `@symindx/orchestration`. `bun run cli` and `bun run agent` start `apps/cli`.
- `@symindx/orchestration` coordinates named agents, long-running sessions, and group rooms of 2 to 6 agents. It also owns the workspace tool contract. It does not open the network or touch the disk. A host supplies the model call and the file I/O. The CLI host stores the catalog in `.symindx/catalog.sqlite` and imports an existing `.symindx/catalog.json` once. The packages do not open that database. Slack, Twitter, RuneLite, and the provider portals live in the CLI host. RuneLite accepts only a loopback plugin socket the caller already opened. Twitter posts through the X API with a caller-supplied token. Supabase and Neon are optional memory writes. `extensions` and `portals` list them and do not contact the network. `code` and `build` are one coding mode. Chat does not change files. Chat can call the `web` and `page` research tools; the CLI host performs the fetch, and private or loopback URLs are refused. `who` looks up another agent without a model call, and `note` queues a message for that agent's next turn. `work` is a task tree: `work add --after` waits until that item is done, and `work done` tells the next assignee. `tick` lists agents who have been quiet for at least a minute and does not call a model. An agent's open work is included on the next turn. Catalog writes are serialized so one agent's turn does not cancel another's. `bun run suite` runs the scripted framework checks. `bun run swarm` scores the routing dataset, then runs scout, editor, and mason on `qwen3.5:9b` with thinking off.
- Authorized dependency maintenance may read official documentation, release pages, and package-registry metadata, and perform project-scoped installs with lifecycle scripts disabled. Runtime checks must use temporary files, injected providers, and loopback servers; do not contact live model/messaging services or existing databases.
- Keep documented capabilities consistent with the code that is actually wired up.

## Current fleet workflow

- Work on main as requested. The orchestrator owns Git commits, merges, and pushes; workers do not mutate Git.
- Follow apps/docs/modernization/CHECKLIST.md. Coding workers own explicit non-overlapping paths. Assign queued implementation tasks when a worker finishes.
- Reuse the completed inventory rather than repeating broad reviews. Implement, compile, and return concise evidence.
