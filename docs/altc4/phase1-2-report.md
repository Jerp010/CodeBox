# Alt+C4 phases 1–2 implementation report

Phases 1–2 are implemented and automatically verified on `ALTC4-jeff`. Work stops
before Phase 3. Native Tauri and a physical desktop plus two player devices still
need rehearsal; three isolated browser sessions do not establish that hardware
check. The visual direction remains provisional for user feedback.

Phase 1 is local commit `7b298cf` (`chore(altc4): define design and integration contracts`).
The Phase 2 commit containing this report is `feat(altc4): add room setup and role assignment`.
Nothing was pushed or deployed. The user's original `.superpowers/` and `.specs/`
ignore additions remain unstaged and outside the phase commits.

## Delivered work

### Phase 1

- Documented room identity, role permissions, private/public payloads, lobby actions,
  configuration defaults, timing/check ordering, and bounded checker grammar examples
  for Java, C++, and Python in `contracts.md`.
- Added shared host, Spec Holder, and Programmer interface studies with ready,
  checking and paused previews. Static sample state is explicitly labelled.
- Integrated React/TypeScript through a host mount/unmount adapter and a separate
  player entry. Existing menu behavior is preserved. Root npm workspaces and one
  root lockfile provide a shared React runtime.
- Separated frontend/server type checks and CommonJS server compilation. Both
  production builds demonstrate shared Tailwind source detection.
- Restricted development file serving to public app/UI sources and dependencies.
  Both Vite servers rejected the server-data test path with HTTP 403.
- Inspected desktop and phone-width captures. Corrected tiny mobile code, then
  fixed the resulting grid overflow. Code remains at least 14px and scrolls within
  its panel. These are interface studies, not finished Phase 5 artwork or editors.

### Phase 2

- Added a real shared HTTP/WebSocket backend and in-memory room registry.
- Hosts create rooms with six-character join codes and player links. Two players
  join, receive complementary random roles, and see their own role shell.
- Host-only duration, panel count and language settings synchronize to both players.
  Changing settings clears player readiness. A connected host and two connected,
  ready players are required to start. Repeated start cannot advance the round twice.
- Added capacity, role/room binding, input, message-rate and frame-size checks.
  Resume tokens are privately issued and rotated; an old socket cannot disconnect
  its authenticated replacement. Expired credentials clear stale client state.
- Added per-tab session storage, automatic identity resume, visible connection/error
  states, and request IDs that work when `crypto.randomUUID` is unavailable.
- Kept static previews under `?mockup=1`. Live player views have no role selector.
  Starting opens real assigned-role shells; gameplay is explicitly unavailable.
- Added a fixed 10-second deadline for unauthenticated connections so rejected or
  silent sockets cannot hold connection slots indefinitely.

## Verification evidence

The coordinator ran a clean `npm ci --no-audit --no-fund`, then the final combined
`npm run altc4:verify` after review fixes. Both passed. The local browser run used
the cached Chromium executable through `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`;
fresh machines can install the browser using `npx playwright install chromium`.

| Check | Result |
| --- | --- |
| Frontend and server TypeScript checks | Passed |
| Host and player production builds | Passed |
| Shared Tailwind utility in both production stylesheets | Passed |
| Host open/return/unmount/remount lifecycle | 1 test passed |
| CommonJS loading of compiled TypeScript | Passed |
| Network acceptance | 8 tests passed |
| Adversarial room/identity/request checks | 4 tests passed |
| Input limits and connection lifecycle | 4 tests passed |
| Static mockup browser checks | Three views at 390×844 and 1280×720; checking/paused states checked |
| Live lobby browser flow | Passed with isolated host, two players, and a rejected third player |
| Final diff whitespace check | Passed |

The live browser flow verified a real join URL on the selected backend port,
330-second/four-panel/Python settings synchronized to both players, readiness,
host start gating, exactly one of each player role, unauthorized-action rejection,
reload identity resume, token invalidation returning to the join form, and the
missing-`randomUUID` fallback. Six live lobby captures fit their viewports without
horizontal page overflow. Captures are generated under `artifacts/altc4/`.

Initial network tests failed before the backend existed. The connection-deadline
regression failed before its fix, then passed and demonstrated capacity recovery.
The host mockup route regression also failed before its correction. The asynchronous
readiness control worked; its browser test was corrected to await the server update.

## Review and decisions

A fresh GPT-6.1 Sol reviewer inspected the tracked and new source files. No critical
privacy or room-isolation defect was found in that review. Its findings were handled:

