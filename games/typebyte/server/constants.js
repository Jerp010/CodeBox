const BOSSES = [
    { id: "syntax-slime",        name: "Syntax Slime" },
    { id: "bug-beast",           name: "Bug Beast" },
    { id: "null-pointer-dragon", name: "Null Pointer Dragon" },
];

// boss health grows with team size
const BOSS_HEALTH_PER_PLAYER = 10;

// TODO: confirm the minimum player count once the game is finalized.
const MIN_PLAYER_COUNT = 1;
const MAX_PLAYER_COUNT = 8;

module.exports = { BOSSES, BOSS_HEALTH_PER_PLAYER, MIN_PLAYER_COUNT, MAX_PLAYER_COUNT };
