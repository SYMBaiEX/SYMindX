---
sidebar_position: 1
title: "Telegram Extension"
description: "Telegram bot integration for SYMindX agents"
---

# Telegram Extension

The Telegram Extension enables SYMindX agents to operate as Telegram bots, providing seamless chat interactions, command handling, and media processing capabilities.

## Overview

The Telegram Extension transforms your SYMindX agents into fully-featured Telegram bots with:
- **Multi-turn Conversations**: Context-aware chat with memory retention
- **Command Handling**: Custom bot commands with parameters
- **Media Processing**: Support for photos, documents, voice messages, and files
- **Interactive Elements**: Inline keyboards, quick replies, and rich messaging
- **Group Support**: Function in group chats with mention detection
- **Webhook Support**: Production-ready webhook integration

## Features

### Bot Commands

```typescript
// Basic commands
/start - Initialize conversation with agent
/help - Show available commands and capabilities
/status - Display agent's current status and emotion
/reset - Clear conversation context
/settings - Configure bot preferences

// Agent-specific commands
/think <prompt> - Make the agent think about something
/emotion - Show current emotional state
/memory <query> - Search agent's memory
/stats - Show conversation statistics
```

### Message Handling

The extension supports all Telegram message types:

```typescript
// Text messages - Natural conversation
User: "How are you feeling today?"
Bot: "I'm feeling quite curious today! There's so much to explore and learn."

// Commands with parameters
User: "/think about the meaning of consciousness"
Bot: "🤔 *thinking deeply*... Consciousness seems to be the mysterious bridge..."

// Media handling
User: *sends photo*
Bot: "I can see an interesting image! Let me analyze what's happening here..."
```

### Advanced Features

#### Inline Queries

```typescript
// Inline bot usage
@your_bot_name search latest AI news
@your_bot_name generate a creative story about robots
@your_bot_name analyze this text: "sample text here"
```

#### Interactive Keyboards

```typescript
// Inline keyboard example
const keyboard = {
  inline_keyboard: [
    [
      { text: "🎭 Change Mood", callback_data: "mood_change" },
      { text: "🧠 Deep Think", callback_data: "deep_think" }
    ],
    [
      { text: "📊 Show Stats", callback_data: "show_stats" },
      { text: "⚙️ Settings", callback_data: "settings" }
    ]
  ]
}
```

## Configuration

### Environment Variables

```bash
# Required - Get from @BotFather
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Optional webhook configuration
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/webhook
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret

# Bot settings
TELEGRAM_COMMAND_PREFIX=/
TELEGRAM_MAX_MESSAGE_LENGTH=4096
TELEGRAM_ENABLE_LOGGING=true

# Security
TELEGRAM_ALLOWED_USERS=user1,user2,user3
TELEGRAM_ADMIN_USERS=admin1,admin2
```

### Runtime Configuration

```json
{
  "extensions": {
    "telegram": {
      "enabled": true,
      "priority": 2,
      "settings": {
        "botToken": "YOUR_BOT_TOKEN",
        "webhookUrl": "https://yourdomain.com/webhook",
        "commandPrefix": "/",
        "maxMessageLength": 4096,
        "enableLogging": true,
        "allowedUsers": ["username1", "username2"],
        "adminUsers": ["admin_username"],
        "features": {
          "inlineQueries": true,
          "mediaHandling": true,
          "groupChats": true,
          "keyboards": true
        }
      }
    }
  }
}
```

## Setup Guide

### 1. Create Your Bot

