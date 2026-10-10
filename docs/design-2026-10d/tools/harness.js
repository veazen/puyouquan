/* 色调方案截图 + 验色工具
   用法：node harness.js <editor.css|-> <site.css|-> <outDir> [only=E1,S1,...]
   - 把 override CSS 追加在页面自身样式之后（同优先级后者胜），只换颜色，不动版式
   - 输出 PNG 截图 + report.json：每张图的「旧色残留」（朱砂 / 墨绿 / 暖米）元素清单 + 关键对比度 */
const { chromium } = require('playwright');
const fs = require('fs'), P = require('path');
const [, , EDCSS, SITECSS, OUT, ONLY] = process.argv;
const REPO = '/home/user/puyouquan';
const ED = 'file://' + REPO + '/muse-tab/index.html';
const SITE = REPO + '/muse-tab/site';
const edCss = EDCSS && EDCSS !== '-' ? fs.readFileSync(EDCSS, 'utf8') : '';
const siteCss = SITECSS && SITECSS !== '-' ? fs.readFileSync(SITECSS, 'utf8') : '';
const only = ONLY ? ONLY.replace(/^only=/, '').split(',') : null;
fs.mkdirSync(OUT, { recursive: true });
const tvs = fs.readFileSync(REPO + '/muse-tab/tests/tv_site.js', 'utf8');
const seed0 = eval(tvs.match(/const seed = (\[[\s\S]*?\n\]);/)[1]);
const T = ['送别', '茉莉花', '童年', '稻香', '卡农', '月亮代表我的心', '平凡之路', '成都'];
const seed = [];
for (let i = 0; i < 8; i++) { const s = JSON.parse(JSON.stringify(seed0[i % seed0.length])); s.id = 'seed' + i + 'abcdef'; s.title = T[i]; s.thumb = 0; s.updated_at = 100 - i; seed.push(s); }
/* 旧品牌色探针：朱砂（色相 0–14°、饱和 >.45、亮度 .3–.75）、墨绿（色相 150–175°、亮度 <.3）、暖米底（色相 35–55°、饱和 .15–.6、亮度 >.85） */
const PROBE = () => {
  const toRGB = s => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); if (p.length > 3 && p[3] === 0) return null; return p.slice(0, 3); };
  const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
    if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; };
  const cls = c => { const [h, s, l] = hsl(c); if ((h < 14 || h > 350) && s > .45 && l > .3 && l < .75) return 'cinnabar'; if (h > 145 && h < 180 && l < .3 && s > .15) return 'ink-green'; if (h > 33 && h < 56 && s > .12 && l > .84 && l < .985) return 'warm-cream'; return null; };
  const hits = {};
  const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight * 1.5; };
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue; if (el.closest('#paper svg, #print-pages, .gl-paper, svg.score')) continue;
    const cs = getComputedStyle(el);
    for (const prop of ['color', 'backgroundColor', 'borderTopColor', 'fill', 'stroke']) {
      if (prop.startsWith('border') && parseFloat(cs.borderTopWidth) === 0) continue;
      if (prop === 'color' && !(el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))) continue;
      const c = toRGB(cs[prop]); if (!c) continue; const k = cls(c); if (!k) continue;
      const sel = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].slice(0, 3).join('.') : '');
      const key = k + ' ' + prop + ' ' + sel; hits[key] = (hits[key] || 0) + 1;
    }
    const bi = cs.backgroundImage; if (bi && bi !== 'none' && /rgb/.test(bi)) { for (const m of bi.match(/rgba?\([^)]+\)/g) || []) { const c = toRGB(m); if (c && cls(c)) { const key = cls(c) + ' background-image ' + el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''); hits[key] = (hits[key] || 0) + 1; } } }
  }
  const root = getComputedStyle(document.documentElement), bodyBg = getComputedStyle(document.body);
  const v = n => root.getPropertyValue(n).trim();
  return { hits: Object.entries(hits).sort((a, b) => b[1] - a[1]).slice(0, 60), tokens: Object.fromEntries(['--bg', '--panel', '--text', '--muted', '--faint', '--border', '--accent', '--accent-ink', '--accent-soft', '--btn-pri', '--focus', '--danger', '--ok', '--paper', '--toolbar', '--chrome', '--glass'].map(n => [n, v(n)])), bodyBg: bodyBg.backgroundColor, bodyBgImg: bodyBg.backgroundImage.slice(0, 160) };
};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const report = {}; const errs = [];
  const want = id => !only || only.includes(id);
  async function shotEditor(id, vp, setup, theme, after) {
    if (!want(id)) return;
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, colorScheme: theme === 'dark' ? 'dark' : 'light' });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(id + ': ' + e.message));
    await pg.goto(ED); await pg.waitForTimeout(1000);
    if (theme) await pg.evaluate(t => document.documentElement.dataset.theme = t, theme);
    if (edCss) await pg.addStyleTag({ content: edCss });
    if (setup) await pg.evaluate(setup); await pg.waitForTimeout(600);
    if (after) { await pg.evaluate(after); await pg.waitForTimeout(400); }
    await pg.screenshot({ path: P.join(OUT, id + '.png') });
    report[id] = await pg.evaluate(PROBE); await ctx.close();
  }
  async function shotSite(id, vp, page, theme) {
    if (!want(id)) return;
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, colorScheme: theme === 'dark' ? 'dark' : 'light' });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(id + ': ' + e.message));
    await pg.route('**/*', route => { const u = new URL(route.request().url()); const p = u.pathname;
      const J = o => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (u.hostname === 'www.puyouquan.com') {
        if (p === '/api/pub/scores') return J({ scores: seed });
        if (p.startsWith('/api/')) return J({ ok: false });
        const f = P.join(SITE, p === '/' ? 'index.html' : p.slice(1));
        if (fs.existsSync(f)) return route.fulfill({ status: 200, body: fs.readFileSync(f), contentType: /\.css$/.test(f) ? 'text/css' : /\.js$/.test(f) ? 'application/javascript' : /\.png$/.test(f) ? 'image/png' : /\.svg$/.test(f) ? 'image/svg+xml' : 'text/html; charset=utf-8' });
        return route.fulfill({ status: 404, body: '' }); }
      if (/fonts\.(googleapis|gstatic)|hm\.baidu|res\.wx\.qq/.test(u.hostname)) return route.fulfill({ status: 200, body: '' });
      return route.continue(); });
    await pg.goto('https://www.puyouquan.com/' + page); await pg.waitForTimeout(1300);
    if (theme) await pg.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
    if (siteCss) await pg.addStyleTag({ content: siteCss });
    await pg.waitForTimeout(500);
    await pg.screenshot({ path: P.join(OUT, id + '.png') });
    report[id] = await pg.evaluate(PROBE); await ctx.close();
  }
  const load = `guardReplace=p=>p(); hideStartPad(); loadSong(PRESETS[0].make()); render(); sel.mi=1; sel.ci=2; render();`;
  await shotEditor('E1-editor-light', { width: 1440, height: 900 }, load);
  await shotEditor('E2-editor-dark', { width: 1440, height: 900 }, load, 'dark');
  await shotEditor('E3-startpad', { width: 1440, height: 900 }, null);
  await shotEditor('E4-play', { width: 1440, height: 900 }, load, null, `try{ audio.playing=true; highlight('v0',2,1,true); document.body.classList.add('playing'); }catch(e){}`);
  await shotEditor('E5-modal', { width: 1440, height: 900 }, `guardReplace=p=>p(); hideStartPad(); loadSong(PRESETS[0].make()); render(); try{ showNewWizard(); }catch(e){}`);
  await shotEditor('E6-mobile-viewer', { width: 390, height: 844 }, `guardReplace=p=>p(); hideStartPad(); toast=()=>{}; enterShareViewer({ song: PRESETS[10].make() });`);
  await shotEditor('E7-piano-dark', { width: 1440, height: 900 }, `guardReplace=p=>p(); hideStartPad(); const i=PRESETS.findIndex(p=>/钢琴/.test(p.name||p.title||'')); loadSong(PRESETS[i>=0?i:3].make()); render();`, 'dark');
  await shotSite('S1-site-home', { width: 1440, height: 900 }, 'index.html');
  await shotSite('S2-site-home-dark', { width: 1440, height: 900 }, 'index.html', 'dark');
  await shotSite('S3-site-kaobian', { width: 1440, height: 900 }, 'kaobian.html');
  await shotSite('S4-site-make', { width: 1440, height: 900 }, 'make.html');
  await shotSite('S5-site-mobile', { width: 390, height: 844 }, 'index.html');
  await shotSite('S6-site-kecheng', { width: 1440, height: 900 }, 'kecheng.html');
  fs.writeFileSync(P.join(OUT, 'report.json'), JSON.stringify({ errs, report }, null, 1));
  const sum = Object.entries(report).map(([k, r]) => k + ': 旧色残留 ' + r.hits.reduce((a, h) => a + h[1], 0) + ' 处');
  console.log(sum.join('\n')); console.log('errors', errs.slice(0, 5)); await b.close();
})();
