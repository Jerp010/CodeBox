// @ts-check

import { LANGUAGE_EXTENSIONS } from "../shared/languages.js";
import "./lobby.css";

// TODO(room-code): replace this static value with the real room code
// that the server generates when the host creates a room.
const ROOM_CODE = "A12SAC";

const PLAYERS_EMPTY_CLASS =
    "mb-[1rem] ml-[3.7rem] mr-[2.36rem] mt-[0.5rem] grid h-[34.8rem] place-items-center rounded-[0.25rem] border border-dashed border-white/25";

const PLAYERS_LIST_CLASS =
    "mb-[1rem] ml-[4.8rem] mr-[2.36rem] mt-[0.6rem] flex h-[34.8rem] flex-col gap-[1.1rem] overflow-y-auto border-l border-white/40 pl-[1.2rem] pt-[0.4rem]";

// How many line numbers the fake "editor" shows (extra ones are clipped).
const LINE_COUNT = 60;

const PS_PATH = "PS C:\\GroupngMasasarap\\softeng\\typebyte";

const MENU_ITEMS = ["File", "Edit", "Selection", "View", "Go", "Terminal", "Help"];

const TERMINAL_TABS = [
  { label: "Problems", active: false },
  { label: "Output", active: false },
  { label: "Debug Console", active: false },
  { label: "Terminal", active: true },
  { label: "Ports", active: false },
];

// The 12 rows of the big TYPE / BYTE logo (box-drawing characters).
const LOGO_LINES = [
  "████████╗██╗   ██╗██████╗ ███████╗",
  "╚══██╔══╝╚██╗ ██╔╝██╔══██╗██╔════╝",
  "   ██║    ╚████╔╝ ██████╔╝█████╗",
  "   ██║     ╚██╔╝  ██╔═══╝ ██╔══╝",
  "   ██║      ██║   ██║     ███████╗",
  "   ╚═╝      ╚═╝   ╚═╝     ╚══════╝",
  "       ██████╗ ██╗   ██╗████████╗███████╗",
  "       ██╔══██╗╚██╗ ██╔╝╚══██╔══╝██╔════╝",
  "       ██████╔╝ ╚████╔╝    ██║   █████╗",
  "       ██╔══██╗  ╚██╔╝     ██║   ██╔══╝",
  "       ██████╔╝   ██║      ██║   ███████╗",
  "       ╚═════╝    ╚═╝      ╚═╝   ╚══════╝",
];

// Text shown after the logo (starts on editor line 13). gold = yellow heading.
const BRIEFING_LINES = [
  { text: "# MISSION BRIEFING", gold: true },
  { text: "" },
  { text: "The system is under attack!" },
  { text: "" },
  { text: "Dangerous viruses have infiltrated the network." },
  { text: "Work together with your team to eliminate every" },
  { text: "threat before your system gets wiped out." },
  { text: "" },
  { text: "## READY TO DEFEND THE SYSTEM?", gold: true },
  { text: "typebyte --run" },
];

// ---------- small inline icons (stroke = currentColor, so they stay white) ----------

const CHEVRON_DOWN = `
  <svg class="h-[1.09rem] w-[2.07rem] shrink-0" viewBox="0 0 33 17" fill="none"
       stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M1 1 L16.5 15.5 L32 1" />
  </svg>`;

const CHEVRON_RIGHT = `
  <svg class="h-[1.35rem] w-[0.8rem] shrink-0 text-white/80" viewBox="0 0 12 20" fill="none"
       stroke="currentColor" stroke-width="1.8" aria-hidden="true">
    <path d="M2 2 L10 10 L2 18" />
  </svg>`;

const ICON_FILES = `
  <svg class="size-[2.6rem]" viewBox="0 0 48 48" fill="none" stroke="currentColor"
       stroke-width="3" stroke-linejoin="round" aria-hidden="true">
    <rect x="5" y="15" width="27" height="27" rx="2" />
    <path d="M16 15 V7 H43 V34 H32" />
  </svg>`;

