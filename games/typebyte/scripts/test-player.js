const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createPlayer } = require("../server/languages");
const { damagePlayer, allPlayersDefeated } = require("../server/player");
const { PLAYER_MAX_HEALTH } = require("../server/constants");

test("createPlayer starts at full health and not defeated", () => {
    const player = createPlayer("p1", "Anson");
    assert.equal(player.maxHealth, PLAYER_MAX_HEALTH);
    assert.equal(player.health, PLAYER_MAX_HEALTH);
    assert.equal(player.defeated, false);
});

test("damagePlayer reduces health", () => {
    const player = createPlayer("p1", "Anson");
    damagePlayer(player, 2);
    assert.equal(player.health, PLAYER_MAX_HEALTH - 2);
    assert.equal(player.defeated, false);
});

test("player is defeated when health reaches 0", () => {
    const player = createPlayer("p1", "Anson");
    for(let i = 0; i < PLAYER_MAX_HEALTH; i++) {
        damagePlayer(player, 1);
    }
    assert.equal(player.health, 0);
    assert.equal(player.defeated, true);
});

test("damagePlayer never goes below 0", () => {
    const player = createPlayer("p1", "Anson");
    damagePlayer(player, 999);
    assert.equal(player.health, 0);
    assert.equal(player.defeated, true);
});

test("damagePlayer does nothing to an already defeated player", () => {
    const player = createPlayer("p1", "Anson");
    damagePlayer(player, 999);
    damagePlayer(player, 1);
    assert.equal(player.health, 0);
    assert.equal(player.defeated, true);
});

test("damagePlayer rejects bad amounts", () => {
    const player = createPlayer("p1", "Anson");
    assert.throws(() => damagePlayer(player, -1), /Invalid damage amount/);
    assert.throws(() => damagePlayer(player, NaN), /Invalid damage amount/);
    assert.equal(player.health, PLAYER_MAX_HEALTH); // unchanged after failed hit
});

test("damagePlayer only affects the player that was hit", () => {
    const p1 = createPlayer("p1", "Anson");
    const p2 = createPlayer("p1", "Ansel");
    damagePlayer(p1, 1);
    assert.equal(p1.health, PLAYER_MAX_HEALTH - 1);
    assert.equal(p2.health, PLAYER_MAX_HEALTH);
});

test("allPlayersDefeated is true only when everyone is defeated", () => {
    const p1 = createPlayer("p1", "Anson");
    const p2 = createPlayer("p1", "Ansel");
    assert.equal(allPlayersDefeated([p1, p2]), false);
    damagePlayer(p1, 999);
    assert.equal(allPlayersDefeated([p1, p2]), false);
    damagePlayer(p2, 999);
    assert.equal(allPlayersDefeated([p1, p2]), true);
});

test("allPlayersDefeated is false for an empty list", () => {
    assert.equal(allPlayersDefeated([]), false);
})
