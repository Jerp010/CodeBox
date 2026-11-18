import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MockupApp } from '../../../games/altc4/ui/MockupApp';
import { HostLobby } from '../../../games/altc4/ui/LobbyScreens';

// Open the live lobby or explicit mockup while hiding and restoring the existing menu.
function HostEntry() {
  const mockupOnly = new URLSearchParams(window.location.search).get('mockup') === '1';
  const [isOpen, setIsOpen] = useState(mockupOnly);

  useEffect(() => {
    const menu = document.querySelector<HTMLElement>('#main-menu');
    if (menu) menu.hidden = isOpen;
    return () => {
      if (menu) menu.hidden = false;
    };
  }, [isOpen]);

  if (mockupOnly && isOpen) return <div className="altc4-host-overlay"><MockupApp initialRole="host" onExit={() => setIsOpen(false)} /></div>;
  if (!isOpen) return <button className="altc4-host-launcher" onClick={() => setIsOpen(true)}>Open Alt+C4 host lobby</button>;

  return <div className="altc4-host-overlay"><HostLobby onExit={() => setIsOpen(false)} /></div>;
}

// Mount Alt+C4 beside the existing host menu and return its React cleanup callback.
export function mountAltC4Host(container: HTMLElement) {
  const root = createRoot(container);
  root.render(<HostEntry />);

  return () => root.unmount();
}
