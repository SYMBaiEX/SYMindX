// Isolated local observations against production classes. Never imports an executable entrypoint.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { SimpleEventBus, createAgentEvent } from '../../../src/core/event-bus';
import { SYMindXModuleRegistry } from '../../../src/core/registry';
import { InMemoryProvider } from '../../../src/modules/memory/providers/memory';
import { SecretsManager } from '../../../src/core/security/secrets-manager';
import { QuantumCrypto } from '../../../src/core/security/quantum/quantum-crypto';
const scratch = mkdtempSync(join(tmpdir(), 'symindx-audit-local-'));
process.chdir(scratch);
const observations: any[] = [];
async function observe(name: string, fn: () => any) { try { observations.push({name,...await fn()}); } catch(e) { observations.push({name,error:e instanceof Error?e.message:String(e)}); } }
await observe('event_bus_off', () => { const bus=new SimpleEventBus(); let calls=0; const handler=()=>calls++; bus.on('probe',handler); bus.off('probe',handler); bus.emit(createAgentEvent('probe',{},'audit')); const remaining=bus.listenerCount('probe'); bus.shutdown(); return {callsAfterOff:calls,remaining,expectedCalls:0}; });
await observe('registry_config_scope', () => { const registry=new SYMindXModuleRegistry(); registry.registerFactory('probe',(config:any)=>({config})); const a=registry.create('probe',{agent:'a'}); const b=registry.create('probe',{agent:'b'}); registry.clear(); return {sameInstance:a===b,secondConfiguration:(b as any).config}; });
await observe('memory_store_isolate_search_persist', async () => {
 const config={enablePersistence:true,persistencePath:join(scratch,'memories.json'),autoSaveInterval:0,enableAutoCleanup:false};
 const first=new InMemoryProvider(config); const record:any={id:'audit-memory',agentId:'a',type:'interaction',content:'audit-only memory',timestamp:new Date(),importance:0.5,tags:[],duration:'long_term',embedding:[1,0]};
 await first.store('a',record); const before=(await first.retrieve('a','recent',10)).length; const other=(await first.retrieve('b','recent',10)).length; const vector=(await first.search('a',[1,0],10)).length; await first.disconnect();
 const second=new InMemoryProvider(config); const restored=await second.retrieve('a','recent',10); await second.disconnect(); return {stored:before,otherAgent:other,vectorResults:vector,restored:restored.length,contentMatches:restored[0]?.content===record.content};
});
await observe('secrets_default_gcm_round_trip', async () => { const secrets:any=new SecretsManager(); const key=randomBytes(32); const encrypted=await secrets.encryptWithKey('audit-only nonsecret',key); const value=await secrets.decryptWithKey(encrypted,key); return {roundTrip:value==='audit-only nonsecret'}; });
await observe('quantum_crypto_authentication', async () => { const crypto=new QuantumCrypto('CRYSTALS-Dilithium' as any,'NIST-1' as any); const data=new TextEncoder().encode('audit-only'); const signed=await crypto.sign(data,new Uint8Array([1])); signed.message=new TextEncoder().encode('forged'); signed.publicKey=new Uint8Array([9]); signed.signature.fill(0); const acceptsForgery=await crypto.verify(signed); const encrypted=await crypto.encrypt(data,new Uint8Array([1])); const recovered=await crypto.decrypt(encrypted,new Uint8Array([99])); return {acceptsForgery,unrelatedPrivateKeyDecrypts:new TextDecoder().decode(recovered)==='audit-only'}; });
await observe('sqlite_store_reopen_isolation', async () => {
 const {SQLiteMemoryProvider}=await import('../../../src/modules/memory/providers/sqlite');
 const config={dbPath:join(scratch,'memories.db'),consolidationInterval:0,archivalInterval:0};
 const record:any={id:'audit-sqlite',agentId:'a',type:'interaction',content:'audit-only SQLite memory',timestamp:new Date(),importance:0.5,tags:[],duration:'long_term',embedding:[1,0]};
 const first=new SQLiteMemoryProvider(config); try {await first.store('a',record);} finally {await first.destroy();}
 const second=new SQLiteMemoryProvider(config); try {const restored=await second.retrieve('a','recent',10); const other=await second.retrieve('b','recent',10); return {restored:restored.length,otherAgent:other.length,contentMatches:restored[0]?.content===record.content};} finally {await second.destroy();}
});
console.log(JSON.stringify({runtime:'Bun '+Bun.version,scratch,observations},null,2));