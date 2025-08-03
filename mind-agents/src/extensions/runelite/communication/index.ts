/**
 * Communication Module for RuneLite Extension
 * Handles WebSocket connections, command processing, and event management
 */

export { 
  RuneLiteWebSocketServer,
  type WebSocketServerConfig,
  type ClientInfo
} from './websocket-server';

export { 
  RuneLiteCommandProcessor,
  type CommandProcessorConfig,
  type CommandResult
} from './command-processor';

export { 
  RuneLiteEventProcessor,
  type EventProcessorConfig,
  type EventHandler,
  type EventCondition
} from './event-processor'; 