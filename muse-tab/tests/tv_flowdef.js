'use strict';
/* v68.2 新外壳切默认（工程计划 flowplan §5.1 / §5.2 / §5.5；方案 docs/design-2026-10f 顶部拍板「v68.2 迁移测试后切成默认上线」）。几何断言优先、真实按键 / 点击，file:// 直载。
   F1  默认 flow：不带参数的新上下文 → body.flow、FLOW.active、本机键 musetab-flow 不写；?shell=classic → 旧外壳、键 '0'、刷新保持、去参数仍旧外壳；
       偏好设置「使用旧版布局」：新外壳里列出且为关，点开 → 键 '0' 并刷新进旧外壳；旧外壳里为开，点关 → 删键并刷新回 flow（带 ?shell=classic 打开时刷新地址去掉参数）；
       （v68.2 集成）file:// 不发 shell:classic 埋点 → 刷新仍按 500ms 口径（点击→新文档导航起点 490–650ms），不因「等上报送达」多等（线上等送达见 tv_uicmd U9）
   F2  老用户迁移：预置 musetab-shell='classic'（v40 经典版开关的历史值，v55.2 起不读）→ 仍是 flow、键原样不动；预置 musetab-flow='1'（预览期用户）→ flow；坏值 → flow
   F3  首次 3 步导览（musetab-tour-shell）：?tour=1 时启动台态不出、离开启动台有谱面 1.5s 后出现；三步锚点（行 1 / 模式条 / 左栏 + 状态栏）几何、文案口径、
       上一步 / 下一步 / ← → / 跳过 / Esc；Esc 后写 '1'、刷新不再出现、导览期间谱与光标不动；「知道了」同样写 '1'；
       不出现：webdriver 默认（不带 ?tour=1）· 手机 390 · 观看页 · 谱架 · 旧外壳 · 弹窗开着（关掉后再出现）；退场（缩到手机宽）只收起不写键、回桌面宽再出现
   F5  旧快捷键在两外壳同效：同一份谱、同一串真实按键（README「老用户迁移」：数字 / QWERTYU / . / D / + − / # b / ~ / x / Insert / Delete / Enter / 空格 /
       Ctrl+Z Y S C V K / Alt+N / Alt+Shift+N / Alt+B / Alt+↑↓ / Tab / Ctrl+滚轮），每步之后 JSON.stringify(song) 在 ?shell=flow 与 ?shell=classic 下逐字节相同（简谱 / 六线谱 / 五线谱三份谱）
   F6  旧入口去向：Ctrl+/ 搜「预设」「打印…」「智能」「存为文件」「经典版」，首条与它的「在哪里」各自正确；「经典版」回车打开偏好设置并定位「使用旧版布局」
   F7  本版对旧外壳的有意修正（两外壳同口径）：TRK-5 存了 vol=0 的轨按静音发声（起播与播放中）、读数 0%（经典混音台 / flow 音轨行）；
       TRK-6 旧外壳删吉他轨 song.mixer['tab:i'] 与 tabCapos 随行前移、一步撤销逐字节还原；PN-5 旧外壳五线谱音名键按本小节调（转调小节）、与 flow 的 .flw-ltr 同字母
   F8  v68.2 收尾修复（上线前最后一轮验收）：a NU-2 界面无内部用语 · b NU-3 锁定此行 · c NU-6 和弦谱口径 / NU-11 / OU-8 文案 · d NU-7「还有 N 条」实底 · e NU-8 原样示例谱不转存 ·
       f NU-9 启动台灰显存入 / 存文件 · g NU-10 / OU-5 旧名搜索 · h OU-1 浮条「…」· i OU-3 / OU-4 开关与深链参数 · j OU-6 Ctrl+O / OU-7 谱库按键 · k ENG-2 开机树只画一遍 · l ENG-10 ③ / ENG-12
       F3q / F3r（NU-1 / NU-4 / NU-5 / ENG-3 / ENG-4）在 F3 段；F3l 改为旧外壳一次性提示（OU-2 / ENG-11）
   RL  数据红线：各用例 song 字段集合 ⊆ 操作前 ∪ 本用例应写的现有字段；musetab-* 键差集（去掉基线提交源码已有的键名）⊆ {musetab-tour-shell, v68.3 musetab-sbar}；源码新键名同口径
   env：MUSETAB_URL 被测页（缺省 ../index.html）· MUSETAB_REF 参考页（none＝红线键名退回被测源码）· MUSETAB_REF_COMMIT · ONLY=F1,F3 · SHOTS=目录 存导览 / 偏好设置截图 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), cp = require('child_process');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => { const i = u.indexOf('#'), base = i >= 0 ? u.slice(0, i) : u, h = i >= 0 ? u.slice(i) : ''; return base + (base.includes('?') ? '&' : '?') + q + h; };
const FLOWU = withQ(URL0, 'shell=flow'), CLASSICU = withQ(URL0, 'shell=classic'), TOURU = withQ(URL0, 'tour=1');
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const SHOTS = process.env.SHOTS || '';
const REF = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'shellflow_ref.json'), 'utf8')); } catch (_) { return {}; } })();
const REF_COMMIT = process.env.MUSETAB_REF_COMMIT || REF.commit || 'a8c2089';
const NEW_KEYS = ['musetab-tour-shell', 'musetab-sbar'];   /* v68.3 + musetab-sbar（谱面上方悬浮条收起＝'0'，展开删键） */
const J = x => JSON.stringify(x);

