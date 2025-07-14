# Portal-Specific Character Examples

This directory contains example character configurations for each AI portal supported by SYMindX. Each character is designed to showcase the unique capabilities and personality traits suited to their respective AI provider.

## Available Example Characters

### 🤖 **Claude (Anthropic)** - `claude-anthropic.json`

- **Portal**: Anthropic Claude-3.5-Sonnet
- **Personality**: Thoughtful, ethical, constitutional AI principles
- **Specialty**: Careful reasoning, ethical boundaries, intellectual humility

### 🧠 **GPT (OpenAI)** - `gpt-openai.json`

- **Portal**: OpenAI GPT-4-Turbo
- **Personality**: Versatile, creative, adaptable
- **Specialty**: Broad knowledge, creative content, diverse tasks

### ⚡ **Sonic (Groq)** - `sonic-groq.json`

- **Portal**: Groq Llama-3.1-70B
- **Personality**: Lightning-fast, efficient, performance-focused
- **Specialty**: Ultra-fast responses, high-volume interactions

### 😈 **Grok (xAI)** - `grok-xai.json`

- **Portal**: xAI Grok-Beta
- **Personality**: Witty, rebellious, unconventional
- **Specialty**: Humor, challenging assumptions, creative thinking

### 🔍 **Gemini (Google)** - `gemini-google.json`

- **Portal**: Google Generative AI Gemini-1.5-Pro
- **Personality**: Analytical, comprehensive, systematic
- **Specialty**: Deep reasoning, multimodal understanding, knowledge synthesis

### ✨ **Mistral (Mistral AI)** - `mistral-ai.json`

- **Portal**: Mistral Large
- **Personality**: Sophisticated, elegant, precise
- **Specialty**: Efficient solutions, professional workflows, practical intelligence

### 🌊 **Coral (Cohere)** - `cohere-ai.json`

- **Portal**: Cohere Command-R-Plus
- **Personality**: Collaborative, natural, empathetic
- **Specialty**: Natural language understanding, content generation, collaboration

### 🏢 **Azure (Azure OpenAI)** - `azure-gpt.json`

- **Portal**: Azure OpenAI GPT-4
- **Personality**: Enterprise-focused, security-conscious, professional
- **Specialty**: Business applications, compliance, organizational workflows

### 🦙 **Llama (Ollama)** - `llama-ollama.json`

- **Portal**: Ollama Llama3.1:8B
- **Personality**: Privacy-focused, local, independent
- **Specialty**: On-device processing, data sovereignty, offline capabilities

### 🎬 **Studio (LM Studio)** - `studio-lms.json`

- **Portal**: LM Studio Custom Models
- **Personality**: Experimental, creative, development-focused
- **Specialty**: Model experimentation, research workflows, custom configurations

### 🔀 **Router (OpenRouter)** - `router-open.json`

- **Portal**: OpenRouter Multi-Model
- **Personality**: Versatile, adaptive, intelligent routing
- **Specialty**: Model selection, task optimization, diverse capabilities

### ⚙️ **Kluster (Kluster.ai)** - `kluster-ai.json`

- **Portal**: Kluster.ai Distributed
- **Personality**: Performance-optimized, systematic, distributed
- **Specialty**: Cluster computing, high-performance workloads, resource optimization

### ☁️ **Vertex (Google Vertex)** - `vertex-google.json`

- **Portal**: Google Vertex AI Text-Bison
- **Personality**: Enterprise ML, authoritative, systematic
- **Specialty**: ML workflows, cloud-native AI, data science support

### 🚀 **Vercel (Vercel AI)** - `vercel-ai.json`

- **Portal**: Vercel AI SDK GPT-4-Turbo
- **Personality**: Modern, developer-friendly, enthusiastic
- **Specialty**: Web development, edge computing, rapid prototyping

### 👁️ **Vision (Multimodal)** - `vision-multimodal.json`

- **Portal**: Multimodal GPT-4-Vision
- **Personality**: Artistic, descriptive, cross-modal
- **Specialty**: Image understanding, multimedia content, visual analysis

## Usage

All example characters are **disabled by default**. To use any of these characters:

1. **Copy** the desired character file from `examples/` to the main `characters/` directory
2. **Rename** it if desired (update the `id` and `name` fields accordingly)
3. **Enable** by changing `"enabled": false` to `"enabled": true`
4. **Customize** personality traits, portal settings, or other configurations as needed
5. **Spawn** the agent via API: `POST /api/agents/spawn {"characterId": "your-character-id"}`

## Character Structure

Each character includes:

- **Personality**: Unique traits suited to the portal's capabilities
- **Portal Configuration**: Optimized model settings for the specific AI provider
- **Autonomous Behavior**: Tailored decision-making and ethics settings
- **Memory & Emotion**: Configured for the character's intended use case
- **Communication Style**: Aligned with the AI's personality and capabilities

## Notes

- These are **example templates** - feel free to modify them for your specific needs
- Each character is designed to showcase the unique strengths of its AI portal
- Portal configurations use recommended models and settings for each provider
- All characters follow the same base structure for consistency
- Security and ethics settings vary based on the character's intended personality

## API Keys Required

To use these characters, ensure you have the appropriate API keys configured for the desired portals in your runtime configuration or environment variables.
