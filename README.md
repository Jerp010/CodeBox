# CodeBox

CodeBox is a multiplayer programming game being developed for a school demonstration. A desktop host chooses a game, and players join from their browsers using a link, QR code, or room code.

## Current status

The project is being reorganized. The Tauri host contains an early menu and a visual CodeBlock lobby with example players. The three game folders currently contain starter scripts. The shared server is not yet runnable: `server/rooms/index.js` contains a room ID utility and disconnect-handler registry, but room creation, networking, and game sessions still need to be implemented. The browser player app is not built yet.

The root package retains dependencies from the earlier project for future backend work. Its former server and question-validation commands referred to removed files and have been removed. The `.env.example` file is a reference from that earlier server, not a working configuration for CodeBox yet.

## Planned game modes

- **CodeBlock:** A multiple-choice code quiz with timed scoring, question twists, explanations, and leaderboards. Up to eight players.
- **TypeByte:** A cooperative typing challenge with bosses, player health, and a shared timer. Up to eight players.
- **Alt+C4:** Two players take different roles to solve predefined, constrained code challenges before time or chances run out.

## Planned architecture

A separate computer runs one shared backend for several desktop hosts. The backend manages rooms, serves the player browser app, runs the game rules, and communicates with hosts and players over WebSockets. Each desktop host controls one active room; rooms must remain isolated from one another.

One ngrok endpoint is planned for the shared backend. The player-facing domain opens the join page. When a host creates a room, the server will generate a room code; the host will show it alongside a link and QR code. The direct link can include the room code, while players opening the join page can enter it manually. Automatic tunnel startup, room creation, and joining are not implemented yet.

The server will be responsible for validating game actions, tracking state and timers, and sending each client only the information it needs. Disconnected players should be able to resume their room within a grace period. The duration, host-disconnect behavior, simultaneous-room target, and behavior after a server restart remain to be decided.

## Project structure

```text
CodeBox/
├── apps/
│   ├── host/                 Tauri desktop app and shared host screens
│   └── player/               Planned browser player app
├── server/
│   ├── rooms/                Room utilities; room management is planned
│   └── networking/           Planned shared WebSocket layer
├── games/
│   ├── codeblock/
│   ├── typebyte/
│   └── altc4/
│       ├── host/             Game-specific host screens
│       ├── player/           Game-specific player screens
│       ├── server/           Game rules, state, and scoring
│       ├── data/             Game content, including server-only answers
│       └── scripts/          Existing starter script
├── shared/                   Planned shared message definitions/utilities
└── docs/                     Space for project and technical documentation
```

Each game folder has the same `host`, `player`, `server`, and `data` subfolders. Empty folders are tracked for future work; they don't indicate that a feature is implemented. Keep private answers and role-specific information on the server, and send only the appropriate information to each client.

## Run the host frontend

Install Node.js and npm, then from the repository root:

```bash
npm --prefix apps/host ci
npm run host:dev
```

Open the URL printed by Vite. To make a production frontend build:

```bash
npm run host:build
```

For the native desktop app, install the platform prerequisites for Tauri and Rust, then run:

```bash
cd apps/host
npx tauri dev
```

The host is still a prototype; running it does not start a backend, create a room, or expose an ngrok link.
