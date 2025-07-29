// Global teardown that runs once after all tests
export default async function globalTeardown() {
  console.log('\n🧹 Cleaning up test environment...\n');
  
  // Run cleanup function from global setup
  if (globalThis.__TEST_CLEANUP__) {
    await globalThis.__TEST_CLEANUP__();
  }
  
  // Additional cleanup if needed
  // Close database connections, stop servers, etc.
  
  console.log('✅ Test environment cleaned up\n');
}