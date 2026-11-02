# Unified status / 统一状态

```json
{"agents":[{"id":"coder","name":"小橘","state":"working","task":"正在写代码","updatedAt":"2026-10-31T09:00:00Z","avatar":"cat-orange"}]}
```

States: `working`, `meeting`, `idle`, `need_you`, `offline`. Unknown string states become `idle`. Legacy `status`, `thinking`, `error` and optional `activity` remain accepted. `thinking` maps to working and `error` to need_you at the API boundary. The UI retains old thinking/error displays when pulling old files.

POST `/api/status` accepts one record, an array, or `{agents:[...]}`. It upserts by ID; missing IDs are retained, not removed. Batch validation is atomic. Duplicate IDs within a batch are rejected. Older timestamps never overwrite newer records. Omitted timestamps use server UTC time; timestamps must include a timezone and cannot be over 60 seconds in the future. ID/name/avatar limits are 100 characters; task 4000; maximum 500 agents and 1 MiB request. Responses are canonical `{agents,activity:[]}`. Invalid input is HTTP 400; oversized bodies 413; non-JSON 415; wrong credentials 401.

GET `/api/status` returns the effective states. After `--offline-after 300` seconds without an update a member becomes idle by default (`staleBecomes: "offline"` restores the old behavior); fresh pushes restore its state. Send heartbeats more frequently than the expiry. State and automatically discovered roster persist in .local/office.sqlite3. Only --demo uses in-memory examples. No remote services. Push errors do not mutate prior valid data.

Set server and client environment variable `CAT_OFFICE_TOKEN` for optional Bearer authentication on **both GET and POST**. Never put the value in app/config.json. When required, the browser shows “连接状态源”; the entered value stays in page memory and is sent only to the same origin. No permissive CORS. Local development HTTP is loopback-only; this is not a public multi-user server.

Pull mode: set `app/config.json.statusUrl` and `pollIntervalMs`. `offlineAfterMinutes` controls expiry of timestamped pull data (default 30). Legacy records without timestamps cannot be expired reliably; they retain their state. Pull failures preserve the last good data and visibly show the error. Server expiry uses staleBecomes and reports stale=true. Keep browser and server thresholds consistent; an explicit offline report is never silently turned idle.

Avatars: cat-grey, cat-white, cat-calico, cat-black, cat-orange. Other names use deterministic default cats. This controls 3D coat appearance, not a downloadable avatar URL.

名册、气泡队列、`staleBecomes` 与 `catctl init` 详见 [BUBBLES_ROSTER.md](BUBBLES_ROSTER.md)。默认自动发现新 ID 并持久化，无需预先加入名册。

## 本机实时推送 / Local SSE

默认 `/api/status` 模式通过 `GET /api/events` 长连接接收完整状态快照。POST 写入会唤醒连接，超时状态也会推送；每 10 秒心跳。只绑定 127.0.0.1，不需要公网。GET /api/events 与状态接口共用可选 Bearer 鉴权；浏览器使用 fetch 流以请求头传口令，不放入 URL。连接断开每秒重试；断开期间恢复轮询，连接正常时停止轮询。自定义拉取 URL 继续使用轮询。

Local `/api/events` emits `event: status` plus JSON `data`, including an initial snapshot, updates, and expiry changes. Heartbeats run every 10 seconds. Auth uses headers, not query parameters. The browser reconnects and polls only while the stream is unavailable; custom pull URLs remain polling-based.

**当前默认 / Current default:** 自动发现且持久化，不必配置名册。示例仅 --demo。原手工名册规则只用于 rosterMode=manual；详见 [ONBOARDING](ONBOARDING.md)。
