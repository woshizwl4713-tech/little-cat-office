# Node SDK (Node 18+)

```js
import { report } from './adapters/node/index.mjs';
await report('working');
await report('need_you', '需要你确认', {id:'coder', name:'小橘'});
```
CAT_ID/CAT_NAME, CAT_OFFICE_URL, optional CAT_OFFICE_TOKEN are read from the environment. Requests time out after five seconds and non-2xx results throw. Tested against the local HTTP server. No dependencies.
