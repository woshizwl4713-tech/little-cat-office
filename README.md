# 小猫办公室 · Little Cat Office

把智能体的工作、休息和待确认状态，变成一间可以走动的 3D 小猫办公室。

[English](README.en.md) · [5 分钟接入](docs/QUICKSTART.md) · [状态格式](docs/STATUS_SPEC.md)

## 三步开始

需要 Python 3.10+、Node 18+（无 Node 可直接运行 Python 服务）。

1. **安装**：在下载的仓库目录执行 `npm install`。
2. **启动**：执行 `npm start`，打开 http://127.0.0.1:8770/app/ 。
3. **贴给智能体**：打开空办公室引导卡，点“复制完整说明”，贴进你的 AGENTS.md 或发给智能体；也可一键复制 Codex、Claude Code、WorkBuddy 示例。

可以直接把这句话贴给智能体：

> 请将状态上报给本机小猫办公室 http://127.0.0.1:8770/api/status。用固定 id 标识自己，开始任务时 POST JSON {"id":"my-agent","name":"我的智能体","state":"working","task":"在做什么"}，完成时 idle，需要我确认时 need_you。长任务每 60 秒更新一次，不上报敏感内容。第一次上报会自动创建猫和工位，无需配置名册。

也可在本仓库终端试用：

```sh
python3 scripts/catctl.py set my-agent working '正在处理任务'
```

首次启动是空办公室。真实名册、网页改名/头像和最后状态保存在 `.local/office.sqlite3`，重启保留；不要删除该目录。超时仍按默认 30 分钟转 idle，但原始最后状态保留在数据库中。演示用 `npm start -- --demo`，示例猫只在独立内存模式出现，不污染真实数据。运行不需要 Node 时用 `python3 server/server.py`。

| 工作中 | 需要你审批 |
| --- | --- |
| ![工作中的小橘](docs/sync-working.png) | ![门口等待的小橘](docs/sync-need-you.png) |

## 功能

- 真正的 Three.js 立体猫咪、独立四肢动作、走路寻路、打字、挥手和休息。
- 360° 拖动旋转、俯仰、滚轮缩放、平移切换和复位；日/昏/夜光照。
- 点猫打招呼、送毛线球、召唤聊天，临时互动结束后返回任务。
- 本地卡通人类伙伴：照片取色、手动发型/眼镜/颜色、共享行为逻辑、可绑定 bot ID。**不是 AI 人脸重建，不保证本人相似度**；原照片不存储不上传，设置保存在当前浏览器来源。
- 拉取自有 JSON 或通过 HTTP、CLI、SDK、MCP 推送状态。

## 怎么接自己的 bot

| 方式 | 入口 |
| --- | --- |
| HTTP/curl | [generic-webhook](adapters/generic-webhook/README.md) |
| Codex 调用约定 | [Codex](adapters/codex/README.md) |
| Claude Code 事件脚本 | [Claude Code](adapters/claude-code/README.md) |
| MCP set_status | [MCP](adapters/mcp/README.md) |
| Python / Node SDK | [Python](adapters/python/README.md) / [Node](adapters/node/README.md) |

本项目不是 Grok Bot 官方插件，也不会自动读取所有智能体。需要你的 bot 主动上报。审批气泡只表示待处理，不执行批准操作。各适配器的实际验证范围见其 README。

## 配置

`app/config.example.json` 是示例，运行时读取 `app/config.json`。`brand` 控制品牌文案；`statusUrl` 默认 `/api/status`；`pollIntervalMs` 默认 1000；`offlineAfterMinutes` 默认 30。也可设置自有状态文件 URL，保留旧格式兼容。跨域源需自行设置 CORS，内置服务不开放跨域写入。

服务端参数：`--port 9000`、`--offline-after 300`（秒）。CLI/SDK 用 `CAT_OFFICE_URL`、`CAT_ID`、`CAT_NAME`。可选 `CAT_OFFICE_TOKEN` 开启 GET/POST 鉴权；浏览器通过“连接状态源”输入，只在页面内存保留。勿把真实凭据放进配置或仓库。

