# Alt+C4 phase 1–2 handoff ledger

Original phase 1–2 scope: implement and review phases 1–2 on `ALTC4-jeff`, create separate local phase commits, stop before phase 3, and report detailed evidence. No push or deployment. The user's existing `.gitignore` change is unrelated and must remain outside these commits.

## November 18 maintenance checkpoint

- Current source confirms Phase 1 `7b298cf` and Phase 2 `9f611dc`; Phase 3 is
  unstarted. Original task statuses have not changed. Native/physical validation,
  teammate lobby adoption and provisional visual/default decisions remain open.
- Applied the project-local Ponytail guidance to a focused cleanup: share
  role-view selection, copy room state once per broadcast, derive the start gate
  from its blocked reason, remove unused client plumbing, and add short function
  and logic comments. Exported interfaces and game behavior are preserved.
- Corrected role-assignment copy, the stale planning handoff, and the distinction
  between implemented lobby messages and future contract fields/actions.
- Added [the maintenance and learning guide](maintenance-guide.md): source map,
  end-to-end action trace, findings, phase-by-phase file/dependency/check guidance,
  and a first puzzle-data exercise for the user. No next-phase code was added.
- Confirmed with a temporary real-browser probe: a valid saved session overrides
  another room's invite in the same tab. This remains documented for explicit
  leave/change-room policy in Phase 6; resume behavior was not changed here.
- Baseline and final `npm run altc4:verify` passed with local connection access
  and the cached Chromium executable supplied through
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`: both TypeScript checks, both production
  builds, CSS smoke, one host lifecycle test, CommonJS smoke, all 16 backend tests,
  static browser QA and live lobby QA. No test skips/cancellations were reported.
- The initial restricted verification stopped at network tests. Running a test
  directly exposed `listen EPERM` on loopback; rerunning with connection access
  passed. No product-code test failure remained in the final run.
- Reviewed the source diff, checked edited Markdown links and ran
  `git diff --check`. Existing `.gitignore` edits and untracked `.agents/` are
  outside the cleanup commit. No push or deployment is authorized.
- Next concrete action: the user sketches one Python panel and its private
  fixtures in a new `games/altc4/data/puzzles.ts`, following the guide. Review that
  attempt before implementing parsing/checking. Native Tauri, physical devices,
  LAN/HTTPS/WSS endpoints and gameplay remain unverified.

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

Phases 1–2 implementation and automated checks passed; coordinator reviewed the
contract, source diff, and rendered desktop/phone screenshots. Work stops before
Phase 3. User design
feedback, teammate lobby adoption, and physical/native rehearsal remain external
follow-ups; mockup styling is provisional. Original tasks T1–T8 remain unimplemented
at the Phase 1 checkpoint. T1 is now implemented and automatically verified; T3/T4
have functional role shells only. Native/physical sign-off remains pending. Only
the coordinator creates phase commits. See `phase1-2-report.md` for the final status.

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

## Phase 2 implementation checkpoint

- Phase 1 local commit: `7b298cf`. No push, branch creation, or deployment.
- Freebuff completed contract and network-test authoring; its CLI was closed.
  Saved project conversation: `2026-11-17T14-23-43.750Z` (local Freebuff resume ID).
- One lower-cost Codex worker owns the backend; the Phase 1 worker reuses its
  context for the live frontend and browser integration. A fresh stronger final
  review is reserved for the completed changes. No unmeasured cost savings claimed.
- Coordinator authored four additional adversarial tests and observed four RED
  failures before the backend exists: host cross-room forgery, resume-token
  rotation/takeover, readiness reset/stale-round rejection, changed-content reuse
  of a request ID. These supplement Freebuff's eight acceptance tests.
- Full round timer, puzzle validation, outcome logic, results/replay and recovery
  remain out of this run. Phase 2 must show real role shells rather than fake play.
- Independent `node --test tests/altc4/*.test.cjs` with loopback permission:
  **15/15 passed** (eight Freebuff network tests, four coordinator adversarial
  tests, three backend limits tests). No skipped or cancelled tests.
- Frontend review found `crypto.randomUUID()` would depend on secure-context
  browser support; a compatible request-ID path and a real browser regression
  with that API disabled were requested. Authentication tokens remain generated
  securely on the backend.

## Final review and verification

- Clean root `npm ci --no-audit --no-fund`: passed.
- Coordinator's final `altc4:verify`: passed after all review fixes. Includes both
  type checks and production builds, shared CSS assertions, one host lifecycle
  test, CommonJS smoke, **16 backend tests**, static browser QA and live browser QA.
- Live browser QA verified settings330s/4panels/Python, two complementary roles,
  readiness/start, capacity/unauthorized rejection, reload resume, revoked-token
  reset, and request-ID generation without `crypto.randomUUID`. Desktop1280×720
  and phone-width390×844 layouts fit without horizontal document overflow.
- Fresh Sol review: no critical finding. Fixed P2 unbound socket leakage with an
  absolute10s handshake deadline; its regression failed before the fix and then
  passed, including capacity recovery after rejected/active handshakes.
- Ruling: revise the initial unqualified request-id promise to the actual last128
  IDs/current-socket retry window. Supplied clients never auto-retry mutations
  across resume. Cost if misused: a custom client can reapply an old authorized
  config/ready mutation outside that scope. Reviewer agreed no ordinary supplied
  Phase2-client bug requires a runtime journal under this contract. Phase4 must
  add a round-scoped submission ledger before chance consumption.
- Fixed both review minors: initial host mockup routing (observed RED browser
  regression, corrected routing), and a rate-limit test that now uses repeated IDs.
- Explicitly deferred to Phase6: disconnected seat retirement, room retirement,
  abandonment, lost token-rotation replies and complete round recovery. Broader
  recovery work would exceed this stop point; users must create a new room after
  server restart. Puzzle privacy/checking, timers/outcomes/replay/editor persistence
  remain in their planned later phases. Native/physical/LAN/HTTPS rehearsal remains
  unverified and is not represented by browser contexts.
- Final report: `docs/altc4/phase1-2-report.md`. Phase3 was not started.
