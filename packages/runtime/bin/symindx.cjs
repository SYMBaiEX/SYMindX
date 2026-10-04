#!/usr/bin/env node
'use strict';
const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');
const entry = path.resolve(__dirname, '..', 'dist', 'cli.js');
if (!existsSync(entry)) {
  console.error('SYMindX CLI is not built. Run bun run build in packages/runtime.');
  process.exitCode = 1;
} else {
  const child = spawn('bun', ['--no-env-file', entry, ...process.argv.slice(2)], {
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
  });
  const interrupt = () => child.kill('SIGINT');
  const terminate = () => child.kill('SIGTERM');
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', terminate);
  const cleanup = () => {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', terminate);
  };
  child.once('error', () => {
    cleanup();
    console.error('Unable to launch Bun. Install Bun 1.4.2+ and retry.');
    process.exitCode = 1;
  });
  child.once('close', (code, signal) => {
    cleanup();
    process.exitCode =
      code !== null ? code : signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1;
  });
}
