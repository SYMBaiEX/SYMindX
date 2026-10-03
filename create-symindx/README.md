# create-symindx

A small Bun CLI that scaffolds a project against a **locally built** SYMindX v0.1 runtime. It does not run an installer, access the network, or assume that `@symindx/runtime` has been published.

## Build and use

Requirements: Bun 1.4.2 or newer and a built `packages/runtime` checkout. The scaffolder package has no committed lockfile yet, so its first dependency resolution is unlocked; lifecycle scripts are disabled for the install command below.

```sh
bun install --cwd create-symindx --ignore-scripts
bun run --cwd create-symindx build
bun --no-env-file create-symindx/dist/index.js --out ./my-agent
```

By default the CLI reads `../packages/runtime` next to the scaffolder. To use another local build:

```sh
bun --no-env-file create-symindx/dist/index.js --out ./my-agent --runtime-path ../symindx/packages/runtime
```

The runtime package must be named `@symindx/runtime`, have a version in the v0.1 family, and contain built `dist/index.js` and declarations. The generated project vendors only its package manifest, license, default character, and built runtime artifacts. The output path must not already exist. Generation stages files beside the destination and publishes the completed directory by rename.

## Generated project

The generated private Bun project depends on `file:vendor/runtime`. It loads a schema-version-1 character, constructs `SYMindXRuntime`, calls `start()`, sends one input message, then calls `stop()` in `finally`. The default character uses the offline `echo` provider. Its SQLite database is stored under the generated project’s `data/` directory.

The generated README explains how to switch to an OpenAI-compatible endpoint. Configuration stores only an environment variable name in `apiKeyEnv`; users provide the actual key in their process environment. v0.1 is a local single-owner runtime: conversation and tool output are stored as plaintext, recall is a bounded recent-message window, and semantic memory, multiuser isolation, and remote deployment are not provided.

## Options

```text
--out <directory>          Destination (default: ./my-symindx-agent)
--runtime-path <directory> Local built runtime (default: adjacent packages/runtime)
-h, --help                 Show help
```

Unknown arguments and duplicate options are errors. The scaffolder itself never installs dependencies; run `bun install` in the generated project when ready.
