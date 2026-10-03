/* tv_playperf —— v60.33 播放性能修复回归（用户报告「播放很卡很多杂音」）
   实测根因：启动时不建 AudioContext → 内嵌采样零解码 → 首次播放整曲一次性排程
   逐音命中不了采样、全部落 KS 合成（32 小节扫弦谱实测 2304 次合成、主线程冻结 2.2s）。
   修复三件：① sfEmbedInit 启动即建 suspended ctx 预解码内嵌采样；
   ② ksBufferCached 同音高同时长桶复用 AudioBuffer（合成回落时不再逐音跑十万级环路）；
   ③ makeImpulse IR 缓存（每次建总线不再重算 1.8s 双声道噪声）。
   修后同谱实测：首播冻结 304ms、KS 合成 0 次。
   断言口径给 CI 慢机留余量（阻塞预算 1200ms，抓的是 2000ms 级回归不是 50ms 抖动）。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
    args: ['--autoplay-policy=no-user-gesture-required'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F);
  await pg.evaluate(() => { window.SF_PLAYWAIT = false; });   /* 其它用例不等在途包（T8 单独开） */
  await pg.waitForTimeout(2500);   // 等启动预解码（真实用户打开→按播放也有间隔）
  let pass = 0, total = 0; const T = (ok, n, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + n + (d ? ': ' + d : '')); };

  /* T1 启动预解码：四个内嵌音色库在「没点过播放」的情况下就已有解码好的 buffer */
  let r = await pg.evaluate(() => {
    const out = {};
    for (const name in SF_EMBED) {
      const bk = sfBanks[name];
      out[name] = bk ? Object.keys(bk.buf || {}).filter(k => k[0] !== 'p' && bk.buf[k]).length : -1;
    }
    return out;
  });
  T(Object.values(r).length === 4 && Object.values(r).every(n => n >= 8),
    'T1 启动即预解码内嵌采样（无手势 suspended ctx）', JSON.stringify(r));

  /* T2+T4 首播命中采样 + 阻塞预算：32 小节扫弦重负载 */
  r = await pg.evaluate(async () => {
    window.guardReplace = p => p();
    loadSong(createSong('guitar', { title: 'pf', beats: 4, unit: 4, key: 'C', nMea: 32, nTab: 1, nVox: 1, lyr: 0 }));
    mutate(() => {
      song.measures.forEach(m => {
        m.tabs[0] = Array.from({ length: 8 }, (_, i) => ({ dur: 8, dotted: false, chord: i === 0 ? 'C' : '', strum: i % 2 ? 'u' : 'd',
          notes: [{ s: 5, f: 3 }, { s: 4, f: 2 }, { s: 3, f: 0 }, { s: 2, f: 1 }, { s: 1, f: 0 }], tech: '' }));
        m.voxes[0] = [1, 2, 3, 5].map(d => ({ dur: 4, dotted: false, deg: d, acc: '', oct: 0, lyrics: [], tie: false }));
      });
    });
    /* 钉住 bank 状态：CI runner 有外网，hifiPreload 会真去拉全量包 → v60.34 的
       「播放前等待在途包」会让 play() 先延后——本测只测排程性能，标记 full 跳过加载 */
    for (const n in sfBanks) { sfBanks[n].full = true; sfBanks[n].loading = false; }
    let ksN = 0;
    const _ks = ksBuffer;
    window.ksBuffer = function (...a) { ksN++; return _ks.apply(this, a); };
    const t0 = performance.now(); play(); const block = performance.now() - t0;
    await new Promise(res => setTimeout(res, 400)); stopPlay();
    window.ksBuffer = _ks;
    return { ksN, block: +block.toFixed(0) };
  });
  T(r.ksN === 0, 'T2 首播整曲命中采样（KS 合成 0 次）', JSON.stringify(r));
  T(r.block < 1200, 'T4 首播主线程阻塞预算（<1200ms；修复前 2171ms）', 'block=' + r.block + 'ms');

  /* T3 KS 缓存：强制合成回落（hifi 关）连播两次，第二次全部命中缓存 */
  r = await pg.evaluate(async () => {
    hifiOn = false;
    let ksN = 0;
    const _ks = ksBuffer;
    window.ksBuffer = function (...a) { ksN++; return _ks.apply(this, a); };
    play(); await new Promise(res => setTimeout(res, 300)); stopPlay();
    const first = ksN; ksN = 0;
    play(); await new Promise(res => setTimeout(res, 200)); stopPlay();
    const second = ksN;
    window.ksBuffer = _ks; hifiOn = true;
    return { first, second };
  });
  T(r.second === 0 && r.first > 0 && r.first < 200,
    'T3 KS 缓冲缓存（合成回落首播仅算唯一音高，二播全命中）', JSON.stringify(r));

  /* T5 IR 缓存：再建两条总线，makeImpulseRaw 不再被调用 */
  r = await pg.evaluate(() => {
    let raw = 0;
    const _mr = makeImpulseRaw;
    window.makeImpulseRaw = function (...a) { raw++; return _mr.apply(this, a); };
    buildBus(audio.ctx); buildBus(audio.ctx);
    window.makeImpulseRaw = _mr;
    return { raw };
  });
  T(r.raw === 0, 'T5 混响脉冲缓存（重建总线零重算）', JSON.stringify(r));

  /* v60.34 ctx 不再被误杀：suspended ctx 手势 resume 保留同一实例（解码好的采样
     与在途解码全部存活）；不再出现「Cannot resume a context that has been closed」 */
  r = await pg.evaluate(() => {
    const before = audio.ctx;
    const a = ensureLiveCtx(); const b2 = ensureLiveCtx();
    return { same: a === b2 && a === before && a === audio.ctx, state: a.state };
  });
  T(r.same, 'T7 ensureLiveCtx 保留同一 ctx（suspended 不重建）', JSON.stringify(r));
  T(!errs.some(e => /resume a context/.test(e)), 'T7b 无「resume closed context」报错', errs.join('|') || 'none');

  /* v60.34 播放前等待在途音色包：loading 中 play() 延后不排程；包就绪后自动开播 */
  r = await pg.evaluate(async () => {
    window.SF_PLAYWAIT = true;   // 本条测的就是等待本身
    /* v63.2 先把其余音色包全部钉成就绪：CI 有外网，曲谱用到的别的包（如人声轨的钢琴）可能真在下载，
       play() 会一直等到 2.8s 上限——本条只测「这一个包」的等待与就绪开播（v63.1 CI 偶发红） */
    for (const n in sfBanks) { sfBanks[n].loading = false; sfBanks[n].full = true; }
    const bk = sfBanks['acoustic_guitar_steel'];
    bk.full = false; bk.loading = true;
    play();
    const deferred = !audio.playing;
    await new Promise(res => setTimeout(res, 400));
    const stillWaiting = !audio.playing;
    bk.loading = false; bk.full = true;
    await new Promise(res => setTimeout(res, 400));
    const started = audio.playing;
    stopPlay(); window.SF_PLAYWAIT = false;
    return { deferred, stillWaiting, started };
  });
  T(r.deferred && r.stillWaiting && r.started, 'T8 播放等待在途音色包，就绪即自动开播', JSON.stringify(r));

  /* v60.35 分窗排程：整曲一次性排程会把全部音符节点挂上音频图（负载随总音符数近乎
     平方增长，32 小节谱实测 0.86× 实时→持续欠载=杂音+卡顿）。长曲 play() 只建
     2 秒窗口内节点、泵滚动补图、停播清队列；每个源挂放完拆链钩（reapOnEnd）。
     突变实证：对 v60.34 旧文件跑本组断言当场红（无 schedQ/无 onended/无 _comp 拆除）。 */
  r = await pg.evaluate(async () => {
    /* 拆链口径＝每个音符注册一个收割钩（reapOnEnd；钢琴等多源音色共用一个），
       断言 spy 调用数而非逐源 onended */
    let reapN = 0;
    const _reap = reapOnEnd;
    window.reapOnEnd = (...a) => { reapN++; return _reap(...a); };
    play();                                  // 当前谱仍是 T2 的 32 小节扫弦谱（1152 音）
    const winSrcs = audio.sources.length;
    const qTotal = audio.schedQ ? audio.schedQ.q.length : -1;
    await new Promise(res => setTimeout(res, 600));
    const grew = audio.sources.length > winSrcs;
    stopPlay();
    window.reapOnEnd = _reap;
    const cleared = !audio.schedQ;
    return { winSrcs, qTotal, reapN, grew, cleared };
  });
  T(r.qTotal > 800 && r.winSrcs > 0 && r.winSrcs < 300, 'T9 分窗排程（长曲只建窗口内节点，图与曲长解耦）', JSON.stringify(r));
  T(r.reapN > 20 && r.grew && r.cleared, 'T9b 放完拆链钩逐音注册 + 泵滚动补图 + 停播清队列', JSON.stringify(r));

  /* v60.35 停播整套拆除总线图：每次播放新建的「母线+压缩器+卷积混响」若不拆，
     反复播放会在图上累积 N 个永驻卷积器（会话内越播越卡）。压缩器是整图接触
     destination 的唯一节点，断它即全图脱离。 */
  r = await pg.evaluate(async () => {
    play();
    const comp = audio.bus && audio.bus._comp;
    let disc = 0;
    if (comp) { const d0 = comp.disconnect.bind(comp); comp.disconnect = (...a) => { disc++; return d0(...a); }; }
    await new Promise(res => setTimeout(res, 100));
    stopPlay();
    await new Promise(res => setTimeout(res, 80));
    return { hasComp: !!comp, disc };
  });
  T(r.hasComp && r.disc > 0, 'T10 停播整套拆除总线图（_comp 断开，反复播放不累积卷积器）', JSON.stringify(r));

  T(errs.length === 0, 'T6 无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
