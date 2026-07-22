/* v41.1/v41.2 记号回归：延长号 ferm / 演奏法四件套 artic / 换气 breath（第一批）
   + 渐强渐弱范围括线 dynTo / 推弦幅度 bAmt / 排练段落标记 mea.label（第二批）
   覆盖：数据写入（按钮/菜单入口+取消）、SVG 几何断言（跨行断线/弧上幅度/方框标记）、MusicXML 往返 */
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

  // T6 渐强渐弱范围括线：Ctrl 首末两音+菜单 < → dyn/dynTo 写入、同行开口楔形几何、MusicXML wedge 往返
  r = await pg.evaluate(() => {
    const Vc = (deg, dur) => ({dur: dur||4, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false});
    const s = createSong('vocal', {beats:4, unit:4, key:'C', nMea:2, nVox:1, lyr:0});
    s.measures[0].voxes[0] = [Vc(1), Vc(2), Vc(3), Vc(5)];
    s.measures[1].voxes[0] = [Vc(5), Vc(3), Vc(2), Vc(1)];
    loadSong(s);
    Object.assign(sel, {row:'vox', vi:0, mi:0, ci:1});
    noteSel = [{row:'vox', vi:0, mi:0, ci:1}, {row:'vox', vi:0, mi:1, ci:2}];
    showDynMenu(200, 200);
    document.querySelector('#popmenu [data-dy="<"]').click();
    const c0 = song.measures[0].voxes[0][1];
    const dataOk = c0.dyn === '<' && c0.dynTo && c0.dynTo.mi === 1 && c0.dynTo.ci === 2;
    blurSel = true; render();
    /* 楔形 path：两段 M..L..，起点开口 0 → 终点开口 7 */
    const wp = [...document.querySelectorAll('#score path[stroke-width="0.9"]')]
      .map(p2 => p2.getAttribute('d'))
      .map(d => (d.match(/-?[\d.]+/g)||[]).map(Number))
      .filter(n2 => n2.length === 8);
    const w1 = wp[0]||[];
    const gapA = w1.length? Math.abs(w1[5]-w1[1]) : -1, gapB = w1.length? Math.abs(w1[7]-w1[3]) : -1;
    const b1 = document.querySelector('#score rect[data-row="vox"][data-mi="0"][data-ci="1"]');
    const b2 = document.querySelector('#score rect[data-row="vox"][data-mi="1"][data-ci="2"]');
    const inBox = (x, b3) => b3 && x >= +b3.getAttribute('x') - 4 && x <= +b3.getAttribute('x') + +b3.getAttribute('width') + 6;
    const xml = exportMusicXML(song);
    const res = importMusicXML(xml);
    const rc = res.song && res.song.measures[0].voxes[0][1];
    return { dataOk, nW: wp.length, gapA, gapB,
      spanOk: w1.length? (inBox(w1[0], b1) && inBox(w1[2], b2) && w1[2]-w1[0] > 60) : false,
      mxl: xml.includes('<wedge type="crescendo"/>') && xml.includes('<wedge type="stop"/>'),
      rt: !!(rc && rc.dyn === '<' && rc.dynTo && rc.dynTo.mi === 1 && rc.dynTo.ci === 2),
      bad: /NaN|undefined/.test(document.getElementById('score').innerHTML) };
  });
  T(r.dataOk && r.nW === 1 && r.gapA < 0.5 && Math.abs(r.gapB - 7) < 0.5 && r.spanOk && r.mxl && r.rt && !r.bad,
    'T6 渐强范围括线+MusicXML wedge 往返', JSON.stringify(r));

  // T6b 跨行断线：终点在下一行 → 两段楔形（本行到行末 + 续行起到终点），开口度线性衔接
  r = await pg.evaluate(() => {
    const Vc = (deg, dur) => ({dur: dur||8, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false});
    const s = createSong('vocal', {beats:4, unit:4, key:'C', nMea:6, nVox:1, lyr:0});
    for(let mi=0; mi<6; mi++) s.measures[mi].voxes[0] = [1,2,3,4,5,6,7,1].map(d => Vc(d, 8));
    s.measures[0].voxes[0][0].dyn = '>';
    s.measures[0].voxes[0][0].dynTo = {mi:5, ci:6};
    loadSong(s); blurSel = true; render();
    const wp = [...document.querySelectorAll('#score path[stroke-width="0.9"]')]
      .map(p2 => (p2.getAttribute('d').match(/-?[\d.]+/g)||[]).map(Number))
      .filter(n2 => n2.length === 8);
    const rowsDiffer = wp.length === 2 && Math.abs(wp[1][1]-wp[0][1]) > 20;   // 两段在不同系统
    const startGap = wp[0]? Math.abs(wp[0][5]-wp[0][1]) : -1;                 // dim：起点全开 7
    const endGap = wp[1]? Math.abs(wp[1][7]-wp[1][3]) : -1;                   // 终点收拢 0
    const joinOk = wp.length === 2 && Math.abs(Math.abs(wp[0][7]-wp[0][3]) - Math.abs(wp[1][5]-wp[1][1])) < 0.7;
    return { nW: wp.length, rowsDiffer, startGap, endGap, joinOk,
      bad: /NaN|undefined/.test(document.getElementById('score').innerHTML) };
  });
  T(r.nW === 2 && r.rowsDiffer && Math.abs(r.startGap - 7) < 0.5 && r.endGap < 0.5 && r.joinOk && !r.bad,
    'T6b 渐弱括线跨行断线续画', JSON.stringify(r));

  // T7 推弦幅度：Ctrl 推弦后再点推弦按钮 → 幅度菜单，弧上文字 full 替换 b↑，清除还原
  r = await pg.evaluate(() => {
    const Tc = (f, dur) => ({dur, dotted:false, chord:'', notes:[{s:2, f}], strum:''});
    const s = createSong('guitar', {beats:4, unit:4, key:'C', nMea:1, nTab:1, nVox:0, lyr:0});
    s.measures[0].tabs[0] = [Tc(7,4), Tc(9,4), Tc(7,4), Tc(5,4)];
    loadSong(s);
    Object.assign(sel, {row:'tab', vi:0, mi:0, ci:0, si:2});
    noteSel = [{mi:0, ci:0, si:2, vi:0, row:'tab'}, {mi:0, ci:1, si:2, vi:0, row:'tab'}];
    bendFromBar('b');
    const n = song.measures[0].tabs[0][0].notes[0];
    const techOk = n.tech === 'b' && n.tk && n.tk.ci === 1;
    noteSel = [];
    bendFromBar('b');                                     // 已推弦 → 幅度菜单
    const menuUp = !!document.querySelector('#popmenu [data-amt="full"]');
    if(menuUp) document.querySelector('#popmenu [data-amt="full"]').click();
    const amtOk = n.bAmt === 'full';
    blurSel = true; render();
    const svg1 = document.getElementById('score').innerHTML;
    bendFromBar('b');
    document.querySelector('#popmenu [data-amt=""]').click();   // 清除幅度
    const cleared = !('bAmt' in n);
    blurSel = true; render();
    const svg2 = document.getElementById('score').innerHTML;
    return { techOk, menuUp, amtOk, cleared,
      fullShown: svg1.includes('>full</text>') && !svg1.includes('b↑'),
      restored: svg2.includes('b↑') && !svg2.includes('>full</text>'),
      bad: /NaN|undefined/.test(svg1) };
  });
  T(r.techOk && r.menuUp && r.amtOk && r.cleared && r.fullShown && r.restored && !r.bad,
    'T7 推弦幅度 bAmt 菜单+弧上标注', JSON.stringify(r));

  // T8 排练/段落标记：askText 写入 mea.label、方框粗体几何、MusicXML rehearsal 往返、留空清除
  r = await pg.evaluate(() => {
    const Vc = (deg, dur) => ({dur: dur||4, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false});
    const s = createSong('vocal', {beats:4, unit:4, key:'C', nMea:2, nVox:1, lyr:0});
    s.measures[0].voxes[0] = [Vc(1), Vc(2), Vc(3), Vc(5)];
    s.measures[1].voxes[0] = [Vc(5), Vc(3), Vc(2), Vc(1)];
    loadSong(s);
    Object.assign(sel, {row:'vox', vi:0, mi:1, ci:0});
    document.getElementById('b-mealabel').click();
    document.getElementById('ask-in').value = '副歌';
    document.getElementById('ask-ok').click();
    const dataOk = song.measures[1].label === '副歌';
    blurSel = true; render();
    const tEl = [...document.querySelectorAll('#score text')].find(t2 => t2.textContent === '副歌');
    const tx = tEl? +tEl.getAttribute('x') : 0, ty = tEl? +tEl.getAttribute('y') : 0;
    const box = [...document.querySelectorAll('#score rect[stroke-width="1.1"]')].find(r2 =>
      +r2.getAttribute('x') < tx && tx < +r2.getAttribute('x') + +r2.getAttribute('width')
      && +r2.getAttribute('y') < ty && r2.getAttribute('fill') === 'none');
    const digit = [...document.querySelectorAll('#score text')].find(t2 => t2.getAttribute('font-size') === '16.5');
    const xml = exportMusicXML(song);
    const res = importMusicXML(xml);
    const rtLabel = res.song && res.song.measures[1].label;
    document.getElementById('b-mealabel').click();               // 留空清除
    document.getElementById('ask-in').value = '';
    document.getElementById('ask-ok').click();
    return { dataOk, bold: tEl && tEl.getAttribute('font-weight') === '700', boxed: !!box,
      above: tEl && digit? ty < +digit.getAttribute('y') - 12 : false,
      mxl: xml.includes('<rehearsal>副歌</rehearsal>'), rtLabel,
      cleared: !('label' in song.measures[1]),
      bad: /NaN|undefined/.test(document.getElementById('score').innerHTML) };
  });
  T(r.dataOk && r.bold && r.boxed && r.above && r.mxl && r.rtLabel === '副歌' && r.cleared && !r.bad,
    'T8 排练/段落标记+MusicXML rehearsal 往返', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
