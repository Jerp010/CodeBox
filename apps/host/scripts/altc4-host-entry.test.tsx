// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { mountAltC4Host } from './altc4-host-entry';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('host adapter lifecycle', () => {
  afterEach(() => { document.body.replaceChildren(); });

  it('opens the mockup, returns to the existing menu, unmounts, and mounts again', () => {
    document.body.innerHTML = '<main id="app"><section id="main-menu">Existing menu</section></main>';
    const app = document.querySelector<HTMLElement>('#app')!;
    const menu = document.querySelector<HTMLElement>('#main-menu')!;
    const host = document.createElement('div');
    app.append(host);

    let cleanup = () => {};
    act(() => { cleanup = mountAltC4Host(host); });
    expect(host.textContent).toContain('Open Alt+C4 host mockup');

    act(() => { host.querySelector<HTMLButtonElement>('button')!.click(); });
    expect(menu.hidden).toBe(true);
    expect(host.textContent).toContain('MOCKUP');

    act(() => { host.querySelector<HTMLButtonElement>('.altc4-button-quiet')!.click(); });
    expect(menu.hidden).toBe(false);
    expect(host.textContent).toContain('Open Alt+C4 host mockup');

    act(() => cleanup());
    expect(host.childElementCount).toBe(0);
    expect(menu.hidden).toBe(false);

    const remount = document.createElement('div');
    app.append(remount);
    act(() => { cleanup = mountAltC4Host(remount); });
    expect(remount.textContent).toContain('Open Alt+C4 host mockup');
    act(() => cleanup());
    expect(remount.childElementCount).toBe(0);
  });
});
