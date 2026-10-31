# MCP stdio adapter

Start `python3 adapters/mcp/server.py` from any directory. Configure a stdio MCP client with command `python3`, args `[/absolute/path/to/little-cat-office/adapters/mcp/server.py]`, and the same optional authentication environment as the office.

Tool: `set_status({"id":"coder","state":"need_you","task":"需要确认"})`.

The server implements initialize (protocol 2024-11-05), initialized notification, ping, tools/list and tools/call over newline-delimited JSON-RPC. Stdout contains protocol messages only; no HTTP MCP transport or resources/prompts. Tool failures return isError. Unit/integration tests exercise an actual child process and the HTTP status service. Cursor, Claude and WorkBuddy compatibility is a target, not a claim of live validation in all clients. Clients must support stdio and this protocol version.
