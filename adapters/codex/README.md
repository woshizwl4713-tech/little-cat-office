# Codex adapter: explicit instruction-driven reporting

> **Demo only:** Never send example cats to the default port 8770: it persists them in the real roster.
> Start an isolated server in another terminal: `python3 server/server.py --demo --port 8771`.
> Before running any examples below, run `export CAT_OFFICE_URL=http://127.0.0.1:8771` in the client terminal (and pass this environment to hooks/MCP).


Add the following to the target project's AGENTS.md, replacing `OFFICE_REPO` with the actual checkout path. This is an instruction convention, **not automatic global event interception or a tested Codex hooks API**.

> At task start, run `python3 "$OFFICE_REPO/scripts/catctl.py" set coder working "正在处理任务"`. Before asking for human confirmation, report `need_you`. After completing the turn, report `idle`. On long tasks send periodic working updates before the configured timeout (30 minutes by default). If reporting fails, report the failure without blocking the user's actual task. Never include credentials, full prompts, or confidential content in status text.

Set `CAT_ID`, `CAT_NAME`, `CAT_OFFICE_URL`, and optional `CAT_OFFICE_TOKEN` in the calling environment. Commands and HTTP behavior are integration-tested; installation into a real Codex session is user-controlled and not claimed as verified here. The same shell commands work without hooks.

派工时另行上报 `/api/assign`，以 `from`、`to`、`task` 表达实际任务关系。请在真实派工成功时调用一次，重试复用派工 id；普通工作进度不要重复派工。详见 [ASSIGNMENTS](../../docs/ASSIGNMENTS.md)。
