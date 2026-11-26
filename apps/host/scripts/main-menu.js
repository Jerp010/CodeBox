const ngrokConnection = "wss://gecko-uphold-timothy.ngrok-free.dev"
const localConnection = "ws://localhost:3000"

/* Establish a connection to the CodeBox backend */
const ws = new WebSocket(ngrokConnection);

function initializeMainMenu() {
    let mainMenuButtons = document.querySelectorAll('.folder-trigger[data-mode]'); //gets all the data mode values for buttons
    let mode = ""

    ws.addEventListener("open", () => {
        console.log("Connected to CodeBox Server");
    });

    ws.addEventListener("error", (event) => {
        console.error("WebSocket connection error:", event);
    });

    ws.addEventListener("message", (event) => {
        try {
            const response = JSON.parse(event.data);

            console.log("Server response:", response);

            // Announces that a room has been created
            if (response.type === "ROOM_CREATED") {
                document.dispatchEvent(
                    new CustomEvent("codebox:room-created", {
                        detail: response
                    })
                );
            }

            if (response.type === "PLAYER_JOINED") {
                document.dispatchEvent(
                    new CustomEvent("codebox:player-joined", {
                        detail: response
                    })
                );
            }

            if (response.type === "ROOM_ENDED") {
                document.dispatchEvent(
                    new CustomEvent("codebox:room-ended", {
                        detail: response
                    })
                );
            }
            
            if (response.type === "ROOM_END_ERROR") {
                console.error("Failed to end room:", response.code);

                document.dispatchEvent(
                    new CustomEvent("codebox:room-end-error", {
                        detail: response
                    })
                );
            }

        } catch (error) {
            // Handle non-JSON messages, such as the welcome message
            console.log("Server message:", event.data);
        }
    });

    // Add event listeners to each button
    mainMenuButtons.forEach(button => { 
        button.addEventListener('click', function() {
            // Get the data-mode and data-info attributes of the clicked button
            // No value or function is being returned, just logging to the console
            mode = button.getAttribute('data-mode');
            console.log(`Button clicked: Mode = ${mode}`);

            // must be inside the button listener so it responds with all the buttons
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: "CREATE_ROOM",
                    gameMode: mode
                }))}
            });
    })
    
    const dino = document.querySelector("#dino-roamer");
    const dinoImage = dino?.querySelector(".pixel-dino");
    const ambient = document.querySelector("#ambient-code");
    const box = document.querySelector("#box-container");

    let previousX = 0;

    window.addEventListener("pointermove", (event) => {
    if (!dino || !ambient || !box) return;

    const ambientRect = ambient.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();

    const dinoWidth = dino.offsetWidth;
    const dinoHeight = dino.offsetHeight;

    // Keep the dinosaur inside the background horizontally
    const minX = 24;
    const maxX = ambientRect.width - dinoWidth - 24;

    // Keep it above the folder box
    const minY = 90;
    const maxY = Math.max(
        minY,
        boxRect.top - ambientRect.top - dinoHeight - 24
    );

    // Position relative to the ambient background
    const targetX = Math.max(
        minX,
        Math.min(event.clientX - ambientRect.left - dinoWidth / 2, maxX)
    );

    const targetY = Math.max(
        minY,
        Math.min(event.clientY - ambientRect.top - dinoHeight / 2, maxY)
    );

    dino.style.left = `${targetX}px`;
    dino.style.top = `${targetY}px`;

    // Face the direction of movement
    if (dinoImage && Math.abs(targetX - previousX) > 2) {
        dinoImage.style.transform =
        targetX < previousX ? "scaleX(-1)" : "scaleX(1)";
    }

    previousX = targetX;
    });

    document.addEventListener("codebox:end-room-request", (event) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error("Cannot end room: server connection unavailable.");

            document.dispatchEvent(
                new CustomEvent("codebox:room-end-error", {
                    detail: { code: "SERVER_UNAVAILABLE" }
                })
            );

            return;
        }

        console.log("Sending END_ROOM request:", event.detail.roomCode);

        ws.send(JSON.stringify({
            type: "END_ROOM",
            roomCode: event.detail.roomCode
        }));
    });

}

initializeMainMenu();