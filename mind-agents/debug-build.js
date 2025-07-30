#!/usr/bin/env bun
// Debug build to find failing entry point

const entrypoints = [
  "./src/index.ts", 
  "./src/api.ts", 
  "./src/cli/index.ts",
  "./src/cli/api-cli.ts",
  "./src/cli/standalone.ts"
];

for (const entry of entrypoints) {
  console.log(`\nTesting ${entry}...`);
  try {
    const result = await Bun.build({
      entrypoints: [entry],
      outdir: "./dist-debug",
      target: "bun",
      format: "esm",
      minify: false,
      sourcemap: "external"
    });
    
    if (result.success) {
      console.log(`✅ ${entry} - SUCCESS`);
    } else {
      console.log(`❌ ${entry} - FAILED:`);
      for (const log of result.logs) {
        console.log(`  ${log}`);
      }
    }
  } catch (error) {
    console.log(`❌ ${entry} - ERROR: ${error.message}`);
  }
}