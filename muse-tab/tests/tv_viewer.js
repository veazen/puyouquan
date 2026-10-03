/* v38.5 互动谱 + 播放条节拍器/倍速 回归 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const SRC = path.resolve(__dirname, '../index.html');
const F = process.env.MUSETAB_URL || 'file://' + SRC;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
    args: ['--autoplay-policy=no-user-gesture-required'] });
  let pass = 0;

  // T1 收件方视角：按导出逻辑在 Node 侧打包注入 → 打开即进观看模式
  const song = { docType:'vocal', title:'小星星·互动测试', author:'测试', key:'C', tempo:100, beats:4, unit:4, capo:0,
    tabVoices:[], voxVoices:['旋律'], lyricsRows:1,
    measures: [0,1].map(()=>({ tabs:[], voxes:[[
      {dur:4,dotted:false,deg:1,acc:'',oct:0,lyrics:['一']},
      {dur:4,dotted:false,deg:1,acc:'',oct:0,lyrics:['闪']},
      {dur:4,dotted:false,deg:5,acc:'',oct:0,lyrics:['一']},
      {dur:4,dotted:false,deg:5,acc:'',oct:0,lyrics:['闪']}]], lyrPad:{} })) };
  let html = fs.readFileSync(SRC, 'utf8');
  const inj = '<script id="pyq-share-data">window.PYQ_SHARE='
    + JSON.stringify({v:1, mode:'viewer', song}).replace(/<\//g, '<\\/') + ';<\/script>\n';
  html = html.replace(/<\/body>/i, inj + '</body>');
  const shared = path.join(__dirname, '_tv_shared.html');
  fs.writeFileSync(shared, html);
  const pg1 = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs1 = []; pg1.on('pageerror', e => errs1.push('PAGEERR:' + e.message));
  await pg1.goto('file://' + shared); await pg1.waitForTimeout(1000);
  await pg1.evaluate(() => { window.SF_PLAYWAIT = false; });   /* v60.34 回归不等在途音色包 */
  const t1 = await pg1.evaluate(() => ({
    viewer: document.body.classList.contains('viewer') && document.body.classList.contains('share'),
    title: song.title, docTitle: document.title,
    topHidden: getComputedStyle(document.getElementById('top')).display === 'none',
    mixerShown: getComputedStyle(document.getElementById('mixer-dock')).display !== 'none',
    home: !!document.getElementById('vh-home'),                     // v55.6 谱库主页图标
    stats: document.querySelectorAll('#viewerbar .vh-stat').length, // 指法/变调夹/拍速
    metro: !!document.getElementById('b-metro'), rate: !!document.getElementById('mx-rate')
  }));
  const ok1 = t1.viewer && t1.title === '小星星·互动测试' && t1.docTitle.includes('互动谱')
    && t1.topHidden && t1.mixerShown && t1.home && t1.stats === 2 && t1.metro && t1.rate;   /* v60.37 头部两枚：变调/拍速 */
  console.log((ok1 ? '✅' : '❌') + ' T1 注入启动进观看模式: viewer=' + t1.viewer + ' 曲名=' + t1.title
    + ' 编辑栏隐藏=' + t1.topHidden + ' 播放条在=' + t1.mixerShown + ' 头部stats=' + t1.stats + ' 谱库链=' + t1.home);
  if (ok1) pass++;

  // T2 观看模式内即时移调不改原始注入数据
  const t2 = await pg1.evaluate(() => {
    const k0 = song.key; vwTranspose(2);
    return { k0, k1: song.key, orig: viewerCtx.pb.data.key, trans: vwTrans };
  });
  const ok2 = t2.k0 === 'C' && t2.k1 === 'D' && t2.orig === 'C' && t2.trans === 2;
  console.log((ok2 ? '✅' : '❌') + ' T2 互动谱移调: C→' + t2.k1 + ' 原始数据保持=' + (t2.orig === 'C'));
  if (ok2) pass++;

  // T7 v54.9 观看模式无编辑光标（分享页曾漏出红色弦位圈/光标列）+ 顶栏动作分组 + viewport 安全区
  const t7 = await pg1.evaluate(() => {
    const h = document.getElementById('score').innerHTML;
    return { blur: blurSel,
      circ: (h.match(/fill-opacity="0\.15"/g) || []).length,       // TAB 弦位光标圈
      curRect: (h.match(/opacity="0\.12"/g) || []).length,         // 光标列高亮
      acts: !!document.querySelector('#viewerbar .vh-icons'),      // v55.6 头部图标组
      vpfit: (document.querySelector('meta[name="viewport"]').content || '').includes('viewport-fit=cover') };
  });
  const ok7 = t7.blur === true && t7.circ === 0 && t7.curRect === 0 && t7.acts && t7.vpfit;
  console.log((ok7 ? '✅' : '❌') + ' T7 观看模式无编辑光标+顶栏acts+viewport-fit: ' + JSON.stringify(t7));
  if (ok7) pass++;

  // T8 v55.6 手机观看页：页首=指法/变调夹/拍速三组数值（点击弹浮层）+ 图标组；
  //    拍速推子/微调改速生效并同步、变调夹 ±品作用观看副本且移调后保留；
  //    底栏=谱架/进度条/倍速/数字速度隐藏、音轨/▦/⚙ 在、一屏放下、⚙ 弹设置（缩放/打印/去制谱）；
  //    kaEl 会话保持起停
  const pg3 = await b.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  await pg3.goto('file://' + shared); await pg3.waitForTimeout(1100);
  await pg3.evaluate(() => { window.SF_PLAYWAIT = false; });   /* v60.34 回归不等在途音色包 */
  const t8 = await pg3.evaluate(() => {
    const disp = id => { const el = document.getElementById(id); return el ? getComputedStyle(el).display : 'missing'; };
    const bar = document.querySelector('#mixer-dock .mx-bar');
    play(); const ka1 = !!(audio.kaEl && !audio.kaEl.paused && audio.kaEl.loop);
    stopPlay(); const ka2 = !!(audio.kaEl && audio.kaEl.paused);
    const popClosed0 = disp('tempo-pop') === 'none';                 // 默认收起
    document.getElementById('vh-tempo').click();
    const popOpen = disp('tempo-pop') === 'flex';                    // 点页首「拍速」弹出
    const sl = document.getElementById('i-tempo-sl');
    sl.value = 132; sl.dispatchEvent(new Event('change'));
    const slTempo = song.tempo === 132 && +document.getElementById('i-tempo').value === 132
      && document.getElementById('vh-tempo-v').textContent === '132';
    document.getElementById('tp-up').click();                        // ＋1 微调
    const nudge = song.tempo === 133 && document.getElementById('i-tempo-sl-v').textContent === '133';
    document.body.click();
    const popClosed1 = disp('tempo-pop') === 'none';                 // 点外部收起
    /* v60.37 变调弹窗（产品指示：头部只留变调/拍速，变调夹融进弹窗且仅吉他类谱显示）。
       本夹具是 vocal：夹区三行必须隐藏；唱调 ♭/♯ 与恢复原调正常。 */
    document.getElementById('vh-key').click();
    const keyPop = disp('key-pop') === 'flex' && disp('tempo-pop') === 'none';     // 互斥
    const capoStatGone = !document.getElementById('vh-capo') && !document.getElementById('capo-pop');
    const capoHidden = [...document.querySelectorAll('#key-pop .kp-capo')]
      .every(rw => getComputedStyle(rw).display === 'none');
    document.getElementById('kp-up').click(); document.getElementById('kp-up').click();
    const key2 = song.key === 'D' && document.getElementById('vh-key-v').textContent === 'D调';
    document.getElementById('kp-reset').click();                     // 恢复原调
    const keyBack = song.key === 'C' && document.getElementById('kp-reset').disabled;
    document.body.click();
    document.getElementById('b-vwset').click();                      // ⚙ 设置面板
    const setOn = !!document.getElementById('vs-print') && !!document.getElementById('vs-make')
      /* v64.6 B8 ② 手机端显示效果改为重排档「标准字号 / 跟练大字」（桌面仍是三档缩放） */
      && document.querySelectorAll('#vs-big button').length === 2 && !!document.getElementById('vs-stand');
    closeModal();
    setMixerExpanded(true);
    const row = document.querySelector('#mx-tracks .mx-row');
    const rowFit = !!row && row.scrollWidth <= row.clientWidth + 1 && row.getBoundingClientRect().width <= 390;
    setMixerExpanded(false);
    return { prog: disp('mx-prog'), rate: disp('mx-rate'), stand: disp('b-stand'), trk: disp('mx-expand'),
      tempo: disp('i-tempo'), vset: disp('b-vwset'), grid: disp('b-mxgrid'), vwStand: disp('vw-stand'),
      popClosed0, popOpen, popClosed1, nudge, keyPop, capoStatGone, capoHidden, key2, keyBack, setOn,
      fit: bar.scrollWidth <= bar.clientWidth + 1, ka1, ka2, slTempo, rowFit };
  });
  /* v60.97 口径更新：谱架钮回归手机底栏（产品指示「谱架功能按钮移到底栏」）——stand 由 none 改为可见 */
  const ok8 = t8.prog === 'none' && t8.rate === 'none' && t8.stand !== 'none' && t8.trk !== 'none'
    && t8.tempo === 'none' && t8.vset !== 'none' && t8.grid !== 'none' && t8.vwStand === 'missing'
    && t8.popClosed0 && t8.popOpen && t8.popClosed1 && t8.nudge
    && t8.keyPop && t8.capoStatGone && t8.capoHidden && t8.key2 && t8.keyBack && t8.setOn
    && t8.fit && t8.ka1 && t8.ka2 && t8.slTempo && t8.rowFit;
  console.log((ok8 ? '✅' : '❌') + ' T8 手机观看页(页首变调/拍速+⚙设置；vocal 无变调夹): ' + JSON.stringify(t8));
  if (ok8) pass++;

  /* T8b v60.37 吉他变调逻辑系统：唱调 ＝ 指法 ＋ 变调夹。
     调夹（−/＋/速选芯片）唱调锁定、指法反向换算；调唱调（♭/♯）夹不动、指法随动；
     恢复原调=唱调与夹一并回发布状态。变异实证（写入时验证）：vwSetCapo 去掉
     vwTranspose(cur-next) 换算 → capoLock 当场红（唱调跟着夹跑）。 */
  const t8b = await pg3.evaluate(() => {
    const s = createSong('guitar', { title: 'g', beats: 4, unit: 4, key: 'G', nMea: 2, nTab: 1, nVox: 1, lyr: 0 });
    s.measures.forEach(m => { m.tabs[0] = [{ dur: 4, dotted: false, chord: 'G', strum: '', notes: [{ s: 5, f: 3 }], tech: '' }]; });
    enterShareViewer({ song: s });
    document.getElementById('vh-key').click();
    const capoShown = [...document.querySelectorAll('#key-pop .kp-capo')]
      .every(rw => getComputedStyle(rw).display !== 'none');
    const chipsN = document.querySelectorAll('#kp-chips .kp-chip').length;   /* v60.40 起 .kp-chip 也用于节拍器弹窗，按容器数 */
    document.getElementById('cp-up').click(); document.getElementById('cp-up').click();   // 夹 2 品
    const hdr = () => document.getElementById('vh-key-v').textContent;
    const capoLock = song.capo === 2 && song.key === 'F' && hdr() === 'G调';   // 唱调锁定，指法换算
    const eqOk = /指法 F/.test(document.getElementById('kp-eq').textContent)
      && /唱 G/.test(document.getElementById('kp-eq').textContent);
    const chipOn = (document.querySelector('.kp-chip.on') || {}).dataset || {};
    document.getElementById('kp-up').click();                                              // 唱调 +1
    const sungUp = song.capo === 2 && hdr() === 'Ab调';                        // 夹不动，唱调走
    document.querySelector('.kp-chip[data-capo="4"]').click();                             // 速选 4 品
    const chip4 = song.capo === 4 && song.key === 'E' && hdr() === 'Ab调';     // 唱调仍锁定
    document.getElementById('kp-reset').click();
    const back = song.capo === 0 && song.key === 'G' && hdr() === 'G调';
    return { capoShown, chipsN, capoLock, eqOk, chipOn: chipOn.capo, sungUp, chip4, back };
  });
  const ok8b = t8b.capoShown && t8b.chipsN === 8 && t8b.capoLock && t8b.eqOk && t8b.chipOn === '2'
    && t8b.sungUp && t8b.chip4 && t8b.back;
  console.log((ok8b ? '✅' : '❌') + ' T8b 吉他变调逻辑系统(唱调=指法+夹·唱调锁定换算·速选·恢复原调): ' + JSON.stringify(t8b));
  if (ok8b) pass++;

  /* T8c v60.39 指法变调重排（产品指示：和弦图与谱面演奏必须匹配）。
     此前指法变调=逐品平移+折八度：图是新调标准指法、谱面却是平移把位，图与演奏不匹配。
     现在：伴奏列随新和弦图取形（弦集不同按低→高 rank 映射——G 六弦满扫→D 四弦满扫）；
     旋律列走 v60.25 束搜索指派器重排把位、音高精确 +delta；
     经典夹用法（唱+2 且 夹+2，净 vwTrans=0）从原始数据重建→原指法零损。
     突变实证：对 v60.38 旧文件（逐品平移）跑本条当场红（strum 列不等于 D 图）。 */
  const t8c = await pg3.evaluate(() => {
    const mkShapeCol = (name, strum) => { const sh = chordShape(name), notes = [];
      for (let s2 = 1; s2 <= 6; s2++) { const f = shapeString(sh, s2); if (f != null) notes.push({ s: s2, f }); }
      return { dur: 4, dotted: false, chord: '', strum: strum || 'd', notes, tech: '' }; };
    const s = createSong('guitar', { title: 'rf', beats: 4, unit: 4, key: 'G', nMea: 2, nTab: 1, nVox: 1, lyr: 0 });
    s.measures[0].tabs[0] = [0,1,2,3].map(i => { const c = mkShapeCol('G'); if (i === 0) c.chord = 'G'; return c; });
    s.measures[1].tabs[0] = [ {dur:4,dotted:false,chord:'',strum:'',notes:[{s:3,f:0}],tech:''},
      {dur:4,dotted:false,chord:'',strum:'',notes:[{s:3,f:2}],tech:''},
      {dur:4,dotted:false,chord:'',strum:'',notes:[{s:2,f:0}],tech:''},
      {dur:4,dotted:false,chord:'',strum:'',notes:[{s:2,f:1}],tech:''} ];
    const tun = tuningOf();
    const orig = JSON.parse(JSON.stringify(s));
    const origMel = orig.measures[1].tabs[0].map(c => tun[c.notes[0].s-1]+c.notes[0].f);
    enterShareViewer({ song: JSON.parse(JSON.stringify(s)) });
    vwTranspose(-5);                                        // 指法 G→D
    const dSh = chordShape('D');
    const strumFollow = song.measures[0].tabs[0].every(c =>
      c.notes.length === 4 && c.notes.every(n => shapeString(dSh, n.s) === n.f));
    const melExact = song.measures[1].tabs[0].every((c,i) =>
      tun[c.notes[0].s-1]+c.notes[0].f === origMel[i] - 5);
    const st = window.VW_REFING || {};
    const clean = !st.dropped && !st.octShift;
    vwTranspose(5);                                          // 回原调
    document.getElementById('kp-up').click(); document.getElementById('kp-up').click();   // 唱+2
    document.getElementById('cp-up').click(); document.getElementById('cp-up').click();   // 夹+2 → 指法回 G
    const capoKeeps = vwTrans === 0 && song.capo === 2 &&
      song.measures[0].tabs[0].every((c,ci) => c.notes.every((n,k) => {
        const o = orig.measures[0].tabs[0][ci].notes[k]; return o && n.s === o.s && n.f === o.f; })) &&
      song.measures[1].tabs[0].every((c,ci) => {
        const o = orig.measures[1].tabs[0][ci].notes[0]; return c.notes[0].s === o.s && c.notes[0].f === o.f; });
    return { strumFollow, melExact, clean, capoKeeps };
  });
  const ok8c = t8c.strumFollow && t8c.melExact && t8c.clean && t8c.capoKeeps;
  console.log((ok8c ? '✅' : '❌') + ' T8c 指法变调重排(伴奏随图取形·旋律精确移调·夹用法原指法零损): ' + JSON.stringify(t8c));
  if (ok8c) pass++;
  await pg3.close();

  // T3 倍速：0.5× 总时长应为 1× 的 2 倍（只作用于播放调度）
  const t3 = await pg1.evaluate(() => {
    playRate = 1; metroOn = false; play(); const d1 = audio.prog.dur; stopPlay();
    playRate = 0.5; play(); const d05 = audio.prog.dur; stopPlay(); playRate = 1;
    return { d1, d05, tempo: song.tempo };
  });
  const ok3 = t3.d1 > 0 && Math.abs(t3.d05 / t3.d1 - 2) < 0.01 && t3.tempo === 100;
  console.log((ok3 ? '✅' : '❌') + ' T3 倍速调度: 1×=' + t3.d1.toFixed(2) + 's 0.5×=' + t3.d05.toFixed(2)
    + 's 比值=' + (t3.d05 / t3.d1).toFixed(2) + ' 谱面速度不变=' + (t3.tempo === 100));
  if (ok3) pass++;

  // T4 节拍器：开启后调度出额外拍点声源（2 小节 4/4 → +16 个源：每拍振荡器+噪声）
  const t4 = await pg1.evaluate(() => {
    metroOn = false; play(); const n0 = audio.sources.length; stopPlay();
    metroOn = true; play(); const n1 = audio.sources.length; stopPlay(); metroOn = false;
    return { n0, n1 };
  });
  const ok4 = t4.n1 - t4.n0 === 16;
  console.log((ok4 ? '✅' : '❌') + ' T4 节拍器调度: 关=' + t4.n0 + '源 开=' + t4.n1 + '源 增量=' + (t4.n1 - t4.n0) + '（期望16）');
  if (ok4) pass++;
  await pg1.close();

  // T5 编辑器侧导出：自打包 HTML 含注入数据（file:// 下 fetch 被拦 → 走 DOM 快照兜底）
  const pg2 = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs2 = []; pg2.on('pageerror', e => errs2.push('PAGEERR:' + e.message));
  await pg2.goto(F); await pg2.waitForTimeout(900);
  await pg2.evaluate(() => { window.guardReplace = (p) => p(); window.SF_PLAYWAIT = false; });   // v41.5 测试直通确认对话
  const t5 = await pg2.evaluate(async () => {
    loadSong(PRESETS[0].make());
    let captured = null;
    const oldC = URL.createObjectURL, oldClick = HTMLAnchorElement.prototype.click;
    URL.createObjectURL = b2 => { captured = b2; return 'blob:test'; };
    HTMLAnchorElement.prototype.click = function(){};
    try { await exportInteractiveCard(); } finally {
      URL.createObjectURL = oldC; HTMLAnchorElement.prototype.click = oldClick;
    }
    if (!captured) return { ok: false };
    const txt = await captured.text();
    /* 真实注入块以 `={` 开头（源码中的同名字符串字面量后跟引号，不会误匹配） */
    const re = /<script id="pyq-share-data">window\.PYQ_SHARE=(\{[\s\S]*?\});<\/scr/g;
    const hits = txt.match(re) || [];
    const m = /<script id="pyq-share-data">window\.PYQ_SHARE=(\{[\s\S]*?\});<\/scr/.exec(txt);
    let parsed = null; try { parsed = JSON.parse(m[1].replace(/<\\\//g, '</')); } catch(_) {}
    return { ok: true, size: txt.length, doctype: /^<!DOCTYPE html>/i.test(txt.trim()),
      tag: txt.includes('pyq-share-data'), once: hits.length === 1,
      appIntact: txt.includes('function exportInteractiveCard') && txt.includes('function enterShareViewer'),
      title: parsed && parsed.song && parsed.song.title, mea: parsed && parsed.song.measures.length };
  });
  const ok5 = t5.ok && t5.size > 500000 && t5.doctype && t5.tag && t5.once && t5.appIntact && !!t5.title && t5.mea > 0;
  console.log((ok5 ? '✅' : '❌') + ' T5 导出自打包: 大小=' + Math.round((t5.size||0)/1024) + 'KB doctype=' + t5.doctype
    + ' 注入唯一=' + t5.once + ' 应用完整=' + t5.appIntact + ' 曲名=' + t5.title + ' 小节=' + t5.mea);
  if (ok5) pass++;

  // T6 导出弹窗双模式入口 + 节拍器弹窗（v60.40 产品指示：点击=打开设置弹窗，拍点开关移入弹窗）
  const t6 = await pg2.evaluate(() => {
    document.getElementById('b-print').click();
    const dual = !!document.getElementById('ex-card') && !!document.getElementById('ex-icard');
    document.getElementById('ex-cancel').click();
    document.getElementById('b-metro').click();
    const popped = document.getElementById('metro-pop').classList.contains('on');
    document.getElementById('mp-on').click();
    const on = metroOn && document.getElementById('b-metro').classList.contains('on')
      && document.getElementById('mp-on').classList.contains('on');
    document.getElementById('mp-on').click();
    const off = !metroOn && !document.getElementById('b-metro').classList.contains('on');
    document.getElementById('b-metro').click();   // 再点按钮：收起弹窗
    const closed = !document.getElementById('metro-pop').classList.contains('on');
    return { dual, popped, on, off, closed };
  });
  const ok6 = t6.dual && t6.popped && t6.on && t6.off && t6.closed;
  console.log((ok6 ? '✅' : '❌') + ' T6 双模式入口/节拍器弹窗开关: ' + JSON.stringify(t6));
  if (ok6) pass++;
  await pg2.close();

  fs.unlinkSync(shared);
  const errs = errs1.concat(errs2);
  console.log('PASS ' + pass + '/10');
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === 10 && !errs.length ? 0 : 1);
})();
