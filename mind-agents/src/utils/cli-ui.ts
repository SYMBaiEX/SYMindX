/**
 * CLI UI Utilities
 * Beautiful terminal interface for SYMindX
 */

import boxen from 'boxen';
import chalk from 'chalk';
import Table from 'cli-table3';
import figlet from 'figlet';
import gradient from 'gradient-string';
import ora from 'ora';

import { Extension } from '../types/agent';
import { AgentStatusArray } from '../types/utils/arrays.js';
import { TypedMap } from '../types/utils/maps.js';

// Cool gradients
const symindxGradient = gradient(['#FF006E', '#8338EC', '#3A86FF']);
const neonGradient = gradient(['#00F5FF', '#FF00FF', '#FFFF00']);
const matrixGradient = gradient(['#00FF00', '#00CC00', '#009900']);
const fireGradient = gradient(['#FF6B6B', '#FFA500', '#FFD700']);

/**
 * Display the epic SYMindX banner
 */
export async function displayBanner(): Promise<void> {
  // eslint-disable-next-line no-console
  console.clear();

  const banner = figlet.textSync('SYMindX', {
    font: 'ANSI Shadow',
    horizontalLayout: 'fitted',
    verticalLayout: 'default',
  });

  // eslint-disable-next-line no-console
  console.log(symindxGradient.multiline(banner));
  // eslint-disable-next-line no-console
  console.log();

  const subtitle = boxen(
    chalk.cyan.bold('Modular AI Agent Framework') +
      '\n' +
      chalk.gray('Version 1.0.0 | ' + new Date().toLocaleDateString()),
    {
      padding: 1,
      margin: 0,
      borderStyle: 'double',
      borderColor: 'cyan',
      textAlignment: 'center',
    }
  );

  // eslint-disable-next-line no-console
  console.log(subtitle);
  // eslint-disable-next-line no-console
  console.log();
}

/**
 * Create a cool spinner with custom text
 */
export function createSpinner(
  text: string,
  type: 'dots' | 'line' | 'star' | 'bouncingBar' = 'dots'
): ReturnType<typeof ora> {
  const spinner = ora({
    text: chalk.cyan(text),
    spinner: type,
    color: 'cyan',
  });
  return spinner;
}

/**
 * Display agent status in a beautiful table
 */
export function displayAgentStatus(agents: AgentStatusArray): void {
  const table = new Table({
    head: [
      chalk.cyan('Agent'),
      chalk.cyan('Status'),
      chalk.cyan('Emotion'),
      chalk.cyan('Portal'),
      chalk.cyan('Extensions'),
    ],
    style: {
      head: [],
      border: ['cyan'],
    },
    colWidths: [20, 15, 20, 20, 30],
  });

  agents.forEach((agent) => {
    const status =
      agent.status === 'active'
        ? chalk.green('● Active')
        : chalk.red('● Inactive');

    const emotion = `${agent.emotion?.current || 'neutral'} (${Math.round((agent.emotion?.intensity || 0) * 100)}%)`;
    const emotionColor = getEmotionColor(agent.emotion?.current || 'neutral');

    table.push([
      chalk.bold(agent.name),
      status,
      emotionColor(emotion),
      chalk.magenta(agent.portal?.name || 'None'),
      chalk.gray(
        agent.extensions?.map((e: Extension) => e.name).join(', ') || 'None'
      ),
    ]);
  });

  // eslint-disable-next-line no-console
  console.log(table.toString());
}

/**
 * Get color for emotion display
 */
function getEmotionColor(emotion: string): typeof chalk {
  const emotionColors: TypedMap<typeof chalk> = {
    happy: chalk.yellow,
    sad: chalk.blue,
    angry: chalk.red,
    anxious: chalk.magenta,
    confident: chalk.green,
    neutral: chalk.gray,
    curious: chalk.cyan,
    proud: chalk.yellowBright,
    confused: chalk.dim,
  };
  return emotionColors[emotion] || chalk.white;
}

/**
 * Display runtime metrics
 */
export function displayMetrics(metrics: Record<string, unknown>): void {
  const metricsBox = boxen(
    chalk.bold('Runtime Metrics\n\n') +
      `${chalk.green('▲')} Uptime: ${chalk.white(formatUptime(metrics.uptime))}\n` +
      `${chalk.blue('◆')} Memory: ${chalk.white(formatMemory(metrics.memory))}\n` +
      `${chalk.yellow('●')} Active Agents: ${chalk.white(metrics.activeAgents)}\n` +
      `${chalk.magenta('⚡')} Commands Processed: ${chalk.white(metrics.commandsProcessed)}\n` +
      `${chalk.cyan('🔮')} Portal Requests: ${chalk.white(metrics.portalRequests)}`,
    {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'green',
      dimBorder: false,
    }
  );

  // eslint-disable-next-line no-console
  console.log(metricsBox);
}

/**
 * Format uptime nicely
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Format memory usage
 */
