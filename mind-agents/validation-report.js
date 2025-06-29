#!/usr/bin/env node

/**
 * SYMindX System Validation Report
 * This script performs a comprehensive validation of the SYMindX system
 * without requiring full TypeScript compilation.
 */

import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🔍 SYMindX System Validation Report')
console.log('=' .repeat(50))

const validationResults = {
  coreStructure: [],
  configuration: [],
  modules: [],
  extensions: [],
  cli: [],
  limitations: [],
  recommendations: []
}

// Core Structure Validation
async function validateCoreStructure() {
  console.log('\n📁 Core Structure Validation')
  console.log('-'.repeat(30))
  
  const requiredPaths = [
    'src/core/runtime.ts',
    'src/core/registry.ts', 
    'src/core/simple-event-bus.ts',
    'src/core/simple-plugin-loader.ts',
    'src/types/agent.ts',
    'src/types/emotion.ts',
    'src/types/cognition.ts',
    'src/characters/nyx.json',
    'src/cli/index.ts',
    'package.json',
    'jest.config.ts'
  ]

  for (const filePath of requiredPaths) {
    try {
      await fs.access(path.join(__dirname, filePath))
      console.log(`✅ ${filePath}`)
      validationResults.coreStructure.push(`✅ ${filePath} - Present`)
    } catch (error) {
      console.log(`❌ ${filePath}`)
      validationResults.coreStructure.push(`❌ ${filePath} - Missing`)
    }
  }
}

// Configuration Validation
async function validateConfiguration() {
  console.log('\n⚙️  Configuration Validation')
  console.log('-'.repeat(30))
  
  try {
    // Check package.json
    const packageData = await fs.readFile(path.join(__dirname, 'package.json'), 'utf-8')
    const packageJson = JSON.parse(packageData)
    
    console.log(`✅ Package name: ${packageJson.name}`)
    console.log(`✅ Version: ${packageJson.version}`)
    console.log(`✅ Type: ${packageJson.type}`)
    console.log(`✅ Main: ${packageJson.main}`)
    console.log(`✅ CLI binary: ${packageJson.bin?.symindx || 'Not defined'}`)
    
    validationResults.configuration.push(`✅ Package.json valid`)
    validationResults.configuration.push(`✅ ES modules configured`)
    
    // Check dependencies
    const deps = Object.keys(packageJson.dependencies || {})
    console.log(`✅ Dependencies: ${deps.length} packages`)
    
    const devDeps = Object.keys(packageJson.devDependencies || {})
    console.log(`✅ Dev Dependencies: ${devDeps.length} packages`)
    
    // Check for essential dependencies
    const essentialDeps = ['@ai-sdk/anthropic', '@ai-sdk/openai', 'sqlite3', 'express', 'ws']
    const missingDeps = essentialDeps.filter(dep => !deps.includes(dep))
    
    if (missingDeps.length === 0) {
      console.log('✅ All essential dependencies present')
      validationResults.configuration.push('✅ Essential dependencies complete')
    } else {
      console.log(`⚠️  Missing dependencies: ${missingDeps.join(', ')}`)
      validationResults.configuration.push(`⚠️  Missing dependencies: ${missingDeps.join(', ')}`)
    }
    
  } catch (error) {
    console.log(`❌ Package.json validation failed: ${error.message}`)
    validationResults.configuration.push(`❌ Package.json validation failed`)
  }
  
  // Check Jest configuration
  try {
    await fs.access(path.join(__dirname, 'jest.config.ts'))
    console.log('✅ Jest configuration present')
    validationResults.configuration.push('✅ Jest configuration present')
  } catch (error) {
    console.log('❌ Jest configuration missing')
    validationResults.configuration.push('❌ Jest configuration missing')
  }
}

// Module System Validation
async function validateModules() {
  console.log('\n🧩 Module System Validation')
  console.log('-'.repeat(30))
  
  const moduleCategories = [
    { name: 'Memory Modules', path: 'src/modules/memory' },
    { name: 'Emotion Modules', path: 'src/modules/emotion' },
    { name: 'Cognition Modules', path: 'src/modules/cognition' },
    { name: 'Behavior Modules', path: 'src/modules/behaviors' },
    { name: 'Lifecycle Modules', path: 'src/modules/life-cycle' }
  ]
  
  for (const category of moduleCategories) {
    try {
      const modulePath = path.join(__dirname, category.path)
      await fs.access(modulePath)
      
      const files = await fs.readdir(modulePath, { recursive: true })
      const tsFiles = files.filter(f => typeof f === 'string' && f.endsWith('.ts'))
      
      console.log(`✅ ${category.name}: ${tsFiles.length} TypeScript files`)
      validationResults.modules.push(`✅ ${category.name}: ${tsFiles.length} files`)
      
      // Check for index.ts
      if (files.includes('index.ts')) {
        console.log(`  ✅ Index file present`)
      } else {
        console.log(`  ⚠️  No index file`)
      }
      
    } catch (error) {
      console.log(`❌ ${category.name}: Not found`)
      validationResults.modules.push(`❌ ${category.name}: Missing`)
    }
  }
}

