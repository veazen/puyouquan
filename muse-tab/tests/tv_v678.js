/* v67.8 外壳小改（默认外壳；方案 docs/design-2026-10f「落地版本计划」v67.8 一行），全部真实点击：
   V1 偏好设置入口：顶栏 ◑ ◐ 旁的设置钮（title / aria-label「偏好设置」，桌面命中区 ≥28）点开弹窗，键位档 / 落音自动前进 / 播放演奏感 / 触屏浮条
      4 个开关各带一句说明、初值＝原读取函数（gpKeysOn · autoAdvOn · humOn · quickbarOn）；点一下即写原本机键（musetab-keymap＝'gp' /
      musetab-autoadv · humanize · quickbar＝'off'），只动这 4 个键、不新增键；刷新后保持且行为生效（落音不再自动前进）；键盘空格可切；
      再点回去＝删除键（与原「恢复默认」写法一致）；手机 390 宽设置钮隐藏、从 ☰「显示 · 偏好设置」进同一弹窗
   V2 窗口页签：关闭 × 命中区 28×28（视觉 12px 图形居中，中心 ±13px 九点都命中 ×），页签高度不变（32）；状态只标「仅存本机（未入库）」
      ——7px 空心圈、颜色＝页签字色（currentColor，不是写死的橙 #e8a13a / 绿 #2eaf64），已入库不标、悬停提示「已存入我的曲谱，编辑实时同步」；
      浅 / 深 / 系统深三态，当前与非当前（含悬停）圈对页签底非文字对比 ≥3:1
   V3「智能」死按钮：1440 / 1201 宽隐藏（右栏本来就停靠）；1200 / 1100 宽可见，点开右栏抽屉、点遮罩收起（v67.5 行为不变）
   V4「预设」改名「示例曲谱」：顶栏按钮文字与 title、曲谱库弹窗标题与页签、卡片读屏名、打开提示、手机 ☰、启动台卡片、帮助弹窗统一；
      顶栏不再出现「预设」；官网 help.html 指代该按钮的说法同步；措辞闸（check-wording，含新增的「预设」按钮规则）通过
   V5 关闭提示：关已入库的窗口只说「已关闭《曲名》」（不再说存入），关未入库有内容的照旧自动转存并提示，空白未入库只说已关闭；
      关当前已入库窗口前把 350ms 去抖里的最后一笔同步进「我的曲谱」（此前关窗即丢）
   收尾验收修复（逐条修前红修后绿）：
   V5c F1 / S-2 只写了和弦 / 歌词、还没有音符的未入库窗口（弹唱谱 TAB 和弦、纯和弦谱 deg:0 + chord、只有歌词）关窗转存，不再当空白丢弃；
   V5d 守门：14 种谱组合的空白新建谱关窗仍不进库；
   V5e F2 / S-1 已入库窗口按键后 350ms 内切走再关：最后一笔进库、刷新仍在；V5f 同类路径（按键后立刻 addDoc 另开 / loadSong 换谱）；
   V5g F3 弹窗 / 个人中心删掉正开着的这首：页签当场出空心圈、入库 id 清掉；
   V2c F6 非当前未入库页签提示「切到这个窗口后点顶栏「保存」」；V2d F8 键盘关窗后焦点落到相邻 × /「＋」；
   V1g F4 偏好设置弹窗可访问名、Tab 圈定、关窗焦点还给设置钮（手机还给 ☰）；V3b F7 抽屉开着拉宽过 1200 收起、缩回不自弹；
   V4c F5 示例曲谱署名「谱友圈」（不再印「谱友圈预设」）；V4d S-3 官网自动前进关法指向「偏好设置」+ 措辞闸两条新规则。
   突变实证：MUSETAB_URL=file://…/v67.7 原版（git show HEAD:muse-tab/index.html）复跑 → V1–V5 全红，只剩「无页面脚本错误」绿；
   对收尾修复前副本复跑 → 上面 9 条新断言（V5c V5e V5f V5g V2c V2d V1g V3b V4c）红，V5d（守门）与 V4d（读仓库里的官网文件）照绿。file:// 直载。 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
/* v68.2 切默认（PLAN §5.4 P 组）：本套件测的是 v67.8 起的旧外壳顶栏小改（兜底外壳，?shell=classic）。被测源码文件路径仍取不带参数的 URLF */
const URLF = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const URL0 = URLF + (URLF.includes('?') ? '&' : '?') + 'shell=classic';
const ROOT = path.resolve(__dirname, '../..');
const KEYS = ['musetab-keymap', 'musetab-autoadv', 'musetab-humanize', 'musetab-quickbar'];
const COLORLIB = `window.__col = (s) => { s = String(s || '').trim(); let m = s.match(/^rgba?\\(([^)]+)\\)/);
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    m = s.match(/^color\\(srgb ([\\d.e-]+) ([\\d.e-]+) ([\\d.e-]+)(?: \\/ ([\\d.e-]+))?\\)/);
    if (m) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] == null ? 1 : +m[4]]; return null; };
  window.__over = (f, b) => f[3] >= 1 ? f.slice(0, 3) : f.slice(0, 3).map((c, i) => c * f[3] + b[i] * (1 - f[3]));
  window.__L = c => { const s = c.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * s[0] + .7152 * s[1] + .0722 * s[2]; };
  window.__cr = (fg, bg) => { const B = bg.slice(0, 3), F = __over(fg, B); const a = __L(F), b = __L(B); return Math.round((Math.max(a, b) + .05) / (Math.min(a, b) + .05) * 100) / 100; };
  window.__bgOf = el => { const st = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = __col(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) { st.push(c); if (c[3] >= 1) break; } }
    let b = [255, 255, 255]; for (let i = st.length - 1; i >= 0; i--) b = __over(st[i], b); return b.concat(1); };`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errs = [];
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const J = x => JSON.stringify(x);
  const HOOK = (theme) => { window.guardReplace = p => p(); if (theme) document.documentElement.dataset.theme = theme;
    window.__toasts = []; const ot = toast; toast = m => { __toasts.push(String(m)); try { ot(m); } catch (_) {} }; };
  const open = async (w, h, o = {}) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: o.scheme || 'light' });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    await pg.goto(URL0); await pg.waitForTimeout(1000);
    await pg.evaluate(HOOK, o.theme || null);
    await pg.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
    await pg.evaluate(COLORLIB);
    pg.__ctx = ctx; return pg;
  };
  const close = pg => pg.__ctx.close();
  const SONG = `(()=>{ hideStartPad(); loadSong(createSong('vocal',{title:'偏好',key:'C',beats:4,unit:4,nMea:2,nTab:0,nVox:1,lyr:0}));
    sel={mi:0,row:'vox',vi:0,ci:0,si:1}; lastEnt=null; render(); if(document.activeElement&&document.activeElement.blur) document.activeElement.blur(); return 1; })()`;
  const READ = `(()=>{ const f=n=>{ try{ return !!window[n](); }catch(e){ return 'ERR'; } };
    return { gp:f('gpKeysOn'), adv:f('autoAdvOn'), hum:f('humOn'), qb:f('quickbarOn'), ls:${J(KEYS)}.map(k=>localStorage.getItem(k)) }; })()`;
  /* v68.2：偏好设置多了「使用旧版布局」（PREF_ITEMS oldshell，切默认后的兜底开关，新旧外壳都列出）——V1 只核原 4 个本机偏好，这一行不计；它本身由 tv_flowdef F1 覆盖 */
  const ROWS = `[...document.querySelectorAll('#modal-mask .prf-row:not([data-prf="oldshell"])')].map(r=>({k:r.dataset.prf, role:r.getAttribute('role'), on:r.getAttribute('aria-checked'),
    t:(r.querySelector('b')||{}).textContent||'', d:(r.querySelector('small')||{}).textContent||'', st:(r.querySelector('.prf-st')||{}).textContent||'',
    h:Math.round(r.getBoundingClientRect().height)}))`;
  const lsAll = `(()=>{ const o={}; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(/^musetab-/.test(k) && !/^musetab-(song-v1|docs-v1)$/.test(k)) o[k]=localStorage.getItem(k); } return o; })()`;

  /* ================= V1 偏好设置入口 ================= */
  try {
    const pg = await open(1440, 900);
    await pg.evaluate(k => k.forEach(x => localStorage.removeItem(x)), KEYS);
    await pg.reload(); await pg.waitForTimeout(1000); await pg.evaluate(HOOK, null); await pg.evaluate(SONG);
    const g = await pg.evaluate(() => { const q = id => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect();
        return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height), vis: !!e.offsetParent, title: e.title, al: e.getAttribute('aria-label'),
          ic: (e.querySelector('svg.pqi') || { dataset: {} }).dataset.pq || '' }; };
      return { p: q('b-prefs'), th: q('b-theme'), mem: q('b-member') }; });
    T(!!(g.p && g.p.vis && g.p.title === '偏好设置' && g.p.al === '偏好设置' && g.p.w >= 28 && g.p.h >= 28 && g.p.l >= g.th.r && g.p.r <= g.mem.l && g.p.ic === 'act-settings'),
      'V1a 顶栏 ◐ 右侧有「偏好设置」设置钮（title / aria-label，命中区 ≥28×28，pqIcon act-settings，与方案账号菜单同一枚）', J(g));

    const before = await pg.evaluate(READ), lsB = await pg.evaluate(lsAll);
    await pg.click('#b-prefs', { timeout: 2500 }).catch(() => {}); await pg.waitForTimeout(150);
    const rows0 = await pg.evaluate(ROWS);
    const want0 = { keymap: String(before.gp), autoadv: String(before.adv), humanize: String(before.hum), quickbar: String(before.qb) };
    T(rows0.length === 4 && rows0.map(r => r.k).join() === 'keymap,autoadv,humanize,quickbar' && rows0.every(r => r.role === 'switch' && r.on === want0[r.k] && r.d.length >= 20 && r.t)
      && before.gp === false && before.adv === true && before.hum === true && before.qb === true,
      'V1b 点设置钮出弹窗：4 个开关（键位档 / 落音自动前进 / 播放演奏感 / 触屏浮条）各带一句说明，初值＝原读取函数（默认档 / 开 / 自然 / 开）', J({ before, rows0 }));

    for (const k of ['keymap', 'autoadv', 'humanize', 'quickbar']) { await pg.click(`#modal-mask .prf-row[data-prf="${k}"]`, { timeout: 2500 }).catch(() => {}); await pg.waitForTimeout(60); }
    const after = await pg.evaluate(READ), rows1 = await pg.evaluate(ROWS), lsA = await pg.evaluate(lsAll);
    const changed = [...new Set([...Object.keys(lsB), ...Object.keys(lsA)])].filter(k => lsB[k] !== lsA[k]).sort();
    T(after.ls.join() === 'gp,off,off,off' && after.gp === true && after.adv === false && after.hum === false && after.qb === false
      && rows1.map(r => r.on).join() === 'true,false,false,false' && rows1.map(r => r.st).join() === 'GP 档,关,精确,关'
      && changed.join() === [...KEYS].sort().join(),
      'V1c 逐个点开关即时生效：写原本机键与原取值（keymap＝gp，其余＝off），读取函数立即翻转，开关与状态字同步；只动这 4 个键、不新增键', J({ after, rows1: rows1.map(r => r.on + r.st), changed }));

    await pg.click('#prf-ok', { timeout: 2500 }).catch(() => {}); await pg.waitForTimeout(80);
    const closed = await pg.evaluate(() => !document.getElementById('modal-mask'));
    await pg.reload(); await pg.waitForTimeout(1000); await pg.evaluate(HOOK, null); await pg.evaluate(SONG);
    const rel = await pg.evaluate(READ);
    await pg.keyboard.press('5'); await pg.waitForTimeout(60);
    const eff = await pg.evaluate(() => ({ ci: sel.ci, deg: song.measures[0].voxes[0][0].deg }));
    await pg.click('#b-prefs', { timeout: 2500 }).catch(() => {}); await pg.waitForTimeout(150);
    const rows2 = await pg.evaluate(ROWS);
    T(closed && rel.ls.join() === 'gp,off,off,off' && rel.gp === true && rel.adv === false && rel.hum === false && rel.qb === false
      && rows2.map(r => r.on).join() === 'true,false,false,false' && eff.deg === 5 && eff.ci === 0,
      'V1d 「完成」关窗；刷新后偏好保持（弹窗如实显示），且真的生效：落音自动前进关掉后按 5 落音、光标停在原位', J({ closed, rel, eff, rows2: rows2.map(r => r.on) }));

    /* 键盘：打开时焦点落在第一个开关，空格切换；其余点回默认 */
    const foc = await pg.evaluate(() => (document.activeElement && document.activeElement.dataset.prf) || '');
    await pg.keyboard.press('Space'); await pg.waitForTimeout(60);
    const kb = await pg.evaluate(() => ({ ls: localStorage.getItem('musetab-keymap'), on: (document.querySelector('.prf-row[data-prf="keymap"]') || {}).getAttribute?.('aria-checked'), gp: gpKeysOn() }));
    for (const k of ['autoadv', 'humanize', 'quickbar']) { await pg.click(`#modal-mask .prf-row[data-prf="${k}"]`, { timeout: 2500 }).catch(() => {}); await pg.waitForTimeout(60); }
    const back = await pg.evaluate(READ);
    T(foc === 'keymap' && kb.ls === null && kb.on === 'false' && kb.gp === false && back.ls.every(v => v === null) && back.adv && back.hum && back.qb && !back.gp,
      'V1e 键盘可用（焦点在第一个开关、空格切换）；点回默认＝删除键（与原「恢复默认」写法一致），4 个键全部回到未设置', J({ foc, kb, back }));
    await close(pg);

    /* 手机 390：设置钮隐藏，从 ☰「显示 · 偏好设置」进同一弹窗 */
    const pm = await open(390, 844);
    await pm.evaluate(SONG);
    const mv = await pm.evaluate(() => { const e = document.getElementById('b-prefs'); return { has: !!e, vis: !!(e && e.offsetParent), sw: document.documentElement.scrollWidth }; });
    await pm.click('#b-mmenu', { timeout: 2500 }).catch(() => {}); await pm.waitForTimeout(150);
    const mi = await pm.evaluate(() => { const x = document.querySelector('#modal-mask [data-mm="b-prefs"]'); return x ? x.textContent : ''; });
    await pm.click('#modal-mask [data-mm="b-prefs"]', { timeout: 2500 }).catch(() => {}); await pm.waitForTimeout(150);
    const mrows = await pm.evaluate(ROWS);
    await pm.click('#modal-mask .prf-row[data-prf="quickbar"]', { timeout: 2500 }).catch(() => {}); await pm.waitForTimeout(60);
    const mq = await pm.evaluate(() => ({ ls: localStorage.getItem('musetab-quickbar'), on: quickbarOn() }));
    await pm.evaluate(() => localStorage.removeItem('musetab-quickbar'));
    T(mv.has && !mv.vis && mv.sw <= 390 && mi === '偏好设置' && mrows.length === 4 && mrows.every(r => r.h >= 44) && mq.ls === 'off' && mq.on === false,
      'V1f 手机 390：顶栏设置钮隐藏（不挤顶栏、无横向溢出），☰「显示」里有「偏好设置」→ 同一弹窗，开关行高 ≥44，点了照样写本机键', J({ mv, mi, n: mrows.length, h: mrows.map(r => r.h), mq }));
    await close(pm);
  } catch (e) { T(false, 'V1 执行异常', e.message.split('\n')[0]); }

  /* ================= V2 窗口页签：× 命中区 · 未入库空心圈 ================= */
  const SETUP_TABS = `(()=>{ hideStartPad(); localStorage.setItem('musetab-library-v1','[]');
    const a=createSong('vocal',{title:'本机谱',key:'C',beats:4,unit:4,nMea:2,nTab:0,nVox:1,lyr:0}); a.measures[0].voxes[0][0].deg=3; loadSong(a);
    docs=[{song, sel:null}]; curDocI=0;
    const s=createSong('vocal',{title:'已入库谱',key:'G',beats:4,unit:4,nMea:2,nTab:0,nVox:1,lyr:0}); s.measures[0].voxes[0][0].deg=5; addDoc(s,()=>{}); saveToLibrary();
    const c=createSong('vocal',{title:'空白谱',key:'D',beats:4,unit:4,nMea:2,nTab:0,nVox:1,lyr:0}); addDoc(c,()=>{});
    switchDocTo(1); render(); renderDocTabs(); return docs.length; })()`;
  try {
    const fails = [], out = {};
    for (const [nm, scheme, theme] of [['浅', 'light', null], ['深', 'dark', 'dark'], ['系统深', 'dark', null]]) {
      const pg = await open(1440, 900, { scheme, theme });
      await pg.evaluate(SETUP_TABS); await pg.waitForTimeout(150);
      await pg.mouse.move(700, 600);
      const r = await pg.evaluate(() => { const tabs = [...document.querySelectorAll('#doc-tabs .dtab')];
        return { bar: Math.round(document.getElementById('doc-tabs').getBoundingClientRect().height), tabs: tabs.map(t => { const d = t.querySelector('.dt-dot'), cs = getComputedStyle(t);
          const o = { name: t.querySelector('.dt-t').textContent, on: t.classList.contains('on'), h: Math.round(t.getBoundingClientRect().height), title: t.title, dot: !!d };
          if (d) { const dc = getComputedStyle(d), rr = d.getBoundingClientRect(); o.dw = Math.round(rr.width); o.dh = Math.round(rr.height);
            o.ring = dc.borderTopColor; o.cur = cs.color; o.bw = parseFloat(dc.borderTopWidth); o.bg = dc.backgroundColor; o.dt = d.title;
            o.cr = __cr(__col(dc.borderTopColor), __bgOf(t)); }
          return o; }) }; });
      /* 悬停非当前的未入库页签：圈随字色变，仍 ≥3 */
      await pg.hover('#doc-tabs .dtab[data-doc="0"] .dt-t'); await pg.waitForTimeout(60);
      r.hov = await pg.evaluate(() => { const t = document.querySelector('#doc-tabs .dtab[data-doc="0"]'), d = t && t.querySelector('.dt-dot'); return d ? { ring: getComputedStyle(d).borderTopColor, cur: getComputedStyle(t).color, cr: __cr(__col(getComputedStyle(d).borderTopColor), __bgOf(t)) } : null; });
      out[nm] = r;
      const hard = /rgb\(232, 161, 58\)|rgb\(46, 175, 100\)/;
      const byN = Object.fromEntries(r.tabs.map(t => [t.name, t]));
      const L = byN['本机谱'], S = byN['已入库谱'], E = byN['空白谱'];
      if (!(L && S && E)) { fails.push(nm + ' 页签缺'); await close(pg); continue; }
      if (S.dot || !/已存入我的曲谱，编辑实时同步/.test(S.title)) fails.push(nm + ' 已入库页签仍标点 / 缺悬停提示');
      for (const t of [L, E]) {
        if (!t.dot) { fails.push(nm + ' ' + t.name + ' 未入库没标'); continue; }
        if (!(t.dw === 7 && t.dh === 7 && t.ring === t.cur && /rgba\(0, 0, 0, 0\)|transparent/.test(t.bg) && t.bw >= 1 && !hard.test(t.ring) && t.cr >= 3 && /仅存在本机/.test(t.title) && /仅存在本机/.test(t.dt)))
          fails.push(nm + ' ' + t.name + ' 圈 ' + J(t));
      }
      if (!(r.hov && r.hov.ring === r.hov.cur && r.hov.cr >= 3)) fails.push(nm + ' 悬停 ' + J(r.hov));
      if (!(r.tabs.every(t => Math.abs(t.h - 32) <= 1) && Math.abs(r.bar - 41) <= 1)) fails.push(nm + ' 页签变高 ' + J(r.tabs.map(t => t.h)) + ' 条 ' + r.bar);
      await close(pg);
    }
    T(fails.length === 0, 'V2a 状态只标「仅存本机（未入库）」：7px 空心圈、颜色＝页签字色（不再写死橙 / 绿），已入库不标、悬停提示「已存入我的曲谱，编辑实时同步」；浅 / 深 / 系统深当前 · 非当前 · 悬停对比 ≥3；页签 32 / 条 41 不变高',
      fails.join('；') + ' ' + J(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.tabs.filter(t => t.dot).map(t => t.name + ':' + t.cr).concat(v.hov ? ['hov:' + v.hov.cr] : [])]))));

    /* × 命中区：中心 ±13px 九点都命中同一个 ×；视觉 12px；真实点中心能关 */
    const pg = await open(1440, 900);
    await pg.evaluate(SETUP_TABS); await pg.waitForTimeout(150);
    const hit = await pg.evaluate(() => [...document.querySelectorAll('#doc-tabs .dt-x')].map(x => { const r = x.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const pts = []; for (const dx of [-13, 0, 13]) for (const dy of [-13, 0, 13]) { const e = document.elementFromPoint(cx + dx, cy + dy); pts.push(!!(e && e.closest('.dt-x') === x)); }
      const sv = x.querySelector('svg'), sr = sv ? sv.getBoundingClientRect() : { width: 0, height: 0, left: 0, top: 0 };
      return { i: +x.dataset.docX, ok: pts.every(Boolean), miss: pts.map(p => p ? 1 : 0).join(''), svg: Math.round(sr.width) + 'x' + Math.round(sr.height),
        centered: Math.abs(sr.left + sr.width / 2 - cx) < 1 && Math.abs(sr.top + sr.height / 2 - cy) < 1, tab: Math.round(x.closest('.dtab').getBoundingClientRect().height), cx, cy }; }));
    T(hit.length === 3 && hit.every(h => h.ok && h.svg === '12x12' && h.centered && Math.abs(h.tab - 32) <= 1),
      'V2b 关闭 × 命中区 ≥28×28（中心 ±13px 九点都命中 ×，原 19×13），视觉 12px 图形居中，页签仍 32 高', J(hit.map(h => ({ i: h.i, miss: h.miss, svg: h.svg, c: h.centered, tab: h.tab }))));
    await close(pg);
  } catch (e) { T(false, 'V2 执行异常', e.message.split('\n')[0]); }

  /* ================= V3「智能」死按钮 ================= */
  try {
    const out = {};
    for (const w of [1440, 1201, 1200, 1100]) {
      const pg = await open(w, 860);
      await pg.evaluate(SONG);
      const s0 = await pg.evaluate(() => { const e = document.getElementById('b-msmart'), rd = document.getElementById('right-dock');
        return { vis: !!(e && e.offsetParent), d: e ? getComputedStyle(e).display : '-', rd: Math.round(rd.getBoundingClientRect().width), rdPos: getComputedStyle(rd).position }; });
      if (s0.vis) {
        await pg.click('#b-msmart', { timeout: 2500 }).catch(() => {}); await pg.waitForTimeout(120);
        s0.open = await pg.evaluate(() => { const rd = document.getElementById('right-dock').getBoundingClientRect(); return { sheet: document.body.classList.contains('rsheet'), w: Math.round(rd.width), right: Math.round(rd.right), mask: !!document.getElementById('rsheet-mask') }; });
        await pg.click('#rsheet-mask', { position: { x: 30, y: 400 }, timeout: 2500 }).catch(() => {}); await pg.waitForTimeout(100);
        s0.closed = await pg.evaluate(() => !document.body.classList.contains('rsheet'));
      }
      out[w] = s0; await close(pg);
    }
    const W = innerW => out[innerW];
    T(!W(1440).vis && W(1440).d === 'none' && W(1440).rd > 150 && !W(1201).vis && W(1201).rd > 150
      && W(1200).vis && W(1200).open && W(1200).open.sheet && W(1200).open.w > 200 && W(1200).open.right === 1200 && W(1200).closed
      && W(1100).vis && W(1100).open && W(1100).open.sheet && W(1100).open.w > 200 && W(1100).closed,
      'V3 「智能」≥1201 宽隐藏（右栏本来就停靠，点了没反应）；≤1200 宽仍可见，点开右栏抽屉、点遮罩收起（v67.5 行为不变）', J(out));
  } catch (e) { T(false, 'V3 执行异常', e.message.split('\n')[0]); }

  /* ================= V4「预设」→「示例曲谱」 ================= */
  try {
    const pg = await open(1440, 900);
    await pg.evaluate(SONG);
    const t0 = await pg.evaluate(() => { const e = document.getElementById('b-library'); return { txt: e.textContent.trim(), title: e.title, top: document.getElementById('top').innerText.includes('预设'),
      mm: document.getElementById('b-mmenu').title,
      demo: (document.querySelector('#spd-cards [data-sp="demo"]') || {}).textContent || '', mine: (document.querySelector('#spd-cards .spd-card[data-sp="mine"]') || {}).textContent || '' }; });
    await pg.click('#b-library', { timeout: 2500 }).catch(() => {}); await pg.waitForTimeout(250);
    const m = await pg.evaluate(() => ({ h3: (document.querySelector('#modal-mask h3') || {}).textContent || '', tab: (document.querySelector('#modal-mask .lib-tab[data-lt="preset"]') || {}).textContent || '',
      al: (document.querySelector('#modal-mask [data-load-preset]') || { getAttribute: () => '' }).getAttribute('aria-label') || '' }));
    await pg.click('#modal-mask [data-load-preset="0"]', { timeout: 2500 }).catch(() => {}); await pg.waitForTimeout(400);
    const tt = await pg.evaluate(() => __toasts.filter(x => /已打开/.test(x)));
    await pg.evaluate(() => { const b2 = document.getElementById('b-help'); if (b2) b2.click(); }); await pg.waitForTimeout(150);
    const help = await pg.evaluate(() => { const x = document.querySelector('#modal-mask .helpdoc'); return x ? x.textContent : ''; });
    await pg.evaluate(() => closeModal());
    await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(200);
    await pg.click('#b-mmenu', { timeout: 2500 }).catch(() => {}); await pg.waitForTimeout(150);
    const mm = await pg.evaluate(() => (document.querySelector('#modal-mask [data-mm="b-library"]') || {}).textContent || '');
    await close(pg);
    const site = fs.readFileSync(path.join(ROOT, 'muse-tab/site/help.html'), 'utf8');
    /* 被测编辑器源码本身（MUSETAB_URL 指向的文件）：去注释、去更新日志历史条目后，不再有指代该按钮的「预设」（与措辞闸新增规则同一正则） */
    const FILE = URLF.startsWith('file://') ? decodeURIComponent(URLF.slice(7).replace(/[?#].*$/, '')) : path.resolve(__dirname, '../index.html');
    const src = fs.readFileSync(FILE, 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/<li><span class="v">v\d/.test(l)).join('\n');
    const BTN = /顶栏[「“]预设[」”]|[「“]预设[」”]按钮|>预设<\/button>|预设 · 我的曲谱|[「“]我的[」”]里(选)?(的)?预设/;
    const srcHit = (src.match(BTN) || [''])[0];
    let wording = 0, wout = '';
    try { wout = cp.execFileSync(process.execPath, [path.join(ROOT, 'deploy/check-wording.js')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { wording = e.status || 1; wout = String(e.stderr || e.stdout || '').slice(0, 300); }
    T(t0.txt === '示例曲谱' && /示例曲谱/.test(t0.title) && !/预设/.test(t0.title) && !t0.top && /示例曲谱/.test(t0.mm) && !/预设/.test(t0.mm) && /偏好设置/.test(t0.mm)
      && /示例曲谱/.test(t0.demo) && !/预设/.test(t0.demo + t0.mine) && /示例曲谱/.test(t0.mine)
      && m.h3 === '示例曲谱 · 我的曲谱' && m.tab === '示例曲谱 · 功能展示' && /^打开示例曲谱：/.test(m.al) && tt.length && tt.every(x => /^已打开示例曲谱：/.test(x))
      && /示例曲谱/.test(help) && /偏好设置/.test(help) && !/有预设可改编/.test(help) && mm === '示例曲谱',
      'V4a 编辑器统一叫「示例曲谱」：顶栏按钮文字与 title、☰ 菜单与其 title、启动台卡片、弹窗标题与页签、卡片读屏名、打开提示、帮助弹窗（顶栏不再出现「预设」）', J({ t0, m, tt, mm, help: help.length }));
    T(!srcHit && !BTN.test(site) && (site.match(/示例曲谱/g) || []).length >= 2 && wording === 0,
      'V4b 编辑器源码（被测文件）与官网 help.html 不再用「预设」指代该按钮（预设织体 / 预设小节等其他含义不动）；措辞闸 check-wording 通过（含新增的「预设」按钮规则）', J({ srcHit, n: (site.match(/示例曲谱/g) || []).length, wording, wout: wout.trim().slice(0, 120) }));
  } catch (e) { T(false, 'V4 执行异常', e.message.split('\n')[0]); }

  /* ================= V5 关闭提示 ================= */
  try {
    const pg = await open(1440, 900);
    await pg.evaluate(SETUP_TABS); await pg.waitForTimeout(150);
    const clickX = async (name) => { const p = await pg.evaluate(n => { const t = [...document.querySelectorAll('#doc-tabs .dtab')].find(x => x.querySelector('.dt-t').textContent === n);
        const x = t && t.querySelector('.dt-x'); if (!x) return null; const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, name);
      if (!p) return false; await pg.evaluate(() => { __toasts.length = 0; }); await pg.mouse.click(p.x, p.y); await pg.waitForTimeout(120); return true; };
    const st = () => pg.evaluate(() => ({ n: docs.length, titles: docs.map(d => d.song.title).join('|'), lib: JSON.parse(localStorage.getItem('musetab-library-v1') || '[]').map(e => e.title).join('|'), toasts: __toasts.slice() }));
    const c1 = await clickX('已入库谱'), r1 = await st();
    const c2 = await clickX('本机谱'), r2 = await st();
    /* 空白谱现在是最后一个窗口——再开一个以便能关 */
    await pg.evaluate(() => { const d = createSong('vocal', { title: '再开一份', key: 'C', beats: 4, unit: 4, nMea: 1, nTab: 0, nVox: 1, lyr: 0 }); addDoc(d, () => {}); renderDocTabs(); });
    const c3 = await clickX('空白谱'), r3 = await st();
    T(c1 && r1.n === 2 && !/已入库谱/.test(r1.titles) && r1.lib === '已入库谱' && r1.toasts.length === 1 && r1.toasts[0] === '已关闭《已入库谱》'
      && c2 && r2.n === 1 && r2.lib.split('|').sort().join() === '已入库谱,本机谱' && r2.toasts.some(x => x === '已关闭《本机谱》并存入「我的曲谱」')
      && c3 && r3.toasts.length === 1 && r3.toasts[0] === '已关闭《空白谱》' && r3.lib.split('|').length === 2,
      'V5a 点 × 关已入库窗口只提示「已关闭《已入库谱》」（不再说存入、库不重复）；未入库有内容照旧自动转存并提示；空白未入库只说已关闭', J({ r1, r2, r3 }));

    /* 关当前已入库窗口：最后一笔（还在 350ms 去抖里）同步进「我的曲谱」 */
    const fl = await pg.evaluate(() => { localStorage.setItem('musetab-library-v1', '[]');
      const a = createSong('vocal', { title: '最后一笔', key: 'C', beats: 4, unit: 4, nMea: 1, nTab: 0, nVox: 1, lyr: 0 }); addDoc(a, () => {}); saveToLibrary(); persistFlush();
      mutate(() => { song.measures[0].voxes[0][0].deg = 6; });
      const x = document.querySelector('#doc-tabs .dtab.on .dt-x'); if (x) x.click();
      const e = JSON.parse(localStorage.getItem('musetab-library-v1') || '[]').find(z => z.title === '最后一笔');
      return { closed: !docs.some(d => d.song.title === '最后一笔'), deg: e && e.data.measures[0].voxes[0][0].deg }; });
    T(fl.closed && fl.deg === 6, 'V5b 关当前已入库窗口前把去抖中的最后一笔写进「我的曲谱」（此前关窗即丢）', J(fl));
    await close(pg);
  } catch (e) { T(false, 'V5 执行异常', e.message.split('\n')[0]); }

  /* ================= 验收修复（v67.8 收尾）：关窗不丢稿 F1 / S-2 · F2 / S-1 · 删除后页签 F3 ================= */
  const XCLICK = async (pg, name) => { const p = await pg.evaluate(n => { const t = [...document.querySelectorAll('#doc-tabs .dtab')].find(x => x.querySelector('.dt-t').textContent === n);
      const x = t && t.querySelector('.dt-x'); if (!x) return null; const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, title: x.title }; }, name);
    if (!p) return null; await pg.evaluate(() => { __toasts.length = 0; }); await pg.mouse.click(p.x, p.y); await pg.waitForTimeout(120); return p; };
  const TABPOS = (pg, name) => pg.evaluate(n => { const t = [...document.querySelectorAll('#doc-tabs .dtab')].find(x => x.querySelector('.dt-t').textContent === n);
    const e = t && t.querySelector('.dt-t'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, name);
  const LIBDEG = (pg, title, ci) => pg.evaluate(([t, c]) => { const e = JSON.parse(localStorage.getItem('musetab-library-v1') || '[]').find(z => z.title === t);
    return e ? e.data.measures[0].voxes[0][c].deg : null; }, [title, ci]);
  try {
    /* V5c F1 / S-2：只写了和弦（TAB 列）+ 歌词的弹唱谱、纯和弦谱（每格 deg:0 + chord）、只有歌词的歌谱——未入库，点 × 关掉都要转存 */
    const pg = await open(1440, 900);
    await pg.evaluate(() => { hideStartPad(); localStorage.setItem('musetab-library-v1', '[]');
      const a = createSong('vocal', { title: '主窗口', key: 'C', beats: 4, unit: 4, nMea: 2, nTab: 0, nVox: 1, lyr: 0 }); a.measures[0].voxes[0][0].deg = 1; loadSong(a);
      docs = [{ song, sel: null }]; curDocI = 0;
      const g = NWB.build('JT', { title: '弹唱·先写和弦', nMea: 2 }); g.measures[0].tabs[0][0].chord = 'C'; g.measures[1].tabs[0][0].chord = 'G'; g.measures[0].voxes[0][0].lyrics = ['春']; addDoc(g, () => {});
      const c = createSong('func', { title: '纯和弦谱·未入库', key: 'C', beats: 4, unit: 4, nMea: 2, ftype: 'chord' }); c.measures[0].voxes[0].forEach((x, i) => { x.chord = ['C', 'Am', 'F', 'G'][i % 4]; }); addDoc(c, () => {});
      const l = NWB.build('J', { title: '只有歌词', nMea: 2 }); l.measures[0].voxes[0][0].lyrics = ['花']; addDoc(l, () => {});
      switchDocTo(0); render(); renderDocTabs(); });
    const out = [];
    for (const nm of ['弹唱·先写和弦', '纯和弦谱·未入库', '只有歌词']) {
      const p = await XCLICK(pg, nm);
      out.push(await pg.evaluate(([n, t]) => ({ n, xtitle: t, open: docs.some(d => d.song.title === n), inLib: JSON.parse(localStorage.getItem('musetab-library-v1') || '[]').some(e => e.title === n), toast: __toasts.slice(-1)[0] || '' }), [nm, p && p.title]));
    }
    T(out.length === 3 && out.every(o => /有内容会自动存入我的曲谱/.test(o.xtitle || '') && !o.open && o.inLib && o.toast === '已关闭《' + o.n + '》并存入「我的曲谱」'),
      'V5c 只写了和弦 / 歌词、还没有音符的未入库窗口（弹唱谱 TAB 和弦 + 歌词、纯和弦谱 deg:0 + chord、只有歌词的歌谱）点 × 关掉都转存进「我的曲谱」，兑现 × 上「有内容会自动存入，不丢稿」的承诺（此前整份丢、只提示已关闭）', J(out));
    await close(pg);

    /* V5d 守门：14 种谱组合的空白新建谱（NWB.build）关掉照旧不进库、只说「已关闭」——放宽内容判定不把空谱塞进「我的曲谱」 */
    const pd = await open(1440, 900);
    await pd.evaluate(() => { hideStartPad(); localStorage.setItem('musetab-library-v1', '[]');
      const a = createSong('vocal', { title: '留着', key: 'C', beats: 4, unit: 4, nMea: 1, nTab: 0, nVox: 1, lyr: 0 }); loadSong(a); docs = [{ song, sel: null }]; curDocI = 0;
      NWB.VALID.forEach(id => addDoc(NWB.build(id, { title: '空白' + id, beats: id === 'C' ? 4 : 6, unit: id === 'C' ? 4 : 8, nVox: id === 'J' ? 3 : 1, lyr: 2 }), () => {}));
      switchDocTo(0); render(); renderDocTabs(); });
    const ids = await pd.evaluate(() => NWB.VALID.slice());
    const bad = [];
    for (const id of ids) { await XCLICK(pd, '空白' + id); const r = await pd.evaluate(n => ({ open: docs.some(d => d.song.title === n), lib: JSON.parse(localStorage.getItem('musetab-library-v1') || '[]').length, toast: __toasts.slice(-1)[0] || '' }), '空白' + id);
      if (r.open || r.lib !== 0 || r.toast !== '已关闭《空白' + id + '》') bad.push(id + ':' + J(r)); }
    T(ids.length === 14 && !bad.length, 'V5d 守门：14 种谱组合的空白新建谱（含 6/8、三声部、两段词位）点 × 关掉不进库、只提示「已关闭《…》」', bad.join('；') || ('n=' + ids.length));
    await close(pd);

    /* V5e F2 / S-1：已入库甲真实按「6」→ 350ms 内真实点乙的页签切走（去抖还没到）→ 再关甲：最后一笔进了「我的曲谱」，刷新后仍在 */
    const SETUP_AB = `(()=>{ hideStartPad(); localStorage.setItem('musetab-library-v1','[]');
      const a=createSong('vocal',{title:'已入库甲',key:'C',beats:4,unit:4,nMea:1,nTab:0,nVox:1,lyr:0}); a.measures[0].voxes[0].forEach((c,i)=>{ c.deg=i+1; }); loadSong(a);
      docs=[{song, sel:null}]; curDocI=0; saveToLibrary();
      const b=createSong('vocal',{title:'乙',key:'G',beats:4,unit:4,nMea:1,nTab:0,nVox:1,lyr:0}); b.measures[0].voxes[0][0].deg=5; addDoc(b,()=>{}); saveToLibrary(); switchDocTo(0);
      sel={mi:0,row:'vox',vi:0,ci:1,si:1}; lastEnt=null; render(); persistFlush(); if(document.activeElement&&document.activeElement.blur) document.activeElement.blur(); return docs.length; })()`;
    const pe = await open(1440, 900);
    await pe.evaluate(SETUP_AB); await pe.waitForTimeout(100);
    const posB = await TABPOS(pe, '乙');
    const t0 = Date.now();
    await pe.keyboard.press('6');
    await pe.mouse.click(posB.x, posB.y);
    const dt = Date.now() - t0;
    const mid = { cur: await pe.evaluate(() => song.title), mem: await pe.evaluate(() => docs.find(d => d.song.title === '已入库甲').song.measures[0].voxes[0][1].deg), lib: await LIBDEG(pe, '已入库甲', 1), dt };
    await pe.waitForTimeout(500);
    await XCLICK(pe, '已入库甲');
    const fin = { n: await pe.evaluate(() => docs.length), lib: await LIBDEG(pe, '已入库甲', 1), toast: await pe.evaluate(() => __toasts.slice(-1)[0] || '') };
    await pe.reload(); await pe.waitForTimeout(1000);
    const rel = await LIBDEG(pe, '已入库甲', 1);
    T(mid.cur === '乙' && mid.mem === 6 && mid.dt < 350 && mid.lib === 6 && fin.n === 1 && fin.lib === 6 && fin.toast === '已关闭《已入库甲》' && rel === 6,
      'V5e 已入库窗口真实按「6」后 350ms 内点页签切走：切走时最后一笔已同步进「我的曲谱」；之后关掉它（非当前窗口）库里仍是新值，刷新后还在（此前库里停在旧值，关窗即永久丢）', J({ mid, fin, rel }));
    await close(pe);

    /* V5f S-1 同类路径：按键后立刻另开窗口（导入 / 新建 addDoc）再关甲；按键后立刻在当前窗口换谱（loadSong）——最后一笔都进库 */
    const pf = await open(1440, 900);
    await pf.evaluate(SETUP_AB); await pf.waitForTimeout(100);
    await pf.keyboard.press('6');
    await pf.evaluate(() => addDoc(createSong('vocal', { title: '新开丙', key: 'C', beats: 4, unit: 4, nMea: 1, nTab: 0, nVox: 1, lyr: 0 }), () => {}));
    const fa = { atOpen: await LIBDEG(pf, '已入库甲', 1) };
    await pf.waitForTimeout(500); await XCLICK(pf, '已入库甲'); fa.afterClose = await LIBDEG(pf, '已入库甲', 1);
    await pf.evaluate(SETUP_AB); await pf.waitForTimeout(100);
    await pf.evaluate(() => { sel = { mi: 0, row: 'vox', vi: 0, ci: 2, si: 1 }; lastEnt = null; render(); });
    await pf.keyboard.press('7');
    await pf.evaluate(() => loadSong(createSong('vocal', { title: '换进来的', key: 'C', beats: 4, unit: 4, nMea: 1, nTab: 0, nVox: 1, lyr: 0 })));
    await pf.waitForTimeout(500);
    const fl = { lib: await LIBDEG(pf, '已入库甲', 2), cur: await pf.evaluate(() => song.title) };
    T(fa.atOpen === 6 && fa.afterClose === 6 && fl.cur === '换进来的' && fl.lib === 7,
      'V5f 同类路径：按键后立刻另开窗口（addDoc）、或立刻在当前窗口换谱（loadSong），已入库那份的最后一笔都进了「我的曲谱」', J({ fa, fl }));
    await close(pf);

    /* V5g F3：「示例曲谱 · 我的曲谱」弹窗、个人中心两处删掉正开着的这首 → 页签当场出空心圈、title 改「仅存在本机」，入库 id 清掉 */
    const pgd = await open(1440, 900);
    pgd.on('dialog', d => d.accept().catch(() => {}));
    await pgd.evaluate(SETUP_TABS); await pgd.waitForTimeout(150);
    const tabSt = n => pgd.evaluate(nm => { const t = [...document.querySelectorAll('#doc-tabs .dtab')].find(x => x.querySelector('.dt-t').textContent === nm);
      const d = docs.find(z => z.song.title === nm); return t ? { dot: !!t.querySelector('.dt-dot'), saved: /已存入我的曲谱/.test(t.title), id: !!(d && d.song.id) } : null; }, n);
    const g0 = await tabSt('已入库谱');
    await pgd.click('#b-library', { timeout: 2500 }).catch(() => {}); await pgd.waitForTimeout(200);
    await pgd.click('#modal-mask .lib-tab[data-lt="mine"]', { timeout: 2500 }).catch(() => {}); await pgd.waitForTimeout(150);
    await pgd.click('#modal-mask [data-del-mine]', { timeout: 2500 }).catch(() => {}); await pgd.waitForTimeout(200);
    const g1 = await tabSt('已入库谱');
    await pgd.keyboard.press('Escape'); await pgd.waitForTimeout(100);
    /* 个人中心路径：再保存一次 → 个人中心删除 → 返回 */
    await pgd.click('#b-savemine', { timeout: 2500 }).catch(() => {}); await pgd.waitForTimeout(150);
    const g2 = await tabSt('已入库谱');
    await pgd.evaluate(() => openPersonal('mine')); await pgd.waitForTimeout(200);
    await pgd.click('#pcenter [data-pc-del]', { timeout: 2500 }).catch(() => {}); await pgd.waitForTimeout(200);
    await pgd.click('#pcx-back', { timeout: 2500 }).catch(() => {}); await pgd.waitForTimeout(200);
    const g3 = await tabSt('已入库谱');
    T(g0 && !g0.dot && g0.saved && g1 && g1.dot && !g1.saved && !g1.id && g2 && !g2.dot && g2.saved && g3 && g3.dot && !g3.saved && !g3.id,
      'V5g 从「示例曲谱 · 我的曲谱」弹窗或个人中心删掉正开着的这首：页签当场出空心圈、提示改回「仅存在本机」，窗口里的入库 id 清掉（此前仍显示「已存入」，个人中心路径连 id 都不清）', J({ g0, g1, g2, g3 }));
    await close(pgd);
  } catch (e) { T(false, 'V5c–g 执行异常', e.message.split('\n')[0]); }

  /* ================= 验收修复：页签文案 F6 · 键盘关窗焦点 F8 ================= */
  try {
    const pg = await open(1440, 900);
    await pg.evaluate(SETUP_TABS); await pg.waitForTimeout(150);
    const tt = () => pg.evaluate(() => [...document.querySelectorAll('#doc-tabs .dtab')].map(t => ({ n: t.querySelector('.dt-t').textContent, on: t.classList.contains('on'), title: t.title, dot: (t.querySelector('.dt-dot') || {}).title || '' })));
    const a = await tt();
    const pos = await TABPOS(pg, '本机谱'); await pg.mouse.click(pos.x, pos.y); await pg.waitForTimeout(120);
    const b2 = await tt();
    await pg.click('#b-savemine', { timeout: 2500 }).catch(() => {}); await pg.waitForTimeout(150);
    const c2 = await tt();
    const by = (l, n) => l.find(x => x.n === n) || {};
    const OTHER = /仅存在本机（未入库）：切到这个窗口后点顶栏「保存」存入我的曲谱/, CUR = /仅存在本机（未入库），点顶栏「保存」存入我的曲谱/;
    T(!by(a, '本机谱').on && OTHER.test(by(a, '本机谱').title) && OTHER.test(by(a, '本机谱').dot) && OTHER.test(by(a, '空白谱').dot)
      && by(b2, '本机谱').on && CUR.test(by(b2, '本机谱').title) && CUR.test(by(b2, '本机谱').dot) && OTHER.test(by(b2, '空白谱').dot)
      && /已存入我的曲谱/.test(by(c2, '本机谱').title) && !by(c2, '本机谱').dot,
      'V2c 非当前的未入库页签提示「切到这个窗口后点顶栏「保存」」（顶栏「保存」只存当前窗口）；切过去后是原文，照做点「保存」存进的就是它', J({ a: a.map(x => x.n + (x.on ? '*' : '') + ':' + x.dot.slice(0, 14)), b: b2.map(x => x.n + (x.on ? '*' : '') + ':' + x.dot.slice(0, 14)), c: by(c2, '本机谱').title }));

    /* F8：键盘 Enter 关窗后焦点落到同位置页签的 ×，关到只剩一个窗口时落到「＋」，不掉回 body */
    await pg.evaluate(() => { const d = createSong('vocal', { title: '丁', key: 'C', beats: 4, unit: 4, nMea: 1, nTab: 0, nVox: 1, lyr: 0 }); d.measures[0].voxes[0][0].deg = 2; addDoc(d, () => {}); saveToLibrary(); renderDocTabs(); });
    const AE = () => pg.evaluate(() => { const e = document.activeElement; return { tag: e.tagName, x: e.dataset && e.dataset.docX != null ? +e.dataset.docX : null, id: e.id || '', n: docs.length,
      tab: (e.closest && e.closest('.dtab')) ? e.closest('.dtab').querySelector('.dt-t').textContent : '' }; });
    await pg.focus('#doc-tabs .dt-x[data-doc-x="3"]'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(150);
    const k1 = await AE();
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(150);
    const k2 = await AE();
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(150);
    const k3 = await AE();
    T(k1.n === 3 && k1.x === 2 && k2.n === 2 && k2.x === 1 && k3.n === 1 && k3.id === 'dt-add',
      'V2d 键盘 Enter 点 × 关窗后焦点不掉回 body：落到同位置页签的 ×（关的是最后一个就落到前一个），只剩一个窗口时落到「＋」，可连续用键盘关', J({ k1, k2, k3 }));
    await close(pg);
  } catch (e) { T(false, 'V2c–d 执行异常', e.message.split('\n')[0]); }

  /* ================= 验收修复：偏好设置弹窗键盘 / 读屏 F4 ================= */
  try {
    const pg = await open(1440, 900);
    await pg.evaluate(SONG);
    const AE = () => pg.evaluate(() => { const e = document.activeElement; return (e && (e.id || (e.dataset && e.dataset.prf) || e.tagName)) || ''; });
    await pg.focus('#b-prefs'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(150);
    const lab = await pg.evaluate(() => { const md = document.querySelector('#modal-mask .modal'); const id = md && md.getAttribute('aria-labelledby'); const h = id && document.getElementById(id);
      return { id, name: h ? h.textContent : '', role: md && md.getAttribute('role'), hum: ((document.querySelector('.prf-row[data-prf="humanize"] small') || {}).textContent || '') }; });
    const seq = [await AE()];
    /* v68.2：弹窗多一行「使用旧版布局」（oldshell，在原 4 个开关之后、「完成」之前）——Tab 走查多一步，首尾循环口径不变 */
    for (let i = 0; i < 6; i++) { await pg.keyboard.press('Tab'); seq.push(await AE()); }
    await pg.keyboard.press('Shift+Tab'); const back1 = await AE();
    await pg.keyboard.press('Shift+Tab'); const back2 = await AE();
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(120);
    const esc1 = { open: await pg.evaluate(() => !!document.getElementById('modal-mask')), ae: await AE() };
    await pg.click('#b-prefs', { timeout: 2500 }).catch(() => {}); await pg.waitForTimeout(150);
    await pg.focus('#prf-ok'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(120);
    const ok1 = { open: await pg.evaluate(() => !!document.getElementById('modal-mask')), ae: await AE() };
    await close(pg);
    const pm = await open(390, 844);
    await pm.evaluate(SONG);
    await pm.click('#b-mmenu', { timeout: 2500 }).catch(() => {}); await pm.waitForTimeout(150);
    await pm.click('#modal-mask [data-mm="b-prefs"]', { timeout: 2500 }).catch(() => {}); await pm.waitForTimeout(150);
    await pm.keyboard.press('Escape'); await pm.waitForTimeout(120);
    const mob = await pm.evaluate(() => ({ open: !!document.getElementById('modal-mask'), ae: (document.activeElement || {}).id || '' }));
    await close(pm);
    T(lab.id === 'prf-h' && lab.name === '偏好设置' && lab.role === 'dialog' && /下次播放起生效/.test(lab.hum)
      && seq.join() === 'keymap,autoadv,humanize,quickbar,oldshell,prf-ok,keymap' && back1 === 'prf-ok' && back2 === 'oldshell'
      && !esc1.open && esc1.ae === 'b-prefs' && !ok1.open && ok1.ae === 'b-prefs' && !mob.open && mob.ae === 'b-mmenu',
      'V1g 偏好设置弹窗：有可访问名（aria-labelledby → 「偏好设置」）；Tab / Shift+Tab 圈在弹窗里首尾循环；Esc 或「完成」关闭后焦点回到设置钮（手机从 ☰ 打开的回到 ☰）；演奏感说明写明播放中切换下次起生效', J({ lab, seq, back1, back2, esc1, ok1, mob }));
  } catch (e) { T(false, 'V1g 执行异常', e.message.split('\n')[0]); }

  /* ================= 验收修复：「智能」抽屉跨档残留 F7 ================= */
  try {
    const pg = await open(1100, 860);
    await pg.evaluate(SONG);
    await pg.click('#b-msmart', { timeout: 2500 }).catch(() => {}); await pg.waitForTimeout(120);
    const s0 = await pg.evaluate(() => document.body.classList.contains('rsheet'));
    await pg.setViewportSize({ width: 1440, height: 860 }); await pg.waitForTimeout(300);
    const w = await pg.evaluate(() => ({ rs: document.body.classList.contains('rsheet'), where: lbWhere(), btn: !!document.getElementById('b-msmart').offsetParent }));
    await pg.setViewportSize({ width: 1100, height: 860 }); await pg.waitForTimeout(300);
    const n = await pg.evaluate(() => { const rd = document.getElementById('right-dock'), mk = document.getElementById('rsheet-mask');
      return { rs: document.body.classList.contains('rsheet'), pos: getComputedStyle(rd).position, rdDisp: getComputedStyle(rd).display, mask: mk ? getComputedStyle(mk).display : 'none' }; });
    /* 宽屏隐藏规则写成 ≤1200 档的精确补集（缩放下 1200–1201 的小数宽度也不漏出死按钮） */
    const mq = await pg.evaluate(() => { const out = []; for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules; } catch (_) { continue; }
        for (const r of rs) if (r.media && /b-msmart/.test(r.cssText) && /display:\s*none/.test(r.cssText) && !/max-width:\s*820px/.test(r.media.mediaText) && !/start-pad/.test(r.cssText)) out.push(r.media.mediaText); } return out; });
    T(s0 && !w.rs && !w.btn && /^右栏/.test(w.where) && !n.rs && n.pos !== 'fixed' && n.rdDisp === 'none' && n.mask === 'none' && mq.includes('not all and (max-width: 1200px)'),
      'V3b 1100 宽开着「智能」抽屉时拉宽到 1440：抽屉状态随之收起（谱型条提示指向右栏）；再缩回 1100 抽屉不会自己弹出；宽屏隐藏规则＝≤1200 的精确补集', J({ s0, w, n, mq }));
    await close(pg);
  } catch (e) { T(false, 'V3b 执行异常', e.message.split('\n')[0]); }

  /* ================= 验收修复：示例曲谱署名 F5 · 官网自动前进说明 S-3 ================= */
  try {
    const pg = await open(1440, 900);
    await pg.evaluate(SONG);
    const mk = await pg.evaluate(() => PRESETS.map(p => p.make().maker));
    await pg.click('#b-library', { timeout: 2500 }).catch(() => {}); await pg.waitForTimeout(250);
    await pg.click('#modal-mask [data-load-preset="1"]', { timeout: 2500 }).catch(() => {}); await pg.waitForTimeout(400);
    const sc = await pg.evaluate(() => ({ t: song.title, has: (document.getElementById('score').textContent || '').includes('制谱：谱友圈'), bad: (document.getElementById('score').textContent || '').includes('谱友圈预设') }));
    await close(pg);
    T(mk.length === 16 && mk.every(m => m === '谱友圈') && /欢乐颂/.test(sc.t) && sc.has && !sc.bad,
      'V4c 16 首示例曲谱署名统一「谱友圈」，打开「欢乐颂（扫弦弹唱）」页头印「制谱：谱友圈」，不再带出「谱友圈预设」', J({ mk: [...new Set(mk)], sc }));
    const site = fs.readFileSync(path.join(ROOT, 'muse-tab/site/help.html'), 'utf8');
    const lint = fs.readFileSync(path.join(ROOT, 'deploy/check-wording.js'), 'utf8');
    /* v68.2 新外壳切默认：官网改写成「在「偏好设置」里关掉（电脑在账号 ▾ 里，手机在 ☰ 菜单里）」——意图不变（关法指向偏好设置、不再指右栏预提示），
       不再写死「顶栏」二字（新布局的偏好设置在账号 ▾ 里；旧版布局仍在顶栏） */
    const PREF_OFF = /「偏好设置」里关掉/g;
    T(!/预提示里一键(关闭|开启)/.test(site) && (site.match(PREF_OFF) || []).length === 2 && /预提示里一键/.test(lint) && /maker:/.test(lint),
      'V4d 官网 help.html 两处「落音自动前进」的关法改指「偏好设置」（右栏预提示 v56.6 已撤）；措辞闸新增两条规则（预提示一键关闭 / 示例署名「预设」）', J({ n: (site.match(PREF_OFF) || []).length }));
  } catch (e) { T(false, 'V4c–d 执行异常', e.message.split('\n')[0]); }

  T(errs.length === 0, 'V6 全程无页面脚本错误', errs.slice(0, 3).join(' | '));
  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
