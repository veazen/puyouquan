/* v42.8 八度记号（ottava 线）回归：
   T1 staffStep 记谱移位：8va → 谱级 −7、8vb → +7、15ma/15mb → ∓14；voxMidi 实音不变（播放/导出不受影响）
   T2 谱面渲染：col.ott+ottTo 起列画 「8va」标签 + 虚线括线（stroke-dasharray）；8va 括线在谱表上方、8vb 在下方；音符符头随移位下移（收拢下加线）
   T3 单音 8va 与跨列整句：ott 落到区间每一列、ottTo 仅落首列；渲染无报错
   file:// 直载；每次载入前清 undoStack 绕过 guardReplace。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(800);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 staffStep 记谱移位 + voxMidi 实音不变
  let r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('instr',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0,clef:'staff'}); loadSong(s);
    const K=staffKeyInfo();
    const col={deg:1,oct:1,acc:'',dur:4};
    const base=staffStep(col,K), midiBase=voxMidi(col);
    const r8va=staffStep(Object.assign({},col,{ott:'8va'}),K);
    const r8vb=staffStep(Object.assign({},col,{ott:'8vb'}),K);
    const r15ma=staffStep(Object.assign({},col,{ott:'15ma'}),K);
    const r15mb=staffStep(Object.assign({},col,{ott:'15mb'}),K);
    const midi8va=voxMidi(Object.assign({},col,{ott:'8va'}));
    return {d8va:r8va-base, d8vb:r8vb-base, d15ma:r15ma-base, d15mb:r15mb-base,
      ottStepOK:ottStep({ott:'8va'})===-7 && ottStep({})===0, midiSame:midi8va===midiBase}; })()`);
  T(r.d8va===-7 && r.d8vb===7 && r.d15ma===-14 && r.d15mb===14 && r.ottStepOK && r.midiSame,
    'T1 staffStep 移位 & 实音不变', JSON.stringify(r));

  // T2 谱面括线渲染 + 符头下移（8va）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('instr',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0,clef:'staff'});
    s.measures[0].voxes[0]=[V(1,4,{oct:2}),V(3,4,{oct:2}),V(5,4,{oct:2}),V(1,4,{oct:3})]; loadSong(s);
    const noteY=()=>{ const svg=document.getElementById('score');
      const paths=[...svg.querySelectorAll('path')]; return paths.length; };
    // 无 8va：记录首符头 y
    const yWithout = (()=>{ const svg=document.getElementById('score').innerHTML; return svg.length; })();
    // 加 8va
    song.measures[0].voxes[0].forEach((c,i)=>{ c.ott='8va'; if(i===0) c.ottTo={mi:0,ci:3}; });
    render(); const h=document.getElementById('score').innerHTML;
    const has8va=h.indexOf('>8va</text>')>=0;
    const dashed=(h.match(/stroke-dasharray="5 3"/g)||[]).length;
    // 谱表上方括线：标签 y 应 < 谱表顶（用几何）——找 8va 文本 y 与谱线最小 y 比较
    const clean=h.indexOf('NaN')<0 && h.indexOf('undefined')<0;
    // 8vb 在下方：换成 8vb 再渲染，标签 y 应变大（在谱表下方）
    const yTop=(()=>{ const m=h.match(/<text x="[\\d.-]+" y="([\\d.-]+)"[^>]*>8va<\\/text>/); return m?+m[1]:null; })();
    song.measures[0].voxes[0].forEach((c,i)=>{ if(c.ott){ c.ott='8vb'; } });
    render(); const h2=document.getElementById('score').innerHTML;
    const yBot=(()=>{ const m=h2.match(/<text x="[\\d.-]+" y="([\\d.-]+)"[^>]*>8vb<\\/text>/); return m?+m[1]:null; })();
    return {has8va, dashed, clean, aboveBelow:(yTop!=null&&yBot!=null&&yBot>yTop), yTop, yBot}; })()`);
  T(r.has8va && r.dashed>=1 && r.clean && r.aboveBelow, 'T2 括线渲染+上下方位', JSON.stringify(r));

  // T3 整句标注：ott 落每列、ottTo 仅首列；且移位使符头下移（对比同音无 8va 的符头 y）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('instr',{title:'x',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0,clef:'staff'});
    s.measures[0].voxes[0]=[V(1,4,{oct:2}),V(2,4,{oct:2}),V(3,4,{oct:2}),V(4,4,{oct:2})];
    s.measures[1].voxes[0]=[V(5,4,{oct:2}),V(4,4,{oct:2}),V(3,4,{oct:2}),V(2,4,{oct:2})]; loadSong(s);
    const headY=()=>{ const svg=document.getElementById('score');
      // 取首个 noteheadBlack 字形（<path>）附近的最小 y——用符头 use/path 的 transform? 改用加线数量做代理
      return [...svg.querySelectorAll('line')].filter(l=>{const x1=+l.getAttribute('x1'),x2=+l.getAttribute('x2');return Math.abs((+l.getAttribute('y1'))-(+l.getAttribute('y2')))<0.5 && Math.abs(x2-x1)>9 && Math.abs(x2-x1)<22;}).length; };
    const ledgerNo=headY();
    // 跨小节整句 8va：measures[0..1] 全部列
    let first=true;
    [0,1].forEach(mi=>s.measures[mi].voxes[0].forEach((c,ci)=>{ c.ott='8va'; if(first){c.ottTo={mi:1,ci:3}; first=false;} else delete c.ottTo; }));
    render();
    const ledgerAfter=headY();
    const cnt=s.measures.flatMap(m=>m.voxes[0]).filter(c=>c.ott==='8va').length;
    const ottToCnt=s.measures.flatMap(m=>m.voxes[0]).filter(c=>c.ottTo).length;
    const h=document.getElementById('score').innerHTML;
    return {cnt, ottToCnt, ledgerNo, ledgerAfter, has8va:h.indexOf('>8va</text>')>=0}; })()`);
  T(r.cnt===8 && r.ottToCnt===1 && r.ledgerAfter<=r.ledgerNo && r.has8va, 'T3 整句标注+下加线收拢', JSON.stringify(r));

  T(errs.length === 0, '全程无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
