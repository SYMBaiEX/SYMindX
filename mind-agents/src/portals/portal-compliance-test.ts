/**
 * Portal AI SDK v5 Compliance Test Suite
 *
 * This module provides comprehensive testing for AI SDK v5 compliance
 * across all portal implementations.
 */

import { tool } from 'ai';
import { z } from 'zod';

import {
  Portal,
  PortalCapability,
  MessageRole,
  ChatMessage,
} from '../types/portal';

/**
 * Test results interface
 */
export interface PortalComplianceTestResult {
  portalId: string;
  portalName: string;
  passed: boolean;
  tests: {
    name: string;
    passed: boolean;
    error?: string;
    details?: any;
  }[];
  aiSdkV5Compliance: {
    textGeneration: boolean;
    chatGeneration: boolean;
    embeddings: boolean;
    streaming: boolean;
    tools: boolean;
    multiStep: boolean;
    imageGeneration: boolean;
  };
  recommendations: string[];
}

/**
 * Portal compliance tester
 */
export class PortalComplianceTester {
  /**
   * Test a portal for AI SDK v5 compliance
   */
  async testPortal(portal: Portal): Promise<PortalComplianceTestResult> {
    const tests: PortalComplianceTestResult['tests'] = [];
    const recommendations: string[] = [];

    // Test 1: Basic initialization
    tests.push(await this.testInitialization(portal));

    // Test 2: Text generation
    tests.push(await this.testTextGeneration(portal));

    // Test 3: Chat generation
    tests.push(await this.testChatGeneration(portal));

    // Test 4: Embeddings
    tests.push(await this.testEmbeddings(portal));

    // Test 5: Streaming
    tests.push(await this.testStreaming(portal));

    // Test 6: Tool support
    tests.push(await this.testToolSupport(portal));

    // Test 7: Multi-step execution
    tests.push(await this.testMultiStepExecution(portal));

    // Test 8: Image generation (if supported)
    if (portal.hasCapability(PortalCapability.IMAGE_GENERATION)) {
      tests.push(await this.testImageGeneration(portal));
    }

    // Test 9: Batch embeddings
    tests.push(await this.testBatchEmbeddings(portal));

    // Test 10: Enhanced streaming
    tests.push(await this.testEnhancedStreaming(portal));

    // Calculate compliance
    const compliance = {
      textGeneration:
        tests.find((t) => t.name === 'Text Generation')?.passed || false,
      chatGeneration:
        tests.find((t) => t.name === 'Chat Generation')?.passed || false,
      embeddings: tests.find((t) => t.name === 'Embeddings')?.passed || false,
      streaming: tests.find((t) => t.name === 'Streaming')?.passed || false,
      tools: tests.find((t) => t.name === 'Tool Support')?.passed || false,
      multiStep:
        tests.find((t) => t.name === 'Multi-Step Execution')?.passed || false,
      imageGeneration:
        tests.find((t) => t.name === 'Image Generation')?.passed || false,
    };

    // Generate recommendations
    if (!compliance.textGeneration) {
      recommendations.push(
        'Implement proper AI SDK v5 text generation using generateText()'
      );
    }
    if (!compliance.streaming) {
      recommendations.push(
        'Implement streaming with streamText() for better performance'
      );
    }
    if (!compliance.tools) {
      recommendations.push('Add tool support for advanced capabilities');
    }
    if (!compliance.multiStep) {
      recommendations.push('Implement multi-step execution with stepCountIs()');
    }
    if (!tests.find((t) => t.name === 'Batch Embeddings')?.passed) {
      recommendations.push(
        'Implement batch embeddings with embedMany() for better performance'
      );
    }

    return {
      portalId: portal.id,
      portalName: portal.name,
      passed: tests.every((t) => t.passed),
      tests,
      aiSdkV5Compliance: compliance,
      recommendations,
    };
  }

