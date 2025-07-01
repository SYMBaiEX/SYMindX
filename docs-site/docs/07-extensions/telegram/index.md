---
sidebar_position: 1
title: "Telegram Extension"
description: "Telegram bot integration"
---

# Telegram Extension

Telegram bot integration

## Telegram Extension

Connect SYMindX agents to Telegram for chat interactions.

### Setup

1. **Create a Bot**
   - Talk to [@BotFather](https://t.me/botfather)
   - Create new bot: 
   - Get your bot token

2. **Configure Extension**
   ```json
   {
     "extensions": {
       "telegram": {
         "enabled": true,
         "token": "YOUR_BOT_TOKEN",
         "agents": {
           "nyx": {
             "username": "@nyx_bot",
             "commands": ["hack", "analyze", "secure"]
           }
         }
       }
     }
   }
   ```

3. **Environment Variable**
   ```bash
   TELEGRAM_BOT_TOKEN=your-bot-token
   ```

### Features

#### Basic Commands
```typescript
// Register commands
telegram.command('start', async (ctx) => {
  await ctx.reply('Welcome! I am ' + agent.name);
});

telegram.command('help', async (ctx) => {
  await ctx.reply(agent.getHelpText());
});
```

#### Message Handling
```typescript
// Text messages
telegram.on('text', async (ctx) => {
  const response = await agent.think(ctx.message.text);
  await ctx.reply(response);
});

// Media handling
telegram.on('photo', async (ctx) => {
  const photo = ctx.message.photo;
  const analysis = await agent.analyzeImage(photo);
  await ctx.reply(analysis);
});
```

#### Inline Queries
```typescript
// Inline bot mode
telegram.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query;
  const results = await agent.search(query);
  
  await ctx.answerInlineQuery(results.map(r => ({
    type: 'article',
    id: r.id,
    title: r.title,
    description: r.description,
    input_message_content: {
      message_text: r.content
    }
  })));
});
```

### Advanced Features

#### Conversations
```typescript
// Multi-step conversations
const conversation = new Conversation('setup');

conversation.step('name', async (ctx) => {
  await ctx.reply('What is your name?');
  return ctx.next();
});

conversation.step('preferences', async (ctx) => {
  const name = ctx.message.text;
  await agent.remember({ userName: name });
  await ctx.reply(`Nice to meet you, ${name}!`);
});
```

#### Keyboards
```typescript
// Inline keyboard
await ctx.reply('Choose an option:', {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '🎯 Analyze', callback_data: 'analyze' },
        { text: '🔒 Secure', callback_data: 'secure' }
      ],
      [
        { text: '💡 Suggest', callback_data: 'suggest' }
      ]
    ]
  }
});

// Handle callbacks
telegram.on('callback_query', async (ctx) => {
  const action = ctx.callbackQuery.data;
  await agent.perform(action);
  await ctx.answerCbQuery('Processing...');
});
```

### Group Chat Support

```typescript
// Group commands
telegram.command('summon', async (ctx) => {
  if (ctx.chat.type === 'group') {
    await agent.joinConversation(ctx.chat.id);
    await ctx.reply('I have joined the conversation!');
  }
});

// Mention handling
telegram.on('mention', async (ctx) => {
  const mentioned = ctx.message.entities.find(
    e => e.type === 'mention'
  );
  if (mentioned.text === '@' + bot.username) {
    await agent.respond(ctx);
  }
});
```
