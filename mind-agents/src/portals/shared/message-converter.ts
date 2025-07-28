/**
 * Shared Message Conversion Utilities
 * 
 * Provides standardized message conversion logic for all portal implementations
 */

import type { ModelMessage as AIMessage } from 'ai';
import { ChatMessage, MessageRole } from '../../types/portal';
import type { AIContentPart } from '../../types/portals/ai-sdk';

export interface MessageConversionOptions {
  /**
   * How to handle system messages
   * - 'single': Combine all system messages into one (Anthropic style)
   * - 'multiple': Keep system messages separate (OpenAI style)
   * - 'first-only': Only use the first system message
   */
  systemMessageStrategy?: 'single' | 'multiple' | 'first-only';
  
  /**
   * Whether to support multimodal content (images, attachments)
   */
  supportsMultimodal?: boolean;
  
  /**
   * Whether to support tool/function messages
   */
  supportsTools?: boolean;
  
  /**
   * Provider-specific message handling
   */
  provider?: 'openai' | 'anthropic' | 'groq' | 'xai' | 'google' | 'mistral' | 'cohere';
}

/**
 * Convert ChatMessage array to AI SDK message format with provider-specific handling
 */
export function convertToAIMessages(
  messages: ChatMessage[], 
  options: MessageConversionOptions = {}
): AIMessage[] {
  const {
    systemMessageStrategy = 'multiple',
    supportsMultimodal = true,
    supportsTools = true,
    provider = 'openai'
  } = options;

  const modelMessages: AIMessage[] = [];

  // Handle system messages based on strategy
  if (systemMessageStrategy === 'single') {
    const systemMessages = messages.filter(msg => msg.role === MessageRole.SYSTEM);
    if (systemMessages.length > 0) {
      const systemContent = systemMessages.map(msg => msg.content).join('\n\n');
      modelMessages.push({
        role: 'system',
        content: systemContent,
      });
    }
  }

  // Process all messages
  for (const msg of messages) {
    // Skip system messages if using single strategy (already handled above)
    if (systemMessageStrategy === 'single' && msg.role === MessageRole.SYSTEM) {
      continue;
    }
    
    // Skip system messages after first if using first-only strategy
    if (systemMessageStrategy === 'first-only' && msg.role === MessageRole.SYSTEM) {
      const existingSystemMessages = modelMessages.filter(m => m.role === 'system');
      if (existingSystemMessages.length > 0) {
        continue;
      }
    }

    const convertedMessage = convertSingleMessage(msg, { 
      supportsMultimodal, 
      supportsTools, 
      provider 
    });
    
    if (convertedMessage) {
      modelMessages.push(convertedMessage);
    }
  }

  return modelMessages;
}

/**
 * Convert a single ChatMessage to AI SDK format
 */
function convertSingleMessage(
  msg: ChatMessage, 
  options: Pick<MessageConversionOptions, 'supportsMultimodal' | 'supportsTools' | 'provider'>
): AIMessage | null {
  const { supportsMultimodal = true, supportsTools = true, provider = 'openai' } = options;

  switch (msg.role) {
    case MessageRole.SYSTEM:
      return { role: 'system', content: msg.content };

    case MessageRole.USER:
      return convertUserMessage(msg, supportsMultimodal);

    case MessageRole.ASSISTANT:
      return { role: 'assistant', content: msg.content };

    case MessageRole.TOOL:
      if (!supportsTools) return null;
      return convertToolMessage(msg, provider);

    case MessageRole.FUNCTION:
      // Convert function messages to assistant messages for compatibility
      return { role: 'assistant', content: msg.content };

    default:
      // Default fallback to user message
      return { role: 'user', content: msg.content };
  }
}

/**
 * Convert user message with multimodal support
 */
function convertUserMessage(msg: ChatMessage, supportsMultimodal: boolean): AIMessage {
  if (!supportsMultimodal || !msg.attachments || msg.attachments.length === 0) {
    return { role: 'user', content: msg.content };
  }

  // Build multimodal content
  const content: (string | AIContentPart)[] = [msg.content];

  for (const attachment of msg.attachments) {
    if (attachment.type === 'image') {
      if (attachment.data) {
        content.push({
          type: 'image',
          image: attachment.data,
          ...(attachment.mimeType && { mimeType: attachment.mimeType })
        } as AIContentPart);
      } else if (attachment.url) {
        content.push({
          type: 'image',
          image: new URL(attachment.url)
        } as AIContentPart);
      }
    }
  }

  return { role: 'user', content };
}

/**
 * Convert tool message with provider-specific handling
 */
function convertToolMessage(msg: ChatMessage, provider: string): AIMessage {
  // Different providers handle tool messages differently
  switch (provider) {
    case 'anthropic':
      return {
        role: 'tool',
        content: msg.content
      };
    
    case 'openai':
    default:
      return {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: msg.toolCallId || '',
            toolName: msg.toolName || '',
            result: msg.content,
          },
        ],
      };
  }
}

/**
 * Create message conversion function configured for specific provider
 */
export function createMessageConverter(provider: string) {
  const providerOptions: MessageConversionOptions = getProviderOptions(provider);
  
  return (messages: ChatMessage[]) => convertToAIMessages(messages, providerOptions);
}

/**
 * Get provider-specific message conversion options
 */
function getProviderOptions(provider: string): MessageConversionOptions {
  switch (provider.toLowerCase()) {
    case 'anthropic':
      return {
        systemMessageStrategy: 'single',
        supportsMultimodal: true,
        supportsTools: true,
        provider: 'anthropic'
      };
    
    case 'openai':
      return {
        systemMessageStrategy: 'multiple',
        supportsMultimodal: true,
        supportsTools: true,
        provider: 'openai'
      };
    
    case 'groq':
      return {
        systemMessageStrategy: 'multiple',
        supportsMultimodal: false,
        supportsTools: true,
        provider: 'groq'
      };
    
    case 'xai':
    case 'grok':
      return {
        systemMessageStrategy: 'multiple',
        supportsMultimodal: false,
        supportsTools: true,
        provider: 'xai'
      };
    
    case 'google':
    case 'gemini':
      return {
        systemMessageStrategy: 'first-only',
        supportsMultimodal: true,
        supportsTools: true,
        provider: 'google'
      };
    
    case 'mistral':
      return {
        systemMessageStrategy: 'multiple',
        supportsMultimodal: false,
        supportsTools: true,
        provider: 'mistral'
      };
    
    case 'cohere':
      return {
        systemMessageStrategy: 'multiple',
        supportsMultimodal: false,
        supportsTools: true,
        provider: 'cohere'
      };
    
    default:
      return {
        systemMessageStrategy: 'multiple',
        supportsMultimodal: true,
        supportsTools: true,
        provider: 'openai'
      };
  }
}