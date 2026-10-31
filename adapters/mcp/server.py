#!/usr/bin/env python3
"""Minimal MCP stdio JSON-RPC server: newline-delimited JSON, no dependencies."""
import json, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts'))
from catctl import report

def dispatch(req):
    method=req.get('method'); params=req.get('params',{})
    if method=='initialize':
        return {'protocolVersion':'2024-11-05','capabilities':{'tools':{}},'serverInfo':{'name':'little-cat-office','version':'1.0.0'}}
    if method=='ping': return {}
    if method=='tools/list':
        return {'tools':[{'name':'set_status','description':'Report your own office state; use need_you to request human attention.','inputSchema':{'type':'object','properties':{'id':{'type':'string'},'state':{'type':'string','enum':['working','meeting','idle','need_you','offline']},'task':{'type':'string'},'name':{'type':'string'}},'required':['id','state'],'additionalProperties':False}}]}
    if method=='tools/call':
        if params.get('name')!='set_status': raise ValueError('Unknown tool')
        a=params.get('arguments',{})
        if not isinstance(a,dict) or not isinstance(a.get('id'),str) or not a['id'] or a.get('state') not in ['working','meeting','idle','need_you','offline']: raise ValueError('Invalid arguments')
        try: value=report(a['state'],a.get('task',''),a['id'],a.get('name'))
        except Exception: return {'isError':True,'content':[{'type':'text','text':'Office unavailable or request rejected'}]}
        return {'content':[{'type':'text','text':json.dumps(value,ensure_ascii=False)}]}
    raise ValueError('Unknown method')

def main():
    for line in sys.stdin:
        req=None
        try:
            req=json.loads(line)
            if not isinstance(req,dict): raise ValueError('Invalid request')
            if 'id' not in req: continue
            result=dispatch(req); response={'jsonrpc':'2.0','id':req['id'],'result':result}
        except Exception:
            response={'jsonrpc':'2.0','id':req.get('id') if isinstance(req,dict) else None,'error':{'code':-32602,'message':'Invalid request or parameters'}}
        print(json.dumps(response,ensure_ascii=False),flush=True)
if __name__=='__main__': main()
