# Alt+C4 Phase 1 build integration and mockups

Status: Phase 1 integration record. Its three screens are mockups with fixed sample data; Phase 2 now adds the live lobby and private role shells. See [lobby.md](lobby.md) for current client behavior and verification.

## Frontend boundary

- `apps/host` keeps the existing Vite/Tauri menu. `apps/host/scripts/altc4-host-adapter.js` mounts one React root alongside the menu. `mountAltC4Host` returns a React unmount callback; the live launcher opens the host lobby, and `?mockup=1` opens its static preview.
- `apps/player` is a separate Vite entry at port 5174. Live join is the default; `?mockup=1&role=spec-holder` or `?mockup=1&role=programmer` selects a static preview with a role switcher.
- `games/altc4/ui/MockupApp.tsx` and `mockup.css` are shared presentation. Views: host workbench/bomb, Spec Holder field manual, and Programmer repair console. The screen includes explicit `MOCKUP · SAMPLE DATA · NO LIVE GAME STATE` and `CONTROLS DO NOT SUBMIT` labels. Ready, checking, and paused are display states only.
- The Programmer code is illustrative read-only Java. It shows one sample off-by-one bug (`i < items.size() - 1`); the spec and checklist stay on the Spec Holder view.
- The visual direction uses warm workshop paper, dark green ink, orange repair accents, crisp rectangular controls, mono labels, and a CSS-drawn bomb. Code and instruction copy use responsive layout rules at 800px and 460px. Programmer code text stays at least 14px and scrolls horizontally inside its panel when needed; mobile paragraph copy is at least 14px.

## Build and runtime decisions

- Root npm workspaces are `apps/host` and `apps/player`. React and React DOM are declared once at the root; both Vite configs set `resolve.dedupe` for those modules. The generated lock resolves one shared React runtime (React 19.3.1).
- The root `package-lock.json` now owns installs. The stale `apps/host/package-lock.json` was removed. Use Node 24 LTS; the observed environment was Node 24.19.0 with npm 11.17.0. `@playwright/test` is included for bounded layout smoke checks using the already cached Chromium build.
- `tsconfig.frontend.json` type-checks TSX without emitting. `tsconfig.server.json` compiles the Alt+C4 server spike with `rootDir: "."` into `dist-server/`; Node16 module rules emit CommonJS because the root package is CommonJS. `scripts/altc4-server-smoke.cjs` requires that output.
- Each app's Tailwind input explicitly scans `games/altc4/ui`. The shared `tracking-widest` utility is used by that source; `scripts/altc4-build-css-smoke.cjs` asserts the utility and shared mockup CSS exist in both production bundles.
- Both Vite servers explicitly allow only the app directory, `games/altc4/ui`, and root `node_modules`. Browser checks confirmed a request for `games/altc4/data/.gitkeep` returns 403 in both host and player.

## Verification

The Phase 1 baseline checks ran from the repository root:

```sh
npm ci
npm run altc4:verify
```

`altc4:verify` now also builds and starts the Phase 2 backend and checks the live lobby in separate browser contexts. `altc4:test` names only `apps/host/scripts/altc4-host-entry.test.tsx`; it does not collect the separate backend network tests. Install Playwright's browser on a fresh machine with `npx playwright install chromium`. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can point to an existing Chromium executable; the source does not include a machine-specific path.

Observed on Node 24.19.0:

- `npm install --no-audit --no-fund` completed and generated the root lockfile.
- `npm run altc4:typecheck` passed.
- `npm run altc4:server:build` passed; the resulting JavaScript loaded through the CommonJS smoke script.
- `npm run host:build` and `npm run player:build` passed.
- `npm run altc4:test` passed: 1 file, 1 test. It opens the host mockup, returns to the existing menu, unmounts, and mounts again.
- Production CSS assertions found the shared Tailwind utility and `.altc4-shell` in both apps.
- Phase 1 browser QA used `http://localhost:5173/` for the desktop host and `http://localhost:5174/?mockup=1&role=spec-holder` for the static player entry. The host menu remained in place; opening the mockup hid it, and Return to Menu restored it. The player selector switched to Programmer; the checking preview displayed its waiting feedback and running-clock note. Desktop screenshots were inspected at 1280×720.
- `npm run altc4:browser:qa` passed with the cached Chromium executable supplied through `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. It captured each of the three ready mockups at 390×844 and 1280×720, checked both sizes for horizontal document overflow, and checked checking/paused state labels for all three roles at 1280×720. At 390px it also asserted that all paragraph copy and the Programmer code are at least 14px. State screenshots were also captured for the Programmer checking and paused views. Artifacts are in `artifacts/altc4/` (`host-mobile.png`, `host-desktop.png`, `spec-holder-mobile.png`, `spec-holder-desktop.png`, `programmer-mobile.png`, `programmer-desktop.png`, `checking-programmer-desktop.png`, and `paused-programmer-desktop.png`).
- These exact probes returned 403 `Restricted` from their respective Vite servers: `http://localhost:5173/@fs/home/jeff/Documents/CodeBox/games/altc4/data/.gitkeep` and `http://localhost:5174/@fs/home/jeff/Documents/CodeBox/games/altc4/data/.gitkeep`. The response named only the app root, shared UI directory, and root `node_modules` as allowed paths.
- Interactive CUA inspection used host port 5173 and player port 5174; those exec sessions (47704 and 64430) were stopped with Ctrl+C after inspection. The repeatable Playwright script starts the player Vite CLI directly on port 5174 and terminates that child process on exit.

## Limits and handoff

- Native Tauri was not launched; this integration proof uses the host's Vite browser surface only. The Playwright checks cover layout and static preview states, not touch-device usability or a real gameplay session.
- The host adapter is mounted beside the existing menu and exposes `Open Alt+C4 host lobby`. The mockup remains selectable through the `?mockup=1` preview route.
- `apps/host/dist`, `apps/player/dist`, and `dist-server` are generated build output. Remove them after local checks; they are not source deliverables.
- No CodeMirror package or editor integration is included. The mockup's disabled check control and fixed clock/chances do not implement a game.
- This document records the Phase 1 static mockup test and does not verify the full game loop. Phase 2's lobby verification is recorded in [lobby.md](lobby.md).
