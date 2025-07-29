// Global setup that runs once before all tests
import { rm, mkdir } from 'fs/promises';
import path from 'path';

export default async function globalSetup() {
  console.log('\n🚀 Setting up test environment...\n');
  
  // Create test directories
  const testDirs = [
    'temp/test-data',
    'temp/test-memories',
    'temp/test-logs',
  ];
  
  for (const dir of testDirs) {
    const dirPath = path.join(__dirname, '..', dir);
    await mkdir(dirPath, { recursive: true });
  }
  
  // Set up test database
  process.env.SQLITE_DB_PATH = path.join(__dirname, '../temp/test-memories/test.db');
  
  // Set up test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.TEST_MODE = 'true';
  
  // Return cleanup function
  return async () => {
    // This will be available in globalTeardown via globalThis
    globalThis.__TEST_CLEANUP__ = async () => {
      // Clean up test directories
      try {
        await rm(path.join(__dirname, '../temp'), { recursive: true, force: true });
      } catch (error) {
        console.error('Failed to clean up test directories:', error);
      }
    };
  };
}