## 开发与测试

```sh
npm test
npx playwright install chromium
# 启动 npm start 后，在另一个终端：
npm run test:browser
```

`OFFICE_URL` 可以选择测试服务地址；`CHROME_PATH` 可以选择已有 Chromium/Chrome。CI 使用 Ubuntu、Python、Node 和 Playwright，运行相同测试并保留浏览器截图。运行不需要 node_modules；它只供开发测试，未纳入仓库。

## FAQ

**为什么变离线？** 30 分钟未收到更新默认转闲置。长任务应发送心跳；仅有任务开始和结束事件不能保证中途在线。

**为什么打不开？** 检查 Python 版本和端口占用。更换端口后同步修改 CLI 的 CAT_OFFICE_URL。

**能放到公网吗？** 内置服务仅供本机个人使用，不是多用户生产服务。见 [安全说明](SECURITY.md)。

**会收费或上传朋友照片吗？** 本仓库没有收费调用；本地照片仅用于近似取色，不会上传。

**免费就能得到精确真人分身吗？** 不能。目前是可调参数的通用卡通 3D 人。

## 许可与致谢

MIT，见 [LICENSE](LICENSE)。素材来源与分发边界见 [ASSETS.md](ASSETS.md)、[NOTICE.md](NOTICE.md)。Three.js 保留其原始 MIT 声明。

一团小伦子 · 深圳市有点东西文艺创作有限公司

## 名册与气泡 / Roster and bubbles

See [BUBBLES_ROSTER](docs/BUBBLES_ROSTER.md) for roster editing, unreported desk seats, the three-bubble queue, full hover text, and `staleBecomes` (default `idle`). Initialize with `python3 scripts/catctl.py init --from examples/roster.example.json`. Default rosterMode is auto; manual config rosters remain available with rosterMode=manual.

![24 cats, compact head labels](docs/shot_bubbles.png)

本机 SSE 已支持：`GET /api/events`，无需公网；断线重连及轮询兜底。See [status specification](docs/STATUS_SPEC.md).

网页“员工名册”可直接改名、换头像和删除。删除后若同一智能体继续上报，会自动重新加入。见 [开箱即用与持久化](docs/ONBOARDING.md)。

## 行为与领导 / Behavior and leader

[工位动作、80% 在岗调度、专属领导猫](docs/BEHAVIOR_LEADER.md)。可在网页名册设置唯一 role=lead；测试统计见 docs/behavior-qa.json。

## 自动主 CEO 与派工 / Auto CEO and assignments

明确指定的领导优先，其次按派工 from 自动识别；尚无派工时第一位上报成员暂任领导。使用 `POST /api/assign {from,to:[...],task}` 或 `catctl assign`，接收者会去经理室开约 5 秒短会后回工位。[接入与示例](docs/ASSIGNMENTS.md)。

## Desktop launcher / 桌面启动

Install Python 3 and Node.js, then run `npm install` and `python3 scripts/catctl.py install-launcher`. 双击桌面的「小猫办公室」即可后台启动并打开浏览器。Logs: `.local/server.log`.

Optional: `python3 scripts/catctl.py autostart on`; disable with `autostart off`. macOS uses launchd KeepAlive; Linux uses systemd --user (logs in journalctl --user); Windows uses a Startup folder supervisor checking every 5 seconds. Windows off removes next-login startup; the current supervisor ends at logout. Keep the checkout in place; reinstall the launcher after moving it. Linux may require marking the desktop file trusted.

> **写入警告 / Writes to the active roster:** 示例 curl 和 `catctl set` 会写入当前运行的办公室名册。演示请启动 `python3 server/server.py --demo --port 8771` 或 `python3 server/server.py --data-dir /tmp/cat-office-demo --port 8771`，并将示例 URL / `CAT_OFFICE_URL` 指向该端口。Examples modify the running office roster; use a demo or temporary data directory and point all clients at its port. 误写可通过名册 UI 或 `POST /api/roster`，请求体 `{"id":"example-id","action":"delete"}` 删除。Delete accidental entries using the roster UI or that API.
