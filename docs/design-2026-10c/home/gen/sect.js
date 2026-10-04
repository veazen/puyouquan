const { chromium } = require('playwright'); const D = __dirname + '/../';
const [,, w, sels] = process.argv;
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: +w, height: 900 }, deviceScaleFactor: 2 });
  await pg.goto('file://' + D + 'home.html'); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(600);
  for (const sel of sels.split(',')) { const el = await pg.$(sel); await el.screenshot({ path: D + 'out/s-' + w + '-' + sel.replace(/[^a-z]/g, '') + '.png' }); }
  await b.close(); })();