/* —— 页面内工具（每个上下文的 init 脚本；只定义 window.__*，不碰页面状态）—— */
function INIT() {
  window.__P = n => { const p = PRESETS.find(x => x.name.indexOf(n) >= 0); if (!p) throw new Error('无预设 ' + n); return migrate(p.make()); };
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false;
    const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; }
    return true; };
  window.__R = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e) return null; const r = e.getBoundingClientRect(), f = v => Math.round(v * 10) / 10;
    return { x: f(r.left), y: f(r.top), w: f(r.width), h: f(r.height), r: f(r.right), b: f(r.bottom), vis: __vis(e) }; };
  window.__keys = () => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort();
  window.__fields = () => { const S = new Set(), s = song; if (!s) return [];
    Object.keys(s).forEach(k => S.add('S.' + k));
    if (s.layout && typeof s.layout === 'object') Object.keys(s.layout).forEach(k => S.add('L.' + k));
    if (s.mixer && typeof s.mixer === 'object') Object.values(s.mixer).forEach(o => o && Object.keys(o).forEach(k => S.add('X.' + k)));
    (s.measures || []).forEach(m => { if (!m) return; Object.keys(m).forEach(k => S.add('M.' + k));
      ['voxes', 'tabs'].forEach(t => (m[t] || []).forEach(cs => (cs || []).forEach(c => { if (!c) return; Object.keys(c).forEach(k => S.add('C.' + k));
        (c.notes || []).forEach(n => n && Object.keys(n).forEach(k => S.add('N.' + k))); }))); });
    return [...S].sort(); };
  window.__shell = () => ({ flow: document.body.classList.contains('flow'), pre: document.documentElement.classList.contains('flow-pre'),
    active: typeof FLOW !== 'undefined' && FLOW.active === true, mounted: typeof FLOW !== 'undefined' && FLOW.mounted === true,
    key: localStorage.getItem('musetab-flow'), tour: localStorage.getItem('musetab-tour-shell'), q: location.search,
    r1: __vis('#flw-r1'), left: __vis('#flw-left'), oldLeft: __vis('#left-dock'), m: document.body.classList.contains('flw-m') });
  /* 场景：与 tv_shellflow / tv_modes 同一批预设 */
  window.__scn = (k, o) => {
    o = o || {};
    window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
    try { hideStartPad(); } catch (_) {}
    const one = s => { addDoc(s, () => {}); closeDocAt(0); };
    if (k === 'songbie') { one(__P('送别')); sel = { mi: o.mi || 0, row: 'vox', vi: 0, ci: o.ci || 0, si: 1 }; }
    else if (k === 'gtr') { one(__P('两只老虎')); sel = { mi: o.mi || 0, row: 'tab', vi: 0, ci: o.ci || 0, si: 1 }; }
    else if (k === 'piano') { one(__P('欢乐颂（钢琴独奏）')); sel = { mi: o.mi || 0, row: 'vox', vi: 0, ci: o.ci || 0, si: 1 }; }
    try { clampSel(); } catch (_) {}
    try { blurSel = false; lastEnt = null; selRange = null; measureRange = null; measureSel = null; noteSel = []; } catch (_) {}
    render();
    try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {}
    return { n: docs.length, title: song.title, row: sel.row };
  };
  /* 导览出现的时刻（相对调用时）：MutationObserver 记 #flw-tour 插进 body 的那一刻 */
  window.__watchTour = () => { window.__tw = { t0: performance.now(), at: null };
    new MutationObserver((_, mo) => { if (document.getElementById('flw-tour')) { __tw.at = Math.round(performance.now() - __tw.t0); mo.disconnect(); } }).observe(document.body, { childList: true }); };
  window.__tour = () => { const b = document.getElementById('flw-tour'); if (!b) return null;
    const rings = [...document.querySelectorAll('.flw-tour-ring')].map(r => __R(r));
    return { R: __R(b), n: (b.querySelector('.flw-tour-n') || {}).textContent || '', t: (b.querySelector('#flw-tour-t') || {}).textContent || '',
      d: (b.querySelector('#flw-tour-d') || {}).textContent || '', nt: (b.querySelector('.flw-tour-nt') || {}).textContent || '',
      btns: [...b.querySelectorAll('button')].map(x => x.textContent.trim()), role: b.getAttribute('role'), lab: b.getAttribute('aria-labelledby'),
      ae: (document.activeElement && document.activeElement.dataset && document.activeElement.dataset.tour) || null, side: b.dataset.side || '', rings,
      inB: b.contains(document.activeElement), aeTag: (document.activeElement || {}).tagName || '', sr: (b.querySelector('.flw-tour-sr') || {}).textContent || '', sra: (b.querySelector('.flw-tour-sr') || { getAttribute: () => null }).getAttribute('role'),
      /* v68.2 收尾 NU-4：气泡压没压住这些控件的中心点（elementFromPoint 落在气泡里＝压住） */
      cov: ['#flw-modes', '#flw-mdd', '#b-undo', '#flw-file', '#flw-mode-engrave', '#flw-mode-output', '#flw-tlist .flw-trow.on', '#flw-tlist .flw-trow.on button', '#flw-pq', '#flw-kchip']
        .flatMap(q => [...document.querySelectorAll(q)].map(e => [q, e])).filter(([, e]) => { if (!__vis(e)) return false; const q = e.getBoundingClientRect();
          const h = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !!(h && b.contains(h)); }).map(([q]) => q),
      ar: (() => { const a = b.querySelector('.flw-tour-ar'); return a && !a.hidden ? __R(a) : null; })() }; };
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
  const errs = [];
  const OUT = {};
  let pass = 0, total = 0;
  const T = (id, ok, name, d) => { total++; if (ok) pass++; (OUT[id] = OUT[id] || []).push((ok ? '✅ ' : '❌ ') + name + (d ? ': ' + d : '')); };
  const NOTE = (id, s) => (OUT[id] = OUT[id] || []).push(s);
  const prep = (pg, theme) => pg.evaluate(th => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
    if (th) document.documentElement.dataset.theme = th;
    window.__toasts = []; try { const ot = toast; toast = function (m) { __toasts.push(String(m)); try { return ot.apply(this, arguments); } catch (_) {} }; } catch (_) {}
    if (!document.getElementById('tv-fd-notrans')) { const st = document.createElement('style'); st.id = 'tv-fd-notrans'; st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}'; document.head.appendChild(st); } }, theme || null);
  const open = async (w, h, o = {}) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: o.scheme || 'light', acceptDownloads: false });
    ctx.setDefaultTimeout(6000);
    await ctx.addInitScript(INIT);
    if (o.init) await ctx.addInitScript(o.init);
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errs.push((o.tag || (w + 'x' + h)) + ' PAGEERR:' + e.message));
    await pg.goto(o.url || URL0); await pg.waitForTimeout(o.wait || 1200);
    await prep(pg, o.theme);
    pg.__ctx = ctx; pg.__theme = o.theme; return pg;
  };
  const close = pg => pg.__ctx.close();
  const EV = (pg, fn, a) => pg.evaluate(fn, a);
  const wait = (pg, ms) => pg.waitForTimeout(ms);
  const scn = async (pg, k, o) => { const r = await pg.evaluate(([k, o]) => __scn(k, o), [k, o || {}]); await wait(pg, 150); return r; };
  const shot = async (pg, name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  const pool = async (jobs, n) => { const q = jobs.slice(); const run1 = async () => { while (q.length) { const j = q.shift(); await j(); } }; await Promise.all(Array.from({ length: n }, run1)); };
  const SAFE = async (id, name, fn) => { try { await fn(); } catch (e) { T(id, false, name + ' 执行异常', String(e && e.message || e).split('\n')[0]); } };
  /* 点了会刷新页面的控件：等页面重新 load，再补 prep */
  const clickReload = async (pg, sel) => { await Promise.all([pg.waitForEvent('load', { timeout: 8000 }), pg.click(sel)]); await wait(pg, 1100); await prep(pg, pg.__theme); };
  const jobs = [];

  /* —— 数据红线（RL）：每个用例开头记基线、结尾比；最后汇总 —— */
  const literalKeys = txt => new Set((String(txt || '').match(/musetab-[a-z0-9-]+/g) || []));
  const refSrc = (() => { const e = process.env.MUSETAB_REF; if (e === 'none') return null;
    try { if (e) return fs.readFileSync(e.startsWith('file://') ? e.slice(7) : path.resolve(e), 'utf8');
      return cp.execFileSync('git', ['-C', __dirname, 'show', REF_COMMIT + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (_) { return null; } })();
  const curSrc = (() => { try { return fs.readFileSync(URL0.replace(/^file:\/\//, '').replace(/[?#].*$/, ''), 'utf8'); } catch (_) { return ''; } })();
  const KNOWN = refSrc ? literalKeys(refSrc) : new Set([...literalKeys(curSrc)].filter(k => !NEW_KEYS.includes(k)));
  const known = k => KNOWN.has(k) || [...KNOWN].some(p => p.endsWith('-') && k.startsWith(p));
  const RLF = [], RLK = [];
  const redBase = pg => EV(pg, () => ({ f: __fields(), k: __keys() }));
  const redEnd = async (id, pg, base, allowF) => {
    const now = await redBase(pg);
    const nf = now.f.filter(x => !base.f.includes(x)), badF = nf.filter(x => !(allowF || []).includes(x));
    const nk = now.k.filter(x => !base.k.includes(x)), badK = nk.filter(k => !known(k) && !NEW_KEYS.includes(k));
    RLF.push({ id, ok: !badF.length, d: id + (nf.length ? ' 新字段 ' + nf.join(',') : '') + (badF.length ? ' ✗' + badF.join(',') : '') });
    RLK.push({ id, ok: !badK.length, d: id + (nk.length ? ' 新键 ' + nk.join(',') : '') + (badK.length ? ' ✗' + badK.join(',') : '') });
  };

  /* ================= F1 默认 flow · ?shell=classic · 偏好设置「使用旧版布局」================= */
  if (want('F1')) jobs.push(() => SAFE('F1', 'F1', async () => {
    const pg = await open(1280, 800, { tag: 'F1' });
    const a = await EV(pg, () => __shell());
    T('F1', a.flow && a.pre && a.active && a.mounted && a.key === null && a.r1 && a.left && !a.oldLeft,
      'F1a 不带参数的新上下文 → html.flow-pre · body.flow · FLOW.active（行 1 / 左栏可见，旧左栏隐藏），本机键 musetab-flow 不写', J(a));
    await scn(pg, 'songbie'); const base = await redBase(pg);
    /* 新外壳里的偏好设置：列出「使用旧版布局」且为关（真实点击：账号 ▾ → 偏好设置…） */
    await pg.click('#flw-acct'); await wait(pg, 200);
    const mi = await pg.$$('#popmenu [data-fa]'); let hit = null;
    for (const h of mi) { const t = (await h.textContent()) || ''; if (/偏好设置/.test(t)) { hit = h; break; } }
    if (hit) { await hit.click(); await wait(pg, 250); } else await EV(pg, () => showPrefs());
    const pf = await EV(pg, () => { const r = document.querySelector('#modal-mask .prf-row[data-prf="oldshell"]');
      return r ? { on: r.getAttribute('aria-checked'), t: r.querySelector('b').textContent, st: r.querySelector('.prf-st').textContent, role: r.getAttribute('role'), vis: __vis(r),
        d: r.querySelector('small').textContent } : null; });
    T('F1', !!hit && !!pf && pf.on === 'false' && pf.t === '使用旧版布局' && pf.st === '新版' && pf.role === 'switch' && pf.vis && /刷新/.test(pf.d),
      'F1b 新外壳 账号 ▾ → 偏好设置…：列出「使用旧版布局」（role=switch、关、状态「新版」、说明写明会刷新）', J({ menu: !!hit, pf }));
    await shot(pg, 'F1-prefs-flow-1280');
    /* 点开 → 写 '0' → 500ms 后刷新进旧外壳（点击时刻在页面捕获阶段记进 sessionStorage，刷新时刻＝新文档 performance.timeOrigin，同一时钟） */
    await EV(pg, () => document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('.prf-row[data-prf="oldshell"]')) sessionStorage.setItem('__fdT0', String(Date.now())); }, true));
    await clickReload(pg, '#modal-mask .prf-row[data-prf="oldshell"]');
    const c = await EV(pg, () => Object.assign(__shell(), { dt: Math.round(performance.timeOrigin - (+sessionStorage.getItem('__fdT0') || 0)), api: (() => { try { return API_ON; } catch (_) { return null; } })() }));
    T('F1', !c.flow && !c.pre && !c.mounted && c.key === '0' && c.oldLeft && !c.r1 && c.api === false && c.dt >= 490 && c.dt <= 650,
      'F1c 偏好设置打开「使用旧版布局」→ 键写 \'0\'、页面刷新进旧外壳（FLOW 不挂载、旧左栏可见）；file:// 不发埋点，刷新仍在 500ms 口径（' + c.dt + 'ms）', J(c));
    await redEnd('F1', pg, base, []);
    /* ?shell=classic：刷新保持、去参数仍旧外壳 */
    await pg.goto(CLASSICU); await wait(pg, 1000); await prep(pg);
    const d1 = await EV(pg, () => __shell());
    await pg.reload(); await wait(pg, 1000); await prep(pg);
    const d2 = await EV(pg, () => __shell());
    await pg.goto(URL0); await wait(pg, 1000); await prep(pg);
    const d3 = await EV(pg, () => __shell());
    T('F1', !d1.flow && d1.key === '0' && !d1.mounted && !d2.flow && d2.key === '0' && /shell=classic/.test(d2.q) && !d3.flow && d3.key === '0' && !d3.mounted,
      'F1d ?shell=classic → 旧外壳、键 \'0\'；刷新（地址仍带参数）保持旧外壳；去掉参数仍是旧外壳（键记住）', J({ d1: [d1.flow, d1.key], d2: [d2.flow, d2.key, d2.q], d3: [d3.flow, d3.key] }));
    /* 旧外壳里关掉：带着 ?shell=classic 打开（参数优先于本机键）——刷新地址去掉参数，删键、回到 flow */
    await pg.goto(CLASSICU); await wait(pg, 1000); await prep(pg); await scn(pg, 'songbie');
    const bp = await EV(pg, () => __vis('#b-prefs'));
    if (bp) await pg.click('#b-prefs'); else await EV(pg, () => showPrefs());
    await wait(pg, 200);
    const e1 = await EV(pg, () => { const r = document.querySelector('#modal-mask .prf-row[data-prf="oldshell"]'); return r ? { on: r.getAttribute('aria-checked'), st: r.querySelector('.prf-st').textContent, vis: __vis(r) } : null; });
    await shot(pg, 'F1-prefs-classic-1280');
    await clickReload(pg, '#modal-mask .prf-row[data-prf="oldshell"]');
    const e2 = await EV(pg, () => __shell());
    T('F1', bp && !!e1 && e1.on === 'true' && e1.st === '旧版' && e1.vis && e2.flow && e2.active && e2.key === null && !/shell=/.test(e2.q),
      'F1e 旧外壳顶栏「偏好设置」（#b-prefs）里「使用旧版布局」为开；点关 → 删键、刷新（地址里的 ?shell=classic 一并去掉）回到 flow', J({ bp, e1, e2 }));
    await close(pg);
  }));

  /* ================= F2 老用户迁移 ================= */
  if (want('F2')) jobs.push(() => SAFE('F2', 'F2', async () => {
    const res = {};
    for (const [k, init] of [['shell-classic', () => { try { if (!sessionStorage.getItem('__fd')) { localStorage.setItem('musetab-shell', 'classic'); sessionStorage.setItem('__fd', '1'); } } catch (_) {} }],
      ['flow-1', () => { try { if (!sessionStorage.getItem('__fd')) { localStorage.setItem('musetab-flow', '1'); sessionStorage.setItem('__fd', '1'); } } catch (_) {} }],
      ['flow-bad', () => { try { if (!sessionStorage.getItem('__fd')) { localStorage.setItem('musetab-flow', 'classic'); sessionStorage.setItem('__fd', '1'); } } catch (_) {} }]]) {
      const pg = await open(1280, 800, { tag: 'F2-' + k, init });
      const a = await EV(pg, () => Object.assign(__shell(), { shellKey: localStorage.getItem('musetab-shell'), ui: (() => { try { return uiShell; } catch (_) { return null; } })() }));
      await pg.reload(); await wait(pg, 1000);
      const r2 = await EV(pg, () => ({ flow: document.body.classList.contains('flow'), key: localStorage.getItem('musetab-flow'), shellKey: localStorage.getItem('musetab-shell') }));
      res[k] = { a, r2 };
      await close(pg);
    }
    const s = res['shell-classic'], f = res['flow-1'], x = res['flow-bad'];
    T('F2', s.a.flow && s.a.active && s.a.ui === true && s.a.shellKey === 'classic' && s.a.key === null && s.r2.flow && s.r2.shellKey === 'classic',
      'F2a 预置 musetab-shell=\'classic\'（v40 经典版开关的历史值）→ 仍是 flow（这个键不复活旧布局），键原样保留不删不改、不写 musetab-flow；刷新同样', J(s));
    T('F2', f.a.flow && f.a.active && f.a.key === '1' && f.r2.flow && f.r2.key === '1',
      'F2b 预置 musetab-flow=\'1\'（预览期 ?shell=flow 用户）→ flow，键原样', J(f));
    T('F2', x.a.flow && x.a.key === 'classic', 'F2c musetab-flow 坏值（不是 \'0\'）→ 按默认 flow，不改写', J(x.a));
  }));

  /* ================= F3 首次 3 步导览 ================= */
  const near = (a, b, tol) => !!a && !!b && Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol && Math.abs(a.r - b.r) <= tol && Math.abs(a.b - b.b) <= tol;
  const inView = (R, w, h) => !!R && R.x >= 0 && R.y >= 0 && R.r <= w && R.b <= h;
  const tourMain = async (w, h, theme, tag) => {
    const pg = await open(w, h, { tag, url: TOURU, theme, scheme: theme === 'dark' ? 'dark' : 'light' });
    const sp0 = await EV(pg, () => ({ sp: startPadOn(), flow: document.body.classList.contains('flow') }));
    await wait(pg, 2000);
    const t0 = await EV(pg, () => __tour());
    await EV(pg, () => __watchTour()); await scn(pg, 'songbie', { mi: 1 }); const base = await redBase(pg);
    const j0 = await EV(pg, () => JSON.stringify(song)), s0 = await EV(pg, () => JSON.stringify(sel));
    await wait(pg, 2300);
    const early = await EV(pg, () => __tw.at);
    await wait(pg, 120);   /* 读屏播报在出现后 60ms 写入 */
    const st1 = await EV(pg, () => ({ t: __tour(), r1: __R('#flw-r1'), file: __R('#flw-file'), top: __R('#top'), lf: __R('#flw-left') }));
    await shot(pg, 'F3-tour1-' + w + '-' + (theme || 'light'));
    await pg.click('#flw-tour [data-tour="next"]'); await wait(pg, 150);
    const st2 = await EV(pg, () => ({ t: __tour(), md: __R('#flw-modes'), top: __R('#top'), lf: __R('#flw-left') }));
    await shot(pg, 'F3-tour2-' + w + '-' + (theme || 'light'));
    await pg.click('#flw-tour [data-tour="next"]'); await wait(pg, 150);
    const st3 = await EV(pg, () => ({ t: __tour(), lf: __R('#flw-left'), md: __R('#mixer-dock'), trk: __R('#flw-trk') }));
    await shot(pg, 'F3-tour3-' + w + '-' + (theme || 'light'));
    return { pg, sp0, t0, early, st1, st2, st3, j0, s0, base };
  };
  if (want('F3')) jobs.push(() => SAFE('F3', 'F3a', async () => {
    const { pg, sp0, t0, early, st1, st2, st3, j0, s0, base } = await tourMain(1280, 800, null, 'F3');
    T('F3', sp0.sp && sp0.flow && !t0 && early != null && early >= 1400 && early <= 3500 && !!st1.t, 'F3a ?tour=1：启动台开着时不出现（等 2 秒仍无）；离开启动台（hideStartPad）、有谱面后约 1.5 秒出现（实测离台到出现 ' + early + 'ms，要求 1400–3500）', J({ sp0, t0: !!t0, at: early, t1: !!st1.t }));
    const t1 = st1.t || {};
    /* v68.2 收尾 NU-1 / NU-4 改口径：自动出现不抢焦点（原「焦点在下一步」——之后的 ← → Enter 空格被导览截走、连按就把导览走完）；读屏改由气泡里的 role=status 播报；
       气泡放谱面区（两行之下、左栏右侧），不压行 2 模式条 / 撤销、左栏当前轨行与记号搜索框（原「行 1 正下方、箭头指向文件」压住了「排版 / 输出」与左栏控件） */
    T('F3', t1.n === '1 / 3' && /文件.*窗口.*保存.*发布/.test(t1.t) && t1.role === 'dialog' && t1.lab === 'flw-tour-t' && J(t1.btns) === '["跳过","下一步"]' && !t1.inB && t1.aeTag === 'BODY'
      && t1.sra === 'status' && /导览 1 \/ 3.*F6/.test(t1.sr)
      && t1.rings.length === 1 && near(t1.rings[0], { x: Math.max(2, st1.r1.x - 3), y: Math.max(2, st1.r1.y - 3), r: Math.min(1278, st1.r1.r + 3), b: st1.r1.b + 3 }, 1.5)
      && inView(t1.R, 1280, 800) && t1.R.y >= st1.top.b - 0.5 && t1.R.x >= st1.lf.r - 0.5 && t1.cov.length === 0,
      'F3b 第 1 步：「1 / 3 · 第一行：文件 · 窗口 · 保存 · 发布」；role=dialog、读屏名＝标题；只有「跳过 / 下一步」；焦点不动（留在谱面 body），role=status 播报「导览 1 / 3…按 F6 进入」；'
      + '圈住整个行 1（#flw-r1 外扩 3）；气泡整个在视口内、在两行（#top）之下与左栏右侧，模式条 / 撤销 / 文件 / 当前轨行 / 记号搜索框中心都没被压住',
      J({ t1: Object.assign({}, t1, { d: undefined }), r1: st1.r1, top: st1.top, lf: st1.lf }));
    const t2 = st2.t || {};
    T('F3', t2.n === '2 / 3' && /书写 › 排版 › 输出/.test(t2.t) && /Esc 回到书写/.test(t2.d) && /(Ctrl|⌘)\+\/ 能搜到所有功能/.test(t2.d) && /旧名也行/.test(t2.d) && !/播放/.test(t2.t)
      && J(t2.btns) === '["跳过","上一步","下一步"]' && t2.rings.length === 1 && near(t2.rings[0], { x: st2.md.x - 3, y: st2.md.y - 3, r: st2.md.r + 3, b: st2.md.b + 3 }, 1.5)
      && t2.R.y >= st2.md.b - 0.5 && inView(t2.R, 1280, 800) && t2.R.y >= st2.top.b - 0.5 && t2.R.x >= st2.lf.r - 0.5 && t2.cov.length === 0 && !t2.inB,
      'F3c 第 2 步：「书写 › 排版 › 输出」（三步，不出现播放步）＋「Esc 回到书写；Ctrl+/ 能搜到所有功能，旧名也行」；圈住模式条 #flw-modes、气泡在其下方（谱面区，不压模式条与左栏控件）；鼠标点「下一步」后焦点回到页面', J({ t2, md: st2.md }));
    const t3 = st3.t || {};
    T('F3', t3.n === '3 / 3' && /静音 \/ 独奏就在音轨行上/.test(t3.d) && /播放/.test(t3.d) && /音轨/.test(t3.t) && /记号/.test(t3.t) && /偏好设置.*使用旧版布局/.test(t3.nt)
      && J(t3.btns) === '["跳过","上一步","知道了"]' && t3.rings.length === 2 && near(t3.rings[0], { x: Math.max(2, st3.lf.x - 3), y: st3.lf.y - 3, r: st3.lf.r + 3, b: st3.lf.b + 3 }, 1.5)
      && Math.abs(t3.rings[1].y - (st3.md.y - 3)) <= 1.5 && t3.R.x >= st3.lf.r - 0.5 && t3.side === 'right' && inView(t3.R, 1280, 800) && t3.cov.length === 0 && t3.R.b <= st3.md.y - 0.5,
      'F3d 第 3 步：左栏音轨 + 记号、底部播放（「静音 / 独奏就在音轨行上」，附「偏好设置 › 使用旧版布局」换回说明）；两个圈＝#flw-left 与 #mixer-dock；气泡在左栏右侧；末步按钮「知道了」', J({ t3, lf: st3.lf, md: st3.md }));
    /* 上一步：气泡里 ← 键 / 「上一步」（v68.2 收尾 NU-1：鼠标点完焦点回到页面；键盘用户 F6 进气泡后 ← → 翻步） */
    await pg.focus('#flw-tour [data-tour="next"]'); await pg.keyboard.press('ArrowLeft'); await wait(pg, 120);
    const k1 = await EV(pg, () => ({ n: (__tour() || {}).n, inB: (__tour() || {}).inB }));
    await pg.click('#flw-tour [data-tour="prev"]'); await wait(pg, 120);
    const k2 = await EV(pg, () => ({ n: (__tour() || {}).n, inB: (__tour() || {}).inB }));
    await pg.keyboard.press('F6'); await wait(pg, 80);
    const k2f = await EV(pg, () => ({ ae: (__tour() || {}).ae, inB: (__tour() || {}).inB }));
    await pg.keyboard.press('ArrowRight'); await wait(pg, 120);
    const k3 = await EV(pg, () => ({ n: (__tour() || {}).n, inB: (__tour() || {}).inB }));
    T('F3', k1.n === '2 / 3' && k1.inB && k2.n === '1 / 3' && !k2.inB && k2f.inB && k2f.ae === 'next' && k3.n === '2 / 3' && k3.inB,
      'F3e 气泡内 ← 退一步（焦点留在气泡）；鼠标点「上一步」退一步、焦点回到页面；F6 把焦点移进气泡「下一步」，→ 进一步', J([k1, k2, k2f, k3]));
    /* Esc＝跳过：收起、写 '1'；谱、光标、选区状态不动（Esc 没漏到谱面：先把光标设成隐藏态 blurSel=true——任何漏进编辑器的按键都会把它清成 false） */
    const blur0 = await EV(pg, () => { blurSel = true; return blurSel; });
    await pg.keyboard.press('Escape'); await wait(pg, 200);
    const e = await EV(pg, ([j0, s0]) => ({ gone: !document.getElementById('flw-tour'), rings: document.querySelectorAll('.flw-tour-ring').length, key: localStorage.getItem('musetab-tour-shell'),
      same: JSON.stringify(song) === j0, sel: JSON.stringify(sel) === s0, blur: blurSel, open: FLOW.tour.open }), [j0, s0]);
    T('F3', e.gone && !e.rings && e.key === '1' && e.same && e.sel && blur0 === true && e.blur === true && !e.open,
      'F3f Esc 关闭导览（算跳过）：气泡与圈都撤掉、musetab-tour-shell=\'1\'；导览全程 song 逐字节不变、光标不动、Esc 没漏到谱面', J(e));
    await redEnd('F3', pg, base, []);
    /* 刷新不再出现 */
    await pg.reload(); await wait(pg, 1000); await prep(pg); await scn(pg, 'songbie'); await wait(pg, 2600);
    const r = await EV(pg, () => ({ tour: !!document.getElementById('flw-tour'), key: localStorage.getItem('musetab-tour-shell') }));
    T('F3', !r.tour && r.key === '1', 'F3g 看过之后（键 \'1\'）刷新、离开启动台等 2.6 秒：不再出现（?tour=1 只解除自动化闸，不重放）', J(r));
    await close(pg);
  }));
  /* 启动期第一次渲染早于启动台出现、那时就起了计时：开页后很快离开启动台，仍要从离台起数满 1.5 秒（hideStartPad → FLOW.tour.rearm） */
  if (want('F3')) jobs.push(() => SAFE('F3', 'F3p', async () => {
    const pg = await open(1280, 800, { tag: 'F3p', url: TOURU, wait: 250 });
    await EV(pg, () => __watchTour()); await scn(pg, 'songbie'); await wait(pg, 2600);
    const at = await EV(pg, () => __tw.at);
    T('F3', at != null && at >= 1400 && at <= 3500, 'F3p 开页 0.25 秒内就离开启动台：导览仍从离台起数满约 1.5 秒才出现（启动期起的计时在离台时作废重数；实测 ' + at + 'ms）', J({ at }));
    await close(pg);
  }));
  /* 「知道了」完成 · 跳过按钮 */
  if (want('F3')) jobs.push(() => SAFE('F3', 'F3h', async () => {
    const out = {};
    for (const how of ['done', 'skip']) {
      const pg = await open(1280, 800, { tag: 'F3h-' + how, url: TOURU });
      await scn(pg, 'gtr'); await wait(pg, 2400);
      const on = await EV(pg, () => !!document.getElementById('flw-tour'));
      if (how === 'done') { for (let i = 0; i < 3; i++) { await pg.click('#flw-tour [data-tour="next"]'); await wait(pg, 120); } }
      else { await pg.click('#flw-tour [data-tour="skip"]'); await wait(pg, 120); }
      out[how] = Object.assign({ on }, await EV(pg, () => ({ gone: !document.getElementById('flw-tour'), key: localStorage.getItem('musetab-tour-shell'), ae: (document.activeElement || {}).tagName })));
      await close(pg);
    }
    T('F3', out.done.on && out.done.gone && out.done.key === '1' && out.skip.on && out.skip.gone && out.skip.key === '1',
      'F3h 第 3 步点「知道了」完成、或第 1 步点「跳过」：都收起并写 \'1\'（六线谱轨谱面同样出现）', J(out));
  }));
  /* 不出现的场景 */
  if (want('F3')) jobs.push(() => SAFE('F3', 'F3i', async () => {
    const res = {};
    /* webdriver 默认（不带 ?tour=1） */
    { const pg = await open(1280, 800, { tag: 'F3i-wd' }); await scn(pg, 'songbie'); await wait(pg, 2600);
      res.wd = await EV(pg, () => ({ webdriver: navigator.webdriver, tour: !!document.getElementById('flw-tour'), key: localStorage.getItem('musetab-tour-shell'), flow: document.body.classList.contains('flow') })); await close(pg); }
    /* 手机 390 */
    { const pg = await open(390, 844, { tag: 'F3i-mob', url: TOURU }); await scn(pg, 'songbie'); await wait(pg, 2600);
      res.mob = await EV(pg, () => ({ tour: !!document.getElementById('flw-tour'), m: document.body.classList.contains('flw-m'), flow: document.body.classList.contains('flow'), key: localStorage.getItem('musetab-tour-shell') })); await close(pg); }
    /* 观看页（openPubViewer：离开启动台后 1.5 秒内进观看页） */
    { const pg = await open(1280, 800, { tag: 'F3i-viewer', url: TOURU }); await scn(pg, 'songbie');
      await EV(pg, () => { circlePubsSave([{ pid: 'tfd-v', title: '观看测试', author: '测试', type: 'vocal', price: 0, views: 0, data: JSON.parse(JSON.stringify(song)) }]); openPubViewer('tfd-v'); });
      await wait(pg, 2600);
      res.viewer = await EV(pg, () => ({ viewer: document.body.classList.contains('viewer'), tour: !!document.getElementById('flw-tour'), key: localStorage.getItem('musetab-tour-shell') })); await close(pg); }
    /* 谱架 */
    { const pg = await open(1280, 800, { tag: 'F3i-stand', url: TOURU }); await scn(pg, 'songbie'); await EV(pg, () => enterStand()); await wait(pg, 2600);
      res.stand = await EV(pg, () => ({ stand: document.body.classList.contains('stand'), tour: !!document.getElementById('flw-tour') })); await close(pg); }
    /* 旧外壳：不出导览；v68.2 收尾 OU-2 / ENG-11 起改为一次性提示「新版布局已是默认」（同一个本机键记 'c'，不新增键）；刷新不再提示；换到新外壳照常出导览（'c' 不算看过） */
    { const pg = await open(1280, 800, { tag: 'F3i-classic', url: withQ(CLASSICU, 'tour=1') }); await scn(pg, 'songbie'); await wait(pg, 2600);
      res.classic = await EV(pg, () => ({ flow: document.body.classList.contains('flow'), tour: !!document.getElementById('flw-tour'), key: localStorage.getItem('musetab-tour-shell'),
        hint: __toasts.filter(t => /新版编辑器布局已上线并成为默认.*偏好设置.*使用旧版布局/.test(t)).length, toastVis: (() => { const t = document.getElementById('toast'); return t ? +getComputedStyle(t).opacity : 0; })() }));
      await shot(pg, 'F3l-classic-hint-1280');
      await pg.reload(); await wait(pg, 1000); await prep(pg); await scn(pg, 'songbie'); await wait(pg, 2600);
      res.classic2 = await EV(pg, () => ({ key: localStorage.getItem('musetab-tour-shell'), hint: __toasts.filter(t => /新版编辑器布局已上线/.test(t)).length }));
      await pg.goto(withQ(FLOWU, 'tour=1')); await wait(pg, 1000); await prep(pg); await scn(pg, 'songbie'); await wait(pg, 2600);
      res.classic3 = await EV(pg, () => ({ flow: document.body.classList.contains('flow'), tour: !!document.getElementById('flw-tour'), key: localStorage.getItem('musetab-tour-shell'), musetabFlow: localStorage.getItem('musetab-flow') }));
      await close(pg); }
    T('F3', res.wd.webdriver === true && res.wd.flow && !res.wd.tour && res.wd.key === null, 'F3i 自动化测试（navigator.webdriver）不带 ?tour=1：默认不出现、不写键（避免干扰全部套件）', J(res.wd));
    T('F3', res.mob.m && !res.mob.flow && !res.mob.tour && res.mob.key === null, 'F3j 手机 390×844（flow 手机子段 body.flw-m）带 ?tour=1 也不出现', J(res.mob));
    T('F3', res.viewer.viewer && !res.viewer.tour && res.stand.stand && !res.stand.tour, 'F3k 观看页（openPubViewer）、谱架（enterStand）上不出现', J({ v: res.viewer, s: res.stand }));
    T('F3', !res.classic.flow && !res.classic.tour && res.classic.key === 'c' && res.classic.hint === 1 && res.classic.toastVis > 0.5
      && res.classic2.key === 'c' && res.classic2.hint === 0,
      'F3l 旧外壳（?shell=classic&tour=1）不出导览；离开启动台、停手 1.5 秒后一次性提示「新版编辑器布局已上线并成为默认…偏好设置里关掉「使用旧版布局」」，本机键 musetab-tour-shell 记 \'c\'；刷新不再提示（v68.2 收尾 OU-2 / ENG-11：预览期 ?shell=classic 的 \'0\' 用户升级后知道新版已是默认）',
      J({ c1: res.classic, c2: res.classic2 }));
    T('F3', res.classic3.flow && res.classic3.tour && res.classic3.key === 'c' && res.classic3.musetabFlow === '0',
      'F3l2 提示过（\'c\'）之后用 ?shell=flow 打开新外壳：照常出首次导览（\'c\' 不算看过导览）；?shell=flow 只对本次生效，「使用旧版布局」的键 \'0\' 不被抹掉（OU-2）', J(res.classic3));
  }));
  /* 弹窗开着时等一等；退场只收起不写键 */
  if (want('F3')) jobs.push(() => SAFE('F3', 'F3m', async () => {
    const pg = await open(1280, 800, { tag: 'F3m', url: TOURU });
    await scn(pg, 'songbie'); await EV(pg, () => showPrefs()); await wait(pg, 2600);
    const a = await EV(pg, () => ({ modal: !!document.getElementById('modal-mask'), tour: !!document.getElementById('flw-tour') }));
    await EV(pg, () => closeModal()); await wait(pg, 2000);
    const b2 = await EV(pg, () => ({ tour: !!document.getElementById('flw-tour'), n: (__tour() || {}).n }));
    T('F3', a.modal && !a.tour && b2.tour && b2.n === '1 / 3', 'F3m 弹窗（偏好设置）开着时导览不出现；关掉弹窗后接着出现（1.5 秒一轮等待）', J({ a, b2 }));
    await pg.setViewportSize({ width: 800, height: 800 }); await wait(pg, 500);
    const c = await EV(pg, () => ({ tour: !!document.getElementById('flw-tour'), rings: document.querySelectorAll('.flw-tour-ring').length, key: localStorage.getItem('musetab-tour-shell'), m: document.body.classList.contains('flw-m') }));
    await pg.setViewportSize({ width: 1280, height: 800 }); await wait(pg, 400); await EV(pg, () => render()); await wait(pg, 2200);
    const d = await EV(pg, () => ({ tour: !!document.getElementById('flw-tour'), key: localStorage.getItem('musetab-tour-shell') }));
    T('F3', !c.tour && !c.rings && c.key === null && c.m && d.tour && d.key === null, 'F3n 导览开着时缩到手机宽（flow 退场）：气泡与圈收起、不写键；回到桌面宽再次出现', J({ c, d }));
    await close(pg);
  }));
  /* 1440×900 浅 / 深色截图（三步）+ 几何 */
  if (want('F3')) jobs.push(() => SAFE('F3', 'F3o', async () => {
    const res = [];
    for (const th of ['light', 'dark']) {
      const { pg, st1, st2, st3 } = await tourMain(1440, 900, th, 'F3o-' + th);
      res.push({ th, ok: [st1, st2, st3].every(s => s.t && inView(s.t.R, 1440, 900)) && st3.t.side === 'right' && st2.t.R.y >= st2.md.b - 0.5,
        n: [st1, st2, st3].map(s => s.t && s.t.n) });
      if (th === 'light') { await EV(pg, () => FLOW.tour.close('env')); await scn(pg, 'songbie'); }
      await close(pg);
    }
    { const pg = await open(1280, 800, { tag: 'F3o-d1280', url: TOURU, theme: 'dark', scheme: 'dark' }); await scn(pg, 'songbie'); await wait(pg, 2400); await shot(pg, 'F3-tour1-1280-dark');
      await pg.click('#flw-tour [data-tour="next"]'); await wait(pg, 120); await shot(pg, 'F3-tour2-1280-dark');
      await pg.click('#flw-tour [data-tour="next"]'); await wait(pg, 120); await shot(pg, 'F3-tour3-1280-dark'); await close(pg); }
    T('F3', res.every(x => x.ok), 'F3o 1440×900 浅 / 深色：三步气泡都在视口内、第 2 步在模式条下方、第 3 步在左栏右侧', J(res));
  }));

  /* v68.2 收尾 NU-1 / ENG-3：边录入边到点不弹（停手 1.5 秒才出）；出现后焦点不动——← → / Shift+→ / Enter / 空格照旧作用于谱面，导览既不翻步也不记看过；
     输入框里的 Esc 先给输入框；F6 才把焦点移进气泡。修前：到点即弹、焦点抢到「下一步」，→ 连按三下把导览走完并写 '1'、Enter 翻步不进填词、空格不播放 */
  if (want('F3')) jobs.push(() => SAFE('F3', 'F3q', async () => {
    const pg = await open(1280, 800, { tag: 'F3q', url: TOURU });
    await scn(pg, 'songbie', { mi: 1 }); await EV(pg, () => { __watchTour(); window.__lk = 0; window.addEventListener('keydown', () => { window.__lk = performance.now(); }, true); });
    for (let i = 0; i < 14; i++) { await pg.keyboard.press(String(1 + (i % 7))); await wait(pg, 150); }
    const typing = await EV(pg, () => ({ open: !!document.getElementById('flw-tour'), last: __lk }));   /* 最后一次 keydown 的页面时刻 */
    await wait(pg, 2300);
    const ap = await EV(pg, () => ({ open: FLOW.tour.open, at: __tw.at == null ? null : Math.round(__tw.t0 + __tw.at), t: __tour() }));
    const gap = ap.at == null ? null : ap.at - Math.round(typing.last);
    /* 出现后：谱面按键 */
    const k = async (key) => { await pg.keyboard.press(key); await wait(pg, 140);
      return EV(pg, () => ({ sel: sel.mi + ':' + sel.ci, rng: !!selRange, step: FLOW.tour.step, open: FLOW.tour.open, key: localStorage.getItem('musetab-tour-shell'), ae: (document.activeElement || {}).id || (document.activeElement || {}).tagName,
        play: !!(typeof audio !== 'undefined' && audio.playing) })); };
    const s0 = await EV(pg, () => sel.mi + ':' + sel.ci);
    const r = { ar: await k('ArrowRight'), al: await k('ArrowLeft'), sr: await k('Shift+ArrowRight') };
    await EV(pg, () => { selRange = null; render(); });
    r.sp = await k(' '); await EV(pg, () => { try { stopPlay(); } catch (_) {} });
    r.en = await k('Enter'); r.esc = await k('Escape');
    await pg.keyboard.press('F6'); await wait(pg, 80);
    r.f6 = await EV(pg, () => ({ ae: (__tour() || {}).ae, inB: (__tour() || {}).inB }));
    T('F3', !typing.open && ap.open && gap != null && gap >= 1400 && gap <= 3200,
      'F3q 边录入（每 150 毫秒敲一个数字，跨过 1.5 秒）不弹出；停手约 1.5 秒后才出现（最后一键到出现 ' + gap + 'ms，要求 1400–3200）', J({ typing, gap }));
    T('F3', ap.t && !ap.t.inB && r.ar.sel !== s0 && r.al.sel === s0 && (r.sr.rng || r.sr.sel !== s0) && r.en.ae === 'i-lyric' && r.esc.open && r.esc.ae !== 'i-lyric' && r.sp.play
      && [r.ar, r.al, r.sr, r.en, r.esc, r.sp].every(x => x.step === 0 && x.open && x.key === null) && r.f6.inB && r.f6.ae === 'next',
      'F3q2 导览出现后焦点不动：→ / ← 移光标、Shift+→ 选区、Enter 进逐字填词（#i-lyric）、填词框里 Esc 只退出输入框、空格播放——导览一直停在 1 / 3、不写看过；F6 才把焦点移进气泡「下一步」',
      J(Object.assign({ s0 }, r)));
    await shot(pg, 'F3q-tour-no-focus-1280');
    await close(pg);
  }));
  /* v68.2 收尾 NU-5 / ENG-4：导览开着切到排版 / 输出——先收起（不写看过），Esc 照常回书写（不被导览吞掉），回书写 1.5 秒后从收起那一步接着出；
     修前：切到排版导览仍开着、第 3 步讲着已不在屏上的左栏，第一下 Esc 只关导览（记为看过）、停在排版 */
  if (want('F3')) jobs.push(() => SAFE('F3', 'F3r', async () => {
    const pg = await open(1280, 800, { tag: 'F3r', url: TOURU });
    await scn(pg, 'songbie'); await wait(pg, 2300);
    await pg.click('#flw-tour [data-tour="next"]'); await wait(pg, 150);
    const a = await EV(pg, () => ({ n: (__tour() || {}).n, mode: FLOW.mode.cur }));
    await pg.click('#flw-mode-engrave'); await wait(pg, 700);
    const b2 = await EV(pg, () => ({ tour: !!document.getElementById('flw-tour'), rings: document.querySelectorAll('.flw-tour-ring').length, open: FLOW.tour.open, mode: FLOW.mode.cur, key: localStorage.getItem('musetab-tour-shell') }));
    await wait(pg, 1800);
    const b3 = await EV(pg, () => ({ tour: !!document.getElementById('flw-tour'), mode: FLOW.mode.cur }));
    await EV(pg, () => __watchTour());   /* 从按 Esc 回书写起算 */
    await pg.keyboard.press('Escape'); await wait(pg, 500);
    const c = await EV(pg, () => ({ mode: FLOW.mode.cur, key: localStorage.getItem('musetab-tour-shell'), tour: !!document.getElementById('flw-tour') }));
    await wait(pg, 2000);
    const d = await EV(pg, () => ({ n: (__tour() || {}).n, at: __tw.at, key: localStorage.getItem('musetab-tour-shell') }));
    T('F3', a.n === '2 / 3' && !b2.tour && !b2.rings && !b2.open && b2.mode === 'engrave' && b2.key === null && !b3.tour && b3.mode === 'engrave'
      && c.mode === 'write' && c.key === null && !c.tour && d.n === '2 / 3' && d.key === null && d.at != null && d.at >= 1350 && d.at <= 3500,
      'F3r 导览第 2 步时点「排版」：气泡与圈收起、不写看过，排版里不再出现；Esc 照常回书写（不被导览吞掉）；回书写约 1.5 秒后从第 2 步接着出', J({ a, b2, b3, c, d }));
    await close(pg);
  }));

  /* ================= F5 旧快捷键两外壳同效 ================= */
  /* 每步：k＝真实按键序列（Playwright key 名）；pre/post 页面内准备 / 收尾（两外壳完全相同的语句）；gap 按键间隔（六线谱两位品位的 0.7 秒连击窗口之外） */
  const STEPS = {
    songbie: [
      { n: '数字', k: ['5', '3', '1'] }, { n: 'QWERTYU', k: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'e'] }, { n: '.', k: ['.'] }, { n: 'D / Shift+D', k: ['d', 'Shift+D'] },
      { n: '+ −', k: ['+', '-'] }, { n: '# b', k: ['#', 'b'] }, { n: '~', k: ['~'] }, { n: 'x（简谱无作用）', k: ['x'] }, { n: 'Insert', k: ['Insert'] }, { n: 'Delete', k: ['Delete'] },
      { n: 'Ctrl+Z', k: ['Control+z'] }, { n: 'Ctrl+Y', k: ['Control+y'] },
      { n: 'Ctrl+C / Ctrl+V', k: ['Control+c'], post: () => { sel = Object.assign({}, sel, { mi: 3, ci: 0 }); render(); }, k2: ['Control+v'] },
      { n: 'Ctrl+K 和弦', k: ['Control+k'], type: 'Am', k2: ['Enter'] },
      { n: 'Enter 填词', k: ['Enter'], type: '啦', k2: ['Enter'], type2: '呀', k3: ['Escape'] },
      { n: '空格 播放 / 停', k: [' '], gapAfter: 350, k2: [' '] },
      { n: 'Ctrl+S', k: ['Control+s'] },
      { n: 'Alt+N 开 / Esc 关', k: ['Alt+n'], probe: () => !!document.getElementById('modal-mask'), k2: ['Escape'] },
      { n: 'Alt+B', k: ['Alt+b'], post: () => { try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {} } },
      { n: 'Alt+↑↓', k: ['Alt+ArrowDown', 'Alt+ArrowUp'] },
      { n: 'Tab', k: ['Tab'] },
      { n: 'Ctrl+滚轮', wheel: true },
      { n: 'Alt+Shift+N', k: ['Alt+Shift+N'], probe: () => docs.length }
    ],
    gtr: [
      { n: '品位数字', k: ['3', '5'], gap: 800 }, { n: 'x 闷音', k: ['x'] }, { n: 'QWERTYU', k: ['r', 'e'] }, { n: '.', k: ['.'] }, { n: 'D', k: ['d'] },
      { n: 'Insert / Delete', k: ['Insert', 'Delete'] }, { n: 'Alt+↓', k: ['Alt+ArrowDown'] }, { n: 'Tab → 旋律', k: ['Tab'] }, { n: '数字（旋律）', k: ['6', '5'] },
      { n: '+ − ~', k: ['+', '-', '~'] }, { n: 'Ctrl+Z ×2', k: ['Control+z', 'Control+z'] }, { n: 'Ctrl+K', k: ['Control+k'], type: 'G', k2: ['Enter'] }
    ],
    piano: [
      { n: '数字', k: ['1', '3', '5'] }, { n: '# b', k: ['#', 'b', 'b'] }, { n: '+ −', k: ['+', '+', '-'] }, { n: 'QWERTYU', k: ['r', 'r', 'e'] }, { n: '. ~', k: ['.', '~'] },
      { n: 'Alt+↓ 左手', k: ['Alt+ArrowDown'] }, { n: '数字（左手）', k: ['1', '5'] }, { n: 'Delete', k: ['Delete'] }, { n: 'Ctrl+Z / Y', k: ['Control+z', 'Control+y'] }
    ]
  };
  const runSteps = async (pg, k) => {
    await scn(pg, k, { mi: 1 });
    const rec = [];
    const blur = () => EV(pg, () => { try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {} });
    const press = async (keys, gap) => { for (const x of keys || []) { await pg.keyboard.press(x); await wait(pg, gap || 60); } };
    rec.push({ n: '起点', j: await EV(pg, () => JSON.stringify(song)) });
    for (const s of STEPS[k]) {
      await blur();
      let probe = null;
      if (s.wheel) {
        const r = await EV(pg, () => __R('#score-wrap'));
        await pg.mouse.move(r.x + r.w / 2, r.y + Math.min(260, r.h / 2));
        await pg.keyboard.down('Control'); await pg.mouse.wheel(0, -120); await wait(pg, 150); await pg.keyboard.up('Control');
        probe = await EV(pg, () => viewZoom);
      } else {
        await press(s.k, s.gap);
        if (s.probe) probe = await EV(pg, s.probe);
        if (s.post) await EV(pg, s.post);
        if (s.gapAfter) await wait(pg, s.gapAfter);
        if (s.type) { await pg.keyboard.type(s.type); await wait(pg, 80); }
        await press(s.k2, s.gap);
        if (s.type2) { await pg.keyboard.type(s.type2); await wait(pg, 80); }
        await press(s.k3, s.gap);
      }
      await wait(pg, 120);
      const st = await EV(pg, () => ({ j: JSON.stringify(song), sel: [sel.row, sel.vi, sel.mi, sel.ci, sel.si].join(':'), nd: docs.length, cur: curDocI,
        play: !!(typeof audio !== 'undefined' && audio.playing), modal: !!document.getElementById('modal-mask'), pop: !!document.getElementById('popmenu') }));
      rec.push(Object.assign({ n: s.n, probe }, st));
    }
    return rec;
  };
  if (want('F5')) for (const k of Object.keys(STEPS)) jobs.push(() => SAFE('F5', 'F5 ' + k, async () => {
    const [pf, pc] = await Promise.all([open(1280, 800, { tag: 'F5f-' + k, url: FLOWU }), open(1280, 800, { tag: 'F5c-' + k, url: CLASSICU })]);
    const shells = await Promise.all([EV(pf, () => document.body.classList.contains('flow')), EV(pc, () => document.body.classList.contains('flow'))]);
    const base = await (async () => { await scn(pf, k); return redBase(pf); })();
    const [A, B] = await Promise.all([runSteps(pf, k), runSteps(pc, k)]);
    const diff = [];
    A.forEach((a, i) => { const c = B[i] || {};
      if (a.j !== c.j) { let x = 0; while (x < a.j.length && a.j[x] === c.j[x]) x++; diff.push(a.n + ' song@' + x + ' flow=' + J(a.j.slice(x, x + 50)) + ' classic=' + J((c.j || '').slice(x, x + 50))); }
      if (a.sel !== c.sel) diff.push(a.n + ' sel ' + a.sel + ' / ' + c.sel);
      if (J(a.probe) !== J(c.probe) || a.nd !== c.nd || a.cur !== c.cur || a.play !== c.play || a.modal !== c.modal || a.pop !== c.pop)
        diff.push(a.n + ' 状态 ' + J({ probe: a.probe, nd: a.nd, cur: a.cur, play: a.play, modal: a.modal, pop: a.pop }) + ' / ' + J({ probe: c.probe, nd: c.nd, cur: c.cur, play: c.play, modal: c.modal, pop: c.pop })); });
    const changed = A.filter((a, i) => i && a.j !== A[i - 1].j).map(a => a.n);
    const last = A[A.length - 1] || {};
    const extra = k === 'songbie' ? (A.find(a => a.n === 'Alt+N 开 / Esc 关') || {}).probe === true && (A.find(a => a.n === 'Ctrl+滚轮') || {}).probe > 1 && (A.find(a => a.n === 'Alt+Shift+N') || {}).probe === 2 && !last.modal
      : true;
    T('F5', shells[0] && !shells[1] && !diff.length && changed.length >= (k === 'songbie' ? 10 : 5) && extra,
      'F5 ' + k + '（' + { songbie: '简谱 送别', gtr: '六线谱 两只老虎', piano: '五线谱 欢乐颂钢琴' }[k] + '）：' + STEPS[k].length + ' 步真实按键在 flow 与旧外壳下逐步 JSON.stringify(song) / 光标 / 窗口数 / 播放 / 弹窗状态相同（' + changed.length + ' 步改了谱）',
      diff.length ? diff.slice(0, 4).join('\n      ') : 'probe ' + J(A.filter(a => a.probe != null).map(a => [a.n, a.probe])));
    await EV(pf, () => { try { switchDocTo(0); } catch (_) {} });   /* Alt+Shift+N 新开了一个窗口：红线比的是这份谱本身 */
    /* 本串按键应写的现有字段：歌词 / 和弦（Ctrl+K 记最近用过的和弦 song.chordRecent）/ 连音线 / 变音 / 八度 / 附点 / 闷音（N.x）与六线谱品位字面（N.lit）/ 起播补写的轨混音缺省（trackCfg） */
    await redEnd('F5-' + k, pf, base, ['S.lyricLines', 'S.chordRecent', 'S.mixer', 'X.on', 'X.solo', 'X.inst', 'X.vol', 'X.pan', 'C.lyrics', 'C.chord', 'C.tie', 'C.acc', 'C.oct', 'C.dotted', 'C.ext', 'N.x', 'N.lit', 'C.tup', 'C.tupM']);
    await Promise.all([close(pf), close(pc)]);
  }));

  /* ================= F6 旧入口去向（Ctrl+/ 搜索）================= */
  if (want('F6')) jobs.push(() => SAFE('F6', 'F6', async () => {
    const pg = await open(1280, 800, { tag: 'F6' });
    await scn(pg, 'songbie'); const base = await redBase(pg);
    const Q = [['预设', /^示例曲谱$/, /文件 ▾.*原「预设」/], ['打印…', /^打印 \/ 存 PDF$/, /输出.*打印存档.*原顶栏「打印…」/], ['智能', /^智能$/, /右栏 · 智能（原顶栏「智能」）/],
      ['存为文件', /^存为文件/, /文件 ▾ · Ctrl\+S/], ['经典版', /^使用旧版布局$/, /账号 ▾ · 偏好设置「使用旧版布局」/]];
    const got = [];
    for (const [q, nre, wre] of Q) {
      await EV(pg, () => { try { FLOW.menu.close(); } catch (_) {} try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {} });
      await pg.keyboard.press('Control+Slash'); await wait(pg, 200);
      const inp = await EV(pg, () => { const a = document.activeElement; return a && a.tagName === 'INPUT' ? a.id || 'input' : null; });
      await pg.keyboard.type(q); await wait(pg, 200);
      const r = await EV(pg, () => { const r0 = document.querySelector('#flw-cmdl .flw-cmdr'); return r0 ? { t: (r0.querySelector('.flw-cmdt') || {}).textContent, w: (r0.querySelector('.flw-cmdw') || {}).textContent, id: r0.dataset.v, dis: r0.getAttribute('aria-disabled') } : null; });
      got.push({ q, inp, r, ok: !!inp && !!r && nre.test(r.t) && wre.test(r.w) && r.dis !== 'true' });
      if (q === '经典版') {
        await pg.keyboard.press('Enter'); await wait(pg, 250);
        const p = await EV(pg, () => { const r = document.querySelector('#modal-mask .prf-row[data-prf="oldshell"]'); return r ? { on: r.getAttribute('aria-checked'), focus: document.activeElement === r, hl: r.classList.contains('prf-hl'), key: localStorage.getItem('musetab-flow') } : null; });
        got.push({ q: '经典版 Enter', p, ok: !!p && p.on === 'false' && p.focus && p.hl && p.key === null });
        await shot(pg, 'F6-classic-cmd-prefs-1280');
        await EV(pg, () => closeModal());
      } else await pg.keyboard.press('Escape');
      await wait(pg, 120);
    }
    T('F6', got.every(x => x.ok), 'F6 Ctrl+/ 搜旧入口名：「预设」→ 示例曲谱（文件 ▾，原「预设」）· 「打印…」→ 打印 / 存 PDF（输出 · 打印存档）· 「智能」→ 右栏 · 智能 · 「存为文件」→ 文件 ▾ · Ctrl+S · 「经典版」→ 使用旧版布局（账号 ▾ · 偏好设置），回车打开偏好设置并聚焦、标出该行（不直接切换）',
      J(got.filter(x => !x.ok).length ? got.filter(x => !x.ok) : got.map(x => x.q + '→' + (x.r ? x.r.t + ' 在 ' + x.r.w : J(x.p)))));
    await redEnd('F6', pg, base, []);
    await close(pg);
  }));

  /* ================= F7 TRK-5 · TRK-6 · PN-5（两外壳同口径）================= */
  if (want('F7')) jobs.push(() => SAFE('F7', 'F7a', async () => {
    const res = {};
    for (const [nm, url] of [['flow', FLOWU], ['classic', CLASSICU]]) {
      const pg = await open(1280, 800, { tag: 'F7a-' + nm, url });
      await scn(pg, 'gtr'); const base = await redBase(pg);
      res[nm] = await EV(pg, () => {
        const tc = trackCfg('tab', 0); tc.vol = 0; trackCfg('tab', 1).vol = 0.5; render();
        play(); const g0 = { t0: audio.tracks['tab:0'].dry.gain.value, t1: audio.tracks['tab:1'].dry.gain.value, v0: audio.tracks['vox:0'].dry.gain.value };
        const calls = []; const tb = audio.tracks['vox:0'].dry.gain, o = tb.setTargetAtTime; tb.setTargetAtTime = function (v) { calls.push(v); return o.apply(this, arguments); };
        trackCfg('vox', 0).vol = 0; applyMixLive(); trackCfg('vox', 0).vol = null; applyMixLive(); trackCfg('vox', 0).vol = 1;
        stopPlay();
        return { g0, live: calls.map(v => Math.round(v * 1000) / 1000) };
      });
      /* 读数：旧外壳混音台 / flow 音轨行 ⋯ */
      if (nm === 'classic') { await EV(pg, () => setMixerExpanded(true)); await wait(pg, 200);
        res[nm].ro = await EV(pg, () => { const r = document.querySelector('#mx-tracks .mx-row[data-kind="tab"][data-vi="0"]'); return r ? { v: r.querySelector('.mx-vol input').value, t: r.querySelector('.mx-vol .vv').textContent } : null; });
        await EV(pg, () => setMixerExpanded(false)); }
      else { await pg.hover('#flw-tr-tab-0', { position: { x: 20, y: 18 } }); await pg.click('#flw-tr-tab-0 [data-fa="tree:more"]'); await wait(pg, 200);
        res[nm].ro = await EV(pg, () => { const r = document.querySelector('#popmenu [data-mx="vol"]'), o = document.querySelector('#popmenu [data-mxo="vol"]'); return r ? { v: r.value, t: o.textContent, min: r.min } : null; });
        await EV(pg, () => FLOW.menu.close()); }
      await redEnd('F7a-' + nm, pg, base, ['S.mixer', 'X.on', 'X.solo', 'X.inst', 'X.vol', 'X.pan']);   /* 用例自己写的轨音量（trackCfg 补写缺省条目） */
      await close(pg);
    }
    const f = res.flow, c = res.classic;
    T('F7', J(f.g0) === J(c.g0) && f.g0.t0 === 0 && f.g0.t1 === 0.5 && f.g0.v0 === 1 && J(f.live) === J(c.live) && J(f.live) === '[0,1]',
      'F7a TRK-5 存了 vol=0 的轨按静音发声（起播总线增益 0；0.5 照旧 0.5；播放中改成 0 → setTargetAtTime(0)，改回缺省 null → 1），两外壳逐值相同（此前 cfg.vol||1 把 0 当全音量）', J({ f, c }));
    T('F7', !!f.ro && !!c.ro && f.ro.t === '0%' && c.ro.t === '0%' && f.ro.v === '0' && c.ro.v === '0' && f.ro.min === '0',
      'F7b TRK-5 读数同口径：经典混音台与 flow 音轨行 ⋯ 都显示 0%（滑杆在 0；flow 滑杆 0–150 与经典混音台同范围）', J({ f: f.ro, c: c.ro }));
  }));
  if (want('F7')) jobs.push(() => SAFE('F7', 'F7c', async () => {
    const pg = await open(1280, 800, { tag: 'F7c', url: CLASSICU });
    await scn(pg, 'gtr'); const base = await redBase(pg);
    await EV(pg, () => { song.mixer = { 'tab:0': { on: false, solo: false, inst: 'steel', vol: 1, pan: null }, 'tab:1': { on: true, solo: false, inst: 'nylon', vol: 0.5, pan: null } }; song.tabCapos = [null, 3]; render(); __toasts.length = 0; });
    const j0 = await EV(pg, () => JSON.stringify(song));
    /* 旧外壳左轨的删轨叉（.vdel[data-k="tvdel"]，chipHandler 委托）；它在收起的面板里时退回同一入口 delVoiceAt */
    const via = await EV(pg, () => { const x = document.querySelector('#left-dock .vdel[data-k="tvdel"][data-idx="0"]'); if (x) { x.click(); return 'vdel'; } delVoiceAt('tab', 0); return 'delVoiceAt'; });
    await wait(pg, 200);
    const a = await EV(pg, () => ({ flow: document.body.classList.contains('flow'), mx: JSON.stringify(song.mixer), cap: JSON.stringify(song.tabCapos), n: song.tabVoices.length, t: __toasts.slice(-1)[0] || '' }));
    await pg.keyboard.press('Control+z'); await wait(pg, 150);
    const j1 = await EV(pg, () => JSON.stringify(song));
    const mx = JSON.parse(a.mx);
    T('F7', !a.flow && a.n === 1 && !mx['tab:1'] && mx['tab:0'] && mx['tab:0'].inst === 'nylon' && mx['tab:0'].vol === 0.5 && mx['tab:0'].on === true && a.cap === '[null]' && /原来夹 3 品/.test(a.t) && j1 === j0,
      'F7c TRK-6 旧外壳删第 1 条吉他轨（' + via + '）：song.mixer 的 tab:* 随行删、其后前移，tabCapos 随行删并提示参考轨夹位；Ctrl+Z 一步逐字节还原（v68.0 只在 flow 生效，v68.2 去守卫）', J({ via, a }));
    await redEnd('F7c', pg, base, ['S.mixer', 'S.tabCapos', 'X.on', 'X.solo', 'X.inst', 'X.vol', 'X.pan']);   /* 用例预置的混音与逐轨变调夹 */
    await close(pg);
  }));
  if (want('F7')) jobs.push(() => SAFE('F7', 'F7d', async () => {
    const res = {};
    for (const [nm, url] of [['flow', FLOWU], ['classic', CLASSICU]]) {
      const pg = await open(1280, 800, { tag: 'F7d-' + nm, url });
      await scn(pg, 'piano'); const base = await redBase(pg);
      const rd = async mi => { await EV(pg, mi => { sel = { mi, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); }, mi); await wait(pg, 150);
        return EV(pg, () => [...document.querySelectorAll('#eb-note > .nd')].filter(b => +b.dataset.nd >= 1 && +b.dataset.nd <= 7).sort((a, b) => +a.dataset.nd - +b.dataset.nd)
          .map(b => { const l = b.querySelector('.flw-ltr'); return ((l && __vis(l)) ? l : b.querySelector('.dg')).textContent.trim(); }).join('')); };
      await EV(pg, () => { song.key = 'C'; song.measures[4].keyTo = 'G'; render(); });
      res[nm] = { m0: await rd(0), m5: await rd(5),
        t5: await EV(pg, () => (document.querySelector('#eb-note > .nd[data-nd="1"]') || {}).title || '') };
      await redEnd('F7d-' + nm, pg, base, ['M.keyTo']);
      await close(pg);
    }
    T('F7', res.classic.m0 === 'CDEFGAB' && res.classic.m5 === 'GABCDEF' && /音名 G/.test(res.classic.t5) && res.flow.m5 === res.classic.m5 && res.flow.m0 === res.classic.m0,
      'F7d PN-5 旧外壳五线谱音名键按本小节调：第 1 小节（1=C）音级 1–7 写 C–B，转调后第 6 小节（1=G）写 G A B C D E F、提示「音名 G」，与 flow 行 2 的字母逐个相同（此前旧外壳按全曲调写 C–B）', J(res));
  }));

  /* ================= F8 v68.2 收尾修复（上线前最后一轮验收：NU / OU / ENG 各条）================= */
  const JARGON = /拍板|需负责人|负责人拍板|measures\[\]|外壳这一层|下一批/;
  /* F8a NU-2：界面上不出现内部开发 / 流程用语——音轨 ⋯ 菜单灰显项、排版工具组与右栏版式、输出左栏「输出内容」、命令面板「分谱 / 换页」的说明与 toast */
  if (want('F8')) jobs.push(() => SAFE('F8', 'F8a', async () => {
    const pg = await open(1280, 800, { tag: 'F8a' });
    await scn(pg, 'piano'); const base = await redBase(pg);
    const grab = () => EV(pg, () => { const out = []; document.querySelectorAll('#popmenu, #flw-left, #editbar, #right-dock, #flw-out-list, #flw-lay-rep').forEach(r => {
      if (!r) return; out.push(r.innerText || '');
      r.querySelectorAll('[title],[data-why],[aria-label]').forEach(e => ['title', 'data-why', 'aria-label'].forEach(a => { const v = e.getAttribute(a); if (v) out.push(v); })); }); return out.join('\n'); });
    const texts = [];
    await pg.click('#flw-tlist .flw-trow.on [data-fa="tree:more"]'); await wait(pg, 200); texts.push(await grab());
    for (const lb of ['锁定此轨', '上移']) { await EV(pg, l => { const b = [...document.querySelectorAll('#popmenu [data-fa]')].find(x => (x.textContent || '').indexOf(l) >= 0); if (b) b.click(); }, lb); await wait(pg, 120); }
    await EV(pg, () => { try { FLOW.menu.close(); } catch (_) {} });
    await EV(pg, () => setMode('engrave')); await wait(pg, 900); texts.push(await grab());
    await EV(pg, () => { const b = document.querySelector('#flw-eng [data-fa="lay:pbrk"]'); if (b) b.click(); }); await wait(pg, 120);
    await EV(pg, () => setMode('output')); await wait(pg, 900); texts.push(await grab());
    await EV(pg, () => { const b = document.getElementById('flw-out-parts'); if (b) b.click(); }); await wait(pg, 120);
    const cmd = await EV(pg, () => ['分谱', '换页', '页码', '锁定此轨'].map(q => (FLOW.cmd.search(q).hits || []).slice(0, 3).map(c => [c.t, typeof c.w === 'function' ? c.w() : c.w, c.ok ? (() => { try { return c.ok() || ''; } catch (_) { return ''; } })() : ''].join(' | ')).join('\n')).join('\n'));
    await EV(pg, () => setMode('write')); await wait(pg, 300);
    const toasts = await EV(pg, () => __toasts.slice());
    const all = texts.join('\n') + '\n' + cmd + '\n' + toasts.join('\n');
    const bad = (all.match(new RegExp(JARGON.source, 'g')) || []);
    const soon = /即将推出/.test(texts.join('')) && toasts.some(t => /此处换页：即将推出/.test(t)) && toasts.some(t => /按演奏者出分谱：即将推出/.test(t)) && toasts.some(t => /锁定此轨：即将推出/.test(t)) && toasts.some(t => /音轨排序：即将推出/.test(t));
    T('F8', !bad.length && soon, 'F8a NU-2 音轨 ⋯ 灰显项 / 排版工具组 · 右栏版式 / 输出左栏「输出内容」 / 命令面板「分谱 · 换页 · 页码 · 锁定此轨」/ 点灰显项的 toast：不出现「拍板 / 需负责人 / measures[] / 外壳这一层 / 下一批」，一律写「即将推出」',
      J({ bad, toasts: toasts.filter(t => /即将推出|拍板|下一批/.test(t)) }));
    await shot(pg, 'F8a-output-list-1280');
    await redEnd('F8', pg, base, []);
    await close(pg);
  }));
  /* F8b NU-3：「此处换行」后单独成行的那一小节不显示「已锁定」；点它＝锁定（不删换行），再点＝改回、用户的换行仍在；每行小节数 ± 留下的「并入上一行」凑成的锁定样子，点开锁也只清行内、两端换行保留 */
  if (want('F8')) jobs.push(() => SAFE('F8', 'F8b', async () => {
    const pg = await open(1280, 800, { tag: 'F8b' });
    await scn(pg, 'songbie'); const base = await redBase(pg);
    await EV(pg, () => setMode('engrave')); await wait(pg, 1200);
    const st = () => EV(pg, () => ({ rows: FLOW.lay.rowsNow().map(r => r.m2 - r.m1 + 1).join('/'), f: song.measures.map((m, i) => (m.brk ? 'b' + i : '') + (m.pull ? 'p' + i : '')).filter(Boolean).join(','),
      lock: (document.getElementById('flw-eng-lock') || { getAttribute: () => null }).getAttribute('aria-pressed') }));
    const pick = mi => EV(pg, m => { sel = Object.assign({}, sel, { mi: m, ci: 0 }); FLOW.sync(); }, mi);
    const s0 = await st();
    const r2 = await EV(pg, () => { const r = FLOW.lay.rowsNow()[1]; return r ? [r.m1, r.m2] : null; });
    await pick(r2[0] + 1); await wait(pg, 300);
    await pg.click('#flw-eng-brk'); await wait(pg, 900);
    const s1 = await st();
    await pick(r2[0]); await wait(pg, 400);
    const s2 = await st();
    await pg.click('#flw-eng-lock'); await wait(pg, 900);
    const s3 = await st();
    await pg.click('#flw-eng-lock'); await wait(pg, 900);
    const s4 = await st();
    /* ± 每行小节数 → 此处换行 → 锁定键（j2 路径） */
    await EV(pg, () => { while (undoStack.length) undo(); }); await wait(pg, 600);
    await pick(0); await wait(pg, 300);
    await EV(pg, () => { const b = document.querySelector('#flw-eng [data-fa="lay:bars"][data-d="-1"]'); if (b) b.click(); }); await wait(pg, 800);
    await EV(pg, () => { const b = document.querySelector('#flw-eng [data-fa="lay:bars"][data-d="1"]'); if (b) b.click(); }); await wait(pg, 800);
    await pick(2); await wait(pg, 300);
    await pg.click('#flw-eng-brk'); await wait(pg, 900);
    const t1 = await st();
    await pg.click('#flw-eng-lock'); await wait(pg, 900);
    const t2 = await st();
    const brks = f => (f.match(/b\d+/g) || []).join(',');
    T('F8', s2.lock === 'false' && s3.lock === 'true' && brks(s3.f) === brks(s1.f) && s4.lock === 'false' && brks(s4.f) === brks(s1.f) && s4.rows === s1.rows
      && brks(t2.f) === brks(t1.f) && t2.rows === t1.rows,
      'F8b NU-3「此处换行」后第 ' + (r2[0] + 1) + ' 小节单独一行：锁定键不按下；点＝锁定（换行不删）、再点＝改回（换行仍在、每行小节数不变）；每行小节数 ± 后再换行、点锁定键：两端换行保留、版面不变',
      J({ s0, s1, s2, s3, s4, t1, t2 }));
    await redEnd('F8', pg, base, ['M.brk', 'M.pull', 'L.preset']);
    await close(pg);
  }));
  /* F8c NU-6 纯和弦谱：行 2「作用于」芯片 · 状态栏当前轨 · 音轨树三处都写「和弦谱」；F8c2 OU-8 / NU-11 新外壳文案指向新位置 */
  if (want('F8')) jobs.push(() => SAFE('F8', 'F8c', async () => {
    const pg = await open(1280, 800, { tag: 'F8c' });
    await EV(pg, () => { window.guardReplace = p => p(); hideStartPad(); const c = createSong('func', { title: '和弦谱测试', key: 'C', beats: 4, unit: 4, nMea: 4, ftype: 'chord' });
      addDoc(c, () => {}); closeDocAt(0); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); });
    await wait(pg, 300);
    const a = await EV(pg, () => ({ chordOnly: !!song.chordOnly, scope: (document.querySelector('#flw-scope .flw-sn') || {}).textContent || '',
      tree: (() => { const m = FLOW.tree.model(); const x = m && m.T.find(t => t.k === 'vox' && t.i === 0); return x && x.nota; })(),
      st: (document.getElementById('mixer-dock') || {}).innerText || '' }));
    T('F8', a.chordOnly && /和弦谱/.test(a.scope) && !/简谱/.test(a.scope) && a.tree === 'chord' && !/旋律1 · 简谱|简谱 · 第/.test(a.st),
      'F8c NU-6 纯和弦谱（chordOnly）：行 2「作用于」芯片写「' + a.scope + '」，与音轨树（nota=chord）同口径，状态栏不再写「· 简谱」', J(a));
    const b2 = await EV(pg, () => {
      const out = {};
      /* v68.3 迁移：起步收回谱面上方的悬浮条——展开着时落地提示不再写「下一步见…」（guide 返回 ''），收起时说「谱面上方的悬浮条」 */
      out.exp = FLOW.sbar.expanded(); out.guide = FLOW.sbar.guide('——下一步见谱面上方的谱型条：先写旋律');
      try { showQuickbar(400, 300, true); const q = document.querySelector('#quickbar [data-qb="off"]'); __toasts.length = 0; if (q) q.click(); out.qboff = __toasts.slice(-1)[0] || ''; localStorage.removeItem('musetab-quickbar'); } catch (e) { out.qboff = 'ERR ' + e.message; }
      return out; });
    /* 真实新建一份钢琴伴奏歌谱（新建面板）：悬浮条展开 → 落地 toast 不提谱型条 / 起步 / 下一步见；收起 → 再建一份，toast 写「谱面上方的悬浮条」 */
    const mk = async () => { await EV(pg, () => { __toasts.length = 0; showNewWizard(); }); await wait(pg, 400);
      await pg.click('.nf-modal [data-scene="pacc"]').catch(() => {}); await wait(pg, 200);
      await pg.click('#nw-create'); await wait(pg, 700);
      return EV(pg, () => ({ t: __toasts.filter(x => /已新建/.test(x)).slice(-1)[0] || '', k: NWB.stackOf(song), bar: FLOW.sbar.shown() })); };
    const b3 = await mk();
    await EV(pg, () => FLOW.sbar.toggle({ exp: false }));
    const b4 = await mk();
    await EV(pg, () => FLOW.sbar.toggle({ exp: true }));
    T('F8', b2.exp && b2.guide === '' && /账号 ▾ ›「偏好设置」/.test(b2.qboff) && !/顶栏「偏好设置」/.test(b2.qboff)
      && b3.k === 'JG' && b3.bar && !!b3.t && !/谱型条|起步|下一步见|工具栏左端/.test(b3.t) && b4.k === 'JG' && /谱面上方的悬浮条/.test(b4.t) && !/谱型条|工具栏左端/.test(b4.t),
      'F8c2 NU-11 / OU-8 新外壳文案（v68.3 迁移）：新建钢琴伴奏歌谱——悬浮条展开时落地 toast 不再写「谱型条 / 起步 / 下一步见」（条就在屏上），收起时写「谱面上方的悬浮条」；浮条「✕」的 toast 指向「账号 ▾ ›「偏好设置」」（新外壳没有顶栏偏好设置钮）', J({ b2, b3, b4 }));
    await close(pg);
  }));
  /* F8d NU-7：「还有 N 条 ↓」文字区实底（渐隐只留在提示条上方），不再透出下面的组标题 */
  if (want('F8')) jobs.push(() => SAFE('F8', 'F8d', async () => {
    const pg = await open(1280, 640, { tag: 'F8d' });
    await scn(pg, 'piano');
    await EV(pg, () => { for (let i = 0; i < 3; i++) { try { FLOW.act('tree:addvox', { dataset: {} }, null); } catch (_) {} } sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); });
    await wait(pg, 400);
    await EV(pg, () => { const L = document.getElementById('flw-tlist'); L.scrollTop = 0; L.dispatchEvent(new Event('scroll')); });   /* 当前行在顶上、下面还有轨 → 出「还有 N 条 ↓」 */
    await wait(pg, 300);
    const r = await EV(pg, () => { const m = document.querySelector('#flw-tlist .flw-tmore'); if (!m) return null; const cs = getComputedStyle(m), bf = getComputedStyle(m, '::before'), q = m.getBoundingClientRect();
      const h = document.elementFromPoint(q.left + q.width / 2, q.top + 4);
      return { t: m.textContent, bg: cs.backgroundColor, img: cs.backgroundImage, before: bf.content, bfImg: bf.backgroundImage, topHit: !!(h && (h === m || m.contains(h))) }; });
    const opaque = c => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return false; const v = m[1].split(',').map(Number); return v.length < 4 || v[3] === 1; };
    T('F8', !!r && /还有 \d+ 条/.test(r.t) && r.img === 'none' && opaque(r.bg) && /gradient/.test(r.bfImg) && r.topHit,
      'F8d NU-7「还有 N 条 ↓」整条实底（背景色不透明、无渐变图）、上方 ::before 才是渐隐；提示条上沿点下去命中它自己（不是透出来的组标题）', J(r));
    await shot(pg, 'F8d-tmore-1280x640');
    await close(pg);
  }));
  /* F8e NU-8：关窗（单关 / 关闭其他）时原样示例谱不转存进「我的曲谱」；改过一笔的示例谱照旧转存 */
  if (want('F8')) jobs.push(() => SAFE('F8', 'F8e', async () => {
    const pg = await open(1280, 800, { tag: 'F8e' });
    const r = await EV(pg, () => { window.guardReplace = p => p(); hideStartPad(); localStorage.setItem('musetab-library-v1', '[]');
      const keep = createSong('vocal', { title: '主窗口', key: 'C', beats: 4, unit: 4, nMea: 2, nTab: 0, nVox: 1, lyr: 0 }); keep.measures[0].voxes[0][0].deg = 1; loadSong(keep); docs = [{ song, sel: null }]; curDocI = 0;
      const p0 = __P('小星星'), p1 = __P('送别'); p1.measures[0].voxes[0][0].deg = (p1.measures[0].voxes[0][0].deg % 7) + 1;
      addDoc(p0, () => {}); addDoc(p1, () => {}); switchDocTo(0); renderDocTabs(); __toasts.length = 0;
      FLOW.act('r1:closeothers', { dataset: {} }, null);
      const lib = JSON.parse(localStorage.getItem('musetab-library-v1') || '[]').map(e => e.title);
      return { docs: docs.length, lib, toasts: __toasts.slice(), t0: p0.title, t1: p1.title }; });
    await close(pg);
    /* 旧外壳同口径（closeDocAt 是共享函数）：页签 × 关原样示例谱不转存；改过的照旧转存 */
    const pc = await open(1280, 800, { tag: 'F8e-classic', url: CLASSICU });
    const c = await EV(pc, () => { window.guardReplace = p => p(); hideStartPad(); localStorage.setItem('musetab-library-v1', '[]');
      const keep = createSong('vocal', { title: '主窗口', key: 'C', beats: 4, unit: 4, nMea: 2, nTab: 0, nVox: 1, lyr: 0 }); keep.measures[0].voxes[0][0].deg = 1; loadSong(keep); docs = [{ song, sel: null }]; curDocI = 0;
      const p0 = __P('欢乐颂'), p1 = __P('两只老虎'); p1.composer = (p1.composer || '') + '（改）';
      addDoc(p0, () => {}); addDoc(p1, () => {}); switchDocTo(0); renderDocTabs(); __toasts.length = 0;
      const xOf = t => { const tab = [...document.querySelectorAll('#doc-tabs .dtab')].find(x => (x.querySelector('.dt-t') || {}).textContent === t); return tab && tab.querySelector('[data-doc-x]'); };
      const x0 = xOf(p0.title); if (x0) x0.click(); const x1 = xOf(p1.title); if (x1) x1.click();
      return { flow: document.body.classList.contains('flow'), docs: docs.length, lib: JSON.parse(localStorage.getItem('musetab-library-v1') || '[]').map(e => e.title), toasts: __toasts.slice(), t0: p0.title, t1: p1.title, x: !!x0 && !!x1 }; });
    await close(pc);
    T('F8', r.docs === 1 && r.lib.length === 1 && r.lib[0] === r.t1 && !r.lib.includes(r.t0) && r.toasts.some(t => t === '已关闭《' + r.t0 + '》') && r.toasts.some(t => /其中 1 个有内容的已存入/.test(t))
      && !c.flow && c.x && c.docs === 1 && c.lib.length === 1 && c.lib[0] === c.t1 && c.toasts.includes('已关闭《' + c.t0 + '》') && c.toasts.includes('已关闭《' + c.t1 + '》并存入「我的曲谱」'),
      'F8e NU-8 文件 ▾「关闭其他窗口」：原样示例谱《' + r.t0 + '》只关不存（toast「已关闭」）；改过一笔的《' + r.t1 + '》照旧转存（「其中 1 个有内容的已存入」）；旧外壳页签 × 同口径（《' + c.t0 + '》只关、改过的《' + c.t1 + '》转存）', J({ r, c }));
  }));
  /* F8f NU-9：启动台开着时文件 ▾「保存到我的曲谱」「存为文件」与复制 / 曲谱信息同口径灰显，点了只说原因，不存示例谱、不下载 */
  if (want('F8')) jobs.push(() => SAFE('F8', 'F8f', async () => {
    const pg = await open(1280, 800, { tag: 'F8f' });
    let dl = 0; pg.on('download', () => { dl++; });
    const lib0 = await EV(pg, () => ({ sp: startPadOn(), n: JSON.parse(localStorage.getItem('musetab-library-v1') || '[]').length }));
    await pg.click('#flw-file'); await wait(pg, 200);
    const m = await EV(pg, () => ['b-savemine', 'b-save', 'b-meta'].map(id => { const b = document.querySelector('#popmenu [data-old="' + id + '"]'); return b ? { id, dis: b.getAttribute('aria-disabled'), why: b.dataset.why || '' } : { id, none: true }; }));
    for (const id of ['b-savemine', 'b-save']) { if (!(await EV(pg, () => !!document.getElementById('popmenu')))) { await pg.click('#flw-file').catch(() => {}); await wait(pg, 150); }
      await EV(pg, i => { const b = document.querySelector('#popmenu [data-old="' + i + '"]'); if (b) b.click(); }, id); await wait(pg, 200); }
    const after = await EV(pg, () => ({ sp: startPadOn(), n: JSON.parse(localStorage.getItem('musetab-library-v1') || '[]').length, toasts: __toasts.slice() }));
    T('F8', lib0.sp && m.every(x => x.dis === 'true' && /先在启动台新建或打开/.test(x.why)) && after.sp && after.n === lib0.n && dl === 0 && after.toasts.filter(t => /先在启动台新建或打开一份谱/.test(t)).length >= 2,
      'F8f NU-9 启动台态 文件 ▾：「保存到我的曲谱」「存为文件」与「曲谱信息…」一样 aria-disabled、说明「先在启动台新建或打开一份谱」；点了不存入、不下载、启动台照旧', J({ m, lib0, after, dl }));
    await close(pg);
  }));
  /* F8g NU-10 / OU-5：Ctrl+/ 搜旧名与常用词——另存 / 页码 / 曲谱反色 / 界面风格 / 快速新建 / 升八度 / 降八度 / 记谱风格 / 编辑模式 / 清除记号 / 清空本段 / 添加歌词行 / 添加音轨 / 删除音轨 /
     由此生成六线谱轨 / 分解 / 品位选择器 / 清音 / 附点八分 / 小切分 / 2分 / 4分 / 8分：都有结果、首条是对应的那一项 */
  if (want('F8')) jobs.push(() => SAFE('F8', 'F8g', async () => {
    const pg = await open(1280, 800, { tag: 'F8g' });
    await scn(pg, 'songbie');
    const Q = [['另存', 'r1:file'], ['页码', 'lay:meta'], ['曲谱反色', 'acct:invert'], ['界面风格', 'acct:light'], ['快速新建', 'r1:last'], ['升八度', 'r2:octup'], ['降八度', 'r2:octdn'], ['高8度', 'r2:octup'], ['低8度', 'r2:octdn'],
      ['记谱风格', 'trk:notastyle'], ['编辑模式', 'st:emfree'], ['清除记号', 'pal:clear'], ['清空本段', 'tx:clearlyr'], ['添加歌词行', 'tx:verse'], ['添加音轨', 'trk:add'], ['删除音轨', 'trk:del'],
      ['由此生成六线谱轨', 'sm:gentab'], ['分解', 'r2:mute'], ['品位选择器', 'r2:fret'], ['清音', 'r2:clear'], ['附点八分', 'r2:combo'], ['小切分', 'r2:combo'], ['前八后十六', 'r2:combo'], ['2分', 'r2:d2'], ['4分', 'r2:d4'], ['8分', 'r2:d8']];
    const got = await EV(pg, Q => Q.map(([q, id]) => { const h = (FLOW.cmd.search(q).hits || []); return { q, want: id, top: h[0] ? h[0].id : null, n: h.length }; }), Q);
    /* 原有搜法不受影响（F6 / tv_modes PN-9 的几组） */
    const keep = await EV(pg, () => [['预设', 'r1:demo'], ['存为文件', 'r1:file'], ['经典版', 'acct:classic'], ['智能', 'rd:smart']].map(([q, id]) => { const h = FLOW.cmd.search(q).hits || []; return { q, ok: !!h[0] && h[0].id === id }; }));
    const bad = got.filter(x => x.top !== x.want);
    T('F8', !bad.length && keep.every(x => x.ok), 'F8g NU-10 / OU-5 Ctrl+/ 搜 ' + Q.length + ' 个旧名 / 常用词首条都对（另存 → 存为文件、页码 → 页头与页码…、曲谱反色 → 谱面反色、记谱风格 / 编辑模式 / 清除记号 / 删除音轨 / 由此生成六线谱轨 / 分解 / 品位选择器 / 组合时值等）；预设 / 存为文件 / 经典版 / 智能 照旧',
      J(bad.length ? bad : got.map(x => x.q + '→' + x.top)));
    /* 执行：「页码」回车进排版并打开曲谱信息；「删除音轨」回车打开当前轨 ⋯（里面有「删除音轨」） */
    await pg.keyboard.press('Control+Slash'); await wait(pg, 200); await pg.keyboard.type('页码'); await wait(pg, 200); await pg.keyboard.press('Enter'); await wait(pg, 600);
    const e1 = await EV(pg, () => ({ mode: FLOW.mode.cur, modal: !!document.getElementById('modal-mask') && /曲谱信息|标题/.test((document.querySelector('#modal-mask .modal') || {}).textContent || '') }));
    await EV(pg, () => { closeModal(); setMode('write'); }); await wait(pg, 400);
    await pg.keyboard.press('Control+Slash'); await wait(pg, 200); await pg.keyboard.type('删除音轨'); await wait(pg, 200); await pg.keyboard.press('Enter'); await wait(pg, 400);
    const e2 = await EV(pg, () => ({ menu: !!document.getElementById('popmenu') && [...document.querySelectorAll('#popmenu [data-fa="tree:del"]')].length === 1, n: (song.voxVoices || []).length }));
    await EV(pg, () => { try { FLOW.menu.close(); } catch (_) {} });
    T('F8', e1.mode === 'engrave' && e1.modal && e2.menu, 'F8g2 回车执行：「页码」→ 进排版、打开曲谱信息（页头在这里改）；「删除音轨」→ 打开当前轨 ⋯（含「删除音轨」，不直接删）', J({ e1, e2 }));
    await close(pg);
  }));
  /* F8h OU-1：右键浮条「…」在新外壳下去记号面板（聚焦搜记号框），旧左栏不动、旧外壳偏好键 musetab-flyclosed 不被删 */
  if (want('F8')) jobs.push(() => SAFE('F8', 'F8h', async () => {
    const out = {};
    for (const [nm, url, w] of [['flow', URL0, 1440], ['narrow', URL0, 1100], ['classic', CLASSICU, 1440]]) {
      const pg = await open(w, 900, { tag: 'F8h-' + nm, url, init: () => { try { if (!sessionStorage.getItem('__fl')) { localStorage.setItem('musetab-flyclosed', '1'); sessionStorage.setItem('__fl', '1'); } } catch (_) {} } });
      await scn(pg, 'songbie', { mi: 2 });
      await EV(pg, () => { const s = document.getElementById('score').getBoundingClientRect(), b = meaBoxes[sel.mi]; showQuickbar(s.left + (b ? b.x : 100) + 10, s.top + 120, true); });
      await wait(pg, 200);
      const t0 = await EV(pg, () => { const m = document.querySelector('#quickbar [data-qb="more"]'); return m ? m.title : null; });
      await pg.click('#quickbar [data-qb="more"]'); await wait(pg, 400);
      out[nm] = Object.assign({ title: t0 }, await EV(pg, () => ({ fly: localStorage.getItem('musetab-flyclosed'), flyOpen: !document.getElementById('left-flyout').classList.contains('hidden'),
        ae: (document.activeElement || {}).id || '', pqVis: __vis('#flw-pq'), flow: document.body.classList.contains('flow'), qb: !!document.getElementById('quickbar') })));
      await close(pg);
    }
    T('F8', out.flow.flow && out.flow.ae === 'flw-pq' && out.flow.pqVis && out.flow.fly === '1' && !out.flow.flyOpen && !out.flow.qb && /记号面板/.test(out.flow.title)
      && out.narrow.ae === 'flw-pq' && out.narrow.pqVis && out.narrow.fly === '1'
      && !out.classic.flow && out.classic.flyOpen && out.classic.fly === null && /图层面板/.test(out.classic.title),
      'F8h OU-1 右键浮条「…」：新外壳（1440 / 1100 窄档）→ 记号面板搜索框拿到焦点且可见，旧左栏不打开、musetab-flyclosed=\'1\' 不动、提示写「打开左栏记号面板」；旧外壳照旧打开对应图层面板（并按原口径清掉该键）',
      J(out));
  }));
  /* F8i OU-3 / OU-4：本机存储写不进时的「使用旧版布局」开关——显示实际外壳、点了直接换地址参数刷新；编辑器里切布局把一次性深链参数（?pub= / ?review= / ?f=）一起去掉 */
  if (want('F8')) jobs.push(() => SAFE('F8', 'F8i', async () => {
    const priv = () => { const s = Storage.prototype.setItem; Storage.prototype.setItem = function (k) { if (k === 'musetab-flow') { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; } return s.apply(this, arguments); }; };
    const pg = await open(1280, 800, { tag: 'F8i', url: CLASSICU, init: priv });
    await scn(pg, 'songbie');
    await EV(pg, () => showPrefs()); await wait(pg, 200);
    const a = await EV(pg, () => { const r = document.querySelector('#modal-mask .prf-row[data-prf="oldshell"]'); return { flow: document.body.classList.contains('flow'), on: r && r.getAttribute('aria-checked'), st: r && r.querySelector('.prf-st').textContent, key: localStorage.getItem('musetab-flow') }; });
    await clickReload(pg, '#modal-mask .prf-row[data-prf="oldshell"]');
    const b2 = await EV(pg, () => ({ flow: document.body.classList.contains('flow'), q: location.search, key: localStorage.getItem('musetab-flow') }));
    await EV(pg, () => showPrefs()); await wait(pg, 200);
    const c0 = await EV(pg, () => { const r = document.querySelector('#modal-mask .prf-row[data-prf="oldshell"]'); return { on: r && r.getAttribute('aria-checked') }; });
    await clickReload(pg, '#modal-mask .prf-row[data-prf="oldshell"]');
    const c = await EV(pg, () => ({ flow: document.body.classList.contains('flow'), q: location.search, toast: (document.getElementById('toast') || {}).textContent || '' }));
    await close(pg);
    T('F8', !a.flow && a.on === 'true' && a.st === '旧版' && a.key === null && b2.flow && !/shell=/.test(b2.q) && c0.on === 'false' && !c.flow && /shell=classic/.test(c.q),
      'F8i OU-3 本机存储写不进（setItem 抛 QuotaExceeded）、用 ?shell=classic 打开：开关显示实际外壳「旧版」（此前读键显示「新版」）；点关 → 去掉参数刷新回新外壳；新外壳里点开 → 带 ?shell=classic 刷新进旧外壳（只对本次）',
      J({ a, b2, c0, c }));
    /* OU-4：?pub= 打开（file:// 拉不到谱 → 编辑器），切布局后地址不再带 pub / f */
    const pp = await open(1280, 800, { tag: 'F8i-pub', url: withQ(URL0, 'pub=zz9demo&f=card') });
    await wait(pp, 1500); await prep(pp);
    const p0 = await EV(pp, () => ({ viewer: document.body.classList.contains('viewer'), flow: document.body.classList.contains('flow'), q: location.search }));
    await EV(pp, () => { try { closeModal(); } catch (_) {} showPrefs(); }); await wait(pp, 200);
    await clickReload(pp, '#modal-mask .prf-row[data-prf="oldshell"]');
    const p1 = await EV(pp, () => ({ viewer: document.body.classList.contains('viewer'), flow: document.body.classList.contains('flow'), q: location.search, key: localStorage.getItem('musetab-flow') }));
    T('F8', !p0.viewer && /pub=/.test(p0.q) && !p1.viewer && !p1.flow && p1.key === '0' && !/pub=|[?&]f=/.test(p1.q),
      'F8i2 OU-4 带 ?pub= 打开、没进观看页（拉谱失败）留在编辑器：偏好设置切旧版布局后刷新地址去掉 pub / f，不再落回观看页', J({ p0, p1 }));
    await close(pp);
  }));
  /* F8j OU-6 / OU-7：新外壳编辑态 Ctrl+O 打开文件（标注过 Ctrl+O）；谱库全屏页开着——Esc 关谱库、不在背后切模式，数字 / Delete 不穿过谱库改谱（两外壳同口径） */
  if (want('F8')) jobs.push(() => SAFE('F8', 'F8j', async () => {
    const res = {};
    for (const [nm, url] of [['flow', URL0], ['classic', CLASSICU]]) {
      const pg = await open(1280, 800, { tag: 'F8j-' + nm, url });
      await scn(pg, 'songbie');
      /* v68.4 CI：原来只等 400ms 数 filechooser，CI 上偶见 0 次（本机 1–6 倍降速均为 1 次）——改为最多等 3 秒等这一个事件，并记下诊断（焦点、keydown 是否被拦） */
      let fc = 0; pg.on('filechooser', () => { fc++; });
      await EV(pg, () => { window.__kdO = []; window.addEventListener('keydown', e => { if (e.code === 'KeyO') window.__kdO.push({ pre: e.defaultPrevented, foc: ((document.activeElement || {}).id || (document.activeElement || {}).tagName || '') }); }, true);
        window.addEventListener('keydown', e => { if (e.code === 'KeyO' && window.__kdO.length) window.__kdO[window.__kdO.length - 1].post = e.defaultPrevented; }, false); });
      const fcP = nm === 'flow' ? pg.waitForEvent('filechooser', { timeout: 3000 }).then(() => true).catch(() => false) : Promise.resolve(null);
      await pg.keyboard.press('Control+KeyO');
      const got = await fcP; if (nm !== 'flow') await wait(pg, 400);
      res[nm] = { ctrlO: fc, got, kd: await EV(pg, () => window.__kdO) };
      if (nm === 'flow') { await EV(pg, () => setMode('engrave')); await wait(pg, 700); }
      const j0 = await EV(pg, () => JSON.stringify(song));
      await EV(pg, () => openCircle()); await wait(pg, 300);
      for (const k of ['5', 'Delete', 'Backspace', '3']) { await pg.keyboard.press(k); await wait(pg, 80); }
      const mid = await EV(pg, j0 => ({ circle: !!document.getElementById('circle'), same: JSON.stringify(song) === j0 }), j0);
      await pg.keyboard.press('Escape'); await wait(pg, 300);
      Object.assign(res[nm], { mid, after: await EV(pg, () => ({ circle: !!document.getElementById('circle'), mode: (typeof FLOW !== 'undefined' && FLOW.active) ? FLOW.mode.cur : 'classic' })) });
      await close(pg);
    }
    T('F8', res.flow.ctrlO === 1 && res.flow.mid.circle && res.flow.mid.same && !res.flow.after.circle && res.flow.after.mode === 'engrave'
      && res.classic.mid.circle && res.classic.mid.same && !res.classic.after.circle,
      'F8j OU-6 新外壳编辑态 Ctrl+O → 打开文件（文件选择框 1 次，同启动台 #b-open）；OU-7 谱库全屏页开着按 5 / Delete / Backspace / 3 不改背后的谱（两外壳），Esc 关谱库、新外壳排版模式不被切回书写',
      J(res));
  }));
  /* F8k ENG-2：开机音轨树只画一遍（挂载时不再先画一遍、on() 再强制重画同样的内容） */
  if (want('F8')) jobs.push(() => SAFE('F8', 'F8k', async () => {
    const pg = await open(1280, 800, { tag: 'F8k', wait: 1500, init: () => {
      window.__tl = { w: 0, dup: 0 };
      new MutationObserver(rs => { rs.forEach(r => { if (r.type !== 'childList' || !r.target || r.target.id !== 'flw-tlist') return; if (!r.addedNodes.length) return; __tl.w++;
        const h = n => [...n].map(x => x.outerHTML || x.textContent || '').join('');
        if (r.removedNodes.length && h(r.removedNodes) === h(r.addedNodes)) __tl.dup++; }); }).observe(document, { childList: true, subtree: true }); } });
    const r = await EV(pg, () => ({ w: __tl.w, dup: __tl.dup, sp: startPadOn(), rows: document.querySelectorAll('#flw-tlist .flw-trow').length }));
    T('F8', r.sp && r.rows > 0 && r.w === 1 && r.dup === 0, 'F8k ENG-2 开机（启动台开着）音轨树列表只写入 ' + r.w + ' 次（要求 1；修前挂载 paint(true) 与 on() paint(true) 各写一遍＝2 次）', J(r));
    await close(pg);
  }));
  /* F8l ENG-10 ③：不经 render、只改 sel + syncInputs 切语境，行 2 键序 / 语境也跟着变（此前只在 render 末尾的 FLOW.sync 刷新）；ENG-12 帮助「左栏 · 记号」列出调号 · 拍号组 */
  if (want('F8')) jobs.push(() => SAFE('F8', 'F8l', async () => {
    const pg = await open(1280, 800, { tag: 'F8l' });
    await scn(pg, 'gtr');
    const r = await EV(pg, () => {
      const seq = () => [...document.querySelectorAll('#eb-note > *')].filter(e => getComputedStyle(e).display !== 'none').sort((a, c) => a.getBoundingClientRect().left - c.getBoundingClientRect().left).map(e => (e.textContent || '').trim()).join(' ');
      sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 3 }; render();
      const t0 = { ctx: document.getElementById('editbar').dataset.flwCtx, seq: seq() };
      sel = { mi: 0, row: 'vox', vi: 0, ci: 0 }; syncInputs();
      const t1 = { ctx: document.getElementById('editbar').dataset.flwCtx, seq: seq(), scope: (document.querySelector('#flw-scope .flw-sn') || {}).textContent };
      return { t0, t1, help: helpFlowHTML() };
    });
    T('F8', r.t0.ctx === 'tab' && /^0 1 2 3 4 5 6 7 8 9/.test(r.t0.seq) && r.t1.ctx === 'jp' && /^1 2 3 4 5 6 7 0/.test(r.t1.seq) && /简谱/.test(r.t1.scope || ''),
      'F8l ENG-10 ③ 只改 sel 再 syncInputs（不 render）从六线谱轨切到简谱旋律轨：#editbar data-flw-ctx tab→jp、键序换成 1–7 / 0、作用于芯片换成简谱（此前停在六线谱语境）', J({ t0: r.t0, t1: r.t1 }));
    T('F8', /调号·拍号（五线谱是 谱号·调号·拍号）/.test(r.help) && /小节线·反复/.test(r.help),
      'F8l2 ENG-12 帮助弹窗「左栏 · 记号」的分组清单写了「调号·拍号（五线谱是 谱号·调号·拍号）」（与 FLOW.pal.GROUPS 一致）', (r.help.match(/按当前轨的记谱法分组（[^）]*）[^。]*/) || [''])[0].slice(0, 160));
    await close(pg);
  }));

  await pool(jobs, 3);

  /* ================= RL 数据红线汇总 ================= */
  const lit = [...literalKeys(curSrc)], newLit = refSrc ? lit.filter(k => !literalKeys(refSrc).has(k)) : null;
  if (!ONLY.length || RLF.length) {
    T('RL', RLF.length > 0 && RLF.every(x => x.ok), 'RL1 song 字段集合 ⊆ 操作前 ∪ 本用例应写的现有字段（' + RLF.length + ' 个用例）', RLF.filter(x => !x.ok || /新字段/.test(x.d)).map(x => x.d).join('；') || '全部无新字段');
    T('RL', RLK.length > 0 && RLK.every(x => x.ok), 'RL2 musetab-* 键差集（去掉基线 ' + REF_COMMIT.slice(0, 7) + ' 源码已有的键名）⊆ {musetab-tour-shell}', RLK.filter(x => /新键/.test(x.d)).map(x => x.d).join('；') || '全部无新键');
    if (newLit) T('RL', newLit.every(k => NEW_KEYS.includes(k)) && newLit.includes('musetab-tour-shell'), 'RL3 源码 musetab-* 键名相对基线 ' + REF_COMMIT.slice(0, 7) + ' 新出现的只有 ' + J(newLit), '共 ' + lit.length + ' 个字面量');
    else NOTE('RL', '⚠️  RL3 源码键名对拍跳过：拿不到基线（' + REF_COMMIT.slice(0, 7) + '）');
  }
  T('ERR', !errs.length, '无页面报错', errs.slice(0, 5).join(' | '));
  for (const k of ['F1', 'F2', 'F3', 'F5', 'F6', 'F7', 'F8', 'RL', 'ERR']) (OUT[k] || []).forEach(l => console.log(l));
  console.log('\n' + (pass === total ? '✅' : '❌') + ' tv_flowdef：' + pass + '/' + total + ' 通过');
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
