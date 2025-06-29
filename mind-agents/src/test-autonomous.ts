/**
 * Test Autonomous Agent System - Validation and integration test
 */

import { SYMindXRuntime } from './core/runtime.js'
import { RuntimeConfig, LogLevel } from './types/agent.js'
import { Logger } from './utils/logger.js'

const logger = new Logger('autonomous-test')

async function testAutonomousSystem() {
  logger.info('🧪 Testing Autonomous Agent System...')

  try {
    // Create minimal runtime configuration
    const runtimeConfig: RuntimeConfig = {
      tickInterval: 5000, // 5 seconds for testing
      maxAgents: 5,
      logLevel: LogLevel.INFO,
      persistence: {
        enabled: false,
      path: ''
      },
      extensions: {
        autoLoad: false,
        paths: []
      },
      portals: {
        autoLoad: false,
        paths: [],
        apiKeys: {}
      }
    }

    // Create runtime
    const runtime = new SYMindXRuntime(runtimeConfig)
    
    // Initialize runtime
    await runtime.initialize()
    
    // Start runtime
    await runtime.start()
    
    logger.info('✅ Runtime started successfully')

    // Let the system run for a bit to test autonomous behavior
    await new Promise(resolve => setTimeout(resolve, 30000)) // 30 seconds

    // Get runtime statistics
    const stats = runtime.getStats()
    logger.info('📊 Runtime Stats:', stats)

    // Test autonomous status for each agent
    for (const [agentId] of runtime.agents) {
      const autonomousStatus = runtime.getAutonomousStatus(agentId)
      logger.info(`🤖 Agent ${agentId} Autonomous Status:`, autonomousStatus)
    }

    // Stop runtime
    await runtime.stop()
    
    logger.info('✅ Autonomous system test completed successfully')
    
  } catch (error) {
    logger.error('❌ Test failed:', error)
    throw error
  }
}

async function testHumanInteraction() {
  logger.info('🗣️ Testing Human Interaction...')
  
  try {
    const runtimeConfig: RuntimeConfig = {
      tickInterval: 5000,
      maxAgents: 1,
      logLevel: LogLevel.INFO,
      persistence: {
        enabled: false,
      path: ''
      },
      extensions: {
        autoLoad: false,
        paths: []
      },
      portals: {
        autoLoad: false,
        paths: [],
        apiKeys: {}
      }
    }

    const runtime = new SYMindXRuntime(runtimeConfig)
    await runtime.initialize()
    await runtime.start()

    // Wait for agents to load
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Test human interaction
    const agents = Array.from(runtime.agents.keys())
    if (agents.length > 0) {
      const agentId = agents[0]
      
      // Send a greeting
      logger.info('👋 Sending greeting to agent...')
      runtime.interruptAutonomousAgent(agentId, {
        id: 'test_greeting',
        type: 'human_message',
        source: 'test',
        data: {
          humanId: 'test_human',
          content: 'Hello! How are you doing?',
          type: 'greeting'
        },
        timestamp: new Date(),
        processed: false
      })

      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Send a question
      logger.info('❓ Sending question to agent...')
      runtime.interruptAutonomousAgent(agentId, {
        id: 'test_question',
        type: 'human_message',
        source: 'test',
        data: {
          humanId: 'test_human',
          content: 'What are you currently working on?',
          type: 'question'
        },
        timestamp: new Date(),
        processed: false
      })

      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Check autonomous status
      const status = runtime.getAutonomousStatus(agentId)
      logger.info('📈 Final Status:', status)
    }

    await runtime.stop()
    logger.info('✅ Human interaction test completed')
    
  } catch (error) {
    logger.error('❌ Human interaction test failed:', error)
    throw error
  }
}

async function runTests() {
  try {
    logger.info('🚀 Starting Autonomous Agent System Tests...')
    
    // Test 1: Basic autonomous system
    await testAutonomousSystem()
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Test 2: Human interaction
    await testHumanInteraction()
    
    logger.info('🎉 All tests completed successfully!')
    
  } catch (error) {
    logger.error('💥 Test suite failed:', error)
    process.exit(1)
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then(() => {
    logger.info('🏁 Test execution finished')
    process.exit(0)
  }).catch((error) => {
    logger.error('💥 Test execution failed:', error)
    process.exit(1)
  })
}

export { testAutonomousSystem, testHumanInteraction, runTests }