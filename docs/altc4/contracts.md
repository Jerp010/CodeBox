# Alt+C4 Phase 1 contracts: room, protocol, lobby, checking

**Status:** Phase 1 contract proposal. The confirmed brief's experience rules are
user-approved; everything marked **[provisional]** is a development ruling made
under the delegated Phase 1 handoff, adopted now so Phase 2 has concrete
interfaces, and remains changeable at review. Do not present provisional items as
user-approved. Phase 2+ must not implement network/room logic from this document
alone without that review. Companion Phase 1 artifacts: `progress.md` (ledger),
mockups and the integration spike (separate deliverables).

## 1. Room and identity

- One room = one desktop host + exactly two player slots. Game roles are state,
  not join slots.
- `roomId`: server-generated opaque string, stable across replay. Join code:
  6 uppercase alphanumerics excluding ambiguous `0/O/1/I`; unique among live rooms.
- `participantId`: server-assigned only, never accepted from a client. Stable for
  the socket session; reconnect uses the privately issued `resumeToken`.
- `resumeToken`: 256-bit random secret issued privately by the server exactly once
  per participant (host on `create_room`, players on successful `join`), never
  broadcast, never logged, never included in lobby/public state. Rotated on each
  successful resume. Client stores it for reconnect only.
- Slot occupancy: `host` ≤ 1, players ≤ 2. Third player, duplicate identity, and
  cross-room actions are rejected with a typed error; no state mutation.
- Room lifecycle: `lobby → starting → inRound → results → lobby`.
  Replay re-enters `lobby` keeping `roomId` and participants; round-scoped state
  (drafts, chances, timer, panel results) is discarded at `results → lobby`.

## 2. Roles and permissions

| Role | Sees | May do |
| --- | --- | --- |
| Host | shared bomb/workbench view, participants, config, readiness | edit config in lobby, start round, pause/resume, end round, return to lobby |
| Spec Holder | private brief, checklist, timer, chances | mark checklist items locally; read-only otherwise |
| Programmer | panel navigation, locked context, editable slots, timer, chances | edit allowed slots, submit a check per panel |
| Lobby owner (other programmer) | lobby state per §4 | create/join/config/start/return, never game rules |

Rejections are server-side and role-scoped. Client UI hiding is not a control.

## 3. Lobby contract (framework-independent)

The teammate's lobby and the placeholder consume this same boundary: plain data
plus callbacks, no React/DOM types.

```ts
type PuzzleLanguage = 'java' | 'cpp' | 'python';
interface LobbyState {
  roomId: string; joinCode: string; joinUrl: string;
  phase: 'lobby' | 'starting' | 'inRound' | 'results';
  participants: Array<{
    participantId: string; displayName: string; slot: 'host' | 'player';
    role: 'host' | 'specHolder' | 'programmer' | null;
    connection: 'connected' | 'reconnecting' | 'disconnected';
    ready: boolean;
  }>;
  config: { durationSec: number; panelCount: number; language: PuzzleLanguage };
  canStart: boolean; startBlockedReason: string | null;
  round: { roundNo: number; outcome: 'defused' | 'detonated' | null } | null;
}
interface LobbyActions {
  setConfig(patch: Partial<LobbyState['config']>): void; // host only
  setReady(ready: boolean): void;                        // self
  startRound(): void;                                    // host only, needs canStart
  returnToLobby(): void;                                 // host only, from results
  leaveRoom(): void;
}
interface LobbyCallbacks { onChange(state: LobbyState): void; onError(e: LobbyError): void; }
```

Replacement rule: swapping lobby presentation changes only rendering of
`LobbyState`/`LobbyActions`; it must not re-implement role assignment, readiness,
start permission, or round rules. One `language` per round matches §6; there is
no per-panel or `languages` array in this contract.

## 4. Protocol envelope and handshake

Transport: one WebSocket per client, same backend endpoint as player HTTP assets.
Envelope (JSON), server and client both use it:

```ts
interface Envelope<T = unknown> { v: 1; id: string; type: string; roomId: string; roundNo: number; payload: T; }
interface ErrorPayload { code: ErrorCode; message: string; retryable: boolean; requestId?: string; }
type ErrorCode = 'bad_request'|'unauthorized'|'wrong_role'|'room_full'|'stale_round'
  | 'not_joinable'|'rate_limited'|'check_busy'|'round_terminal'|'round_paused'
  | 'unsupported_edit'|'invalid_resume_token'|'payload_too_large';
```