function formatMemory(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Animated loading sequence
 */
export async function animateLoading(
  text: string,
  duration: number = 2000
): Promise<void> {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const spinner = ora({
    text: chalk.cyan(text),
    spinner: {
      interval: 80,
      frames,
    },
  }).start();

  await new Promise((resolve) => setTimeout(resolve, duration));
  spinner.succeed(chalk.green(text + ' ✓'));
}

/**
 * Display error in a cool way
 */
export function displayError(error: string): void {
  // eslint-disable-next-line no-console
  console.log(
    boxen(chalk.red.bold('⚠ ERROR ⚠\n\n') + chalk.white(error), {
      padding: 1,
      borderStyle: 'double',
      borderColor: 'red',
    })
  );
}

/**
 * Display success message
 */
export function displaySuccess(message: string): void {
  // eslint-disable-next-line no-console
  console.log(
    boxen(chalk.green.bold('✅ SUCCESS\n\n') + chalk.white(message), {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'green',
    })
  );
}

/**
 * Create a progress bar
 */
export function createProgressBar(title: string, total: number): { update: (value: number) => void } {
  let current = 0;

  const update = (value: number): void => {
    current = value;
    const percentage = Math.floor((current / total) * 100);
    const filled = Math.floor((current / total) * 30);
    const empty = 30 - filled;

    const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    const text = `${title} [${bar}] ${percentage}%`;

    // eslint-disable-next-line no-console
    process.stdout.write('\r' + text);

    if (current >= total) {
      // eslint-disable-next-line no-console
      console.log(); // New line after completion
    }
  };

  return { update };
}

/**
 * Display chat message with style
 */
export function displayChatMessage(
  from: string,
  message: string,
  isAgent: boolean = false
): void {
  const timestamp = new Date().toLocaleTimeString();

  if (isAgent) {
    // eslint-disable-next-line no-console
    console.log(
      chalk.gray(`[${timestamp}]`) +
        ' ' +
        neonGradient(from) +
        chalk.cyan(': ') +
        chalk.white(message)
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(
      chalk.gray(`[${timestamp}]`) +
        ' ' +
        chalk.yellow(from) +
        chalk.gray(': ') +
        chalk.white(message)
    );
  }
}

/**
 * Matrix-style animation
 */
export async function matrixRain(duration: number = 3000) {
  const columns = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;
  const drops: number[] = Array(Math.floor(columns / 2)).fill(0);

  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+-=[]{}|;:,.<>?';

  const interval = setInterval(() => {
    // eslint-disable-next-line no-console
    console.clear();

    for (let i = 0; i < drops.length; i++) {
      const x = i * 2;
      const y = drops[i];

      if (
        y !== undefined &&
        y < rows &&
        process.stdout.cursorTo &&
        process.stdout.write
      ) {
        try {
          const safeY = y ?? 0;
          process.stdout.cursorTo(x, safeY);
          const char = chars[Math.floor(Math.random() * chars.length)];
          const gradientChar = safeGradient(char, matrixGradient);
          if (process.stdout.write) {
            process.stdout.write(gradientChar);
          }
        } catch (error) {
          // Silently handle cursor positioning errors
        }
      }

      if (drops[i] !== undefined) {
        drops[i] = (drops[i] ?? 0) + 1;
        if ((drops[i] ?? 0) * Math.random() > rows) {
          drops[i] = 0;
        }
      }
    }
  }, 50);

  setTimeout(() => {
    clearInterval(interval);
    // eslint-disable-next-line no-console
    console.clear();
  }, duration);
}

/**
 * Safe gradient function with fallback
 */
function safeGradient(text: string | undefined, gradientFn: any): string {
  if (!text || text.trim() === '') {
    return '';
  }

  try {
    return gradientFn(text);
  } catch (error) {
    return text; // Fallback to plain text
  }
}

/**
 * Display system status with live updates
 */
export function createStatusDashboard() {
  const dashboard = {
    agents: new Map(),
    metrics: {
      uptime: 0,
      memory: 0,
      activeAgents: 0,
      commandsProcessed: 0,
      portalRequests: 0,
    },

    update(data: any) {
      if (data.agents) {
        data.agents.forEach((agent: any) => {
          this.agents.set(agent.id, agent);
        });
      }

      if (data.metrics) {
        Object.assign(this.metrics, data.metrics);
      }

      this.render();
    },

    render(): void {
      // eslint-disable-next-line no-console
    console.clear();
      displayBanner();

      console.log(chalk.cyan.bold('\n📊 System Dashboard\n'));

      // Display metrics
      displayMetrics(this.metrics);
      console.log();

      // Display agents
      if (this.agents.size > 0) {
        console.log(chalk.cyan.bold('🤖 Active Agents\n'));
        displayAgentStatus(Array.from(this.agents.values()));
      }
    },
  };

  return dashboard;
}

/**
 * Cool shutdown animation
 */
export async function animateShutdown(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log();
  const messages = [
    '🔌 Disconnecting neural networks...',
    '💾 Saving agent memories...',
    '🧠 Preserving cognitive states...',
    '🌐 Closing portal connections...',
    '✨ Shutting down gracefully...',
  ];

  for (const msg of messages) {
    await animateLoading(msg, 500);
  }

  // eslint-disable-next-line no-console
  console.log();
  // eslint-disable-next-line no-console
  console.log(
    fireGradient.multiline(figlet.textSync('Goodbye!', { font: 'Small' }))
  );
  // eslint-disable-next-line no-console
  console.log();
}
