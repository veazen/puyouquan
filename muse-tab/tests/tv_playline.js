/* v60.93 播放样式改版（产品指示：参考出版播放器）：
   - 播放中的小节整块变色：#playhead 色块从「列」放大为整小节（meaBoxes 横向盒），y/h 口径不变
   - 行进改由 #playline 竖线表达：rAF 逐帧插值平滑移动、播放中可见、停播隐藏 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 元素与几何：#playline 存在且初始隐藏；highlight 后色块罩整小节（meaBoxes），y/h 仍按整带
  // （try/catch：旧版文件没有 meaBoxes，突变复跑显示红而不是崩溃）
  let r = await pg.evaluate(() => { try {
    const V = (deg, dur) => ({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false });
    const s = createSong('tanchang', { title: 'pl1', beats: 4, unit: 4, key: 'C', nMea: 3, nTab: 1, nVox: 1, lyr: 0 });
    for (let mi = 0; mi < 3; mi++) s.measures[mi].voxes[0] = [V(1, 4), V(2, 4), V(3, 4), V(5, 4)];
    loadSong(s); blurSel = true; render();
    const pl = document.getElementById('playline'), ph = document.getElementById('playhead');
    const off = pl && pl.getAttribute('opacity') === '0';
    highlight('t0', 1, 1, true);
    const mb = meaBoxes[1], band = meaBands[1], box = colBoxes['t0:1:1'];
    const g = { x: +ph.getAttribute('x'), w: +ph.getAttribute('width'), y: +ph.getAttribute('y'), h: +ph.getAttribute('height') };
    return { hasPl: !!pl, off, meaX: g.x === mb.x && g.w === mb.w, bandY: g.y === band.y && g.h === band.h,
      wider: mb.w > box.w + 10 };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.hasPl && r.off && r.meaX && r.bandY && r.wider, 'T1 竖线存在+色块罩整小节（宽于列盒）', JSON.stringify(r));

  // T2 播放中竖线平滑前进：假时钟驱动 startProgress 的真实帧逻辑（确定性——
  //    CI 无声环境下 AudioContext 时钟不走、真实 play() 不可靠，v60.93/94 两次 CI 均折在这里）；
  //    两次采样 x 单调增、可见；停播后隐藏
  r = await pg.evaluate(async () => { try {
    const wait = (ms) => new Promise(z => setTimeout(z, ms));
    // 手工搭光标时间轴：spb=0.5s/拍，走 buildPlayEvents 真实管线
    audio.playing = true; audio.paused = false;
    audio.ctx = { currentTime: 0.05 };            // 假时钟（tick 每帧读 currentTime）
    const order = song.measures.map((_, i) => i);
    const starts = order.map(i => i * 4 * 0.5);
    audio.evCtx = { order, starts, spb: 0.5 };
    audio.events = buildPlayEvents(); audio.evIdx = 0;
    startProgress(0, starts.length * 2, order, starts);
    await wait(150);
    const pl = document.getElementById('playline');
    const x1 = +pl.getAttribute('x1'), op1 = pl.getAttribute('opacity');
    audio.ctx.currentTime = 1.3;                  // 拨快到第 1 小节第 3 拍中段
    await wait(150);
    const x2 = +pl.getAttribute('x1');
    const ph = document.getElementById('playhead');
    const tintOn = +ph.getAttribute('opacity') > 0;
    stopPlay();
    const opOff = document.getElementById('playline').getAttribute('opacity') === '0'
      && document.getElementById('playhead').getAttribute('opacity') === '0';
    return { x1: +x1.toFixed(1), x2: +x2.toFixed(1), moved: x2 > x1 + 3, op1, tintOn, opOff, nEv: audio.events ? 0 : 0 };
  } catch (e) { try { stopPlay(); } catch (_) {} return { err: String(e && e.message || e) }; } });
  T(r.moved && r.op1 === '0.9' && r.tintOn && r.opOff, 'T2 竖线播放中平滑前进、停播隐藏（假时钟）', JSON.stringify(r));

  // T3 单轨 SOLO：色块仍罩整小节宽、但只罩该轨行高（y/h=列盒，tv_mix T5 口径）
  r = await pg.evaluate(() => { try {
    highlight('v0', 2, 0, false);
    const ph = document.getElementById('playhead');
    const mb = meaBoxes[2], box = colBoxes['v0:2:0'];
    return { x: +ph.getAttribute('x') === mb.x, w: +ph.getAttribute('width') === mb.w,
      y: +ph.getAttribute('y') === box.y, h: +ph.getAttribute('height') === box.h };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.x && r.w && r.y && r.h, 'T3 SOLO 模式：整小节宽 × 单轨行高', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
