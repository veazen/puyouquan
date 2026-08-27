/* v60.54 智能歌词加声部 + 左栏「小节」上方恢复歌词入口（产品指示两项）。
   T1 左轨顺序：新版外壳歌词页可见且紧贴「小节」上方；经典版三页签照旧
   T2 零段空态：无歌词行时入口仍在、面板给「＋ 添加歌词行」、填词面板暂隐；点一下即建第 1 段
   T3 智能填词声部行：列出全部旋律声部 + 各自可填音位数（一眼看出哪条有音符）
   T4 切声部填词：词写进目标声部、原声部一字不动
   T5 ＋声部：复制来源声部音符骨架（音高/时值/附点/连音线/连音符）、不带歌词、一步撤销
   T6 上限：满 5 声部后「＋声部」chip 消失
   T7 空来源退回空轨：来源声部无音符时按各小节实际拍号铺列（变拍谱不错位）
   突变实证（对 v60.53 旧文件跑）：T1/T2/T3 当场红，T4 起因「声部 chip 根本不存在」直接崩。
   file:// 直载。 */
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
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });

  const HELP = `
    window.__V=(deg,o)=>Object.assign({dur:4,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    /* 4 小节 1-2-3-5 的独唱谱（1 段词），每条旋律声部 16 个可填音位 */
    window.__mk=(lyr,nMea)=>{
      const s=createSong('vocal',{beats:4,unit:4,key:'C',nMea:nMea||4,nVox:1,lyr:lyr==null?1:lyr});
      s.measures.forEach(m=>{ m.voxes[0]=[__V(1),__V(2),__V(3),__V(5)]; });
      loadSong(s); blurSel=true; render(); return song;
    };
    window.__rail=()=>[...document.querySelectorAll('#left-rail .ltab')]
      .filter(x=>x.offsetParent!==null)
      .map(x=>x.dataset.t||x.dataset.trk||x.dataset.act||x.id);
  `;

  // T1 左轨顺序：歌词紧贴「小节」上方（新版），经典版三页签照旧
  let r = await pg.evaluate(HELP + `(()=>{
    __mk(1);
    const rail=__rail();
    const li=rail.indexOf('lyr'), mi=rail.indexOf('mea');
    document.getElementById('b-shell').click();
    const vis=k=>{const el=document.querySelector('.ltab[data-t="'+k+'"]'); return el && el.offsetParent!==null;};
    /* 本谱是独唱谱（无吉他声部）→ 吉他页本就隐藏，经典版只核 简谱/歌词 两页仍在 */
    const classicBase=['vox','lyr'].every(vis);
    const classicShellOnlyOff=['chord','mea','sect'].every(k=>!vis(k));
    document.getElementById('b-shell').click();
    return {rail, li, mi, adjacent: li>=0 && mi===li+1, classicBase, classicShellOnlyOff};
  })()`);
  T(r.adjacent && r.classicBase && r.classicShellOnlyOff,
    'T1 左轨：歌词页恢复且紧贴「小节」上方（经典版三页签照旧）', JSON.stringify(r));

  // T2 零段空态：入口仍在、面板给「＋ 添加歌词行」、填词面板暂隐；点一下即建第 1 段
  r = await pg.evaluate(HELP + `(()=>{
    __mk(0);
    const lyrB=document.querySelector('.ltab[data-t="lyr"]');
    const shown0 = lyrB && lyrB.offsetParent!==null;
    lyrB.click();
    const addChip=document.querySelector('#lyr-lines [data-k="ll+"]');
    const addTxt=addChip? addChip.textContent.trim() : '';
    const editHidden=document.getElementById('panel-lyr-edit').style.display==='none';
    addChip.click();
    const editBack=document.getElementById('panel-lyr-edit').style.display!=='none';
    return {shown0, lines0:0, addTxt, editHidden, lines:song.lyricLines, editBack,
      segChips:document.querySelectorAll('#lyr-lines [data-k="ll"]').length};
  })()`);
  T(r.shown0 && r.addTxt.indexOf('添加歌词行') >= 0 && r.editHidden
    && r.lines === 1 && r.editBack && r.segChips === 1,
    'T2 零段空态：入口常驻 + 面板直接给「＋ 添加歌词行」', JSON.stringify(r));

  // T3 智能填词声部行：列出全部旋律声部 + 各自可填音位数
  r = await pg.evaluate(HELP + `(()=>{
    __mk(1);
    addVoice('vox');                                   // 第 2 条：全休止空轨
    song.measures[0].voxes[1][0].deg=6;                // 只给 1 个音
    render();
    document.getElementById('b-fill').click();
    const chips=[...document.querySelectorAll('#sf-voices [data-sfv]')]
      .map(x=>({v:x.dataset.sfv, t:x.textContent.trim(), on:x.classList.contains('on')}));
    const title=document.getElementById('sf-title').textContent;
    closeModal();
    return {chips, title};
  })()`);
  T(r.chips.length === 3 && r.chips[0].v === '0' && r.chips[1].v === '1' && r.chips[2].v === '+'
    && /旋律1\s*16/.test(r.chips[0].t) && /旋律2\s*1/.test(r.chips[1].t),
    'T3 声部行：全部旋律声部 + 各自可填音位数', JSON.stringify(r));

  // T4 切声部填词：词写进目标声部、原声部一字不动
  r = await pg.evaluate(HELP + `(()=>{
    __mk(1);
    addVoice('vox');
    song.measures[0].voxes[1]=[__V(6),__V(5),__V(4),__V(3)];
    render();
    document.getElementById('b-fill').click();
    document.querySelector('#sf-voices [data-sfv="1"]').click();     // 切到旋律2
    const title=document.getElementById('sf-title').textContent;
    const ta=document.getElementById('fill-text'); ta.value='甲乙丙丁';
    ta.dispatchEvent(new Event('input'));
    document.getElementById('fill-ok').click();
    const v1=song.measures[0].voxes[1].map(c=>(c.lyrics||[])[0]||'');
    const v0=song.measures[0].voxes[0].map(c=>(c.lyrics||[])[0]||'');
    return {title, v1:v1.join(''), v0:v0.join(''), selVi:sel.vi, selRow:sel.row};
  })()`);
  T(r.title.indexOf('旋律2') >= 0 && r.v1 === '甲乙丙丁' && r.v0 === '' && r.selRow === 'vox' && r.selVi === 1,
    'T4 切声部填词：写进目标声部、原声部零改动', JSON.stringify(r));

  // T5 ＋声部：复制音符骨架（音高/时值/附点/连音线/连音符）、不带歌词、一步撤销
  r = await pg.evaluate(HELP + `(()=>{
    __mk(1);
    song.measures[0].voxes[0]=[
      __V(1,{dur:8,dotted:true}), __V(2,{dur:16,tie:true}), __V(3,{tup:3}), __V(5,{acc:'#',oct:1})];
    song.measures[0].voxes[0][0].lyrics=['原'];
    render();
    document.getElementById('b-fill').click();
    document.querySelector('#sf-voices [data-sfv="+"]').click();
    const src=song.measures[0].voxes[0], dst=song.measures[0].voxes[1];
    const key=c=>[c.deg,c.dur,!!c.dotted,c.acc||'',c.oct||0,!!c.tie,c.tup||0].join('/');
    const same=src.length===dst.length && src.every((c,i)=>key(c)===key(dst[i]));
    const noLyr=dst.every(c=>!(c.lyrics&&c.lyrics.length&&c.lyrics.some(x=>x)));
    const nAfter=song.voxVoices.length, nm=song.voxVoices[1];
    const title=document.getElementById('sf-title').textContent;
    closeModal();
    undo();
    return {same, noLyr, nAfter, nm, title, nUndo:song.voxVoices.length,
      srcLyr:(song.measures[0].voxes[0][0].lyrics||[])[0]||''};
  })()`);
  T(r.same && r.noLyr && r.nAfter === 2 && r.nm === '旋律2'
    && r.title.indexOf('旋律2') >= 0 && r.nUndo === 1 && r.srcLyr === '原',
    'T5 ＋声部：复制骨架不带词 + 一步撤销 + 来源零改动', JSON.stringify(r));

  // T6 上限：满 5 声部后「＋声部」chip 消失
  r = await pg.evaluate(HELP + `(()=>{
    __mk(1);
    while(song.voxVoices.length<5) addVoice('vox');
    render();
    document.getElementById('b-fill').click();
    const n=song.voxVoices.length;
    const hasAdd=!!document.querySelector('#sf-voices [data-sfv="+"]');
    const nChip=document.querySelectorAll('#sf-voices [data-sfv]').length;
    closeModal();
    return {n, hasAdd, nChip};
  })()`);
  T(r.n === 5 && !r.hasAdd && r.nChip === 5,
    'T6 声部上限：满 5 条后「＋声部」隐藏', JSON.stringify(r));

  // T7 空来源退回空轨：按各小节实际拍号铺列（变拍谱不错位）
  r = await pg.evaluate(HELP + `(()=>{
    __mk(1,3);
    song.measures[1].beats=2; song.measures[1].unit=4;
    song.measures[1].voxes[0]=[__V(1),__V(2)];
    song.measures.forEach(m=>m.voxes[0].forEach(c=>{ c.deg=0; }));   // 来源全休止
    render();
    const ni=addLyrVoice(0);
    const lens=song.measures.map(m=>m.voxes[ni].length);
    const want=song.measures.map((m,mi)=>meaMeter(mi).beats);
    const allRest=song.measures.every(m=>m.voxes[ni].every(c=>!c.deg));
    return {ni, lens, want, ok:lens.join()===want.join(), allRest};
  })()`);
  T(r.ni === 1 && r.ok && r.allRest,
    'T7 空来源：退回空轨且按各小节实际拍号铺列（变拍不错位）', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
