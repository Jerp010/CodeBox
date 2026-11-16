# Alt+C4 phased implementation plan

> **For agentic workers:** Use `superpowers:executing-plans`, when available, to implement this plan phase by phase in the current checkout. Steps use checkbox syntax. The user explicitly requires phase commits on the existing branch; preserve that execution constraint.

**Goal:** Deliver a tested, readable, pixel-art Alt+C4 game with a replaceable development lobby and a clear commit/task checkpoint after every phase.

**Architecture:** A shared backend owns room identity, role permissions, round state, timing, submission evaluation, and reconnection. The Tauri host and two private browser views consume role-filtered state. The placeholder lobby and another programmer's final lobby share one integration contract.

**Tech stack:** Tailwind CSS 4 is confirmed. Recommend React + TypeScript + Vite for new Alt+C4 interfaces, CodeMirror 6, and a TypeScript game-rules module compiled for the existing Node 24 LTS/Express/ws integration. Preserve existing JavaScript outside the minimum adapters. Use typed rule tests and Playwright browser flows. Puzzle languages remain Java, C++, and Python. See the [scoped stack recommendation and final planning audit](../specs/2026-11-16-altc4-stack.md); Phase 1 verifies the integration and records exact choices.

**Spec:** [Confirmed brief](../specs/2026-11-16-altc4-brief.md).

## Global constraints

- Deadline: December 1, 2026. Reserve November 29-30 for integration/rehearsal as a proposed target; confirm capacity before promising intermediate dates.
- Work on `ALTC4-jeff`. No new branch/worktree, push, merge, or deployment is included in the phase-commit instruction.
- The game was unimplemented at the initial planning checkpoint. Recheck branch and working-tree state before implementation and every commit; preserve unrelated changes.
- The desktop is separate from the two player devices and owns configuration/game start. Do not turn it into a player role.
- The selected theme is playful retro bomb workshop in pixel art. Detailed visual treatments need review.
- Use Tailwind CSS for Alt+C4 styling. The recommended React/TypeScript game frontend mounts into the existing host through an adapter; the other programmer's final lobby remains independent of its framework.
- Another programmer owns the finished lobby. Our placeholder uses real room/configuration/game-start behavior and an explicit replacement boundary.
- Three selectable puzzle languages, constrained editing, multiple panels, continuous time during checking, three chances, disconnect pause/reconnection, results, and lobby replay are required.
- Chat deferral is a recommendation pending a decision. Configurable panel count and active-panel highlighting are desired enhancements; distinguish them from required multi-panel play and the shared host bomb view.
- Follow the confirmed brief's privacy, readability, and scope rules. No unrelated CodeBlock/TypeByte implementation or broad architecture rewrite.
- This is a phase roadmap. Phase 1 must lock exact interfaces, defaults, affected files, and verification commands before the corresponding product code is written. Proposed modules below are not existing implementations.

## Review focus

1. Duplicate or late submissions must not consume extra chances or overturn a terminal outcome. Pin these tests to Phase 4.
2. Pauses, pending checks, and reconnection must preserve time and state consistently. Define ordering in Phase 1; test it in Phases 4 and 6.
3. Wrong-role actions, role-filtered messages, and cross-room requests must not reveal private material or mutate another room. Test the boundary in Phases 2-4 and repeat after UI integration.
4. Language selection and equivalent valid constrained edits must use genuine authored checking rules. Test all three languages in Phase 3.
5. Old-round messages and retained client state must not corrupt a replay or leak the prior role's private material. Test this in Phase 6.

## File ownership and integration boundaries

The following locations exist; modules inside them are proposed and must be named after inspecting current conventions:

| Location | Responsibility |
| --- | --- |
| `server/rooms/` | Shared room/session lifecycle and reconnect identity |
| `server/networking/` | Connections, routing, validation, and room-scoped delivery |
| `shared/` | Public message/configuration definitions and shared utilities; no answer keys |
| `apps/player/` | Browser entry point, joining, connection handling, and mounting game screens |
| `apps/host/` | Existing desktop shell and integration with Alt+C4 |
| `games/altc4/host/` | Replaceable placeholder lobby and host bomb/results presentation |
| `games/altc4/player/` | Private Spec Holder/Programmer screens and game-specific controls |
| `games/altc4/server/` | Role assignment, round state, checking orchestration, timer, outcomes |
| `games/altc4/data/` | Puzzle definitions, server-only validation/reference data, public projections |
| `docs/` | Reviewed designs, protocol/lobby contract, task ledger, verification and handoff notes |

