'use strict';
/* v69.0 界面简约化 S2 · 停留预览（FLOW.nx.pv）+ 织体条 / 节奏型条——规格 f90 §2 / §3 / §8.2（方案 docs/design-2026-10g P6 / P7 / P9 / P11）。
   被测页＝默认外壳（flow）。几何断言优先（角标与墨迹相交面积 0、版面不跳），零副作用逐字节对拍。
   PV1  零副作用：6 个场景（钢琴伴奏歌谱配伴奏 / 补配 / 织体条卡 / 钢琴弹唱谱生成伴奏 / 吉他弹唱节奏型卡 / 产出对照谱 ↗ 无预览）悬停 450ms 显示、移开、再悬停 ×3——
        song 序列化、撤销栈（长度 + 栈顶）、重做栈、musetab-* 本机键、persist.pending、docs[cur].song===song、LB_META 条目、colBoxes 同一对象、#score.innerHTML、document.title 全不变；
        pyqEvent / toast 计数 0
   PV2  撤销栈：悬停预览若干次后 Ctrl+Z 撤的是预览前最后一次真实操作
   PV3  成品无预览层：预览显示中与隐藏时取样逐字节相同、都不含 flw-nx / --nx-pv——PNG（svgPngDownload 打桩）· 打印 #print-pages · emulateMedia(print) 下预览层 display:none ·
        分享卡 SVG · MusicXML / MIDI · 缩图 buildThumbCanvas · 分谱 partRender · 切排版后快照
   PV4  一致：写入后（中性选区）#score 内容（去播放头 / 竖线）＝预览 svg 内容；写入后 song＝预览谱
   PV5  角标几何：1180 / 1280 / 1440 / 1920 × 3 场景——与预览墨迹框相交面积 0、在视口与谱面可视区内、不被悬浮条 / 织体条遮、文字「预览 a–b」＝范围
   PV6  着色：淡紫区 ⊆ 变化列框并集（外扩 2 单位 + 和弦名带）；不与未变化旋律音框相交
   PV7  性能（CDP 4× CPU 降速，中位 5 次，热身 1 次）：32 小节首次 ≤120ms、缓存 ≤30ms；80 小节只预览可见行（mode win）；200 小节或 __nxBudget=1 退化（mode off、无预览层、点了照常写入且提示条带「撤销」）
        v69.0 收尾：PV7f 同窗 4× 连续 8 次都出预览（REG-3）· PV7g 稠密 32 小节 SJG（八分 + 歌词）4× 首次中位 ≤120、报告 arm→ready（F3）· PV7h 预算记录按窗口（F4）
   PV8  偏好：musetab-preview='0' 开机即不预览；偏好弹窗「停留预览」切换写 / 删键；全程 musetab-* 键差集 ⊆ {musetab-sbar, musetab-preview}
   PV9  生命周期：<400ms 离开不出；滚动 / 按键 / 切模式 / 切窗口 / 开弹窗 / 开始播放 / 窗口缩放 → 收起
   PV10 不跳版面：预览显示前后 #score-wrap.scrollHeight、#paper / #score 矩形相差 <0.5px
   PV11 旧外壳 / ?next=0：没有 #flw-nx-* 节点；悬停无反应
   PV12 yWin：只画窗口内谱行的离屏输出 ⊆ 整谱输出（逐元素相同），窗口内各行的 colBoxes 与整谱相同；正常 render 的 #score 与基线（4c675f2）逐字节相同
   PV13 织体条 / 节奏型条：卡数（4/4 推荐 6 +「全部 15」、3/4 2、2/4 3、6/8 2）、短名 ≤6、✓ 当前、缩略图是 svg.pq-offscore、←→ / Enter / Esc / Space、▶ 试听不改 song 与 audio.playing、点卡写后条留着、Enter 写后关闭
   v69.0 收尾（验收发现的回归断言，修前副本应红）：PV14 删自定义节奏型后预览＝写入、缩略图换新（F8-pv）· PV15 换调后缩略图重画（F9-pv）·
   PV16 与现状相同不预览、写入后不再挂角标（TCH-3）· PV17 「全部 N」一排横滚、兜底角标在条头空白（F5-pv / F6-pv）
   env：MUSETAB_URL · MUSETAB_BASE · ONLY=PV1,PV5 · SHOTS · PV_PERF=0 跳过 PV7 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => { const i = u.indexOf('#'), base = i >= 0 ? u.slice(0, i) : u, h = i >= 0 ? u.slice(i) : ''; return base + (base.includes('?') ? '&' : '?') + q + h; };
/* 对拍基线：tests/next_ref.json（完整 SHA；deploy.yml 浅克隆后按它单独补取这一个提交，REG-1）；CI 里拿不到＝判红（REG-6），MUSETAB_BASE=none 是本地显式跳过 */
const NEXT_REF = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'next_ref.json'), 'utf8')); } catch (_) { return {}; } })();
const BASE_COMMIT = process.env.MUSETAB_BASE_COMMIT || NEXT_REF.commit || '4c675f24a1cf48330da74bca3dd29bf492f8fa82';
const BASE_SHORT = BASE_COMMIT.slice(0, 7);
const IN_CI = !!process.env.CI && process.env.MUSETAB_BASE !== 'none';
const BASEU = (() => {
  const e = process.env.MUSETAB_BASE;
  if (e) { const f = e.replace(/^file:\/\//, '').replace(/[?#].*$/, ''); return fs.existsSync(f) ? (e.startsWith('file://') ? e : 'file://' + path.resolve(e)) : ''; }
  try { const txt = require('child_process').execFileSync('git', ['-C', __dirname, 'show', BASE_COMMIT + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
    const f = path.join(require('os').tmpdir(), 'tv_preview_base_' + BASE_SHORT + '.html'); fs.writeFileSync(f, txt); return 'file://' + f; } catch (_) { return ''; }
})();
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const SHOTS = process.env.SHOTS || '';
const J = x => JSON.stringify(x);
let pass = 0, total = 0; const OUT = {}, errs = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; (OUT[id] = OUT[id] || []).push((ok ? '✅ ' : '❌ ') + name + (!ok && d != null ? ': ' + String(d).slice(0, 1800) : '')); };
const NOTE = (id, s) => { (OUT[id] = OUT[id] || []).push(s); };

function HELP() {
  window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
  try { hideStartPad(); } catch (_) {}
  window.$i = id => document.getElementById(id);
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false;
    const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; }
    return true; };
  window.__raf2 = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 0))));
  window.__toastN = 0; window.__evN = 0;
  { const t0 = window.toast; window.toast = function () { __toastN++; return t0.apply(this, arguments); };
    const e0 = window.pyqEvent; window.pyqEvent = function () { __evN++; return e0 && e0.apply(this, arguments); }; }
  window.__one = s => { addDoc(s, () => {}); while (docs.length > 1) closeDocAt(0); try { closeModal(); } catch (_) {} render(); return s; };
  window.__V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
  window.__melIn = (s, vi, mis) => { mis.forEach(mi => { const m = s.measures[mi], b = m.beats || s.beats, u = m.unit || s.unit; m.voxes[vi] = Array.from({ length: b }, (_, i) => __V(((mi * 3 + i) % 7) + 1, u)); }); return s; };
  window.__new = (k, o) => { o = o || {}; const s = NWB.build(k, Object.assign({ title: '测' + k, nMea: o.nMea || 8 }, o.b || {})); if (o.mod) o.mod(s); __one(s);
    if (o.meta !== false) LBAR.open(Object.assign({ from: 'new' }, o.meta || {}));
    const tab = (k === 'T' || k === 'ST' || (k === 'JT' && !(o.meta && o.meta.pen === 'J')));
    sel = { mi: 0, row: tab ? 'tab' : 'vox', vi: 0, ci: 0, si: 1 }; blurSel = false; render(); return 1; };
  window.__mel = (mis) => { const mv = lbMelVoices(song); const vi = mv.length ? mv[0] : 0; mutate(() => __melIn(song, vi, mis || song.measures.map((_, i) => i))); return 1; };
  window.__shut = () => { try { FLOW.menu.close(); } catch (_) {} try { closePop(); } catch (_) {} try { closeModal(); } catch (_) {} try { FLOW.nx.tbar.close(false); FLOW.nx.rbar.close(false); } catch (_) {} };
  window.__h = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16) + ':' + s.length; };
  window.__ls = () => { const o = {}; Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort().forEach(k => { o[k] = localStorage.getItem(k); }); return JSON.stringify(o); };
  window.__keys = () => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort();
  /* 零副作用快照 */
  window.__snap = () => { const d = docs[curDocI], m = (d && LB_META) ? LB_META.get(d) : null;
    return { s: __h(JSON.stringify(song)), un: undoStack.length, ut: undoStack.length ? __h(undoStack[undoStack.length - 1]) : '', rn: redoStack.length, ls: __h(__ls()), pend: !!(persist && persist.pending),
      docSame: !!(d && d.song === song), meta: m ? JSON.stringify(Object.assign({}, m, { melUndo: undefined })) : null, cb: window.__cb0 === colBoxes, score: __h($i('score').innerHTML), title: document.title, ev: __evN, toast: __toastN }; };
  window.__pv = () => { const e = $i('flw-nx-pv'); return e ? { st: e.dataset.st, hidden: e.hidden, vis: __vis(e), tag: (e.querySelector('.flw-nx-tag') || {}).textContent || '' } : null; };
  /* 墨迹框（屏幕坐标，测试方独立复述：叶子元素，去页底 / 透明热区 / 提示 / 不可见） */
  window.__ink = () => { const svg = document.querySelector('#flw-nx-pv svg'); if (!svg) return [];
    const out = []; svg.querySelectorAll('text,path,line,polyline,polygon,circle,ellipse,use,rect,image').forEach(e => {
      if (e.classList.contains('pagebg') || e.closest('[data-zone],[data-hd],[data-bar]')) return;
      const f = e.getAttribute('fill'), st = e.getAttribute('stroke'), op = e.getAttribute('opacity'), fo = e.getAttribute('fill-opacity');
      if (op === '0') return; if ((f === 'transparent' || fo === '0') && (!st || st === 'none')) return;
      if ((f === 'none' || f === 'transparent') && (!st || st === 'none') && e.tagName === 'rect') return;
      const r = e.getBoundingClientRect(); if (r.width <= 0 && r.height <= 0) return; out.push({ l: r.left, t: r.top, r: r.right, b: r.bottom }); });
    return out; };
  window.__area = (a, list) => list.reduce((s, b) => { const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t); return s + (w > 0 && h > 0 ? w * h : 0); }, 0);
  return 1;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const open = async (w, h, o) => {
    o = o || {};
    const ctx = await b.newContext(Object.assign({ viewport: { width: w, height: h }, colorScheme: o.scheme || 'light', deviceScaleFactor: 1 }));
    if (o.init) await ctx.addInitScript(o.init);
    const pg = await ctx.newPage(); pg._ctx = ctx;
    pg.on('pageerror', e => errs.push((o.tag || '') + ' PAGEERR: ' + e.message));
    pg.on('console', m => { if (m.type() === 'error' && /预览|织体|节奏型|nx|flow/.test(m.text())) errs.push((o.tag || '') + ' CONSOLE: ' + m.text()); });
    await pg.goto(o.url || URL0); await pg.waitForTimeout(o.boot || 1200);
    if (o.help !== false) await pg.evaluate(HELP).catch(e => errs.push('HELP: ' + e.message));
    return pg;
  };
  const close = pg => pg._ctx.close().catch(() => {});
  const EV = (pg, f, a) => pg.evaluate(f, a).catch(e => ({ __err: e.message.split('\n')[0] }));
  const wait = (pg, ms) => pg.waitForTimeout(ms);
  const raf = pg => EV(pg, () => __raf2());
  const shot = async (pg, name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, name + '.png') }).catch(() => {}); };
  const SAFE = async (id, name, fn) => { try { await fn(); } catch (e) { T(id, false, name + ' 执行异常', e.message.split('\n')[0]); } };
  const center = async (pg, sel) => { const e = await pg.$(sel); if (!e) return null; const r = await e.boundingBox(); return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; };
  const away = async pg => { await pg.mouse.move(700, 880); await wait(pg, 60); };
  /* 场景：返回要悬停的选择器 */
  const SCN = {
    fill: async pg => { await EV(pg, async () => { __new('JG'); __mel(); await __raf2(); return 1; }); await wait(pg, 650); return '#flw-sb-go'; },
    gap: async pg => { await EV(pg, async () => { __new('JG'); __mel([0, 1, 2, 3, 4]); fillAccompaniment('block', true); __mel([5, 6, 7]); await __raf2(); return 1; }); await wait(pg, 650); return '#flw-sb-go'; },
    tex: async pg => { await EV(pg, async () => { __new('JG'); __mel(); fillAccompaniment('block', true); await __raf2(); await new Promise(r => setTimeout(r, 650)); $i('flw-sb-go').click(); await __raf2(); return 1; }); await wait(pg, 300); return '#flw-nx-tbar [role="option"][data-v="arp8"]'; },
    texgen: async pg => { await EV(pg, async () => { __new('CG'); mutate(() => { song.measures.forEach(m => { m.voxes[0][0].chord = 'C'; }); }); await __raf2(); return 1; }); await wait(pg, 650); return '#flw-sb-go'; },
    rhy: async pg => { await EV(pg, async () => { __new('JT', { meta: { pen: 'J' } }); __mel(); mutate(() => { song.measures.forEach(m => { m.tabs[0][0].notes = [{ s: 2, f: 1 }]; }); }); await __raf2(); await new Promise(r => setTimeout(r, 650)); $i('flw-sb-go').click(); await __raf2(); return 1; }); await wait(pg, 300); return '#flw-nx-rbar [role="option"]'; },
    teach: async pg => { await EV(pg, async () => { __new('JG'); __mel(); FLOW.nx.act('nx:out', { dataset: { v: 'teach' } }, { detail: 1 }); await __raf2(); return 1; }); await wait(pg, 650); return '#flw-sb-go'; }
  };
  const hover = async (pg, sel, ms) => { const c = await center(pg, sel); if (!c) return false; await pg.mouse.move(c.x - 3, c.y - 3); await pg.mouse.move(c.x, c.y); await wait(pg, ms == null ? 450 : ms); await raf(pg); return true; };

  /* ================= PV1 / PV2 零副作用 ================= */
  if (want('PV1') || want('PV2')) await SAFE('PV1', 'PV1', async () => {
    const pg = await open(1440, 900, { tag: 'PV1' });
    for (const [nm, fn] of Object.entries(SCN)) {
      const sel = await fn(pg);
      await EV(pg, () => { window.__cb0 = colBoxes; window.__evN = 0; window.__toastN = 0; return 1; });
      const s0 = await EV(pg, () => __snap());
      const shows = [];
      for (let i = 0; i < 3; i++) { await hover(pg, sel); shows.push(await EV(pg, () => __pv())); const si = await EV(pg, () => __snap()); if (J(si) !== J(s0)) shows.push({ diff: si }); await away(pg); }
      const s1 = await EV(pg, () => __snap());
      const shown = shows.filter(x => x && x.st === 'on').length;
      const expShown = nm === 'teach' ? 0 : 3;
      const diff = Object.keys(s0).filter(k => J(s0[k]) !== J(s1[k]));
      T('PV1', shown === expShown && !diff.length && !shows.some(x => x && x.diff), 'PV1 ' + nm + '：悬停 ' + (expShown ? '3 次都出预览' : '不出预览（↗ 新窗口产出）') + '，song / 撤销 / 重做 / 本机键 / 落盘 / 窗口条目 / LB_META / colBoxes / #score / 标题 / 埋点 / 提示条全不变',
        J({ shown, diff: diff.map(k => k + ':' + J([s0[k], s1[k]])), mid: shows.filter(x => x && x.diff).length }));
      await EV(pg, () => { __shut(); return 1; });
    }
    /* PV2 */
    await SCN.fill(pg);
    const u = await EV(pg, () => { mutate(() => { song.measures[0].voxes[0][0].deg = 7; }); return { s: JSON.stringify(song), prev: undoStack[undoStack.length - 1] }; });
    for (let i = 0; i < 3; i++) { await hover(pg, '#flw-sb-go'); await away(pg); }
    await EV(pg, () => { document.activeElement && document.activeElement.blur(); return 1; });
    await pg.keyboard.press('Control+z'); await raf(pg);
    const u2 = await EV(pg, () => JSON.stringify(song));
    T('PV2', u2 === u.prev, 'PV2 悬停预览 3 次后 Ctrl+Z 撤的是预览前最后一次真实操作（第 1 小节第 1 音改 7）', u2.length + ' vs ' + u.prev.length);
    await close(pg);
  });

  /* ================= PV3 成品无预览层 ================= */
  if (want('PV3')) await SAFE('PV3', 'PV3', async () => {
    const pg = await open(1440, 900, { tag: 'PV3' });
    await SCN.fill(pg);
    await EV(pg, () => { window.__png = null; window.svgPngDownload = (xml) => { window.__png = xml; }; return 1; });
    const sample = async () => EV(pg, async () => {
      const o = {};
      exportPNG(2); o.png = __png || '';
      o.xml = exportMusicXML() || ''; o.mid = Array.from(exportMIDI().bytes).join(',');
      o.card = (typeof buildShareCardSVG === 'function') ? buildShareCardSVG() : '';
      o.song = JSON.stringify(song);
      try { const pl = partsPlan(song); const p = (pl.parts || [])[0]; if (p) { const r = partRender(p); o.part = r && r.svg ? (r.svg.outerHTML || String(r.svg)) : JSON.stringify(r && Object.keys(r)); } } catch (e) { o.part = 'ERR ' + e.message; }
      return o; });
    await hover(pg, '#flw-sb-go'); const on = await EV(pg, () => __pv());
    const a = await sample();
    await away(pg); const b2 = await sample();
    const bad = Object.keys(a).filter(k => a[k] !== b2[k]);
    const leak = Object.keys(a).filter(k => /flw-nx|--nx-pv/.test(a[k] || ''));
    T('PV3', on && on.st === 'on' && !bad.length && !leak.length && a.png.length > 1000, 'PV3a 预览显示中取样（PNG 串 · MusicXML · MIDI · 分享卡 SVG · song · 分谱）与隐藏时逐字节相同、不含 flw-nx / --nx-pv', J({ on, bad, leak, png: a.png.length }));
    await hover(pg, '#flw-sb-go');
    /* 切到打印媒体本身会让指针「离开」主按钮（布局变了）→ 预览按 leave / resize 收起；这里要测的是打印 CSS 这道保险：
       在打印媒体下把层强制成「还在显示」（data-st=on、未 hidden）再读计算样式，读完还原 */
    await pg.emulateMedia({ media: 'print' }); await raf(pg);
    const pm = await EV(pg, () => { const e = $i('flw-nx-pv'); if (!e) return { st: null };
      const st0 = e.dataset.st, h0 = e.hidden; e.dataset.st = 'on'; e.hidden = false;
      const o = { st: e.dataset.st, disp: getComputedStyle(e).display, st0 }; e.dataset.st = st0; e.hidden = h0; return o; });
    await pg.emulateMedia({ media: 'screen' });
    T('PV3', pm.st === 'on' && pm.disp === 'none', 'PV3b 打印媒体下（预览层还在显示）#flw-nx-pv display:none（打印 CSS 保险）', J(pm));
    const pr = await EV(pg, async () => { window.dispatchEvent(new Event('beforeprint')); await __raf2(); const h = ($i('print-pages') || {}).innerHTML || ''; const st = $i('flw-nx-pv').dataset.st; window.dispatchEvent(new Event('afterprint')); await __raf2(); return { leak: /flw-nx|nx-pv/.test(h), n: h.length, st }; });
    T('PV3', !pr.leak && pr.st !== 'on', 'PV3c beforeprint：预览收起、#print-pages 不含预览层', J(pr));
    await away(pg);
    const th = await EV(pg, async () => { const one = () => new Promise(r => buildThumbCanvas(song, c => r(c.toDataURL().length + ':' + __h(c.toDataURL())), () => r('fail')));
      const a = await one(); return { a }; });
    await hover(pg, '#flw-sb-go');
    const th2 = await EV(pg, async () => { const one = () => new Promise(r => buildThumbCanvas(song, c => r(c.toDataURL().length + ':' + __h(c.toDataURL())), () => r('fail'))); return one(); });
    T('PV3', th.a !== 'fail' && th.a === th2, 'PV3d 缩图 buildThumbCanvas：预览显示中与隐藏时结果相同', J([th.a, th2]));
    await hover(pg, '#flw-sb-go');
    const sn = await EV(pg, async () => { setMode('engrave'); await new Promise(r => setTimeout(r, 500)); const pv = $i('pv-pages') || $i('preview-ov'); const h = pv ? pv.innerHTML : ''; const st = $i('flw-nx-pv').dataset.st; setMode('write'); await __raf2(); return { leak: /flw-nx|nx-pv/.test(h), st, n: h.length }; });
    T('PV3', !sn.leak && sn.st !== 'on', 'PV3e 切排版模式：预览收起、排版快照不含预览层', J(sn));
    await close(pg);
  });

  /* ================= PV4 一致 ================= */
  if (want('PV4')) await SAFE('PV4', 'PV4', async () => {
    const pg = await open(1440, 900, { tag: 'PV4' });
    for (const nm of ['fill', 'tex', 'texgen']) {
      const sel = await SCN[nm](pg);
      await hover(pg, sel);
      const pv = await EV(pg, () => { const P = FLOW.nx.pv._P; const svg = document.querySelector('#flw-nx-pv svg'); return { st: (__pv() || {}).st, dst: P.mounted ? JSON.stringify(P.mounted.res.dst) : '', svg: svg ? svg.innerHTML : '' }; });
      const c = await center(pg, sel); await pg.mouse.click(c.x, c.y); await raf(pg);
      const w = await EV(pg, async () => { const s = JSON.stringify(song); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; blurSel = true; measureRange = null; selRange = null; render(); await __raf2();
        const sv = $i('score').cloneNode(true); ['#playhead', '#playline'].forEach(q => { const e = sv.querySelector(q); if (e) e.remove(); });
        [...sv.querySelectorAll('.pgbrk-mk')].forEach(e => e.remove());
        return { s, svg: sv.innerHTML }; });
      T('PV4', pv.st === 'on' && pv.dst === w.s && pv.svg === w.svg, 'PV4 ' + nm + '：写入后 song＝预览谱（逐字节）、#score 内容（中性选区、去播放头）＝预览 svg', J({ st: pv.st, song: pv.dst === w.s, svg: pv.svg === w.svg, a: pv.svg.length, b: w.svg.length }));
      await EV(pg, () => { __shut(); return 1; });
    }
    await close(pg);
  });

  /* ================= PV5 / PV6 角标与着色几何 ================= */
  if (want('PV5') || want('PV6')) for (const [w, h] of [[1180, 800], [1280, 800], [1440, 900], [1920, 1080]]) await SAFE('PV5', 'PV5 ' + w, async () => {
    const pg = await open(w, h, { tag: 'PV5-' + w });
    for (const nm of ['fill', 'gap', 'tex']) {
      const sel = await SCN[nm](pg);
      await hover(pg, sel, 500);
      const g = await EV(pg, () => { const pv = __pv(), tag = document.querySelector('#flw-nx-pv .flw-nx-tag'); if (!pv || pv.st !== 'on') return { pv };
        const tr = tag.getBoundingClientRect(), r = { l: tr.left, t: tr.top, r: tr.right, b: tr.bottom }, ink = __ink();
        const cov = ['flw-sbar', 'flw-nx-tbar', 'flw-nx-rbar'].map($i).filter(e => e && __vis(e)).map(e => { const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom }; });
        const sw = $i('score-wrap').getBoundingClientRect();
        const P = FLOW.nx.pv._P, m = P.mounted;
        return { pv, area: __area(r, ink), nInk: ink.length, cov: __area(r, cov), inView: r.l >= 0 && r.r <= innerWidth && r.t >= sw.top && r.b <= Math.min(sw.bottom, innerHeight), text: tag.textContent, want: '预览 ' + (m.m1 + 1) + (m.m2 > m.m1 ? '–' + (m.m2 + 1) : ''), where: tag.dataset.where }; });
      T('PV5', g.pv && g.pv.st === 'on' && g.area === 0 && g.nInk > 50 && g.cov === 0 && g.inView && g.text === g.want, 'PV5 ' + w + ' ' + nm + '：角标「' + g.text + '」与墨迹相交面积 0、不被悬浮条 / 织体条遮、在可视区内、文字＝范围', J(g));
      if (nm !== 'tex' && w === 1440) {
        const t6 = await EV(pg, () => { const P = FLOW.nx.pv._P, m = P.mounted, svg = P.svg, R = svg.getBoundingClientRect(), k = R.width / m.out.w, bx = m.out.boxes;
          const box = q => ({ l: R.left + q.x * k, t: R.top + q.y * k, r: R.left + (q.x + q.w) * k, b: R.top + (q.y + q.h) * k });
          const tints = [...document.querySelectorAll('#flw-nx-pv .flw-nx-tint')].map(e => { const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom }; });
          /* 变化列：预览谱与当前谱逐列不同的 v / t 列 */
          const chg = [], keep = [];
          m.res.dst.measures.forEach((mb, mi) => { (mb.voxes || []).forEach((row, vi) => (row || []).forEach((c, ci) => { const c0 = ((song.measures[mi].voxes || [])[vi] || [])[ci]; const k2 = 'v' + vi + ':' + mi + ':' + ci; if (!bx[k2]) return;
            if (JSON.stringify(c) !== JSON.stringify(c0)) { const q = box(bx[k2]); const only = c0 && JSON.stringify(Object.assign({}, c, { chord: undefined, chords: undefined })) === JSON.stringify(Object.assign({}, c0, { chord: undefined, chords: undefined }));
              chg.push(only ? { l: q.l - 3 * k, t: q.t - 19 * k, r: q.r + 3 * k, b: q.t + 1 } : { l: q.l - 3 * k, t: q.t - 3 * k, r: q.r + 3 * k, b: q.b + 3 * k }); }
            else if (c && c.deg > 0) keep.push(box(bx[k2])); })); });
          const inU = t => { const cx = (t.l + t.r) / 2, cy = (t.t + t.b) / 2; return chg.some(c => cx >= c.l - 1 && cx <= c.r + 1 && cy >= c.t - 1 && cy <= c.b + 1); };
          const outside = tints.filter(t => !inU(t)).length;
          const hitKeep = tints.reduce((s, t) => s + __area(t, keep.map(q => ({ l: q.l + 1, t: q.t + 1, r: q.r - 1, b: q.b - 1 }))), 0);
          return { n: tints.length, chg: chg.length, outside, hitKeep: Math.round(hitKeep) }; });
        T('PV6', t6.n > 0 && t6.outside === 0 && t6.hitKeep === 0, 'PV6 ' + nm + '：淡紫区都落在变化列框内（和弦名只染和弦名带）、不压未变化的旋律音', J(t6));
      }
      if (w === 1440 && nm === 'fill') await shot(pg, 'pv-fill-1440');
      await away(pg); await EV(pg, () => { __shut(); return 1; });
    }
    await close(pg);
  });

  /* ================= PV7 性能 ================= */
  if (want('PV7') && process.env.PV_PERF !== '0') await SAFE('PV7', 'PV7', async () => {
    const pg = await open(1440, 900, { tag: 'PV7' });
    const cdp = await pg.context().newCDPSession(pg);
    const mk = async (n, k, dense) => { await EV(pg, async ({ n, k, dense }) => { __new(k || 'JG', { nMea: n });
      if (dense) mutate(() => { song.measures.forEach((m, mi) => { m.voxes[0] = Array.from({ length: 8 }, (_, i) => __V(((mi * 5 + i) % 7) + 1, 8, { lyrics: ['字'] })); }); }); else __mel(); await __raf2(); return 1; }, { n, k, dense }); await wait(pg, 650); };
    /* d＝T_first（shown − arm − 400）；rd＝arm→ready（四块计算的墙钟，F3：同时报告）；st.t.wall 同口径 */
    const trial = async (cold) => { if (cold) await EV(pg, () => { FLOW.nx.pv.release(); return 1; });
      await EV(pg, () => { performance.clearMarks(); return 1; });
      const ok = await hover(pg, '#flw-sb-go', 700);
      const t = await EV(pg, () => { const g = n => performance.getEntriesByName(n).pop(), a = g('nx-pv-arm'), s = g('nx-pv-shown'), r = g('nx-pv-ready');
        return { d: a && s ? s.startTime - a.startTime - 400 : null, rd: a && r ? Math.round(r.startTime - a.startTime) : null, st: FLOW.nx.pv.stats() }; });
      await away(pg); return t; };
    await mk(32);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await trial(true);
    const cold = [], hot = [];
    for (let i = 0; i < 5; i++) { cold.push(await trial(true)); }
    for (let i = 0; i < 5; i++) { hot.push(await trial(false)); }
    const med = a => { const v = a.map(x => x.d).filter(x => x != null).sort((p, q) => p - q); return v.length ? v[Math.floor(v.length / 2)] : null; };
    const mc = med(cold), mh = med(hot);
    console.log('ℹ️ PV7 32 小节 4×：首次 ' + J(cold.map(x => x.d && Math.round(x.d))) + ' arm→ready ' + J(cold.map(x => x.rd)) + ' 模式 ' + J(cold.map(x => x.st.mode)) + ' 缓存 ' + J(hot.map(x => x.d && Math.round(x.d))) + ' 分块 ' + J(cold[0] && cold[0].st.t));
    T('PV7', mc != null && mc <= 120 && cold.every(x => x.d != null), 'PV7a 32 小节钢琴伴奏歌谱（4× CPU）首次预览 T_first 中位 ≤120ms，5 次都出预览', J({ mc, d: cold.map(x => x.d) }));
    T('PV7', mh != null && mh <= 30 && hot.every(x => x.st.hit), 'PV7b 同键第二次悬停（节点已挂载，只切可见）T_cache 中位 ≤30ms', J({ mh, hit: hot.map(x => x.st.hit) }));
    /* v69.0 收尾 REG-3：同一窗口连续悬停 8 次（每次 release，4×）都出预览——不再「每个窗口只出一次、随后永久关闭」 */
    const seq = []; for (let i = 0; i < 8; i++) seq.push(await trial(true));
    T('PV7', seq.every(x => x.d != null && x.st.mode !== 'off'), 'PV7f 同一窗口 4× 连续悬停 8 次都出预览（缺省预算不再单向棘轮：超预算先改走可见行，连续 2 次可见行仍超才退化）', J(seq.map(x => [x.d && Math.round(x.d), x.st.mode])));
    /* F3：稠密 32 小节（八分 + 歌词，钢琴弹唱 SJG）4×：热身后首次中位 ≤120（超预算的整谱一次后改走可见行），5 次都出预览 */
    await mk(32, 'SJG', true); await trial(true);
    const dn = []; for (let i = 0; i < 5; i++) dn.push(await trial(true));
    const md = med(dn);
    console.log('ℹ️ PV7 稠密 SJG 32 小节 4×：首次 ' + J(dn.map(x => x.d && Math.round(x.d))) + ' arm→ready ' + J(dn.map(x => x.rd)) + ' 模式 ' + J(dn.map(x => x.st.mode)));
    T('PV7', md != null && md <= 120 && dn.every(x => x.d != null), 'PV7g 稠密 32 小节（八分音符 + 歌词，SJG，4×）热身后 T_first 中位 ≤120ms、5 次都出预览（整谱超预算即改走可见行）', J({ md, d: dn.map(x => x.d), rd: dn.map(x => x.rd), mode: dn.map(x => x.st.mode) }));
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    /* F4：退化记录按窗口——重谱之后换一份 8 小节的新谱（新窗口），1× 下照样整谱预览（不被上一窗口的 win 粘住） */
    await mk(8); const w8 = await trial(true);
    T('PV7', w8.st.mode === 'full' && w8.d != null, 'PV7h 稠密谱改走可见行之后，新窗口 8 小节谱（1×）仍按整谱预览（预算记录按窗口，不是整页单向棘轮）', J(w8.st));
    await mk(80); const w80 = await trial(true);
    T('PV7', w80.st.mode === 'win' && w80.st.st === 'shown' || w80.st.mode === 'win', 'PV7c 80 小节只预览可见行（stats().mode＝win）', J(w80.st));
    await mk(32); await EV(pg, () => { window.__nxBudget = 1; return 1; });
    const off = await trial(true);
    const offPv = await EV(pg, () => __pv());
    await wait(pg, 650);
    const c = await center(pg, '#flw-sb-go'); await pg.mouse.click(c.x, c.y); await raf(pg);
    const after = await EV(pg, () => ({ acc: lbHasNote(song, 1), undo: (document.querySelector('#toast .flw-ta') || {}).textContent || '' }));
    await EV(pg, () => { delete window.__nxBudget; return 1; });
    T('PV7', off.st.mode === 'off' && !(offPv && offPv.st === 'on') && after.acc && after.undo === '撤销', 'PV7d 超预算（__nxBudget=1）退化：stats().mode＝off、不出预览层、点了照常写入、提示条带「撤销」', J({ st: off.st, offPv, after }));
    await mk(200); const o200 = await trial(true);
    T('PV7', o200.st.mode === 'off' || o200.st.mode === 'win', 'PV7e 200 小节：只预览可见行或退化（mode win / off），不卡主线程', J(o200.st));
    await close(pg);
  });

  /* ================= PV8 偏好 ================= */
  if (want('PV8')) await SAFE('PV8', 'PV8', async () => {
    const pg = await open(1440, 900, { tag: 'PV8-off', init: () => { try { localStorage.setItem('musetab-preview', '0'); } catch (_) {} } });
    const sel = await SCN.fill(pg); await hover(pg, sel);
    const a = await EV(pg, () => ({ pv: __pv(), en: FLOW.nx.pv.enabled() }));
    T('PV8', a.en === false && !(a.pv && a.pv.st === 'on'), 'PV8a musetab-preview=\'0\' 开机即不预览', J(a));
    await close(pg);
    const p2 = await open(1440, 900, { tag: 'PV8' });
    const k0 = await EV(p2, () => __keys());
    const r = await EV(p2, async () => { showPrefs(); const row = document.querySelector('.prf-row[data-prf="preview"]'); if (!row) return { row: false };
      const t = row.textContent; row.click(); const v1 = localStorage.getItem('musetab-preview'), c1 = row.getAttribute('aria-checked'); row.click(); const v2 = localStorage.getItem('musetab-preview'); closeModal();
      return { row: true, t, v1, c1, v2 }; });
    T('PV8', r.row && /停留预览/.test(r.t) && r.v1 === '0' && r.c1 === 'false' && r.v2 === null, 'PV8b 偏好设置「停留预览」：关＝写 musetab-preview=\'0\'，开＝删键', J(r));
    const sel2 = await SCN.fill(p2);
    /* 悬停 / 预览本身不写偏好键：musetab-preview 只由偏好开关写（上面 PV8b 已回到「开」＝无键），悬停两轮后仍无键 */
    const pvk0 = await EV(p2, () => localStorage.getItem('musetab-preview'));
    let shown = 0; for (let i = 0; i < 2; i++) { await hover(p2, sel2); shown += (await EV(p2, () => { const p = __pv(); return p && p.st === 'on' ? 1 : 0; })); await away(p2); }
    const pvk1 = await EV(p2, () => localStorage.getItem('musetab-preview'));
    await EV(p2, () => { FLOW.sbar.toggle({ exp: false }); FLOW.sbar.toggle({ exp: true }); return 1; });
    const k1 = await EV(p2, () => __keys());
    const extra = k1.filter(k => !k0.includes(k));
    T('PV8', extra.every(k => k === 'musetab-sbar' || k === 'musetab-preview' || /^musetab-(docs|song|library)/.test(k)) && shown === 2 && pvk0 === null && pvk1 === null,
      'PV8c 全程 musetab-* 新键 ⊆ {musetab-sbar, musetab-preview}（文档 / 落盘键除外）；悬停出预览 2 次不写 musetab-preview（只有偏好开关写）', J({ extra, shown, pvk0, pvk1 }));
    await close(p2);
  });

  /* ================= PV9 / PV10 生命周期与不跳版面 ================= */
  if (want('PV9') || want('PV10')) await SAFE('PV9', 'PV9', async () => {
    const pg = await open(1440, 900, { tag: 'PV9' });
    let sel = await SCN.fill(pg);
    await hover(pg, sel, 250); const early = await EV(pg, () => __pv()); await away(pg); await wait(pg, 300);
    const early2 = await EV(pg, () => __pv());
    T('PV9', !(early && early.st === 'on') && !(early2 && early2.st === 'on'), 'PV9a 悬停 <400ms 就离开：不出预览', J([early, early2]));
    const geo = () => EV(pg, () => { const r = e => { const q = $i(e).getBoundingClientRect(); return [q.left, q.top, q.width, q.height].map(v => Math.round(v * 10) / 10); }; return { sh: $i('score-wrap').scrollHeight, p: r('paper'), s: r('score') }; });
    const g0 = await geo(); await hover(pg, sel); const g1 = await geo(); const on1 = await EV(pg, () => __pv());
    const dd = (a, c) => a.p.concat(a.s).some((v, i) => Math.abs(v - c.p.concat(c.s)[i]) >= 0.5) || Math.abs(a.sh - c.sh) >= 0.5;
    T('PV10', on1 && on1.st === 'on' && !dd(g0, g1), 'PV10 预览显示前后 #score-wrap.scrollHeight、#paper / #score 矩形相差 <0.5px（不跳版面）', J([g0, g1]));
    const ends = {
      key: async () => { await pg.keyboard.press('ArrowRight'); },
      scroll: async () => { await EV(pg, () => { $i('score-wrap').scrollTop += 40; return 1; }); await wait(pg, 60); },
      mode: async () => { await EV(pg, () => { setMode('engrave'); return 1; }); await wait(pg, 60); },
      modal: async () => { await EV(pg, () => { showModal('<h3>x</h3><div class="btns"><button>ok</button></div>'); return 1; }); await wait(pg, 60); },
      doc: async () => { await EV(pg, () => { const s = NWB.build('J', { title: 'z', nMea: 2 }); addDoc(s, () => {}); return 1; }); await wait(pg, 60); },
      resize: async () => { await pg.setViewportSize({ width: 1400, height: 900 }); await wait(pg, 120); },
      play: async () => { await EV(pg, () => { try { $i('b-play').click(); } catch (_) {} return 1; }); await wait(pg, 80); }
    };
    for (const [nm, fn] of Object.entries(ends)) {
      sel = await SCN.fill(pg); await hover(pg, sel); const a = await EV(pg, () => __pv());
      await fn(); await raf(pg); const z = await EV(pg, () => __pv());
      T('PV9', a && a.st === 'on' && !(z && z.st === 'on'), 'PV9 ' + nm + '：显示中的预览收起', J([a && a.st, z && z.st]));
      await EV(pg, () => { try { stopPlay(); } catch (_) {} try { closeModal(); } catch (_) {} setMode('write'); return 1; }); await pg.setViewportSize({ width: 1440, height: 900 }); await away(pg);
    }
    await close(pg);
  });

  /* ================= PV11 旧外壳 / ?next=0 ================= */
  if (want('PV11')) await SAFE('PV11', 'PV11', async () => {
    for (const [q, nm] of [['next=0', '?next=0'], ['shell=classic', '?shell=classic']]) {
      const pg = await open(1440, 900, { url: withQ(URL0, q), tag: 'PV11' + q });
      const r = await EV(pg, async () => { __new('JG'); __mel(); await __raf2(); return 1; }); await wait(pg, 650);
      const g = await pg.$('#flw-sbar [data-fa="sbar:go"], #lb-wrap .lb-go'); if (g) { const bb = await g.boundingBox(); if (bb) { await pg.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await wait(pg, 500); } }
      const n = await EV(pg, () => ({ ids: [...document.querySelectorAll('[id^="flw-nx-"]')].map(e => e.id), go: !!$i('flw-sb-go') }));
      T('PV11', !n.ids.length && !n.go, 'PV11 ' + nm + '：没有 #flw-nx-* 节点、悬停无反应、没有实底主按钮', J(n));
      await close(pg);
    }
  });

  /* ================= PV12 yWin + 正常渲染零变化 ================= */
  if (want('PV12')) await SAFE('PV12', 'PV12', async () => {
    const pg = await open(1440, 900, { tag: 'PV12' });
    const r = await EV(pg, async () => { __new('JG', { nMea: 40 }); __mel(); fillAccompaniment('block', true); await __raf2();
      const mk = () => document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const a = mk(), b2 = mk();
      const oa = renderOffscreen({ song, target: a, paperW: LAST_PAPER_W, fixed: true, crop: false });
      const g = oa.sysGeo, y0 = g[3].y0 - 1, y1 = g[5].y1 + 1;
      const ob = renderOffscreen({ song, target: b2, paperW: LAST_PAPER_W, fixed: true, crop: false, yWin: [y0, y1] });
      const A = [...a.children].map(e => e.outerHTML), B = [...b2.children].map(e => e.outerHTML);
      const cnt = {}; A.forEach(x => { cnt[x] = (cnt[x] || 0) + 1; });
      const extra = B.filter(x => { if (!cnt[x]) return true; cnt[x]--; return false; }).length;
      const inWin = Object.keys(ob.boxes).filter(k => { const q = ob.boxes[k]; return q.y >= y0 - 200 && q.y <= y1 + 200; });
      const boxSame = inWin.every(k => JSON.stringify(oa.boxes[k]) === JSON.stringify(ob.boxes[k]));
      return { nA: A.length, nB: B.length, extra, boxSame, nIn: inWin.length, vb: [a.getAttribute('viewBox'), b2.getAttribute('viewBox')] }; });
    T('PV12', r.extra === 0 && r.nB < r.nA && r.boxSame && r.nIn > 10 && r.vb[0] === r.vb[1], 'PV12a renderOffscreen yWin：只画窗口内谱行（元素少于整谱），每个元素都与整谱输出逐字节相同，窗口内 colBoxes 相同、viewBox 相同', J(r));
    if (BASEU) {
      const grab = async (url, tag) => { const p = await open(1440, 900, { url, tag });
        const o = await EV(p, async () => { const out = []; for (const n of ['送别', '小星星', '欢乐颂']) { const ps = PRESETS.find(x => x.name.indexOf(n) >= 0); if (!ps) continue; __one(migrate(ps.make())); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; blurSel = true; render(); await __raf2(); out.push(n + ':' + __h($i('score').innerHTML)); } return out; });
        await close(p); return o; };
      const x = await grab(URL0, 'PV12-a'), y = await grab(BASEU, 'PV12-base');
      T('PV12', x.length >= 2 && J(x) === J(y), 'PV12b 正常 render 的 #score 与基线（' + BASE_SHORT + '）逐字节相同（yWin 不进正常渲染路径）', J({ x, y }));
    } else if (IN_CI) T('PV12', false, 'PV12b CI 里拿不到对拍基线（git show ' + BASE_SHORT + ' 失败；deploy.yml 应按 next_ref.json 补取），判红');
    else NOTE('PV12', '⚠️ 没有基线页，PV12b 跳过（本地）');
    await close(pg);
  });

  /* ================= PV13 织体条 / 节奏型条 ================= */
  if (want('PV13')) await SAFE('PV13', 'PV13', async () => {
    const pg = await open(1440, 900, { tag: 'PV13' });
    const cnt = await EV(pg, async () => { const o = {};
      for (const [k, bt, u] of [['44', 4, 4], ['34', 3, 4], ['24', 2, 4], ['68', 6, 8]]) {
        __new('JG', { b: { beats: bt, unit: u } }); __mel(); fillAccompaniment(texAvail(bt, u)[0].id, true); await __raf2(); __shut();
        FLOW.nx.tbar.open({ src: 'test', mode: 'tex' }); await __raf2();
        const cards = [...document.querySelectorAll('#flw-nx-tbar [role="option"]')];
        o[k] = { n: cards.length, more: (document.querySelector('#flw-nx-tbar .flw-nx-more b') || {}).textContent || '', names: cards.map(c => c.querySelector('.flw-nx-nm').textContent), sel: cards.filter(c => c.getAttribute('aria-selected') === 'true').map(c => c.dataset.v), tex: song.texId };
        if (k === '44') { document.querySelector('#flw-nx-tbar .flw-nx-more').click(); await __raf2(); o.all = document.querySelectorAll('#flw-nx-tbar [role="option"]').length; }
        FLOW.nx.tbar.close(false);
      } return o; });
    const L = t => [...String(t)].length;
    const allNames = Object.values(cnt).filter(x => x && x.names).flatMap(x => x.names);
    T('PV13', cnt['44'].n === 6 && cnt['44'].more === '15' && cnt.all === 15 && cnt['34'].n === 2 && cnt['24'].n === 3 && cnt['68'].n === 2 && allNames.every(n => L(n) <= 6) && J(cnt['44'].sel) === J([cnt['44'].tex]),
      'PV13a 织体条卡数：4/4 推荐 6 张 +「全部 15」（展开 15）、3/4 2、2/4 3、6/8 2；短名 ≤6 字（保留标准名）；当前织体卡 aria-selected', J(cnt));
    /* 缩略图、键盘、试听、写入 */
    await EV(pg, async () => { __new('JG'); __mel(); fillAccompaniment('block', true); await __raf2(); __shut(); return 1; }); await wait(pg, 650);
    await EV(pg, () => { $i('flw-sb-go').focus(); return 1; }); await pg.keyboard.press('Enter'); await wait(pg, 1500);
    const k1 = await EV(pg, () => ({ open: FLOW.nx.tbar.isOpen(), ae: document.activeElement && document.activeElement.getAttribute('role'), v: document.activeElement && document.activeElement.dataset.v,
      th: [...document.querySelectorAll('#flw-nx-tbar [role="option"] .flw-nx-th')].filter(t => t.querySelector('svg.pq-offscore')).length }));
    T('PV13', k1.open && k1.ae === 'option' && k1.th === 6, 'PV13b 键盘打开织体条：焦点落在卡上、6 张缩略图都是真实刻版（svg.pq-offscore）', J(k1));
    await pg.keyboard.press('ArrowRight'); const k2 = await EV(pg, () => ({ v: document.activeElement.dataset.v, mi: sel.mi, ci: sel.ci }));
    const s0 = await EV(pg, () => ({ s: JSON.stringify(song), pl: !!(audio && audio.playing), mi: sel.mi, ci: sel.ci }));
    await pg.keyboard.press('Space'); await wait(pg, 200);
    const s1 = await EV(pg, () => ({ s: JSON.stringify(song), pl: !!(audio && audio.playing), mi: sel.mi, ci: sel.ci, btn: (document.querySelector('#flw-nx-tbar .flw-nx-play[aria-pressed="true"]') || {}).dataset }));
    T('PV13', k2.v && k2.v !== k1.v && s1.s === s0.s && s1.pl === false && s1.mi === s0.mi && s1.ci === s0.ci && s1.btn, 'PV13c ←→ 在卡间移焦点（不动谱面光标）；空格＝▶ 试听：song / audio.playing / 光标都不变', J({ k1: k1.v, k2: k2.v, pl: s1.pl, btn: !!s1.btn }));
    await pg.keyboard.press('Enter'); await raf(pg);
    const e = await EV(pg, () => ({ open: FLOW.nx.tbar.isOpen(), tex: song.texId, nx: FLOW.sbar.model().nx.id, ae: document.activeElement && document.activeElement.id }));
    T('PV13', !e.open && e.tex === k2.v && e.nx === 'engrave' && e.ae === 'flw-sb-go', 'PV13d Enter＝写入并关闭（焦点回到打开它的主按钮）；起步 ③ 完成、主按钮「排版」', J(e));
    await EV(pg, () => { FLOW.nx.tbar.open({ src: 'test', mode: 'tex' }); return 1; }); await raf(pg);
    const cc = await center(pg, '#flw-nx-tbar [role="option"][data-v="march"]'); await pg.mouse.click(cc.x, cc.y); await raf(pg);
    const m = await EV(pg, () => ({ open: FLOW.nx.tbar.isOpen(), tex: song.texId, sel: (document.querySelector('#flw-nx-tbar [role="option"][aria-selected="true"]') || {}).dataset }));
    T('PV13', m.open && m.tex === 'march' && m.sel && m.sel.v === 'march', 'PV13e 鼠标点卡＝写入、条留着（✓ 移到新卡，便于再比）', J(m));
    await pg.keyboard.press('Escape'); await raf(pg);
    const x = await EV(pg, () => FLOW.nx.tbar.isOpen());
    await EV(pg, () => { FLOW.nx.tbar.open({ src: 'test', mode: 'tex' }); const c = document.querySelector('#flw-nx-tbar [role="option"]'); c.focus(); return 1; });
    await pg.keyboard.press('Escape'); await raf(pg);
    const x2 = await EV(pg, () => FLOW.nx.tbar.isOpen());
    T('PV13', x2 === false, 'PV13f Esc 关闭织体条', J([x, x2]));
    /* 节奏型条 */
    await EV(pg, async () => { __new('JT', { meta: { pen: 'J' } }); __mel(); mutate(() => { song.measures.forEach(m => { m.tabs[0][0].notes = [{ s: 2, f: 1 }]; }); }); await __raf2(); return 1; }); await wait(pg, 650);
    await EV(pg, () => { $i('flw-sb-go').click(); return 1; }); await wait(pg, 1500);
    const rb = await EV(pg, () => { const cs = [...document.querySelectorAll('#flw-nx-rbar [role="option"]')];
      return { open: FLOW.nx.rbar.isOpen(), n: cs.length, names: cs.map(c => c.querySelector('.flw-nx-nm').textContent), full: cs.map(c => c.getAttribute('aria-label')), th: cs.filter(c => c.querySelector('svg.pq-offscore')).length, row: sel.row, lib: !!document.querySelector('#flw-nx-rbar [data-fa="nx:rlib"]'), nw: !!document.querySelector('#flw-nx-rbar [data-fa="nx:rnew"]') }; });
    /* v69.0 收尾 TCH-2 有意迁移：卡名＝标准名全文（两行内由 CSS 收尾，不再在字串上截成 6 字——此前两张卡都显示「532313」），同一条里不重名 */
    T('PV13', rb.open && rb.n >= 4 && rb.names.every((n, i) => n === rb.full[i]) && new Set(rb.names).size === rb.names.length && rb.th >= 2 && rb.row === 'tab' && rb.lib && rb.nw, 'PV13g 吉他弹唱 ③「节奏型」打开节奏型条：按本小节拍号的库内节奏型卡（卡名＝标准名全文、不重名）、刻版缩略图、「全部…」「＋新建」；光标落到六线谱行', J(Object.assign({}, rb, { full: undefined })));
    const c2 = await center(pg, '#flw-nx-rbar [role="option"]'); await pg.mouse.click(c2.x, c2.y); await raf(pg);
    const rw = await EV(pg, () => ({ nx: FLOW.sbar.model().nx.id, t: ($i('toast') || {}).textContent || '', open: FLOW.nx.rbar.isOpen() }));
    /* v69.0 收尾 TCH-5 有意迁移：起步第 ③ 步从主按钮打开节奏型条＝全曲（同织体条；工具入口仍是本小节，tv_next N20） */
    T('PV13', rw.nx === 'engrave' && /已套用节奏型 · 第 1–8 小节/.test(rw.t) && rw.open, 'PV13h 点节奏型卡＝套用（起步第 ③ 步缺省全曲）、提示条「已套用节奏型 · 第 1–8 小节」+ 撤销、③ 完成', J(rw));
    await pg.keyboard.press('Control+z'); await raf(pg);
    const ru = await EV(pg, () => FLOW.sbar.model().nx.id);
    T('PV13', ru === 'rhy', 'PV13i 撤销节奏型后 ③ 回到「节奏型」（操作戳，同 SBAR-14 修法）', ru);
    await close(pg);
  });

  /* ================= v69.0 收尾（验收发现的回归断言；修前副本 f90v/prefix.html 上应红） ================= */
  /* PV14 F8-pv：删掉一个自定义节奏型后，节奏型条同一位置的卡——缩略图换成新的那个、悬停预览＝点下去写入的结果（预览键 / 缩略图键带节奏型内容签名） */
  if (want('PV14')) await SAFE('PV14', 'PV14', async () => {
    const pg = await open(1440, 900, { tag: 'PV14', init: () => { try { localStorage.setItem('musetab-custompat', JSON.stringify({ tab: [
      { name: '自定A 柱式四下', ev: [['c', 4], ['c', 4], ['c', 4], ['c', 4]] },
      { name: '自定B 低音分解', ev: [['b', 8], ['s3', 8], ['s2', 8], ['s1', 8], ['b', 8], ['s3', 8], ['s2', 8], ['s1', 8]] }], vox: [] })); } catch (_) {} } });
    pg.on('dialog', d => d.accept());
    const thOf = v => EV(pg, (v) => __h((document.querySelector('#flw-nx-rbar [data-v="' + v + '"] .flw-nx-th') || {}).innerHTML || ''), v);
    const showC0 = async () => { await EV(pg, () => { const c = document.querySelector('#flw-nx-rbar [role="option"][data-v="c0"]'); c.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return 1; }); await hover(pg, '#flw-nx-rbar [role="option"][data-v="c0"]', 650); };
    await EV(pg, async () => { __new('JT', { meta: { pen: 'J' } }); __mel(); mutate(() => { song.measures.forEach((m, i) => { m.voxes[0][0].chord = ['C', 'Am', 'F', 'G'][i % 4]; m.tabs[0][0].notes = [{ s: 2, f: 1 }]; }); }); await __raf2(); await new Promise(r => setTimeout(r, 650));
      FLOW.nx.rbar.open({ src: 't' }); await __raf2(); return 1; });
    await wait(pg, 1200);
    const thB = await thOf('c1');
    await showC0(); await away(pg);
    /* 走界面：「全部…」→ 节奏型库 → 删第 1 个自定义 → 关库 → 再开节奏型条 */
    await EV(pg, async () => { document.querySelector('#flw-nx-rbar [data-fa="nx:rlib"]').click(); await __raf2(); return 1; }); await wait(pg, 300);
    const del = await EV(pg, async () => { const d = document.querySelector('.cp-del[data-cd="0"]'); if (!d) return 'no-del'; d.click(); await __raf2(); return 'ok'; }); await wait(pg, 300);
    await EV(pg, async () => { closeModal(); await __raf2(); FLOW.nx.rbar.open({ src: 't' }); await __raf2(); return 1; }); await wait(pg, 1200);
    const name = await EV(pg, () => (document.querySelector('#flw-nx-rbar [role="option"][data-v="c0"]') || {}).getAttribute('aria-label'));
    const th1 = await thOf('c0');
    await showC0();
    const pv = await EV(pg, () => { const P = FLOW.nx.pv._P; return { on: (__pv() || {}).st, dst: P.mounted && P.mounted.res && P.mounted.res.dst ? JSON.stringify(P.mounted.res.dst) : '' }; });
    const c = await center(pg, '#flw-nx-rbar [role="option"][data-v="c0"]'); await pg.mouse.click(c.x, c.y); await raf(pg); await wait(pg, 300);
    const w = await EV(pg, () => JSON.stringify(song));
    T('PV14', del === 'ok' && /自定B/.test(name || '') && th1 === thB && pv.on === 'on' && pv.dst === w, 'PV14 删掉自定义节奏型 A 后，同一位置（c0）的卡＝B：缩略图是 B 的、悬停预览谱＝点下去写入的 song（逐字节）',
      J({ del, name, th: [th1, thB], on: pv.on, eq: pv.dst === w }));
    await close(pg);
  });

  /* PV15 F9-pv：换调后再开织体条，缩略图按新调重画（缩略图键含调号 / 拍号 / 记谱法） */
  if (want('PV15')) await SAFE('PV15', 'PV15', async () => {
    const pg = await open(1440, 900, { tag: 'PV15' });
    const th = () => EV(pg, () => __h((document.querySelector('#flw-nx-tbar [role="option"][data-v="arp8"] .flw-nx-th') || {}).innerHTML || ''));
    await EV(pg, async () => { __new('JG'); __mel(); fillAccompaniment('block', true); await __raf2(); FLOW.nx.tbar.open({ src: 't', mode: 'tex' }); return 1; }); await wait(pg, 1500);
    const a = await th();
    await EV(pg, async () => { FLOW.nx.tbar.close(false); mutate(() => { song.key = 'E'; }); await __raf2(); FLOW.nx.tbar.open({ src: 't', mode: 'tex' }); return 1; }); await wait(pg, 1500);
    const b2 = await th();
    await EV(pg, async () => { FLOW.nx.tbar.close(false); mutate(() => { song.key = 'C'; }); await __raf2(); FLOW.nx.tbar.open({ src: 't', mode: 'tex' }); return 1; }); await wait(pg, 1200);
    const c2 = await th();
    T('PV15', a && b2 && a !== b2 && c2 === a, 'PV15 换调（C→E）后织体条缩略图重画、换回 C 又是原来那张（缓存键含调号）', J({ a, b2, c2 }));
    await close(pg);
  });

  /* PV16 TCH-3：与谱面现状相同不预览——悬停带 ✓ 的当前织体卡不出预览；点卡写入后指针不动，不再挂「预览」角标 */
  if (want('PV16')) await SAFE('PV16', 'PV16', async () => {
    const pg = await open(1440, 900, { tag: 'PV16' });
    await EV(pg, async () => { __new('JG'); __mel(); fillAccompaniment('block', true); await __raf2(); await new Promise(r => setTimeout(r, 650)); FLOW.nx.tbar.open({ src: 't', mode: 'tex' }); await __raf2(); return 1; });
    await wait(pg, 400);
    await hover(pg, '#flw-nx-tbar [role="option"][data-v="block"]', 750);
    const cur = await EV(pg, () => ({ pv: (__pv() || {}).st, mode: FLOW.nx.pv.stats().mode }));
    await away(pg);
    await hover(pg, '#flw-nx-tbar [role="option"][data-v="halfbrk"]', 750);
    const h1 = await EV(pg, () => ({ pv: (__pv() || {}).st }));
    const c = await center(pg, '#flw-nx-tbar [role="option"][data-v="halfbrk"]'); await pg.mouse.click(c.x, c.y);
    const tl = []; for (const ms of [150, 600, 1500]) { await wait(pg, ms - (tl.length ? [150, 600, 1500][tl.length - 1] : 0)); tl.push(await EV(pg, () => { const e = $i('flw-nx-pv'); return { on: !!(e && e.dataset.st === 'on' && __vis(e)), tex: song.texId }; })); }
    T('PV16', cur.pv !== 'on' && cur.mode === 'same' && h1.pv === 'on' && tl.every(x => !x.on) && tl[2].tex === 'halfbrk', 'PV16 当前织体卡不预览（与现状相同）；点卡写入后指针不动，150 / 600 / 1500ms 都不再挂「预览」角标', J({ cur, h1, tl }));
    await close(pg);
  });

  /* PV17 F5-pv / F6-pv：织体条「全部 N」展开仍是一排横滚（条高 ≤200、占谱面可视高 ≤45%）；谱面放不下角标时兜底角标在条头空白里，与悬浮条本体 / 条上控件相交面积 0 */
  if (want('PV17')) await SAFE('PV17', 'PV17', async () => {
    const out = [];
    for (const [w, h] of [[1180, 560], [1180, 700], [1440, 900]]) {
      const pg = await open(w, h, { tag: 'PV17-' + w });
      const r = await EV(pg, async () => { __new('JG', { nMea: 16 }); __mel(); fillAccompaniment('block', true); await __raf2(); FLOW.nx.tbar.open({ src: 't', mode: 'tex' }); document.querySelector('#flw-nx-tbar .flw-nx-more').click(); await __raf2();
        const tb = $i('flw-nx-tbar').getBoundingClientRect(), sw = $i('score-wrap').getBoundingClientRect(), sb = $i('flw-sbar').getBoundingClientRect();
        const visTop = Math.max(sw.top, sb.bottom), visBot = Math.min(sw.bottom, innerHeight), cov = Math.max(0, Math.min(tb.bottom, visBot) - Math.max(tb.top, visTop));
        const cards = [...document.querySelectorAll('#flw-nx-tbar [role="option"]')], row = $i('flw-nx-tbar').querySelector('.flw-nx-cards');
        return { h: Math.round(tb.height), pct: Math.round(100 * cov / (visBot - visTop)), rows: new Set(cards.map(c => Math.round(c.getBoundingClientRect().top))).size, n: cards.length, scroll: row.scrollWidth > row.clientWidth }; });
      out.push([w + '×' + h, r]);
      await close(pg);
    }
    T('PV17', out.every(([, r]) => r.h <= 200 && r.pct <= 45 && r.rows === 1 && r.n >= 15 && r.scroll), 'PV17a 「全部 15」展开：一排横滚（条高 ≤200、占谱面可视高 ≤45%），15 张都在条里', J(out));
    /* 兜底：把织体条的下沿撑满谱面（CSS 只在测试里加），逼角标走「谱面外」 */
    const pg = await open(1440, 900, { tag: 'PV17-fb' });
    await EV(pg, async () => { __new('JG', { nMea: 16 }); __mel(); fillAccompaniment('block', true); await __raf2(); FLOW.nx.tbar.open({ src: 't', mode: 'tex' });
      const st = document.createElement('style'); st.textContent = '#flw-nx-tbar{padding-bottom:900px!important}'; document.head.appendChild(st); await __raf2(); return 1; });
    await wait(pg, 300);
    await hover(pg, '#flw-nx-tbar [role="option"][data-v="halfbrk"]', 750);
    const f = await EV(pg, () => { const tag = document.querySelector('#flw-nx-pv .flw-nx-tag'), tb = $i('flw-nx-tagb'); if (!tag || !tb || tb.hidden) return { where: tag && tag.dataset.where, tb: !!tb };
      const q = tb.getBoundingClientRect(), R = { l: q.left, t: q.top, r: q.right, b: q.bottom }, bar = $i('flw-sb-bar').getBoundingClientRect(), hd = document.querySelector('#flw-nx-tbar .flw-nx-hd').getBoundingClientRect();
      const ctl = [...document.querySelectorAll('#flw-sbar button, #flw-sbar [role="option"], #flw-sbar li, #flw-sbar kbd')].filter(e => __vis(e)).map(e => { const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom }; });
      return { where: tag.dataset.where, txt: tb.textContent, barHit: Math.round(__area(R, [{ l: bar.left, t: bar.top, r: bar.right, b: bar.bottom }])), ctlHit: Math.round(__area(R, ctl)), inHd: R.t >= hd.top - 0.5 && R.b <= hd.bottom + 0.5 }; });
    T('PV17', f.where === 'bar' && f.barHit === 0 && f.ctlHit === 0 && f.inHd && /^预览 /.test(f.txt || ''), 'PV17b 谱面放不下角标：兜底角标在织体条条头空白里，与悬浮条本体、条上控件相交面积 0', J(f));
    await close(pg);
  });

  for (const k of Object.keys(OUT)) { console.log('— ' + k + ' —'); OUT[k].forEach(l => console.log('  ' + l)); }
  if (errs.length) { console.log('— 页面错误 —'); errs.slice(0, 20).forEach(e => console.log('  ❌ ' + e)); total += 1; }
  console.log('\nPASS ' + pass + ' / ' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
