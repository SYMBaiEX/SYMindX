/**
 * Type Helper Utilities for exactOptionalPropertyTypes
 *
 * These utilities help properly handle optional properties when
 * exactOptionalPropertyTypes is enabled in TypeScript configuration.
 */

/**
 * Helper function to conditionally add optional properties to an object
 * Only adds properties that have defined values (not undefined or null)
 *
 * @example
 * const user = withOptionalProperties(
 *   { id: 1, name: 'John' },
 *   {
 *     email: userData.email,
 *     phone: userData.phone,
 *     address: userData.address
 *   }
 * );
 */
export function withOptionalProperties<
  T extends Record<string, any>,
  O extends Record<string, any>,
>(base: T, optionals: O): T & Partial<O> {
  const result = { ...base } as T & Partial<O>;

  for (const [key, value] of Object.entries(optionals)) {
    if (value !== undefined && value !== null) {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}

/**
 * Type-safe builder for objects with optional properties
 *
 * @example
 * const conversation = buildObject<Conversation>({
 *   id: row.id,
 *   agentId: row.agent_id,
 *   status: row.status as ConversationStatus
 * })
 * .addOptional('title', row.title)
 * .addOptional('deletedAt', row.deleted_at ? new Date(row.deleted_at) : undefined)
 * .build();
 */
export class ObjectBuilder<T> {
  private obj: Partial<T>;

  constructor(base: Partial<T>) {
    this.obj = { ...base };
  }

  addOptional<K extends keyof T>(key: K, value: T[K] | undefined): this {
    if (value !== undefined) {
      this.obj[key] = value;
    }
    return this;
  }

  addRequired<K extends keyof T>(key: K, value: T[K]): this {
    this.obj[key] = value;
    return this;
  }

  build(): T {
    return this.obj as T;
  }
}

/**
 * Creates an object builder instance
 */
export function buildObject<T>(base: Partial<T>): ObjectBuilder<T> {
  return new ObjectBuilder<T>(base);
}

/**
 * Converts database rows to domain objects with proper optional property handling
 *
 * @example
 * const conversations = rows.map(row =>
 *   mapRowToObject<DBRow, Conversation>(row, {
 *     id: r => r.id,
 *     agentId: r => r.agent_id,
 *     title: r => r.title || undefined,
 *     deletedAt: r => r.deleted_at ? new Date(r.deleted_at) : undefined
 *   })
 * );
 */
export function mapRowToObject<
  TRow extends Record<string, any>,
  TResult extends Record<string, any>,
>(
  row: TRow,
  mapping: { [K in keyof TResult]: (row: TRow) => TResult[K] | undefined }
): TResult {
  const result = {} as TResult;

  for (const [key, mapper] of Object.entries(mapping) as Array<
    [keyof TResult, (row: TRow) => unknown]
  >) {
    const value = mapper(row);
    if (value !== undefined) {
      result[key] = value as TResult[keyof TResult];
    }
  }

  return result;
}

/**
 * Filters out undefined values from an object
 * Useful for creating objects that comply with exactOptionalPropertyTypes
 */
export function filterUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}

/**
 * Type guard to check if a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard to check if an optional property exists on an object
 */
export function hasProperty<
  T extends Record<string, unknown>,
  K extends keyof T,
>(obj: T, key: K): obj is T & Required<Pick<T, K>> {
  return key in obj && obj[key] !== undefined;
}
