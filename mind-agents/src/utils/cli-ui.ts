/**
 * CLI UI Utilities
 * Beautiful terminal interface for SYMindX
 */

import chalk from 'chalk'
import gradient from 'gradient-string'
import figlet from 'figlet'
import boxen from 'boxen'
import ora from 'ora'
import Table from 'cli-table3'
import { Extension } from '../types/agent.js'

// Cool gradients
const symindxGradient = gradient(['#FF006E', '#8338EC', '#3A86FF'])
const neonGradient = gradient(['#00F5FF', '#FF00FF', '#FFFF00'])
const matrixGradient = gradient(['#00FF00', '#00CC00', '#009900'])
const fireGradient = gradient(['#FF6B6B', '#FFA500', '#FFD700'])

/**
 * Display the epic SYMindX banner
 */
export async function displayBanner(): Promise<void> {
  console.clear()
  
  const banner = figlet.textSync('SYMindX', {
    font: 'ANSI Shadow',
    horizontalLayout: 'fitted',
    verticalLayout: 'default'
  })
  
  console.log(symindxGradient.multiline(banner))
  console.log()
  
  const subtitle = boxen(
    chalk.cyan.bold('Modular AI Agent Framework') + '\n' +
    chalk.gray('Version 1.0.0 | ' + new Date().toLocaleDateString()),
    {
      padding: 1,
      margin: 0,
      borderStyle: 'double',
      borderColor: 'cyan',
      textAlignment: 'center'
    }
  )
  
  console.log(subtitle)
  console.log()
}

/**
 * Create a cool spinner with custom text
 */
export function createSpinner(text: string, type: 'dots' | 'line' | 'star' | 'bouncingBar' = 'dots') {
  const spinner = ora({
    text: chalk.cyan(text),
    spinner: type,
    color: 'cyan'
  })
  return spinner
}

/**
 * Display agent status in a beautiful table
 */
export function displayAgentStatus(agents: any[]) {
  const table = new Table({
    head: [
      chalk.cyan('Agent'),
      chalk.cyan('Status'),
      chalk.cyan('Emotion'),
      chalk.cyan('Portal'),
      chalk.cyan('Extensions')
    ],
    style: {
      head: [],
      border: ['cyan']
    },
    colWidths: [20, 15, 20, 20, 30]
  })

  agents.forEach(agent => {
    const status = agent.status === 'active' 
      ? chalk.green('● Active') 
      : chalk.red('● Inactive')
    
    const emotion = `${agent.emotion?.current || 'neutral'} (${Math.round((agent.emotion?.intensity || 0) * 100)}%)`
    const emotionColor = getEmotionColor(agent.emotion?.current || 'neutral')
    
    table.push([
      chalk.bold(agent.name),
      status,
      emotionColor(emotion),
      chalk.magenta(agent.portal?.name || 'None'),
      chalk.gray(agent.extensions?.map((e: Extension) => e.name).join(', ') || 'None')
    ])
  })

  console.log(table.toString())
}

/**
 * Get color for emotion display
 */
function getEmotionColor(emotion: string) {
  const emotionColors: Record<string, any> = {
    happy: chalk.yellow,
    sad: chalk.blue,
    angry: chalk.red,
    anxious: chalk.magenta,
    confident: chalk.green,
    neutral: chalk.gray,
    curious: chalk.cyan,
    proud: chalk.yellowBright,
    confused: chalk.dim
  }
  return emotionColors[emotion] || chalk.white
}

/**
 * Display runtime metrics
 */
export function displayMetrics(metrics: any) {
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
      dimBorder: false
    }
  )
  
  console.log(metricsBox)
}

/**
 * Format uptime nicely
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

/**
 * Format memory usage
 */
function formatMemory(bytes: number): string {
  const mb = bytes / 1024 / 1024
  return `${mb.toFixed(2)} MB`
}

/**
 * Animated loading sequence
 */
