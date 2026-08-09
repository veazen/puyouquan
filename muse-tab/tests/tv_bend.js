/* 推弦谱面/交互回归（v50.3 规格重写；原套件断言停留在 v43.3——
   v49.8 只保留 b↑/b↓、v49.9 去幅度标注、v50.3 连接线改连音线去箭头，逐条对齐现规格；
   v53.1 弧线低平化+圆圈缩小：撤「弧顶钳到谱上方」，弧贴数字上缘不穿邻弦，
   圆圈 5.8→5、目标数字缩号入圈——几何断言见 T1/T5）：
   T1 两音推弦=连音线（tieSVG 双Q闭合填充弧）+ 圆圈目标音 + b↑ 文字，全谱无箭头三角；
      弧顶 qy=min(yy,y2)−12（低平，不飞到谱上方）、b↑ 文字仍在谱表上方
   T2 回落 bd 同为连音线 + b↓ 文字（与 b 仅文字之别）；旧数据 bendType='pre' 有竖直线且无箭头
   T3 bendFromBar：单音点推弦=就地标记（无 tk/bendType）；双音多选=tech+tk
   T4 同两音再点=取消（清 tech/tk/bendType）
   file:// 直载；载入前清 undoStack。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  // 箭头=从 M 起正好三点的闭合三角（锚定 d 开头——符杠是四点 L..L..L..Z 不会误匹配）
  const ARROW = /d="M [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+ Z" fill="var\(--ink\)"/g;
  // 连音线=tieSVG 双二次曲线闭合填充弧
  const TIE = /d="M [^"]* Q [^"]* Q [^"]*Z" fill="var\(--ink\)"/g;

  const mkSong = `const mk=(o)=>({dur:o.dur||4,dotted:false,chord:'',notes:o.notes||[],strum:'',tech:''});`;

  // T1 两音推弦=连音线+圆圈+b↑，无箭头三角
  let r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    ${mkSong}
    const s=createSong('solo',{title:'x',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
    s.measures[0].tabs[0]=[mk({notes:[{s:3,f:7,tech:'b',tk:{mi:0,ci:1,si:3}}]}),
      mk({notes:[{s:3,f:9}]}),mk({dur:2,notes:[{s:1,f:5}]})]; loadSong(s);
    const h=document.getElementById('score').innerHTML;
    const cm=h.match(/<circle cx="([\\d.]+)" cy="([\\d.]+)" r="5"/);
    const tieM=h.match(${TIE});
    const tk2=tieM? tieM[0].match(/d="([^"]+)"/)[1].split(/[MQZ\\s]+/).filter(Boolean).map(Number) : null;
    const btm=h.match(/y="([\\d.-]+)"[^>]*>b↑<\\/text>/);
    return {arrows:(h.match(${ARROW})||[]).length, ties:(tieM||[]).length,
      circle:!!cm, bUp:h.indexOf('>b↑</text>')>=0,
      big:/font-size="12\\.5"[^>]*>b↑<\\/text>/.test(h),   // v50.5 推弦记号放大：12.5/700
      /* v53.1 几何：3弦→3弦推弦，弧顶 qy=cy−12（低平贴数字，不再钳到谱上方 tabTop−10=cy−28）；
         b↑ 文字仍在谱表上方（≤cy−2×弦距−7） */
      lowArc: cm&&tk2? Math.abs(tk2[3]-(+cm[2]-12))<0.2 : false,
      txUp: cm&&btm? (+btm[1] <= +cm[2]-25) : false,
      clean:h.indexOf('NaN')<0 && h.indexOf('undefined')<0}; })()`);
  T(r.arrows === 0 && r.ties >= 1 && r.circle && r.bUp && r.big && r.lowArc && r.txUp && r.clean,
    'T1 两音推弦=连音线+圆圈+b↑ 低平弧不穿邻弦', JSON.stringify(r));

  // T2 回落 bd=连音线+b↓；旧数据 pre 有竖直线且无箭头
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    ${mkSong}
    const s=createSong('solo',{title:'x',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
    s.measures[0].tabs[0]=[mk({notes:[{s:3,f:9,tech:'bd',tk:{mi:0,ci:1,si:3}}]}),
      mk({notes:[{s:3,f:7}]}),mk({dur:2,notes:[{s:3,f:7,tech:'b',bendType:'pre',bAmt:'1/2'}]})]; loadSong(s);
    const h=document.getElementById('score').innerHTML;
    return {arrows:(h.match(${ARROW})||[]).length, ties:(h.match(${TIE})||[]).length,
      bDn:h.indexOf('>b↓</text>')>=0, noFrac:h.indexOf('>½</text>')<0 && h.indexOf('>full</text>')<0,
      clean:h.indexOf('NaN')<0 && h.indexOf('undefined')<0}; })()`);
  T(r.arrows === 0 && r.ties >= 1 && r.bDn && r.noFrac && r.clean, 'T2 回落b↓连音线+pre旧数据无箭头无幅度文字', JSON.stringify(r));

  // T3 bendFromBar 单音=就地标记 / 双音=tech+tk
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    ${mkSong}
    const s=createSong('solo',{title:'x',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
    s.measures[0].tabs[0]=[mk({notes:[{s:3,f:7}]}),mk({notes:[{s:3,f:9}]}),mk({dur:2,notes:[{s:1,f:5}]})]; loadSong(s);
    sel={mi:0,row:'tab',vi:0,ci:0,si:3}; noteSel=[]; bendFromBar('b');
    const n0=s.measures[0].tabs[0][0].notes[0];
    const single={tech:n0.tech, noTk:!n0.tk, noTy:!n0.bendType};
    if(typeof undoStack!=='undefined')undoStack.length=0;
    const s2=createSong('solo',{title:'y',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
    s2.measures[0].tabs[0]=[mk({notes:[{s:3,f:7}]}),mk({notes:[{s:3,f:9}]}),mk({dur:2,notes:[{s:1,f:5}]})]; loadSong(s2);
    sel={mi:0,row:'tab',vi:0,ci:0,si:3};
    noteSel=[{row:'tab',mi:0,ci:0,vi:0,si:3},{row:'tab',mi:0,ci:1,vi:0,si:3}]; bendFromBar('b');
    const m0=s2.measures[0].tabs[0][0].notes[0];
    return {single, dbl:{tech:m0.tech, tk:!!m0.tk, noTy:!m0.bendType}}; })()`);
  T(r.single.tech==='b' && r.single.noTk && r.single.noTy && r.dbl.tech==='b' && r.dbl.tk && r.dbl.noTy,
    'T3 单音就地标记 / 双音tech+tk', JSON.stringify(r));

  // T5 目标音数字缩号入圈（v53.1 圆圈 r=5：两位数 6.8 / 一位数 8.6）；非目标两位数保持 10.5
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    ${mkSong}
    const s=createSong('solo',{title:'x',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
    s.measures[0].tabs[0]=[mk({dur:8,notes:[{s:3,f:9,tech:'b',tk:{mi:0,ci:1,si:3}}]}),
      mk({dur:8,notes:[{s:3,f:12}]}),
      mk({dur:8,notes:[{s:2,f:5,tech:'b',tk:{mi:0,ci:3,si:2}}]}),
      mk({dur:8,notes:[{s:2,f:7}]}),
      mk({dur:2,notes:[{s:3,f:12}]})]; loadSong(s);
    const h=document.getElementById('score').innerHTML;
    return {circle:h.indexOf('r="5"')>=0, noOld:h.indexOf('r="5.8"')<0,
      small:/font-size="6\\.8"[^>]*>12<\\/text>/.test(h),
      small1:/font-size="8\\.6"[^>]*>7<\\/text>/.test(h),
      normal:/font-size="10\\.5"[^>]*>12<\\/text>/.test(h),
      clean:h.indexOf('NaN')<0}; })()`);
  T(r.circle && r.noOld && r.small && r.small1 && r.normal && r.clean,
    'T5 目标数字缩号入圈(两位6.8/一位8.6)·圆圈r=5·非目标保持10.5', JSON.stringify(r));

  // T4 同两音再点=取消
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    ${mkSong}
    const s=createSong('solo',{title:'x',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
    s.measures[0].tabs[0]=[mk({notes:[{s:3,f:7,tech:'b',tk:{mi:0,ci:1,si:3},bendType:'rel',bAmt:'full'}]}),
      mk({notes:[{s:3,f:9}]}),mk({dur:2,notes:[{s:1,f:3}]})]; loadSong(s);
    sel={mi:0,row:'tab',vi:0,ci:0,si:3};
    noteSel=[{row:'tab',mi:0,ci:0,vi:0,si:3},{row:'tab',mi:0,ci:1,vi:0,si:3}]; bendFromBar('b');
    const n0=s.measures[0].tabs[0][0].notes[0];
    return {cleared:!n0.bendType && !n0.tech && !n0.tk}; })()`);
  T(r.cleared, 'T4 取消推弦清 bendType', JSON.stringify(r));

  T(errs.length === 0, '全程无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
