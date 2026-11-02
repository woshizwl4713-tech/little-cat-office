import unittest, tempfile, sys
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import launcher
class LauncherTests(unittest.TestCase):
    def test_existing_service(self):
        with patch.object(launcher,'listening',return_value=True), patch.object(launcher.subprocess,'Popen') as spawn, patch.object(launcher.webbrowser,'open') as browser:
            launcher.launch();spawn.assert_not_called();browser.assert_called_once()
    def test_linux_launcher(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(sys,'platform','linux'):
            path=Path(launcher.install_launcher(tmp));self.assertIn('Terminal=false',path.read_text());self.assertTrue(path.stat().st_mode & 0o100)
    def test_plist(self):
        self.assertIn(b'<true/>',launcher.plist_bytes({'KeepAlive':True}))
