#!/usr/bin/env node
/**
 * Simple Chat System Test
 * 
 * Tests the SQLite chat repository to ensure basic functionality works
 */

import { createChatRepository, getChatSystemStatus } from './chat-integration.js'
import { ConversationStatus, MessageType, SenderType, MessageStatus } from './providers/sqlite/chat-types.js'
import { existsSync, unlinkSync } from 'fs'
import { join } from 'path'

const TEST_DB_PATH = join(process.cwd(), 'test-chat.db')

async function runChatTest() {
  console.log('🧪 Starting SYMindX Chat System Test...\n')

  // Clean up any existing test database
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH)
  }

  try {
    // Create SQLite chat repository
    const chatRepo = createChatRepository({
      provider: 'sqlite',
      config: {
        dbPath: TEST_DB_PATH,
        enableAnalytics: true,
        enableFullTextSearch: true
      }
    })

    console.log('✅ Chat repository created successfully')

    // Test 1: Health Check
    console.log('\n📊 Running health check...')
    const healthStatus = await getChatSystemStatus(chatRepo)
    console.log(`   Status: ${healthStatus.status}`)
    console.log(`   Provider: ${healthStatus.provider}`)
    if (healthStatus.details.error) {
      console.log(`   Error: ${healthStatus.details.error}`)
    }

    if (healthStatus.status === 'unhealthy') {
      throw new Error('Health check failed')
    }

    // Test 2: Create a real conversation
    console.log('\n💬 Creating test conversation...')
    const conversation = await chatRepo.createConversation({
      agentId: 'nyx-agent',
      userId: 'test-user-123',
      title: 'Test Chat with NyX',
      status: ConversationStatus.ACTIVE,
      messageCount: 0,
      metadata: { testSession: true }
    })
    console.log(`   Conversation ID: ${conversation.id}`)
    console.log(`   Created: ${conversation.createdAt}`)

    // Test 3: Add some messages
    console.log('\n📝 Adding test messages...')
    
    const userMessage = await chatRepo.createMessage({
      conversationId: conversation.id,
      senderType: SenderType.USER,
      senderId: 'test-user-123',
      content: 'Hello NyX! How are you today?',
      messageType: MessageType.TEXT,
      metadata: { channel: 'web' },
      memoryReferences: [],
      createdMemories: [],
      status: MessageStatus.SENT
    })
    console.log(`   User message: ${userMessage.id}`)

    const agentMessage = await chatRepo.createMessage({
      conversationId: conversation.id,
      senderType: SenderType.AGENT,
      senderId: 'nyx-agent',
      content: "Hello! I'm doing well, thank you for asking. How can I help you today?",
      messageType: MessageType.TEXT,
      metadata: { model: 'claude-4' },
      emotionState: {
        current: 'friendly',
        intensity: 0.8,
        triggers: ['greeting'],
        timestamp: new Date()
      },
      thoughtProcess: [
        'User is greeting me politely',
        'Should respond warmly and offer assistance',
        'Maintaining friendly tone'
      ],
      confidenceScore: 0.95,
      memoryReferences: [],
      createdMemories: ['greeting-interaction-123'],
      status: MessageStatus.SENT
    })
    console.log(`   Agent message: ${agentMessage.id}`)

    // Test 4: Query messages
    console.log('\n🔍 Querying conversation messages...')
    const messages = await chatRepo.listMessages({
      conversationId: conversation.id,
      limit: 10
    })
    console.log(`   Found ${messages.length} messages`)
    messages.forEach((msg, idx) => {
      console.log(`   ${idx + 1}. [${msg.senderType}] ${msg.content.substring(0, 50)}...`)
    })

    // Test 5: Search messages
    console.log('\n🔎 Testing message search...')
    const searchResults = await chatRepo.searchMessages(conversation.id, 'hello', 5)
    console.log(`   Search results: ${searchResults.length} messages`)

    // Test 6: Get conversation stats
    console.log('\n📈 Getting conversation statistics...')
    const stats = await chatRepo.getConversationStats(conversation.id)
    console.log(`   Total messages: ${stats.messageCount}`)
    console.log(`   User messages: ${stats.userMessageCount}`)
    console.log(`   Agent messages: ${stats.agentMessageCount}`)
    console.log(`   Average confidence: ${stats.avgConfidence?.toFixed(2) || 'N/A'}`)

    // Test 7: List participants
    console.log('\n👥 Listing conversation participants...')
    const participants = await chatRepo.listParticipants(conversation.id)
    console.log(`   Found ${participants.length} participants`)
    participants.forEach(p => {
      console.log(`   - ${p.participantType}: ${p.participantId} (${p.role})`)
    })

    console.log('\n🎉 All tests completed successfully!')
    console.log('\n📁 Test database created at:', TEST_DB_PATH)
    console.log('   You can examine the database structure with any SQLite browser')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runChatTest().catch(console.error)
}

export { runChatTest }