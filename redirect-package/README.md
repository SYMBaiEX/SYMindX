# Local SYMindX CLI bridge

This private checkout helper launches the supported packages/runtime CLI with Bun. It performs no downloads, global installation, package discovery or postinstall actions. It uses the compiled CLI when present, otherwise the local TypeScript source.

From a complete checkout with Bun installed:

```sh
node redirect-package/bin.js --help
node redirect-package/bin.js chat --message "Hello"
```

The second command explicitly starts the echo character and writes a SQLite history file in the current directory. Arguments, terminal output and termination signals are forwarded. Nonzero child exit codes are preserved. This helper is not a published replacement for the old @symindx/cli package.

See [the runtime guide](../packages/runtime/README.md) for installation, configuration and limitations.
