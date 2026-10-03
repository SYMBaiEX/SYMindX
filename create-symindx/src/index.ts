#!/usr/bin/env bun

import { randomUUID } from 'node:crypto';
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

interface Options {
  out: string;
  runtimePath: string;
}
interface RuntimePackage {
  name: string;
  version: string;
}

const DEFAULT_OUT = 'my-symindx-agent';
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_RUNTIME_PATH = resolve(SCRIPT_DIR, '../../packages/runtime');

function help(): void {
  console.log(`create-symindx — scaffold a local SYMindX v0.1 Bun application

Usage:
  bun --no-env-file create-symindx/src/index.ts [--out <directory>] [--runtime-path <directory>]

Options:
  --out <directory>          New project directory (default: ./${DEFAULT_OUT})
  --runtime-path <directory> Built @symindx/runtime package (default: adjacent packages/runtime)
  -h, --help                 Show this help

The runtime package must already be built. This command does not install packages or access the network.`);
}

function parseArgs(args: string[]): Options | undefined {
  let out = DEFAULT_OUT;
  let runtimePath = DEFAULT_RUNTIME_PATH;
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (arg === '-h' || arg === '--help') {
      if (args.length !== 1) throw new Error('--help cannot be combined with other arguments');
      return undefined;
    }
    if (arg !== '--out' && arg !== '--runtime-path') throw new Error(`Unknown argument: ${arg}`);
    if (seen.has(arg)) throw new Error(`Option may only be provided once: ${arg}`);
    seen.add(arg);
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
    if (arg === '--out') out = value;
    else runtimePath = value;
  }
  return { out, runtimePath };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertAbsent(path: string): void {
  try {
    lstatSync(path);
    throw new Error(`Output already exists: ${path}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Output already exists:')) throw error;
    if (!isRecord(error) || error['code'] !== 'ENOENT') throw error;
  }
}

function child(root: string, ...parts: string[]): string {
  const resolvedRoot = resolve(root);
  const target = resolve(resolvedRoot, ...parts);
  const relativePath = relative(resolvedRoot, target);
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || relativePath.startsWith(sep))
    throw new Error('Resolved path escaped its intended directory');
  return target;
}

function requireRegularFile(path: string, description: string): void {
  let info;
  try {
    info = lstatSync(path);
  } catch {
    throw new Error(`Missing ${description}: ${path}`);
  }
  if (!info.isFile()) throw new Error(`${description} must be a regular file: ${path}`);
}

function readRuntimePackage(runtimePath: string): RuntimePackage {
  const root = resolve(runtimePath);
  let info;
  try {
    info = lstatSync(root);
  } catch {
    throw new Error(`Runtime package directory not found: ${root}`);
  }
  if (!info.isDirectory()) throw new Error(`Runtime path must be a directory: ${root}`);
  const packageFile = child(root, 'package.json');
  requireRegularFile(packageFile, 'runtime package manifest');
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(packageFile, 'utf8')) as unknown;
  } catch {
    throw new Error('Runtime package manifest is not valid JSON');
  }
  if (
    !isRecord(value) ||
    value['name'] !== '@symindx/runtime' ||
    typeof value['version'] !== 'string' ||
    !/^0\.1\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value['version'])
  )
    throw new Error('Runtime package must be @symindx/runtime with a valid semantic version');

  requireRegularFile(child(root, 'LICENSE'), 'runtime license');
  requireRegularFile(child(root, 'characters', 'demo.json'), 'default character');
  requireRegularFile(child(root, 'dist', 'index.js'), 'built runtime entrypoint');
  requireRegularFile(child(root, 'dist', 'index.d.ts'), 'runtime declarations');
  return { name: '@symindx/runtime', version: value['version'] };
}

function readDemoCharacter(path: string): unknown {
  let character: unknown;
  try {
    character = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch {
    throw new Error('Default character is not valid JSON');
  }
  const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
  const toolPattern = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
  if (
    !isRecord(character) ||
    character['schemaVersion'] !== 1 ||
    typeof character['id'] !== 'string' ||
    !idPattern.test(character['id']) ||
    typeof character['name'] !== 'string' ||
    !character['name'].trim() ||
    typeof character['systemPrompt'] !== 'string' ||
    !character['systemPrompt'].trim() ||
    !isRecord(character['provider']) ||
    character['provider']['type'] !== 'echo' ||
    typeof character['provider']['model'] !== 'string' ||
    !character['provider']['model'].trim() ||
    !Array.isArray(character['tools']) ||
    character['tools'].some((tool) => typeof tool !== 'string' || !toolPattern.test(tool)) ||
    new Set(character['tools']).size !== character['tools'].length ||
    !isRecord(character['memory']) ||
    !Number.isInteger(character['memory']['recentMessages']) ||
    (character['memory']['recentMessages'] as number) < 2 ||
    (character['memory']['recentMessages'] as number) > 200 ||
    !isRecord(character['emotion']) ||
    typeof character['emotion']['enabled'] !== 'boolean' ||
    typeof character['emotion']['decay'] !== 'number' ||
    !Number.isFinite(character['emotion']['decay']) ||
    character['emotion']['decay'] < 0 ||
    character['emotion']['decay'] > 1
  )
    throw new Error('Default character does not match the supported schema-version-1 echo format');
  return character;
}

function copyRuntime(runtimePath: string, stage: string): RuntimePackage {
  const root = resolve(runtimePath);
  const metadata = readRuntimePackage(root);
  const vendor = child(stage, 'vendor', 'runtime');
  mkdirSync(vendor, { recursive: true });
  copyFileSync(child(root, 'LICENSE'), child(vendor, 'LICENSE'));
  const characterDir = child(vendor, 'characters');
  mkdirSync(characterDir);
  copyFileSync(child(root, 'characters', 'demo.json'), child(characterDir, 'demo.json'));

  const sourceDist = child(root, 'dist');
  let distInfo;
  try {
    distInfo = lstatSync(sourceDist);
  } catch {
    throw new Error(`Built runtime artifacts not found: ${sourceDist}`);
  }
  if (!distInfo.isDirectory()) throw new Error('Runtime dist path must be a directory');
  const destinationDist = child(vendor, 'dist');
  mkdirSync(destinationDist);
  const artifactExtensions = ['.js', '.d.ts', '.js.map', '.d.ts.map'];
  for (const entry of readdirSync(sourceDist, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`Runtime dist contains a symlink: ${entry.name}`);
    if (!entry.isFile()) continue;
    if (!artifactExtensions.some((extension) => entry.name.endsWith(extension))) continue;
    copyFileSync(child(sourceDist, entry.name), child(destinationDist, entry.name));
  }
  return metadata;
}

function writeGeneratedProject(stage: string, runtime: RuntimePackage): void {
  const vendorManifest = {
    name: runtime.name,
    version: runtime.version,
    type: 'module',
    main: './dist/index.js',
    types: './dist/index.d.ts',
    exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } },
  };
  writeFileSync(
    child(stage, 'vendor', 'runtime', 'package.json'),
    `${JSON.stringify(vendorManifest, null, 2)}\n`,
    'utf8',
  );
  const packageJson = {
    name: 'symindx-agent',
    private: true,
    type: 'module',
    scripts: {
      start: 'bun --no-env-file src/index.ts',
      typecheck: 'tsc --noEmit -p tsconfig.json',
    },
    dependencies: { [runtime.name]: 'file:vendor/runtime' },
    devDependencies: { '@types/bun': '1.4.2', typescript: '7.0.2' },
  };
  writeFileSync(child(stage, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
  writeFileSync(
    child(stage, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          types: ['bun'],
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  const sourceDir = child(stage, 'src');
  mkdirSync(sourceDir);
  writeFileSync(
    child(sourceDir, 'index.ts'),
    `import { resolve } from 'node:path';
import { SYMindXRuntime, loadCharacter } from '@symindx/runtime';

const character = await loadCharacter(resolve(import.meta.dir, '../character.json'));
const runtime = new SYMindXRuntime({
  dbPath: resolve(import.meta.dir, '../data/agents.sqlite'),
  characters: [character],
});
const input = process.argv.slice(2).join(' ').trim() || 'Hello';

await runtime.start();
try {
  const result = await runtime.sendMessage(character.id, input);
  console.log(result.message.content);
} finally {
  await runtime.stop();
}
`,
    'utf8',
  );
  const character = readDemoCharacter(child(stage, 'vendor', 'runtime', 'characters', 'demo.json'));
  writeFileSync(child(stage, 'character.json'), `${JSON.stringify(character, null, 2)}\n`, 'utf8');
  writeFileSync(child(stage, '.gitignore'), `node_modules/\ndata/\n`, 'utf8');
  writeFileSync(
    child(stage, 'README.md'),
    [
      '# SYMindX v0.1 agent',
      '',
      `This project uses the locally built @symindx/runtime ${runtime.version} copied into vendor/runtime. The scaffolder does not install packages or download a published runtime.`,
      '',
      '## Run',
      '',
      'Requires Bun 1.4.2 or newer. From this directory:',
      '',
      '```sh',
      'bun install',
      'bun run start -- "Hello from my agent"',
      'bun run typecheck',
      '```',
      '',
      'The starter character in character.json uses the offline echo provider. It stores conversation and state in data/agents.sqlite. Keep this database on a local filesystem; v0.1 stores message/tool output as plaintext, recalls a bounded recent-message window, and does not provide semantic memory or cross-user isolation.',
      '',
      'To configure an OpenAI-compatible endpoint, edit the character provider object to include type "openai-compatible", model, baseUrl, and an environment variable name in apiKeyEnv (for example, MODEL_API_KEY). Set that variable in the environment before running; never put the key in character.json. The adapter requires HTTPS except for loopback HTTP and a compatible Chat Completions endpoint.',
      '',
    ].join('\n'),
    'utf8',
  );
}

