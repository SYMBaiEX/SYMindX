import type { Extension } from './registry.js';

const EXTENSION_NAME = /^[a-z0-9_-]{1,64}$/;

export type ExtensionPhase = 'registered' | 'started' | 'stopped';

export interface ManagedExtension<TIn, TOut> {
  extension: Extension<TIn, TOut>;
  phase: ExtensionPhase;
}

export interface ExtensionHost<TIn, TOut> {
  register(extension: Extension<TIn, TOut>): void;
  start(name: string): void;
  stop(name: string): void;
  get(name: string): ManagedExtension<TIn, TOut> | undefined;
  names(phase?: ExtensionPhase): readonly string[];
}

export function createExtensionHost<TIn, TOut>(): ExtensionHost<TIn, TOut> {
  const records = new Map<string, ManagedExtension<TIn, TOut>>();
  const order: string[] = [];

  return {
    register(extension: Extension<TIn, TOut>): void {
      if (!EXTENSION_NAME.test(extension.name)) {
        throw new RangeError(`invalid extension name: ${extension.name}`);
      }
      if (records.has(extension.name)) {
        throw new Error('extension already registered');
      }
      records.set(extension.name, { extension, phase: 'registered' });
      order.push(extension.name);
    },
    start(name: string): void {
      const record = records.get(name);
      if (record === undefined) {
        throw new Error('unknown extension');
      }
      if (record.phase === 'started') {
        throw new Error('extension already started');
      }
      record.phase = 'started';
    },
    stop(name: string): void {
      const record = records.get(name);
      if (record === undefined) {
        throw new Error('unknown extension');
      }
      if (record.phase !== 'started') {
        throw new Error('extension is not started');
      }
      record.phase = 'stopped';
    },
    get(name: string): ManagedExtension<TIn, TOut> | undefined {
      const record = records.get(name);
      if (record === undefined) {
        return undefined;
      }
      return { extension: record.extension, phase: record.phase };
    },
    names(phase?: ExtensionPhase): readonly string[] {
      if (phase === undefined) {
        return order.slice();
      }
      const filtered: string[] = [];
      for (const name of order) {
        const record = records.get(name);
        if (record !== undefined && record.phase === phase) {
          filtered.push(name);
        }
      }
      return filtered;
    },
  };
}
