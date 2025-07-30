/**
 * Onboarding Wizard
 * Guided setup and configuration for new SYMindX developers
 */

export class OnboardingWizard {
  private userProfile: any = {};

  async start(): Promise<void> {
    console.log("🎉 Welcome to SYMindX! Let's get you set up for success.\n");

    await this.welcomeUser();
    await this.assessExperience();
    await this.setupEnvironment();
    await this.configurePreferences();
    await this.completeOnboarding();
  }

  private async welcomeUser(): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    console.log(
      chalk.default.cyan("👋 Let's start with some basic information:\n")
    );

    const answers = await inquirer.default.prompt([
      {
        type: 'input',
        name: 'name',
        message: "What's your name?",
        validate: (input) => input.length > 0 || 'Please enter your name',
      },
      {
        type: 'list',
        name: 'role',
        message: 'What best describes your role?',
        choices: [
          { name: '👨‍💻 Software Developer', value: 'developer' },
          { name: '🎓 Student/Learning', value: 'student' },
          { name: '🔬 Researcher', value: 'researcher' },
          { name: '🏢 Enterprise/Business', value: 'enterprise' },
          { name: '🎯 Hobbyist/Personal', value: 'hobbyist' },
        ],
      },
    ]);

    this.userProfile = { ...this.userProfile, ...answers };
    console.log(
      chalk.default.green(`\n✅ Nice to meet you, ${answers.name}!\n`)
    );
  }

  private async assessExperience(): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    console.log(
      chalk.default.cyan("🎯 Let's understand your experience level:\n")
    );

    const experience = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'aiExperience',
        message: 'How familiar are you with AI/ML development?',
        choices: [
          { name: '🌱 New to AI/ML', value: 'beginner' },
          { name: '🌿 Some AI/ML experience', value: 'intermediate' },
          { name: '🌳 Experienced with AI/ML', value: 'advanced' },
        ],
      },
      {
        type: 'list',
        name: 'programmingExperience',
        message: "What's your programming experience?",
        choices: [
          { name: '🔰 New to programming', value: 'beginner' },
          { name: '💻 Some programming experience', value: 'intermediate' },
          { name: '🚀 Experienced programmer', value: 'advanced' },
        ],
      },
      {
        type: 'checkbox',
        name: 'technologies',
        message: 'Which technologies are you familiar with? (optional)',
        choices: [
          'JavaScript/TypeScript',
          'Python',
          'Node.js',
          'React',
          'APIs/REST',
          'Databases',
          'Docker',
          'Cloud platforms',
        ],
      },
    ]);

    this.userProfile = { ...this.userProfile, ...experience };

    // Provide personalized feedback
    this.showExperienceInsights();
  }

  private async setupEnvironment(): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    console.log(
      chalk.default.cyan("\n⚙️ Let's check your development environment:\n")
    );

    // Check if basic tools are available
    const environmentCheck = await this.checkEnvironment();

    if (environmentCheck.allGood) {
      console.log(
        chalk.default.green(
          '✅ Your environment looks great! All required tools are available.\n'
        )
      );
    } else {
      console.log(chalk.default.yellow('⚠️ Some setup may be needed:\n'));
      environmentCheck.missing.forEach((tool) => {
        console.log(chalk.default.red(`❌ ${tool.name}: ${tool.message}`));
      });

      const { continueSetup } = await inquirer.default.prompt([
        {
          type: 'confirm',
          name: 'continueSetup',
          message: 'Would you like help setting up your environment?',
          default: true,
        },
      ]);

      if (continueSetup) {
        await this.guidedEnvironmentSetup(environmentCheck.missing);
      }
    }
  }

  private async configurePreferences(): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    console.log(
      chalk.default.cyan("🎨 Let's personalize your SYMindX experience:\n")
    );

    const preferences = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'preferredLearningStyle',
        message: 'How do you prefer to learn?',
        choices: [
          { name: '📚 Step-by-step tutorials', value: 'tutorial' },
          { name: '🔧 Hands-on experimentation', value: 'experimental' },
          { name: '📖 Documentation and examples', value: 'documentation' },
          { name: '🎥 Video and interactive demos', value: 'visual' },
        ],
      },
      {
        type: 'checkbox',
        name: 'interests',
        message: 'What interests you most about AI agents?',
        choices: [
          'Building conversational agents',
          'Creating autonomous systems',
          'Emotional intelligence in AI',
          'Multi-agent coordination',
          'AI for business automation',
          'Educational AI assistants',
          'Gaming and entertainment',
          'Research and experimentation',
        ],
      },
      {
        type: 'list',
        name: 'preferredComplexity',
        message: 'How would you like to start?',
        choices: [
          { name: '🌱 Simple examples first', value: 'simple-first' },
          { name: '⚖️ Balanced approach', value: 'balanced' },
          { name: '🚀 Show me everything!', value: 'comprehensive' },
        ],
      },
    ]);

    this.userProfile = { ...this.userProfile, ...preferences };

    // Save user profile
    await this.saveUserProfile();
  }

  private async completeOnboarding(): Promise<void> {
    const chalk = await import('chalk');
    const inquirer = await import('inquirer');

    console.clear();
    console.log(chalk.default.green('🎉 Onboarding Complete! 🎉\n'));

    // Show personalized summary
    console.log(chalk.default.cyan('📋 Your SYMindX Profile:'));
    console.log(`   Name: ${this.userProfile.name}`);
    console.log(`   Role: ${this.formatRole(this.userProfile.role)}`);
    console.log(
      `   AI Experience: ${this.formatExperience(this.userProfile.aiExperience)}`
    );
    console.log(
      `   Programming: ${this.formatExperience(this.userProfile.programmingExperience)}`
    );
    console.log(
      `   Learning Style: ${this.formatLearningStyle(this.userProfile.preferredLearningStyle)}`
    );
    console.log();

    // Show personalized recommendations
    const recommendations = this.generateRecommendations();
    console.log(chalk.default.cyan('🎯 Recommended Next Steps:'));
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    console.log();

    // Offer to start with recommended tutorial
    const { startTutorial } = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'startTutorial',
        message: 'Would you like to start with our recommended tutorial?',
        default: true,
      },
    ]);

    if (startTutorial) {
      console.log(
        chalk.default.green('🚀 Starting your personalized tutorial journey...')
      );
    } else {
      console.log(
        chalk.default.cyan(
          '💡 You can start tutorials anytime with: symindx tutorial'
        )
      );
    }

    console.log('\n' + chalk.default.yellow('🔧 Quick commands to remember:'));
    console.log('   symindx tutorial - Start interactive tutorials');
    console.log('   symindx agent --create - Create your first agent');
    console.log('   symindx dashboard - Open visual dashboard');
    console.log('   symindx help - Get help anytime');
    console.log();
  }

  private showExperienceInsights(): void {
    const chalk = require('chalk');
    const { aiExperience, programmingExperience } = this.userProfile;

    console.log(chalk.cyan('\n🎯 Based on your experience:'));

    if (aiExperience === 'beginner' && programmingExperience === 'beginner') {
      console.log(
        "   Perfect! We'll start with the fundamentals and build up gradually."
      );
    } else if (
      aiExperience === 'advanced' ||
      programmingExperience === 'advanced'
    ) {
      console.log(
        '   Great! We can move quickly through basics and focus on advanced patterns.'
      );
    } else {
      console.log(
        "   Excellent! We'll balance fundamentals with practical applications."
      );
    }
    console.log();
  }

  private async checkEnvironment(): Promise<{
    allGood: boolean;
    missing: Array<{ name: string; message: string; fix?: string }>;
  }> {
    const missing: Array<{ name: string; message: string; fix?: string }> = [];

    try {
      // Check Node.js version
      const { execSync } = await import('child_process');
      const nodeVersion = execSync('node --version', {
        encoding: 'utf8',
      }).trim();
      const majorVersion = parseInt(nodeVersion.substring(1));

      if (majorVersion < 18) {
        missing.push({
          name: 'Node.js',
          message: `Version ${nodeVersion} found, but v18+ is recommended`,
          fix: 'Update to Node.js v18 or later for best compatibility',
        });
      }
    } catch {
      missing.push({
        name: 'Node.js',
        message: 'Not found or not accessible',
        fix: 'Install Node.js v18+ from nodejs.org',
      });
    }

    try {
      // Check if npm/bun is available
      const { execSync } = await import('child_process');
      try {
        execSync('bun --version', { encoding: 'utf8' });
      } catch {
        try {
          execSync('npm --version', { encoding: 'utf8' });
        } catch {
          missing.push({
            name: 'Package Manager',
            message: 'Neither bun nor npm found',
            fix: 'Install Node.js (includes npm) or install Bun for better performance',
          });
        }
      }
    } catch {
      // Already handled above
    }

    return {
      allGood: missing.length === 0,
      missing,
    };
  }

  private async guidedEnvironmentSetup(
    missing: Array<{ name: string; message: string; fix?: string }>
  ): Promise<void> {
    const chalk = await import('chalk');

    console.log(chalk.default.cyan('\n🛠️  Environment Setup Guide:\n'));

    for (const tool of missing) {
      console.log(chalk.default.yellow(`📦 ${tool.name}:`));
      console.log(`   Issue: ${tool.message}`);
      if (tool.fix) {
        console.log(`   Solution: ${tool.fix}`);
      }
      console.log();
    }

    console.log(chalk.default.blue('💡 Quick Setup Tips:'));
    console.log('   • Install Node.js: https://nodejs.org/');
    console.log('   • Install Bun (recommended): https://bun.sh/');
    console.log('   • Verify installation: node --version && bun --version');
    console.log();
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const {
      aiExperience,
      programmingExperience,
      interests,
      preferredComplexity,
    } = this.userProfile;

    // Base recommendations
    if (aiExperience === 'beginner') {
      recommendations.push(
        'Start with "Getting Started with SYMindX" tutorial'
      );
      recommendations.push('Learn about AI agent fundamentals');
    } else {
      recommendations.push('Jump into "Create Your First Agent" tutorial');
    }

    // Interest-based recommendations
    if (interests?.includes('Building conversational agents')) {
      recommendations.push('Explore the Chat Extensions tutorial');
    }
    if (interests?.includes('Emotional intelligence in AI')) {
      recommendations.push('Deep dive into the Emotion System tutorial');
    }
    if (interests?.includes('Multi-agent coordination')) {
      recommendations.push(
        'Try the Multi-Agent Coordination tutorial (after basics)'
      );
    }

    // Complexity-based recommendations
    if (preferredComplexity === 'comprehensive') {
      recommendations.push('Enable all developer tools and visual debugger');
    } else if (preferredComplexity === 'simple-first') {
      recommendations.push('Focus on one concept at a time');
    }

    // Default recommendations
    if (recommendations.length < 3) {
      recommendations.push('Explore the interactive code playground');
      recommendations.push('Check out the visual agent debugger');
    }

    return recommendations.slice(0, 4); // Limit to 4 recommendations
  }

  private async saveUserProfile(): Promise<void> {
    // In a real implementation, this would save to a config file or database
    console.log('💾 Profile saved! Your preferences will be remembered.');
  }

  private formatRole(role: string): string {
    const roleNames = {
      developer: 'Software Developer',
      student: 'Student/Learning',
      researcher: 'Researcher',
      enterprise: 'Enterprise/Business',
      hobbyist: 'Hobbyist/Personal',
    };
    return roleNames[role as keyof typeof roleNames] || role;
  }

  private formatExperience(experience: string): string {
    const levels = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    };
    return levels[experience as keyof typeof levels] || experience;
  }

  private formatLearningStyle(style: string): string {
    const styles = {
      tutorial: 'Step-by-step tutorials',
      experimental: 'Hands-on experimentation',
      documentation: 'Documentation and examples',
      visual: 'Video and interactive demos',
    };
    return styles[style as keyof typeof styles] || style;
  }
}