- Fixed indefinite unauthenticated sockets with deadline/cleanup regression coverage.
- Corrected an overbroad request-id promise. Phase 2 caches the last 128 responses
  on the current WebSocket. The supplied client never automatically resends mutations
  across reconnect; it resumes current state and uses fresh IDs for new decisions.
  A custom client replaying an old authorized mutation outside that scope could
  reapply it. The reviewer agreed this bounded contract fits the supplied Phase 2
  client. Phase 4 must implement a round-scoped submission ledger before chances
  or checking exist; the transport cache must not be used for that guarantee.
- Fixed the documented `role=host` mockup route and made browser QA check its initial
  role before changing the selector.
- Corrected the rate-limit regression so it actually reuses one request ID.

Other development rulings:

- Root npm workspaces and a root lockfile were adopted for a shared React runtime;
  the obsolete nested host lockfile was removed. Existing unrelated JavaScript and
  the menu remain. Build or dependency-resolution regressions are the principal risk
  of that choice; clean installation and both builds passed.
- Development defaults are 300 seconds (120–900 in 30-second steps), three panels
  (two–five), and one Java/C++/Python language per round. The proposed shared pool of
  three chances and five starter panels per language remain future gameplay work.
  These choices remain changeable at review; unsuitable defaults would affect pacing
  and the amount of authored content, not an already implemented checker.
- Visual review covered the rendered prototypes; user approval of exact styling and
  the teammate's final-lobby adoption remain outstanding. Presentation can change
  through the documented state/action boundary.
- Developer capacity was not supplied. December 1 remains the project target without
  a new delivery guarantee. No required language or other confirmed feature was dropped.

## Task status and remaining validation

| Original task | Status after this run |
| --- | --- |
| T1 Role Assignment | Implemented; backend and isolated-browser checks passed; native/physical sign-off pending |
| T2 Bomb Timer & Lives | Not started; Phase 4 |
| T3 Spec Holder UI | Live private role shell plus static interface study; gameplay UI remains unfinished |
| T4 Programmer UI | Live private role shell plus static interface study; editor/gameplay UI remains unfinished |
| T5 Text Chat | Optional/pending decision; not implemented |
| T6 Server-Side Checking | Contract/examples only; Phase 3 implementation not started |
| T7 Defuse/Detonate | Not started; Phase 4 |
| T8 Results/Replay | Not started; Phase 6 |

Rooms and credentials are lost on backend restart. Disconnected seat retirement,
abandonment, lost token-rotation replies, full round pause/recovery, replay and editor
persistence require Phase 6's lifecycle policy. Current role shells contain no actual
puzzle secrets, so real puzzle-data privacy still needs Phase 3 checks. Native Tauri,
physical devices, the intended LAN/demo endpoint, and a real HTTPS/WSS endpoint were
not exercised by the localhost browser checks. Those remain rehearsal items.

## Delegation and credit findings

Freebuff's DeepSeek V4.1 Flash Slow session authored the initial contract and eight
network acceptance tests. Its broad first assignment spent several minutes planning
without file changes; narrowing the assignment produced useful output. Coordinator
review corrected contract contradictions and a stale-snapshot test assumption.

Two GPT-6 Luna coding workers handled integration/frontend and backend implementation;
the integration worker reused its context for Phase 2. One GPT-6.1 Sol reviewer
provided the final review and a brief contract-scope clarification. Freebuff was
closed after its tasks, with its conversation saved for reuse.

The Freebuff CLI initially showed five daily hours and four remaining after the active
allocation began. Exact task-level Codex credits, billing and money saved were not
measured; account-wide usage cannot establish this task's cost without a baseline.
My recommendation from this trial is to use Freebuff for small, explicit tasks and
test drafts, lower-cost native workers for implementation, and one focused stronger
review. This run established a working collaboration process; savings remain unmeasured.

## Running the current checkpoint

Use Node 24 and install from the repository root with `npm ci`. Run
`npm run altc4:server:start` in one terminal and `npm run host:dev` in another.
Open the displayed host address, choose **Open Alt+C4 host lobby**, and create a room.
Player browsers use its join link. For a LAN rehearsal, configure
`ALTC4_BACKEND_BASE_URL` with the host computer's reachable backend address and use
that address in the host form. Detailed setup is in the root README and `lobby.md`.

The next implementation phase is Phase 3's authored puzzle content and constrained
checking. It was deliberately left untouched at this stop point.
