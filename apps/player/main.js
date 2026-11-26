const joinForm = document.querySelector("#join-form");
const nicknameInput = document.querySelector("#player-nickname");
const roomCodeInput = document.querySelector("#room-code");

const joinButton = document.querySelector("#join-button");
const joinStatus = document.querySelector("#join-status");

let sessionEnded = false;

/*WEBSOCKET CONNECTION*/

// Local development: PWA runs separately, backend is on port 3000.
// Production/ngrok: PWA and backend share the same domain.

const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

const wsUrl = "wss://gecko-uphold-timothy.ngrok-free.dev";

let ws;

function connectToServer() {
    updateStatus("Connecting to CodeBox server...");

    joinButton.disabled = true;

    ws = new WebSocket(wsUrl);

    ws.addEventListener("open", () => {
        console.log("Connected to CodeBox server.");

        updateStatus("Connected! Enter your room details.");
        joinButton.disabled = false;
    });

    ws.addEventListener("message", (event) => {
        let response;

        try {
            response = JSON.parse(event.data);
        } catch (error) {
            // The backend currently sends a plain-text welcome message.
            console.log("Server message:", event.data);
            return;
        }

        console.log("Server response:", response);

        handleServerResponse(response);
    });

    ws.addEventListener("close", () => {
        console.log("Disconnected from CodeBox server.");

        if (!sessionEnded) {
            updateStatus("Connection lost. Please refresh the page.");
        }

        joinButton.disabled = true;
    });

    ws.addEventListener("error", (error) => {
        console.error("WebSocket connection error:", error);

        updateStatus("Unable to connect to CodeBox server.");
        joinButton.disabled = true;
    });
}


/* FORM SUBMISSION */

joinForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const playerName = nicknameInput.value.trim();
    const roomCode = roomCodeInput.value.trim().toUpperCase();

    if (!playerName || !roomCode) {
        updateStatus("Please complete both fields.");
        return;
    }

    if (roomCode.length !== 6) {
        updateStatus("Room code must contain 6 characters.");
        return;
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        updateStatus("Not connected to the server. Please refresh.");
        return;
    }

    const joinRequest = {
        type: "JOIN_ROOM",
        roomCode: roomCode,
        playerName: playerName
    };

    ws.send(JSON.stringify(joinRequest));

    joinButton.disabled = true;
    joinButton.querySelector("span:first-child").textContent = "JOINING...";

    updateStatus("Checking room details...");
});


/* SERVER RESPONSE HANDLER */

function handleServerResponse(response) {

    if (response.type === "JOIN_SUCCESS") {
        handleJoinSuccess(response);
    }

    else if (response.type === "JOIN_ERROR") {
        handleJoinError(response);
    }

    else if (response.type === "ROOM_CLOSED") {
        handleRoomClosed(response);
    }

}


/* JOIN SUCCESS */

function handleJoinSuccess(response) {

    console.log("Successfully joined room:", response);

    // Store the player's session information for the next screen.
    window.codeboxPlayerSession = response;

    updateStatus(`Successfully joined ${response.roomCode}!`);

    joinButton.querySelector("span:first-child").textContent = "JOINED";

    // Let other player-side scripts know that joining succeeded.
    document.dispatchEvent(
        new CustomEvent("codebox:join-success", {
            detail: response
        })
    );

}


/* JOIN ERROR */

function handleJoinError(response) {

    const errorMessages = {
        ROOM_NOT_FOUND: "Room code not found. Check your code and try again.",
        ROOM_FULL: "This room is already full.",
        ROOM_NOT_WAITING: "This room is no longer accepting players.",
        ALREADY_JOINED: "You have already joined this room.",
        INVALID_PLAYER_NAME: "Please enter a valid nickname."
    };

    const message = errorMessages[response.code] ||
        "Something went wrong. Please try again.";

    updateStatus(message);

    joinButton.disabled = false;
    joinButton.querySelector("span:first-child").textContent = "JOIN ROOM";

}

function handleRoomClosed(response) {
    console.log("Room closed:", response);

    sessionEnded = true;

    updateStatus(
        response.message || "The host has ended this session."
    );

    joinButton.disabled = true;
    joinButton.querySelector("span:first-child").textContent = "SESSION ENDED";
}


/* STATUS DISPLAY */

function updateStatus(message) {
    joinStatus.textContent = message;
}

connectToServer();
