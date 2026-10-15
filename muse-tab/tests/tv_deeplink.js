/* v67.6 深链 ?new= ＋ 官网垂类页按钮 ＋ 手机启动台主卡（docs/design-2026-10e 已拍板：第 6、7 节；拍板 1 手机先不开放新建＝「发到电脑继续」）：
   D1 各用途深链预选：11 个用途 ?new=<用途> 打开页面 → 新建面板开在启动台之上、左栏选中该用途、建谱计划＝该用途默认值（与面板里点它逐字一致），不自动建谱
   D2 参数解析：key（大调 / 小调加 m → 关系大调记谱、升降写法、Db→C#）、meter、tempo、title、bars、lyr、用途变体、mel、自选记谱法 rows（顺序无关、只认 14 种）；
      依据写「按链接」不写「你改的」；回车（真按键）才建，建出的谱＝链接预选
   D3 非法值逐项忽略：越界 / 拼错 / 不属于该用途的变体 / 非自选记谱法的 rows / 原型链键 new=constructor——忽略后计划＝该用途默认，依据里没有「你改的」，
      「链接里没认出」照实列出；new 认不出时仍开面板（其余合法参数照用）
   D4 不污染 musetab-nw-last：深链打开、关掉，本机键逐字节不变；随后 Alt+N 开面板仍是上次的用途；深链里真建了才记成这次
   D5 replaceState：处理后地址栏只去掉深链这一组参数（其余参数保留）、历史不多一条；刷新不再弹面板
   D6 真手机（触屏粗指针＋短边 <600）：深链直达「在电脑上开始一份谱」该用途详情（不出新建面板、不建谱），复制的链接带用途与调拍（＝方案示例逐字）；
      手机上改调 / 拍号 / 速度（真实选择）链接跟着变、依据写「你改的」；10 个用途逐个真点 → 链接拿到电脑上打开，预选计划与手机所选逐字一致（往返）
   D7 链接往返（引擎级）：随机 300 个面板状态（用途 × 变体 × 旋律用 × 调 × 拍号 × 速度 × 小节数 × 歌词段 × 曲名）→ linkOf → linkParse → linkApply → 建谱计划逐字一致
   D8 官网按钮：考编 / 即兴伴奏 ?new=pacc、师范 ?new=kids、艺考 ?new=sight（读 site 文件，两处按钮都换、编辑器域名沿用站内写法），深链用途在编辑器里都合法；
      课堂 ?new=teach 官网没有单独的课堂页（报告列出），编辑器侧 D1 已覆盖
   D9 手机启动台主卡：390×844 真手机首屏第一张卡「开始一份谱」（跨两列）→ 真点进「在电脑上开始一份谱」：按用途 10 行、每行 64px、只用图标（无谱面小样张）、
      主按钮钉在底部始终可见、无横向溢出；点用途 → 详情 → 「发到电脑继续」→ 已复制（三步说明）→ 返回；仍可「导入已有的谱」；全程不建谱、不写本机键；
      电脑窄窗口（≤820、非触屏）同一张卡照常出新建面板
   收尾验收补（修前红修后绿：MUSETAB_URL 指向收尾前的工作树副本复跑，D10–D16 全红）：
   D10 用途认不出 / 为空：不读本机「上次」（此前整份沿用上次、与链接值混用）；换用途后「没认出」不再挂着；手机选用途时带上其余合法参数
   D11 参数名不分大小写（?NEW= / Key= / TEMPO=）；拼错（tmepo）与别名（bpm）列进「没认出」，utm / 微信分享参数不列
   D12 「没认出」只列名，值 ≤8 个 ASCII 才附上（防借编辑器界面伪造提示）
   D13 手机详情页：刻版预览、曲名、旋律用 / 变体分段钮、主按钮 52px；手机链接到电脑往返（含变体、曲名）；6/8 已复制页写 ♪=
   D14 320 / 340 宽无横向滚动；用途行是列表项里的原生按钮、按组分列
   D15 手机横屏启动台主卡上沿可见、可滚到底
   D16 visit 埋点落地页带 ?new=<用途>
   突变实证：MUSETAB_URL=file://…/v67.5 原版 → 无深链 / 无手机主卡 / 官网按钮未换 → 全红（D8 读的是工作树 site 文件，另用 SITE_DIR 指向 v67.5 的 site 复跑）。file:// 直载。 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const F = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const SITE = process.env.SITE_DIR || path.resolve(__dirname, '../site');
const SCENES = ['gtr', 'pacc', 'kids', 'vocal', 'teach', 'sight', 'solo', 'inst', 'chord', 'blank', 'custom'];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + String(d).slice(0, 1600) : '')); };
  const errs = [];
  const open = async (q, w, h, opt) => {
    opt = opt || {};
    const ctx = await b.newContext({ viewport: { width: w || 1280, height: h || 800 }, isMobile: !!opt.mob, hasTouch: !!opt.mob, deviceScaleFactor: opt.mob ? 2 : 1 });
    const pg = await ctx.newPage(); pg.setDefaultTimeout(5000);
    pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    if (opt.init) await pg.addInitScript(opt.init);
    await pg.goto(F + (q ? '?' + q : '')); await pg.waitForTimeout(1000);
    pg._ctx = ctx; return pg;
  };
  const guard = async (name, fn) => { try { await fn(); } catch (e) { T(false, name, 'EXC: ' + String(e.message || e).split('\n')[0]); } };
  const EV = (pg, s, a) => pg.evaluate(s, a).catch(e => ({ err: String(e.message || e).split('\n')[0] }));
  /* 面板当前状态（建谱计划 + 左栏选中项 + 依据文字），与「同一用途默认值」对照 */
  const panelInfo = pg => EV(pg, () => {
    const st = NWP.state; if (!st || !document.querySelector('.nf-modal [data-scene]')) return { open: false };
    const sel = document.querySelector('.nf-modal [role=option][aria-selected="true"]');
    return { open: true, scene: st.scene, sel: sel && sel.dataset.scene, plan: JSON.stringify(NWP.planOf(st)), kind: (document.getElementById('nf-kind') || {}).textContent,
      basis: (document.getElementById('nf-basis') || {}).textContent || '', userChips: document.querySelectorAll('#nf-basis i.c-user').length,
      linkChips: [...document.querySelectorAll('#nf-basis i.c-link')].map(x => x.textContent), bad: (document.getElementById('nf-linkbad') || {}).textContent || '',
      docs: docs.length, pad: typeof startPadOn === 'function' && startPadOn(), last: localStorage.getItem('musetab-nw-last') };
  });
  const cleanPlan = (pg, sc) => EV(pg, s => JSON.stringify(NWP.planOf(NWP.fresh({ scene: s, clean: true }))), sc);

  /* ---------- D1 各用途深链预选 ---------- */
  await guard('D1 各用途深链预选', async () => {
    const bad = [], seen = [];
    for (const sc of SCENES) {
      const pg = await open('new=' + sc);
      const r = await panelInfo(pg);
      const want = await cleanPlan(pg, sc);
      /* 同一用途在面板里真点一下（面板默认＝上次 / 吉他弹唱，再点该用途）：深链预选＝点它的结果 */
      let clicked = null;
      if (r.open) { await pg.keyboard.press('Escape'); await pg.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} hideStartPad(); });
        await pg.click('#b-new'); await pg.waitForSelector('.nf-modal [data-scene]'); if (sc !== 'gtr') await pg.click('[data-scene="' + sc + '"]');
        clicked = await EV(pg, () => JSON.stringify(NWP.planOf(NWP.state))); }
      seen.push(sc + ':' + (r.open ? r.kind : 'closed'));
      if (!(r.open && r.scene === sc && r.sel === sc && r.plan === want && r.plan === clicked && r.docs === 1 && r.pad && r.userChips === 0 && !r.bad && r.last === null))
        bad.push(sc + ' ' + JSON.stringify({ r, want: (want || '').slice(0, 160), clicked: (clicked || '').slice(0, 160) }));
      await pg._ctx.close();
    }
    T(bad.length === 0, 'D1 11 个用途 ?new=<用途>：面板开在启动台之上、左栏选中该用途、建谱计划＝在面板里点该用途（默认值）逐字一致、未自动建谱、依据无「你改的」、不写本机键', bad.length ? bad.join(' | ') : seen.join(' · '));
  });

  /* ---------- D2 参数解析 ＋ 回车才建 ---------- */
  await guard('D2 参数解析', async () => {
    const r = {};
    const pg = await open('new=kids&key=Fm&meter=3/4&tempo=96&acc=pure&title=' + encodeURIComponent('小猫钓鱼') + '&bars=12&lyr=3');
    r.p = await panelInfo(pg);
    r.st = await EV(pg, () => ({ v: NWP.state.v, src: NWP.state.src, mel: NWP.state.mel, stack: NWP.stackOfState(NWP.state), title: document.getElementById('nw-title').value }));
    /* 真按回车建（焦点在左栏选中的用途上） */
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(250);
    r.made = await EV(pg, () => ({ docs: docs.length, title: song.title, key: song.key, mode: song.mode, beats: song.beats, unit: song.unit, tempo: song.tempo, n: song.measures.length,
      lyr: song.lyricLines, k: NWB.stackOf(song), last: JSON.parse(localStorage.getItem('musetab-nw-last') || 'null') }));
    await pg._ctx.close();
    /* 纯函数：调号写法 */
    const p2 = await open('');
    r.keys = await EV(p2, () => ['C', 'c', 'G', 'C#', 'Db', 'Gb', 'F#', 'Bb', 'Am', 'am', 'Fm', 'F#m', 'Bbm', 'Ebm', 'Dm', 'Gm', 'Cm', 'Bm', 'C#m', 'H', 'Cx', 'm', '', 'Fmaj7']
      .map(k => k + '→' + (x => x ? x.key + (x.mode === 'minor' ? 'm' : '') : '×')(NWP.linkKey(k))).join(' '));
    /* 变体 / 旋律用 / 自选记谱法 rows */
    const cases = [['new=gtr&inst=uku&pen=J', 'JT', { inst: 'uku', pen: 'J' }], ['new=pacc&mel=S', 'SG', {}], ['new=teach&tacc=with', 'SJG', { tacc: 'with' }],
      ['new=vocal&parts=4&mel=S', 'S', { parts: 4 }], ['new=sight&clef=bass&key=Am', 'S', { clef: 'bass' }], ['new=inst&instKey=erhu&mel=S', 'S', { instKey: 'erhu' }],
      ['new=inst&instkey=epiano', 'G', { instKey: 'epiano' }], ['new=inst&instKey=other&oclef=alto', 'S', { instKey: 'other', oclef: 'alto' }], ['new=chord&ftype=CJ&mel=S', 'CS', { ftype: 'CJ' }],
      ['new=custom&rows=JG', 'JG', {}], ['new=custom&rows=gj', 'JG', {}], ['new=custom&rows=SJG', 'SJG', {}], ['new=custom&rows=T', 'T', {}], ['new=blank&mel=S', 'S', {}], ['new=PACC', 'JG', {}]];
    r.cases = [];
    for (const [q, k, vars] of cases) {
      const x = await EV(p2, qq => { try { closeModal(); } catch (_) {} hideStartPad(); nwLinkBoot('?' + qq); const st = NWP.state;
        return { k: NWP.stackOfState(st), v: st.v, mel: st.mel, bad: st.link && st.link.bad, kind: document.getElementById('nf-kind').textContent }; }, q);
      const ok = !x.err && x.k === k && Object.entries(vars).every(([a, v]) => x.v[a] === v) && (!x.bad || !x.bad.length);
      r.cases.push((ok ? '' : '✗') + q + '→' + x.k + '/' + x.kind);
    }
    await p2._ctx.close();
    const P = r.p, S = r.st, M = r.made;
    T(P.open && P.scene === 'kids' && S.stack === 'CG' && S.v.key === 'Ab' && S.v.mode === 'minor' && S.v.beats === 3 && S.v.unit === 4 && S.v.tempo === 96 && S.v.nMea === 12 && S.v.lyr === 3
      && S.title === '小猫钓鱼' && S.src.key === 'link' && S.src.meter === 'link' && S.src.tempo === 'link' && S.src.nMea === 'link' && S.src.lyr === 'link' && S.src.title === 'link'
      && P.userChips === 0 && /按链接/.test(P.basis) && !/你改的/.test(P.basis) && ['《小猫钓鱼》', 'f 小调', '3/4', '♩=96', '12 小节', '3 段词'].every(t => P.linkChips.includes(t)) && P.docs === 1
      && M.docs === 2 && M.title === '小猫钓鱼' && M.key === 'Ab' && M.mode === 'minor' && M.beats === 3 && M.tempo === 96 && M.n === 12 && M.lyr === 3 && M.k === 'CG'
      && M.last && M.last.scene === 'kids' && M.last.stack === 'CG',
      'D2 ?new=kids&key=Fm&meter=3/4&tempo=96&acc=pure&title=…&bars=12&lyr=3：f 小调按关系大调 ♭A 记谱、3/4、♩=96、只要伴奏（钢琴弹唱谱）、12 小节、3 段词、曲名；依据全是「按链接」无「你改的」；真按回车才建，建出的谱＝预选（本机键这时才记）',
      JSON.stringify({ P: Object.assign({}, P, { plan: undefined }), S, M }));
    const wantKeys = 'C→C c→C G→G C#→C# Db→C# Gb→F# F#→F# Bb→Bb Am→Cm am→Cm Fm→Abm F#m→Am Bbm→C#m Ebm→F#m Dm→Fm Gm→Bbm Cm→Ebm Bm→Dm C#m→Em H→× Cx→× m→× →× Fmaj7→×';
    T(r.keys === wantKeys, 'D2b 调：字母大小写均可、♯/♭ 写法（Db→C#、Gb→F#）、小调加 m 换关系大调记谱（Fm→♭A 调号 · f 小调）；H / Cx / Fmaj7 / 空值不认', r.keys);
    T(r.cases.every(x => x[0] !== '✗'), 'D2c 变体 / 旋律用 / 自选记谱法：uku＋先写旋律、旋律用五线谱（SG）、对照谱加伴奏（SJG）、四部五线谱合唱、视唱低音谱号＋a 小调、二胡五线谱、电钢琴（instkey 小写也认）、其他器乐中音谱号、五线谱和弦谱、rows=JG / gj（顺序大小写无关）/ SJG / T、空白谱五线谱、用途大写', r.cases.join(' · '));
  });

  /* ---------- D3 非法值逐项忽略 ---------- */
  await guard('D3 非法值', async () => {
    const r = {};
    const pg = await open('new=gtr&key=H&meter=5/3&tempo=300&inst=banjo&pen=X&acc=pure&mel=S&rows=JG&bars=0&lyr=9&parts=2&tacc=with&title=%20%20');
    r.a = await panelInfo(pg); r.aWant = await cleanPlan(pg, 'gtr');
    r.aSrc = await EV(pg, () => NWP.state.src);
    await pg._ctx.close();
    const p2 = await open('new=xyz&key=G&tempo=abc');
    r.b = await panelInfo(p2); r.bSt = await EV(p2, () => ({ key: NWP.state.v.key, src: NWP.state.src, scene: NWP.state.scene }));
    await p2._ctx.close();
    const p3 = await open('new=constructor');
    r.c = await panelInfo(p3);
    await p3._ctx.close();
    const p4 = await open('new=custom&rows=GT');   /* 六线谱＋大谱表不能同页：不认，回自选记谱法默认 */
    r.d = await panelInfo(p4); r.dK = await EV(p4, () => NWP.stackOfState(NWP.state));
    await p4._ctx.close();
    const A = r.a;
    T(A.open && A.scene === 'gtr' && A.plan === r.aWant && A.userChips === 0 && A.linkChips.length === 0 && !/你改的|按链接/.test(A.basis.replace(A.bad, ''))
      && ['key=H', 'meter=5/3', 'tempo=300', 'inst=banjo', 'pen=X', 'acc=pure', 'mel=S', 'rows=JG', 'bars=0', 'lyr=9', 'parts=2', 'tacc=with'].every(x => A.bad.includes(x))
      && r.aSrc.key === 'scene' && r.aSrc.tempo === 'scene' && r.aSrc.meter === 'scene' && !r.aSrc.title,
      'D3 吉他弹唱带 12 个非法 / 不属于该用途的参数：全部忽略（建谱计划＝吉他弹唱默认逐字一致），依据里没有「你改的」也没有「按链接」，「链接里没认出」逐项列出；空白曲名不算',
      JSON.stringify({ A: Object.assign({}, A, { plan: undefined }), src: r.aSrc }));
    T(r.b.open && r.bSt.scene === 'gtr' && r.bSt.key === 'G' && r.bSt.src.key === 'link' && /new=xyz/.test(r.b.bad) && /tempo=abc/.test(r.b.bad) && r.b.userChips === 0
      && r.c.open && /new=…/.test(r.c.bad) && r.d.open && r.dK !== 'GT' && /rows=GT/.test(r.d.bad),
      'D3b 用途认不出（xyz / 原型链键 constructor，长值只列名）仍开面板（默认用途），其余合法参数照用（key=G 按链接）；rows=GT 这种拼不成一份谱的组合不认',
      JSON.stringify({ b: r.b.bad, bSt: r.bSt, c: r.c.bad, d: r.d.bad, dK: r.dK }));
  });

  /* ---------- D4 不污染 musetab-nw-last ---------- */
  await guard('D4 本机键', async () => {
    const r = {};
    const seed = JSON.stringify({ scene: 'teach', stack: 'SJ', rows: ['S', 'J'], mel: 'J', v: { title: '', key: 'G', mode: 'major', beats: 3, unit: 4, tempo: 100, tunit: 'e', nMea: 16, lyr: 1, capo: 0, tuning: 'std', inst: 'guitar', pen: 'T', acc: 'mel', tacc: 'no', parts: 1, clef: 'staff', ftype: 'C', instKey: 'piano', oclef: 'staff' }, t: 1 });
    const pg = await open('new=sight&key=Dm&tempo=60', 1280, 800, { init: 'try{ if(!sessionStorage.getItem("seeded")){ localStorage.setItem("musetab-nw-last", ' + JSON.stringify(seed) + '); sessionStorage.setItem("seeded","1"); } }catch(_){}' });
    r.open = await panelInfo(pg);
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(80);
    r.afterEsc = await EV(pg, () => localStorage.getItem('musetab-nw-last'));
    r.keys = await EV(pg, () => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort().join(','));
    await pg.evaluate(() => hideStartPad()); await pg.keyboard.press('Alt+KeyN'); await pg.waitForTimeout(150);
    r.alt = await EV(pg, () => ({ scene: NWP.state && NWP.state.scene, key: NWP.state && NWP.state.v.key, src: NWP.state && NWP.state.src.key }));
    await pg.keyboard.press('Escape');
    /* 深链里真建一次：这时才记成这次（视唱 · d 小调 · ♩=60） */
    await pg.evaluate(() => nwLinkBoot('?new=sight&key=Dm&tempo=60')); await pg.waitForSelector('.nf-modal [data-scene]');
    await pg.click('#nw-create'); await pg.waitForTimeout(200);
    r.made = await EV(pg, () => JSON.parse(localStorage.getItem('musetab-nw-last') || 'null'));
    await pg._ctx.close();
    T(r.open.open && r.open.scene === 'sight' && r.afterEsc === seed && r.alt.scene === 'teach' && r.alt.key === 'G' && r.alt.src === 'last'
      && r.made && r.made.scene === 'sight' && r.made.v.key === 'F' && r.made.v.mode === 'minor' && r.made.v.tempo === 60,
      'D4 深链打开再关掉：musetab-nw-last 逐字节不变；接着 Alt+N 开面板仍是上次（教学对照谱 1=G，依据「沿用上次」）；深链里真点「创建」后才记成这次（视唱 · d 小调 · ♩=60）',
      JSON.stringify({ sc: r.open.scene, same: r.afterEsc === seed, alt: r.alt, made: r.made && { sc: r.made.scene, v: r.made.v && { key: r.made.v.key, mode: r.made.v.mode, tempo: r.made.v.tempo } }, keys: r.keys }));
  });

  /* ---------- D5 replaceState ---------- */
  await guard('D5 replaceState', async () => {
    const r = {};
    const pg = await open('utm_source=site&new=pacc&key=G&tempo=80&acc=mel&mel=J&title=abc&zz=1', 1280, 800, { init: 'window.__h0 = history.length;' });
    r.a = await EV(pg, () => ({ search: location.search, hist: history.length - window.__h0, open: !!document.querySelector('.nf-modal [data-scene]'), scene: NWP.state && NWP.state.scene }));
    await pg.keyboard.press('Escape');
    await pg.reload(); await pg.waitForTimeout(1000);
    r.b = await EV(pg, () => ({ search: location.search, open: !!document.querySelector('.nf-modal [data-scene]'), pad: startPadOn(), modal: !!document.getElementById('modal-mask') }));
    await pg._ctx.close();
    T(r.a.open && r.a.scene === 'pacc' && r.a.search === '?utm_source=site&zz=1' && r.a.hist === 0 && r.b.search === '?utm_source=site&zz=1' && !r.b.open && !r.b.modal && r.b.pad,
      'D5 处理后 history.replaceState 只去掉深链这一组参数（new / key / tempo / acc / mel / title），其余参数保留、历史不多一条；刷新后不再弹面板，停在启动台', JSON.stringify(r));
  });

  /* ---------- D6 真手机：发到电脑继续 ---------- */
  await guard('D6 真手机深链', async () => {
    const r = {};
    const pg = await open('new=kids&key=F&meter=2/4&tempo=104', 390, 844, { mob: true });
    r.a = await EV(pg, () => ({ mob: isMobileNew(), search: location.search, panel: !!document.querySelector('.nf-modal,[data-scene]'), h3: (document.querySelector('.modal h3') || {}).textContent,
      link: (document.getElementById('mp-link') || {}).textContent, kind: (document.getElementById('mp-kind') || {}).textContent, basis: (document.getElementById('mp-basis') || {}).textContent,
      docs: docs.length, over: document.documentElement.scrollWidth - innerWidth, last: localStorage.getItem('musetab-nw-last') }));
    /* 真实选择：改成 G 大调、3/4、速度 88 → 链接跟着变、依据「你改的」 */
    await pg.selectOption('#mp-key', 'G'); await pg.selectOption('#mp-beats', '3');
    await pg.fill('#mp-tempo', '88'); await pg.locator('#mp-tempo').blur();
    r.b = await EV(pg, () => ({ link: document.getElementById('mp-link').textContent, user: [...document.querySelectorAll('#mp-basis i.c-user')].map(x => x.textContent).join(','), basis: document.getElementById('mp-basis').textContent }));
    /* 越界速度：夹紧 */
    await pg.fill('#mp-tempo', '999'); await pg.locator('#mp-tempo').blur();
    r.clamp = await EV(pg, () => document.getElementById('mp-tempo').value);
    await pg.evaluate(() => { window.__cp = []; const oc = copyLinkForPc; window.copyLinkForPc = (u, w, cb) => { window.__cp.push(u); if (cb) cb(true); }; });
    const pc = await pg.$('#nw-pc'); const pr = pc && await pc.boundingBox();
    await pg.tap('#nw-pc'); await pg.waitForTimeout(120);
    r.c = await EV(pg, () => ({ cp: window.__cp, done: (document.getElementById('mp-done') || {}).textContent, link: (document.getElementById('mp-link') || {}).textContent, steps: document.querySelectorAll('.nw-mdone ol li').length }));
    r.pcVis = !!pr && pr.y >= 0 && pr.y + pr.height <= 844;
    await pg._ctx.close();
    const want = 'https://zhipu.puyouquan.com/?new=kids&key=F&meter=2/4&tempo=104&acc=mel&mel=J';
    T(r.a.mob && !r.a.panel && /儿歌弹唱/.test(r.a.h3) && r.a.link === want && r.a.kind === '钢琴伴奏歌谱' && /按链接/.test(r.a.basis) && r.a.docs === 1 && r.a.over <= 0 && r.a.search === '' && r.a.last === null,
      'D6 真手机 ?new=kids&key=F&meter=2/4&tempo=104：不出新建面板，直达「儿歌弹唱」发到电脑页（将建成 钢琴伴奏歌谱），链接＝方案示例逐字（' + want + '）；不建谱、不写本机键、地址栏已清',
      JSON.stringify(r.a));
    T(r.b.link === 'https://zhipu.puyouquan.com/?new=kids&key=G&meter=3/4&tempo=88&acc=mel&mel=J' && /1=G/.test(r.b.user) && /3\/4/.test(r.b.user) && /♩=88/.test(r.b.user) && /你改的/.test(r.b.basis)
      && r.clamp === '240' && r.pcVis && r.c.cp.length === 1 && r.c.cp[0] === 'https://zhipu.puyouquan.com/?new=kids&key=G&meter=3/4&tempo=240&acc=mel&mel=J' && r.c.done === '链接已复制' && r.c.steps === 3 && r.c.link === r.c.cp[0],
      'D6b 手机上真实改调 / 拍号 / 速度：链接跟着变、依据「你改的」；速度 999 夹到 240；点「发到电脑继续」复制的就是这条带参链接，切到「链接已复制」三步说明',
      JSON.stringify({ b: r.b, clamp: r.clamp, pcVis: r.pcVis, c: r.c }));
  });

  /* ---------- D6c 手机 10 个用途逐个真点 → 链接拿到电脑上打开＝同一预选 ---------- */
  await guard('D6c 手机→电脑往返', async () => {
    const pm = await open('', 390, 844, { mob: true });
    const pd = await open('');
    const bad = [], got = [];
    for (const sc of SCENES.filter(x => x !== 'custom')) {
      await pm.evaluate(() => { try { closeModal(); } catch (_) {} showNewWizard(); });
      await pm.waitForSelector('[data-mu="' + sc + '"]');
      await pm.tap('[data-mu="' + sc + '"]'); await pm.waitForTimeout(60);
      const m = await EV(pm, () => ({ link: document.getElementById('mp-link').textContent, plan: JSON.stringify(NWP.planOf(MPC.st)), noScene: !document.querySelector('[data-scene]') }));
      const d = await EV(pd, l => { try { closeModal(); } catch (_) {} hideStartPad(); nwLinkBoot(l.replace(/^[^?]*/, '')); return JSON.stringify(NWP.planOf(NWP.state)); }, m.link);
      const want = await cleanPlan(pd, sc);
      got.push(m.link.replace('https://zhipu.puyouquan.com/', ''));
      if (!(m.noScene && m.plan === d && d === want && m.link.startsWith('https://zhipu.puyouquan.com/?new=' + sc + '&key='))) bad.push(sc + ' ' + JSON.stringify({ m, d: (d || '').slice(0, 120) }));
    }
    await pm._ctx.close(); await pd._ctx.close();
    T(bad.length === 0, 'D6c 手机「在电脑上开始一份谱」10 个用途逐个真点：链接带用途 / 调 / 拍号 / 速度 / 该用途变体，电脑上打开后预选的建谱计划＝手机所选＝该用途默认（逐字）', bad.length ? bad.join(' | ') : got.join(' · '));
  });

  /* ---------- D7 链接往返（引擎级，随机 300 个状态） ---------- */
  await guard('D7 往返', async () => {
    const pg = await open('');
    const r = await EV(pg, () => {
      let seed = 20261015; const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
      const bad = []; let n = 0;
      const keys = KEY_LIST, meters = [[2, 4], [3, 4], [4, 4], [6, 8], [9, 8], [5, 4], [12, 8], [2, 2], [7, 8]];
      for (let i = 0; i < 300; i++) {
        const sc = NWP.SCENE_IDS[rnd(NWP.SCENE_IDS.length)], st = NWP.fresh({ scene: sc, clean: true });
        if (sc === 'custom') { const ks = Object.keys(NWB.STACKS); st.rows = NWB.STACKS[ks[rnd(ks.length)]].rows.slice(); }
        NWP.varsShown(st).forEach(vk => { if (vk === 'instKey') st.v.instKey = NWP.INSTS[rnd(NWP.INSTS.length)].k; else { const o = NWP.VARS[vk].opts; st.v[vk] = o[rnd(o.length)][0]; } });
        NWP.varsShown(st).forEach(vk => { if (vk === 'oclef') { const o = NWP.VARS.oclef.opts; st.v.oclef = o[rnd(o.length)][0]; } });
        if (NWP.melLive(sc, st.v)) st.mel = rnd(2) ? 'S' : 'J';
        if (sc !== 'custom') st.rows = NWB.STACKS[NWP.stackOfState(st)].rows.slice();
        st.v.key = keys[rnd(12)]; st.v.mode = rnd(3) ? 'major' : 'minor'; const m = meters[rnd(meters.length)]; st.v.beats = m[0]; st.v.unit = m[1];
        st.v.tempo = 30 + rnd(211);
        if (rnd(2)) { st.v.nMea = 1 + rnd(200); st.src.nMea = 'user'; }
        if (rnd(2) && NWP.lyrShown(st, NWP.stackOfState(st))) { st.v.lyr = rnd(5); st.src.lyr = 'user'; }
        if (rnd(3) === 0) st.v.title = ['春晓', 'A & B?', '小猫 #2', '100% 原创/改编', '  空格  '][rnd(5)];
        const link = NWP.linkOf(st), L = NWP.linkParse(link), st2 = NWP.fresh({ scene: L.scene, clean: true, link: L });
        const a = JSON.stringify(NWP.planOf(st)), b2 = JSON.stringify(NWP.planOf(st2));
        n++;
        if (a !== b2 || (st2.link.bad || []).length) bad.push(link + ' ⇒ ' + JSON.stringify(st2.link.bad) + ' ' + a.slice(0, 200) + ' ≠ ' + b2.slice(0, 200));
      }
      return { n, bad: bad.slice(0, 4), nb: bad.length };
    });
    await pg._ctx.close();
    T(!r.err && r.n === 300 && r.nb === 0, 'D7 链接往返：随机 300 个面板状态（11 用途 × 变体 × 旋律用 × 12 调大小调 × 9 种拍号 × 速度 × 小节数 × 歌词段 × 曲名含 & ? # / %）→ linkOf → linkParse → linkApply：建谱计划逐字一致、无「没认出」', JSON.stringify(r));
  });

  /* ---------- D8 官网垂类页按钮 ---------- */
  await guard('D8 官网按钮', async () => {
    const want = { 'kaobian.html': 'pacc', 'jixing.html': 'pacc', 'shifan.html': 'kids', 'yikao.html': 'sight' };
    const r = {};
    for (const [f, sc] of Object.entries(want)) {
      let h = ''; try { h = fs.readFileSync(path.join(SITE, f), 'utf8'); } catch (_) {}
      const btns = [...h.matchAll(/<a class="btn big[^"]*" href="([^"]*zhipu\.puyouquan\.com[^"]*)"/g)].map(m => m[1]);
      r[f] = { btns, ok: btns.length === 2 && btns.every(u => u === '//zhipu.puyouquan.com/?new=' + sc) };
    }
    const pg = await open('');
    r.valid = await EV(pg, s => s.map(x => NWB.own(NWP.SC, x)).every(Boolean), ['pacc', 'kids', 'sight', 'teach']);
    await pg._ctx.close();
    T(Object.values(want).length === 4 && Object.keys(want).every(f => r[f].ok) && r.valid === true,
      'D8 官网垂类页「开始 / 打开编辑器」两处按钮带深链：考编 / 即兴伴奏 ?new=pacc、师范 ?new=kids、艺考 ?new=sight（域名沿用站内 //zhipu.puyouquan.com/）；这些用途在编辑器里都合法（课堂 teach 无单独官网页，编辑器侧 D1 已覆盖）',
      JSON.stringify(r));
  });

  /* ---------- D9 手机启动台主卡 ---------- */
  await guard('D9 手机启动台主卡', async () => {
    const r = {};
    const pg = await open('', 390, 844, { mob: true });
    r.pad = await EV(pg, () => { const v = e => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
      const cards = [...document.querySelectorAll('#spd-cards [data-sp]')].filter(v), g = document.getElementById('spd-cards').getBoundingClientRect(), c = document.querySelector('[data-sp="mstart"]');
      const cr = c && c.getBoundingClientRect();
      return { first: cards[0] && cards[0].dataset.sp, list: cards.map(e => e.dataset.sp).join(','), span: !!cr && Math.abs(cr.width - g.width) < 1, inView: !!cr && cr.bottom <= innerHeight,
        icon: (c && c.querySelector('svg.pqi') || { dataset: {} }).dataset.pq, txt: c && c.querySelector('b').textContent, over: document.documentElement.scrollWidth - innerWidth }; });
    await pg.tap('[data-sp="mstart"]'); await pg.waitForTimeout(150);
    r.list = await EV(pg, () => { const rows = [...document.querySelectorAll('.nw-mu')], md = document.querySelector('.modal');
      return { h3: document.querySelector('.modal h3').textContent, n: rows.length, ids: rows.map(x => x.dataset.mu).join(','), h: [...new Set(rows.map(x => Math.round(x.getBoundingClientRect().height * 10) / 10))],
        icons: rows.map(x => (x.querySelector('svg.pqi') || { dataset: {} }).dataset.pq).every(k => /^type-/.test(k || '')), noSample: rows.every(x => !x.querySelector('img,canvas,svg:not(.pqi)')),
        scene: !!document.querySelector('[data-scene],.nf-modal'), mOver: md.scrollWidth - md.clientWidth, over: document.documentElement.scrollWidth - innerWidth, imp: !!document.getElementById('nw-mimp') }; });
    /* 列表滚到底：主按钮仍在视口内（钉在底部） */
    await pg.evaluate(() => { const md = document.querySelector('.modal'); md.scrollTop = md.scrollHeight; }); await pg.waitForTimeout(60);
    r.pcBottom = await EV(pg, () => { const pc = document.getElementById('nw-pc'), b2 = pc.getBoundingClientRect(), e = document.elementFromPoint(b2.left + b2.width / 2, b2.top + b2.height / 2);
      return b2.top >= 0 && b2.bottom <= innerHeight && !!e && pc.contains(e) && document.querySelector('.modal').scrollTop > 0; });
    await pg.evaluate(() => { document.querySelector('.modal').scrollTop = 0; });
    await pg.evaluate(() => { window.__cp = []; window.copyLinkForPc = (u, w, cb) => { window.__cp.push(u); if (cb) cb(true); }; });
    await pg.tap('[data-mu="teach"]'); await pg.waitForTimeout(80);
    r.det = await EV(pg, () => ({ h3: document.querySelector('.modal h3').textContent, kind: document.getElementById('mp-kind').textContent, link: document.getElementById('mp-link').textContent }));
    await pg.tap('#nw-pc'); await pg.waitForTimeout(80);
    r.done = await EV(pg, () => ({ t: (document.getElementById('mp-done') || {}).textContent, cp: window.__cp.slice() }));
    await pg.tap('.nw-mback'); await pg.waitForTimeout(60);
    r.back1 = await EV(pg, () => !!document.getElementById('mp-kind'));
    await pg.tap('.nw-mback'); await pg.waitForTimeout(60);
    r.back2 = await EV(pg, () => document.querySelectorAll('.nw-mu').length);
    await pg.tap('#nw-mimp'); await pg.waitForTimeout(120);
    r.imp = await EV(pg, () => ({ imp: !!document.querySelector('.nf-modal #nw-import'), newTab: !!document.querySelector('.nf-modal [data-scene]') }));
    r.end = await EV(pg, () => ({ docs: docs.length, last: localStorage.getItem('musetab-nw-last') }));
    await pg._ctx.close();
    /* 电脑窄窗口（非触屏）：同一张卡照常出新建面板 */
    const pn = await open('', 390, 844);
    await pn.click('[data-sp="mstart"]'); await pn.waitForTimeout(150);
    r.narrow = await EV(pn, () => !!document.querySelector('.nf-modal [data-scene]'));
    await pn._ctx.close();
    T(r.pad.first === 'mstart' && r.pad.list === 'mstart,demo,pc,open,mine' && r.pad.span && r.pad.inView && r.pad.icon === 'act-new' && r.pad.txt === '开始一份谱' && r.pad.over <= 0,
      'D9 手机启动台：首张卡「开始一份谱」（跨两列、首屏可见、act-new 图标），其后看示例 / 发到电脑继续 / 打开 / 我的；无横向溢出', JSON.stringify(r.pad));
    T(r.list.h3 === '在电脑上开始一份谱' && r.list.n === 10 && r.list.ids === 'gtr,pacc,kids,vocal,teach,sight,solo,inst,chord,blank' && r.list.h.length === 1 && r.list.h[0] === 64
      && r.list.icons && r.list.noSample && !r.list.scene && r.list.mOver <= 1 && r.list.over <= 0 && r.list.imp && r.pcBottom,
      'D9b 真点主卡 →「在电脑上开始一份谱」：按用途 10 行、每行 64px、只用谱类图标（无谱面小样张）、不出电脑面板；列表滚到底主按钮仍可见可点；无横向溢出；有「导入已有的谱」',
      JSON.stringify(Object.assign({}, r.list, { pcBottom: r.pcBottom })));
    T(/教学对照谱/.test(r.det.h3) && r.det.kind === '教学对照谱' && r.det.link === 'https://zhipu.puyouquan.com/?new=teach&key=C&meter=4/4&tempo=88&tacc=no'
      && r.done.t === '链接已复制' && r.done.cp[0] === r.det.link && r.back1 === true && r.back2 === 10 && r.imp.imp && !r.imp.newTab && r.end.docs === 1 && r.end.last === null && r.narrow === true,
      'D9c 点「教学对照谱」→ 详情（链接带用途与调拍）→「发到电脑继续」复制该链接 → 已复制 → 返回详情 → 返回列表；仍可导入看谱（只有从已有音乐）；全程不建谱、不写本机键；电脑窄窗口同一张卡出新建面板',
      JSON.stringify({ det: r.det, done: r.done, back1: r.back1, back2: r.back2, imp: r.imp, end: r.end, narrow: r.narrow }));
  });

  /* ================= 收尾验收补（修前红修后绿；MUSETAB_URL 指向收尾前的工作树副本复跑全红） ================= */
  const MOB_CP = 'window.__cp=[]; try{ Object.defineProperty(navigator,"clipboard",{value:{writeText:t=>{ window.__cp.push(t); return Promise.resolve(); }},configurable:true}); }catch(_){}';
  const NWLAST_SEED = JSON.stringify({ scene: 'sight', stack: 'S', rows: ['S'], mel: 'S', v: { title: '', key: 'G', mode: 'major', beats: 3, unit: 4, tempo: 66, tunit: 'e', nMea: 8, lyr: 0, capo: 0, tuning: 'std', inst: 'guitar', pen: 'T', acc: 'mel', tacc: 'no', parts: 1, clef: 'staff', ftype: 'C', instKey: 'piano', oclef: 'staff' }, t: 1 });
  const seedInit = 'try{ localStorage.setItem("musetab-nw-last", ' + JSON.stringify(NWLAST_SEED) + '); }catch(_){}';

  /* ---------- D10 用途认不出 / 为空：一律不读上次，电脑手机同口径 ---------- */
  await guard('D10 认不出不读上次', async () => {
    const r = {};
    for (const q of ['new=xyz&tempo=100', 'new=', 'new']) {
      const pg = await open(q, 1280, 800, { init: seedInit });
      const p = await panelInfo(pg);
      r[q] = { open: p.open, scene: p.scene, last: /沿用上次/.test(p.basis), lastChips: await EV(pg, () => document.querySelectorAll('#nf-basis i.c-last').length),
        tempo: await EV(pg, () => NWP.state && NWP.state.v.tempo), link: p.linkChips.join(','), keyNow: await EV(pg, () => NWP.state && NWP.state.v.key) };
      if (q === 'new=xyz&tempo=100') {   /* 换个用途：链接预选不再挂着「没认出」 */
        await pg.click('[data-scene="pacc"]'); await pg.waitForTimeout(80);
        r.switched = await EV(pg, () => ({ bad: !!document.getElementById('nf-linkbad'), scene: NWP.state.scene }));
      }
      await pg._ctx.close();
    }
    const pm = await open('new=xyz&key=G&meter=3/4', 390, 844, { mob: true });
    r.mList = await EV(pm, () => (document.querySelector('.nw-mbad') || {}).textContent || '');
    await pm.tap('[data-mu="gtr"]'); await pm.waitForTimeout(80);
    r.mLink = await EV(pm, () => document.getElementById('mp-link').textContent);
    await pm.tap('.nw-mback'); await pm.waitForTimeout(60); await pm.tap('[data-mu="kids"]'); await pm.waitForTimeout(80);
    r.mLink2 = await EV(pm, () => document.getElementById('mp-link').textContent);
    await pm._ctx.close();
    const A = r['new=xyz&tempo=100'], B = r['new='], C = r['new'];
    T(A.open && A.scene === 'gtr' && !A.last && A.lastChips === 0 && A.tempo === 100 && /♩=100/.test(A.link) && A.keyNow === 'C'
      && B.open && B.scene === 'gtr' && !B.last && C.open && C.scene === 'gtr' && !C.last && r.switched && !r.switched.bad && r.switched.scene === 'pacc',
      'D10 本机有「上次」（视唱 1=G 3/4 ♩=66）时 ?new=xyz&tempo=100 / ?new= / ?new：面板＝默认用途吉他弹唱、依据里没有「沿用上次」、♩=100 按链接（不与上次混用）；换用途后「链接里没认出」不再挂着',
      JSON.stringify(r));
    T(/new=xyz/.test(r.mList) && r.mLink === 'https://zhipu.puyouquan.com/?new=gtr&key=G&meter=3/4&tempo=80&inst=guitar&pen=T' && /new=kids&key=F&meter=2\/4&tempo=104/.test(r.mLink2),
      'D10b 真手机 ?new=xyz&key=G&meter=3/4：列表页说明认不出，接着选「吉他弹唱」链接带上 key=G、3/4（同电脑口径）；返回再选别的用途回到该用途惯例',
      JSON.stringify({ mList: r.mList, mLink: r.mLink, mLink2: r.mLink2 }));
  });

  /* ---------- D11 参数名不分大小写；拼错 / 别名列进「没认出」；平台参数不列 ---------- */
  await guard('D11 参数名', async () => {
    const r = {};
    const pg = await open('NEW=pacc&Key=G&TEMPO=90&Meter=3/4', 1280, 800);
    r.a = await panelInfo(pg); r.aSt = await EV(pg, () => NWP.state && { key: NWP.state.v.key, tempo: NWP.state.v.tempo, beats: NWP.state.v.beats, src: NWP.state.src }); r.aUrl = await EV(pg, () => location.search);
    await pg._ctx.close();
    const p2 = await open('new=kids&tmepo=90&bpm=80&utm_source=site&from=singlemessage&isappinstalled=0&skin=next', 1280, 800);
    r.b = await panelInfo(p2); r.bSt = await EV(p2, () => NWP.state && NWP.state.v.tempo); r.bUrl = await EV(p2, () => location.search);
    await p2._ctx.close();
    T(r.a.open && r.a.scene === 'pacc' && r.aSt.key === 'G' && r.aSt.tempo === 90 && r.aSt.beats === 3 && r.aSt.src.key === 'link' && r.aSt.src.tempo === 'link' && !r.a.bad && r.aUrl === '',
      'D11 参数名不分大小写：?NEW=pacc&Key=G&TEMPO=90&Meter=3/4 照样打开钢琴即兴伴奏并按链接预选 1=G、3/4、♩=90，地址栏清掉', JSON.stringify({ a: Object.assign({}, r.a, { plan: undefined }), st: r.aSt, url: r.aUrl }));
    T(r.b.open && r.b.scene === 'kids' && r.bSt === 104 && /tmepo/.test(r.b.bad) && /bpm（应为 tempo）/.test(r.b.bad) && !/utm_source|from|isappinstalled|skin/.test(r.b.bad)
      && r.bUrl === '?utm_source=site&from=singlemessage&isappinstalled=0&skin=next',
      'D11b 拼错（tmepo）与别名（bpm）列进「链接里没认出」（不再静默）、速度仍是用途惯例 104；utm / 微信分享追加的 from、isappinstalled / skin 不列、地址栏保留', JSON.stringify({ bad: r.b.bad, tempo: r.bSt, url: r.bUrl }));
  });

  /* ---------- D12 「没认出」不照抄长值 / 非 ASCII 值（防借编辑器界面伪造提示） ---------- */
  await guard('D12 没认出不照抄', async () => {
    const pg = await open('new=pacc&key=' + encodeURIComponent('请加微信xxx领取会员') + '&meter=' + encodeURIComponent('<b>9/9</b>') + '&tempo=abc', 1280, 800);
    const p = await panelInfo(pg);
    const pm = await open('new=pacc&key=' + encodeURIComponent('请加微信xxx'), 390, 844, { mob: true });
    const m = await EV(pm, () => (document.getElementById('mp-basis') || {}).textContent || '');
    await pg._ctx.close(); await pm._ctx.close();
    T(p.open && /key=…/.test(p.bad) && /meter=…/.test(p.bad) && /tempo=abc/.test(p.bad) && !/微信|会员|<b>/.test(p.bad) && /key=…/.test(m) && !/微信/.test(m),
      'D12 「链接里没认出」只列参数名，值只在 ≤8 个 ASCII 字符时附上：key=请加微信… 显示成 key=…（电脑面板与手机详情页同口径），短值照列（tempo=abc）', JSON.stringify({ bad: p.bad, mob: m }));
  });

  /* ---------- D13 手机详情页对齐方案 §6 / M03–M04：预览＋曲名＋旋律用＋变体＋52px 主按钮；已复制页速度符号 ---------- */
  await guard('D13 手机详情页', async () => {
    const r = {};
    const pg = await open('new=kids', 390, 844, { mob: true, init: MOB_CP });
    await pg.waitForSelector('#mpc-pv svg', { timeout: 3000 }).catch(() => {});
    r.a = await EV(pg, () => { const pc = document.getElementById('nw-pc'); const sv = document.querySelector('#mpc-pv svg');
      return { pv: !!sv && sv.getAttribute('role') === 'img' && sv.getBoundingClientRect().height > 40, title: !!document.getElementById('mpc-title'), pcH: pc && Math.round(pc.getBoundingClientRect().height),
        segs: [...document.querySelectorAll('[data-mpk]')].map(x => x.dataset.mpk + '=' + x.dataset.v).join(','), segH: Math.min(...[...document.querySelectorAll('[data-mpk]')].map(x => x.getBoundingClientRect().height)) }; });
    await pg.tap('[data-mpk="acc"][data-v="pure"]'); await pg.waitForTimeout(250);
    r.b = await EV(pg, () => ({ kind: document.getElementById('mp-kind').textContent, mel: !!document.querySelector('[data-mpk="mel"]'), link: document.getElementById('mp-link').textContent,
      focus: document.activeElement && document.activeElement.dataset.v, pv: (document.querySelector('#mpc-pv svg') || { getAttribute: () => '' }).getAttribute('aria-label') }));
    await pg.tap('[data-mpk="acc"][data-v="mel"]'); await pg.waitForTimeout(60);
    await pg.tap('[data-mpk="mel"][data-v="S"]'); await pg.waitForTimeout(60);
    await pg.fill('#mpc-title', '小猫钓鱼'); await pg.waitForTimeout(60);
    r.c = await EV(pg, () => ({ kind: document.getElementById('mp-kind').textContent, link: document.getElementById('mp-link').textContent, basis: document.getElementById('mp-basis').textContent }));
    await pg.tap('#nw-pc'); await pg.waitForTimeout(150);
    r.cp = await EV(pg, () => window.__cp.slice());
    await pg._ctx.close();
    /* 手机生成的链接拿到电脑上打开：预选计划＝手机所选（含变体、旋律用、曲名） */
    const pd = await open('');
    r.d = await EV(pd, l => { hideStartPad(); nwLinkBoot(l.replace(/^[^?]*/, '')); const st = NWP.state; return { stack: NWP.stackOfState(st), title: st.v.title, kind: NWP.kindOfState(st).name }; }, r.cp[0] || '');
    await pd._ctx.close();
    /* 器乐独奏：乐器下拉换二胡 → 民乐简谱、出现「旋律用」 */
    const pi = await open('new=inst', 390, 844, { mob: true });
    await pi.selectOption('#mpc-inst', 'erhu'); await pi.waitForTimeout(80);
    r.e = await EV(pi, () => ({ kind: document.getElementById('mp-kind').textContent, mel: !!document.querySelector('[data-mpk="mel"]'), link: document.getElementById('mp-link').textContent, focus: document.activeElement && document.activeElement.id }));
    await pi._ctx.close();
    /* 6/8：已复制页的速度符号与依据同口径（♪=） */
    const p6 = await open('new=sight&key=Am&meter=6/8&tempo=60', 390, 844, { mob: true, init: MOB_CP });
    r.f = { basis: await EV(p6, () => document.getElementById('mp-basis').textContent) };
    await p6.tap('#nw-pc'); await p6.waitForTimeout(150);
    r.f.done = await EV(p6, () => (document.querySelector('.nw-mdone ol') || {}).textContent || '');
    await p6._ctx.close();
    T(r.a.pv && r.a.title && r.a.pcH >= 52 && r.a.segs === 'mel=J,mel=S,acc=mel,acc=pure' && r.a.segH >= 44,
      'D13 手机详情页（M03）：实时刻版预览（role=img）、曲名、「旋律用」与「要哪几行」分段按钮（命中区 ≥44）、主按钮高 ≥52px', JSON.stringify(r.a));
    T(r.b.kind === '钢琴弹唱谱（纯伴奏）' && !r.b.mel && r.b.link === 'https://zhipu.puyouquan.com/?new=kids&key=F&meter=2/4&tempo=104&acc=pure' && r.b.focus === 'pure' && /钢琴弹唱谱（纯伴奏）/.test(r.b.pv)
      && r.c.kind === '钢琴伴奏歌谱（五线谱）' && r.c.link === 'https://zhipu.puyouquan.com/?new=kids&key=F&meter=2/4&tempo=104&acc=mel&mel=S&title=%E5%B0%8F%E7%8C%AB%E9%92%93%E9%B1%BC' && /《小猫钓鱼》你改的/.test(r.c.basis)
      && r.cp[0] === r.c.link && r.d.stack === 'SG' && r.d.title === '小猫钓鱼' && r.e.kind === '二胡谱（简谱）' && r.e.mel && /instKey=erhu&mel=J/.test(r.e.link) && r.e.focus === 'mpc-inst',
      'D13b 手机上真点「只要伴奏」→ 将建成 / 预览 / 链接跟着变、「旋律用」随之消失、焦点留在刚点的钮；旋律用五线谱＋曲名 → 链接带 mel=S&title、依据「你改的」；复制的链接在电脑上打开＝同一预选（SG、曲名）；器乐独奏换二胡 → 简谱、出现「旋律用」',
      JSON.stringify({ b: r.b, c: r.c, cp: r.cp, d: r.d, e: r.e }));
    T(/♪=60/.test(r.f.basis) && /♪=60/.test(r.f.done) && !/♩=60/.test(r.f.done),
      'D13c 6/8 的已复制页写「♪=60」，与依据（♪=60 按链接）、电脑面板同口径（此前写死 ♩=）', JSON.stringify(r.f));
  });

  /* ---------- D14 窄手机无横向滚动 ＋ 读屏语义 ---------- */
  await guard('D14 窄屏与读屏', async () => {
    const r = {};
    for (const w of [320, 340]) {
      const pg = await open('', w, 568, { mob: true });
      await pg.tap('[data-sp="mstart"]'); await pg.waitForTimeout(120);
      const lst = await EV(pg, () => { const md = document.querySelector('.nw-mpc-mask .modal'); md.scrollLeft = 100; return md.scrollLeft; });
      if (w === 320) {
        r.aria = { li: await pg.getByRole('listitem').count(), btn: await pg.getByRole('button', { name: /儿歌弹唱/ }).count(), roleLi: await EV(pg, () => document.querySelectorAll('button[role=listitem]').length),
          lists: await EV(pg, () => [...document.querySelectorAll('.nw-mpc-mask [role=list]')].map(x => (document.getElementById(x.getAttribute('aria-labelledby')) || {}).textContent).join(',')) };
      }
      await pg.tap('[data-mu="inst"]'); await pg.waitForTimeout(200);
      const det = await EV(pg, () => { const md = document.querySelector('.nw-mpc-mask .modal'); md.scrollLeft = 100; return md.scrollLeft; });
      r[w] = { lst, det };
      await pg._ctx.close();
    }
    T(r[320].lst === 0 && r[320].det === 0 && r[340].lst === 0 && r[340].det === 0, 'D14 320 / 340 宽手机：「在电脑上开始一份谱」列表页与详情页都不能横向滚动（此前导入说明不换行撑出 34px）', JSON.stringify(r));
    T(r.aria.li === 10 && r.aria.btn === 1 && r.aria.roleLi === 0 && r.aria.lists === '弹唱伴奏,课堂声乐,独奏乐队,其他',
      'D14b 读屏：用途行是列表项里的原生按钮（不再 <button role=listitem> 把按钮语义盖掉），按「弹唱伴奏 / 课堂声乐 / 独奏乐队 / 其他」分组（M02）', JSON.stringify(r.aria));
  });

  /* ---------- D15 手机横屏启动台：主卡上沿可见、卡片区可滚 ---------- */
  await guard('D15 横屏启动台', async () => {
    const r = {};
    for (const [w, h] of [[844, 390], [915, 412], [667, 375]]) {
      const pg = await open('', w, h, { mob: true });
      r[w + 'x' + h] = await EV(pg, () => { const pad = document.getElementById('start-pad');
        const vis = (sp, dy) => { const c = document.querySelector('[data-sp="' + sp + '"]'), rc = c.getBoundingClientRect(); const e = document.elementFromPoint(rc.left + rc.width / 2, dy == null ? rc.top + rc.height / 2 : rc.top + dy); return !!e && c.contains(e); };
        const top = vis('mstart', 6); pad.scrollTop = pad.scrollHeight; const cs = getComputedStyle(pad);
        return { top, scroll: pad.scrollHeight <= pad.clientHeight || (/(auto|scroll)/.test(cs.overflowY) && pad.scrollTop > 0), mine: vis('mine') }; });
      await pg._ctx.close();
    }
    T(Object.values(r).every(x => x.top && x.scroll && x.mine), 'D15 手机横屏（844×390 / 915×412 / 667×375）：启动台主卡「开始一份谱」上沿不被工具栏盖住；放不下时卡片区可滚动，滚到底「我的」可点', JSON.stringify(r));
  });

  /* ---------- D16 落地页埋点带上深链用途 ---------- */
  await guard('D16 埋点落地页', async () => {
    const pg = await open('');
    const r = await EV(pg, () => { const out = {}; const p0 = location.pathname;
      for (const q of ['?new=pacc&utm_source=x', '?NEW=Kids', '?start=gtr', '?f=1']) { history.replaceState(null, '', p0 + q); out[q] = pyqTouch().landing; }
      history.replaceState(null, '', p0); return out; });
    await pg._ctx.close();
    T(/\?new=pacc$/.test(r['?new=pacc&utm_source=x']) && /\?new=kids$/.test(r['?NEW=Kids']) && /\?start=gtr$/.test(r['?start=gtr']) && !/\?/.test(r['?f=1']),
      'D16 visit 埋点的落地页带上深链用途（?new=pacc、?NEW=Kids → ?new=kids），官网垂类页按钮带来的访问可归因；旧 ?start= 照旧', JSON.stringify(r));
  });

  T(errs.length === 0, '无页面报错', errs.join(' | ') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
