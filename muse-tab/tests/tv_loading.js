/* v61.4 LOADING 动画（产品指示：曲谱打开中 / 音色加载中，美观精致）回归：
   T1 启动遮罩：深链 ?pub= 文案「曲谱加载中…」、五线谱 5 线 + 3 音符起伏动画、
      呼吸文字、遮罩完全不透明（fetch 挂起期间盖住编辑器外壳）、8s 兜底自拆脚本在位
   T2 音色加载胶囊：播放触发但采样包未就绪 → #audio-loading 浮出（4 根均衡条动画）；
      全部 bank 就绪（full）→ 自动开播、胶囊自隐
   T3 等待期按停止：胶囊收起 + sfWaitFrom 归零（v61.4 顺手修：此前残留旧起点，
      手动停止后再播被判「已超时」直接跳过音色等待）
   T4 prefers-reduced-motion：音符/均衡条动画降级停用
   对 v61.3 旧文件跑：.bv-staff 与 #audio-loading 不存在 → 全红（突变实证）。 */
const { chromium } = require('playwright');
const path = require('path');
const F = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const errs = [];

  // T1 启动遮罩（route 挂起 /api/ 模拟网络在途）
  const pg1 = await b.newPage({ viewport: { width: 1280, height: 800 } });
  pg1.on('pageerror', e => errs.push('P1:' + e.message));
  await pg1.route('**/api/**', async route => { await new Promise(z => setTimeout(z, 4000)); try{ route.abort(); }catch(_){} });
  await pg1.goto(F + '?pub=zz_probe', { waitUntil: 'domcontentloaded' });
  await pg1.waitForTimeout(500);
  let r = await pg1.evaluate(() => { try {
    const v = document.getElementById('boot-veil');
    if (!v) return { veil: false };
    const notes = v.querySelectorAll('.bv-staff b');
    const bt = document.getElementById('bv-txt');
    return { veil: true, txt: (bt || {}).textContent,
      lines: v.querySelectorAll('.bv-staff i').length, notes: notes.length,
      anim: notes.length ? getComputedStyle(notes[0]).animationName : '',
      pulse: bt ? getComputedStyle(bt).animationName : '',
      opaque: getComputedStyle(v).opacity === '1',
      fallback: [...document.querySelectorAll('script')].some(s => s.textContent.includes("boot-veil") && s.textContent.includes('8000')) };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.veil && r.txt === '曲谱加载中…' && r.lines === 5 && r.notes === 3 && r.anim === 'bvNote'
    && r.pulse === 'bvPulse' && r.opaque && r.fallback, 'T1 启动遮罩动画+深链文案', JSON.stringify(r));
  await pg1.close();

  // T2/T3 音色胶囊（干净页面；播放断言只看标志位不依赖音频时钟——CI 无声教训）
  const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
  pg.on('pageerror', e => errs.push('PG:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  r = await pg.evaluate(async () => { try {
    window.guardReplace = p => p();
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 0, lyr: 0 });
    s.measures[0].tabs[0][0].notes = [{ s: 3, f: 0 }];
    loadSong(s); hideStartPad();
    const name = SF_MAP[trackCfg('tab', 0).inst];
    sfBanks[name] = sfBanks[name] || { status: 'loading', notes: null, buf: {} };
    for (const k in sfBanks) { sfBanks[k].loading = true; sfBanks[k].full = false; }
    play();
    await new Promise(z => setTimeout(z, 300));
    const el = document.getElementById('audio-loading');
    const shown = el.classList.contains('on');
    const txt = document.getElementById('al-text').textContent;
    const eq = document.querySelectorAll('#audio-loading .eq i').length;
    const anim = getComputedStyle(document.querySelector('#audio-loading .eq i')).animationName;
    for (const k in sfBanks) { sfBanks[k].loading = false; sfBanks[k].full = true; }   // 就绪（full 防 sfLoad 重拉）
    await new Promise(z => setTimeout(z, 400));
    const hidden = !el.classList.contains('on');
    const playing = audio.playing;
    stopPlay();
    return { shown, txt, eq, anim, hidden, playing };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.shown && r.txt.includes('音色加载中') && r.eq === 4 && r.anim === 'alEq' && r.hidden && r.playing,
    'T2 音色胶囊：等待显示→就绪开播自隐', JSON.stringify(r));

  r = await pg.evaluate(async () => { try {
    for (const k in sfBanks) { sfBanks[k].loading = true; sfBanks[k].full = false; }
    play();
    await new Promise(z => setTimeout(z, 200));
    const shown = document.getElementById('audio-loading').classList.contains('on');
    stopPlay();
    const hidden = !document.getElementById('audio-loading').classList.contains('on');
    const reset = audio.sfWaitFrom == null;   // v61.4 顺手修：停止归零等待计时
    for (const k in sfBanks) { sfBanks[k].loading = false; sfBanks[k].full = true; }
    return { shown, hidden, reset };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.shown && r.hidden && r.reset, 'T3 等待期停止：胶囊收起+计时归零', JSON.stringify(r));
  await pg.close();

  // T4 reduced-motion 降级
  const pg4 = await b.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  pg4.on('pageerror', e => errs.push('P4:' + e.message));
  await pg4.route('**/api/**', async route => { await new Promise(z => setTimeout(z, 4000)); try{ route.abort(); }catch(_){} });
  await pg4.goto(F + '?pub=zz_probe', { waitUntil: 'domcontentloaded' });
  await pg4.waitForTimeout(300);
  r = await pg4.evaluate(() => {
    const n = document.querySelector('#boot-veil .bv-staff b');
    return { note: n ? getComputedStyle(n).animationName : 'gone' };
  });
  T(r.note === 'none', 'T4 reduced-motion 音符动画停用', JSON.stringify(r));
  await pg4.close();

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
