#!/usr/bin/env node

/**
 * Simple test script to chat with Nyx agent
 */

import readline from 'readline'
import { CommandSystem } from './dist/core/command-system.js'

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'You > '
})

console.log('🤖 Connecting to Nyx agent...')
console.log('💬 Type your message and press Enter to chat')
console.log('📝 Type /exit to quit\n')

// Create command system
const commandSystem = new CommandSystem()

// Wait a bit for the agent to initialize
setTimeout(() => {
  // Find Nyx agent (we'll need to get the agent ID from the runtime)
  console.log('⚠️ Note: You need to manually register the agent with the command system')
  console.log('⚠️ For now, send messages directly through the API or WebSocket\n')
  
  rl.prompt()
  
  rl.on('line', async (input) => {
    if (input.trim() === '/exit') {
      console.log('\n👋 Goodbye!')
      process.exit(0)
    }
    
    console.log('\nNyx > [Response would appear here once agent is connected]\n')
    rl.prompt()
  })
  
}, 2000)

// Handle Ctrl+C
rl.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye!')
  process.exit(0)
})