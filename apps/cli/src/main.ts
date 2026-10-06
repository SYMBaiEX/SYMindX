import { fileURLToPath } from 'node:url';
import { runCli } from './cli/run.js';

const dataRoot = fileURLToPath(new URL('../../../.symindx', import.meta.url));
const code = await runCli(process.argv.slice(2), dataRoot);
process.exit(code);
