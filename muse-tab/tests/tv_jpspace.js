/* v60.52 简谱横向避让回归（用户报告：①简谱临时变拍号与小节线重叠；②编辑时音符不避开
   升降号和双倚音导致重叠）。全部用几何断言（SVG getBBox 数值坐标），不看截图：
   T1 变拍号不压小节线：拍号 bbox 左边缘在小节线右侧，且不与右侧首音符相撞
   T2 纯简谱谱（无 TAB/五线谱声部）变拍处同样预留（此前 needTS=false → 零预留）
   T3 变化音净空：32 分极密排下 ♯ 与前一列数字保持出版级最小净空（≥8px）——如实区分：
      变化音此前是「间距不足贴字」（旧版实测 5.9–7.1px），倚音才是严格重叠（见 T4）
   T4 双倚音净空：倚音组数字与共用减时线左端都不侵入前一列数字
   T5 倚音+变化音同列（左伸叠加最大情形）：三倚音 + ♭♭ 仍不重叠
   T6 小节首列左伸不压小节线
   T7 无左伸元素的普通谱面不被这版加宽（护栏：同曲仅去掉 acc/倚音，宽度不增）
   对 v60.51 旧文件跑：T1/T3/T4 当场红（突变实证）。file:// 直载。 */
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

  /* 页面内共用测量工具：bbox / 竖直小节线 x / 按字号取文本 */
  const HELP = `
    window.__V=(deg,o)=>Object.assign({dur:4,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    window.__bb=el=>{const q=el.getBBox();return {x:+q.x.toFixed(1), r:+(q.x+q.width).toFixed(1)};};
    window.__texts=()=>[...document.querySelectorAll('#score text')];
    window.__bars=()=>[...document.querySelectorAll('#score line')]
      .filter(l=>Math.abs(+l.getAttribute('x1')-+l.getAttribute('x2'))<.3
        && Math.abs(+l.getAttribute('y2')-+l.getAttribute('y1'))>8)
      .map(l=>+(+l.getAttribute('x1')).toFixed(1)).sort((a,c)=>a-c);
    window.__digits=()=>__texts().filter(x=>x.getAttribute('font-size')==='16.5').map(x=>({t:x.textContent,...__bb(x)}));
    window.__prevDigit=x=>__digits().filter(d=>d.r<=x+3).sort((p,q)=>q.r-p.r)[0];
    window.__graceLines=()=>[...document.querySelectorAll('#score line')]
      .filter(l=>l.getAttribute('stroke-width')==='0.8' && Math.abs(+l.getAttribute('y1')-+l.getAttribute('y2'))<.3)
      .map(l=>({x:+(+l.getAttribute('x1')).toFixed(1), r:+(+l.getAttribute('x2')).toFixed(1)}));`;

  // T1/T2 变拍号（T1 弹唱谱有 TAB；T2 纯简谱谱）
  let r = await pg.evaluate(HELP + `(()=>{
    const mk=(withTab)=>{
      const s=createSong(withTab?'tanchang':'vocal',
        {beats:4,unit:4,key:'C',nMea:3,nVox:1,lyr:0,nTab:withTab?1:0});
      s.measures[0].voxes[0]=[__V(1),__V(2),__V(3),__V(5)];
      s.measures[1].beats=2; s.measures[1].unit=4;
      s.measures[1].voxes[0]=[__V(1),__V(2)];
      s.measures[2].voxes[0]=[__V(1),__V(2),__V(3),__V(5)];
      loadSong(s); blurSel=true; render();
      const ts=__texts().filter(x=>x.textContent==='2/4').map(__bb)[0];
      if(!ts) return {miss:1};
      const bars=__bars();
      /* 重叠的本质＝有竖线穿过拍号字身（此前 anchor=middle 时小节线正落在字身里） */
      const crossing=bars.filter(x=>x>ts.x-0.5 && x<ts.r+0.5);
      const barL=bars.filter(x=>x<ts.x).sort((p,q)=>q-p)[0];
      const nextD=__digits().filter(d=>d.x>ts.x).sort((p,q)=>p.x-q.x)[0];
      return {miss:0, tsX:ts.x, tsR:ts.r, barL, crossing:crossing.length,
        overBar:+(ts.x-barL).toFixed(1), toNote: nextD? +(nextD.x-ts.r).toFixed(1) : 99};
    };
    return {tab:mk(true), jp:mk(false)};
  })()`);
  T(!r.tab.miss && r.tab.crossing === 0 && r.tab.overBar > 1 && r.tab.toNote > 1,
    'T1 变拍号不压小节线（弹唱谱：无竖线穿过字身、右侧不撞音符）', JSON.stringify(r.tab));
  T(!r.jp.miss && r.jp.crossing === 0 && r.jp.overBar > 1 && r.jp.toNote > 1,
    'T2 纯简谱谱变拍同样预留（此前 needTS=false 零预留）', JSON.stringify(r.jp));

  // T3 32 分极密排：变化音净空达出版级最小值（旧版 7.1px 贴字 → 红）
  r = await pg.evaluate(HELP + `(()=>{
    const V32=(deg,o)=>Object.assign(__V(deg,o),{dur:32});
    const s=createSong('vocal',{beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0});
    const m=[]; for(let i=0;i<32;i++) m.push(V32((i%7)+1, i%8===5?{acc:'#'}:{}));
    s.measures[0].voxes[0]=m;
    loadSong(s); blurSel=true; render();
    const accs=__texts().filter(x=>x.textContent==='♯').map(__bb);
    const gaps=accs.map(a=>{const p2=__prevDigit(a.x); return p2? +(a.x-p2.r).toFixed(1) : 99;});
    return {n:accs.length, minGap:Math.min(...gaps)};
  })()`);
  T(r.n >= 4 && r.minGap >= 8, 'T3 变化音净空（32 分极密排 ♯ 净空≥8px 出版下限）', JSON.stringify(r));

  // T4 双倚音净空（16 分密排，旧版实测重叠 −2.9px）
  r = await pg.evaluate(HELP + `(()=>{
    const V16=(deg,o)=>Object.assign(__V(deg,o),{dur:16});
    const s=createSong('vocal',{beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[
      V16(1),V16(2),V16(3),V16(4),
      V16(6),V16(5,{acc:'#'}),V16(6),V16(3),
      V16(4),V16(3,{grace:{notes:[{deg:4},{deg:5}],dur:16}}),V16(2),V16(1),
      V16(5),V16(6),V16(7),V16(1,{oct:1})];
    loadSong(s); blurSel=true; render();
    const acc=__texts().filter(x=>x.textContent==='♯').map(__bb)[0];
    const g=__texts().filter(x=>x.getAttribute('font-size')==='8.5').map(__bb).sort((p,q)=>p.x-q.x)[0];
    const gl=__graceLines().sort((p,q)=>p.x-q.x)[0];
    const pa=__prevDigit(acc.x), pg2=__prevDigit(g.x), pl=__prevDigit(gl.x);
    return {accGap:+(acc.x-pa.r).toFixed(1), accPrev:pa.t,
      grGap:+(g.x-pg2.r).toFixed(1), grPrev:pg2.t,
      glGap:+(gl.x-pl.r).toFixed(1), glPrev:pl.t};
  })()`);
  T(r.grGap > 1.5 && r.glGap > 1.5 && r.accGap > 1.5,
    'T4 双倚音净空（组数字与共用减时线左端均不侵入前列；旧版 −2.9px 重叠）', JSON.stringify(r));

  // T5 左伸叠加最大：三倚音 + ♭♭ 同列
  r = await pg.evaluate(HELP + `(()=>{
    const V8=(deg,o)=>Object.assign(__V(deg,o),{dur:8});
    const s=createSong('vocal',{beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V8(1),V8(2),V8(3),
      V8(6,{acc:'bb', grace:{notes:[{deg:2},{deg:3},{deg:5}],dur:16}}),
      V8(5),V8(4),V8(3),V8(2)];
    loadSong(s); blurSel=true; render();
    const acc=__texts().filter(x=>x.textContent==='♭♭').map(__bb)[0];
    const g=__texts().filter(x=>x.getAttribute('font-size')==='8.5').map(__bb).sort((p,q)=>p.x-q.x)[0];
    const gl=__graceLines().sort((p,q)=>p.x-q.x)[0];
    const leftMost=Math.min(acc? acc.x:1e9, g.x, gl.x);
    const prev=__prevDigit(leftMost);
    return {hasAcc:!!acc, leftMost:+leftMost.toFixed(1), prev:prev.t, gap:+(leftMost-prev.r).toFixed(1)};
  })()`);
  T(r.hasAcc && r.gap > 1.5, 'T5 三倚音＋♭♭ 同列（左伸叠加最大情形不重叠）', JSON.stringify(r));

  // T6 小节首列左伸不压小节线
  r = await pg.evaluate(HELP + `(()=>{
    const s=createSong('vocal',{beats:4,unit:4,key:'C',nMea:2,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[__V(1),__V(2),__V(3),__V(5)];
    s.measures[1].voxes[0]=[__V(5,{acc:'#', grace:{notes:[{deg:1},{deg:2}],dur:16}}),__V(4),__V(3),__V(2)];
    loadSong(s); blurSel=true; render();
    const g=__texts().filter(x=>x.getAttribute('font-size')==='8.5').map(__bb).sort((p,q)=>p.x-q.x)[0];
    const gl=__graceLines().sort((p,q)=>p.x-q.x)[0];
    const leftMost=Math.min(g.x, gl.x);
    const barL=__bars().filter(x=>x<leftMost).sort((p,q)=>q-p)[0];
    return {leftMost:+leftMost.toFixed(1), barL, gap: barL!=null? +(leftMost-barL).toFixed(1) : 99};
  })()`);
  T(r.gap > 1.5, 'T6 小节首列倚音/变化音不压小节线', JSON.stringify(r));

  // T7 护栏：无左伸元素的普通谱面宽度不被这版加宽
  r = await pg.evaluate(HELP + `(()=>{
    const build=(withAcc)=>{
      const s=createSong('vocal',{beats:4,unit:4,key:'C',nMea:1,nVox:1,lyr:0});
      s.measures[0].voxes[0]=[__V(1),__V(2),__V(3),__V(5)].map(c=>
        withAcc&&c.deg===3? Object.assign({},c,{acc:'#'}) : c);
      loadSong(s); blurSel=true; render();
      return measureLayout(song.measures[0]).w;
    };
    const plain=build(false), withAcc=build(true);
    return {plain:+plain.toFixed(1), withAcc:+withAcc.toFixed(1)};
  })()`);
  T(r.plain > 0 && r.withAcc >= r.plain && r.withAcc - r.plain < 40,
    'T7 护栏：普通谱面不被加宽，带变化音仅有界变宽（<40px）', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
