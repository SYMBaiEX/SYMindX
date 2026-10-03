import { SYMindXError } from './errors.js';
import { isJsonValue } from './validation.js';
import type { JsonSchema, JsonValue, ProviderTool, ToolDefinition } from './types.js';
function invalid(path: string): never {
  throw new SYMindXError('VALIDATION', `Tool arguments do not satisfy schema at ${path}`);
}
export function validateArguments(
  value: unknown,
  schema: JsonSchema,
  path = '$',
  depth = 0,
): asserts value is JsonValue {
  if (depth > 8 || !isJsonValue(value)) invalid(path);
  if (schema.enum && !schema.enum.some((item) => JSON.stringify(item) === JSON.stringify(value)))
    invalid(path);
  switch (schema.type) {
    case 'object': {
      if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(path);
      const properties = schema.properties ?? {};
      for (const required of schema.required ?? [])
        if (!Object.hasOwn(value, required)) invalid(`${path}.${required}`);
      for (const [key, item] of Object.entries(value)) {
        if (Object.hasOwn(properties, key))
          validateArguments(item, properties[key]!, `${path}.${key}`, depth + 1);
        else if (schema.additionalProperties !== true) invalid(`${path}.${key}`);
      }
      break;
    }
    case 'array':
      if (
        !Array.isArray(value) ||
        (schema.maxItems !== undefined && value.length > schema.maxItems)
      )
        invalid(path);
      if (schema.items)
        for (const item of value) validateArguments(item, schema.items, `${path}[]`, depth + 1);
      break;
    case 'string':
      if (
        typeof value !== 'string' ||
        (schema.minLength !== undefined && value.length < schema.minLength) ||
        (schema.maxLength !== undefined && value.length > schema.maxLength)
      )
        invalid(path);
      break;
    case 'number':
    case 'integer':
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        (schema.type === 'integer' && !Number.isInteger(value)) ||
        (schema.minimum !== undefined && value < schema.minimum) ||
        (schema.maximum !== undefined && value > schema.maximum)
      )
        invalid(path);
      break;
    case 'boolean':
      if (typeof value !== 'boolean') invalid(path);
      break;
    case 'null':
      if (value !== null) invalid(path);
      break;
    default:
      invalid(path);
  }
}
function validateSchema(schema: JsonSchema, depth = 0): void {
  if (
    !schema ||
    typeof schema !== 'object' ||
    Array.isArray(schema) ||
    depth > 8 ||
    !['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].includes(schema.type)
  )
    throw new SYMindXError('CONFIGURATION', 'Unsupported tool input schema');
  const common = ['type', 'enum'];
  const applicable: Record<JsonSchema['type'], string[]> = {
    object: ['properties', 'required', 'additionalProperties'],
    array: ['items', 'maxItems'],
    string: ['minLength', 'maxLength'],
    number: ['minimum', 'maximum'],
    integer: ['minimum', 'maximum'],
    boolean: [],
    null: [],
  };
  if (
    Object.keys(schema).some(
      (key) => !common.includes(key) && !applicable[schema.type].includes(key),
    )
  )
    throw new SYMindXError(
      'CONFIGURATION',
      'Tool schema contains an unsupported keyword for its type',
    );
  if (
    schema.enum !== undefined &&
    (!Array.isArray(schema.enum) ||
      schema.enum.length > 100 ||
      !schema.enum.every((item) => isJsonValue(item)))
  )
    throw new SYMindXError('CONFIGURATION', 'Invalid tool schema enum');
  if (schema.type === 'object') {
    if (schema.properties !== undefined) {
      const proto =
        schema.properties && typeof schema.properties === 'object'
          ? Object.getPrototypeOf(schema.properties)
          : undefined;
      if (
        !schema.properties ||
        Array.isArray(schema.properties) ||
        (proto !== Object.prototype && proto !== null)
      )
        throw new SYMindXError('CONFIGURATION', 'Tool schema properties must be a plain record');
      for (const child of Object.values(schema.properties)) validateSchema(child, depth + 1);
    }
    if (
      schema.required !== undefined &&
      (!Array.isArray(schema.required) ||
        schema.required.some((key) => typeof key !== 'string') ||
        new Set(schema.required).size !== schema.required.length ||
        schema.required.some((key) => !Object.hasOwn(schema.properties ?? {}, key)))
    )
      throw new SYMindXError(
        'CONFIGURATION',
        'Tool schema required must name unique declared properties',
      );
    if (
      schema.additionalProperties !== undefined &&
      typeof schema.additionalProperties !== 'boolean'
    )
      throw new SYMindXError('CONFIGURATION', 'Tool schema additionalProperties must be boolean');
  }
  if (schema.type === 'array' && schema.items !== undefined)
    validateSchema(schema.items, depth + 1);
  if (schema.type === 'number' || schema.type === 'integer') {
    for (const limit of [schema.minimum, schema.maximum])
      if (limit !== undefined && (!Number.isFinite(limit) || Math.abs(limit) > 1e9))
        throw new SYMindXError('CONFIGURATION', 'Invalid tool schema numeric limit');
    if (
      schema.minimum !== undefined &&
      schema.maximum !== undefined &&
      schema.minimum > schema.maximum
    )
      throw new SYMindXError('CONFIGURATION', 'Tool schema minimum exceeds maximum');
  }
  if (schema.type === 'string') {
    for (const limit of [schema.minLength, schema.maxLength])
      if (limit !== undefined && (!Number.isInteger(limit) || limit < 0 || limit > 1e9))
        throw new SYMindXError('CONFIGURATION', 'Invalid tool schema size limit');
    if (
      schema.minLength !== undefined &&
      schema.maxLength !== undefined &&
      schema.minLength > schema.maxLength
    )
      throw new SYMindXError('CONFIGURATION', 'Tool schema minLength exceeds maxLength');
  }
  if (
    schema.type === 'array' &&
    schema.maxItems !== undefined &&
    (!Number.isInteger(schema.maxItems) || schema.maxItems < 0 || schema.maxItems > 1e9)
  )
    throw new SYMindXError('CONFIGURATION', 'Invalid tool schema size limit');
}
function validateSerializedSchema(schema: JsonSchema): void {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(schema);
  } catch {
    throw new SYMindXError('CONFIGURATION', 'Tool schema cannot be serialized');
  }
  if (typeof serialized !== 'string')
    throw new SYMindXError('CONFIGURATION', 'Tool schema cannot be serialized');
  if (serialized.length > 16_000)
    throw new SYMindXError('CONFIGURATION', 'Tool schema exceeds 16000 characters');
}
export class ToolRegistry {
  private readonly definitions = new Map<string, ToolDefinition>();
  constructor(definitions: ToolDefinition[]) {
    if (!Array.isArray(definitions) || definitions.length > 64)
      throw new SYMindXError('CONFIGURATION', 'At most 64 tools can be registered');
    for (const definition of definitions) {
      if (
        !definition ||
        typeof definition !== 'object' ||
        Array.isArray(definition) ||
        typeof definition.name !== 'string' ||
        !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(definition.name) ||
        typeof definition.description !== 'string' ||
        !definition.description.trim() ||
        definition.description.length > 2000 ||
        !['read', 'write'].includes(definition.effect) ||
        typeof definition.execute !== 'function' ||
        this.definitions.has(definition.name)
      )
        throw new SYMindXError('CONFIGURATION', 'Invalid or duplicate tool definition');
      validateSchema(definition.inputSchema);
      validateSerializedSchema(definition.inputSchema);
      if (definition.inputSchema.type !== 'object')
        throw new SYMindXError('CONFIGURATION', 'Tool input schema must describe an object');
      this.definitions.set(definition.name, {
        ...definition,
        inputSchema: structuredClone(definition.inputSchema),
      });
    }
  }
  get(name: string): ToolDefinition | undefined {
    const definition = this.definitions.get(name);
    return definition
      ? { ...definition, inputSchema: structuredClone(definition.inputSchema) }
      : undefined;
  }
  advertised(names: string[]): ProviderTool[] {
    return names.map((name) => {
      const tool = this.definitions.get(name);
      if (!tool)
        throw new SYMindXError('CONFIGURATION', `Character requests unregistered tool: ${name}`);
      return { name, description: tool.description, parameters: structuredClone(tool.inputSchema) };
    });
  }
}
export const clockTool: ToolDefinition = {
  name: 'clock',
  description: 'Read the current UTC time.',
  effect: 'read',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  execute: () => ({ utc: new Date().toISOString() }),
};
