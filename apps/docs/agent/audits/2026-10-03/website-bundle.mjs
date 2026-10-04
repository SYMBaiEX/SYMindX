// Compile/bundle only, with envDir isolated so actual .env files are never loaded.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(new URL('../../../../website/package.json',import.meta.url));
const {build}=await import(require.resolve('vite'));
const react=(await import(require.resolve('@vitejs/plugin-react'))).default;
const root=fileURLToPath(new URL('../../../../website/',import.meta.url));
const scratch=mkdtempSync(join(tmpdir(),'symindx-audit-vite-'));
process.chdir(root);
await build({configFile:false,root,envDir:scratch,cacheDir:join(scratch,'cache'),plugins:[react()],resolve:{alias:{'@':join(root,'src')}},build:{outDir:join(scratch,'dist'),emptyOutDir:false}});
console.log('Audit bundling output:',scratch);