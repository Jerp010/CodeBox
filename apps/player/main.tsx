import { createRoot } from 'react-dom/client';
import { MockupApp, type MockupRole } from '../../games/altc4/ui/MockupApp';
import { PlayerLobby } from '../../games/altc4/ui/LobbyScreens';
import '../../games/altc4/ui/mockup.css';
import './style.css';

const requestedRole = new URLSearchParams(window.location.search).get('role');
const isMockup = new URLSearchParams(window.location.search).get('mockup') === '1';
const initialRole: MockupRole = requestedRole === 'host' || requestedRole === 'programmer' || requestedRole === 'spec-holder'
  ? requestedRole
  : 'spec-holder';
const container = document.querySelector<HTMLElement>('#player-root');

if (container) createRoot(container).render(isMockup ? <MockupApp initialRole={initialRole} /> : <PlayerLobby />);
