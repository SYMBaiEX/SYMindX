/**
 * Tutorial Engine
 * Core engine for executing interactive tutorials
 */

import { EventEmitter } from 'events';
import { Tutorial, TutorialStep, TutorialProgress } from '../types/index.js';

export class TutorialEngine extends EventEmitter {
  private tutorials = new Map<string, Tutorial>();
  private currentSession?: TutorialSession;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('⚙️  Initializing Tutorial Engine...');
    this.initialized = true;
  }

  async registerTutorial(tutorial: Tutorial): Promise<void> {
    this.tutorials.set(tutorial.id, tutorial);
    this.emit('tutorial-registered', tutorial);
  }

  async getTutorial(id: string): Promise<Tutorial | undefined> {
    return this.tutorials.get(id);
  }

  async getAllTutorials(): Promise<Tutorial[]> {
    return Array.from(this.tutorials.values());
  }

  async startTutorial(
    tutorial: Tutorial,
    progress: TutorialProgress
  ): Promise<void> {
    this.currentSession = new TutorialSession(tutorial, progress, this);
    await this.currentSession.start();
  }

  // Tutorial execution methods
  async executeStep(step: TutorialStep, userInput?: string): Promise<boolean> {
    if (!this.currentSession) {
      throw new Error('No active tutorial session');
    }

    return this.currentSession.executeStep(step, userInput);
  }

  showHint(hint: string): void {
    const chalk = require('chalk');
    console.log(chalk.yellow(`💡 Hint: ${hint}`));
  }

  showError(message: string): void {
    const chalk = require('chalk');
    console.log(chalk.red(`❌ ${message}`));
  }

  showSuccess(message: string): void {
    const chalk = require('chalk');
    console.log(chalk.green(`✅ ${message}`));
  }
}

/**
 * Individual tutorial session
 */
class TutorialSession {
  private tutorial: Tutorial;
  private progress: TutorialProgress;
  private engine: TutorialEngine;
  private playground: CodePlayground;

  constructor(
    tutorial: Tutorial,
    progress: TutorialProgress,
    engine: TutorialEngine
  ) {
    this.tutorial = tutorial;
    this.progress = progress;
    this.engine = engine;
    this.playground = new CodePlayground();
  }

  async start(): Promise<void> {
    console.log(`🚀 Starting tutorial: ${this.tutorial.title}\n`);

    // Start from current progress or beginning
    const startStep = this.progress.currentStep || 0;

    for (let i = startStep; i < this.tutorial.steps.length; i++) {
      const step = this.tutorial.steps[i];
      const success = await this.runStep(step, i + 1);

      if (!success) {
        console.log('Tutorial stopped by user.');
        return;
      }

      this.progress.currentStep = i + 1;
      this.engine.emit('step-completed', {
        tutorialId: this.tutorial.id,
        stepId: step.id,
        stepIndex: i,
      });
    }

    this.engine.emit('tutorial-completed', {
      tutorialId: this.tutorial.id,
      tutorial: this.tutorial,
      progress: this.progress,
    });
  }

  private async runStep(
    step: TutorialStep,
    stepNumber: number
  ): Promise<boolean> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    console.log(chalk.default.cyan(`\n📝 Step ${stepNumber}: ${step.title}`));
    console.log(chalk.default.gray(`   ${step.description}\n`));

    // Show AI explanation if available
    if (step.aiExplanation) {
      console.log(chalk.default.blue(`🤖 ${step.aiExplanation}\n`));
    }

    // Show code example if provided
    if (step.code) {
      console.log(chalk.default.gray('Example code:'));
      console.log(this.formatCode(step.code));
      console.log();
    }

