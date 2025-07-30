/**
 * Interactive Tutorial Manager
 * Orchestrates the tutorial experience with AI guidance
 */

import { EventEmitter } from 'events';
import { Tutorial, TutorialProgress, TutorialStep } from '../types/index.js';
import { TutorialEngine } from './tutorial-engine.js';
import { AITutor } from './ai-tutor.js';
import { OnboardingWizard } from './onboarding-wizard.js';

export class InteractiveTutorialManager extends EventEmitter {
  private engine: TutorialEngine;
  private aiTutor: AITutor;
  private onboardingWizard: OnboardingWizard;
  private currentTutorial?: Tutorial;
  private currentProgress?: TutorialProgress;
  private initialized = false;

  constructor() {
    super();
    this.engine = new TutorialEngine();
    this.aiTutor = new AITutor();
    this.onboardingWizard = new OnboardingWizard();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('📚 Initializing Interactive Tutorials...');

    await this.engine.initialize();
    await this.aiTutor.initialize();
    await this.loadBuiltInTutorials();

    this.setupEventHandlers();
    this.initialized = true;

    console.log('✅ Interactive Tutorials ready!');
  }

  private async loadBuiltInTutorials(): Promise<void> {
    // Load built-in tutorial templates
    const { getTutorialTemplates } = await import('./tutorial-templates.js');
    const templates = getTutorialTemplates();

    for (const template of templates) {
      await this.engine.registerTutorial(template);
    }
  }

  private setupEventHandlers(): void {
    this.engine.on('step-completed', (data) => {
      this.emit('step-completed', data);
      this.trackProgress(data.tutorialId, 'step-completed');
    });

    this.engine.on('tutorial-completed', (data) => {
      this.emit('tutorial-completed', data);
      this.trackProgress(data.tutorialId, 'tutorial-completed');
      this.showCompletionCelebration(data.tutorial);
    });

    this.engine.on('help-requested', async (data) => {
      const hint = await this.aiTutor.generateHint(data.step, data.userInput);
      this.engine.showHint(hint);
    });
  }

  // Main Tutorial Interface
  async startTutorial(tutorialId?: string): Promise<void> {
    if (!tutorialId) {
      return this.showTutorialMenu();
    }

    const tutorial = await this.engine.getTutorial(tutorialId);
    if (!tutorial) {
      throw new Error(`Tutorial not found: ${tutorialId}`);
    }

    this.currentTutorial = tutorial;
    this.currentProgress = {
      tutorialId,
      currentStep: 0,
      completedSteps: [],
      startedAt: new Date(),
      lastActivity: new Date(),
    };

    console.clear();
    this.showTutorialHeader(tutorial);
    await this.engine.startTutorial(tutorial, this.currentProgress);
  }

  async showTutorialMenu(): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    const tutorials = await this.engine.getAllTutorials();
    const categories = this.categorizeTutorials(tutorials);

    console.clear();
    console.log(chalk.default.cyan('🎓 SYMindX Interactive Tutorials\n'));

