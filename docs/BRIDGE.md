# 一分钟让智能体动起来 / Agent event bridge

办公室不会偷读 Grok Bot、Codex 或 Claude 的聊天。让执行派工的程序在成功派工、召唤或会议开始时调用本地桥即可，无需点网页「分配」。打开办公室网页才能播放动画。

## 真实接入

1. 用启动器打开办公室；端口见 `.local/launcher.port`，设置 `CAT_OFFICE_URL=http://127.0.0.1:实际端口`。启用鉴权时设置 `CAT_OFFICE_TOKEN`。
2. 在 bot 的事件回调中运行 `python3 scripts/bridge.py`，向 stdin 写一行 JSON（也可传 JSON 文件路径）。程序可持续接收多行；每行成功输出服务端状态，失败退出非零。
3. `id` 使用平台稳定的事件 ID，重试沿用；独立事件使用新 ID。参与者 `id` 使用平台稳定的 bot ID，`name` 是可更改的中文显示名，不按名字猜身份，不用手改 roster JSON。

```json
{"type":"assign","id":"platform-run-123","from":{"id":"dispatcher","name":"大总管"},"to":[{"id":"writer","name":"写作助手"}],"task":"写初稿"}
```

`type` 支持 `assign / summon / chat / group`。`from` 和非空 `to` 都是带 id、可选 name 的对象。用户找 bot 时，不必创建人类猫：让该 bot 作为 from，协作 bot 作为 to；只有一个 bot 的普通问答用下方 status 上报，不制造多人会面。

- assign：from 派给 to，沿用现有领导识别规则。
- summon/chat/group：当前领导主持，from 和 to 中除领导外的人进经理室；没有领导时 from 主持。不会把每个说话的 bot 都提升为领导。
- 所有类型复用经理室约 5 秒会面，最多三名访客一批；不是新建自由聊天房间。只在会话开始时发一次，别每个 token 都发。
- 会后沿用既有语义：参与者 working、task 为会议主题。实际任务完成后调用状态上报。

```sh
python3 scripts/catctl.py set writer working '正在写初稿' --name '写作助手'
python3 scripts/catctl.py set writer idle '已交稿'
```

这些命令写入当前办公室。桥接可被本地 shell、Python subprocess、Node child_process 或 MCP 工具调用；HTTP 等价调用见 [ASSIGNMENTS](ASSIGNMENTS.md)。远程 Grok webhook 不能直接访问用户电脑的 localhost：需要已有本地 bot runner 接收事件后调用本桥，本项目不提供公网网关。失败由调用方记录并以相同事件 ID 重试；桥无独立消息队列，注册姓名与派工不是一个事务。不要把可视化失败当作真实任务失败。

## 安全 demo / Reproducible demo

```sh
python3 server/server.py --demo --port 8771
# 另一个终端；浏览器打开 http://127.0.0.1:8771/app/
CAT_OFFICE_URL=http://127.0.0.1:8771 python3 scripts/bridge.py examples/bridge-group.json
```

端口占用请换空闲端口，不停止已有服务。重复演示需更换事件 id。

自动化隔离 demo：`npm run test:bridge`。它启动随机空闲端口和临时数据库，通过真实桥 CLI 触发三猫会面，检查位置、5 秒停留、回工位和重试幂等，输出 `docs/bridge-qa.json` 和 `docs/shot_bridge_group.png`，不写真实名册。

## 可复制的短 skill

> 成功派工时发送 assign；多人会话开始时发送 group/chat/summon。使用稳定 bot ID 和独立事件 ID，显示名放 name。调用本仓库 scripts/bridge.py，JSON 经 stdin 输入，不拼接 shell 文本。读取退出码；失败记录并用相同事件 ID 重试。实际进度使用 catctl set。不得声称动画代表任务实际执行或完成。

English: Feed one JSON event per stdin line to `python3 scripts/bridge.py`. Stable agent IDs map directly to roster IDs; optional names are display labels. The bridge registers cats through existing APIs and reuses manager briefings. It requires explicit producer callbacks; it does not monitor chats. Use a local runner for remote platforms. Test with `npm run test:bridge` in an isolated temporary office.
