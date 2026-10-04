export type ErrorCode =
  | 'CONFIGURATION'
  | 'NOT_RUNNING'
  | 'NOT_FOUND'
  | 'BUSY'
  | 'ABORTED'
  | 'TIMEOUT'
  | 'PROVIDER'
  | 'TOOL'
  | 'POLICY'
  | 'VALIDATION'
  | 'CONFLICT';
export class SYMindXError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SYMindXError';
  }
}
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new SYMindXError('ABORTED', 'Operation was cancelled');
}
export async function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  throwIfAborted(signal);
  let listener: (() => void) | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    listener = () => reject(new SYMindXError('ABORTED', 'Operation was cancelled'));
    signal.addEventListener('abort', listener, { once: true });
  });
  try {
    return await Promise.race([operation, cancelled]);
  } finally {
    if (listener) signal.removeEventListener('abort', listener);
  }
}
