# SYMindX

A small character-agent runtime with persistent conversation history, bounded emotion state, and explicitly permitted tools.

The supported v0.1 implementation is **[packages/runtime](packages/runtime/README.md)**. It is a new, isolated core informed by the [repository audit](docs/audit-2026-10-03.md). The former framework remains as a migration reference. The local scaffolder and web operator console target this core. Implementation tasks and compile evidence are tracked in the [build checklist](docs/modernization/CHECKLIST.md).

## Agent CLI

Use SYMindX to chat, code in a workspace, or build from a task. The default backend uses the installed Codex CLI and its existing login; `--backend api` uses a configured OpenAI-compatible model.

```sh
bun run agent chat --workspace ./my-app
bun run agent code --workspace ./my-app "Add a settings page"
bun run agent build --workspace ./my-app "Build a notes app"
```

Code/build asks for permission before effects. Reuse `--session feature1` to continue a conversation, or use `--approval read-only` for inspection. API sessions ask before each file write or command; Codex asks for one workspace sandbox turn. The [agent CLI guide](docs/v0.1/CLI.md) covers installation of the `symindx` command, API setup, permissions, JSON output and state storage. [CLI build evidence](docs/modernization/CLI-CHECKLIST.md) records implementation and compile gates.

## Core demonstration

Requires **Bun 1.4.2 or newer**. Start from a local checkout in Bash or PowerShell:

```sh
bun --no-env-file install --cwd packages/runtime --frozen-lockfile --ignore-scripts
bun run typecheck
bun run build
bun run cli chat --message "Hello"
```

The default character uses an **echo demonstration provider**. A model requires explicit provider configuration and an API key environment variable. The CLI saves conversation history to `./symindx.sqlite`; use `--db` to choose a different file.

For Windows PowerShell operating on a WSL UNC checkout, Bun package scripts currently fall back through CMD, which loses the working directory. Use the direct commands documented in the [runtime guide](packages/runtime/README.md#windows-and-wsl).

## Supported surface

- Schema version 1 JSON characters with validated configuration.
- Library, a chat/code/build agent CLI with API and local Codex backends, and an authenticated API bound to loopback.
- SQLite history separated by agent and conversation; atomic turn and state commits.
- Per-agent queues, deadlines, cancellation, bounded provider/tool rounds, and tool audit records.
- Echo and explicit OpenAI-compatible Chat Completions providers.
- Optional, bounded emotion heuristic. This is software state, not a psychological model.

See the [runtime guide](packages/runtime/README.md) for examples and limits and the [current modernization record](docs/modernization/README.md) for compile evidence and remaining work. The [initial implementation record](docs/v0.1/IMPLEMENTATION.md) is a historical checkpoint.

## Local developer tools

- [create-symindx](create-symindx/README.md) creates a private Bun project using a locally built copy of the runtime. It never installs packages automatically.
- [Website console](website/README.md) lists agents, loads scoped history, and sends messages through the authenticated local API. Its token stays in page memory; the development proxy targets a fixed loopback runtime. Static output does not configure a production API ingress.
- [Local CLI bridge](redirect-package/README.md) forwards arguments to this checkout without a global installation.

## Migration

The old `mind-agents/` runtime and its former web/scaffolder APIs are unsupported by v0.1. Current web and scaffolder entry points use the new runtime; retired UI components and generator preimages remain migration references. Legacy character files need deliberate conversion; legacy databases are not compatible with this schema. Use a new database file.

Historical root documentation and CI/deployment files are retained in [docs/legacy](docs/legacy/README.md). Their automated jobs were replaced by isolated runtime and local-tooling compile workflows. No deployment is configured for the new package.

## Development

The runtime has no third-party runtime dependencies. Its development dependencies are pinned in its own manifest and lockfile. Install inside `packages/runtime`; historical root locks are archived under docs/legacy/locks and are not used by v0.1.

Licensed under [MIT](LICENSE).