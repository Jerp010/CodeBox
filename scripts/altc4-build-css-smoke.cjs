const fs = require('node:fs');
const path = require('node:path');

for (const app of ['host', 'player']) {
  const output = path.join(__dirname, '..', 'apps', app, 'dist', 'assets');
  const stylesheet = fs.readdirSync(output).find((name) => name.endsWith('.css'));
  if (!stylesheet) throw new Error(`No production stylesheet found for ${app}`);
  const css = fs.readFileSync(path.join(output, stylesheet), 'utf8');
  if (!css.includes('.tracking-widest')) {
    throw new Error(`${app} CSS is missing the shared Tailwind .tracking-widest utility`);
  }
  if (!css.includes('.altc4-shell')) {
    throw new Error(`${app} CSS is missing shared Alt+C4 mockup styles`);
  }
  console.log(`${app}: shared Tailwind source utility and mockup styles found in ${stylesheet}`);
}
