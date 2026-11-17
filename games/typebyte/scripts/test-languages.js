const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createPlayer, setPlayerLanguage } = require("../server/languages");
const { LANGUAGES } = require("../server/challenges");

test("createPlayer with default language", () => {
    const player = createPlayer("p1", "Jeff");
    assert.equal(player.id, "p1");
    assert.equal(player.name, "Jeff");
    assert.equal(player.language, LANGUAGES[0]);
});

// objects are shared, primitives are copied
test("setPlayerLanguage accepts a supported language and lowercase it", () => {
    const player = createPlayer("p1", "Jeff");
    const updated = setPlayerLanguage(player, "JAVASCRIPT", false);
    assert.equal(updated.language, "javascript");
    assert.equal(player.language, "javascript"); // mutated object
    assert.equal(player, updated);               // same object
});

test("setPlayerLanguage rejects unsupported language", () => {
    const player = createPlayer("p1", "Jeff");
    assert.throws(
        () => setPlayerLanguage(player, "cpp", false),
        /Unsupported language: "cpp"/,
    );
    assert.equal(player.language, LANGUAGES[0]); // unchanged after failed change
});

test("setPlayerLanguage is not allowed to change when the game is started", () => {
    const player = createPlayer("p1", "Jeff");
    assert.throws(
        () => setPlayerLanguage(player, "java", true),
        /Cannot change language: the game has already started/,
    );
    assert.equal(player.language, LANGUAGES[0]); // unchanged after failed change
});
