import { mountWaitingScreen } from "./waiting.js";

const params = new URLSearchParams(window.location.search);
const playerName = params.get("name") || "JEFF";
const role = params.get("role") || "lobby_host";
const initialLanguage = params.get("lang");

// Preview query params:
//   ?name=JEFF&role=lobby_host&lang=cpp
//   ?name=LARS&role=player
mountWaitingScreen(document.querySelector("#app"), {
    playerName,
    role,
    initialLanguage,
    onLanguageSelect(language) {
        console.log("[test] Selected language:", language);
    },
    onStartGame(language) {
        console.log("[test] Host typed start with language:", language);
    },
});
