'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const http = require('node:http');
const express = require('express');
const WebSocket = require('ws');
const { LobbyRegistry, LobbyError } = require('../dist-server/games/altc4/server/lobby.js');

const MAX_FRAME_BYTES = 32 * 1024;
const MAX_MESSAGES_PER_SECOND = 10;
const MAX_REQUEST_CACHE = 128;
const MAX_CONNECTIONS = 200;
const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeRegistry(baseUrl, maxRooms) {
  return new LobbyRegistry({
    roomId: () => crypto.randomUUID(),
    participantId: () => crypto.randomUUID(),
    joinCode: () => Array.from(crypto.randomBytes(6), (n) => JOIN_CODE_ALPHABET[n % JOIN_CODE_ALPHABET.length]).join(''),
    resumeToken: () => crypto.randomBytes(32).toString('base64url'),
    choosePlayerRoles: () => crypto.randomInt(0, 2) === 0 ? ['specHolder', 'programmer'] : ['programmer', 'specHolder'],
    baseUrl,
    maxRooms,
  });
}

function roleView(role) {
  const views = {
    host: { title: 'Host', instructions: ['You control the lobby and start the round.', 'The game puzzles are not implemented yet.'] },
    specHolder: { title: 'Spec Holder', instructions: ['You will receive the private brief when gameplay is implemented.', 'The game puzzles are not implemented yet.'] },
    programmer: { title: 'Programmer', instructions: ['You will receive constrained code panels when gameplay is implemented.', 'The game puzzles are not implemented yet.'] },
  };
  return { role, ...views[role] };
}

