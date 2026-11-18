import { useEffect, useState } from 'react';
import { LobbyClient, readLobbySession } from './lobbyClient';
import type { AssignedRole, LobbyError, LobbyState, LobbyView, PuzzleLanguage } from './lobbyProtocol';

const languages: Array<{ value: PuzzleLanguage; label: string }> = [
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'python', label: 'Python' },
];

// Own the host connection and render room creation, the placeholder lobby, or role shell.
export function HostLobby({ onExit }: { onExit?: () => void }) {
  const [client] = useState(() => new LobbyClient());
  const [view, setView] = useState<LobbyView>({ state: null, roleView: null, participantId: null, status: 'idle', error: null, resumed: false });
  const [endpoint, setEndpoint] = useState(defaultHostEndpoint);
  const [displayName, setDisplayName] = useState('Host');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<LobbyError | null>(null);
  const [draftConfig, setDraftConfig] = useState({ durationSec: 300, panelCount: 3, language: 'java' as PuzzleLanguage });

  useEffect(() => client.subscribe(setView), [client]);
  useEffect(() => () => client.stop(), [client]);
  useEffect(() => {
    const session = readLobbySession();
    if (!session) return;
    setBusy(true);
    void client.resumeSession(session).catch(() => undefined).finally(() => setBusy(false));
  }, [client]);
  useEffect(() => {
    const config = view.state?.config;
    if (config) setDraftConfig(config);
  }, [view.state?.config.durationSec, view.state?.config.panelCount, view.state?.config.language]);

  // Keep pending host actions and their errors visible until the server replies.
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try { await action(); }
    catch (error) { setActionError(asLobbyError(error)); }
    finally { setBusy(false); }
  };

  const state = view.state;
  const roleView = view.roleView;
  return <main className="altc4-shell altc4-lobby-shell">
    <LobbyHeader title="Host station" status={view.status} onExit={onExit} />
    <div className="altc4-mockup-banner altc4-live-banner"><span className="altc4-banner-dot" /> LIVE LOBBY · SERVER CONTROLLED</div>
    <ErrorNotice error={actionError || view.error} />
    {state ? (state.phase === 'inRound' || state.phase === 'results'
      ? <RoleShell roleView={roleView} state={state} status={view.status} resumed={view.resumed} />
      : <HostRoom state={state} roleView={roleView} status={view.status} resumed={view.resumed} client={client} draftConfig={draftConfig} setDraftConfig={setDraftConfig} busy={busy} run={run} />)
      : <section className="altc4-card altc4-setup-card">
        <span className="altc4-kicker">CREATE A ROOM</span>
        <h1>Set up your host station</h1>
        <p>Use the backend address your player devices can reach. On one machine, localhost is fine; for a LAN demo, use the host computer’s reachable address.</p>
        {busy && <ConnectionNotice status={view.status} resumed={view.resumed} />}
        <label className="altc4-field"><span>Backend address</span><input autoComplete="url" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="http://localhost:3000" /></label>
        <label className="altc4-field"><span>Host display name</span><input maxLength={200} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
        <button className="altc4-button altc4-button-primary altc4-wide-button" disabled={busy || !displayName.trim()} onClick={() => void run(() => client.createRoom(endpoint, displayName))}>
          {busy ? 'Connecting…' : 'Create room'}
        </button>
        {view.status === 'connecting' && <p className="altc4-field-hint">Connecting to the backend…</p>}
      </section>}
  </main>;
}

