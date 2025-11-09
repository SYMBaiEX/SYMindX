/**
 * Event Batch Processor with Compression
 * Batches and compresses events for high-throughput scenarios
 */

import { EventEmitter } from 'node:events';
import { runtimeLogger } from './logger';
import { performanceMonitor } from './PerformanceMonitor';

interface BatchableEvent {
  id: string;
  type: string;
  data: unknown;
  timestamp: number;
  priority: number;
  source: string;
}

interface EventBatch {
  id: string;
  events: BatchableEvent[];
  createdAt: number;
  size: number;
  compressed: boolean;
  compressionRatio?: number;
}

interface BatchProcessorOptions {
  maxBatchSize: number;
  maxBatchAge: number; // ms
  compressionThreshold: number; // bytes
  enableCompression: boolean;
  enablePrioritization: boolean;
  flushInterval: number; // ms
  maxQueueSize: number;
}

interface CompressionResult {
  compressed: Buffer;
  originalSize: number;
  compressedSize: number;
  ratio: number;
}

export class EventBatchProcessor extends EventEmitter {
  private options: BatchProcessorOptions;
  private eventQueue: BatchableEvent[] = [];
  private currentBatch: BatchableEvent[] = [];
  private batchStartTime = 0;
  private flushTimer?: NodeJS.Timer;
  private isProcessing = false;

  // Metrics
  private metrics = {
    totalEvents: 0,
    batchedEvents: 0,
    compressedBatches: 0,
    totalBatches: 0,
    averageBatchSize: 0,
    averageCompressionRatio: 0,
    droppedEvents: 0,
    processingTime: 0,
  };

  constructor(options: Partial<BatchProcessorOptions> = {}) {
    super();

    this.options = {
      maxBatchSize: options.maxBatchSize ?? 100,
      maxBatchAge: options.maxBatchAge ?? 1000, // 1 second
      compressionThreshold: options.compressionThreshold ?? 1024, // 1KB
      enableCompression: options.enableCompression ?? true,
      enablePrioritization: options.enablePrioritization ?? true,
      flushInterval: options.flushInterval ?? 500, // 500ms
      maxQueueSize: options.maxQueueSize ?? 10000,
    };

    // Start flush timer
    this.startFlushTimer();
  }

  /**
   * Add event to batch processor
   */
  addEvent(event: Omit<BatchableEvent, 'timestamp'>): boolean {
    // Check queue size limit
    if (this.eventQueue.length >= this.options.maxQueueSize) {
      this.metrics.droppedEvents++;
      performanceMonitor.recordMetric('event_batch.dropped', 1, 'count', {
        reason: 'queue_full',
      });
      
      runtimeLogger.warn('Event queue full, dropping event', {
        queueSize: this.eventQueue.length,
        eventType: event.type,
      });
      
      return false;
    }

    const batchableEvent: BatchableEvent = {
      ...event,
      timestamp: Date.now(),
    };

    // Add to queue
    this.eventQueue.push(batchableEvent);
    this.metrics.totalEvents++;

    // Sort by priority if enabled
    if (this.options.enablePrioritization) {
      this.eventQueue.sort((a, b) => b.priority - a.priority);
    }

    // Check if we should flush immediately
    if (this.shouldFlushImmediately()) {
      this.flush();
    }

    performanceMonitor.recordMetric('event_batch.queued', 1, 'count', {
      type: event.type,
      priority: event.priority.toString(),
    });

    return true;
  }

