#!/usr/bin/env bun
// Debug CLI index.ts specifically

try {
  const result = await Bun.build({
    entrypoints: ["./src/cli/index.ts"],
    outdir: "./dist-debug",
    target: "bun", 
    format: "esm",
    minify: false,
    sourcemap: "external"
  });
  
  if (result.success) {
    console.log(`✅ CLI build successful`);
  } else {
    console.log(`❌ CLI build failed:`);
    for (const log of result.logs) {
      console.log(log.toString());
    }
  }
} catch (error) {
  console.log(`❌ CLI build error:`, error);
}