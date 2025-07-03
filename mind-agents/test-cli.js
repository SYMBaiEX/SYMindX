#!/usr/bin/env node

/**
 * Test script for SYMindX CLI
 * Tests all three CLI views to ensure they work correctly
 */

import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

console.log('🧪 Testing SYMindX CLI Implementation...\n');

async function testCliView(view, description) {
  console.log(`📋 Testing ${view} view: ${description}`);
  
  const child = spawn('node', ['--loader', 'ts-node/esm', 'src/cli/ink-cli.tsx', view], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0' }
  });
  
  let output = '';
  let hasError = false;
  
  child.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  child.stderr.on('data', (data) => {
    const error = data.toString();
    if (error.includes('ERROR') || error.includes('TypeError') || error.includes('ReferenceError')) {
      hasError = true;
      console.error(`   ❌ Error in ${view} view:`, error);
    }
  });
  
  // Let it run for 3 seconds to render
  await sleep(3000);
  
  // Send escape to exit
  child.stdin.write('\x1b');
  
  // Wait for it to exit
  await new Promise((resolve) => {
    child.on('exit', resolve);
    // Force kill after 2 more seconds if it doesn't exit
    global.setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
      resolve();
    }, 2000);
  });
  
  // Check results
  const hasContent = output.length > 100; // Should have substantial content
  const hasTitle = output.includes('SYMindX Interactive CLI');
  const hasNavigation = output.includes('Navigation:');
  
  if (hasError) {
    console.log(`   ❌ ${view} view failed with errors\n`);
    return false;
  } else if (!hasContent) {
    console.log(`   ❌ ${view} view produced no content\n`);
    return false;
  } else if (!hasTitle || !hasNavigation) {
    console.log(`   ⚠️  ${view} view missing expected elements\n`);
    return false;
  } else {
    console.log(`   ✅ ${view} view working correctly\n`);
    return true;
  }
}

async function runTests() {
  const results = [];
  
  // Test all three views
  results.push(await testCliView('dashboard', 'Runtime dashboard with system overview'));
  results.push(await testCliView('agents', 'Agent list and management'));
  results.push(await testCliView('status', 'System status and diagnostics'));
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('📊 Test Results:');
  console.log(`   • Passed: ${passed}/${total}`);
  console.log(`   • Status: ${passed === total ? '✅ All tests passed!' : '❌ Some tests failed'}`);
  
  if (passed === total) {
    console.log('\n🎉 CLI Implementation is working correctly!');
    console.log('\n📋 Available commands:');
    console.log('   npm run cli dashboard  - Show runtime dashboard');
    console.log('   npm run cli agents     - List all agents');
    console.log('   npm run cli status     - Show system status');
    console.log('\n💡 Usage examples:');
    console.log('   node --loader ts-node/esm src/cli/ink-cli.tsx dashboard');
    console.log('   node --loader ts-node/esm src/cli/ink-cli.tsx agents');
    console.log('   node --loader ts-node/esm src/cli/ink-cli.tsx status');
  } else {
    console.log('\n⚠️  Some CLI views have issues. Check the errors above.');
  }
}

runTests().catch(console.error);