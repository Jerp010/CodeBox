export type PuzzleLanguage = 'java' | 'cpp' | 'python';
export type Slot = 'host' | 'player';
export type Role = 'host' | 'specHolder' | 'programmer';
export type Connection = 'connected' | 'reconnecting' | 'disconnected';
export type Phase = 'lobby' | 'starting' | 'inRound' | 'results';

export interface LobbyConfig {
  durationSec: number;
  panelCount: number;
  language: PuzzleLanguage;
}

export interface Participant {
  participantId: string;
  displayName: string;
  slot: Slot;
  role: Role | null;
  connection: Connection;
  ready: boolean;
}

export interface LobbyState {
  roomId: string;
  joinCode: string;
  joinUrl: string;
  phase: Phase;
  participants: Participant[];
  config: LobbyConfig;
  canStart: boolean;
  startBlockedReason: string | null;
  round: { roundNo: number; outcome: 'defused' | 'detonated' | null } | null;
}

export interface LobbyFactories {
  roomId(): string;
  participantId(): string;
  joinCode(): string;
  resumeToken(): string;
  choosePlayerRoles(): ['specHolder', 'programmer'] | ['programmer', 'specHolder'];
  baseUrl: string;
  maxRooms?: number;
}

export interface PrivateParticipant {
  roomId: string;
  joinCode: string;
  joinUrl: string;
  participantId: string;
  resumeToken: string;
  role: Role;
  lobbyState: LobbyState;
}

type Room = {
  roomId: string;
  joinCode: string;
  joinUrl: string;
  phase: Phase;
  roundNo: number;
  participants: Participant[];
  config: LobbyConfig;
};

type TokenRecord = { roomId: string; participantId: string };

const DEFAULT_CONFIG: LobbyConfig = { durationSec: 300, panelCount: 3, language: 'java' };
const MAX_DISPLAY_NAME = 200;

export class LobbyError extends Error {
  constructor(readonly code: string, message: string, readonly retryable = false) {
    super(message);
    this.name = 'LobbyError';
  }
}

/** In-memory Phase 2 room, identity, permission, and start-gate state. */
export class LobbyRegistry<SocketRef = unknown> {
  private readonly rooms = new Map<string, Room>();
  private readonly roomByCode = new Map<string, string>();
  private readonly tokens = new Map<string, TokenRecord>();
  private readonly sockets = new Map<string, SocketRef>();
  private readonly factories: LobbyFactories;

  constructor(factories: LobbyFactories) {
    this.factories = factories;
  }

  setBaseUrl(baseUrl: string): void {
    this.factories.baseUrl = baseUrl;
  }

  createRoom(displayName: unknown): PrivateParticipant {
    const name = validateName(displayName);
    const maxRooms = this.factories.maxRooms ?? 500;
    if (this.rooms.size >= maxRooms) throw new LobbyError('not_joinable', 'room_capacity_reached');

    const roomId = this.uniqueRoomId();
    const joinCode = this.uniqueJoinCode();
    const joinUrl = `${this.factories.baseUrl.replace(/\/$/, '')}/?code=${joinCode}`;
    const host = this.newParticipant(name, 'host', 'host');
    const room: Room = {
      roomId,
      joinCode,
      joinUrl,
      phase: 'lobby',
      roundNo: 0,
      participants: [host],
      config: { ...DEFAULT_CONFIG },
    };
    this.rooms.set(roomId, room);
    this.roomByCode.set(joinCode, roomId);
    const resumeToken = this.issueToken(roomId, host.participantId);
    return { roomId, joinCode, joinUrl, participantId: host.participantId, resumeToken, role: 'host', lobbyState: this.state(room) };
  }

  joinRoom(joinCode: unknown, displayName: unknown): PrivateParticipant {
    if (typeof joinCode !== 'string' || !/^[A-Z2-9]{6}$/.test(joinCode)) {
      throw new LobbyError('bad_request', 'invalid_join_code');
    }
    const roomId = this.roomByCode.get(joinCode);
    const room = roomId ? this.rooms.get(roomId) : undefined;
    if (!room) throw new LobbyError('not_joinable', 'room_not_found', true);
    if (room.phase !== 'lobby') throw new LobbyError('not_joinable', 'room_already_started', true);
    const playerCount = room.participants.filter((p) => p.slot === 'player').length;
    if (playerCount >= 2) throw new LobbyError('room_full', 'room_full');

    const player = this.newParticipant(validateName(displayName), 'player', null);
    room.participants.push(player);
    if (playerCount === 0) {
      player.role = this.factories.choosePlayerRoles()[0];
    } else {
      const first = room.participants.find((p) => p.slot === 'player');
      player.role = first?.role === 'specHolder' ? 'programmer' : 'specHolder';
    }
    const resumeToken = this.issueToken(room.roomId, player.participantId);
    return {
      roomId: room.roomId,
      joinCode: room.joinCode,
      joinUrl: room.joinUrl,
      participantId: player.participantId,
      resumeToken,
      role: player.role ?? 'specHolder',
      lobbyState: this.state(room),
    };
  }

