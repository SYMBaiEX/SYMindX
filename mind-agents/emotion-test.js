/**
 * Simple test script to check emotion module integration
 */

import { SYMindXRuntime } from './dist/core/runtime.js'
import { configResolver } from './dist/utils/config-resolver.js'

async function testEmotionIntegration() {
  console.log('🧪 Testing Emotion Module Integration...\n')

  try {
    // Create minimal runtime config
    const runtimeConfig = {
      apiPort: 3003,
      agents: {
        loadFromDirectory: true,
        directory: './src/characters'
      },
      extensions: {
        enabled: ['api']
      },
      logging: {
        level: 'info',
        console: true
      }
    }

    const runtime = new SYMindXRuntime(runtimeConfig)
    await runtime.initialize()
    
    console.log('✅ Runtime initialized')
    
    // Load agents
    await runtime.loadAgents()
    const agents = Array.from(runtime.agents.values())
    
    if (agents.length === 0) {
      console.log('❌ No agents loaded')
      return
    }
    
    const agent = agents[0]
    console.log(`🤖 Testing with agent: ${agent.name}`)
    console.log(`📊 Agent emotion module: ${agent.emotion ? agent.emotion.constructor.name : 'None'}`)
    
    if (!agent.emotion) {
      console.log('❌ No emotion module found on agent!')
      return
    }

    // Test emotion state
    console.log('\n📍 Current emotion state:')
    const currentState = agent.emotion.getCurrentState()
    console.log(`   Current: ${currentState.current}`)
    console.log(`   Intensity: ${currentState.intensity}`)
    console.log(`   Triggers: ${currentState.triggers?.join(', ') || 'none'}`)
    console.log(`   History length: ${currentState.history?.length || 0}`)

    // Test emotion processing
    console.log('\n🔄 Testing emotion event processing...')
    
    // Test various events
    const testEvents = [
      { type: 'chat', context: { message: 'Hello! How are you?', positive: true } },
      { type: 'level_up', context: { achievement: true, rare_drop: true } },
      { type: 'death', context: { death_count: 1, negative: true } },
      { type: 'helping_player', context: { helping_player: true, generous: true } },
      { type: 'wilderness', context: { wilderness: true, danger: true } }
    ]

    for (const event of testEvents) {
      console.log(`\n   Processing event: ${event.type}`)
      
      if (typeof agent.emotion.processEvent === 'function') {
        const newState = agent.emotion.processEvent(event.type, event.context)
        console.log(`   → Emotion: ${newState.current} (intensity: ${newState.intensity.toFixed(2)})`)
        
        // Check if emotion has modifiers (for rune emotion stack)
        if (typeof agent.emotion.getEmotionModifier === 'function') {
          const modifiers = agent.emotion.getEmotionModifier()
          if (Object.keys(modifiers).length > 0) {
            console.log(`   → Modifiers: ${Object.entries(modifiers).map(([k,v]) => `${k}:${v.toFixed(2)}`).join(', ')}`)
          }
        }
      } else {
        console.log('   → No processEvent method available')
        
        // Try manual emotion setting
        if (typeof agent.emotion.setEmotion === 'function') {
          const intensity = Math.random() * 0.8 + 0.2
          agent.emotion.setEmotion('excited', intensity, [event.type])
          console.log(`   → Manually set emotion: excited (${intensity.toFixed(2)})`)
        }
      }
      
      // Wait a bit for emotion decay
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Test emotion history
    console.log('\n📚 Emotion history:')
    if (typeof agent.emotion.getHistory === 'function') {
      const history = agent.emotion.getHistory(5)
      history.forEach((record, i) => {
        console.log(`   ${i+1}. ${record.emotion} (${record.intensity?.toFixed(2)}) - ${record.triggers?.join(', ') || 'no triggers'}`)
      })
    } else {
      console.log('   → No getHistory method available')
    }

    // Test if emotions are included in agent responses
    console.log('\n💬 Testing emotion integration with chat...')
    
    if (agent.portal) {
      try {
        // Simulate a chat interaction
        const testMessage = "I'm feeling really excited about this new project!"
        console.log(`   User message: "${testMessage}"`)
        
        // Process emotion from user message
        if (typeof agent.emotion.processEvent === 'function') {
          agent.emotion.processEvent('chat', { 
            message: testMessage, 
            positive: true, 
            excited: true 
          })
        }
        
        console.log(`   Agent emotion after processing: ${agent.emotion.current} (${agent.emotion.intensity.toFixed(2)})`)
        
        // Check if emotion affects response generation
        const currentEmotion = agent.emotion.current
        const emotionIntensity = agent.emotion.intensity
        
        console.log(`   Emotion data available for response generation:`)
        console.log(`   - Current emotion: ${currentEmotion}`)
        console.log(`   - Intensity: ${emotionIntensity.toFixed(2)}`)
        
        if (typeof agent.emotion.getEmotionalContext === 'function') {
          const emotionalContext = agent.emotion.getEmotionalContext()
          console.log(`   - Emotional context: ${Object.keys(emotionalContext).join(', ')}`)
        }
        
      } catch (error) {
        console.log(`   ⚠️ Error testing chat integration:`, error.message)
      }
    } else {
      console.log('   ⚠️ No portal available for chat testing')
    }

    console.log('\n✅ Emotion integration test completed!')
    
  } catch (error) {
    console.error('❌ Error during emotion testing:', error)
  }
}

// Run the test
testEmotionIntegration().catch(console.error)