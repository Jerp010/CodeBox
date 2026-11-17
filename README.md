# CodeBox

CodeBox is a multiplayer programming game in development for a school demonstration. The Tauri desktop app hosts a room; players connect from separate browser devices.

## Current status

Alt+C4 now has a small shared Node/WebSocket backend, a replaceable host lobby, and player join screens. The server creates rooms, assigns private player roles, synchronizes host configuration and player readiness, starts a room, and lets a browser tab resume its participant identity. Rooms and resume tokens are held in memory and disappear when the server stops.

The host shows a limited role shell after start. Alt+C4 does not yet include puzzles, a timer, answer checking, chances, outcomes, pause/reconnect recovery, or replay. CodeBlock and TypeByte remain prototypes; empty game folders do not indicate implemented features.

## Requirements and install

Use Node.js 24 LTS and npm. Install from the repository root so the checked-in root lockfile installs both app workspaces:

```bash
npm ci
```

## Run the Alt+C4 lobby locally

Build the host/player frontends and start the shared backend:

```bash
npm run altc4:build
npm run altc4:server:start
```

The backend listens on `http://localhost:3000` by default and serves the player app at `/`. In another terminal, start the desktop host frontend:

```bash
npm run host:dev
```

Open the Vite URL it prints, select **Open Alt+C4 host lobby**, and create a room. The host endpoint field starts at `http://localhost:3000` for the local setup. The server displays a six-character room code and join link. Both players open the link or `http://localhost:3000/?code=ROOMCODE`, enter display names, and mark themselves ready. The host can change duration, panel count, and language, then start when both players are connected and ready.

For a LAN demo, set `PORT` and `ALTC4_BACKEND_BASE_URL` to an address reachable by the player devices before starting the server. For example:

```bash
PORT=3000 ALTC4_BACKEND_BASE_URL=http://192.168.1.20:3000 npm run altc4:server:start
```

Use the demo host's actual reachable address in the host endpoint field. Player pages connect to the backend that served the page. HTTPS player origins automatically use WSS for the WebSocket connection; the host endpoint field accepts HTTP or HTTPS.

To run the host in the Tauri desktop shell, install the platform prerequisites for Tauri and Rust, build the frontends, start the backend separately, then run:

```bash
cd apps/host
npx tauri dev
```

The native Tauri host has not yet been rehearsed with two physical player devices.

## Mockup previews

The Phase 1 static mockups remain separate from the live lobby:

- Player mockups: `http://localhost:3000/?mockup=1&role=host`, `?mockup=1&role=spec-holder`, or `?mockup=1&role=programmer`.
- Host mockup: add `?mockup=1` to the host Vite URL.

They show sample artwork and checking/paused states. The controls do not run a game.

## Build and verification

```bash
npm run altc4:build
npm run altc4:verify
```

`altc4:verify` type-checks frontend and server code, builds both frontends and the CommonJS server module, checks Tailwind source inclusion, runs host lifecycle, server smoke, and backend network/adversarial/limit checks, then exercises the live lobby in isolated browser contexts. Playwright uses its installed Chromium; install it on a fresh machine with `npx playwright install chromium`.

The endpoint serves only the built player app and `/health`; WebSocket messages use `/ws`. The Phase 2 implementation boundary, message contract, operational limits, and current verification notes are in [docs/altc4/backend.md](docs/altc4/backend.md) and [docs/altc4/contracts.md](docs/altc4/contracts.md).
