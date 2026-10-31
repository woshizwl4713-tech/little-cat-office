# Little Cat Office

A local 3D office that turns agent status into cats working, walking, resting, and asking for your attention.

[中文](README.md) · [Quickstart](docs/QUICKSTART.md) · [Status specification](docs/STATUS_SPEC.md)

| Working | Needs you |
| --- | --- |
| ![Working cat](docs/sync-working.png) | ![Waiting at the manager office](docs/sync-need-you.png) |

## Five-minute setup

Python 3.10+ required. Node 18+ is needed for npm commands and tests, not for the Python server. No paid APIs, accounts, build step, or CDN.

```sh
npm install && npm start
# Without Node:
python3 server/server.py
```

Open http://127.0.0.1:8770/app/ . From another terminal in the checkout:

```sh
python3 scripts/catctl.py set coder working 'Writing code' --name Orange
python3 scripts/catctl.py set coder need_you 'Please review this' --name Orange
```

The UI polls every second. The cat walks to its destination. Send heartbeats during long tasks; five minutes without an update becomes offline. State is in memory; restart restores example agents.

## Features

Real Three.js geometry and articulated limbs; typing, walking, waving and resting; obstacle-aware routes; 360-degree orbit, tilt, zoom, pan and reset; day/evening/night lighting; greetings, yarn and temporary summons. Local human coworkers share task behavior. Their photo-derived colors, hairstyle and glasses are adjustable. This is a generic cartoon model, **not AI face reconstruction or guaranteed likeness**. Original photos are neither uploaded nor stored. Appearance settings persist in origin-scoped browser storage.

## Connect your bot

[HTTP webhook](adapters/generic-webhook/README.md), [Codex instructions](adapters/codex/README.md), [Claude Code hooks](adapters/claude-code/README.md), [MCP](adapters/mcp/README.md), [Python](adapters/python/README.md), [Node](adapters/node/README.md).

This is not an official Grok Bot plugin and does not automatically inspect agents. Your bot reports its own status. Attention bubbles do not approve tasks. Adapter README files distinguish protocol/integration testing from unverified host installation.

## Configuration

Runtime: `app/config.json`; template: `app/config.example.json`. `brand` changes branding, `statusUrl` defaults to `/api/status`, `pollIntervalMs` to 1000 and `offlineAfterMinutes` to 5. Legacy JSON pull sources remain compatible. Cross-origin sources require their own CORS policy; the bundled server does not permit cross-origin writes.

Server: `--port 9000`, `--offline-after 300` (seconds). Clients use `CAT_OFFICE_URL`, `CAT_ID`, `CAT_NAME`. Optional `CAT_OFFICE_TOKEN` authenticates both GET and POST. The browser asks for it and keeps it only in page memory. Never commit actual credentials.

## Tests

```sh
npm test
npx playwright install chromium
# With npm start running in another terminal:
npm run test:browser
```

Use OFFICE_URL for a different server, CHROME_PATH for an installed browser. CI runs unit, HTTP, adapter and browser tests. No node_modules are shipped.

## FAQ

**Why offline?** No update for five minutes. Tool-start/end events are not continuous heartbeats.

**Port unavailable?** Choose another port and update CAT_OFFICE_URL for clients.

**Public hosting?** The included loopback server is for local personal use. See [SECURITY](SECURITY.md).

**Photo likeness?** Only approximate color extraction and adjustable cartoon features are currently implemented; automatic identity reconstruction is not.

**Paid calls?** None. All runtime assets are bundled and photo processing stays local.

## License

MIT. See [LICENSE](LICENSE), [NOTICE](NOTICE.md), [ASSETS](ASSETS.md). Three.js retains its original MIT license.

一团小伦子 · 深圳市有点东西文艺创作有限公司
