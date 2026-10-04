# SYMindX v2 CLI. packages/agent is source-only: no lockfile, no dist, no install.
ARG BUN_VERSION=1.4.2
FROM oven/bun:${BUN_VERSION}-alpine

WORKDIR /app
COPY --chown=bun:bun packages/agent /app/packages/agent
COPY --chown=bun:bun apps/cli /app/apps/cli

USER bun
ENTRYPOINT ["bun", "--no-env-file", "--cwd", "/app/packages/agent", "/app/apps/cli/src/ink-cli.tsx"]
CMD ["dashboard"]
