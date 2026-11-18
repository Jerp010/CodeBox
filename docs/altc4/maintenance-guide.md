# Alt+C4 maintenance review and manual learning guide

Reviewed November 18, 2026 against the current files on `ALTC4-jeff`.
Phase 1 is `7b298cf`; Phase 2 is `9f611dc`. This cleanup does not implement
Phase 3 or change any original task's completion status.

## What exists now

Phase 1 supplied contracts, separately compiled server TypeScript, React adapters,
shared styles, and static host/role studies. Phase 2 added real HTTP/WebSocket
connections, room configuration, readiness, complementary random player roles,
private resume credentials, and post-start role shells.

T1 has implementation and automated verification. T3/T4 have shells and mockups;
their gameplay interfaces are incomplete. T2, T6, T7, and T8 have no game
implementation yet. T5 is optional pending a decision. Native Tauri, the physical
three-device exit check, final-lobby adoption, and approval of provisional visual
and gameplay decisions remain outstanding. Automated Phase 1–2 completion does
not close those checks.

### Read the working path in this order

| Existing file | Responsibility and useful entry points |
| --- | --- |
| `apps/host/scripts/altc4-host-adapter.js` | Mounts Alt+C4 beside the existing host menu. |
| `apps/host/scripts/altc4-host-entry.tsx` | `HostEntry` switches menu/lobby visibility; `mountAltC4Host` returns cleanup. |
| `apps/player/main.tsx` | Selects the live player entry or explicit `?mockup=1` preview. |
| `games/altc4/ui/LobbyScreens.tsx` | `HostLobby`/`PlayerLobby` own one client each. Presentation receives state and calls client actions. |
| `games/altc4/ui/lobbyClient.ts` | Connects, correlates requests, publishes snapshots, stores credentials per tab, and resumes identity. |
| `games/altc4/ui/lobbyProtocol.ts` | Frontend wire/view/session types. Types describe data; they do not validate incoming JSON. |
| `server/index.js` | `createServer`, envelope validation, rate limits, socket binding, correlated replies, role-filtered broadcasts, heartbeat and shutdown. |
| `games/altc4/server/lobby.ts` | `LobbyRegistry` owns room/participant state and validates configuration, readiness, roles, resume and start rules. |
| `games/altc4/ui/MockupApp.tsx`, `mockup.css` | Static visual studies and shared styling. Sample clocks/chances/code have no game behavior. |
| `tests/altc4/*.test.cjs` | Real socket acceptance, adversarial identity/room tests, and input/connection limits. |
| `scripts/altc4-lobby-browser-qa.cjs` | Runs the live host/two-player flow, resume checks and viewport assertions. |

The gameplay folders `games/altc4/data`, `host`, and `player` contain placeholders.
The current live views are in `ui`, not those proposed presentation directories.
`server/networking` and `shared` are placeholders too. `server/rooms/index.js`
is older shared scaffolding and is not used by this ALTC4 backend. Likewise,
`games/altc4/scripts/index.js` only logs a message; it is not the live game entry.
Avoid building a second room registry in those locations.

### Trace one action end to end

For **Apply settings**, `HostRoom` calls `LobbyClient.setConfig`. Its `request`
method adds a request ID, the bound room ID, and current round number. The server's
`handleMessage` validates the envelope, rate limit and retry cache; `boundState`
checks room/round/socket ownership. `LobbyRegistry.setConfig` checks host permission
and allowed values, then clears readiness when a setting changes.

The server replies to that request ID and broadcasts a copied public room state
with each recipient's own role shell. `LobbyClient.handleMessage` settles the
waiting action, publishes a view, and React renders it. UI code never decides
whether a host is authorized or a round can start.

Create/join/resume initially use empty `roomId` and round zero. A successful
handshake privately returns a participant ID and resume token and binds the socket.
Only that reply includes the credential; public snapshots omit it. On resume the
token rotates and the old socket loses ownership. A delayed close from the old
socket cannot disconnect the replacement.

