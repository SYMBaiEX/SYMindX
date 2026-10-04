export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly readOnly: boolean;
}

export interface ToolRegistry {
  register(tool: ToolDefinition): void;
  get(name: string): ToolDefinition | undefined;
  list(): readonly ToolDefinition[];
}

const NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;

function copyTool(tool: ToolDefinition): ToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    readOnly: tool.readOnly,
  };
}

function assertTool(tool: ToolDefinition): void {
  if (!NAME_PATTERN.test(tool.name)) {
    throw new RangeError('invalid tool name');
  }
  if (tool.description.length === 0 || tool.description.length > 400) {
    throw new RangeError('invalid tool description');
  }
}

export function createToolRegistry(): ToolRegistry {
  const tools: ToolDefinition[] = [];

  return {
    register(tool: ToolDefinition): void {
      assertTool(tool);
      if (tools.some((entry) => entry.name === tool.name)) {
        throw new RangeError('duplicate tool name');
      }
      tools.push(copyTool(tool));
    },
    get(name: string): ToolDefinition | undefined {
      const found = tools.find((entry) => entry.name === name);
      return found === undefined ? undefined : copyTool(found);
    },
    list(): readonly ToolDefinition[] {
      return tools.map((entry) => copyTool(entry));
    },
  };
}
