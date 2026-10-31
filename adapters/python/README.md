# Python SDK

From repository root:
```python
from adapters.python.office import report
report("working")
report("need_you", "需要你确认", ident="coder", name="小橘")
```
Set CAT_ID/CAT_NAME, CAT_OFFICE_URL, and optional CAT_OFFICE_TOKEN in the environment. No dependencies. Keep this module inside the repository (it imports scripts/catctl.py). Errors propagate to the caller; decide whether to log or retry. Do not retry non-idempotent work based on a reporting failure. Tested against the local HTTP server.
