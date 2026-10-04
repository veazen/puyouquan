const { chromium } = require('playwright'); const D = __dirname + '/../';
const F = 'file://' + D + 'home.html'; const OUT = D + (process.env.OUTDIR || '');
const q = s => [...document.querySelectorAll(s)].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)]; });
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const go = async (w, h, dpr) => { const pg = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr }); await pg.goto(F); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(700); return pg; };
  // desktop
  let pg = await go(1440, 900, 1);
  await pg.screenshot({ path: OUT + 'desk-full.png', fullPage: true });
  const g = await pg.evaluate((qs) => { const q = eval(qs); return { sw: document.documentElement.scrollWidth, body: document.body.scrollHeight,
    hero: q('.hero'), stage: q('.stage-hero .paper'), heroImg: q('.stage-hero img'), cap: q('.figcap'), tri: q('.tri'), stack: q('.stack'), strips: q('.strip .paper'), stripImg: q('.strip img'),
    scenes: q('.scenes'), sc: q('.sc'), scPaper: q('.sc .paper'), lib: q('.lib'), pg: q('.pg .paper'), foot: q('footer'), pair: q('.hero .pair a'), search: q('.search'), chips: q('.chips a'),
    fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight) }; }, q.toString());
  console.log('DESK', JSON.stringify(g)); await pg.close();
  pg = await go(1440, 900, 2); await pg.screenshot({ path: OUT + 'desk-hero.png' }); await pg.close();
  // mobile
  pg = await go(390, 844, 2);
  await pg.screenshot({ path: OUT + 'mobile-1.png' });
  const m = await pg.evaluate((qs) => { const q = eval(qs); return { sw: document.documentElement.scrollWidth, body: document.body.scrollHeight, stage: q('.stage-hero .paper'), heroImg: q('.stage-hero img'), tri: q('.tri'), strips: q('.strip img'), scenes: q('.scenes'), sc: q('.sc'), lib: q('.lib'), pg: q('.pg'), pair: q('.hero .pair a') }; }, q.toString());
  console.log('MOB', JSON.stringify(m));
  const y2 = await pg.evaluate(() => document.querySelector('.tri .stack').getBoundingClientRect().top + scrollY - 48 - 14);
  await pg.evaluate(y => scrollTo(0, y), y2); await pg.waitForTimeout(250); await pg.screenshot({ path: OUT + 'mobile-2.png' });
  const y3 = await pg.evaluate((sel) => document.querySelector(sel).getBoundingClientRect().top + scrollY - 48 - (+(window.M3OFF||0)), process.env.M3SEL || '.scenes');
  await pg.evaluate(y => scrollTo(0, y), y3 - (+process.env.M3OFF || 0)); await pg.waitForTimeout(250); await pg.screenshot({ path: OUT + 'mobile-3.png' });
  const y4 = await pg.evaluate(() => document.querySelector('.lib').getBoundingClientRect().top + scrollY - 48); await pg.evaluate(y => scrollTo(0, y), y4); await pg.waitForTimeout(250); await pg.screenshot({ path: OUT + 'mobile-4.png' });
  await pg.evaluate(() => scrollTo(0, 0)); await pg.screenshot({ path: OUT + 'mobile-full.png', fullPage: true });
  await pg.close(); await b.close(); })();
