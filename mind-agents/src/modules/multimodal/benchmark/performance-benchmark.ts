/**
 * Multi-Modal Performance Benchmark
 *
 * Measures performance metrics for all multi-modal operations
 */

import { createMultiModalModule } from '../index';
import {
  MultiModalConfig,
  VoiceProvider,
  VisionProvider,
  HapticPattern,
  EmotionType,
  VoiceSynthesisRequest,
  ImageInput,
  HapticFeedbackRequest,
  MultiModalMessage,
} from '../../../types/index';

interface BenchmarkResult {
  operation: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  iterations: number;
  throughput: number;
  errors: number;
}

/**
 * Performance benchmark for multi-modal operations
 */
export class MultiModalBenchmark {
  private module: any;
  private results: BenchmarkResult[] = [];

  async setup() {
    const config: MultiModalConfig = {
      voice: {
        provider: VoiceProvider.OPENAI_TTS,
        characteristics: {
          voiceId: 'nova',
          language: 'en-US',
        },
        enableEmotionModulation: true,
      },
      vision: {
        provider: VisionProvider.OPENAI_VISION,
        enableObjectDetection: true,
        enableSceneUnderstanding: true,
        visualMemory: {
          enabled: true,
          maxEntries: 1000,
          retentionDays: 30,
          importanceThreshold: 0.5,
        },
      },
      haptic: {
        enabled: true,
        defaultIntensity: 0.7,
        emotionPatterns: {} as any,
      },
      crossModalLearning: true,
      synchronization: {
        maxLatency: 100,
        temporalAlignment: true,
        bufferingStrategy: 'balanced',
      },
    };

    this.module = await createMultiModalModule(config);
    console.log('✅ Benchmark setup complete\n');
  }

  async benchmarkVoiceSynthesis(iterations: number = 100) {
    console.log(
      `🎤 Benchmarking Voice Synthesis (${iterations} iterations)...`
    );

    const times: number[] = [];
    let errors = 0;

    const testPhrases = [
      'Hello, world!',
      'The quick brown fox jumps over the lazy dog.',
      'How are you feeling today?',
      "I'm excited to help you with your project!",
      'Let me analyze that information for you.',
    ];

    const emotions: EmotionType[] = [
      'happy',
      'sad',
      'confident',
      'curious',
      'neutral',
    ];

    for (let i = 0; i < iterations; i++) {
      const phrase = testPhrases[i % testPhrases.length];
      const emotion = emotions[i % emotions.length];

      const request: VoiceSynthesisRequest = {
        text: phrase,
        agentId: 'benchmark',
        emotionState: {
          primary: emotion,
          emotions: { [emotion]: 0.8 } as any,
          intensity: 0.8,
          timestamp: Date.now(),
        },
      };

      const startTime = performance.now();

      try {
        await this.module.synthesizeVoice(request);
        const endTime = performance.now();
        times.push(endTime - startTime);
      } catch (error) {
        errors++;
      }
    }

    this.addResult('Voice Synthesis', times, errors);
  }

  async benchmarkVisionProcessing(iterations: number = 50) {
    console.log(
      `\n👁️ Benchmarking Vision Processing (${iterations} iterations)...`
    );

    const times: number[] = [];
    let errors = 0;

    // Create test images of different complexities
    const testImages: ImageInput[] = [
      { data: this.generateTestImage('simple'), mimeType: 'image/jpeg' },
      { data: this.generateTestImage('moderate'), mimeType: 'image/jpeg' },
      { data: this.generateTestImage('complex'), mimeType: 'image/jpeg' },
    ];

    for (let i = 0; i < iterations; i++) {
      const image = testImages[i % testImages.length];

      const startTime = performance.now();

      try {
        await this.module.processVision(image);
        const endTime = performance.now();
        times.push(endTime - startTime);
      } catch (error) {
        errors++;
      }
    }

    this.addResult('Vision Processing', times, errors);
  }

  async benchmarkHapticGeneration(iterations: number = 1000) {
    console.log(
      `\n🤚 Benchmarking Haptic Generation (${iterations} iterations)...`
    );

    const times: number[] = [];
    let errors = 0;

    const patterns = [
      HapticPattern.TAP,
      HapticPattern.DOUBLE_TAP,
      HapticPattern.PULSE,
      HapticPattern.CONTINUOUS,
      HapticPattern.RAMP_UP,
    ];

    for (let i = 0; i < iterations; i++) {
      const pattern = patterns[i % patterns.length];

      const request: HapticFeedbackRequest = {
        pattern,
        intensity: 0.5 + (i % 5) * 0.1,
        duration: 100 + (i % 10) * 50,
      };

      const startTime = performance.now();

      try {
        await this.module.generateHaptic(request);
        const endTime = performance.now();
        times.push(endTime - startTime);
      } catch (error) {
        errors++;
      }
    }

    this.addResult('Haptic Generation', times, errors);
  }

  async benchmarkMultiModalProcessing(iterations: number = 50) {
    console.log(
      `\n🎭 Benchmarking Multi-Modal Processing (${iterations} iterations)...`
    );

    const times: number[] = [];
    let errors = 0;

    for (let i = 0; i < iterations; i++) {
      const message: MultiModalMessage = {
        id: `bench-${i}`,
        agentId: 'benchmark',
        modalities: ['text', 'vision', 'haptic'],
        text: `Benchmark message ${i}`,
        vision: {
          images: [
            {
              data: this.generateTestImage('simple'),
              mimeType: 'image/jpeg',
            },
          ],
        },
        haptic: {
          pattern: HapticPattern.TAP,
        },
        timestamp: Date.now(),
      };

      const startTime = performance.now();

      try {
        await this.module.processInput(message);
        const endTime = performance.now();
        times.push(endTime - startTime);
      } catch (error) {
        errors++;
      }
    }

    this.addResult('Multi-Modal Processing', times, errors);
  }