function assertStagingPath(stage: string, parent: string, prefix: string): string {
  const resolvedParent = resolve(parent);
  const resolvedStage = resolve(stage);
  let realParent: string;
  let realStage: string;
  try {
    realParent = realpathSync(resolvedParent);
    realStage = realpathSync(resolvedStage);
  } catch {
    throw new Error('Staging directory could not be resolved safely');
  }
  if (
    dirname(realStage).toLowerCase() !== realParent.toLowerCase() ||
    !basename(realStage).startsWith(prefix) ||
    dirname(resolvedStage).toLowerCase() !== resolvedParent.toLowerCase() ||
    !basename(resolvedStage).startsWith(prefix)
  )
    throw new Error('Staging directory resolved outside its intended parent');
  return resolvedStage;
}

function scaffold(options: Options): string {
  const output = resolve(process.cwd(), options.out);
  assertAbsent(output);
  const runtimePath = resolve(process.cwd(), options.runtimePath);
  const parent = dirname(output);
  mkdirSync(parent, { recursive: true });
  const stagePrefix = `.create-symindx-${randomUUID()}-`;
  const stage = mkdtempSync(child(parent, stagePrefix));
  const stagePath = assertStagingPath(stage, parent, stagePrefix);
  try {
    const runtime = copyRuntime(runtimePath, stage);
    writeGeneratedProject(stage, runtime);
    assertAbsent(output);
    renameSync(stagePath, output);
  } catch (error) {
    rmSync(assertStagingPath(stagePath, parent, stagePrefix), { recursive: true, force: true });
    throw error;
  }
  return output;
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (!options) help();
  else console.log(`Created SYMindX v0.1 project at ${scaffold(options)}`);
} catch (error) {
  console.error(`create-symindx: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
