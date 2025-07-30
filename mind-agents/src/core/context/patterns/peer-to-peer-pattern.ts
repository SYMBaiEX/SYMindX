/**
 * Peer-to-Peer Pattern for Multi-Agent Context Coordination
 *
 * Implements equal context sharing where all agents can communicate
 * directly with each other without a central coordinator.
 */

import { EventEmitter } from 'events';
import {
  AgentContext,
  ContextUpdate,
  VectorClock,
  ContextConflict,
} from '../../../types/context/multi-agent-context';
import { AgentId, OperationResult } from '../../../types/helpers';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Peer connection information
 */
export interface PeerConnection {
  peerId: AgentId;
  connectedAt: string;
  lastActivity: string;
  isActive: boolean;
  latency: number;
  messagesSent: number;
  messagesReceived: number;
  bandwidth: number; // bytes per second
}

/**
 * Peer network topology
 */
export interface NetworkTopology {
  totalPeers: number;
  connections: Map<AgentId, Set<AgentId>>;
  clusters: AgentId[][];
  diameter: number; // max hops between any two peers
  density: number; // actual connections / possible connections
}

/**
 * Message routing information
 */
export interface MessageRoute {
  messageId: string;
  source: AgentId;
  destination: AgentId;
  hops: AgentId[];
  timestamp: string;
  ttl: number;
}

/**
 * Implements peer-to-peer coordination pattern
 */
export class PeerToPeerPattern extends EventEmitter {
  private peers: Map<AgentId, PeerConnection[]> = new Map();
  private pendingMessages: Map<string, MessageRoute> = new Map();
  private messageHistory: Map<string, MessageRoute> = new Map();
  private vectorClocks: Map<AgentId, VectorClock> = new Map();
  private contextCache: Map<AgentId, AgentContext> = new Map();
  private routingTable: Map<AgentId, Map<AgentId, AgentId[]>> = new Map();

  private readonly maxHops = 7;
  private readonly messageTTL = 30000; // 30 seconds
  private readonly routingUpdateInterval = 60000; // 1 minute
  private readonly connectionTimeout = 300000; // 5 minutes

  constructor() {
    super();
    this.setupRouting();
    this.setupCleanup();
  }

