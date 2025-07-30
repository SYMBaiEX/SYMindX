/**
 * @module cli-ui
 * @description CLI UI Utilities - Beautiful terminal interface for SYMindX
 *
 * This module provides a comprehensive set of terminal UI utilities including:
 * - Beautiful ASCII banners and animations
 * - Colored text output with gradients
 * - Progress bars and spinners
 * - Tables for structured data display
 * - Chat message formatting
 * - Matrix rain animation effects
 * - System status dashboards
 */

import boxen from 'boxen';
import chalk from 'chalk';
import Table from 'cli-table3';
import figlet from 'figlet';
import gradient from 'gradient-string';
import ora from 'ora';

import { Extension } from '../types/agent';
import { AgentStatusArray } from '../types/utils/arrays.js';

type AgentStatus = AgentStatusArray[number];
import { TypedMap } from '../types/utils/maps.js';

// Extended agent status for CLI display
interface ExtendedAgentStatus extends AgentStatus {
  emotion?: {
    current: string;
    intensity: number;
  };
  portal?: {
    name: string;
  };
  extensions?: Extension[];
}

// Type definitions for this module
interface DashboardUpdateData {
  agents?: ExtendedAgentStatus[];
  metrics?: Partial<{
    uptime: number;
    memory: number;
    activeAgents: number;
    commandsProcessed: number;
    portalRequests: number;
  }>;
}

// Cool gradients
const symindxGradient = gradient(['#FF006E', '#8338EC', '#3A86FF']);
const neonGradient = gradient(['#00F5FF', '#FF00FF', '#FFFF00']);
const matrixGradient = gradient(['#00FF00', '#00CC00', '#009900']);
const fireGradient = gradient(['#FF6B6B', '#FFA500', '#FFD700']);

/**
 * Display the epic SYMindX banner with gradient colors
 *
 * @returns Promise that resolves when the banner is displayed
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
 * Create a cool spinner with custom text and animation type
 *
 * @param text - The text to display alongside the spinner
 * @param type - The type of spinner animation
 * @returns An Ora spinner instance
 */
export function createSpinner(
  text: string,
  type: 'dots' | 'line' | 'star' | 'bouncingBar' = 'dots'
): ReturnType<typeof ora> {
  // Check if we can safely use interactive spinners
  const canUseSpinner =
    process.stdout.isTTY &&
    process.stdin.isTTY &&
    !process.env['CI'] &&
    process.stdin.readable;

  const spinner = ora({
    text: chalk.cyan(text),
    spinner: type,
    color: 'cyan',
    // Disable spinner if we can't safely use TTY features
    isEnabled: canUseSpinner,
  });
  return spinner;
}

/**
 * Display agent status in a beautiful table format
 *
 * @param agents - Array of agent status objects to display
 */
