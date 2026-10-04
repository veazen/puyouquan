const { chromium } = require('playwright'); const D = __dirname + '/../';
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const rm of ['no-preference', 'reduce']) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: rm });
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
    await pg.goto('file://' + D + 'home.html'); await pg.waitForTimeout(1500);
    const r = await pg.evaluate(() => ({ motion: document.documentElement.classList.contains('motion'), heroIn: [...document.querySelectorAll('.hero .rv')].every(e => getComputedStyle(e).opacity === '1'), triIn: document.querySelector('.tri .rv').classList.contains('in') }));
    await pg.evaluate(() => scrollTo(0, document.querySelector('.tri').offsetTop)); await pg.waitForTimeout(1300);
    const r2 = await pg.evaluate(() => ({ triIn: [...document.querySelectorAll('.tri .head .rv')].every(e => e.classList.contains('in') && getComputedStyle(e).opacity === '1'), nav: document.querySelector('.gnav').className }));
    console.log(rm, JSON.stringify(r), JSON.stringify(r2), 'errors', errs);
    await ctx.close(); }
  await b.close(); })();
