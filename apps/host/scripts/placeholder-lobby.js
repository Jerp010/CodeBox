console.log("Placeholder lobby script loaded!");

function initializePlaceholderLobby() {
    console.log("Registering placeholder lobby listener...");

    const mainMenu = document.querySelector("#main-menu");
    const lobby = document.querySelector("#lobby-placeholder");

    const gameModeDisplay = document.querySelector("#placeholder-game-mode");
    const roomCodeDisplay = document.querySelector("#placeholder-room-code");

    const playerCountDisplay = document.querySelector("#placeholder-player-count");
    const playerCapacityDisplay = document.querySelector("#placeholder-player-capacity");

    const playerSlots = document.querySelector("#placeholder-player-slots");
    const copyButton = document.querySelector("#placeholder-copy-code");

    const endSessionButton = document.querySelector("#end-session-button");

    function renderPlayers(players, capacity) {
        // Update the number of joined players
        playerCountDisplay.textContent = players.length;

        // Remove the previous player slots
        playerSlots.innerHTML = "";

        // Render one slot for every available player position
        for (let i = 0; i < capacity; i++) {
            const player = players[i];

            const slot = document.createElement("div");
            slot.classList.add("placeholder-player-slot");

            const avatar = document.createElement("div");
            avatar.classList.add("placeholder-avatar");

            const details = document.createElement("div");

            const name = document.createElement("strong");
            const status = document.createElement("p");

            if (player) {
                // Occupied slot
                avatar.textContent = player.playerName.charAt(0).toUpperCase();
                name.textContent = player.playerName;
                status.textContent = player.role === "lobby_host"
                    ? "Lobby host"
                    : "Connected";
            } else {
                // Empty slot
                avatar.textContent = "?";
                name.textContent = `Player ${i + 1}`;
                status.textContent = "Waiting to join";
            }

            details.appendChild(name);
            details.appendChild(status);

            slot.appendChild(avatar);
            slot.appendChild(details);

            playerSlots.appendChild(slot);
        }
    }

    // Listens for a newly created room
    document.addEventListener("codebox:room-created", (event) => {
        const room = event.detail;

        if(room.gameMode === "TypeByte") {
            return
        }

        console.log("Placeholder lobby received room:", room);

        const gameMode = room.gameMode;
        const roomCode = room.roomCode;
        const capacity = room.maxPlayers;

        // Check if the received room information is valid
        if (!room.gameMode || !room.roomCode || !Number.isInteger(room.maxPlayers)) {
            console.error("Invalid room information:", room);
            return;
        }

        // Display room information
        gameModeDisplay.textContent = gameMode;
        roomCodeDisplay.textContent = roomCode;

        // Initialize player count and capacity
        playerCapacityDisplay.textContent = capacity;

        // Render all slots as empty initially
        renderPlayers([], capacity);

        // Switch from the main menu to the placeholder lobby
        mainMenu.hidden = true;
        lobby.hidden = false;

        // Keep the room information accessible for future integration
        window.codeboxRoom = room;
    });

    document.addEventListener("codebox:player-joined", (event) => {
        if(lobby.hidden) {
            return;
        }
        const update = event.detail;

        console.log("Player joined:", update);

        renderPlayers(update.players, update.maxPlayers);

        // Update the room's player information
        window.codeboxRoom.players = update.players;

        const footer = document.querySelector("#placeholder-footer");

        footer.textContent = update.players.length >= update.maxPlayers
            ? "Room is full!"
            : "Waiting for more players to join...";
    });

    // Copy room code to clipboard
    copyButton.addEventListener("click", async () => {
        const roomCode = roomCodeDisplay.textContent;

        try {
            await navigator.clipboard.writeText(roomCode);

            copyButton.textContent = "COPIED!";

            setTimeout(() => {
                copyButton.textContent = "COPY";
            }, 1500);

        } catch (error) {
            console.error("Failed to copy room code:", error);
        }
    });

    endSessionButton.addEventListener("click", () => {
        if (!window.codeboxRoom?.roomCode) {
            console.error("No active room found.");
            return;
        }

        const confirmed = window.confirm(
            "End this session? All connected players will be kicked out."
        );

        if (!confirmed) return;

        endSessionButton.disabled = true;
        endSessionButton.textContent = "ENDING SESSION...";

        document.dispatchEvent(
            new CustomEvent("codebox:end-room-request", {
                detail: {
                    roomCode: window.codeboxRoom.roomCode
                }
            })
        );
    });

    document.addEventListener("codebox:room-ended", () => {
        if(lobby.hidden) {
            return;
        }
        console.log("Session successfully ended.");

        // Return to the main menu
        lobby.hidden = true;
        mainMenu.hidden = false;

        // Clear the previous room information
        window.codeboxRoom = null;

        endSessionButton.disabled = false;
        endSessionButton.textContent = "END SESSION";
    });

    document.addEventListener("codebox:room-end-error", (event) => {
        if(lobby.hidden) {
            return;
        }
        console.error("Room ending failed:", event.detail);

        endSessionButton.disabled = false;
        endSessionButton.textContent = "END SESSION";

        alert(
            `Unable to end the session: ${event.detail.code}`
        );
    });
}

initializePlaceholderLobby();
