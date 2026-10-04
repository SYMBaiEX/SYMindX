import { readFileSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Read package metadata only. No installs, code imports, network or cleanup.
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures: string[] = [];
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function manifest(path: string): Record<string, unknown> {
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!record(value) || typeof value.name !== 'string' || !value.name) {
    throw new Error(`Invalid manifest: ${relative(packageRoot, path)}`);
  }
  return value;
}
function inside(root: string, path: string): string {
  const target = resolve(root, path);
  const offset = relative(root, target);
  if (isAbsolute(offset) || offset === '..' || offset.startsWith(`..${sep}`)) {
    throw new Error('Workspace path escaped the package directory');
  }
  return target;
}
function discover(directory: string, result: Set<string>, depth = 0): void {
  if (depth > 32) throw new Error('Workspace directory nesting exceeds the supported bound');
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    if (entry.isFile() && entry.name === 'package.json') result.add(directory);
    if (entry.isDirectory() && !['node_modules', 'dist', '.git'].includes(entry.name)) {
      discover(inside(directory, entry.name), result, depth + 1);
    }
  }
}
try {
  const rootManifest = manifest(resolve(packageRoot, 'package.json'));
  const workspaces = rootManifest.workspaces;
  if (!Array.isArray(workspaces) || workspaces.some((item) => typeof item !== 'string')) {
    throw new Error('Expected an explicit workspace path array');
  }
  const registered = new Set<string>();
  const manifests = new Map<string, Record<string, unknown>>();
  const names = new Set<string>([rootManifest.name as string]);
  for (const entry of workspaces) {
    const directory = inside(packageRoot, entry as string);
    if (registered.has(directory)) failures.push(`Duplicate workspace path: ${entry}`);
    registered.add(directory);
    const value = manifest(resolve(directory, 'package.json'));
    const name = value.name as string;
    if (names.has(name)) failures.push(`Duplicate workspace name: ${name}`);
    names.add(name);
    manifests.set(directory, value);
  }
  const actual = new Set<string>();
  discover(resolve(packageRoot, 'src'), actual);
  for (const directory of actual) {
    if (!registered.has(directory)) failures.push(`Unregistered workspace: ${relative(packageRoot, directory)}`);
  }
  manifests.set(packageRoot, rootManifest);
  for (const [directory, value] of manifests) {
    for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      const dependencies = value[section];
      if (dependencies === undefined) continue;
      if (!record(dependencies)) throw new Error(`Invalid ${section} in ${relative(packageRoot, directory)}`);
      for (const [name, range] of Object.entries(dependencies)) {
        if (typeof range !== 'string') throw new Error(`Invalid dependency range: ${name}`);
        if (range.startsWith('workspace:') && !names.has(name)) {
          failures.push(`Unknown local dependency ${name} in ${relative(packageRoot, directory) || '.'}`);
        }
      }
    }
  }
  if (failures.length) {
    for (const failure of failures) console.error(failure);
    process.exitCode = 1;
  } else {
    console.log(`Workspace metadata is consistent: ${registered.size} registered packages.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Unable to read workspace metadata');
  process.exitCode = 1;
}
