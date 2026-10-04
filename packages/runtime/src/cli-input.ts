import { createInterface, type Interface } from 'node:readline';
import { SYMindXError } from './errors.js';

export interface CliInput {
  readonly interactive: boolean;
  question(prompt?: string, fresh?: boolean, signal?: AbortSignal): Promise<string | null>;
  onInterrupt(handler: () => void): void;
  close(): void;
}

export function createCliInput(
  input: NodeJS.ReadStream = process.stdin,
  output: NodeJS.WriteStream = process.stderr,
): CliInput {
  const interactive = Boolean(input.isTTY && output.isTTY);
  const lines: Array<{ value: string; bytes: number }> = [];
  interface Waiter {
    resolve: (line: string | null) => void;
    reject: (error: Error) => void;
    signal?: AbortSignal;
    abortListener?: () => void;
  }
  const waiters: Waiter[] = [];
  const resolveWaiter = (waiter: Waiter, line: string | null) => {
    if (waiter.signal && waiter.abortListener) {
      waiter.signal.removeEventListener('abort', waiter.abortListener);
    }
    waiter.resolve(line);
  };
  const rejectWaiter = (waiter: Waiter, error: Error) => {
    if (waiter.signal && waiter.abortListener) {
      waiter.signal.removeEventListener('abort', waiter.abortListener);
    }
    waiter.reject(error);
  };
  const maxLineBytes = 16 * 1024;
  const maxQueuedLines = 32;
  const maxQueuedBytes = 512 * 1024;
  let queuedBytes = 0;
  let ended = false;
  let inputError: Error | undefined;
  let interruptHandler = () => {};
  let reader: Interface | undefined;
  let currentLineBytes = 0;

  const resumeIfAvailable = () => {
    if (!ended && !inputError && lines.length < maxQueuedLines && queuedBytes < maxQueuedBytes) {
      reader?.resume();
    }
  };

  const failInput = (message: string) => {
    inputError = new SYMindXError('VALIDATION', message);
    lines.length = 0;
    queuedBytes = 0;
    reader?.pause();
    for (const waiter of waiters.splice(0)) rejectWaiter(waiter, inputError);
    reader?.close();
  };

  const inspectChunk = (chunk: Buffer | string) => {
    const bytes = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk;
    for (const byte of bytes) {
      if (byte === 10) {
        currentLineBytes = 0;
      } else if (++currentLineBytes > maxLineBytes) {
        failInput('Input line exceeds the 16384-byte limit.');
        return;
      }
    }
  };
  input.on('data', inspectChunk);
  reader = createInterface({
    input,
    ...(interactive ? { output } : {}),
    terminal: interactive,
    crlfDelay: Infinity,
  });
  reader.on('line', (line) => {
    currentLineBytes = 0;
    if (inputError || ended) return;
    const bytes = Buffer.byteLength(line, 'utf8');
    if (bytes > maxLineBytes) {
      failInput('Input line exceeds the 16384-byte limit.');
      return;
    }
    const waiter = waiters.shift();
    if (waiter) {
      resolveWaiter(waiter, line);
      return;
    }
    if (lines.length >= maxQueuedLines || queuedBytes + bytes > maxQueuedBytes) {
      failInput('Input queue exceeded its 32-line or 512-KiB limit.');
      return;
    }
    lines.push({ value: line, bytes });
    queuedBytes += bytes;
    if (lines.length >= maxQueuedLines || queuedBytes >= maxQueuedBytes) reader.pause();
  });
  reader.on('SIGINT', () => interruptHandler());
  reader.on('close', () => {
    input.removeListener('data', inspectChunk);
    ended = true;
    for (const waiter of waiters.splice(0)) {
      if (inputError) rejectWaiter(waiter, inputError);
      else resolveWaiter(waiter, null);
    }
  });

  return {
    interactive,
    onInterrupt(handler) {
      interruptHandler = handler;
    },
    question(prompt = '', fresh = false, signal) {
      if (signal?.aborted) {
        return Promise.reject(new SYMindXError('ABORTED', 'Operation was cancelled'));
      }
      if (fresh) {
        const hadBufferedInput = lines.length > 0 || currentLineBytes > 0;
        lines.length = 0;
        queuedBytes = 0;
        if (interactive) reader.write(null, { ctrl: true, name: 'u' });
        currentLineBytes = 0;
        if (hadBufferedInput) output.write('Discarded buffered input; enter approval now.\n');
        resumeIfAvailable();
      } else {
        const line = lines.shift();
        if (line !== undefined) {
          queuedBytes -= line.bytes;
          resumeIfAvailable();
          return Promise.resolve(line.value);
        }
      }
      if (prompt && interactive) output.write(prompt);
      if (inputError) return Promise.reject(inputError);
      if (ended) return Promise.resolve(null);
      if (waiters.length) throw new Error('Only one CLI input question may be active.');
      return new Promise((resolve, reject) => {
        const waiter: Waiter = { resolve, reject, ...(signal ? { signal } : {}) };
        if (signal) {
          waiter.abortListener = () => {
            const index = waiters.indexOf(waiter);
            if (index !== -1) {
              waiters.splice(index, 1);
              rejectWaiter(waiter, new SYMindXError('ABORTED', 'Operation was cancelled'));
            }
          };
        }
        waiters.push(waiter);
        if (signal && waiter.abortListener) {
          signal.addEventListener('abort', waiter.abortListener, { once: true });
          if (signal.aborted) waiter.abortListener();
        }
      });
    },
    close() {
      reader.close();
      ended = true;
      for (const waiter of waiters.splice(0)) resolveWaiter(waiter, null);
    },
  };
}
