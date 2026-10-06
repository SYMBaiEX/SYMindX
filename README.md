# SYMindX

A small character-agent runtime with persistent conversation history, bounded emotion state, and explicitly permitted tools.

The agent library is **[packages/agent](packages/agent)** (`@symindx/agent`). Orchestration is **[packages/orchestration](packages/orchestration)** (`@symindx/orchestration`), including the workspace tool contract. The CLI, documentation, and website live in **[apps/cli](apps/cli)**, **[apps/docs](apps/docs)**, and **[apps/website](apps/website)**. Implementation notes are in [apps/docs/modernization](apps/docs/modernization).

## Agent CLI

`bun run cli` opens the terminal in `apps/cli`. It runs against `@symindx/agent` and `@symindx/orchestration`. The local model is Ollama `qwen3.5:9b` on loopback, with thinking disabled. Production commands are `agents`, `agents new`, `agents show`, `agents use`, `chat`, `sessions`, `sessions new`, `rooms`, `rooms new`, `rooms show`, `room`, `code`, `build`, `work`, `work add`, `work done`, `tick`, `eval`, `demo`, and `status`. `code` and `build` are one coding session: the agent can read, edit, and run a shell command in the workspace. With no task, the prompt stays open. Chat does not change files. In chat, the agent can search the public web and read one public page. Private and loopback URLs are refused. Group messages support `@everyone` and `@agentId`. An unaddressed room message asks every member. `bun run agent` starts the same terminal.

## Core demonstration

Requires **Bun 1.4.2 or newer**. Start from a local checkout in Bash or PowerShell:

```sh
bun run typecheck
bun run cli
```

The CLI starts from [apps/cli](apps/cli) against `@symindx/agent` and `@symindx/orchestration`.

## Supported surface

- `@symindx/agent` remains the in-process mind. It has no dependencies. `createMind` keeps appraisal, episodes, regard, the plan, and a timeline, and `composeTurn` prepares each cycle.
- `@symindx/orchestration` coordinates named agents, long-running sessions, and group rooms of 2 to 6 agents. It also defines the workspace tool contract. It does not open the network or touch the disk. A host supplies the model call and the file I/O. The CLI host stores the catalog in `.symindx/catalog.sqlite` and imports an existing `.symindx/catalog.json` once.
- Emotion values are software state for behavior and wording.
- The provider edge is a scripted generator or an OpenAI-compatible URL check. The package does not open the network.
- The terminal is [apps/cli](apps/cli). The website is [apps/website](apps/website).
- `packages/runtime` and `mind-agents/` stay removed.

Historical notes are in [apps/docs/legacy](apps/docs/legacy) and [apps/docs/v0.1](apps/docs/v0.1).

## Local developer tools

- [Website console](apps/website) is the local operator UI. Start it with `bun run web:dev`.

## Development

`bun run typecheck` checks `@symindx/agent` and `@symindx/orchestration`. The website typechecks with `bun run typecheck:website`. The CLI typechecks with `tsc -p apps/cli/tsconfig.json --noEmit`.

Licensed under [MIT](LICENSE).