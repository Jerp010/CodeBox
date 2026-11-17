'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const WebSocket = require('ws');
const { createServer } = require('../../server/index.js');

async function start(t, options = {}) {
  const server = createServer(options);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const sockets = new Set();
  t.after(async () => {
    for (const ws of sockets) ws.terminate();
    await new Promise((resolve) => server.close(resolve));
  });
  const ws = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws`);
  sockets.add(ws);
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  return { ws };
}

function request(ws, envelope) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('request timed out')), 1500);
    const onMessage = (data) => {
      const message = JSON.parse(String(data));
      if (message.payload?.requestId !== envelope.id) return;
      clearTimeout(timer);
      ws.off('message', onMessage);
      resolve(message);
    };
    ws.on('message', onMessage);
    ws.send(JSON.stringify(envelope));
  });
}

test('handshake rejects identity fields outside its allowlist', async (t) => {
  const { ws } = await start(t);
  const reply = await request(ws, {
    v: 1, id: randomUUID(), type: 'create_room', roomId: '', roundNo: 0,
    payload: { displayName: 'Host', participantId: 'forged' },
  });
  assert.equal(reply.type, 'error');
  assert.equal(reply.payload.code, 'bad_request');
});

test('socket message rate limit includes repeated request ids', async (t) => {
  const { ws } = await start(t);
  const replies = [];
  for (let i = 0; i < 11; i += 1) {
    const id = replies.length === 0 ? randomUUID() : replies[0].id;
    replies.push(await request(ws, {
      v: 1, id, type: 'heartbeat', roomId: '', roundNo: 0, payload: {},
    }));
  }
  assert.equal(replies[10].type, 'error');
  assert.equal(replies[10].payload.code, 'rate_limited');
});

test('a frame over 32 KiB is rejected and the connection is closed', async (t) => {
  const { ws } = await start(t);
  const reply = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('oversized-frame error timed out')), 1500);
    ws.on('message', (data) => {
      const message = JSON.parse(String(data));
      if (message.type !== 'error') return;
      clearTimeout(timer);
      resolve(message);
    });
  });
  ws.send(JSON.stringify({
    v: 1, id: randomUUID(), type: 'heartbeat', roomId: '', roundNo: 0,
    payload: { blob: 'x'.repeat(32 * 1024) },
  }));
  const error = await reply;
  assert.equal(error.payload.code, 'payload_too_large');
  await new Promise((resolve) => ws.once('close', resolve));
});


test('silent and rejected unbound sockets expire, freeing the connection slot', async (t) => {
  const handshakeTimeoutMs = 240;
  const { ws: silent } = await start(t, { handshakeTimeoutMs, maxConnections: 1 });
  const full = new WebSocket(silent.url);
  t.after(() => full.terminate());
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('connection cap did not reject a second socket')), 1000);
    full.once('close', (code) => {
      clearTimeout(timer);
      assert.equal(code, 1013);
      resolve();
    });
    full.once('error', () => {});
  });
  await new Promise((resolve, reject) =>{
    const timer = setTimeout(() => reject(new Error('silent handshake socket did not expire')), 1000);
    silent.once('close', () => { clearTimeout(timer); resolve(); });
  });

  const rejected = new WebSocket(`ws://127.0.0.1:${silent.url.match(/:(\d+)\//)[1]}/ws`);
  // The previous socket's URL contains the ephemeral port and the slot is now free.
  await new Promise((resolve, reject) => {
    rejected.once('open', resolve);
    rejected.once('error', reject);
  });
  t.after(() => rejected.terminate());
  const rejectedAt = Date.now();
  await new Promise((resolve) => setTimeout(resolve, handshakeTimeoutMs / 2));
  const error = await request(rejected, {
    v: 1, id: randomUUID(), type: 'resume', roomId: '', roundNo: 0,
    payload: { resumeToken: 'invalid-token' },
  });
  assert.equal(error.payload.code, 'invalid_resume_token');
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('rejected handshake socket did not expire')), 1000);
    rejected.once('close', () => { clearTimeout(timer); resolve(); });
  });
  assert.ok(Date.now() - rejectedAt < handshakeTimeoutMs + 100, 'client messages must not extend the original handshake deadline');

  const replacement = new WebSocket(rejected.url);
  t.after(() => replacement.terminate());
  await new Promise((resolve, reject) => {
    replacement.once('open', resolve);
    replacement.once('error', reject);
  });
  const created = await request(replacement, {
    v: 1, id: randomUUID(), type: 'create_room', roomId: '', roundNo: 0,
    payload: { displayName: 'Host' },
  });
  assert.equal(created.type, 'room_created');
});
