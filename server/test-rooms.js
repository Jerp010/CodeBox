const { createRoom, getRoom, getAllRooms } = require("./rooms/roomManager.js");

const generatedroom1 = createRoom("CodeBlock");
const generatedroom2 = createRoom("TypeByte");
const generatedroom3 = createRoom("alt+C4");

const roomCopy = getAllRooms();

console.log(roomCopy);
console.log(roomCopy.clear());
console.log(getRoom(generatedroom1.roomCode));
console.log(getRoom(generatedroom2.roomCode));
console.log(getRoom(generatedroom3.roomCode));