export function displayAgentStatus(agents: ExtendedAgentStatus[]): void {
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
 * Get color for emotion display based on emotion type
 *
 * @param emotion - The emotion type string
 * @returns Chalk color function for the emotion
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
 * Display runtime metrics in a formatted box
 *
 * @param metrics - Object containing runtime metrics
 */
export function displayMetrics(metrics: Record<string, unknown>): void {
  const metricsBox = boxen(
    chalk.bold('Runtime Metrics\n\n') +
      `${chalk.green('▲')} Uptime: ${chalk.white(formatUptime(metrics.uptime as number))}\n` +
      `${chalk.blue('◆')} Memory: ${chalk.white(formatMemory(metrics.memory as number))}\n` +
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
 * Format uptime from milliseconds into human-readable format
 *
 * @param ms - Uptime in milliseconds
 * @returns Formatted uptime string (e.g., "2d 3h", "45m 30s")
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
 * Format memory usage from bytes to megabytes
 *
 * @param bytes - Memory usage in bytes
 * @returns Formatted memory string in MB
 */
function formatMemory(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Display an animated loading sequence with custom text
 *
 * @param text - The loading text to display
 * @param duration - Duration of the loading animation in milliseconds
 * @returns Promise that resolves when animation completes
 */
export async function animateLoading(
  text: string,
  duration: number = 2000
): Promise<void> {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  // Check if we can safely use interactive spinners
  const canUseSpinner =
    process.stdout.isTTY &&
    process.stdin.isTTY &&
    !process.env['CI'] &&
    process.stdin.readable;

  if (!canUseSpinner) {
    // Fallback to simple text output without spinner
    // eslint-disable-next-line no-console
    console.log(chalk.cyan(text));
    await new Promise((resolve) => setTimeout(resolve, duration));
    // eslint-disable-next-line no-console
    console.log(chalk.green(text + ' ✓'));
    return;
  }

  let spinner;
  try {
    spinner = ora({
      text: chalk.cyan(text),
      spinner: {
        interval: 80,
        frames,
      },
    });

    spinner.start();
    await new Promise((resolve) => setTimeout(resolve, duration));
    spinner.succeed(chalk.green(text + ' ✓'));
  } catch (error) {
    // Fallback if spinner fails (e.g., stdin issues)
    if (spinner) {
      try {
        spinner.stop();
      } catch {
        // Ignore cleanup errors
      }
    }
    // eslint-disable-next-line no-console
    console.log(chalk.cyan(text));
    await new Promise((resolve) => setTimeout(resolve, duration));
    // eslint-disable-next-line no-console
    console.log(chalk.green(text + ' ✓'));
  }
}

/**
 * Display error message in a styled box
 *
 * @param error - The error message to display
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
 * Display success message in a styled box
 *
 * @param message - The success message to display
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
 * Create an interactive progress bar that can be updated
 *
 * @param title - The title of the progress bar
 * @param total - The total value for 100% completion
 * @returns Object with update method to update progress
 */
export function createInteractiveProgressBar(
  title: string,
  total: number
): { update: (value: number) => void } {
  let current = 0;

  const update = (value: number): void => {
    current = value;
    const percentage = Math.floor((current / total) * 100);
    const filled = Math.floor((current / total) * 30);
    const empty = 30 - filled;

    const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    const text = `${title} [${bar}] ${percentage}%`;

    process.stdout.write('\r' + text);

    if (current >= total) {
      // eslint-disable-next-line no-console
      console.log(); // New line after completion
    }
  };

  return { update };
}

/**
 * Create a static string representation of a progress bar
 *
 * @param progress - Progress percentage (0-100)
 * @param width - Width of the progress bar (default: 30)
 * @param showPercentage - Whether to show percentage text (default: true)
 * @returns String representation of the progress bar
 */
export function createProgressBar(
  progress: number,
  width: number = 30,
  showPercentage: boolean = true
): string {
  const filled = Math.floor((progress / 100) * width);
  const empty = width - filled;

  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  const percentage = showPercentage ? ` ${progress}%` : '';

  return `[${bar}]${percentage}`;
}

// Legacy export - keeping original function name for backward compatibility
export { createInteractiveProgressBar as createProgressBarWithUpdate };

/**
 * Display a styled chat message with timestamp
 *
 * @param from - The sender's name
 * @param message - The message content
 * @param isAgent - Whether the message is from an agent (affects styling)
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
 * Display a Matrix-style rain animation
 *
 * @param duration - Duration of the animation in milliseconds
 * @returns Promise that resolves when animation completes
 */
export async function matrixRain(duration: number = 3000): Promise<void> {
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
        } catch {
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
 * Apply gradient to text with safe fallback
 *
 * @param text - The text to apply gradient to
 * @param gradientFn - The gradient function to use
 * @returns Gradient text or plain text as fallback
 */
function safeGradient(
  text: string | undefined,
  gradientFn: (text: string) => string
): string {
  if (!text || text.trim() === '') {
    return '';
  }

  try {
    return gradientFn(text);
  } catch {
    return text; // Fallback to plain text
  }
}

/**
 * Create a system status dashboard with live update capability
 *
 * @returns Dashboard object with update and render methods
 */
export function createStatusDashboard(): {
  agents: Map<string, unknown>;
  metrics: {
    uptime: number;
    memory: number;
    activeAgents: number;
    commandsProcessed: number;
    portalRequests: number;
  };
  update: (data: DashboardUpdateData) => void;
  render: () => void;
} {
  const dashboard = {
    agents: new Map(),
    metrics: {
      uptime: 0,
      memory: 0,
      activeAgents: 0,
      commandsProcessed: 0,
      portalRequests: 0,
    },

    update(data: DashboardUpdateData): void {
      if (data.agents) {
        data.agents.forEach((agent: AgentStatus) => {
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

      // eslint-disable-next-line no-console
      console.log(chalk.cyan.bold('\n📊 System Dashboard\n'));

      // Display metrics
      displayMetrics(this.metrics);
      // eslint-disable-next-line no-console
      console.log();

      // Display agents
      if (this.agents.size > 0) {
        // eslint-disable-next-line no-console
        console.log(chalk.cyan.bold('🤖 Active Agents\n'));
        displayAgentStatus(
          Array.from(this.agents.values()) as ExtendedAgentStatus[]
        );
      }
    },
  };

  return dashboard;
}

/**
 * Display a cool shutdown animation sequence
 *
 * @returns Promise that resolves when animation completes
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
