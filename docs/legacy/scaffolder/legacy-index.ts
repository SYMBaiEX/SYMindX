#!/usr/bin/env node

/**
 * create-symindx - Project scaffolding tool for SYMindX AI agents
 * 
 * Usage: npx create-symindx my-agent
 */

import { Command } from 'commander';
import chalk from 'chalk';
import gradient from 'gradient-string';
import inquirer from 'inquirer';
import ora from 'ora';
import boxen from 'boxen';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { SetupWizard } from './setup-wizard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cool gradients for branding
const symindxGradient = gradient(['#FF006E', '#8338EC', '#3A86FF']);
const successGradient = gradient(['#00F5FF', '#00FF00']);

interface ProjectConfig {
  name: string;
  directory: string;
  template: string;
  aiProvider: string;
  memoryProvider: string;
  personality: string;
  extensions: string[];
  setupEnvironment: boolean;
}

class SYMindXScaffolder {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupProgram();
  }

  private setupProgram(): void {
    this.program
      .name('create-symindx')
      .description(symindxGradient('🚀 Create a new SYMindX AI agent project'))
      .version('1.0.0')
      .argument('[project-name]', 'Name of the project to create')
      .option('-t, --template <template>', 'Project template to use', 'basic')
      .option('-p, --provider <provider>', 'AI provider to configure', 'openai')
      .option('-m, --memory <memory>', 'Memory provider to use', 'sqlite')
      .option('--no-install', 'Skip dependency installation')
      .option('--no-git', 'Skip git initialization')
      .option('--setup', 'Run interactive setup wizard after creation')
      .action(async (projectName, options) => {
        await this.createProject(projectName, options);
      });
  }

  async run(): Promise<void> {
    try {
      await this.showBanner();
      await this.program.parseAsync();
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }

  private async showBanner(): Promise<void> {
    console.clear();
    
    const banner = boxen(
      symindxGradient.multiline([
        '   ███████╗██╗   ██╗███╗   ███╗██╗███╗   ██╗██████╗ ██╗  ██╗',
        '   ██╔════╝╚██╗ ██╔╝████╗ ████║██║████╗  ██║██╔══██╗╚██╗██╔╝',
        '   ███████╗ ╚████╔╝ ██╔████╔██║██║██╔██╗ ██║██║  ██║ ╚███╔╝ ',
        '   ╚════██║  ╚██╔╝  ██║╚██╔╝██║██║██║╚██╗██║██║  ██║ ██╔██╗ ',
        '   ███████║   ██║   ██║ ╚═╝ ██║██║██║ ╚████║██████╔╝██╔╝ ██╗',
        '   ╚══════╝   ╚═╝   ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝',
        '',
        '           🤖 AI Agent Framework - Project Scaffolder 🤖'
      ].join('\n')),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'magenta',
        backgroundColor: 'black'
      }
    );

    console.log(banner);
    console.log(chalk.gray('   Create intelligent AI agents with emotions, memory, and multi-platform support\n'));
  }

  private async createProject(projectName?: string, options: any = {}): Promise<void> {
    const config = await this.gatherProjectConfig(projectName, options);
    
    console.log(symindxGradient('\n🚀 Creating your SYMindX agent project...\n'));

    // Create project steps
    await this.createProjectDirectory(config);
    await this.generateProjectFiles(config);
    await this.setupEnvironmentFiles(config);
    await this.createCharacterConfig(config);
    await this.installDependencies(config, options);
    await this.initializeGit(config, options);
    await this.showSuccessMessage(config);
    
    // Run setup wizard if requested
    if (options.setup) {
      console.log(chalk.cyan('\n🔧 Starting setup wizard...\n'));
      const wizard = new SetupWizard(config.directory);
      await wizard.run();
    }
  }

  private async gatherProjectConfig(projectName?: string, options: any = {}): Promise<ProjectConfig> {
    const questions: any[] = [];

    // Project name
    if (!projectName) {
      questions.push({
        type: 'input',
        name: 'name',
        message: symindxGradient('What is your agent project name?'),
        default: 'my-symindx-agent',
        validate: (input: string) => {
          if (!input.trim()) return 'Project name is required';
          if (!/^[a-z0-9-_]+$/i.test(input)) return 'Project name must be alphanumeric with hyphens/underscores';
          return true;
        }
      });
    }

    // Template selection
    if (!options.template) {
      questions.push({
        type: 'list',
        name: 'template',
        message: symindxGradient('Choose a project template:'),
        choices: [
          { name: '🤖 Basic Agent - Simple chatbot with personality', value: 'basic' },
          { name: '🎮 Gaming Agent - RuneScape bot with autonomous gameplay', value: 'gaming' },
          { name: '💬 Social Agent - Multi-platform social media bot', value: 'social' },
          { name: '🏢 Enterprise Agent - Business automation with security', value: 'enterprise' },
          { name: '🧠 Research Agent - Advanced cognition and learning', value: 'research' }
        ]
      });
    }

    // AI Provider
    if (!options.provider) {
      questions.push({
        type: 'list',
        name: 'aiProvider',
        message: symindxGradient('Select your primary AI provider:'),
        choices: [
          { name: '🔥 OpenAI (GPT-4, GPT-3.5)', value: 'openai' },
          { name: '🧠 Anthropic (Claude)', value: 'anthropic' },
          { name: '⚡ Groq (Fast inference)', value: 'groq' },
          { name: '🌟 Google (Gemini)', value: 'google' },
          { name: '🏠 Ollama (Local models)', value: 'ollama' }
        ]
      });
    }

    // Memory Provider
    if (!options.memory) {
      questions.push({
        type: 'list',
        name: 'memoryProvider',
        message: symindxGradient('Choose memory storage:'),
        choices: [
          { name: '📁 SQLite (Local file database)', value: 'sqlite' },
          { name: '🐘 PostgreSQL (Production database)', value: 'postgres' },
          { name: '☁️ Supabase (Cloud database with vector search)', value: 'supabase' },
          { name: '⚡ Neon (Serverless PostgreSQL)', value: 'neon' }
        ]
      });
    }

    // Personality
    questions.push({
      type: 'list',
      name: 'personality',
      message: symindxGradient('What personality should your agent have?'),
      choices: [
        { name: '🤖 Technical Expert - Knowledgeable and precise', value: 'technical' },
        { name: '🎨 Creative Artist - Imaginative and expressive', value: 'creative' },
        { name: '🧠 Strategic Thinker - Analytical and planning-focused', value: 'strategic' },
        { name: '💚 Empathetic Helper - Caring and supportive', value: 'empathetic' },
        { name: '😎 Confident Leader - Bold and decisive', value: 'confident' },
        { name: '🤔 Curious Explorer - Inquisitive and learning-focused', value: 'curious' }
      ]
    });

    // Extensions
    questions.push({
      type: 'checkbox',
      name: 'extensions',
      message: symindxGradient('Select extensions to include:'),
      choices: [
        { name: '🌐 API Server - HTTP/WebSocket API with dashboard', value: 'api', checked: true },
        { name: '📱 Telegram Bot - Telegram integration', value: 'telegram' },
        { name: '💬 Discord Bot - Discord server integration', value: 'discord' },
        { name: '🎮 RuneLite Plugin - RuneScape game integration', value: 'runelite' },
        { name: '🔗 MCP Server - Model Context Protocol server', value: 'mcp-server' }
      ]
    });

    // Environment setup
    questions.push({
      type: 'confirm',
      name: 'setupEnvironment',
      message: symindxGradient('Set up environment configuration now?'),
      default: true
    });

    const answers = await inquirer.prompt(questions);

    return {
      name: projectName || answers.name,
      directory: path.resolve(projectName || answers.name),
      template: options.template || answers.template,
      aiProvider: options.provider || answers.aiProvider,
      memoryProvider: options.memory || answers.memoryProvider,
      personality: answers.personality,
      extensions: answers.extensions || [],
      setupEnvironment: answers.setupEnvironment
    };
  }

  private async createProjectDirectory(config: ProjectConfig): Promise<void> {
    const spinner = ora('📁 Creating project directory...').start();

    try {
      if (await fs.pathExists(config.directory)) {
        spinner.fail(`Directory ${config.name} already exists`);
        throw new Error(`Directory ${config.name} already exists`);
      }

      await fs.ensureDir(config.directory);
      spinner.succeed('Project directory created');
    } catch (error) {
      spinner.fail('Failed to create project directory');
      throw error;
    }
  }

  private async generateProjectFiles(config: ProjectConfig): Promise<void> {
    const spinner = ora('📝 Generating project files...').start();

    try {
      // Package.json
      await this.createPackageJson(config);
      
      // TypeScript config
      await this.createTsConfig(config);
      
      // Main entry point
      await this.createMainFile(config);
      
      // Project structure
      await this.createProjectStructure(config);
      
      // Template-specific files
      await this.createTemplateFiles(config);

      spinner.succeed('Project files generated');
    } catch (error) {
      spinner.fail('Failed to generate project files');
      throw error;
    }
  }

  private async createPackageJson(config: ProjectConfig): Promise<void> {
    const packageJson: any = {
      name: config.name,
      version: '1.0.0',
      description: `SYMindX AI agent - ${config.personality} personality`,
      main: 'dist/index.js',
      type: 'module',
      scripts: {
        build: 'tsc',
        dev: 'tsc --watch & bun --watch dist/index.js',
        start: 'bun dist/index.js',
        'start:dev': 'bun --watch src/index.ts',
        test: 'jest',
        lint: 'eslint src --ext .ts',
        'lint:fix': 'eslint src --ext .ts --fix',
        format: 'prettier --write "src/**/*.{ts,json}"',
        clean: 'rm -rf dist',
        'dev-tools': 'bun dist/dev-tools.js',
        'debug': 'bun dist/dev-tools.js debug',
        'monitor': 'bun dist/dev-tools.js monitor',
        'profile': 'bun dist/dev-tools.js profile',
        'leak-check': 'bun dist/dev-tools.js leak-check'
      },
      keywords: ['symindx', 'ai', 'agent', 'chatbot', config.personality],
      author: 'Your Name',
      license: 'MIT',
      dependencies: {
        '@symindx/mind-agents': '^1.0.0',
        chalk: '^5.3.0',
        dotenv: '^16.4.7'
      },
      devDependencies: {
        '@types/node': '^22.15.34',
        typescript: '^5.8.0',
        eslint: '^9.30.1',
        '@typescript-eslint/eslint-plugin': '^8.36.0',
        '@typescript-eslint/parser': '^8.36.0',
        prettier: '^3.6.2',
        jest: '^29.7.0',
        '@types/jest': '^30.0.0'
      },
      engines: {
        node: '>=18.0.0'
      }
    };

    // Add provider-specific dependencies
    switch (config.aiProvider) {
      case 'openai':
        packageJson.dependencies['@ai-sdk/openai'] = '^1.3.23';
        break;
      case 'anthropic':
        packageJson.dependencies['@ai-sdk/anthropic'] = '^1.2.12';
        break;
      case 'groq':
        packageJson.dependencies['@ai-sdk/groq'] = '^1.2.9';
        break;
      case 'google':
        packageJson.dependencies['@ai-sdk/google'] = '^1.2.22';
        break;
      case 'ollama':
        packageJson.dependencies['ollama'] = '^0.5.0';
        break;
    }

    // Add memory provider dependencies
    switch (config.memoryProvider) {
      case 'postgres':
        packageJson.dependencies['pg'] = '^8.16.0';
        packageJson.devDependencies['@types/pg'] = '^8.11.0';
        break;
      case 'supabase':
        packageJson.dependencies['@supabase/supabase-js'] = '^2.49.10';
        break;
      case 'neon':
        packageJson.dependencies['@neondatabase/serverless'] = '^1.0.0';
        break;
    }

    // Add extension dependencies
    if (config.extensions.includes('api')) {
      packageJson.dependencies['express'] = '^5.0.1';
      packageJson.dependencies['cors'] = '^2.8.5';
      packageJson.dependencies['ws'] = '^8.18.2';
      packageJson.devDependencies['@types/express'] = '^5.0.0';
      packageJson.devDependencies['@types/cors'] = '^2.8.19';
      packageJson.devDependencies['@types/ws'] = '^8.5.15';
    }

    if (config.extensions.includes('telegram')) {
      packageJson.dependencies['telegraf'] = '^4.16.3';
    }

    if (config.extensions.includes('discord')) {
      packageJson.dependencies['discord.js'] = '^14.14.1';
    }

    await fs.writeJson(path.join(config.directory, 'package.json'), packageJson, { spaces: 2 });
  }

  private async createTsConfig(config: ProjectConfig): Promise<void> {
    const tsConfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'node',
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        sourceMap: true,
        resolveJsonModule: true,
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        baseUrl: '.',
        paths: {
          '@/*': ['src/*'],
          '@config/*': ['src/config/*'],
          '@utils/*': ['src/utils/*']
        }
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist', '**/*.test.ts']
    };

    await fs.writeJson(path.join(config.directory, 'tsconfig.json'), tsConfig, { spaces: 2 });
  }

  private async createMainFile(config: ProjectConfig): Promise<void> {
    const hasApiExtension = config.extensions.includes('api');
    
    const mainContent = `#!/usr/bin/env node

/**
 * ${config.name} - SYMindX AI Agent
 * Generated by create-symindx
 */

import { SYMindXRuntime } from '@symindx/mind-agents';
import { config } from './config/agent.js';
import chalk from 'chalk';
import 'dotenv/config';${hasApiExtension ? '\nimport { ApiServer } from \'./api/server.js\';' : ''}

async function main() {
  console.log(chalk.cyan('🚀 Starting ${config.name}...'));
  
  try {
    // Initialize the SYMindX runtime
    const runtime = new SYMindXRuntime();
    await runtime.initialize();
    
    // Create and start the agent
    const agent = await runtime.createAgent(config);
    await agent.start();
    
    console.log(chalk.green(\`✅ Agent '\${agent.name}' is now running!\`));
    console.log(chalk.gray(\`   Agent ID: \${agent.id}\`));
    console.log(chalk.gray(\`   Personality: \${config.core.personality.join(', ')}\`));
    console.log(chalk.gray(\`   Extensions: \${config.modules.extensions.join(', ') || 'none'}\`));${hasApiExtension ? `
    
    // Start API server if enabled
    if (config.modules.extensions.includes('api')) {
      const apiServer = new ApiServer(agent, {
        port: parseInt(process.env.API_PORT || '8000'),
        host: process.env.API_HOST || 'localhost',
        enableDashboard: true,
        enableWebSocket: true
      });
      
      await apiServer.start();
      console.log(chalk.blue(\`🌐 Web dashboard: \${apiServer.getUrl()}\`));
    }` : ''}
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\\n🛑 Shutting down gracefully...'));
      await agent.stop();
      await runtime.shutdown();
      console.log(chalk.green('✅ Agent stopped successfully'));
      process.exit(0);
    });
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to start agent:'), error);
    process.exit(1);
  }
}

// Start the agent
main().catch(console.error);
`;

    await fs.writeFile(path.join(config.directory, 'src', 'index.ts'), mainContent);
  }

  private async createProjectStructure(config: ProjectConfig): Promise<void> {
    const directories = [
      'src',
      'src/config',
      'src/utils',
      'src/types',
      'tests'
    ];

    // Add extension-specific directories
    if (config.extensions.includes('api')) {
      directories.push('src/api', 'src/api/routes', 'src/api/middleware', 'templates');
    }

    for (const dir of directories) {
      await fs.ensureDir(path.join(config.directory, dir));
    }
  }

  private async createTemplateFiles(config: ProjectConfig): Promise<void> {
    // Create template-specific files based on the selected template
    switch (config.template) {
      case 'basic':
        await this.createBasicTemplate(config);
        break;
      case 'gaming':
        await this.createGamingTemplate(config);
        break;
      case 'social':
        await this.createSocialTemplate(config);
        break;
      case 'enterprise':
        await this.createEnterpriseTemplate(config);
        break;
      case 'research':
        await this.createResearchTemplate(config);
        break;
    }

    // Create extension-specific files
    if (config.extensions.includes('api')) {
      await this.createApiExtensionFiles(config);
    }

    // Create development tools
    await this.createDevelopmentTools(config);
  }

  private async createBasicTemplate(config: ProjectConfig): Promise<void> {
    // Basic template files - simple chatbot setup
    const utilsContent = `/**
 * Utility functions for ${config.name}
 */

export function formatMessage(message: string, sender: string): string {
  const timestamp = new Date().toLocaleTimeString();
  return \`[\${timestamp}] \${sender}: \${message}\`;
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
`;

    await fs.writeFile(path.join(config.directory, 'src', 'utils', 'helpers.ts'), utilsContent);
  }

  private async createGamingTemplate(config: ProjectConfig): Promise<void> {
    // Gaming template - RuneScape bot specific files
    const gameUtilsContent = `/**
 * Gaming utilities for RuneScape bot
 */

export interface GameAction {
  type: 'move' | 'click' | 'type' | 'wait';
  target?: string;
  coordinates?: { x: number; y: number };
  text?: string;
  duration?: number;
}

export interface GameState {
  playerLevel: number;
  currentActivity: string;
  inventory: string[];
  location: string;
  health: number;
  energy: number;
}

export class GameBot {
  private state: GameState;
  
  constructor() {
    this.state = {
      playerLevel: 1,
      currentActivity: 'idle',
      inventory: [],
      location: 'lumbridge',
      health: 100,
      energy: 100
    };
  }
  
  async executeAction(action: GameAction): Promise<void> {
    console.log(\`Executing action: \${action.type}\`);
    // Implementation would connect to RuneLite plugin
  }
  
  getState(): GameState {
    return { ...this.state };
  }
}
`;

    await fs.writeFile(path.join(config.directory, 'src', 'utils', 'game-bot.ts'), gameUtilsContent);
  }

  private async createSocialTemplate(config: ProjectConfig): Promise<void> {
    // Social template - multi-platform social media bot
    const socialUtilsContent = `/**
 * Social media utilities
 */

export interface SocialPost {
  platform: 'twitter' | 'telegram' | 'discord';
  content: string;
  mediaUrls?: string[];
  scheduledTime?: Date;
  hashtags?: string[];
}

export interface SocialMetrics {
  likes: number;
  shares: number;
  comments: number;
  reach: number;
}

export class SocialManager {
  async createPost(post: SocialPost): Promise<string> {
    console.log(\`Creating post on \${post.platform}: \${post.content}\`);
    // Implementation would connect to social media APIs
    return 'post-id-' + Date.now();
  }
  
  async getMetrics(postId: string): Promise<SocialMetrics> {
    // Implementation would fetch real metrics
    return {
      likes: Math.floor(Math.random() * 100),
      shares: Math.floor(Math.random() * 50),
      comments: Math.floor(Math.random() * 25),
      reach: Math.floor(Math.random() * 1000)
    };
  }
}
`;

    await fs.writeFile(path.join(config.directory, 'src', 'utils', 'social-manager.ts'), socialUtilsContent);
  }

  private async createEnterpriseTemplate(config: ProjectConfig): Promise<void> {
    // Enterprise template - business automation with security
    const enterpriseUtilsContent = `/**
 * Enterprise utilities with security features
 */

export interface SecurityConfig {
  enableEncryption: boolean;
  requireAuthentication: boolean;
  allowedIPs: string[];
  rateLimits: {
    requests: number;
    windowMs: number;
  };
}

export interface BusinessProcess {
  id: string;
  name: string;
  steps: ProcessStep[];
  approvalRequired: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProcessStep {
  id: string;
  name: string;
  type: 'automated' | 'manual' | 'approval';
  timeout: number;
  retryCount: number;
}

export class EnterpriseAgent {
  private securityConfig: SecurityConfig;
  
  constructor(securityConfig: SecurityConfig) {
    this.securityConfig = securityConfig;
  }
  
  async executeProcess(process: BusinessProcess): Promise<void> {
    console.log(\`Executing business process: \${process.name}\`);
    // Implementation would handle enterprise workflows
  }
  
  validateSecurity(request: any): boolean {
    // Implementation would validate security requirements
    return true;
  }
}
`;

    await fs.writeFile(path.join(config.directory, 'src', 'utils', 'enterprise-agent.ts'), enterpriseUtilsContent);
  }

  private async createResearchTemplate(config: ProjectConfig): Promise<void> {
    // Research template - advanced cognition and learning
    const researchUtilsContent = `/**
 * Research utilities for advanced AI capabilities
 */

export interface ResearchPaper {
  title: string;
  authors: string[];
  abstract: string;
  keywords: string[];
  publishedDate: Date;
  citations: number;
  url: string;
}

export interface LearningMetrics {
  knowledgeGained: number;
  conceptsLearned: string[];
  confidenceScore: number;
  learningRate: number;
}

export class ResearchAgent {
  private knowledgeBase: Map<string, any> = new Map();
  
  async searchPapers(query: string): Promise<ResearchPaper[]> {
    console.log(\`Searching for papers: \${query}\`);
    // Implementation would connect to research databases
    return [];
  }
  
  async analyzeContent(content: string): Promise<LearningMetrics> {
    console.log(\`Analyzing content for learning opportunities\`);
    // Implementation would use advanced NLP and learning algorithms
    return {
      knowledgeGained: Math.random(),
      conceptsLearned: ['concept1', 'concept2'],
      confidenceScore: Math.random(),
      learningRate: Math.random()
    };
  }
  
  async updateKnowledge(key: string, value: any): Promise<void> {
    this.knowledgeBase.set(key, value);
    console.log(\`Knowledge updated: \${key}\`);
  }
}
`;

    await fs.writeFile(path.join(config.directory, 'src', 'utils', 'research-agent.ts'), researchUtilsContent);
  }

  private async createApiExtensionFiles(config: ProjectConfig): Promise<void> {
    // Copy API server template
    const apiServerTemplate = path.join(__dirname, '..', 'templates', 'api-server.ts');
    const apiServerContent = await fs.readFile(apiServerTemplate, 'utf-8');
    await fs.writeFile(path.join(config.directory, 'src', 'api', 'server.ts'), apiServerContent);

    // Copy dashboard template
    const dashboardTemplate = path.join(__dirname, '..', 'templates', 'dashboard.html');
    const dashboardContent = await fs.readFile(dashboardTemplate, 'utf-8');
    await fs.writeFile(path.join(config.directory, 'templates', 'dashboard.html'), dashboardContent);

    // Create API routes
    const routesContent = `/**
 * API Routes for ${config.name}
 */

import { Router } from 'express';

const router = Router();

// Custom routes can be added here
router.get('/custom', (req, res) => {
  res.json({ message: 'Custom endpoint for ${config.name}' });
});

export default router;
`;

    await fs.writeFile(path.join(config.directory, 'src', 'api', 'routes', 'index.ts'), routesContent);

    // Create middleware
    const middlewareContent = `/**
 * Custom middleware for ${config.name}
 */

import { Request, Response, NextFunction } from 'express';

export function customMiddleware(req: Request, res: Response, next: NextFunction) {
  // Add custom middleware logic here
  console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.path}\`);
  next();
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('API Error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
`;

    await fs.writeFile(path.join(config.directory, 'src', 'api', 'middleware', 'index.ts'), middlewareContent);
  }

  private async createDevelopmentTools(config: ProjectConfig): Promise<void> {
    // Copy TypeScript definitions
    const typesTemplate = path.join(__dirname, '..', 'templates', 'types.ts');
    const typesContent = await fs.readFile(typesTemplate, 'utf-8');
    await fs.writeFile(path.join(config.directory, 'src', 'types', 'index.ts'), typesContent);

    // Copy debug tools
    const debugTemplate = path.join(__dirname, '..', 'templates', 'debug-tools.ts');
    const debugContent = await fs.readFile(debugTemplate, 'utf-8');
    await fs.writeFile(path.join(config.directory, 'src', 'utils', 'debug-tools.ts'), debugContent);

    // Copy performance monitor
    const perfTemplate = path.join(__dirname, '..', 'templates', 'performance-monitor.ts');
    const perfContent = await fs.readFile(perfTemplate, 'utf-8');
    await fs.writeFile(path.join(config.directory, 'src', 'utils', 'performance-monitor.ts'), perfContent);

    // Create development scripts
    const devScriptContent = `#!/usr/bin/env node

/**
 * Development utilities for ${config.name}
 */

import { Agent } from '../types/index.js';
import { AgentDebugger, DebugCLI } from '../utils/debug-tools.js';
import { PerformanceMonitor, MemoryLeakDetector } from '../utils/performance-monitor.js';
import chalk from 'chalk';

// This would be imported from your main agent instance
// For now, it's a placeholder
let agent: Agent;

const command = process.argv[2];

switch (command) {
  case 'debug':
    console.log(chalk.cyan('🔍 Starting debug CLI...'));
    const debugCLI = new DebugCLI(agent);
    debugCLI.start();
    break;

  case 'monitor':
    console.log(chalk.cyan('📊 Starting performance monitor...'));
    const monitor = new PerformanceMonitor(agent);
    monitor.start();
    
    // Keep process alive
    process.on('SIGINT', () => {
      monitor.stop();
      process.exit(0);
    });
    break;

  case 'leak-check':
    console.log(chalk.cyan('🔍 Starting memory leak detection...'));
    const leakDetector = new MemoryLeakDetector();
    leakDetector.start();
    
    process.on('SIGINT', () => {
      leakDetector.stop();
      process.exit(0);
    });
    break;

  case 'profile':
    console.log(chalk.cyan('⚡ Starting performance profiling...'));
    const profiler = new PerformanceMonitor(agent, {
      enableCPUProfiling: true,
      enableMemoryProfiling: true,
      sampleInterval: 500
    });
    profiler.start();
    
    // Generate report after 30 seconds
    setTimeout(() => {
      console.log('\\n📊 Performance Report:');
      console.log(profiler.generateReport());
      profiler.stop();
      process.exit(0);
    }, 30000);
    break;

  default:
    console.log(chalk.cyan('🛠️  ${config.name} Development Tools\\n'));
    console.log('Available commands:');
    console.log('  debug      - Start interactive debugger');
    console.log('  monitor    - Start performance monitoring');
    console.log('  leak-check - Start memory leak detection');
    console.log('  profile    - Run 30-second performance profile');
    console.log('\\nUsage: bun run dev-tools <command>');
}
`;

    await fs.writeFile(path.join(config.directory, 'src', 'dev-tools.ts'), devScriptContent);

    // Create VSCode configuration for debugging
    await fs.ensureDir(path.join(config.directory, '.vscode'));
    
    const launchConfig = {
      version: '0.2.0',
      configurations: [
        {
          name: 'Debug Agent',
          type: 'node',
          request: 'launch',
          program: '${workspaceFolder}/dist/index.js',
          outFiles: ['${workspaceFolder}/dist/**/*.js'],
          env: {
            NODE_ENV: 'development'
          },
          console: 'integratedTerminal',
          restart: true,
          runtimeArgs: ['--enable-source-maps']
        },
        {
          name: 'Debug Tools',
          type: 'node',
          request: 'launch',
          program: '${workspaceFolder}/dist/dev-tools.js',
          args: ['debug'],
          outFiles: ['${workspaceFolder}/dist/**/*.js'],
          console: 'integratedTerminal'
        }
      ]
    };

    await fs.writeJson(path.join(config.directory, '.vscode', 'launch.json'), launchConfig, { spaces: 2 });

    const settingsConfig = {
      'typescript.preferences.importModuleSpecifier': 'relative',
      'typescript.suggest.autoImports': true,
      'editor.codeActionsOnSave': {
        'source.organizeImports': true,
        'source.fixAll.eslint': true
      },
      'files.associations': {
        '*.json': 'jsonc'
      }
    };

    await fs.writeJson(path.join(config.directory, '.vscode', 'settings.json'), settingsConfig, { spaces: 2 });
  }

  private async createCharacterConfig(config: ProjectConfig): Promise<void> {
    const spinner = ora('🤖 Creating character configuration...').start();

    try {
      const characterConfig = {
        id: config.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        name: config.name,
        type: 'autonomous',
        enabled: true,
        core: {
          name: config.name,
          tone: this.getPersonalityTone(config.personality),
          personality: [config.personality],
          description: this.getPersonalityDescription(config.personality)
        },
        lore: {
          origin: `Created with create-symindx scaffolding tool`,
          motive: this.getPersonalityMotive(config.personality),
          background: `A ${config.personality} AI agent built with SYMindX framework`
        },
        psyche: {
          traits: [config.personality, 'helpful', 'intelligent'],
          defaults: {
            memory: config.memoryProvider,
            emotion: 'composite',
            cognition: 'unified'
          }
        },
        modules: {
          extensions: config.extensions,
          memory: {
            provider: config.memoryProvider,
            maxRecords: 10000,
            vectorSearch: config.memoryProvider === 'supabase',
            config: this.getMemoryConfig(config.memoryProvider)
          },
          emotion: {
            type: 'composite',
            sensitivity: 0.7,
            decayRate: 0.1,
            transitionSpeed: 0.5,
            primaryEmotion: this.getPersonalityEmotion(config.personality)
          },
          cognition: {
            type: 'unified',
            planningDepth: 5,
            memoryIntegration: true,
            creativityLevel: this.getPersonalityCreativity(config.personality),
            learningRate: 0.3
          },
          portals: {
            primary: config.aiProvider,
            fallback: ['openai', 'anthropic', 'groq'].filter(p => p !== config.aiProvider),
            config: this.getPortalConfig(config.aiProvider)
          }
        }
      };

      await fs.writeJson(
        path.join(config.directory, 'src', 'config', 'agent.json'),
        characterConfig,
        { spaces: 2 }
      );

      // Create TypeScript config file
      const configTsContent = `/**
 * Agent configuration for ${config.name}
 */

import agentConfig from './agent.json';
import type { AgentConfig } from '@symindx/mind-agents';

export const config: AgentConfig = agentConfig as AgentConfig;

export default config;
`;

      await fs.writeFile(
        path.join(config.directory, 'src', 'config', 'agent.ts'),
        configTsContent
      );

      spinner.succeed('Character configuration created');
    } catch (error) {
      spinner.fail('Failed to create character configuration');
      throw error;
    }
  }

  private async setupEnvironmentFiles(config: ProjectConfig): Promise<void> {
    if (!config.setupEnvironment) return;

    const spinner = ora('🔧 Setting up environment configuration...').start();

    try {
      // Create .env.example
      const envExample = this.generateEnvExample(config);
      await fs.writeFile(path.join(config.directory, '.env.example'), envExample);

      // Create .env with placeholder values
      const envContent = this.generateEnvContent(config);
      await fs.writeFile(path.join(config.directory, '.env'), envContent);

      // Create .gitignore
      const gitignoreContent = `# Dependencies
node_modules/
bun.lockb
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment variables
.env
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Runtime
*.pid
*.seed
*.pid.lock

# Coverage
coverage/
.nyc_output/

# SYMindX specific
.symindx/
agent-data/
memory.db*
`;

      await fs.writeFile(path.join(config.directory, '.gitignore'), gitignoreContent);

      // Create README.md
      const readmeContent = this.generateReadme(config);
      await fs.writeFile(path.join(config.directory, 'README.md'), readmeContent);

      spinner.succeed('Environment configuration created');
    } catch (error) {
      spinner.fail('Failed to setup environment files');
      throw error;
    }
  }

  private generateEnvExample(config: ProjectConfig): string {
    let envContent = `# ${config.name} Environment Configuration
# Copy this file to .env and fill in your actual values

# AI Provider Configuration
`;

    switch (config.aiProvider) {
      case 'openai':
        envContent += `OPENAI_API_KEY=your_openai_api_key_here\n`;
        break;
      case 'anthropic':
        envContent += `ANTHROPIC_API_KEY=your_anthropic_api_key_here\n`;
        break;
      case 'groq':
        envContent += `GROQ_API_KEY=your_groq_api_key_here\n`;
        break;
      case 'google':
        envContent += `GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here\n`;
        break;
      case 'ollama':
        envContent += `OLLAMA_BASE_URL=http://localhost:11434\n`;
        break;
    }

    envContent += `\n# Memory Provider Configuration\n`;
    switch (config.memoryProvider) {
      case 'postgres':
        envContent += `DATABASE_URL=postgresql://username:password@localhost:5432/symindx\n`;
        break;
      case 'supabase':
        envContent += `SUPABASE_URL=your_supabase_project_url\nSUPABASE_ANON_KEY=your_supabase_anon_key\n`;
        break;
      case 'neon':
        envContent += `DATABASE_URL=your_neon_database_url\n`;
        break;
      case 'sqlite':
        envContent += `SQLITE_PATH=./data/memory.db\n`;
        break;
    }

    if (config.extensions.includes('api')) {
      envContent += `\n# API Server Configuration\nAPI_PORT=8000\nAPI_HOST=localhost\nJWT_SECRET=your_jwt_secret_here\n`;
    }

    if (config.extensions.includes('telegram')) {
      envContent += `\n# Telegram Bot Configuration\nTELEGRAM_BOT_TOKEN=your_telegram_bot_token\n`;
    }

    if (config.extensions.includes('discord')) {
      envContent += `\n# Discord Bot Configuration\nDISCORD_BOT_TOKEN=your_discord_bot_token\n`;
    }

    envContent += `\n# General Configuration\nNODE_ENV=development\nLOG_LEVEL=info\nAGENT_NAME=${config.name}\n`;

    return envContent;
  }

  private generateEnvContent(config: ProjectConfig): string {
    return this.generateEnvExample(config).replace(/your_\w+_here/g, 'REPLACE_ME');
  }

  private generateReadme(config: ProjectConfig): string {
    return `# ${config.name}

A SYMindX AI agent with ${config.personality} personality, created with \`create-symindx\`.

## Features

- 🤖 **Personality**: ${config.personality} - ${this.getPersonalityDescription(config.personality)}
- 🧠 **AI Provider**: ${config.aiProvider}
- 💾 **Memory**: ${config.memoryProvider}
- 🔌 **Extensions**: ${config.extensions.join(', ') || 'none'}

## Quick Start

1. **Install dependencies:**
   \`\`\`bash
   npm install
   # or
   bun install
   \`\`\`

2. **Configure environment:**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   \`\`\`

3. **Build and run:**
   \`\`\`bash
   npm run build
   npm start
   # or for development
   npm run dev
   \`\`\`

## Configuration

Your agent configuration is in \`src/config/agent.json\`. You can customize:

- Personality traits and behavior
- Memory settings and providers
- AI model preferences
- Extension configurations

## Development

- \`npm run dev\` - Start in development mode with hot reload
- \`npm run build\` - Build the project
- \`npm run test\` - Run tests
- \`npm run lint\` - Lint code
- \`npm run format\` - Format code

## Extensions

${config.extensions.length > 0 ? 
  config.extensions.map(ext => `- **${ext}**: ${this.getExtensionDescription(ext)}`).join('\n') :
  'No extensions configured. You can add them later by modifying the agent configuration.'
}

## Environment Variables

See \`.env.example\` for all available configuration options.

## Learn More

- [SYMindX Documentation](https://github.com/symindx/symindx)
- [Agent Configuration Guide](https://docs.symindx.com/configuration)
- [Extension Development](https://docs.symindx.com/extensions)

## Support

If you need help, please:
1. Check the [documentation](https://docs.symindx.com)
2. Search [existing issues](https://github.com/symindx/symindx/issues)
3. Create a [new issue](https://github.com/symindx/symindx/issues/new)

---

Created with ❤️ using [create-symindx](https://www.npmjs.com/package/create-symindx)
`;
  }

  private async installDependencies(config: ProjectConfig, options: any): Promise<void> {
    if (options.install === false) {
      console.log(chalk.yellow('⏭️ Skipping dependency installation'));
      return;
    }

    const spinner = ora('📦 Installing dependencies...').start();

    try {
      const { spawn } = await import('child_process');
      
      // Detect package manager
      const packageManager = await this.detectPackageManager();
      
      await new Promise<void>((resolve, reject) => {
        const installProcess = spawn(packageManager, ['install'], {
          cwd: config.directory,
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

      spinner.succeed('Dependencies installed successfully');
    } catch (error) {
      spinner.fail('Failed to install dependencies');
      console.log(chalk.yellow('💡 You can install them manually with: npm install'));
    }
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

  private async initializeGit(config: ProjectConfig, options: any): Promise<void> {
    if (options.git === false) {
      console.log(chalk.yellow('⏭️ Skipping git initialization'));
      return;
    }

    const spinner = ora('🔧 Initializing git repository...').start();

    try {
      const { execSync } = await import('child_process');
      
      execSync('git init', { cwd: config.directory, stdio: 'ignore' });
      execSync('git add .', { cwd: config.directory, stdio: 'ignore' });
      execSync('git commit -m "Initial commit from create-symindx"', { 
        cwd: config.directory, 
        stdio: 'ignore' 
      });

      spinner.succeed('Git repository initialized');
    } catch (error) {
      spinner.fail('Failed to initialize git repository');
      console.log(chalk.yellow('💡 You can initialize git manually with: git init'));
    }
  }

  private async showSuccessMessage(config: ProjectConfig): Promise<void> {
    console.log('\n' + successGradient('🎉 Project created successfully! 🎉\n'));

    const successBox = boxen(
      [
        chalk.bold(`${config.name} is ready to go!`),
        '',
        chalk.gray('Next steps:'),
        chalk.cyan(`  cd ${config.name}`),
        chalk.cyan('  npm run dev'),
        '',
        chalk.gray('Your agent features:'),
        chalk.green(`  🤖 Personality: ${config.personality}`),
        chalk.green(`  🧠 AI Provider: ${config.aiProvider}`),
        chalk.green(`  💾 Memory: ${config.memoryProvider}`),
        chalk.green(`  🔌 Extensions: ${config.extensions.join(', ') || 'none'}`),
        '',
        chalk.gray('Documentation:'),
        chalk.blue('  https://docs.symindx.com'),
        '',
        chalk.yellow('⚠️  Don\'t forget to configure your .env file!')
      ].join('\n'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }
    );

    console.log(successBox);
    console.log(chalk.gray('\nHappy coding! 🚀\n'));
  }

  // Helper methods for personality-based configuration
  private getPersonalityTone(personality: string): string {
    const tones: Record<string, string> = {
      technical: 'professional',
      creative: 'enthusiastic',
      strategic: 'analytical',
      empathetic: 'caring',
      confident: 'assertive',
      curious: 'inquisitive'
    };
    return tones[personality] || 'professional';
  }

  private getPersonalityDescription(personality: string): string {
    const descriptions: Record<string, string> = {
      technical: 'Knowledgeable and precise, focused on accuracy and technical excellence',
      creative: 'Imaginative and expressive, bringing creativity to every interaction',
      strategic: 'Analytical and planning-focused, thinking several steps ahead',
      empathetic: 'Caring and supportive, understanding and responding to emotions',
      confident: 'Bold and decisive, taking charge and inspiring confidence',
      curious: 'Inquisitive and learning-focused, always asking questions and exploring'
    };
    return descriptions[personality] || 'A helpful AI assistant';
  }

  private getPersonalityMotive(personality: string): string {
    const motives: Record<string, string> = {
      technical: 'To provide accurate, technical solutions and share knowledge',
      creative: 'To inspire creativity and help bring imaginative ideas to life',
      strategic: 'To help plan, analyze, and achieve long-term goals',
      empathetic: 'To understand, support, and help others feel heard',
      confident: 'To lead, inspire confidence, and help others succeed',
      curious: 'To learn, explore, and help others discover new things'
    };
    return motives[personality] || 'To be helpful and assist users';
  }

  private getPersonalityEmotion(personality: string): string {
    const emotions: Record<string, string> = {
      technical: 'confident',
      creative: 'happy',
      strategic: 'confident',
      empathetic: 'neutral',
      confident: 'confident',
      curious: 'happy'
    };
    return emotions[personality] || 'neutral';
  }

  private getPersonalityCreativity(personality: string): number {
    const creativity: Record<string, number> = {
      technical: 0.3,
      creative: 0.9,
      strategic: 0.5,
      empathetic: 0.6,
      confident: 0.7,
      curious: 0.8
    };
    return creativity[personality] || 0.5;
  }

  private getMemoryConfig(provider: string): Record<string, any> {
    const configs: Record<string, Record<string, any>> = {
      sqlite: {
        path: './data/memory.db',
        enableWAL: true
      },
      postgres: {
        ssl: false,
        poolSize: 10
      },
      supabase: {
        enableRealtime: true,
        vectorDimensions: 1536
      },
      neon: {
        ssl: true,
        poolSize: 5
      }
    };
    return configs[provider] || {};
  }

  private getPortalConfig(provider: string): Record<string, any> {
    const configs: Record<string, Record<string, any>> = {
      openai: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000
      },
      anthropic: {
        model: 'claude-3-sonnet-20240229',
        temperature: 0.7,
        maxTokens: 2000
      },
      groq: {
        model: 'mixtral-8x7b-32768',
        temperature: 0.7,
        maxTokens: 2000
      },
      google: {
        model: 'gemini-pro',
        temperature: 0.7,
        maxTokens: 2000
      },
      ollama: {
        model: 'llama2',
        temperature: 0.7,
        baseURL: 'http://localhost:11434'
      }
    };
    return configs[provider] || {};
  }

  private getExtensionDescription(extension: string): string {
    const descriptions: Record<string, string> = {
      api: 'HTTP/WebSocket API server with web dashboard',
      telegram: 'Telegram bot integration for messaging',
      discord: 'Discord bot for server participation',
      runelite: 'RuneScape game integration via RuneLite',
      'mcp-server': 'Model Context Protocol server for tool integration'
    };
    return descriptions[extension] || 'Extension functionality';
  }
}

// Run the scaffolder
const scaffolder = new SYMindXScaffolder();
scaffolder.run().catch(console.error);