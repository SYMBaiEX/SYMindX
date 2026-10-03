# SYMindX

A small character-agent runtime with persistent conversation history, bounded emotion state, and explicitly permitted tools.

The supported v0.1 implementation is **[packages/runtime](packages/runtime/README.md)**. It is a new, isolated core informed by the [repository audit](docs/audit-2026-10-03.md). The former framework remains as a migration reference. The website and local scaffolder have separate migration tasks tracked in the [build checklist](docs/modernization/CHECKLIST.md).

## Quick start

Requires **Bun 1.4.2 or newer**. Start from a local checkout in Bash or PowerShell:

```sh
bun install --cwd packages/runtime --frozen-lockfile --ignore-scripts
bun run typecheck
bun run build
bun run cli chat --message "Hello"
```

The default character uses an **echo demonstration provider**. A model requires explicit provider configuration and an API key environment variable. The CLI saves conversation history to `./symindx.sqlite`; use `--db` to choose a different file.

For Windows PowerShell operating on a WSL UNC checkout, Bun package scripts currently fall back through CMD, which loses the working directory. Use the direct commands documented in the [runtime guide](packages/runtime/README.md#windows-and-wsl).

## Supported surface

- Schema version 1 JSON characters with validated configuration.
- Library, CLI, and an authenticated API bound to loopback.
- SQLite history separated by agent and conversation; atomic turn and state commits.
- Per-agent queues, deadlines, cancellation, bounded provider/tool rounds, and tool audit records.
- Echo and explicit OpenAI-compatible Chat Completions providers.
- Optional, bounded emotion heuristic. This is software state, not a psychological model.

See the [runtime guide](packages/runtime/README.md) for examples and limits, and the [implementation record](docs/v0.1/IMPLEMENTATION.md) for validation evidence and outstanding work.

## Migration

The old `mind-agents/`, `website/`, and `create-symindx/` APIs are unsupported by v0.1. Legacy character files need deliberate conversion; legacy databases are not compatible with this schema. Use a new database file.

Historical root documentation and CI/deployment files are retained in [docs/legacy](docs/legacy/README.md). Their automated jobs were replaced by an isolated v0.1 compile workflow. No deployment is configured for the new package.

## Development

The runtime has no third-party runtime dependencies. Its development dependencies are pinned in its own manifest and lockfile. Install inside `packages/runtime`; historical root locks are archived under docs/legacy/locks and are not used by v0.1.

Licensed under [MIT](LICENSE).