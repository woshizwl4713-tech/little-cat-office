#!/usr/bin/env python3
"""Loopback status server. Run from any directory. No third-party dependencies."""
import argparse, hmac, json, os
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
            if path == '/api/status':
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
            if urlsplit(self.path).path != '/api/status': return self.reply(404, {'error':'Not found'})
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
                result = store.push(payload)
            except (ValueError, UnicodeError): return self.reply(400, {'error':'Invalid status payload or timestamp'})
            return self.reply(200, result)
    return Handler

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--port',type=int,default=8770)
    parser.add_argument('--offline-after',type=float,default=300,help='Seconds without an update')
    args=parser.parse_args()
    if args.offline_after<=0: parser.error('--offline-after must be positive')
    store=Store(args.offline_after)
    seed=ROOT/'examples'/'status.json'
    if seed.exists(): store.push(json.loads(seed.read_text()))
    server=ThreadingHTTPServer(('127.0.0.1',args.port),handler(store,os.environ.get('CAT_OFFICE_TOKEN','')))
    print(f'Little Cat Office: http://127.0.0.1:{args.port}/app/',flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
if __name__=='__main__': main()
