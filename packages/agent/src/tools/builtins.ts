import type { ToolDefinition } from './registry.js';

export function wordCountTool(): ToolDefinition {
  return {
    name: 'word-count',
    description: 'Count words in text',
    readOnly: true,
  };
}

export function clockTool(): ToolDefinition {
  return {
    name: 'clock',
    description: 'Read the current time',
    readOnly: true,
  };
}

export function jsonKeysTool(): ToolDefinition {
  return {
    name: 'json-keys',
    description: 'List the keys of a JSON object',
    readOnly: true,
  };
}