`startRound` currently changes `lobby` to `inRound` and increments `roundNo`.
The clients render `RoleShell`. It does not select puzzles, start a clock, spend
chances, or create an outcome. Returning to the host menu closes that client;
it does not delete the room or release a player seat.

## Review findings and cleanup

### Confirmed discrepancies corrected

- The roadmap's final handoff still described a planning-only repository despite
  its current Phase 1–2 checkpoint. It now points to this guide and the phase report.
- The contracts mix the target gameplay API with implemented Phase 2 messages.
  A new implementation note identifies future resume fields and the unimplemented
  `returnToLobby`/`leaveRoom` actions. Their presence in a contract is not code.
- Lobby copy said roles were assigned after both players joined. The registry
  assigns the first player immediately and the complementary role to the second.
  The copy now describes that behavior.

### Focused refactors

- `broadcastRoom` takes one copied room snapshot per broadcast and reuses
  `roleViewFor` for each recipient. Removed the one-use `publicMessage` wrapper
  and its unused request-correlation option. Broadcast IDs and payload shapes stay
  the same; correlated action replies still use `sendReply`.
- `LobbyRegistry.state` derives `canStart` from its existing ordered blocking
  reasons. The permission and displayed reason now have one decision path.
- Pending client requests already returned `Promise<void>` and discarded the
  reply payload. Removed the unused resolver argument/wrapper, an unused handshake
  type, and an unused role import.
- Added concise comments above the ALTC4 runtime functions and methods, with
  inline explanations for takeover safety, retry limits, mixed snapshot shapes,
  optimistic readiness and the plain-HTTP request-ID path. Broke the long envelope
  guard into readable conditions without changing validation.

No dependencies, exported interfaces, room policies, teammate lobby code, or
unrelated game/menu behavior were changed. The existing `.gitignore` changes and
untracked `.agents/` were left outside the cleanup commit.

### Confirmed remaining limitation: a new invite can resume the old room

With a valid saved session, navigating the same player tab to another room's
`?code=` link resumes the saved room. `PlayerLobby` always attempts saved-session
resume on mount; the new code only initializes the join form. A temporary real
browser probe joined room A, navigated to room B's invite in the same tab, and
observed room A while the URL contained B's code.

This can confuse a player changing rooms. For now, use a separate browser context
without a saved session to join another room. A normal new tab can inherit session
storage when opened by another tab, so it is not a guaranteed reset. This cleanup
preserves the resume policy; add explicit leave/change-room behavior when completing
the Phase 6 lifecycle and test invite precedence then. The current `stop()` only
closes the connection and deliberately retains the resume credential.

### Known deferred work, not newly introduced regressions

- Rooms, occupied seats and tokens persist until process exit; there is no seat or
  room retirement. Repeated room creation can eventually reach the 500-room cap.
  Restart clears all rooms and credentials. This is demo storage, not persistence.
- Lost token-rotation replies can strand an identity. Lobby resume is implemented;
  full draft/progress recovery, pause, grace expiry and abandonment are future work.
- The request cache covers only 128 IDs on one socket. It cannot prevent chance
  consumption twice after reconnect. Phase 4 needs its own round submission ledger.
- There is no actual puzzle material to test for privacy yet. Current tests prove
  credential/room isolation, not future answer-key or role-content isolation.

### Possible concerns needing more evidence

- The client casts decoded JSON to protocol types with limited shape checks. A
  malformed reply from an incompatible backend could break rendering. The supplied
  backend passed the exercised flows; no such backend failure was reproduced here.
- Server and frontend define similar lobby types separately. They currently match,
  but future fields can drift. Keep wire tests in step with both; a shared-schema
  migration is unnecessary for this cleanup.
- Dense JSX and transport/identity logic take effort to read. Comments and the
  action trace help now. Extract a component or module only when the next phase
  gives it a clear responsibility; avoid a generic lobby framework.

## Learning roadmap

The filenames below marked **new** are suggested destinations, not existing
implementations or a requirement to create every file up front. Keep the teammate's
finished lobby behind the current state/action boundary. Work through each phase,
verify it, then commit it separately on `ALTC4-jeff`.