  async benchmarkVisualMemory(iterations: number = 100) {
    console.log(
      `\n🧠 Benchmarking Visual Memory (${iterations} iterations)...`
    );

    const times: number[] = [];
    let errors = 0;

    // First, store some memories
    for (let i = 0; i < 20; i++) {
      await this.module.processVision({
        data: this.generateTestImage('memory'),
        mimeType: 'image/jpeg',
      });
    }

    // Benchmark retrieval
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      try {
        await this.module.getVisualMemories('benchmark', {
          limit: 10,
          minImportance: 0.5,
        });
        const endTime = performance.now();
        times.push(endTime - startTime);
      } catch (error) {
        errors++;
      }
    }

    this.addResult('Visual Memory Retrieval', times, errors);
  }

  async runFullBenchmark() {
    console.log('🚀 Starting Multi-Modal Performance Benchmark\n');
    console.log('This will test all multi-modal operations...\n');

    await this.setup();

    await this.benchmarkVoiceSynthesis(100);
    await this.benchmarkVisionProcessing(50);
    await this.benchmarkHapticGeneration(1000);
    await this.benchmarkMultiModalProcessing(50);
    await this.benchmarkVisualMemory(100);

    this.printResults();
    this.printRecommendations();

    await this.module.cleanup();
  }

  private addResult(operation: string, times: number[], errors: number) {
    if (times.length === 0) {
      console.log(`   ❌ No successful operations for ${operation}`);
      return;
    }

    const sorted = times.sort((a, b) => a - b);
    const average = times.reduce((a, b) => a + b) / times.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const throughput = 1000 / average; // operations per second

    this.results.push({
      operation,
      averageTime: average,
      minTime: min,
      maxTime: max,
      iterations: times.length,
      throughput,
      errors,
    });

    console.log(`   ✓ Average: ${average.toFixed(2)}ms`);
    console.log(`   ✓ Min/Max: ${min.toFixed(2)}ms / ${max.toFixed(2)}ms`);
    console.log(`   ✓ Throughput: ${throughput.toFixed(2)} ops/sec`);
    if (errors > 0) {
      console.log(`   ⚠️ Errors: ${errors}`);
    }
  }

  private printResults() {
    console.log('\n\n📊 Benchmark Results Summary\n');
    console.log(
      'Operation                  | Avg Time | Min Time | Max Time | Throughput | Errors'
    );
    console.log(
      '---------------------------|----------|----------|----------|------------|-------'
    );

    for (const result of this.results) {
      console.log(
        `${result.operation.padEnd(26)} | ` +
          `${result.averageTime.toFixed(1).padStart(7)}ms | ` +
          `${result.minTime.toFixed(1).padStart(7)}ms | ` +
          `${result.maxTime.toFixed(1).padStart(7)}ms | ` +
          `${result.throughput.toFixed(1).padStart(9)}/s | ` +
          `${result.errors.toString().padStart(6)}`
      );
    }
  }

  private printRecommendations() {
    console.log('\n\n💡 Performance Recommendations\n');

    for (const result of this.results) {
      if (result.operation === 'Voice Synthesis') {
        if (result.averageTime > 500) {
          console.log(
            '⚠️ Voice Synthesis: Consider using caching for repeated phrases'
          );
        } else {
          console.log('✅ Voice Synthesis: Performance is excellent');
        }
      } else if (result.operation === 'Vision Processing') {
        if (result.averageTime > 1000) {
          console.log(
            '⚠️ Vision Processing: Consider reducing image size or complexity'
          );
        } else {
          console.log('✅ Vision Processing: Performance is good');
        }
      } else if (result.operation === 'Haptic Generation') {
        if (result.averageTime > 50) {
          console.log('⚠️ Haptic Generation: May cause noticeable delays');
        } else {
          console.log(
            '✅ Haptic Generation: Latency is within acceptable range'
          );
        }
      }
    }

    const totalAverage =
      this.results.reduce((sum, r) => sum + r.averageTime, 0) /
      this.results.length;

    console.log(`\n📈 Overall Performance Score: ${this.calculateScore()}/100`);
    console.log(
      `   Average latency across all operations: ${totalAverage.toFixed(2)}ms`
    );
  }

  private calculateScore(): number {
    let score = 100;

    for (const result of this.results) {
      // Deduct points based on latency targets
      if (result.operation === 'Voice Synthesis' && result.averageTime > 500) {
        score -= 10;
      }
      if (
        result.operation === 'Vision Processing' &&
        result.averageTime > 1000
      ) {
        score -= 10;
      }
      if (result.operation === 'Haptic Generation' && result.averageTime > 50) {
        score -= 5;
      }
      if (
        result.operation === 'Multi-Modal Processing' &&
        result.averageTime > 200
      ) {
        score -= 15;
      }

      // Deduct for errors
      if (result.errors > 0) {
        score -= Math.min(10, result.errors);
      }
    }

    return Math.max(0, score);
  }

  private generateTestImage(complexity: string): string {
    // Generate mock base64 image data
    // In real implementation, this would create actual test images
    const size =
      complexity === 'simple' ? 100 : complexity === 'moderate' ? 500 : 1000;
    return `data:image/jpeg;base64,${btoa('x'.repeat(size))}`;
  }
}

// Run benchmark if executed directly
if (require.main === module) {
  const benchmark = new MultiModalBenchmark();
  benchmark.runFullBenchmark().catch(console.error);
}

export { MultiModalBenchmark };
