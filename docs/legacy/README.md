# Historical SYMindX workspace

These files preserve the [original root README](original-README.md), [package manifest](root-package.json), agent guide, and GitHub workflows from before the v0.1 integration. The implementation audit is [../audit-2026-10-03.md](../audit-2026-10-03.md).

The retained `mind-agents/`, `website/`, and `create-symindx/` trees are reference implementations with the defects documented in that audit. Their commands are opt-in `legacy:*` root scripts and do not form the supported v0.1 build.

Workflow copies in this folder are inert historical configuration. They include placeholder deployments, external service checks, registry publishing, and messaging steps. They are not deployment instructions for v0.1.

The original root lockfiles were preserved because they contain existing work. The new runtime uses `packages/runtime/bun.lock` and is installed independently.