import type { Envelope, LobbyError, LobbySession, LobbyState, LobbyView, RoleView } from './lobbyProtocol';

export const LOBBY_SESSION_KEY = 'altc4.session.v1';
const REQUEST_TIMEOUT_MS = 8_000;
const RECONNECT_DELAY_MS = 700;
const HEARTBEAT_INTERVAL_MS = 10_000;

type PendingRequest = { resolve: () => void; reject: (error: LobbyError) => void; timeout: number };

// Validate the backend HTTP(S) address and remove query, fragment, and trailing slash.
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

// Map the backend address to its WS(S) endpoint at /ws.
export function websocketUrlForBackend(value: string): string {
  const parsed = new URL(normalizeBackendBase(value));
  parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
  parsed.pathname = '/ws';
  return parsed.toString();
}

// Read this tab’s saved identity, tolerating unavailable storage or invalid JSON.
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

  // Publish the current view immediately and return a listener cleanup for React.
  subscribe(listener: (view: LobbyView) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  // Connect as a new host and request a room with a private resume credential.
  async createRoom(endpoint: string, displayName: string): Promise<void> {
    this.endpoint = normalizeBackendBase(endpoint);
    this.displayName = displayName.trim();
    this.stopped = false;
    await this.openSocket();
    await this.request('create_room', { displayName: this.displayName }, true);
  }

  // Connect as a new player using the host’s join code.
  async joinRoom(endpoint: string, joinCode: string, displayName: string): Promise<void> {
    this.endpoint = normalizeBackendBase(endpoint);
    this.displayName = displayName.trim();
    this.stopped = false;
    await this.openSocket();
    await this.request('join', { joinCode: joinCode.trim().toUpperCase(), displayName: this.displayName }, true);
  }

  // Reconnect with this tab’s saved credential to restore its participant identity.
  async resumeSession(session: LobbySession): Promise<void> {
    this.endpoint = normalizeBackendBase(session.endpoint);
    this.displayName = session.displayName;
    this.resumeToken = session.resumeToken;
    this.stopped = false;
    await this.openSocket();
    await this.request('resume', { resumeToken: this.resumeToken }, true);
  }

  // Request host settings; the server validates permissions and resets readiness.
  async setConfig(patch: Partial<LobbyState['config']>): Promise<void> {
    await this.request('set_config', patch);
  }

  // Request a readiness change for the authenticated participant.
  async setReady(ready: boolean): Promise<void> {
    await this.request('set_ready', { ready });
  }

  // Ask the server to apply its start gate and enter the assigned role shell.
  async startRound(): Promise<void> {
    await this.request('start_round', {});
  }

  // Stop reconnect/heartbeat work and reject requests when the owning screen unmounts.
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

  // Expose the current rendering state without including the private resume credential.
  private snapshot(): LobbyView {
    return { state: this.state, roleView: this.roleView, participantId: this.participantId, status: this.status, error: this.error, resumed: this.resumed };
  }

  // Notify every screen subscribed to this client’s current view.
  private publish(): void {
    const value = this.snapshot();
    for (const listener of this.listeners) listener(value);
  }

  // Update the connection indicator and publish it to subscribers.
  private setStatus(status: LobbyView['status']): void {
    this.status = status;
    this.publish();
  }

  // Replace the previous socket and attach connection, message, and reconnect handlers.
  private async openSocket(): Promise<void> {
    this.error = null;
    this.setStatus(this.reconnecting ? 'reconnecting' : 'connecting');
    return await new Promise((resolve, reject) => {
      const previous = this.socket;
      if (previous && previous.readyState !== WebSocket.CLOSED) {
        // Old socket callbacks must not overwrite the replacement connection’s state.
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

  // Keep the bound identity active even when the player makes no lobby changes.
  private startHeartbeat(): void {
    if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = window.setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN && this.roomId) {
        void this.request('heartbeat', {}).catch(() => undefined);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  // Retry identity resume after a disconnect without replaying lobby mutations.
  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    this.reconnectTimer = window.setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.stopped || !this.resumeToken) return;
      this.reconnecting = true;
      try {
        // Resume current state only; an earlier mutation may already have reached the server.
        await this.openSocket();
        await this.request('resume', { resumeToken: this.resumeToken }, true);
      } catch {
        if (!this.stopped && this.resumeToken) this.scheduleReconnect();
      } finally {
        this.reconnecting = false;
      }
    }, RECONNECT_DELAY_MS);
  }

  // Send one correlated request and wait for its reply or timeout; never auto-retry it.
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
        resolve,
        reject,
        timeout,
      });
    });
    socket.send(JSON.stringify(envelope));
    await promise;
  }

  // Settle correlated requests and update room, role, and privately stored identity state.
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
      pending.resolve();
    }

    // Handshakes/start nest the snapshot; lobby broadcasts put it directly in the payload.
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

  // Save the rotated credential in this tab and report when storage is unavailable.
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

  // Forget an invalid credential so reconnect attempts cannot keep using it.
  private clearSession(): void {
    this.resumeToken = '';
    try { sessionStorage.removeItem(LOBBY_SESSION_KEY); } catch {}
  }

  // Generate request IDs on plain HTTP LAN pages where randomUUID may be unavailable.
  private nextRequestId(): string {
    this.requestSequence += 1;
    const bytes = new Uint8Array(16);
    if (typeof crypto.getRandomValues === 'function') {
      crypto.getRandomValues(bytes);
    } else {
      return `lobby-${Date.now().toString(36)}-${this.requestSequence.toString(36)}`;
    }
    // Set the UUID v4 version and variant bits without depending on randomUUID.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
}