    // Interactive step execution
    return this.executeInteractiveStep(step);
  }

  private async executeInteractiveStep(step: TutorialStep): Promise<boolean> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    while (true) {
      const { action } = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '✏️  Write code', value: 'write' },
            { name: '🚀 Run code', value: 'run' },
            { name: '💡 Get hint', value: 'hint' },
            { name: '✅ Mark as complete', value: 'complete' },
            { name: '⏭️  Skip step', value: 'skip' },
            { name: '❌ Exit tutorial', value: 'exit' },
          ],
        },
      ]);

      switch (action) {
        case 'write':
          await this.handleCodeWriting(step);
          break;

        case 'run':
          await this.handleCodeExecution(step);
          break;

        case 'hint':
          await this.handleHintRequest(step);
          break;

        case 'complete':
          const isValid = await this.validateStep(step);
          if (isValid) {
            console.log(chalk.default.green('🎉 Step completed successfully!'));
            return true;
          } else {
            console.log(
              chalk.default.yellow(
                'Not quite right. Try again or ask for a hint!'
              )
            );
          }
          break;

        case 'skip':
          const { confirmSkip } = await inquirer.default.prompt([
            {
              type: 'confirm',
              name: 'confirmSkip',
              message: 'Are you sure you want to skip this step?',
              default: false,
            },
          ]);
          if (confirmSkip) {
            console.log(chalk.default.yellow('⏭️  Step skipped'));
            return true;
          }
          break;

        case 'exit':
          return false;
      }
    }
  }

  private async handleCodeWriting(step: TutorialStep): Promise<void> {
    const inquirer = await import('inquirer');

    const { code } = await inquirer.default.prompt([
      {
        type: 'editor',
        name: 'code',
        message: 'Write your code (save and close to continue):',
        default: step.code || '// Write your code here\n',
      },
    ]);

    this.playground.setCode(code);
    console.log('Code saved to playground!');
  }

  private async handleCodeExecution(step: TutorialStep): Promise<void> {
    const chalk = await import('chalk');

    try {
      console.log(chalk.default.yellow('🔄 Running your code...'));
      const result = await this.playground.execute();

      console.log(chalk.default.green('📤 Output:'));
      console.log(result);

      // Compare with expected output if provided
      if (step.expected && result.trim() === step.expected.trim()) {
        console.log(chalk.default.green('✅ Output matches expected result!'));
      }
    } catch (error) {
      console.log(
        chalk.default.red(
          `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  private async handleHintRequest(step: TutorialStep): Promise<void> {
    if (step.hints && step.hints.length > 0) {
      const randomHint =
        step.hints[Math.floor(Math.random() * step.hints.length)];
      this.engine.showHint(randomHint);
    } else {
      this.engine.emit('help-requested', {
        step,
        userInput: this.playground.getCode(),
      });
    }
  }

  private async validateStep(step: TutorialStep): Promise<boolean> {
    if (step.validation) {
      const userCode = this.playground.getCode();
      return await step.validation(userCode);
    }

    // Default validation - just check if user has written something
    return this.playground.getCode().trim().length > 0;
  }

  async executeStep(step: TutorialStep, userInput?: string): Promise<boolean> {
    if (userInput) {
      this.playground.setCode(userInput);
    }

    return this.validateStep(step);
  }

  private formatCode(code: string): string {
    const chalk = require('chalk');
    return (
      chalk.default.gray('┌─────────────────────────────────────┐\n') +
      code
        .split('\n')
        .map((line) => chalk.default.gray('│ ') + line)
        .join('\n') +
      '\n' +
      chalk.default.gray('└─────────────────────────────────────┘')
    );
  }
}

/**
 * Simple code playground for tutorial exercises
 */
class CodePlayground {
  private code = '';
  private context: Record<string, any> = {};

  setCode(code: string): void {
    this.code = code;
  }

  getCode(): string {
    return this.code;
  }

  setContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context };
  }

  async execute(): Promise<string> {
    // In a real implementation, this would safely execute code
    // For now, return simulated output

    if (this.code.includes('console.log')) {
      // Extract console.log statements
      const matches = this.code.match(/console\.log\(['"`]([^'"`]+)['"`]\)/g);
      if (matches) {
        return matches
          .map((match) => {
            const content = match.match(/['"`]([^'"`]+)['"`]/);
            return content ? content[1] : '';
          })
          .join('\n');
      }
    }

    if (this.code.includes('createAgent')) {
      return 'Agent created successfully with ID: tutorial-agent-123';
    }

    if (this.code.includes('startAgent')) {
      return 'Agent started and ready to receive messages';
    }

    return 'Code executed successfully (simulated)';
  }

  reset(): void {
    this.code = '';
    this.context = {};
  }
}
