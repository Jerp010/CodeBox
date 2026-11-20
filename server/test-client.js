/* Import the WebSocket client module */
const { WebSocket } = require('ws');

/* Establish a connection to the CodeBox backend */
const ws = new WebSocket("ws://localhost:3000");

/* Handle successful connection to the backend */
ws.on("open", () => {
    console.log("Connected to CodeBox Server!");

    /* Listen for messages received from the backend */
    ws.on("message", (data) => {
        console.log(data.toString());
    });

    /* Send a test message to the backend */
    ws.send(JSON.stringify({
                type: "CREATE_ROOM",
                gameMode: "CodeBlock"
            }));

    /* Detect when the server closes the connection */
    ws.on('close', () => {
        console.log("Server Disconnected");
    });
});
