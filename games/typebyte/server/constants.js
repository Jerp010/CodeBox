// @ts-check
const BOSSES = [
    { id: "syntax-slime",        name: "Syntax Slime" },
    { id: "bug-beast",           name: "Bug Beast" },
    { id: "null-pointer-dragon", name: "Null Pointer Dragon" },
];

// boss health grows with team size
const BOSS_HEALTH_PER_PLAYER = 10;

// TODO: tune once playable
const MIN_PLAYER_COUNT = 1;
const MAX_PLAYER_COUNT = 8;
const PLAYER_MAX_HEALTH = 3; // each player's starting health

const BOSS_ATTACK_DAMAGE = 1;

module.exports = { 
    BOSSES, 
    BOSS_HEALTH_PER_PLAYER, 
    MIN_PLAYER_COUNT, 
    MAX_PLAYER_COUNT,
    PLAYER_MAX_HEALTH,
    BOSS_ATTACK_DAMAGE,
};
