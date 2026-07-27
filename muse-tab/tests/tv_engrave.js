/* v42.4 刻版结构修复回归：
   P3 复合拍号符杠成组（beamGroups：6/8·9/8·12/8 按附点四分3个八分成组；简单拍号不变）
   P1 大谱表小节线贯穿上下谱表（piano：内部/终止小节线跨谱表间隙）
   Tier0 符号：顿强 Marcato（五线谱字形+简谱 ∧，与重音区分）、sf/sfz 力度
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

  // P3 复合拍号符杠成组
  let r = await pg.evaluate(`(()=>{
    const E=()=>({dur:8,dotted:false,deg:1,acc:'',oct:0,lyrics:[],tie:false});
    const grp=(unit,beats,k)=>{ song={v:3,beats,unit,key:'C',tempo:90,capo:0,customChords:{},tabVoices:[],voxVoices:['V'],lyricLines:0,measures:[]};
      return beamGroups(Array.from({length:k},E),null).map(x=>x.idx.length); };
    return {m68:grp(8,6,6),m98:grp(8,9,9),m128:grp(8,12,12),m44:grp(4,4,8),m34:grp(4,3,6),m22:grp(2,2,8)};
  })()`);
  T(JSON.stringify(r.m68) === '[3,3]' && JSON.stringify(r.m98) === '[3,3,3]' && JSON.stringify(r.m128) === '[3,3,3,3]'
    && JSON.stringify(r.m44) === '[2,2,2,2]' && JSON.stringify(r.m34) === '[2,2,2]' && JSON.stringify(r.m22) === '[4,4]',
    'P3 复合拍号成组/简单拍号不变', JSON.stringify(r));

  // P1 大谱表小节线贯穿（跨谱表间隙的高竖线，presetPianoSolo）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    loadSong(presetPianoSolo()); const svg=document.getElementById('score');
    const tall=[...svg.querySelectorAll('line')].map(l=>({x1:+l.getAttribute('x1'),y1:+l.getAttribute('y1'),x2:+l.getAttribute('x2'),y2:+l.getAttribute('y2')}))
      .filter(l=>Math.abs(l.x1-l.x2)<0.6 && Math.abs(l.y2-l.y1)>60);
    return {bridge:tall.length, h:tall.length? Math.round(Math.abs(tall[0].y2-tall[0].y1)):0}; })()`);
  T(r.bridge >= 5 && r.h > 80, 'P1 大谱表小节线贯穿', JSON.stringify(r));

  // Marcato：五线谱字形 + 简谱 ∧，与重音区分且无报错
  r = await pg.evaluate(`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const mk=(art,staff)=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
      const s=createSong(staff?'instr':'vocal',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0,clef:'staff'});
      s.measures[0].voxes[0]=[V(3,4,{artic:art}),V(3,4),V(3,4),V(3,4)]; loadSong(s);
      return document.getElementById('score').innerHTML; };
    const aS=mk('accent',true),mS=mk('marcato',true),aJ=mk('accent',false),mJ=mk('marcato',false);
    return {staffDiff:aS!==mS, jpDiff:aJ!==mJ, clean:mS.length>1000&&!mS.includes('NaN')&&!mJ.includes('NaN')}; })()`);
  T(r.staffDiff && r.jpDiff && r.clean, 'Marcato 顿强(五线+简谱区分)', JSON.stringify(r));

  // sf/sfz 力度
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('vocal',{title:'x',key:'C',beats:4,unit:4,nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(3,4,{dyn:'sf'}),V(3,4),V(5,4,{dyn:'sfz'}),V(1,4)]; loadSong(s);
    const h=document.getElementById('score').innerHTML;
    return {sf:h.includes('>sf</text>'), sfz:h.includes('>sfz</text>'), gain:typeof DYN_GAIN.sf==='number'}; })()`);
  T(r.sf && r.sfz && r.gain, 'sf/sfz 力度', JSON.stringify(r));

  // P4 跨小节连音线续接：末音 tie 的弧线跨过小节线连到下一小节首音（而非停在本小节右缘）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[],tie:false},o||{});
    const s=createSong('instr',{title:'x',key:'C',beats:4,unit:4,nMea:2,nVox:1,lyr:0,clef:'staff'});
    s.measures[0].voxes[0]=[V(1,4),V(3,4),V(5,4),V(5,4,{tie:true})]; s.measures[1].voxes[0]=[V(5,4),V(3,4),V(1,2)];
    loadSong(s); const svg=document.getElementById('score');
    // 找 tie 弧（v50.0 起为 tieSVG 双Q闭合填充弧 M..Q..Q..Z），取跨度最大者
    const ties=[...svg.querySelectorAll('path')].map(p=>p.getAttribute('d')||'').map(d=>{const m=d.match(/^M ([\\d.-]+) [\\d.-]+ Q [\\d.-]+ [\\d.-]+ ([\\d.-]+) [\\d.-]+ Q .* Z$/);return m?{x1:+m[1],x2:+m[2]}:null;}).filter(Boolean);
    const maxSpan=ties.length?Math.max(...ties.map(t=>Math.abs(t.x2-t.x1))):0;
    return {maxSpan:Math.round(maxSpan)}; })()`);
  T(r.maxSpan >= 30, 'P4 跨小节连音线续接', JSON.stringify(r));

  // 推弦=连音线无箭头（v50.3 产品指示：连接线用连音线，方向由 b↑/b↓ 文字承载）+ 和弦图横按横杠（F/Bm 有、C/G/Am 无）
  r = await pg.evaluate(`(()=>{
    const barre = name => (chordDiagramSVG(name,0,0,1).match(/stroke-width="5\\.2"/g)||[]).length;
    if(typeof undoStack!=='undefined')undoStack.length=0;
    const s=createSong('solo',{title:'x',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0,gtype:'lead'});
    s.measures[0].tabs[0]=[{dur:4,dotted:false,chord:'',notes:[{s:3,f:7,tech:'b',tk:{mi:0,ci:1,si:3},bAmt:'full'}],strum:'',tech:''},{dur:4,dotted:false,chord:'',notes:[{s:3,f:9}],strum:'',tech:''},{dur:2,dotted:false,chord:'',notes:[{s:1,f:5}],strum:'',tech:''}];
    loadSong(s); const h=document.getElementById('score').innerHTML;
    const arrows=(h.match(/d="M [\\d.-]+ [\\d.-]+ L [\\d.-]+ [\\d.-]+ L [\\d.-]+ [\\d.-]+ Z" fill="var\\(--ink\\)"/g)||[]).length;
    const ties=(h.match(/d="M [^"]* Q [^"]* Q [^"]*Z" fill="var\\(--ink\\)"/g)||[]).length;
    return {F:barre('F'),Bm:barre('Bm'),C:barre('C'),G:barre('G'),arrows,ties}; })()`);
  T(r.F === 1 && r.Bm === 1 && r.C === 0 && r.G === 0 && r.arrows === 0 && r.ties >= 1, '推弦连音线无箭头+和弦图横按', JSON.stringify(r));

  // P2 独奏联排五线谱 treble-8vb：谱号下方「8」标记 + 记谱升八度（低音弦下加线收拢）；
  // 按「同一 x 且同一系统(y 邻近)」统计单音最深加线叠数（旧版 E2 达 7 条，treble-8vb 后 ≤4）
  r = await pg.evaluate(`(()=>{ if(typeof undoStack!=='undefined')undoStack.length=0;
    loadSong(presetSolo()); const svg=document.getElementById('score'); const h=svg.indexOf?'':document.getElementById('score').innerHTML;
    const led=[...document.getElementById('score').querySelectorAll('line')].map(l=>({x:+l.getAttribute('x1'),y:+l.getAttribute('y1'),x2:+l.getAttribute('x2'),y2:+l.getAttribute('y2')}))
      .filter(l=>Math.abs(l.y-l.y2)<0.5 && Math.abs(l.x2-l.x)>9 && Math.abs(l.x2-l.x)<22);
    // 按 (x 桶, y 桶) 聚类：同一符头的加线才叠加（y 桶隔离不同系统/上下方）
    const byXY={}; led.forEach(l=>{const k=Math.round(l.x/6)+':'+Math.round(l.y/40); byXY[k]=(byXY[k]||0)+1;});
    const maxStack=Object.keys(byXY).length? Math.max.apply(null,Object.keys(byXY).map(k=>byXY[k])) : 0;
    const hh=document.getElementById('score').innerHTML;
    return {has8:hh.indexOf('>8</text>')>=0, maxStack, clean:hh.length>1000&&hh.indexOf('NaN')<0&&hh.indexOf('undefined')<0}; })()`);
  /* v46.0 产品拍板隐藏谱号下「8」缀（记谱 +12 语义不变），不再断言 has8 */
  T(r.maxStack <= 4 && r.clean, 'P2 独奏 treble-8vb 移调记谱(8缀已隐藏)', JSON.stringify(r));

  T(errs.length === 0, '全程无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
