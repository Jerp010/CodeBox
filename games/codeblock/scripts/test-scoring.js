const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
    calculateQuestionPoints,
    applySteal,
} = require("../server/scoring");
const {
    BASE_POINTS,
    MAX_SPEED_BONUS,
    QUESTION_TIME_SECONDS,
    DOUBLE_POINTS_MULTIPLIER,
    STEAL_PENALTY,
    MAX_STEAL_PER_QUESTION,
    TWISTS,
} = require("../server/constants");

const player = (id, totalScore = 0) => ({ id, totalScore });
const result = (playerId, correct, responseMs) => ({
    playerId,
    correct,
    responseMs,
});

test("wrong answer scores 0", () => {
    assert.equal(
        calculateQuestionPoints({
            correct: false,
            timeTakenSeconds: 0,
            twist: TWISTS.STANDARD,
        }),
        0
    );
});

test("correct answer at 0s gets base plus max bonus", () => {
    assert.equal(
        calculateQuestionPoints({
            correct: true,
            timeTakenSeconds: 0,
            twist: TWISTS.STANDARD,
        }),
        BASE_POINTS + MAX_SPEED_BONUS
    );
});

test("correct answer at half time gets half the speed bonus", () => {
    assert.equal(
        calculateQuestionPoints({
            correct: true,
            timeTakenSeconds: QUESTION_TIME_SECONDS / 2,
            twist: TWISTS.STANDARD,
        }),
        BASE_POINTS + MAX_SPEED_BONUS / 2
    );
});

test("correct answer at the deadline gets base points only", () => {
    assert.equal(
        calculateQuestionPoints({
            correct: true,
            timeTakenSeconds: QUESTION_TIME_SECONDS,
            twist: TWISTS.STANDARD,
        }),
        BASE_POINTS
    );
});

test("time taken is clamped to the question window", () => {
    assert.equal(
        calculateQuestionPoints({
            correct: true,
            timeTakenSeconds: -5,
            twist: TWISTS.STANDARD,
        }),
        BASE_POINTS + MAX_SPEED_BONUS
    );
    assert.equal(
        calculateQuestionPoints({
            correct: true,
            timeTakenSeconds: QUESTION_TIME_SECONDS + 5,
            twist: TWISTS.STANDARD,
        }),
        BASE_POINTS
    );
});

test("double round doubles the points", () => {
    assert.equal(
        calculateQuestionPoints({
            correct: true,
            timeTakenSeconds: 0,
            twist: TWISTS.DOUBLE,
        }),
        (BASE_POINTS + MAX_SPEED_BONUS) * DOUBLE_POINTS_MULTIPLIER
    );
});

test("steal round uses normal scoring before steals", () => {
    assert.equal(
        calculateQuestionPoints({
            correct: true,
            timeTakenSeconds: 0,
            twist: TWISTS.STEAL,
        }),
        BASE_POINTS + MAX_SPEED_BONUS
    );
});

test("fractional seconds are rounded to the nearest point", () => {
    assert.equal(
        calculateQuestionPoints({
            correct: true,
            timeTakenSeconds: 1.5,
            twist: TWISTS.STANDARD,
        }),
        563
    );
});

test("faster correct players steal 100 each from the leader", () => {
    const players = [player("leader", 1000), player("fast"), player("mid")];
    const results = [
        result("leader", true, 10000),
        result("fast", true, 5000),
        result("mid", true, 7000),
    ];

    const transfers = applySteal({ players, results, leaderId: "leader" });

    assert.deepEqual(transfers, [
        { fromId: "leader", toId: "fast", amount: STEAL_PENALTY },
        { fromId: "leader", toId: "mid", amount: STEAL_PENALTY },
    ]);
    assert.equal(players[0].totalScore, 1000 - STEAL_PENALTY * 2);
    assert.equal(players[1].totalScore, STEAL_PENALTY);
    assert.equal(players[2].totalScore, STEAL_PENALTY);
});

test("total steal is capped per question", () => {
    const players = [player("leader", 1000)];
    const results = [result("leader", true, 10000)];

    for (let i = 0; i < 5; i++) {
        players.push(player(`p${i}`));
        results.push(result(`p${i}`, true, 1000 + i));
    }

    const transfers = applySteal({ players, results, leaderId: "leader" });

    assert.equal(transfers.length, 5);
    assert.equal(
        transfers.reduce((sum, transfer) => sum + transfer.amount, 0),
        MAX_STEAL_PER_QUESTION
    );
    assert.equal(players[0].totalScore, 1000 - MAX_STEAL_PER_QUESTION);
    assert.deepEqual(
        transfers.map((transfer) => transfer.amount),
        [60, 60, 60, 60, 60]
    );
});

