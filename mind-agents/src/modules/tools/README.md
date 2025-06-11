# Tools Module

A comprehensive set of tools for code execution, terminal access, and sandboxed operations in a secure and controlled manner. This module provides a flexible and extensible system for executing code, running terminal commands, and managing sandboxed environments.

## 🏗️ Module Structure

```
tools/
├── lib/               # Utility functions and helpers
│   ├── processUtils.ts  # Process management utilities
│   └── validation.ts    # Input validation helpers
│
├── logic/             # Core implementations
│   ├── CodeExecutor.ts       # Code execution engine
│   ├── DynamicToolSystem.ts  # Tool system implementation
│   └── TerminalInterface.ts  # Terminal interaction
│
├── skills/            # Tool specifications and implementations
│   └── common.skills.ts # Common tool specifications
│
├── types/             # TypeScript type definitions
│   ├── config.types.ts    # Configuration interfaces
│   ├── executor.types.ts  # Executor interfaces
│   ├── sandbox.types.ts   # Sandbox-related types
│   ├── terminal.types.ts  # Terminal-related types
│   └── index.ts           # Type re-exports
│
├── index.ts           # Public API
└── README.md          # This file
```

## 🚀 Features

- **Code Execution**: Execute code in various programming languages
- **Terminal Access**: Run shell commands and manage processes
- **Sandboxing**: Execute untrusted code in a secure environment
- **Type Safety**: Fully typed with TypeScript
- **Modular Design**: Easy to extend with new tools and capabilities

## 📦 Installation

```bash
# If using npm
npm install @symindx/tools

# If using yarn
yarn add @symindx/tools
```

## 🛠️ Usage

### Basic Example

```typescript
import {
  createDynamicToolSystem,
  SYMindXCodeExecutor,
  SYMindXTerminalInterface,
  createCommonToolSpecs
} from '@symindx/tools';

// Create tool system with default configuration
const toolSystem = createDynamicToolSystem();

// Initialize executors
const terminal = new SYMindXTerminalInterface();
const codeExecutor = new SYMindXCodeExecutor({
  // Configuration options
}, terminal);

// Register common tools
const commonTools = createCommonToolSpecs();
commonTools.forEach(tool => toolSystem.createTool(tool));

// Execute code
try {
  const result = await codeExecutor.execute('console.log("Hello, World!")', {
    language: 'javascript'
  });
  console.log('Execution result:', result);
} catch (error) {
  console.error('Execution failed:', error);
}
```

### Available Tools

The module comes with several built-in tools:

- **Code Execution**: Execute JavaScript, TypeScript, Python, and shell scripts
- **File Operations**: Read, write, and manage files
- **Process Management**: Start, stop, and monitor processes
- **Network Utilities**: Make HTTP requests and handle network operations

## 🔧 Configuration

### Tool System Configuration

```typescript
const config = {
  sandbox: {
    enabled: true,
    allowedLanguages: ['javascript', 'typescript', 'python', 'bash'],
    timeoutMs: 30000,
    memoryLimitMB: 256,
    networkAccess: false,
    fileSystemAccess: true,
    maxProcesses: 5
  },
  terminal: {
    enabled: true,
    allowedCommands: ['ls', 'cd', 'cat', 'grep', 'find'],
    blockedCommands: ['rm -rf', ':', '>'],
    timeoutMs: 60000,
    maxConcurrentProcesses: 3,
    workingDirectory: process.cwd()
  },
  validation: {
    enabled: true,
    strictMode: true,
    allowDynamicImports: false,
    maxCodeLength: 10000
  }
};
```

## 📚 API Reference

### Core Classes

#### `SYMindXDynamicToolSystem`
Manages the collection of available tools and their execution.

#### `SYMindXCodeExecutor`
Handles execution of code in various programming languages.

#### `SYMindXTerminalInterface`
Provides an interface for executing terminal commands.

## 🔒 Security Considerations

- **Sandboxing**: All code execution happens in a sandboxed environment
- **Input Validation**: All inputs are strictly validated
- **Resource Limits**: Memory and execution time are limited
- **Command Whitelisting**: Only allowed commands can be executed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by various open-source tools and frameworks
- Thanks to all contributors who have helped improve this module
