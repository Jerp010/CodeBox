# Alt+C4 project guide and Phase 3 specification

Last reviewed: November 19, 2026. Branch: `ALTC4-jeff`.
This is the single maintained ALTC4 document. It consolidates the former brief,
stack audit, contracts, phase plan, integration notes, reports and learning guide.
Earlier versions remain in Git history. Update this file as the project advances.

- [Current status and task map](#current-status-and-task-map)
- [Phase 3 specification](#phase-3-specification)
- [Your first implementation exercise](#your-first-implementation-exercise)
- [Existing code and data flow](#existing-code-and-data-flow)
- [Current lobby and protocol contract](#current-lobby-and-protocol-contract)
- [Later phases and round contract](#later-phases-and-round-contract)
- [Run and verify](#run-and-verify)
- [Known limitations and evidence](#known-limitations-and-evidence)

## Current status and task map

Alt+C4 (Boom Banana) is a cooperative code-puzzle game for one Tauri desktop host
and two browser players: Spec Holder and Programmer. JEFF MARQUEZ owns T1–T8.
The target is December 1, 2026; November 29–30 is a proposed rehearsal buffer,
not a delivery guarantee. Available development hours have not been established.

| Task | Current state | Intended completion |
| --- | --- | --- |
| T1 Role Assignment | Implemented with automated room/role tests; native/physical sign-off open | Phase 2 implementation |
| T2 Bomb Timer & Lives | Not started | Phase 4 |
| T3 Spec Holder UI | Live role shell and static mockup; gameplay unfinished | Phase 5 |
| T4 Programmer UI | Live role shell and static mockup; editor/gameplay unfinished | Phase 5 |
| T5 In-Game Text Chat | Not implemented; optional pending a scope decision | Phase 8, if chosen |
| T6 Server-Side Checking | Contracts/examples only; no checker or puzzle catalog | Phase 3 server component, integrated in Phase 4 |
| T7 Defuse & Detonate | Not started | Phase 4 |
| T8 Results & Replay | Not started; manual lobby reconfiguration supersedes automatic role swapping | Phase 6 |

Phase 1 (`7b298cf`) supplied contracts, static interface studies and build
integration. Phase 2 (`9f611dc`) supplied real rooms, settings, readiness, random
complementary roles and token-based identity resume. Cleanup (`c85358c`) simplified
lobby code, added comments and corrected the handoff. Phase 3 remains unimplemented.
Native Tauri, the physical three-device exit check, teammate lobby adoption and
approval of provisional artwork/defaults remain open. Automated checks do not
establish those external approvals or hardware checks.

Confirmed product requirements: Java/C++/Python puzzles, several panels per bomb,
locked surrounding code with constrained edits, host-configured duration, three
chances, time continuing during checking, all-panel success before expiry,
disconnect pause and progress restoration, original-bug explanations, and manual
return to the lobby for another round. Another programmer owns the finished lobby.
Keep the functional placeholder replaceable through plain state/actions.

## Phase 3 specification

### Purpose and task accomplished

Phase 3 accomplishes **T6: Server-Side Checking** as an independently verified
server component. A Programmer submits permitted edits for an assigned puzzle;
the server checks the edit grammar and authored behavior and returns a real result.
The Spec Holder receives the corresponding private instructions. The server keeps
answers, reference edits and test fixtures private.

Completing this phase does not complete a playable bomb round. Phase 4 connects
these results to time, chances, progress and outcomes; Phase 5 finishes T3/T4.
This specification is a guide for the user to implement manually. It contains no
checker implementation and does not authorize an agent to implement later phases.

### Scope and decisions

Build a catalog of at least five distinct panels for each of Java, C++ and Python
(15 total), stable per-round selection, explicit role projections, bounded slot
checking, a real `submit_check` action, and meaningful automated checks. Start with
one panel and grow it after its tests pass. The full phase needs all 15 panels.

Keep the adopted authored-puzzle approach: parse edits as data and evaluate a small,
trusted behavior model using private fixtures. Do not compile arbitrary player
programs, use `eval`/`Function`, or build a general Java/C++/Python interpreter.
CodeMirror, finished artwork, chat, countdown, chance consumption, solved-panel
progress, outcomes, replay and complete reconnection recovery are outside Phase 3.
A socket test client is sufficient to demonstrate the checking action.

Existing configuration defaults are 300 seconds (120–900 in 30-second steps),
three panels (2–5), and one host-chosen language per round. They are implemented
development defaults and remain changeable. The bounded grammar, starter quantity,
one check in flight per room, and 2-second soft/5-second hard check budgets were
provisional development rulings, not recorded user approvals. Review their fit
before implementing them. Grammar extensions must be explicit and tested.

The payload names and function boundaries below make the next implementation
concrete; they are **proposed Phase 3 interfaces**, not existing APIs. Additional
parser limits below are recommendations. No dependencies need to be added to
start the catalog, projections or Node rule tests.

### Files and responsibilities

All paths here are relative to the repository root. Create files only as their
exercise begins; do not scaffold a second room system or a generic plugin framework.

| File | Work in Phase 3 | Why it belongs here |
| --- | --- | --- |
| `games/altc4/data/puzzles.ts` — new | `PuzzleDefinition` and private authored catalog | Keeps templates, briefs, reference edits, fixtures and explanations on the server |
| `games/altc4/server/puzzles.ts` — new | Catalog validation, selection and role projections | Gives each room stable panels and each viewer an explicit allowed payload |
| `games/altc4/server/checker.ts` — new | Slot grammar parser and bounded authored evaluation | Separates answer checking from sockets and React |
| `games/altc4/server/lobby.ts` — existing | Associate selected panels with a started room/round; expose permission-checked access | Reuses current identity, configuration and start rules |
| `server/index.js` — existing | Route `submit_check`, return private results/content, preserve validation and limits | Retains one authoritative connection boundary |
| `games/altc4/ui/lobbyProtocol.ts` — existing | Public Phase 3 message/view types only | Keeps answer definitions out of frontend imports |
| `games/altc4/ui/lobbyClient.ts` — existing | Submission action and reception/storage of private panel views | Extends the current client instead of adding another socket |
| `tests/altc4/puzzles.test.cjs` — new | Catalog, selection and projection checks | Proves content coverage and privacy |
| `tests/altc4/checker.test.cjs` — new | Supported, incorrect, equivalent, unsupported and internal-failure cases | Proves checking independently of the UI |
| `tests/altc4/checking.network.test.cjs` — new | Real socket authorization, private delivery and correlation checks | Proves the component is reachable through the existing backend |

The server TypeScript configuration currently includes `games/altc4/server/**/*.ts`.
Imported `data/puzzles.ts` will be compiled transitively under `dist-server`.
A standalone catalog with no server importer is not covered yet: check that first
exercise directly as described below. Node tests import emitted server modules
from `dist-server/games/altc4/server/`; build before running them.

### Puzzle data and ownership

Each `PuzzleDefinition` needs the following information. Choose clear TypeScript
types; begin with the first puzzle's actual needs and expand for the other models.

| Field | Requirement |
| --- | --- |
| `panelId`, `language`, `title` | Stable unique ID, `java`/`cpp`/`python`, readable title |
| `brief`, `checklist` | Instructions for the Spec Holder; do not include the answer |
| `template` | Trusted locked code with explicit `[[slotId]]` markers |
| `slots` | Unique IDs, grammar descriptions, allowed atoms and initial broken edits |
| `referenceEdits` | Known valid slot values; server-only |
| `fixtures` | Private inputs and expected behavior, including cases that expose the original bug |
| `validationKind` | Identifies a small trusted authored behavior model, never executable client input |
| `originalBugExplanation` | Explanation for later results; not an answer-key payload during play |

Validate the catalog before exposing a round: IDs are unique; template markers
and slots match; the broken edit exhibits the intended bug; references pass;
documented equivalents pass; each language has enough distinct content. Private
fixture sets define the supported authored behavior, not general language correctness.
If a constant such as Java `4` is only equivalent for fixed-size inputs, state that
restriction in the puzzle and do not claim it works for arbitrary array lengths.

Projections must select fields explicitly, not spread a private definition and
then delete a few secrets. Public state may contain panel ID/title/language;
the Spec Holder receives only its brief/checklist; the Programmer receives locked
context, slot IDs, grammar summaries and its initial edits. Neither player receives
references, accepted-answer sets or private fixtures. The host receives aggregate
metadata, not either private role's content. Keep bug explanations for results in
Phase 6. Never include tokens in any public or role-content broadcast.

Suggested small boundaries: `selectPanels(language, panelCount)` returns distinct
definitions; separate projection functions return the permitted fields for each
role. Keep the private selection in the owning room, keyed by its `roundNo`, and
reuse it on resume. A snapshot or heartbeat must not reroll panels. Prepare and
validate selection before committing `startRound` to `inRound`; a catalog failure
must leave the lobby unstarted. Do not add private definitions to public `getState`.

### Slot grammar and checker behavior

Use the existing bounded grammar as the starting contract. Individual puzzles
enable only the productions they need; showing a language name does not enable
its complete syntax.

```text
operator  := "==" | "!=" | "<" | "<=" | ">" | ">="
integer   := "0" | [1-9][0-9]*
boolean   := "true" | "false"
expr      := term (("+" | "-") term)*
term      := integer | atom | "(" expr ")" | index
index     := "values" "[" ("0" | "1") "]"   (Python example only)
atom      := an exact identifier explicitly allowed by this puzzle
bare-expr := an allowed atom; optional surrounding parentheses only if documented
```

Integer literals have no signs, leading zeros, decimal points, suffixes or hex.
Negative fixture input values are separate from editable literal syntax. Ignore
whitespace between tokens; reject newlines/indentation edits. `a.length` can be
one explicitly allowed Java atom; that does not permit arbitrary member access.
Python's example permits `values` only as the base of its index terms, not a bare
list expression. Boolean spelling is language-specific if a puzzle enables it
(Python uses `True`/`False`); the expression examples below do not require booleans.

| Language/example | Correct and equivalent | Supported but incorrect | Unsupported |
| --- | --- | --- | --- |
| Java: `i <= [[bound]]`, with comparison slot `[[cmp]]`; allow `a.length` | `bound=a.length - 1`, comparison `!=`; spacing variants. `bound=4` only for an explicitly fixed-size-5 panel | `bound=a.length`, `a.length + 0`, or comparison `==` | `a.size()`, `equals`, unlisted `arr.length` |
| C++: `i < [[limit]]`, comparison with `[[target]]`; each slot allows `integer` or one parenthesized integer | `limit=5`, `target=42`; `(5)`, `(42)`, surrounding spaces | `limit=6`, `target=43` | `0x2A`, `42u`, `42L`, `0b101010` |
| Python: `total = [[expr]]` | `values[0] + values[1]`, reversed addition, `(values[0]) + values[1]` | `values[0] - values[1]` | `sum(values)`, methods, f-strings, conditionals, newlines |

C++ fixtures use signed arithmetic; unsigned
comparisons and overflow behavior are outside these starter examples. Declare a
numeric domain per behavior model so JavaScript number behavior cannot silently
stand in for different Java/C++ semantics.

Recommended parser bounds for review: at most 128 tokens and 16 nested parentheses
per slot, in addition to the existing 1 KiB slot-text contract. Exceeding an edit
bound returns `unsupported_edit`. Bound trusted fixture loops as well; do not use
a submitted loop limit to run unchecked iterations. A timer or `Promise.race`
cannot interrupt a synchronous infinite loop, so elapsed-time checks alone are
insufficient. The 2-second soft threshold is feedback, not a wrong answer; crossing
the 5-second hard budget is `checker_failure`. A genuinely preemptive runner would
be a separate design change, not an implicit promise of this bounded model.

Suggested pure boundary: `checkPanel(panel, edits)` returns a `CheckerVerdict` with
`category` and a safe `normalizedMessage`. Its Phase 3 categories are `correct`,
`incorrect`, `unsupported_edit`, or `checker_failure`. Validate the complete slot
set, parse supported syntax, and evaluate trusted behavior against private fixtures.
Never decide correctness by comparison with just one reference string. An authored
candidate running outside the modeled array range is incorrect; a broken fixture
or unexpected internal exception is a checker failure. Do not expose stack traces,
references or private expected values in the player message.

### Submission and delivery contract

Retain the current version-1 envelope. Proposed client action:

```text
type: submit_check
roomId / roundNo: current bound room and round from the envelope
payload: { panelId: string, checkId: string, edits: Record<slotId, string> }
```

The envelope's `id` correlates this transport request; `checkId` identifies the
logical submission for later round deduplication. Recommend the same bounded ID
syntax as request IDs: 1–128 letters, digits, underscores, periods or hyphens.
Clients send neither participant IDs nor roles, full replacement source, reference
solutions or fixture data. Language comes from the selected server panel. Require
exact slot IDs and string edits, each at most 1 KiB in UTF-8; keep the existing
32 KiB frame limit and rate checks. Oversized text is `payload_too_large`.
Reject unexpected top-level payload fields.

Route through `boundState` first. Require the authenticated Programmer, phase
`inRound`, a panel selected for this room/round, and a well-shaped payload. Return
`wrong_role` for host/Spec Holder submissions, `stale_round` for old rounds, and
`bad_request` for invalid panel/slot identities or malformed payloads. Unsupported
syntax within a structurally valid edit produces an `unsupported_edit` check result.
No rejected request may alter another room or reveal whether its private panel exists.

Allow one check in flight per room; a different overlapping submission receives
`check_busy` and no chance cost. Release this guard after success, rejection,
timeout or internal failure. A same-socket identical retry within the existing
cache window receives its cached reply. Phase 3 has no chance/progress side effects;
round-wide deduplication must be added before Phase 4 introduces those effects.
If the identical same-socket request is repeated while still pending, let it use
the original completion; do not cache a `check_busy` error over that original
request ID. Changed content under a pending ID must be rejected without replacing
the original reply. Cover these pending-request cases in the socket tests.

Return a correlated private `check_result` to the Programmer:

```text
{ panelId, checkId, requestId, category, normalizedMessage, chanceConsumed: false }
```

`timeout_rejected` remains reserved for Phase 4's round deadline; do not invent a
countdown in Phase 3. All Phase 3 check results set `chanceConsumed: false`, including
incorrect answers. A checker failure must be visibly distinguishable from an
incorrect answer. Infrastructure failure never becomes a lost chance later.

Extend each recipient's existing `roleView` with its explicit panel projection on
start, in-round resume and relevant room snapshots. Preserve existing role/title/
instructions fields while the shells still use them. Do not broadcast the same
private content to everyone or put it in a general public lobby snapshot. Extend
`lobbyClient.ts` to retain that projection and send submissions using its current
connection. Existing lobby payloads and lifecycle checks must continue to work.

### Manual implementation order and completion checks

1. **Model one puzzle.** Start with the Python exercise below. No socket changes.
   Check its type, fixture expectations and intended field visibility before moving on.
2. **Project private data.** Write a failing test that proves the public/host view
   contains no secrets, Spec Holder sees only its instructions, and Programmer sees
   its code/slots. Implement the smallest explicit projections that pass it.
3. **Check one grammar/model.** Write correct, equivalent, incorrect and unsupported
   tests first. Implement the bounded parser and trusted fixture model. Include
   malformed values, unknown atoms, token/depth limits and internal model failure.
4. **Cover all content.** Expand to Java and C++ and at least five distinct panels
   each. Test every panel's broken edit, reference and documented equivalents.
   Verify selection for every count 2–5 in each language, with no duplicates.
5. **Bind real room content.** Add stable selection to the existing start boundary
   and deliver private projections. Test failed preparation leaves the lobby intact,
   repeated snapshots/resume preserve selection, and rooms remain isolated.
6. **Expose real submissions.** Add the action/client types and socket tests. Prove
   wrong-role, wrong-room, stale-round, malformed/oversized, concurrent and internal-
   failure paths, including busy-guard cleanup. No timer or chance logic yet.
7. **Verify and record.** Run the commands below, review the diff, update the status
   and evidence in this file, and make the phase commit only after its checks pass.
   Suggested subject: `feat(altc4): add multilingual puzzles and server checking`.

Before claiming Phase 3 complete, all catalog/projection/checker tests must pass;
real socket submissions must exercise all three languages; private sentinels in
fixtures/references must be absent from other-role messages and frontend bundles;
both Vite servers must deny the private data path; existing lobby/browser behavior
must still pass. Inspect both private message contents and public broadcasts.
Record failures or missing evidence; do not count a data file or static preview as T6.

## Your first implementation exercise

Create only `games/altc4/data/puzzles.ts`. Sketch the type and a Python panel whose
locked template is `total = [[expr]]`. Include one initial broken expression, a
brief/checklist, the exact allowed expression grammar, reference edits, fixtures
and the original-bug explanation. Decide which fields are public, role-private
and server-only before implementing projection functions.

Use fixtures `[2, 3] → 5`, `[0, 4] → 4`, and `[-2, 5] → 3`. Explain why subtraction
is wrong, reversed addition is equivalent, and `sum(values)` is unsupported. These
varied inputs prevent a constant result from accidentally looking correct.

Check the standalone file using the already installed compiler:

```sh
./node_modules/.bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module Node16 games/altc4/data/puzzles.ts
```

This proves its types, not its puzzle behavior. Review your data/visibility choices
before continuing to the first failing projection test. The intended learning flow
is your attempt, focused review and hints, then the next small step; no complete
parser implementation is supplied here.

## Existing code and data flow

| Existing source | Responsibility |
| --- | --- |
| `apps/host/scripts/altc4-host-adapter.js`, `altc4-host-entry.tsx` | Mount/unmount one React root beside the existing Vite/Tauri menu; hide/restore menu |
| `apps/player/main.tsx` | Live join entry or explicit static mockup route |
| `games/altc4/ui/LobbyScreens.tsx` | Host/player connection ownership and replaceable lobby/role-shell presentation |
| `games/altc4/ui/lobbyClient.ts`, `lobbyProtocol.ts` | Correlation, heartbeat, per-tab session resume, rendering state and public types |
| `server/index.js` | HTTP `/health`, built player assets, `/ws`, input limits, identity binding, replies/broadcasts and shutdown |
| `games/altc4/server/lobby.ts` | In-memory room/participant/configuration/role/readiness/start rules |
| `games/altc4/ui/MockupApp.tsx`, `mockup.css` | Static host/manual/editor studies and shared visual styling |
| `tests/altc4/*.test.cjs`, `scripts/altc4-*.cjs` | Backend tests, smoke checks and browser QA |

Trace **Apply settings**: `HostRoom` calls `LobbyClient.setConfig`; `request` adds
an ID and current room/round. The server validates the envelope, rate and retry
cache; `boundState` verifies room/round/socket ownership. `LobbyRegistry.setConfig`
validates host permission and values, and clears readiness if settings change.
A correlated reply plus recipient-specific broadcasts update the client snapshot
and React screens. UI hiding is never authorization.

Currently `startRound` only enters `inRound` and increments `roundNo`; `RoleShell`
explicitly says gameplay is unavailable. `games/altc4/data`, `host` and `player`
are placeholders; actual views live in `ui`. `shared` and `server/networking` are
also placeholders. The old `server/rooms/index.js` is not this registry, and
`games/altc4/scripts/index.js` merely logs a message. Do not create parallel rules
there. Keep unrelated CodeBlock/TypeByte code and the teammate's final lobby intact.

Adopted integration: root npm workspaces and one root lockfile, React/TypeScript
frontend through Vite, shared Tailwind source scanning, and separate CommonJS
server TypeScript compilation. Frontend checking emits nothing; server output is
generated in `dist-server`. Both Vite configs deduplicate React and allow only
their app directory, shared `ui` and dependencies for development file access.
Private puzzle files must never enter a frontend import graph or static directory.
CodeMirror 6 remains planned, not installed. Java/C++/Python are puzzle languages;
TypeScript is the implementation language.

## Current lobby and protocol contract

One room has one host slot and at most two player slots. Six-character join codes
are unique among live rooms and generated without ambiguous `0/O/1/I`. The server
assigns the first player's role randomly on join, and the second receives the
complement. Participants have stable server IDs; callers never authenticate by
supplying a participant ID. Configuration is host-only. Starting requires a
connected host and two connected, ready players; repeated start cannot increment
the same round twice. Changed configuration clears player readiness.

`LobbyState` contains room ID/code/join URL, phase, participants, config,
`canStart`, `startBlockedReason`, and nullable round number/outcome. Participants
include ID, display name, slot, role, connection and readiness. See the actual
types in [lobbyProtocol.ts](../../games/altc4/ui/lobbyProtocol.ts) and
[lobby.ts](../../games/altc4/server/lobby.ts) for current field shapes.
The final lobby should render this state and invoke actions without duplicating
roles, readiness, start eligibility or round rules. Public state/actions must remain
independent of React/DOM. `returnToLobby` and `leaveRoom` are future actions;
current `stop()` only closes the client and retains its resume credential.

Envelope: `{ v: 1, id, type, roomId, roundNo, payload }`. Current handshakes use
empty `roomId` and `roundNo: 0`; bound requests carry the actual room/current round.

| Current client message | Reply and effect |
| --- | --- |
| `create_room {displayName}` | `room_created`: new host identity, private credential, room state and role shell |
| `join {joinCode, displayName}` | `joined`: private player identity/credential and room state; no extra identity fields accepted |
| `resume {resumeToken}` | `resumed`: same participant, rotated credential, lobby state and role shell; invalid token returns `invalid_resume_token` |
| `set_config {durationSec?, panelCount?, language?}` | Correlated `lobby_state` plus broadcast; host-only validated partial patch |
| `set_ready {ready}` | Correlated `lobby_state` plus broadcast; own readiness in lobby |
| `start_round {}` | `round_started` with nested lobby state/own role view, then lobby broadcast |
| `heartbeat {}` | `heartbeat_ack` with server time |

Replies/errors echo `payload.requestId`; lobby broadcasts place state directly in
the payload, while handshake/start replies nest it in `payload.lobbyState`. Each
recipient additionally receives its own `roleView`. Resume currently restores
identity, not drafts/time/chances. A valid replacement supersedes the old socket;
the old socket receives `unauthorized/session_taken_over` and closes. Removing its
ownership first prevents its delayed close from disconnecting the replacement.

Credentials are 32-byte random secrets stored in this tab's `sessionStorage` and
rotated on every successful resume. Never broadcast/log them. Invalid-token errors
clear stale room/role/session state. The supplied client reconnects to obtain state;
it does not automatically replay mutations. Plain-HTTP request IDs work without
`crypto.randomUUID`; token generation remains cryptographically random on the server.

Operational defaults: 500 rooms, 200 active sockets, 32 KiB accepted frame size,
200-character display names, 10 messages/second/socket including retries, an
absolute 10-second unbound handshake deadline, and a 128-response cache per socket.
Cached identical requests return the same reply; changed content under a cached
ID is rejected. Old/other-socket IDs have no exactly-once guarantee. Heartbeats
run every 10 seconds; server inactivity handling marks reconnecting at 30 seconds
and disconnects at 45. Closing a bound socket updates connection state immediately.
These connection indicators currently do not pause a round.

Typed errors include `bad_request`, `unauthorized`, `wrong_role`, `room_full`,
`stale_round`, `not_joinable`, `rate_limited`, `invalid_resume_token` and
`payload_too_large`. Gameplay reserves `check_busy`, `round_terminal`, `round_paused`
and `unsupported_edit`. Error payloads contain code, message, retryable and optional
request ID. Do not expose internal exceptions.

## Later phases and round contract

These are future requirements and provisional ordering/default decisions, not
implemented functionality. Keep their updates in this document.

### Phase 4: timer, chances, panels and outcomes — T2/T7

Depends on Phase 3's genuine checker results. Add `games/altc4/server/round.ts`
and `tests/altc4/round.test.cjs`; extend the existing registry, transport, public
types/client and plain round views. The server owns one monotonic deadline, panel
state, shared chance pool and terminal transition. A proposed shared pool of three
chances interprets the confirmed three-chance requirement; confirm its scope.
Public ticks carry remaining time at least four times/second; clients render it.

Preserve the recorded ordering rules:

- Time continues during checking. A result is authoritative only if it completes
  strictly before expiry; at/after expiry discard it as `timeout_rejected` without
  defuse or chance cost. Do not extend the deadline to wait for a checker.
- Implement round-scoped `checkId` deduplication before any chance/progress mutation.
  Only a checked `incorrect` result costs one chance. Malformed/unsupported input,
  internal failure, duplicate/late submission and timeout rejection cost none.
- Pause freezes remaining time and rejects new checks as `round_paused`. Buffer a
  pending result; on resume apply it only to the same round/panel revision if it
  has not been superseded, then apply deadline rules using the restored deadline.
  Discard buffered work when the round ends.
- Defuse only when every required panel is solved before expiry; detonate at zero
  time or zero chances. One terminal outcome per round; reject further mutations
  and stale-round actions. Solved-panel resubmission never spends another chance.

Planned public state adds remaining time, chances and panel summaries
`{panelId,title,language,state,solvedByRole?,lastResultCategory?}`, with panel state
`locked|active|solved|failed`. Private views retain role-only content and drafts.
Planned messages include `state_tick`, `panel_update`, `round_paused`,
`round_resumed`, `round_ended` and `results`; client actions include `pause`,
`resume_round` and `return_to_lobby`. Add explicit wire shapes when implemented.
Test controlled time, duplicate/solved/stale submissions, checks racing expiry,
pause ordering, consistent broadcasts and exactly-once outcomes, then a live round.

### Phase 5: complete gameplay screens — T3/T4

Depends on real content/round state and visual review. Suggested new modules under
`games/altc4/ui`: `HostRound.tsx`, `SpecHolderRound.tsx`, `ProgrammerRound.tsx` and
`CodeEditor.tsx`. Extend `LobbyScreens.tsx`, shared styles and browser checks.
Use the playful retro pixel-art workshop direction; exact palette/assets remain
provisional. Existing warm paper/green/orange mockups are studies, not final artwork.
Keep code and mobile paragraph text at least 14px with internal code scrolling.

Finish the host's shared bomb view, private brief/checklist, constrained editor,
panel navigation, real checking/error/paused feedback, time and chances. Introduce
CodeMirror only here when needed, with setup/update/cleanup. Ticks must retain draft,
focus, selection and undo. Check pasted locked-code edits, keyboard usability,
privacy, phone layouts and host viewing distance. Update `altc4:test` explicitly
when adding UI tests; it currently names only the host lifecycle file. Active-panel
highlighting is desired; a readable shared bomb view and multi-panel play are required.

### Phase 6: recovery, results and lobby replay — T8

Depends on Phases 2–5. Extend the registry, round rules, transport and client;
add a results view and recovery/replay tests as needed. Disconnect pauses the
round; proposed grace is 45 seconds, then abandonment. Restore identities, roles,
remaining time, chances, solved panels and editable work. Settle seat/room retirement,
lost token-rotation replies and explicit leave/new-invite precedence.

Results explain the actual original bugs. Target lifecycle is
`lobby → starting → inRound → results → lobby`; current code skips `starting`.
Keep room/participants across replay, allow manual role/configuration changes,
reset round drafts/chances/time/results, clear obsolete private client content,
and reject prior-round messages or delayed check results. No automatic role swap
or automatic next round. Test disconnecting every station, pending checks, grace
expiry, repeated resume and replay with changed roles/settings.

### Phase 7: integration and demonstration

Depends on Phases 1–6. Run full verification, review privacy/room isolation and all
languages, and rehearse the native host with two intended physical player devices
on the chosen LAN/HTTPS/WSS endpoint. Check timing, outcomes, recovery, replay and
readability; compare the teammate's final lobby to the boundary when available.
Record setup/recovery steps and actual evidence here. Browser contexts do not
substitute for hardware rehearsal. Regression reopens the affected task.

### Phase 8: optional chat — T5

Implement only after an explicit scope decision about audience and history.
Extend the existing room-scoped transport, types/client and UI with bounded safe
text rendering. Test isolation, reconnect/history, replay reset and gameplay impact.
Chat remains unimplemented and is not counted as a completed task.

## Run and verify

Use Node 24 and the root npm workspaces. Install with `npm ci` when needed; do not
overwrite someone else's pending dependency edits merely to restore an old baseline.
From the repository root:

```sh
npm run altc4:server:start
```

That builds server TypeScript and the player frontend, then starts the backend at
`http://localhost:3000`. In another terminal run `npm run host:dev`; open its printed
Vite URL, choose **Open Alt+C4 host lobby**, enter the backend address and create
a room. Two player browser contexts use the displayed join link/code, enter names
and mark ready. Configuration changes require renewed readiness before host start.

For LAN use, replace the example address with the host's reachable address:

```sh
PORT=3000 ALTC4_BACKEND_BASE_URL=http://192.168.1.20:3000 npm run altc4:server:start
```

Use that backend origin in the host form. HTTP maps to WS, HTTPS to WSS at `/ws`;
the player uses its serving origin unless explicitly configured or resuming a saved
endpoint. Localhost links are only suitable for the same machine. Native rehearsal
also needs the platform's Tauri/Rust prerequisites and `npx tauri dev` in `apps/host`
with the backend running separately. Native behavior remains unverified.

Static previews: add `?mockup=1` to the host URL, or use the player URL with
`?mockup=1&role=host`, `role=spec-holder` or `role=programmer`. Sample clocks,
checking/paused states and controls do not execute game rules.

Useful checks, from the repository root:

```sh
npm run altc4:server:build
npm run altc4:server:test
npm run altc4:verify
git diff --check
```

The first two compile server rules and collect `tests/altc4/*.test.cjs`. Full
verification runs frontend/server typechecks, server and host/player builds,
Tailwind/CSS smoke, host lifecycle, CommonJS smoke, backend tests, static viewport
QA and live multi-context lobby QA. Install Playwright Chromium if missing with
`npx playwright install chromium`; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select
an existing executable. Network/browser checks require local connection access.
`artifacts/altc4`, app `dist` directories and `dist-server` are generated output,
not sources to commit. Future privacy tests must check both dev access and bundles.

After each implemented phase: review task/acceptance status and the full diff;
run its checks; update this file with evidence, limitations and the next action;
confirm `ALTC4-jeff`; stage only relevant files and inspect the staged diff;
commit locally only at a truthful checkpoint. Do not create another branch/worktree,
push, merge or deploy without a new instruction. Preserve unrelated working changes.
No parallel implementation agents are needed for the user's manual learning flow.

## Known limitations and evidence

Confirmed limits: all rooms/credentials disappear on backend restart; disconnected
seats and rooms do not retire automatically; the 500-room cap can eventually fill;
a lost successful token-rotation reply can strand an identity. A valid saved
session overrides a different invite in the same player tab, as reproduced during
the November 18 review. Use a browser context without a saved session to join a
different room for now; a new tab opened by another tab can inherit its session.

Possible concerns: the client only partially validates incoming JSON shape, and
frontend/server lobby types are maintained separately. Neither was reproduced as
a failure in the recorded supported flows. Dense JSX/transport logic can be hard
to follow; retain concise function comments and extract modules only for a clear
new responsibility. Do not treat frontend type assertions as runtime validation.

Historical verification on November 18, 2026 passed before and after cleanup:
both typechecks and production builds, shared CSS smoke, one host lifecycle test,
CommonJS smoke, 16 backend tests (8 acceptance, 4 adversarial, 4 limits), and static
and live browser flows. Viewports were 390×844 and 1280×720. Live checks covered
configuration, readiness/start, complementary roles, capacity/authorization,
reload resume, invalid-token clearing and the missing-`randomUUID` fallback.
Both Vite servers previously denied the private data path. An initial restricted
test invocation failed with loopback `listen EPERM`; the authorized rerun passed.
That evidence is historical, not a fresh claim about pending dependency changes.

The November 19 update only consolidates documentation and specifies Phase 3.
It does not implement Phase 3 or change any task status. Old agent-session/billing
logs, repeated planning audits and intermediate test counts were removed from the
maintained docs; Git history retains them. Credit savings were never established.
Record future results in this section instead of creating another status/report file.

Documentation checks on November 19 passed: maintained links/section anchors,
code-fence balance, removal of stale document references and `git diff --check`.
Pre-existing `.gitignore` and `package-lock.json` edits were preserved byte for byte.
Application tests were not rerun for these documentation/comment-only edits.
