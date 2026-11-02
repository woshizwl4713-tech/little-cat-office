# Claude Code hooks

> **Demo only:** Never send example cats to the default port 8770: it persists them in the real roster.
> Start an isolated server in another terminal: `python3 server/server.py --demo --port 8771`.
> Before running any examples below, run `export CAT_OFFICE_URL=http://127.0.0.1:8771` in the client terminal (and pass this environment to hooks/MCP).


`hook.py` reads one hook event JSON from stdin. PreToolUse → working, Stop → idle, Notification with permission_prompt/idle_prompt → need_you. Other notifications → idle. It does not print tool input or private message contents. Reporting failures do not block the host.

In the target project's hook settings, use an absolute path to this checkout:
```json
{"hooks":{"PreToolUse":[{"matcher":".*","hooks":[{"type":"command","command":"python3 /path/to/little-cat-office/adapters/claude-code/hook.py"}]}],"Stop":[{"hooks":[{"type":"command","command":"python3 /path/to/little-cat-office/adapters/claude-code/hook.py"}]}],"Notification":[{"matcher":"permission_prompt|idle_prompt","hooks":[{"type":"command","command":"python3 /path/to/little-cat-office/adapters/claude-code/hook.py"}]}]}}
```
Set `CAT_ID` to a unique agent ID. Test payloads for these events are covered by integration tests. This repository does not install hooks or claim a live Claude Code session was tested. Check hook configuration against your installed host version. Tool events are not heartbeats: a long tool run without events may expire offline.

派工时另行上报 `/api/assign`，以 `from`、`to`、`task` 表达实际任务关系。请在真实派工成功时调用一次，重试复用派工 id；普通工作进度不要重复派工。详见 [ASSIGNMENTS](../../docs/ASSIGNMENTS.md)。