function createServer(options = {}) {
  const app = express();
  const playerDist = options.playerDist || path.resolve(__dirname, '..', 'apps', 'player', 'dist');
  const configuredBaseUrl = options.backendBaseUrl || process.env.ALTC4_BACKEND_BASE_URL || null;
  const backendBaseUrl = configuredBaseUrl || `http://localhost:${process.env.PORT || 3000}`;
  const maxRooms = Number.isInteger(options.maxRooms) && options.maxRooms > 0 ? options.maxRooms : 500;
  const handshakeTimeoutMs = options.handshakeTimeoutMs ?? 10000;
  const maxConnections = options.maxConnections ?? MAX_CONNECTIONS;
  if (!Number.isInteger(handshakeTimeoutMs) || handshakeTimeoutMs < 1 || handshakeTimeoutMs > 120000) {
    throw new RangeError('handshakeTimeoutMs must be an integer from 1 to 120000');
  }
  if (!Number.isInteger(maxConnections) || maxConnections < 1 || maxConnections > 10000) {
    throw new RangeError('maxConnections must be an integer from 1 to 10000');
  }
  const registry = makeRegistry(backendBaseUrl, maxRooms);
  const httpServer = http.createServer(app);
  const wss = new WebSocket.Server({ noServer: true, maxPayload: MAX_FRAME_BYTES * 2 });
  const connections = new Set();
  let heartbeatTimer;
  let closing = false;

  app.get('/health', (_req, res) => res.status(200).json({ ok: true }));
  app.use(express.static(playerDist, { index: 'index.html', fallthrough: false, dotfiles: 'ignore' }));
  app.use((err, _req, res, _next) => {
    if (err && err.status === 404) return res.status(404).send('Not found');
    return res.status(500).send('Server error');
  });

  httpServer.on('listening', () => {
    if (configuredBaseUrl) return;
    const address = httpServer.address();
    if (address && typeof address === 'object') {
      const host = address.address === '0.0.0.0' || address.address === '::' ? 'localhost' : address.address;
      registry.setBaseUrl(`http://${host}:${address.port}`);
    }
  });

  httpServer.on('upgrade', (request, socket, head) => {
    let pathname;
    try { pathname = new URL(request.url, 'http://localhost').pathname; } catch { socket.destroy(); return; }
    if (pathname !== '/ws') { socket.destroy(); return; }
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
  });

  function safeSend(ws, message) {
    if (ws.readyState !== WebSocket.OPEN) return;
    try { ws.send(JSON.stringify(message)); } catch { /* socket may close between the state check and send */ }
  }

  function responseEnvelope(type, payload, state, id) {
    return { v: 1, id, type, roomId: state?.roomId || '', roundNo: state?.round?.roundNo || 0, payload };
  }

  function publicMessage(type, state, recipient, requestId) {
    const person = state.participants.find((p) => p.participantId === recipient.participantId);
    const payload = { ...state, roleView: roleView(person?.role || 'host') };
    if (requestId) payload.requestId = requestId;
    return responseEnvelope(type, payload, state, requestId || crypto.randomUUID());
  }

  function broadcastRoom(roomId) {
    for (const connection of connections) {
      if (connection.bound?.roomId !== roomId || !registry.isCurrentSocket(connection.bound.participantId, connection.ws)) continue;
      const state = registry.getState(roomId);
      if (state) safeSend(connection.ws, publicMessage('lobby_state', state, connection.bound));
    }
  }

  function sendReply(connection, envelope, type, payload, state) {
    const response = responseEnvelope(type, { ...payload, requestId: envelope.id }, state, envelope.id);
    safeSend(connection.ws, response);
    cacheResponse(connection, envelope, response);
  }

  function sendError(connection, envelope, code, message, retryable = false) {
    const state = connection.bound ? registry.getState(connection.bound.roomId) : null;
    const response = responseEnvelope('error', { code, message, retryable, requestId: envelope?.id || undefined }, state, envelope?.id || crypto.randomUUID());
    safeSend(connection.ws, response);
    if (envelope?.id) cacheResponse(connection, envelope, response);
  }

  function cacheResponse(connection, envelope, response) {
    if (!envelope?.id || connection.cache.has(envelope.id)) return;
    connection.cache.set(envelope.id, { fingerprint: JSON.stringify(envelope), response });
    while (connection.cache.size > MAX_REQUEST_CACHE) connection.cache.delete(connection.cache.keys().next().value);
  }

  function fail(connection, envelope, error) {
    if (error instanceof LobbyError) return sendError(connection, envelope, error.code, error.message, error.retryable);
    return sendError(connection, envelope, 'bad_request', 'invalid_request');
  }

  function assertPayloadKeys(payload, allowed) {
    if (Object.keys(payload).some((key) => !allowed.includes(key))) throw new LobbyError('bad_request', 'unexpected_payload_field');
  }

  function boundState(connection, envelope) {
    const bound = connection.bound;
    if (!bound) throw new LobbyError('unauthorized', 'handshake_required');
    if (envelope.roomId !== bound.roomId) throw new LobbyError('unauthorized', 'room_mismatch');
    const state = registry.getState(bound.roomId);
    if (!state) throw new LobbyError('unauthorized', 'room_not_found');
    if (envelope.roundNo !== (state.round?.roundNo || 0)) throw new LobbyError('stale_round', 'stale_round');
    if (!registry.isCurrentSocket(bound.participantId, connection.ws)) throw new LobbyError('unauthorized', 'session_superseded');
    return state;
  }

  function takeRateSlot(connection) {
    const now = Date.now();
    connection.messageTimes = connection.messageTimes.filter((timestamp) => now - timestamp < 1000);
    if (connection.messageTimes.length >= MAX_MESSAGES_PER_SECOND) return false;
    connection.messageTimes.push(now);
    return true;
  }

  function sendHandshake(connection, envelope, kind, participant) {
    const state = participant.lobbyState;
    const payload = {
      roomId: participant.roomId,
      joinCode: participant.joinCode,
      joinUrl: participant.joinUrl,
      participantId: participant.participantId,
      resumeToken: participant.resumeToken,
      lobbyState: state,
      roleView: roleView(participant.role),
    };
    clearTimeout(connection.handshakeTimer);
    connection.handshakeTimer = null;
    connection.bound = { roomId: participant.roomId, participantId: participant.participantId };
    registry.bindSocket(participant.participantId, connection.ws);
    sendReply(connection, envelope, kind, payload, state);
  }

  function handleMessage(connection, data, isBinary) {
    const withinRate = takeRateSlot(connection);
    if (data.length > MAX_FRAME_BYTES) {
      sendError(connection, null, withinRate ? 'payload_too_large' : 'rate_limited', withinRate ? 'frame_exceeds_32_kib' : 'message_rate_exceeded', !withinRate);
      connection.ws.close(1009, 'payload too large');
      return;
    }
    let envelope;
    try {
      if (isBinary) throw new LobbyError('bad_request', 'text_frames_required');
      envelope = JSON.parse(data.toString('utf8'));
      if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope) || Object.keys(envelope).some((key) => !['v', 'id', 'type', 'roomId', 'roundNo', 'payload'].includes(key)) || envelope.v !== 1 || typeof envelope.id !== 'string' || !/^[\w.-]{1,128}$/.test(envelope.id) || typeof envelope.type !== 'string' || typeof envelope.roomId !== 'string' || !Number.isInteger(envelope.roundNo) || envelope.roundNo < 0 || !Object.hasOwn(envelope, 'payload') || !envelope.payload || typeof envelope.payload !== 'object' || Array.isArray(envelope.payload)) {
        throw new LobbyError('bad_request', 'invalid_envelope');
      }
    } catch (error) {
      sendError(connection, envelope, withinRate ? (error instanceof LobbyError ? error.code : 'bad_request') : 'rate_limited', withinRate ? (error instanceof LobbyError ? error.message : 'invalid_json') : 'message_rate_exceeded', !withinRate);
      return;
    }

    const fingerprint = JSON.stringify(envelope);
    const cached = connection.cache.get(envelope.id);
    if (!withinRate) {
      sendError(connection, envelope, 'rate_limited', 'message_rate_exceeded', true);
      return;
    }
    if (cached) {
      if (cached.fingerprint === fingerprint) safeSend(connection.ws, cached.response);
      else sendError(connection, envelope, 'bad_request', 'duplicate_request_id');
      return;
    }
    connection.lastMessageAt = Date.now();
    if (connection.bound) {
      const prior = registry.getState(connection.bound.roomId);
      const participant = prior?.participants.find((p) => p.participantId === connection.bound.participantId);
      if (participant?.connection !== 'connected' && registry.isCurrentSocket(connection.bound.participantId, connection.ws)) {
        const state = registry.setConnection(connection.bound.participantId, 'connected');
        if (state) broadcastRoom(state.roomId);
      }
    }

    try {
      if (['create_room', 'join', 'resume'].includes(envelope.type)) {
        if (connection.bound) throw new LobbyError('bad_request', 'socket_already_authenticated');
        if (envelope.roomId !== '' || envelope.roundNo !== 0) throw new LobbyError('bad_request', 'handshake_room_must_be_empty');
        if (envelope.type === 'create_room') {
          assertPayloadKeys(envelope.payload, ['displayName']);
          const participant = registry.createRoom(envelope.payload.displayName);
          sendHandshake(connection, envelope, 'room_created', participant);
          broadcastRoom(participant.roomId);
          return;
        }
        if (envelope.type === 'join') {
          assertPayloadKeys(envelope.payload, ['joinCode', 'displayName']);
          const participant = registry.joinRoom(envelope.payload.joinCode, envelope.payload.displayName);
          sendHandshake(connection, envelope, 'joined', participant);
          broadcastRoom(participant.roomId);
          return;
        }
        assertPayloadKeys(envelope.payload, ['resumeToken']);
        const resumed = registry.resume(envelope.payload.resumeToken);
        if (resumed.displacedSocket && resumed.displacedSocket !== connection.ws) {
          safeSend(resumed.displacedSocket, responseEnvelope('error', { code: 'unauthorized', message: 'session_taken_over', retryable: false }, null, crypto.randomUUID()));
          resumed.displacedSocket.close(4001, 'session taken over');
        }
        sendHandshake(connection, envelope, 'resumed', resumed.participant);
        broadcastRoom(resumed.participant.roomId);
        return;
      }

      const before = boundState(connection, envelope);
      switch (envelope.type) {
        case 'set_config': {
          const state = registry.setConfig(connection.bound.participantId, envelope.payload);
          sendReply(connection, envelope, 'lobby_state', { ...state, roleView: roleViewFor(state, connection.bound.participantId) }, state);
          broadcastRoom(state.roomId);
          return;
        }
        case 'set_ready': {
          assertPayloadKeys(envelope.payload, ['ready']);
          const state = registry.setReady(connection.bound.participantId, envelope.payload.ready);
          sendReply(connection, envelope, 'lobby_state', { ...state, roleView: roleViewFor(state, connection.bound.participantId) }, state);
          broadcastRoom(state.roomId);
          return;
        }
        case 'start_round': {
          assertPayloadKeys(envelope.payload, []);
          const state = registry.startRound(connection.bound.participantId);
          sendReply(connection, envelope, 'round_started', { lobbyState: state, roleView: roleViewFor(state, connection.bound.participantId) }, state);
          broadcastRoom(state.roomId);
          return;
        }
        case 'heartbeat': {
          assertPayloadKeys(envelope.payload, []);
          sendReply(connection, envelope, 'heartbeat_ack', { serverTime: Date.now() }, before);
          return;
        }
        default:
          throw new LobbyError('bad_request', 'unsupported_message_type');
      }
    } catch (error) {
      fail(connection, envelope, error);
    }
  }

  function roleViewFor(state, participantId) {
    const participant = state.participants.find((p) => p.participantId === participantId);
    return roleView(participant?.role || 'host');
  }

  wss.on('connection', (ws) => {
    const connection = { ws, bound: null, cache: new Map(), messageTimes: [], lastMessageAt: Date.now(), lastPingAt: 0 };
    if (connections.size >= maxConnections) {
      ws.close(1013, 'server busy');
      return;
    }
    connections.add(connection);
    connection.handshakeTimer = setTimeout(() => {
      if (!connection.bound && ws.readyState !== WebSocket.CLOSED) ws.terminate();
    }, handshakeTimeoutMs);
    connection.handshakeTimer.unref?.();
    ws.on('message', (data, isBinary) => handleMessage(connection, data, isBinary));
    ws.on('close', () => {
      clearTimeout(connection.handshakeTimer);
      connection.handshakeTimer = null;
      connections.delete(connection);
      if (!connection.bound) return;
      const state = registry.disconnect(connection.bound.participantId, ws);
      if (state) broadcastRoom(state.roomId);
    });
    ws.on('error', () => {});
  });

  heartbeatTimer = setInterval(() => {
    const now = Date.now();
    for (const connection of connections) {
      if (!connection.bound || connection.ws.readyState !== WebSocket.OPEN) continue;
      const elapsed = now - connection.lastMessageAt;
      if (elapsed >= 45000) {
        const state = registry.disconnect(connection.bound.participantId, connection.ws);
        if (state) broadcastRoom(state.roomId);
        connection.ws.close(4000, 'heartbeat timeout');
      } else if (elapsed >= 30000) {
        const state = registry.setConnection(connection.bound.participantId, 'reconnecting');
        if (state) broadcastRoom(state.roomId);
      } else if (elapsed >= 10000 && now - connection.lastPingAt >= 10000) {
        safeSend(connection.ws, responseEnvelope('heartbeat', { serverTime: now }, registry.getState(connection.bound.roomId), crypto.randomUUID()));
        connection.lastPingAt = now;
      }
    }
  }, 1000);
  heartbeatTimer.unref?.();

  const originalClose = httpServer.close.bind(httpServer);
  httpServer.close = function close(callback) {
    if (!closing) {
      closing = true;
      clearInterval(heartbeatTimer);
      for (const connection of connections) {
        clearTimeout(connection.handshakeTimer);
        connection.handshakeTimer = null;
        connection.ws.terminate();
      }
      for (const ws of wss.clients) ws.terminate();
      wss.close();
    }
    return originalClose(callback);
  };

  return httpServer;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const server = createServer();
  server.listen(port, '0.0.0.0', () => process.stdout.write(`Alt+C4 backend listening on ${port}\n`));
}

module.exports = { createServer };
