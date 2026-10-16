/* 合稿外壳 → 注入真实编辑器实拍（只读，不改仓库任何文件）
   用法：NODE_PATH=$(npm root -g):<scratchpad>/nm/node_modules node inject.js
   ① 打开 file:///home/user/puyouquan/muse-tab/index.html，按场景载入真实预设；② 量现状几何、截图；
   ③ 用 Shadow DOM 注入合稿外壳（src/shell.css + src/shell.js，与原型同一份），旧 #top / #doc-tabs / #left-dock / #right-dock / #mixer-dock 只隐藏不删除；
      外壳模型由 src/model.js 从 song / sel / docs 只读取得；点击一律转发到现有函数 / 按钮（setVoxNotation、toggleVoxDual、switchDocTo、#b-ferm-v …）；
   ④ 再量几何、截图；交互实测写 shots/metrics.json。 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const F = __dirname, OUT = path.join(F, 'shots/');
const URL = 'file:///home/user/puyouquan/muse-tab/index.html';
const rd = p => fs.readFileSync(path.join(F, p), 'utf8');
const ASSETS = rd('icons/pq-final.js') + '\n' + rd('icons/pq-sign-smufl.js') + '\n' + rd('icons/pq-textsig.js') + '\n' + rd('src/clef.js') + '\n' + rd('src/brace.js') + '\n' + rd('src/shell.js') + '\n' + rd('src/model.js');
const CSS = rd('src/shell.css');

const SCEN = {
  gtr: "const P=n=>migrate(PRESETS.find(x=>x.name.indexOf(n)>=0).make()); addDoc(P('两只老虎')); closeDocAt(0); sel.row='tab'; sel.vi=0; sel.mi=0; sel.ci=0;",
  pacc: "const P=n=>migrate(PRESETS.find(x=>x.name.indexOf(n)>=0).make()); addDoc(P('送别')); closeDocAt(0); fillAccompaniment('slow', true); sel.row='vox'; sel.vi=0; sel.mi=0; sel.ci=0;",
  choir: "const P=n=>migrate(PRESETS.find(x=>x.name.indexOf(n)>=0).make()); addDoc(P('欢乐颂（四部合唱）')); closeDocAt(0); sel.row='vox'; sel.vi=0;",
  newpacc: "NWP.quickCreate('pacc'); closeDocAt(0);",
  tabs6: "const P=n=>migrate(PRESETS.find(x=>x.name.indexOf(n)>=0).make()); addDoc(P('两只老虎')); closeDocAt(0); addDoc(P('送别')); fillAccompaniment('slow', true); addDoc(P('欢乐颂（四部合唱）')); addDoc(P('欢乐颂（教学对照谱）')); addDoc(P('欢乐颂（钢琴独奏）')); addDoc(P('小步舞曲')); switchDocTo(1); sel.row='vox'; sel.vi=0;",
  tabs10: "const P=n=>migrate(PRESETS.find(x=>x.name.indexOf(n)>=0).make()); ['两只老虎','送别','欢乐颂（四部合唱）','欢乐颂（教学对照谱）','欢乐颂（钢琴独奏）','小步舞曲','指弹练习曲','卡农进行','流行进行','小星星（分解'].forEach((n,i)=>{ addDoc(P(n)); if(!i) closeDocAt(0); }); switchDocTo(9);",
};
const SAVE3 = "try{ [0,2,4].forEach(i=>{ if(i<docs.length){ switchDocTo(i); document.getElementById('b-savemine').click(); try{closeModal()}catch(_){} } }); }catch(e){}";

/* ---------------- 在页面里执行的注入代码 ---------------- */
function pageInject(css, opts) {
  const W = window, FX = W.FX;
  Object.assign(PQI, PQF);
  const hide = document.createElement('style'); hide.id = 'FX-hide';
  hide.textContent = '#top,#doc-tabs,#left-dock,#right-dock,#mixer-dock,#lb-wrap{display:none!important}'
    + 'body.shell:not(.stand):not(.viewer) #stage{margin-bottom:32px!important}'
    + '#FX-top{flex:none;height:84px;position:relative;z-index:30}#FX-left{flex:none;width:248px;align-self:stretch;position:relative;z-index:5}'
    + '#FX-right{flex:none;align-self:stretch;position:relative;z-index:15}#FX-dock{position:fixed;left:0;right:0;bottom:0;height:32px;z-index:40}'
    + 'body.shell #score-wrap{padding-left:8px!important;padding-right:8px!important}'
    + 'body.fx-engrave #preview-ov{top:84px!important;left:248px!important;bottom:32px!important;z-index:20!important;background:var(--bg)!important}body.fx-engrave #pv-bar{display:none!important}';
  document.head.appendChild(hide);
  const stage = document.getElementById('stage'), sw = document.getElementById('score-wrap');
  const host = (id, parent, before) => { const h = document.createElement('div'); h.id = id; parent.insertBefore(h, before || null); return h.attachShadow({ mode: 'open' }); };
  const R = W.FXR = { top: host('FX-top', document.body, stage), left: host('FX-left', stage, sw), right: host('FX-right', stage, null), dock: host('FX-dock', document.body, null) };
  const STY = '<style>' + css + ':host{display:block}#left,#right{height:100%}</style>';
  const S = W.FXS = Object.assign({ mode: 'write', dens: 'label', fold: {}, q: '', hover: null, menu: null, rightTab: 'prop', rightOpen: false, startHidden: false }, opts || {});
  let M = null;
  function refresh() {
    const m = M = fxModel(); const w = innerWidth;
    if (S.step != null) { m.step = S.step; m.kindKey = 'pianoacc'; }
    m.layoutIssues = S.layoutIssues || []; m.pages = S.pages || 2; m.pageThumbs = S.pageThumbs || [];
    m.players = S.players || [];
    R.top.innerHTML = STY + FX.r1(m, S, w) + FX.r2(m, S, w);
    R.left.innerHTML = STY + FX.left(m, S);
    const dock = FX.rightDock(w); document.getElementById('FX-right').style.width = (dock ? 264 : 40) + 'px';
    R.right.innerHTML = STY + FX.right(m, S, w);
    R.dock.innerHTML = STY + FX.status(m, S, w);
    W.FX_TABS = FX.fitTabs(R.top); W.FX_R2 = FX.fitR2(R.top); W.FX_TRK = FX.fitTrk(R.left);
    if (S.menu) { (m.docs || []).forEach((d, i) => d.hidden = W.FX_TABS.widths && W.FX_TABS.widths[i] === 0); { const tmp = document.createElement('div'); tmp.innerHTML = FX.menu(S.menu.name, m, S, S.menu.data || {}); R.top.appendChild(tmp.firstElementChild); } }
    if (S.menu) { const mn = R.top.querySelector('.mn'); const a = S.menu.anchor ? S.menu.anchor() : null; if (mn) { let x = 8, y = 88; if (a) { const r = a.getBoundingClientRect(); x = r.left; y = r.bottom + 4; if (S.menu.name === 'acct') x = r.right - mn.offsetWidth; } mn.style.left = Math.max(8, Math.min(innerWidth - mn.offsetWidth - 8, x)) + 'px'; mn.style.top = y + 'px'; } }
  }
  const real = id => { let el = document.getElementById(id) || document.querySelector('[data-tech2="' + id + '"]') || document.querySelector('[data-orn="' + id + '"]'); if (!el) { const m2 = /^data-([\w-]+)(?:=(.*))?$/.exec(id); if (m2) el = document.querySelector('[data-' + m2[1] + (m2[2] ? '="' + m2[2] + '"' : '') + ']'); } if (el) el.click(); return !!el; };
  const pickTrk = (k, i) => { sel.row = k; sel.vi = +i; try { selRange = null; } catch (_) {} clampSel(); };
  W.FX_ACT = function (a, d) {
    switch (a) {
      case 'trk': pickTrk(d.k, d.i); render(); break;
      case 'doc': switchDocTo(+d.i); break;
      case 'close': closeDocAt(+d.i); break;
      case 'nota': { pickTrk('vox', d.i); const vi = +d.i, nv = (song.voxNotations || [])[vi], st = !!nv && nv !== 'jianpu', dual = !!(song.voxDual || [])[vi];
        if (d.v === 'jp') { if (!st) { toast('至少保留一种记谱法'); break; } toggleVoxDual(); }
        else { if (!st) { setVoxNotation('staff'); toggleVoxDual(); } else if (dual) { toggleVoxDual(); setVoxNotation('jianpu'); } else toast('至少保留一种记谱法'); }
        render(); break; }
      case 'notaonly': { pickTrk('vox', d.i); const vi = +d.i, nv = (song.voxNotations || [])[vi], st = !!nv && nv !== 'jianpu', dual = !!(song.voxDual || [])[vi];
        if (d.v === 'jp') { if (dual) toggleVoxDual(); if (st) setVoxNotation('jianpu'); } else { if (!st) setVoxNotation('staff'); else if (dual) toggleVoxDual(); } render(); break; }
      case 'tabjp': pickTrk('tab', d.i); render(); real('nl-tabjp'); break;
      case 'tabstaff': real(song.tabStaff ? 'tn-tab' : 'tn-both'); break;
      case 'sign': { const s = FX.SIGNS[d.v]; if (s) for (const id of s[5]) if (id && real(id)) break; break; }
      case 'mode': S.mode = d.v; S.rightTab = { write: 'prop', engrave: 'lay', play: 'prac', output: 'pub' }[d.v]; W.FX_MODE && W.FX_MODE(d.v); break;
      case 'rtab': if (!FX.rightDock(innerWidth) && S.rightOpen && S.rightTab === d.v) S.rightOpen = false; else { S.rightTab = d.v; S.rightOpen = true; } break;
      case 'rclose': S.rightOpen = false; break;
      case 'dens': S.dens = S.dens === 'glyph' ? 'label' : 'glyph'; break;
      case 'fold': S.fold[d.v] = d.open === 'true'; break;
      case 'savemine': real('b-savemine'); try { closeModal(); } catch (_) {} break;
    }
    refresh();
  };
  Object.values(R).forEach(r => r.addEventListener('click', e => {
    const el = e.target.closest('[data-a]'); if (!el) return; e.stopPropagation();
    const d = Object.assign({}, el.dataset); if (d.a === 'fold') d.open = el.getAttribute('aria-expanded');
    W.FX_ACT(d.a, d);
  }));
  const r0 = W.render; W.render = function () { const out = r0.apply(this, arguments); try { refresh(); } catch (e) { console.error(e); } return out; };
  W.FX_refresh = refresh;
  render(); dispatchEvent(new Event('resize')); render();
}

