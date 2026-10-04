# SYMindX

A small character-agent runtime with persistent conversation history, bounded emotion state, and explicitly permitted tools.

The agent library is **[packages/agent](packages/agent)** (`@symindx/agent`). The CLI, documentation, and website live in **[apps/cli](apps/cli)**, **[apps/docs](apps/docs)**, and **[apps/website](apps/website)**. Implementation notes are in [apps/docs/modernization](apps/docs/modernization).

## Agent CLI

`bun run cli` opens the terminal in `apps/cli`. It runs against `@symindx/agent`. `bun run agent` starts the same terminal.

## Core demonstration

Requires **Bun 1.4.2 or newer**. Start from a local checkout in Bash or PowerShell:

```sh
bun run typecheck
bun run cli
```

The CLI starts from [apps/cli](apps/cli) against `@symindx/agent`.

## Supported surface

- `@symindx/agent` is an in-process mind: character parsing, appraisal, episodic memory, a bounded plan, social regard and trust, drives, voice guidance, and `composeTurn`.
- Emotion values are software state for behavior and wording.
- The provider edge is a scripted generator or an OpenAI-compatible URL check. The package does not open the network.
- The terminal is [apps/cli](apps/cli). The website is [apps/website](apps/website).

Historical notes are in [apps/docs/legacy](apps/docs/legacy) and [apps/docs/v0.1](apps/docs/v0.1).

## Local developer tools

- [Website console](apps/website) is the local operator UI. Start it with `bun run web:dev`.

## Development

Typecheck the library with `bun run typecheck`. The website typechecks with `bun run typecheck:website`.

Licensed under [MIT](LICENSE).