Phase 1 records exact proposed filenames, exported interfaces, message payloads, and test locations. The lobby contract must define room identity, participants, configuration, roles, readiness, start permissions, connection status, and return-to-lobby navigation. The final lobby should replace presentation through this contract, not duplicate game rules.

## Phase order and task completion map

`Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6 -> Phase 7`

Phase 8 is optional and does not gate the core demonstration unless chat is explicitly restored to required scope.

| Phase | Deliverable | Original tasks completed at a passing checkpoint |
| --- | --- | --- |
| 1 | Reviewed visual direction, game contracts, checking decision | None; design/contracts prepare T1-T8 |
| 2 | Real connections, placeholder lobby, random private roles | T1 |
| 3 | Authored puzzle content and server checking for all three languages | T6, as a server component; Phase 4 verifies game-loop integration |
| 4 | Functional multi-panel round with timer, chances, and outcomes | T2 and T7; integration evidence for T6 |
| 5 | Finished pixel-art host and private gameplay screens | T3 and T4 |
| 6 | Reconnect recovery, results, lobby reconfiguration and replay | T8; required recovery work across T1-T4/T7 |
| 7 | Regression checks, usability/readability fixes, demo rehearsal | Verification of T1-T4/T6-T8; no task receives duplicate completion credit |
| 8, optional | In-game text chat if approved | T5 only if implemented and checked |

These are future completion targets, not claims that any implementation has passed. Completing a server task in Phase 3 does not imply the whole round or player UI works. A downstream regression reopens the affected task.

## Phase 1: Visual design and contracts

**Depends on:** Confirmed brief and access to current repository.

**Work together:** Visual direction, screen flow, data/privacy boundaries, puzzle model, and lobby integration agreement. Settling these early prevents incompatible screens and server messages.

- [ ] Inspect current instructions, manifests, relevant code, and the other programmer's integration needs. Record existing versus proposed files.
- [ ] Review the scoped stack recommendation. Specify and prove the React mount/unmount, single-runtime dependency resolution, frontend/server TypeScript build boundaries, CommonJS adapter, and Tailwind shared-source detection before expanding implementation. Keep prototype/integration changes inside the approved phase scope.
- [ ] Propose a small style guide: pixel scale, palette, text/code typography, reusable controls, asset dimensions/formats, states, and animation limits.
- [ ] Produce matching host bomb, Spec Holder, and Programmer mockups, including checking/feedback and paused states. Get visual review before treating the exact style as approved.
- [ ] Define room/round lifecycle, role permissions, server-only puzzle data, message contracts, and a replaceable-lobby contract.
- [ ] Select and explain the constrained-edit checking approach for Java, C++, and Python; give representative correct, incorrect, and equivalent-answer examples.
- [ ] Evaluate the recommended authored-puzzle validators with explicit bounded edit grammars and trusted behavior fixtures. Document language-specific limits, unsupported edits, and internal failures; do not imply general-purpose compiler execution.
- [ ] Resolve or explicitly confirm proposed defaults: shared chance pool, language selection granularity, starter content quantities, duration/panel bounds, reconnect/resume/abandonment, and check timeouts/order during pause or expiry.
- [ ] Record exact next-phase modules/interfaces and meaningful verification commands. Assess developer capacity against the deadline; agree scope changes rather than silently removing requirements.

**Exit checks:** Reviewed screen designs remain readable at intended device sizes; exact interfaces and examples are documented; required behavior is distinguishable from proposals; the scoped frontend/server build integration is demonstrated; lobby integration boundary is usable by the other programmer.

**Suggested phase commit:** `chore(altc4): define design and integration contracts`

**Task report:** T1-T8 remain unimplemented; specifications are prepared. Chat and desired enhancements retain their recorded scope status.

