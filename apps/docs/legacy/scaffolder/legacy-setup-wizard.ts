/**
 * Interactive 5-minute setup wizard for SYMindX projects
 */

import chalk from 'chalk';
import gradient from 'gradient-string';
import inquirer from 'inquirer';
import ora from 'ora';
import boxen from 'boxen';
import fs from 'fs-extra';
import path from 'path';

const symindxGradient = gradient(['#FF006E', '#8338EC', '#3A86FF']);
const successGradient = gradient(['#00F5FF', '#00FF00']);

export interface SetupConfig {
  projectPath: string;
  aiProvider: string;
  apiKey?: string;
  memoryProvider: string;
  databaseUrl?: string;
  enableDashboard: boolean;
  autoStart: boolean;
}

export class SetupWizard {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  async run(): Promise<void> {
    console.clear();
    await this.showWelcome();
    
    const config = await this.gatherSetupConfig();
    await this.performSetup(config);
    await this.showCompletion(config);
  }

  private async showWelcome(): Promise<void> {
    const welcomeBox = boxen(
      symindxGradient.multiline([
        '🚀 SYMindX 5-Minute Setup Wizard',
        '',
        'This wizard will help you:',
        '✅ Configure your environment',
        '✅ Set up API keys and database',
        '✅ Install dependencies',
        '✅ Start your agent',
        '',
        'Let\'s get started!'
      ].join('\n')),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan'
      }
    );

