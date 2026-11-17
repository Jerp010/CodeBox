import { createRoot } from 'react-dom/client';
import { MockupApp, type MockupRole } from '../../games/altc4/ui/MockupApp';
import '../../games/altc4/ui/mockup.css';
import './style.css';

const requestedRole = new URLSearchParams(window.location.search).get('role');
const initialRole: MockupRole = requestedRole === 'programmer' || requestedRole === 'spec-holder'
  ? requestedRole
  : 'spec-holder';
const container = document.querySelector<HTMLElement>('#player-root');

if (container) createRoot(container).render(<MockupApp initialRole={initialRole} />);
