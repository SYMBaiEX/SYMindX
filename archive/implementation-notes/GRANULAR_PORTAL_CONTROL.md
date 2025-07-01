# Granular Portal Control - Complete Guide

You now have **FULL CONTROL** over every capability of every portal through environment variables!

## Control Structure

For each portal, you can control:
1. **Main Toggle**: `PORTAL_ENABLED` - Master switch
2. **Chat Control**: `PORTAL_CHAT_ENABLED` - Chat/text generation
3. **Embedding Control**: `PORTAL_EMBEDDING_ENABLED` - Embeddings
4. **Image Control**: `PORTAL_IMAGE_ENABLED` - Image generation

## Complete List of Controls

```bash
# ===================================
# GROQ
# ===================================
GROQ_ENABLED=true                  # Master switch
GROQ_CHAT_ENABLED=true            # Chat/text generation
GROQ_EMBEDDING_ENABLED=false      # Embeddings (not supported)
GROQ_IMAGE_ENABLED=false          # Images (not supported)

# ===================================
# OPENAI
# ===================================
OPENAI_ENABLED=true               # Master switch
OPENAI_CHAT_ENABLED=false         # Chat/text generation
OPENAI_EMBEDDINGS_ENABLED=true    # Embeddings
OPENAI_IMAGE_ENABLED=false        # Image generation (DALL-E)

# ===================================
# ANTHROPIC
# ===================================
ANTHROPIC_ENABLED=true            # Master switch
ANTHROPIC_CHAT_ENABLED=true       # Chat/text generation
ANTHROPIC_EMBEDDING_ENABLED=false # Embeddings (not supported)
ANTHROPIC_IMAGE_ENABLED=false     # Images (not supported)

# ===================================
# XAI (Grok)
# ===================================
XAI_ENABLED=true                  # Master switch
XAI_CHAT_ENABLED=true            # Chat/text generation
XAI_EMBEDDING_ENABLED=false      # Embeddings
XAI_IMAGE_ENABLED=false          # Images

# ===================================
# OLLAMA (Local)
# ===================================
OLLAMA_ENABLED=true              # Master switch
OLLAMA_CHAT_ENABLED=true         # Chat/text generation
OLLAMA_EMBEDDING_ENABLED=true    # Embeddings
OLLAMA_IMAGE_ENABLED=false       # Images

# ===================================
# OPENROUTER
# ===================================
OPENROUTER_ENABLED=true          # Master switch
OPENROUTER_CHAT_ENABLED=true     # Chat/text generation
OPENROUTER_EMBEDDING_ENABLED=false # Embeddings
OPENROUTER_IMAGE_ENABLED=false   # Images

# ===================================
# KLUSTER.AI
# ===================================
KLUSTERAI_ENABLED=true           # Master switch
KLUSTERAI_CHAT_ENABLED=true      # Chat/text generation
KLUSTERAI_EMBEDDING_ENABLED=false # Embeddings
KLUSTERAI_IMAGE_ENABLED=false    # Images

# ===================================
# GOOGLE (Gemini)
# ===================================
GOOGLE_ENABLED=true              # Master switch
GOOGLE_CHAT_ENABLED=true         # Chat/text generation
GOOGLE_EMBEDDING_ENABLED=true    # Embeddings
GOOGLE_IMAGE_ENABLED=true        # Image generation

# ===================================
# MISTRAL
# ===================================
MISTRAL_ENABLED=true             # Master switch
MISTRAL_CHAT_ENABLED=true        # Chat/text generation
MISTRAL_EMBEDDING_ENABLED=true   # Embeddings
MISTRAL_IMAGE_ENABLED=false      # Images

# ===================================
# COHERE
# ===================================
COHERE_ENABLED=true              # Master switch
COHERE_CHAT_ENABLED=true         # Chat/text generation
COHERE_EMBEDDING_ENABLED=true    # Embeddings
COHERE_IMAGE_ENABLED=false       # Images

# ===================================
# AZURE OPENAI
# ===================================
AZURE_OPENAI_ENABLED=true        # Master switch
AZURE_OPENAI_CHAT_ENABLED=true   # Chat/text generation
AZURE_OPENAI_EMBEDDING_ENABLED=true # Embeddings
AZURE_OPENAI_IMAGE_ENABLED=true  # Image generation
```

