import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import bridge

class BridgeTests(unittest.TestCase):
    def test_chat_keeps_manager_and_includes_speaker(self):
        event = {'type':'chat','id':'chat-1','task':'Review','from':{'id':'a'},'to':[{'id':'b'}]}
        with patch.object(bridge.catctl, 'request', side_effect=[{'agents':[{'id':'boss','role':'lead'},{'id':'a'},{'id':'b'}]}, {}]) as request:
            bridge.forward(event)
            self.assertEqual(request.call_args.args[0], {'from':'boss','to':['a','b'],'task':'Review','id':'chat-1'})

    def test_invalid_event_has_no_writes(self):
        with patch.object(bridge.catctl, 'request') as request:
            for event in ({}, {'type':'chat','from':{'id':'a'},'to':[{'id':'a'}]}):
                with self.assertRaises(ValueError): bridge.forward(event)
            request.assert_not_called()

    def test_assign_uses_dispatcher(self):
        event = {'type':'assign','id':'dispatch-1','task':'Write','from':{'id':'a'},'to':[{'id':'b'}]}
        with patch.object(bridge.catctl, 'request', side_effect=[{'agents':[{'id':'boss','role':'lead'},{'id':'a'},{'id':'b'}]}, {}]) as request:
            bridge.forward(event)
            self.assertEqual(request.call_args.args[0]['from'], 'a')
