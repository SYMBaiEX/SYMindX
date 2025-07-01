---
sidebar_position: 1
title: "Event Bus"
description: "Event-driven communication system"
---

# Event Bus

Event-driven communication system

## Event Bus

The Event Bus is SYMindX's central communication system, enabling loose coupling between components.

### Overview

The Event Bus provides:
- **Pub/Sub Messaging**: Decoupled communication
- **Event Filtering**: Subscribe to specific event types
- **Priority Handling**: Process critical events first
- **Error Isolation**: Failures don't affect other handlers

### Event Types

```typescript
// System Events
'system:startup'
'system:shutdown'
'system:error'

// Agent Events
'agent:created'
'agent:thought'
'agent:emotion_changed'
'agent:action'

// Module Events
'memory:stored'
'memory:retrieved'
'cognition:plan_created'
'emotion:state_changed'

// Extension Events
'chat:message_received'
'chat:message_sent'
'api:request'
'api:response'
```

### Usage Examples

#### Subscribing to Events
```typescript
// Subscribe to all agent thoughts
eventBus.on('agent:thought', (event) => {
  console.log(`${event.agentId} thinking: ${event.thought}`);
});

// Subscribe to specific agent
eventBus.on('agent:thought', (event) => {
  if (event.agentId === 'nyx') {
    handleNyxThought(event);
  }
});
```

#### Emitting Events
```typescript
// Emit an event
eventBus.emit('agent:action', {
  agentId: 'nyx',
  action: 'send_message',
  data: { message: 'Hello!' }
});
```

### Best Practices

1. **Use Namespaced Events**: Follow the `category:action` pattern
2. **Include Metadata**: Always include relevant context
3. **Handle Errors**: Wrap handlers in try-catch
4. **Unsubscribe**: Clean up listeners when done