  resume(token: unknown): { participant: PrivateParticipant; displacedSocket?: SocketRef } {
    if (typeof token !== 'string' || token.length < 32 || token.length > 128) {
      throw new LobbyError('invalid_resume_token', 'invalid_resume_token');
    }
    const record = this.tokens.get(token);
    if (!record) throw new LobbyError('invalid_resume_token', 'invalid_resume_token');
    const room = this.rooms.get(record.roomId);
    const participant = room?.participants.find((p) => p.participantId === record.participantId);
    if (!room || !participant) {
      this.tokens.delete(token);
      throw new LobbyError('invalid_resume_token', 'invalid_resume_token');
    }
    const displacedSocket = this.sockets.get(participant.participantId);
    this.sockets.delete(participant.participantId);
    this.tokens.delete(token);
    const resumeToken = this.issueToken(room.roomId, participant.participantId);
    participant.connection = 'connected';
    const privateParticipant: PrivateParticipant = {
      roomId: room.roomId,
      joinCode: room.joinCode,
      joinUrl: room.joinUrl,
      participantId: participant.participantId,
      resumeToken,
      role: participant.role ?? 'host',
      lobbyState: this.state(room),
    };
    return { participant: privateParticipant, displacedSocket };
  }

  bindSocket(participantId: string, socket: SocketRef): void {
    if (!this.findParticipant(participantId)) throw new LobbyError('unauthorized', 'session_not_found');
    this.sockets.set(participantId, socket);
  }

  isCurrentSocket(participantId: string, socket: SocketRef): boolean {
    return this.sockets.get(participantId) === socket;
  }

  disconnect(participantId: string, socket: SocketRef): LobbyState | null {
    if (this.sockets.get(participantId) !== socket) return null;
    this.sockets.delete(participantId);
    const found = this.findParticipant(participantId);
    if (!found) return null;
    found.participant.connection = 'disconnected';
    return this.state(found.room);
  }

  setConnection(participantId: string, connection: Connection): LobbyState | null {
    const found = this.findParticipant(participantId);
    if (!found) return null;
    found.participant.connection = connection;
    return this.state(found.room);
  }

  setConfig(participantId: string, patch: unknown): LobbyState {
    const { room, participant } = this.requireBoundParticipant(participantId);
    if (participant.slot !== 'host') throw new LobbyError('wrong_role', 'host_only_action');
    if (room.phase !== 'lobby') throw new LobbyError('not_joinable', 'room_not_in_lobby');
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new LobbyError('bad_request', 'invalid_config');
    const values = patch as Record<string, unknown>;
    const keys = Object.keys(values);
    if (!keys.length || keys.some((key) => !['durationSec', 'panelCount', 'language'].includes(key))) {
      throw new LobbyError('bad_request', 'invalid_config');
    }
    const next = { ...room.config };
    if ('durationSec' in values) {
      const value = values.durationSec;
      if (!Number.isInteger(value) || (value as number) < 120 || (value as number) > 900 || (value as number) % 30 !== 0) {
        throw new LobbyError('bad_request', 'invalid_config');
      }
      next.durationSec = value as number;
    }
    if ('panelCount' in values) {
      const value = values.panelCount;
      if (!Number.isInteger(value) || (value as number) < 2 || (value as number) > 5) {
        throw new LobbyError('bad_request', 'invalid_config');
      }
      next.panelCount = value as number;
    }
    if ('language' in values) {
      const value = values.language;
      if (value !== 'java' && value !== 'cpp' && value !== 'python') throw new LobbyError('bad_request', 'invalid_config');
      next.language = value;
    }
    if (next.durationSec !== room.config.durationSec || next.panelCount !== room.config.panelCount || next.language !== room.config.language) {
      room.config = next;
      for (const p of room.participants) if (p.slot === 'player') p.ready = false;
    }
    return this.state(room);
  }