  /**
   * Flush current batch
   */
  async flush(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const startTime = performance.now();

    try {
      // Create batch from queue
      const batchEvents = this.eventQueue.splice(0, this.options.maxBatchSize);
      
      if (batchEvents.length === 0) {
        return;
      }

      const batch = await this.createBatch(batchEvents);
      
      // Emit batch for processing
      this.emit('batch', batch);

      // Update metrics
      this.metrics.batchedEvents += batch.events.length;
      this.metrics.totalBatches++;
      this.metrics.averageBatchSize = this.metrics.batchedEvents / this.metrics.totalBatches;

      if (batch.compressed && batch.compressionRatio) {
        this.metrics.compressedBatches++;
        this.metrics.averageCompressionRatio = 
          (this.metrics.averageCompressionRatio * (this.metrics.compressedBatches - 1) + batch.compressionRatio) / 
          this.metrics.compressedBatches;
      }

      const processingTime = performance.now() - startTime;
      this.metrics.processingTime += processingTime;

      performanceMonitor.recordMetric('event_batch.flushed', 1, 'count', {
        size: batch.events.length.toString(),
        compressed: batch.compressed.toString(),
      });
      performanceMonitor.recordMetric('event_batch.processing_time', processingTime, 'ms');

      runtimeLogger.debug('Event batch flushed', {
        batchId: batch.id,
        eventCount: batch.events.length,
        compressed: batch.compressed,
        size: batch.size,
        processingTime: `${processingTime.toFixed(2)}ms`,
      });

    } catch (error) {
      runtimeLogger.error('Failed to flush event batch:', error);
      this.emit('error', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get processor statistics
   */
  getStats(): {
    metrics: typeof this.metrics;
    queueSize: number;
    isProcessing: boolean;
    options: BatchProcessorOptions;
  } {
    return {
      metrics: { ...this.metrics },
      queueSize: this.eventQueue.length,
      isProcessing: this.isProcessing,
      options: { ...this.options },
    };
  }

  /**
   * Clear event queue
   */
  clear(): number {
    const queueSize = this.eventQueue.length;
    this.eventQueue = [];
    
    performanceMonitor.recordMetric('event_batch.cleared', queueSize, 'count');
    
    return queueSize;
  }

  /**
   * Stop the batch processor
   */
  async stop(): Promise<void> {
    // Stop flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Flush remaining events
    await this.flush();

    this.emit('stopped');
  }

  // Private helper methods

  private async createBatch(events: BatchableEvent[]): Promise<EventBatch> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate original size
    const originalSize = this.calculateBatchSize(events);
    
    let compressed = false;
    let compressionRatio: number | undefined;

    // Compress if enabled and above threshold
    if (this.options.enableCompression && originalSize > this.options.compressionThreshold) {
      try {
        const compressionResult = await this.compressBatch(events);
        compressed = true;
        compressionRatio = compressionResult.ratio;
        
        performanceMonitor.recordMetric('event_batch.compression_ratio', compressionRatio, 'ratio');
      } catch (error) {
        runtimeLogger.warn('Failed to compress batch, using uncompressed:', error);
      }
    }

    return {
      id: batchId,
      events,
      createdAt: Date.now(),
      size: originalSize,
      compressed,
      compressionRatio,
    };
  }

  private calculateBatchSize(events: BatchableEvent[]): number {
    return events.reduce((total, event) => {
      const eventSize = JSON.stringify(event).length * 2; // UTF-16 estimate
      return total + eventSize;
    }, 0);
  }

  private async compressBatch(events: BatchableEvent[]): Promise<CompressionResult> {
    // Simple compression using JSON stringification and Buffer compression
    // In a real implementation, you might use zlib or other compression libraries
    const originalData = JSON.stringify(events);
    const originalSize = Buffer.byteLength(originalData, 'utf8');
    
    // Mock compression - in reality, you'd use zlib.gzip or similar
    const compressed = Buffer.from(originalData, 'utf8');
    const compressedSize = compressed.length;
    
    // Simulate compression ratio (in reality, this would be actual compression)
    const mockCompressionRatio = 0.7; // 30% compression
    const simulatedCompressedSize = Math.floor(originalSize * mockCompressionRatio);
    
    return {
      compressed,
      originalSize,
      compressedSize: simulatedCompressedSize,
      ratio: mockCompressionRatio,
    };
  }

  private shouldFlushImmediately(): boolean {
    // Flush if batch is full
    if (this.eventQueue.length >= this.options.maxBatchSize) {
      return true;
    }

    // Flush if batch is old
    if (this.batchStartTime > 0 && 
        Date.now() - this.batchStartTime >= this.options.maxBatchAge) {
      return true;
    }

    // Flush if high priority events are present
    if (this.options.enablePrioritization) {
      const highPriorityEvents = this.eventQueue.filter(e => e.priority >= 8);
      if (highPriorityEvents.length > 0) {
        return true;
      }
    }

    return false;
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush().catch(error => {
          runtimeLogger.error('Scheduled flush failed:', error);
        });
      }
    }, this.options.flushInterval);
  }
}

/**
 * High-throughput event batch processor for system events
 */
export const systemEventBatcher = new EventBatchProcessor({
  maxBatchSize: 50,
  maxBatchAge: 2000, // 2 seconds
  compressionThreshold: 2048, // 2KB
  enableCompression: true,
  enablePrioritization: true,
  flushInterval: 1000, // 1 second
  maxQueueSize: 5000,
});

/**
 * Fast event batch processor for user interactions
 */
export const userEventBatcher = new EventBatchProcessor({
  maxBatchSize: 20,
  maxBatchAge: 500, // 500ms
  compressionThreshold: 1024, // 1KB
  enableCompression: false, // Prioritize speed over compression
  enablePrioritization: true,
  flushInterval: 250, // 250ms
  maxQueueSize: 2000,
});

/**
 * Memory-optimized event batch processor for large events
 */
export const memoryEventBatcher = new EventBatchProcessor({
  maxBatchSize: 10,
  maxBatchAge: 5000, // 5 seconds
  compressionThreshold: 512, // 512 bytes
  enableCompression: true,
  enablePrioritization: false,
  flushInterval: 2000, // 2 seconds
  maxQueueSize: 1000,
});