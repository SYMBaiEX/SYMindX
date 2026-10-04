# Active tooling

The root build typechecks `packages/agent`. The CLI is `apps/cli`, started with `bun run cli`. `packages/agent` has no dependencies and no lockfile.

The pre-commit hook typechecks `packages/agent`. It does not format, test, or download packages.

`Dockerfile` and `Dockerfile.dev` copy `packages/agent` and `apps/cli` and start the terminal with Bun. `docker-compose.yml` and `docker-compose.dev.yml` each run that one app service with a TTY. `scripts/deploy.sh --build-container` builds the local image `symindx-agent:0.2.0`. There is no database service and no published port.

The earlier setup script, health check, nginx config, and Postgres init files are not part of this layout. Copies of those entry points remain under `apps/docs/legacy/entrypoints`.