/* ---------------- 几何测量（注入前后同一口径） ---------------- */
function measure(injected) {
  const R = s => { const e = typeof s === 'string' ? document.querySelector(s) : s; if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) }; };
  const sw = R('#score-wrap'), svg = R('#score');
  const top = injected ? R('#FX-top').h : ((R('#top') || { h: 0 }).h + ((R('#doc-tabs') || { h: 0 }).h));
  const dock = injected ? 32 : (R('#mixer-dock') || { h: 0 }).h;
  const lb = document.querySelector('#lb-wrap .lb-bar'); const lbr = lb && getComputedStyle(document.getElementById('lb-wrap')).display !== 'none' ? R(lb) : null;
  const visTop = sw.y + (lbr ? (lbr.b - sw.y) : 0);
  let leftR = 0, rightL = innerWidth;
  if (injected) { leftR = R('#FX-left').r; rightL = R('#FX-right').x; }
  else { const fl = document.getElementById('left-flyout'); const ld = R('#left-dock'); leftR = ld ? ld.r : 0;
    if (fl && !fl.classList.contains('hidden') && getComputedStyle(fl).display !== 'none') leftR = Math.max(leftR, R(fl).r); const rd = R('#right-dock'); if (rd && rd.w) rightL = rd.x; }
  const shadowBtns = [];
  if (injected) ['FX-top', 'FX-left', 'FX-right', 'FX-dock'].forEach(id => { const sr = document.getElementById(id).shadowRoot; sr.querySelectorAll('button,[role="button"]').forEach(b => { const r = b.getBoundingClientRect(); if (r.width && r.height && getComputedStyle(b).visibility !== 'hidden') shadowBtns.push([Math.round(r.width), Math.round(r.height), (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 12)]); }); });
  const small = shadowBtns.filter(x => Math.min(x[0], x[1]) < 22);
  return { viewport: [innerWidth, innerHeight], topChrome: top, bottomDock: dock, chromeTotal: top + dock, landbar: lbr ? lbr.h : 0,
    scoreVisibleH: Math.max(0, Math.min(innerHeight - dock, sw.y + sw.h) - visTop), paper: svg, paperVisibleW: svg ? Math.max(0, Math.min(svg.r, rightL) - Math.max(svg.x, leftR)) : 0,
    paperClear: svg ? (svg.x >= leftR - 1 && svg.r <= rightL + 1) : null, leftEdge: leftR, rightEdge: rightL,
    tabs: injected ? window.FX_TABS : null, r2hidden: injected ? window.FX_R2 : null, nButtons: shadowBtns.length, smallButtons: small.length, smallList: small.slice(0, 6) };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ONLY = process.env.ONLY || ''; const run = k => !ONLY || ONLY.split(',').includes(k);
  let metrics = {}; try { if (ONLY) metrics = JSON.parse(fs.readFileSync(OUT + 'metrics.json', 'utf8')); } catch (_) {} const errs = [];
  async function open(W, H, th, sc, before) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, colorScheme: th });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(sc + ':' + e));
    await pg.goto(URL); await pg.waitForTimeout(1100);
    await pg.evaluate(t => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} document.documentElement.dataset.theme = t; }, th);
    await pg.evaluate(code => { eval(code); render(); }, SCEN[sc] + (sc === 'tabs6' || sc === 'tabs10' ? SAVE3 + (sc === 'tabs6' ? 'switchDocTo(1);' : 'switchDocTo(9);') : ''));
    await pg.waitForTimeout(250);
    if (before) await pg.evaluate(() => { const b2 = document.querySelector('#rail-tracks .rtrk.on'); if (b2) b2.click(); render(); });
    await pg.waitForTimeout(200);
    await pg.evaluate(() => { try { toastHide(); } catch (_) {} const t = document.getElementById('toast'); if (t) t.style.display = 'none'; });
    return { ctx, pg };
  }
  const inject = async (pg, opts) => { await pg.addScriptTag({ content: ASSETS }); await pg.evaluate('(' + pageInject.toString() + ')(' + JSON.stringify(CSS) + ',' + JSON.stringify(opts || {}) + ')'); await pg.waitForTimeout(350);
    await pg.evaluate(() => { const t = document.getElementById('toast'); if (t) t.style.display = 'none'; }); };
  /* 1. 主状态：两档视口 × 浅深 × 4 场景，前后对照 */
  if (run('main')) for (const [W, H] of [[1280, 800], [1440, 900]]) for (const th of ['light', 'dark']) for (const sc of ['gtr', 'pacc', 'choir', 'tabs6', 'newpacc']) {
    const { ctx, pg } = await open(W, H, th, sc, true);
    const key = W + 'x' + H + '-' + th + '-' + sc;
    const before = await pg.evaluate(measure, false);
    await pg.screenshot({ path: OUT + key + '-before.png' });
    await inject(pg, sc === 'newpacc' ? { step: 0 } : {});
    const after = await pg.evaluate(measure, true);
    await pg.screenshot({ path: OUT + key + '-after.png' });
    metrics[key] = { before, after };
    await ctx.close();
  }
  /* 2. 交互实测（1280 浅，送别 + 伴奏）：点「右手伴奏」→ sel；点五线谱眼睛 → voxNotations / voxDual；点延长号 → col.ferm；切页签 */
  if (run('inter')) { const { ctx, pg } = await open(1280, 800, 'light', 'pacc'); await inject(pg);
    const st = () => pg.evaluate(() => ({ row: sel.row, vi: sel.vi, nota: (song.voxNotations || [])[0] || 'jianpu', dual: !!(song.voxDual || [])[0], paths: document.querySelectorAll('#score path').length, ferm: !!(((song.measures[sel.mi].voxes || [])[sel.vi] || [])[sel.ci] || {}).ferm, pal: !!document.getElementById('FX-left').shadowRoot.querySelector('[data-v="ped"]') }));
    const I = {}; I.start = await st();
    await pg.evaluate(() => document.getElementById('FX-left').shadowRoot.querySelector('.tr[data-k="vox"][data-i="1"]').click()); await pg.waitForTimeout(300);
    I.clickRH = await st(); await pg.screenshot({ path: OUT + 'i1-1280-light-pacc-click-rh.png' });
    await pg.evaluate(() => document.getElementById('FX-left').shadowRoot.querySelector('.tr[data-k="vox"][data-i="0"]').click()); await pg.waitForTimeout(250);
    await pg.evaluate(() => document.getElementById('FX-left').shadowRoot.querySelector('.eye[data-a="nota"][data-v="st"]').click()); await pg.waitForTimeout(400);
    await pg.evaluate(() => { const t = document.getElementById('toast'); if (t) t.style.display = 'none'; });
    I.staffOn = await st(); await pg.screenshot({ path: OUT + 'i2-1280-light-pacc-melody-staff-dual.png' });
    await pg.evaluate(() => document.getElementById('FX-left').shadowRoot.querySelector('.eye[data-a="nota"][data-v="jp"]').click()); await pg.waitForTimeout(400);
    I.jpOff = await st();
    await pg.evaluate(() => document.getElementById('FX-left').shadowRoot.querySelector('.eye[data-a="nota"][data-v="jp"]').click()); await pg.waitForTimeout(200);
    await pg.evaluate(() => document.getElementById('FX-left').shadowRoot.querySelector('.eye[data-a="nota"][data-v="st"]').click()); await pg.waitForTimeout(400);
    I.back = await st();
    await pg.evaluate(() => document.getElementById('FX-left').shadowRoot.querySelector('.gt[data-v="fermata"]').click()); await pg.waitForTimeout(300);
    I.fermata = await st(); await pg.evaluate(() => { const t = document.getElementById('toast'); if (t) t.style.display = 'none'; });
    await pg.screenshot({ path: OUT + 'i3-1280-light-pacc-fermata.png' });
    metrics.interaction = I; await ctx.close(); }
  /* 3. 10 个窗口（1280 / 1440）：当前页签可见、其余收进「窗口 N」 */
  if (run('tabs')) for (const [W, H] of [[1280, 800], [1440, 900]]) { const { ctx, pg } = await open(W, H, 'light', 'tabs10'); const before = await pg.evaluate(() => { const t = document.querySelector('.dtab.on, #doc-tabs .on'); const r = t && t.getBoundingClientRect(); return { curX: r ? Math.round(r.x) : null, visible: r ? (r.x >= 0 && r.right <= innerWidth) : false }; });
    await pg.screenshot({ path: OUT + W + 'x' + H + '-light-tabs10-before.png' }); await inject(pg);
    const after = await pg.evaluate(measure, true); await pg.screenshot({ path: OUT + W + 'x' + H + '-light-tabs10-after.png' });
    await pg.evaluate(() => { window.FXS.menu = { name: 'ovf', anchor: () => document.getElementById('FX-top').shadowRoot.getElementById('tab-ovf') }; window.FX_refresh(); }); await pg.waitForTimeout(200);
    await pg.screenshot({ path: OUT + W + 'x' + H + '-light-tabs10-ovf.png' });
    metrics['tabs10-' + W] = { before, after: after.tabs }; await ctx.close(); }
  /* 4. 菜单与模式（1280 / 1440 浅 + 深） */
  const MENUS = [['file', 'gtr', '[data-m="file"]'], ['acct', 'pacc', '[data-m="acct"]'], ['add', 'gtr', '[data-m="add"]'], ['tmore', 'pacc', '[data-m="tmore"]'], ['more', 'pacc', '[data-m="more"]']];
  if (run('menus')) for (const [W, H] of [[1280, 800], [1440, 900]]) for (const th of ['light', 'dark']) for (const [mn, sc, q] of MENUS) {
    if (th === 'dark' && !['file', 'add'].includes(mn)) continue;
    const { ctx, pg } = await open(W, H, th, sc); await inject(pg);
    await pg.evaluate(([mn, q]) => { const root = document.getElementById(mn === 'tmore' || mn === 'add' ? 'FX-left' : 'FX-top').shadowRoot; const a = root.querySelector(q); const t = a && a.dataset; window.FXS.menu = { name: mn, data: t ? { k: t.k, i: t.i } : {}, anchor: () => document.getElementById(mn === 'tmore' || mn === 'add' ? 'FX-left' : 'FX-top').shadowRoot.querySelector(q) }; window.FX_refresh(); }, [mn, q]);
    await pg.waitForTimeout(200); await pg.screenshot({ path: OUT + W + 'x' + H + '-' + th + '-menu-' + mn + '.png' }); await ctx.close();
  }
  /* 排版 / 输出模式：主视图＝引擎真实分页（pvOpen 的 #pv-pages 嵌进工作区，原「打印预览」浮层的工具条搬到工具带） */
  if (run('modes')) for (const [W, H] of [[1280, 800], [1440, 900]]) for (const th of ['light', 'dark']) for (const md of ['engrave', 'output', 'play']) {
    if (th === 'dark' && md === 'play') continue;
    const { ctx, pg } = await open(W, H, th, 'pacc'); await inject(pg);
    const lay = await pg.evaluate(() => { const sys = layoutSystems(); return { pages: PV_GEO.n, perLine: sys.map(s => s.measures.length) }; });
    await pg.evaluate(([md, lay]) => {
      const L = lay; const issues = [['共 ' + L.pages + ' 页 · ' + L.perLine.length + ' 行', '全谱', 0], ['每行小节 ' + L.perLine.join(' · '), '均匀', 0], ['末行 ' + L.perLine[L.perLine.length - 1] + ' 小节', '行 ' + L.perLine.length, 0], ['第 ' + L.perLine.slice(0, 3).reduce((a, b) => a + b, 0) + ' 小节后翻页', '第 1 → 2 页', 1]];
      Object.assign(window.FXS, { mode: md, rightTab: { engrave: 'lay', output: 'pub', play: 'prac' }[md], layoutIssues: issues, pages: L.pages, players: [['人声 · 旋律', '旋律 + 歌词 + 和弦'], ['钢琴', '大谱表（右手 + 左手）算 1 份']] });
      if (md !== 'play') { document.body.classList.add('fx-engrave'); pvOpen(); const ov = document.getElementById('preview-ov'); ov.style.right = (innerWidth - document.getElementById('FX-right').getBoundingClientRect().x) + 'px';
        const pgs = [...document.querySelectorAll('#pv-pages .pv-page svg')]; window.FXS.pageThumbs = pgs.slice(0, 4).map(s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(s))); }
      window.FX_refresh();
    }, [md, lay]);
    await pg.waitForTimeout(500); await pg.evaluate(() => { const t = document.getElementById('toast'); if (t) t.style.display = 'none'; });
    const after = await pg.evaluate(measure, true);
    await pg.screenshot({ path: OUT + W + 'x' + H + '-' + th + '-mode-' + md + '.png' }); metrics['mode-' + md + '-' + W + '-' + th] = { lay, pv: await pg.evaluate(() => (document.getElementById('pv-info') || {}).textContent || ''), top: after.topChrome };
    await ctx.close();
  }
  /* 右栏竖条点开（1280）、只看字形档、记号搜索 */
  if (run('right')) { const { ctx, pg } = await open(1280, 800, 'light', 'pacc'); await inject(pg, { rightOpen: true, rightTab: 'smart' });
    await pg.screenshot({ path: OUT + '1280x800-light-right-open.png' });
    const ov = await pg.evaluate(() => { const rp = document.getElementById('FX-right').shadowRoot.querySelector('.rp'); const r = rp.getBoundingClientRect(); const p = document.getElementById('score').getBoundingClientRect(); return { rpX: Math.round(r.x), paperR: Math.round(p.right), covers: Math.max(0, Math.round(p.right - r.x)) }; });
    metrics.rightOverlay1280 = ov;
    await pg.evaluate(() => { Object.assign(window.FXS, { rightOpen: false, dens: 'glyph' }); window.FX_refresh(); }); await pg.screenshot({ path: OUT + '1280x800-light-pacc-dense.png' });
    await pg.evaluate(() => { Object.assign(window.FXS, { dens: 'label', q: 'yc' }); window.FX_refresh(); }); await pg.screenshot({ path: OUT + '1280x800-light-pacc-search-yc.png' });
    await ctx.close(); }
  /* 音轨多时：8 轨 / 12 轨，音轨区 ≤48% 左栏高、记号区仍露出「最近使用」+ 2 组 */
  if (run('tracks')) for (const n of [8, 12]) { const { ctx, pg } = await open(1280, 800, 'light', 'choir'); await pg.evaluate(n => { while (song.voxVoices.length < Math.min(8, n)) addVoice('vox'); while (song.voxVoices.length + song.tabVoices.length < n) addVoice('tab'); sel.row = 'vox'; sel.vi = 0; render(); }, n); await inject(pg);
    const g = await pg.evaluate(() => { const r = document.getElementById('FX-left').shadowRoot; const pal = r.querySelector('.pscroll').getBoundingClientRect(); const hs = [...r.querySelectorAll('.pscroll .pgh')].filter(h => h.getBoundingClientRect().top < pal.bottom - 10).length; return Object.assign({}, window.FX_TRK, { tracks: song.voxVoices.length + song.tabVoices.length, groupHeadsVisible: hs, hint: (r.querySelector('.more-hint') || {}).textContent || '' }); });
    metrics['tracks' + n] = g; await pg.screenshot({ path: OUT + '1280x800-light-tracks' + n + '.png' }); await ctx.close(); }
  /* 手机 390：现状与「只读看谱口径」外壳（同一套信息架构：窗口抽屉 / 音轨抽屉 / 记号抽屉） */
  if (run('mobile')) { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'light' });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push('mob:' + e)); await pg.goto(URL); await pg.waitForTimeout(1200);
    await pg.evaluate(code => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} eval(code); render(); }, SCEN.tabs6 + SAVE3 + 'switchDocTo(1);'); await pg.waitForTimeout(400);
    await pg.evaluate(() => { const t = document.getElementById('toast'); if (t) t.style.display = 'none'; });
    await pg.screenshot({ path: OUT + '390x844-light-before.png' });
    const mb = await pg.evaluate(() => { const els = [...document.querySelectorAll('body *')].filter(e => { const cs = getComputedStyle(e); if (cs.position !== 'fixed' && cs.position !== 'sticky') return false; const r = e.getBoundingClientRect(); return r.height > 20 && r.width > 200 && (r.bottom >= innerHeight - 2 || r.top <= 2); }); return els.map(e => (e.id || e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height)); });
    metrics.mobileFixedBefore = mb;
    /* 注入手机外壳：顶栏 48（窗口抽屉入口）+ 底条 64（播放 · 当前轨 ▾ · 记号 · 输出），谱面仍是真实编辑器 */
    await pg.addScriptTag({ content: ASSETS });
    await pg.evaluate(css => {
      Object.assign(PQI, PQF);
      const st = document.createElement('style'); st.textContent = '#top,#mixer-dock,#left-dock,#doc-tabs,#right-dock,#editbar,#editbar2,#lb-wrap{display:none!important}body{padding-top:48px!important;padding-bottom:64px!important}#FX-mob{position:fixed;inset:0;z-index:60;pointer-events:none}';
      document.head.appendChild(st);
      const h = document.createElement('div'); h.id = 'FX-mob'; document.body.appendChild(h); const r = h.attachShadow({ mode: 'open' });
      window.FXM = { S: { sheet: null } };
      window.FXM.draw = () => { const m = fxModel(); r.innerHTML = '<style>' + css + '.mob{height:100vh;background:transparent!important}.m-main{visibility:hidden}.m-top,.m-bar,.m-sheet,.m-veil{pointer-events:auto}</style><div class="fx mob">' + FX.mobile(m, window.FXM.S) + '</div>'; };
      window.FXM.draw();
    }, CSS);
    await pg.waitForTimeout(300); await pg.screenshot({ path: OUT + '390x844-light-after.png' });
    for (const sh of ['win', 'trk', 'pal']) { await pg.evaluate(s => { window.FXM.S.sheet = s; window.FXM.draw(); }, sh); await pg.waitForTimeout(200); await pg.screenshot({ path: OUT + '390x844-light-after-sheet-' + sh + '.png' }); }
    await pg.evaluate(() => { document.documentElement.dataset.theme = 'dark'; window.FXM.S.sheet = null; window.FXM.draw(); }); await pg.waitForTimeout(250);
    await pg.screenshot({ path: OUT + '390x844-dark-after.png' });
    await pg.evaluate(() => { window.FXM.S.sheet = 'win'; window.FXM.draw(); }); await pg.waitForTimeout(200); await pg.screenshot({ path: OUT + '390x844-dark-after-sheet-win.png' });
    const hit = await pg.evaluate(() => { const r = document.getElementById('FX-mob').shadowRoot; return [...r.querySelectorAll('button')].map(b => { const q = b.getBoundingClientRect(); return Math.round(Math.min(q.width, q.height)); }).filter(v => v > 0); });
    metrics.mobileMinHit = Math.min(...hit); metrics.mobileHitList = hit.slice(0, 20);
    await ctx.close(); }
  fs.writeFileSync(OUT + 'metrics.json', JSON.stringify(metrics, null, 1));
  console.log('errors', errs.slice(0, 8));
  for (const k of Object.keys(metrics)) { const v = metrics[k]; if (v && v.before && v.after && v.after.topChrome) console.log(k, '| before top', v.before.topChrome, 'dock', v.before.bottomDock, 'vis', v.before.scoreVisibleH, 'paperVisW', v.before.paperVisibleW, 'of', v.before.paper && v.before.paper.w, 'lb', v.before.landbar, '| after top', v.after.topChrome, 'vis', v.after.scoreVisibleH, 'paper', v.after.paper && v.after.paper.w, 'visW', v.after.paperVisibleW, 'clear', v.after.paperClear, 'tabs', JSON.stringify(v.after.tabs && [v.after.tabs.visible, v.after.tabs.hidden]), 'r2hid', JSON.stringify(v.after.r2hidden), 'small', v.after.smallButtons); }
  console.log('interaction', JSON.stringify(metrics.interaction));
  console.log('tabs10', JSON.stringify(metrics['tabs10-1280']), JSON.stringify(metrics['tabs10-1440']));
  console.log('right', JSON.stringify(metrics.rightOverlay1280), 'mob', JSON.stringify(metrics.mobileFixedBefore));
  await b.close();
})();
