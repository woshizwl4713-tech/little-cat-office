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

The cat updates through local SSE, then walks to its destination. Reuse the same ID for updates; send `name` consistently (CLI defaults to ID). See [status format](STATUS_SPEC.md). Send an update at least every five minutes or the cat becomes idle. `CAT_OFFICE_URL` overrides the CLI/SDK URL. For a different port: `python3 server/server.py --port 9000` and set the client URL accordingly.

Optional authentication: set `CAT_OFFICE_TOKEN` in the server and adapter environment to the same private value. Do not commit it. The browser will ask for it. No credentials are needed for the default loopback server.

Choose [webhook](../adapters/generic-webhook/README.md), [Codex](../adapters/codex/README.md), [Claude Code](../adapters/claude-code/README.md), [MCP](../adapters/mcp/README.md), [Python](../adapters/python/README.md), or [Node](../adapters/node/README.md). These report states; they do not silently inspect other agents or approve tasks. A visible need_you bubble is not an approval action.

## 验证边界 / Verification scope

Local tests exercise HTTP, CLI, SDKs, hook event payloads, MCP stdio and browser flows. CI is configured to run the same checks; this local-only preparation did not create a remote repository or run GitHub Actions.

名册、气泡队列、`staleBecomes` 与 `catctl init` 详见 [BUBBLES_ROSTER.md](BUBBLES_ROSTER.md)。默认自动发现新 ID 并持久化，无需预先加入名册。

## 本机实时推送 / Local SSE

默认 `/api/status` 模式通过 `GET /api/events` 长连接接收完整状态快照。POST 写入会唤醒连接，超时状态也会推送；每 10 秒心跳。只绑定 127.0.0.1，不需要公网。GET /api/events 与状态接口共用可选 Bearer 鉴权；浏览器使用 fetch 流以请求头传口令，不放入 URL。连接断开每秒重试；断开期间恢复轮询，连接正常时停止轮询。自定义拉取 URL 继续使用轮询。

Local `/api/events` emits `event: status` plus JSON `data`, including an initial snapshot, updates, and expiry changes. Heartbeats run every 10 seconds. Auth uses headers, not query parameters. The browser reconnects and polls only while the stream is unavailable; custom pull URLs remain polling-based.

**当前默认 / Current default:** 自动发现且持久化，不必配置名册。示例仅 --demo。原手工名册规则只用于 rosterMode=manual；详见 [ONBOARDING](ONBOARDING.md)。

## Desktop launcher / 桌面启动

Install Python 3 and Node.js, then run `npm install` and `python3 scripts/catctl.py install-launcher`. 双击桌面的「小猫办公室」即可后台启动并打开浏览器。Logs: `.local/server.log`.

Optional: `python3 scripts/catctl.py autostart on`; disable with `autostart off`. macOS uses launchd KeepAlive; Linux uses systemd --user (logs in journalctl --user); Windows uses a Startup folder supervisor checking every 5 seconds. Windows off removes next-login startup; the current supervisor ends at logout. Keep the checkout in place; reinstall the launcher after moving it. Linux may require marking the desktop file trusted.

> **写入警告 / Writes to the active roster:** 示例 curl 和 `catctl set` 会写入当前运行的办公室名册。演示请启动 `python3 server/server.py --demo --port 8771` 或 `python3 server/server.py --data-dir /tmp/cat-office-demo --port 8771`，并将示例 URL / `CAT_OFFICE_URL` 指向该端口。Examples modify the running office roster; use a demo or temporary data directory and point all clients at its port. 误写可通过名册 UI 或 `POST /api/roster`，请求体 `{"id":"example-id","action":"delete"}` 删除。Delete accidental entries using the roster UI or that API.
