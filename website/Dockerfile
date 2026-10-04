FROM oven/bun:1.4.2-alpine AS build
WORKDIR /app
COPY website/package.json website/bun.lock ./website/
WORKDIR /app/website
RUN bun --no-env-file install --frozen-lockfile --ignore-scripts
COPY website/ ./
WORKDIR /app
COPY packages/runtime/src/types.ts ./packages/runtime/src/types.ts
WORKDIR /app/website
RUN bun --no-env-file run build

FROM nginx:alpine AS static
COPY --from=build /app/website/dist /usr/share/nginx/html
COPY website/nginx.conf /etc/nginx/nginx.conf
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
