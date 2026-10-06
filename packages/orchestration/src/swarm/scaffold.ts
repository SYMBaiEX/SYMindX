export function swarmScaffold(): Readonly<Record<string, string>> {
  return {
    'package.json': `${JSON.stringify(
      {
        name: '@symindx/swarm-console',
        private: true,
        type: 'module',
        scripts: { typecheck: 'tsc -p tsconfig.json --noEmit' },
        dependencies: { react: '^19.3.0', 'react-dom': '^19.3.0' },
        devDependencies: {
          '@types/react': '^19.3.0',
          '@types/react-dom': '^19.3.0',
          typescript: '^5.9.3',
        },
      },
      null,
      2,
    )}\n`,
    'tsconfig.json': `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          lib: ['ES2022', 'DOM'],
          module: 'ESNext',
          moduleResolution: 'Bundler',
          jsx: 'react-jsx',
          strict: true,
          noEmit: true,
          isolatedModules: true,
          verbatimModuleSyntax: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          exactOptionalPropertyTypes: true,
          noUncheckedIndexedAccess: true,
          types: [],
        },
        include: ['src'],
      },
      null,
      2,
    )}\n`,
    'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Local swarm</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    'src/main.tsx': `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('missing root');
}
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`,
  };
}
