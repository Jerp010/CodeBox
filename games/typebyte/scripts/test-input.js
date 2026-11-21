const { test } = require("node:test");
const assert = require("node:assert/strict");
const { getTypingProgress, isCorrectSubmission } = require("../server/input");
const { getChallenge, LANGUAGES, DIFFICULTY } = require("../server/challenges");

const SYNTAX = "x = 10";
const challenge = {
    id:         "python:EASY:1",
    language:   "python",
    difficulty: "EASY",
    syntax:     SYNTAX
};

test("getTypingProgress with nothing typed", () => {
    assert.deepEqual(getTypingProgress(SYNTAX, ""), {
        correctLength: 0, 
        hasMistake:    false,
        complete:      false,
    });
});

test("getTypingProgress counts a correct partial input", () => {
    assert.deepEqual(getTypingProgress(SYNTAX, "x ="), {
        correctLength: 3, 
        hasMistake:    false,
        complete:      false,
    });
});

test("getTypingProgress stops counting at the first wrong character", () => {
    assert.deepEqual(getTypingProgress(SYNTAX, "x = 9"), {
        correctLength: 4, 
        hasMistake:    true,
        complete:      false,
    });
});

test("getTypingProgress is complete only for an exact match", () => {
    assert.deepEqual(getTypingProgress(SYNTAX, SYNTAX), {
        correctLength: SYNTAX.length, 
        hasMistake:    false,
        complete:      true,
    });
});

test("getTypingProgress treats extra characters as a mistake", () => {
    assert.deepEqual(getTypingProgress(SYNTAX, "x = 100"), {
        correctLength: SYNTAX.length, 
        hasMistake:    true,
        complete:      false,
    });
});

test("getTypingProgress is case-sensitive", () => {
    const progress = getTypingProgress(SYNTAX, "X = 10");
    assert.equal(progress.correctLength, 0);
    assert.equal(progress.hasMistake, true);
});

test("isCorrectSubmission accepts the exact syntax", () => {
    assert.equal(isCorrectSubmission(challenge, SYNTAX), true);
});

test("isCorrectSubmission rejects wrong and unfinished input", () => {
    assert.equal(isCorrectSubmission(challenge, "x = 9"), false);
    assert.equal(isCorrectSubmission(challenge, "x ="), false);
    assert.equal(isCorrectSubmission(challenge, ""), false);
});
 
test("isCorrectSubmission ignores trailing whitespace", () => {
    assert.equal(isCorrectSubmission(challenge, "x = 10  "), true);
    assert.equal(isCorrectSubmission(challenge, " x = 10"), true);
});
 
test("input that is not a string throws instead of counting as a mistake", () => {
    assert.throws(() => isCorrectSubmission(challenge, undefined), /Invalid input/);
    assert.throws(() => isCorrectSubmission(challenge, 42), /Invalid input/);
    assert.throws(() => getTypingProgress(SYNTAX, null), /Invalid input/);
});

test("every real challenge is correct when typed exactly", () => {
    for(const language of LANGUAGES) {
        for(const difficulty of DIFFICULTY) {
            const c = getChallenge(language, difficulty);
            assert.equal(isCorrectSubmission(c, c.syntax), true, c.id);
            assert.equal(getTypingProgress(c.syntax, c.syntax).complete, true, c.id);
        }
    }
});
