import json,sys,threading,time,unittest
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from http.server import ThreadingHTTPServer
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from server import handler
from status import Store
class SSETests(unittest.TestCase):
 def test_push_expiry_and_auth(self):
  now=[100000];store=Store(timeout=5,clock=lambda:now[0]);store.push({'id':'sse','state':'working'})
  server=ThreadingHTTPServer(('127.0.0.1',0),handler(store,'test-only'));thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();url=f'http://127.0.0.1:{server.server_port}'
  try:
   try:urlopen(url+'/api/events')
   except HTTPError as e:self.assertEqual(e.code,401);e.close()
   else:self.fail('SSE must require authentication')
   with urlopen(Request(url+'/api/events',headers={'Authorization':'Bearer test-only'}),timeout=3) as response:
    self.assertIn('text/event-stream',response.headers['Content-Type'])
    def event():
     while True:
      line=response.readline().decode()
      if line.startswith('data:'):return json.loads(line[5:])
    self.assertEqual(event()['agents'][0]['state'],'working');start=time.monotonic();store.push({'id':'sse','state':'need_you'});self.assertEqual(event()['agents'][0]['state'],'need_you');self.assertLess(time.monotonic()-start,2)
    now[0]+=6
    self.assertEqual(event()['agents'][0]['state'],'idle')
  finally:server.shutdown();server.server_close();thread.join()
