import { SYMindXError } from './errors.js';
import type { JsonSchema, JsonValue, ProviderTool, ToolDefinition } from './types.js';
export function isJsonValue(value: unknown, depth = 0): value is JsonValue {
  if (depth > 12) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((item) => isJsonValue(item, depth + 1));
  if (typeof value !== 'object' || !value) return false;
  const prototype = Object.getPrototypeOf(value);
  return (
    (prototype === Object.prototype || prototype === null) &&
    Object.values(value).every((item) => isJsonValue(item, depth + 1))
  );
}
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
  ) {
    throw new SYMindXError('CONFIGURATION', 'Unsupported tool input schema');
  }
  const supported = [
    'type',
    'properties',
    'required',
    'additionalProperties',
    'items',
    'enum',
    'minimum',
    'maximum',
    'minLength',
    'maxLength',
    'maxItems',
  ];
  if (Object.keys(schema).some((key) => !supported.includes(key)))
    throw new SYMindXError('CONFIGURATION', 'Tool schema contains an unsupported keyword');
  if (schema.properties !== undefined) {
    const prototype =
      schema.properties && typeof schema.properties === 'object'
        ? Object.getPrototypeOf(schema.properties)
        : undefined;
    if (
      !schema.properties ||
      Array.isArray(schema.properties) ||
      (prototype !== Object.prototype && prototype !== null)
    )
      throw new SYMindXError('CONFIGURATION', 'Tool schema properties must be a plain record');
  }
  if (schema.required !== undefined) {
    if (
      !Array.isArray(schema.required) ||
      schema.required.some((key) => typeof key !== 'string') ||
      new Set(schema.required).size !== schema.required.length
    ) {
      throw new SYMindXError('CONFIGURATION', 'Tool schema required must be a unique string array');
    }
    if (schema.required.some((key) => !Object.hasOwn(schema.properties ?? {}, key)))
      throw new SYMindXError('CONFIGURATION', 'Tool schema requires an undeclared property');
  }
  if (schema.additionalProperties !== undefined && typeof schema.additionalProperties !== 'boolean')
    throw new SYMindXError('CONFIGURATION', 'Tool schema additionalProperties must be boolean');
  for (const child of Object.values(schema.properties ?? {})) validateSchema(child, depth + 1);
  if (schema.items !== undefined) validateSchema(schema.items, depth + 1);
  for (const limit of [schema.minimum, schema.maximum]) {
    if (limit !== undefined && (!Number.isFinite(limit) || Math.abs(limit) > 1e9))
      throw new SYMindXError('CONFIGURATION', 'Invalid tool schema numeric limit');
  }
  for (const limit of [schema.minLength, schema.maxLength, schema.maxItems]) {
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 0 || limit > 1e9))
      throw new SYMindXError('CONFIGURATION', 'Invalid tool schema size limit');
  }
  if (
    schema.minimum !== undefined &&
    schema.maximum !== undefined &&
    schema.minimum > schema.maximum
  )
    throw new SYMindXError('CONFIGURATION', 'Tool schema minimum exceeds maximum');
  if (
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength > schema.maxLength
  )
    throw new SYMindXError('CONFIGURATION', 'Tool schema minLength exceeds maxLength');
  if (
    schema.enum !== undefined &&
    (!Array.isArray(schema.enum) ||
      schema.enum.length > 100 ||
      !schema.enum.every((value) => isJsonValue(value)))
  )
    throw new SYMindXError('CONFIGURATION', 'Invalid tool schema enum');
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
    if (definitions.length > 64)
      throw new SYMindXError('CONFIGURATION', 'At most 64 tools can be registered');
    for (const definition of definitions) {
      if (
        !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(definition.name) ||
        !definition.description ||
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
    return this.definitions.get(name);
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
