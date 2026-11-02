# MCP stdio adapter

> **Demo only:** Never send example cats to the default port 8770: it persists them in the real roster.
> Start an isolated server in another terminal: `python3 server/server.py --demo --port 8771`.
> Before running any examples below, run `export CAT_OFFICE_URL=http://127.0.0.1:8771` in the client terminal (and pass this environment to hooks/MCP).


Start `python3 adapters/mcp/server.py` from any directory. Configure a stdio MCP client with command `python3`, args `[/absolute/path/to/little-cat-office/adapters/mcp/server.py]`, and the same optional authentication environment as the office.

Tool: `set_status({"id":"coder","state":"need_you","task":"需要确认"})`.

The server implements initialize (protocol 2024-11-05), initialized notification, ping, tools/list and tools/call over newline-delimited JSON-RPC. Stdout contains protocol messages only; no HTTP MCP transport or resources/prompts. Tool failures return isError. Unit/integration tests exercise an actual child process and the HTTP status service. Cursor, Claude and WorkBuddy compatibility is a target, not a claim of live validation in all clients. Clients must support stdio and this protocol version.

派工时另行上报 `/api/assign`，以 `from`、`to`、`task` 表达实际任务关系。请在真实派工成功时调用一次，重试复用派工 id；普通工作进度不要重复派工。详见 [ASSIGNMENTS](../../docs/ASSIGNMENTS.md)。