test("available points are split equally when the leader cannot cover everyone", () => {
    const players = [
        player("leader", 250),
        player("fast"),
        player("mid"),
        player("slow"),
    ];
    const results = [
        result("leader", true, 10000),
        result("fast", true, 1000),
        result("mid", true, 2000),
        result("slow", true, 3000),
    ];

    const transfers = applySteal({ players, results, leaderId: "leader" });

    assert.equal(players[0].totalScore, 0);
    assert.equal(
        transfers.reduce((sum, transfer) => sum + transfer.amount, 0),
        250
    );
    assert.deepEqual(
        transfers.map((transfer) => transfer.amount),
        [84, 83, 83]
    );
});

test("if the leader did not answer, every correct player steals", () => {
    const players = [player("leader", 500), player("a"), player("b")];
    const results = [
        result("leader", false, null),
        result("a", true, 1000),
        result("b", true, 2000),
    ];

    const transfers = applySteal({ players, results, leaderId: "leader" });

    assert.deepEqual(
        transfers.map((transfer) => transfer.toId),
        ["a", "b"]
    );
    assert.equal(players[0].totalScore, 500 - STEAL_PENALTY * 2);
});

test("a wrong leader with a response time is still a target", () => {
    const players = [player("leader", 500), player("fast"), player("slow")];
    const results = [
        result("leader", false, 5000),
        result("fast", true, 4000),
        result("slow", true, 6000),
    ];

    const transfers = applySteal({ players, results, leaderId: "leader" });

    assert.deepEqual(
        transfers.map((transfer) => transfer.toId),
        ["fast"]
    );
    assert.equal(players[0].totalScore, 500 - STEAL_PENALTY);
    assert.equal(players[1].totalScore, STEAL_PENALTY);
    assert.equal(players[2].totalScore, 0);
});

test("incorrect players cannot steal", () => {
    const players = [player("leader", 500), player("wrong")];
    const results = [
        result("leader", true, 10000),
        result("wrong", false, 1000),
    ];

    const transfers = applySteal({ players, results, leaderId: "leader" });

    assert.deepEqual(transfers, []);
    assert.equal(players[0].totalScore, 500);
});

test("a player must be strictly faster than the leader", () => {
    const players = [player("leader", 500), player("tied")];
    const results = [
        result("leader", true, 5000),
        result("tied", true, 5000),
    ];

    assert.deepEqual(applySteal({ players, results, leaderId: "leader" }), []);
});

test("a leader with no points cannot be stolen from", () => {
    const players = [player("leader", 0), player("fast")];
    const results = [
        result("leader", true, 10000),
        result("fast", true, 1000),
    ];

    assert.deepEqual(applySteal({ players, results, leaderId: "leader" }), []);
});

test("no steal happens when nobody is faster than the leader", () => {
    const players = [player("leader", 500), player("slower")];
    const results = [
        result("leader", true, 1000),
        result("slower", true, 2000),
    ];

    assert.deepEqual(applySteal({ players, results, leaderId: "leader" }), []);
});

test("remainder points go to the fastest stealers", () => {
    const players = [player("leader", 1000)];
    const results = [result("leader", true, 10000)];

    for (let i = 0; i < 7; i++) {
        players.push(player(`p${i}`));
        results.push(result(`p${i}`, true, 1000 + i));
    }

    const transfers = applySteal({ players, results, leaderId: "leader" });

    assert.deepEqual(
        transfers.map((transfer) => transfer.amount),
        [43, 43, 43, 43, 43, 43, 42]
    );
    assert.equal(players[0].totalScore, 1000 - MAX_STEAL_PER_QUESTION);
});

test("a disconnected leader is still a valid target", () => {
    const players = [player("leader", 500), player("fast")];
    const results = [
        { playerId: "leader", correct: false, responseMs: null, connected: false },
        { playerId: "fast", correct: true, responseMs: 1000, connected: true },
    ];

    const transfers = applySteal({ players, results, leaderId: "leader" });

    assert.deepEqual(transfers, [
        { fromId: "leader", toId: "fast", amount: STEAL_PENALTY },
    ]);
});

test("unknown leader returns no transfers", () => {
    const players = [player("a", 100)];
    const results = [result("a", true, 1000)];

    assert.deepEqual(
        applySteal({ players, results, leaderId: "missing" }),
        []
    );
});