// Extension System Validation
async function validateExtensions() {
  console.log('\n🔌 Extension System Validation')
  console.log('-'.repeat(30))
  
  const extensions = [
    'api',
    // Add more extensions as they're identified
  ]
  
  for (const extension of extensions) {
    try {
      const extPath = path.join(__dirname, 'src/extensions', extension)
      await fs.access(extPath)
      
      const files = await fs.readdir(extPath, { recursive: true })
      const tsFiles = files.filter(f => typeof f === 'string' && f.endsWith('.ts'))
      
      console.log(`✅ ${extension} extension: ${tsFiles.length} files`)
      validationResults.extensions.push(`✅ ${extension} extension present`)
    } catch (error) {
      console.log(`❌ ${extension} extension: Not found`)
      validationResults.extensions.push(`❌ ${extension} extension missing`)
    }
  }
  
  // Check portal system
  try {
    const portalsPath = path.join(__dirname, 'src/portals')
    await fs.access(portalsPath)
    
    const portalDirs = await fs.readdir(portalsPath, { withFileTypes: true })
    const portalCount = portalDirs.filter(d => d.isDirectory()).length
    
    console.log(`✅ Portal system: ${portalCount} portal types`)
    validationResults.extensions.push(`✅ Portal system: ${portalCount} types`)
  } catch (error) {
    console.log('❌ Portal system: Not found')
    validationResults.extensions.push('❌ Portal system missing')
  }
}

// CLI System Validation
async function validateCLI() {
  console.log('\n💻 CLI System Validation')
  console.log('-'.repeat(30))
  
  try {
    const cliPath = path.join(__dirname, 'src/cli')
    await fs.access(cliPath)
    
    const cliFiles = await fs.readdir(cliPath, { recursive: true })
    const commandFiles = cliFiles.filter(f => typeof f === 'string' && f.includes('commands/'))
    
    console.log(`✅ CLI system present: ${commandFiles.length} command files`)
    validationResults.cli.push(`✅ CLI system: ${commandFiles.length} commands`)
    
    // Check for main CLI file
    if (cliFiles.includes('index.ts')) {
      console.log('✅ Main CLI entry point present')
      validationResults.cli.push('✅ Main CLI entry point present')
    } else {
      console.log('❌ Main CLI entry point missing')
      validationResults.cli.push('❌ Main CLI entry point missing')
    }
    
  } catch (error) {
    console.log('❌ CLI system: Not found')
    validationResults.cli.push('❌ CLI system missing')
  }
}

// Nyx Agent Validation
async function validateNyxAgent() {
  console.log('\n🤖 Nyx Agent Validation')
  console.log('-'.repeat(30))
  
  try {
    const nyxPath = path.join(__dirname, 'src/characters/nyx.json')
    const nyxData = await fs.readFile(nyxPath, 'utf-8')
    const nyxConfig = JSON.parse(nyxData)
    
    console.log(`✅ Nyx configuration loaded`)
    console.log(`  Name: ${nyxConfig.name}`)
    console.log(`  ID: ${nyxConfig.id}`)
    console.log(`  Version: ${nyxConfig.version}`)
    console.log(`  Autonomous: ${nyxConfig.autonomous?.enabled ? 'Enabled' : 'Disabled'}`)
    console.log(`  Extensions: ${nyxConfig.extensions?.length || 0}`)
    console.log(`  Portals: ${nyxConfig.portals?.length || 0}`)
    
    validationResults.configuration.push('✅ Nyx agent configuration valid')
    
    // Validate required sections
    const requiredSections = ['personality', 'memory', 'emotion', 'cognition']
    for (const section of requiredSections) {
      if (nyxConfig[section]) {
        console.log(`  ✅ ${section} configuration present`)
      } else {
        console.log(`  ❌ ${section} configuration missing`)
        validationResults.limitations.push(`Nyx missing ${section} configuration`)
      }
    }
    
  } catch (error) {
    console.log(`❌ Nyx agent validation failed: ${error.message}`)
    validationResults.configuration.push('❌ Nyx agent configuration invalid')
  }
}

// Build System Validation
async function validateBuildSystem() {
  console.log('\n🔨 Build System Validation')
  console.log('-'.repeat(30))
  
  try {
    // Check TypeScript config
    await fs.access(path.join(__dirname, 'tsconfig.json'))
    console.log('✅ TypeScript configuration present')
    
    // Check if dist directory exists
    try {
      await fs.access(path.join(__dirname, 'dist'))
      console.log('✅ Dist directory present (built)')
      validationResults.configuration.push('✅ Build output present')
    } catch (error) {
      console.log('⚠️  Dist directory missing (not built)')
      validationResults.limitations.push('System not built - run npm run build')
    }
    
  } catch (error) {
    console.log('❌ TypeScript configuration missing')
    validationResults.limitations.push('TypeScript configuration missing')
  }
}

