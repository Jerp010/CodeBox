const { difficultyForBoss } = require('./challenges');
const { BOSSES, BOSS_HEALTH_PER_PLAYER, MIN_PLAYER_COUNT, MAX_PLAYER_COUNT } = require('./constants');

/**
 * Creates the state for one boss. 
 *
 * @param {number} bossIndex - zero-based position of boss in BOSSES
 * @param {number} playerCount - players in the room.
 */
function createBoss(bossIndex, playerCount) {
    if (bossIndex < 0 || bossIndex >= BOSSES.length) {
        throw new Error(`Invalid boss index: ${bossIndex}`);
    }
    if (playerCount < MIN_PLAYER_COUNT) {
        throw new Error(`Need at least ${MIN_PLAYER_COUNT} players, got: ${playerCount}`);
    }
    if(playerCount > MAX_PLAYER_COUNT) {
        throw new Error(`Player count (${playerCount}) exceeds the maximum allowed.`);
    }

    const maxHealth = BOSS_HEALTH_PER_PLAYER * playerCount;
    return {
        index: bossIndex,
        id: BOSSES[bossIndex].id, 
        name: BOSSES[bossIndex].name,
        difficulty: difficultyForBoss(bossIndex),
        maxHealth,
        health: maxHealth,  // current hp
        defeated: false,
    }
}

/**
 * Removes health from the boss and marks defeated at 0
 *
 * @param {object} boss
 * @param {number} amount - damage dealt
 * @returns {object} same boss, mutated
 */
function damageBoss(boss, amount) {
    if(boss.health <= 0) {
        return boss;
    }
    boss.health = Math.max(0, boss.health - amount);

    if(boss.health === 0) {
        boss.defeated = true;
    }

    return boss;
}

function hasNextBoss(bossIndex) {
    return bossIndex + 1 < BOSSES.length;
}

module.exports = { createBoss, damageBoss, hasNextBoss, MIN_PLAYER_COUNT };
