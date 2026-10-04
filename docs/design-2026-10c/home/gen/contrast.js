const { chromium } = require('playwright'); const D = __dirname + '/../';
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await pg.goto('file://' + D + 'home.html'); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(400);
  const items = await pg.evaluate(() => [...document.querySelectorAll('body *')].filter(e => [...e.childNodes].some(c => c.nodeType === 3 && c.textContent.trim()) && !['SCRIPT','STYLE'].includes(e.tagName) && !e.closest('.gnav')).map(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { t: e.textContent.trim().slice(0, 14), x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), c: cs.color, fs: parseFloat(cs.fontSize), fw: cs.fontWeight }; }));
  require('fs').writeFileSync(D + 'out/text.json', JSON.stringify(items)); await b.close(); })();
