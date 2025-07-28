/**
 * Advanced AI SDK v5 Tools Example
 *
 * This file demonstrates advanced tool usage patterns with AI SDK v5,
 * including multi-step execution, tool streaming, and orchestration.
 */

import { openai } from '@ai-sdk/openai';
import { tool, generateText, streamText } from 'ai';
import { z } from 'zod';

/**
 * Example: Weather Tool with Enhanced Callbacks
 */
export const weatherTool = tool({
  description: 'Get the weather in a location',
  parameters: z.object({
    location: z.string().describe('The location to get the weather for'),
    unit: z.enum(['celsius', 'fahrenheit']).describe('Temperature unit'),
  }),
  // Enhanced execute function with tool call ID access
  execute: async ({ location, unit }, { toolCallId }) => {
    console.log(`[${toolCallId}] Getting weather for ${location}`);

    // Simulate API call
    const temperature = Math.round(Math.random() * (90 - 32) + 32);
    const conditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];

    return {
      location,
      temperature:
        unit === 'celsius'
          ? Math.round(((temperature - 32) * 5) / 9)
          : temperature,
      unit,
      condition,
      humidity: Math.round(Math.random() * 100),
      windSpeed: Math.round(Math.random() * 30),
    };
  },
});

/**
 * Example: Location Tool that can be chained with Weather
 */