### Phase 3: authored puzzles and bounded checking (T6)

Depends on the existing socket/permission boundary and `contracts.md` §§5, 6 and 8.
Start with one authored panel; complete at least five panels per language before
claiming the supported five-panel configuration works in Java, C++, and Python.

- **New:** `games/altc4/data/puzzles.ts` for server-only definitions, briefs,
  templates, slot grammars, reference material, fixtures and original-bug explanations.
- **New:** `games/altc4/server/puzzles.ts` for selecting panels and explicitly
  projecting the appropriate public/Spec Holder/Programmer fields.
- **New:** `games/altc4/server/checker.ts` for bounded slot parsing and authored
  fixture evaluation. Never evaluate submitted source with `eval`, `Function`,
  or arbitrary compiler/process execution. Syntax accepted by the grammar still
  needs behavior checks; string equality with one answer is insufficient.
- **New:** `tests/altc4/puzzles.test.cjs` and `checker.test.cjs`. Existing npm
  server tests already collect `tests/altc4/*.test.cjs`; import compiled modules
  from `dist-server/games/altc4/server/` as the backend does.
- **Modify:** `lobby.ts` to associate a stable panel selection with the room/round,
  and `server/index.js` to expose real role-filtered content and `submit_check`.
  Extend `lobbyProtocol.ts` and `lobbyClient.ts` for actual messages. Use automated
  socket clients initially; finished editors and artwork can wait.

The frontend must never import the private catalog. Server imports of TypeScript
data will be included by the existing server compilation; verify emitted paths.
Keep public types free of runtime imports from private data. The Vite development
allowlists currently include only app/UI sources and dependencies; retain that
separation and verify production assets contain no private fixtures or references.

Check correct, incorrect, equivalent and unsupported edits in every language;
missing/extra slots; malformed/oversized input; unknown panels; wrong role/room;
and stale rounds. Test public/private projections explicitly. Internal checker
failure must differ from an incorrect player answer. Review the provisional
grammar and timeout decisions before implementing their policy.

Run `npm run altc4:server:build`, `npm run altc4:server:test`, then
`npm run altc4:verify`. Completion needs real socket submissions for all three
languages and enough distinct content. Timers/chance consumption belong to Phase 4.

### Phase 4: one authoritative round loop (T2 and T7)

Depends on genuine Phase 3 results. **New:** `games/altc4/server/round.ts` for
round timing, panel progress, shared chances and terminal transitions, plus
`tests/altc4/round.test.cjs`. **Modify:** `lobby.ts`, `server/index.js`,
`lobbyProtocol.ts`, `lobbyClient.ts` and the plain role/host views in
`LobbyScreens.tsx` to carry real round state.

The server owns the monotonic deadline and one terminal transition. Clients render
remaining time; their clocks never authorize a defuse. Add a room/round-scoped
submission ledger before changing chances. Confirm the provisional shared-pool
interpretation and check/pause ordering against `contracts.md` §7.

Use controlled time in rule tests: exact-deadline completion loses to expiry,
one incorrect result spends one chance, duplicates spend none, partial progress
does not defuse, all panels solved in time defuse, and zero chances detonates once.
Test pause/resume and in-flight results as well as solved-panel/stale-round actions.
Run server build/tests and full verification; extend live browser QA to exercise
the round and compare all three station views.

### Phase 5: usable pixel-art gameplay screens (T3 and T4)

Depends on real Phase 3 content, Phase 4 state/actions, and reviewed visual choices.
**New as needed:** `games/altc4/ui/HostRound.tsx`, `SpecHolderRound.tsx`,
`ProgrammerRound.tsx`, and `CodeEditor.tsx` with adjacent interaction tests.
Keep shared UI here so the existing frontend typecheck, Tailwind scans and Vite
allowlists continue to cover it. **Modify:** `LobbyScreens.tsx` to mount them,
`mockup.css`/app styles for real layouts, and browser QA scripts for gameplay.

