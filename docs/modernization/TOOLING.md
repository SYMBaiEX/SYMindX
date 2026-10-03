# Active tooling

The root build, CLI and developer setup target packages/runtime. scripts/dev-setup.sh installs pinned development dependencies without lifecycle scripts and compiles this package. It does not start databases, messaging integrations or models.

Git hooks run non-mutating type and format checks for the supported package. No npx downloads, automatic formatting or automatic test execution are part of the hooks. Linux Git needs Linux Bun available to run them; Windows Bun from a UNC checkout uses the direct commands in the runtime guide.

The Dockerfiles build the supported CLI only. docker compose --profile cli run --rm cli explicitly runs an echo conversation and writes the named runtime_data volume. Images default to help, run as the Bun user, and expose no ports. The local API binds to loopback; public/container ingress requires a deliberate later architecture decision. scripts/deploy.sh --build-container only builds a local image.

scripts/health-check.sh requires an explicit loopback origin and only reads /health. It does not load environment files or inspect databases. No automatic service health probe is configured.

The former Docker, Compose, shell scripts, hooks and Cursor tree were preserved byte-for-byte under docs/legacy/entrypoints and docs/legacy/cursor. tooling-preservation.json records their hashes. Replacing the 26 old Cursor rules removes invented capabilities, malformed duplicate frontmatter and recurring legacy context from active editor guidance.

Container builds and service behavior are separate validation items. Check the modernization validation record for what actually ran.

The legacy package now has a read-only workspace metadata checker at mind-agents/scripts/check-workspace-deps.ts. It checks actual source manifests, duplicate names, registered directories and workspace dependency names. It replaces a dangling script reference; it does not install, delete or import integration code. Its strict standalone compile and 29-package metadata check passed.
