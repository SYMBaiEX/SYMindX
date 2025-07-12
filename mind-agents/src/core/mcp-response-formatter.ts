/**
 * MCP Response Formatter
 *
 * Formats MCP tool results into natural, readable responses following best practices
 * for conversation flow when using Model Context Protocol with AI agents
 */

import { runtimeLogger } from '../utils/logger';

export interface ToolResult {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
  error?: string;
  timestamp: Date;
}

export interface ConversationContext {
  userQuery: string;
  previousMessages?: Array<{ role: string; content: string }>;
  agentPersonality?: string;
  responseStyle?: 'conversational' | 'detailed' | 'summary';
}

export class MCPResponseFormatter {
  /**
   * Format multiple tool results into a natural, cohesive response
   */
  static formatToolResults(
    results: ToolResult[],
    context: ConversationContext
  ): string {
    if (results.length === 0) {
      return this.formatNoResultsResponse(context);
    }

    // Handle errors gracefully
    const errors = results.filter((r) => r.error);
    if (errors.length === results.length) {
      return this.formatErrorResponse(errors, context);
    }

    // Format based on response style
    switch (context.responseStyle || 'conversational') {
      case 'conversational':
        return this.formatConversationalResponse(results, context);
      case 'detailed':
        return this.formatDetailedResponse(results, context);
      case 'summary':
        return this.formatSummaryResponse(results, context);
      default:
        return this.formatConversationalResponse(results, context);
    }
  }

  /**
   * Format tool results in a natural, conversational style
   */
  private static formatConversationalResponse(
    results: ToolResult[],
    context: ConversationContext
  ): string {
    const successfulResults = results.filter((r) => !r.error);
    const partialErrors = results.filter((r) => r.error);

    let response = '';

    // Process each tool result naturally
    for (const result of successfulResults) {
      const formattedContent = this.formatSingleToolResult(result, context);
      if (formattedContent) {
        response += formattedContent + ' ';
      }
    }

    // Add error acknowledgment if there were partial failures
    if (partialErrors.length > 0) {
      response += this.formatPartialErrorAcknowledgment(partialErrors);
    }

    return response.trim();
  }

  /**
   * Format a single tool result based on the tool type
   */
  private static formatSingleToolResult(
    result: ToolResult,
    context: ConversationContext
  ): string {
    const { toolName, result: data } = result;

    // Handle Context7 documentation results
    if (toolName.includes('context7:')) {
      return this.formatContext7Result(toolName, data, context);
    }

    // Handle weather tools
    if (toolName.includes('weather')) {
      return this.formatWeatherResult(data);
    }

    // Handle calendar/scheduling tools
    if (toolName.includes('calendar') || toolName.includes('schedule')) {
      return this.formatCalendarResult(data);
    }

    // Handle search results
    if (toolName.includes('search')) {
      return this.formatSearchResult(data);
    }

    // Default formatting for unknown tools
    return this.formatGenericResult(toolName, data);
  }

  /**
   * Format Context7 documentation results
   */
  private static formatContext7Result(
    toolName: string,
    data: unknown,
    _context: ConversationContext
  ): string {
    if (toolName.includes('resolve-library-id')) {
      const libraries = data as Array<{
        id: string;
        name: string;
        description: string;
      }>;
      if (Array.isArray(libraries) && libraries.length > 0) {
        const lib = libraries[0];
        return `I found the ${lib?.name ?? 'requested'} library that matches your query.`;
      }
    }

    if (toolName.includes('get-library-docs')) {
      // Handle the actual Context7 response format
      if (typeof data === 'string') {
        // Context7 returns documentation as a formatted string
        const docs = data;

        // Extract key sections or summarize if too long
        const lines = docs.split('\n').filter((line) => line.trim());

        // Look for important sections like Overview, Usage, Examples
        const overview = this.extractSection(lines, 'overview', 'description');
        const usage = this.extractSection(lines, 'usage', 'how to use');
        const example = this.extractSection(lines, 'example', 'code');

        let response = '';

        if (overview) {
          response += overview + ' ';
        }

        if (usage) {
          response += usage + ' ';
        }

        if (example) {
          response += "Here's an example: " + example;
        }

        // If we couldn't extract specific sections, provide a summary
        if (!response) {
          const firstMeaningfulContent = lines.find(
            (line) =>
              line.length > 50 &&
              !line.startsWith('#') &&
              !line.startsWith('```') &&
              !line.includes('Table of Contents')
          );

          if (firstMeaningfulContent) {
            response = `Based on the documentation: ${firstMeaningfulContent}`;
          } else {
            response = 'I found comprehensive documentation for this topic.';
          }
        }

        return response.trim();
      }

      // Fallback for object format
      const docs = data as {
        content?: string;
        sections?: Array<{ title: string; content: string }>;
      };
      if (docs.content) {
        const keyInfo = this.extractKeyInformation(docs.content);
        return `Based on the documentation, ${keyInfo}`;
      }
    }

    return '';
  }

