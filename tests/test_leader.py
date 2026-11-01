import importlib.util,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('leader_status',ROOT/'server/status.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class LeaderTests(unittest.TestCase):
 def test_unique_leader_is_atomic_and_persistent(self):
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/'state.sqlite3';s=m.Store(path=path);s.push({'id':'boss','role':'lead','state':'working'})
   with self.assertRaises(ValueError):s.push([{'id':'other','role':'lead'},{'id':'staff'}])
   self.assertEqual(len(s.snapshot()['agents']),1);s.push({'id':'boss','state':'idle'});self.assertEqual(s.snapshot()['agents'][0]['role'],'lead')
   s.push({'id':'staff','state':'working'})
   with self.assertRaises(ValueError):s.edit({'id':'staff','role':'lead'})
   s.edit({'id':'boss','role':'employee'});s.edit({'id':'staff','role':'lead'});self.assertEqual(sum(a['role']=='lead' for a in m.Store(path=path).snapshot()['agents']),1)

 def test_invalid_second_leader_in_roster_is_rejected(self):
  s=m.Store();s.push({'agents':[{'id':'one','role':'lead'},{'id':'two'}]})
  with self.assertRaises(ValueError):s.edit({'id':'two','role':'lead'})
  self.assertEqual(s.snapshot()['agents'][1]['role'],'employee')
