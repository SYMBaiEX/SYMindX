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

// Audit only: no install hooks, cleanup, fallback emission, resource copying, or app execution.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const output = mkdtempSync(join(tmpdir(), 'symindx-audit-bundle-'));
const result = await Bun.build({
  entrypoints: config.entrypoints, outdir: output, target: config.target,
  format: config.format, minify: config.minify, sourcemap: config.sourcemap,
  splitting: config.splitting, external: config.external, loader: config.loader,
  naming: { entry: '[dir]/[name].[ext]', chunk: '[name]-[hash].[ext]', asset: '[name]-[hash].[ext]' },
  define: { 'process.env.NODE_ENV': JSON.stringify('development'), 'Bun.env.NODE_ENV': JSON.stringify('development') },
});
console.log(JSON.stringify({ success: result.success, bun: Bun.version, temporaryOutput: output, outputs: result.outputs.length, diagnostics: result.logs.map(x => ({level:x.level,message:x.message,position:x.position})) }, null, 2));
process.exitCode = result.success ? 0 : 1;