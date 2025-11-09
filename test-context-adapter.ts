// Test context adapter import
console.log('Testing context adapter import...');

try {
  import('./mind-agents/src/core/context/integration/runtime-context-adapter').then((module) => {
    console.log('Context adapter imported successfully');
    console.log('Available exports:', Object.keys(module));
    console.log('CognitiveContext available:', 'CognitiveContext' in module);
  }).catch((error) => {
    console.error('Context adapter import failed:', error.message);
  });
} catch (error) {
  console.error('Sync import error:', error);
}