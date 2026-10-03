#!/usr/bin/env node
'use strict';

const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

// Local checkout bridge only. Installation and downloads are never implicit.
const runtimeRoot = path.resolve(__dirname, '..', 'packages', 'runtime');
const builtCli = path.join(runtimeRoot, 'dist', 'cli.js');
const sourceCli = path.join(runtimeRoot, 'src', 'cli.ts');
const cli = existsSync(builtCli) ? builtCli : existsSync(sourceCli) ? sourceCli : undefined;
if (!cli) {
  console.error('Supported CLI not found. Run this bridge from a complete SYMindX checkout.');
  process.exitCode = 1;
} else {
  const child = spawn('bun', ['--no-env-file', cli, ...process.argv.slice(2)], {
    stdio: 'inherit',
    shell: false,
  });
  const onInterrupt = () => child.kill('SIGINT');
  const onTerminate = () => child.kill('SIGTERM');
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onTerminate);
  const cleanup = () => {
    process.removeListener('SIGINT', onInterrupt);
    process.removeListener('SIGTERM', onTerminate);
  };
  child.once('error', () => {
    cleanup();
    console.error('Unable to launch Bun. Install the project Bun version and retry.');
    process.exitCode = 1;
  });
  child.once('close', (code, signal) => {
    cleanup();
    process.exitCode = code !== null ? code : signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1;
  });
}
