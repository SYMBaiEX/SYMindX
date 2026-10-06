# SYMindX console

The website runs one in-memory `@symindx/agent` mind and asks local Ollama `qwen3.5:9b` with thinking disabled. Vite proxies `/ollama` to `http://127.0.0.1:11434`. Play demo walks one mind through a scripted conversation. `bun run eval` runs the same grouped suite in the terminal.

```sh
bun install --cwd apps/website --frozen-lockfile --ignore-scripts
bun run web:dev
```

Vite binds to `127.0.0.1:5173`. `bun run typecheck:website` checks the page and the Vite config.
