# Claude Code hooks

`hook.py` reads one hook event JSON from stdin. PreToolUse → working, Stop → idle, Notification with permission_prompt/idle_prompt → need_you. Other notifications → idle. It does not print tool input or private message contents. Reporting failures do not block the host.

In the target project's hook settings, use an absolute path to this checkout:
```json
{"hooks":{"PreToolUse":[{"matcher":".*","hooks":[{"type":"command","command":"python3 /path/to/little-cat-office/adapters/claude-code/hook.py"}]}],"Stop":[{"hooks":[{"type":"command","command":"python3 /path/to/little-cat-office/adapters/claude-code/hook.py"}]}],"Notification":[{"matcher":"permission_prompt|idle_prompt","hooks":[{"type":"command","command":"python3 /path/to/little-cat-office/adapters/claude-code/hook.py"}]}]}}
```
Set `CAT_ID` to a unique agent ID. Test payloads for these events are covered by integration tests. This repository does not install hooks or claim a live Claude Code session was tested. Check hook configuration against your installed host version. Tool events are not heartbeats: a long tool run without events may expire offline.
