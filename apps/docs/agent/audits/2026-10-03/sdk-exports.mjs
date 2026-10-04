import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../../package.json',import.meta.url));
const ai=await import(require.resolve('ai'));
console.log('experimental_createMCPClient:',typeof ai.experimental_createMCPClient);
for(const name of ['ai/mcp-stdio','@ai-sdk/openai']) {
 try {const mod=await import(require.resolve(name)); console.log(name,'loaded; Experimental_StdioMCPTransport:',typeof mod.Experimental_StdioMCPTransport);}
 catch(e) {console.log(name,e.code,e.message);process.exitCode=1;}
}