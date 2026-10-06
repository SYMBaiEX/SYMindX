# @symindx/orchestration

`@symindx/orchestration` coordinates `@symindx/agent` minds. It stores agent profiles, session transcripts, and group rooms, and it defines the workspace tool contract: path checks, exact edits, and tool dispatch.

A host supplies the model call through `Speaker` and the file or command work through `WorkspaceIO`. The package does not open sockets, read the disk, or spawn a process.

`chat` sessions do not change files. `code` and `build` are the same coding mode: list, read, search, edit, write, and run. Group rooms hold 2 to 6 agents. A turn can address `@everyone` or one `@agentId`. Agents can look up one another and leave notes; a note waits until the recipient's next turn and does not abort work already in flight. A note can name a plan step. Each agent can keep the appraisal and the open plan from the previous turn. Work items form a tree: finishing one item unblocks the items that depend on it and leaves a note for the next assignee. Open work is attached to that agent's next turn. `tick` lists agents who have been quiet, without a model call. Emotion values inside an agent are software state. The character decay of 0.85 keeps a 30 second appraisal half-life.
