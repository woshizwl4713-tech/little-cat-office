# Unified status / 统一状态

```json
{"agents":[{"id":"coder","name":"小橘","state":"working","task":"正在写代码","updatedAt":"2026-10-31T09:00:00Z","avatar":"cat-orange"}]}
```

States: `working`, `meeting`, `idle`, `need_you`, `offline`. Unknown string states become `idle`. Legacy `status`, `thinking`, `error` and optional `activity` remain accepted. `thinking` maps to working and `error` to need_you at the API boundary. The UI retains old thinking/error displays when pulling old files.

POST `/api/status` accepts one record, an array, or `{agents:[...]}`. It upserts by ID; missing IDs are retained, not removed. Batch validation is atomic. Duplicate IDs within a batch are rejected. Older timestamps never overwrite newer records. Omitted timestamps use server UTC time; timestamps must include a timezone and cannot be over 60 seconds in the future. ID/name/avatar limits are 100 characters; task 4000; maximum 500 agents and 1 MiB request. Responses are canonical `{agents,activity:[]}`. Invalid input is HTTP 400; oversized bodies 413; non-JSON 415; wrong credentials 401.

GET `/api/status` returns the effective states. After `--offline-after 300` seconds without an update a member becomes offline; fresh pushes restore its state. Send heartbeats more frequently than the expiry. State is held in memory and resets to `examples/status.json` on restart. No database, no remote services. Push errors do not mutate prior valid data.

Set server and client environment variable `CAT_OFFICE_TOKEN` for optional Bearer authentication on **both GET and POST**. Never put the value in app/config.json. When required, the browser shows “连接状态源”; the entered value stays in page memory and is sent only to the same origin. No permissive CORS. Local development HTTP is loopback-only; this is not a public multi-user server.

Pull mode: set `app/config.json.statusUrl` and `pollIntervalMs`. `offlineAfterMinutes` controls expiry of timestamped pull data (default 5). Legacy records without timestamps cannot be expired reliably; they retain their state. Pull failures preserve the last good data and visibly show the error. API expiry is authoritative; keep browser and server thresholds consistent.

Avatars: cat-grey, cat-white, cat-calico, cat-black, cat-orange. Other names use deterministic default cats. This controls 3D coat appearance, not a downloadable avatar URL.
