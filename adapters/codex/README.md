# Codex adapter: explicit instruction-driven reporting

Add the following to the target project's AGENTS.md, replacing `OFFICE_REPO` with the actual checkout path. This is an instruction convention, **not automatic global event interception or a tested Codex hooks API**.

> At task start, run `python3 "$OFFICE_REPO/scripts/catctl.py" set coder working "正在处理任务"`. Before asking for human confirmation, report `need_you`. After completing the turn, report `idle`. On long tasks send periodic working updates before the five-minute expiry. If reporting fails, report the failure without blocking the user's actual task. Never include credentials, full prompts, or confidential content in status text.

Set `CAT_ID`, `CAT_NAME`, `CAT_OFFICE_URL`, and optional `CAT_OFFICE_TOKEN` in the calling environment. Commands and HTTP behavior are integration-tested; installation into a real Codex session is user-controlled and not claimed as verified here. The same shell commands work without hooks.
