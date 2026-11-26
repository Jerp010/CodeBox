const crypto = require('crypto');
const rooms = new Map();

/**
 * Generate a unique room id, e.g. "room_1696348800000_ab12cd34e".
 */
function generateRoomId() {
  return `room_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

function generateRoomCode() {
  const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let roomCode = ""

  do {
    roomCode = ""

    for (let i = 0; i < 6; i++) {
      const index = crypto.randomInt(0, ROOM_CODE_CHARS.length);
      roomCode += ROOM_CODE_CHARS[index]
    }
  } while (rooms.has(roomCode));

  return roomCode;
}

function gameModeCapacity(gameMode) {
  const playerLimit = {
    CodeBlock: 8,
    TypeByte: 8,
    AltC4: 2
  }

  if (!Object.hasOwn(playerLimit, gameMode)) {
    throw new Error("INVALID_GAME_MODE");
  }

  return playerLimit[gameMode];
}

/* Creates  1 room */
function createRoom(gameMode, creatorConnection) {
  const roomCode = generateRoomCode()
  const roomId = generateRoomId()
  const roomCapacity = gameModeCapacity(gameMode)

  const room = {
    roomId: roomId,
    roomCode: roomCode,
    gameMode: gameMode,
    maxPlayers: roomCapacity,
    status: "waiting",
    creatorConnection: creatorConnection,
    lobbyHost: null,
    players: []
  }

  rooms.set(roomCode, room);

  return room;
}

/* Checks if a room exists and returns the room code*/
function getRoom(roomCode) {
  if (rooms.has(roomCode)) {
    return rooms.get(roomCode)
  } else {
    return null
  }
}

/** helper function */
function getAllRooms() {
  return new Map(rooms);
}

function addPlayer(roomCode, connection, playerName) {
    playerName = typeof playerName === "string"
        ? playerName.trim()
        : "";

    if (playerName.length === 0 || playerName.length > 20) {
        throw new Error("INVALID_PLAYER_NAME");
    }

    roomCode = typeof roomCode === "string"
    ? roomCode.trim().toUpperCase()
    : "";

    const room = getRoom(roomCode)

    if (room === null) {
      throw new Error("ROOM_NOT_FOUND");
    }

    if (room.status === "waiting") {
      if (room.players.some(player => player.connection === connection)) {
        throw new Error("ALREADY_JOINED");
      } 
      
      if (room.players.length >= room.maxPlayers) {
        throw new Error("ROOM_FULL");
      } 
      
      const uniqueId = crypto.randomUUID()
      let role = ""
      /** if player id is the first one, assign role as lobby host */

      if (room.players.length === 0) {
        role = "lobby_host"
      } else {
        role = "player"
      }

      const player = {
        playerId: uniqueId,
        playerName: playerName,
        connection: connection,
        role: role
      }

      room.players.push(player)

      if (player.role === "lobby_host") {
        room.lobbyHost = player.playerId
      }

      return player

    } else {
      throw new Error("ROOM_NOT_WAITING");
    }
}

function endRoom(roomCode, requesterConnection) {
    const room = getRoom(roomCode);

    if (!room) {
        throw new Error("ROOM_NOT_FOUND");
    }

    // Only the desktop host that created this room can end it
    if (room.creatorConnection !== requesterConnection) {
        throw new Error("UNAUTHORIZED");
    }

    // Notify and disconnect all joined players
    for (const player of room.players) {
        if (player.connection.readyState === 1) {
            player.connection.send(JSON.stringify({
                type: "ROOM_CLOSED",
                message: "The host has ended this session."
            }));

            player.connection.close(1000, "Session ended by host");
        }
    }

    // Remove the room so its code can no longer be used
    rooms.delete(roomCode);

    return {
        roomCode: room.roomCode,
        gameMode: room.gameMode
    };
}

/**
 * Registry of per-mode disconnect handlers.
 *
 * Each mode module (battle, coop) registers a cleanup callback so the
 * shared connection layer (server/ws.js) can notify connection state
 * without reaching into mode-specific room maps.
 */
const disconnectHandlers = new Set();

function registerDisconnectHandler(handler) {
  disconnectHandlers.add(handler);
}

function handleDisconnect(ws) {
  for (const handler of disconnectHandlers) {
    handler(ws);
  }
}

module.exports = { generateRoomId, generateRoomCode, createRoom, getRoom, getAllRooms, addPlayer, endRoom, registerDisconnectHandler, handleDisconnect };