    console.log(welcomeBox);
    console.log(chalk.gray('⏱️  Estimated time: 5 minutes\n'));
  }

  private async gatherSetupConfig(): Promise<SetupConfig> {
    console.log(symindxGradient('📋 Step 1: Configuration\n'));

    // Read existing config to determine what's needed
    const agentConfigPath = path.join(this.projectPath, 'src', 'config', 'agent.json');
    const agentConfig = await fs.readJson(agentConfigPath);
    const envExamplePath = path.join(this.projectPath, '.env.example');
    const envExample = await fs.readFile(envExamplePath, 'utf-8');

    const aiProvider = agentConfig.modules?.portals?.primary || 'openai';
    const memoryProvider = agentConfig.modules?.memory?.provider || 'sqlite';
    const hasApiExtension = agentConfig.modules?.extensions?.includes('api') || false;

    const questions: any[] = [];

    // API Key configuration
    if (this.needsApiKey(aiProvider, envExample)) {
      questions.push({
        type: 'password',
        name: 'apiKey',
        message: symindxGradient(`Enter your ${this.getProviderName(aiProvider)} API key:`),
        mask: '*',
        validate: (input: string) => {
          if (!input.trim()) return 'API key is required';
          if (input.length < 10) return 'API key seems too short';
          return true;
        }
      });
    }

    // Database configuration
    if (this.needsDatabaseUrl(memoryProvider, envExample)) {
      questions.push({
        type: 'input',
        name: 'databaseUrl',
        message: symindxGradient(`Enter your ${memoryProvider} database URL:`),
        validate: (input: string) => {
          if (!input.trim()) return 'Database URL is required';
          if (!input.startsWith('postgresql://') && !input.startsWith('postgres://')) {
            return 'Database URL should start with postgresql:// or postgres://';
          }
          return true;
        }
      });
    }

    // Dashboard preference
    if (hasApiExtension) {
      questions.push({
        type: 'confirm',
        name: 'enableDashboard',
        message: symindxGradient('Open web dashboard after setup?'),
        default: true
      });
    }

    // Auto-start preference
    questions.push({
      type: 'confirm',
      name: 'autoStart',
      message: symindxGradient('Start your agent automatically after setup?'),
      default: true
    });

    const answers = await inquirer.prompt(questions);

    return {
      projectPath: this.projectPath,
      aiProvider,
      apiKey: answers.apiKey,
      memoryProvider,
      databaseUrl: answers.databaseUrl,
      enableDashboard: answers.enableDashboard || false,
      autoStart: answers.autoStart || false
    };
  }

  private async performSetup(config: SetupConfig): Promise<void> {
    console.log(symindxGradient('\n🔧 Step 2: Environment Setup\n'));

    // Configure environment
    await this.configureEnvironment(config);

    // Install dependencies
    await this.installDependencies();

    // Build project
    await this.buildProject();

    // Test configuration
    await this.testConfiguration(config);
  }

  private async configureEnvironment(config: SetupConfig): Promise<void> {
    const spinner = ora('📝 Configuring environment variables...').start();

    try {
      const envPath = path.join(config.projectPath, '.env');
      let envContent = await fs.readFile(envPath, 'utf-8');

      // Update API key
      if (config.apiKey) {
        const keyName = this.getApiKeyName(config.aiProvider);
        envContent = envContent.replace(
          new RegExp(`${keyName}=.*`),
          `${keyName}=${config.apiKey}`
        );
      }

      // Update database URL
      if (config.databaseUrl) {
        envContent = envContent.replace(
          /DATABASE_URL=.*/,
          `DATABASE_URL=${config.databaseUrl}`
        );
      }

      // Set development mode
      envContent = envContent.replace(
        /NODE_ENV=.*/,
        'NODE_ENV=development'
      );

      await fs.writeFile(envPath, envContent);
      spinner.succeed('Environment configured');
    } catch (error) {
      spinner.fail('Failed to configure environment');
      throw error;
    }
  }

  private async installDependencies(): Promise<void> {
    const spinner = ora('📦 Installing dependencies...').start();

    try {
      const { spawn } = await import('child_process');
      const packageManager = await this.detectPackageManager();

      await new Promise<void>((resolve, reject) => {
        const installProcess = spawn(packageManager, ['install'], {
          cwd: this.projectPath,
          stdio: 'pipe'
        });

        installProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Installation failed with code ${code}`));
          }
        });

        installProcess.on('error', reject);
      });

      spinner.succeed('Dependencies installed');
    } catch (error) {
      spinner.fail('Failed to install dependencies');
      throw error;
    }
  }

  private async buildProject(): Promise<void> {
    const spinner = ora('🔨 Building project...').start();

    try {
      const { spawn } = await import('child_process');
      const packageManager = await this.detectPackageManager();
      const buildCommand = packageManager === 'bun' ? 'bun' : 'npm';
      const buildArgs = packageManager === 'bun' ? ['run', 'build'] : ['run', 'build'];

      await new Promise<void>((resolve, reject) => {
        const buildProcess = spawn(buildCommand, buildArgs, {
          cwd: this.projectPath,
          stdio: 'pipe'
        });

        buildProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Build failed with code ${code}`));
          }
        });

        buildProcess.on('error', reject);
      });

      spinner.succeed('Project built successfully');
    } catch (error) {
      spinner.fail('Failed to build project');
      throw error;
    }
  }

  private async testConfiguration(config: SetupConfig): Promise<void> {
    const spinner = ora('🧪 Testing configuration...').start();

    try {
      // Test environment variables
      const envPath = path.join(config.projectPath, '.env');
      const envContent = await fs.readFile(envPath, 'utf-8');
      
      // Check for required variables
      const requiredVars = [
        this.getApiKeyName(config.aiProvider)
      ];

      if (config.memoryProvider !== 'sqlite') {
        requiredVars.push('DATABASE_URL');
      }

      for (const varName of requiredVars) {
        if (!envContent.includes(`${varName}=`) || envContent.includes(`${varName}=REPLACE_ME`)) {
          throw new Error(`Missing or invalid ${varName}`);
        }
      }

      // Test build output
      const distPath = path.join(config.projectPath, 'dist', 'index.js');
      if (!await fs.pathExists(distPath)) {
        throw new Error('Build output not found');
      }

      spinner.succeed('Configuration tested successfully');
    } catch (error) {
      spinner.fail('Configuration test failed');
      throw error;
    }
  }

  private async showCompletion(config: SetupConfig): Promise<void> {
    console.log('\n' + successGradient('🎉 Setup Complete! 🎉\n'));

    const completionBox = boxen(
      [
        chalk.bold('Your SYMindX agent is ready!'),
        '',
        chalk.gray('What was configured:'),
        chalk.green(`  🤖 AI Provider: ${this.getProviderName(config.aiProvider)}`),
        chalk.green(`  💾 Memory: ${config.memoryProvider}`),
        chalk.green(`  🔑 API Key: ${config.apiKey ? 'Configured' : 'Not needed'}`),
        chalk.green(`  🗄️  Database: ${config.databaseUrl ? 'Configured' : 'Using SQLite'}`),
        '',
        chalk.gray('Next steps:'),
        chalk.cyan('  bun run dev    # Start development mode'),
        chalk.cyan('  bun run cli    # Interactive CLI'),
        config.enableDashboard ? chalk.cyan('  http://localhost:8000  # Web dashboard') : '',
        '',
        chalk.yellow('⚡ Total setup time: ~5 minutes')
      ].filter(Boolean).join('\n'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }
    );

    console.log(completionBox);

    if (config.autoStart) {
      console.log(chalk.cyan('\n🚀 Starting your agent...\n'));
      await this.startAgent(config);
    } else {
      console.log(chalk.gray('\n💡 Run "bun run dev" to start your agent\n'));
    }
  }

  private async startAgent(config: SetupConfig): Promise<void> {
    const spinner = ora('🤖 Starting agent...').start();

    try {
      const { spawn } = await import('child_process');
      const packageManager = await this.detectPackageManager();
      const startCommand = packageManager === 'bun' ? 'bun' : 'npm';
      const startArgs = ['run', 'dev'];

      const agentProcess = spawn(startCommand, startArgs, {
        cwd: config.projectPath,
        stdio: 'inherit',
        detached: true
      });

      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      spinner.succeed('Agent started in development mode');
      
      if (config.enableDashboard) {
        console.log(chalk.cyan('🌐 Web dashboard: http://localhost:8000'));
        
        // Try to open browser
        try {
          const { spawn: openSpawn } = await import('child_process');
          const platform = process.platform;
          const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
          openSpawn(command, ['http://localhost:8000'], { detached: true, stdio: 'ignore' });
        } catch {
          // Ignore browser opening errors
        }
      }

      console.log(chalk.gray('\n💡 Press Ctrl+C to stop the agent\n'));
      
    } catch (error) {
      spinner.fail('Failed to start agent');
      console.log(chalk.yellow('💡 You can start it manually with: bun run dev'));
    }
  }

  // Helper methods
  private needsApiKey(provider: string, envExample: string): boolean {
    const keyName = this.getApiKeyName(provider);
    return envExample.includes(`${keyName}=`) && provider !== 'ollama';
  }

  private needsDatabaseUrl(provider: string, envExample: string): boolean {
    return provider !== 'sqlite' && envExample.includes('DATABASE_URL=');
  }

  private getApiKeyName(provider: string): string {
    const keyNames: Record<string, string> = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      groq: 'GROQ_API_KEY',
      google: 'GOOGLE_GENERATIVE_AI_API_KEY',
      ollama: 'OLLAMA_BASE_URL'
    };
    return keyNames[provider] || 'API_KEY';
  }

  private getProviderName(provider: string): string {
    const names: Record<string, string> = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      groq: 'Groq',
      google: 'Google',
      ollama: 'Ollama'
    };
    return names[provider] || provider;
  }

  private async detectPackageManager(): Promise<string> {
    try {
      const { execSync } = await import('child_process');
      
      // Check for bun
      try {
        execSync('bun --version', { stdio: 'ignore' });
        return 'bun';
      } catch {}

      // Check for yarn
      try {
        execSync('yarn --version', { stdio: 'ignore' });
        return 'yarn';
      } catch {}

      // Default to npm
      return 'npm';
    } catch {
      return 'npm';
    }
  }
}