  /**
   * Extract a specific section from documentation lines
   */
  private static extractSection(
    lines: string[],
    ...keywords: string[]
  ): string | null {
    const keywordLower = keywords.map((k) => k.toLowerCase());

    // Find a line that contains any of the keywords
    const sectionIndex = lines.findIndex((line) => {
      const lineLower = line.toLowerCase();
      return keywordLower.some((keyword) => lineLower.includes(keyword));
    });

    if (sectionIndex === -1) return null;

    // Extract content after the section header
    let content = '';
    for (
      let i = sectionIndex + 1;
      i < lines.length && i < sectionIndex + 5;
      i++
    ) {
      const line = lines[i];
      if (!line) continue;

      // Stop at next section header
      if (line.startsWith('#') || line.startsWith('##')) break;

      // Skip code blocks and empty lines
      if (line.startsWith('```') || !line.trim()) continue;

      content += line + ' ';

      // Stop after getting meaningful content
      if (content.length > 150) break;
    }

    return content.trim() || null;
  }

  /**
   * Extract key information from documentation content
   */
  private static extractKeyInformation(content: string): string {
    // Look for common documentation patterns
    const lines = content.split('\n').filter((line) => line.trim());

    // Find description or overview
    const descriptionIndex = lines.findIndex(
      (line) =>
        line.toLowerCase().includes('description') ||
        line.toLowerCase().includes('overview')
    );

    if (descriptionIndex >= 0 && descriptionIndex < lines.length - 1) {
      const nextLine = lines[descriptionIndex + 1];
      const description = nextLine?.trim();
      if (description) {
        return description;
      }
    }

    // Find first meaningful paragraph
    const firstParagraph = lines.find(
      (line) =>
        line.length > 50 && !line.startsWith('#') && !line.startsWith('```')
    );

    if (firstParagraph) {
      return firstParagraph;
    }

    // Fallback to generic message
    return 'I found comprehensive documentation that covers this topic.';
  }

  /**
   * Format weather results naturally
   */
  private static formatWeatherResult(data: unknown): string {
    const weather = data as {
      temperature?: number;
      conditions?: string;
      location?: string;
      humidity?: number;
    };

    if (weather.temperature !== undefined && weather.conditions) {
      let response = `The current weather`;
      if (weather.location) {
        response += ` in ${weather.location}`;
      }
      response += ` is ${weather.temperature}°F with ${weather.conditions}.`;

      if (weather.humidity) {
        response += ` The humidity is ${weather.humidity}%.`;
      }

      return response;
    }

    return '';
  }

  /**
   * Format calendar/scheduling results
   */
  private static formatCalendarResult(data: unknown): string {
    const calendar = data as {
      events?: Array<{ title: string; time: string; duration?: string }>;
      date?: string;
    };

    if (calendar.events && Array.isArray(calendar.events)) {
      if (calendar.events.length === 0) {
        return `Your calendar is clear${calendar.date ? ` for ${calendar.date}` : ''}.`;
      }

      let response = `Looking at your calendar${calendar.date ? ` for ${calendar.date}` : ''}, you have `;

      if (calendar.events.length === 1) {
        const event = calendar.events[0];
        if (event) {
          response += `one event: ${event.title} at ${event.time}`;
          if (event.duration) {
            response += ` for ${event.duration}`;
          }
          response += '.';
        }
      } else {
        response += `${calendar.events.length} events scheduled.`;
      }

      return response;
    }

    return '';
  }

