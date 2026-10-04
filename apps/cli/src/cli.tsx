#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import figlet from 'figlet';
import gradient from 'gradient-string';
import { render } from 'ink';
// import React from 'react'

import { App } from './components/core/App.js';
import { musicManager } from './utils/background-music.js';
import { soundManager } from './utils/sound-effects.js';

// ASCII art banner
const showBanner = async (): Promise<void> => {
  const banner = figlet.textSync('SYMINDX', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default',
  });

  const gradientBanner = gradient(['#00F5FF', '#FF00FF', '#FFFF00'])(banner);
  console.log(gradientBanner);
  console.log(
    gradient(['#FF006E', '#8338EC', '#3A86FF'])('NEURAL RUNTIME SYSTEM v2.0')
  );
  console.log();
};

// Create CLI program
const program = new Command();

program
  .name('symindx')
  .description('SYMindX Neural Runtime CLI - The future of AI agent management')
  .version('2.0.0')
  .option(
    '-v, --view <view>',
    'Initial view (dashboard, agents, chat, logs, settings)',
    'dashboard'
  )
  .option('--no-sound', 'Disable sound effects')
  .option('--music', 'Enable background music')
  .option(
    '--theme <theme>',
    'Color theme (cyberpunk, matrix, neon, minimal)',
    'cyberpunk'
  )
  .option('--no-animations', 'Disable animations')
  .option('--verbose', 'Verbose output');

// Parse command line arguments
program.parse(process.argv);
const options = program.opts();

// Configure sound and music
if (!options['sound']) {
  soundManager.toggle();
}

if (options['music']) {
  musicManager.toggle();
}

// Main entry point
const main = async (): Promise<void> => {
  // Check if we're in a TTY environment first
  if (!process.stdin.isTTY) {
    await showBanner();
    console.error(
      chalk.red('\n⚠️  Error: This CLI requires an interactive terminal (TTY).')
    );
    console.error(
      chalk.yellow('\n📝 To run the SYMindX CLI, use one of these methods:\n')
    );
    console.error(chalk.cyan('  1. Run directly in your terminal:'));
    console.error(
      chalk.white('     cd mind-agents && npx tsx src/cli/cli.tsx\n')
    );
    console.error(
      chalk.cyan('  2. Use the CLI commands from the project root:')
    );
    console.error(
      chalk.white('     bun cli:dashboard    # Open dashboard view')
    );
    console.error(chalk.white('     bun cli:agents       # Manage agents'));
    console.error(
      chalk.white('     bun cli:chat         # Chat with agents\n')
    );
    console.error(chalk.cyan('  3. Or run the traditional CLI:'));
    console.error(
      chalk.white('     cd mind-agents && npx tsx src/cli/index.ts\n')
    );
    console.error(
      chalk.gray(
        'Note: The Ink-based CLI requires direct terminal access for keyboard input.'
      )
    );
    process.exit(1);
  }

  // Clear console and show banner
  console.clear();
  if (!options['noAnimations']) {
    await showBanner();
  }

  try {
    // Render the Ink app

    const { waitUntilExit } = render(<App initialView={options['view']} />, {
      exitOnCtrlC: false, // We handle exit in the app
    });

    // Wait for app to exit
    await waitUntilExit();

    // Cleanup
    console.clear();
    console.log(chalk.cyan('Thanks for using SYMindX!'));
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('Error starting SYMindX CLI:'), error);
    process.exit(1);
  }
};

// Run the app
main();
