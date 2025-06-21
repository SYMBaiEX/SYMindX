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
  try {
    if (!process.kill(signal)) {
      return; // Process already dead or kill failed
    }
  } catch (error) {
    return; // Process doesn't exist
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      try {
        process.kill('SIGKILL');
      } catch {
        // Process may have exited already
      }
      resolve();
    }, timeoutMs);

    // Monitor for process exit if it's a ChildProcess
    if ('on' in process) {
      (process as any).on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    } else {
      // Fallback: just wait a short time for graceful exit
      setTimeout(() => {
        clearTimeout(timeout);
        resolve();
      }, Math.min(100, timeoutMs));
    }
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
