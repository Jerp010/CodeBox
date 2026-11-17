/**
 * Alt+C4 Phase 2 integration tests: room creation, joining, role assignment,
 * lobby permissions, start gating, resume safety, and room isolation.
 *
 * Expected RED until Phase 2 (server/index.js + networking) exists.
 * Contract: docs/altc4/contracts.md
 *
 * Run: node --test tests/altc4/lobby.network.test.cjs
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const WebSocket = require('ws');

const REQUEST_TIMEOUT_MS = 2000;

function requireServerFactory() {
  try {
    return require('../../server/index.js').createServer;
  } catch (error) {
    throw new Error(
      `Phase 2 backend missing: server/index.js must export createServer() (${error.message})`,
    );
  }
}

async function startBackend(t) {
  const createServer = requireServerFactory();
  const server = createServer();
  assert.equal(typeof server.listen, 'function', 'createServer() must return a Node HTTP server');
  assert.equal(server.listening, false, 'createServer() must not listen on its own');
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  const url = `ws://127.0.0.1:${port}/ws`;
  const clients = new Set();
  const ctx = {
    server,
    url,
    connect() {
      const client = new Client(url);
      clients.add(client);
      return client;
    },
    async close() {
      await Promise.all([...clients].map((c) => c.close()));
      await new Promise((resolve) => server.close(resolve));
    },
  };
  t.after(() => ctx.close());
  return ctx;
}

class Client {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.pending = new Map();
    this.broadcasts = [];
    this.waiters = [];
    this.roomId = '';
    this.closed = false;
    this.opened = new Promise((resolve, reject) => {
      this.ws.once('open', resolve);
      this.ws.once('error', reject);
    });
    this.ws.on('message', (data) => this._onMessage(data));
  }

  _onMessage(data) {
    let message;
    try {
      message = JSON.parse(String(data));
    } catch {
      return;
    }
    const requestId = message && message.payload && message.payload.requestId;
    if (requestId && this.pending.has(requestId)) {
      const entry = this.pending.get(requestId);
      this.pending.delete(requestId);
      clearTimeout(entry.timer);
      entry.resolve(message);
      return;
    }
    this.broadcasts.push(message);
    for (const waiter of [...this.waiters]) {
      if (waiter.match(message)) {
        this.waiters.splice(this.waiters.indexOf(waiter), 1);
        clearTimeout(waiter.timer);
        waiter.resolve(message);
      }
    }
  }

  async send(type, payload = {}, options = {}) {
    await this.opened;
    const id = options.id || crypto.randomUUID();
    const envelope = {
      v: 1,
      id,
      type,
      roomId: options.roomId !== undefined ? options.roomId : this.roomId,
      roundNo: options.roundNo !== undefined ? options.roundNo : 0,
      payload,
    };
    const response = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`timed out after ${REQUEST_TIMEOUT_MS}ms waiting for ${type} (id=${id})`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
    });
    this.ws.send(JSON.stringify(envelope));
    return response;
  }

  /** Send a request and return its correlated response (ignores broadcasts). */
  request(type, payload, options) {
    return this.send(type, payload, options);
  }

  waitBroadcast(match, timeoutMs = REQUEST_TIMEOUT_MS) {
    const existing = this.broadcasts.findLast(match);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const waiter = { match, resolve, timer: null };
      waiter.timer = setTimeout(() => {
        this.waiters.splice(this.waiters.indexOf(waiter), 1);
        reject(new Error(`timed out waiting for broadcast on ${this.ws.url}`));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(new Error('socket closed'));
    }
    this.pending.clear();
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error('socket closed'));
    }
    this.waiters = [];
    if (this.ws.readyState === WebSocket.CLOSED) return;
    await new Promise((resolve) => {
      this.ws.once('close', resolve);
      this.ws.close();
    });
  }
}

