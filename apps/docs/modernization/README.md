# v0.1 modernization build

This directory is the record of the v0.1 runtime. That runtime, `create-symindx`, the root `website/`, and `mind-agents/` have been removed. The current library is `packages/agent`. The applications are `apps/cli`, `apps/docs`, and `apps/website`.

The notes below describe that earlier build.

## Implemented system

- Former `packages/runtime`: strict character/provider/message contracts, scoped SQLite history, bounded provider/tool execution, local bearer API, CLI and cancellation/shutdown handling.
- `create-symindx`: local scaffolding against the supported runtime, with no-overwrite publication and no global installer.
- Former root `website/`: manual local operator console using shared pure runtime types, in-memory token custody, scoped request cancellation and a fixed loopback development proxy. The website is now `apps/website`.
- Former `mind-agents/`: AI SDK7 provider/message/tool/MCP contracts and transitive type repairs. These compiled separately and were not imported into the supported runtime. That tree is not part of v2.
- Packages/tooling: 115 active dependency names reconciled across 35 live manifests, 29 actual registered workspaces, independent frozen locks, current compile CI, entry points and editor guidance.

## Main checkpoints

- `a9a08b7`: supported v0.1 runtime, audit records and initial cleanup.
- `10d71e0`: separate checkpoint preserving the existing user portal/module refactor.
- `54451ad`: runtime contract hardening, local tooling, scaffolding and reference cleanup.
- `94aa5b0`: pinned supported CI toolchain and actions.
- `f97824c`: final SDK, shared contracts, dependencies, web console and validation integration.
- `cc94846`: remove stale references to an ignored ambient declaration, fixing clean Linux SDK CI.
- `a007bd1`: chat/code/build agent CLI, API workspace tools and sessions, native Codex backend, secure opt-in configuration and launcher. Clean Linux compile CI passes.

All source checkpoints are pushed to origin/main. The checklist records completed integration and CI follow-up. The original dirty-path inventory remains in [baseline.json](baseline.json); unrelated local `.serena/` configuration stays outside commits.

## Current agent CLI evidence

[The CLI guide](../v0.1/CLI.md) documents both backends and their permission/storage contracts. Frozen install, strict types (0 diagnostics), formatting, launcher syntax and bundles/declarations pass in fresh local Windows staging and [clean Linux CI](https://github.com/SYMBaiEX/SYMindX/actions/runs/37173551463). [cli-validation.json](cli-validation.json) hashes 33 current source/config inputs; SDK, website and scaffolder sources match their prior records. [The CLI checklist](CLI-CHECKLIST.md) is complete. Runtime behavior, approval interactions and live API/Codex tasks remain unverified.

## Modernization checkpoint evidence

| Scope | Result | Record |
| --- | --- | --- |
| Supported runtime | Frozen install, strict types, format, bundles/declarations and tooling syntax pass | [Runtime](runtime-validation.json) |
| Scaffolder | Frozen install, strict types, format, declarations and static template compile pass | [Scaffolder](scaffolder-validation.json) |
| SDK adapters and transitive source | Fresh frozen install and strict compile pass with 0 diagnostics across 93 tracked compiler source files | [SDK](sdk-validation.json) |
| Local web console | Fresh frozen install, strict app/config types, Vite bundle and static Storybook pass | [Web](web-validation.json) |
| Workspace/dependencies | All live declarations match the ledger; workspace checker passes | [Dependencies](dependencies.json) |
| Clean Linux CI | Runtime, scaffolder, website and SDK compile/build gates pass | [CI](ci-validation.json) |
| Preservation | 57 of 57 recorded tooling/web/scaffolder preimages match their archived hashes | [Tooling](tooling-preservation.json), [web](website-preservation.json), [scaffolder](scaffolder-preservation.json) |

The completed modernization checkpoint matched all 159 recorded inputs in Git. The agent CLI changes supersede the runtime source hashes from that checkpoint; [cli-validation.json](cli-validation.json) records current runtime inputs and gates. SDK, website and scaffolder sources remain at their prior validated checkpoint. Clean Linux CI caught a stale reference to an ignored declaration file; that reference and a second obsolete reference were removed, and the SDK gate then passed. Workflow and Compose YAML syntax parsed successfully. The native TypeScript7 compiler cannot enumerate inputs from Windows WSL UNC paths; equivalent fresh local staging passes. Storybook reports catalog chunks over 500 KiB. Neither result establishes application behavior.

## Readiness and next work

This is a v0.1 implementation candidate. Implementation behavior tests, browser interaction, live provider/MCP calls and Docker execution were not run. No application startup, external messages, existing database changes, deployment or global installation occurred. A new API key was created through the approved secure credential workflow and saved only to an ignored local environment file; it has not been used for a live request. The complete legacy application, older dashboards, extensions, autonomy and learning remain outside the supported gates.

[ROADMAP.md](ROADMAP.md) begins with release behavior checks against temporary databases and injected providers, then promotes one integration at a time. Memory ownership/export/retention and observable failure handling come before broad autonomy or remote deployment. See [the framework audit](../audit-2026-10-03.md) for the original assessment; historical implementation records remain unchanged.

The user-owned orchestration skill is version 1.4.0 with coding-first dispatch and GPT-6 Luna routing. All eight user-owned agent profiles parse and use GPT-6 Luna. Loaded custom profiles may need an app reload; this fleet used the native explicit model field.
