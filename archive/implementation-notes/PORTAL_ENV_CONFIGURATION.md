# Complete Portal Environment Configuration

All portals in SYMindX can be controlled via `.env` file. Here's the complete list:

## Portal Enable/Disable Toggles

```bash
# Portal Toggles (true/false)
GROQ_ENABLED=true
OPENAI_CHAT_ENABLED=true
OPENAI_EMBEDDINGS_ENABLED=true
OPENAI_IMAGE_ENABLED=true
ANTHROPIC_ENABLED=false
XAI_ENABLED=false
OLLAMA_ENABLED=false
OPENROUTER_ENABLED=false
KLUSTERAI_ENABLED=false
GOOGLE_ENABLED=false
MISTRAL_ENABLED=false
COHERE_ENABLED=false
AZURE_OPENAI_ENABLED=false
```

## API Keys & Configuration

```bash
# Groq
GROQ_API_KEY=your-groq-key
GROQ_MODEL=llama-3.3-70b-versatile

# OpenAI
OPENAI_API_KEY=your-openai-key
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
OPENAI_IMAGE_MODEL=dall-e-3

# Anthropic
ANTHROPIC_API_KEY=your-anthropic-key
ANTHROPIC_MODEL=claude-3-haiku-20240307

# xAI (Grok)
XAI_API_KEY=your-xai-key
XAI_MODEL=grok-beta

# Ollama (Local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# OpenRouter (Access multiple models)
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct

# Kluster.ai
KLUSTERAI_API_KEY=your-klusterai-key
KLUSTERAI_MODEL=mixtral-8x7b

# Google (Gemini)
GOOGLE_API_KEY=your-google-key
GOOGLE_MODEL=gemini-pro

# Mistral
MISTRAL_API_KEY=your-mistral-key
MISTRAL_MODEL=mistral-medium

# Cohere
COHERE_API_KEY=your-cohere-key
COHERE_MODEL=command

# Azure OpenAI
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
```

## How It Works

1. **Portal Detection**: The system checks for both the toggle AND the API key
2. **Capability-Specific**: Some portals (like OpenAI) have capability-specific toggles
3. **Fallback Logic**: If a portal is disabled, the system falls back to the next available

## Examples

### Use Only Groq
```bash
GROQ_ENABLED=true
OPENAI_CHAT_ENABLED=false
ANTHROPIC_ENABLED=false
# ... all others false
```

### Use Anthropic for Chat, OpenAI for Embeddings
```bash
GROQ_ENABLED=false
OPENAI_CHAT_ENABLED=false
OPENAI_EMBEDDINGS_ENABLED=true
ANTHROPIC_ENABLED=true
```

### Local-Only Setup
```bash
OLLAMA_ENABLED=true
# All cloud providers disabled
```

### Multi-Provider Setup
```bash
# Enable multiple providers
GROQ_ENABLED=true
OPENAI_CHAT_ENABLED=true
ANTHROPIC_ENABLED=true

# Agent config determines which is primary
```

## Portal Capabilities

| Portal | Chat | Embeddings | Images | Streaming | Function Calling |
|--------|------|------------|--------|-----------|------------------|
| Groq | ✓ | ✗ | ✗ | ✓ | ✓ |
| OpenAI | ✓ | ✓ | ✓ | ✓ | ✓ |
| Anthropic | ✓ | ✗ | ✗ | ✓ | ✓ |
| xAI | ✓ | ✗ | ✗ | ✓ | ✗ |
| Ollama | ✓ | ✓ | ✗ | ✓ | ✗ |
| Google | ✓ | ✓ | ✓ | ✓ | ✓ |
| Mistral | ✓ | ✓ | ✗ | ✓ | ✓ |
| Cohere | ✓ | ✓ | ✗ | ✓ | ✗ |
| Azure OpenAI | ✓ | ✓ | ✓ | ✓ | ✓ |
| OpenRouter | ✓ | ✗ | ✗ | ✓ | ✗ |
| Kluster.ai | ✓ | ✗ | ✗ | ✓ | ✗ |

## Priority Order

When multiple portals are enabled, the system uses:
1. Character file `primary: true` portal
2. First enabled portal with required capability
3. Environment variable priority order