CodeMirror is planned but not installed. Add it when implementing the constrained
editor, with explicit setup/update/cleanup. The server must still validate slots;
locking the editor is only a usability feature. Preserve drafts, focus, selection
and undo through ticks. Test pasted locked-context changes, wrong-role data,
keyboard use, readable code on phones, and the host at viewing distance.

Run both builds, frontend checks, editor interaction tests through an explicitly
updated test command (`altc4:test` currently names only the host lifecycle file),
and full browser verification. A static mockup never establishes live integration.

### Phase 6: lifecycle, recovery, results and replay (T8)

Depends on Phases 2–5. **Modify:** the registry, round rules, transport and client
for pause/grace/abandonment, private draft restoration, role/configuration changes,
and `results → lobby`. **New as needed:** `games/altc4/ui/Results.tsx` and
`tests/altc4/recovery.test.cjs` / `replay.test.cjs`.

Results should explain the actual selected puzzles' original bugs. Replay keeps
the room and resets round state. Clear obsolete private data when roles change,
reject previous-round messages/results, and keep manual role changes distinct
from an automatic swap. Settle explicit leave/new-invite precedence and recovery
from a lost rotated-token reply; the current client does not solve those policies.

Test disconnect of each station, pending checks during pause, grace expiry,
repeated resume, draft retention and replay with changed roles/settings. Check
every view for prior-role content. Run server and browser tests plus full verification.

### Phase 7: integration and actual-device rehearsal

Depends on Phases 1–6. Extend the existing tests and QA scripts; update
`docs/altc4/progress.md` and the appropriate phase report. Create
`docs/altc4/demo.md` if a dedicated setup/run/recovery guide is useful.

Run `npm run altc4:verify`, then rehearse the native Tauri host and two intended
physical player devices on the real LAN or HTTPS/WSS endpoint. Check all languages,
room isolation, privacy, expiry, disconnect recovery and replay. Compare the
teammate's final lobby to the same boundary when it is available. Report physical
and native evidence separately from Chromium automation.

### Phase 8: optional chat (T5)

Requires an explicit scope decision about audience and history. If included,
extend the transport, protocol and client and add a focused chat view and
room-isolation tests. Agree message bounds, reconnect/history and replay reset
behavior first. It does not block the ordered core phases while still optional.

## Your first practical step

I recommend one Python panel first because its tiny expression slot makes the
separation between grammar and behavior easy to inspect.

1. Read `contracts.md` §§5 and 8, then trace `set_config` through the files above.
2. Create **only** `games/altc4/data/puzzles.ts` for your first attempt. Sketch a
   `PuzzleDefinition` type and one panel for the locked template `total = [[expr]]`.
   Include a stable ID, language, brief/checklist, editable slot grammar, initial
   broken expression, private fixtures/reference, and original-bug explanation.
3. Give it fixture inputs `[2, 3]`, `[0, 4]`, and `[-2, 5]` with expected totals
   `5`, `4`, and `3`. Decide why subtraction is incorrect, reversed addition is
   equivalent, and `sum(values)` is unsupported by this grammar. Negative fixture
   inputs are separate from the grammar's unsigned editable integer literals.
4. Mark which fields each role may receive and which must remain server-only.
   Do not connect the catalog to the frontend or implement checking yet.

Your checkpoint is a readable data model and one internally consistent panel.
Share that attempt for review before writing the parser. The next exercise will
be one failing projection/fixture test, followed by the smallest function that
passes it; a complete checker implementation is intentionally not supplied here.

## Verification record

Baseline full verification passed with local connection access on November 18:
typechecks, both production builds, CSS smoke, one host lifecycle test, CommonJS
smoke, 16 backend tests, static preview QA and live lobby QA. The initial restricted
run stopped at network tests; direct execution showed `listen EPERM` on loopback.
That was a runner permission failure, not an assertion about game behavior.

The final cleanup verification is recorded in `progress.md`. Native Tauri,
physical devices, actual LAN/HTTPS endpoints and future gameplay were not verified.