const ICON_SEARCH = `
  <svg class="size-[2.6rem]" viewBox="0 0 48 48" fill="none" stroke="currentColor"
       stroke-width="3" stroke-linecap="round" aria-hidden="true">
    <circle cx="29" cy="19" r="11" />
    <path d="M21 27 L6 42" />
  </svg>`;

const ICON_RUN = `
  <svg class="size-[2.6rem]" viewBox="0 0 48 48" fill="none" stroke="currentColor"
       stroke-width="3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">
    <path d="M14 7 L43 24 L14 41 Z" />
    <path d="M22 24 H30 M26 20 V28" />
  </svg>`;

const ICON_INFO = `
  <svg class="size-[1rem] shrink-0 text-[#4d7cff]" viewBox="0 0 16 16" fill="none"
       stroke="currentColor" stroke-width="1.3" aria-hidden="true">
    <circle cx="8" cy="8" r="6.5" />
    <path d="M8 7 V11.5" /><circle cx="8" cy="4.8" r="0.4" />
  </svg>`;

const ICON_PLAYER = `
  <svg class="size-[1.5rem] shrink-0 text-[#4d7cff]" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M14 2 H6 A2 2 0 0 0 4 4 V20 A2 2 0 0 0 6 22 H18 A2 2 0 0 0 20 20 V8 Z" />
    <path d="M14 2 V8 H20" />
  </svg>`;

// ---------- the screen, split into its 4 regions ----------

function menuBar() {
  const items = MENU_ITEMS
    .map((name) => `<span class="tb-font-jersey25 text-[1.25rem]">${name}</span>`)
    .join("");

  return `
  <header class="flex h-[3.5rem] shrink-0 items-center pl-[6.56rem]">
    <nav class="flex gap-[3rem]">${items}</nav>

    <!-- TODO(start-game): START GAME button.
         Hook the click handler here (e.g. send "start game" to the server).
         Later: only show/enable it for the host, and when enough players joined. -->
    <button id="start-game-btn" type="button"
      class="tb-font-jersey25 ml-[3rem] h-[1.97rem] cursor-pointer rounded-[0.125rem] bg-[#325ff1] px-[0.69rem] text-[1.375rem] leading-none text-white shadow-[-0.31rem_0.25rem_0.09rem_0_black] hover:brightness-110">
      START GAME
    </button>

    <div class="tb-font-jersey25 ml-[0.3rem] mr-[0.45rem] flex h-[1.94rem] flex-1 items-center rounded-[0.19rem] border border-[#555] bg-[#282828] px-[0.7rem] text-[0.875rem] text-[#555]">
      TypeByte
    </div>
  </header>`;
}

function sidebar() {
  return `
  <aside class="flex w-[35.36rem] shrink-0 overflow-hidden rounded-[0.25rem] bg-black">

    <!-- Activity bar (the 3 icons on the far left) -->
    <nav class="flex w-[6.19rem] shrink-0 flex-col items-center border-r border-white/70 pt-[0.8rem]">
      <div class="grid h-[4.625rem] w-full place-items-center">${ICON_FILES}</div>
      <div class="grid h-[4.625rem] w-full place-items-center">${ICON_SEARCH}</div>
      <div class="grid h-[4.625rem] w-full place-items-center">${ICON_RUN}</div>
    </nav>

    <!-- Explorer panel -->
    <section class="min-w-0 flex-1 pt-[1.69rem]">
      <div class="tb-font-jersey10 flex h-[2.53rem] items-center gap-[1.43rem] pl-[1.93rem] text-[2.25rem]">
        ${CHEVRON_DOWN}<span>TypeByte.md</span>
      </div>
      <div class="tb-font-jersey10 mt-[1.35rem] flex h-[2.53rem] items-center gap-[1.43rem] pl-[3.8rem] text-[2.25rem]">
        ${CHEVRON_DOWN}<span>Players</span><span id="players-count" class="text-[1.75rem] text-white/50"></span>
      </div>

      <div id="players-list" class="${PLAYERS_EMPTY_CLASS}">
      </div>
    </section>
  </aside>`;
}

