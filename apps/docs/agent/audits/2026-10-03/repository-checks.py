import collections,json,pathlib,subprocess
root=pathlib.Path('/home/cid/CursorProjects/symindx'); out=root/'mind-agents/docs/audits/2026-10-03'
cmd=['git','-c',f'safe.directory={root}']
tracked=subprocess.check_output(cmd+['ls-files','-z'],cwd=root).decode().split('\0'); tracked=[x for x in tracked if x]
present=[x for x in tracked if (root/x).is_file() and not x.startswith(('node_modules/','mind-agents/dist/','website/dist/','create-symindx/dist/'))]
counts=collections.Counter(x.split('/')[0] if '/' in x else '(root)' for x in present)
source=collections.defaultdict(lambda:{'files':0,'lines':0})
for rel in present:
 if pathlib.Path(rel).suffix in ['.ts','.tsx','.js','.jsx'] and '/src/' in rel:
  area=rel.split('/src/')[0]; source[area]['files']+=1; source[area]['lines']+=len((root/rel).read_text(errors='replace').splitlines())
manifest_errors=[]; manifests=[]
for rel in present:
 if pathlib.Path(rel).name=='package.json':
  try: manifests.append((rel,json.loads((root/rel).read_text())))
  except Exception as e: manifest_errors.append({'file':rel,'error':str(e)})
missing=[]
for rel in ['package.json','mind-agents/package.json']:
 data=json.loads((root/rel).read_text())
 for path in data.get('workspaces',[]):
  if not (root/rel).parent.joinpath(path).exists(): missing.append({'manifest':rel,'workspace':path})
shell=[]
for rel in present:
 if rel.endswith('.sh'):
  run=subprocess.run(['bash','-n',str(root/rel)],capture_output=True,text=True)
  shell.append({'file':rel,'exit':run.returncode,'diagnostics':run.stderr})
base=json.loads((out/'baseline.json').read_text()); originals={r['path'] for r in base['dirty_files']}
status=subprocess.check_output(cmd+['status','--porcelain=v1','--untracked-files=all'],cwd=root).decode().splitlines(); unexpected=[]; introduced=[]
for line in status:
 p=line[3:]
 if p not in originals:
  introduced.append(p)
  if p not in ['README.md','package.json','mind-agents/tsconfig.json','mind-agents/eslint.config.js'] and not p.startswith('mind-agents/docs/audits/2026-10-03/'): unexpected.append(p)
result={'tracked_present_by_top_area':dict(counts),'source_counts':dict(source),'parsed_manifests':len(manifests),'manifest_parse_errors':manifest_errors,'missing_workspaces':missing,'shell_syntax_checks':shell,'gitlink_entries':subprocess.check_output(cmd+['ls-files','--stage','cli'],cwd=root).decode(),'website_dockerfile_exists':(root/'website/Dockerfile').exists(),'unexpected_new_changes':unexpected,'introduced_paths':introduced}
(out/'repository-checks.json').write_text(json.dumps(result,indent=2)+'\n'); print(json.dumps({k:v for k,v in result.items() if k not in ['introduced_paths','shell_syntax_checks','missing_workspaces']},indent=2)); print('shell syntax:',len(shell),'checked,',sum(x['exit']!=0 for x in shell),'failed; missing workspaces:',len(missing))