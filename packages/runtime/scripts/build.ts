import { fileURLToPath } from 'node:url';
const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const result = await Bun.build({
  entrypoints: [`${packageRoot}/src/index.ts`, `${packageRoot}/src/cli.ts`],
  outdir: `${packageRoot}/dist`,
  target: 'bun',
  format: 'esm',
  sourcemap: 'external',
  minify: false,
  splitting: false,
  naming: '[name].[ext]',
});
if (!result.success) {
  for (const diagnostic of result.logs) console.error(diagnostic);
  process.exitCode = 1;
} else console.log(`Built ${result.outputs.length} outputs for @symindx/runtime 0.1.0`);