function editor() {
  const lineNumbers = Array.from({ length: LINE_COUNT }, (_, i) =>
    `<div class="h-[var(--line)]">${i + 1}</div>`
  ).join("");

  const briefing = BRIEFING_LINES
    .map((line) =>
      `<div class="h-[var(--line)] whitespace-pre ${line.gold ? "text-[#bba454]" : ""}">${line.text}</div>`
    )
    .join("");

  return `
  <!-- Tab strip: one open "file" called TypeByte.md -->
  <div class="flex h-[3.6rem] shrink-0 items-start pt-[0.125rem]">
    <div class="relative z-10 -mb-px flex h-full w-[11.8rem] items-center gap-[0.55rem] border-r border-t-[0.32rem] border-r-[#555] border-t-[#325ff1] bg-[#303030] pb-[0.35rem] pl-[0.97rem]">
      ${ICON_INFO}
      <span class="tb-font-jersey25 text-[1.75rem] leading-none">TypeByte.md</span>
    </div>
  </div>

  <!-- Editor body: line numbers + logo + mission briefing -->
  <div class="flex min-h-0 flex-1 overflow-hidden rounded-[0.75rem] border border-[#555] bg-[#303030] pt-[2.4rem]">
    <div class="tb-font-jersey25 ml-[1rem] w-[1.1rem] shrink-0 select-none text-right text-[1rem]">
      ${lineNumbers}
    </div>
    <div class="tb-font-code ml-[1.3rem] min-w-0 text-[1.0625rem]">
      <!-- the logo takes exactly 12 editor lines -->
      <pre class="tb-font-code h-[calc(12*var(--line))] text-[1rem] leading-[normal]">${LOGO_LINES.join("\n")}</pre>
      ${briefing}
    </div>
  </div>`;
}

function terminal() {
  const tabs = TERMINAL_TABS
    .map((tab) =>
      `<span class="flex h-[1.62rem] items-center rounded-[0.19rem] px-[0.65rem] text-[1.25rem] leading-none ${tab.active ? "bg-[#222]" : ""}">${tab.label}</span>`
    )
    .join("");

  const bullet = `<span class="h-[0.52rem] w-[0.64rem] shrink-0 rounded-full bg-[#666]"></span>`;

  return `
  <section class="tb-font-jersey25 mt-[0.125rem] h-[20.16rem] shrink-0 overflow-hidden rounded-[0.5rem] border border-[#555] bg-[#303030] px-[0.9rem] pt-[0.45rem] text-[1.1875rem] leading-[1.23rem] text-white">

    <div class="-ml-[0.65rem] flex gap-[0.2rem]">${tabs}</div>

    <div class="mt-[0.94rem] flex items-center gap-[0.48rem]">
      ${bullet}
      <span>${PS_PATH}</span>
      <span class="ml-[1.05rem] text-[#2c6bc4]">typebyte --run</span>
    </div>
    <div class="ml-[1.2rem] mt-[0.3rem]">[ System ] TypeByte initialized.</div>
    <div class="ml-[1.2rem]">[ System ] Room created.</div>

    <div class="ml-[0.97rem] mt-[0.78rem]">
      <div class="text-[2.25rem] leading-[2.33rem] text-[#686868]">ROOM CODE</div>
      <div id="room-code" class="-mt-[0.25rem] text-[4rem] leading-[4.15rem]">${ROOM_CODE}</div>
    </div>

    <div class="mt-[0.26rem] flex items-center gap-[0.48rem]">
      ${bullet}
      <span>${PS_PATH}</span>
    </div>
  </section>`;
}

/**
 * Format a player's name by appending the file extension associated
 * with their selected programming language.
 *
 * @param {string} playerName 
 * @param {string | undefined} language 
 * @returns {string} The formatted player name (e.g. Anson.py)
 */
function formatPlayerName(playerName, language) {
    if (!language) {
        return playerName;
    }

    const langData = LANGUAGE_EXTENSIONS[language.toLowerCase()];
    if (!langData) {
      return playerName;
    }

    return `${playerName}${langData.ext}`;
}

// ---------- public function ----------
/**
 * Sets the room code displayed in the container.
 *
 * @param {Element} container - container elemnt that contains the room code
 * @param {string} roomCode - room code to display
 */