// Join or resume this tab’s player identity and render only its assigned station.
export function PlayerLobby() {
  const [client] = useState(() => new LobbyClient());
  const [view, setView] = useState<LobbyView>({ state: null, roleView: null, participantId: null, status: 'idle', error: null, resumed: false });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<LobbyError | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState(new URLSearchParams(window.location.search).get('code')?.toUpperCase() || '');
  const endpoint = defaultPlayerEndpoint();

  useEffect(() => client.subscribe(setView), [client]);
  useEffect(() => () => client.stop(), [client]);
  useEffect(() => {
    const session = readLobbySession();
    if (!session) return;
    setDisplayName(session.displayName);
    setBusy(true);
    void client.resumeSession(session).catch(() => undefined).finally(() => setBusy(false));
  }, [client]);

  // Return success so the readiness checkbox can undo its optimistic display on rejection.
  const run = async (action: () => Promise<void>): Promise<boolean> => {
    setBusy(true);
    setActionError(null);
    try { await action(); return true; }
    catch (error) { setActionError(asLobbyError(error)); return false; }
    finally { setBusy(false); }
  };

  const state = view.state;
  return <main className="altc4-shell altc4-lobby-shell">
    <LobbyHeader title="Player station" status={view.status} />
    <div className="altc4-mockup-banner altc4-live-banner"><span className="altc4-banner-dot" /> LIVE LOBBY · ROLE ASSIGNED BY SERVER</div>
    <ErrorNotice error={actionError || view.error} />
    {state ? (state.phase === 'inRound' || state.phase === 'results'
      ? <RoleShell roleView={view.roleView} state={state} status={view.status} resumed={view.resumed} />
      : <PlayerRoom state={state} roleView={view.roleView} participantId={view.participantId} client={client} busy={busy} run={run} />)
      : <section className="altc4-card altc4-setup-card">
        <span className="altc4-kicker">JOIN A ROOM</span>
        <h1>Pair with your host</h1>
        <p>Enter the six-character code from the host station. The server assigns your private role when you join.</p>
        {busy && <ConnectionNotice status={view.status} resumed={view.resumed} />}
        <label className="altc4-field"><span>Your display name</span><input autoComplete="nickname" maxLength={200} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Name shown in the room" /></label>
        <label className="altc4-field"><span>Room code</span><input autoCapitalize="characters" maxLength={6} value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ABC234" /></label>
        <div className="altc4-endpoint-hint"><span>BACKEND</span><code>{endpoint}</code><small>This player page connects to the server that served it.</small></div>
        <button className="altc4-button altc4-button-primary altc4-wide-button" disabled={busy || !displayName.trim() || joinCode.trim().length !== 6} onClick={() => void run(() => client.joinRoom(endpoint, joinCode, displayName))}>
          {busy ? 'Joining…' : 'Join room'}
        </button>
      </section>}
  </main>;
}

// Render host settings, participant readiness, invitations, and the server’s start gate.
function HostRoom({
  state, roleView, status, resumed, client, draftConfig, setDraftConfig, busy, run,
}: {
  state: LobbyState;
  roleView: LobbyView['roleView'];
  status: LobbyView['status'];
  resumed: boolean;
  client: LobbyClient;
  draftConfig: { durationSec: number; panelCount: number; language: PuzzleLanguage };
  setDraftConfig: (config: { durationSec: number; panelCount: number; language: PuzzleLanguage }) => void;
  busy: boolean;
  run: (action: () => Promise<void>) => void;
}) {
  return <>
    <div className="altc4-page-heading"><div><span className="altc4-kicker">ROOM {state.joinCode} / CONTROL DESK</span><h1>Lobby workbench</h1><p>Configure one round and make sure both player stations are ready.</p></div><span className="altc4-round-tag">{state.phase.toUpperCase()}</span></div>
    <div className="altc4-host-grid altc4-lobby-grid" data-testid="lobby-room">
      <section className="altc4-card altc4-lobby-main-card">
        <div className="altc4-card-heading"><div><span className="altc4-kicker">HOST SETTINGS</span><h2>Round setup</h2></div><span className="altc4-language-tag">PROVISIONAL DEFAULTS</span></div>
        <div className="altc4-config-grid">
          <label className="altc4-field"><span>Duration <b>{formatDuration(draftConfig.durationSec)}</b></span><input type="range" min={120} max={900} step={30} value={draftConfig.durationSec} onChange={(event) => setDraftConfig({ ...draftConfig, durationSec: Number(event.target.value) })} /><small>2–15 minutes · 30 second steps</small></label>
          <label className="altc4-field"><span>Panels <b>{draftConfig.panelCount}</b></span><input type="range" min={2} max={5} step={1} value={draftConfig.panelCount} onChange={(event) => setDraftConfig({ ...draftConfig, panelCount: Number(event.target.value) })} /><small>Choose 2–5 repair panels</small></label>
          <label className="altc4-field"><span>Language</span><select value={draftConfig.language} onChange={(event) => setDraftConfig({ ...draftConfig, language: event.target.value as PuzzleLanguage })}>{languages.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}</select><small>One language applies to every panel.</small></label>
        </div>
        <button className="altc4-button altc4-button-quiet" disabled={busy || state.phase !== 'lobby'} onClick={() => void run(() => client.setConfig(draftConfig))}>Apply settings</button>
        <div className="altc4-section-divider" />
        <div className="altc4-card-heading"><div><span className="altc4-kicker">PLAYER STATIONS</span><h2>Room team</h2></div><span className="altc4-live-chip"><i /> {connectedPlayers(state)}/2 CONNECTED</span></div>
        <ParticipantList state={state} />
        <div className="altc4-start-row"><div><b>{state.canStart ? 'Ready to start' : startStatusTitle(state.startBlockedReason)}</b><small>{startStatusMessage(state.startBlockedReason)}</small></div><button className="altc4-button altc4-button-primary" disabled={busy || !state.canStart} onClick={() => void run(() => client.startRound())}>Start round</button></div>
      </section>
      <aside className="altc4-host-side"><section className="altc4-card altc4-share-card"><span className="altc4-kicker">INVITE PLAYERS</span><h2>Join this room</h2><span className="altc4-share-code" data-testid="join-code">{state.joinCode}</span><p>Both players use the same six-character code.</p><label className="altc4-field"><span>Player join link</span><input readOnly value={state.joinUrl} onFocus={(event) => event.currentTarget.select()} /></label></section>
        <section className="altc4-card altc4-lobby-status-card"><span className="altc4-kicker">YOUR STATION</span><strong>{roleView?.title || 'Host'}</strong><p>Player roles are assigned automatically as players join.</p><ConnectionNotice status={status} resumed={resumed} /></section></aside>
    </div>
  </>;
}

