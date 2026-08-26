/* v60.40 节拍器弹窗回归（产品指示：数拍并入节拍器，完善节拍器，点开弹窗设置）：
   T1 点「节拍器」开弹窗：#metro-pop 可见、位于播放坞按钮上方、五组控件在位
   T2 拍点开关联动：mp-on ↔ metroOn ↔ b-metro.on；点弹窗外收起
   T3 数拍档位：关/1/2 小节写 countInOn + metroSet.ci；数拍开着（拍点关）按钮也亮
   T4 数拍排程口径（metroClick 记录器）：2 小节=前置 2×拍数 空拍、重音每小节首拍一记；
      重音开关关掉=零重音；数拍关=零前置
   T5 八分细分排程：每拍额外一记轻点（soft 半音量、非重音）；关细分即恢复
   T6 持久化：设置写新键 musetab-metro，重载恢复（数拍/细分/重音/音量）；拍点开关不持久
   对 v60.39 旧文件跑：无 #metro-pop/metroSet → T1 起当场红（突变实证）。file:// 直载。 */
const { chromium } = require('playwright');
const path = require('path');
const F = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => {
    window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
    try { localStorage.removeItem('musetab-metro'); } catch (_) {}
    loadSong(createSong('vocal', { title: 'mt', beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 0, nVox: 1, lyr: 0 }));
  });
  await pg.waitForTimeout(400);

  // T1 弹窗打开：可见、在按钮上方、控件齐全
  let r = await pg.evaluate(() => {
    document.getElementById('b-metro').click();
    const pop = document.getElementById('metro-pop'), btn = document.getElementById('b-metro');
    const pr = pop.getBoundingClientRect(), br = btn.getBoundingClientRect();
    return {
      on: pop.classList.contains('on'),
      shown: getComputedStyle(pop).display === 'flex',
      above: pr.bottom <= br.top + 1,
      ctl: !!document.getElementById('mp-on') && !!document.getElementById('mp-acc')
        && document.querySelectorAll('#mp-ci .kp-chip').length === 3
        && document.querySelectorAll('#mp-sub .kp-chip').length === 2
        && !!document.getElementById('mp-vol')
    };
  });
  T(r.on && r.shown && r.above && r.ctl, 'T1 节拍器弹窗（可见·坞上方·五组控件）', JSON.stringify(r));

  // T2 拍点开关联动 + 点外部收起
  r = await pg.evaluate(() => {
    document.getElementById('mp-on').click();
    const on = metroOn && document.getElementById('mp-on').classList.contains('on')
      && document.getElementById('b-metro').classList.contains('on');
    document.getElementById('mp-on').click();
    const off = !metroOn && !document.getElementById('mp-on').classList.contains('on')
      && !document.getElementById('b-metro').classList.contains('on');
    document.body.click();   // 弹窗外点击 → 收起
    const closed = !document.getElementById('metro-pop').classList.contains('on');
    return { on, off, closed };
  });
  T(r.on && r.off && r.closed, 'T2 拍点开关联动·点外收起', JSON.stringify(r));

  // T3 数拍档位与按钮亮态（拍点关着、只开数拍也要亮——教学最常见用法）
  r = await pg.evaluate(() => {
    document.getElementById('b-metro').click();   // 重开弹窗
    const chip = n => document.querySelector('#mp-ci .kp-chip[data-ci="' + n + '"]');
    chip(2).click();
    const two = countInOn === true && metroSet.ci === 2 && chip(2).classList.contains('on')
      && !metroOn && document.getElementById('b-metro').classList.contains('on');
    chip(1).click();
    const one = countInOn === true && metroSet.ci === 1 && chip(1).classList.contains('on');
    chip(0).click();
    const off = countInOn === false && chip(0).classList.contains('on')
      && !document.getElementById('b-metro').classList.contains('on');
    return { two, one, off };
  });
  T(r.two && r.one && r.off, 'T3 数拍档位（2/1/关）·仅数拍亮按钮', JSON.stringify(r));

  // T4 数拍排程口径：记录器替换 metroClick（v60.35 构建期快照捕获的正是 window 上的当前函数）
  r = await pg.evaluate(() => {
    const log = [];
    const orig = window.metroClick;
    window.metroClick = (ctx, bus, when, accent, soft) => { log.push({ a: !!accent, s: soft || 0 }); };
    const run = () => { log.length = 0; play(); stopPlay(); return log.slice(); };
    countInOn = true; metroSet.ci = 2; metroSet.acc = true; metroOn = false;
    const ci2 = run();
    metroSet.acc = false;
    const noAcc = run();
    metroSet.acc = true; countInOn = false;
    const none = run();
    window.metroClick = orig;
    return {
      beats: song.beats,
      ci2n: ci2.length, ci2acc: ci2.filter(e => e.a).length,   // 2 小节 4/4 → 8 拍、重音 2 记
      noAccN: noAcc.length, noAccA: noAcc.filter(e => e.a).length,
      none: none.length
    };
  });
  T(r.ci2n === 2 * r.beats && r.ci2acc === 2 && r.noAccN === 2 * r.beats && r.noAccA === 0 && r.none === 0,
    'T4 数拍 2 小节排程（拍数×2·每小节首拍重音·关重音零重音·关数拍零前置)', JSON.stringify(r));

  // T5 八分细分：2 小节 4/4 拍点=8 主拍；细分开 → 额外 8 记轻点（soft>0、非重音）
  r = await pg.evaluate(() => {
    const log = [];
    const orig = window.metroClick;
    window.metroClick = (ctx, bus, when, accent, soft) => { log.push({ a: !!accent, s: soft || 0 }); };
    const run = () => { log.length = 0; play(); stopPlay(); return log.slice(); };
    countInOn = false; metroOn = true; metroSet.acc = true; metroSet.sub = 2;
    const sub2 = run();
    metroSet.sub = 1;
    const sub1 = run();
    metroOn = false;
    window.metroClick = orig;
    const softs = sub2.filter(e => e.s > 0);
    return {
      sub2n: sub2.length, softN: softs.length,
      softOk: softs.every(e => !e.a && e.s > 0 && e.s < 1),
      sub1n: sub1.length, sub1soft: sub1.filter(e => e.s > 0).length
    };
  });
  T(r.sub2n === 16 && r.softN === 8 && r.softOk && r.sub1n === 8 && r.sub1soft === 0,
    'T5 八分细分排程（主8+轻8·轻点半音量非重音·关细分复原)', JSON.stringify(r));

  // T6 持久化：经 UI 写设置 → musetab-metro → 重载恢复；metroOn 不持久
  r = await pg.evaluate(() => {
    document.querySelector('#mp-ci .kp-chip[data-ci="2"]').click();
    document.querySelector('#mp-sub .kp-chip[data-sub="2"]').click();
    document.getElementById('mp-acc').click();   // 重音关
    const sl = document.getElementById('mp-vol');
    sl.value = 160; sl.dispatchEvent(new Event('input')); sl.dispatchEvent(new Event('change'));
    document.getElementById('mp-on').click();    // 拍点开（不应持久）
    let saved = null; try { saved = JSON.parse(localStorage.getItem('musetab-metro')); } catch (_) {}
    return { saved, volLbl: document.getElementById('mp-vol-v').textContent };
  });
  const savedOk = r.saved && r.saved.ciOn === true && r.saved.ci === 2 && r.saved.sub === 2
    && r.saved.acc === false && Math.abs(r.saved.vol - 1.6) < 1e-6 && r.volLbl === '160%';
  await pg.goto(F); await pg.waitForTimeout(900);
  const r6 = await pg.evaluate(() => ({
    ciOn: countInOn, ci: metroSet.ci, sub: metroSet.sub, acc: metroSet.acc, vol: metroSet.vol,
    metroOff: metroOn === false,
    btnLit: document.getElementById('b-metro').classList.contains('on')   // 数拍持久 → 开机即亮
  }));
  T(savedOk && r6.ciOn && r6.ci === 2 && r6.sub === 2 && r6.acc === false
    && Math.abs(r6.vol - 1.6) < 1e-6 && r6.metroOff && r6.btnLit,
    'T6 设置持久化与重载恢复（拍点开关不持久）', JSON.stringify({ saved: r.saved, boot: r6 }));

  await pg.evaluate(() => { try { localStorage.removeItem('musetab-metro'); } catch (_) {} });
  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');

  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