## Phase 2: Shared connections, placeholder lobby, and roles

**Depends on:** Phase 1's room, permission, configuration, and lobby contracts.

- [ ] Add the minimum runnable backend and browser entry point following existing conventions.
- [ ] Add the approved Alt+C4 React/TypeScript entry/adapters, server compilation, and explicit type-check/build/test commands. Document the supported Node 24 LTS environment and keep dependency installation reproducible. Do not migrate unrelated game/menu code.
- [ ] Implement room creation/joining, stable participant identity, one host plus two player slots, and room-scoped connections. Provide the chosen demo join route; retain compatibility with the planned shared endpoint.
- [ ] Build the functional placeholder lobby with participants, host settings, random initial roles, readiness, start controls, and room/connection feedback.
- [ ] Implement server-side random assignment of exactly one Spec Holder and one Programmer. Deliver private role views through functional browser shells.
- [ ] Validate host-only configuration/start actions, player capacity, duplicate identities, wrong-role actions, and room isolation.

**Exit checks:** A desktop host and two real browser devices join the same room and receive exactly one of each role; host settings synchronize; a third player and cross-room/unauthorized actions are rejected; the other programmer can use the documented lobby contract. No stubbed network state counts as passing.

**Suggested phase commit:** `feat(altc4): add room setup and role assignment`

**Task report:** Complete T1. T3/T4 have functional shells only. Shared infrastructure and the placeholder are additional prerequisites, not extra original-task completions.

## Phase 3: Puzzle content and server-side checking

**Depends on:** Phase 1's puzzle/checking contract and Phase 2's permission/connection boundary.

- [ ] Author the agreed starter set in Java, C++, and Python, with enough distinct panels for the supported multi-panel configuration.
- [ ] Store private validation/reference material on the server and produce explicit role-specific puzzle projections.
- [ ] Implement constrained editable sections and server validation of locked content, puzzle/panel identity, language, input bounds, and permitted submitter.
- [ ] Implement the selected checking method with its documented syntax, equivalent valid answers, failure categories, and execution/time bounds.
- [ ] Expose checking through the agreed action boundary. A development client or automated client must be able to submit an edit and observe its real result without requiring final artwork.
- [ ] Add meaningful valid, invalid, equivalent-answer, wrong-role, malformed-input, and private-data checks for each language. Distinguish an incorrect solution from a checker/infrastructure failure in the result contract.

**Exit checks:** Real submissions for each language produce the expected result; role-filtered data contains the proper brief or editable content without leaking answers; supported panel counts have sufficient content. Internal checker failures remain distinguishable from incorrect player answers.

**Suggested phase commit:** `feat(altc4): add multilingual puzzles and server checking`

**Task report:** Complete T6 as the checked server component. T3/T4 gain real content but remain unfinished interfaces. Round-level chance/outcome integration follows in Phase 4.

## Phase 4: Timer, chances, and multi-panel outcomes

**Depends on:** Room/role setup from Phase 2 and genuine checking results from Phase 3.

These rules belong together: submission results change the shared chance pool and panel state, while the timer and panel state determine the one terminal outcome.

- [ ] Implement the server-owned round state and configured duration. Send enough timing information for consistent client displays; do not trust client clocks to decide outcomes.
- [ ] Build a plain functional host/role game view to exercise real state before final styling.
- [ ] Connect checking outcomes to chances and solved-panel progress. Count each checked incorrect submission once; define checker-failure behavior using Phase 1's decision.
- [ ] Defuse only when every required panel succeeds in time. Detonate at zero time or zero chances. Stop accepting game mutations after a terminal outcome.
- [ ] Implement the pause/resume state foundation and agreed handling of in-flight checks. Complete user-facing reconnection recovery in Phase 6.
- [ ] Verify duplicate/repeated and solved-panel submissions, checks racing expiry, stale round actions, consistent broadcasts, and exactly-once outcomes using controlled timing where practical.

**Exit checks:** Across the desktop and two browser devices, time continues while checking, one incorrect result costs one chance, partial panel success does not defuse, all-panel success defuses, and timeout/zero chances detonates exactly once. Phase 3's checker is exercised through the live round.