    const { category } = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'category',
        message: 'Choose a learning path:',
        choices: [
          {
            name: '🚀 Getting Started (Perfect for beginners)',
            value: 'beginner',
          },
          {
            name: '🏗️  Building Agents (Intermediate skills)',
            value: 'intermediate',
          },
          { name: '⚡ Advanced Patterns (Expert level)', value: 'advanced' },
          { name: '🎯 Quick Tutorials (5-10 minutes)', value: 'quick' },
          { name: '📖 View All Tutorials', value: 'all' },
        ],
      },
    ]);

    const filteredTutorials =
      category === 'all' ? tutorials : categories[category] || [];

    if (filteredTutorials.length === 0) {
      console.log(chalk.default.yellow('No tutorials found in this category.'));
      return;
    }

    const { tutorialId } = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'tutorialId',
        message: 'Select a tutorial:',
        choices: filteredTutorials.map((t) => ({
          name: `${this.getDifficultyEmoji(t.difficulty)} ${t.title} (${t.estimatedTime}min)`,
          value: t.id,
          short: t.title,
        })),
      },
    ]);

    await this.startTutorial(tutorialId);
  }

  async startOnboarding(): Promise<void> {
    console.clear();
    console.log("🎉 Welcome to SYMindX! Let's get you started...\n");

    await this.onboardingWizard.start();

    // After onboarding, suggest first tutorial
    const recommendedTutorial = await this.getRecommendedTutorial();
    if (recommendedTutorial) {
      const inquirer = await import('inquirer');
      const { startTutorial } = await inquirer.default.prompt([
        {
          type: 'confirm',
          name: 'startTutorial',
          message: `Would you like to start with "${recommendedTutorial.title}"?`,
          default: true,
        },
      ]);

      if (startTutorial) {
        await this.startTutorial(recommendedTutorial.id);
      }
    }
  }

  // AI-Powered Features
  async getPersonalizedRecommendations(): Promise<Tutorial[]> {
    const userProfile = await this.getUserProfile();
    const allTutorials = await this.engine.getAllTutorials();

    return this.aiTutor.recommendTutorials(allTutorials, userProfile);
  }

  async generateCustomTutorial(description: string): Promise<Tutorial> {
    return this.aiTutor.generateTutorial(description);
  }

  // Progress Tracking
  trackProgress(tutorialId: string, event: string): void {
    if (
      this.currentProgress &&
      this.currentProgress.tutorialId === tutorialId
    ) {
      this.currentProgress.lastActivity = new Date();

      if (event === 'step-completed') {
        const stepId = `step-${this.currentProgress.currentStep}`;
        if (!this.currentProgress.completedSteps.includes(stepId)) {
          this.currentProgress.completedSteps.push(stepId);
        }
        this.currentProgress.currentStep++;
      }

      if (event === 'tutorial-completed') {
        this.currentProgress.completed = new Date();
      }
    }

    this.emit('progress-updated', {
      tutorialId,
      event,
      progress: this.currentProgress,
    });
  }

  async getTutorialProgress(
    tutorialId: string
  ): Promise<TutorialProgress | null> {
    // In a real implementation, this would load from storage
    return this.currentProgress?.tutorialId === tutorialId
      ? this.currentProgress
      : null;
  }

  // Utility Methods
  private categorizeTutorials(
    tutorials: Tutorial[]
  ): Record<string, Tutorial[]> {
    const categories: Record<string, Tutorial[]> = {
      beginner: [],
      intermediate: [],
      advanced: [],
      quick: [],
    };

    tutorials.forEach((tutorial) => {
      categories[tutorial.difficulty].push(tutorial);

      if (tutorial.estimatedTime <= 10) {
        categories.quick.push(tutorial);
      }
    });

    return categories;
  }

  private getDifficultyEmoji(difficulty: string): string {
    const emojis = {
      beginner: '🟢',
      intermediate: '🟡',
      advanced: '🔴',
    };
    return emojis[difficulty as keyof typeof emojis] || '⚪';
  }

  private showTutorialHeader(tutorial: Tutorial): void {
    const chalk = require('chalk');

    console.log(chalk.cyan('═'.repeat(60)));
    console.log(chalk.cyan(`🎓 ${tutorial.title}`));
    console.log(chalk.gray(`   ${tutorial.description}`));
    console.log(
      chalk.gray(
        `   Difficulty: ${this.getDifficultyEmoji(tutorial.difficulty)} ${tutorial.difficulty}`
      )
    );
    console.log(
      chalk.gray(`   Estimated time: ${tutorial.estimatedTime} minutes`)
    );
    console.log(chalk.cyan('═'.repeat(60)));
    console.log();
  }

  private showCompletionCelebration(tutorial: Tutorial): void {
    const chalk = require('chalk');

    console.log(
      '\n' + chalk.green('🎉 Congratulations! Tutorial completed! 🎉')
    );
    console.log(chalk.yellow(`You've mastered: ${tutorial.title}`));

    if (tutorial.completionReward) {
      console.log(
        chalk.magenta(`🏆 Reward unlocked: ${tutorial.completionReward}`)
      );
    }

    console.log(
      chalk.gray('\nTip: Check out more tutorials to continue learning!')
    );
  }

  private async getRecommendedTutorial(): Promise<Tutorial | null> {
    const tutorials = await this.engine.getAllTutorials();
    return (
      tutorials.find((t) => t.difficulty === 'beginner') || tutorials[0] || null
    );
  }

  private async getUserProfile(): Promise<any> {
    // In a real implementation, this would load user preferences and history
    return {
      experience: 'beginner',
      interests: ['agents', 'ai', 'automation'],
      completedTutorials: [],
    };
  }

  // CLI Integration
  async showInteractiveMenu(): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    while (true) {
      console.clear();
      console.log(chalk.default.cyan('🎓 Interactive Tutorial System\n'));

      const { action } = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '🚀 Start Tutorial', value: 'start' },
            { name: '🎯 Browse Tutorials', value: 'browse' },
            { name: '📊 View Progress', value: 'progress' },
            { name: '🤖 Get AI Recommendations', value: 'recommendations' },
            { name: '✨ Generate Custom Tutorial', value: 'generate' },
            { name: '🎓 Start Onboarding', value: 'onboarding' },
            { name: '⬅️  Back to Main Menu', value: 'back' },
          ],
        },
      ]);

      switch (action) {
        case 'start':
          await this.startTutorial();
          break;
        case 'browse':
          await this.showTutorialMenu();
          break;
        case 'progress':
          await this.showProgressSummary();
          break;
        case 'recommendations':
          await this.showRecommendations();
          break;
        case 'generate':
          await this.showCustomTutorialGenerator();
          break;
        case 'onboarding':
          await this.startOnboarding();
          break;
        case 'back':
          return;
      }

      // Wait for user input before continuing
      await inquirer.default.prompt([
        {
          type: 'input',
          name: 'continue',
          message: chalk.default.gray('Press Enter to continue...'),
        },
      ]);
    }
  }

  private async showProgressSummary(): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan('📊 Your Learning Progress\n'));

    // In a real implementation, this would show actual progress
    console.log(chalk.default.green('✅ Completed Tutorials: 0'));
    console.log(chalk.default.yellow('⏳ In Progress: 0'));
    console.log(chalk.default.blue('🎯 Available: 12'));
    console.log(
      chalk.default.gray('\nComplete tutorials to see your progress here!')
    );
  }

  private async showRecommendations(): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan('🤖 AI-Powered Recommendations\n'));

    try {
      const recommendations = await this.getPersonalizedRecommendations();

      if (recommendations.length > 0) {
        console.log(
          chalk.default.green('Based on your profile, we recommend:')
        );
        recommendations.slice(0, 3).forEach((tutorial, index) => {
          console.log(
            `${index + 1}. ${tutorial.title} (${tutorial.estimatedTime}min)`
          );
          console.log(`   ${chalk.default.gray(tutorial.description)}`);
        });
      } else {
        console.log(
          chalk.default.yellow(
            'Complete a few tutorials to get personalized recommendations!'
          )
        );
      }
    } catch (error) {
      console.log(
        chalk.default.red('Unable to generate recommendations at this time.')
      );
    }
  }

  private async showCustomTutorialGenerator(): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan('✨ Custom Tutorial Generator\n'));

    const { description } = await inquirer.default.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Describe what you want to learn:',
        validate: (input) =>
          input.length > 10 || 'Please provide a more detailed description',
      },
    ]);

    console.log(chalk.default.yellow('🤖 Generating custom tutorial...'));

    try {
      const customTutorial = await this.generateCustomTutorial(description);
      console.log(
        chalk.default.green(`✅ Generated: "${customTutorial.title}"`)
      );

      const { startNow } = await inquirer.default.prompt([
        {
          type: 'confirm',
          name: 'startNow',
          message: 'Would you like to start this tutorial now?',
          default: true,
        },
      ]);

      if (startNow) {
        await this.engine.registerTutorial(customTutorial);
        await this.startTutorial(customTutorial.id);
      }
    } catch (error) {
      console.log(
        chalk.default.red(
          'Failed to generate custom tutorial. Please try again.'
        )
      );
    }
  }
}