// Show room settings and let this participant mark readiness through the shared client.
function PlayerRoom({ state, roleView, participantId, client, busy, run }: { state: LobbyState; roleView: LobbyView['roleView']; participantId: string | null; client: LobbyClient; busy: boolean; run: (action: () => Promise<void>) => Promise<boolean> }) {
  const self = state.participants.find((participant) => participant.participantId === participantId);
  const isReady = Boolean(self?.ready);
  // Server broadcasts remain authoritative; the local draft gives immediate checkbox feedback.
  const [readyDraft, setReadyDraft] = useState(isReady);
  useEffect(() => setReadyDraft(isReady), [isReady]);
  return <>
    <div className="altc4-page-heading"><div><span className="altc4-kicker">ROOM {state.joinCode} / PLAYER LOBBY</span><h1>You're in the workshop</h1><p>Check your name and role, then tell the host when you're ready.</p></div><span className="altc4-role-stamp">{roleView?.title || 'ASSIGNING ROLE'}</span></div>
    <div className="altc4-role-grid altc4-player-lobby-grid" data-testid="lobby-room"><section className="altc4-card altc4-lobby-main-card"><span className="altc4-kicker">ROOM SETTINGS</span><h2>{state.config.panelCount} panels · {formatDuration(state.config.durationSec)} · {languageName(state.config.language)}</h2><p>The host controls these settings. Player roles are assigned by the server.</p><ParticipantList state={state} /><label className="altc4-ready-control"><input type="checkbox" checked={readyDraft} disabled={busy || state.phase !== 'lobby'} onChange={(event) => { const nextReady = event.target.checked; setReadyDraft(nextReady); void run(() => client.setReady(nextReady)).then((success) => { if (!success) setReadyDraft(isReady); }); }} /><span><b>I'm ready</b><small>Your readiness is shared with the host and other player.</small></span></label></section>
      <aside className="altc4-role-aside"><section className="altc4-card altc4-lobby-status-card"><span className="altc4-kicker">YOUR STATION</span><strong>{roleView?.title || 'Role assigned'}</strong><p>{roleView?.instructions[0] || 'Waiting for the host to start.'}</p>{roleView?.instructions.slice(1).map((instruction) => <p key={instruction}>{instruction}</p>)}</section><div className="altc4-tip-card"><b>Role assigned automatically</b><p>This browser shows only the station assigned to you.</p></div></aside></div>
  </>;
}

// Show the real assigned role after start, explicitly marking gameplay as unavailable.
function RoleShell({ roleView, state, status, resumed }: { roleView: LobbyView['roleView']; state: LobbyState; status: LobbyView['status']; resumed: boolean }) {
  return <>
    <div className="altc4-page-heading"><div><span className="altc4-kicker">ROOM {state.joinCode} / GAMEPLAY PREVIEW</span><h1>{roleView?.title || 'Team connected'}</h1><p>The host started the room. Your team is connected.</p></div><span className="altc4-role-stamp">{roleView?.role?.toUpperCase() || 'ASSIGNED ROLE'}</span></div>
    <ConnectionNotice status={status} resumed={resumed} />
    <section className="altc4-card altc4-role-shell-card" data-testid="role-shell"><span className="altc4-kicker">GAMEPLAY PREVIEW</span><h2>{roleView?.title || 'Team connected'}</h2><p>Your {roleView?.title || 'team'} station is connected.</p><p>Gameplay is not available in this build.</p><div className="altc4-round-boundary"><span>ROUND</span><strong>{state.round?.roundNo || 1}</strong><span>READY</span></div></section>
  </>;
}

