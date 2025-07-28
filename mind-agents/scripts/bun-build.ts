#!/usr/bin/env bun
/* global Bun, console, process */
// Ultra-fast Bun-native build script with zero dependencies

import { $ } from "bun";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { performance } from "perf_hooks";

const startTime = performance.now();

console.log("⚡ Bun Native Build System v2.0\n");

// Build configuration
const config = {
  entrypoints: [
    "./src/index.ts", 
    "./src/api.ts", 
    "./src/cli/index.ts",
    "./src/cli/api-cli.ts",
    "./src/cli/standalone.ts"
  ],
  outdir: "./dist",
  target: "bun" as const,
  format: "esm" as const,
  
  // Performance optimizations
  minify: false, // Disabled for max speed
  sourcemap: "external" as const,
  splitting: false,
  
  // TypeScript handling
  tsconfigPath: "./tsconfig.json",
  
  // External dependencies (don't bundle)
  external: [
    "@ai-sdk/*",
    "@modelcontextprotocol/*",
    "@neondatabase/*",
    "@slack/*",
    "@supabase/*",
    "@types/*",
    "ai",
    "blessed*",
    "boxen",
    "chalk",
    "commander",
    "express",
    "figlet",
    "gradient-string",
    "ink*",
    "inquirer",
    "ora",
    "pg",
    "puppeteer",
    "react*",
    "twitter-api-v2",
    "uuid",
    "ws",
    "zod"
  ],
  
  // Loader configuration
  loader: {
    ".ts": "ts" as const,
    ".tsx": "tsx" as const,
    ".js": "js" as const,
    ".jsx": "jsx" as const,
    ".json": "json" as const
  }
};

async function build() {
  try {
    // Step 1: Clean output directory (smart clean)
    if (existsSync(config.outdir)) {
      console.log("🧹 Smart cleaning output directory...");
      // Keep .tsbuildinfo for incremental builds
      await $`find ${config.outdir} -type f -not -name '.tsbuildinfo' -not -name 'module-index.json' -delete`.quiet();
    } else {
      await mkdir(config.outdir, { recursive: true });
    }

    // Step 2: Run Bun build
    console.log("🚀 Building with Bun.build()...");
    
     
    const result = await Bun.build({
      entrypoints: config.entrypoints,
      outdir: config.outdir,
      target: config.target,
      format: config.format,
      minify: config.minify,
      sourcemap: config.sourcemap,
      splitting: config.splitting,
      external: config.external,
      loader: config.loader,
      naming: {
        entry: "[dir]/[name].[ext]",
        chunk: "[name]-[hash].[ext]",
        asset: "[name]-[hash].[ext]"
      },
      define: {
        "process.env.NODE_ENV": JSON.stringify(process.env["NODE_ENV"] || "development"),
        "Bun.env.NODE_ENV": JSON.stringify(process.env["NODE_ENV"] || "development")
      }
    });

    // Step 3: Handle build results
    if (!result.success) {
      console.error("❌ Build failed with errors:");
      for (const log of result.logs) {
        console.error(log);
      }
      
      // Fallback to direct TypeScript compilation
      console.log("\n🔄 Attempting TypeScript compilation fallback...");
      await $`tsc --build --incremental --tsBuildInfoFile ${config.outdir}/.tsbuildinfo`.quiet();
    } else {
      console.log(`✅ Built ${result.outputs.length} files successfully`);
      
      // Log any warnings
      if (result.logs.length > 0) {
        console.log("\n⚠️  Build warnings:");
        for (const log of result.logs) {
          console.log(`   ${log}`);
        }
      }
    }

    // Step 4: Copy additional files
    console.log("\n📁 Copying additional resources...");
    
    // Copy package.json for module resolution
    await $`cp package.json ${config.outdir}/`.quiet();
    
    // Copy character configs from src/characters
    if (existsSync("./src/characters")) {
      await $`cp -r ./src/characters ${config.outdir}/`.quiet();
      console.log("   • Character files copied");
    }
    
    // Copy runtime configuration from src/core/config
    if (existsSync("./src/core/config")) {
      await $`mkdir -p ${config.outdir}/core`.quiet();
      await $`cp -r ./src/core/config ${config.outdir}/core/`.quiet();
      console.log("   • Configuration files copied");
    }

    // Step 5: Generate build metadata
    const buildTime = ((performance.now() - startTime) / 1000).toFixed(2);
    const buildInfo = {
      timestamp: new Date().toISOString(),
      bunVersion: Bun.version,
      buildTime: `${buildTime}s`,
      target: config.target,
      entrypoints: config.entrypoints,
      outputFiles: result.success ? result.outputs.length : "N/A"
    };

    await Bun.write(
      `${config.outdir}/build-info.json`,
      JSON.stringify(buildInfo, null, 2)
    );

    // Final stats
    console.log("\n✨ Build Complete!\n");
    console.log("📊 Statistics:");
    console.log(`   • Build time: ${buildTime}s`);
    console.log(`   • Bun version: ${Bun.version}`);
    console.log(`   • Output files: ${result.success ? result.outputs.length : "N/A"}`);
    
    if (parseFloat(buildTime) < 5.0) {
      console.log("\n🏆 Sub-5-second build achieved! 🚀");
    }

  } catch (error) {
    console.error("\n❌ Build error:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the build
await build();