import { ChildProcess } from 'child_process';

/**
 * Gets the memory usage of a child process in bytes
 * @param childProcess The child process to monitor
 * @returns Memory usage in bytes, or undefined if not available
 */
export function getProcessMemoryUsage(childProcess: ChildProcess): number | undefined {
  if (!childProcess.pid) return undefined;
  
  try {
    // This is a simplified implementation
    // In a real-world scenario, you'd use platform-specific APIs
    // to get accurate memory usage
    return 0; // Placeholder
  } catch (error) {
    return undefined;
  }
}

/**
 * Safely terminates a process
 * @param process The process to terminate
 * @param signal Signal to send (default: 'SIGTERM')
 * @param timeoutMs Time to wait before force killing (default: 5000ms)
 */
export async function terminateProcess(
  process: { kill(signal?: string | number): boolean },
  signal: NodeJS.Signals = 'SIGTERM',
  timeoutMs: number = 5000
): Promise<void> {
  if (!process.kill(signal)) {
    return;
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      process.kill('SIGKILL');
      resolve();
    }, timeoutMs);

    // If process exits before timeout, clear the timeout
    process.kill(signal);
    setTimeout(() => {
      clearTimeout(timeout);
      resolve();
    }, 100); // Short delay to allow process to exit
  });
}

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}
