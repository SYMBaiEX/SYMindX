# SYMindX v2

`@symindx/agent` is a pure in-process mind. Identity, appraisal, memory, plans, and the other turn state stay in the caller. This package has no database and no network client. Applications that host it live in `apps/cli`, `apps/docs`, and `apps/website`.

Emotion here is software state for behavior and wording, not a claim of feeling. Valence, arousal, and dominance change which drive is chosen, which episodes are recalled, and how a reply is worded.

The hot path is synchronous until a provider `generate()` call. `composeTurn` updates state and assembles context on the caller’s stack. The host then decides whether to await `Provider.generate()`.

Public exports are `packages/agent/src/index.ts`. Modules below are directories under `packages/agent/src`.

## Modules

- `character` — schema-1 identity, optional temperament and voice.
- `appraisal` — valence, arousal, and dominance, with decay toward temperament.
- `memory` — bounded episodic store and salience, recency, and mood recall.
- `cognition` — a fast reaction plus a bounded intention (plan).
- `social` — regard and trust for other agents.
- `drives` — `reply`, `reflect`, `reach_out`, `rest`.
- `voice` — a delivery hint blended from traits and appraisal.
- `context` — priority assembly under a character budget.
- `timeline` — bounded append-only facts.
- `turn` — `composeTurn` wires one cycle.
- `mind` — `createMind` holds that cycle: appraisal, episodes, social beliefs, the plan, and the timeline.
- `tools` and `permissions` — a registry, plus an allow-list and write approval.
- `provider`, `channel`, `extension`, `inbound`, `queue`, `presence` — edges around the mind.

## One cycle

`composeTurn` takes the current appraisal, a cue, episodes, an optional intention, inbound text, and an optional social belief. It decays appraisal toward temperament, applies the cue, reacts to the text, selects a drive, and blends a voice hint from traits and the new appraisal.

Recall ranks episodes by salience, recency, and mood congruence, then keeps a short list inside a character budget. A `reply` with inbound text and no intention opens a plan of at most eight steps. A `reflect` drive records a short reflection episode. `assemble` packs labeled slices by priority — identity, voice, appraisal, inbound, plan, social, memories, tools — and drops slices that do not fit the budget (16_000 characters on this path).

The result is a `PreparedTurn`: next appraisal, drive, reaction, voice hint, context text, recalled episodes, intention, and an optional reflection. Nothing in that object is sent anywhere.

`createMind(character, now)` is the in-memory host for one character. `hear` stores an inbound episode, notes the sender, and raises regard by 0.1. `step` runs `composeTurn` and writes the next appraisal, plan, reflection, drive, and voice hint back into the mind. When emotion is disabled, cues pass with intensity 0. Appraisal still decays toward temperament on its 30-second half-life. `say` stores the spoken episode. `request` builds one provider request from the last step. `speak` steps, generates through an injected provider, stores any text, and runs allowed read-only builtins. Writes stay refused until `useTool` is called with approval. `runBuiltin` implements `word-count`, `clock`, and `json-keys`.

## Edges

`provider` is the generate boundary. `Provider.generate(request)` returns text, tool calls, and optional token usage. `createScriptedProvider` returns canned results for tests. Presets and `resolveChatCompletionsUrl` only name or build a URL string.

`channel` is an in-memory local queue and mailbox. `inbound` parses a text envelope (`local`, `slack`, `telegram`, `discord`) and does not attach a remote adapter. `extension` registers a module and tracks `registered`, `started`, and `stopped`. `queue` is a bounded in-memory FIFO plus a keyed queue. `presence` is an in-memory roster of agents marked `ready` or `busy`.

`tools` registers name, description, and whether a tool is read-only. `decideTool` allows a call only when the name is on the allow-list. A `write` also requires `approved: true`. `runBuiltin` runs the three local tools and returns `undefined` for any other name.

The host owns persistence, credentials, and transport. Character config may name an `echo` or `openai-compatible` provider and an environment variable for a key. Parsing that config does not read the environment or open a connection.
