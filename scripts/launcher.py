"""Portable desktop launcher and optional login supervisor (stdlib only)."""
import os, sys, socket, subprocess, time, webbrowser, shlex, json
from urllib.request import urlopen
from pathlib import Path
def plist_bytes(values):
    from html import escape
    def encode(v):
        if isinstance(v, bool): return '<true/>' if v else '<false/>'
        if isinstance(v, int): return '<integer>'+str(v)+'</integer>'
        if isinstance(v, list): return '<array>'+''.join(map(encode,v))+'</array>'
        return '<string>'+escape(v)+'</string>'
    return ('<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict>'+''.join('<key>'+escape(k)+'</key>'+encode(v) for k,v in values.items())+'</dict></plist>').encode()

ROOT = Path(__file__).resolve().parents[1]
LABEL = 'org.little-cat-office.server'

def listening(port=8770):
    try:
        with socket.create_connection(('127.0.0.1', port), timeout=.3): return True
    except OSError: return False

def matches(port):
    try:
        with urlopen(f'http://127.0.0.1:{port}/api/health', timeout=1) as response:
            health = json.load(response)
        return (health.get('ok') is True and health.get('root') == str(ROOT.resolve())
                and health.get('dataDir') == str((ROOT/'.local').resolve()))
    except (OSError, ValueError, AttributeError): return False

def launch(browser=True):
    local = ROOT / '.local'; local.mkdir(exist_ok=True)
    remembered = local/'launcher.port'
    try:
        port = int(remembered.read_text())
        if not 1024 <= port <= 65535: port = 8770
    except (OSError, ValueError): port = 8770
    if not matches(port):
        port = 8770
        while listening(port):
            if matches(port): break
            port += 1
            if port > 65535: raise RuntimeError('No available launcher port')
        if not matches(port):
            with (local / 'server.log').open('ab') as log:
                if port != 8770:
                    log.write(f'Preferred port belongs to another service; using {port}\n'.encode()); log.flush()
                options = {'creationflags': subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == 'nt' else {'start_new_session': True}
                proc = subprocess.Popen([sys.executable, str(ROOT/'server/server.py'), '--port', str(port)], cwd=ROOT, stdin=subprocess.DEVNULL, stdout=log, stderr=log, **options)
            (local/'server.pid').write_text(str(proc.pid))
            for _ in range(100):
                if proc.poll() is not None: raise RuntimeError('Server exited; see .local/server.log')
                if matches(port): break
                time.sleep(.1)
            else: raise RuntimeError('Server startup timed out; see .local/server.log')
    remembered.write_text(str(port))
    if browser: webbrowser.open(f'http://127.0.0.1:{port}/app/')
    return port

def install_launcher(desktop=None):
    desktop = Path(desktop) if desktop else Path.home()/'Desktop'
    if sys.platform.startswith('linux') and desktop == Path.home()/'Desktop':
        try: desktop = Path(subprocess.check_output(['xdg-user-dir','DESKTOP'], text=True).strip())
        except (OSError, subprocess.CalledProcessError): pass
    desktop.mkdir(parents=True, exist_ok=True)
    command = shlex.join([sys.executable, str(Path(__file__).resolve())])
    if sys.platform == 'darwin':
        target = desktop/'小猫办公室.app'; contents=target/'Contents'; mac=contents/'MacOS'; mac.mkdir(parents=True,exist_ok=True)
        executable=mac/'launch'; executable.write_text('#!/bin/sh\nexec '+command+'\n'); executable.chmod(0o755)
        resources=contents/'Resources'; resources.mkdir(exist_ok=True)
        icon=ROOT/'app/assets/cats/orange_wave.png'
        if icon.exists():
            import struct
            png=icon.read_bytes(); chunk=b'ic09'+struct.pack('>I',len(png)+8)+png
            (resources/'cat.icns').write_bytes(b'icns'+struct.pack('>I',len(chunk)+8)+chunk)
        (contents/'Info.plist').write_bytes(plist_bytes({'CFBundleExecutable':'launch','CFBundleIdentifier':LABEL+'.launcher','CFBundleName':'小猫办公室','CFBundlePackageType':'APPL','CFBundleIconFile':'cat.icns'}))
    elif os.name == 'nt':
        target=desktop/'小猫办公室.bat'
        target.write_text('@echo off\nstart "" '+subprocess.list2cmdline([sys.executable,str(Path(__file__).resolve())])+'\n',encoding='utf-8')
    else:
        target=desktop/'小猫办公室.desktop'
        target.write_text('[Desktop Entry]\nType=Application\nName=小猫办公室\nExec='+ ' '.join('"'+s.replace('\\','\\\\').replace('"','\\"').replace('`','\\`').replace('$','\\$')+'"' for s in [sys.executable,str(Path(__file__).resolve())])+'\nIcon='+str(ROOT/'app/assets/cats/orange_wave.png')+'\nTerminal=false\n')
        target.chmod(0o755)
        try: subprocess.run(['gio','set',str(target),'metadata::trusted','true'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        except OSError: pass
    return str(target)

def autostart(enabled):
    local=ROOT/'.local'; local.mkdir(exist_ok=True)
    if sys.platform == 'darwin':
        path=Path.home()/'Library/LaunchAgents'/f'{LABEL}.plist'; path.parent.mkdir(parents=True,exist_ok=True)
        subprocess.run(['launchctl','bootout',f'gui/{os.getuid()}',str(path)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        if enabled:
            path.write_bytes(plist_bytes({'Label':LABEL,'ProgramArguments':[sys.executable,str(ROOT/'scripts/launcher.py'),'--supervise'],'WorkingDirectory':str(ROOT),'RunAtLoad':True,'KeepAlive':True,'ThrottleInterval':10,'StandardOutPath':str(local/'server.log'),'StandardErrorPath':str(local/'server.log')}))
            subprocess.run(['launchctl','bootstrap',f'gui/{os.getuid()}',str(path)],check=True)
        else: path.unlink(missing_ok=True)
    elif os.name == 'nt':
        startup=Path(os.environ['APPDATA'])/'Microsoft/Windows/Start Menu/Programs/Startup'; startup.mkdir(parents=True,exist_ok=True)
        path=startup/'LittleCatOffice.bat'
        if enabled: path.write_text('@echo off\nstart "" '+subprocess.list2cmdline([sys.executable,str(Path(__file__).resolve()),'--supervise'])+'\n')
        else: path.unlink(missing_ok=True)
    else:
        path=Path.home()/'.config/systemd/user'/f'{LABEL}.service';path.parent.mkdir(parents=True,exist_ok=True)
        if enabled:
            quote=lambda s:'"'+str(s).replace('\\','\\\\').replace('"','\\"').replace('%','%%')+'"'
            path.write_text('[Unit]\nDescription=Little Cat Office\n[Service]\nExecStart='+quote(sys.executable)+' '+quote(ROOT/'scripts/launcher.py')+ ' --supervise'+'\nWorkingDirectory='+quote(ROOT)+'\nRestart=always\nRestartSec=5\n[Install]\nWantedBy=default.target\n')
            subprocess.run(['systemctl','--user','daemon-reload'],check=True)
            subprocess.run(['systemctl','--user','enable','--now',path.name],check=True)
        else:
            subprocess.run(['systemctl','--user','disable','--now',path.name],check=True);path.unlink(missing_ok=True)
    return 'Autostart '+('enabled' if enabled else 'disabled')

if __name__ == '__main__':
    if '--supervise' in sys.argv:
        while True:
            launch(False);time.sleep(5)
    else: launch()