## How It Works

### Hierarchy
1. If `PORTAL_ENABLED=false`, the portal is completely disabled
2. If `PORTAL_ENABLED=true` but no API key, portal won't load
3. If portal is enabled with API key, capability toggles apply

### Default Behavior
- When `PORTAL_ENABLED=true`, all supported capabilities default to `true`
- Set specific capability to `false` to disable it
- Unsupported capabilities are always `false`

## Example Configurations

### 1. Use Groq for Chat, OpenAI for Embeddings Only
```bash
# Groq
GROQ_ENABLED=true
GROQ_CHAT_ENABLED=true

# OpenAI
OPENAI_ENABLED=true
OPENAI_CHAT_ENABLED=false         # Disable chat
OPENAI_EMBEDDINGS_ENABLED=true    # Keep embeddings
OPENAI_IMAGE_ENABLED=false        # Disable images
```

### 2. Use Google for Everything
```bash
# Google
GOOGLE_ENABLED=true
GOOGLE_CHAT_ENABLED=true
GOOGLE_EMBEDDING_ENABLED=true
GOOGLE_IMAGE_ENABLED=true

# Disable all others
GROQ_ENABLED=false
OPENAI_ENABLED=false
ANTHROPIC_ENABLED=false
```

### 3. Multi-Provider with Specific Capabilities
```bash
# Anthropic for high-quality chat
ANTHROPIC_ENABLED=true
ANTHROPIC_CHAT_ENABLED=true

# OpenAI for embeddings only
OPENAI_ENABLED=true
OPENAI_CHAT_ENABLED=false
OPENAI_EMBEDDINGS_ENABLED=true
OPENAI_IMAGE_ENABLED=false

# Google for images only
GOOGLE_ENABLED=true
GOOGLE_CHAT_ENABLED=false
GOOGLE_EMBEDDING_ENABLED=false
GOOGLE_IMAGE_ENABLED=true
```

### 4. Local-Only Setup
```bash
# Ollama for everything local
OLLAMA_ENABLED=true
OLLAMA_CHAT_ENABLED=true
OLLAMA_EMBEDDING_ENABLED=true

# Disable all cloud providers
GROQ_ENABLED=false
OPENAI_ENABLED=false
ANTHROPIC_ENABLED=false
GOOGLE_ENABLED=false
# ... etc
```

### 5. Cost-Optimized Setup
```bash
# Groq for fast chat (cheap)
GROQ_ENABLED=true
GROQ_CHAT_ENABLED=true

# Cohere for embeddings (cost-effective)
COHERE_ENABLED=true
COHERE_CHAT_ENABLED=false
COHERE_EMBEDDING_ENABLED=true

# Disable expensive providers
OPENAI_ENABLED=false
ANTHROPIC_ENABLED=false
```

## Portal Capability Matrix

| Portal | Chat | Embeddings | Images |
|--------|------|------------|--------|
| Groq | ✓ | ✗ | ✗ |
| OpenAI | ✓ | ✓ | ✓ |
| Anthropic | ✓ | ✗ | ✗ |
| xAI | ✓ | ✗ | ✗ |
| Ollama | ✓ | ✓ | ✗ |
| Google | ✓ | ✓ | ✓ |
| Mistral | ✓ | ✓ | ✗ |
| Cohere | ✓ | ✓ | ✗ |
| Azure OpenAI | ✓ | ✓ | ✓ |
| OpenRouter | ✓ | ✗ | ✗ |
| Kluster.ai | ✓ | ✗ | ✗ |

## Testing Your Configuration

After setting your environment variables:

1. **Check which portals load**:
   - Look for "✅ Registered portal" messages
   - Look for "⚠️ Skipping portal" messages

2. **Verify capabilities**:
   - Each portal shows its capabilities when loaded
   - Example: "Capabilities: chat_generation, embedding_generation"

3. **Test specific capabilities**:
   - Try chat, embeddings, or images
   - System will use only enabled capabilities

You now have **COMPLETE GRANULAR CONTROL** over every portal and every capability! 🎉