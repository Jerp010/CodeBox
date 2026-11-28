// @ts-check
import { LANGUAGE_EXTENSIONS, LANGUAGE_OPTIONS, formatPlayerName } from "../shared/languages.js";

/**
 * Mounts the player waiting screen into the given container.
 *
 * @param {Element} container 
 * @param {{
 *   playerName?:       string,
 *   role?:             string,
 *   initialLanguage?:  string | null,
 *   onLanguageSelect?: (language: string) => void,
 *   onStartGame?:      (language: string) => void,
 * }}[options]
 */
export function mountWaitingScreen(container, options = {}) {
    const playerName = options.playerName || "PLAYER";
    const isLobbyHost = options.role === "lobby_host";

    /** @type {string | null} */
    let selectedLanguage = null;
    let startRequested  = false;

    container.innerHTML = "";

    const root           = document.createElement("div");
    root.id              = "typebyte-waiting";

    // ------------- top bar --------------
    const header         = document.createElement("header");
    header.className     = "tb-wait-header";

    const headerIcon     = document.createElement("img");
    headerIcon.id        = "tb-wait-header-icon";
    headerIcon.className = "tb-wait-header-icon";
    headerIcon.alt       = "";
    headerIcon.hidden    = true;

    const name           = document.createElement("p");
    name.id              = "tb-wait-player-name";
    name.className       = "tb-wait-player-name";
    name.textContent     = playerName;

    header.appendChild(headerIcon);
    header.appendChild(name);
    root.appendChild(header);

    // ------------- main body --------------
    const body          = document.createElement("main");
    body.className      = "tb-wait-body";

    const prompt        = document.createElement("p");
    prompt.id           = "tb-wait-prompt";
    prompt.className    = "tb-wait-prompt";
    prompt.textContent  = isLobbyHost 
                        ? "type \u201cstart\u201d after choosing your language"
                        : "choose your language";
    body.appendChild(prompt);

    /** @type {HTMLInputElement | null} */
    let startInput = null;

    if(isLobbyHost) {
        const startForm           = document.createElement("form");
        startForm.id              = "tb-wait-start-form";
        startForm.className       = "tb-wait-start-form";

        startInput                = document.createElement("input");
        startInput.id             = "tb-wait-start-input";
        startInput.className      = "tb-wait-start-input";
        startInput.type           = "text";
        startInput.placeholder    = "start";
        startInput.autocomplete   = "off";
        startInput.autocapitalize = "none";
        startInput.spellcheck     = false;
        startInput.disabled       = true;
        startInput.setAttribute("aria-label", "Type start to begin the game");

        startForm.appendChild(startInput);
        body.appendChild(startForm);

        startForm.addEventListener("submit", (event) => {
            event.preventDefault();

            if(!selectedLanguage || startRequested || !startInput) {
                return;
            }

            const typed = startInput.value.trim().toLowerCase();
            if(typed !== "start") {
                setStatus('type "start" to begin', "is-error");
                return;
            }

            startRequested = true;
            startInput.disabled = true;
            setStatus("Starting game...", "is-ready");

            // TODO: (start-game) send START_GAME to the server once 
            // WebSocket message format is ready.
            if(typeof options.onStartGame === "function") {
                options.onStartGame(selectedLanguage);
            }
        });
    }
    
    // ----------- language selector --------------
    const langGroup     = document.createElement("div");
    langGroup.id        = "tb-wait-languages";
    langGroup.className = "tb-wait-languages";
    langGroup.setAttribute("role", "group");
    langGroup.setAttribute("aria-label", "Choose a programming language");

    /** @type {HTMLButtonElement[]} */
    const langButtons = [];

    for(let i = 0; i < LANGUAGE_OPTIONS.length; i++) {
        const option            = LANGUAGE_OPTIONS[i];
        const langData          = LANGUAGE_EXTENSIONS[option.id];
        if(!langData) {
            continue;
        }

        const button            = document.createElement("button");
        button.type             = "button";
        button.className        = "tb-wait-lang-btn";
        button.dataset.language = option.id;
        button.setAttribute("aria-label", option.label);
        button.setAttribute("aria-pressed", "false");

        const icon              = document.createElement("img");
        icon.className          = "tb-wait-lang-icon";
        icon.src                = langData.url;
        icon.alt                = "";

        button.appendChild(icon);
        button.addEventListener("click", () => {
            selectLanguage(option.id);
        });

        langButtons.push(button);
        langGroup.appendChild(button);
    }

    body.appendChild(langGroup);

    // ---------- status feedback ----------
    const statusEl     = document.createElement("p");
    statusEl.id        = "tb-wait-status";
    statusEl.className = "tb-wait-status";
    statusEl.setAttribute("role", "status");
    statusEl.setAttribute("aria-live", "polite");
    body.appendChild(statusEl);

    root.appendChild(body);
    container.appendChild(root);

    /**
     * @param {string} message
     * @param { "" | "is-ready" | "is-error" } [stateClass]
     */
    function setStatus(message, stateClass = "") {
        statusEl.textContent = message;
        statusEl.className   = stateClass
                ? `tb-wait-status ${stateClass}`
                : "tb-wait-status";
    }

    /**
     * Selects a programming language and updates the header, border, and controls 
     *
     * @param {string} language 
     */
    function selectLanguage(language) {
        if(startRequested) {
            return;
        }

        const lang = language.toLowerCase();
        const langData = LANGUAGE_EXTENSIONS[lang];
        if(!langData) {
            return;
        }

        selectedLanguage = lang;

        // Highlight only the chosen language box 
        for(let i = 0; i < langButtons.length; i++) {
            const btn = langButtons[i];
            const isSelected = btn.dataset.language === lang;
            btn.classList.toggle("is-selected", isSelected);
            btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
        }

        // Update top bar with language icon + filename extension.
        headerIcon.src    = langData.url;
        headerIcon.alt    = lang;
        headerIcon.hidden = false;
        name.textContent  = formatPlayerName(playerName, lang);

        if(isLobbyHost && startInput) {
            startInput.disabled = false;
            setStatus("");
        } else {
            prompt.textContent = "waiting for host to start...";
            setStatus("");
        }

        // TODO: (language-select) send the chosen language to the server once 
        // the WebSocket message format is agreed 
        if(typeof options.onLanguageSelect === "function") {
            options.onLanguageSelect(lang);
        }
    }

    if(options.initialLanguage) {
        selectLanguage(options.initialLanguage);
    }

    return {
        getLanguage: () => selectedLanguage,
        selectLanguage,
    }
}
