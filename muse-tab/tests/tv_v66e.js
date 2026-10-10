/* v66.6 换色遗留修复（编辑器）——接 v66.5 C「极光靛紫」（tv_v66d）
   T1 告警 / 成功实底上的字：页签关闭钮悬停 .dt-x:hover、静音钮 .mx-btn.mute.on（含悬停）以 --danger 为底，
      「全部采纳」#err-fixall 与修复钮悬停以 --ok 为底——浅 / 深 / 系统深三态字对比 ≥4.5（深色 --danger / --ok 提亮，读 --ed-on-danger / --ed-on-ok 深墨字）；
      静音悬停不再是写死旧朱砂 #e2574a；源码里不再有「--danger / --ok 实底 + color:#fff」的规则
   T2 半透明图形 / 小字改不透明令牌：谱库卡收藏心 .cc-fav（图形 ≥3，次于曲名，悬停转 --muted）、
      编辑器变调弹窗夹位芯片音名 #ekey-pop .kp-chip i（文字 ≥4.5，次于芯片主字），两主题有效透明度＝1
   T3 全局半透明文字扫描：11 个界面状态 × 浅深两主题，逐个可见文字（含伪元素、SVG 文字）按祖先 opacity 连乘与颜色 alpha
      做分组合成，凡有效透明度 <1 的正文 / 标签字 <4.5（大字 <3）判红；豁免：禁用态（[disabled] / .disabled）、纯符号装饰
      （› ♪ ～ 等无字母数字的字形，图形另由 T2 管）
   T4 谱库搜索框放大镜：同一 SVG 改作 mask-image，background-color＝--ed-icon-soft（两主题不同、对输入框底 ≥3），尺寸位置不变
   T5 meta theme-color 跟随应用内明暗：b-theme 切换后当前生效的那条 meta＝主栏 --chrome（浅 #161433 / 深 #1c1a3d，含系统深 + 显式浅）；
      手机观看页页首是浅色栏 → 地址栏取页首 #viewerbar 实际底色（--panel：浅 #ffffff / 深 #1b1b28）；滚下去（页首已滚走）后再切明暗 / 系统配色仍取页首栏色；
      静态两条 media meta 保留；不新增 localStorage 键
   T6 旧预设头像显示映射：账号里存的是 v66.5 前 8 枚旧色预设 data URI 时，个人中心页头显示同位新预设（＝site/pyq.js 现行 PRESETS 逐字），
      ACCT 与 localStorage 里的值不改写；新预设、上传图、http 头像原样
   突变实证：MUSETAB_URL 指向 v66.5 原版复跑 → T1–T6 全红，只剩「无页面脚本错误」绿。 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const FILE = URL0.startsWith('file://') ? URL0.slice(7) : path.resolve(__dirname, '../index.html');
const HTML = fs.readFileSync(FILE, 'utf8');
const PYQ = fs.readFileSync(path.resolve(__dirname, '../site/pyq.js'), 'utf8');
const STATES = [['浅', 'light', null], ['深', 'dark', 'dark'], ['系统深', 'dark', null]];
const COLORLIB = `window.__col = (s) => { s = String(s || '').trim(); let m = s.match(/^rgba?\\(([^)]+)\\)/);
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    m = s.match(/^color\\(srgb ([\\d.e-]+) ([\\d.e-]+) ([\\d.e-]+)(?: \\/ ([\\d.e-]+))?\\)/);
    if (m) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] == null ? 1 : +m[4]]; return null; };
  window.__tok = (name, scope) => { const e = document.createElement('i'); e.style.cssText = 'position:absolute;color:var(' + name + ')'; (scope || document.body).appendChild(e);
    const c = getComputedStyle(e).color; e.remove(); return __col(c); };
  window.__over = (f, b) => f[3] >= 1 ? f.slice(0, 3) : f.slice(0, 3).map((c, i) => c * f[3] + b[i] * (1 - f[3]));
  window.__L = c => { const s = c.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * s[0] + .7152 * s[1] + .0722 * s[2]; };
  window.__cr = (fg, bg) => { const B = bg.slice(0, 3), F = __over(fg, B); const a = __L(F), b = __L(B); return Math.round((Math.max(a, b) + .05) / (Math.min(a, b) + .05) * 100) / 100; };
  window.__effOp = el => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
  /* 元素实际底色：沿祖先找第一层不透明底，逐层合成半透明底 */
  window.__bgOf = el => { const st = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = __col(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) { st.push(c); if (c[3] >= 1) break; } }
    let b = [255, 255, 255]; for (let i = st.length - 1; i >= 0; i--) b = __over(st[i], b); return b.concat(1); };
  window.__pair = el => { const cs = getComputedStyle(el); const bg = __bgOf(el); return { cr: __cr(__col(cs.color), bg), fg: cs.color, bg: cs.backgroundColor }; };`;
/* 半透明文字扫描（与 v66.6 验收工具同口径）：每层 opacity 作用在「该层底 + 子孙」整组上，求文字像素与相邻底像素 */
const SCAN = () => {
  const parse = s => { if (!s) return null; let m = s.match(/rgba?\(([^)]+)\)/); if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    m = s.match(/color\(srgb ([^)]+)\)/); if (m) { const p = m[1].split(/[ /]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1]; } return null; };
  const lum = c => { const s = c.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * s[0] + .7152 * s[1] + .0722 * s[2]; };
  const over = (f, b) => [0, 1, 2].map(i => f[i] * f[3] + b[i] * (1 - f[3]));
  const mix = (a, b, t) => [0, 1, 2].map(i => a[i] * t + b[i] * (1 - t));
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const pgbg = e => { if (!(e instanceof SVGSVGElement)) return null; const r = e.querySelector('rect.pagebg'); return r ? parse(getComputedStyle(r).fill) : null; };
  const layer = e => { const cs = getComputedStyle(e); const l = { op: +cs.opacity, bg: parse(cs.backgroundColor) || [0, 0, 0, 0] }; const pb = pgbg(e); if (pb) l.bg = pb; return l; };
  const chain = el => { const ch = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) ch.unshift(layer(e)); return ch; };
  const paint = (L, i, back, fg) => { if (i === L.length) return fg ? over(fg, back) : back; const e = L[i]; const c = e.bg[3] > 0 ? over(e.bg, back) : back; return mix(paint(L, i + 1, c, fg), back, e.op); };
  const vis = r => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  const sel = el => { const s = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList && e.classList.length ? '.' + [...e.classList].slice(0, 3).join('.') : ''); return (el.parentElement ? s(el.parentElement) + '>' : '') + s(el); };
  const bad = [];
  const consider = (el, L, fg, text, fs, fw, tag) => {
    let op = 1; for (const l of L) op *= l.op; if (op * fg[3] >= 0.999 || op === 0 || fg[3] === 0) return;
    if (!/[\p{L}\p{N}]/u.test(text)) return;   /* 纯符号装饰（› ♪ ～ ·）不按文字算 */
    if (el.closest('[disabled],:disabled,.disabled,[aria-disabled="true"],[inert]')) return;
    const r = cr(paint(L, 0, [255, 255, 255], fg), paint(L, 0, [255, 255, 255], null)); const min = (fs >= 24 || (fs >= 18.66 && fw >= 700)) ? 3 : 4.5;
    if (r < min) bad.push(sel(el) + tag + '「' + text.slice(0, 10) + '」' + r.toFixed(2));
  };
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (!vis(el.getBoundingClientRect())) continue;
    if (el instanceof SVGElement) {
      if (el.tagName.toLowerCase() !== 'text') continue; const t = el.textContent.trim(); const f = parse(cs.fill); if (!t || !f) continue; f[3] *= +cs.fillOpacity;
      consider(el, chain(el), f, t, parseFloat(cs.fontSize), +cs.fontWeight || 400, '[svg]'); continue;
    }
    const t = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    if (t) { const fg = parse(cs.color); if (fg) consider(el, chain(el), fg, t, parseFloat(cs.fontSize), +cs.fontWeight || 400, ''); }
    for (const ps of ['::before', '::after']) {
      const pc = getComputedStyle(el, ps); const m = (pc.content || '').match(/^"(.*)"$/); if (!m || !m[1].trim() || pc.display === 'none') continue;
      const fg = parse(pc.color); if (!fg) continue; const L = chain(el); L.push({ op: +pc.opacity, bg: parse(pc.backgroundColor) || [0, 0, 0, 0] });
      consider(el, L, fg, m[1].trim(), parseFloat(pc.fontSize), +pc.fontWeight || 400, ps);
    }
  }
  return bad;
};
/* site/pyq.js 现行 8 枚预设（逐字取其模板与 P8 表求值），旧色＝v58.9–v66.4 素材配色（同位替换渐变两端色） */
const pyqPresets = (src) => { const a = src.indexOf('window.PYQ_AV = (function(){'); const b = src.indexOf('})();', a); const window = {};
  const btoa = s => Buffer.from(s, 'binary').toString('base64'); return eval(src.slice(a + 'window.PYQ_AV = '.length, b + 5)).PRESETS; };
const NEW_AV = pyqPresets(PYQ);
const OLD_PAIRS = [['#d24a37', '#c33a29'], ['#44688c', '#33587a'], ['#3c7f5f', '#2f6d4f'], ['#b98738', '#a8762a']];
const NEW_PAIRS = [['#6a5bf8', '#5b4cf0'], ['#3f72b5', '#2e62a3'], ['#1b8590', '#0e7380'], ['#a76b0e', '#965a00']];
const OLD_AV = NEW_AV.map((u, i) => { const svg = Buffer.from(u.split(',')[1], 'base64').toString('binary'); const [n1, n2] = NEW_PAIRS[i >> 1], [o1, o2] = OLD_PAIRS[i >> 1];
  if (!svg.includes(`stop-color="${n1}"`) || !svg.includes(`stop-color="${n2}"`)) throw new Error('pyq.js 预设色表与测试不一致：' + i);
  return 'data:image/svg+xml;base64,' + Buffer.from(svg.replace(`stop-color="${n1}"`, `stop-color="${o1}"`).replace(`stop-color="${n2}"`, `stop-color="${o2}"`), 'binary').toString('base64'); });
const LOAD = `hideStartPad(); loadSong(PRESETS[0].make()); render(); sel.mi=1; sel.ci=2; render();`;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];
  const open = async (scheme, theme, vp, url) => {
    const ctx = await b.newContext({ viewport: vp || { width: 1440, height: 900 }, colorScheme: scheme });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(url || URL0); await pg.waitForTimeout(900);
    await pg.evaluate(t => { window.guardReplace = p => p(); if (t) document.documentElement.dataset.theme = t; }, theme);
    await pg.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
    await pg.evaluate(COLORLIB);
    pg.__ctx = ctx; return pg;
  };
  const close = pg => pg.__ctx.close();

  /* ---------- T1 告警 / 成功实底上的字 ---------- */
  {
    const out = {}; const fails = [];
    for (const [nm, scheme, theme] of STATES) {
      const pg = await open(scheme, theme);
      await pg.evaluate(LOAD + `addDoc(PRESETS[10].make()); render(); renderDocTabs();`); await pg.waitForTimeout(300);
      const r = {};
      await pg.hover('#doc-tabs .dtab:not(.on) .dt-x'); await pg.waitForTimeout(80);
      r.dtx = await pg.evaluate(() => { const e = document.querySelector('#doc-tabs .dtab:not(.on) .dt-x'); const cs = getComputedStyle(e);
        return { cr: __cr(__col(cs.color), __col(cs.backgroundColor)), bgIsDanger: __col(cs.backgroundColor).slice(0, 3).join() === __tok('--danger').slice(0, 3).join() }; });
      await pg.evaluate(() => { document.getElementById('mx-expand')?.click(); }); await pg.waitForTimeout(200);
      await pg.evaluate(() => { const m = document.querySelector('#mixer-dock .mx-btn.mute'); if (m && !m.classList.contains('on')) m.click(); });
      await pg.waitForTimeout(150);
      await pg.mouse.move(5, 5); await pg.waitForTimeout(60);
      r.mute = await pg.evaluate(() => { const e = document.querySelector('#mixer-dock .mx-btn.mute.on'); if (!e) return null; const cs = getComputedStyle(e);
        return { cr: __cr(__col(cs.color), __col(cs.backgroundColor)), bgIsDanger: __col(cs.backgroundColor).slice(0, 3).join() === __tok('--danger').slice(0, 3).join() }; });
      if (r.mute) { await pg.hover('#mixer-dock .mx-btn.mute.on'); await pg.waitForTimeout(80);
        r.muteH = await pg.evaluate(() => { const e = document.querySelector('#mixer-dock .mx-btn.mute.on'); const cs = getComputedStyle(e);
          return { cr: __cr(__col(cs.color), __col(cs.backgroundColor)), oldRed: cs.backgroundColor === 'rgb(226, 87, 74)' }; }); }
      await pg.mouse.move(5, 5);
      await pg.evaluate(() => { loadSong(PRESETS[10].make()); const m = song.measures[0]; m.voxes[0].push(JSON.parse(JSON.stringify(m.voxes[0][0]))); render(); syncInputs(); });
      await pg.waitForTimeout(200);
      r.fixall = await pg.evaluate(() => { const e = document.getElementById('err-fixall'); if (!e) return null; const cs = getComputedStyle(e); return { cr: __cr(__col(cs.color), __col(cs.backgroundColor)) }; });
      const fx = await pg.$('#err-drop .err-fix');
      if (fx) { await fx.hover(); await pg.waitForTimeout(80);
        r.fixH = await pg.evaluate(() => { const e = document.querySelector('#err-drop .err-fix'); const cs = getComputedStyle(e); return { cr: __cr(__col(cs.color), __col(cs.backgroundColor)) }; }); }
      for (const k of ['dtx', 'mute', 'muteH', 'fixall', 'fixH']) if (!r[k] || !(r[k].cr >= 4.5)) fails.push(nm + ' ' + k + '=' + (r[k] ? r[k].cr : '缺'));
      if (!r.dtx.bgIsDanger || !(r.mute && r.mute.bgIsDanger) || (r.muteH && r.muteH.oldRed)) fails.push(nm + ' 底色口径 ' + JSON.stringify(r));
      out[nm] = r; await close(pg);
    }
    const css = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>'));
    const rules = css.match(/[^{}]+\{[^{}]*\}/g) || [];
    const whiteOnSem = rules.filter(x => /background(?:-color)?:\s*var\(--(?:danger|ok)\)/.test(x) && /(?:^|[;{\s])color:\s*#fff\b/.test(x)).map(x => x.trim().slice(0, 60));
    if (whiteOnSem.length) fails.push('源码仍有 --danger/--ok 实底白字：' + whiteOnSem.join(' | '));
    T(!fails.length, 'T1 告警 / 成功实底上的字 ≥4.5（页签关闭悬停、静音钮及其悬停、全部采纳、修复钮悬停；浅 / 深 / 系统深）', fails.length ? fails.join('；') : JSON.stringify(out).slice(0, 300));
  }

  /* ---------- T2 收藏心 / 变调芯片音名：不透明令牌 ---------- */
  {
    const out = {}; const fails = [];
    for (const [nm, scheme, theme] of STATES.slice(0, 2)) {
      const pg = await open(scheme, theme);
      await pg.evaluate(LOAD + `openCircle();`); await pg.waitForTimeout(300);
      const r = {};
      r.fav = await pg.evaluate(() => { const f = document.querySelector('#circle .cc-card .cc-fav:not(.on)'), t = f && f.closest('.cc-card').querySelector('.t'); if (!f) return null;
        return { op: __effOp(f), cr: __pair(f).cr, title: t ? __pair(t).cr : 0, color: getComputedStyle(f).color }; });
      if (r.fav) { await pg.hover('#circle .cc-card .cc-fav:not(.on)'); await pg.waitForTimeout(60);
        r.favH = await pg.evaluate(() => { const f = document.querySelector('#circle .cc-card .cc-fav:not(.on)'); return { op: __effOp(f), isMuted: getComputedStyle(f).color === (() => { const e = document.createElement('i'); e.style.color = 'var(--muted)'; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return c; })() }; }); }
      await pg.mouse.move(5, 5);
      await pg.evaluate(() => { document.getElementById('cc-back')?.click(); document.getElementById('k-val').click(); }); await pg.waitForTimeout(200);
      r.chip = await pg.evaluate(() => { const c = [...document.querySelectorAll('#ekey-pop .kp-chip:not(.on):not(.ez)')].find(x => x.querySelector('i')); if (!c) return null; const i = c.querySelector('i');
        return { op: __effOp(i), cr: __pair(i).cr, main: __pair(c).cr }; });
      const f = r.fav, h = r.favH, c = r.chip;
      if (!f || f.op !== 1 || !(f.cr >= 3) || !(f.cr < f.title)) fails.push(nm + ' 收藏心 ' + JSON.stringify(f));
      if (!h || h.op !== 1 || !h.isMuted) fails.push(nm + ' 收藏心悬停 ' + JSON.stringify(h));
      if (!c || c.op !== 1 || !(c.cr >= 4.5) || !(c.cr < c.main)) fails.push(nm + ' 夹位芯片音名 ' + JSON.stringify(c));
      out[nm] = r; await close(pg);
    }
    T(!fails.length, 'T2 收藏心（图形 ≥3、次于曲名、悬停转 --muted）/ 变调弹窗芯片音名（≥4.5、次于主字）：有效透明度＝1', fails.length ? fails.join('；') : JSON.stringify(out).slice(0, 360));
  }

  /* ---------- T3 全局半透明文字扫描 ---------- */
  {
    const W = { width: 1440, height: 900 }, M = { width: 390, height: 844 };
    const scenes = [
      ['编辑器+坞展开', W, LOAD + `document.getElementById('mx-expand')?.click();`],
      ['谱库', W, LOAD + `openCircle();`],
      ['变调弹窗', W, LOAD + `document.getElementById('k-val').click();`],
      ['和弦菜单+最近', W, `hideStartPad(); loadSong(PRESETS[10].make()); song.chordRecent=['C','G7','Am']; render(); sel.mi=0; sel.ci=0; sel.vi=0; render(); showVoxChordMenu(500,300);`],
      ['力度菜单', W, `hideStartPad(); loadSong(PRESETS[10].make()); render(); Object.assign(sel,{row:'vox',vi:0,mi:0,ci:0}); render(); col0=song.measures[0].voxes[0][0]; col0.dyn='mp'; render(); showDynMenu(500,300);`],
      ['叠加音', W, `hideStartPad(); loadSong(PRESETS[10].make()); render(); Object.assign(sel,{row:'vox',vi:0,mi:0,ci:0}); render(); showAddsMenu(0,0,0,500,300);`],
      ['智能填词·起点后移', W, `hideStartPad(); loadSong(PRESETS[10].make()); render(); Object.assign(sel,{row:'vox',vi:0,mi:2,ci:0}); render(); document.getElementById('b-fill').click();
        const r=document.querySelector('input[name=sf-start][value=cursor]'); if(r){ r.checked=true; r.dispatchEvent(new Event('change')); }`],
      ['和弦编辑·省略音', W, LOAD + `showChordEditor(0,0,0); document.querySelector('.chip.ce-tone')?.click();`],
      ['修复建议', W, `hideStartPad(); loadSong(PRESETS[10].make()); const m=song.measures[0]; m.voxes[0].push(JSON.parse(JSON.stringify(m.voxes[0][0]))); render(); syncInputs();`],
      ['手机观看页·变调', M, `hideStartPad(); toast=()=>{}; enterShareViewer({ song: PRESETS[0].make() }); setTimeout(()=>document.getElementById('vh-key')?.click(),50);`],
      ['页签条', W, LOAD + `addDoc(PRESETS[10].make()); render(); renderDocTabs();`],
    ];
    const fails = []; let n = 0;
    for (const [nm, vp, setup] of scenes) for (const [tn, scheme, theme] of STATES.slice(0, 2)) {
      const pg = await open(scheme, theme, vp);
      try { await pg.evaluate('var col0;' + setup); } catch (e) { fails.push(nm + ' 场景脚本：' + e.message); }
      await pg.waitForTimeout(400);
      const bad = await pg.evaluate(SCAN); n++;
      for (const x of bad) fails.push(nm + '·' + tn + ' ' + x);
      await close(pg);
    }
    T(!fails.length, 'T3 半透明文字全量扫描（' + n + ' 个状态 × 主题）：有效透明度 <1 的正文 / 标签字全部 ≥4.5（禁用态、纯符号装饰豁免）', fails.slice(0, 8).join('；') + (fails.length > 8 ? ' …共 ' + fails.length : ''));
  }

  /* ---------- T4 放大镜 mask ---------- */
  {
    const out = {}; let ok = true;
    for (const [nm, scheme, theme] of STATES.slice(0, 2)) {
      const pg = await open(scheme, theme);
      await pg.evaluate(LOAD + `openCircle();`); await pg.waitForTimeout(250);
      const r = await pg.evaluate(() => { const s = document.querySelector('#circle .cc-search'); const p = getComputedStyle(s, '::before'); const inp = s.querySelector('input');
        const mask = p.maskImage || p.webkitMaskImage || '';
        return { mask: /data:image\/svg\+xml/.test(mask), bgImg: p.backgroundImage, bg: p.backgroundColor, soft: (() => { const e = document.createElement('i'); e.style.color = 'var(--ed-icon-soft)'; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return c; })(),
          op: +p.opacity, w: p.width, h: p.height, left: p.left, cr: __cr(__col(p.backgroundColor), __bgOf(inp)) }; });
      if (!r.mask || r.bgImg !== 'none' || r.bg !== r.soft || r.op !== 1 || r.w !== '12px' || r.h !== '12px' || r.left !== '11px' || !(r.cr >= 3)) ok = false;
      out[nm] = r; await close(pg);
    }
    if (out['浅'].bg === out['深'].bg) ok = false;
    T(ok, 'T4 谱库放大镜：同一 SVG 作 mask、色＝--ed-icon-soft（浅深不同、对输入框 ≥3），12×12 / left 11px 不变', JSON.stringify(out).slice(0, 420));
  }

  /* ---------- T5 meta theme-color ---------- */
  {
    const fails = []; const out = {};
    const active = pg => pg.evaluate(() => { const m = [...document.querySelectorAll('meta[name="theme-color"]')].find(x => matchMedia(x.getAttribute('media') || 'all').matches); return m ? m.getAttribute('content').toLowerCase() : null; });
    const tog = async pg => { await pg.evaluate(() => document.getElementById('b-theme').click()); await pg.waitForTimeout(120); };
    /* 静态两条 media meta 保留（无 JS 兜底） */
    const st = (HTML.match(/<meta name="theme-color" content="(#[0-9a-f]{6})" media="\(prefers-color-scheme: (light|dark)\)">/gi) || []).length;
    if (st !== 2) fails.push('静态 meta 条数 ' + st);
    { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' }); const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
      await pg.goto(URL0); await pg.waitForTimeout(900);
      const keys0 = await pg.evaluate(() => Object.keys(localStorage));
      const a0 = await active(pg); await tog(pg); const a1 = await active(pg); await tog(pg); const a2 = await active(pg);
      const keys1 = await pg.evaluate(() => Object.keys(localStorage));
      const extra = keys1.filter(k => !keys0.includes(k) && k !== 'musetab-theme');
      out.desk = [a0, a1, a2]; if (a0 !== '#161433' || a1 !== '#1c1a3d' || a2 !== '#161433') fails.push('系统浅 编辑器切换 ' + out.desk.join('→'));
      if (extra.length) fails.push('新增 localStorage 键 ' + extra.join(','));
      await ctx.close(); }
    { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' }); const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
      await pg.goto(URL0); await pg.waitForTimeout(900);
      const a0 = await active(pg); await tog(pg); const a1 = await active(pg);
      out.sysDark = [a0, a1]; if (a0 !== '#1c1a3d' || a1 !== '#161433') fails.push('系统深 → 显式浅 ' + out.sysDark.join('→'));
      await ctx.close(); }
    for (const [scheme, want0, want1] of [['light', '#ffffff', '#1b1b28'], ['dark', '#1b1b28', '#ffffff']]) {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme }); const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
      await pg.goto(URL0); await pg.waitForTimeout(900);
      await pg.evaluate(() => { hideStartPad(); toast = () => {}; enterShareViewer({ song: PRESETS[10].make() }); }); await pg.waitForTimeout(200);
      const bar = await pg.evaluate(() => getComputedStyle(document.getElementById('viewerbar')).backgroundColor);
      const a0 = await active(pg); await tog(pg); const a1 = await active(pg);
      out['viewer-' + scheme] = [bar, a0, a1];
      const hex = s => '#' + s.match(/\d+/g).slice(0, 3).map(v => (+v).toString(16).padStart(2, '0')).join('');
      if (a0 !== want0 || a1 !== want1 || hex(bar) !== want0) fails.push('手机观看页（系统' + scheme + '）' + out['viewer-' + scheme].join('→'));
      /* 滚下去后（手机页首不吸顶，顶边已是谱面）再切明暗 / 系统配色：仍取页首栏色，不取谱面或 body 底 */
      await pg.evaluate(() => window.scrollTo(0, 400)); await pg.waitForTimeout(150);
      const scrolled = await pg.evaluate(() => scrollY);
      await tog(pg); const a2 = await active(pg);
      const other = scheme === 'light' ? 'dark' : 'light';
      await pg.evaluate(() => { delete document.documentElement.dataset.theme; }); await pg.emulateMedia({ colorScheme: other }); await pg.waitForTimeout(200);
      const a3 = await active(pg); const bar3 = await pg.evaluate(() => getComputedStyle(document.getElementById('viewerbar')).backgroundColor);
      out['viewer-' + scheme + '-scrolled'] = [scrolled, a2, a3, hex(bar3)];
      if (!(scrolled > 0) || a2 !== want0 || a3 !== hex(bar3) || a3 !== (other === 'dark' ? '#1b1b28' : '#ffffff')) fails.push('手机观看页滚动后（系统' + scheme + '）' + out['viewer-' + scheme + '-scrolled'].join('→'));
      await ctx.close();
    }
    T(!fails.length, 'T5 meta theme-color：应用内明暗切换跟随（＝主栏 --chrome，含系统深 + 显式浅）；手机观看页取页首 #viewerbar 实际底色；静态两条保留；不新增 localStorage 键', fails.length ? fails.join('；') : JSON.stringify(out));
  }

  /* ---------- T6 旧预设头像显示映射 ---------- */
  {
    const fails = []; const out = {};
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const k = 3, user = { id: 'u1', phone: '138****0000', nickname: '谱友', role: 'user', avatar: OLD_AV[k] };
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
    await pg.route(/https:\/\/(zhipu|www)\.puyouquan\.com\/.*/, route => {
      const u = new URL(route.request().url()), p = u.pathname;
      const J = o => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (p === '/api/me') return J({ user });
      if (p.startsWith('/api/')) return J({});
      if (u.hostname.startsWith('zhipu')) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
      return route.fulfill({ status: 404, body: '' });
    });
    await pg.goto('https://zhipu.puyouquan.com/'); await pg.waitForTimeout(1200);
    const r = await pg.evaluate(({ OLD, NEW }) => {
      window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
      enterPersonal('mine');
      const img = document.querySelector('#pcx-hero .pc-avatar img');
      const ls = JSON.parse(localStorage.getItem('musetab-acct') || 'null');
      const fn = typeof avShow === 'function';
      return { apiOn: API_ON, src: img ? img.getAttribute('src') : null, acct: ACCT && ACCT.avatar, ls: ls && ls.avatar,
        all: fn ? OLD.map((o, i) => avShow(o) === NEW[i]).every(Boolean) : false, newSame: fn ? NEW.every(n => avShow(n) === n) : false,
        other: fn ? ['data:image/png;base64,iVBORw0KGgo=', 'https://x.cn/a.png', ''].every(v => avShow(v) === v) : false };
    }, { OLD: OLD_AV, NEW: NEW_AV });
    await ctx.close();
    out.k = k; out.apiOn = r.apiOn; out.mapped = r.src === NEW_AV[k]; out.storeKept = r.acct === OLD_AV[k] && r.ls === OLD_AV[k];
    out.all = r.all; out.newSame = r.newSame; out.other = r.other;
    T(r.apiOn && out.mapped && out.storeKept && r.all && r.newSame && r.other,
      'T6 旧预设头像：个人中心页头显示同位新预设（＝pyq.js 现行 PRESETS），ACCT / localStorage 原值不改，8 枚全映射、新预设与上传图 / http 原样', JSON.stringify(out));
  }

  T(!errs.length, '无页面脚本错误', errs.slice(0, 3).join(' | '));
  console.log(`\nPASS ${pass}/${total}`); await b.close(); process.exit(pass === total ? 0 : 1);
})();
