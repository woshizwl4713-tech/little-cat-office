#!/usr/bin/env python3
"""Check project-owned files; generic auth terms and third-party notices are allowed."""
import json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SKIP={'.git','node_modules','__pycache__'}
checks={
 'home_path':rb'/(?:Users|home)/[A-Za-z0-9_.-]+',
 'private_key':rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY',
 'provider_key':rb'\bsk-[A-Za-z0-9_-]{20,}',
}
issues=[];count=0
for p in sorted(ROOT.rglob('*')):
 if not p.is_file() or any(x in SKIP for x in p.relative_to(ROOT).parts):continue
 count+=1;data=p.read_bytes();rel=str(p.relative_to(ROOT))
 if p.name.startswith(('TASK','DONE')) or p.suffix=='.log':issues.append([rel,'internal artifact'])
 for label,pattern in checks.items():
  if re.search(pattern,data):issues.append([rel,label])
 if p.suffix=='.json' and p.name!='package-lock.json':
  try:obj=json.loads(data)
  except (ValueError,UnicodeError):continue
  def walk(x):
   if isinstance(x,dict):
    for k,v in x.items():
     if k.lower() in {'token','secret','apikey','api_key','password','authorization'} and isinstance(v,str) and v:issues.append([rel,'populated credential field'])
     walk(v)
   elif isinstance(x,list):
    for v in x:walk(v)
  walk(obj)
print(json.dumps({'scannedFiles':count,'issues':issues},ensure_ascii=False,indent=2))
raise SystemExit(bool(issues))
