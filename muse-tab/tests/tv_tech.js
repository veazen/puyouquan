/* v38.7 揉弦随时值延长 + 闷音范围标记 回归 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  let pass = 0, total = 0;
  const T = (ok, name, detail) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };
  const WAVE = /q 1\.5 -2\.8 3 0/g;   // 每个波浪周期出现一次

  // T1 揉弦波浪随时值延长：同一首谱里 全音符揉弦 的波峰数 > 八分音符揉弦
  let r = await pg.evaluate(() => {
    const Tc = (f, dur, tech) => ({dur, dotted:false, chord:'', notes:[Object.assign({s:2, f}, tech?{tech}:{})], strum:''});
    const s = createSong('guitar', {beats:4, unit:4, key:'C', nMea:2, nTab:1, nVox:0, lyr:0});
    s.measures[0].tabs[0] = [Tc(5,8,'v'), Tc(7,8), Tc(5,4), Tc(7,2)];
    s.measures[1].tabs[0] = [Tc(5,1,'v')];
    loadSong(s); blurSel = true; render();
    const svg = document.getElementById('score').innerHTML;
    /* 波浪按 path 分布：第一段（八分）短、第二段（全音符）长 */
    const waves = (svg.match(/M [\d.]+ [\d.]+( q 1\.5 -2\.8 3 0 q 1\.5 2\.8 3 0)+/g) || []).map(w => (w.match(/-2\.8/g) || []).length);
    return { n: waves.length, waves };
  });
  T(r.n === 2 && r.waves[1] > r.waves[0] && r.waves[0] >= 1,
    'T1 揉弦随时值延长', '八分=' + r.waves[0] + '峰 全音符=' + r.waves[1] + '峰');

  // T2 揉弦扩选：首末两音 → 首音 tk 指向末音，波浪延伸到末音 x（几何断言）
  r = await pg.evaluate(() => {
    const Tc = (f, dur) => ({dur, dotted:false, chord:'', notes:[{s:2, f}], strum:''});
    const s = createSong('guitar', {beats:4, unit:4, key:'C', nMea:1, nTab:1, nVox:0, lyr:0});
    s.measures[0].tabs[0] = [Tc(5,4), Tc(7,4), Tc(5,4), Tc(7,4)];
    loadSong(s);
    noteSel = [{row:'tab', mi:0, ci:0, si:2, vi:0}, {row:'tab', mi:0, ci:3, si:2, vi:0}];
    applyTech('v');
    blurSel = true; render();
    const n0 = song.measures[0].tabs[0][0].notes[0];
    const others = [1,2,3].map(ci => song.measures[0].tabs[0][ci].notes[0].tech || null);
    const svg = document.getElementById('score').innerHTML;
    const wave = (svg.match(/M ([\d.]+) [\d.]+( q 1\.5 -2\.8 3 0 q 1\.5 2\.8 3 0)+/) || [])[0] || '';
    const x0 = parseFloat((wave.match(/M ([\d.]+)/) || [])[1] || 0);
    const span = (wave.match(/-2\.8/g) || []).length * 6;
    const box = colBoxes['t0:0:3'] || null;   // 末音所在列格（几何参照）
    return { tech: n0.tech, tk: n0.tk, others, x0, span, box };
  });
  T(r.tech === 'v' && r.tk && r.tk.ci === 3 && r.others.every(t => !t)
    && r.box && (r.x0 + r.span) >= r.box.x && (r.x0 + r.span) <= r.box.x + r.box.w + 10,
    'T2 揉弦扩选范围', 'tk→列' + (r.tk && r.tk.ci + 1) + ' 波浪末端=' + (r.x0 + r.span).toFixed(0)
    + ' 末列格=[' + (r.box && r.box.x.toFixed(0)) + ',' + (r.box && (r.box.x + r.box.w).toFixed(0)) + ']');

  // T3 闷音扩选：P.M. 一次 + 虚线到末音 + 末端竖钩；中间音无重复标记
  r = await pg.evaluate(() => {
    const Tc = (f, dur) => ({dur, dotted:false, chord:'', notes:[{s:5, f}], strum:''});
    const s = createSong('guitar', {beats:4, unit:4, key:'C', nMea:1, nTab:1, nVox:0, lyr:0});
    s.measures[0].tabs[0] = [Tc(0,8), Tc(0,8), Tc(2,8), Tc(3,8), Tc(2,4), Tc(0,4)];
    loadSong(s);
    noteSel = [{row:'tab', mi:0, ci:0, si:5, vi:0}, {row:'tab', mi:0, ci:4, si:5, vi:0}];
    applyTech('pm');
    blurSel = true; render();
    const svg = document.getElementById('score').innerHTML;
    const pmCount = (svg.match(/P\.M\./g) || []).length;
    const dash = svg.match(/x1="([\d.]+)" y1="[\d.]+" x2="([\d.]+)" y2="[\d.]+" stroke="var\(--ink\)" stroke-width="1" stroke-dasharray="3\.5 2\.6"/);
    const box = colBoxes['t0:0:4'] || null;
    const n0 = song.measures[0].tabs[0][0].notes[0];
    return { pmCount, hasDash: !!dash, dashEnd: dash ? parseFloat(dash[2]) : 0, box, tk: n0.tk };
  });
  T(r.pmCount === 1 && r.hasDash && r.tk && r.tk.ci === 4
    && r.box && r.dashEnd >= r.box.x && r.dashEnd <= r.box.x + r.box.w + 8,
    'T3 闷音扩选范围', 'P.M.×' + r.pmCount + ' 虚线末端=' + r.dashEnd.toFixed(0)
    + ' 末列格=[' + (r.box && r.box.x.toFixed(0)) + ',' + (r.box && (r.box.x + r.box.w).toFixed(0)) + ']');

  // T4 单音闷音不回归：无 tk → 只有居中 P.M. 文本、无虚线
  r = await pg.evaluate(() => {
    const Tc = (f, dur, tech) => ({dur, dotted:false, chord:'', notes:[Object.assign({s:5, f}, tech?{tech}:{})], strum:''});
    const s = createSong('guitar', {beats:4, unit:4, key:'C', nMea:1, nTab:1, nVox:0, lyr:0});
    s.measures[0].tabs[0] = [Tc(0,4,'pm'), Tc(2,4), Tc(3,4), Tc(2,4)];
    loadSong(s); blurSel = true; render();
    const svg = document.getElementById('score').innerHTML;
    return { pmCount: (svg.match(/P\.M\./g) || []).length, dash: svg.includes('stroke-dasharray="3.5 2.6"') };
  });
  T(r.pmCount === 1 && !r.dash, 'T4 单音闷音兼容', 'P.M.×' + r.pmCount + ' 无虚线=' + !r.dash);

  // T5 其它技法连线行为不回归：三音选中 sl 仍两两成链
  r = await pg.evaluate(() => {
    const Tc = (f, dur) => ({dur, dotted:false, chord:'', notes:[{s:3, f}], strum:''});
    const s = createSong('guitar', {beats:4, unit:4, key:'C', nMea:1, nTab:1, nVox:0, lyr:0});
    s.measures[0].tabs[0] = [Tc(2,4), Tc(4,4), Tc(5,4), Tc(7,4)];
    loadSong(s);
    noteSel = [0,1,2].map(ci => ({row:'tab', mi:0, ci, si:3, vi:0}));
    applyTech('sl');
    const ns = [0,1,2].map(ci => song.measures[0].tabs[0][ci].notes[0]);
    return { chain: ns[0].tech === 'sl' && ns[0].tk.ci === 1 && ns[1].tech === 'sl' && ns[1].tk.ci === 2 && !ns[2].tech };
  });
  T(r.chain, 'T5 滑弦成链兼容');

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
