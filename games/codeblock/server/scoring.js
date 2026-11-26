// @ts-check

const {
    BASE_POINTS,
    MAX_SPEED_BONUS,
    QUESTION_TIME_SECONDS,
    SCORE_FLOOR,
    DOUBLE_POINTS_MULTIPLIER,
    STEAL_PENALTY,
    MAX_STEAL_PER_QUESTION,
    TWISTS,
} = require("./constants");

/**
 * @param {Object} params
 * @param {boolean} params.correct
 * @param {number} params.timeTakenSeconds
 * @param {string} params.twist
 * @returns {number}
 */
function calculateQuestionPoints({ correct, timeTakenSeconds, twist }) {
    if (!correct) {
        return 0;
    }

    const clampedTime = Math.min(
        Math.max(timeTakenSeconds, 0),
        QUESTION_TIME_SECONDS
    );
    const speedRatio = 1 - clampedTime / QUESTION_TIME_SECONDS;
    let points = BASE_POINTS + Math.round(MAX_SPEED_BONUS * speedRatio);

    if (twist === TWISTS.DOUBLE) {
        points *= DOUBLE_POINTS_MULTIPLIER;
    }

    return points;
}

/**
 * @typedef {Object} StealPlayer
 * @property {string} id
 * @property {number} totalScore
 *
 * @typedef {Object} StealResult
 * @property {string} playerId
 * @property {boolean} correct
 * @property {number|null} responseMs
 *
 * @typedef {Object} StealTransfer
 * @property {string} fromId
 * @property {string} toId
 * @property {number} amount
 */

/**
 * @param {StealResult} result
 * @returns {result is StealResult & { responseMs: number }}
 */
function hasResponseTime(result) {
    return result.responseMs != null;
}

/**
 * Applies the Steal twist after normal points have been awarded.
 * Mutates player.totalScore and returns the transfers for the reveal.
 *
 * @param {Object} params
 * @param {StealPlayer[]} params.players
 * @param {StealResult[]} params.results
 * @param {string} params.leaderId
 * @param {number} [params.penalty]
 * @param {number} [params.maxPerQuestion]
 * @returns {StealTransfer[]}
 */
function applySteal({
    players,
    results,
    leaderId,
    penalty = STEAL_PENALTY,
    maxPerQuestion = MAX_STEAL_PER_QUESTION,
}) {
    const playerById = new Map(players.map((player) => [player.id, player]));
    const leader = playerById.get(leaderId);
    if (!leader) {
        return [];
    }

    const leaderResult = results.find((result) => result.playerId === leaderId);
    const leaderTime = leaderResult?.responseMs ?? Infinity;

    const stealers = results
        .filter((result) => result.playerId !== leaderId)
        .filter((result) => result.correct)
        .filter(hasResponseTime)
        .filter((result) => result.responseMs < leaderTime)
        .filter((result) => playerById.has(result.playerId))
        .sort((a, b) => a.responseMs - b.responseMs);

    if (stealers.length === 0) {
        return [];
    }

    const requested = stealers.length * penalty;
    const capped = Math.min(requested, maxPerQuestion);
    const available = Math.max(SCORE_FLOOR, leader.totalScore);
    const totalStolen = Math.min(capped, available);

    if (totalStolen === 0) {
        return [];
    }

    const share = Math.floor(totalStolen / stealers.length);
    let remainder = totalStolen % stealers.length;

    /** @type {StealTransfer[]} */
    const transfers = [];

    for (const stealer of stealers) {
        const extra = remainder > 0 ? 1 : 0;
        const amount = share + extra;
        remainder -= extra;

        if (amount === 0) {
            continue;
        }

        const player = playerById.get(stealer.playerId);
        if (!player) {
            continue;
        }

        leader.totalScore -= amount;
        player.totalScore += amount;
        transfers.push({
            fromId: leaderId,
            toId: stealer.playerId,
            amount,
        });
    }

    return transfers;
}

module.exports = { calculateQuestionPoints, applySteal };
