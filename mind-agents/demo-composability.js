#!/usr/bin/env node

/**
 * Demonstration of Portal Composability
 * Shows how to switch between different AI providers dynamically
 */

import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
config({ path: path.join(__dirname, '../..', '.env') })

// Import our components
import { PortalIntegration } from './dist/core/portal-integration.js'
import { DynamicPortalSelector } from './dist/core/dynamic-portal-selector.js'

// Create a mock agent with multiple portals
const mockAgent = {
  id: 'demo-agent',
  name: 'Demo Agent',
  config: {
    core: {
      personality: ['adaptable', 'helpful'],
      tone: 'friendly'
    }
  },
  portals: [
    {
      name: 'groq_fast',
      type: 'groq',
      enabled: true,
      primary: true,
      capabilities: ['chat_generation'],
      config: {
        apiKey: process.env.GROQ_API_KEY,
        model: 'llama-3.1-8b-instant',
        temperature: 0.5
      },
      generateChat: async (messages, options) => {
        console.log('📍 Using GROQ (Fast) portal')
        return {
          text: '[GROQ Fast] This would be a quick response from Groq 8B model',
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
        }
      }
    },
    {
      name: 'openai_quality',
      type: 'openai',
      enabled: process.env.OPENAI_CHAT_ENABLED === 'true',
      capabilities: ['chat_generation'],
      config: {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4',
        temperature: 0.7
      },
      generateChat: async (messages, options) => {
        console.log('📍 Using OpenAI (Quality) portal')
        return {
          text: '[OpenAI GPT-4] This would be a high-quality response from GPT-4',
          usage: { promptTokens: 15, completionTokens: 30, totalTokens: 45 }
        }
      }
    },
    {
      name: 'openai_creative',
      type: 'openai',
      enabled: process.env.OPENAI_CHAT_ENABLED === 'true',
      capabilities: ['chat_generation'],
      config: {
        model: 'gpt-4',
        temperature: 0.9
      },
      generateChat: async (messages, options) => {
        console.log('📍 Using OpenAI (Creative) portal')
        return {
          text: '[OpenAI Creative] This would be a creative, imaginative response!',
          usage: { promptTokens: 15, completionTokens: 25, totalTokens: 40 }
        }
      }
    }
  ]
}

// Add portal capability checking
mockAgent.portals.forEach(portal => {
  portal.hasCapability = (cap) => portal.capabilities.includes(cap)
})

console.log('🎭 Portal Composability Demo\n')
console.log('Available Portals:')
const availablePortals = PortalIntegration.listAvailablePortals(mockAgent)
availablePortals.forEach(portal => console.log(`  ${portal}`))
console.log()

// Test different scenarios
async function runDemo() {
  const testPrompt = "Tell me about artificial intelligence"

  console.log('1️⃣ Default Response (Primary Portal):')
  const defaultResponse = await PortalIntegration.generateResponse(mockAgent, testPrompt)
  console.log(`   ${defaultResponse}\n`)

  console.log('2️⃣ Fast Response (Speed Optimized):')
  const fastResponse = await PortalIntegration.generateFastResponse(mockAgent, testPrompt)
  console.log(`   ${fastResponse}\n`)

  console.log('3️⃣ Quality Response (Best Model):')
  const qualityResponse = await PortalIntegration.generateQualityResponse(mockAgent, testPrompt)
  console.log(`   ${qualityResponse}\n`)

  console.log('4️⃣ Creative Response (High Temperature):')
  const creativeResponse = await PortalIntegration.generateCreativeResponse(mockAgent, testPrompt)
  console.log(`   ${creativeResponse}\n`)

  console.log('5️⃣ Custom Criteria (Prefer OpenAI):')
  const customResponse = await PortalIntegration.generateResponse(
    mockAgent, 
    testPrompt,
    {},
    {
      capability: 'chat_generation',
      preferredProviders: ['openai'],
      context: { complexity: 'moderate' }
    }
  )
  console.log(`   ${customResponse}\n`)

  console.log('6️⃣ Context-Aware Selection:')
  
  // Urgent query - should use fast portal
  console.log('   Urgent query:')
  const urgentResponse = await PortalIntegration.generateResponse(
    mockAgent,
    "Quick! What's 2+2?",
    {},
    {
      capability: 'chat_generation',
      context: { urgency: 'high', complexity: 'simple' }
    }
  )
  console.log(`   ${urgentResponse}`)
  
  // Complex query - should use quality portal
  console.log('\n   Complex query:')
  const complexResponse = await PortalIntegration.generateResponse(
    mockAgent,
    "Explain quantum computing and its implications for cryptography",
    {},
    {
      capability: 'chat_generation',
      context: { urgency: 'low', complexity: 'complex' }
    }
  )
  console.log(`   ${complexResponse}`)
}

runDemo().then(() => {
  console.log('\n✅ Demo complete! This shows how you can:')
  console.log('   - Switch between portals dynamically')
  console.log('   - Select portals based on criteria (speed, quality, cost)')
  console.log('   - Use context to intelligently route requests')
  console.log('   - Mix providers (Groq, OpenAI, Anthropic, etc.)')
}).catch(console.error)