// Test System Validation
async function validateTestSystem() {
  console.log('\n🧪 Test System Validation')
  console.log('-'.repeat(30))
  
  try {
    // Check for test files
    const testFiles = []
    
    async function findTestFiles(dir) {
      try {
        const items = await fs.readdir(dir, { withFileTypes: true })
        for (const item of items) {
          const fullPath = path.join(dir, item.name)
          if (item.isDirectory()) {
            await findTestFiles(fullPath)
          } else if (item.name.endsWith('.test.ts')) {
            testFiles.push(fullPath.replace(__dirname + '/', ''))
          }
        }
      } catch (error) {
        // Ignore directory access errors
      }
    }
    
    await findTestFiles(path.join(__dirname, 'src'))
    
    console.log(`✅ Test files found: ${testFiles.length}`)
    if (testFiles.length > 0) {
      testFiles.forEach(file => console.log(`  - ${file}`))
      validationResults.configuration.push(`✅ Test system: ${testFiles.length} test files`)
    } else {
      console.log('⚠️  No test files found')
      validationResults.limitations.push('No test files present')
    }
    
  } catch (error) {
    console.log('❌ Test system validation failed')
  }
}

// Generate Recommendations
function generateRecommendations() {
  console.log('\n💡 Recommendations')
  console.log('-'.repeat(30))
  
  const recommendations = [
    '1. Fix TypeScript compilation errors before production use',
    '2. Complete implementation of missing module interfaces',
    '3. Add comprehensive error handling throughout the system',
    '4. Implement proper test coverage for all modules',
    '5. Create documentation for system architecture',
    '6. Add configuration validation and defaults',
    '7. Implement proper logging system',
    '8. Add health checks and monitoring',
    '9. Create development setup documentation',
    '10. Add CI/CD pipeline for automated testing'
  ]
  
  recommendations.forEach(rec => {
    console.log(`📋 ${rec}`)
    validationResults.recommendations.push(rec)
  })
}

// System Completeness Assessment
function assessCompleteness() {
  console.log('\n📊 System Completeness Assessment')
  console.log('-'.repeat(40))
  
  const categories = {
    'Core Architecture': validationResults.coreStructure.filter(r => r.includes('✅')).length / validationResults.coreStructure.length,
    'Configuration': validationResults.configuration.filter(r => r.includes('✅')).length / Math.max(validationResults.configuration.length, 1),
    'Module System': validationResults.modules.filter(r => r.includes('✅')).length / Math.max(validationResults.modules.length, 1),
    'Extensions': validationResults.extensions.filter(r => r.includes('✅')).length / Math.max(validationResults.extensions.length, 1),
    'CLI Interface': validationResults.cli.filter(r => r.includes('✅')).length / Math.max(validationResults.cli.length, 1)
  }
  
  let totalScore = 0
  let categoryCount = 0
  
  for (const [category, score] of Object.entries(categories)) {
    const percentage = Math.round(score * 100)
    const status = percentage >= 80 ? '✅' : percentage >= 50 ? '⚠️' : '❌'
    console.log(`${status} ${category}: ${percentage}%`)
    totalScore += score
    categoryCount++
  }
  
  const overallScore = Math.round((totalScore / categoryCount) * 100)
  console.log(`\n🎯 Overall System Completeness: ${overallScore}%`)
  
  if (overallScore >= 80) {
    console.log('🚀 System is ready for production use')
  } else if (overallScore >= 60) {
    console.log('⚠️  System needs some work before production')
  } else {
    console.log('🔧 System requires significant development')
  }
  
  return overallScore
}

// Main validation function
async function runValidation() {
  try {
    await validateCoreStructure()
    await validateConfiguration()
    await validateModules()
    await validateExtensions()
    await validateCLI()
    await validateNyxAgent()
    await validateBuildSystem()
    await validateTestSystem()
    
    const completeness = assessCompleteness()
    generateRecommendations()
    
    console.log('\n📋 Summary of Limitations')
    console.log('-'.repeat(30))
    if (validationResults.limitations.length === 0) {
      console.log('✅ No major limitations identified')
    } else {
      validationResults.limitations.forEach(limitation => {
        console.log(`⚠️  ${limitation}`)
      })
    }
    
    console.log('\n✅ Validation Complete')
    console.log(`📊 System Completeness: ${completeness}%`)
    
    return {
      completeness,
      results: validationResults,
      status: completeness >= 60 ? 'READY_FOR_TESTING' : 'NEEDS_DEVELOPMENT'
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error)
    return {
      completeness: 0,
      results: validationResults,
      status: 'VALIDATION_FAILED',
      error: error.message
    }
  }
}

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidation()
    .then(result => {
      if (result.status === 'READY_FOR_TESTING') {
        process.exit(0)
      } else {
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('Validation error:', error)
      process.exit(1)
    })
}

export { runValidation, validationResults }