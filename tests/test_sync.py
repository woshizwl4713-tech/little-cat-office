import importlib.util, json, os, subprocess, sys, threading, unittest
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'server'))
from status import Store
from server import handler
from http.server import ThreadingHTTPServer

class StatusTests(unittest.TestCase):
    def test_expiry_unknown_atomic_stale(self):
        now=[1000000];s=Store(60,lambda:now[0])
        s.push({'id':'a','state':'unexpected'})
        self.assertEqual(s.snapshot()['agents'][0]['state'],'idle')
        with self.assertRaises(ValueError):s.push([{'id':'b'},{'name':'invalid'}])
        self.assertEqual(len(s.records),1)
        now[0]+=61;self.assertEqual(s.snapshot()['agents'][0]['state'],'offline')
        s.push({'id':'a','state':'working'});self.assertEqual(s.snapshot()['agents'][0]['state'],'working')
        s.push({'id':'a','state':'idle','updatedAt':'1970-01-01T00:00:00Z'});self.assertEqual(s.records['a']['state'],'working')
    def test_invalid(self):
        for p in [None,[],{},[{'id':'a'},{'id':'a'}],{'id':'a','updatedAt':'invalid'},{'id':'a','state':[]},{'id':'a','task':12}]:
            with self.subTest(p=p),self.assertRaises(ValueError):Store().push(p)
    def test_canonical_batch(self):
        s=Store();s.push({'agents':[{'id':'a','state':'meeting'},{'id':'b','status':'error'}]})
        self.assertEqual([a['state'] for a in s.snapshot()['agents']],['meeting','need_you'])

class HttpTests(unittest.TestCase):
    def setUp(self):
        self.server=ThreadingHTTPServer(('127.0.0.1',0),handler(Store(),'test-only'))
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
        self.url=f'http://127.0.0.1:{self.server.server_port}'
        self.env={**os.environ,'CAT_OFFICE_URL':self.url,'CAT_OFFICE_TOKEN':'test-only'}
    def tearDown(self):self.server.shutdown();self.server.server_close();self.thread.join()
    def call(self,path='/api/status',payload=None,auth=True):
        headers={'Content-Type':'application/json'}
        if auth:headers['Authorization']='Bearer test-only'
        try:
            with urlopen(Request(self.url+path,data=None if payload is None else json.dumps(payload).encode(),headers=headers)) as r:return json.load(r)
        except HTTPError as error:
            error.close();raise
    def test_http_auth_and_validation(self):
        with self.assertRaises(HTTPError) as e:self.call(auth=False)
        self.assertEqual(e.exception.code,401)
        self.call(payload={'id':'coder','state':'working'})
        self.call(payload=[{'id':'coder','state':'need_you'}])
        self.assertEqual(self.call()['agents'][0]['state'],'need_you')
        with self.assertRaises(HTTPError) as e:self.call(payload={'id':3})
        self.assertEqual(e.exception.code,400)
        with self.assertRaises(HTTPError):self.call('/server/server.py')
        with self.assertRaises(HTTPError):self.call('/app/../server/server.py')
    def test_adapters(self):
        result=subprocess.run([sys.executable,str(ROOT/'scripts/catctl.py'),'set','cli','working','hello'],env=self.env,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertTrue(any(a['id']=='cli' for a in self.call()['agents']))
        code=f"import sys;sys.path.insert(0,{str(ROOT/'adapters/python')!r});from office import report;report('meeting',ident='python')"
        subprocess.run([sys.executable,'-c',code],env=self.env,check=True)
        code="import {report} from './adapters/node/index.mjs';await report('idle','hello',{id:'node'});"
        subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,env=self.env,check=True)
        for event,state in [('PreToolUse','working'),('Stop','idle'),('Notification','need_you')]:
            subprocess.run([sys.executable,str(ROOT/'adapters/claude-code/hook.py')],input=json.dumps({'hook_event_name':event,'notification_type':'permission_prompt'}),text=True,env=self.env,check=True)
            self.assertEqual(next(a for a in self.call()['agents'] if a['id']=='claude')['state'],state)
        requests=[{'jsonrpc':'2.0','id':1,'method':'initialize'}, {'jsonrpc':'2.0','method':'notifications/initialized'}, {'jsonrpc':'2.0','id':2,'method':'tools/list'}, {'jsonrpc':'2.0','id':3,'method':'tools/call','params':{'name':'set_status','arguments':{'id':'mcp','state':'need_you'}}}]
        r=subprocess.run([sys.executable,str(ROOT/'adapters/mcp/server.py')],input='\n'.join(json.dumps(x) for x in requests)+'\n',text=True,capture_output=True,env=self.env,check=True)
        responses=[json.loads(line) for line in r.stdout.splitlines()];self.assertEqual(len(responses),3)
        self.assertEqual(responses[1]['result']['tools'][0]['name'],'set_status')
        self.assertFalse(responses[2]['result'].get('isError',False))
        self.assertEqual(next(a for a in self.call()['agents'] if a['id']=='mcp')['state'],'need_you')
if __name__=='__main__':unittest.main()
