# Generic webhook
From any process with access to the local machine:
```sh
curl --fail http://127.0.0.1:8770/api/status -H 'Content-Type: application/json' \
  -d '{"id":"coder","name":"小橘","state":"working","task":"正在写代码"}'
curl --fail http://127.0.0.1:8770/api/status -H 'Content-Type: application/json' \
  -d '{"agents":[{"id":"coder","name":"小橘","state":"need_you","task":"看我看我！需要审批！"}]}'
curl --fail http://127.0.0.1:8770/api/status
```
If authentication is enabled add `-H "Authorization: Bearer $CAT_OFFICE_TOKEN"` to all requests. Keep the value in your environment. Remote webhooks cannot reach loopback; use your own local adapter, not a public bind of this development server. The same POST path is covered by HTTP integration tests.
