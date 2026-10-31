#!/usr/bin/env python3
"""catctl set ID STATE [TASK]; catctl get"""
import argparse, json, os, sys
from urllib.request import Request, urlopen
from urllib.error import URLError

def report(state, task='', ident=None, name=None, url=None):
    ident=ident or os.environ.get('CAT_ID','coder')
    data={'id':ident,'state':state,'task':task,'name':name or os.environ.get('CAT_NAME',ident)}
    return request(data,url)
def request(data=None,url=None):
    endpoint=(url or os.environ.get('CAT_OFFICE_URL','http://127.0.0.1:8770')).rstrip('/')+'/api/status'
    headers={'Content-Type':'application/json'}
    credential=os.environ.get('CAT_OFFICE_TOKEN')
    if credential: headers['Authorization']='Bearer '+credential
    req=Request(endpoint,data=None if data is None else json.dumps(data).encode(),headers=headers)
    with urlopen(req,timeout=5) as response: return json.load(response)
def main():
    parser=argparse.ArgumentParser(); sub=parser.add_subparsers(dest='command',required=True)
    setter=sub.add_parser('set'); setter.add_argument('id'); setter.add_argument('state'); setter.add_argument('task',nargs='?',default=''); setter.add_argument('--name')
    sub.add_parser('get'); args=parser.parse_args()
    try: result=report(args.state,args.task,args.id,args.name) if args.command=='set' else request()
    except (URLError,ValueError): print('Office unavailable or request rejected',file=sys.stderr);return 1
    print(json.dumps(result,ensure_ascii=False));return 0
if __name__=='__main__': sys.exit(main())
