# Node SDK (Node 18+)

```js
import { report } from './adapters/node/index.mjs';
await report('working');
await report('need_you', '需要你确认', {id:'coder', name:'小橘'});
```
CAT_ID/CAT_NAME, CAT_OFFICE_URL, optional CAT_OFFICE_TOKEN are read from the environment. Requests time out after five seconds and non-2xx results throw. Tested against the local HTTP server. No dependencies.

派工时另行上报 `/api/assign`，以 `from`、`to`、`task` 表达实际任务关系。请在真实派工成功时调用一次，重试复用派工 id；普通工作进度不要重复派工。详见 [ASSIGNMENTS](../../docs/ASSIGNMENTS.md)。
