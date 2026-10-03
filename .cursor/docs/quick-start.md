# Current SYMindX development

The supported package is [packages/runtime](../../packages/runtime/README.md). Follow [AGENTS.md](../../AGENTS.md) and the [implementation queue](../../docs/modernization/CHECKLIST.md).

Install package-scoped dependencies with lifecycle scripts disabled, then compile types and build. The runtime README gives platform-specific commands, including Windows UNC limitations. CLI startup is explicit and writes a new SQLite database unless a path is selected.

Historical architecture, generation templates and analysis guides are preserved in docs/legacy/cursor. They describe the former experimental framework.
