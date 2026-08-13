/* tv_mix — v56.5 混音播放回归：S/M/音量即时生效（轨道总线增益）+ 播放光标参考轨
   （整谱模式贯穿系统 / 单轨 SOLO 跟随该轨）。结构断言为主：不依赖真实出声——
   headless 下 AudioContext 可挂起，断言增益值/事件时间轴/播放头几何，不断言波形。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');

let pass = 0, fail = 0, errs = [];
const T = (ok, name, detail) => {
  if (ok) { pass++; console.log('✅ ' + name + (detail ? ': ' + detail : '')); }
  else { fail++; console.log('❌ ' + name + (detail ? ': ' + detail : '')); }
};

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const pg = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  pg.on('pageerror', e => errs.push(String(e.message)));
  await pg.goto(FILE); await pg.waitForTimeout(900);

  const mk = () => pg.evaluate(() => {
    window.guardReplace = p => p();
    const s = createSong('tanchang', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 0 });
    for (let mi = 0; mi < 2; mi++) {
      s.measures[mi].tabs[0].forEach((c, k) => { if (k % 2 === 0) c.notes = [{ s: 3, f: 0 }]; });
      s.measures[mi].voxes[0].forEach((c, k) => { if (k % 2 === 0) c.deg = 1 + (k % 5); });
    }
    loadSong(s); blurSel = true; render();
  });

  // T1 整谱模式：默认（无 SOLO）起播——事件参考 tab0、whole=true；双轨总线增益=1
  await mk();
  let r = await pg.evaluate(() => {
    play();
    const ev0 = audio.events[0] || {};
    const out = {
      n: audio.events.length, pre: ev0.pre, whole: !!ev0.whole,
      keys: Object.keys(audio.tracks || {}).sort().join(','),
      gT: audio.tracks['tab:0'] ? audio.tracks['tab:0'].dry.gain.value : -1,
      gV: audio.tracks['vox:0'] ? audio.tracks['vox:0'].dry.gain.value : -1,
    };
    stopPlay(); return out;
  });
  T(r.n > 0 && r.pre === 't0' && r.whole && r.keys === 'tab:0,vox:0' && r.gT === 1 && r.gV === 1,
    'T1 整谱模式：事件挂 tab0 + whole + 双轨增益1', JSON.stringify(r));

  // T2 静音吉他轨起播：tab 总线增益=0（简谱轨=1），但光标事件仍在（此前光标整个消失）
  r = await pg.evaluate(() => {
    trackCfg('tab', 0).on = false;
    play();
    const out = { n: audio.events.length, pre: (audio.events[0] || {}).pre,
      gT: audio.tracks['tab:0'].dry.gain.value, gV: audio.tracks['vox:0'].dry.gain.value };
    stopPlay(); trackCfg('tab', 0).on = true; return out;
  });
  T(r.n > 0 && r.pre === 't0' && r.gT === 0 && r.gV === 1,
    'T2 静音吉他轨：增益0但光标事件保留', JSON.stringify(r));

  // T3 SOLO 简谱轨起播：光标切到 v0 单轨模式（whole=false）；吉他总线增益=0
  r = await pg.evaluate(() => {
    trackCfg('vox', 0).solo = true;
    play();
    const ev0 = audio.events[0] || {};
    const out = { pre: ev0.pre, whole: !!ev0.whole,
      gT: audio.tracks['tab:0'].dry.gain.value, gV: audio.tracks['vox:0'].dry.gain.value };
    stopPlay(); trackCfg('vox', 0).solo = false; return out;
  });
  T(r.pre === 'v0' && !r.whole && r.gT === 0 && r.gV === 1,
    'T3 SOLO简谱轨：光标单轨v0 + 吉他增益0', JSON.stringify(r));

  // T4 播放中切 SOLO：applyMixLive 重建事件（t0整谱→v0单轨）+ setTargetAtTime 收敛增益
  r = await pg.evaluate(() => {
    const calls = [];
    const orig = AudioParam.prototype.setTargetAtTime;
    AudioParam.prototype.setTargetAtTime = function (v, at, tc) { calls.push(+v.toFixed(3)); return orig.call(this, v, at, tc); };
    play();
    const before = { pre: (audio.events[0] || {}).pre, whole: !!(audio.events[0] || {}).whole };
    trackCfg('vox', 0).solo = true;
    applyMixLive();
    const after = { pre: (audio.events[0] || {}).pre, whole: !!(audio.events[0] || {}).whole,
      idxOk: audio.evIdx >= 0 && audio.evIdx < audio.events.length };
    AudioParam.prototype.setTargetAtTime = orig;
    stopPlay(); trackCfg('vox', 0).solo = false;
    return { before, after, calls };
  });
  T(r.before.pre === 't0' && r.before.whole && r.after.pre === 'v0' && !r.after.whole && r.after.idxOk
    && r.calls.includes(0) && r.calls.includes(1),
    'T4 播放中切SOLO：光标轨即时重建+增益0/1收敛', JSON.stringify(r));

  // T5 播放头几何：整谱模式 playhead 罩本小节所在系统整带（meaBands）；单轨模式只罩该轨列盒
  r = await pg.evaluate(() => {
    const ph = document.getElementById('playhead');
    highlight('t0', 0, 1, true);
    const whole = { y: +ph.getAttribute('y'), h: +ph.getAttribute('height') };
    highlight('t0', 0, 1, false);
    const solo = { y: +ph.getAttribute('y'), h: +ph.getAttribute('height') };
    const band = meaBands[0], box = colBoxes['t0:0:1'];
    return { whole, solo, band: { y: band.y, h: band.h }, box: { y: box.y, h: box.h } };
  });
  T(r.whole.y === r.band.y && r.whole.h === r.band.h && r.solo.y === r.box.y && r.solo.h === r.box.h
    && r.band.h > r.box.h,
    'T5 播放头几何：整谱=系统整带/单轨=列盒', JSON.stringify(r));

  // T6 音量即时生效：播放中拖音量 → setTargetAtTime 收到新值
  r = await pg.evaluate(() => {
    const calls = [];
    const orig = AudioParam.prototype.setTargetAtTime;
    AudioParam.prototype.setTargetAtTime = function (v, at, tc) { calls.push(+v.toFixed(3)); return orig.call(this, v, at, tc); };
    play();
    trackCfg('vox', 0).vol = 0.5;
    applyMixLive();
    AudioParam.prototype.setTargetAtTime = orig;
    stopPlay(); trackCfg('vox', 0).vol = 1;
    return { calls, has05: calls.includes(0.5) };
  });
  T(r.has05, 'T6 播放中拖音量：总线增益收敛到0.5', JSON.stringify(r));

  // T7 停止清理：stopPlay 后 tracks/evCtx 置空，二次 play 不受残留影响
  r = await pg.evaluate(() => {
    play(); stopPlay();
    const clean = audio.tracks === null && audio.evCtx === null;
    play();
    const ok2 = Object.keys(audio.tracks || {}).length === 2 && audio.events.length > 0;
    stopPlay();
    return { clean, ok2 };
  });
  T(r.clean && r.ok2, 'T7 stopPlay清理+二次播放正常', JSON.stringify(r));

  await browser.close();
  console.log('PASS ' + pass + '/' + (pass + fail));
  console.log(errs.length ? ('ERRORS: ' + errs.join(' | ')) : 'NO ERRORS');
  process.exit(fail || errs.length ? 1 : 0);
})();
