'use strict';
/* v68.2 匿名界面命令统计 ui_cmd（flowplan §5.3 / §5.5 F4）——编辑器 FLOW.track(id) → pyqEvent('ui_cmd', id) → apiCall('/events', {method:'POST', body:{name, meta}})。
   被测页按线上域名打开（route 把 https://zhipu.puyouquan.com/ 给编辑器单文件 → API_ON 为真），载入后用桩替换 apiCall 记录调用（不发网络请求）。
   U1  ?shell=flow 下真实点模式条「排版」→ 恰好一条 {name:'ui_cmd', meta:'mode:engrave'}；body 只有 name / meta 两个字段
   U2  10 分钟内回书写再切排版不再发；切「输出」发一条 mode:output；回书写不发。U2b（U3 之后）Date.now 拨快 10 分钟再切排版 / 输出各又发一条（同一 id 每 10 分钟最多 1 次）
   U3  各接入点真实点击都发出计划 §5.3 的 id：行 1 新建 / 发布 / 窗口列表 · 行 2 更多 · 记号格与搜记号 · 音轨静音 / 独奏 / 加轨 · 命令面板打开与执行 ·
       右栏切页 / 钉住 · 状态栏 ⋯ / ? / 循环 / 时值检查；所有 meta 匹配 ^[a-z][a-z0-9]*(:[a-z0-9:-]+)*$、≤64 字、纯 ASCII，不含当前曲名 / 歌词
       （计划 §5.3 原写 ^[a-z]+(…)，与它自己列的 r1: / r2: 前缀矛盾，首段放宽为字母开头的字母数字；服务端同一条）
   U4  每会话上限 60 条：再 track 100 个不同 id 后累计恰 60 条，之后时间拨快、真实切模式也不再发
   U5  API_ON 为假（file:// 直载 ?shell=flow）：真实切排版 / 输出、点记号、开命令面板 → apiCall 零调用，FLOW.track 返回 false、不计数
   U6  格式过滤（FLOW.track.norm）：lay:A4 → lay:a4、r2:octall+ → r2:octall-plus；曲名 / 含中文 / 超长 / 空 / 非字符串 → 整条丢弃不发（不做字符替换）
   U7  源码静态：每个 F.track('字面量') 合格式；计划列出的 id 都有接入点；导览（musetab-tour-shell）/「使用旧版布局」（oldshell）在场时各自接 tour:done · tour:skip / shell:classic
   U9  （v68.2 集成，第一轮遗留 ①）偏好设置「使用旧版布局」的 shell:classic 刷新前保证送达（线上域名、真实 apiCall / fetch，只在路由层拖慢 /api/events）：
       请求带 keepalive、body 只有 {name:'ui_cmd', meta:'shell:classic'}；服务器 650ms 才回 → 等它回完才刷新（不早于回包、不晚于 800ms+容差）；
       服务器 3s 不回 → 800ms 上限就刷新（不干等）；服务器秒回 → 仍按 500ms 起刷新（「即将刷新」提示看得见）。刷新后进旧外壳、键 '0'。
       时刻都按页面同一时钟：点击时刻＝页面捕获阶段记下的 Date.now()（开关处理就在这次点击里同步跑），刷新时刻＝新文档的 performance.timeOrigin（导航起点），
       回包时刻＝路由层 fulfill 前的 Date.now()（同一台机器）。突变实证：改回「固定 500ms 刷新、不等」→ U9a / U9b 红；去掉 keepalive → U9a 红
   U8  后台 admin.html：概览带 uiModes 时漏斗下方一行「界面：7 日用过「排版」N 人 · 「输出」M 人 / 编辑访客 V 人」；不带时不出这一行。
       隐私页「访问统计与设备标识」段写明界面操作统计只记命令名称
   RL  数据红线：FLOW.track 不写 song、不新增 musetab-* 本机键（track 前后 JSON.stringify(song) 与键集合逐字相同）
   突变实证：去掉 FLOW.mode.set 里那一行 → U1 / U2 红；去掉 10 分钟判断 → U2 红；去掉 60 上限 → U4 红；去掉 API_ON 判断 → U5 红（apiCall 仍零调用，但 stat.sent>0）。
   env：MUSETAB_URL 被测页（file://…，缺省 ../index.html）· MUSETAB_SITE 官网目录 · SHOTS=目录 存截图 */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ED = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7).replace(/[?#].*$/, '') : path.resolve(__dirname, '../index.html');
const SITE = process.env.MUSETAB_SITE || path.resolve(__dirname, '../site');
const SHOTS = process.env.SHOTS || '';
const readEd = () => fs.readFileSync(ED, 'utf8');
/* 计划 §5.3 原写 ^[a-z]+(…)，但它列的 r1:file:new / r2:more 首段带数字——编辑器与服务端按「首段字母开头的字母数字」放宽，其余不变 */
const RE = /^[a-z][a-z0-9]*(:[a-z0-9:-]+)*$/;
const TITLE = 'UICMD秘密曲名';
const J = x => JSON.stringify(x);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  if (SHOTS) try { fs.mkdirSync(SHOTS, { recursive: true }); } catch (_) {}

  /* 页面内：apiCall 桩 + 场景（单窗口送别，曲名换成 TITLE，光标第 1 小节第 1 列） */
  const STUB = () => {
    window.__calls = [];
    window.apiCall = function (p, o) { try { window.__calls.push({ p, o: JSON.parse(JSON.stringify(o || {})) }); } catch (_) { window.__calls.push({ p, o: null }); } return Promise.resolve({ ok: true }); };
  };
  const SCN = t => {
    window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
    try { hideStartPad(); } catch (_) {}
    const s = migrate(PRESETS.find(x => x.name.indexOf('送别') >= 0).make()); s.title = t;
    addDoc(s, () => {}); closeDocAt(0);
    sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; try { clampSel(); } catch (_) {}
    render();
    try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {}
    return { title: song.title, flow: document.body.classList.contains('flow'), mode: document.body.dataset.mode || '' };
  };
  const ui = pg => pg.evaluate(() => window.__calls.filter(c => c.p === '/events' && c.o && c.o.body && c.o.body.name === 'ui_cmd').map(c => c.o.body.meta));
  const uiRaw = pg => pg.evaluate(() => window.__calls.filter(c => c.p === '/events' && c.o && c.o.body && c.o.body.name === 'ui_cmd').map(c => c.o));
  const shut = pg => pg.evaluate(() => { try { FLOW.menu.close(); } catch (_) {} try { closePop(); } catch (_) {} try { closeModal(); } catch (_) {} try { NWP.quickMenuClose(); } catch (_) {} });
  const mode = async (pg, m) => { await pg.click('#flw-mode-' + m); await sleep(m === 'write' ? 150 : 450); return pg.evaluate(() => document.body.dataset.mode); };

  /* 线上域名的编辑器页：/api/* 给最小桩（载入期 /me、/health、visit 走这里），其余路径都给编辑器单文件 */
  const live = async (q, vp) => {
    const pg = await b.newPage({ viewport: vp || { width: 1440, height: 900 } });
    pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    await pg.route(/https:\/\/zhipu\.puyouquan\.com\/.*/, route => {
      const u = new URL(route.request().url()), p = u.pathname;
      if (p === '/api/me') return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"请先登录"}' });
      if (p.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      return route.fulfill({ status: 200, contentType: 'text/html', body: readEd() });
    });
    await pg.goto('https://zhipu.puyouquan.com/' + (q || '?shell=flow')); await pg.waitForTimeout(1200);
    return pg;
  };

  /* ---------- U1 / U2 / U3 / U4 / U6 / RL：线上域名（API_ON 为真） ---------- */
  {
    const pg = await live();
    const env = await pg.evaluate(() => ({ api: (() => { try { return API_ON; } catch (_) { return 'tdz'; } })(), track: typeof FLOW.track, stat: FLOW.track.stat() }));
    await pg.evaluate(STUB);
    const sc = await pg.evaluate(SCN, TITLE);
    const pre = await ui(pg);
    T(env.api === true && env.track === 'function' && sc.flow && sc.mode === 'write' && sc.title === TITLE && pre.length === 0 && env.stat.sent === 0,
      'U0 线上域名 API_ON 为真、?shell=flow 已激活、载入与建谱期间不发 ui_cmd', J({ env, sc, pre }));

    /* U1 */
    const m1 = await mode(pg, 'engrave');
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'uicmd-engrave-1440.png') });
    const r1 = await uiRaw(pg);
    T(m1 === 'engrave' && r1.length === 1 && r1[0].method === 'POST' && J(Object.keys(r1[0].body).sort()) === J(['meta', 'name'])
      && r1[0].body.name === 'ui_cmd' && r1[0].body.meta === 'mode:engrave',
      'U1 点模式条「排版」→ 恰好一条 POST /events {name:ui_cmd, meta:mode:engrave}（body 只有 name / meta）', J(r1));

    /* U2 */
    await mode(pg, 'write');
    const m2 = await mode(pg, 'engrave');
    const a2 = await ui(pg);
    await mode(pg, 'write');
    const m3 = await mode(pg, 'output');
    const b2 = await ui(pg);
    await mode(pg, 'write');
    const cnt = (a, k) => a.filter(x => x === k).length;
    T(m2 === 'engrave' && cnt(a2, 'mode:engrave') === 1 && m3 === 'output' && cnt(b2, 'mode:output') === 1 && cnt(b2, 'mode:engrave') === 1 && cnt(b2, 'mode:write') === 0,
      'U2 10 分钟内回书写再切排版不再发 · 切输出发一条 mode:output · 回书写不发', J({ a2, b2 }));

    /* U3 各接入点（真实点击；只在动作钮平时不可见的几处直接派发 click 到同一委托） */
    const ec = s => pg.evaluate(sel0 => { const e = document.querySelector(sel0); if (!e) return false; e.click(); return true; }, s);
    const steps = {};
    /* 行 1：文件 ▾「新建…」· 发布 · 窗口列表 */
    await pg.click('#flw-file'); await sleep(120);
    steps.new = await ec('#popmenu.flw-mn [data-fa="r1:new"]'); await sleep(250); await shut(pg); await sleep(80);
    await pg.click('#flw-pub'); await sleep(450);
    steps.pubMode = await pg.evaluate(() => document.body.dataset.mode); await shut(pg);
    await mode(pg, 'write');
    steps.ovf = await pg.evaluate(() => { FLOW.act('r1:ovf', document.getElementById('flw-file'), { detail: 0 }); return !!document.querySelector('#popmenu.flw-mn'); }); await shut(pg);
    /* 行 2「更多 ▾」 */
    await pg.click('#flw-more'); await sleep(120); steps.more = await pg.evaluate(() => !!document.querySelector('#popmenu.flw-mn')); await shut(pg);
    /* 记号格：延长号（落在当前音）· 搜记号 */
    steps.ferm0 = await pg.evaluate(() => { const c = curCol(); return !!(c && c.ferm); });
    await pg.click('#flw-pgrid .flw-sg[data-v="fermata"]'); await sleep(150);
    steps.ferm = await pg.evaluate(() => { const m = song.measures[0].voxes[0][0]; return !!(m && m.ferm); });
    await pg.fill('#flw-pq', 'yc'); await sleep(120); await pg.fill('#flw-pq', 'ych'); await sleep(120); await pg.fill('#flw-pq', ''); await sleep(80);
    /* 音轨行：静音 / 独奏（各点两次＝复原）· 加轨 ＋ */
    steps.mute = await ec('#flw-tlist .flw-tmute'); await sleep(80); await ec('#flw-tlist .flw-tmute'); await sleep(80);
    steps.solo = await ec('#flw-tlist .flw-tsolo'); await sleep(80); await ec('#flw-tlist .flw-tsolo'); await sleep(80);
    steps.add = await ec('#flw-thd [data-fa="tree:add"]'); await sleep(120); await shut(pg);
    /* 命令面板：打开 · 搜「ych」回车执行（延长号再点一次＝取消，谱面复原） */
    await pg.click('#flw-cmdb'); await sleep(150);
    await pg.fill('#flw-cmdq', 'ych'); await sleep(120); await pg.press('#flw-cmdq', 'Enter'); await sleep(200);
    steps.cmdFerm = await pg.evaluate(() => { const m = song.measures[0].voxes[0][0]; return !!(m && m.ferm); });
    /* 右栏（1440 停靠）：切到「文字」页 · 钉住（点两次＝复原） */
    await pg.click('#flw-rpt-text'); await sleep(100);
    steps.rdText = await pg.evaluate(() => FLOW.rd.page());
    await pg.evaluate(() => { FLOW.act('rd:pin', { dataset: {} }, null); FLOW.act('rd:pin', { dataset: {} }, null); }); await sleep(100);
    await pg.click('#flw-rpt-prop'); await sleep(80);
    /* 状态栏：⋯ 更多 · ? · 循环选区（点两次＝复原）· 时值检查 */
    await pg.click('#flw-st-more'); await sleep(120); await shut(pg);
    await pg.click('#flw-st-help'); await sleep(120); await shut(pg);
    await pg.click('#flw-st-loop'); await sleep(80); await pg.click('#flw-st-loop'); await sleep(80);
    steps.beat = await ec('#beat-status'); await sleep(120);
    await pg.keyboard.press('Escape'); await shut(pg); await sleep(80);
    const all = await ui(pg), set = [...new Set(all)];
    const WANT = ['mode:engrave', 'mode:output', 'r1:file:new', 'r1:publish', 'r1:tabovf', 'r2:more', 'pal:fermata', 'pal:search', 'trk:mute', 'trk:solo', 'trk:add',
      'cmd:open', 'cmd:go:sign:fermata', 'rd:text', 'rd:pin', 'st:more', 'st:help', 'st:loop', 'st:beat'];
    const miss = WANT.filter(k => set.indexOf(k) < 0);
    const dup = set.filter(k => all.filter(x => x === k).length > 1);
    T(miss.length === 0 && dup.length === 0 && steps.new && steps.pubMode === 'output' && steps.ovf && steps.more && !steps.ferm0 && steps.ferm && steps.mute && steps.solo && steps.add
      && !steps.cmdFerm && steps.rdText === 'text' && steps.beat,
      'U3 各接入点真实操作都发出计划 §5.3 的 id（行 1 / 行 2 / 记号 / 音轨 / 命令面板 / 右栏 / 状态栏），同一 id 10 分钟内只一条', J({ miss, dup, steps, set }));
    const bad = all.filter(m => typeof m !== 'string' || !RE.test(m) || m.length > 64 || /[^\x20-\x7e]/.test(m) || m.indexOf(TITLE) >= 0 || /UICMD/i.test(m));
    const lyr = await pg.evaluate(() => { const a = []; song.measures.forEach(m => (m.voxes || []).forEach(cs => (cs || []).forEach(c => (c && c.lyrics || []).forEach(l => { if (l) a.push(String(l)); })))); return a; });
    const hasLyr = all.filter(m => lyr.some(l => l.length && m.indexOf(l) >= 0 && /[^\x00-\x7f]/.test(l)));
    T(all.length >= WANT.length && bad.length === 0 && hasLyr.length === 0 && lyr.length > 0,
      'U3b 全部 ' + all.length + ' 条 meta 只含命令 id：匹配 ' + RE.source + '、≤64、纯 ASCII，不含曲名「' + TITLE + '」与歌词', J({ bad, hasLyr, n: all.length }));

    /* U2b 同一 id 每 10 分钟最多 1 次：Date.now 拨快 10 分钟后再切排版 / 输出各又发一条（此前两者都已发过） */
    const n0 = (await ui(pg)).length;
    await pg.evaluate(() => { window.__now0 = Date.now; window.__skew = 10 * 60 * 1000 + 1000; Date.now = () => window.__now0.call(Date) + window.__skew; });
    const m4 = await mode(pg, 'engrave'); await mode(pg, 'write'); const m5 = await mode(pg, 'output'); await mode(pg, 'write');
    const c2 = (await ui(pg)).slice(n0);
    T(m4 === 'engrave' && m5 === 'output' && J(c2) === J(['mode:engrave', 'mode:output']),
      'U2b 拨快 10 分钟后再切排版 / 输出各又发一条（回书写不发）', J(c2));

    /* U6 格式过滤 */
    const u6 = await pg.evaluate(t => {
      const N = FLOW.track.norm, n0 = window.__calls.length;   /* 用没发过的 id 测「会不会发」：发过的会被 10 分钟去重挡住，测不出格式过滤 */
      const r = { a4: N('lay:A4'), oct: N('r2:octall+'), octm: N('r2:octall-'), tN: N('sign:tupletN'), title: N(t), zh: N('pal:延长号'), long: N('pal:' + 'x'.repeat(70)), empty: N(''), nul: N(null), obj: N({}) };
      r.sendTitle = FLOW.track(t); r.sendZh = FLOW.track('mode:排版'); r.sendEmpty = FLOW.track(''); r.sendObj = FLOW.track({ toString() { return '《小星星》'; } });
      r.calls = window.__calls.length - n0; return r;
    }, TITLE);
    T(u6.a4 === 'lay:a4' && u6.oct === 'r2:octall-plus' && u6.octm === 'r2:octall-' && u6.tN === 'sign:tupletn' && u6.title === '' && u6.zh === '' && u6.long === '' && u6.empty === ''
      && u6.nul === '' && u6.obj === '' && !u6.sendTitle && !u6.sendZh && !u6.sendEmpty && !u6.sendObj && u6.calls === 0,
      'U6 格式过滤：lay:A4→lay:a4、r2:octall+→r2:octall-plus；曲名 / 中文 / 超长 / 空 / 对象一律丢弃不发', J(u6));

    /* RL 数据红线 */
    const rl = await pg.evaluate(() => {
      const keys = () => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort().join(',');
      const s0 = JSON.stringify(song), k0 = keys(), ls0 = JSON.stringify(Object.assign({}, localStorage));
      ['rl:a', 'rl:b', 'rl:c', 'mode:engrave', 'pal:fermata'].forEach(id => FLOW.track(id));
      return { song: JSON.stringify(song) === s0, keys: keys() === k0, ls: JSON.stringify(Object.assign({}, localStorage)) === ls0 };
    });
    T(rl.song && rl.keys && rl.ls, 'RL FLOW.track 不写 song、不动本机存储（song 与 localStorage 逐字相同）', J(rl));

    /* U4 每会话上限 60 */
    const u4 = await pg.evaluate(() => {
      const n0 = FLOW.track.stat().sent; let ok = 0;
      for (let i = 0; i < 100; i++) if (FLOW.track('zz:cap' + i)) ok++;
      return { n0, ok, st: FLOW.track.stat() };
    });
    await pg.evaluate(() => { window.__skew += 30 * 60 * 1000; });
    await mode(pg, 'output'); await mode(pg, 'write'); await mode(pg, 'engrave'); await mode(pg, 'write');
    const u4b = await ui(pg), late = await pg.evaluate(() => FLOW.track('zz:late'));
    T(u4.st.sent === 60 && u4.st.cap === 60 && u4.ok === 60 - u4.n0 && u4b.length === 60 && !late,
      'U4 每会话最多 60 条：已发 ' + u4.n0 + ' 条后再 track 100 个新 id 只发出 ' + u4.ok + ' 条，累计恰 60；拨快 30 分钟再切模式也不发', J({ u4, n: u4b.length, late }));
    await pg.evaluate(() => { Date.now = window.__now0; });
    await pg.close();
  }

  /* ---------- U5 API_ON 为假（file:// 直载） ---------- */
  {
    const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
    pg.on('pageerror', e => errs.push('PAGEERR(file):' + e.message));
    await pg.goto('file://' + ED + '?shell=flow'); await pg.waitForTimeout(1000);
    await pg.evaluate(STUB);
    const sc = await pg.evaluate(SCN, TITLE);
    const m1 = await mode(pg, 'engrave'), m2 = await mode(pg, 'output'); await mode(pg, 'write');
    await pg.click('#flw-pgrid .flw-sg[data-v="fermata"]'); await sleep(120);
    await pg.click('#flw-cmdb'); await sleep(120); await shut(pg);
    await pg.click('#flw-more'); await sleep(100); await shut(pg);
    const r = await pg.evaluate(() => ({ api: API_ON, calls: window.__calls.length, direct: FLOW.track('mode:engrave'), st: FLOW.track.stat() }));
    T(sc.flow && m1 === 'engrave' && m2 === 'output' && r.api === false && r.calls === 0 && r.direct === false && r.st.sent === 0,
      'U5 API_ON 为假（file://）：切排版 / 输出、点记号、开命令面板与更多 → apiCall 零调用，FLOW.track 返回 false、不计数', J({ sc, m1, m2, r }));
    await pg.close();
  }

  /* ---------- U9 「使用旧版布局」的 shell:classic 刷新前送达（v68.2 集成，第一轮遗留 ①）---------- */
  {
    const u9 = async (delay, tag) => {
      const pg = await live();
      const rec = { req: [], ful: null };
      await pg.route('https://zhipu.puyouquan.com/api/events', async route => {
        let body = null; try { body = JSON.parse(route.request().postData() || 'null'); } catch (_) {}
        const isCls = !!(body && body.name === 'ui_cmd' && body.meta === 'shell:classic');
        if (isCls) rec.req.push({ t: Date.now(), body });
        if (isCls && delay) await sleep(delay);
        if (isCls) rec.ful = Date.now();
        try { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); } catch (_) {}
      });
      await pg.evaluate(SCN, TITLE);
      /* 记下真实 fetch 的请求选项（sessionStorage 跨这次刷新留存）：keepalive 只在这一条上 */
      await pg.evaluate(() => { const of = window.fetch; window.fetch = function (u, o) {
        try { if (String(u).indexOf('/api/events') >= 0) { const bd = JSON.parse(o && o.body || 'null'); const a = JSON.parse(sessionStorage.getItem('__u9') || '[]');
          a.push({ meta: bd && bd.meta, name: bd && bd.name, ka: !!(o && o.keepalive), keys: Object.keys(bd || {}).sort() }); sessionStorage.setItem('__u9', JSON.stringify(a)); } } catch (_) {}
        return of.apply(this, arguments); }; });
      await pg.evaluate(() => { showPrefs(); document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('.prf-row[data-prf="oldshell"]')) sessionStorage.setItem('__u9t0', String(Date.now())); }, true); });
      await sleep(200);
      await Promise.all([pg.waitForEvent('load', { timeout: 8000 }), pg.click('#modal-mask .prf-row[data-prf="oldshell"]')]);
      await sleep(900);
      const after = await pg.evaluate(() => ({ to: performance.timeOrigin, t0: +sessionStorage.getItem('__u9t0'), flow: document.body.classList.contains('flow'), key: localStorage.getItem('musetab-flow'),
        fx: JSON.parse(sessionStorage.getItem('__u9') || '[]') }));
      const t0 = after.t0;
      if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'uicmd-U9-' + tag + '-after-reload.png') });
      await pg.close();
      const fx = after.fx.filter(x => x.name === 'ui_cmd' && x.meta === 'shell:classic');
      return { dt: Math.round(after.to - t0), ful: rec.ful == null ? null : rec.ful - t0, nReq: rec.req.length, body: rec.req[0] && rec.req[0].body, fx, other: after.fx.filter(x => x.ka && x.meta !== 'shell:classic'), flow: after.flow, key: after.key };
    };
    const a = await u9(600, 'slow600');
    T(a.nReq === 1 && J(Object.keys(a.body || {}).sort()) === J(['meta', 'name']) && a.fx.length === 1 && a.fx[0].ka === true && !a.other.length
      && a.ful != null && a.ful >= 590 && a.ful < 800 && a.dt >= a.ful - 2 && a.dt <= 880 && !a.flow && a.key === '0',
      'U9a 「使用旧版布局」：shell:classic 带 keepalive 发出（body 只有 name / meta，其他埋点不带），服务器 600ms 才回 → 等回完才刷新（回包 ' + a.ful + 'ms · 刷新 ' + a.dt + 'ms）、刷新后进旧外壳', J(a));
    const c = await u9(3000, 'hang3s');
    T(c.nReq === 1 && c.fx.length === 1 && c.fx[0].ka === true && c.dt >= 790 && c.dt <= 950 && !c.flow && c.key === '0',
      'U9b 服务器 3 秒不回：800ms 上限到就刷新（刷新 ' + c.dt + 'ms），不干等；请求带 keepalive、页面走后由浏览器送完', J(c));
    const d = await u9(0, 'fast');
    T(d.nReq === 1 && d.fx.length === 1 && d.fx[0].ka === true && d.ful != null && d.ful < 400 && d.dt >= 490 && d.dt <= 650 && !d.flow && d.key === '0',
      'U9c 服务器秒回（回包 ' + d.ful + 'ms）：仍按 500ms 起刷新（刷新 ' + d.dt + 'ms，「即将刷新」提示看得见）', J(d));
  }

  /* ---------- U7 源码静态 ---------- */
  {
    const src = readEd();
    const lits = [...src.matchAll(/\bF(?:LOW)?\.track\('([^']*)'\)/g)].map(m => m[1]);
    const pres = [...src.matchAll(/\bF(?:LOW)?\.track\('([^']*)'\s*\+/g)].map(m => m[1]);
    const badLit = lits.filter(x => !RE.test(x)), badPre = pres.filter(x => !/^[a-z][a-z0-9]*(:[a-z0-9-]+)*:$/.test(x));
    const NEED = ['r1:file:new', 'r1:publish', 'r1:tabovf', 'r2:more', 'pal:search', 'trk:mute', 'trk:solo', 'trk:add', 'cmd:open', 'rd:pin', 'st:more', 'st:help', 'st:beat'];
    const NEEDP = ['mode:', 'pal:', 'cmd:go:', 'rd:'];
    const missL = NEED.filter(x => lits.indexOf(x) < 0), missP = NEEDP.filter(x => pres.indexOf(x) < 0);
    const stLine = /\/\^st:\(hum\|snd\|loop\|em\)\$\/\.test\(a\)\) F\.track\(a\)/.test(src);
    const hasTour = /musetab-tour-shell/.test(src), hasOld = /k:'oldshell'/.test(src);
    const tourOk = !hasTour || (/track\('tour:done'\)/.test(src) && /track\('tour:skip'\)/.test(src)) || /track\('tour:'\s*\+/.test(src);   /* A 轨写成 F.track('tour:'+why)（why＝done / skip）也算 */
    const oldOk = !hasOld || /track\('shell:classic'[,)]/.test(src);   /* v68.2 集成：shell:classic 带送达确认参数（见 U9） */
    const viaPyq = /pyqEvent\('ui_cmd', k\)/.test(src);
    T(badLit.length === 0 && badPre.length === 0 && missL.length === 0 && missP.length === 0 && stLine && tourOk && oldOk && viaPyq,
      'U7 源码：' + lits.length + ' 处字面量 + ' + pres.length + ' 处前缀接入全部合格式、计划 id 齐全；导览 ' + (hasTour ? '在场且接 tour:done / tour:skip' : '未合入（跳过）')
      + '、旧版布局 ' + (hasOld ? '在场且接 shell:classic' : '未合入（跳过）'), J({ badLit, badPre, missL, missP, stLine, hasTour, tourOk, hasOld, oldOk, viaPyq }));
  }

  /* ---------- U8 后台「界面」一行 + 隐私页 ---------- */
  {
    const read = f => fs.readFileSync(path.join(SITE, f), 'utf8');
    const admin = async ov => {
      const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
      pg.on('pageerror', e => errs.push('PAGEERR(admin):' + e.message));
      await pg.route(/https:\/\/www\.puyouquan\.com\/.*/, route => {
        const p = new URL(route.request().url()).pathname;
        const Jf = o => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
        if (p === '/api/me') return Jf({ user: { id: 'u1', phone: '138****8888', nickname: '管理员', role: 'admin' }, stats: {}, unread_msgs: 0 });
        if (p === '/api/admin/overview') return Jf(ov);
        if (p === '/api/admin/reviews') return Jf({ status: 'pending', scores: [] });
        if (p.startsWith('/api/')) return Jf({ ok: true, scores: [], users: [], logs: [], reports: [], messages: [], total: 0 });
        const f = p === '/' ? 'index.html' : p.slice(1);
        if (fs.existsSync(path.join(SITE, f))) return route.fulfill({ status: 200, contentType: /\.js$/.test(f) ? 'application/javascript' : /\.css$/.test(f) ? 'text/css' : 'text/html', body: read(f) });
        return route.fulfill({ status: 404, body: '' });
      });
      await pg.goto('https://www.puyouquan.com/admin.html'); await pg.waitForTimeout(700);
      return pg;
    };
    const OV = { users: 12, roles: { user: 9, creator: 2, admin: 1 }, scores: 20, scoreStatus: {}, pending: 0, published: 3, revisions: 0, reports: 0,
      orders: { paid: 0, amount_fen: 0 }, funnel: [{ name: 'visit', n: 123, u: 80 }, { name: 'export_png', n: 9, u: 7 }],
      metrics: { north7: 7, visitors7: 80, d1: { base: 0, back: 0, rate: null }, d7: { base: 0, back: 0, rate: null } } };
    const pg = await admin(Object.assign({ uiModes: { engrave: 31, output: 12, editors: 140, days: 7 } }, OV));
    const t1 = await pg.evaluate(() => (document.getElementById('ad-funnel') || {}).textContent || '');
    if (SHOTS) { try { await pg.locator('#ad-funnel').screenshot({ path: path.join(SHOTS, 'uicmd-admin-funnel.png') }); } catch (_) {} }
    await pg.close();
    const pg2 = await admin(OV);
    const t2 = await pg2.evaluate(() => (document.getElementById('ad-funnel') || {}).textContent || '');
    await pg2.close();
    /* v68.2 收尾 ENG-6：接口带 flow（7 日内发过任何界面命令的人＝新外壳有操作）时两个分母都列、注明编辑访客的口径 */
    const pg3 = await admin(Object.assign({ uiModes: { engrave: 31, output: 12, flow: 96, editors: 140, days: 7 } }, OV));
    const t3 = await pg3.evaluate(() => (document.getElementById('ad-funnel') || {}).textContent || '');
    await pg3.close();
    T(t3.split('\n')[2] === '界面：7 日用过「排版」31 人 · 「输出」12 人 / 新外壳有操作 96 人（编辑访客 140 人，含手机、旧版布局、只开启动台）',
      'U8c（ENG-6）接口带 uiModes.flow 时：分母先写「新外壳有操作 F 人」，括注编辑访客 V 人的口径（含手机、旧版布局、只开启动台）', J({ t3 }));
    const lines = t1.split('\n');
    T(lines.length === 3 && /^近 7 日事件/.test(lines[0]) && /^北极星/.test(lines[1]) && lines[2] === '界面：7 日用过「排版」31 人 · 「输出」12 人 / 编辑访客 140 人'
      && t2.indexOf('界面') < 0 && t2.split('\n').length === 2,
      'U8 后台漏斗下方「界面：7 日用过「排版」N 人 · 「输出」M 人 / 编辑访客 V 人」（接口不带 uiModes 时不出）', J({ t1, t2 }));
    const pv = read('privacy.html'), seg = (/<p><b>访问统计与设备标识<\/b>[\s\S]*?<\/p>/.exec(pv) || [''])[0];
    T(/界面操作统计只记录命令名称（如「切到排版」），不包含曲谱、歌词等内容/.test(seg),
      'U8b 隐私页「访问统计与设备标识」段写明界面操作统计只记命令名称、不含曲谱与歌词', seg.slice(0, 60));
  }

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})().catch(e => { console.log('❌ 套件异常：' + (e && e.stack || e)); process.exit(1); });
