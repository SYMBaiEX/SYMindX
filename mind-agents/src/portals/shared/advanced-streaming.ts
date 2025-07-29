/**
 * Advanced AI SDK v5 Streaming Utilities
 * 
 * Enhanced streaming patterns including buffering, throttling, merging, and state management
 * for optimal performance and user experience across all portal implementations.
 */

import { 
  streamText, 
  StreamTextResult, 
  LanguageModelV2StreamPart, 
  generateId 
} from 'ai';
import { runtimeLogger } from '../../utils/logger';

// === STREAM BUFFERING ===

export interface StreamBufferOptions {
  bufferSize?: number;           // Max items to buffer (default: 10)
  flushInterval?: number;        // Auto-flush interval in ms (default: 100)
  adaptiveBuffering?: boolean;   // Adjust buffer size based on stream velocity
  maxBufferTime?: number;        // Max time to hold items in buffer (default: 500)
}

export class StreamBuffer<T> {
  private buffer: T[] = [];
  private timer: NodeJS.Timeout | null = null;
  private lastFlushTime = Date.now();
  private options: Required<StreamBufferOptions>;

  constructor(
    private onFlush: (items: T[]) => void,
    options: StreamBufferOptions = {}
  ) {
    this.options = {
      bufferSize: options.bufferSize || 10,
      flushInterval: options.flushInterval || 100,
      adaptiveBuffering: options.adaptiveBuffering || true,
      maxBufferTime: options.maxBufferTime || 500,
    };
  }

