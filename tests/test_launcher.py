import unittest, tempfile, sys, io, json
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import launcher
class LauncherTests(unittest.TestCase):
    def test_existing_service(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(launcher,'ROOT',Path(tmp)), patch.object(launcher,'matches',return_value=True), patch.object(launcher.subprocess,'Popen') as spawn, patch.object(launcher.webbrowser,'open') as browser:
            launcher.launch();spawn.assert_not_called()
            browser.assert_called_once_with('http://127.0.0.1:8770/app/')
    def test_foreign_service(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(launcher,'ROOT',Path(tmp)), patch.object(launcher,'matches',side_effect=[False,False,False,True]), patch.object(launcher,'listening',side_effect=[True,False]), patch.object(launcher.subprocess,'Popen') as spawn, patch.object(launcher.webbrowser,'open') as browser:
            spawn.return_value.poll.return_value=None
            self.assertEqual(launcher.launch(),8771)
            self.assertEqual((Path(tmp)/'.local/launcher.port').read_text(),'8771')
            self.assertEqual(spawn.call_args.args[0][-2:],['--port','8771'])
            browser.assert_called_once_with('http://127.0.0.1:8771/app/')
    def test_remembered_port(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(launcher,'ROOT',Path(tmp)), patch.object(launcher,'matches',return_value=True) as match:
            (Path(tmp)/'.local').mkdir()
            (Path(tmp)/'.local/launcher.port').write_text('8782')
            self.assertEqual(launcher.launch(False),8782)
            match.assert_called_once_with(8782)
    def test_missing_health(self):
        with patch.object(launcher,'urlopen',side_effect=OSError):
            self.assertFalse(launcher.matches(8780))
    def test_linux_launcher(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(sys,'platform','linux'):
            path=Path(launcher.install_launcher(tmp));self.assertIn('Terminal=false',path.read_text());self.assertTrue(path.stat().st_mode & 0o100)
    def test_plist(self):
        self.assertIn(b'<true/>',launcher.plist_bytes({'KeepAlive':True}))

    def test_health_identity(self):
        expected={'ok':True,'root':str(launcher.ROOT.resolve()),'dataDir':str((launcher.ROOT/'.local').resolve())}
        for data, result in [(expected,True), ({**expected,'root':'/foreign'},False), ({**expected,'dataDir':None},False), ({'ok':True},False), ([],False)]:
            with patch.object(launcher,'urlopen',return_value=io.BytesIO(json.dumps(data).encode())):
                self.assertEqual(launcher.matches(8780),result)
