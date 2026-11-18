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

## Alt+C4 documentation

The [Alt+C4 project guide](docs/altc4/README.md) contains the current task status,
source map, contracts, setup, verification history and remaining phase roadmap.
Start with the [Phase 3 specification](docs/altc4/README.md#phase-3-specification)
for T6 Server-Side Checking, or [run the current lobby](docs/altc4/README.md#run-and-verify).
