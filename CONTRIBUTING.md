# Contributing to SYMindX

Thank you for considering contributing to this project! This repository uses **Bun** for package management.

## Setup

1. Install [Bun](https://bun.sh/).
2. Install dependencies from the repository root:
   ```bash
   bun install
   ```
   This command also installs packages for the `mind-agents` and `website` workspaces.
3. Run the test suite:
   ```bash
   bun test
   ```
   The tests are located in the `mind-agents` package and are executed automatically in CI.

## Development Workflow

- Create a new branch for your change.
- Ensure `bun test` passes before opening a pull request.
- The GitHub Actions workflow will run `bun test` and build the project for every push and pull request.

We appreciate your contributions!
