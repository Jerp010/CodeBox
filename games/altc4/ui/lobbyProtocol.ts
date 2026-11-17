export type PuzzleLanguage = 'java' | 'cpp' | 'python';
export type LobbyPhase = 'lobby' | 'starting' | 'inRound' | 'results';
export type PlayerRole = 'specHolder' | 'programmer';
export type AssignedRole = 'host' | PlayerRole;
export type LobbyErrorCode =
  | 'bad_request' | 'unauthorized' | 'wrong_role' | 'room_full' | 'stale_round'
  | 'not_joinable' | 'rate_limited' | 'check_busy' | 'round_terminal' | 'round_paused'
  | 'unsupported_edit' | 'invalid_resume_token' | 'payload_too_large';

export interface Envelope<T = unknown> {
  v: 1;
  id: string;
  type: string;
  roomId: string;
  roundNo: number;
  payload: T;
}

export interface LobbyState {
  roomId: string;
  joinCode: string;
  joinUrl: string;
  phase: LobbyPhase;
  participants: Array<{
    participantId: string;
    displayName: string;
    slot: 'host' | 'player';
    role: AssignedRole | null;
    connection: 'connected' | 'reconnecting' | 'disconnected';
    ready: boolean;
  }>;
  config: { durationSec: number; panelCount: number; language: PuzzleLanguage };
  canStart: boolean;
  startBlockedReason: string | null;
  round: { roundNo: number; outcome: 'defused' | 'detonated' | null } | null;
}

export interface RoleView {
  role: AssignedRole;
  title: string;
  instructions: string[];
}

export interface LobbyError {
  code: LobbyErrorCode | 'connection_failed' | 'request_timeout';
  message: string;
  retryable: boolean;
  requestId?: string;
}

export interface LobbyView {
  state: LobbyState | null;
  roleView: RoleView | null;
  participantId: string | null;
  status: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  error: LobbyError | null;
  resumed: boolean;
}

export interface LobbySession {
  resumeToken: string;
  endpoint: string;
  displayName: string;
  participantId?: string;
}
