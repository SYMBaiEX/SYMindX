# Build only the supported v0.1 package. No external service configuration.
ARG BUN_VERSION=1.4.2
FROM oven/bun:${BUN_VERSION}-alpine AS build
WORKDIR /build
COPY packages/runtime/package.json packages/runtime/bun.lock ./
RUN bun --no-env-file install --frozen-lockfile --ignore-scripts
COPY packages/runtime/ ./
RUN bun --no-env-file run typecheck && bun --no-env-file run build

FROM oven/bun:${BUN_VERSION}-alpine AS runtime
WORKDIR /app
COPY --from=build --chown=bun:bun /build/dist ./dist
COPY --from=build --chown=bun:bun /build/characters ./characters
COPY --from=build --chown=bun:bun /build/package.json /build/LICENSE ./
RUN mkdir -p /app/data && chown bun:bun /app/data
USER bun
VOLUME ["/app/data"]
# v0.1 API is loopback only; no published network port is advertised.
ENTRYPOINT ["bun", "--no-env-file", "dist/cli.js"]
CMD ["--help"]