async function expectError(client, type, payload, codes, options) {
  const response = await client.request(type, payload, options);
  assert.equal(response.type, 'error', `expected error for ${type}, got ${response.type}`);
  assert.ok(response.payload && typeof response.payload.code === 'string', 'error must carry a code');
  assert.ok(
    codes.includes(response.payload.code),
    `expected one of [${codes.join(', ')}] for ${type}, got ${response.payload.code}`,
  );
  return response;
}

function assertNoResumeToken(value, where) {
  assert.ok(
    !JSON.stringify(value).toLowerCase().includes('resumetoken'),
    `${where} must not expose resumeToken`,
  );
}

async function createRoom(ctx) {
  const host = ctx.connect();
  const response = await host.request('create_room', { displayName: 'Host Jeff' });
  assert.equal(response.type, 'room_created', `create_room failed: ${JSON.stringify(response)}`);
  const { roomId, joinCode, participantId, resumeToken } = response.payload;
  assert.ok(roomId, 'room_created must include roomId');
  assert.match(joinCode, /^[A-Z2-9]{6}$/, 'joinCode must be 6 unambiguous characters');
  assert.ok(participantId, 'room_created must include a server-assigned participantId');
  assert.ok(resumeToken, 'host must privately receive a resumeToken');
  assertNoResumeToken(response.payload.lobbyState || {}, 'room_created lobbyState');
  host.roomId = roomId;
  host.joinCode = joinCode;
  host.participantId = participantId;
  host.resumeToken = resumeToken;
  return host;
}

async function joinPlayer(ctx, host, displayName) {
  const player = ctx.connect();
  const response = await player.request('join', { joinCode: host.joinCode, displayName });
  assert.equal(response.type, 'joined', `join failed: ${JSON.stringify(response)}`);
  assert.equal(response.payload.roomId, host.roomId, 'join must resolve the room from joinCode');
  assert.ok(response.payload.participantId, 'join must assign participantId server-side');
  assert.ok(response.payload.resumeToken, 'player must privately receive a resumeToken');
  assertNoResumeToken(response.payload.lobbyState || {}, 'joined lobbyState');
  player.roomId = host.roomId;
  player.participantId = response.payload.participantId;
  player.resumeToken = response.payload.resumeToken;
  return player;
}

async function waitForLobbyRoles(host, expectedParticipants) {
  return host.waitBroadcast(
    (m) =>
      m.type === 'lobby_state' &&
      m.payload &&
      Array.isArray(m.payload.participants) &&
      m.payload.participants.length >= expectedParticipants,
  );
}

test('create_room then two joins assign exactly one specHolder and one programmer without leaking resumeToken', async (t) => {
  const ctx = await startBackend(t);
  const host = await createRoom(ctx);
  const p1 = await joinPlayer(ctx, host, 'Player One');
  const p2 = await joinPlayer(ctx, host, 'Player Two');

  const lobby = await waitForLobbyRoles(host, 3);
  assertNoResumeToken(lobby, 'public lobby_state broadcast');

  const roles = lobby.payload.participants
    .filter((p) => p.role === 'specHolder' || p.role === 'programmer')
    .map((p) => p.role);
  assert.equal(roles.filter((r) => r === 'specHolder').length, 1, 'exactly one specHolder');
  assert.equal(roles.filter((r) => r === 'programmer').length, 1, 'exactly one programmer');

  const playerIds = lobby.payload.participants
    .filter((p) => p.slot === 'player')
    .map((p) => p.participantId);
  assert.deepEqual(
    [...playerIds].sort(),
    [p1.participantId, p2.participantId].sort(),
    'both player sockets own exactly one seat each',
  );
});

test('a third player is rejected with room_full and cannot displace existing role holders', async (t) => {
  const ctx = await startBackend(t);
  const host = await createRoom(ctx);
  await joinPlayer(ctx, host, 'Player One');
  await joinPlayer(ctx, host, 'Player Two');
  await waitForLobbyRoles(host, 3);

  const third = ctx.connect();
  await expectError(third, 'join', { joinCode: host.joinCode, displayName: 'Intruder' }, [
    'room_full',
    'not_joinable',
  ]);

  const lobby = await host.waitBroadcast((m) => m.type === 'lobby_state');
  const players = lobby.payload.participants.filter((p) => p.slot === 'player');
  assert.equal(players.length, 2, 'room must never hold more than two players');
});

