const { isSupportedLanguage, LANGUAGES } = require('./challenges');

/**
 * Creates the data for a player in the lobby. 
 * Every player starts with the first available language.
 */
function createPlayer(id, name) {
    return { id, name, language: LANGUAGES[0] };
}

/**
 *  Changes player's language. Only allowed in lobby.
 * 
 * @param {object} player - player made by createPlayer
 * @param {string} language - e.g. "python"
 * @param {boolean} gameStarted
 * @returns {object} the same player object, mutated
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
