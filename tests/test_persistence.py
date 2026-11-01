import importlib.util,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('durable_status',ROOT/'server/status.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class PersistenceTests(unittest.TestCase):
 def test_discover_restart_edit_delete(self):
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/'office.sqlite3';s=m.Store(path=path);self.assertEqual(s.snapshot()['agents'],[])
   s.push({'id':'first','state':'need_you','task':'review'});r=s.snapshot()['agents'][0];self.assertTrue(r['avatar'].startswith('cat-'))
   restored=m.Store(path=path);self.assertEqual(restored.snapshot(),s.snapshot());restored.edit({'id':'first','name':'小伙伴','avatar':'cat-white'})
   restored.push({'id':'first','name':'overwritten?','state':'working'});self.assertEqual(restored.snapshot()['agents'][0]['name'],'小伙伴');self.assertEqual(restored.snapshot()['agents'][0]['avatar'],'cat-white')
   fresh=m.Store(path=path);self.assertEqual(fresh.snapshot(),restored.snapshot());fresh.edit({'id':'first','action':'delete'});self.assertEqual(m.Store(path=path).snapshot()['agents'],[])
 def test_disk_failure_does_not_publish_and_expiry_does_not_erase(self):
  with tempfile.TemporaryDirectory() as d:
   now=[100000];path=Path(d)/'office.sqlite3';s=m.Store(path=path,clock=lambda:now[0]);s.push({'id':'one','state':'working'})
   with patch.object(s,'persist',side_effect=OSError('disk unavailable')):
    with self.assertRaises(OSError):s.push({'id':'two','state':'working'})
   self.assertEqual(len(s.snapshot()['agents']),1);now[0]+=400;fresh=m.Store(path=path,clock=lambda:now[0]);self.assertEqual(fresh.snapshot()['agents'][0]['state'],'idle');self.assertEqual(fresh.records['one']['state'],'working')
 def test_bad_file_never_silently_resets(self):
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/'office.sqlite3';path.write_bytes(b'not sqlite')
   with self.assertRaises(Exception):m.Store(path=path)
   self.assertEqual(path.read_bytes(),b'not sqlite')

 def test_two_instances_preserve_each_others_updates(self):
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/'office.sqlite3';one=m.Store(path=path);two=m.Store(path=path)
   one.push({'id':'a','state':'working'});two.push({'id':'b','state':'idle'});one.edit({'id':'b','name':'B'})
   self.assertEqual({a['id'] for a in two.snapshot()['agents']},{'a','b'});self.assertEqual(two.snapshot()['agents'][1]['name'],'B')
