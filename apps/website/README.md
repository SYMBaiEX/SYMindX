# SYMindX console

The website runs one in-memory `@symindx/agent` mind in the browser. Sending a message calls `hear`, `step`, and `say`. A reply drive echoes the message. No token, database, or model request is involved.

```sh
bun install --cwd apps/website --frozen-lockfile --ignore-scripts
bun run web:dev
```

Vite binds to `127.0.0.1:5173`. `bun run typecheck:website` checks the page and the Vite config.
