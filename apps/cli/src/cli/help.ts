export const HELP = `Usage:
  symindx agents
  symindx agents new <id> --name <Name> [--prompt <text>]
  symindx agents show <id>
  symindx agents about <id>
  symindx agents use <id>
  symindx extensions
  symindx portals
  symindx suite
  symindx swarm
  symindx chat [--agent <id>] [message]
  symindx sessions [--agent <id>]
  symindx sessions new [--agent <id>] [--mode chat|code|build]
  symindx rooms
  symindx rooms new <id> --title <title> --agents a,b
  symindx rooms show <id>
  symindx room <id> [message]
  symindx code [task]
  symindx build [task]
  symindx eval
  symindx demo
  symindx work
  symindx work add <title> [--agent <id>] [--after <id>]
  symindx work done <id>
  symindx tick
  symindx status

agent is an alias for agents.

Options:
  --agent <id>            Agent. Default: first catalog agent, else demo
  --character <id>        Same as --agent
  --session <id>          Session. Default: the active session
  --mode <mode>           chat, code, or build. Default: chat
  --after <id>            Work item this new item follows
  --agents <a,b>          Comma-separated room members
  --title <text>          Room title
  --name <name>           Name for a new agent
  --prompt <text>         System prompt for a new agent
  --message, -m <text>    Message text
  --base <url>            Loopback Ollama. Default: http://127.0.0.1:11434
  --timeout <seconds>     1 to 300. Default: 60
  --json                  JSON for list, show, create, and status
  --help, -h
  --version

Chat with no message opens a prompt on the latest chat session. A named --session keeps that session's mode.
In chat, the agent can search the public web with the web tool and read one public page with the page tool. Private and loopback URLs are refused.
Room with no message opens a prompt that sends each line to that room.
code and build are the same coding session. With a task, the agent reads, edits, and can run a shell command in this workspace. With no task, the prompt stays open.
Chat does not change files. Paths cannot leave the workspace, and env files are refused.
build is an alias for code. A saved session mode of build still codes.

Type / to list commands. A shorter prefix, such as /ag, lists the matches.
Lines typed while a turn is running wait, then run in order.
/plan holds writes and shell in a code session until /apply. The prompt shows plan while the hold is on.
/who looks up another agent without calling them. /note leaves a message they read on their next turn.
work lists the task tree. work add assigns a title, and --after blocks it until that item is done. work done finishes an item and tells the next assignee. tick lists agents who have been quiet for at least a minute. It does not call the model.
extensions lists Slack, Twitter, RuneLite, and the direct CLI. portals lists OpenAI, Anthropic, Groq, xAI, OpenRouter, and the sqlite, Supabase, and Neon memory providers. Neither command contacts those services.
suite runs the framework checks with a scripted speaker. It does not call Ollama.
swarm scores the routing dataset, then runs scout, editor, and mason on qwen3.5:9b with thinking off.
Slash commands:
  /help
  /exit
  /agents
  /use <id>
  /sessions
  /session new
  /mode chat|code|build
  /plan
  /apply
  /rooms
  /room <id>
  /who <id>
  /note <id> <text>
  /work
  /work add <title>
  /work done <id>
  /tick
  /status
  /clear
`;
