# 开箱即用 / Onboarding

默认不需要名册配置。任何 CLI、HTTP、SDK、MCP 或 hook 首次上报的新 ID 自动创建猫和工位，写入服务器名册。状态与网页改名/头像保存到仓库私有 `.local/office.sqlite3`，Git 忽略该目录，HTTP 静态文件白名单不对外提供它。

Default mode auto-discovers every new reported ID. The roster, last reports and UI display overrides are stored in a private SQLite database, excluded from Git and HTTP static serving.

- 默认无示例成员。`--demo` 独立内存运行 examples/status.json，不读写真实数据库。
- `--data-dir PATH` 可指定自己的私有数据目录；备份时复制 SQLite 文件（建议先停止服务）。数据库坏了不会悄悄清空，写入失败会返回 503 并保留旧数据。
- SQLite 事务原子提交。同一数据目录的多个服务实例会读取彼此更新，不覆盖已存在的其他成员。
- 重启保留 updatedAt 与原始最后状态，不伪造新心跳。超过配置时间的状态仍按 staleBecomes 展示 idle/offline；这不是丢数据。
- 网页“员工名册”可改名、换头像或删除，改名与头像不会被后续 agent 上报覆盖。删除后同一 ID 再上报会重新加入。
- GET /api/roster 返回名册和状态。POST /api/roster 接受 `{id,name,avatar}` 或 `{id,action:"delete"}`，与状态推送共用鉴权、大小限制和 Origin 检查；通过 SSE 同步页面。
- 手工名册仅为可选高级模式：设置 rosterMode=manual，或 catctl init。默认 rosterMode=auto 忽略旧配置 agents 限制，自动接纳新 ID。
- 网页上的 Codex / Claude Code / WorkBuddy 按钮只复制可执行指令，不自动修改宿主设置、不声称安装了宿主插件。命令使用当前浏览器的 localhost 端口；开启鉴权时使用 CAT_OFFICE_TOKEN 环境变量，真实口令不放入剪贴板说明。
- 浏览器本地添加的人类伙伴依旧使用原有 localStorage；本轮 SQLite 保存服务器发现的 bot 成员，不上传用户照片。

运行 `node tests/onboard-browser.mjs` 可复现全新数据目录、CLI 首次上报、网页改名/换头像、杀掉并重启服务器、删除持久化及 demo 隔离。测试目录自动清理，不使用真实成员。
