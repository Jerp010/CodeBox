import '../../../games/altc4/ui/mockup.css';
import './altc4-host-adapter.css';
import { mountAltC4Host } from './altc4-host-entry.tsx';

const app = document.querySelector('#app');
if (app) {
  const container = document.createElement('div');
  container.id = 'altc4-host-entry';
  app.append(container);
  mountAltC4Host(container);
}