  setReady(participantId: string, ready: unknown): LobbyState {
    const { room, participant } = this.requireBoundParticipant(participantId);
    if (room.phase !== 'lobby') throw new LobbyError('not_joinable', 'room_not_in_lobby');
    if (typeof ready !== 'boolean') throw new LobbyError('bad_request', 'ready_must_be_boolean');
    participant.ready = ready;
    return this.state(room);
  }

  startRound(participantId: string): LobbyState {
    const { room, participant } = this.requireBoundParticipant(participantId);
    if (participant.slot !== 'host') throw new LobbyError('wrong_role', 'host_only_action');
    const state = this.state(room);
    if (room.phase !== 'lobby' || !state.canStart) throw new LobbyError('not_joinable', state.startBlockedReason ?? 'room_not_in_lobby', true);
    room.phase = 'inRound';
    room.roundNo += 1;
    return this.state(room);
  }

  getState(roomId: string): LobbyState | null {
    const room = this.rooms.get(roomId);
    return room ? this.state(room) : null;
  }

  getRoomForCode(joinCode: string): LobbyState | null {
    const roomId = this.roomByCode.get(joinCode);
    return roomId ? this.getState(roomId) : null;
  }

  private requireBoundParticipant(participantId: string): { room: Room; participant: Participant } {
    const found = this.findParticipant(participantId);
    if (!found) throw new LobbyError('unauthorized', 'session_not_bound');
    return found;
  }

  private findParticipant(participantId: string): { room: Room; participant: Participant } | null {
    for (const room of this.rooms.values()) {
      const participant = room.participants.find((p) => p.participantId === participantId);
      if (participant) return { room, participant };
    }
    return null;
  }

  private state(room: Room): LobbyState {
    const participants = room.participants.map((p) => ({ ...p }));
    const players = participants.filter((p) => p.slot === 'player');
    const host = participants.find((p) => p.slot === 'host');
    const canStart = room.phase === 'lobby' && host?.connection === 'connected' && players.length === 2 && players.every((p) => p.connection === 'connected' && p.ready);
    let startBlockedReason: string | null = null;
    if (room.phase !== 'lobby') startBlockedReason = 'round_already_started';
    else if (host?.connection !== 'connected') startBlockedReason = 'host_not_connected';
    else if (players.length !== 2) startBlockedReason = 'two_players_required';
    else if (players.some((p) => p.connection !== 'connected')) startBlockedReason = 'players_must_be_connected';
    else if (players.some((p) => !p.ready)) startBlockedReason = 'players_must_be_ready';
    return {
      roomId: room.roomId,
      joinCode: room.joinCode,
      joinUrl: room.joinUrl,
      phase: room.phase,
      participants,
      config: { ...room.config },
      canStart,
      startBlockedReason,
      round: room.roundNo ? { roundNo: room.roundNo, outcome: null } : null,
    };
  }

  private newParticipant(displayName: string, slot: Slot, role: Role | null): Participant {
    for (let i = 0; i < 10; i += 1) {
      const participantId = this.factories.participantId();
      if (participantId && !this.findParticipant(participantId)) {
        return { participantId, displayName, slot, role, connection: 'connected', ready: false };
      }
    }
    throw new LobbyError('not_joinable', 'participant_id_generation_failed', true);
  }

  private issueToken(roomId: string, participantId: string): string {
    for (let i = 0; i < 10; i += 1) {
      const token = this.factories.resumeToken();
      if (token && !this.tokens.has(token)) {
        this.tokens.set(token, { roomId, participantId });
        return token;
      }
    }
    throw new LobbyError('not_joinable', 'token_generation_failed', true);
  }

  private uniqueRoomId(): string {
    for (let i = 0; i < 10; i += 1) {
      const id = this.factories.roomId();
      if (id && !this.rooms.has(id)) return id;
    }
    throw new LobbyError('not_joinable', 'room_id_generation_failed', true);
  }

  private uniqueJoinCode(): string {
    for (let i = 0; i < 20; i += 1) {
      const code = this.factories.joinCode();
      if (/^[A-Z2-9]{6}$/.test(code) && !this.roomByCode.has(code)) return code;
    }
    throw new LobbyError('not_joinable', 'join_code_capacity_reached', true);
  }
}

function validateName(value: unknown): string {
  if (typeof value !== 'string') throw new LobbyError('bad_request', 'display_name_required');
  const name = value.trim();
  if (!name || name.length > MAX_DISPLAY_NAME || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new LobbyError('bad_request', 'invalid_display_name');
  }
  return name;
}
