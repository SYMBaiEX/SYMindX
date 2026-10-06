# Contributing to SYMindX

This repository uses [Bun](https://bun.sh/).

## Layout

- `packages/agent` (`@symindx/agent`) is the in-process mind library.
- `packages/orchestration` (`@symindx/orchestration`) coordinates named agents, sessions, group rooms, and the workspace tool contract.
- `apps/cli`, `apps/docs`, and `apps/website` are the applications.
- There is no separate scaffolder or CLI bridge. `bun run cli` starts the terminal.

## Setup

Install Bun, then install website dependencies with lifecycle scripts disabled:

```bash
bun install --cwd apps/website --frozen-lockfile --ignore-scripts
```

From the repository root:

```bash
bun run typecheck
bun run cli
bun run web:dev
```

`typecheck` checks `packages/agent` and `packages/orchestration`. `cli` starts the terminal in `apps/cli`. `web:dev` starts the website.

## Pull requests

Branch from `main`. Run `bun run typecheck` before opening a pull request.
