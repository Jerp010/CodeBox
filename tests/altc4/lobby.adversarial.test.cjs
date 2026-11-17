const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const WebSocket = require('ws');

async function setup(t) {
  const server = require('../../server/index.js').createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const clients = [];
  t.after(async () => {
    for (const client of clients) client.ws.terminate();
    await new Promise((resolve) => server.close(resolve));
  });
  async function connect() {
    const ws = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws`);
    const messages = [];
    const pending = new Map();
    ws.on('message', (data) => {
      const message = JSON.parse(String(data));
      messages.push(message);
      const entry = pending.get(message.payload?.requestId);
      if (entry) {
        clearTimeout(entry.timer);
        pending.delete(message.payload.requestId);
        entry.resolve(message);
      }
    });
    const client = { ws, messages, roomId: '', roundNo: 0,
      request(type, payload = {}, overrides = {}) {
        const request = { v: 1, id: randomUUID(), type, roomId: this.roomId,
          roundNo: this.roundNo, payload, ...overrides };
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => { pending.delete(request.id); reject(new Error(`No reply to ${type}`)); }, 2000);
          pending.set(request.id, { resolve, timer });
          ws.send(JSON.stringify(request));
        });
      },
    };
    clients.push(client);
    await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
    return client;
  }
  async function host(name = 'Host') {
    const client = await connect();
    const response = await client.request('create_room', { displayName: name });
    assert.equal(response.type, 'room_created');
    Object.assign(client, response.payload);
    return client;
  }
  async function player(owner, name) {
    const client = await connect();
    const response = await client.request('join', { joinCode: owner.joinCode, displayName: name });
    assert.equal(response.type, 'joined');
    Object.assign(client, response.payload);
    return client;
  }
  return { connect, host, player };
}

function rejected(response, code) {
  assert.equal(response.type, 'error');
  if (code) assert.equal(response.payload.code, code);
}

test('a host cannot address another host room or mutate it through a forged envelope', async (t) => {
  const { host } = await setup(t);
  const first = await host('First');
  const second = await host('Second');
  rejected(await first.request('set_config', { durationSec: 900 }, { roomId: second.roomId }));
  const snapshot = await second.request('set_ready', { ready: false });
  assert.equal(snapshot.type, 'lobby_state');
  assert.equal(snapshot.payload.config.durationSec, 300);
});

test('resume rotates the token and closing the replaced socket keeps the new identity connected', async (t) => {
  const { host, connect } = await setup(t);
  const original = await host();
  const oldToken = original.resumeToken;
  const resumed = await connect();
  const response = await resumed.request('resume', { resumeToken: oldToken });
  assert.equal(response.type, 'resumed');
  assert.equal(response.payload.participantId, original.participantId);
  assert.notEqual(response.payload.resumeToken, oldToken);
  Object.assign(resumed, response.payload);
  const impostor = await connect();
  rejected(await impostor.request('resume', { resumeToken: oldToken }), 'invalid_resume_token');
  const state = await resumed.request('set_config', { durationSec: 240 });
  assert.equal(state.type, 'lobby_state');
  assert.equal(state.payload.participants.find((p) => p.participantId === original.participantId).connection, 'connected');
});

test('changing configuration clears player readiness and stale round messages cannot change settings', async (t) => {
  const { host, player } = await setup(t);
  const owner = await host();
  const one = await player(owner, 'One');
  const two = await player(owner, 'Two');
  await one.request('set_ready', { ready: true });
  await two.request('set_ready', { ready: true });
  const changed = await owner.request('set_config', { language: 'python' });
  assert.equal(changed.type, 'lobby_state');
  assert.ok(changed.payload.participants.filter((p) => p.slot === 'player').every((p) => !p.ready));
  rejected(await owner.request('start_round'));
  rejected(await owner.request('set_config', { language: 'cpp' }, { roundNo: 999 }));
});

test('reusing a request id with changed content cannot apply a second configuration', async (t) => {
  const { host } = await setup(t);
  const owner = await host();
  const id = randomUUID();
  const first = await owner.request('set_config', { durationSec: 240 }, { id });
  assert.equal(first.type, 'lobby_state');
  const duplicate = await owner.request('set_config', { durationSec: 900 }, { id });
  assert.ok(duplicate.type === 'error' || duplicate.payload.config?.durationSec === 240);
  const state = await owner.request('set_ready', { ready: false });
  assert.equal(state.payload.config.durationSec, 240);
});