  /**
   * Connect two peers
   */
  async connectPeers(peer1: AgentId, peer2: AgentId): Promise<OperationResult> {
    try {
      const now = new Date().toISOString();

      // Initialize peer lists if they don't exist
      if (!this.peers.has(peer1)) {
        this.peers.set(peer1, []);
      }
      if (!this.peers.has(peer2)) {
        this.peers.set(peer2, []);
      }

      // Check if already connected
      if (this.areConnected(peer1, peer2)) {
        return {
          success: true,
          data: { message: 'Peers already connected' },
          metadata: { operation: 'connectPeers' },
        };
      }

      // Create connections
      const connection1: PeerConnection = {
        peerId: peer2,
        connectedAt: now,
        lastActivity: now,
        isActive: true,
        latency: 0,
        messagesSent: 0,
        messagesReceived: 0,
        bandwidth: 0,
      };

      const connection2: PeerConnection = {
        peerId: peer1,
        connectedAt: now,
        lastActivity: now,
        isActive: true,
        latency: 0,
        messagesSent: 0,
        messagesReceived: 0,
        bandwidth: 0,
      };

      this.peers.get(peer1)!.push(connection1);
      this.peers.get(peer2)!.push(connection2);

      // Update routing table
      await this.updateRoutingTables();

      this.emit('peersConnected', {
        peer1,
        peer2,
        timestamp: now,
      });

      runtimeLogger.debug('Peers connected', { peer1, peer2 });

      return {
        success: true,
        data: {
          peer1,
          peer2,
          connectedAt: now,
        },
        metadata: {
          operation: 'connectPeers',
          timestamp: now,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Peer connection failed: ${(error as Error).message}`,
        metadata: {
          operation: 'connectPeers',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Disconnect two peers
   */
  async disconnectPeers(
    peer1: AgentId,
    peer2: AgentId
  ): Promise<OperationResult> {
    try {
      let disconnected = false;

      // Remove connections
      const peer1Connections = this.peers.get(peer1);
      if (peer1Connections) {
        const index = peer1Connections.findIndex((c) => c.peerId === peer2);
        if (index !== -1) {
          peer1Connections.splice(index, 1);
          disconnected = true;
        }
      }

      const peer2Connections = this.peers.get(peer2);
      if (peer2Connections) {
        const index = peer2Connections.findIndex((c) => c.peerId === peer1);
        if (index !== -1) {
          peer2Connections.splice(index, 1);
          disconnected = true;
        }
      }

      if (disconnected) {
        // Update routing table
        await this.updateRoutingTables();

        this.emit('peersDisconnected', {
          peer1,
          peer2,
          timestamp: new Date().toISOString(),
        });

        runtimeLogger.debug('Peers disconnected', { peer1, peer2 });
      }

      return {
        success: true,
        data: {
          peer1,
          peer2,
          wasConnected: disconnected,
        },
        metadata: {
          operation: 'disconnectPeers',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Peer disconnection failed: ${(error as Error).message}`,
        metadata: {
          operation: 'disconnectPeers',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Broadcast context update to all peers
   */
  async broadcastUpdate(
    sourceAgent: AgentId,
    context: AgentContext,
    update: ContextUpdate
  ): Promise<OperationResult> {
    try {
      const startTime = Date.now();
      const messageId = `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      runtimeLogger.debug('Starting context broadcast', {
        sourceAgent,
        messageId,
        updateId: update.updateId,
      });

      // Update vector clock
      this.updateVectorClock(sourceAgent);

      // Cache the context
      this.contextCache.set(sourceAgent, context);

      // Get all connected peers
      const connectedPeers = this.getConnectedPeers(sourceAgent);

      if (connectedPeers.length === 0) {
        return {
          success: true,
          data: {
            messageId,
            deliveredTo: [],
            broadcastTime: Date.now() - startTime,
          },
          metadata: { operation: 'broadcastUpdate' },
        };
      }

      // Create routes to all peers
      const routes: MessageRoute[] = [];
      const deliveredTo: AgentId[] = [];

      for (const peerId of connectedPeers) {
        const route = await this.findRoute(sourceAgent, peerId, messageId);
        if (route) {
          routes.push(route);
          try {
            await this.deliverMessage(route, { context, update });
            deliveredTo.push(peerId);
          } catch (error) {
            runtimeLogger.error(
              'Failed to deliver message to peer',
              error as Error,
              {
                messageId,
                sourceAgent,
                targetPeer: peerId,
              }
            );
          }
        }
      }

      const broadcastTime = Date.now() - startTime;

      this.emit('updateBroadcasted', {
        sourceAgent,
        messageId,
        updateId: update.updateId,
        totalPeers: connectedPeers.length,
        deliveredTo: deliveredTo.length,
        broadcastTime,
      });

      runtimeLogger.debug('Context broadcast completed', {
        sourceAgent,
        messageId,
        deliveredTo: deliveredTo.length,
        totalPeers: connectedPeers.length,
        broadcastTime,
      });

      return {
        success: true,
        data: {
          messageId,
          totalPeers: connectedPeers.length,
          deliveredTo,
          failedDeliveries: connectedPeers.length - deliveredTo.length,
          broadcastTime,
          routes: routes.length,
        },
        metadata: {
          operation: 'broadcastUpdate',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      runtimeLogger.error('Context broadcast failed', error as Error, {
        sourceAgent,
        updateId: update.updateId,
      });

      return {
        success: false,
        error: `Broadcast failed: ${(error as Error).message}`,
        metadata: {
          operation: 'broadcastUpdate',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Send context update to specific peer
   */
  async sendToPeer(
    sourceAgent: AgentId,
    targetAgent: AgentId,
    context: AgentContext,
    update: ContextUpdate
  ): Promise<OperationResult> {
    try {
      const startTime = Date.now();
      const messageId = `direct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      runtimeLogger.debug('Sending context to peer', {
        sourceAgent,
        targetAgent,
        messageId,
        updateId: update.updateId,
      });

      // Find route to target
      const route = await this.findRoute(sourceAgent, targetAgent, messageId);
      if (!route) {
        return {
          success: false,
          error: 'No route found to target peer',
          metadata: { operation: 'sendToPeer' },
        };
      }

      // Deliver message
      await this.deliverMessage(route, { context, update });

      const deliveryTime = Date.now() - startTime;

      this.emit('messageSent', {
        sourceAgent,
        targetAgent,
        messageId,
        updateId: update.updateId,
        hops: route.hops.length,
        deliveryTime,
      });

      runtimeLogger.debug('Context sent to peer', {
        sourceAgent,
        targetAgent,
        messageId,
        hops: route.hops.length,
        deliveryTime,
      });

      return {
        success: true,
        data: {
          messageId,
          targetAgent,
          hops: route.hops.length,
          deliveryTime,
        },
        metadata: {
          operation: 'sendToPeer',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      runtimeLogger.error('Failed to send context to peer', error as Error, {
        sourceAgent,
        targetAgent,
        updateId: update.updateId,
      });

      return {
        success: false,
        error: `Send to peer failed: ${(error as Error).message}`,
        metadata: {
          operation: 'sendToPeer',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Request context from peer
   */
  async requestContext(
    requestingAgent: AgentId,
    targetAgent: AgentId,
    contextVersion?: number
  ): Promise<OperationResult> {
    try {
      const messageId = `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      runtimeLogger.debug('Requesting context from peer', {
        requestingAgent,
        targetAgent,
        messageId,
        contextVersion,
      });

      // Find route to target
      const route = await this.findRoute(
        requestingAgent,
        targetAgent,
        messageId
      );
      if (!route) {
        return {
          success: false,
          error: 'No route found to target peer',
          metadata: { operation: 'requestContext' },
        };
      }

      // Send request (simulated)
      const request = {
        type: 'context_request',
        requestingAgent,
        contextVersion: contextVersion || 0,
        timestamp: new Date().toISOString(),
      };

      await this.deliverMessage(route, request);

      // In a real implementation, this would wait for response
      // For now, we'll simulate getting context from cache
      const context = this.contextCache.get(targetAgent);

      this.emit('contextRequested', {
        requestingAgent,
        targetAgent,
        messageId,
        contextFound: !!context,
      });

      return {
        success: true,
        data: {
          messageId,
          targetAgent,
          context: context || null,
          hops: route.hops.length,
        },
        metadata: {
          operation: 'requestContext',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Context request failed: ${(error as Error).message}`,
        metadata: {
          operation: 'requestContext',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Get network topology information
   */
  getNetworkTopology(): NetworkTopology {
    const connections = new Map<AgentId, Set<AgentId>>();
    let totalConnections = 0;

    // Build connection map
    for (const [agentId, peerConnections] of this.peers.entries()) {
      const connectedPeers = new Set<AgentId>();

      for (const connection of peerConnections) {
        if (connection.isActive) {
          connectedPeers.add(connection.peerId);
          totalConnections++;
        }
      }

      connections.set(agentId, connectedPeers);
    }

    // Calculate network metrics
    const totalPeers = this.peers.size;
    const maxPossibleConnections = (totalPeers * (totalPeers - 1)) / 2;
    const density =
      maxPossibleConnections > 0
        ? totalConnections / 2 / maxPossibleConnections
        : 0;

    // Find clusters using simple connected components
    const clusters = this.findClusters(connections);

    // Calculate network diameter
    const diameter = this.calculateDiameter(connections);

    return {
      totalPeers,
      connections,
      clusters,
      diameter,
      density,
    };
  }

  /**
   * Check if two peers are connected
   */
  private areConnected(peer1: AgentId, peer2: AgentId): boolean {
    const peer1Connections = this.peers.get(peer1);
    if (!peer1Connections) return false;

    return peer1Connections.some(
      (conn) => conn.peerId === peer2 && conn.isActive
    );
  }

  /**
   * Get all connected peers for an agent
   */
  private getConnectedPeers(agentId: AgentId): AgentId[] {
    const connections = this.peers.get(agentId);
    if (!connections) return [];

    return connections
      .filter((conn) => conn.isActive)
      .map((conn) => conn.peerId);
  }

  /**
   * Find route between two peers
   */
  private async findRoute(
    source: AgentId,
    destination: AgentId,
    messageId: string
  ): Promise<MessageRoute | null> {
    if (source === destination) {
      return null;
    }

    // Check routing table first
    const routes = this.routingTable.get(source);
    if (routes?.has(destination)) {
      const hops = routes.get(destination)!;

      return {
        messageId,
        source,
        destination,
        hops,
        timestamp: new Date().toISOString(),
        ttl: this.messageTTL,
      };
    }

    // Fallback to direct connection
    if (this.areConnected(source, destination)) {
      return {
        messageId,
        source,
        destination,
        hops: [destination],
        timestamp: new Date().toISOString(),
        ttl: this.messageTTL,
      };
    }

    // Use breadth-first search as fallback
    const route = this.findShortestPath(source, destination);
    if (route) {
      return {
        messageId,
        source,
        destination,
        hops: route,
        timestamp: new Date().toISOString(),
        ttl: this.messageTTL,
      };
    }

    return null;
  }

  /**
   * Find shortest path using breadth-first search
   */
  private findShortestPath(
    source: AgentId,
    destination: AgentId
  ): AgentId[] | null {
    const visited = new Set<AgentId>();
    const queue: { agentId: AgentId; path: AgentId[] }[] = [
      { agentId: source, path: [] },
    ];

    while (queue.length > 0) {
      const { agentId, path } = queue.shift()!;

      if (agentId === destination) {
        return path.concat(destination);
      }

      if (visited.has(agentId) || path.length >= this.maxHops) {
        continue;
      }

      visited.add(agentId);

      const connectedPeers = this.getConnectedPeers(agentId);
      for (const peerId of connectedPeers) {
        if (!visited.has(peerId)) {
          queue.push({
            agentId: peerId,
            path: path.concat(agentId),
          });
        }
      }
    }

    return null;
  }

  /**
   * Deliver message along route (simulated)
   */
  private async deliverMessage(
    route: MessageRoute,
    payload: unknown
  ): Promise<void> {
    // In a real implementation, this would actually send the message
    // through the network hops. For now, we'll simulate the delivery.

    runtimeLogger.debug('Delivering message', {
      messageId: route.messageId,
      source: route.source,
      destination: route.destination,
      hops: route.hops.length,
    });

    // Simulate network delay based on hops
    const delay = route.hops.length * 10; // 10ms per hop
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Update connection statistics
    this.updateConnectionStats(route.source, route.hops[0], Date.now());

    // Store message in history
    this.messageHistory.set(route.messageId, route);

    // Clean up old history
    if (this.messageHistory.size > 1000) {
      const oldestKey = this.messageHistory.keys().next().value;
      this.messageHistory.delete(oldestKey);
    }
  }

  /**
   * Update connection statistics
   */
  private updateConnectionStats(
    source: AgentId,
    target: AgentId,
    latency: number
  ): void {
    const connections = this.peers.get(source);
    if (!connections) return;

    const connection = connections.find((c) => c.peerId === target);
    if (connection) {
      connection.lastActivity = new Date().toISOString();
      connection.latency = latency;
      connection.messagesSent++;
    }
  }

  /**
   * Update vector clock for an agent
   */
  private updateVectorClock(agentId: AgentId): void {
    if (!this.vectorClocks.has(agentId)) {
      this.vectorClocks.set(agentId, {
        clocks: { [agentId]: 0 },
        version: 1,
      });
    }

    const vectorClock = this.vectorClocks.get(agentId)!;
    vectorClock.clocks[agentId] = (vectorClock.clocks[agentId] || 0) + 1;
    vectorClock.version++;
  }

  /**
   * Update routing tables using distance vector algorithm
   */
  private async updateRoutingTables(): Promise<void> {
    for (const agentId of this.peers.keys()) {
      const routes = new Map<AgentId, AgentId[]>();

      // Direct connections
      const connectedPeers = this.getConnectedPeers(agentId);
      for (const peerId of connectedPeers) {
        routes.set(peerId, [peerId]);
      }

      // Multi-hop routes (simplified)
      for (const peerId of connectedPeers) {
        const peerConnections = this.getConnectedPeers(peerId);
        for (const secondHopId of peerConnections) {
          if (secondHopId !== agentId && !routes.has(secondHopId)) {
            routes.set(secondHopId, [peerId, secondHopId]);
          }
        }
      }

      this.routingTable.set(agentId, routes);
    }
  }

  /**
   * Find clusters in the network
   */
  private findClusters(connections: Map<AgentId, Set<AgentId>>): AgentId[][] {
    const visited = new Set<AgentId>();
    const clusters: AgentId[][] = [];

    for (const agentId of connections.keys()) {
      if (!visited.has(agentId)) {
        const cluster = this.exploreCluster(agentId, connections, visited);
        if (cluster.length > 0) {
          clusters.push(cluster);
        }
      }
    }

    return clusters;
  }

  /**
   * Explore cluster using depth-first search
   */
  private exploreCluster(
    startAgent: AgentId,
    connections: Map<AgentId, Set<AgentId>>,
    visited: Set<AgentId>
  ): AgentId[] {
    const cluster: AgentId[] = [];
    const stack: AgentId[] = [startAgent];

    while (stack.length > 0) {
      const agentId = stack.pop()!;

      if (visited.has(agentId)) {
        continue;
      }

      visited.add(agentId);
      cluster.push(agentId);

      const connectedPeers = connections.get(agentId);
      if (connectedPeers) {
        for (const peerId of connectedPeers) {
          if (!visited.has(peerId)) {
            stack.push(peerId);
          }
        }
      }
    }

    return cluster;
  }

  /**
   * Calculate network diameter
   */
  private calculateDiameter(connections: Map<AgentId, Set<AgentId>>): number {
    let maxDistance = 0;
    const agents = Array.from(connections.keys());

    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const distance = this.calculateDistance(
          agents[i],
          agents[j],
          connections
        );
        maxDistance = Math.max(maxDistance, distance);
      }
    }

    return maxDistance;
  }

  /**
   * Calculate distance between two agents
   */
  private calculateDistance(
    agent1: AgentId,
    agent2: AgentId,
    connections: Map<AgentId, Set<AgentId>>
  ): number {
    if (agent1 === agent2) return 0;

    const visited = new Set<AgentId>();
    const queue: { agentId: AgentId; distance: number }[] = [
      { agentId: agent1, distance: 0 },
    ];

    while (queue.length > 0) {
      const { agentId, distance } = queue.shift()!;

      if (agentId === agent2) {
        return distance;
      }

      if (visited.has(agentId)) {
        continue;
      }

      visited.add(agentId);

      const connectedPeers = connections.get(agentId);
      if (connectedPeers) {
        for (const peerId of connectedPeers) {
          if (!visited.has(peerId)) {
            queue.push({ agentId: peerId, distance: distance + 1 });
          }
        }
      }
    }

    return Infinity; // No path found
  }

  /**
   * Setup periodic routing updates
   */
  private setupRouting(): void {
    setInterval(() => {
      this.updateRoutingTables().catch((error) => {
        runtimeLogger.error('Failed to update routing tables', error as Error);
      });
    }, this.routingUpdateInterval);
  }

  /**
   * Setup cleanup of inactive connections and old messages
   */
  private setupCleanup(): void {
    setInterval(() => {
      this.cleanupInactiveConnections();
      this.cleanupOldMessages();
    }, this.connectionTimeout);
  }

  /**
   * Clean up inactive connections
   */
  private cleanupInactiveConnections(): void {
    const now = Date.now();

    for (const [agentId, connections] of this.peers.entries()) {
      for (let i = connections.length - 1; i >= 0; i--) {
        const connection = connections[i];
        const lastActivityTime = new Date(connection.lastActivity).getTime();

        if (now - lastActivityTime > this.connectionTimeout) {
          connection.isActive = false;

          runtimeLogger.debug('Connection marked as inactive', {
            agent: agentId,
            peer: connection.peerId,
            lastActivity: connection.lastActivity,
          });
        }
      }
    }
  }

  /**
   * Clean up old messages
   */
  private cleanupOldMessages(): void {
    const now = Date.now();
    const expiredMessages: string[] = [];

    for (const [messageId, route] of this.messageHistory.entries()) {
      const messageTime = new Date(route.timestamp).getTime();

      if (now - messageTime > route.ttl) {
        expiredMessages.push(messageId);
      }
    }

    for (const messageId of expiredMessages) {
      this.messageHistory.delete(messageId);
      this.pendingMessages.delete(messageId);
    }

    if (expiredMessages.length > 0) {
      runtimeLogger.debug('Cleaned up expired messages', {
        count: expiredMessages.length,
      });
    }
  }

  /**
   * Get pattern statistics
   */
  getStatistics() {
    const topology = this.getNetworkTopology();
    const totalConnections =
      Array.from(this.peers.values()).reduce(
        (sum, connections) =>
          sum + connections.filter((c) => c.isActive).length,
        0
      ) / 2;

    return {
      totalPeers: this.peers.size,
      activeConnections: totalConnections,
      networkDensity: topology.density,
      networkDiameter: topology.diameter,
      clusters: topology.clusters.length,
      pendingMessages: this.pendingMessages.size,
      messageHistory: this.messageHistory.size,
      routingTableSize: Array.from(this.routingTable.values()).reduce(
        (sum, routes) => sum + routes.size,
        0
      ),
      avgConnectionsPerPeer:
        this.peers.size > 0 ? (totalConnections * 2) / this.peers.size : 0,
    };
  }

  /**
   * Get peer connections for an agent
   */
  getPeerConnections(agentId: AgentId): PeerConnection[] {
    return this.peers.get(agentId) || [];
  }

  /**
   * Get message history
   */
  getMessageHistory(): Map<string, MessageRoute> {
    return new Map(this.messageHistory);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.peers.clear();
    this.pendingMessages.clear();
    this.messageHistory.clear();
    this.vectorClocks.clear();
    this.contextCache.clear();
    this.routingTable.clear();
    this.removeAllListeners();
  }
}
