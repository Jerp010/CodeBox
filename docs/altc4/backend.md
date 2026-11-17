# Alt+C4 Phase 2 backend

`server/index.js` exports `createServer(options?)`, which returns an unlistened Node HTTP server. Running the file directly listens on `PORT` (default `3000`). The server exposes `/health`, serves files from `apps/player/dist`, and accepts WebSocket clients at `/ws`.

The TypeScript room registry is `games/altc4/server/lobby.ts`; `npm run altc4:server:build` compiles it to `dist-server/`, which is generated output. Rooms and credentials are in memory and are lost when the process exits. The registry caps live rooms at 500 by default; the server caps active WebSockets at 200. Unauthenticated sockets have an absolute 10-second handshake deadline; any valid create, join, or resume clears it. `createServer` accepts validated `handshakeTimeoutMs` and `maxConnections` options for tests. Each socket keeps a 128-response idempotency cache, accepts at most 10 messages per second, and frames are limited to 32 KiB. Resume tokens are 32-byte random secrets and rotate on successful resume. Public state and role shells never include tokens.

Handshake messages are `create_room {displayName}`, `join {joinCode,displayName}`, and `resume {resumeToken}` with an empty `roomId` and `roundNo: 0`. Bound requests use the room id and current round number from the socket session. Lobby changes use `set_config` with direct partial config fields, `set_ready {ready}`, and `start_round {}`. Configuration is host-only; readiness belongs to each participant. Starting requires a connected host and two connected, ready players. A start increments the round number once and moves the room to `inRound`; Phase 2 does not implement the game loop.

For local use, the public join URL follows the listening address when the server starts. Set `ALTC4_BACKEND_BASE_URL` to the externally reachable HTTP(S) origin for a LAN/demo deployment, for example `http://192.168.1.20:3000`; use the same host and port that player browsers can reach. HTTPS origins produce HTTPS join links, and the client should convert that origin to WSS for its socket connection. `PORT` selects the listen port when running the backend directly.

The private `roleView` is a short role shell that says puzzles are not implemented yet. This phase does not implement answer checking, puzzles, timers, outcomes, replay, round recovery, or persisted rooms. The desktop and two player devices have not been tested as a physical-device setup.

The response cache protects only the most recent 128 request IDs on one socket.
Clients must not retry a mutation after reconnect or after it leaves that window;
they resume current state and decide a new action with a fresh ID. The supplied
client never automatically retransmits mutations. Round-scoped submission
deduplication is a separate Phase 4 requirement before chance consumption exists.

## Checks run

- `npm run altc4:server:build` — passed.
- `node tests/altc4/lobby.network.test.cjs` — 8 passed. This required permission to bind an ephemeral loopback port; the restricted invocation was denied by the environment.
- `node tests/altc4/lobby.adversarial.test.cjs` — 4 passed with the same loopback permission.
- `node tests/altc4/backend.limits.test.cjs` — 4 passed, covering strict handshake fields, a repeated-ID rate limit, oversized frames, and unbound socket expiry/capacity recovery.
- The new lifecycle regression first failed because an unauthenticated socket stayed open past the 1-second test bound; after the fix it passed with the 240 ms test deadline, including a rejected resume that did not extend the deadline.
- `git diff --check` — passed.
