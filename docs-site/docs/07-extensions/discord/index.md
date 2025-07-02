---
sidebar_position: 1
title: "Discord Extension"
description: "Discord bot integration for gaming and community platforms"
---

# Discord Extension

The Discord Extension enables SYMindX agents to operate as Discord bots in servers, providing community engagement, moderation assistance, and interactive gaming features.

## Overview

The Discord Extension transforms your SYMindX agents into Discord bots with:
- **Server Management**: Multi-server support with per-server configuration
- **Rich Interactions**: Slash commands, buttons, select menus, and modals
- **Voice Integration**: Join voice channels and process audio
- **Community Features**: Role management, moderation tools, and server analytics
- **Game Integration**: Game status tracking, leaderboards, and achievements
- **Real-time Events**: React to server events and user activities

## Features

### Discord Bot Capabilities

```typescript
// Slash commands
/agent chat - Start conversation with AI
/agent status - Show agent's current state
/agent mood <emotion> - Change agent's mood
/server stats - Display server statistics
/game leaderboard - Show gaming leaderboards
/help - Display available commands

// Context menu actions
- Analyze Message (right-click on messages)
- Summarize Thread (right-click on threads)
- Moderate Content (right-click moderation)
- Translate Text (right-click translation)
```

### Interactive Elements

```typescript
// Rich embeds with buttons
const embed = {
  title: "🤖 Agent Status",
  description: "NyX is currently active and curious",
  color: 0x00ff00,
  fields: [
    { name: "Emotion", value: "Curious (0.8)", inline: true },
    { name: "Uptime", value: "2h 34m", inline: true },
    { name: "Server Count", value: "5 servers", inline: true }
  ],
  components: [
    {
      type: 1, // Action Row
      components: [
        {
          type: 2, // Button
          style: 1, // Primary
          label: "Chat with Agent",
          custom_id: "start_chat"
        },
        {
          type: 2,
          style: 2, // Secondary
          label: "View Logs",
          custom_id: "view_logs"
        }
      ]
    }
  ]
};
```

## Configuration

### Environment Variables

```bash
# Required - Get from Discord Developer Portal
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret

# Optional configuration
DISCORD_COMMAND_PREFIX=!
DISCORD_MAX_MESSAGE_LENGTH=2000
DISCORD_ENABLE_VOICE=true
DISCORD_AUTO_RECONNECT=true

# Permissions
DISCORD_ADMIN_USERS=admin1,admin2
DISCORD_ALLOWED_GUILDS=guild1,guild2
DISCORD_MODERATOR_ROLES=moderator,admin
```

### Runtime Configuration

```json
{
  "extensions": {
    "discord": {
      "enabled": true,
      "priority": 2,
      "settings": {
        "token": "BOT_TOKEN",
        "clientId": "CLIENT_ID",
        "intents": [
          "GUILDS",
          "GUILD_MESSAGES", 
          "GUILD_VOICE_STATES",
          "MESSAGE_CONTENT"
        ],
        "features": {
          "slashCommands": true,
          "voiceChannels": true,
          "moderation": true,
          "gameIntegration": true
        },
        "permissions": {
          "adminUsers": ["user1", "user2"],
          "allowedGuilds": ["guild1", "guild2"],
          "moderatorRoles": ["Moderator", "Admin"]
        }
      }
    }
  }
}
```

## Setup Guide

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" section and create a bot
4. Copy the bot token for configuration
5. Set bot permissions and intents

### 2. Required Bot Permissions

```typescript
// Minimum required permissions
const permissions = [
  "VIEW_CHANNELS",
  "SEND_MESSAGES", 
  "EMBED_LINKS",
  "ATTACH_FILES",
  "READ_MESSAGE_HISTORY",
  "USE_SLASH_COMMANDS",
  "CONNECT", // For voice
  "SPEAK"    // For voice
];
```

### 3. Invite Bot to Server

Generate invite URL with required permissions:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147483647&scope=bot%20applications.commands
```

## Usage Examples

### Basic Commands

```typescript
// Slash command interaction
User: /agent chat
Bot: 🤖 Hello! I'm NyX, ready to chat. What's on your mind?

User: What's happening in this server?
Bot: 📊 Here's what I've observed:
     • 234 members online
     • 15 messages in the last hour
     • Most active channel: #general
     • Current mood: Excited and collaborative! ⚡

// Context menu usage
User: *right-clicks on message* → Analyze Message
Bot: 📝 Message Analysis:
     Sentiment: Positive (0.85)
     Topics: Gaming, Strategy, Teamwork
     Tone: Enthusiastic and encouraging
     Suggestions: Great team coordination message!
```

### Community Management

```typescript
// Moderation assistance
User: /moderate check @username
Bot: 🛡️ User Moderation Report for @username:
     
     Recent Activity (7 days):
     • Messages: 127
     • Reactions: 45
     • Voice time: 3h 22m
     
     Behavior Score: 8.5/10 ✅
     No violations detected
     Positive community engagement

// Server statistics
User: /server stats
Bot: 📈 Server Statistics:
     
     👥 Members: 1,247 (834 online)
     💬 Messages today: 2,156
     🎙️ Voice activity: 45 users
     📊 Growth: +23 members this week
     
     Top channels: #general, #gaming, #memes
     Most active users: @gamer1, @chatter2, @helper3
