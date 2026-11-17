# Alt+C4 phase 1–2 handoff ledger

Authorized scope: implement and review phases 1–2 on `ALTC4-jeff`, create separate local phase commits, stop before phase 3, and report detailed evidence. No push or deployment. The user's existing `.gitignore` change is unrelated and must remain outside these commits.

## Execution decisions

- The user explicitly authorized Freebuff to read/edit relevant CodeBox project files and transmit relevant contents to its service on November 17, 2026.
- Freebuff's synthetic trial succeeded on DeepSeek V4.1 Flash Slow. The CLI initially showed five daily hours and charges one hour per session for that option. The project session resumed the existing hourly allocation and showed four daily hours remaining. Exact Codex credit costs are not exposed here.
- Ruling: use one bounded Freebuff contract-writing task and one lower-cost Codex integration worker after Freebuff spent several minutes deliberating without file changes. This avoids repeated unproductive attempts; the tradeoff is additional Codex worker usage.
- Ruling: use root npm workspaces for host/player, one shared React runtime, game-specific UI modules, separate frontend checking and CommonJS server compilation. Keep existing unrelated JavaScript and menus.
- Visual details and gameplay defaults remain reviewable proposals. Phase 2 may use documented development defaults; no Phase 3 chance consumption or checker implementation is authorized in this run.

## Baseline

- Branch: `ALTC4-jeff`; only `.gitignore` modified before work.
- `npm run host:build`: passed before implementation (Vite 8.3.6).
- Native Tauri and physical host plus two browser-device checks require actual hardware/network rehearsal; automated browser contexts will be reported separately.

## Current checkpoint

Phase 1 technical checkpoint passed; coordinator reviewed the contract, source diff,
and rendered desktop/phone screenshots. Phase 2 implementation is next. User design
feedback, teammate lobby adoption, and physical/native rehearsal remain external
follow-ups; mockup styling is provisional. Original tasks T1–T8 remain unimplemented
at this checkpoint. Only the coordinator creates phase commits.

## Review and verification evidence

- Independent `npm run altc4:typecheck`: passed after dependencies installed.
- Freebuff's first contract required corrections for expiry ordering, content counts, contradictory grammar examples, private token delivery and handshake identity. Coordinator reviewed the revision and corrected remaining Python grammar and rotated-token response gaps.
- Freebuff authored eight Phase 2 network acceptance tests. Independent `node tests/altc4/lobby.network.test.cjs`: eight expected failures because `server/index.js` does not exist yet (RED). The isolated `node --test` launcher only reported a child-process failure in the restricted execution environment; direct execution exposed the actual assertions.
- Review finding for integration worker: restrict Vite development file access so future server-only puzzle material cannot be fetched through `/@fs`; prove shared Tailwind utility generation in both production builds.
- Independent full Phase 1 `altc4:verify` passed with the local cached Chromium
  override: frontend/server types, compiled server require, host/player production
  builds, shared Tailwind CSS assertions, one React lifecycle test, and browser QA
  for three roles at 390×844 and 1280×720 plus checking/paused displays.
- Browser review found tiny mobile code; corrected to at least 14px with internal
  code scrolling. The resulting grid overflow was fixed and regression checked.
  Coordinator inspected the recaptured mobile Programmer screenshot.
- `npm ls react react-dom`: one deduplicated React 19.3.1 runtime.
- Both Vite servers returned 403 for the server-only data path during worker
  browser inspection. Native Tauri and physical devices remain untested.
- Capacity ruling: no human developer-hours estimate was supplied. December 1 is
  retained as the target, not a new delivery guarantee. No requirements were dropped.
