# v0.1 completion and next increments

`packages/runtime` has been removed. The library is now `packages/agent`.

## 1. Smallest useful system

The v0.1 core lived in `packages/runtime`: validated version-1 characters, one provider per agent, scoped recent history, bounded emotion state, permitted tools, atomic SQLite turn/state commits, cancellation and graceful shutdown. The local CLI, scaffolder and manual web console target this core. The legacy framework is not part of that supported execution path.

Compile gates cover frozen installs, strict source types, declarations/bundles, formatting and metadata. A passing compiler is not evidence that the message path, shutdown or provider protocol behaved correctly. Current gate records are linked from this directory's README.

## 2. Establish release behavior

Before treating the candidate as a reliable release, add explicitly requested offline checks using temporary databases and injected providers/transports:

- Character validation, persisted reload, history scoping and complete-turn transactions.
- Concurrent queue limits, stale-state rejection, cancellation, deadlines and shutdown.
- Provider malformed/truncated/oversized responses and sanitized errors.
- Tool allowlists, schema rejection, denied write approval, timeout and audit records.
- API authentication/origin/body limits and CLI signal handling.
- Generator no-overwrite/atomic publication and the console's scope/request lifecycle.

Maintain the supported gates in clean Linux CI; current compile/build results are recorded in ci-validation.json. Add behavior checks to that gate once requested and implemented. Use a separate opt-in provider trial only when an account, endpoint and cost budget are selected. No live database migration is required.

## 3. Promote selected integrations

Current SDK adapter repairs stay in the legacy tree until their contracts and behavior justify promotion. Prefer a separately packaged provider adapter against the small runtime interface. Promote one provider and one read-only tool integration at a time, with bounded inputs/results, cancellation and recorded failure behavior. Do not import the old runtime or its central type barrel into the supported core.

MCP should enter through the same explicit tool permission boundary. Remote server trust, tool discovery limits and lifecycle cleanup need a defined contract before activation. Older extensions and autonomous/learning code remain migration references.

## 4. Add durable user value

Memory export/deletion/retention and visibility into request/tool outcomes improve the local product before broad autonomy. Add semantic recall only with an explicit retrieval budget, provenance and measurable relevance. Keep emotion optional and bounded; changing heuristic state is not learning or psychological inference.

A multiuser API or remote deployment is a separate product increment. It requires identity-scoped data access, secret custody, transport/ingress design and operational recovery. The current bearer token owns the entire local runtime.

## 5. Retire legacy breadth

After a selected integration is proven in the supported core, inventory its consumers, preserve any needed history and retire the corresponding old API generation. Avoid carrying duplicate registries, contexts, result types and UI claims into the new package. The current compatibility holds in dependencies.json are migration decisions, not assurances that every legacy extension works.

## Agent CLI release gates

The two-backend CLI compiles and builds at `a007bd1`. Before treating it as a solid release, explicitly authorize and complete isolated behavior checks:

1. Temporary workspace/API state with an injected local provider: read/search paging, existing/new file writes, stale hashes, exact character allowlists, denied effects and atomic turn commits.
2. Fake native executable and temporary conversation state: JSON success/failure/malformed output, limits, cancellation during approval/execution, missing binary, state conflicts and no API credentials in child environment.
3. Piped and interactive input: bounded queues, fresh approval, SIGINT/SIGTERM, slash/session/mode transitions and machine-readable output.
4. One explicitly approved real API and native Codex task in a disposable project, across supported Windows/Linux hosts. No existing data or production integrations.
