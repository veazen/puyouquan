const { chromium } = require('playwright'); const D = __dirname + '/../';
const F = 'file://' + D + 'home.html';
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const shots = [ ['desk-full.png', 1440, 900, 1, true], ['desk-hero.png', 1440, 900, 2, false], ['mobile.png', 390, 844, 2, true] ];
  for (const [out, w, h, dpr, full] of shots) {
    const pg = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    await pg.goto(F); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(1200);
    await pg.screenshot({ path: D + out, fullPage: full });
    if (out === 'desk-full.png') {
      const g = await pg.evaluate(() => { const q = s => [...document.querySelectorAll(s)].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)]; });
        return { band: q('.band .paper'), cap: q('.band .cap'), reassure: q('.reassure'), tri: q('.tri'), triCopy: q('.tri .copy'), stack: q('.stack'), strips: q('.strip .paper'), stripImg: q('.strip img'), sc: q('.sc'), scPaper: q('.sc .paper'), scImg: q('.sc img'), lib: q('.card .stage'), libImg: q('.card img'), body: document.body.scrollHeight,
          fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + f.weight) }; });
      console.log(JSON.stringify(g));
    }
    if (out === 'mobile.png') {
      const g = await pg.evaluate(() => { const q = s => [...document.querySelectorAll(s)].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)]; });
        return { sw: document.documentElement.scrollWidth, band: q('.band .paper'), bandImg: q('.band img'), strips: q('.strip img'), sc: q('.sc'), lib: q('.card .stage'), libImg: q('.card img'), body: document.body.scrollHeight }; });
      console.log(JSON.stringify(g));
    }
    await pg.close();
  }
  await b.close(); })();
