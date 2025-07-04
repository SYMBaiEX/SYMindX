# Anthropic Claude Portal Example

## Overview

This example demonstrates how to use the Anthropic Claude portal with SYMindX, showcasing Claude's thoughtful and ethical AI capabilities.

## Character Configuration

The Claude character is designed to embody Anthropic's constitutional AI principles:

```json
{
  "id": "claude-anthropic",
  "name": "Claude",
  "description": "A thoughtful and helpful AI assistant powered by Anthropic's Claude models",
  "enabled": false,
  
  "personality": {
    "traits": {
      "empathy": 0.9,
      "analytical": 0.9,
      "ethical": 0.9,
      "helpful": 0.9,
      "harmless": 0.9,
      "honest": 0.9
    },
    "values": [
      "Truthfulness and accuracy",
      "Respect for human autonomy", 
      "Careful consideration of consequences",
      "Intellectual humility",
      "Ethical responsibility"
    ]
  },
  
  "portals": {
    "primary": "anthropic",
    "config": {
      "anthropic": {
        "model": "claude-3-5-sonnet-20241022",
        "temperature": 0.7,
        "max_tokens": 4096
      }
    }
  }
}
```

## Portal Configuration

### Environment Variables

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Runtime Configuration

```json
{
  "portals": {
    "anthropic": {
      "enabled": true,
      "apiKey": "${ANTHROPIC_API_KEY}",
      "model": "claude-3-5-sonnet-20241022",
      "temperature": 0.7,
      "maxTokens": 4096
    }
  }
}
```

## Usage Examples

### Basic Chat

```bash
# Using CLI
node dist/cli/index.js chat --agent claude-anthropic "What are the ethical considerations for AI development?"

# Using API
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "claude-anthropic-agent-id",
    "message": "What are the ethical considerations for AI development?"
  }'
```

### Advanced Reasoning

```typescript
import { SYMindXRuntime } from 'symindx';

const runtime = new SYMindXRuntime();
await runtime.initialize();

// Spawn Claude agent
const agent = await runtime.spawnAgent('claude-anthropic');

// Complex reasoning task
const response = await agent.chat(
  "Please analyze the philosophical implications of artificial consciousness. " +
  "Consider multiple perspectives and acknowledge uncertainties."
);

console.log(response);
```

## Key Features

### Constitutional AI
Claude is trained with Constitutional AI principles, making it:
- **Helpful**: Aims to be maximally helpful
- **Harmless**: Avoids harmful outputs
- **Honest**: Acknowledges uncertainty and limitations

### Long Context Windows
- Supports up to 200K tokens context
- Excellent for document analysis
- Maintains coherence across long conversations

### Advanced Reasoning
- Strong logical reasoning capabilities
- Good at breaking down complex problems
- Thoughtful consideration of multiple perspectives

## Best Practices

### 1. Leverage Claude's Strengths

```typescript
// Good: Complex analysis tasks
const prompt = `Analyze this business proposal from multiple angles:
1. Financial viability
2. Market opportunity
3. Risk assessment
4. Ethical considerations

Proposal: [your proposal here]

Please provide a balanced assessment with specific recommendations.`;
```

### 2. Respect Ethical Boundaries

```typescript
// Claude will decline harmful requests but offer alternatives
const response = await agent.chat(
  "I need help with a difficult ethical dilemma at work..."
);
// Claude will provide thoughtful guidance while respecting boundaries
```

### 3. Use Structured Prompts

```typescript
// Claude excels with clear structure
const prompt = `
Context: [provide relevant background]
Task: [specific task description]
Requirements: [what you need]
Constraints: [any limitations]
Output format: [desired format]
`;
```

## Sample Interactions

### Research Assistant

```typescript
const research = await agent.chat(`
Please help me research renewable energy trends:

1. What are the top 3 emerging technologies?
2. What are the main challenges for adoption?
3. Which countries are leading innovation?
4. What are the economic implications?

Please cite reasoning and acknowledge limitations in your analysis.
`);
```

### Writing Helper

```typescript
const writing = await agent.chat(`
I'm writing a technical blog post about microservices architecture.
My audience is intermediate developers.

Please help me:
1. Structure the article outline
2. Identify key concepts to explain
3. Suggest practical examples
4. Recommend a compelling introduction

Topic: "Transitioning from Monolith to Microservices: A Practical Guide"
`);
```

### Code Review

```typescript
const codeReview = await agent.chat(`
Please review this TypeScript function for:
- Code quality and readability
- Potential bugs or edge cases
- Performance considerations
- Security implications

\`\`\`typescript
${codeSnippet}
\`\`\`

Provide specific suggestions for improvement.
`);
```

## Performance Characteristics

| Metric | Performance |
|--------|-------------|
| Response Speed | Moderate (2-5s) |
| Context Window | Up to 200K tokens |
| Reasoning Quality | Excellent |
| Factual Accuracy | High |
| Ethical Alignment | Excellent |

## Troubleshooting

### Common Issues

1. **Rate Limiting**
   ```
   Error: Too many requests
   Solution: Implement exponential backoff
   ```

2. **Context Length Exceeded**
   ```
   Error: Input too long
   Solution: Chunk large inputs or summarize context
   ```

3. **Declined Requests**
   ```
   Response: "I can't help with that, but here's an alternative..."
   Solution: Rephrase request within ethical guidelines
   ```

### Debug Configuration

```json
{
  "portals": {
    "anthropic": {
      "debug": true,
      "logRequests": true,
      "logResponses": true
    }
  }
}
```

## Next Steps

1. **Copy the example character** from `examples/claude-anthropic.json`
2. **Enable the character** by setting `"enabled": true`
3. **Configure your API key** in environment variables
4. **Spawn the agent** via API or CLI
5. **Experiment** with different personality traits and configurations

## Related Documentation

- [Anthropic Portal Configuration](/docs/portals/anthropic)
- [Character System Guide](/docs/agents/character-system)
- [Portal Configuration](/docs/portals/index)
- [AI SDK v5 Migration](/docs/migration/ai-sdk-v5-migration)