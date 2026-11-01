# 气泡、名册和闲置 / Bubbles, roster and idle

头顶姓名为约原尺寸 70% 的小胶囊，锚点跟随真实头部坐标（包括坐姿、跳跃与睡姿）。普通气泡在状态/任务变化时排队弹出，显示 3 秒、450ms 淡出；之后随机 20–40 秒再次排队，同屏普通气泡最多 3 个。等待审批或错误气泡常驻并有红色感叹号，不占普通额度。文字约 12 字截断；悬停模型或姓名显示完整状态，点击显示完整详情。

Name pills track the animated head. Ordinary bubbles have a FIFO queue capped at three, hold three seconds and fade over 450ms. They recur at random 20–40 second intervals. Attention bubbles remain visible and are exempt from the cap. Hover a model/label or click a cat for full text.

## 名册 / Roster

```json
{"agents":[{"id":"coder","name":"小橘","avatar":"cat-orange"}],"staleBecomes":"idle","offlineAfterMinutes":5}
```

可选高级用法：在 app/config.json 设置 rosterMode=manual 并配置 agents。配置手工名册时，名册决定哪些 bot 显示（空数组表示没有名册 bot），源里多余 ID 不显示；姓名和头像以名册为准。增删改名或换头像后刷新页面。删除 agents 字段则恢复按状态源动态发现成员。通过网页添加的人类伙伴仍作为独立本地成员显示。

In rosterMode=manual, the configured roster is authoritative, including an empty array. Unknown source IDs are ignored. Roster names/avatars override report metadata. Refresh after editing the config. Omit agents for source-discovered membership. Local human coworkers remain independent.

未上报过的名册成员显示在自己的工位，等待任务，不冒充正在处理实际任务。收到第一条报告后按状态行动。已上报但超时默认变 idle，溜达、睡觉或玩耍；不再循环显示离线文案。显式上报 offline 仍然离线。

Unreported members sit at their desks without claiming real work. Reported members become idle after expiry and follow leisure behaviors. Explicit offline reports stay offline.

staleBecomes 可选 idle（默认）或 offline。浏览器的 offlineAfterMinutes 默认 5；服务端默认读取同一配置，命令行 --offline-after 可覆盖超时秒数。修改服务端配置后重启服务。没有 updatedAt 的旧拉取数据无法判断超时。报告定期更新可恢复工作。

## catctl init

```sh
python3 scripts/catctl.py init
python3 scripts/catctl.py init --from examples/roster.example.json
python3 scripts/catctl.py init --from examples/roster.example.json --config app/config.json
```

读取并校验名册后原子写入配置，保留 brand/statusUrl 等其他字段，替换 agents 数组。重复 ID、缺失名字/头像、坏 JSON 不覆盖已有配置。命令不调用网络。默认配置位置是脚本所在仓库的 app/config.json；--from 相对当前目录。

Init validates then atomically writes the roster, preserving unrelated config fields. Invalid data leaves the previous file intact. It does not call the network.

## 本机实时推送 / Local SSE

默认 `/api/status` 模式通过 `GET /api/events` 长连接接收完整状态快照。POST 写入会唤醒连接，超时状态也会推送；每 10 秒心跳。只绑定 127.0.0.1，不需要公网。GET /api/events 与状态接口共用可选 Bearer 鉴权；浏览器使用 fetch 流以请求头传口令，不放入 URL。连接断开每秒重试；断开期间恢复轮询，连接正常时停止轮询。自定义拉取 URL 继续使用轮询。

Local `/api/events` emits `event: status` plus JSON `data`, including an initial snapshot, updates, and expiry changes. Heartbeats run every 10 seconds. Auth uses headers, not query parameters. The browser reconnects and polls only while the stream is unavailable; custom pull URLs remain polling-based.

**当前默认 / Current default:** 自动发现且持久化，不必配置名册。示例仅 --demo。原手工名册规则只用于 rosterMode=manual；详见 [ONBOARDING](ONBOARDING.md)。
