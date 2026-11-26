const { createRoom, addPlayer, getRoom, endRoom } = require("../rooms/roomManager.js");

/* Import required modules */
const { WebSocketServer } = require("ws");
const http = require("http");

const express = require("express");
const path = require("path");

/* Creates the HTTP server */

/* Initialize Express */
const app = express();

/* Locate the Player PWA directory */
const playerDirectory = path.join(__dirname, "../../apps/player");

/* Serve the Player PWA's static files */
app.use(express.static(playerDirectory));

/* Create the HTTP server */
const server = http.createServer(app);

/* Attach the WebSocket server to the HTTP server */
const wss = new WebSocketServer({ server });

/* Handle incoming client connections */
wss.on("connection", (ws) => {
  console.log("Client Connected");

  /* Send a welcome message to the newly connected client */
  ws.send("Welcome to CodeBox!");

  /* Handle incoming messages from this client */
  ws.on("message", (data) => {
      let roomRequest;

      try {
          roomRequest = JSON.parse(data.toString());

          if (roomRequest.type === "CREATE_ROOM") {
              const generatedRoom = createRoom(roomRequest.gameMode, ws);

              const response = {
                  type: "ROOM_CREATED",
                  roomCode: generatedRoom.roomCode,
                  roomId: generatedRoom.roomId,
                  gameMode: generatedRoom.gameMode,
                  maxPlayers: generatedRoom.maxPlayers
              };

              ws.send(JSON.stringify(response));
              console.log("Room Sent:", response);
          }

          else if (roomRequest.type === "JOIN_ROOM") {
              const roomCode = typeof roomRequest.roomCode === "string"
                  ? roomRequest.roomCode.trim().toUpperCase()
                  : "";

              const player = addPlayer(
                  roomCode,
                  ws,
                  roomRequest.playerName
              );

              const room = getRoom(roomCode);

              // Create a safe player list without WebSocket connections
              const players = room.players.map(player => ({
                  playerId: player.playerId,
                  playerName: player.playerName,
                  role: player.role
              }));

              // Send confirmation to the joining player
              const response = {
                  type: "JOIN_SUCCESS",
                  roomCode: room.roomCode,
                  gameMode: room.gameMode,
                  maxPlayers: room.maxPlayers,
                  playerId: player.playerId,
                  playerName: player.playerName,
                  role: player.role,
                  players: players
              };

              ws.send(JSON.stringify(response));

              // Notify the desktop host that a player joined
              if (
                  room.creatorConnection &&
                  room.creatorConnection.readyState === 1
              ) {
                  room.creatorConnection.send(JSON.stringify({
                      type: "PLAYER_JOINED",
                      player: {
                          playerId: player.playerId,
                          playerName: player.playerName,
                          role: player.role
                      },
                      players: players,
                      playerCount: players.length,
                      maxPlayers: room.maxPlayers
                  }));
              }

              console.log("Player Joined:", response);
          }

          else if (roomRequest.type === "END_ROOM") {
              const endedRoom = endRoom(roomRequest.roomCode, ws);

              ws.send(JSON.stringify({
                  type: "ROOM_ENDED",
                  roomCode: endedRoom.roomCode
              }));
          }

      } catch (error) {
          console.error("Request failed:", error.message);

          let responseType = "REQUEST_ERROR";

          if (roomRequest?.type === "JOIN_ROOM") {
              responseType = "JOIN_ERROR";
          }
          else if (roomRequest?.type === "END_ROOM") {
              responseType = "ROOM_END_ERROR";
          }

          ws.send(JSON.stringify({
              type: responseType,
              code: error.message
          }));
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
