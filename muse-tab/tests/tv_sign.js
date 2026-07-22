/* v41.1 记号补充第一批回归：延长号 ferm / 演奏法四件套 artic / 换气 breath
   覆盖：数据写入（按钮入口+互斥+再点取消）、简谱/五线谱/TAB SVG 出现与几何、MusicXML 往返 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  let pass = 0, total = 0;
  const T = (ok, name, detail) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };
  const Vc = (deg, dur, ext) => Object.assign({dur: dur||4, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false}, ext||{});

  // T1 按钮入口：延长号/换气再点取消，演奏法四件套互斥
  let r = await pg.evaluate(() => {
    const Vc = (deg, dur) => ({dur: dur||4, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false});
    const s = createSong('vocal', {beats:4, unit:4, key:'C', nMea:1, nVox:1, lyr:0});
    s.measures[0].voxes[0] = [Vc(1), Vc(2), Vc(3), Vc(5)];
    loadSong(s);
    Object.assign(sel, {row:'vox', vi:0, mi:0, ci:0});
    const col = () => song.measures[0].voxes[0][sel.ci];
    const out = {};
    document.getElementById('b-ferm-v').click();  out.fermOn  = col().ferm === true;
    document.getElementById('b-ferm-v').click();  out.fermOff = !('ferm' in col());
    document.getElementById('b-breath').click();  out.brOn    = col().breath === true;
    document.getElementById('b-breath').click();  out.brOff   = !('breath' in col());
    document.getElementById('b-art-stacc').click(); out.a1 = col().artic;   // stacc
    document.getElementById('b-art-acc').click();   out.a2 = col().artic;   // 互斥→accent
    document.getElementById('b-art-acc').click();   out.a3 = !('artic' in col());   // 再点取消
    document.getElementById('b-art-stcc').click();  out.a4 = col().artic;   // staccatissimo
    document.getElementById('b-art-ten').click();   out.a5 = col().artic;   // tenuto
    return out;
  });
  T(r.fermOn && r.fermOff && r.brOn && r.brOff && r.a1==='stacc' && r.a2==='accent' && r.a3 && r.a4==='staccatissimo' && r.a5==='tenuto',
    'T1 按钮入口写入/互斥/取消', JSON.stringify(r));

  // T2 简谱渲染：延长号在数字上方（几何）、跳音圆点、重音折线、换气 v、无 NaN
  r = await pg.evaluate(() => {
    const Vc = (deg, dur, ext) => Object.assign({dur: dur||4, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false}, ext||{});
    const s = createSong('vocal', {beats:4, unit:4, key:'C', nMea:1, nVox:1, lyr:0});
    s.measures[0].voxes[0] = [Vc(1,4,{ferm:true}), Vc(2,4,{artic:'stacc'}), Vc(3,4,{artic:'accent'}), Vc(5,4,{breath:true})];
    loadSong(s); blurSel = true; render();
    const svg = document.getElementById('score').innerHTML;
    const ferms = [...document.querySelectorAll('#score path')]
      .filter(p2 => p2.getAttribute('d') === SMUFL.fermataAbove.d)
      .map(p2 => { const m = /translate\((-?[\d.]+),(-?[\d.]+)\)/.exec(p2.getAttribute('transform')); return {x:+m[1], y:+m[2]}; });
    const digit = [...document.querySelectorAll('#score text')].find(t => t.getAttribute('font-size') === '16.5');
    return { nFerm: ferms.length, fermY: ferms[0] ? ferms[0].y : 0,
      digitY: digit ? +digit.getAttribute('y') : 0,
      stacc: /<circle[^>]*r="1\.6"/.test(svg),
      accent: svg.includes('stroke-width="1.1"'),
      breath: /stroke-width="1\.2" stroke-linecap="round"/.test(svg),
      bad: /NaN|undefined/.test(svg) };
  });
  T(r.nFerm === 1 && r.fermY < r.digitY - 10 && r.stacc && r.accent && r.breath && !r.bad,
    'T2 简谱渲染与几何', '𝄐y=' + r.fermY.toFixed(0) + ' 数字y=' + r.digitY.toFixed(0) + ' 点/折线/换气=' + [r.stacc, r.accent, r.breath].join(','));

  // T3 五线谱渲染：跳音贴符头反符干侧（低音符干朝上→记号在符头下方；高音反之）、延长号在谱表上缘之上
  r = await pg.evaluate(() => {
    const Vc = (deg, dur, ext) => Object.assign({dur: dur||4, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false}, ext||{});
    const s = createSong('instr', {beats:4, unit:4, key:'C', nMea:1, nVox:1, lyr:0});
    s.measures[0].voxes[0] = [Vc(1,4,{artic:'stacc'}), Vc(2,4,{oct:1, artic:'stacc'}), Vc(3,4,{ferm:true}), Vc(5,4)];
    loadSong(s); blurSel = true; render();
    const tOf = p2 => { const m = /translate\((-?[\d.]+),(-?[\d.]+)\)/.exec(p2.getAttribute('transform')); return {x:+m[1], y:+m[2]}; };
    const glyph = d => [...document.querySelectorAll('#score path')].filter(p2 => p2.getAttribute('d') === d).map(tOf);
    const heads = glyph(SMUFL.noteheadBlack.d).sort((a,b2)=>a.x-b2.x);
    const stacc = glyph(SMUFL.articStaccatoAbove.d).sort((a,b2)=>a.x-b2.x);
    const ferm  = glyph(SMUFL.fermataAbove.d);
    const staffT = Math.min(...[...document.querySelectorAll('#score line')]
      .filter(l => l.getAttribute('stroke-width') === '0.8').map(l => +l.getAttribute('y1')));
    return { nStacc: stacc.length, nFerm: ferm.length,
      lowOk: stacc[0] && heads[0] && stacc[0].y > heads[0].y + 4,     // 低音：符干朝上→记号在符头下方
      hiOk:  stacc[1] && heads[1] && stacc[1].y < heads[1].y - 4,     // 高音：符干朝下→记号在符头上方
      fermAboveStaff: ferm[0] && ferm[0].y <= staffT - 6, staffT };
  });
  T(r.nStacc === 2 && r.nFerm === 1 && r.lowOk && r.hiOk && r.fermAboveStaff,
    'T3 五线谱贴符头反侧+谱上延长号', 'stacc=' + r.nStacc + ' 低/高位置=' + r.lowOk + '/' + r.hiOk + ' 𝄐在谱上=' + r.fermAboveStaff);

  // T4 TAB 延长号：按钮写入 tabCol.ferm，字形落在该列水平范围内、位于六线谱上方
  r = await pg.evaluate(() => {
    const Tc = (f, dur) => ({dur, dotted:false, chord:'', notes:[{s:2, f}], strum:''});
    const s = createSong('guitar', {beats:4, unit:4, key:'C', nMea:1, nTab:1, nVox:0, lyr:0});
    s.measures[0].tabs[0] = [Tc(5,4), Tc(7,4), Tc(5,4), Tc(7,4)];
    loadSong(s);
    Object.assign(sel, {row:'tab', vi:0, mi:0, ci:0, si:2});
    document.getElementById('b-ferm-t').click();
    const dataOk = song.measures[0].tabs[0][0].ferm === true;
    blurSel = true; render();
    const ferm = [...document.querySelectorAll('#score path')]
      .filter(p2 => p2.getAttribute('d') === SMUFL.fermataAbove.d)
      .map(p2 => { const m = /translate\((-?[\d.]+),(-?[\d.]+)\)/.exec(p2.getAttribute('transform')); return {x:+m[1], y:+m[2]}; });
    const hz = document.querySelector('#score rect[data-row="tab"][data-mi="0"][data-ci="0"][data-si="0"]');
    const tabTop = hz ? +hz.getAttribute('y') + 18 : 0;   // 一弦上方热区 y=tabTop-18
    const box = colBoxes['t0:0:0'];
    return { dataOk, n: ferm.length, x: ferm[0] ? ferm[0].x : 0, y: ferm[0] ? ferm[0].y : 0, tabTop, box,
      bad: /NaN|undefined/.test(document.getElementById('score').innerHTML) };
  });
  T(r.dataOk && r.n === 1 && r.box && r.x >= r.box.x && r.x <= r.box.x + r.box.w
    && r.y < r.tabTop - 5 && !r.bad,
    'T4 TAB 延长号', 'x=' + r.x.toFixed(0) + '∈[' + (r.box && r.box.x.toFixed(0)) + ',' + (r.box && (r.box.x + r.box.w).toFixed(0)) + '] y=' + r.y.toFixed(0) + ' 一弦=' + r.tabTop);

  // T5 MusicXML 往返：fermata/articulations/breath-mark 导出并导回一致（含休止上的延长号）
  r = await pg.evaluate(() => {
    const Vc = (deg, dur, ext) => Object.assign({dur: dur||4, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false}, ext||{});
    const s = createSong('vocal', {beats:8, unit:4, key:'C', nMea:1, nVox:1, lyr:0});
    s.measures[0].voxes[0] = [Vc(1,4,{ferm:true}), Vc(2,4,{artic:'stacc'}), Vc(3,4,{artic:'staccatissimo', breath:true}),
      Vc(0,4,{ferm:true}), Vc(5,4,{artic:'tenuto'}), Vc(6,4,{artic:'accent'}), Vc(1,4,{breath:true}), Vc(2,4)];
    loadSong(s);
    const xml = exportMusicXML(song);
    const has = t2 => xml.includes(t2);
    const res = importMusicXML(xml);
    const c2 = res.song ? res.song.measures[0].voxes[0] : [];
    return {
      exp: has('<fermata/>') && has('<staccato/>') && has('<staccatissimo/>') && has('<tenuto/>') && has('<accent/>') && has('<breath-mark/>'),
      rt: c2.length === 8 && c2[0].ferm === true && c2[1].artic === 'stacc' && c2[2].artic === 'staccatissimo' && c2[2].breath === true
        && c2[3].deg === 0 && c2[3].ferm === true && c2[4].artic === 'tenuto' && c2[5].artic === 'accent' && c2[6].breath === true
        && !c2[7].ferm && !c2[7].artic && !c2[7].breath,
      skip: res.skip };
  });
  T(r.exp && r.rt, 'T5 MusicXML 往返一致', '导出六元素=' + r.exp + ' 回读=' + r.rt + ' skip=' + JSON.stringify(r.skip));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
