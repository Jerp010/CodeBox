// @ts-check

/** @typedef {import('./challenges.js').Challenge} Challenge */

/**
 * @typedef {Object}   TypingProgress 
 * @property {number}  correctLength - how many characters match the syntax 
 * @property {boolean} hasMistake    - true if typed has a wrong or extra character
 * @property {boolean} complete      - true when typed is exactly the same syntax
 */
 
/** @param {unknown} typed */
const assertTyped = (typed) => {
    if(typeof typed !== 'string') {
        throw new Error(`Invalid input: expected a string, got ${typeof typed}`);
    }
}

/**
 * Compares what player has typed against the challenge syntax.
 *
 * @param {string} syntax - the text player must type 
 * @param {string} typed  - what the player typed
 * @returns {TypingProgress}
 */
function getTypingProgress(syntax, typed) {
    assertTyped(typed);

    let correctLength = 0;

    for(let i = 0; i < syntax.length; i++) {
        if(syntax[i] === typed[i]) {
            correctLength++;
        }
        else {
            break;
        }
    }

    return {
        correctLength,
        hasMistake: correctLength < typed.length,
        complete: typed === syntax,
    };
}


/**
 * Decides whether a complete submission is correct. 
 * Trailing whitespace is ignored.
 *
 * @param {Challenge} challenge - the challenge the player was given 
 * @param {string} typed        - player's submission 
 * @returns {boolean}
 */
function isCorrectSubmission(challenge, typed) {
    assertTyped(typed);
    return typed.trimStart().trimEnd() === challenge.syntax;
}

module.exports = { getTypingProgress, isCorrectSubmission };
