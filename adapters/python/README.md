# Python SDK

> **Demo only:** Never send example cats to the default port 8770: it persists them in the real roster.
> Start an isolated server in another terminal: `python3 server/server.py --demo --port 8771`.
> Before running any examples below, run `export CAT_OFFICE_URL=http://127.0.0.1:8771` in the client terminal (and pass this environment to hooks/MCP).


From repository root:
```python
from adapters.python.office import report
report("working")
report("need_you", "需要你确认", ident="coder", name="小橘")
```
Set CAT_ID/CAT_NAME, CAT_OFFICE_URL, and optional CAT_OFFICE_TOKEN in the environment. No dependencies. Keep this module inside the repository (it imports scripts/catctl.py). Errors propagate to the caller; decide whether to log or retry. Do not retry non-idempotent work based on a reporting failure. Tested against the local HTTP server.

派工时另行上报 `/api/assign`，以 `from`、`to`、`task` 表达实际任务关系。请在真实派工成功时调用一次，重试复用派工 id；普通工作进度不要重复派工。详见 [ASSIGNMENTS](../../docs/ASSIGNMENTS.md)。
