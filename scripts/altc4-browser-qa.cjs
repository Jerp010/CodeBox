const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { chromium } = require('@playwright/test');

const repositoryRoot = path.resolve(__dirname, '..');
const artifactDir = path.join(repositoryRoot, 'artifacts', 'altc4');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const serverUrl = 'http://127.0.0.1:5174/';
const sizes = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 720 },
];
const roles = ['host', 'spec-holder', 'programmer'];
const viteCli = path.join(repositoryRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const server = spawn(process.execPath, [viteCli, 'apps/player', '--host', '127.0.0.1', '--port', '5174', '--strictPort'], {
  cwd: repositoryRoot,
  stdio: 'ignore',
});

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(serverUrl);
      if (response.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error('Player preview server did not become ready within 20 seconds');
}

async function main() {
  fs.mkdirSync(artifactDir, { recursive: true });
  await waitForServer();
  const launchOptions = { headless: true, args: ['--no-sandbox'] };
  if (executablePath) launchOptions.executablePath = executablePath;
  const browser = await chromium.launch(launchOptions);
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    for (const size of sizes) {
      await page.setViewportSize({ width: size.width, height: size.height });
      for (const role of roles) {
        await page.goto(`${serverUrl}?role=${role}`, { waitUntil: 'networkidle' });
        await page.locator('select').nth(0).selectOption(role);
        await page.locator('select').nth(1).selectOption('ready');
        const report = await page.evaluate(() => ({
          viewport: window.innerWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
        }));
        if (report.document > size.width || report.body > size.width) {
          throw new Error(`${role} ${size.name} horizontal overflow: ${JSON.stringify(report)}`);
        }
        if (size.name === 'mobile') {
          const textSizes = await page.evaluate(() => ({
            code: document.querySelector('.altc4-code-window pre')
              ? Number.parseFloat(getComputedStyle(document.querySelector('.altc4-code-window pre')).fontSize)
              : null,
            paragraphs: Array.from(document.querySelectorAll('.altc4-shell p'))
              .map((paragraph) => Number.parseFloat(getComputedStyle(paragraph).fontSize)),
          }));
          if (textSizes.paragraphs.some((fontSize) => fontSize < 14)) {
            throw new Error(`${role} mobile body copy is smaller than 14px: ${JSON.stringify(textSizes)}`);
          }
          if (role === 'programmer' && textSizes.code < 14) {
            throw new Error(`Programmer mobile code is smaller than 14px: ${JSON.stringify(textSizes)}`);
          }
        }
        const screenshotPath = path.join(artifactDir, `${role}-${size.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`${role} ${size.width}x${size.height}: no horizontal overflow; ${screenshotPath}`);
      }
    }

    for (const state of ['checking', 'paused']) {
      for (const role of roles) {
        await page.goto(`${serverUrl}?role=${role}`, { waitUntil: 'networkidle' });
        await page.locator('select').nth(0).selectOption(role);
        await page.locator('select').nth(1).selectOption(state);
        const heading = state === 'checking' ? 'CHECKING PATCH' : 'ROUND PAUSED';
        await page.getByText(heading, { exact: true }).waitFor({ state: 'visible' });
        const report = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
        if (report.document > 1280) throw new Error(`${role} ${state} horizontal overflow: ${JSON.stringify(report)}`);
      }
      const stateScreenshotPath = path.join(artifactDir, `${state}-programmer-desktop.png`);
      await page.screenshot({ path: stateScreenshotPath, fullPage: false });
      console.log(`${state} programmer 1280x720: state visible and no horizontal overflow; ${stateScreenshotPath}`);
    }

    if (errors.length) throw new Error(`Browser page errors: ${errors.join('; ')}`);
    await page.close();
  } finally {
    await browser.close();
  }
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => {
    if (!server.killed) server.kill('SIGTERM');
  });