test('players cannot configure the room or start the round', async (t) => {
  const ctx = await startBackend(t);
  const host = await createRoom(ctx);
  const p1 = await joinPlayer(ctx, host, 'Player One');
  const p2 = await joinPlayer(ctx, host, 'Player Two');
  await waitForLobbyRoles(host, 3);

  await expectError(p1, 'set_config', { durationSec: 300 }, ['wrong_role', 'unauthorized']);
  await expectError(p1, 'start_round', {}, ['wrong_role', 'unauthorized', 'not_joinable']);
  await expectError(p2, 'start_round', {}, ['wrong_role', 'unauthorized', 'not_joinable']);

  const lobby = await host.waitBroadcast((m) => m.type === 'lobby_state');
  assert.equal(lobby.payload.phase, 'lobby', 'unauthorized actions must not start a round');
});

test('only the host configures the room and invalid configuration is rejected', async (t) => {
  const ctx = await startBackend(t);
  const host = await createRoom(ctx);
  await joinPlayer(ctx, host, 'Player One');
  await joinPlayer(ctx, host, 'Player Two');
  await waitForLobbyRoles(host, 3);

  const applied = await host.request('set_config', {
    durationSec: 300,
    panelCount: 3,
    language: 'java',
  });
  assert.ok(applied.type !== 'error', `valid config rejected: ${JSON.stringify(applied.payload)}`);
  const conf = (applied.payload.lobbyState || applied.payload).config;
  assert.deepEqual(conf, { durationSec: 300, panelCount: 3, language: 'java' });

  for (const bad of [
    { durationSec: 30 },
    { durationSec: 5000 },
    { panelCount: 1 },
    { panelCount: 6 },
    { language: 'javascript' },
  ]) {
    await expectError(host, 'set_config', bad, ['bad_request', 'invalid_config']);
  }

  const lobby = await host.waitBroadcast((m) => m.type === 'lobby_state');
  assert.equal(lobby.payload.config.language, 'java', 'rejected config must not apply');
});

test('host start requires both players ready and returns round_started with assigned roles', async (t) => {
  const ctx = await startBackend(t);
  const host = await createRoom(ctx);
  const p1 = await joinPlayer(ctx, host, 'Player One');
  const p2 = await joinPlayer(ctx, host, 'Player Two');
  await waitForLobbyRoles(host, 3);

  await host.request('set_config', { durationSec: 300, panelCount: 3, language: 'python' });

  await expectError(host, 'start_round', {}, ['not_joinable', 'bad_request'], {});

  const ready1 = await p1.request('set_ready', { ready: true });
  assert.ok(ready1.type !== 'error', `p1 ready failed: ${JSON.stringify(ready1.payload)}`);
  const ready2 = await p2.request('set_ready', { ready: true });
  assert.ok(ready2.type !== 'error', `p2 ready failed: ${JSON.stringify(ready2.payload)}`);

  const started = await host.request('start_round', {});
  assert.equal(started.type, 'round_started', `start failed: ${JSON.stringify(started.payload)}`);
  assert.ok(started.roundNo >= 1, 'round_started must carry roundNo');

  const roles =
    started.payload.roles ||
    (started.payload.lobbyState && started.payload.lobbyState.participants);
  assert.ok(roles, 'round_started must expose role assignments');
  const roleValues = Array.isArray(roles)
    ? roles.map((p) => p.role)
    : Object.values(roles);
  assert.equal(roleValues.filter((r) => r === 'specHolder').length, 1);
  assert.equal(roleValues.filter((r) => r === 'programmer').length, 1);
  assertNoResumeToken(started.payload, 'round_started payload');
});

