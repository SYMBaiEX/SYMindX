# SYMindX agent CLI

The supported CLI lives in packages/runtime. Its two backends are API (SYMindX runtime and tools) and local Codex (installed native CLI and existing login). No model request occurs during help, configuration creation or compilation.

## Install the command

Requires Bun 1.4.2+ and Node for the command launcher. In a normal local checkout:

```sh
bun --no-env-file install --cwd packages/runtime --frozen-lockfile --ignore-scripts
bun run build
cd packages/runtime
bun link
symindx agent --help
```

The local link is an explicit user setup step; the launcher never downloads or globally installs anything. You can use the checkout without linking:

```sh
bun run agent --help
node redirect-package/bin.js agent --help
```

Use Bun and Codex on the same host as your checkout. Linux tools in WSL and native Windows tools have separate PATH/login stores. Windows TypeScript7 cannot enumerate this WSL UNC checkout; use a local Windows checkout or Linux Bun in WSL for builds. Keep state databases on a local filesystem.

## Start with local Codex

Choose an existing workspace directory. For a new project, create an empty directory first and pass it through `--workspace`.

Codex is the default backend. Install and sign in to the native Codex CLI yourself if it is not already available. SYMindX does not read its authentication file or change its login.

```sh
symindx agent
symindx agent chat --workspace ./my-app
symindx agent code --workspace ./my-app "Add a settings page"
symindx agent build --workspace ./my-app "Build a small notes app"
symindx agent code --workspace ./my-app --session feature1 "Continue the settings page"
```

The native backend invokes codex exec with JSON events, ephemeral native rollout, a selected workspace and read-only or workspace-write sandbox. It ignores user config while retaining existing authentication; pass --model explicitly to choose a model, otherwise Codex uses its built-in default. SYMindX keeps its own scoped conversation and supplies bounded recent messages to each new native turn; it does not attach to an unrelated Codex thread or reuse native resume IDs. A default character file supplies identity/system instructions if present; its API provider settings do not configure Codex.

For chat and --approval read-only, the native sandbox is read-only. Coding/build with ask approval requires permission for one complete native agent turn, including edits and commands within Codex's sandbox. This is a broader approval than the API backend's individual action prompts. No danger-full-access or sandbox bypass is used. --codex-path selects a native executable; npm .cmd shell wrappers are not implicitly invoked.

## Configure an API agent

Use a model/endpoint that supports Chat Completions, max_completion_tokens and function tools. Model IDs are explicit and provider-specific. `--model` overrides the API model for that session without rewriting the character profile or its stored snapshot.

```sh
symindx agent create --workspace ./my-app --model YOUR_MODEL_ID
symindx agent chat --backend api --workspace ./my-app --env-file /path/to/SYMindX/.env.local
symindx agent code --backend api --workspace ./my-app --env-file /path/to/SYMindX/.env.local "Add a settings page"
symindx agent build --backend api --workspace ./my-app --env-file /path/to/SYMindX/.env.local "Build a small notes app"
```

A newly created API profile explicitly grants the five workspace tools; loaded profiles retain their exact allowlists, including an empty list. The default endpoint is https://api.openai.com/v1. Use --base-url for another compatible endpoint and --key-env for its environment variable name. SYMINDX_MODEL, SYMINDX_BASE_URL and SYMINDX_API_KEY_ENV can supply these settings. Character creation writes .symindx/character.json exclusively and refuses overwrite. It stores the key's variable name, never its value. --offline creates an echo character for conversation demonstrations; code/build rejects echo as a coding backend.

Environment files load only through explicit --env-file. The loader accepts bounded single-line assignments without shell expansion, preserves already-set process variables and rejects process-launcher overrides. The securely provisioned local .env.local is ignored by Git. Keep it local. Provider keys are excluded from command/Codex child environments and known secret values are redacted from tool/display output; approved programs can still access files using their own permissions.

## Commands and task input

| Command | Purpose |
| --- | --- |
| agent / agent chat | Interactive conversation; workspace reads available. |
| agent code TASK | Inspect and change an existing project. |
| agent build TASK | Implement/build a project from a task. |
| agent create / agent init | Create a schema-version-1 character. |
| agent list | List agents available to the selected backend/workspace. |
| agent show | Show selected backend/session/configuration metadata. |
| agent history | Show the selected conversation history. |

A positional task or --message runs one turn. Piped lines are limited to 16 KiB each, with a bounded 32-line input queue; interactive approval accepts fresh input only. With neither, the CLI opens an interactive session; piped input is supported. --json keeps final results/history machine-readable on stdout; progress and approvals go to stderr. --agent selects identity, --session selects a conversation, --character selects a profile, and --db explicitly selects API SQLite state. Defaults keep each canonical workspace's state under the user's .symindx/workspaces directory. Reuse --session to continue across invocations; new sessions do not delete old history.

Interactive commands: /help, /exit, /history, /status, /clear (new conversation, no deletion), /session ID and /mode chat|code|build. SIGINT/SIGTERM cancels the active turn and closes its owned session/process. Approval prompts share cancellation with the turn deadline; interrupted prompts cannot block the next input question.

## Permissions and budgets

- API tools list/read/search only within the selected workspace, skip secrets/dependency/build trees, and reject path escapes. File reads use line/column paging for long text. File writes require an existing parent directory, a current read hash for existing content, preview/approval, and a recheck before replacement. There is no delete tool; directory creation requires an approved command.
- API code/build defaults to asking before each write or command. Chat is read-only. --approval read-only denies effects. --approval auto or --yes grants the selected backend's effects without further prompting; use only for a project you trust.
- Noninteractive ask mode denies effects rather than reading task input as approval. Choose --approval read-only for inspection or explicitly grant --yes for automation.
- API command execution uses executable/argument arrays with no implicit shell, bounded output, deadlines and cancellation. An explicitly approved shell/interpreter is trusted local code and can act outside the directory or contact services; the API backend is not an OS sandbox.
- API tool rounds default to 16, bounded at 32; --max-rounds changes that budget. --timeout bounds a turn to 1–300 seconds. Provider, tool, input/context and transcript limits apply independently. Large tasks may need another turn/session.
- History stores plaintext. Native Codex effects and API tools cannot be rolled back by a later conversation failure. Neither backend promises exactly-once execution or crash recovery of external effects. Descendant termination is best effort.

## Verification status

See the [CLI checklist](../modernization/CLI-CHECKLIST.md) and [CLI validation record](../modernization/cli-validation.json). Static gates do not establish successful live API requests, native Codex task execution, approval UX, file race handling or shutdown behavior. No implementation behavior tests or live coding tasks were run during this build.

Codex protocol reference: [official non-interactive mode documentation](https://learn.chatgpt.com/docs/non-interactive-mode), checked against the locally installed CLI help.