  /**
   * Format search results
   */
  private static formatSearchResult(data: unknown): string {
    const search = data as {
      results?: Array<{ title: string; snippet: string; url?: string }>;
      query?: string;
    };

    if (search.results && Array.isArray(search.results)) {
      if (search.results.length === 0) {
        return `I couldn't find any results${search.query ? ` for "${search.query}"` : ''}.`;
      }

      const topResult = search.results[0];
      if (topResult) {
        return `I found relevant information: ${topResult.snippet}`;
      }
    }

    return '';
  }

  /**
   * Format generic tool results
   */
  private static formatGenericResult(_toolName: string, data: unknown): string {
    if (typeof data === 'string') {
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      // Try to extract meaningful information
      const obj = data as Record<string, unknown>;

      // Look for common result patterns
      if ('message' in obj && typeof obj.message === 'string') {
        return obj.message;
      }

      if ('result' in obj && typeof obj.result === 'string') {
        return obj.result;
      }

      if ('data' in obj && typeof obj.data === 'string') {
        return obj.data;
      }
    }

    return '';
  }

  /**
   * Format detailed response with structure
   */
  private static formatDetailedResponse(
    results: ToolResult[],
    context: ConversationContext
  ): string {
    let response = "Here's what I found:\n\n";

    for (const result of results) {
      if (!result.error) {
        const formatted = this.formatSingleToolResult(result, context);
        if (formatted) {
          response += `• ${formatted}\n`;
        }
      }
    }

    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      response += '\n' + this.formatPartialErrorAcknowledgment(errors);
    }

    return response.trim();
  }

  /**
   * Format summary response
   */
  private static formatSummaryResponse(
    results: ToolResult[],
    context: ConversationContext
  ): string {
    const successfulResults = results.filter((r) => !r.error);

    if (successfulResults.length === 0) {
      return this.formatErrorResponse(results, context);
    }

    // Combine all results into a concise summary
    const summaryParts: string[] = [];

    for (const result of successfulResults) {
      const formatted = this.formatSingleToolResult(result, context);
      if (formatted && formatted.length > 0) {
        // Extract just the key information
        const keyInfo = formatted.split('.')[0];
        if (keyInfo) {
          summaryParts.push(keyInfo);
        }
      }
    }

    return summaryParts.join('. ') + '.';
  }

  /**
   * Format response when no results are available
   */
  private static formatNoResultsResponse(
    _context: ConversationContext
  ): string {
    return "I understand your question, but I don't have access to the tools needed to provide that information right now.";
  }

  /**
   * Format error response
   */
  private static formatErrorResponse(
    errors: ToolResult[],
    _context: ConversationContext
  ): string {
    const uniqueErrors = [...new Set(errors.map((e) => e.error))];

    if (uniqueErrors.length === 1 && uniqueErrors[0]?.includes('timeout')) {
      return 'The service is taking longer than expected to respond. Let me try a different approach.';
    }

    if (uniqueErrors.some((e) => e?.includes('permission'))) {
      return "I don't have permission to access that information. Is there something else I can help you with?";
    }

    return "I encountered an issue while looking up that information. Let me know if you'd like me to try something else.";
  }

  /**
   * Format partial error acknowledgment
   */
  private static formatPartialErrorAcknowledgment(
    errors: ToolResult[]
  ): string {
    if (errors.length === 1) {
      return " (Note: I couldn't access some additional information that might have been helpful.)";
    }

    return " (Note: Some information sources were unavailable, but I've provided what I could find.)";
  }

  /**
   * Log conversation flow for monitoring
   */
  static logConversationFlow(
    stage: string,
    details: Record<string, unknown>
  ): void {
    runtimeLogger.info(`MCP Flow - ${stage}`, {
      timestamp: new Date().toISOString(),
      stage,
      ...details,
    });
  }
}