  add(item: T): void {
    this.buffer.push(item);

    // Adaptive buffering based on stream velocity
    if (this.options.adaptiveBuffering) {
      const timeSinceLastFlush = Date.now() - this.lastFlushTime;
      if (timeSinceLastFlush < 50 && this.buffer.length >= 3) {
        // High velocity stream - flush more frequently
        this.flush();
        return;
      }
    }

    // Buffer size limit
    if (this.buffer.length >= this.options.bufferSize) {
      this.flush();
      return;
    }

    // Time-based flushing
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush();
      }, this.options.flushInterval);
    }

    // Max buffer time protection
    if (this.buffer.length > 0) {
      const oldestTime = Date.now() - this.lastFlushTime;
      if (oldestTime >= this.options.maxBufferTime) {
        this.flush();
      }
    }
  }

  flush(): void {
    if (this.buffer.length === 0) return;

    const items = [...this.buffer];
    this.buffer = [];
    this.lastFlushTime = Date.now();

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    try {
      this.onFlush(items);
    } catch (error) {
      runtimeLogger.error('Stream buffer flush error:', error);
    }
  }

  destroy(): void {
    this.flush();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

// === STREAM THROTTLING ===

export interface StreamThrottleOptions {
  maxPerSecond?: number;         // Max items per second (default: 50)
  burstSize?: number;            // Allow bursts up to this size (default: 10)
  adaptiveThrottling?: boolean;  // Adjust based on downstream processing
  backpressureHandling?: 'drop' | 'buffer' | 'delay'; // How to handle overflow
}

export class StreamThrottle<T> {
  private tokenBucket: number;
  private lastRefill = Date.now();
  private pendingItems: T[] = [];
  private processing = false;
  private options: Required<StreamThrottleOptions>;

  constructor(
    private onEmit: (item: T) => Promise<void> | void,
    options: StreamThrottleOptions = {}
  ) {
    this.options = {
      maxPerSecond: options.maxPerSecond || 50,
      burstSize: options.burstSize || 10,
      adaptiveThrottling: options.adaptiveThrottling || false,
      backpressureHandling: options.backpressureHandling || 'buffer',
    };
    this.tokenBucket = this.options.burstSize;
  }

  async add(item: T): Promise<void> {
    this.refillTokens();

    if (this.tokenBucket > 0) {
      // Can process immediately
      this.tokenBucket--;
      try {
        await this.onEmit(item);
      } catch (error) {
        runtimeLogger.error('Stream throttle emit error:', error);
      }
    } else {
      // Handle overflow based on backpressure strategy
      switch (this.options.backpressureHandling) {
        case 'drop':
          runtimeLogger.warn('Dropping stream item due to throttling');
          break;
        case 'buffer':
          this.pendingItems.push(item);
          this.processPending();
          break;
        case 'delay':
          // Calculate delay needed
          const delay = Math.max(0, 1000 / this.options.maxPerSecond);
          await new Promise(resolve => setTimeout(resolve, delay));
          await this.add(item); // Retry
          break;
      }
    }
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor((timePassed / 1000) * this.options.maxPerSecond);
    
    if (tokensToAdd > 0) {
      this.tokenBucket = Math.min(
        this.options.burstSize,
        this.tokenBucket + tokensToAdd
      );
      this.lastRefill = now;
    }
  }

  private async processPending(): Promise<void> {
    if (this.processing || this.pendingItems.length === 0) return;
    
    this.processing = true;
    
    while (this.pendingItems.length > 0) {
      this.refillTokens();
      
      if (this.tokenBucket <= 0) {
        // Wait for token refill
        await new Promise(resolve => 
          setTimeout(resolve, 1000 / this.options.maxPerSecond)
        );
        continue;
      }
      
      const item = this.pendingItems.shift()!;
      this.tokenBucket--;
      
      try {
        await this.onEmit(item);
      } catch (error) {
        runtimeLogger.error('Stream throttle pending emit error:', error);
      }
    }
    
    this.processing = false;
  }
}

// === STREAM MERGING ===

export interface StreamMergerOptions {
  strategy?: 'round-robin' | 'priority' | 'timestamp' | 'adaptive';
  bufferSize?: number;
  syncWindow?: number; // Time window for synchronization in ms
}

export interface MergedStreamItem<T> {
  data: T;
  streamId: string;
  timestamp: number;
  priority?: number;
}

export class StreamMerger<T> {
  private streams = new Map<string, AsyncIterator<T>>();
  private buffers = new Map<string, MergedStreamItem<T>[]>();
  private lastEmitTimes = new Map<string, number>();
  private options: Required<StreamMergerOptions>;

  constructor(options: StreamMergerOptions = {}) {
    this.options = {
      strategy: options.strategy || 'adaptive',
      bufferSize: options.bufferSize || 100,
      syncWindow: options.syncWindow || 50,
    };
  }

  addStream(streamId: string, stream: AsyncIterable<T>, priority = 0): void {
    this.streams.set(streamId, stream[Symbol.asyncIterator]());
    this.buffers.set(streamId, []);
    this.lastEmitTimes.set(streamId, Date.now());
  }

  async *merge(): AsyncGenerator<MergedStreamItem<T>> {
    while (this.streams.size > 0) {
      // Fill buffers from all active streams
      await this.fillBuffers();

      // Select next item based on strategy
      const nextItem = this.selectNextItem();
      if (!nextItem) {
        // No more items available
        break;
      }

      // Remove item from its buffer
      const buffer = this.buffers.get(nextItem.streamId)!;
      const index = buffer.indexOf(nextItem);
      buffer.splice(index, 1);

      this.lastEmitTimes.set(nextItem.streamId, Date.now());
      yield nextItem;
    }
  }

  private async fillBuffers(): Promise<void> {
    const fillPromises = Array.from(this.streams.entries()).map(
      async ([streamId, iterator]) => {
        const buffer = this.buffers.get(streamId)!;
        
        if (buffer.length < this.options.bufferSize) {
          try {
            const { value, done } = await iterator.next();
            if (done) {
              this.streams.delete(streamId);
              this.buffers.delete(streamId);
              this.lastEmitTimes.delete(streamId);
            } else {
              buffer.push({
                data: value,
                streamId,
                timestamp: Date.now(),
              });
            }
          } catch (error) {
            runtimeLogger.error(`Stream merger error for ${streamId}:`, error);
            this.streams.delete(streamId);
            this.buffers.delete(streamId);
            this.lastEmitTimes.delete(streamId);
          }
        }
      }
    );

    await Promise.allSettled(fillPromises);
  }

  private selectNextItem(): MergedStreamItem<T> | null {
    const allItems: MergedStreamItem<T>[] = [];
    
    for (const buffer of this.buffers.values()) {
      allItems.push(...buffer);
    }

    if (allItems.length === 0) return null;

    switch (this.options.strategy) {
      case 'round-robin':
        return this.selectRoundRobin(allItems);
      case 'priority':
        return this.selectByPriority(allItems);
      case 'timestamp':
        return this.selectByTimestamp(allItems);
      case 'adaptive':
        return this.selectAdaptive(allItems);
      default:
        return allItems[0];
    }
  }

  private selectRoundRobin(items: MergedStreamItem<T>[]): MergedStreamItem<T> {
    // Find stream that hasn't emitted recently
    let oldestEmitTime = Date.now();
    let selectedItem = items[0];

    for (const item of items) {
      const lastEmit = this.lastEmitTimes.get(item.streamId) || 0;
      if (lastEmit < oldestEmitTime) {
        oldestEmitTime = lastEmit;
        selectedItem = item;
      }
    }

    return selectedItem;
  }

  private selectByPriority(items: MergedStreamItem<T>[]): MergedStreamItem<T> {
    return items.reduce((highest, current) =>
      (current.priority || 0) > (highest.priority || 0) ? current : highest
    );
  }

  private selectByTimestamp(items: MergedStreamItem<T>[]): MergedStreamItem<T> {
    return items.reduce((earliest, current) =>
      current.timestamp < earliest.timestamp ? current : earliest
    );
  }

  private selectAdaptive(items: MergedStreamItem<T>[]): MergedStreamItem<T> {
    // Adaptive strategy balances round-robin with priority and timing
    const now = Date.now();
    
    return items.reduce((best, current) => {
      const currentLastEmit = this.lastEmitTimes.get(current.streamId) || 0;
      const bestLastEmit = this.lastEmitTimes.get(best.streamId) || 0;
      
      const currentScore = 
        (current.priority || 0) * 10 +
        Math.min(100, now - currentLastEmit) / 10 +
        (now - current.timestamp) / 100;
      
      const bestScore = 
        (best.priority || 0) * 10 +
        Math.min(100, now - bestLastEmit) / 10 +
        (now - best.timestamp) / 100;
      
      return currentScore > bestScore ? current : best;
    });
  }
}

// === ADVANCED STREAM STATE MANAGEMENT ===

export interface StreamState {
  id: string;
  status: 'idle' | 'streaming' | 'paused' | 'completed' | 'error';
  progress: {
    totalChunks: number;
    processedChunks: number;
    bytesProcessed: number;
    startTime: number;
    lastActivity: number;
  };
  metadata: Record<string, any>;
  performance: {
    avgChunkSize: number;
    chunksPerSecond: number;
    totalDuration: number;
  };
}

export class AdvancedStreamManager {
  private streams = new Map<string, StreamState>();
  private callbacks = new Map<string, Set<(state: StreamState) => void>>();

  createStream(id?: string): string {
    const streamId = id || generateId();
    const state: StreamState = {
      id: streamId,
      status: 'idle',
      progress: {
        totalChunks: 0,
        processedChunks: 0,
        bytesProcessed: 0,
        startTime: Date.now(),
        lastActivity: Date.now(),
      },
      metadata: {},
      performance: {
        avgChunkSize: 0,
        chunksPerSecond: 0,
        totalDuration: 0,
      },
    };

    this.streams.set(streamId, state);
    return streamId;
  }

  updateStreamProgress(
    streamId: string,
    update: Partial<StreamState['progress']>
  ): void {
    const state = this.streams.get(streamId);
    if (!state) return;

    Object.assign(state.progress, update, {
      lastActivity: Date.now(),
    });

    // Update performance metrics
    const duration = Date.now() - state.progress.startTime;
    state.performance.totalDuration = duration;
    state.performance.chunksPerSecond = 
      state.progress.processedChunks / (duration / 1000);
    state.performance.avgChunkSize = 
      state.progress.bytesProcessed / Math.max(1, state.progress.processedChunks);

    this.notifyCallbacks(streamId, state);
  }

  setStreamStatus(streamId: string, status: StreamState['status']): void {
    const state = this.streams.get(streamId);
    if (!state) return;

    state.status = status;
    state.progress.lastActivity = Date.now();
    this.notifyCallbacks(streamId, state);
  }

  getStreamState(streamId: string): StreamState | null {
    return this.streams.get(streamId) || null;
  }

  onStreamUpdate(
    streamId: string,
    callback: (state: StreamState) => void
  ): () => void {
    if (!this.callbacks.has(streamId)) {
      this.callbacks.set(streamId, new Set());
    }
    
    this.callbacks.get(streamId)!.add(callback);
    
    // Return cleanup function
    return () => {
      const callbacks = this.callbacks.get(streamId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.callbacks.delete(streamId);
        }
      }
    };
  }

  private notifyCallbacks(streamId: string, state: StreamState): void {
    const callbacks = this.callbacks.get(streamId);
    if (!callbacks) return;

    for (const callback of callbacks) {
      try {
        callback(state);
      } catch (error) {
        runtimeLogger.error('Stream state callback error:', error);
      }
    }
  }

  destroyStream(streamId: string): void {
    this.streams.delete(streamId);
    this.callbacks.delete(streamId);
  }
}