**Suggested phase commit:** `feat(altc4): implement timer chances and bomb outcomes`

**Task report:** Complete T2 and T7; confirm T6 integration. T3/T4 remain functional development screens pending Phase 5's complete visual/interaction treatment.

## Phase 5: Pixel-art gameplay frontend

**Depends on:** Reviewed Phase 1 designs, real puzzle data, and Phase 4's live state/actions. Static components/assets may be prepared earlier after contracts are stable; do not mark live integration complete from mocks.

- [ ] Build reusable visual controls and approved pixel-art assets with consistent scaling and readable typography.
- [ ] Use shared Tailwind theme tokens and verified source scanning in both consuming app builds. Structure Alt+C4 views as focused React components with typed public state/actions.
- [ ] Finish the host's shared workbench/bomb view, panel progress, time, chances, and outcome feedback while preserving private-role information.
- [ ] Finish the private Spec Holder brief, manual/checklist, navigation, timer, and chances.
- [ ] Finish the private Programmer panel navigation, locked/ editable code presentation, editor behavior, submissions, checking and error feedback, timer, and chances.
- [ ] Integrate CodeMirror with explicit setup/update/cleanup for the permitted edit sections. Check that server ticks and UI re-renders retain draft text, focus, selection, and undo history, and that pasted edits cannot change locked context.
- [ ] Bind every control and display to real actions/state. Include usable connection, checking, success/failure, and paused presentation.
- [ ] Check intended device sizes, code/input usability, text contrast, focus handling, sharp asset scaling, and screen clarity during a real round.

**Exit checks:** A real three-device round uses the styled screens with no mocked game state; both role interfaces are usable and private; editing obeys the puzzle constraints; host information is readable from the intended viewing distance.

**Suggested phase commit:** `feat(altc4): build pixel art gameplay interfaces`

**Task report:** Complete T3 and T4. The host bomb screen is additional required scope. Recheck T2/T6/T7 through the final frontend.

## Phase 6: Reconnection, results, and lobby replay

**Depends on:** Phases 2-5's identities, round state, private projections, and real interfaces.

- [ ] Finish stable-identity reconnection for a player or host, preserving editor work and round progress through the agreed grace/resume policy.
- [ ] Complete results with outcome and authored original-bug explanations; use the same underlying round result in all relevant views.
- [ ] Return to the placeholder lobby; permit the agreed role/configuration changes and start a fresh round when ready.
- [ ] Reset round-specific state while retaining the room. Clear private client data when roles change and reject old-round messages/results.
- [ ] Test disconnecting each participant, checking during a disconnect, grace expiry/abandonment, repeated reconnections, and a complete replay with different roles/settings.

**Exit checks:** Disconnect pauses time; resume restores consistent time, roles, chances, solved panels, and work. Results explain actual puzzles. Returning to the lobby and replaying does not reset the room identity, leak prior-role secrets, or accept stale submissions. No forced automatic role swap remains.

**Suggested phase commit:** `feat(altc4): add reconnect results and lobby replay`

**Task report:** Complete updated T8. Recovery requirements across T1-T4/T7 are checked. Seven original tasks can now be complete; T5 remains optional/pending decision.

## Phase 7: Integration, visual polish, and rehearsal

**Depends on:** All required behavior in Phases 1-6.

- [ ] Run the relevant backend checks and host/player builds. Use commands that exist and record their actual output; the existing host build command is `npm run host:build`.
- [ ] Run explicit frontend/server TypeScript checks separately from Vite builds. Use Node rule tests and multi-context Playwright flows for the approved stack; verify native Tauri separately on the real demo device.
- [ ] Exercise the game on the actual desktop host plus two intended player devices, across the chosen demo network/join route. Browser-only host checks do not substitute for a native Tauri rehearsal.
- [ ] Repeat the contract/privacy, cross-room, all-language, timing/outcome, reconnect, and replay checks after integration.
- [ ] Review code readability and fix confusing modules/control flow. Check the main round path and lobby replacement boundary with the brief at hand.
- [ ] Address asset/layout/feedback defects. Add configurable panel count and active-panel highlighting only if feasible after core checks; report either enhancement as partial/deferred if unfinished.
- [ ] Rehearse the demonstration and record setup/run/recovery instructions, known limitations, and final task status. Compare the other programmer's final lobby with the contract if it is available; retain a working placeholder otherwise.