// Render the host, joined players, and remaining empty player seats.
function ParticipantList({ state }: { state: LobbyState }) {
  const host = state.participants.find((participant) => participant.slot === 'host');
  const players = state.participants.filter((participant) => participant.slot === 'player');
  return <div className="altc4-participant-list">
    <ParticipantCard key={host?.participantId || 'host-slot'} participant={host} slot="Host station" />
    {players.map((participant, index) => <ParticipantCard key={participant.participantId} participant={participant} slot={`Player ${index + 1}`} />)}
    {Array.from({ length: Math.max(0, 2 - players.length) }, (_, index) => <ParticipantCard key={`empty-${index}`} slot={`Player ${players.length + index + 1}`} />)}
  </div>;
}

// Display one participant’s name, role, connection, and player readiness.
function ParticipantCard({ participant, slot }: { participant?: LobbyState['participants'][number]; slot: string }) {
  const roleLabels: Record<AssignedRole, string> = { host: 'Host', specHolder: 'Spec Holder', programmer: 'Programmer' };
  return <div className="altc4-participant-card"><span className={`altc4-avatar ${participant?.slot === 'host' ? 'avatar-programmer' : 'avatar-spec'}`}>{participant?.displayName.charAt(0).toUpperCase() || '·'}</span><span className="participant-copy"><b>{participant?.displayName || slot}</b><small>{participant?.role ? roleLabels[participant.role] : participant ? 'Role assigned by server' : 'Waiting to join'}</small></span><span className={`altc4-participant-status ${participant?.connection === 'connected' ? 'status-connected' : ''}`}>{participant?.connection === 'connected' ? 'CONNECTED' : participant ? participant.connection.toUpperCase() : 'OPEN'}</span>{participant?.slot === 'player' && <span className={`altc4-ready-pill ${participant.ready ? 'is-ready' : ''}`}>{participant.ready ? 'READY' : 'NOT READY'}</span>}</div>;
}

// Show the station’s connection status and optional route back to the existing menu.
function LobbyHeader({ title, status, onExit }: { title: string; status: LobbyView['status']; onExit?: () => void }) {
  return <header className="altc4-topbar"><a className="altc4-brand" href="#lobby-home"><span className="altc4-brand-mark">C4</span><span>BOOM BANANA <small>ALT+C4 / {title.toUpperCase()}</small></span></a><div className="altc4-toolbar"><span className={`altc4-connection-chip connection-${status}`}><i />{statusLabel(status)}</span>{onExit && <button className="altc4-button altc4-button-quiet" onClick={onExit}>Return to menu</button>}</div></header>;
}

// Explain the connection state and whether this tab resumed a previous identity.
function ConnectionNotice({ status, resumed }: { status: LobbyView['status']; resumed: boolean }) {
  return <div className={`altc4-connection-notice connection-${status}`}><span className="connection-dot" /><span><b>{statusLabel(status)}</b><small>{resumed ? 'This browser tab resumed its previous room identity.' : status === 'connected' ? 'Room updates arrive from the backend.' : status === 'reconnecting' ? 'Trying to restore this tab’s room identity…' : 'Check the backend address or wait for the connection to return.'}</small></span></div>;
}

// Present a failed action or connection error with its retry guidance.
function ErrorNotice({ error }: { error: LobbyError | null }) {
  if (!error) return null;
  return <div className="altc4-error-notice" role="alert"><b>{errorTitle(error.code)}</b><span>{friendlyErrorMessage(error.message)}</span>{error.retryable && <small>You can try again when the connection is ready.</small>}</div>;
}

// Choose an explicit or saved backend address, mapping local Vite ports to port 3000.
function defaultHostEndpoint(): string {
  const session = readLobbySession();
  const configured = new URLSearchParams(window.location.search).get('server');
  if (configured) return configured;
  if (session?.endpoint) return session.endpoint;
  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return 'http://localhost:3000';
  const localOrigin = new URL(window.location.origin);
  if (localOrigin.port === '5173' || localOrigin.port === '5174') localOrigin.port = '3000';
  return localOrigin.origin;
}