Handshake, before any room state is delivered:

- `create_room { displayName }` → `room_created { roomId, joinCode, joinUrl,
  participantId, resumeToken, lobbyState }`. Host only; `resumeToken` is in the
  private reply payload, not in `lobbyState`.
- `join { joinCode, displayName }` → `joined { roomId, participantId,
  resumeToken, lobbyState }`. Unauthenticated join accepts **only** `joinCode` and
  `displayName`; the room is resolved from `joinCode` and then bound to the socket.
  Clients never send `roomId` or `participantId` for authentication; after binding,
  room identity is inferred from the socket and `participantId` is server-side.
- `resume { resumeToken }` → `resumed { roomId, participantId, resumeToken, role, roundNo,
  remainingMs, chancesRemaining, drafts, lobbyState }`. Invalid/expired token →
  `invalid_resume_token`, socket not bound, no state returned.
- Duplicate/resume takeover: if a live socket already exists for the same
  participant, the new valid `resume` supersedes it — old socket receives
  `error{code:'unauthorized', message:'session_taken_over'}` and is closed; the
  newest socket owns the participant. Repeated resumes rotate the token and keep
  the same `participantId`. Invalid tokens never displace a live socket.
- Request correlation: every client message carries a unique `id` (UUID or
  `crypto.randomUUID`); every response/error echoes it in `payload.requestId` or
  the envelope. One outcome per `id`; duplicates of the same `id` are answered
  idempotently without re-applying effects. `id` is required on all messages;
  missing/duplicate-in-flight ids are `bad_request`.
- Payload limits: 32 KiB per frame (reject larger → `payload_too_large`, no
  processing), 200-char display names, one editable-slot text ≤ 1 KiB per panel,
  ≤ 10 messages/s per socket (`rate_limited` without state change).
- Heartbeat: server sends a protocol ping every 10 s if no message was sent;
  clients must `heartbeat` at least every 15 s or be marked `reconnecting`
  after 30 s and disconnected after 45 s. A round pauses on disconnect per §7.
- Connection state changes are broadcast in `lobby_state` and `state_tick`.

Client → server: `create_room`, `join`, `resume`, `set_config`, `set_ready`,
`start_round`, `submit_check`, `pause`, `resume_round`, `return_to_lobby`,
`heartbeat`.
Server → client: `room_created`, `joined`, `resumed`, `lobby_state`,
`round_started`, `state_tick`, `check_result`, `panel_update`, `round_paused`,
`round_resumed`, `round_ended`, `results`, `error`, `heartbeat_ack`.

The server is authoritative; clients never compute outcomes from clocks.

## 5. Public vs private payloads

Public (all room clients): `roomId`, `phase`, `roundNo`, participants with slot,
role, connection, ready; config; aggregate `timeRemainingMs`; `chancesRemaining`;
`panels: [{ panelId, title, language, state: 'locked'|'active'|'solved'|'failed',
solvedByRole?, lastResultCategory? }]`; outcome. `resumeToken` is never public.
Private Spec Holder: full brief text, checklist items, the bug narrative, timer,
chances. Never the answer, never editable reference code.
Private Programmer: locked context per panel, editable slot ids with grammar
summary, per-panel drafts, own `check_result` detail, timer, chances.
Never sent to any client: reference solutions, accepted-token sets beyond the
shown grammar, checker fixtures, other player's drafts or brief fragments,
cross-room data. `games/altc4/data/` server-only material is excluded from both
frontend dependency graphs and static paths.

`check_result` payload: `{ panelId, checkId, requestId, category: 'correct'
|'incorrect'|'unsupported_edit'|'checker_failure'|'timeout_rejected',
normalizedMessage, chanceConsumed: boolean }`. Infrastructure (`checker_failure`)
must never be rendered as a wrong answer.

## 6. Defaults **[provisional — development rulings, changeable at review]**

