const { CHALLENGES, LANGUAGES, DIFFICULTY } = require('../data/challenges');

const isSupportedLanguage = (language) => LANGUAGES.includes(language);
const isSupportedDifficulty = (difficulty) => DIFFICULTY.includes(difficulty);
const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * Maps a boss's position in the run to a challenge difficulty. Values outside
 * the range are clamped.
 *
 * @param {number} bossIndex - Zero-based index of the boss (0 = first boss)
 * @returns {string} One of the values in DIFFICULTY
 */
function difficultyForBoss(bossIndex) {
    const i = Math.min(Math.max(bossIndex, 0), DIFFICULTY.length - 1);
    return DIFFICULTY[i];
}

/**
 * Picks a random challenge, avoiding ones already uses
 *
 * @param {string} language
 * @param {string} difficulty
 * @param {string[]} [usedIds] - challenge ids already given
 * @returns {{id: string, language: string, difficulty: string, syntax: string}}
 */ 
function getChallenge(language, difficulty, usedIds = []) {
    const lang = String(language).toLowerCase();
    const diff = String(difficulty).toUpperCase();

    if(!isSupportedLanguage(lang)) 
        throw new Error(`Unsupported Language: ${language}`);
    if(!isSupportedDifficulty(diff))
        throw new Error(`Unsupported Difficulty: ${difficulty}`);

    const challenges = CHALLENGES[lang][diff].map((syntax, index) => ({
        id: `${lang}:${diff}:${index}`,
        language: lang,
        difficulty: diff,
        syntax,
    }));

    const available = challenges.filter((challenge) => !usedIds.includes(challenge.id));

    const pool = available.length > 0 ? available : challenges;

    return pickRandom(pool);
}

module.exports = { difficultyForBoss, getChallenge, LANGUAGES, DIFFICULTY };

// DEBUG
// console.log(getChallenge('python', 'MEDIUM'));
