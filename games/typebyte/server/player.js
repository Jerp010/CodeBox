// @ts-check

/**
 * @typedef {Object}   Player
 * @property {string}  id
 * @property {string}  name
 * @property {string}  language
 * @property {number}  maxHealth
 * @property {number}  health
 * @property {boolean} defeated
 */

/**
 * Reduces health from a player and marks defeated at 0
 *
 * @param {Player} player - created from createPlayer
 * @param {number} amount - damage taken
 * @returns {Player} same player, mutated
 */
function damagePlayer(player, amount) {
    if(!Number.isFinite(amount) || amount < 0) {
        throw new Error(`Invalid damage amount: ${amount}`);
    }
    if(player.defeated) {
        return player;
    }

    player.health = Math.max(0, player.health - amount);

    if(player.health === 0) {
        player.defeated = true;
    }

    return player;
}

/**
 * True when all players is defeated (the team loses). 
 * An empty list is NOT a team defeat.
 *
 * @param {Player[]} players - list of player object
 * @returns {boolean}
 */
function allPlayersDefeated(players) {
    if(players.length === 0) {
        return false;
    }

    for(const player of players) {
        if(!player.defeated) {
            return false;
        }
    }
    return true;
}

module.exports = { damagePlayer, allPlayersDefeated };
