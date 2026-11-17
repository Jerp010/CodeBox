const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');
const { chromium, expect } = require('@playwright/test');
const { createServer } = require('../server/index.js');

const repositoryRoot = path.resolve(__dirname, '..');
const artifactDir = path.join(repositoryRoot, 'artifacts', 'altc4');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const viteCli = path.join(repositoryRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 720 },
];
let backend;
let hostServer;
let browser;
const contexts = [];

async function startBackend() {
  const previousBaseUrl = process.env.ALTC4_BACKEND_BASE_URL;
  delete process.env.ALTC4_BACKEND_BASE_URL;
  backend = createServer();
  if (previousBaseUrl !== undefined) process.env.ALTC4_BACKEND_BASE_URL = previousBaseUrl;
  await new Promise((resolve, reject) => {
    backend.once('error', reject);
    backend.listen(0, '127.0.0.1', resolve);
  });
  const address = backend.address();
  return `http://127.0.0.1:${address.port}`;
}

async function startHostVite() {
  hostServer = spawn(process.execPath, [viteCli, 'apps/host', '--host', '127.0.0.1', '--port', '0'], {
    cwd: repositoryRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let rejectReady;
  const ready = new Promise((resolve, reject) => {
    rejectReady = reject;
    const parseOutput = (chunk) => {
      output += chunk.toString();
      const match = output.match(/Local:\s+http:\/\/[^:\s]+:(\d+)\//);
      if (match) resolve(`http://127.0.0.1:${match[1]}/`);
    };
    hostServer.stdout.on('data', parseOutput);
    hostServer.stderr.on('data', parseOutput);
    hostServer.once('error', reject);
    hostServer.once('exit', (code) => reject(new Error(`Host Vite exited before ready (${code}): ${output}`)));
  });
  const timeout = setTimeout(() => rejectReady(new Error(`Host Vite did not start: ${output}`)), 20_000);
  try { return await ready; }
  finally { clearTimeout(timeout); }
}

async function checkViewport(page, role, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  const sizes = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(sizes.document, `${role} ${viewport.name} document overflow`).toBeLessThanOrEqual(viewport.width);
  expect(sizes.body, `${role} ${viewport.name} body overflow`).toBeLessThanOrEqual(viewport.width);
  const screenshot = path.join(artifactDir, `lobby-${role}-${viewport.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  console.log(`${role} ${viewport.width}x${viewport.height}: no horizontal overflow; ${screenshot}`);
}

async function makePlayerContext(roleName, backendUrl, joinCode, disableRandomUUID = false) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  contexts.push(context);
  const page = await context.newPage();
  if (disableRandomUUID) {
    await page.addInitScript(() => {
      Object.defineProperty(window.crypto, 'randomUUID', { configurable: true, value: undefined });
    });
  }
  await page.goto(`${backendUrl}/?code=${joinCode}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Pair with your host' })).toBeVisible();
  await page.getByLabel('Your display name').fill(roleName);
  await page.getByLabel('Room code').fill(joinCode);
  await page.getByRole('button', { name: 'Join room' }).click();
  await expect(page.getByTestId('lobby-room')).toBeVisible();
  return { context, page };
}

async function verifyUnauthorizedControl(playerPage, backendUrl) {
  const response = await playerPage.evaluate(async (baseUrl) => {
    const url = new URL(baseUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws';
    return await new Promise((resolve, reject) => {
      const socket = new WebSocket(url.toString());
      const timer = setTimeout(() => reject(new Error('Unauthenticated action timed out')), 5000);
      socket.onopen = () => socket.send(JSON.stringify({
        v: 1,
        id: 'unauth-config-attempt',
        type: 'set_config',
        roomId: 'not-client-bound',
        roundNo: 0,
        payload: { language: 'cpp' },
      }));
      socket.onmessage = (event) => {
        const envelope = JSON.parse(event.data);
        if (envelope.type !== 'error') return;
        clearTimeout(timer);
        socket.close();
        resolve(envelope.payload);
      };
      socket.onerror = () => { clearTimeout(timer); reject(new Error('Unauthenticated test socket could not connect')); };
    });
  }, backendUrl);
  expect(response.code).toBe('unauthorized');
  expect(response.message).toBe('handshake_required');
  console.log('Unauthenticated set_config rejected with unauthorized/handshake_required');
}

async function invalidatePreviousResumeToken(playerPage, backendUrl) {
  const rotatedToken = await playerPage.evaluate(async (baseUrl) => {
    const url = new URL(baseUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws';
    const stored = JSON.parse(sessionStorage.getItem('altc4.session.v1'));
    return await new Promise((resolve, reject) => {
      const socket = new WebSocket(url.toString());
      const timer = setTimeout(() => reject(new Error('Resume takeover timed out')), 5000);
      socket.onopen = () => socket.send(JSON.stringify({
        v: 1, id: 'resume-token-rotation', type: 'resume', roomId: '', roundNo: 0,
        payload: { resumeToken: stored.resumeToken },
      }));
      socket.onmessage = (event) => {
        const envelope = JSON.parse(event.data);
        if (envelope.type !== 'resumed') return;
        clearTimeout(timer);
        socket.close();
        resolve(envelope.payload.resumeToken);
      };
      socket.onerror = () => { clearTimeout(timer); reject(new Error('Resume takeover socket could not connect')); };
    });
  }, backendUrl);
  expect(rotatedToken).not.toBe('');
  await expect(playerPage.getByRole('heading', { name: 'Pair with your host' })).toBeVisible({ timeout: 8000 });
  await expect(playerPage.getByRole('alert')).toContainText('Session could not be restored');
  expect(await playerPage.getByTestId('role-shell').count()).toBe(0);
  expect(await playerPage.evaluate(() => sessionStorage.getItem('altc4.session.v1'))).toBeNull();
  console.log('A superseded token returned the player to the join form and cleared stale role state');
}

async function closeProcess(child) {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, 'exit').catch(() => undefined);
  child.kill('SIGTERM');
  await Promise.race([exited, delay(2500)]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

async function main() {
  fs.mkdirSync(artifactDir, { recursive: true });
  const backendUrl = await startBackend();
  const hostUrl = await startHostVite();
  const launchOptions = { headless: true, args: ['--no-sandbox'] };
  if (executablePath) launchOptions.executablePath = executablePath;
  browser = await chromium.launch(launchOptions);

  const hostContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  contexts.push(hostContext);
  const hostPage = await hostContext.newPage();
  await hostPage.goto(hostUrl, { waitUntil: 'domcontentloaded' });
  await expect(hostPage.locator('#main-menu')).toBeVisible();
  await hostPage.getByRole('button', { name: 'Open Alt+C4 host lobby' }).click();
  await expect(hostPage.locator('#main-menu')).toBeHidden();
  await hostPage.getByLabel('Backend address').fill(backendUrl);
  await hostPage.getByRole('button', { name: 'Create room' }).click();
  const codeElement = hostPage.getByTestId('join-code');
  await expect(codeElement).toBeVisible();
  const joinCode = (await codeElement.innerText()).trim();
  expect(joinCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  const joinLink = await hostPage.locator('input[readonly]').inputValue();
  expect(joinLink).toBe(`${backendUrl}/?code=${joinCode}`);

  const firstPlayer = await makePlayerContext('Mika', backendUrl, joinCode, true);
  expect(await firstPlayer.page.evaluate(() => window.crypto.randomUUID)).toBeUndefined();
  const secondPlayer = await makePlayerContext('Kai', backendUrl, joinCode);
  await expect(firstPlayer.page.locator('.altc4-role-stamp')).toContainText(/Spec Holder|Programmer/);
  await expect(secondPlayer.page.locator('.altc4-role-stamp')).toContainText(/Spec Holder|Programmer/);

  const thirdContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  contexts.push(thirdContext);
  const thirdPage = await thirdContext.newPage();
  await thirdPage.goto(`${backendUrl}/?code=${joinCode}`, { waitUntil: 'domcontentloaded' });
  await thirdPage.getByLabel('Your display name').fill('Third player');
  await thirdPage.getByLabel('Room code').fill(joinCode);
  await thirdPage.getByRole('button', { name: 'Join room' }).click();
  await expect(thirdPage.getByRole('alert')).toContainText('Room is full');
  expect(await thirdPage.getByTestId('lobby-room').count()).toBe(0);

  await verifyUnauthorizedControl(firstPlayer.page, backendUrl);

  await hostPage.getByRole('slider').nth(0).press('ArrowRight');
  await hostPage.getByRole('slider').nth(1).press('ArrowRight');
  await hostPage.getByLabel('Language').selectOption('python');
  await hostPage.getByRole('button', { name: 'Apply settings' }).click();
  await expect(firstPlayer.page.getByText('4 panels · 5:30 · Python')).toBeVisible();
  await expect(secondPlayer.page.getByText('4 panels · 5:30 · Python')).toBeVisible();
  await expect(hostPage.getByRole('button', { name: 'Start round' })).toBeDisabled();
  const firstReady = firstPlayer.page.getByLabel("I'm ready");
  await firstReady.click();
  await expect(firstReady).toBeChecked();
  await expect(hostPage.getByRole('button', { name: 'Start round' })).toBeDisabled();
  const secondReady = secondPlayer.page.getByLabel("I'm ready");
  await secondReady.click();
  await expect(secondReady).toBeChecked();
  await expect(hostPage.getByRole('button', { name: 'Start round' })).toBeEnabled();

  const readyRoles = [
    (await firstPlayer.page.locator('.altc4-role-stamp').innerText()).trim(),
    (await secondPlayer.page.locator('.altc4-role-stamp').innerText()).trim(),
  ].sort();
  expect(readyRoles).toEqual(['Programmer', 'Spec Holder']);

  await checkViewport(hostPage, 'host', viewports[0]);
  await checkViewport(hostPage, 'host', viewports[1]);
  const playerPages = [firstPlayer.page, secondPlayer.page];
  for (const page of playerPages) {
    const role = (await page.locator('.altc4-role-stamp').innerText()).trim().toLowerCase().replace(' ', '-');
    await checkViewport(page, role, viewports[0]);
    await checkViewport(page, role, viewports[1]);
  }

  await hostPage.getByRole('button', { name: 'Start round' }).click();
  await expect(hostPage.getByTestId('role-shell')).toBeVisible();
  for (const page of playerPages) {
    await expect(page.getByTestId('role-shell')).toBeVisible();
    await expect(page.getByTestId('role-shell')).toContainText('GAMEPLAY PREVIEW');
    expect(await page.getByTestId('role-shell').innerText()).not.toMatch(/00:\d\d/);
  }

  const firstRole = (await firstPlayer.page.locator('.altc4-role-stamp').innerText()).trim();
  await firstPlayer.page.reload({ waitUntil: 'domcontentloaded' });
  await expect(firstPlayer.page.getByTestId('role-shell')).toBeVisible();
  await expect(firstPlayer.page.getByText('This browser tab resumed its previous room identity.')).toBeVisible();
  expect((await firstPlayer.page.locator('.altc4-role-stamp').innerText()).trim()).toBe(firstRole);
  const sessionToken = await firstPlayer.page.evaluate(() => JSON.parse(sessionStorage.getItem('altc4.session.v1')).resumeToken);
  expect(sessionToken.length).toBeGreaterThanOrEqual(32);
  expect(await firstPlayer.page.evaluate(() => localStorage.getItem('altc4.session.v1'))).toBeNull();
  await invalidatePreviousResumeToken(firstPlayer.page, backendUrl);

  console.log(`Lobby browser flow passed for room ${joinCode}: config, readiness, server roles, start, third-player rejection, unauthorized action, and reload resume.`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => {
    for (const context of contexts) await context.close().catch(() => undefined);
    if (browser) await browser.close().catch(() => undefined);
    await closeProcess(hostServer);
    if (backend?.listening) await new Promise((resolve) => backend.close(resolve));
  });