| Item | Adopted default | Rationale |
| --- | --- | --- |
| Chances | one shared pool of 3 for the whole bomb | brief's leading interpretation |
| Duration | 300 s, host range 120–900 s, 30 s steps | demo pacing |
| Panels | 3, host range 2–5 | see content requirement below |
| Language selection | one language per round, host-chosen; all panels use it | bounds checking scope |
| Starter content | **≥ 5 panels per language** (Java, C++, Python) | must satisfy max panel count in every language |
| Checking time | 2 s soft / 5 s hard timeout, one in-flight check per room | prevents overlap ambiguity |
| Disconnect | round pauses immediately, 45 s grace, then abandonment | co-located demo |
| Reconnect | `resumeToken` restores role, drafts, chance/panel state | brief requirement |
| Replay | manual return to lobby; no auto role swap | brief supersedes auto-swap |
| Late/duplicate submit | ignored with `round_terminal`/`check_busy`; never costs a chance | review focus 1 |

## 7. Timing and check ordering

1. Server owns a monotonic deadline; ticks broadcast `timeRemainingMs` ≥ 4×/s.
2. **Completion must precede the deadline.** Time continues while a check is
   pending, but a result is authoritative only if it completes strictly before
   the deadline. A result arriving at or after the deadline is discarded:
   expiry wins, the check cannot defuse or consume a chance, and the client sees
   `timeout_rejected`. The server never extends or waits past the deadline for
   an accepted check; the terminal transition is not delayed for pending work.
3. Pause ordering: `pause` freezes the clock and records
   `savedRemainingMs`; acceptance of new submissions stops (`round_paused`, no
   chance cost). An in-flight check is not cancelled: its result is buffered and
   applied **on resume**, and only if it is still current (same `roundNo`, same
   panel revision, and not superseded by a later accepted result). It then obeys
   rule 2 against the restored deadline computed from `savedRemainingMs`.
   Buffered results are discarded if the round ends while paused.
4. Terminal ordering: once `round_ended` is emitted, all further mutations are
   rejected. Exactly one terminal outcome per `roundNo`, emitted once, after any
   results completed before the deadline are folded in. Zero time or zero chances
   → `detonated`; all required panels solved before the deadline → `defused`.
5. Stale `roundNo` messages are rejected, never applied to the new round.
6. Incorrect checked submission consumes exactly one chance; malformed transport
   input, `unsupported_edit`, `checker_failure`, and `timeout_rejected` consume none.

## 8. Bounded checker grammar

Model: authored puzzles expose one or more typed **edit slots** (`[[slot]]`) inside
trusted, locked code. A submission replaces slot ids with text. The server parses
the text against that slot's grammar, applies it to a trusted template, and runs
authored behavior fixtures. No compiler execution and no evaluation of submitted
source in the main process.

Shared slot grammars (annotations adjust surface syntax per language):

```
operator  := "==" | "!=" | "<" | "<=" | ">" | ">="
integer   := "0" | [1-9][0-9]*           (decimal; no sign, leading zeros, float, hex)
boolean   := "true" | "false"
expr      := term (("+"|"-") term)*     (no calls, no attribute access)
term      := integer | atom | "(" expr ")" | index
index     := "values" "[" ("0" | "1") "]"  (Python example only)
atom      := identifier explicitly whitelisted by the puzzle
bare-expr := whitelisted atom only     (optional trimmed-paren acceptance)
```

Rules: the puzzle document lists its allowed atoms per slot (e.g.
`a.length` for Java). An atom not whitelisted by that puzzle → `unsupported_edit`.
Whitespace around tokens is ignored; parentheses are honored only where the
grammar says so. Any other token → `unsupported_edit` (no chance). Grammar-accepted
but behaviorally wrong → `incorrect` (one chance).

### Java (expression slot with whitelisted `a.length` atom)
Locked: `for (int i = 0; i <= [[bound]]; i++) { if (a[i] [[cmp]] b[i]) ... }`
`bound` grammar `expr` with whitelisted atoms `{ a.length }`; `cmp` grammar `operator`.
- Correct: `bound = a.length - 1`, `cmp = "!="` → accepted.
- Equivalent accepted: `bound = a.length-1` (whitespace ignored), and on the
  authored fixed-size-5 fixture `bound = 4` (fixture equivalence set lists 4).
- Incorrect: `bound = a.length` (off-by-one) or `cmp = "=="`.
- Unsupported: `bound = a.size()` (call syntax), `cmp = "equals"`.
  `a.length + 0` is supported syntax with incorrect behavior for the loop bound.
