# Generic webhook

> **Demo only:** Never send example cats to the default port 8770: it persists them in the real roster.
> Start an isolated server in another terminal: `python3 server/server.py --demo --port 8771`.
> Before running any examples below, run `export CAT_OFFICE_URL=http://127.0.0.1:8771` in the client terminal (and pass this environment to hooks/MCP).

From any process with access to the local machine:
```sh
curl --fail http://127.0.0.1:8771/api/status -H 'Content-Type: application/json' \
  -d '{"id":"coder","name":"小橘","state":"working","task":"正在写代码"}'
curl --fail http://127.0.0.1:8771/api/status -H 'Content-Type: application/json' \
  -d '{"agents":[{"id":"coder","name":"小橘","state":"need_you","task":"看我看我！需要审批！"}]}'
curl --fail http://127.0.0.1:8771/api/status
```
If authentication is enabled add `-H "Authorization: Bearer $CAT_OFFICE_TOKEN"` to all requests. Keep the value in your environment. Remote webhooks cannot reach loopback; use your own local adapter, not a public bind of this development server. The same POST path is covered by HTTP integration tests.

派工时另行上报 `/api/assign`，以 `from`、`to`、`task` 表达实际任务关系。请在真实派工成功时调用一次，重试复用派工 id；普通工作进度不要重复派工。详见 [ASSIGNMENTS](../../docs/ASSIGNMENTS.md)。
