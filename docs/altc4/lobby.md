# Alt+C4 Phase 2 lobby and client

Phase 2 adds a working room lobby, private role assignment, and a limited post-start role shell. It does not implement puzzle data, answer checks, a timer, pause, results, replay, or recovery of an active round. The mockups remain available separately with `?mockup=1`.

## Run locally

Use Node.js 24 and install from the repository root:

```sh
npm ci
npm run altc4:build
npm run altc4:server:start
```

The server listens at `http://localhost:3000` by default and serves the player join page at `/`. In another terminal, run `npm run host:dev`; open the printed Vite URL and select **Open Alt+C4 host lobby**. Enter a display name and the backend URL, then create a room. Open the displayed join link on two browser tabs or devices and submit a display name. Players receive one `Spec Holder` and one `Programmer` role from the server. The host can set one language, duration (120–900 seconds, 30-second increments), and panel count (2–5), then start once both players have joined and marked ready.

For a LAN demo, set `ALTC4_BACKEND_BASE_URL` to the server's reachable HTTP origin and bind the server to a reachable interface. For example:

```sh
PORT=3000 ALTC4_BACKEND_BASE_URL=http://192.168.1.20:3000 npm run altc4:server:start
```

Enter `http://192.168.1.20:3000` in the host endpoint field. Use the same host and port on the player devices. The client maps HTTP to WebSocket and HTTPS to secure WebSocket at `/ws`. On a fresh machine, install Playwright's browser with `npx playwright install chromium` before running browser QA.

## Client boundary

- `games/altc4/ui/lobbyProtocol.ts` defines the public envelope, lobby state, role view, and tab-scoped session types. The live browser client is in `lobbyClient.ts`; live lobby screens are in `LobbyScreens.tsx`.
- The host and both players connect to `server/index.js` at `/ws`. The HTTP server serves the built player app from `apps/player/dist`, and `/health` returns a health response.
- The host creates a room. Player pages accept a join code from `?code=...` and show editable name/code fields before joining. Room creation and join replies privately return the resume token. The client keeps that credential in `sessionStorage` for the current tab, rotates it on a successful resume, and reconnects to restore the participant identity. A definitive invalid-token response clears the old room and role state.
- Role assignment, permissions, config, ready state, and start eligibility come from the server. Live player screens do not expose the preview role switch. The host's config is synchronized to both player screens.
- The lobby defaults are provisional development values. They can be updated through the contract review; the client currently accepts the three languages `java`, `cpp`, and `python`.

The server implementation and operational limits are documented in [backend.md](backend.md). Wire shapes are in [contracts.md](contracts.md), especially its Phase 2 handshake and lobby sections.

## Verification

`npm run altc4:verify` runs type checks, both frontend builds, CSS and host lifecycle checks, server smoke and backend network/adversarial/limit tests, static mockup browser QA, and the live multi-context lobby flow. The live browser flow starts an ephemeral backend and host preview; it checks the host config sliders/language and join URL, both readiness actions, unique private player roles, start, a full-room rejection, an unauthenticated control rejection, resume after reload, and invalidated-token reset. It captures host and player role screenshots at 390×844 and 1280×720 and checks for horizontal document overflow. It also runs one player with `crypto.randomUUID` disabled to exercise the request-ID fallback used by plain HTTP LAN pages.

QA screenshots are written under the ignored `artifacts/altc4/` directory. The scripted browser run uses Chromium; it does not establish physical-device or native Tauri behavior.
