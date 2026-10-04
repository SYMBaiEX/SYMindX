#!/usr/bin/env node

/**
 * SYMindX Cursor Rules Cross-Reference Verification Tool
 * 
 * This script verifies that all @rule-name.mdc references in the rules
 * point to existing files and that the linking system is comprehensive.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RULES_DIR = path.join(__dirname, '..', 'rules');

/**
 * Get all .mdc files in the rules directory
 */
function getRuleFiles() {
  return fs.readdirSync(RULES_DIR)
    .filter(file => file.endsWith('.mdc'))
    .sort();
}

/**
 * Extract all @rule-name.mdc references from a file
 */
function extractReferences(content) {
  const references = [];
  const regex = /@([0-9]{3}-[a-z-]+\.mdc)/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    references.push(match[1]);
  }
  
  return [...new Set(references)]; // Remove duplicates
}

/**
 * Check if a rule file exists
 */
function ruleExists(ruleName) {
  return fs.existsSync(path.join(RULES_DIR, ruleName));
}

/**
 * Analyze cross-references in all rules
 */
function analyzeReferences() {
  const ruleFiles = getRuleFiles();
  const analysis = {
    totalRules: ruleFiles.length,
    totalReferences: 0,
    brokenReferences: [],
    rulesWithoutReferences: [],
    mostReferencedRules: {},
    ruleReferences: {}
  };

  console.log('🔍 Analyzing Cursor Rules Cross-References...\n');

  ruleFiles.forEach(ruleFile => {
    const filePath = path.join(RULES_DIR, ruleFile);
    const content = fs.readFileSync(filePath, 'utf8');
    const references = extractReferences(content);
    
    analysis.ruleReferences[ruleFile] = references;
    analysis.totalReferences += references.length;

    if (references.length === 0) {
      analysis.rulesWithoutReferences.push(ruleFile);
    }

    // Check for broken references
    references.forEach(ref => {
      if (!ruleExists(ref)) {
        analysis.brokenReferences.push({
          file: ruleFile,
          brokenRef: ref
        });
      } else {
        // Count references for popularity analysis
        analysis.mostReferencedRules[ref] = (analysis.mostReferencedRules[ref] || 0) + 1;
      }
    });
  });

  return analysis;
}

/**
 * Generate recommendations for improving cross-references
 */
function generateRecommendations(analysis) {
  const recommendations = [];

  // Rules without references might need linking
  if (analysis.rulesWithoutReferences.length > 0) {
    recommendations.push({
      type: 'missing_references',
      title: 'Rules without cross-references',
      description: 'These rules might benefit from linking to related rules:',
      items: analysis.rulesWithoutReferences
    });
  }

  // Find rules that are rarely referenced
  const allRules = Object.keys(analysis.ruleReferences);
  const underReferencedRules = allRules.filter(rule => {
    const refCount = analysis.mostReferencedRules[rule] || 0;
    return refCount < 2 && !rule.startsWith('000-'); // Meta rules are expected to be highly referenced
  });

  if (underReferencedRules.length > 0) {
    recommendations.push({
      type: 'under_referenced',
      title: 'Under-referenced rules',
      description: 'These rules might need more cross-references from other rules:',
      items: underReferencedRules
    });
  }

  return recommendations;
}

/**
 * Check for circular dependencies
 */
function checkCircularDependencies(analysis) {
  const circularDeps = [];
  
  Object.entries(analysis.ruleReferences).forEach(([ruleFile, references]) => {
    references.forEach(ref => {
      // Check if the referenced rule also references this rule
      const referencedRuleRefs = analysis.ruleReferences[ref] || [];
      if (referencedRuleRefs.includes(ruleFile)) {
        circularDeps.push({
          rule1: ruleFile,
          rule2: ref
        });
      }
    });
  });

  return circularDeps;
}

/**
 * Main verification function
 */
