# SYMindX Configuration Guide

## Intelligent Model Selection

SYMindX now features intelligent model selection that automatically chooses the most appropriate model based on the use case. This ensures optimal performance and cost-efficiency by using faster models for tool operations and more capable models for complex conversations.

## Granular Model Control

SYMindX supports granular model control for each AI portal, allowing you to specify different models for different capabilities within the same provider.

### Environment Variables

Each portal supports four types of models:

- `{PORTAL}_CHAT_MODEL` - Model for chat/text generation
- `{PORTAL}_EMBEDDING_MODEL` - Model for embeddings
- `{PORTAL}_IMAGE_MODEL` - Model for image generation
- `{PORTAL}_TOOL_MODEL` - Model for function/tool calling

### Example Configuration

```bash
# OpenAI - Use different models for different tasks
OPENAI_CHAT_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
OPENAI_IMAGE_MODEL=dall-e-3
OPENAI_TOOL_MODEL=gpt-4o

# Groq - Fast inference
GROQ_CHAT_MODEL=mixtral-8x7b-32768
GROQ_TOOL_MODEL=llama-3.1-70b-versatile

# Anthropic
ANTHROPIC_CHAT_MODEL=claude-3-opus-20240229
ANTHROPIC_TOOL_MODEL=claude-3-sonnet-20240229

# Local Ollama
OLLAMA_CHAT_MODEL=llama3.1:70b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_TOOL_MODEL=llama3.1:70b
```

### Character Configuration

In your character JSON files, you can specify different portals for different capabilities:

```json
{
  "portals": [
    {
      "name": "primary-chat",
      "type": "openai",
      "capabilities": ["chat_generation", "tool_calling"],
      "config": {
        "chatModel": "gpt-4o",
        "toolModel": "gpt-4o"
      }
    },
    {
      "name": "embeddings",
      "type": "openai",
      "capabilities": ["embedding_generation"],
      "config": {
        "embeddingModel": "text-embedding-3-large"
      }
    },
    {
      "name": "fast-chat",
      "type": "groq",
      "capabilities": ["chat_generation"],
      "config": {
        "chatModel": "mixtral-8x7b-32768"
      }
    }
  ]
}
```

### Supported Models by Provider

#### OpenAI
- **Chat**: gpt-4o, gpt-4.1-mini, gpt-4-turbo, gpt-3.5-turbo
- **Embeddings**: text-embedding-3-large, text-embedding-3-small, text-embedding-ada-002
- **Images**: dall-e-3, dall-e-2
- **Tools**: Same as chat models

#### Anthropic
- **Chat**: claude-3-opus-20240229, claude-3-sonnet-20240229, claude-3-haiku-20240307
- **Tools**: Same as chat models
- **Note**: No embedding or image support

#### Groq
- **Chat**: llama-3.1-70b-versatile, mixtral-8x7b-32768, llama-3.1-8b-instant
- **Tools**: Same as chat models
- **Note**: No embedding or image support

#### Google (Gemini)
- **Chat**: gemini-pro, gemini-pro-1.5
- **Embeddings**: embedding-001
- **Images**: gemini-pro-vision
- **Tools**: Same as chat models

#### Ollama (Local)
- **Chat**: Any model you have pulled locally
- **Embeddings**: nomic-embed-text, all-minilm, etc.
- **Tools**: Same as chat models
- **Note**: No native image generation

### Backward Compatibility

The system maintains backward compatibility with legacy model settings:

- `GROQ_MODEL` → Falls back to this if `GROQ_CHAT_MODEL` not set
- `ANTHROPIC_MODEL` → Falls back to this if `ANTHROPIC_CHAT_MODEL` not set
- `OLLAMA_MODEL` → Falls back to this if `OLLAMA_CHAT_MODEL` not set

### Intelligent Model Selection

The OpenAI portal (and other compatible portals) now automatically selects the appropriate model based on the context:

1. **Tool/Function Calling**: When functions are provided in the request, the portal automatically uses the `toolModel` for faster, more cost-effective execution
2. **Regular Chat**: For standard conversations without tools, it uses the `chatModel`
3. **Embeddings**: Always uses the specialized `embeddingModel`
4. **Image Generation**: Uses the `imageModel` for DALL-E requests

This happens automatically - you don't need to specify the model in each request.

### Using Tool Interactions

For quick automation tasks, use the `executeToolInteraction` helper:

```typescript
import { executeToolInteraction } from './portals/integration.js'

// The portal will automatically use the tool model
const result = await executeToolInteraction(portal, messages, {
  functions: [{
    name: 'get_weather',
    description: 'Get current weather',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string' }
      }
    }
  }]
})
```

### Best Practices

1. **Configure Model Hierarchy**: Set up your models from fastest to most capable
   - `toolModel`: Fast model for function calling (e.g., gpt-4.1-mini)
   - `chatModel`: Balanced model for conversations (e.g., gpt-4.1-mini or gpt-4o)
   - `model`: Fallback general-purpose model

2. **Use specialized models**: Different tasks benefit from different models
   - Use larger models for complex reasoning (chat/tools)
   - Use optimized embedding models for vector search
   - Use specialized image models for generation

3. **Cost optimization**: The intelligent selection helps reduce costs
   - Tool operations use cheaper, faster models automatically
   - Complex conversations can use more capable models
   - No need to manually switch models

4. **Capability matching**: Ensure models support required capabilities
   - Not all providers support all capabilities
   - Check provider documentation for model capabilities

5. **Testing**: Test different model combinations
   - Performance varies by use case
   - Monitor costs and latency
   - Use the `getRecommendedModelConfig` helper for suggestions