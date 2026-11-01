import importlib.util,json,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('catctl',ROOT/'scripts/catctl.py');cli=importlib.util.module_from_spec(spec);spec.loader.exec_module(cli)
spec=importlib.util.spec_from_file_location('status_module',ROOT/'server/status.py');status=importlib.util.module_from_spec(spec);spec.loader.exec_module(status)
class RosterTests(unittest.TestCase):
 def test_init_preserves_config_and_rejects_invalid_before_write(self):
  with tempfile.TemporaryDirectory() as temp:
   target=Path(temp)/'config.json';target.write_text(json.dumps({'brand':{'title':'Office'},'statusUrl':'/custom'}))
   result=cli.init_roster(ROOT/'examples/roster.example.json',target);data=json.loads(target.read_text());self.assertEqual(result['agents'],4);self.assertEqual(data['statusUrl'],'/custom');self.assertEqual(data['brand']['title'],'Office');self.assertEqual(data['staleBecomes'],'idle')
   original=target.read_bytes();bad=Path(temp)/'bad.json';bad.write_text('{"agents":[{"id":"x"}]}')
   with self.assertRaises(ValueError):cli.init_roster(bad,target)
   self.assertEqual(target.read_bytes(),original)
 def test_offline_option_and_explicit_offline(self):
  now=[1000];s=status.Store(5,lambda:now[0],stale_becomes='offline');s.push({'id':'a','state':'working'});now[0]+=6;self.assertEqual(s.snapshot()['agents'][0]['state'],'offline')
  s=status.Store(5,lambda:now[0]);s.push({'id':'a','state':'offline'});now[0]+=6;self.assertEqual(s.snapshot()['agents'][0]['state'],'offline')
