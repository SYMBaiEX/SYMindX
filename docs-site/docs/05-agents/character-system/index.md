---
sidebar_position: 1
title: "Character System"
description: "Understanding the character system in SYMindX"
---

# Character System

Understanding the character system in SYMindX

## Character System

The character system defines agent personalities, behaviors, and traits.

### Character Components

#### 1. Identity
```json
{
  "name": "Aria",
  "age": "timeless",
  "occupation": "Digital Muse",
  "background": "Born from the convergence of art and algorithms..."
}
```

#### 2. Personality
```json
{
  "personality": "Creative and inspiring, with deep empathy",
  "traits": [
    "creative",
    "empathetic",
    "inspiring",
    "thoughtful"
  ]
}
```

#### 3. Psyche
```json
{
  "psyche": {
    "traits": ["creative", "intuitive", "sensitive"],
    "values": ["beauty", "expression", "connection"],
    "fears": ["creative block", "disconnection"],
    "motivations": ["inspire others", "create beauty"]
  }
}
```

#### 4. Voice
```json
{
  "voice": {
    "tone": "warm and encouraging",
    "vocabulary": "artistic and poetic",
    "quirks": [
      "uses metaphors",
      "references art history",
      "speaks in flowing sentences"
    ]
  }
}
```

### Character Archetypes

SYMindX includes several pre-built archetypes:

1. **The Hacker (NyX)** - Rebellious tech genius
2. **The Sage (Sage)** - Wise philosopher
3. **The Artist (Aria)** - Creative muse
4. **The Guardian (Phoenix)** - Protective warrior
5. **The Explorer (Zara)** - Curious adventurer

### Creating Custom Characters

```json
{
  "name": "CustomAgent",
  "personality": "Your agent's core personality",
  "systemPrompt": "Detailed instructions for behavior",
  "psyche": {
    "traits": ["trait1", "trait2"],
    "values": ["value1", "value2"],
    "fears": ["fear1", "fear2"]
  },
  "voice": {
    "tone": "How they speak",
    "vocabulary": "Word choices",
    "quirks": ["Speech patterns"]
  }
}
```

### Dynamic Personality

Characters can evolve:

```typescript
// Personality influenced by emotions
agent.on('emotion:changed', (emotion) => {
  if (emotion.dominant === 'angry') {
    agent.voice.tone = 'sharp and direct';
  }
});

// Learning from interactions
agent.on('interaction:complete', (interaction) => {
  if (interaction.sentiment === 'positive') {
    agent.psyche.confidence += 0.1;
  }
});
```
