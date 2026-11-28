import { mountLobby, renderPlayers } from "../../../games/typebyte/host/lobby.js";

function initializeTypeByteLobby() {
    const mainMenu = document.querySelector("#main-menu");
    const lobby = document.querySelector("#lobby-typbyt");

    if(!mainMenu || !lobby) {
        return;
    }

    document.addEventListener("codebox:room-created", (event) => {
        const room = event.detail;

        if(room.gameMode !== "TypeByte") {
            return;
        }

        if(!room.roomCode || !Number.isInteger(room.maxPlayers)) {
            console.error("Invalid TypeByte room information:", room);
            return;
        }

        mountLobby(lobby, room.roomCode);
        renderPlayers(lobby, [], room.maxPlayers);

        mainMenu.hidden = true;
        lobby.hidden = false;

        window.codeboxRoom = room;
    });

    document.addEventListener("codebox:player-joined", (event) => {
        // ignore if not typebyte lobby is showing >:(
        if(lobby.hidden || window.codeboxRoom?.gameMode !== "TypeByte") {
            return;
        };

        const update = event.detail;
        console.log("TypeByte player joined:", update);

        renderPlayers(lobby, update.players, update.maxPlayers);
        window.codeboxRoom.players = update.players;
    });

    // hide and clear #lobby-typbyt so lobby.css scaling turns off
    document.addEventListener("codebox:room-ended", () => {
        if(lobby.hidden) {
            return;
        }

        lobby.hidden = true;
        lobby.innerHTML = "";
        mainMenu.hidden = false;
        window.codeboxRoom = null;
    });
}

initializeTypeByteLobby();
