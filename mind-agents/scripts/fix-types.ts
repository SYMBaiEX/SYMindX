#!/usr/bin/env tsx
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('🔍 Analyzing TypeScript errors...\n');

try {
  // Run tsc and capture errors
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ No TypeScript errors found!');
} catch (error: any) {
  const output = error.stdout?.toString() || '';
  const lines = output.split('\n').filter(line => line.trim());
  
  // Group errors by file
  const errorsByFile = new Map<string, string[]>();
  let currentFile = '';
  
  lines.forEach(line => {
    const fileMatch = line.match(/^(src\/[^(]+)\(/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      if (!errorsByFile.has(currentFile)) {
        errorsByFile.set(currentFile, []);
      }
      errorsByFile.get(currentFile)!.push(line);
    }
  });
  
  // Sort files by error count
  const sortedFiles = Array.from(errorsByFile.entries())
    .sort((a, b) => b[1].length - a[1].length);
  
  console.log('📊 TypeScript Error Summary:\n');
  console.log('File | Error Count');
  console.log('-----|------------');
  
  sortedFiles.forEach(([file, errors]) => {
    console.log(`${file.padEnd(50)} | ${errors.length}`);
  });
  
  console.log('\n🔥 Top 5 files with most errors:\n');
  
  sortedFiles.slice(0, 5).forEach(([file, errors], index) => {
    console.log(`\n${index + 1}. ${file} (${errors.length} errors)`);
    console.log('   Sample errors:');
    errors.slice(0, 3).forEach(error => {
      console.log(`   - ${error}`);
    });
  });
  
  // Common error patterns
  console.log('\n🔍 Common error patterns:\n');
  
  const errorPatterns = {
    'Type.*is not assignable to type': 0,
    'Property.*does not exist on type': 0,
    'Module.*has no exported member': 0,
    'incorrectly implements interface': 0,
    'Object literal may only specify known properties': 0,
  };
  
  lines.forEach(line => {
    Object.keys(errorPatterns).forEach(pattern => {
      if (new RegExp(pattern).test(line)) {
        errorPatterns[pattern]++;
      }
    });
  });
  
  Object.entries(errorPatterns)
    .sort((a, b) => b[1] - a[1])
    .forEach(([pattern, count]) => {
      if (count > 0) {
        console.log(`${pattern}: ${count} occurrences`);
      }
    });
  
  console.log('\n💡 Suggested fixes:');
  console.log('1. Fix missing type exports in types/cognition.ts');
  console.log('2. Update message role types to use proper enums');
  console.log('3. Fix CognitionModule interface implementations');
  console.log('4. Fix Supabase async/await patterns');
  console.log('5. Update portal message conversions for AI SDK v5');
}