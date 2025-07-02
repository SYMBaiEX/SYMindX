#!/usr/bin/env node

const { spawn } = require('child_process')
const path = require('path')

// Try to find the actual symindx CLI
const possiblePaths = [
  // Global npm modules
  path.join(__dirname, '..', '@symindx', 'cli', 'dist', 'cli.js'),
  path.join(process.env.NODE_PATH || '', '@symindx', 'cli', 'dist', 'cli.js'),
  // Try npx as fallback
  'npx'
]

function tryPath(pathIndex = 0) {
  if (pathIndex >= possiblePaths.length) {
    console.error('❌ SYMindX CLI not found. Please install with: npm install -g @symindx/cli')
    process.exit(1)
  }

  const currentPath = possiblePaths[pathIndex]
  const args = currentPath === 'npx' 
    ? ['@symindx/cli', ...process.argv.slice(2)]
    : process.argv.slice(2)

  const child = spawn(
    currentPath === 'npx' ? 'npx' : process.execPath,
    currentPath === 'npx' ? args : [currentPath, ...args],
    { stdio: 'inherit' }
  )

  child.on('error', () => {
    // Try next path
    tryPath(pathIndex + 1)
  })

  child.on('exit', (code) => {
    process.exit(code || 0)
  })
}

tryPath()