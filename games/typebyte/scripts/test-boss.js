const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createBoss, damageBoss, hasNextBoss, bossAttack } = require("../server/boss");
const { createPlayer } = require("../server/languages");
const { damagePlayer } = require("../server/player");
const { BOSS_HEALTH_PER_PLAYER, MIN_PLAYER_COUNT, BOSS_ATTACK_DAMAGE, PLAYER_MAX_HEALTH } = require("../server/constants");

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

test("bossAttack hurts the player by BOSS_ATTACK_DAMAGE and reports it", () => {
    const boss = createBoss(0, 2);
    const player = createPlayer("p1", "Anson");
    const result = bossAttack(boss, player);
    assert.deepEqual(result, {
        attacked: true,
        playerId: "p1",
        damage:   BOSS_ATTACK_DAMAGE,
        health:   PLAYER_MAX_HEALTH - BOSS_ATTACK_DAMAGE,
        defeated: false,
    });
    assert.equal(player.health, PLAYER_MAX_HEALTH - BOSS_ATTACK_DAMAGE);
});

test("bossAttack defeats a player after enough hits", () => {
    const boss = createBoss(0, 2);
    const player = createPlayer("p1", "Jeff");
    let result;
    for(let i = 0; i < PLAYER_MAX_HEALTH; i++) {
        result = bossAttack(boss, player);
    }
    assert.equal(result.defeated, true); // result
    assert.equal(player.health, 0);      // player
    assert.equal(player.defeated, true);
});

test("bossAttack only affects the targeted player", () => {
    const boss = createBoss(0, 2);
    const p1   = createPlayer("p1", "Anson");
    const p2   = createPlayer("p2", "Ansel");
    bossAttack(boss, p1);
    assert.equal(p2.health, PLAYER_MAX_HEALTH);
});

test("bossAttack does nothing to an already defeated player", () => {
    const boss = createBoss(0, 2);
    const player = createPlayer("p1", "Anson");
    damagePlayer(player, 999);
    const result = bossAttack(boss, player);
    assert.equal(result.attacked, false);
    assert.equal(result.damage, 0);
    assert.equal(result.health, 0);
});

test("bossAttack does nothing once the boss is defeated", () => {
    const boss = createBoss(1, 3);
    const player = createPlayer("p2", "Marquez");
    damageBoss(boss, 999);
    const result = bossAttack(boss, player);
    assert.equal(result.attacked, false);
    assert.equal(result.damage, 0);
    assert.equal(result.health, PLAYER_MAX_HEALTH);
});