// Choose the explicit or saved backend address, falling back to the player page origin.
function defaultPlayerEndpoint(): string {
  const configured = new URLSearchParams(window.location.search).get('server');
  if (configured) return configured;
  const session = readLobbySession();
  return session?.endpoint || window.location.origin;
}

// Convert protocol and ordinary connection errors into the screen’s error shape.
function asLobbyError(error: unknown): LobbyError {
  if (error && typeof error === 'object' && 'message' in error) {
    const value = error as { code?: unknown; message: unknown; retryable?: unknown; requestId?: unknown };
    if (typeof value.code === 'string') return {
      code: value.code as LobbyError['code'],
      message: String(value.message),
      retryable: Boolean(value.retryable),
      requestId: typeof value.requestId === 'string' ? value.requestId : undefined,
    };
    return { code: 'connection_failed', message: String(value.message), retryable: true };
  }
  return { code: 'connection_failed', message: 'Could not complete that lobby action.', retryable: true };
}

// Count connected player seats for the host’s team indicator.
function connectedPlayers(state: LobbyState): number {
  return state.participants.filter((participant) => participant.slot === 'player' && participant.connection === 'connected').length;
}

// Format configured seconds as whole minutes or a minutes:seconds label.
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}:${String(remainder).padStart(2, '0')}` : `${minutes} min`;
}

// Map a protocol language value to its readable label.
function languageName(language: PuzzleLanguage): string {
  return languages.find((option) => option.value === language)?.label || language;
}

// Map the client connection state to the station’s visible status.
function statusLabel(status: LobbyView['status']): string {
  return status === 'connected' ? 'Connected' : status === 'reconnecting' ? 'Reconnecting' : status === 'connecting' ? 'Connecting' : status === 'disconnected' ? 'Disconnected' : 'Ready to connect';
}

// Give protocol and local connection errors a readable heading.
function errorTitle(code: string): string {
  const titles: Record<string, string> = {
    bad_request: 'Check the room details', unauthorized: 'This action is not available', wrong_role: 'Host permission required',
    room_full: 'Room is full', stale_round: 'Room state changed', not_joinable: 'Room is not open',
    rate_limited: 'Too many requests', invalid_resume_token: 'Session could not be restored',
    connection_failed: 'Connection problem', request_timeout: 'Server did not reply',
  };
  return titles[code] || 'Could not complete that action';
}

// Explain known backend rejection messages, with a readable fallback.
function friendlyErrorMessage(message: string): string {
  const messages: Record<string, string> = {
    room_full: 'This room already has two players.', room_not_found: 'No open room uses that code.',
    invalid_join_code: 'Enter the six characters shown by the host.', room_already_started: 'This room has already started.',
    host_only_action: 'Only the host can change this setting.', two_players_required: 'Two players need to join first.',
    players_must_be_ready: 'Both players need to mark themselves ready.', players_must_be_connected: 'Both players need an active connection.',
    host_not_connected: 'The host needs an active connection.', session_taken_over: 'This room identity resumed in another tab.',
    handshake_required: 'Connect to the room before changing its settings.', room_mismatch: 'This connection belongs to a different room.',
    stale_round: 'Reconnect to get the current room state.', invalid_config: 'Choose a duration, panel count, and language from the allowed ranges.',
  };
  return messages[message] || message.replaceAll('_', ' ');
}

// Summarize the server’s first start-blocking reason for the host.
function startStatusTitle(reason: string | null): string {
  const titles: Record<string, string> = {
    host_not_connected: 'Host connection needed', two_players_required: 'Waiting for two players',
    players_must_be_connected: 'Waiting for both connections', players_must_be_ready: 'Waiting for both players to be ready',
    round_already_started: 'Room already started',
  };
  return reason ? titles[reason] || 'Waiting for the team' : 'Waiting for the team';
}

// Explain what the host is waiting for before the server permits start.
function startStatusMessage(reason: string | null): string {
  if (reason === 'players_must_be_ready') return 'Both players need to mark themselves ready.';
  if (reason === 'players_must_be_connected') return 'Both player stations need an active connection.';
  if (reason === 'host_not_connected') return 'Reconnect the host station to continue.';
  if (reason === 'round_already_started') return 'This room has already started.';
  return reason ? 'Two connected players are needed before starting.' : 'Both players are connected and ready.';
}
