const { test } = require("node:test");
const assert = require("node:assert/strict");
const { getChallenge, difficultyForBoss, LANGUAGES, DIFFICULTY } = require("../server/challenges");

test("returns a valid challenge for every supported language and difficulty", () => {
    for (const language of LANGUAGES) {
        for (const difficulty of DIFFICULTY) {
            const c = getChallenge(language, difficulty);
            assert.ok(c, `${language}/${difficulty} returned nothing.`);
            assert.strictEqual(c.language, language);
            assert.strictEqual(c.difficulty, difficulty);
            assert.strictEqual(typeof c.syntax, "string");
            assert.ok(c.syntax.length > 0);
        }
    }
});

test("language ang difficulty are case-insensitive", () => {
    const c = getChallenge("pYtHoN", "EaSy");
    assert.strictEqual(c.language,   "python");
    assert.strictEqual(c.difficulty, "EASY");
});

test("does not repeat a challenge until pool is empty", () => {
    const used = [];
    for(let i = 0; i < 4; i++) {
        const c = getChallenge("java", "MEDIUM", used);
        assert.ok(!used.includes(c.id), `repeated ${c.id} too early`);
        used.push(c.id);
    }
    assert.ok(getChallenge("java", "MEDIUM", used).id); // 5th call: pool empty
});

test("throw on unsupported language", () => {
    for(const language of ["cobol", "lua", "cpp"]) {
        assert.throws( 
            () => getChallenge(language, "HARD"),
            new RegExp(`Unsupported language: "${language}"`),
        );
    }
});

test("throw on unsupported difficulty", () => {
    for(const difficulty of ["extreme", "hell", "SIMPLE"]) {
        assert.throws( 
            () => getChallenge("javascript", difficulty),
            new RegExp(`Unsupported difficulty: "${difficulty}"`),
        );
    }
});

test("difficultyForBoss maps and clamps boss order", () => {
    assert.equal(difficultyForBoss(0), "EASY");
    assert.equal(difficultyForBoss(1), "MEDIUM");
    assert.equal(difficultyForBoss(2), "HARD");
    assert.equal(difficultyForBoss(-1), "EASY");
    assert.equal(difficultyForBoss(99), "HARD");
});
