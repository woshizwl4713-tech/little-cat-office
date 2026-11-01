import importlib.util,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('assignment_status',ROOT/'server/status.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class AssignmentTests(unittest.TestCase):
 def test_auto_leader_and_explicit_correction(self):
  s=m.Store(auto_lead=True);s.push({'id':'first','state':'working'});self.assertEqual(s.records['first']['role'],'lead')
  s.push({'id':'actual-primary','isPrimary':True});self.assertEqual(s.records['actual-primary']['role'],'lead');self.assertEqual(s.records['first']['role'],'employee')
  with self.assertRaises(ValueError):s.push({'id':'third','role':'lead'})
 def test_repeat_assignments_queue_dedupe_and_restart(self):
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/'office.sqlite3';s=m.Store(path=path,auto_lead=True);s.push({'id':'main'})
   for event in ['one','two','two']:s.assign({'id':event,'agentId':'worker','task':'同一个任务'})
   self.assertEqual(len(s.snapshot()['assignments']),2);self.assertIn('worker',s.records)
   restored=m.Store(path=path,auto_lead=True);self.assertEqual(len(restored.snapshot()['assignments']),2)
   restored.assign({'id':'one','action':'complete'});restored.assign({'id':'one','agentId':'worker','task':'同一个任务'});self.assertEqual(restored.snapshot()['assignments'][0]['status'],'completed')
   with self.assertRaises(ValueError):restored.assign({'id':'one','agentId':'worker','task':'不同任务'})
   restored.edit({'id':'worker','action':'delete'});self.assertEqual(restored.snapshot()['assignments'][1]['status'],'cancelled')
 def test_status_metadata_emits_one_event_not_heartbeats(self):
  s=m.Store(auto_lead=True);s.push({'id':'main'})
  payload={'id':'worker','state':'working','task':'写初稿','assignmentId':'run-1','assignedBy':'main'}
  s.push(payload);s.push(payload);s.push({'id':'worker','state':'working','task':'继续写'})
  self.assertEqual(len(s.snapshot()['assignments']),1)

 def test_dispatch_three_and_priority(self):
  s=m.Store(auto_lead=True);s.push({'id':'first'})
  state=s.dispatch({'id':'batch','from':'dispatcher','to':['a','b','c'],'task':'一起整理'})
  self.assertEqual(s.records['dispatcher']['role'],'lead');self.assertEqual(s.records['first']['role'],'employee');self.assertEqual(len(state['assignments']),3)
  self.assertEqual(len({e['groupId'] for e in state['assignments']}),1)
  s.dispatch({'id':'batch','from':'dispatcher','to':['a','b','c'],'task':'一起整理'});self.assertEqual(len(s.assignments),3)
  s.assign({'action':'complete','ids':[e['id'] for e in s.assignments]});self.assertTrue(all(s.records[x]['state']=='working' and s.records[x]['task']=='一起整理' for x in ['a','b','c']))
  s.edit({'id':'dispatcher','role':'lead'});s.dispatch({'from':'other-sender','to':['a'],'task':'下个任务'});self.assertEqual(s.records['dispatcher']['role'],'lead');self.assertEqual(s.assignments[-1]['leaderId'],'dispatcher')

 def test_manual_roster_can_replace_automatic_dispatch_leader(self):
  s=m.Store(auto_lead=True);s.dispatch({'from':'auto','to':['staff'],'task':'准备'})
  s.push({'id':'chosen','role':'lead'});self.assertEqual(s.records['chosen']['role'],'lead');self.assertEqual(s.records['auto']['role'],'employee')
  s=m.Store(auto_lead=True);s.push({'id':'first'});s.push({'id':'staff'});s.edit({'id':'staff','role':'lead'});self.assertEqual(s.records['staff']['role'],'lead');self.assertEqual(s.records['first']['role'],'employee')
