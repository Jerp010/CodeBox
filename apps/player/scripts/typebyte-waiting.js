import { mountWaitingScreen } from "../../../games/typebyte/player/waiting.js";

function initializeTypebyteWaiting() {
    const joinWrapper = document.querySelector(".page-wrapper");
    const waitingContainer = document.querySelector("#waiting-typbyt");

    if (!joinWrapper || !waitingContainer) {
        return;
    }

    document.addEventListener("codebox:join-success", (event) => {
        const session = event.detail;

        if(!session || session.gameMode !== "TypeByte") {
            return;
        }

        mountWaitingScreen(waitingContainer, {
            playerName: session.playerName,
            role:       session.role,
            onLanguageSelect(language) {
                // TODO: (language-select) send selected language over WebSocket
                // once the backend message format is ready.
                console.log("TypeByte language selected:", language);
            },
            onStartGame(language) {
                // TODO: (start-game) send START_GAME over WebSocket once the 
                // backend message format is ready.
                console.log("TypeByte host requested start with:", language);
            }
        });

        joinWrapper.hidden = true;
        waitingContainer.hidden = false;
    });
}

initializeTypebyteWaiting();
