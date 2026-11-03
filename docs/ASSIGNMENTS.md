# 自动主 CEO 与派工会面

默认领导识别优先级：

1. 网页名册/配置/明确 role=lead 的领导优先。
2. 没有明确领导时，最近发出派工的 from 成为领导，替换默认领导。
3. 尚无派工时，第一次上报的成员暂任领导（autoLeader 默认 true）。这是一条默认规则，不是通过名字猜身份。

本机状态和领导选择存入私有数据库，刷新/重启不丢失。派工者尚未上报时，派工接口也可自动创建它和接收者。

## HTTP

```sh
curl -fsS http://127.0.0.1:8770/api/assign \
  -H 'Content-Type: application/json' \
  -d '{"from":"main","to":["writer","designer","reviewer"],"task":"整理本周资料","id":"dispatch-001"}'
```

必填 from、to（唯一 ID 数组）、task。id 可选：未提供时每次请求生成新派工；提供时同 ID、同内容重试不重复触发，改变内容则拒绝。两次独立派工即使任务相同，也必须使用不同 ID。鉴权启用时添加 Authorization Bearer 请求头。

一次三位接收者同时到经理室的访客椅。CEO 留在经理桌后，等到齐后开约 5 秒短会，再各自回工位；回到工位后保存 working 与此次 task。超过三位按每组三位排队会面。派工期间暂停参与者的休闲调度，避免抢位置。紧急 need_you/offline 成员可让会面等待。

接口仅记录和可视化派工，不替代真实 agent 的执行工具。把调用放到你现有派工脚本的成功分配环节；只上报 /api/status 或写任务文字，不能可靠判断谁派给谁，不会自行制造会面事件。

## CLI

```sh
python3 scripts/catctl.py assign writer,designer,reviewer '整理本周资料' --from main --event-id dispatch-001
```

不传 --from 时使用当前已识别领导；首次调用且没有成员时须提供 --from。CAT_OFFICE_URL 和可选 CAT_OFFICE_TOKEN 与状态上报相同。

## SDK / MCP

Python：`from adapters.python.office import assign`，调用 `assign('main', ['writer'], '写初稿', event_id='run-1')`。

Node：`import {assign} from './adapters/node/index.mjs'`，调用 `await assign('main', ['writer'], '写初稿', {id:'run-1'})`。

MCP 增加 assign_task 工具，参数与 /api/assign 相同。该工具只可视化任务分配，不执行真实 agent 工作。

旧单成员 /api/assignments 和状态上报中的 assignmentId/assignedBy 仍兼容。新接入请使用 /api/assign。

## 持久化与恢复

派工队列、完成标记与名册在同一 SQLite 事务提交。最多保留最近 1000 条成员会面记录，最多 200 条待办；超过队列容量会拒绝，不静默丢弃。幂等识别限保留记录范围。重复心跳不重演已完成会面。页面关闭期间待办保留，重新打开后继续；完成回执只是动画结束，不是替用户批准工作成果。更换/删除领导或删除接收者会取消不再有效的待办。

测试：`npm run test:assignments`。证据：docs/group-assign-qa.json、docs/assignments-qa.json、docs/shot_assign_three.png。

## 自动事件桥 / Automatic event bridge

Grok Bot、Codex、Claude 与本地 runner 可通过 JSON 事件自动触发派工、召唤和群聊会面，无需点击分配。见 [一分钟接入与隔离 demo](BRIDGE.md)。
