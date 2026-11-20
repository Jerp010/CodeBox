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

/* Creates  1 room */
function createRoom(gameMode) {
  const roomCode = generateRoomCode()
  const roomId = generateRoomId()

  const room = {
    roomId: roomId,
    roomCode: roomCode,
    gameMode: gameMode,
    players: [],
    status: "waiting"
  }

  rooms.set(roomCode, room);

  return room;
}

/* Checks if a room exists */
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

module.exports = { generateRoomId, generateRoomCode, createRoom, getRoom, getAllRooms, registerDisconnectHandler, handleDisconnect };
