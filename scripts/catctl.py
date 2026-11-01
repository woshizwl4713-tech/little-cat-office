#!/usr/bin/env python3
"""catctl set ID STATE [TASK]; catctl get"""
import argparse, json, os, sys, tempfile
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError

def report(state, task='', ident=None, name=None, url=None, role=None):
    ident=ident or os.environ.get('CAT_ID','coder')
    data={'id':ident,'state':state,'task':task,'name':name or os.environ.get('CAT_NAME',ident)}
    if role is not None:data["role"]=role
    return request(data,url)
def request(data=None,url=None,path="/api/status"):
    endpoint=(url or os.environ.get('CAT_OFFICE_URL','http://127.0.0.1:8770')).rstrip('/')+path
    headers={'Content-Type':'application/json'}
    credential=os.environ.get('CAT_OFFICE_TOKEN')
    if credential: headers['Authorization']='Bearer '+credential
    req=Request(endpoint,data=None if data is None else json.dumps(data).encode(),headers=headers)
    with urlopen(req,timeout=5) as response: return json.load(response)
def init_roster(source, target):
    payload=json.loads(Path(source).read_text())
    agents=payload.get('agents') if isinstance(payload,dict) else payload
    if not isinstance(agents,list) or len(agents)>500: raise ValueError('Roster must be a list of at most 500 entries')
    seen=set();clean=[]
    for a in agents:
        if not isinstance(a,dict): raise ValueError('Invalid roster entry')
        row={k:a.get(k) for k in ('id','name','avatar')}
        if any(not isinstance(v,str) or not v.strip() or len(v)>100 for v in row.values()) or row['id'] in seen: raise ValueError('Each entry needs unique id, name and avatar')
        if a.get('role') is not None:
            if a['role'] not in ('employee','lead'):raise ValueError('Invalid role')
            row['role']=a['role']
        seen.add(row['id']);clean.append(row)
    if sum(a.get('role')=='lead' for a in clean)>1:raise ValueError('Only one leader allowed')
    target=Path(target);config=json.loads(target.read_text()) if target.exists() else {'statusUrl':'/api/status','pollIntervalMs':1000,'offlineAfterMinutes':5}
    if not isinstance(config,dict): raise ValueError('Config must be an object')
    config['agents']=clean;config['rosterMode']='manual';config.setdefault('staleBecomes','idle');target.parent.mkdir(parents=True,exist_ok=True)
    temp=None
    try:
        with tempfile.NamedTemporaryFile('w',encoding='utf-8',dir=target.parent,delete=False) as f:
            temp=Path(f.name);json.dump(config,f,ensure_ascii=False,indent=2);f.write('\n')
        temp.replace(target)
    finally:
        if temp and temp.exists():temp.unlink()
    return {'agents':len(clean),'message':'Roster config written; refresh the office to load it'}

def main():
    parser=argparse.ArgumentParser(); sub=parser.add_subparsers(dest='command',required=True)
    setter=sub.add_parser('set'); setter.add_argument('id'); setter.add_argument('state'); setter.add_argument('task',nargs='?',default=''); setter.add_argument('--name');setter.add_argument('--role',choices=['employee','lead'])
    assigner=sub.add_parser('assign');assigner.add_argument('agent');assigner.add_argument('task');assigner.add_argument('--leader');assigner.add_argument('--event-id');assigner.add_argument('--from',dest='sender');
    sub.add_parser('get');init=sub.add_parser('init');init.add_argument('--from',dest='source',default=str(Path(__file__).resolve().parents[1]/'examples/roster.example.json'));init.add_argument('--config',default=str(Path(__file__).resolve().parents[1]/'app/config.json'));args=parser.parse_args()
    if args.command=='init':
        try: result=init_roster(args.source,args.config)
        except (OSError,ValueError): print('Invalid roster or config; no valid config was overwritten',file=sys.stderr);return 1
        print(json.dumps(result,ensure_ascii=False));return 0
    if args.command=='assign':
        try:
            sender=args.sender or args.leader or next((a['id'] for a in request()['agents'] if a.get('role')=='lead'),None)
            result=request({'from':sender,'to':args.agent.split(','),'task':args.task,'id':args.event_id},path='/api/assign')
        except (URLError,ValueError):print('Assignment rejected or office unavailable',file=sys.stderr);return 1
        print(json.dumps(result,ensure_ascii=False));return 0
    try: result=report(args.state,args.task,args.id,args.name,role=args.role) if args.command=='set' else request()
    except (URLError,ValueError): print('Office unavailable or request rejected',file=sys.stderr);return 1
    print(json.dumps(result,ensure_ascii=False));return 0
if __name__=='__main__': sys.exit(main())