- Documented: `a.length` is whitelisted per puzzle as an atom, **not** general
  member access; `arr.length` on another array name is unsupported.

### C++ (int literal and parentheses)
Locked: `for (int i = 0; i < [[limit]]; ++i) { if (v[i] == [[target]]) ... }`
For this puzzle `limit` grammar is `integer | "(" integer ")"` and `target`
grammar is `integer | "(" integer ")"`, with a fixed authored vector size.
- Correct: `limit = 5`, `target = 42`.
- Equivalent accepted (explicit grammar expansion): `target = (42)` and
  `target = 42 ` (surrounding whitespace) parse to the same value and are accepted;
  so is `limit = (5)`.
- Unsupported, not equivalent: `target = 0x2A`, `42u`, `42L`, `0b101010` — hex,
  binary, and literal suffixes are rejected by the grammar. They are documented as
  unsupported, not as equivalent accepted answers.
- Incorrect: `limit = 6` (reads past authored fixture) or `target = 43`.
- Semantic note: `i < limit` on unsigned is out of scope; slots never host unsigned
  arithmetic and fixtures are signed.

### Python (expression slot, indentation fixed)
Locked: `total = [[expr]]` inside fixed indentation; `expr` grammar as above with
whitelisted atoms `{ values }` only as the base of index terms.
- Correct: `values[0] + values[1]`; `values[1] + values[0]` and
  `(values[0]) + values[1]` are accepted equivalents via the authored fixture set.
- Unsupported: `sum(values)` (call syntax), any newline/indent change, f-strings,
  conditional expressions, method calls.
- Incorrect: `values[0] - values[1]`.

Failure categories everywhere: `bad_request`/`payload_too_large` (transport),
`unsupported_edit` (grammar), `incorrect` (supported, wrong behavior),
`checker_failure` (internal), `timeout_rejected` (completed at/after deadline).
Only `incorrect` consumes a chance. Documented limits: no general-purpose language
support, no arbitrary multi-line edits, no compilation; if a puzzle needs more, the
checking plan must be revised explicitly rather than silently widened.

## 9. Review items

- Chances pool (shared, 3), duration/panel bounds, single round language.
- Disconnect grace 45 s and abandonment behavior.
- Whether any slot grammar above is too narrow for the intended puzzles.
- Visual style, palette, and typography (see mockups; all provisional).

## 10. Phase 2 implementation boundary

- `server/index.js` exports `createServer(options?)`, returning an unlistened Node
  HTTP server. The command-line entry listens only when run directly. HTTP serves
  only `apps/player/dist` and `/health`; WebSocket upgrades use `/ws`.
- `games/altc4/server/lobby.ts` owns the room registry, identities, permissions,
  validated configuration, readiness, initial random roles, and the start gate.
  It is compiled by the separate server TypeScript build, then required by the
  existing CommonJS backend. No puzzle answers, checking, countdown, outcomes,
  replay, or round-recovery state machine is implemented in Phase 2.
- The framework-independent client connection layer translates the protocol into
  `LobbyState` plus actions. The temporary host/player lobby consumes it. Host
  endpoint configuration must support `https` → `wss`; player connections use the
  page's backend origin. Credentials belong to that browser tab's session storage.
- Successful configuration/readiness actions return a correlated `lobby_state`
  reply and broadcast updated state. Correlated replies carry
  `payload.requestId`. Public lobby state fields are directly in the payload;
  handshake/start replies include them as `payload.lobbyState`.
- Each viewer additionally receives only their own `roleView` shell (host,
  Spec Holder, or Programmer); a client's requested role is never authoritative.
  Phase 2 shells explain the assigned role without pretending puzzles exist.
- `start_round` requires a connected host and exactly two connected, ready
  players. It increments `roundNo` once and moves to `inRound`. Phase 2 displays
  that boundary without starting a fake timer or accepting puzzle submissions.
- Changing configuration clears player readiness. Socket close updates connection
  state immediately. Token-based identity resume is exercised in Phase 2; full
  progress restoration, disconnect pausing and abandonment belong to Phase 6.
- The public join URL uses the configured backend base URL and `?code=JOINCODE`.
  Localhost is a local test route. LAN/demo use requires the host's reachable
  backend address; the frontend must expose this configuration clearly.