export const locationTool = tool({
  description: 'Get the current location of the user',
  parameters: z.object({}),
  execute: async () => {
    // Simulate location detection
    const cities = [
      { name: 'New York', lat: 40.7128, lon: -74.006 },
      { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
      { name: 'Chicago', lat: 41.8781, lon: -87.6298 },
      { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
    ];

    const city = cities[Math.floor(Math.random() * cities.length)];
    return city;
  },
});

/**
 * Example: Temperature Converter Tool
 */
export const temperatureConverterTool = tool({
  description: 'Convert temperature between different units',
  parameters: z.object({
    temperature: z.number().describe('The temperature value'),
    fromUnit: z.enum(['celsius', 'fahrenheit', 'kelvin']),
    toUnit: z.enum(['celsius', 'fahrenheit', 'kelvin']),
  }),
  execute: async ({ temperature, fromUnit, toUnit }) => {
    // Convert to Celsius first
    let celsius: number;
    switch (fromUnit) {
      case 'celsius':
        celsius = temperature;
        break;
      case 'fahrenheit':
        celsius = ((temperature - 32) * 5) / 9;
        break;
      case 'kelvin':
        celsius = temperature - 273.15;
        break;
    }

    // Convert from Celsius to target unit
    let result: number;
    switch (toUnit) {
      case 'celsius':
        result = celsius;
        break;
      case 'fahrenheit':
        result = (celsius * 9) / 5 + 32;
        break;
      case 'kelvin':
        result = celsius + 273.15;
        break;
    }

    return {
      original: { value: temperature, unit: fromUnit },
      converted: { value: Math.round(result * 100) / 100, unit: toUnit },
    };
  },
});

/**
 * Example: Streaming Tool with Progress Updates
 */
export const analysisTool = tool({
  description: 'Perform detailed analysis with progress updates',
  parameters: z.object({
    topic: z.string().describe('Topic to analyze'),
    depth: z.enum(['shallow', 'medium', 'deep']).describe('Analysis depth'),
  }),
  // Simple execute function returning final result
  execute: async ({ topic, depth }) => {
    const steps = depth === 'shallow' ? 3 : depth === 'medium' ? 5 : 10;

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Return final result
    return {
      topic,
      depth,
      findings: steps,
      summary: `Completed ${depth} analysis of ${topic} with ${steps} findings`,
    };
  },
});

/**
 * Example: Multi-Step Execution with Tools
 */
export async function multiStepExample() {
  const tools = {
    getLocation: locationTool,
    getWeather: weatherTool,
    convertTemperature: temperatureConverterTool,
  };

  const result = await generateText({
    model: openai('gpt-4o-mini') as any, // Cast to resolve v1/v2 compatibility
    messages: [
      {
        role: 'user',
        content:
          "What's the weather like where I am? Give me the temperature in both Celsius and Fahrenheit.",
      },
    ],
    tools,
    toolChoice: 'required',
    onStepFinish: async ({ toolCalls, toolResults }) => {
      console.log(`Step completed:`);

      if (toolCalls && toolCalls.length > 0) {
        for (const call of toolCalls) {
          console.log(`  - Called tool: ${call.toolName}`);
        }
      }

      if (toolResults && toolResults.length > 0) {
        for (const result of toolResults) {
          console.log(`  - Tool result:`, result.result);
        }
      }
    },
  });

  console.log('Final response:', result.text);
  console.log('Total steps:', result.steps?.length || 1);
}

/**
 * Example: Streaming with Tool Calls
 */
export async function streamingToolExample() {
  const tools = {
    weather: weatherTool,
    analysis: analysisTool,
  };

  const stream = streamText({
    model: openai('gpt-4o-mini') as any, // Cast to resolve v1/v2 compatibility
    messages: [
      {
        role: 'user',
        content:
          'Analyze the weather patterns in New York and give me a detailed report.',
      },
    ],
    tools,
    toolCallStreaming: true, // Enable tool call streaming
  });

  // Process the full stream to handle different event types
  for await (const chunk of stream.fullStream) {
    switch (chunk.type) {
      case 'text':
        process.stdout.write(chunk.text);
        break;

      case 'tool-call-streaming-start':
        console.log(
          `\n[Tool Starting] ${chunk.toolName} (${chunk.toolCallId})`
        );
        break;

      case 'tool-call-delta':
        // Stream tool input as it's being generated
        console.log(`[Tool Input Delta] ${chunk.argsTextDelta}`);
        break;

      case 'tool-call':
        console.log(`[Tool Call Complete] ${chunk.toolName}:`, chunk.args);
        break;

      case 'tool-result':
        console.log(`[Tool Result] ${chunk.toolName}:`, chunk.result);
        break;

      case 'finish':
        console.log('\n[Streaming Complete]');
        break;

      case 'error':
        console.error('[Error]', chunk.error);
        break;
    }
  }
}

/**
 * Example: Tool Orchestration Pattern
 */
export class WeatherAssistant {
  private tools: Record<string, any>;

  constructor() {
    this.tools = {
      getLocation: locationTool,
      getWeather: weatherTool,
      convertTemperature: temperatureConverterTool,
      analyze: analysisTool,
    };
  }

  /**
   * Get weather with automatic location detection and unit conversion
   */
  async getLocalWeather(preferredUnit: 'celsius' | 'fahrenheit' = 'celsius') {
    const result = await generateText({
      model: openai('gpt-4o-mini') as any, // Cast to resolve v1/v2 compatibility
      messages: [
        {
          role: 'system',
          content:
            "You are a weather assistant. Always provide temperature in the user's preferred unit.",
        },
        {
          role: 'user',
          content: `Get the current weather at my location. I prefer temperatures in ${preferredUnit}.`,
        },
      ],
      tools: this.tools,
      toolChoice: 'auto',
    });

    return {
      response: result.text,
      toolsUsed:
        result.steps?.flatMap(
          (s) => s.toolCalls?.map((tc) => tc.toolName) || []
        ) || [],
      steps: result.steps?.length || 1,
    };
  }

  /**
   * Analyze weather patterns with streaming updates
   */
  async *analyzeWeatherPatterns(
    location: string,
    depth: 'shallow' | 'medium' | 'deep' = 'medium'
  ) {
    const stream = streamText({
      model: openai('gpt-4o-mini') as any, // Cast to resolve v1/v2 compatibility
      messages: [
        {
          role: 'system',
          content:
            'You are a weather analysis expert. Provide detailed insights about weather patterns.',
        },
        {
          role: 'user',
          content: `Analyze the weather patterns in ${location} with ${depth} analysis.`,
        },
      ],
      tools: this.tools,
      toolCallStreaming: true,
    });

    for await (const chunk of stream.textStream) {
      yield chunk;
    }
  }
}

/**
 * Example: Error Handling in Tool Execution
 */
export const robustWeatherTool = tool({
  description: 'Get weather with error handling',
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => {
    try {
      // Simulate potential API failure
      if (Math.random() < 0.2) {
        throw new Error('Weather API temporarily unavailable');
      }

      return {
        location,
        temperature: Math.round(Math.random() * 30 + 10),
        condition: 'partly cloudy',
      };
    } catch (error) {
      // Return graceful fallback
      return {
        location,
        temperature: null,
        condition: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Example: Custom Stop Conditions
 */
export async function customStopExample() {
  const result = await generateText({
    model: openai('gpt-4o-mini') as any, // Cast to resolve v1/v2 compatibility
    messages: [
      {
        role: 'user',
        content:
          "Get weather for multiple cities until you find one that's sunny.",
      },
    ],
    tools: { weather: weatherTool },
  });

  console.log('Found sunny weather:', result.text);
}

// Export all tools for use in other parts of the application
export const advancedTools = {
  weather: weatherTool,
  location: locationTool,
  temperatureConverter: temperatureConverterTool,
  analysis: analysisTool,
  robustWeather: robustWeatherTool,
};

export default {
  tools: advancedTools,
  examples: {
    multiStep: multiStepExample,
    streaming: streamingToolExample,
    customStop: customStopExample,
  },
  WeatherAssistant,
};
