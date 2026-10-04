const { chromium } = require('playwright');
const [,, file, out, w, h, full, dpr] = process.argv;
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(dpr || 1) });
  await pg.goto('file://' + file); await pg.waitForTimeout(900);
  await pg.screenshot({ path: out, fullPage: full === '1' }); await b.close(); })();
