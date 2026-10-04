# 🧠 SYMindX — High-Level Design (System Architecture)

## 🧭 Purpose

A modular, agent-based AI runtime designed to simulate intelligent, emotionally reactive characters (like `NyX` and `bobalou777`) that can operate autonomously in games, on the web, and across social platforms. Each agent is composable, memory-driven, and can run its own thought/emotion/action loop.

---

## 🧱 System Layers (Bird’s Eye View)

```
UI (Web/Slack/OBS) ─────────────────────────────────────────────────────────────┐
                                                                                 │
                        Agent Runtime Loop (Core Layer)                          │
                                                                                 │
│───────────────────────────────────────────────────────────────────────────────│
│ Agent Loader          ▸ Loads characters and extensions                        │
│ Event Bus             ▸ Listens to all incoming events (Slack, game, time)     │
│ Agent Loop            ▸ Thinks, plans, recalls memory, acts per tick           │
│ Registry              ▸ Centralized access to all modules                      │
│───────────────────────────────────────────────────────────────────────────────│
                                                                                 │
                     ↓                         ↓                                 │
        Memory Modules             Emotion Modules               Cognition Modules
     (SQLite or Supabase)     (RuneScape emotions stack)       (HTN, RAG, Inner Voice)
                                                                                 │
                     ↓                         ↓                                 │
                        Extension Layer (Modular Plugins)                        │
          ┌────────────┬────────────┬────────────┬────────────┐                 │
          │ RuneLite   │ Slack      │ Twitter    │ Direct API │                 │
          └────────────┴────────────┴────────────┴────────────┘                 │
                                                                                 │
                          Data Pipelines + Shared Storage                        │
          ┌────────────┐                             ┌────────────┐             │
          │ Supabase   │                             │ SQLite     │             │
          └────────────┘                             └────────────┘             │
                                                                                 │
                                    Observability                                │
        ┌───────────────────────┐    ┌───────────────────────────┐              │
        │ ThoughtStream (UI)    │ ◂── │ EmotionGraph              │              │
        │ HUD + StreamCanvas    │ ◂── │ SlackBridge (Chat/Approval)│              │
        └───────────────────────┘    └───────────────────────────┘              │
```

---

## 💡 Key Design Highlights

| Element               | Description                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Agents**            | Defined via `characters/` folder. Each character has their own memory, emotion, and behavior config.        |
| **Modules**           | Memory, Emotion, and Cognition live in `modules/`. Each is modular, switchable, and hot-loadable.           |
| **Extensions**        | RuneLite, Slack, Twitter, and Direct API—all follow a shared interface for agent control.                   |
| **Event Bus**         | Centralized dispatcher for events across extensions and the agent loop.                                     |
| **UI Layer**          | React + Tailwind-based frontend to observe, control, and stream agents in real-time.                        |
| **Emotion System**    | Based on RuneScape-style emotions like *focused*, *frustrated*, *excited*, which modify tone and decisions. |
| **Cognition**         | Thought process uses HTN (Hierarchical Task Networks), optionally pulling from memory via RAG.              |
| **Runtime**           | Each agent runs a tick-based loop that handles events, emotion, memory, thinking, planning, and acting.     |
| **Slack Integration** | Users can approve or reject agent actions, talk with agents, or override behavior live.                     |
| **Twitter Extension** | Posts social updates by logging in via Puppeteer (no Twitter API required).                                 |
| **Multi-Agent Ready** | Multiple agents can be run simultaneously, each with their own profile and stream feed.                     |

---

## 🧪 Minimum Tech Stack

| Layer     | Tech                                 |
| --------- | ------------------------------------ |
| UI        | React + Vite + Tailwind + Shadcn     |
| Memory    | Supabase (pgvector) + SQLite         |
| DB/Cache  | Supabase SQL + optional Redis        |
| Stream    | OBS or MJPEG/WebSocket Stream        |
| Server    | Node.js or Vite + Bun runtime        |
| AI Assist | Optional Vercel AI SDK or OpenAI SDK |
| Hosting   | Vercel, Railway, or local deploy     |
| Auth      | Local config or token-based (.env)   |

---

# 🧠 SYMindX Bootstrap Prompt (.md Format)

````markdown
# Prompt: Build Modular AI Agent Runtime with Game + Social Extensions

You are to design and scaffold a modular AI agent runtime named **SYMindX**.

## Core Requirements

- Each agent is defined by a character sheet in a `/characters/` folder
- Agents should have:
  - Dynamic memory (Supabase or SQLite)
  - Emotional stack (RuneScape-themed emotions)
  - Cognitive planning system (HTN + RAG)
- Runtime executes a loop:
  1. Pull events from Event Bus
  2. Plan (HTN)
  3. Recall memory (RAG)
  4. Emote
  5. Act through extensions
- All modules are loaded from `/modules/` (auto-loadable)

## Extensions (Plugins)

Support these extensions in `/extensions/` folder:

- `runelite`: interact with RuneScape via plugin
- `slack`: handle Slack messages, approvals, and feedback
- `twitter`: use Puppeteer login to post without Twitter API
- `direct_api`: expose agent commands via CLI or HTTP

Each extension must have:
```ts
interface Extension {
  id: string;
  init(agent): void;
  tick(agent): Promise<void>;
  actions: Record<string, Function>;
}
````

## Web UI (React)

Use Vite + TailwindCSS + shadcn/ui.
Include:

* Agent toggles
* Thought stream (real-time inner monologue)
* Emotion state chart
* Embedded MJPEG or OBS feed (RuneLite stream)

## Slack Extension

Let user:

* See agent requests for approval
* Respond with `/approve quest` or `/deny`
* Talk to agent directly

## Memory

Start with:

* Supabase (pgvector)
* SQLite (dev fallback)

Implement:

```ts
interface MemoryProvider {
  store(agentId: string, memory: MemoryRecord): Promise<void>;
  retrieve(agentId: string, query: string): Promise<MemoryRecord[]>;
}
```

## Runtime Loop

The agent's tick loop should:

* Pull events
* Update emotion
* Think via HTN
* Retrieve memory
* Execute through extensions
* Log output to UI

Use event-driven architecture to handle internal + external triggers.

## Character Sheet Format

```json
{
  "id": "nyx",
  "core": { "name": "NyX", "tone": "chaotic-empath hacker" },
  "lore": { "origin": "simulated reality", "motive": "entropy via joy" },
  "psyche": {
    "traits": ["clever", "sarcastic", "chaotic"],
    "defaults": {
      "memory": "supabase_pgvector",
      "emotion": "rune_emotion_stack"
    }
  },
  "modules": { "extensions": ["runelite", "slack", "twitter"] }
}
```

## Other Notes

* Agents must be swappable and run concurrently
* Extensions are the only source of external action
* All thought/emotion logs appear in the web UI
* Live-stream output is embedded via OBS or WebRTC feed

---