// === ENHANCED STREAMING FUNCTIONS ===

export interface EnhancedStreamOptions {
  buffering?: StreamBufferOptions;
  throttling?: StreamThrottleOptions;
  stateManagement?: boolean;
  onProgress?: (progress: { processed: number; total?: number }) => void;
  onError?: (error: Error) => void;
}

export async function* createEnhancedTextStream(
  baseStream: AsyncIterable<LanguageModelV2StreamPart>,
  options: EnhancedStreamOptions = {}
): AsyncGenerator<string> {
  const streamManager = options.stateManagement ? new AdvancedStreamManager() : null;
  const streamId = streamManager?.createStream() || 'anonymous';
  
  let textBuffer = '';
  let processedChunks = 0;
  let totalBytes = 0;

  // Set up buffering if requested
  const buffer = options.buffering ? new StreamBuffer<string>(
    (chunks) => {
      // Emit buffered chunks
      for (const chunk of chunks) {
        textBuffer += chunk;
      }
    },
    options.buffering
  ) : null;

  // Set up throttling if requested
  const throttle = options.throttling ? new StreamThrottle<string>(
    async (chunk) => {
      textBuffer += chunk;
    },
    options.throttling
  ) : null;

  try {
    streamManager?.setStreamStatus(streamId, 'streaming');

    for await (const part of baseStream) {
      switch (part.type) {
        case 'text-delta':
          const textChunk = part.delta;
          processedChunks++;
          totalBytes += textChunk.length;

          // Update stream state
          streamManager?.updateStreamProgress(streamId, {
            processedChunks,
            bytesProcessed: totalBytes,
          });

          // Process through buffering/throttling if configured
          if (buffer) {
            buffer.add(textChunk);
          } else if (throttle) {
            await throttle.add(textChunk);
          } else {
            textBuffer += textChunk;
          }

          // Yield accumulated text
          if (textBuffer) {
            yield textBuffer;
            textBuffer = '';
          }

          // Progress callback
          options.onProgress?.({ processed: processedChunks });
          break;

        case 'finish':
          streamManager?.setStreamStatus(streamId, 'completed');
          break;

        case 'error':
          streamManager?.setStreamStatus(streamId, 'error');
          options.onError?.(new Error('Stream error'));
          break;
      }
    }

    // Flush any remaining buffered content
    buffer?.flush();
    if (textBuffer) {
      yield textBuffer;
    }

  } catch (error) {
    streamManager?.setStreamStatus(streamId, 'error');
    options.onError?.(error as Error);
    throw error;
  } finally {
    // Cleanup
    buffer?.destroy();
    streamManager?.destroyStream(streamId);
  }
}

// Export singleton instances for global use
export const globalStreamManager = new AdvancedStreamManager();

// Export utility functions
export function createBufferedStream<T>(
  onFlush: (items: T[]) => void,
  options?: StreamBufferOptions
): StreamBuffer<T> {
  return new StreamBuffer(onFlush, options);
}

export function createThrottledStream<T>(
  onEmit: (item: T) => Promise<void> | void,
  options?: StreamThrottleOptions
): StreamThrottle<T> {
  return new StreamThrottle(onEmit, options);
}

export function createStreamMerger<T>(
  options?: StreamMergerOptions
): StreamMerger<T> {
  return new StreamMerger(options);
}