**Exit checks:** Required checks pass or any failure is explicitly resolved/reported; a complete native-host three-device demonstration can be repeated; build/test commands and evidence are recorded; desired features are honestly marked. Do not declare a required feature complete if it could not be verified.

**Suggested phase commit:** `test(altc4): verify integration and demo readiness`

**Task report:** Verify T1-T4/T6-T8 without awarding duplicate completion credit. T5 remains deferred/pending decision unless Phase 8 was requested and passed. Required failures reopen the affected tasks.

## Phase 8: Optional text chat

**Entry condition:** The user explicitly chooses to include chat and agrees its audience/history behavior. It is outside the recommended deadline-critical path.

- [ ] Agree player/host visibility, history lifetime, and reset behavior before adding UI or messages.
- [ ] Implement room-scoped delivery and the approved chat interface, using safe text rendering and bounded messages.
- [ ] Verify visibility, room isolation, disconnect/reconnect, history/reset rules, and compatibility with gameplay/replay. Repeat affected Phase 7 checks.

**Exit checks:** The two players can exchange text according to the approved rules; messages do not cross rooms or corrupt game views.

**Suggested phase commit:** `feat(altc4): add optional in game text chat`

**Task report:** Complete T5 only after implementation and verification. A recommendation to defer it is never counted as completion.

## Phase-end commit gate

Apply this gate after every phase. Commit messages above are suggestions; use an accurate subject for the actual diff. Small additional commits within a phase are allowed, but the passing phase checkpoint must be identifiable.

- [ ] Review the phase's acceptance checks and original task IDs. Distinguish complete, partial, blocked, deferred, and not started.
- [ ] Run the phase's meaningful checks; inspect real results. For design/doc work, review the artifact and validate links/requirements rather than adding implementation-mirroring tests.
- [ ] Review the full relevant diff and run `git diff --check`. Verify the current branch is still `ALTC4-jeff` and inspect unrelated changes.
- [ ] Update the phase/task ledger and brief handoff with what changed, commands/evidence, unresolved issues, and the next concrete action. A later phase's report can carry the previous checkpoint's hash so there is no need to amend a commit merely to insert its own hash.
- [ ] Stage only relevant files and inspect the staged diff. Commit locally only when the phase passes. Never create a misleading completion checkpoint or include another programmer's changes accidentally.
- [ ] Report the actual short commit hash, subject, task statuses changed, checks passed/failed/not checked, and next phase. Do not fabricate hashes.

If checks fail, keep working within the phase or report the blocker. Record the current state without claiming the phase is complete. No automatic push is requested.

## Concurrency and schedule notes

- Visual asset/component preparation can overlap with backend work once Phase 1's contract/design decisions are stable. Real gameplay UI integration still depends on Phase 4.
- Puzzle authoring can overlap with shared infrastructure after the puzzle schema/checking contract is settled. Phase 3's integration checkpoint follows Phase 2.
- Timer, chances, and defuse/detonate share one state-transition boundary. Implement them together in Phase 4 to avoid multiple owners of the outcome.
- Results/replay and reconnect share round lifecycle and identity behavior; keep their cleanup/reset rules coordinated in Phase 6.
- Use one implementation agent as the baseline. Do not start extra agents or distribute shared files merely because some preparatory work can overlap.
- Confirm available hours before assigning calendar estimates. Preserve the December 1 deadline and proposed November 29-30 verification buffer; surface infeasible scope early. Chat and desired enhancements are the first proposed deferrals, not grounds for dropping required language support silently.

## Planning handoff

Current state: the initial phase roadmap and confirmed brief were committed as planning checkpoint `14581bf`. A scoped stack recommendation and final planning audit now accompany them; no game implementation phase is complete. The first execution step is Phase 1's repository/design/contract review. Exact style mockups, integration proof, checker/default decisions, and Phase 2's precise file/interface plan remain to be produced and reviewed. Preserve any unrelated working-tree edits when committing planning updates.
