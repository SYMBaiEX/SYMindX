# SYMindX local operator console

The website is a local development UI for the supported SYMindX v0.1 runtime. It connects only when you enter the runtime bearer token and click **Connect**. It can list registered agents, load a selected agent’s history for one conversation ID, and send a message when you press **Send message**. Agent listing refreshes only when requested.

The token stays in React memory. The page does not put it in local/session storage, query strings, environment variables, or logs. Reloading or disconnecting clears it. API paths are fixed same-origin `/api` paths; there is no configurable API URL.

## Local development

Use a dedicated local v0.1 database. Start the runtime in one terminal with a bearer token of at least 32 non-whitespace bytes:

```sh
SYMINDX_API_TOKEN="local-development-token-change-this-before-use-1234567890" bun --no-env-file packages/runtime/src/cli.ts serve --db ./symindx.sqlite
```

Install the website dependencies and start Vite in another terminal:

```sh
bun install --cwd website --frozen-lockfile --ignore-scripts
bun run --cwd website dev
```

Vite binds to `127.0.0.1:5173` and proxies `/api` to the fixed runtime address `http://127.0.0.1:8000`. The proxy rewrites the request `Origin` to the loopback target because the runtime accepts same-origin/loopback requests only. Do not expose Vite to a network interface or change the runtime’s loopback-only API policy.

Enter the token in the page, click Connect, select an agent, choose a conversation ID, and load history. Sending a message is an explicit action. The default runtime echo provider is offline and replies with an `Echo:` prefix.

## Supported surface and limits

The console reflects the implemented v0.1 API: readiness, agents, scoped history, and chat. It does not show thoughts, task metrics, deployment controls, MCP management, tool installation, or background activity. Emotion values are the runtime’s bounded optional heuristic state, not model sentiment or psychological inference.

History and state are stored by the runtime in SQLite. Messages and tool output are plaintext, recall is a bounded recent-message window, and the API token grants access to all agents in that local runtime. Keep the database on a local filesystem and use the interface only as a single local owner.

## Static output

`bun run build` produces static UI assets. Static output has no runtime API ingress or configured reverse proxy, so it is not a connected production dashboard. Build the static image from the repository root with `docker build -f website/Dockerfile .`. The Docker image serves those static files only. Any separate ingress would need to preserve same-origin checks, bearer authentication, and loopback-only runtime ownership; this package does not provide one.

## Storybook

`bun run build-storybook` builds the small generic UI button/card component catalog. It is not a runtime dashboard or behavior test suite.
