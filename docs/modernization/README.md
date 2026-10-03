# v0.1 modernization build

Work proceeds on main through [a bounded coding checklist](CHECKLIST.md) and [a native dynamic task queue](workflow.json). There are four concurrency slots: the orchestrator and three GPT-6 Luna coding workers. Completed findings feed implementation; a freed worker takes the next ready task.

## Integrated base

- a9a08b7: supported v0.1 runtime, audit records and focused initial cleanup.
- 10d71e0: separate checkpoint of the existing user portal/module refactor.
- Both commits were pushed to origin/main before this coding fleet began. Follow-up changes are integrated on main after compile checks.

The user-owned orchestration skill is version 1.4.0 with coding-first dispatch and current model routing. All eight user-owned agent profiles parse and use GPT-6 Luna. Loaded custom profiles may require an app reload; this fleet uses the native explicit model field.

## Evidence and limits

- [Runtime gates](runtime-validation.json): frozen install, strict types, format, library/CLI declarations, tooling syntax and workspace metadata.
- [Dependency dispositions](dependencies.json): live package families, source migrations, compatible holds and unused declarations removed.
- [Tooling hashes](tooling-preservation.json) and [web hashes](website-preservation.json): preimages retained under docs/legacy.
- Earlier baselines and implementation records remain historical. The framework audit is ../audit-2026-10-03.md.

The supported runtime is an implementation candidate. Compilation does not establish behavior, provider compatibility or production readiness. No live provider calls, messages, existing database changes, deployment, global installation or implementation tests are part of this fleet. The legacy mind-agents system retains transitive type/behavior debt outside the supported runtime build.
