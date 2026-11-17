const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createBoss, damageBoss, hasNextBoss } = require("../server/boss");
const { BOSS_HEALTH_PER_PLAYER, MIN_PLAYER_COUNT } = require("../server/constants");

test("createBoss scales health with player count", () => {
    const boss = createBoss(0, 4);
    assert.equal(boss.maxHealth, BOSS_HEALTH_PER_PLAYER * 4);
    assert.equal(boss.health, boss.maxHealth);
    assert.equal(boss.defeated, false);
});

test("createBoss maps boss order to difficulty", () => {
    assert.equal(createBoss(0, 2).difficulty, "EASY");
    assert.equal(createBoss(1, 2).difficulty, "MEDIUM");
    assert.equal(createBoss(2, 2).difficulty, "HARD");
});

test("createBoss rejects bad input", () => {
    assert.throws(() => createBoss(-1, 2), /Invalid boss index/);
    assert.throws(() => createBoss(99, 2), /Invalid boss index/);
    assert.throws(
        () => createBoss(0, 0), 
        new RegExp(`at least ${MIN_PLAYER_COUNT} player`),
    );
    assert.throws(() => createBoss(0, 9), /exceeds the maximum allowed/);
});

test("damageBoss reduces health", () => {
    const boss = createBoss(0, 4);
    damageBoss(boss, 10);
    assert.equal(boss.health, (BOSS_HEALTH_PER_PLAYER * 4) - 10);
    assert.equal(boss.defeated, false);
});

test("damageBoss defeats the boss and health never goes below 0", () => {
    const boss = createBoss(2, 8);
    damageBoss(boss, 999);
    assert.equal(boss.health, 0);
    assert.equal(boss.defeated, true);
});

test("damageBoss does nothing to an already defeated boss", () => {
    const boss = createBoss(0, 3);
    damageBoss(boss, 999);
    damageBoss(boss, 5);
    assert.equal(boss.health, 0);
    assert.equal(boss.defeated, true);
});

test("hasNextBoss is false only after the last boss", () => {
    assert.equal(hasNextBoss(0), true);
    assert.equal(hasNextBoss(1), true);
    assert.equal(hasNextBoss(2), false);
});
