const { createRoom } = require("../rooms/roomManager.js");

/* Import required modules */
const { WebSocketServer } = require("ws");
const http = require("http");

/* Initialize the HTTP server */
const server = http.createServer((req, res) => {});

/* Attach the WebSocket server to the HTTP server */
const wss = new WebSocketServer({ server });

/* Handle incoming client connections */
wss.on("connection", (ws) => {
  console.log("Client Connected");

  /* Send a welcome message to the newly connected client */
  ws.send("Welcome to CodeBox!");

  /* Handle incoming messages from this client */
  ws.on("message", (data) => {
    const roomRequest = JSON.parse(data.toString());

    if (roomRequest.type === "CREATE_ROOM") {
      const generatedRoom = createRoom(roomRequest.gameMode);

      const response = {
        type: "ROOM_CREATED",
        roomCode: generatedRoom.roomCode,
        roomId: generatedRoom.roomId,
        gameMode: generatedRoom.gameMode,
      };

      ws.send(JSON.stringify(response));
      console.log("Room Sent: " + JSON.stringify(response));
    }
  });

  /* Detect when the client disconnects */
  ws.on("close", () => {
    console.log("Client Disconnected");
  });

  /* Handle errors associated with this client connection */
  ws.on("error", (error) => {
    console.error(error);
  });
});

module.exports = { server, wss };
