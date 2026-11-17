import type { Envelope, LobbyError, LobbySession, LobbyState, LobbyView, RoleView } from './lobbyProtocol';

export const LOBBY_SESSION_KEY = 'altc4.session.v1';
const REQUEST_TIMEOUT_MS = 8_000;
const RECONNECT_DELAY_MS = 700;
const HEARTBEAT_INTERVAL_MS = 10_000;

type HandshakeType = 'create_room' | 'join' | 'resume';
type PendingRequest = { resolve: (payload: Record<string, unknown>) => void; reject: (error: LobbyError) => void; timeout: number };

export function normalizeBackendBase(value: string): string {
  const parsed = new URL(value.trim());
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Enter an http:// or https:// backend address.');
  }
  if (parsed.username || parsed.password) throw new Error('Backend addresses cannot contain credentials.');
  parsed.pathname = parsed.pathname.replace(/\/$/, '') || '/';
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

export function websocketUrlForBackend(value: string): string {
  const parsed = new URL(normalizeBackendBase(value));
  parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
  parsed.pathname = '/ws';
  return parsed.toString();
}

export function readLobbySession(): LobbySession | null {
  try {
    const value = sessionStorage.getItem(LOBBY_SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as LobbySession;
    return session.resumeToken && session.endpoint ? session : null;
  } catch {
    return null;
  }
}

export class LobbyClient {
  private socket: WebSocket | null = null;
  private endpoint = '';
  private roomId = '';
  private roundNo = 0;
  private resumeToken = '';
  private displayName = '';
  private status: LobbyView['status'] = 'idle';
  private state: LobbyState | null = null;
  private roleView: RoleView | null = null;
  private participantId: string | null = null;
  private error: LobbyError | null = null;
  private resumed = false;
  private stopped = false;
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private reconnecting = false;
  private listeners = new Set<(view: LobbyView) => void>();
  private pending = new Map<string, PendingRequest>();
  private requestSequence = 0;

  subscribe(listener: (view: LobbyView) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  async createRoom(endpoint: string, displayName: string): Promise<void> {
    this.endpoint = normalizeBackendBase(endpoint);
    this.displayName = displayName.trim();
    this.stopped = false;
    await this.openSocket();
    await this.request('create_room', { displayName: this.displayName }, true);
  }

  async joinRoom(endpoint: string, joinCode: string, displayName: string): Promise<void> {
    this.endpoint = normalizeBackendBase(endpoint);
    this.displayName = displayName.trim();
    this.stopped = false;
    await this.openSocket();
    await this.request('join', { joinCode: joinCode.trim().toUpperCase(), displayName: this.displayName }, true);
  }

  async resumeSession(session: LobbySession): Promise<void> {
    this.endpoint = normalizeBackendBase(session.endpoint);
    this.displayName = session.displayName;
    this.resumeToken = session.resumeToken;
    this.stopped = false;
    await this.openSocket();
    await this.request('resume', { resumeToken: this.resumeToken }, true);
  }

  async setConfig(patch: Partial<LobbyState['config']>): Promise<void> {
    await this.request('set_config', patch);
  }

  async setReady(ready: boolean): Promise<void> {
    await this.request('set_ready', { ready });
  }

  async startRound(): Promise<void> {
    await this.request('start_round', {});
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.socket?.close(1000, 'client stopped');
    this.socket = null;
    for (const pending of this.pending.values()) {
      window.clearTimeout(pending.timeout);
      pending.reject({ code: 'connection_failed', message: 'Connection closed.', retryable: false });
    }
    this.pending.clear();
  }

  private snapshot(): LobbyView {
    return { state: this.state, roleView: this.roleView, participantId: this.participantId, status: this.status, error: this.error, resumed: this.resumed };
  }

  private publish(): void {
    const value = this.snapshot();
    for (const listener of this.listeners) listener(value);
  }

  private setStatus(status: LobbyView['status']): void {
    this.status = status;
    this.publish();
  }

  private async openSocket(): Promise<void> {
    this.error = null;
    this.setStatus(this.reconnecting ? 'reconnecting' : 'connecting');
    return await new Promise((resolve, reject) => {
      const previous = this.socket;
      if (previous && previous.readyState !== WebSocket.CLOSED) {
        previous.onopen = null;
        previous.onmessage = null;
        previous.onerror = null;
        previous.onclose = null;
        this.socket = null;
        previous.close(1000, 'replaced by a new lobby connection');
      }
      const socket = new WebSocket(websocketUrlForBackend(this.endpoint));
      this.socket = socket;
      let settled = false;
      socket.onopen = () => {
        if (this.socket !== socket) return;
        settled = true;
        this.setStatus('connected');
        this.startHeartbeat();
        resolve();
      };
      socket.onmessage = (event) => { if (this.socket === socket) this.handleMessage(event.data); };
      socket.onerror = () => {
        if (this.socket !== socket) return;
        if (!settled) {
          settled = true;
          const error: LobbyError = { code: 'connection_failed', message: 'Could not connect to the backend. Check the address and try again.', retryable: true };
          this.error = error;
          this.publish();
          reject(error);
        }
      };
      socket.onclose = () => {
        if (this.socket !== socket) return;
        this.socket = null;
        if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
        if (!settled) {
          settled = true;
          reject({ code: 'connection_failed', message: 'Connection closed before the lobby reply.', retryable: true } satisfies LobbyError);
        }
        if (!this.stopped && this.resumeToken) {
          this.setStatus('reconnecting');
          this.scheduleReconnect();
        } else if (!this.stopped) {
          this.setStatus('disconnected');
        }
      };
    });
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = window.setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN && this.roomId) {
        void this.request('heartbeat', {}).catch(() => undefined);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    this.reconnectTimer = window.setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.stopped || !this.resumeToken) return;
      this.reconnecting = true;
      try {
        await this.openSocket();
        await this.request('resume', { resumeToken: this.resumeToken }, true);
      } catch {
        if (!this.stopped && this.resumeToken) this.scheduleReconnect();
      } finally {
        this.reconnecting = false;
      }
    }, RECONNECT_DELAY_MS);
  }

  private async request(type: string, payload: Record<string, unknown>, handshake = false): Promise<void> {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw { code: 'connection_failed', message: 'Not connected to the lobby.', retryable: true } satisfies LobbyError;
    }
    const id = this.nextRequestId();
    const envelope: Envelope<Record<string, unknown>> = {
      v: 1,
      id,
      type,
      roomId: handshake ? '' : this.roomId,
      roundNo: handshake ? 0 : this.roundNo,
      payload,
    };
    const promise = new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.pending.delete(id);
        reject({ code: 'request_timeout', message: 'The server did not reply in time. Try again.', retryable: true });
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, {
        resolve: () => resolve(),
        reject,
        timeout,
      });
    });
    socket.send(JSON.stringify(envelope));
    await promise;
  }

  private handleMessage(data: string): void {
    let envelope: Envelope<Record<string, unknown>>;
    try {
      envelope = JSON.parse(data) as Envelope<Record<string, unknown>>;
    } catch {
      this.error = { code: 'bad_request', message: 'The server sent an unreadable lobby reply.', retryable: false };
      this.publish();
      return;
    }
    const payload = envelope.payload || {};
    const correlationId = typeof payload.requestId === 'string' ? payload.requestId : envelope.id;
    const pending = this.pending.get(correlationId);

    if (envelope.type === 'error') {
      const error: LobbyError = {
        code: typeof payload.code === 'string' ? payload.code as LobbyError['code'] : 'bad_request',
        message: typeof payload.message === 'string' ? payload.message : 'The server rejected that action.',
        retryable: Boolean(payload.retryable),
        requestId: typeof payload.requestId === 'string' ? payload.requestId : undefined,
      };
      this.error = error;
      if (pending) {
        window.clearTimeout(pending.timeout);
        this.pending.delete(correlationId);
        pending.reject(error);
      }
      if (error.code === 'invalid_resume_token') {
        this.clearSession();
        this.roomId = '';
        this.roundNo = 0;
        this.participantId = null;
        this.state = null;
        this.roleView = null;
        this.resumed = false;
        this.status = 'disconnected';
        if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
        this.socket?.close(1000, 'resume token rejected');
      }
      this.publish();
      return;
    }

    if (pending) {
      window.clearTimeout(pending.timeout);
      this.pending.delete(correlationId);
      pending.resolve(payload);
    }

    const nestedState = payload.lobbyState;
    const stateCandidate = nestedState && typeof nestedState === 'object' ? nestedState as LobbyState : payload as unknown as LobbyState;
    if (stateCandidate && typeof stateCandidate.roomId === 'string' && Array.isArray(stateCandidate.participants)) {
      this.state = stateCandidate;
      this.roomId = stateCandidate.roomId;
    }
    if (typeof envelope.roomId === 'string' && envelope.roomId) this.roomId = envelope.roomId;
    if (typeof envelope.roundNo === 'number') this.roundNo = envelope.roundNo;
    if (payload.roleView && typeof payload.roleView === 'object') this.roleView = payload.roleView as RoleView;
    if (typeof payload.participantId === 'string') this.participantId = payload.participantId;
    if (typeof payload.resumeToken === 'string') {
      this.resumeToken = payload.resumeToken;
      this.storeSession();
    }
    if (envelope.type === 'resumed') this.resumed = true;
    if (envelope.type === 'room_created' || envelope.type === 'joined') this.resumed = false;
    this.error = null;
    this.status = 'connected';
    this.publish();
  }

  private storeSession(): void {
    try {
      sessionStorage.setItem(LOBBY_SESSION_KEY, JSON.stringify({
        resumeToken: this.resumeToken,
        endpoint: this.endpoint,
        displayName: this.displayName,
        participantId: this.participantId || undefined,
      } satisfies LobbySession));
    } catch {
      this.error = { code: 'connection_failed', message: 'The browser could not save this tab’s resume token. Keep this tab open.', retryable: false };
      this.publish();
    }
  }

  private clearSession(): void {
    this.resumeToken = '';
    try { sessionStorage.removeItem(LOBBY_SESSION_KEY); } catch {}
  }

  private nextRequestId(): string {
    this.requestSequence += 1;
    const bytes = new Uint8Array(16);
    if (typeof crypto.getRandomValues === 'function') {
      crypto.getRandomValues(bytes);
    } else {
      return `lobby-${Date.now().toString(36)}-${this.requestSequence.toString(36)}`;
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
}
