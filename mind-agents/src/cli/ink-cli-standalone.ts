#!/usr/bin/env node

/**
 * Standalone Ink CLI Entry Point
 * 
 * This provides a direct entry point for the React-based Ink CLI interface
 * that connects to the actual SYMindX runtime system.
 */

import chalk from 'chalk';
import { Command } from 'commander';

async function main() {
  const program = new Command();

  program
    .name('symindx-dashboard')
    .description('📊 SYMindX Modern React-based CLI Dashboard')
    .version('1.0.0')
    .option('--view <view>', 'Initial view (dashboard, agents, status)', 'dashboard')
    .option('--api-url <url>', 'Runtime API URL', process.env.SYMINDX_API_URL || 'http://localhost:8000')
    .option('--no-color', 'Disable colored output');

  program.action(async (options) => {
    try {
      // Set up environment
      if (options.apiUrl) {
        process.env.SYMINDX_API_URL = options.apiUrl;
      }

      // Import React and Ink components
      const React = await import('react');
      const { render } = await import('ink');
      const { MainLayout } = await import('./layouts/index');
      
      // Clear the console and start the Ink app
      console.clear();
      
      // Show a brief startup message
      console.log(chalk.cyan('🚀 Starting SYMindX Dashboard...'));
      console.log(chalk.gray(`Connecting to runtime at: ${process.env.SYMINDX_API_URL}`));
      console.log();
      
      // Render the Ink CLI app
      const app = render(React.createElement(MainLayout, { 
        command: options.view, 
        args: [] 
      }));
      
      // Handle graceful shutdown
      const cleanup = () => {
        app.unmount();
        console.log(chalk.gray('\n👋 Goodbye!'));
        process.exit(0);
      };
      
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
      
      // Wait for the app to exit
      await app.waitUntilExit();
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to start SYMindX Dashboard:'));
      console.error(error);
      
      // Show helpful troubleshooting info
      console.log();
      console.log(chalk.yellow('💡 Troubleshooting:'));
      console.log(chalk.gray('• Make sure SYMindX runtime is running'));
      console.log(chalk.gray('• Check that the API is accessible at:', process.env.SYMINDX_API_URL || 'http://localhost:8000'));
      console.log(chalk.gray('• Try running: curl ' + (process.env.SYMINDX_API_URL || 'http://localhost:8000') + '/health'));
      
      process.exit(1);
    }
  });

  await program.parseAsync(process.argv);
}

// Run the CLI
if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export { main };