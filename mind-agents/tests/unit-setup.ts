// Unit test specific setup
import '@testing-library/jest-dom';

// Mock external dependencies
jest.mock('@supabase/supabase-js');
jest.mock('@neondatabase/serverless');
jest.mock('pg');
jest.mock('better-sqlite3');

// Mock AI SDKs
jest.mock('@ai-sdk/openai');
jest.mock('@ai-sdk/anthropic');
jest.mock('@ai-sdk/groq');
jest.mock('@ai-sdk/xai');
jest.mock('@ai-sdk/google');
jest.mock('@ai-sdk/mistral');
jest.mock('@ai-sdk/cohere');

// Mock external services
jest.mock('express');
jest.mock('ws');
jest.mock('telegraf');

// Unit test specific globals
global.unitTestUtils = {
  createMockAgent: () => ({
    id: 'test-agent',
    name: 'Test Agent',
    status: 'inactive',
    memory: { provider: 'sqlite' },
    emotion: { composite: {} },
    cognition: { type: 'reactive' },
    extensions: [],
    portals: [],
  }),
  
  createMockContext: () => ({
    agentId: 'test-agent',
    requestId: 'test-request',
    timestamp: new Date(),
    metadata: {},
  }),
  
  createMockMessage: (content: string) => ({
    id: 'test-message',
    role: 'user',
    content,
    timestamp: new Date(),
  }),
};