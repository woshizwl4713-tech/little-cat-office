#!/usr/bin/env python3
"""Loopback status server. Run from any directory. No third-party dependencies."""
import argparse, hmac, json, os, time, sqlite3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit, unquote
from status import Store
ROOT = Path(__file__).resolve().parents[1]

def handler(store, credential='', root=ROOT):
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs): super().__init__(*args, directory=str(root), **kwargs)
        def log_message(self, *_): pass  # Never log request bodies or authorization.
        def reply(self, code, body):
            data = json.dumps(body, ensure_ascii=False).encode()
            self.send_response(code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers(); self.wfile.write(data)
        def authorized(self):
            return not credential or hmac.compare_digest(self.headers.get('Authorization',''), 'Bearer '+credential)
        def do_GET(self):
            path = urlsplit(self.path).path
            if path == '/api/events':
                if not self.authorized(): return self.reply(401, {'error':'Authorization required'})
                self.send_response(200)
                self.send_header('Content-Type','text/event-stream; charset=utf-8')
                self.send_header('Cache-Control','no-cache, no-transform')
                self.send_header('X-Accel-Buffering','no')
                self.end_headers()
                previous=None; heartbeat=0
                try:
                    while True:
                        current=json.dumps(store.snapshot(),ensure_ascii=False)
                        if current!=previous:
                            self.wfile.write(('event: status\ndata: '+current+'\n\n').encode());self.wfile.flush();previous=current;heartbeat=time.monotonic()
                        elif time.monotonic()-heartbeat>=10:
                            self.wfile.write(b': heartbeat\n\n');self.wfile.flush();heartbeat=time.monotonic()
                        store.wait(1)
                except (BrokenPipeError,ConnectionResetError,OSError): pass
                return
            if path in ('/api/status','/api/roster','/api/assignments','/api/assign'):
                if not self.authorized(): return self.reply(401, {'error':'Authorization required'})
                return self.reply(200, store.snapshot())
            if path == '/api/health': return self.reply(200, {'ok':True,'authentication':bool(credential)})
            if path == '/':
                self.send_response(302); self.send_header('Location','/app/'); self.end_headers(); return
            # Expose only public application assets, never repository, state, or configuration overrides.
            target = (root / unquote(path).lstrip('/')).resolve()
            if not target.is_relative_to((root/'app').resolve()) or any(p.startswith('.') for p in target.relative_to(root).parts):
                return self.reply(404, {'error':'Not found'})
            if target.is_dir() and not (target/'index.html').exists(): return self.reply(404, {'error':'Not found'})
            super().do_GET()
        def do_POST(self):
            if urlsplit(self.path).path not in ('/api/status','/api/roster','/api/assignments','/api/assign'): return self.reply(404, {'error':'Not found'})
            if not self.authorized(): return self.reply(401, {'error':'Authorization required'})
            origin = self.headers.get('Origin')
            if origin and origin not in ('http://'+self.headers.get('Host',''),):
                return self.reply(403, {'error':'Cross-origin push denied'})
            if self.headers.get('Content-Type','').split(';')[0] != 'application/json':
                return self.reply(415, {'error':'Use application/json'})
            try:
                size = int(self.headers.get('Content-Length','0'))
                if not 0 < size <= 1024*1024: return self.reply(413, {'error':'Invalid body size'})
                payload = json.loads(self.rfile.read(size))
                route=urlsplit(self.path).path
                result = store.dispatch(payload) if route=='/api/assign' else store.assign(payload) if route=='/api/assignments' else store.edit(payload) if route=='/api/roster' else store.push(payload)
            except (ValueError, UnicodeError) as error: return self.reply(400, {'error':'只能有一只领导猫，请先调整原领导的角色' if str(error)=='Only one leader allowed' else 'Invalid status or roster payload'})
            except (OSError, sqlite3.Error): return self.reply(503, {'error':'Unable to persist update; previous state retained'})
            return self.reply(200, result)
    return Handler

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--port',type=int,default=8770)
    parser.add_argument('--offline-after',type=float,default=None,help='Seconds without an update (default: config minutes or 1800)' )
    parser.add_argument('--demo',action='store_true',help='Isolated in-memory example cats')
    parser.add_argument('--data-dir',default=str(ROOT/'.local'),help='Private persistent state directory')
    args=parser.parse_args()
    config_path=ROOT/'app'/'config.json'
    config=json.loads(config_path.read_text()) if config_path.exists() else {}
    timeout=args.offline_after if args.offline_after is not None else config.get('offlineAfterMinutes',30)*60
    if not isinstance(timeout,(int,float)) or timeout<=0: parser.error('Timeout must be positive')
    store=Store(timeout,stale_becomes=config.get('staleBecomes','idle'),path=None if args.demo else Path(args.data_dir)/'office.sqlite3',auto_lead=config.get('autoLeader',True))
    configured=[a for a in config.get('agents',[]) if a.get('role')=='lead']
    if len(configured)>1:parser.error('Only one configured leader allowed')
    if configured and not args.demo:
        leader=configured[0];old=next((a for a in store.snapshot()['agents'] if a['id']==leader['id']),{})
        store.push({**old,**leader,'state':old.get('state','idle')})
    seed=ROOT/'examples'/'status.json'
    if args.demo and seed.exists(): store.push(json.loads(seed.read_text()))
    server=ThreadingHTTPServer(('127.0.0.1',args.port),handler(store,os.environ.get('CAT_OFFICE_TOKEN','')))
    print(f'Little Cat Office: http://127.0.0.1:{args.port}/app/',flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
if __name__=='__main__': main()
