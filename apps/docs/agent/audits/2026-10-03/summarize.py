import collections, gzip, hashlib, json, pathlib, re, subprocess
root=pathlib.Path('/home/cid/CursorProjects/symindx'); out=root/'mind-agents/docs/audits/2026-10-03'
summary={}

def read_log(name):
 p=out/name
 return p.read_bytes() if p.exists() else gzip.open(str(p)+'.gz','rb').read()
for phase in ['baseline','after']:
 rows=json.loads(read_log(f'lint-{phase}.json').decode())
 summary[f'lint_{phase}']={'files':len(rows),'errors':sum(x['errorCount'] for x in rows),'warnings':sum(x['warningCount'] for x in rows),'fatal':sum(x['fatalErrorCount'] for x in rows),'rules':dict(collections.Counter(m.get('ruleId') or 'parser' for x in rows for m in x['messages'])),'fatal_messages':[{'file':x['filePath'],'messages':[m for m in x['messages'] if m.get('fatal')]} for x in rows if x['fatalErrorCount']]}
 s=read_log(f'typecheck-{phase}.log').decode()
 hits=re.findall(r'^(.+?)\(\d+,\d+\): error (TS\d+):',s,re.M)
 summary[f'typecheck_{phase}']={'errors':len(hits),'files':len(set(x[0] for x in hits)),'codes':dict(collections.Counter(x[1] for x in hits)),'by_area':dict(collections.Counter(x[0].split('/')[1] if x[0].startswith('src/') else x[0].split('/')[0] for x in hits))}
summary['typecheck_diagnostics_unchanged']=read_log('typecheck-baseline.log')==read_log('typecheck-after.log')
summary['lint_diagnostics_unchanged']=read_log('lint-baseline.json')==read_log('lint-after.json')
base=json.loads((out/'baseline.json').read_text()); changed=[]
for row in base['dirty_files']:
 p=root/row['path']; exists=p.exists()
 if exists!=row['exists'] or (exists and hashlib.sha256(p.read_bytes()).hexdigest().upper()!=row['sha256']): changed.append(row['path'])
summary['preservation']={'original_dirty_files':len(base['dirty_files']),'changed_original_files':changed}
(out/'validation-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
# Compress only new audit output files, retaining full diagnostics without large text additions.
for name in ['lint-baseline.json','lint-after.json','typecheck-baseline.log','typecheck-after.log']:
 p=out/name
 if not p.exists(): continue
 with gzip.open(str(p)+'.gz','wb') as f: f.write(p.read_bytes())
 p.unlink()
print(json.dumps({k:({i:v for i,v in val.items() if i not in ['rules','codes','by_area','fatal_messages']} if isinstance(val,dict) else val) for k,val in summary.items()},indent=2))