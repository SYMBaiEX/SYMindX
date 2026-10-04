# Historical SYMindX workspace

These files preserve the [original root README](original-README.md), [package manifest](root-package.json), agent guide, and GitHub workflows from before the v0.1 integration. The implementation audit is [../audit-2026-10-03.md](../audit-2026-10-03.md).

The retained `mind-agents/` framework is a migration reference with the defects documented in that audit. Its commands are opt-in `legacy:*` root scripts. Current website and scaffolder entry points now target the supported core; their previous implementations are preserved here.

Workflow copies in this folder are inert historical configuration. They include placeholder deployments, external service checks, registry publishing, and messaging steps. They are not deployment instructions for v0.1.

The original root lockfiles were preserved because they contain existing work. The new runtime uses `packages/runtime/bun.lock` and is installed independently.
## Preserved modernization inputs

- `entrypoints/`: former container, setup, deployment and hook inputs.
- `cursor/`: former editor rules and development notes.
- `website/`: former dashboard, styling and build/container configuration.
- `scaffolder/`: former generator and setup wizard source.
- `locks/`: original root dependency locks.

Their SHA-256 preservation records are in `../modernization/`. These archives are historical evidence and are not current build commands.
