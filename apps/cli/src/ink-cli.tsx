#!/usr/bin/env node

import { fileURLToPath } from 'url';

import { render } from 'ink';
import React from 'react';

import { MainLayout } from './layouts/index.js';

interface AppProps {
  command?: string;
  args?: string[];
}

const App: React.FC<AppProps> = ({ command, args }) => {
  return <MainLayout {...(command && { command })} {...(args && { args })} />;
};

export default App;

// CLI Entry Point
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  const args = process.argv.slice(2);
  const command = args[0] || 'dashboard';
  const commandArgs = args.slice(1);

  render(<App command={command} args={commandArgs} />);
}