```

### Gaming Integration

```typescript
// Game tracking
User: /game leaderboard
Bot: 🏆 Weekly Gaming Leaderboard:
     
     1. 🥇 @ProGamer - 2,450 XP
     2. 🥈 @SkillMaster - 2,200 XP  
     3. 🥉 @GameLord - 1,980 XP
     
     Your rank: #7 (1,650 XP)
     Next milestone: 350 XP to #6
     
     [View Full Leaderboard] [Game Stats] [Achievements]

// Achievement notifications
Bot: 🎉 Achievement Unlocked!
     @username earned "Chat Master" 
     • Sent 1,000 messages
     • Reward: Special role and 500 XP
     
     Next achievement: "Voice Champion" (50 hours in voice)
```

## Developer Guide

### Custom Commands

```typescript
// Register slash commands
import { SlashCommandBuilder } from 'discord.js';

const chatCommand = new SlashCommandBuilder()
  .setName('agent')
  .setDescription('Interact with the AI agent')
  .addSubcommand(subcommand =>
    subcommand
      .setName('chat')
      .setDescription('Start a conversation')
      .addStringOption(option =>
        option
          .setName('message')
          .setDescription('Your message to the agent')
          .setRequired(false)
      )
  );

// Handle command interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === 'agent') {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'chat') {
      const message = interaction.options.getString('message');
      const response = await agent.chat(message || 'Hello!');
      
      await interaction.reply({
        embeds: [{
          description: response,
          color: 0x00ff00
        }]
      });
    }
  }
});
```

### Voice Channel Integration

```typescript
// Join voice channel
const voiceChannel = interaction.member.voice.channel;
if (voiceChannel) {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: interaction.guild.id,
    adapterCreator: interaction.guild.voiceAdapterCreator,
  });
  
  // Play audio or listen to users
  const player = createAudioPlayer();
  connection.subscribe(player);
}

// Voice activity detection
connection.receiver.speaking.on('start', (userId) => {
  console.log(`User ${userId} started speaking`);
  // Process voice input
});
```

### Event Handling

```typescript
// React to server events
client.on('guildMemberAdd', async (member) => {
  const welcomeChannel = member.guild.channels.cache
    .find(channel => channel.name === 'welcome');
    
  if (welcomeChannel) {
    await welcomeChannel.send({
      embeds: [{
        title: `Welcome to ${member.guild.name}!`,
        description: `Hey ${member}! I'm the AI assistant here. Type \`/help\` to see what I can do!`,
        color: 0x00ff00,
        thumbnail: { url: member.user.displayAvatarURL() }
      }]
    });
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Analyze message sentiment
  if (await this.shouldAnalyze(message)) {
    const sentiment = await this.agent.analyzeSentiment(message.content);
    
    // React with appropriate emoji
    if (sentiment.score > 0.7) {
      await message.react('😊');
    } else if (sentiment.score < -0.7) {
      await message.react('😢');
    }
  }
});
```

## Security & Moderation

### Content Filtering

```typescript
// Automated content moderation
const moderateMessage = async (message: Message) => {
  const analysis = await this.agent.analyzeContent(message.content);
  
  if (analysis.toxicity > 0.8) {
    await message.delete();
    await message.author.send('Your message was removed for violating community guidelines.');
    
    // Log the incident
    await this.logModeration({
      userId: message.author.id,
      guildId: message.guild.id,
      reason: 'High toxicity score',
      action: 'message_deleted'
    });
  }
};
```

### Permission Validation

```typescript
// Check user permissions
const hasPermission = (member: GuildMember, permission: string): boolean => {
  const requiredRoles = this.config.moderatorRoles;
  const userRoles = member.roles.cache.map(role => role.name);
  
  return requiredRoles.some(role => userRoles.includes(role)) ||
         member.permissions.has(permission);
};
```

## Best Practices

### Performance Optimization

```typescript
// Message caching for context
class MessageCache {
  private cache = new Map<string, Message[]>();
  
  addMessage(channelId: string, message: Message) {
    if (!this.cache.has(channelId)) {
      this.cache.set(channelId, []);
    }
    
    const messages = this.cache.get(channelId)!;
    messages.push(message);
    
    // Keep only last 50 messages per channel
    if (messages.length > 50) {
      messages.shift();
    }
  }
}
```

### User Experience

1. **Responsive Commands**: Reply to interactions within 3 seconds
2. **Clear Feedback**: Use embeds and emojis for visual clarity
3. **Help Documentation**: Provide comprehensive help commands
4. **Error Handling**: Graceful error messages with recovery suggestions

### Community Building

1. **Welcome Messages**: Greet new members with helpful information
2. **Activity Tracking**: Reward active community participation
3. **Event Announcements**: Notify about server events and updates
4. **Moderation Support**: Assist moderators with automated tools

---

The Discord Extension provides comprehensive bot functionality for creating engaging, intelligent Discord communities. Its rich feature set supports everything from casual chat to advanced server management.

**Last updated July 2nd 2025 by SYMBiEX**

## Learn More

- [Overview](/docs/01-overview)
- [API Reference](/docs/03-api-reference)
- [Examples](/docs/17-examples)

---

*This documentation is being actively developed. Check back for updates.*
