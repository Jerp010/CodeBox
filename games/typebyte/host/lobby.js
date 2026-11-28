// TypeByte lobby screen (UI only, no game logic yet).
// Built from the Figma frame "Typebyte Lobby" (node 68:2).
//
// Usage from the host app:
//   import { mountLobby } from "./lobby.js";
//   mountLobby(document.querySelector("#app"));

import "./lobby.css";

// TODO(room-code): replace this static value with the real room code
// that the server generates when the host creates a room.
const ROOM_CODE = "A12SAC";

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
        ${CHEVRON_DOWN}<span>Players</span>
      </div>

      <!-- TODO(players): PLAYERS BOX.
           This empty box is the placeholder for the player list.
           Later: fill #players-list with one row per player
           (language icon + "name.ext" + green/yellow status dot).
           Remove the dashed border and the hint text when real rows go in. -->
      <div id="players-list"
        class="mb-[1rem] ml-[3.7rem] mr-[2.36rem] mt-[0.5rem] grid h-[34.8rem] place-items-center rounded-[0.25rem] border border-dashed border-white/25">
        <span class="tb-font-jersey10 text-[1.75rem] text-white/30">Players will appear here</span>
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

    <!-- TODO(room-code): ROOM CODE text.
         #room-code is the element to update when the server sends the real
         code (e.g. document.querySelector("#room-code").textContent = code).
         The link and QR code for players can go next to it later. -->
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

// ---------- public function ----------

export function mountLobby(container) {
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
}
