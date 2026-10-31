# 5 分钟接入 / Five-minute setup

Python 3.10+ required. Node 18+ is optional for running the app, required for Node SDK/tests.

```sh
npm install && npm start
# Without Node:
python3 server/server.py
```
Open http://127.0.0.1:8770/app/ . In another terminal, from repository root:

```sh
python3 scripts/catctl.py set coder working '写代码中' --name 小橘
python3 scripts/catctl.py set coder need_you '看我看我！需要审批！' --name 小橘
python3 scripts/catctl.py get
```

The cat updates within the default one-second poll, then walks to its destination. Reuse the same ID for updates; send `name` consistently (CLI defaults to ID). See [status format](STATUS_SPEC.md). Send an update at least every five minutes or the cat goes offline. `CAT_OFFICE_URL` overrides the CLI/SDK URL. For a different port: `python3 server/server.py --port 9000` and set the client URL accordingly.

Optional authentication: set `CAT_OFFICE_TOKEN` in the server and adapter environment to the same private value. Do not commit it. The browser will ask for it. No credentials are needed for the default loopback demo.

Choose [webhook](../adapters/generic-webhook/README.md), [Codex](../adapters/codex/README.md), [Claude Code](../adapters/claude-code/README.md), [MCP](../adapters/mcp/README.md), [Python](../adapters/python/README.md), or [Node](../adapters/node/README.md). These report states; they do not silently inspect other agents or approve tasks. A visible need_you bubble is not an approval action.

## 验证边界 / Verification scope

Local tests exercise HTTP, CLI, SDKs, hook event payloads, MCP stdio and browser flows. CI is configured to run the same checks; this local-only preparation did not create a remote repository or run GitHub Actions.