test('duplicate start_round is rejected or idempotent for the same round', async (t) => {
  const ctx = await startBackend(t);
  const host = await createRoom(ctx);
  const p1 = await joinPlayer(ctx, host, 'Player One');
  const p2 = await joinPlayer(ctx, host, 'Player Two');
  await waitForLobbyRoles(host, 3);

  await host.request('set_config', { durationSec: 300, panelCount: 3, language: 'cpp' });
  await p1.request('set_ready', { ready: true });
  await p2.request('set_ready', { ready: true });
  const first = await host.request('start_round', {});
  assert.equal(first.type, 'round_started');

  const duplicate = await host.request('start_round', {});
  if (duplicate.type === 'error') {
    assert.ok(
      ['stale_round', 'not_joinable', 'round_terminal', 'bad_request', 'wrong_role'].includes(
        duplicate.payload.code,
      ),
      `unexpected duplicate-start error: ${duplicate.payload.code}`,
    );
  } else {
    assert.equal(duplicate.type, 'round_started', 'idempotent start must still report the round');
    assert.equal(duplicate.roundNo, first.roundNo, 'duplicate start must not advance roundNo');
  }

  await new Promise((resolve) => setTimeout(resolve, 200));
  const roundNumbers = host.broadcasts
    .filter((m) => m.type === 'round_started')
    .map((m) => m.roundNo);
  assert.ok(
    roundNumbers.every((n) => n === first.roundNo),
    `duplicate start created extra rounds: ${JSON.stringify(roundNumbers)}`,
  );
});

test('an invalid resume token grants no host powers and invalidates no live host', async (t) => {
  const ctx = await startBackend(t);
  const host = await createRoom(ctx);
  await joinPlayer(ctx, host, 'Player One');
  await joinPlayer(ctx, host, 'Player Two');
  await waitForLobbyRoles(host, 3);

  const impostor = ctx.connect();
  const resume = await expectError(impostor, 'resume', { resumeToken: 'not-a-real-token' }, [
    'invalid_resume_token',
  ]);
  assert.equal(resume.roomId, '', 'failed resume must not bind a room');

  await expectError(impostor, 'set_config', { durationSec: 300 }, [
    'unauthorized',
    'invalid_resume_token',
    'wrong_role',
  ]);
  await expectError(impostor, 'start_round', {}, [
    'unauthorized',
    'invalid_resume_token',
    'wrong_role',
    'not_joinable',
  ]);

  const stillHost = await host.request('set_config', { durationSec: 240, panelCount: 4, language: 'java' });
  assert.ok(stillHost.type !== 'error', 'valid host must remain in control after invalid resume attempts');
});

test('an action addressed to another room is rejected and rooms stay isolated', async (t) => {
  const ctx = await startBackend(t);
  const hostA = await createRoom(ctx);
  await joinPlayer(ctx, hostA, 'A One');
  const playerA2 = await joinPlayer(ctx, hostA, 'A Two');
  await waitForLobbyRoles(hostA, 3);

  const hostB = await createRoom(ctx);
  await joinPlayer(ctx, hostB, 'B One');
  await joinPlayer(ctx, hostB, 'B Two');
  await waitForLobbyRoles(hostB, 3);

  await expectError(
    playerA2,
    'set_ready',
    { ready: true },
    ['unauthorized', 'wrong_role', 'stale_round', 'bad_request', 'not_joinable'],
    { roomId: hostB.roomId },
  );
  await expectError(
    playerA2,
    'start_round',
    {},
    ['unauthorized', 'wrong_role', 'stale_round', 'bad_request', 'not_joinable'],
    { roomId: hostB.roomId },
  );

  await new Promise((resolve) => setTimeout(resolve, 200));
  const roomBReady = hostB.broadcasts.some(
    (m) =>
      m.type === 'lobby_state' &&
      Array.isArray(m.payload.participants) &&
      m.payload.participants.some((p) => p.ready === true),
  );
  assert.equal(roomBReady, false, 'cross-room action must not mutate room B');

  const backInA = await hostA.request('set_config', { durationSec: 300, panelCount: 3, language: 'cpp' });
  assert.ok(backInA.type !== 'error', 'room A must still accept its own host actions');
});
