# Telegram Extension for SYMindX

## Overview

The Telegram extension enables real-time chat with SYMindX agents through Telegram Bot API. Users can interact with agents using natural language, receive responses, and access agent capabilities through a familiar chat interface.

## Features

- 📱 **Real-time Chat**: Direct messaging with agents through Telegram
- 🤖 **Bot Commands**: Built-in commands for status, help, and conversation management
- 🔒 **User Whitelist**: Optional restriction to specific Telegram users
- 📝 **Message Logging**: Comprehensive logging of all interactions
- 🚀 **Auto-splitting**: Long messages automatically split to respect Telegram limits
- 💾 **Memory Integration**: Conversations stored in agent memory for context
- ⚡ **Queue Processing**: Efficient message handling with queue system

## Setup Instructions

### 1. Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Start a chat with BotFather and send `/newbot`
3. Follow the prompts to create your bot:
   - Choose a name for your bot (e.g., "Nyx AI Assistant")
   - Choose a username ending in "bot" (e.g., "nyx_ai_bot")
4. BotFather will provide you with a **bot token** - save this!

### 2. Configure the Extension

Add the Telegram extension to your agent configuration:

```json
{
  "extensions": [
    {
      "name": "telegram",
      "enabled": true,
      "config": {
        "botToken": "YOUR_BOT_TOKEN_HERE",
        "allowedUsers": [],
        "commandPrefix": "/",
        "maxMessageLength": 4096,
        "enableLogging": true
      }
    }
  ]
}
```

### 3. Set Environment Variables

You can provide the bot token via environment variable:

```bash
export TELEGRAM_BOT_TOKEN="your_bot_token_here"
```

Or in your `.env` file:
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 4. Start Your Agent

Run your SYMindX agent as usual. The Telegram extension will automatically start when the agent initializes.

```bash
npm start
# or
bun dev
```

## Usage

### Basic Commands

- `/start` - Introduction and welcome message
- `/help` - Show available commands and usage instructions
- `/status` - Check agent status and capabilities
- `/clear` - Clear conversation context

### Chatting

Simply send any message to your bot to start a conversation! The agent will:
- Process your message through its cognition system
- Generate contextual responses
- Remember your conversation history
- Respond with personality and emotional awareness

### Examples

```
User: Hello! What can you help me with?
Bot: 👋 Hello! I'm Nyx, your AI assistant. I can help with various tasks like answering questions, creative projects, problem-solving, and having meaningful conversations. What's on your mind today?

User: Can you help me plan a study schedule?
Bot: Absolutely! I'd be happy to help you create an effective study schedule. To give you the best recommendations, could you tell me:
- What subjects are you studying?
- How much time do you have available each day?
- Any upcoming exams or deadlines?
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `botToken` | string | **required** | Your Telegram bot token from BotFather |
| `allowedUsers` | number[] | `[]` | Array of Telegram user IDs (empty = allow all) |
| `commandPrefix` | string | `"/"` | Prefix for bot commands |
| `maxMessageLength` | number | `4096` | Maximum message length (Telegram limit) |
| `enableLogging` | boolean | `true` | Enable detailed logging of interactions |

## Security Features

### User Whitelist

Restrict bot access to specific users by adding their Telegram user IDs:

```json
{
  "allowedUsers": [123456789, 987654321]
}
```

To find a user's ID, they can send a message to your bot and check the logs.

### Rate Limiting

The extension includes built-in rate limiting and queue processing to prevent abuse and ensure stable operation.

## Troubleshooting

### Bot Not Responding

1. **Check the token**: Ensure your bot token is correct and active
2. **Verify network**: Make sure your server can reach api.telegram.org
3. **Check logs**: Look for error messages in the console output
4. **Test with BotFather**: Send `/mybots` to BotFather to verify your bot exists

### Common Issues

**"Bot token invalid"**
- Double-check your bot token in the configuration
- Ensure no extra spaces or characters

**"User not authorized"** 
- Check if you've configured `allowedUsers` and the user ID is included
- Set `allowedUsers: []` to allow all users

**Messages not being processed**
- Check that the agent's cognition module is properly configured
- Verify the agent is running and healthy with `/status`

### Debug Mode

Enable detailed logging by setting `enableLogging: true` in your configuration. This will show:
- Incoming messages with user details
- Response generation process
- Error details and stack traces

## Development

### Extending the Bot

You can extend the Telegram extension by:

1. Adding new commands in the `setupCommands()` method
2. Implementing custom message handlers
3. Adding inline keyboards and rich interactions
4. Integrating with additional agent capabilities

### Testing

Test your Telegram bot locally by:

1. Running your agent in development mode
2. Sending messages to your bot
3. Checking logs for proper message flow
4. Verifying responses and memory integration

## Support

For issues or questions:
- Check the main SYMindX documentation
- Review error logs for specific error messages
- Ensure all dependencies are properly installed
- Verify Telegram API connectivity

The Telegram extension is designed to provide a seamless chat experience while maintaining the full capabilities and personality of your SYMindX agents!