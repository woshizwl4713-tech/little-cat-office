#!/usr/bin/env python3
"""Consume Claude Code hook JSON on stdin; report without blocking agent work."""
import json, os, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts'))
from catctl import report

def event_status(event):
    kind=event.get('hook_event_name')
    if kind=='PreToolUse': return 'working','正在处理任务'
    if kind=='Stop': return 'idle','这一轮完成啦'
    if kind=='Notification':
        return ('need_you','需要你确认一下～') if event.get('notification_type') in ('permission_prompt','idle_prompt') else ('idle','有一条新消息')
    return None
if __name__=='__main__':
    try:
        event=json.load(sys.stdin); result=event_status(event)
        if result: report(*result,ident=os.environ.get('CAT_ID','claude'))
    except Exception: print('Office hook could not report status',file=sys.stderr)
