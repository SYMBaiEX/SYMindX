import json,pathlib,re
root=pathlib.Path('/home/cid/CursorProjects/symindx'); out=root/'mind-agents/docs/audits/2026-10-03'; text=(out/'audit.md').read_text()
errors=[]; links=re.findall(r'\]\(<(.*?)>\)',text)
prefix='\\\\wsl.localhost\\Ubuntu\\home\\cid\\CursorProjects\\symindx\\'
for target in links:
 if not target.startswith(prefix): errors.append({'target':target,'error':'unexpected root'}); continue
 relative=target[len(prefix):].replace('\\','/'); match=re.fullmatch(r'(.*):(\d+)',relative); path=match[1] if match else relative; p=root/path
 if not p.is_file(): errors.append({'target':target,'error':'file absent'})
 elif match and int(match[2])>len(p.read_text(errors='replace').splitlines()): errors.append({'target':target,'error':'line exceeds file'})
result={'audit_words':len(text.split()),'local_links_checked':len(links),'link_errors':errors,'placeholders_remaining':'(@' in text,'readme_audit_target_exists':(root/'mind-agents/docs/audits/2026-10-03/audit.md').exists()}
(out/'report-checks.json').write_text(json.dumps(result,indent=2)+'\n'); print(json.dumps(result,indent=2))