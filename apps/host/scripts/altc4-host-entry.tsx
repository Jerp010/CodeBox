import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MockupApp } from '../../../games/altc4/ui/MockupApp';

function HostEntry() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const menu = document.querySelector<HTMLElement>('#main-menu');
    if (menu) menu.hidden = isOpen;
    return () => {
      if (menu) menu.hidden = false;
    };
  }, [isOpen]);

  if (!isOpen) {
    return <button className="altc4-host-launcher" onClick={() => setIsOpen(true)}>Open Alt+C4 host mockup</button>;
  }

  return <div className="altc4-host-overlay"><MockupApp initialRole="host" onExit={() => setIsOpen(false)} /></div>;
}

export function mountAltC4Host(container: HTMLElement) {
  const root = createRoot(container);
  root.render(<HostEntry />);

  return () => root.unmount();
}