function verifyRuleLinks() {
  const analysis = analyzeReferences();
  const recommendations = generateRecommendations(analysis);
  const circularDeps = checkCircularDependencies(analysis);

  // Display results
  console.log('📊 Cross-Reference Analysis Results\n');
  console.log(`Total rules: ${analysis.totalRules}`);
  console.log(`Total cross-references: ${analysis.totalReferences}`);
  console.log(`Average references per rule: ${(analysis.totalReferences / analysis.totalRules).toFixed(1)}\n`);

  // Show broken references
  if (analysis.brokenReferences.length > 0) {
    console.log('❌ Broken References:');
    analysis.brokenReferences.forEach(broken => {
      console.log(`  ${broken.file} → ${broken.brokenRef} (FILE NOT FOUND)`);
    });
    console.log();
  } else {
    console.log('✅ All cross-references are valid!\n');
  }

  // Show circular dependencies
  if (circularDeps.length > 0) {
    console.log('🔄 Circular Dependencies:');
    circularDeps.forEach(circular => {
      console.log(`  ${circular.rule1} ↔ ${circular.rule2}`);
    });
    console.log();
  }

  // Show most referenced rules
  console.log('📈 Most Referenced Rules:');
  const sortedRefs = Object.entries(analysis.mostReferencedRules)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
  
  sortedRefs.forEach(([rule, count]) => {
    console.log(`  ${rule}: ${count} references`);
  });
  console.log();

  // Show recommendations
  if (recommendations.length > 0) {
    console.log('💡 Recommendations for Improvement:\n');
    recommendations.forEach(rec => {
      console.log(`${rec.title}:`);
      console.log(`  ${rec.description}`);
      rec.items.forEach(item => {
        console.log(`    - ${item}`);
      });
      console.log();
    });
  }

  // Generate linking suggestions
  console.log('🔗 Suggested Cross-Reference Patterns:\n');
  
  console.log('Foundation Rules (should be referenced by most component rules):');
  ['001-symindx-workspace.mdc', '003-typescript-standards.mdc', '004-architecture-patterns.mdc'].forEach(rule => {
    const count = analysis.mostReferencedRules[rule] || 0;
    console.log(`  ${rule}: ${count} references ${count < 5 ? '(needs more)' : '(good)'}`);
  });
  
  console.log('\nComponent Rules (should reference foundation + performance + security):');
  ['005-ai-integration-patterns.mdc', '006-web-interface-patterns.mdc', '007-extension-system-patterns.mdc', '011-data-management-patterns.mdc'].forEach(rule => {
    const refs = analysis.ruleReferences[rule] || [];
    const hasFoundation = refs.some(ref => ['001-symindx-workspace.mdc', '003-typescript-standards.mdc', '004-architecture-patterns.mdc'].includes(ref));
    const hasSecurity = refs.includes('010-security-and-authentication.mdc');
    const hasPerformance = refs.includes('012-performance-optimization.mdc');
    
    console.log(`  ${rule}:`);
    console.log(`    Foundation: ${hasFoundation ? '✅' : '❌'}`);
    console.log(`    Security: ${hasSecurity ? '✅' : '❌'}`);
    console.log(`    Performance: ${hasPerformance ? '✅' : '❌'}`);
  });

  console.log('\n🎯 Cross-Reference Quality Score:');
  const totalPossibleRefs = analysis.totalRules * 5; // Assume 5 references per rule is ideal
  const quality = (analysis.totalReferences / totalPossibleRefs) * 100;
  const brokenPenalty = analysis.brokenReferences.length * 10;
  const finalScore = Math.max(0, quality - brokenPenalty);
  
  console.log(`  Quality Score: ${finalScore.toFixed(1)}% (${analysis.totalReferences}/${totalPossibleRefs} refs)`);
  
  if (finalScore >= 80) {
    console.log('  Status: 🌟 Excellent cross-referencing!');
  } else if (finalScore >= 60) {
    console.log('  Status: ✅ Good cross-referencing');
  } else if (finalScore >= 40) {
    console.log('  Status: ⚠️ Needs improvement');
  } else {
    console.log('  Status: ❌ Poor cross-referencing');
  }

  return {
    analysis,
    recommendations,
    circularDeps,
    qualityScore: finalScore
  };
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyRuleLinks();
}

export { verifyRuleLinks, analyzeReferences, generateRecommendations }; 