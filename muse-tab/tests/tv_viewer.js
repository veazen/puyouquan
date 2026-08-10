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
  const t1 = await pg1.evaluate(() => ({
    viewer: document.body.classList.contains('viewer') && document.body.classList.contains('share'),
    title: song.title, docTitle: document.title,
    topHidden: getComputedStyle(document.getElementById('top')).display === 'none',
    mixerShown: getComputedStyle(document.getElementById('mixer-dock')).display !== 'none',
    brand: !!document.querySelector('#viewerbar .vw-brand'),
    stand: !!document.getElementById('vw-stand'),
    metro: !!document.getElementById('b-metro'), rate: !!document.getElementById('mx-rate')
  }));
  const ok1 = t1.viewer && t1.title === '小星星·互动测试' && t1.docTitle.includes('互动谱')
    && t1.topHidden && t1.mixerShown && t1.brand && t1.stand && t1.metro && t1.rate;
  console.log((ok1 ? '✅' : '❌') + ' T1 注入启动进观看模式: viewer=' + t1.viewer + ' 曲名=' + t1.title
    + ' 编辑栏隐藏=' + t1.topHidden + ' 播放条在=' + t1.mixerShown + ' 品牌链=' + t1.brand);
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
      acts: !!document.querySelector('#viewerbar .vw-acts'),
      vpfit: (document.querySelector('meta[name="viewport"]').content || '').includes('viewport-fit=cover') };
  });
  const ok7 = t7.blur === true && t7.circ === 0 && t7.curRect === 0 && t7.acts && t7.vpfit;
  console.log((ok7 ? '✅' : '❌') + ' T7 观看模式无编辑光标+顶栏acts+viewport-fit: ' + JSON.stringify(t7));
  if (ok7) pass++;

  // T8 v55.5 手机观看页播放条：谱架/小节进度条/倍速/数字速度输入隐藏、♩=BPM 紧凑按钮可见、
  //    点按钮弹出推子浮层（默认收起、点外部收起）、推子/微调改速生效并同步各读数、
  //    音轨保留（面板行不超宽）、▦ 保留、播放条一屏放下；kaEl 会话保持起停
  const pg3 = await b.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  await pg3.goto('file://' + shared); await pg3.waitForTimeout(1100);
  const t8 = await pg3.evaluate(() => {
    const disp = id => { const el = document.getElementById(id); return el ? getComputedStyle(el).display : 'missing'; };
    const bar = document.querySelector('#mixer-dock .mx-bar');
    play(); const ka1 = !!(audio.kaEl && !audio.kaEl.paused && audio.kaEl.loop);
    stopPlay(); const ka2 = !!(audio.kaEl && audio.kaEl.paused);
    const popClosed0 = disp('tempo-pop') === 'none';                 // 默认收起
    document.getElementById('b-tempo').click();
    const popOpen = disp('tempo-pop') === 'flex';                    // 点 ♩=BPM 弹出
    const sl = document.getElementById('i-tempo-sl');
    sl.value = 132; sl.dispatchEvent(new Event('change'));
    const slTempo = song.tempo === 132 && +document.getElementById('i-tempo').value === 132
      && document.getElementById('b-tempo-v').textContent === '132';
    document.getElementById('tp-up').click();                        // ＋1 微调
    const nudge = song.tempo === 133 && document.getElementById('i-tempo-sl-v').textContent === '133';
    document.body.click();
    const popClosed1 = disp('tempo-pop') === 'none';                 // 点外部收起
    setMixerExpanded(true);
    const row = document.querySelector('#mx-tracks .mx-row');
    const rowFit = !!row && row.scrollWidth <= row.clientWidth + 1 && row.getBoundingClientRect().width <= 390;
    setMixerExpanded(false);
    return { prog: disp('mx-prog'), rate: disp('mx-rate'), stand: disp('b-stand'), trk: disp('mx-expand'),
      tempo: disp('i-tempo'), bt: disp('b-tempo'), grid: disp('b-mxgrid'), vwStand: disp('vw-stand'),
      popClosed0, popOpen, popClosed1, nudge,
      fit: bar.scrollWidth <= bar.clientWidth + 1, ka1, ka2, slTempo, rowFit };
  });
  const ok8 = t8.prog === 'none' && t8.rate === 'none' && t8.stand === 'none' && t8.trk !== 'none'
    && t8.tempo === 'none' && t8.bt !== 'none' && t8.grid !== 'none' && t8.vwStand === 'none'
    && t8.popClosed0 && t8.popOpen && t8.popClosed1 && t8.nudge
    && t8.fit && t8.ka1 && t8.ka2 && t8.slTempo && t8.rowFit;
  console.log((ok8 ? '✅' : '❌') + ' T8 手机观看页播放条(♩=BPM弹出推子): ' + JSON.stringify(t8));
  if (ok8) pass++;
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
  await pg2.evaluate(() => { window.guardReplace = (p) => p(); });   // v41.5 测试直通确认对话
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

  // T6 导出弹窗双模式入口 + 播放条节拍器按钮态
  const t6 = await pg2.evaluate(() => {
    document.getElementById('b-print').click();
    const dual = !!document.getElementById('ex-card') && !!document.getElementById('ex-icard');
    document.getElementById('ex-cancel').click();
    document.getElementById('b-metro').click();
    const on = metroOn && document.getElementById('b-metro').classList.contains('on');
    document.getElementById('b-metro').click();
    const off = !metroOn && !document.getElementById('b-metro').classList.contains('on');
    return { dual, on, off };
  });
  const ok6 = t6.dual && t6.on && t6.off;
  console.log((ok6 ? '✅' : '❌') + ' T6 双模式入口/节拍器开关: 双按钮=' + t6.dual + ' 开态=' + t6.on + ' 关态=' + t6.off);
  if (ok6) pass++;
  await pg2.close();

  fs.unlinkSync(shared);
  const errs = errs1.concat(errs2);
  console.log('PASS ' + pass + '/8');
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === 8 && !errs.length ? 0 : 1);
})();