export async function animateLoading(text: string, duration: number = 2000): Promise<void> {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  const spinner = ora({
    text: chalk.cyan(text),
    spinner: {
      interval: 80,
      frames
    }
  }).start()

  await new Promise(resolve => setTimeout(resolve, duration))
  spinner.succeed(chalk.green(text + ' ✓'))
}

/**
 * Display error in a cool way
 */
export function displayError(error: string) {
  console.log(
    boxen(
      chalk.red.bold('⚠ ERROR ⚠\n\n') + chalk.white(error),
      {
        padding: 1,
        borderStyle: 'double',
        borderColor: 'red'
      }
    )
  )
}

/**
 * Display success message
 */
export function displaySuccess(message: string) {
  console.log(
    boxen(
      chalk.green.bold('✅ SUCCESS\n\n') + chalk.white(message),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }
    )
  )
}

/**
 * Create a progress bar
 */
export function createProgressBar(title: string, total: number) {
  let current = 0
  
  const update = (value: number) => {
    current = value
    const percentage = Math.floor((current / total) * 100)
    const filled = Math.floor((current / total) * 30)
    const empty = 30 - filled
    
    const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty))
    const text = `${title} [${bar}] ${percentage}%`
    
    process.stdout.write('\r' + text)
    
    if (current >= total) {
      console.log() // New line after completion
    }
  }
  
  return { update }
}

/**
 * Display chat message with style
 */
export function displayChatMessage(from: string, message: string, isAgent: boolean = false) {
  const timestamp = new Date().toLocaleTimeString()
  
  if (isAgent) {
    console.log(
      chalk.gray(`[${timestamp}]`) + ' ' +
      neonGradient(from) + chalk.cyan(': ') +
      chalk.white(message)
    )
  } else {
    console.log(
      chalk.gray(`[${timestamp}]`) + ' ' +
      chalk.yellow(from) + chalk.gray(': ') +
      chalk.white(message)
    )
  }
}

/**
 * Matrix-style animation
 */
export async function matrixRain(duration: number = 3000) {
  const columns = process.stdout.columns
  const rows = process.stdout.rows
  const drops: number[] = Array(Math.floor(columns / 2)).fill(0)
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+-=[]{}|;:,.<>?'
  
  const interval = setInterval(() => {
    console.clear()
    
    for (let i = 0; i < drops.length; i++) {
      const x = i * 2
      const y = drops[i]
      
      if (y < rows) {
        process.stdout.cursorTo(x, y)
        process.stdout.write(matrixGradient(chars[Math.floor(Math.random() * chars.length)]))
      }
      
      drops[i]++
      if (drops[i] * Math.random() > rows) {
        drops[i] = 0
      }
    }
  }, 50)
  
  setTimeout(() => {
    clearInterval(interval)
    console.clear()
  }, duration)
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
      portalRequests: 0
    },
    
    update(data: any) {
      if (data.agents) {
        data.agents.forEach((agent: any) => {
          this.agents.set(agent.id, agent)
        })
      }
      
      if (data.metrics) {
        Object.assign(this.metrics, data.metrics)
      }
      
      this.render()
    },
    
    render() {
      console.clear()
      displayBanner()
      
      console.log(chalk.cyan.bold('\n📊 System Dashboard\n'))
      
      // Display metrics
      displayMetrics(this.metrics)
      console.log()
      
      // Display agents
      if (this.agents.size > 0) {
        console.log(chalk.cyan.bold('🤖 Active Agents\n'))
        displayAgentStatus(Array.from(this.agents.values()))
      }
    }
  }
  
  return dashboard
}

/**
 * Cool shutdown animation
 */
export async function animateShutdown() {
  console.log()
  const messages = [
    '🔌 Disconnecting neural networks...',
    '💾 Saving agent memories...',
    '🧠 Preserving cognitive states...',
    '🌐 Closing portal connections...',
    '✨ Shutting down gracefully...'
  ]
  
  for (const msg of messages) {
    await animateLoading(msg, 500)
  }
  
  console.log()
  console.log(fireGradient.multiline(figlet.textSync('Goodbye!', { font: 'Small' })))
  console.log()
}