// @ts-check
const { isSupportedLanguage, LANGUAGES } = require('./challenges');
const { PLAYER_MAX_HEALTH } = require('./constants');

/** @typedef {import('./player').Player} Player */

/**
 * Creates the data for a player in the lobby. 
 * Every player starts with the first available language.
 *
 * @param {string} id  - player's unique id
 * @param {string} name - display name
 * @returns {Player} initialized player object
 */
function createPlayer(id, name) {
    return {
        id,
        name,
        language: LANGUAGES[0],
        maxHealth: PLAYER_MAX_HEALTH,
        health: PLAYER_MAX_HEALTH,
        defeated: false,
    };
}

/**
 *  Changes player's language. Only allowed in lobby.
 * 
 * @param {Player} player - player made by createPlayer
 * @param {string} language - e.g. "python"
 * @param {boolean} gameStarted
 * @returns {Player} the same player object, mutated
 */ 
function setPlayerLanguage(player, language, gameStarted) {
    if(gameStarted) {
        throw new Error(`Cannot change language: the game has already started.`);
    }

    const lang = String(language).toLowerCase();
    if(!isSupportedLanguage(lang)) {
        throw new Error(`Unsupported language: "${language}". Supported: ${LANGUAGES.join(", ")}.`);
    }

    player.language = lang;
    return player;
}

module.exports = { createPlayer, setPlayerLanguage };
