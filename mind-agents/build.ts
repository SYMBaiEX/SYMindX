await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist-bundled',
  target: 'bun',
  format: 'esm',
  splitting: false,
  sourcemap: 'external',
  minify: false,
});

console.log('✅ Bundled build completed!');