export function setRoomCode(container, roomCode) {
    const roomCodeElement = container.querySelector("#room-code");

    if(roomCodeElement){
        roomCodeElement.textContent = roomCode;
    }
}

/**
 * Renders the players in the lobby and updates player count
 *
 * @param {Element} container - container element containing player list
 * @param {{ playerId: string, playerName: string, role: string, language?: string }[]} players - players to render
 * @param {number} [maxPlayers] - room capacity from the server
 */
export function renderPlayers(container, players, maxPlayers) {
    const playersList = container.querySelector("#players-list");
    if(!playersList) {
        return;
    }

    const playerCount = container.querySelector("#players-count");
    const list = Array.isArray(players) ? players : [];

    if(playerCount) {
        playerCount.textContent = Number.isInteger(maxPlayers) 
            ? `(${list.length}/${maxPlayers})`
            : "";
    }

    playersList.innerHTML = ""; // clear old rows before redrawing

    // if nobody joined yet, show the placeholder box
    if(list.length === 0) {
        playersList.className = PLAYERS_EMPTY_CLASS;
        const emptyHint = document.createElement("span");
        emptyHint.className = "tb-font-jersey10 text-[1.75rem] text-white/30";
        emptyHint.textContent = "Players will appear here";
        playersList.appendChild(emptyHint);
        return;
    }

    // Switch to vertical list styling and build one row per player
    playersList.className = PLAYERS_LIST_CLASS;

    for (let i = 0; i < list.length; i++) {
        const player = list[i];
        const hasLanguage = Boolean(player.language);
        const lang = typeof player.language === "string" ? player.language.toLowerCase() : "";

        const row = document.createElement("div");
        row.className = "flex items-center justify-between gap-[0.8rem] py-[0.2rem]";

        const left = document.createElement("div");
        left.className = "flex min-w-0 items-center gap-[0.8rem]";

        const langData = LANGUAGE_EXTENSIONS[lang];
        left.innerHTML = CHEVRON_RIGHT;

        // ">" chevron + icon
        if(langData) {
            const img = document.createElement("img");
            img.src = langData.url;
            img.alt = lang;
            img.className = "size-[1.8rem] shrink-0 object-contain";
            left.appendChild(img);
        } else {
            left.innerHTML += ICON_PLAYER;
        }

        const name = document.createElement("span");
        name.className = "tb-font-jersey10 truncate text-[2rem] leading-none text-white";
        name.textContent = formatPlayerName(player.playerName, player.language); 
        left.appendChild(name);

        if (player.role === "lobby_host") {
          const hostTag = document.createElement("span");
          hostTag.className =
            "tb-font-jersey25 shrink-0 rounded-[0.19rem] bg-[#325ff1]/25 px-[0.45rem] py-[0.15rem] text-[0.95rem] leading-none text-[#7aa2ff]";
          hostTag.textContent = "HOST";
          left.appendChild(hostTag);
        }

        // Yellow = hasnt chosen a language yet; Green = language chosen
        const statusDot = document.createElement("span");
        if(hasLanguage) {
            statusDot.className = "size-[0.75rem] shrink-0 rounded-full bg-[#4ade80]";
            statusDot.title = "Ready";
        } else {
            statusDot.className = "size-[0.75rem] shrink-0 rounded-full bg-[#facc15]";
            statusDot.title = "Choosing language...";
        }

        row.appendChild(left);
        row.appendChild(statusDot);
        playersList.appendChild(row);
    }
}

/**
 * Mounts lobby UI inside the specified container.
 *
 * @param {Element} container - the container element where the lobby will be rendered.
 * @param {string} [roomCode]
 */
export function mountLobby(container, roomCode = ROOM_CODE) {
  container.innerHTML = `
  <div id="typebyte-lobby"
       class="flex h-screen w-screen min-w-[1024px] flex-col overflow-hidden bg-[#2f2f2f] text-white">
    ${menuBar()}
    <div class="flex min-h-0 flex-1">
      ${sidebar()}
      <main class="flex min-w-0 flex-1 flex-col pl-[0.2rem]">
        ${editor()}
        ${terminal()}
      </main>
    </div>
  </div>`;
  setRoomCode(container, roomCode);
}
