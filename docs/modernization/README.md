# v0.1 modernization build

The architectural decision is to rebuild around selected components. The small supported runtime is the product foundation; migrated legacy adapters remain candidates for promotion after behavior validation. Work proceeds on main through [the coding checklist](CHECKLIST.md) and [a native dynamic task queue](workflow.json), using three GPT-6 Luna coding workers plus the orchestrator.

## Implemented system

- `packages/runtime`: strict character/provider/message contracts, scoped SQLite history, bounded provider/tool execution, local bearer API, CLI and cancellation/shutdown handling.
- `create-symindx`: local scaffolding against the supported runtime, with no-overwrite publication and no global installer.
- `website`: manual local operator console using shared pure runtime types, in-memory token custody, scoped request cancellation and a fixed loopback development proxy.
- `mind-agents`: AI SDK7 provider/message/tool/MCP contracts and transitive type repairs. These compile separately and are not imported into the supported runtime.
- Packages/tooling: 115 active dependency names reconciled across 35 live manifests, 29 actual registered workspaces, independent frozen locks, current compile CI, entry points and editor guidance.

## Main checkpoints

- `a9a08b7`: supported v0.1 runtime, audit records and initial cleanup.
- `10d71e0`: separate checkpoint preserving the existing user portal/module refactor.
- `54451ad`: runtime contract hardening, local tooling, scaffolding and reference cleanup.
- `94aa5b0`: pinned supported CI toolchain and actions.

Earlier checkpoints are pushed to origin/main. The checklist records final fleet integration and push status. The original dirty-path inventory remains in [baseline.json](baseline.json); unrelated local `.serena/` configuration stays outside commits.

## Validation evidence

| Scope | Result | Record |
| --- | --- | --- |
| Supported runtime | Frozen install, strict types, format, bundles/declarations and tooling syntax pass | [Runtime](runtime-validation.json) |
| Scaffolder | Frozen install, strict types, format, declarations and static template compile pass | [Scaffolder](scaffolder-validation.json) |
| SDK adapters and transitive source | Fresh frozen install and strict compile pass with 0 diagnostics across 94 compiler source files | [SDK](sdk-validation.json) |
| Local web console | Fresh frozen install, strict app/config types, Vite bundle and static Storybook pass | [Web](web-validation.json) |
| Workspace/dependencies | All live declarations match the ledger; workspace checker passes | [Dependencies](dependencies.json) |
| Preservation | 57 of 57 recorded tooling/web/scaffolder preimages match their archived hashes | [Tooling](tooling-preservation.json), [web](website-preservation.json), [scaffolder](scaffolder-preservation.json) |

At integration, all 160 recorded validation inputs matched the checkout. Workflow and Compose YAML syntax parsed successfully. The native TypeScript7 compiler cannot enumerate inputs from Windows WSL UNC paths; equivalent fresh local staging passes. Storybook reports catalog chunks over 500 KiB. Neither result establishes application behavior.

## Readiness and next work

This is a v0.1 implementation candidate. Implementation behavior tests, browser interaction, live provider/MCP calls, Linux remote CI and Docker execution were not run. No application startup, external messages, existing database changes, deployment or global installation occurred. The complete legacy application, older dashboards, extensions, autonomy and learning remain outside the supported gates.

[ROADMAP.md](ROADMAP.md) begins with release behavior checks against temporary databases and injected providers, then promotes one integration at a time. Memory ownership/export/retention and observable failure handling come before broad autonomy or remote deployment. See [the framework audit](../audit-2026-10-03.md) for the original assessment; historical implementation records remain unchanged.

The user-owned orchestration skill is version 1.4.0 with coding-first dispatch and GPT-6 Luna routing. All eight user-owned agent profiles parse and use GPT-6 Luna. Loaded custom profiles may need an app reload; this fleet used the native explicit model field.