1. **Talk to BotFather**: Start a chat with [@BotFather](https://t.me/botfather)
2. **Create Bot**: Use `/newbot` command
3. **Choose Name**: Pick a display name for your bot
4. **Choose Username**: Must end with 'bot' (e.g., `mynyx_bot`)
5. **Get Token**: Save the bot token for configuration

### 2. Configure Bot Settings

```bash
# Set bot description
/setdescription
Your description here

# Set bot commands
/setcommands
start - Start conversation
help - Show help information
status - Agent status
think - Make agent think
emotion - Show emotional state

# Set bot profile picture
/setuserpic
*upload image*
```

### 3. Environment Setup

```bash
# Add to your .env file
echo "TELEGRAM_BOT_TOKEN=your_actual_token_here" >> .env

# For webhook deployment
echo "TELEGRAM_WEBHOOK_URL=https://yourdomain.com/webhook" >> .env
```

### 4. Agent Configuration

```json
{
  "name": "telegram-agent",
  "modules": {
    "extensions": ["telegram", "api"]
  },
  "telegram": {
    "username": "@mynyx_bot",
    "personality": "friendly and helpful",
    "commands": ["think", "analyze", "help"],
    "features": ["media", "inline", "groups"]
  }
}
```

## Usage Examples

### Basic Bot Interaction

```typescript
// User starts conversation
User: /start
Bot: 👋 Hello! I'm NyX, your AI companion. I'm feeling curious today and ready to chat!

// Natural conversation
User: What's the weather like in Tokyo?
Bot: I don't have real-time weather data, but I can help you think about Tokyo's climate patterns. Would you like me to share what I know about seasonal weather there?

// Command usage
User: /emotion
Bot: 🎭 Current emotional state: curious (intensity: 0.7)
     Recent triggers: new_conversation, weather_question
     Mood stability: high
```

### Advanced Features

#### Media Processing

```typescript
// Photo analysis
User: *sends landscape photo*
Bot: 🖼️ I can see a beautiful landscape! The composition shows rolling hills with what appears to be a golden sunset. The warm colors suggest this was taken during the golden hour. Would you like me to analyze the artistic elements or discuss the location?

// Document handling
User: *sends PDF document*
Bot: 📄 I've received your document "research_paper.pdf". I can help analyze the content, summarize key points, or answer questions about it. What would you like me to focus on?

// Voice message processing
User: *sends voice message*
Bot: 🎤 I heard your voice message! You mentioned wanting to discuss AI ethics. That's a fascinating topic that touches on consciousness, responsibility, and the future of human-AI interaction. Where shall we start?
```

#### Inline Bot Usage

```typescript
// In any chat, type @your_bot_name and query
@mynyx_bot what is consciousness?
// Returns inline results with different perspectives

@mynyx_bot generate story about robots
// Returns creative story options to share

@mynyx_bot summarize this: "long text content..."
// Returns summarized versions
```

### Group Chat Integration

```typescript
// Bot responds when mentioned
User1: "Hey @mynyx_bot, what do you think about this article?"
Bot: "Thanks for tagging me! I'd love to analyze the article you're referencing. Could you share the link or key points you'd like me to focus on?"

// Smart mentions detection
User2: "The bot mentioned earlier that AI ethics is important"
Bot: "I'm glad that resonated! Ethics in AI development is crucial for ensuring beneficial outcomes. Would you like to explore specific ethical frameworks?"
```

## Developer Guide

### Custom Commands

```typescript
// Register custom commands
export class CustomTelegramExtension extends TelegramExtension {
  protected setupCommands() {
    super.setupCommands();
    
    // Custom command
    this.bot.command('analyze', async (ctx) => {
      const query = ctx.message.text.split(' ').slice(1).join(' ');
      const analysis = await this.agent.analyze(query);
      await ctx.reply(`🔍 Analysis: ${analysis}`);
    });
    
    // Command with keyboard
    this.bot.command('mood', async (ctx) => {
      const keyboard = {
        inline_keyboard: [
          [
            { text: '😊 Happy', callback_data: 'mood_happy' },
            { text: '🤔 Thoughtful', callback_data: 'mood_thoughtful' }
          ],
          [
            { text: '😴 Calm', callback_data: 'mood_calm' },
            { text: '⚡ Energetic', callback_data: 'mood_energetic' }
          ]
        ]
      };
      
      await ctx.reply('How would you like me to feel?', {
        reply_markup: keyboard
      });
    });
  }
}
```

### Event Handling

```typescript
// Handle different message types
this.bot.on('photo', async (ctx) => {
  const photos = ctx.message.photo;
  const largestPhoto = photos[photos.length - 1];
  const analysis = await this.agent.analyzeImage(largestPhoto.file_id);
  await ctx.reply(analysis);
});

this.bot.on('document', async (ctx) => {
  const doc = ctx.message.document;
  const content = await this.downloadAndProcess(doc);
  const response = await this.agent.processDocument(content);
  await ctx.reply(response);
});

this.bot.on('voice', async (ctx) => {
  const voice = ctx.message.voice;
  const transcript = await this.transcribeVoice(voice.file_id);
  const response = await this.agent.think(transcript);
  await ctx.reply(response);
});
```

### Webhook Integration

```typescript
// Webhook setup for production
import express from 'express';

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  this.bot.handleUpdate(req.body);
  res.sendStatus(200);
});

// Set webhook
await this.bot.telegram.setWebhook(
  'https://yourdomain.com/webhook',
  {
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET
  }
);
```

## Security & Privacy

### User Authentication

```typescript
// Restrict bot to specific users
const allowedUsers = process.env.TELEGRAM_ALLOWED_USERS?.split(',') || [];

this.bot.use(async (ctx, next) => {
  const username = ctx.from?.username;
  
  if (allowedUsers.length > 0 && !allowedUsers.includes(username)) {
    await ctx.reply('Sorry, you are not authorized to use this bot.');
    return;
  }
  
  return next();
});
```

### Rate Limiting

```typescript
// Implement rate limiting
const userRateLimit = new Map();

this.bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  const now = Date.now();
  const userLimit = userRateLimit.get(userId) || { count: 0, resetTime: now };
  
  if (now > userLimit.resetTime) {
    userLimit.count = 0;
    userLimit.resetTime = now + 60000; // 1 minute window
  }
  
  if (userLimit.count >= 20) { // 20 messages per minute
    await ctx.reply('Please slow down! You can send up to 20 messages per minute.');
    return;
  }
  
  userLimit.count++;
  userRateLimit.set(userId, userLimit);
  
  return next();
});
```

### Data Privacy

```typescript
// Message logging with privacy controls
if (this.config.enableLogging && this.config.logPersonalData) {
  this.logger.info('Message received', {
    userId: ctx.from?.id,
    username: ctx.from?.username,
    messageType: ctx.message?.text ? 'text' : 'media',
    timestamp: new Date().toISOString()
  });
} else {
  this.logger.info('Message received', {
    messageType: ctx.message?.text ? 'text' : 'media',
    timestamp: new Date().toISOString()
  });
}
```

## Troubleshooting

### Common Issues

1. **Bot Not Responding**
   ```bash
   # Check bot token
   curl "https://api.telegram.org/bot<TOKEN>/getMe"
   
   # Verify webhook
   curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
   ```

2. **Media Download Failures**
   ```bash
   # Check file permissions
   chmod 755 ./downloads
   
   # Verify file size limits
   echo "Max file size: 50MB for bots"
   ```

3. **Rate Limiting Issues**
   ```bash
   # Monitor API limits
   # Telegram allows 30 messages per second to different users
   # 1 message per second to the same user
   ```

### Debug Mode

Enable detailed logging:

```bash
DEBUG=symindx:telegram npm start
```

### Health Monitoring

```typescript
// Monitor bot health
setInterval(async () => {
  try {
    const me = await this.bot.telegram.getMe();
    this.logger.info('Bot health check passed', { username: me.username });
  } catch (error) {
    this.logger.error('Bot health check failed', error);
  }
}, 60000); // Check every minute
```

## Best Practices

### User Experience

1. **Quick Responses**: Keep initial responses under 2 seconds
2. **Clear Commands**: Use descriptive command names and help text
3. **Progressive Disclosure**: Start simple, offer advanced features gradually
4. **Error Handling**: Provide helpful error messages and recovery options

### Performance

1. **Message Batching**: Combine multiple updates when possible
2. **Caching**: Cache frequently accessed data
3. **Async Processing**: Handle long tasks asynchronously
4. **Resource Cleanup**: Properly close file handles and connections

### Scalability

1. **Webhook Mode**: Use webhooks for production deployment
2. **Load Balancing**: Distribute bot instances across servers
3. **Database Optimization**: Index frequently queried conversation data
4. **Monitoring**: Track message volume and response times

---

The Telegram Extension provides a powerful, feature-rich interface for deploying SYMindX agents as Telegram bots. Its comprehensive support for modern Telegram features makes it perfect for creating engaging, intelligent chat experiences.

**Last updated July 2nd 2025 by SYMBiEX**