  /**
   * Test portal initialization
   */
  private async testInitialization(
    portal: Portal
  ): Promise<PortalComplianceTestResult['tests'][0]> {
    try {
      // Check if portal is properly configured
      if (
        !portal.config.apiKey &&
        !process.env[`${portal.id.toUpperCase()}_API_KEY`]
      ) {
        throw new Error('API key not configured');
      }

      return {
        name: 'Initialization',
        passed: true,
        details: {
          id: portal.id,
          name: portal.name,
          version: portal.version,
          status: portal.status,
        },
      };
    } catch (error) {
      return {
        name: 'Initialization',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test text generation
   */
  private async testTextGeneration(
    portal: Portal
  ): Promise<PortalComplianceTestResult['tests'][0]> {
    try {
      const result = await portal.generateText('Hello, world!', {
        maxOutputTokens: 50,
        temperature: 0.7,
      });

      return {
        name: 'Text Generation',
        passed: true,
        details: {
          responseLength: result.text.length,
          model: result.model,
          usage: result.usage,
        },
      };
    } catch (error) {
      return {
        name: 'Text Generation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test chat generation
   */
  private async testChatGeneration(
    portal: Portal
  ): Promise<PortalComplianceTestResult['tests'][0]> {
    try {
      const messages: ChatMessage[] = [
        { role: MessageRole.USER, content: 'Hello!', timestamp: new Date() },
      ];

      const result = await portal.generateChat(messages, {
        maxOutputTokens: 50,
        temperature: 0.7,
      });

      return {
        name: 'Chat Generation',
        passed: true,
        details: {
          responseLength: result.text.length,
          model: result.model,
          usage: result.usage,
        },
      };
    } catch (error) {
      return {
        name: 'Chat Generation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test embeddings
   */
  private async testEmbeddings(
    portal: Portal
  ): Promise<PortalComplianceTestResult['tests'][0]> {
    try {
      const result = await portal.generateEmbedding('Test embedding');

      return {
        name: 'Embeddings',
        passed: true,
        details: {
          dimensions: result.dimensions,
          model: result.model,
        },
      };
    } catch (error) {
      return {
        name: 'Embeddings',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test streaming
   */
  private async testStreaming(
    portal: Portal
  ): Promise<PortalComplianceTestResult['tests'][0]> {
    try {
      if (!portal.hasCapability(PortalCapability.STREAMING)) {
        return {
          name: 'Streaming',
          passed: false,
          error: 'Portal does not support streaming',
        };
      }

      const chunks: string[] = [];
      const stream = portal.streamText('Count from 1 to 5', {
        maxOutputTokens: 100,
      });

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return {
        name: 'Streaming',
        passed: chunks.length > 0,
        details: {
          chunks: chunks.length,
          totalLength: chunks.join('').length,
        },
      };
    } catch (error) {
      return {
        name: 'Streaming',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test tool support
   */
  private async testToolSupport(
    portal: Portal
  ): Promise<PortalComplianceTestResult['tests'][0]> {
    try {
      if (!portal.hasCapability(PortalCapability.TOOL_USAGE)) {
        return {
          name: 'Tool Support',
          passed: false,
          error: 'Portal does not support tools',
        };
      }

      // Create a simple test tool
      const testTool = tool({
        description: 'A test tool',
        parameters: z.object({
          input: z.string(),
        }),
        execute: async ({ input }) => {
          return `Processed: ${input}`;
        },
      });

      // Test if portal can handle tools (check if method exists)
      const hasMultiStep =
        typeof (portal as any).generateTextMultiStep === 'function';

      return {
        name: 'Tool Support',
        passed: hasMultiStep,
        details: {
          multiStepSupported: hasMultiStep,
        },
      };
    } catch (error) {
      return {
        name: 'Tool Support',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test multi-step execution
   */
  private async testMultiStepExecution(
    portal: Portal
  ): Promise<PortalComplianceTestResult['tests'][0]> {
    try {
      // Check if portal implements multi-step methods
      const hasMultiStep =
        typeof (portal as any).generateTextMultiStep === 'function';

      if (!hasMultiStep) {
        return {
          name: 'Multi-Step Execution',
          passed: false,
          error: 'Portal does not implement generateTextMultiStep',
        };
      }

      return {
        name: 'Multi-Step Execution',
        passed: true,
        details: {
          methodImplemented: true,
        },
      };
    } catch (error) {
      return {
        name: 'Multi-Step Execution',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test image generation
   */
  private async testImageGeneration(
    portal: Portal
  ): Promise<PortalComplianceTestResult['tests'][0]> {
    try {
      const result = await portal.generateImage('A beautiful sunset', {
        size: '1024x1024',
        quality: 'standard',
      });

      return {
        name: 'Image Generation',
        passed: true,
        details: {
          images: result.images.length,
          model: result.model,
        },
      };
    } catch (error) {
      return {
        name: 'Image Generation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test batch embeddings
   */
  private async testBatchEmbeddings(
    portal: Portal
  ): Promise<PortalComplianceTestResult['tests'][0]> {
    try {
      // Check if portal implements batch embedding method
      const hasBatchMethod =
        typeof (portal as any).generateEmbeddingBatch === 'function';

      if (!hasBatchMethod) {
        return {
          name: 'Batch Embeddings',
          passed: false,
          error: 'Portal does not implement generateEmbeddingBatch',
        };
      }

      const texts = ['Hello', 'World', 'Test'];
      const results = await (portal as any).generateEmbeddingBatch(texts);

      return {
        name: 'Batch Embeddings',
        passed: results.length === texts.length,
        details: {
          inputCount: texts.length,
          outputCount: results.length,
        },
      };
    } catch (error) {
      return {
        name: 'Batch Embeddings',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test enhanced streaming
   */
  private async testEnhancedStreaming(
    portal: Portal
  ): Promise<PortalComplianceTestResult['tests'][0]> {
    try {
      // Check if portal implements enhanced streaming method
      const hasEnhancedMethod =
        typeof (portal as any).streamTextEnhanced === 'function';

      return {
        name: 'Enhanced Streaming',
        passed: hasEnhancedMethod,
        details: {
          methodImplemented: hasEnhancedMethod,
        },
      };
    } catch (error) {
      return {
        name: 'Enhanced Streaming',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test all registered portals
   */
  async testAllPortals(portals: Portal[]): Promise<{
    summary: {
      total: number;
      passed: number;
      failed: number;
      complianceRate: number;
    };
    results: PortalComplianceTestResult[];
  }> {
    const results: PortalComplianceTestResult[] = [];

    for (const portal of portals) {
      console.log(`Testing portal: ${portal.name}...`);
      const result = await this.testPortal(portal);
      results.push(result);
    }

    const passed = results.filter((r) => r.passed).length;

    return {
      summary: {
        total: portals.length,
        passed,
        failed: portals.length - passed,
        complianceRate: Math.round((passed / portals.length) * 100),
      },
      results,
    };
  }

  /**
   * Generate compliance report
   */
  generateReport(results: PortalComplianceTestResult[]): string {
    let report = '# Portal AI SDK v5 Compliance Report\n\n';

    // Summary
    const passed = results.filter((r) => r.passed).length;
    const total = results.length;
    const complianceRate = Math.round((passed / total) * 100);

    report += `## Summary\n\n`;
    report += `- Total Portals: ${total}\n`;
    report += `- Passed: ${passed}\n`;
    report += `- Failed: ${total - passed}\n`;
    report += `- Compliance Rate: ${complianceRate}%\n\n`;

    // Individual portal results
    report += `## Portal Results\n\n`;

    for (const result of results) {
      report += `### ${result.portalName} (${result.portalId})\n\n`;
      report += `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

      // Compliance matrix
      report += `#### AI SDK v5 Compliance\n\n`;
      report += `| Feature | Status |\n`;
      report += `|---------|--------|\n`;
      report += `| Text Generation | ${result.aiSdkV5Compliance.textGeneration ? '✅' : '❌'} |\n`;
      report += `| Chat Generation | ${result.aiSdkV5Compliance.chatGeneration ? '✅' : '❌'} |\n`;
      report += `| Embeddings | ${result.aiSdkV5Compliance.embeddings ? '✅' : '❌'} |\n`;
      report += `| Streaming | ${result.aiSdkV5Compliance.streaming ? '✅' : '❌'} |\n`;
      report += `| Tools | ${result.aiSdkV5Compliance.tools ? '✅' : '❌'} |\n`;
      report += `| Multi-Step | ${result.aiSdkV5Compliance.multiStep ? '✅' : '❌'} |\n`;
      report += `| Image Generation | ${result.aiSdkV5Compliance.imageGeneration ? '✅' : '❌'} |\n\n`;

      // Test details
      report += `#### Test Results\n\n`;
      for (const test of result.tests) {
        report += `- ${test.name}: ${test.passed ? '✅' : '❌'}`;
        if (test.error) {
          report += ` - Error: ${test.error}`;
        }
        report += '\n';
      }
      report += '\n';

      // Recommendations
      if (result.recommendations.length > 0) {
        report += `#### Recommendations\n\n`;
        for (const rec of result.recommendations) {
          report += `- ${rec}\n`;
        }
        report += '\n';
      }
    }

    return report;
  }
}

export default new PortalComplianceTester();
