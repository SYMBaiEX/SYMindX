const EXTENSION_NAME = /^[a-z0-9_-]{1,64}$/;

export interface Extension<TIn, TOut> {
  name: string;
  handle(input: TIn, signal: AbortSignal): Promise<TOut>;
}

export interface ExtensionRegistry<TIn, TOut> {
  register(extension: Extension<TIn, TOut>): void;
  get(name: string): Extension<TIn, TOut> | undefined;
  names(): readonly string[];
}

export function createExtensionRegistry<TIn, TOut>(): ExtensionRegistry<TIn, TOut> {
  const extensions = new Map<string, Extension<TIn, TOut>>();
  const order: string[] = [];

  return {
    register(extension: Extension<TIn, TOut>): void {
      if (!EXTENSION_NAME.test(extension.name)) {
        throw new RangeError(`invalid extension name: ${extension.name}`);
      }
      if (extensions.has(extension.name)) {
        throw new Error('extension already registered');
      }
      extensions.set(extension.name, extension);
      order.push(extension.name);
    },
    get(name: string): Extension<TIn, TOut> | undefined {
      return extensions.get(name);
    },
    names(): readonly string[] {
      return order.slice();
    },
  };
}
