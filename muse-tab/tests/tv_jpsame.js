/* v67.1 简谱联排行（song.tabJp：吉他谱 TAB 上方同源简谱行）与简谱声部同一套刻版代码（负责人：「吉他谱映射的简谱为什么直接制作的简谱样式不一样？能否做到一致？」）
   实现：简谱声部的单音字形抽成共享函数（jpHeadSVG / jpMarksSVG / jpDashesSVG / jpBeamSVG / jpTieArcSVG / jpTieInSVG / tupArcSVG / jpArcBase），
   TAB 每列先翻成「虚拟简谱列」（tabJpCols），两边走同一组函数；measureLayout 给联排行登记 j 带；纵向 jpRowExtras 逐系统逐声部按真实墨迹。
   T1 同源对拍：同一段旋律一份写成简谱声部、一份写成 TAB 点亮联排行（同一首谱、同一版面），两行字形元素按各自数字基线归一化后多重集合完全相同——
      覆盖 ♯、八度 ±1～±3、八分/十六分/三十二分/六十四分成组减时线（含同拍休止）、附点、二分/附点二分/全音/附点全音/双附点二分增时线（qxs 拍位）、
      同小节/跨小节/跨行连音线、三连音弧、反复/段落/终止线、𝄎
   T2 逐字节护栏（红线）：未点亮 tabJp 的谱（16 预设 + 简谱声部全分支压力谱 + 非整数疏密/行距 + 落单十六分 + 选中增时线拍位），1280/390 宽——
      设 MUSETAB_REF=参考版页面 URL 时与参考版 #score 逐字节对拍；不设时做自洽：同一谱「关 → 开 → 关」前后逐字节相同、无 TAB 的谱开关 tabJp 逐字节相同
   T3 几何零相交（1280/390 宽，36 个场景）：联排行墨迹与谱面其他墨迹（TAB 品位/技法字母/和弦名/和弦图/房子括线/排练/𝄋/转调/推弦/标注/let ring/第二轨……）
      相交数 0；联排行内部（数字/变化音/点/弧）互不相交；数字一律 17 号 font-ui
   T4 纵向净距：联排行墨迹底 → 下方 TAB 顶线/顶部标注 ≥ 4px；联排行墨迹顶 → 上方元素（和弦图、上一条 TAB 声部、联排五线谱）≥ 5px
      （净距按真墨框 __inkT 量：文字取 canvas 字形实框——__ink 的字身盒 13%～95% 口径对无下伸部的数字底边多算约 3.4px）
   T5 横向：半音阶十六分在压缩档（wf 0.3 / 疏密 0.6）♯/♭ 不压前一个数字、数字两两不相碰；长音增时线不越过小节线（未点亮时版面不变由 T2 逐字节保证）
   T6 连音线：尤克里里重入 G 弦、Drop D、逐轨夹位混用都画弧（tuningOf / 夹位差）；三列连续同音连音只画一条弧；高八度让位按 keyRefAt 与夹位差折算
   T7 不发音高但发声的列（无和弦形扫弦 / 全 × 闷音 / 打板）写 17 号「X」并照常连杠、画增时线；泛音唱名按播放口径（自然泛音 12/7/5/4 品 + 人工泛音）
   T8 导出 svgResolveVars 后联排行无 var(-- 残留；播放块（整谱模式 meaBands / 单轨 SOLO 模式 colBoxes）覆盖联排行；行首连线覆盖联排行
   —— 验收补（对抗式验收 21 条发现；对实现者版本 14/25、T3/T4/T9～T15 共 11 条红，修后全绿）——
   T3/T4 新增 15 个场景：延长号（含文字和弦名 / 第 2 轨）、扫弦切音点、跨弦两音技法 / 跨弦连音线、预推 b↑、⊕ 实高、D.S./Fine（第 1 轨 TAB 下方）、
      第 2 轨联排连音弧 vs 第 1 轨符杠、三行联排（低音+旋律成组八分 / Drop D 加线 / 中音区十六分）、附点 vs 下一音 ♯、组内连音线 × 连音弧、编辑态拍数错误「!」
   T9  双 TAB：第 1 轨拍选热区下缘到第 2 轨联排行最高墨迹 ≥3px
   T10 变化音拼写＝简谱声部（respellNote 同表：改记谱调 auto / 固定调导入按原调号方向 song.spellDir / 声部已有写法优先 / 无声部 ♯1 ♭3 ♯4 ♯5 ♭7）
   T11 GP5 二进制 + GPIF 导入泛音类型（人工 / 点弦 / 拨片 / 半泛音）逐一映射，联排行唱名按发声音高
   T12 切音扫弦（md/mu）与切音 ×（x）同写 X；普通扫弦取和弦最高音
   T13 长休止逐拍写 0（GB：0 0 / 0 0 0 / 0 0 0 0），补写的 0 落在拍位列
   T14 组内连音线 × 连音弧：连音弧抬一档（联排行 / 简谱声部同口径），声部上方空间同抬
   T15 render 外 layoutSystems 的和弦回溯次数 O(小节数)（此前逐列回溯 O(n²)，稻香 render 外量版面 126ms → 20ms）
   突变实证：对 v67.0 原版（MUSETAB_URL=…/v670.html）跑 4/25：T1a/T1b（各两宽）T3 T4（各两宽）T5 T6a T6b T6c T7a T7b T8b T8c T10～T14 报红；
   T2（逐字节护栏）、T8a（导出无 var(--）、T9（v67.0 两轨间另有 tabGap2）、T15（v67.0 量版面不算联排列）两版都绿。
   对实现者版本（验收前，…/fix-jp/impl/impl.html）跑 14/25：T3 T4（各两宽）与 T9～T15 报红。T2 灵敏度：把简谱声部减时线 y 改结合顺序 ${y+(3.4+u*3.2)}、
   或给附点 cy 加 toFixed(1)，设 MUSETAB_REF=v67.0 跑 T2 当场红（压力谱 stressVocal 首处即不同）。 */
const { chromium } = require('playwright');
const path = require('path');
const F = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const REF = process.env.MUSETAB_REF || '';

/* ---------- 页面内助手（只用 v67.0 与本版都有的全局函数 / 识别只看谱面 DOM） ---------- */
const HELP = `(()=>{
  window.guardReplace=p=>p(); window.SF_PLAYWAIT=false; try{ hideStartPad(); }catch(_){}
  const sv=()=>document.getElementById('score');
  window.__V=(deg,dur,o)=>Object.assign({dur, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false}, o||{});
  window.__T=(dur,notes,o)=>Object.assign({dur, dotted:false, chord:'', notes:notes||[], strum:'', tech:''}, o||{});
  /* 可见墨迹（排除热区 / 选区 / 纸色断口 / 页底） */
  window.__vis=el=>{ if(el.closest('title')) return false; const f=el.getAttribute('fill');
    if(el.tagName==='rect' && (f==='transparent' || (f||'').includes('accent') || el.classList.contains('pagebg') || f==='var(--paper)')) return false;
    if((el.getAttribute('opacity')||'1')==='0' || (el.getAttribute('fill-opacity')||'1')==='0' && el.tagName==='rect') return false;
    if(el.tagName==='text' && !el.textContent.trim()) return false;
    if(el.closest('g.meah') || el.closest('g.sysbtn')) return false;
    return true; };
  /* 墨迹框：文字取字身盒内的墨迹带（同 tv_lrspan / tv_tiemap 口径），线条按线宽外扩 */
  window.__ink=el=>{ const r=el.getBoundingClientRect();
    if(el.tagName==='text') return {l:r.left, r:r.right, t:r.top+r.height*0.13, b:r.top+r.height*0.95};
    if(el.tagName==='line'){ const w=(+el.getAttribute('stroke-width')||1)/2; return {l:r.left-w, r:r.right+w, t:r.top-w, b:r.bottom+w}; }
    return {l:r.left, r:r.right, t:r.top, b:r.bottom}; };
  window.__hit=(a,b)=>Math.min(a.r,b.r)-Math.max(a.l,b.l)>0.3 && Math.min(a.b,b.b)-Math.max(a.t,b.t)>0.3;
  /* 真墨框（T4 纵向净距用）：文字按 canvas measureText 的字形实框（同字体 / 字号 / 字重 / 斜体，基线 y 起算），其余同 __ink。
     __ink 的文字口径取字身盒 13%～95%，对无下伸部的数字底边多算约 3.4px（17 号）——量净距时会把真实 5px 报成 1.6px */
  { const cx=document.createElement('canvas').getContext('2d'), cs=getComputedStyle(document.documentElement);
    const rv=v=>(v||'').replace(/var\((--[\w-]+)\)/g,(m,n)=>cs.getPropertyValue(n).trim());
    window.__inkT=el=>{ if(el.tagName!=='text') return __ink(el);
      const a=n=>el.getAttribute(n), fs=+a('font-size')||16, ff=rv(a('font-family'))||getComputedStyle(el).fontFamily;
      cx.font=(a('font-style')||'normal')+' '+(a('font-weight')||'400')+' '+fs+'px '+ff; const an=a('text-anchor'); cx.textAlign= an==='middle'?'center': an==='end'?'right':'left';
      const m=cx.measureText(el.textContent), x=+a('x'), y=+a('y'), M=el.getScreenCTM();
      const P=(u,v)=>({x:M.a*u+M.c*v+M.e, y:M.b*u+M.d*v+M.f}), p1=P(x-m.actualBoundingBoxLeft, y-m.actualBoundingBoxAscent), p2=P(x+m.actualBoundingBoxRight, y+m.actualBoundingBoxDescent);
      return {l:Math.min(p1.x,p2.x), r:Math.max(p1.x,p2.x), t:Math.min(p1.y,p2.y), b:Math.max(p1.y,p2.y)}; }; }
  window.__jpEls=vi=>[...sv().querySelectorAll('g[data-tabjp'+(vi==null?'':'="'+vi+'"')+'] *')].filter(__vis);
  window.__jpDigits=vi=>[...sv().querySelectorAll('g[data-tabjp'+(vi==null?'':'="'+vi+'"')+'] text')].filter(t=>/^[0-7X]$/.test(t.textContent) && !t.classList.contains('jptup'));
  /* 元素 → 相对基线 y0 的规范签名（x 原值、y 减基线，2 位小数；去掉 class/data-*，路径逐坐标对归一） */
  const R2=v=>(+v).toFixed(2);
  window.__sig=(el,y0)=>{ const a={}; for(const at of el.attributes) a[at.name]=at.value; const o=[el.tagName];
    const Y=v=>R2((+v)-y0);
    if(el.tagName==='text') o.push(R2(a.x), Y(a.y), a['font-size'], a['font-weight']||'', a['font-family']||'', a['font-style']||'', a['text-anchor']||'', el.textContent);
    else if(el.tagName==='circle') o.push(R2(a.cx), Y(a.cy), a.r);
    else if(el.tagName==='line') o.push(R2(a.x1), Y(a.y1), R2(a.x2), Y(a.y2), a['stroke-width'], a.opacity||'');
    else if(el.tagName==='rect') o.push(R2(a.x), Y(a.y), R2(a.width), R2(a.height), a.fill||'');
    else if(el.tagName==='path'){ const nums=(a.d||'').match(/-?[\\d.]+/g)||[]; o.push((a.d||'').replace(/-?[\\d.]+/g,'#'), nums.map((v,i)=>i%2? Y(v) : R2(v)).join(','), a['stroke-width']||'', a.fill||''); }
    else o.push(el.outerHTML.length);
    return o.join('|'); };
  /* 签名多重集合配对：骨架（非数字部分）相同且每个数字差 ≤ tol 即配上（toFixed(1) 落在不同基线上的舍入差 ≤0.05） */
  window.__split=sg=>({k:sg.replace(/-?\\d+(\\.\\d+)?/g,'#'), n:(sg.match(/-?\\d+(\\.\\d+)?/g)||[]).map(Number)});
  window.__pair=(A,B,tol)=>{ const bb=B.map(__split), used=new Array(bb.length).fill(false), onlyA=[];
    A.forEach(sa=>{ const a=__split(sa); let hit=-1;
      for(let i=0;i<bb.length;i++){ if(used[i] || bb[i].k!==a.k || bb[i].n.length!==a.n.length) continue;
        if(a.n.every((v,j)=>Math.abs(v-bb[i].n[j])<=tol)){ hit=i; break; } }
      if(hit>=0) used[hit]=true; else onlyA.push(sa); });
    return {onlyA, onlyB:B.filter((_,i)=>!used[i])}; };
  /* 某系统 TAB 顶线（strcell 口径）与符干底 stemY（tabBot+12+tabExtra）：简谱声部窗口只收 stemY+6 以下的墨迹（TAB 符干/符杠/连音括线都在其上） */
  window.__tabTops=vi=>{ const ys=[...new Set([...sv().querySelectorAll('rect.strcell[data-vi="'+(vi||0)+'"][data-si="1"]')].map(r=>+(+r.getAttribute('y')+4.5).toFixed(2)))]; return ys.sort((a,b)=>a-b); };
  return true; })()`;

/* ---------- T1 同源旋律：MIDI + 时值（C 调，1=C4）；定弦自定（1 弦 E5 / 6 弦 E1）以便 TAB 能写出八度 +3 / −3 ---------- */
const T1SONG = `((NOVOX, SIX)=>{
  const TUN=[76,59,55,50,45,28];          // 1 弦 E5 … 6 弦 E1（tuningOf() 读 song.tuning）
  const FR=m=>{ let best=null; TUN.forEach((t,i)=>{ const f=m-t; if(f>=0 && f<=24 && (!best || f<best.f)) best={s:i+1,f}; }); return best; };
  /* 事件：[时值, MIDI|null, 选项{dot, tup, tie(连到下一音)}] */
  const E=(d,m,o)=>Object.assign({d,m},o||{});
  const MEL = SIX? [
    [E(1,62,{dot:1})],                                                                              // 6/4：附点全音（5 条增时线）
    [E(2,60),E(2,64,{tie:1}),E(2,64)],                                                               // 二分增时线 + 同小节连音
  ] : [
    [E(8,60),E(8,62),E(16,64),E(16,66),E(16,67),E(16,72),E(4,55,{dot:1}),E(8,57,{tie:1})],          // 八分组 / 十六分组（♯4、1̇）/ 附点四分 5̣ / 八分 6̣（落单）→ 跨小节连音（同行）
    [E(2,57),E(4,67,{tie:1}),E(4,67,{tie:1})],                                                     // 二分增时线；三列连续连音（同小节两列 + 跨行到下一行首）
    [E(4,67),E(8,60,{tup:1}),E(8,62,{tup:1}),E(8,64,{tup:1}),E(32,72),E(32,74),E(32,76),E(32,77),E(32,79),E(32,81),E(32,83),E(32,84),
      E(64,48),E(64,50),E(64,52),E(64,53),E(64,55),E(64,57),E(64,59),E(64,60),E(8,null)],            // 三连音 / 三十二分（1̇～1̈）/ 六十四分（低八度）+ 八分休止
    [E(1,96)],                                                                                      // 全音 1̇̇̇（八度 +3，3 条增时线）
    [E(2,28,{dot:1}),E(4,45)],                                                                      // 附点二分 3̣̣̣（八度 −3，2 条增时线）/ 6̣̣
    [E(2,66,{dot:2}),E(8,64,{tie:1})],                                                              // 双附点二分（2 条线 + 补点，♯4）；跨行连音（行末上升段）
    [E(4,64),E(4,null),E(8,null),E(8,69),E(16,71),E(16,72),E(16,null),E(16,74)],                    // 行首下降段；同拍休止并入减时线组（GB）
    'sim',                                                                                          // 𝄎
    [E(4,60),E(4,64),E(4,67),E(4,72)],
  ];
  const s=createSong('guitar',{title:'同源对拍',beats:SIX?6:4,unit:4,key:'C',nMea:MEL.length,nTab:1,nVox:NOVOX?0:1,lyr:0});
  s.tuning=TUN.slice(); s.capo=0; s.tabJp=true;
  let prevTie=false;
  MEL.forEach((ms,mi)=>{ const M=s.measures[mi];
    if(ms==='sim'){ M.simile=1; M.tabs[0]=[]; if(!NOVOX) M.voxes[0]=[]; prevTie=false; return; }
    if(!NOVOX) M.voxes[0]=ms.map(e=>{ const c=__V(0,e.d,{dotted:e.dot===2?2:!!e.dot, tie:!!e.tie}); if(e.tup) c.tup=e.tup;
      if(e.m!=null){ const v=midiToVoxCol(e.m); c.deg=v.deg; c.acc=v.acc; c.oct=v.oct; } return c; });
    M.tabs[0]=ms.map(e=>{ const c=__T(e.d,[],{dotted:e.dot===2?2:!!e.dot}); if(e.tup) c.tup=e.tup;
      if(e.m!=null){ const p=FR(e.m), n={s:p.s,f:p.f}; if(prevTie) n.tieIn=true; c.notes.push(n); }
      prevTie=!!e.tie; return c; });
  });
  /* v68.2：第 2→3 小节的「跨行到下一行首」连音线原靠旧外壳 1280 宽谱纸 599（PAGE_W 569）自然在第 2 小节后换行；新外壳（默认）同宽
     PAGE_W 870，第 1–4 小节排成一行，这条弧变成同行（覆盖自检 tie 由 ≥5 掉到 4，跨行这一类没测到）。显式 brk 钉住换行（旧口径下本来
     就在这里换行，两种外壳排法相同），跨行覆盖不再随谱纸宽变化；断言与覆盖阈值不改。 */
  if(!SIX){ s.measures[0].repeatStart=true; s.measures[2].repeatEnd=true; s.measures[3].sectionBar=true; s.measures[1].brk=1; s.measures[3].brk=1; s.measures[5].brk=1; }
  return s; })`;

/* ---------- T2 逐字节护栏语料（同 jp-code/cmp.js：16 预设 + 简谱声部全分支压力谱 + 非整数疏密/行距 + 选中态） ---------- */
const CORPUS = `(()=>{
  const out=[];
  const V=__V, T=__T;
  const stress=(type, extra)=>{ const s=createSong(type,{title:'压力',beats:4,unit:4,key:'C',nMea:7,nTab:type==='vocal'?0:1,nVox:1,lyr:1});
    const M=s.measures;
    M[0].voxes[0]=[V(1,8,{acc:'#'}),V(2,8,{acc:'b',oct:1}),V(3,16,{acc:'x',oct:2}),V(4,16,{acc:'bb',oct:-1}),V(5,16,{acc:'n',oct:-2}),V(6,16,{oct:3}),V(7,32,{oct:-3}),V(1,32),V(2,32),V(3,32),V(0,8),V(5,4,{dotted:true}),V(6,8)];
    M[1].voxes[0]=[V(5,2,{dotted:2}),V(6,8,{tie:true}),V(6,8)];
    M[2].voxes[0]=[V(3,4,{tie:true,oct:1}),V(3,4,{tie:true,oct:1}),V(3,4,{oct:1}),V(2,4,{tie:true})];
    M[3].voxes[0]=[V(2,1)];
    M[4].voxes[0]=[V(1,8,{tup:1}),V(2,8,{tup:1}),V(3,8,{tup:1,oct:1}),V(4,16,{tup:5,tupM:4}),V(5,16,{tup:5,tupM:4}),V(6,16,{tup:5,tupM:4}),V(7,16,{tup:5,tupM:4}),V(1,16,{tup:5,tupM:4,oct:1}),V(5,4,{orn:'tr',tie:true}),V(5,4)];
    M[5].voxes[0]=[V(1,4,{grace:{notes:[{deg:2,oct:1}],dur:16},chord:'C',lyrics:['啊']}),V(3,4,{adds:[{deg:5},{deg:1,oct:1}],artic:'stacc',ferm:true}),V(5,2,{dotted:true,chords:[{q:1,chord:'G'}]})];
    M[6].voxes[0]=[V(5,4,{dotted:2}),V(6,16,{oct:-1}),V(1,4,{dotted:2,oct:-2}),V(2,16,{oct:-3})];   /* 落单的 16 分：单音多条减时线 + 低音点 */
    M[2].brk=1;
    if(extra) extra(s); return s; };
  out.push(['stressVocal', ()=>stress('vocal')]);
  out.push(['stressGuitar', ()=>stress('guitar', s=>{ s.measures.forEach(m=>{ m.tabs[0]=[T(4,[{s:1,f:0}]),T(8,[{s:2,f:1}]),T(8,[{s:3,f:2}]),T(4,[{s:6,f:3}]),T(4,[{s:5,f:2}])]; }); })]);
  out.push(['dual', ()=>stress('vocal', s=>{ s.voxNotations=['staff']; s.voxDual=[true]; })]);
  out.push(['chordOnly', ()=>stress('vocal', s=>{ s.chordOnly=true; })]);
  out.push(['wf', ()=>stress('vocal', s=>{ s.measures[0].wf=0.4; s.measures[1].wf=2.2; })]);
  /* 非整数纵向坐标（疏密/行距系数）：抓「表达式结合顺序改变」这类浮点级差异 */
  const LYT={density:0.93, noteGap:1.13, rowGap:{tab:1.07, vox:0.87, lyric:1.11}};
  ['stressVocal','stressGuitar','dual'].forEach(k=>{ const f=out.find(o=>o[0]===k)[1]; out.push([k+'~lay', ()=>{ const s=f(); s.layout=Object.assign({},LYT); return s; }]); });
  PRESETS.forEach((p,i)=>out.push(['preset'+i, ()=>p.make()]));
  PRESETS.forEach((p,i)=>out.push(['preset'+i+'~lay', ()=>{ const s=p.make(); s.layout=Object.assign({}, s.layout||{}, LYT); return s; }]));
  return out; })()`;
const SELS = [null, { row: 'vox', vi: 0, mi: 1, ci: 0, q: 1 }, { row: 'vox', vi: 0, mi: 0, ci: 3 }];
const SNAP = `(([SELS, mode])=>{ const list=eval(CORPUS_SRC); const res=[];
  list.forEach(([name, mk])=>SELS.forEach((sl,k)=>{
    if(typeof undoStack!=='undefined') undoStack.length=0;
    const s=mk(); if(s.tabJp) return;                               // 只收未点亮 tabJp 的谱
    loadSong(s);
    const setSel=()=>{ if(sl){ blurSel=false; sel=Object.assign({si:1}, sl); } else blurSel=true; };
    if(sl && !(song.voxVoices||[]).length) return;
    setSel(); render(); const h0=document.getElementById('score').innerHTML;
    let h1=null, kind='';
    if(mode==='self'){
      /* 自洽：开 → 关（不经 loadSong）后逐字节同首次渲染；无 TAB 的谱开着 tabJp 也逐字节相同 */
      song.tabJp=true; setSel(); render(); delete song.tabJp; setSel(); render(); h1=document.getElementById('score').innerHTML; kind='off-on-off';
      if(!(song.tabVoices||[]).length){ song.tabJp=true; setSel(); render(); const h2=document.getElementById('score').innerHTML; delete song.tabJp; if(h2!==h0){ h1=h2; kind='notab-on'; } }
    }
    res.push({id:name+'#'+k, h:h0, h1, kind});
  }));
  return res; })`;

/* ---------- T3/T4 几何场景（jp-code/m5.js 的 17 个 + band 细分护栏 4 个：低音十六分 / 文字和弦名 / 和弦图 / 房子括线+反复 / 排练+𝄋 / 转调 / h+lr+标注 / 推弦 /
   高把位 / 半音阶 / 跨行连音 / 三连音 / 长音 / 三行联排 / 双 TAB / 尤克里里 / let ring） ---------- */
const CASES = `(()=>{
  const C=(o)=>Object.assign({dur:16,dotted:false,chord:'',notes:[],strum:'',tech:''},o);
  const LOW=[[6,0],[6,3],[5,0],[5,2],[6,0],[6,3],[5,0],[5,2],[6,0],[6,3],[5,0],[5,2],[6,0],[6,3],[5,0],[5,2]];
  const mk=(opt)=>{ const s=createSong(opt.type||'guitar',{title:'jp',beats:4,unit:4,key:opt.key||'C',nMea:opt.n||3,nTab:opt.nTab||1,nVox:0,lyr:0});
    s.measures.forEach((m,mi)=>{ for(let t=0;t<(opt.nTab||1);t++) m.tabs[t]=(opt.row||LOW).map(([st,f],ci)=>C({notes:[{s:st,f}], dur:opt.dur||16, chord:ci===0&&opt.chord?'Am':''})); });
    s.tabJp=true; if(opt.fill) opt.fill(s); return s; };
  const HI=[[1,0],[1,3],[1,5],[1,8],[1,12],[1,10],[1,8],[1,7]];
  const CHR=[[1,1],[2,2],[1,4],[3,1],[1,6],[2,4],[4,1],[1,9]];
  /* v67.1 验收补场景的构造器 */
  const R=(o, fill)=>{ const s=createSong(o.type||'guitar',{title:'jp',beats:4,unit:4,key:'C',nMea:o.n||3,nTab:o.nTab||1,nVox:0,lyr:0}); s.tabJp=true; if(o.staff) s.tabStaff=true; fill(s); return s; };
  const N=(st,f,o)=>Object.assign({s:st,f},o||{});
  const row=(spec,dur,o)=>spec.map(([st,f])=>__T(dur,[N(st,f)],o));
  const each=(s,f)=>s.measures.forEach((m,mi)=>f(m,mi));
  const Q=[[1,3],[2,1],[1,0],[2,3]];
  const LO16=[[6,0],[6,1],[6,3],[5,0],[6,0],[6,1],[6,3],[5,0],[6,0],[6,1],[6,3],[5,0],[6,0],[6,1],[6,3],[5,0]];
  return {
    low16: ()=>mk({}),
    chordTxt: ()=>mk({chord:1, fill:s=>{ s.diagPos='off'; }}),
    chordDiag: ()=>mk({chord:1}),
    volta: ()=>mk({fill:s=>{ s.measures[1].volta=1; s.measures[0].repeatStart=true; s.measures[1].repeatEnd=true; }}),
    label: ()=>mk({fill:s=>{ s.measures[1].label='A'; s.measures[1].segno=true; }}),
    keyTo: ()=>mk({fill:s=>{ s.measures[1].keyTo='G'; }}),
    tech_h: ()=>mk({fill:s=>{ s.measures.forEach(m=>{ m.tabs[0][2].notes[0].tech='h'; m.tabs[0][2].notes[0].tk={mi:0,ci:3,si:5}; m.tabs[0][6].notes[0].tech='lr'; m.tabs[0][6].anno='rit.'; }); }}),
    bend: ()=>mk({dur:8, row:HI, fill:s=>{ s.measures.forEach(m=>{ m.tabs[0][3].notes[0].tech='b'; }); }}),
    hi8: ()=>mk({dur:8, row:HI}),
    chrom8: ()=>mk({dur:8, row:CHR}),
    ties: ()=>mk({dur:8, row:HI, fill:s=>{ s.measures.forEach((m,mi)=>{ m.tabs[0][1]=C({dur:8,notes:[{s:1,f:3,tieIn:true}]}); m.tabs[0][0]=C({dur:8,notes:[{s:1,f:3}]}); m.tabs[0][7]=C({dur:8,notes:[{s:1,f:7}]}); });
      s.measures[1].tabs[0][0]=C({dur:8,notes:[{s:1,f:7,tieIn:true}]}); s.measures[0].brk=1; }}),
    trip: ()=>mk({dur:8, row:HI.slice(0,6), fill:s=>{ s.measures.forEach(m=>{ m.tabs[0].forEach(c=>{ c.tup=1; }); m.tabs[0].push(C({dur:4,notes:[{s:2,f:1}]}),C({dur:4,notes:[{s:1,f:12}]})); }); }}),
    long: ()=>mk({fill:s=>{ s.measures.forEach(m=>{ m.tabs[0]=[C({dur:2,dotted:true,notes:[{s:2,f:1}]}), C({dur:4,notes:[{s:3,f:0}]})]; }); }}),
    staff3: ()=>mk({dur:8, row:HI, fill:s=>{ s.tabStaff=true; }}),
    twoTab: ()=>mk({nTab:2, fill:s=>{ s.measures.forEach(m=>{ m.tabs[1][2].notes[0].tech='h'; }); }}),
    uke: ()=>mk({type:'uku', dur:8, row:[[1,0],[1,2],[1,3],[1,5],[2,0],[2,1],[3,0],[4,0]]}),
    ring: ()=>mk({dur:8, row:HI, fill:s=>{ s.measures.forEach(m=>m.tabs[0].forEach(c=>{ c.notes[0].tech='lr'; })); }}),
    /* 以下 4 个是 band 细分口径的护栏：同列多层标注（层数交给 ringEx）/ 文字和弦名 + let ring 和弦 / 1 弦与 5 弦上的两音技法弧顶字母 */
    stack: ()=>mk({fill:s=>{ s.measures.forEach(m=>{ const c=m.tabs[0][2]; c.anno='rit.'; c.pk='d'; c.notes[0].lhF='1'; c.notes[0].tech='v'; m.tabs[0][6].notes[0].tech='lr'; }); }}),
    chordRing: ()=>mk({dur:4, row:[[3,0],[2,1],[1,0],[2,1]], fill:s=>{ s.diagPos='off'; s.measures.forEach((m,mi)=>m.tabs[0].forEach((c,ci)=>{ c.notes=[{s:5,f:3,tech:'lr'},{s:4,f:2,tech:'lr'},{s:2,f:1,tech:'lr'}]; if(ci%2===0) c.chord=['C','Am','F'][mi%3]; })); }}),
    hHi: ()=>mk({dur:8, row:HI, fill:s=>{ s.measures.forEach((m,mi)=>{ m.tabs[0][1].notes[0].tech='h'; m.tabs[0][1].notes[0].tk={mi,ci:2,si:1}; m.tabs[0][5].notes[0].tech='p'; m.tabs[0][5].notes[0].tk={mi,ci:6,si:1}; }); }}),
    hLow: ()=>mk({fill:s=>{ s.measures.forEach((m,mi)=>{ m.tabs[0][2].notes[0].tech='h'; m.tabs[0][2].notes[0].tk={mi,ci:3,si:5}; }); }}),
    /* ===== v67.1 验收补（对抗式验收发现；对实现者版本修前红）=====
       TAB 顶部固定装饰：延长号（含文字和弦名 / 第 2 轨）、扫弦切音点、跨弦两音技法与跨弦连音线（弧锚在较高那根弦）、预推 b↑、⊕ 实高；
       三行联排谱下墨迹：低音+旋律成组八分的下垂符杠、Drop D 加线、中音区十六分；双轨：第 1 轨 D.S./Fine 文字、第 2 轨联排连音弧 vs 第 1 轨符杠；
       联排行内部：附点 vs 下一音的 ♯、组内连音线 vs 连音弧；编辑态拍数错误「!」 */
    fermata: ()=>R({}, s=>each(s,m=>{ m.tabs[0]=row(Q,4); m.tabs[0][1].ferm=true; m.tabs[0][3].ferm=true; })),
    fermChord: ()=>R({}, s=>{ s.diagPos='off'; each(s,m=>{ m.tabs[0]=row(Q,4); m.tabs[0][1].ferm=true; m.tabs[0][1].chord='G'; }); }),
    ferm2: ()=>R({nTab:2}, s=>each(s,m=>{ m.tabs[0]=row(Q,4); m.tabs[1]=row([[3,0],[2,1],[1,0],[2,3]],4); m.tabs[1][1].ferm=true; m.tabs[1][3].ferm=true; })),
    strumQ: ()=>R({}, s=>each(s,(m,mi)=>{ m.tabs[0]=[__T(4,[],{strum:'d',chord:['C','G','Am','F'][mi%4]}),__T(4,[],{strum:'d',mute:true}),__T(4,[],{strum:'u'}),__T(4,[],{strum:'d',mute:true})]; })),
    hCross2: ()=>R({}, s=>each(s,(m,mi)=>{ m.tabs[0]=row([[3,2],[2,3],[5,3],[1,1],[3,0],[1,3],[4,2],[2,0]],8); const a=m.tabs[0];
      a[0].notes[0].tech='p'; a[0].notes[0].tk={mi,ci:1,si:2}; a[2].notes[0].tech='h'; a[2].notes[0].tk={mi,ci:3,si:1}; a[4].notes[0].tk={mi,ci:5,si:1}; a[6].notes[0].tech='tp'; a[6].notes[0].tk={mi,ci:7,si:2}; })),
    bendPre: ()=>R({}, s=>each(s,(m,mi)=>{ m.tabs[0]=row([[1,7],[1,9],[1,8],[1,10],[2,7],[2,9],[1,12],[1,10]],8); const a=m.tabs[0];
      a[0].notes[0].tech='b'; a[0].notes[0].bendType='pre'; a[2].notes[0].tech='b'; a[2].notes[0].bendType='pre'; a[2].notes[0].tk={mi,ci:3,si:1}; a[4].notes[0].tech='b'; a[4].notes[0].bAmt='full'; a[6].notes[0].tech='bd'; })),
    segno: ()=>R({}, s=>{ each(s,m=>{ m.tabs[0]=row([[1,1],[1,3],[1,5],[1,6],[1,8],[1,10],[1,12],[1,13]],16).concat(row([[1,1],[1,3],[1,5],[1,6]],8)); });
      const M=s.measures; M[1].segno=true; M[1].coda=true; M[1].label='Bridge'; M[1].keyTo='E'; M[2].coda=true; }),
    dsFine2: ()=>R({nTab:2, n:4}, s=>{ each(s,m=>{ m.tabs[0]=row([[1,1],[1,3],[1,5],[1,6]],4); m.tabs[1]=row([[1,20],[1,22],[1,24],[1,22]],4); }); s.measures[0].ds=true; s.measures[0].fine=true; s.measures[1].dc=true; }),
    twoTabTie: ()=>R({nTab:2}, s=>{ each(s,m=>{ m.tabs[0]=row(LO16,16); m.tabs[1]=row([[1,24],[1,24],[1,20],[1,20]],4); m.tabs[1][1].notes[0].tieIn=true; m.tabs[1][3].notes[0].tieIn=true; });
      s.measures[1].tabs[1][0].notes[0].tieIn=true; s.measures[0].brk=1; }),
    s3fs8: ()=>R({type:'solo', staff:1, n:2}, s=>{ s.measures[0].tabs[0]=row([[5,3],[1,8],[4,2],[1,12],[6,3],[1,10],[4,0],[1,7]],8); }),
    s3diag: ()=>R({staff:1}, s=>{ s.tuning=[64,59,55,50,45,38]; each(s,(m,mi)=>{ m.tabs[0]=row([[6,0],[6,2],[1,12],[1,15],[6,0],[1,20],[6,3],[1,24]],8); m.tabs[0][0].chord='D5';
      m.tabs[0][3].notes[0].tech='h'; m.tabs[0][3].notes[0].tk={mi,ci:4,si:6}; }); }),
    s3mid16: ()=>R({staff:1}, s=>each(s,m=>{ m.tabs[0]=row([[2,0],[2,1],[2,3],[1,0],[1,1],[1,3],[1,1],[1,0],[2,3],[2,1],[2,0],[3,2],[2,0],[2,1],[2,3],[1,0]],16); })),
    dot8: ()=>R({}, s=>each(s,m=>{ m.tabs[0]=[__T(8,[N(1,1)],{dotted:true}),__T(16,[N(1,2)]),__T(8,[N(2,2)],{dotted:true}),__T(16,[N(1,1)]),__T(8,[N(1,3)],{dotted:2}),__T(32,[N(1,4)]),__T(8,[N(1,6)],{dotted:true}),__T(16,[N(1,8)])]; })),
    tieTup: ()=>R({}, s=>each(s,m=>{ m.tabs[0]=[__T(8,[N(1,20)],{tup:3}),__T(8,[N(1,20,{tieIn:true})],{tup:3}),__T(8,[N(1,22)],{tup:3}),__T(4,[N(1,24)]),__T(4,[N(1,24,{tieIn:true})]),__T(4,[N(1,8)])]; })),
    beatErr: ()=>R({nTab:2}, s=>each(s,m=>{ m.tabs[0]=row([[6,0],[6,3],[5,0],[5,2],[6,1]],4); m.tabs[1]=row([[6,0],[6,3],[5,0],[5,2]],4); })),
  }; })()`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(HELP);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const J = o => JSON.stringify(o);

  /* ===== T1 同源对拍 =====
     简谱声部行的墨迹窗口里混着上方 TAB 的符干/符杠/连音括线——同一首谱去掉简谱声部再渲染一次（横向版面不变：联排行 j 带与简谱声部带同口径），
     按「相对本系统 TAB 顶线」的签名把 TAB 墨迹逐个减掉，剩下的才是简谱声部行；再与联排行按各自数字基线归一后比较多重集合。 */
  const t1 = async (wd, six) => { await pg.setViewportSize({ width: wd, height: 950 }); return pg.evaluate(([SONG, six]) => {
    const mk = eval(SONG); const svg = document.getElementById('score');
    const shot = novox => { if (typeof undoStack !== 'undefined') undoStack.length = 0; loadSong(mk(novox, six)); blurSel = true; render();
      const tts = __tabTops(0);
      const els = [...svg.querySelectorAll('text,line,circle,path,rect,polygon')].filter(el => !el.closest('g[data-tabjp]') && __vis(el));
      return { tts, els, jd: __jpDigits(0), jp: __jpEls(0), sys: layoutSystems().map(s2 => s2.measures.map(l => l.mi).join()) }; };
    /* B：无简谱声部 → 每系统 TAB 墨迹（相对 TAB 顶线）多重集合 */
    const B = shot(true);
    const tabSet = B.tts.map(tt => B.els.map(el => __sig(el, tt)));
    const A = shot(false);
    if (A.sys.join('|') !== B.sys.join('|')) return { error: 'systems differ', a: A.sys, b: B.sys };
    if (!A.jd.length) return { error: 'no tabJp digits' };
    const jys = [...new Set(A.jd.map(t => +t.getAttribute('y')))].sort((a, c) => a - c);
    const vd = A.els.filter(t => t.tagName === 'text' && /^[0-7]$/.test(t.textContent) && t.getAttribute('font-size') === '17' && t.getAttribute('font-family') === 'var(--font-ui)');
    const vys = [...new Set(vd.map(t => +t.getAttribute('y')))].sort((a, c) => a - c);
    if (jys.length !== vys.length || jys.length !== A.tts.length) return { error: 'rows', jys, vys, tts: A.tts };
    let onlyJ = [], onlyV = [], nJ = 0, nV = 0; const rows = [];
    jys.forEach((jy, k) => {
      const vy = vys[k], tt = A.tts[k], nextJ = jys[k + 1] == null ? 1e9 : jys[k + 1];
      const J1 = A.jp.filter(el => { const q = el.getBBox(), c = q.y + q.height / 2; return c > jy - 40 && c < Math.min(jy + 40, (jy + nextJ) / 2); }).map(el => __sig(el, jy)).sort();
      const win = A.els.filter(el => { const q = el.getBBox(); return q.y >= vy - 36 && q.y + q.height <= vy + 28; });
      /* 减掉 TAB 墨迹：相对 TAB 顶线配对（390 宽压缩档下两次渲染横坐标差 ≤0.1——简谱声部带与联排 j 带硬底不同） */
      const keep = __pair(win.map(el => __sig(el, tt)), tabSet[k], 0.15).onlyA;
      const V1 = win.filter(el => { const sg = __sig(el, tt), i = keep.indexOf(sg); if (i >= 0) { keep.splice(i, 1); return true; } return false; }).map(el => __sig(el, vy)).sort();
      nJ += J1.length; nV += V1.length; rows.push(J1.length + '/' + V1.length);
      const pr = __pair(J1, V1, 0.06);
      pr.onlyA.forEach(x => onlyJ.push(k + ':' + x)); pr.onlyB.forEach(x => onlyV.push(k + ':' + x));
    });
    /* 覆盖面自检（防假绿：某类字形一个都没有） */
    const G = [...svg.querySelectorAll('g[data-tabjp="0"]')], q = sel => G.reduce((a, g) => a + g.querySelectorAll(sel).length, 0);
    const cover = { n: jys.length, acc: G.reduce((a, g) => a + [...g.querySelectorAll('text')].filter(t => t.textContent === '♯').length, 0), dots: q('circle'), dash: q('line.jdash'), tie: q('path.jptie'), tup: q('text.jptup'),
      beam64: G.reduce((a, g) => a + [...g.querySelectorAll('line')].filter(l => jys.some(y => Math.abs(+l.getAttribute('y1') - (y + 13)) < 0.01)).length, 0),
      rect: q('rect'), sim: G.reduce((a, g) => a + [...g.querySelectorAll('path')].filter(pp => pp.getAttribute('stroke-width') === '2.6').length, 0),
      /* 同行跨小节线的连音弧（弧两端之间夹着一条联排行小节线） */
      cross: G.reduce((a, g) => { const bars = [...g.querySelectorAll('line')].filter(l => l.getAttribute('x1') === l.getAttribute('x2')).map(l => +l.getAttribute('x1'));
        return a + [...g.querySelectorAll('path.jptie')].filter(pp => { const m = /^M ([\d.-]+) [\d.-]+ Q [\d.-]+ [\d.-]+ ([\d.-]+)/.exec(pp.getAttribute('d')); return m && bars.some(x => x > +m[1] + 3 && x < +m[2] - 3); }).length; }, 0) };
    return { rows, nJ, nV, onlyJ: onlyJ.slice(0, 6), onlyV: onlyV.slice(0, 6), nOnlyJ: onlyJ.length, nOnlyV: onlyV.length, cover };
  }, [T1SONG, six]); };
  for (const wd of [1280, 390]) {
    const r1 = await t1(wd, false);
    T(!r1.error && r1.nJ > 120 && r1.nOnlyJ === 0 && r1.nOnlyV === 0 && r1.cover.acc === 2 && r1.cover.dash === 8 && r1.cover.tie >= 5 && r1.cover.tup === 1 && r1.cover.beam64 === 1
      && r1.cover.sim === 1 && r1.cover.rect >= 4 && (wd !== 1280 || r1.cover.cross >= 1),
      'T1a 同源对拍（' + wd + ' 宽）：同一旋律的简谱声部与联排行字形元素（按基线归一）多重集合完全相同', J(r1));
    const r1b = await t1(wd, true);
    T(!r1b.error && r1b.nOnlyJ === 0 && r1b.nOnlyV === 0 && r1b.cover.dash === 8 && r1b.cover.tie === 1,
      'T1b 同源对拍（' + wd + ' 宽，6/4）：附点全音 5 条增时线、二分增时线、同小节连音线与简谱声部完全相同', J(r1b));
  }
  await pg.setViewportSize({ width: 1280, height: 950 });

  /* ===== T2 逐字节护栏（红线：未点亮 tabJp 的文档 #score 与参考版逐字节相同） ===== */
  {
    const snap = (page, mode) => page.evaluate('(' + SNAP.replace('CORPUS_SRC', JSON.stringify(CORPUS)) + ')(' + JSON.stringify([SELS, mode]) + ')');
    let n2 = 0, bad = [];
    if (REF) {
      const pr = await b.newPage({ viewport: { width: 1280, height: 950 } }); pr.on('pageerror', e => errs.push('REF:' + e.message));
      await pr.goto(REF); await pr.waitForTimeout(900); await pr.evaluate(HELP);
      for (const wd of [1280, 390]) {
        await pg.setViewportSize({ width: wd, height: 950 }); await pr.setViewportSize({ width: wd, height: 950 });
        const A = await snap(pg, 'ref'), B = await snap(pr, 'ref');
        A.forEach((x, k) => { n2++; const y = B[k]; if (!y || y.id !== x.id || y.h !== x.h) { let i = 0; if (y) while (i < x.h.length && x.h[i] === y.h[i]) i++; bad.push(wd + ':' + x.id + (y ? ' @' + i + ' ' + x.h.slice(Math.max(0, i - 40), i + 60) : ' missing')); } });
      }
      await pr.close();
      T(n2 >= 200 && bad.length === 0, 'T2 逐字节护栏：' + n2 + ' 份未点亮 tabJp 的渲染（16 预设 + 压力谱 + 非整数疏密/行距 + 选中增时线拍位，1280/390 宽）与参考版（' + REF.split('/').pop() + '）#score 逐字节相同', bad.slice(0, 3).join(' || '));
    } else {
      for (const wd of [1280, 390]) {
        await pg.setViewportSize({ width: wd, height: 950 });
        const A = await snap(pg, 'self');
        A.forEach(x => { n2++; if (x.h1 !== x.h) bad.push(wd + ':' + x.id + ':' + x.kind); });
      }
      T(n2 >= 200 && bad.length === 0, 'T2 逐字节护栏（自洽；设 MUSETAB_REF 时对拍参考版）：' + n2 + ' 份未点亮 tabJp 的渲染「关→开→关」前后逐字节相同、无 TAB 的谱开关 tabJp 逐字节相同', bad.slice(0, 6).join(' '));
    }
    await pg.setViewportSize({ width: 1280, height: 950 });
  }

  /* ===== T3 几何零相交 / T4 纵向净距（17 个场景 × 1280/390 宽） ===== */
  {
    const geo = wd => pg.evaluate(CS => {
      const svg = document.getElementById('score'), cases = eval(CS), out = {};
      for (const k in cases) {
        if (typeof undoStack !== 'undefined') undoStack.length = 0;
        loadSong(cases[k]()); blurSel = true; render();
        const jp = __jpEls(), set = new Set(jp);
        const JI = jp.map(el => ({ el, b: __ink(el), k: __inkT(el) }));
        const os = [...svg.querySelectorAll('text,line,path,circle,rect,polygon')].filter(el => !set.has(el) && !el.closest('g[data-tabjp]') && __vis(el)).map(el => ({ el, b: __ink(el), k: __inkT(el) }));
        const tag = el => (el.textContent || el.tagName).slice(0, 6) + (el.getAttribute('class') ? '.' + el.getAttribute('class') : '');
        const clash = []; JI.forEach(a => os.forEach(o => { if (__hit(a.b, o.b)) clash.push(tag(a.el) + '×' + tag(o.el)); }));
        /* 内部：文字/圆点/弧之间（减时线/增时线/小节线与本列点线不计——减时线本就从数字下方贯穿） */
        const S2 = JI.filter(e => e.el.tagName !== 'line' && e.el.tagName !== 'rect'), self = [];
        const lblArc = (a, c) => (a.el.classList.contains('jptup') && c.el.tagName === 'path') || (c.el.classList.contains('jptup') && a.el.tagName === 'path');   // 连音数字坐在弧顶纸色断口里（设计如此）
        for (let i = 0; i < S2.length; i++) for (let j = i + 1; j < S2.length; j++) if (__hit(S2[i].b, S2[j].b) && !lblArc(S2[i], S2[j])) self.push(tag(S2[i].el) + '×' + tag(S2[j].el));
        const dg = __jpDigits(); const font = dg.every(t => t.getAttribute('font-size') === '17' && t.getAttribute('font-family') === 'var(--font-ui)' && t.getAttribute('font-weight') === '500');
        /* 纵向净距：按数字基线把联排行分行，逐行对与之横向重叠的其他墨迹量上/下净距 */
        const rowsY = [...new Set(dg.map(t => +t.getAttribute('y')))];
        let dnMin = 1e9, upMin = 1e9, dnW = '', upW = '';
        const scr = svg.getScreenCTM(), sc = scr ? scr.d : 1, oyS = svg.getBoundingClientRect().top;
        rowsY.forEach(jy => {
          const jyS = oyS + jy * sc;
          const mine = JI.filter(e => Math.abs((e.b.t + e.b.b) / 2 - jyS) < 40 * sc);
          os.forEach(o => {
            const ov = mine.filter(e => Math.min(e.k.r, o.k.r) - Math.max(e.k.l, o.k.l) > 0.3); if (!ov.length) return;
            const oc = (o.b.t + o.b.b) / 2;
            if (oc > jyS + 4.5 * sc && o.k.t < jyS + 80 * sc) { const g = (o.k.t - Math.max(...ov.map(e => e.k.b))) / sc; if (g < dnMin) { dnMin = g; dnW = tag(o.el); } }
            else if (oc < jyS - 13 * sc && o.k.b > jyS - 90 * sc) { const g = (Math.min(...ov.map(e => e.k.t)) - o.k.b) / sc; if (g < upMin) { upMin = g; upW = tag(o.el); } }
          });
        });
        out[k] = { clash: clash.length, ex: clash.slice(0, 3), self: self.length, sx: self.slice(0, 3), font, nd: dg.length, dn: +dnMin.toFixed(2), dnW, up: upMin > 1e8 ? null : +upMin.toFixed(2), upW };
      }
      return out; }, CASES);
    for (const wd of [1280, 390]) {
      await pg.setViewportSize({ width: wd, height: 1400 });
      const g = await geo(wd), bad3 = [], bad4 = [];
      for (const k in g) { const x = g[k];
        if (x.clash || x.self || !x.font || !x.nd) bad3.push(k + J(x));
        if (!(x.dn >= 4) || (x.up != null && !(x.up >= 5))) bad4.push(k + ' dn=' + x.dn + '(' + x.dnW + ') up=' + x.up + '(' + x.upW + ')'); }
      T(bad3.length === 0 && Object.keys(g).length === 36, 'T3 几何零相交（' + wd + ' 宽，36 场景）：联排行墨迹与谱面其他墨迹相交 0、内部互不相交、数字 17 号/500/font-ui', bad3.length ? '[' + bad3.map(x => x.split('{')[0]).join(',') + '] ' + bad3.slice(0, 4).join(' | ') : '');
      T(bad4.length === 0, 'T4 纵向净距（' + wd + ' 宽）：联排行墨迹底 → TAB 顶线/顶部标注 ≥4px，联排行墨迹顶 → 上方元素 ≥5px',
        bad4.slice(0, 6).join(' | ') || Object.keys(g).map(k => k + ':' + g[k].dn + '/' + g[k].up).join(' '));
    }
    await pg.setViewportSize({ width: 1280, height: 950 });
  }

  /* ===== T5 横向：半音阶十六分在压缩档 ♯ 不压前一个数字、数字两两不相碰；长音增时线不越过小节线 ===== */
  {
    const r5 = await pg.evaluate(() => {
      const svg = document.getElementById('score'), out = {};
      /* 单位数品位（TAB 最窄列）的半音阶：1=C 下 1 ♯1 2 ♭3 3 4 ♯4 5 ♯5 6 ♭7 7 1̇ …（v67.1 验收补：拼写同简谱声部 auto 表） */
      const CH = [[2, 1], [2, 2], [2, 3], [2, 4], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 8], [1, 7]];
      const cfgs = { std: {}, mid: { density: 0.8, noteGap: 0.8 }, tight: { density: 0.6, noteGap: 0.6 }, wf03: { wf: 0.3 }, wf03t: { wf: 0.3, density: 0.6, noteGap: 0.6 } };
      for (const k in cfgs) { const c = cfgs[k];
        const s = createSong('guitar', { title: '半音阶', beats: 4, unit: 4, key: 'C', nMea: 3, nTab: 1, nVox: 0, lyr: 0 }); s.tabJp = true;
        s.measures.forEach(m => { m.tabs[0] = CH.map(([st, f]) => __T(16, [{ s: st, f }])); if (c.wf) m.wf = c.wf; });
        s.measures[2].tabs[0] = [__T(2, [{ s: 1, f: 0 }], { dotted: true }), __T(4, [{ s: 1, f: 1 }])];   // 附点二分：2 条增时线
        if (c.density) s.layout = { density: c.density, noteGap: c.noteGap };
        if (typeof undoStack !== 'undefined') undoStack.length = 0; loadSong(s); blurSel = true; render();
        const G = [...svg.querySelectorAll('g[data-tabjp] text')].filter(t => !t.classList.contains('jptup'));
        const ink = t => { const b = t.getBBox(); return { l: b.x, r: b.x + b.width, y: +t.getAttribute('y'), t: t.textContent }; };
        /* 实测字形墨迹：17 号数字墨迹半宽≈4.6，♯ 14.5 号墨迹半宽≈3.6（getBBox 是字身盒，左右各含约 0.5～1 的侧距——按字身盒判更严） */
        const dig = G.filter(t => /^[0-7]$/.test(t.textContent)).map(ink), acc = G.filter(t => t.textContent === '♯' || t.textContent === '♭').map(ink);   /* v67.1 验收补：拼写同简谱声部（♯1 ♭3 ♯4 ♯5 ♭7） */
        let accHit = 0, accMin = 1e9, digMin = 1e9;
        /* ♯/♭ 画在 (nx−9.9, y−2.5)：前一个数字＝同一基线上、右缘在变化音右缘左边最近的那个（本列数字在其右侧，不会被选中） */
        acc.forEach(a => { const prev = dig.filter(d => Math.abs(d.y - (a.y + 2.5)) < 0.01 && d.r < a.r).sort((p, q) => q.r - p.r)[0]; if (prev) { const g = a.l - prev.r; accMin = Math.min(accMin, g); if (g < -0.6) accHit++; } else accHit += 100; });
        const byRow = {}; dig.forEach(d => { (byRow[d.y] = byRow[d.y] || []).push(d); });
        Object.values(byRow).forEach(row => { row.sort((p, q) => p.l - q.l); for (let i = 1; i < row.length; i++) digMin = Math.min(digMin, row[i].l - row[i - 1].r); });
        /* 增时线不越过所在小节右边的小节线（联排行 staffBarMarks 的竖线） */
        const bars = [...svg.querySelectorAll('g[data-tabjp] line')].filter(l => l.getAttribute('x1') === l.getAttribute('x2')).map(l => +l.getAttribute('x1'));
        const dashes = [...svg.querySelectorAll('g[data-tabjp] line.jdash')].map(l => ({ l: +l.getAttribute('x1'), r: +l.getAttribute('x2') }));
        const dashOver = dashes.filter(d => bars.some(x => x > d.l - 1 && x < d.r + 1)).length;
        out[k] = { nAcc: acc.length, accHit, accMin: +accMin.toFixed(2), digMin: +digMin.toFixed(2), nDash: dashes.length, dashOver };
      }
      return out; });
    const bad5 = Object.keys(r5).filter(k => { const x = r5[k]; return !(x.nAcc === 12 && x.accHit === 0 && x.digMin >= 1 && x.nDash === 2 && x.dashOver === 0); });
    T(bad5.length === 0, 'T5 横向：半音阶十六分（标准/中/紧/wf 0.3）♯ 不压前一个数字、数字字身两两不相碰（≥1）、附点二分 2 条增时线不越过小节线', J(r5));
  }

  /* ===== T6 连音线：tuningOf / 夹位差 / keyRefAt；三列连续连音一条弧 ===== */
  {
    const r6 = await pg.evaluate(() => {
      const svg = document.getElementById('score');
      const run = (type, setup) => { const s = createSong(type, { title: '连音', beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 2, nVox: 0, lyr: 0 }); s.tabJp = true; setup(s);
        if (typeof undoStack !== 'undefined') undoStack.length = 0; loadSong(s); blurSel = true; render();
        const arcs = vi => [...svg.querySelectorAll('g[data-tabjp="' + vi + '"] path.jptie')].map(p => { const m = /^M ([\d.-]+) ([\d.-]+) Q [\d.-]+ ([\d.-]+) ([\d.-]+) ([\d.-]+)/.exec(p.getAttribute('d')); return m ? { x1: +m[1], y1: +m[2], qy: +m[3], x2: +m[4], y2: +m[5] } : null; }).filter(Boolean);
        const dg = vi => __jpDigits(vi).map(t => ({ x: +t.getAttribute('x'), y: +t.getAttribute('y'), d: t.textContent }));
        const dots = vi => [...svg.querySelectorAll('g[data-tabjp="' + vi + '"] circle')].map(c => ({ x: +c.getAttribute('cx'), y: +c.getAttribute('cy') }));
        return { a0: arcs(0), a1: arcs(1), d0: dg(0), d1: dg(1), o0: dots(0), o1: dots(1) }; };
      const N = (st, f, t) => Object.assign({ s: st, f }, t ? { tieIn: true } : {});
      const filler = [__T(4, [N(1, 0)]), __T(4, [N(1, 1)])];
      const out = {};
      /* 尤克里里重入 G：3 弦 C4 + 4 弦 G4 同列，下一列 4 弦延音 → 最高音是 4 弦 G4（按吉他标准弦会误判成 3 弦） */
      { const r = run('uku', s => { s.measures[0].tabs[0] = [__T(4, [N(3, 0), N(4, 0)]), __T(4, [N(3, 0), N(4, 0, 1)])].concat(filler); });
        out.uke = { arcs: r.a0.length, digits: r.d0.map(d => d.d).join('') }; }
      /* Drop D：6 弦 7 品（A2）+ 5 弦 1 品（♯A2）→ 最高音是 5 弦；下一列 5 弦延音 */
      { const r = run('guitar', s => { s.tuning = [64, 59, 55, 50, 45, 38]; s.measures[0].tabs[0] = [__T(4, [N(6, 7), N(5, 1)]), __T(4, [N(6, 7), N(5, 1, 1)])].concat(filler); });
        out.dropD = { arcs: r.a0.length, digits: r.d0.map(d => d.d).join('') }; }
      /* 逐轨夹位：第 2 轨夹 12 品（参考轨 0）→ 同一按法读高八度；连音弧基线让过高音点 */
      { const r = run('guitar', s => { s.tabCapos = [0, 12]; [0, 1].forEach(vi => { s.measures[0].tabs[vi] = [__T(4, [N(1, 3)]), __T(4, [N(1, 3, 1)])].concat(filler); }); });
        const clear = (arcs, dots) => arcs.length === 1 && dots.every(o => Math.max(arcs[0].y1, arcs[0].y2) < o.y - 1.5 - 0.5);
        out.capo = { a0: r.a0.length, a1: r.a1.length, hi1: r.o1.filter(o => o.y < r.d1[0].y).length, clear1: clear(r.a1, r.o1.filter(o => o.y < r.d1[0].y)), base0: r.a0[0] ? +(r.a0[0].y1 - r.d0[0].y).toFixed(2) : null, base1: r.a1[0] ? +(r.a1[0].y1 - r.d1[0].y).toFixed(2) : null }; }
      /* 中途转调（keyRefAt）：曲首 1=D、第 2 小节转 1=C → C5 读 1̇（带高音点）；弧基线按本小节调让位 */
      { const r = run('guitar', s => { s.key = 'D'; s.measures[1].keyTo = 'C'; s.measures[0].tabs[0] = filler.concat(filler); s.measures[1].tabs[0] = [__T(4, [N(1, 8)]), __T(4, [N(1, 8, 1)])].concat(filler); });
        const hi = r.o0.filter(o => o.y < r.d0[0].y);
        out.keyTo = { arcs: r.a0.length, hi: hi.length, clear: r.a0.length === 1 && hi.every(o => Math.max(r.a0[0].y1, r.a0[0].y2) < o.y - 2) }; }
      /* 三列连续同音连音 → 一条弧（跨过中间那列） */
      { const r = run('guitar', s => { s.measures[0].tabs[0] = [__T(4, [N(1, 3)]), __T(4, [N(1, 3, 1)]), __T(4, [N(1, 3, 1)]), __T(4, [N(1, 0)])]; });
        const d = r.d0; out.chain = { arcs: r.a0.length, span: r.a0[0] ? (Math.abs(r.a0[0].x1 - (d[0].x + 1)) < 0.6 && Math.abs(r.a0[0].x2 - (d[2].x - 1)) < 0.6) : false }; }
      return out; });
    T(r6.uke.arcs === 1 && r6.dropD.arcs === 1, 'T6a 连音判定按本谱定弦 tuningOf：尤克里里重入 G 弦、Drop D 都画连音弧', J(r6));
    T(r6.capo.a0 === 1 && r6.capo.a1 === 1 && r6.capo.hi1 >= 2 && r6.capo.base1 <= -23.5 && r6.capo.base0 === -16 && r6.capo.clear1 && r6.keyTo.arcs === 1 && r6.keyTo.hi === 2 && r6.keyTo.clear,
      'T6b 连音弧八度让位按逐轨夹位差 capoOf(vi)−song.capo 与本小节调 keyRefAt 折算（弧在高音点之上）', J({ capo: r6.capo, keyTo: r6.keyTo }));
    T(r6.chain.arcs === 1 && r6.chain.span, 'T6c 三列连续同音连音只画一条弧（首音 +1 → 末音 −1，跨过中间列）', J(r6.chain));
  }

  /* ===== T7 X 列与泛音唱名 ===== */
  {
    const r7 = await pg.evaluate(() => {
      const svg = document.getElementById('score');
      const s = createSong('guitar', { title: 'X与泛音', beats: 4, unit: 4, key: 'C', nMea: 3, nTab: 1, nVox: 0, lyr: 0 }); s.tabJp = true;
      s.measures[0].tabs[0] = [__T(8, [], { strum: 'd' }), __T(8, [], { strum: 'u' }), __T(8, [{ s: 3, f: 0, x: true }, { s: 4, f: 0, x: true }], { mute: true }), __T(8, [{ s: 1, f: 3 }]), __T(4, [], { perc: 'bass' }), __T(4, [{ s: 1, f: 0 }])];
      s.measures[1].tabs[0] = [__T(2, [], { strum: 'd' }), __T(4, [{ s: 2, f: 1 }, { s: 3, f: 0, x: true }]), __T(4, [])];
      /* 泛音：1 弦 12 品 / 7 品 / 5 品 / 4 品自然泛音 + 1 弦 3 品人工泛音 A.H.（G4+12）+ 2 弦 12 品自然泛音（八分） */
      s.measures[2].tabs[0] = [__T(4, [{ s: 1, f: 12, tech: 'hm' }]), __T(4, [{ s: 1, f: 7, tech: 'hm' }]), __T(4, [{ s: 1, f: 5, tech: 'hm' }]), __T(8, [{ s: 1, f: 4, tech: 'hm' }]), __T(8, [{ s: 1, f: 3, tech: 'hm', hmT: 'A' }])];
      if (typeof undoStack !== 'undefined') undoStack.length = 0; loadSong(s); blurSel = true; render();
      const G = [...svg.querySelectorAll('g[data-tabjp="0"]')];
      const T0 = G.flatMap(g => [...g.querySelectorAll('text')]).filter(t => !t.classList.contains('jptup'));
      const heads = T0.filter(t => /^[0-7X]$/.test(t.textContent));
      const X = heads.filter(t => t.textContent === 'X');
      const xOK = X.every(t => t.getAttribute('font-size') === '17' && t.getAttribute('font-family') === 'var(--font-ui)' && t.getAttribute('font-weight') === '500');
      /* 第 1 小节前两拍：X X X 3 两两成组 → 两条成组减时线各罩两个 X/数字 */
      const y0 = +heads[0].getAttribute('y');
      const beams = G.flatMap(g => [...g.querySelectorAll('line')]).filter(l => Math.abs(+l.getAttribute('y1') - (y0 + 3.4)) < 0.01 && +l.getAttribute('x2') - +l.getAttribute('x1') > 16);
      const dashX = G.flatMap(g => [...g.querySelectorAll('line.jdash')]).length;
      /* 泛音：从谱面读唱名 → MIDI（1=C4，♯ +1，高/低音点 ±12） */
      const SC = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 };
      const circ = G.flatMap(g => [...g.querySelectorAll('circle')]).map(c => ({ x: +c.getAttribute('cx'), y: +c.getAttribute('cy') }));
      const mid = t => { const x = +t.getAttribute('x'), y = +t.getAttribute('y');
        const sh = T0.some(a => a.textContent === '♯' && Math.abs(+a.getAttribute('x') - (x - 9.9)) < 0.3 && Math.abs(+a.getAttribute('y') - (y - 2.5)) < 0.3) ? 1 : 0;
        const up = circ.filter(c => Math.abs(c.x - x) < 0.3 && c.y < y - 10).length, dn = circ.filter(c => Math.abs(c.x - x) < 0.3 && c.y > y + 4).length;
        return 60 + SC[+t.textContent] + sh + 12 * (up - dn); };
      const lm2 = layoutSystems().flatMap(sy => sy.measures).find(l => l.mi === 2);
      const hmHeads = heads.filter(t => { const x = +t.getAttribute('x'); return lm2 && x > lm2.x + (svg.viewBox.baseVal.width - 2 * 0) * 0 && /^[1-7]$/.test(t.textContent); }).slice(-5);
      const jpM = hmHeads.map(mid);
      /* 播放口径：截获 playInst 的发声频率（TAB 播放比记谱低八度：+12 折回记谱音高） */
      const rec = []; const orig = window.playInst;
      window.playInst = (k, c, b2, f, w) => { rec.push([w, f]); };
      try { play(); const S = audio.schedQ; if (S) S.q.slice(S.i).forEach(ev => { if (ev.k === 'playInst') rec.push([ev.a[4], ev.a[3]]); }); } finally { stopPlay(); window.playInst = orig; }
      rec.sort((a, c) => a[0] - c[0]);
      const plM = rec.slice(-5).map(r => Math.round(69 + 12 * Math.log2(r[1] / 440)) + 12);
      return { heads: heads.map(t => t.textContent).join(''), nX: X.length, xOK, beams: beams.length, dashX, jpM, plM };
    });
    T(r7.heads.slice(0, 9) === 'XXX5X3X10' && r7.nX === 5 && r7.xOK && r7.beams >= 2 && r7.dashX >= 1,
      'T7a 发声无音高的列（无和弦形扫弦 / 全 × 切音 / 打板）写 17 号「X」，照常连杠、二分扫弦画增时线；部分 × 列取最高实音；空列仍是休止 0', J(r7));
    T(r7.jpM.length === 5 && r7.jpM.join() === r7.plM.join() && r7.jpM.join() === '76,83,88,92,79',
      'T7b 泛音唱名＝播放发声音高：自然泛音 12/7/5/4 品 → +12/+19/+24/+28，人工泛音 A.H. → 按品音 +12', J(r7));
  }

  /* ===== T8 导出 / 播放 / 行首连线 ===== */
  {
    const r8 = await pg.evaluate(() => {
      const svg = document.getElementById('score');
      const s = createSong('guitar', { title: '导出', beats: 4, unit: 4, key: 'C', nMea: 4, nTab: 2, nVox: 0, lyr: 0 }); s.tabJp = true;
      s.measures.forEach(m => { [0, 1].forEach(vi => { m.tabs[vi] = [__T(8, [{ s: 1, f: 3 }]), __T(8, [{ s: 1, f: 5 }]), __T(4, [{ s: 2, f: 1 }], { dotted: true }), __T(8, [{ s: 1, f: 0 }]), __T(4, [{ s: 2, f: 3 }])]; }); });
      if (typeof undoStack !== 'undefined') undoStack.length = 0; loadSong(s); blurSel = true; render();
      const xml = svgResolveVars(new XMLSerializer().serializeToString(scoreExportClone()));
      const segs = xml.split('data-tabjp=').slice(1).map(x => x.slice(0, x.indexOf('</g>')));
      const varLeft = segs.filter(x => /var\(--/.test(x)).length;
      const jb = vi => { const gs = [...svg.querySelectorAll('g[data-tabjp="' + vi + '"]')]; const b = gs[0].getBBox(); return { t: b.y, b: b.y + b.height }; };
      const ph = () => { const e = document.getElementById('playhead'); return { y: +e.getAttribute('y'), b: +e.getAttribute('y') + +e.getAttribute('height') }; };
      highlight('t0', 0, 1, true); const whole = ph();
      highlight('t1', 0, 1, false); const solo1 = ph();
      highlight('t0', 0, 1, false); const solo0 = ph();
      const j0 = jb(0), j1 = jb(1);
      /* 行首连线（x=oxH 的竖线）上端 ≤ 第 1 条联排行顶（数字顶 jy−13） */
      const jy0 = +__jpDigits(0)[0].getAttribute('y');
      const conn = [...svg.querySelectorAll('line')].filter(l => l.getAttribute('x1') === l.getAttribute('x2') && +l.getAttribute('y2') - +l.getAttribute('y1') > 60 && +l.getAttribute('x1') < 70).map(l => +l.getAttribute('y1'));
      return { segs: segs.length, varLeft, whole: whole.y <= j0.t && whole.b >= j1.b, solo1: solo1.y <= j1.t && solo1.b >= j1.b, solo0: solo0.y <= j0.t && solo0.b >= j0.b, conn: conn.length ? Math.min(...conn) <= jy0 - 13 + 0.01 : false, ph: { whole, solo0, solo1, j0, j1 } };
    });
    T(r8.segs >= 2 && r8.varLeft === 0, 'T8a 导出（svgResolveVars）后联排行无 var(-- 残留', J(r8));
    T(r8.whole && r8.solo0 && r8.solo1, 'T8b 播放块覆盖联排行：整谱模式（meaBands）与单轨 SOLO 模式（colBoxes，含第 2 条 TAB 声部自己的联排行）', J(r8.ph));
    T(r8.conn, 'T8c 行首连线把联排行与 TAB 相连（同简谱声部行 vy−13～vy+4）', J(r8));
  }

  /* ===== T9～T15 v67.1 验收补（对抗式验收发现的缺陷；对实现者版本修前红、修后绿） ===== */
  /* T9 双 TAB：第 1 轨拍选热区（透明 beatzone）下缘不伸进第 2 轨联排行墨迹（真墨框） */
  {
    const r9 = await pg.evaluate(() => {
      const svg = document.getElementById('score'), out = [];
      const mk = (fill) => { const s = createSong('guitar', { title: '双轨', beats: 4, unit: 4, key: 'C', nMea: 4, nTab: 2, nVox: 0, lyr: 0 }); s.tabJp = true; fill(s); return s; };
      const N = (st, f, o) => Object.assign({ s: st, f }, o || {});
      const songs = {
        tie: mk(s => s.measures.forEach(m => { m.tabs[0] = [0, 1, 3, 0, 0, 1, 3, 0].map((f, i) => __T(8, [N(i % 4 === 3 ? 5 : 6, f)])); m.tabs[1] = [__T(4, [N(1, 24)]), __T(4, [N(1, 24, { tieIn: true })]), __T(4, [N(1, 20)]), __T(4, [N(1, 20, { tieIn: true })])]; })),
        trip: mk(s => s.measures.forEach(m => { m.tabs[0] = [0, 1, 3, 0].map(f => __T(4, [N(6, f)])); m.tabs[1] = [20, 22, 24].map(f => __T(8, [N(1, f)], { tup: 3 })).concat([__T(4, [N(1, 24)]), __T(2, [N(1, 22)])]); }))
      };
      for (const k in songs) {
        if (typeof undoStack !== 'undefined') undoStack.length = 0; loadSong(songs[k]); blurSel = true; render();
        const bz = [...svg.querySelectorAll('rect.beatzone')].filter(r => (r.dataset.beatsel || '').split(':')[1] === '0').map(r => r.getBoundingClientRect());
        const jp1 = [...svg.querySelectorAll('g[data-tabjp="1"] *')].filter(__vis).map(__inkT);
        let worst = 1e9; const sc = svg.getScreenCTM().d;
        bz.forEach(z => { jp1.forEach(e => { if (Math.min(e.r, z.right) - Math.max(e.l, z.left) > 0.3 && e.t > z.top) worst = Math.min(worst, (e.t - z.bottom) / sc); }); });
        out.push(k + ':' + worst.toFixed(2));
      }
      return out; });
    T(r9.every(x => +x.split(':')[1] >= 3), 'T9 双 TAB：第 1 轨拍选热区下缘到第 2 轨联排行最高墨迹 ≥3px（联排行顶按真实墨迹兜底：连音线行末上升段 / 连音弧数字底块 / 高音点让位后的弧）', J(r9));
  }

  /* T10 变化音拼写与同谱简谱声部一致（respellNote 同一张表；固定调导入按原调号方向 song.spellDir；声部已有写法优先） */
  {
    const r10 = await pg.evaluate(() => {
      const svg = document.getElementById('score'), out = {};
      const read = sel => { const ts = [...svg.querySelectorAll(sel)].filter(t => !t.classList.contains('jptup'));
        const acc = ts.filter(t => /^[♯♭]$/.test(t.textContent)), dg = ts.filter(t => /^[0-7]$/.test(t.textContent) && t.getAttribute('font-size') === '17');
        return dg.map(d => { const x = +d.getAttribute('x'), y = +d.getAttribute('y'); const a = acc.find(t => Math.abs(+t.getAttribute('x') - (x - 9.9)) < 0.3 && Math.abs(+t.getAttribute('y') - (y - 2.5)) < 0.3); return (a ? a.textContent : '') + d.textContent; }).join(' '); };
      const jp = () => read('g[data-tabjp="0"] text');
      const vox = () => { const ts = [...svg.querySelectorAll('text')].filter(t => !t.closest('g[data-tabjp]'));
        const acc = ts.filter(t => /^[♯♭]$/.test(t.textContent) && t.getAttribute('font-size') === '14.5'), dg = ts.filter(t => /^[0-7]$/.test(t.textContent) && t.getAttribute('font-size') === '17' && t.getAttribute('font-family') === 'var(--font-ui)');
        return dg.map(d => { const x = +d.getAttribute('x'), y = +d.getAttribute('y'); const a = acc.find(t => Math.abs(+t.getAttribute('x') - (x - 9.9)) < 0.3 && Math.abs(+t.getAttribute('y') - (y - 2.5)) < 0.3); return (a ? a.textContent : '') + d.textContent; }).join(' '); };
      const FR = m => { const T = [64, 59, 55, 50, 45, 40]; let best = null; T.forEach((t, i) => { const f = m - t; if (f >= 0 && f <= 24 && (!best || f < best.f)) best = { s: i + 1, f }; }); return best; };
      const mk = (abs, key, vSpell) => { const s = createSong('guitar', { title: '拼写', beats: abs.length, unit: 4, key: key || 'C', nMea: 1, nTab: 1, nVox: vSpell ? 1 : 0, lyr: 0 }); s.tabJp = true;
        s.measures[0].tabs[0] = abs.map(m => { const p = FR(m); return __T(4, [{ s: p.s, f: p.f }]); });
        if (vSpell) s.measures[0].voxes[0] = abs.map(m => { const v = vSpell(m); return __V(v.deg, 4, { acc: v.acc, oct: v.oct }); });
        return s; };
      const show = s => { if (typeof undoStack !== 'undefined') undoStack.length = 0; loadSong(s); blurSel = true; render(); };
      /* a 改记谱调（与导入 importKeyApply 同一函数）：1=C 的 C F D A ♯F ♯G 改记 1=D → 声部 ♭7 ♭3 1 5 3 ♯4，联排行同写法 */
      { const s = mk([72, 77, 74, 69, 78, 80], 'C', m => midiToVoxCol(m)); respellSongKey(s, 'D', { spell: 'pc', dir: 'auto' }); show(s); out.a = { jp: jp(), vox: vox() }; }
      /* b 固定调导入：♭E 大调旋律 ♭E ♭A ♭B G → 1=C、原调号方向 flat（importKeyApply）；声部与联排行都写 ♭3 ♭6 ♭7 5 */
      { const s = mk([75, 80, 82, 79], 'Eb', m => respellNote(m, 'Eb', 0, { dir: 'auto' })); importKeyApply(s, { fixed: true, snd: 'Eb', src: 'det' }); show(s); out.b = { jp: jp(), vox: vox(), dir: song.spellDir || null, key: song.key }; }
      /* c 声部手写 ♭6（1=C，非导入）→ 同音高的 TAB 音联排行也写 ♭6 */
      { const s = mk([68, 72], 'C', m => m === 68 ? { deg: 6, acc: 'b', oct: 0 } : { deg: 1, acc: '', oct: 1 }); show(s); out.c = { jp: jp(), vox: vox() }; }
      /* d 无简谱声部：auto 表（GB 惯例 ♯1 ♭3 ♯4 ♯5 ♭7） */
      { const s = mk([73, 75, 78, 80, 82], 'C'); show(s); out.d = { jp: jp() }; }
      return out; });
    T(r10.a.jp === r10.a.vox && r10.a.vox === '♭7 ♭3 1 5 3 ♯4' && r10.b.jp === r10.b.vox && r10.b.jp === '♭3 ♭6 ♭7 5' && r10.b.dir === 'flat' && r10.b.key === 'C'
      && r10.c.jp === r10.c.vox && r10.c.jp === '♭6 1' && r10.d.jp === '♯1 ♭3 ♯4 ♯5 ♭7',
      'T10 变化音拼写同简谱声部：改记谱调 auto 表 / 固定调导入按原调号方向（spellDir）/ 声部已有写法优先 / 无声部时 ♯1 ♭3 ♯4 ♯5 ♭7', J(r10));
  }

  /* T11 GP 导入泛音类型：人工 / 点弦 / 拨片 / 半泛音不再当成自然泛音（GP5 二进制 + GPIF），联排行唱名随之正确 */
  {
    const mkW = () => { const a = []; const w = { arr: a, b: v => a.push(v & 255), i: v => a.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255), sh: v => a.push(v & 255, (v >> 8) & 255),
      z: n => { for (let i = 0; i < n; i++) a.push(0); }, bss: (s, size) => { const bf = Buffer.from(s, 'utf8'); a.push(Math.min(bf.length, size)); for (let i = 0; i < size; i++) a.push(i < bf.length ? bf[i] : 0); },
      ibs: s => { const bf = Buffer.from(s, 'utf8'); w.i(bf.length + 1); a.push(bf.length); bf.forEach(x => a.push(x)); }, iss: s => { const bf = Buffer.from(s, 'utf8'); w.i(bf.length); bf.forEach(x => a.push(x)); } }; return w; };
    const gp5 = (() => { const w = mkW();   /* 布局同 tv_gp T10 夹具（GP5.10，1 轨 2 小节）；音符带 0x08 效果 → 泛音字节 hv（2 后 3 字节 / 3 后 1 字节） */
      w.bss('FICHIER GUITAR PRO v5.10', 30); ['泛音', '', '', '', '', '', '', '', ''].forEach(s => w.ibs(s)); w.i(0);
      w.i(0); for (let i = 0; i < 5; i++) { w.i(0); w.iss(''); } w.i(0); w.z(4); w.z(11); w.z(30); for (let i = 0; i < 10; i++) w.ibs(''); w.ibs(''); w.i(90); w.b(0); w.b(0); w.i(0);
      for (let i = 0; i < 64; i++) { w.i(0); w.z(8); } w.z(42); w.i(2); w.i(1);
      w.b(0x03); w.b(4); w.b(4); w.z(4); w.z(1); w.b(0); w.z(1); w.b(0x00); w.z(1); w.b(0);
      w.z(1); w.b(0); w.bss('Lead', 40); w.i(6); [64, 59, 55, 50, 45, 40, 0].forEach(v => w.i(v)); w.i(1); w.i(1); w.i(2); w.i(24); w.i(0); w.i(0);
      w.z(29); w.i(0); w.i(0); w.i(0); w.i(0); w.z(4); w.ibs(''); w.ibs(''); w.z(1);
      const beat = (f, hv) => { w.b(0x00); w.b(0); w.b(0x40); w.b(0x28); w.b(1); w.b(f); w.z(1); w.b(0x00); w.b(0x10); w.b(hv); if (hv === 2) w.z(3); else if (hv === 3) w.b(f + 12); w.sh(0); };
      w.i(4); beat(12, 1); beat(5, 2); beat(5, 3); beat(5, 4); w.i(0); w.b(0);
      w.i(1); beat(5, 5); w.i(0); w.b(0);
      return Buffer.from(w.arr).toString('base64'); })();
    const gpif = ht => `<?xml version="1.0" encoding="utf-8"?><GPIF><Score><Title>t</Title></Score>
 <MasterTrack><Automations><Automation><Type>Tempo</Type><Bar>0</Bar><Value>60 2</Value></Automation></Automations></MasterTrack>
 <Tracks><Track id="0"><Name>A</Name><Staves><Staff><Properties><Property name="Tuning"><Pitches>40 45 50 55 59 64</Pitches></Property></Properties></Staff></Staves></Track></Tracks>
 <MasterBars><MasterBar><Key><AccidentalCount>0</AccidentalCount><Mode>Major</Mode></Key><Time>4/4</Time><Bars>0</Bars></MasterBar></MasterBars>
 <Bars><Bar id="0"><Voices>0 -1</Voices></Bar></Bars><Voices><Voice id="0"><Beats>0</Beats></Voice></Voices>
 <Beats><Beat id="0"><Rhythm ref="w"/><Notes>0</Notes></Beat></Beats><Rhythms><Rhythm id="w"><NoteValue>Whole</NoteValue></Rhythm></Rhythms>
 <Notes><Note id="0"><Properties><Property name="String"><String>5</String></Property><Property name="Fret"><Fret>5</Fret></Property><Property name="HarmonicType"><HType>${ht}</HType></Property></Properties></Note></Notes></GPIF>`;
    const X = {}; ['Natural', 'Artificial', 'Tap', 'Pinch', 'Semi'].forEach(k => X[k] = gpif(k));
    const r11 = await pg.evaluate(([b64, X]) => {
      const out = { gp5: null, gpif: {} };
      const u8 = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const r = parseGP(u8.buffer);
      if (r.error) out.gp5 = { error: r.error };
      else { const br = buildSongFromGP345(r.gp, [0]); if (br.error) out.gp5 = { error: br.error };
        else { const sg = br.song; const ns = sg.measures.flatMap(m => (m.tabs[0] || []).map(c => c.notes[0]).filter(Boolean));
          out.gp5 = ns.map(n => (n.tech || '-') + ':' + (n.hmT || '')).join(' ');
          sg.tabJp = true; if (typeof undoStack !== 'undefined') undoStack.length = 0; loadSong(sg); blurSel = true; render();
          /* 1 弦 5 品人工泛音＝A4+12＝A5 → 6̇（高音点 1 个）；自然泛音 12 品＝E5 → 3̇ */
          const dg = __jpDigits(0).filter(t => /^[1-7]$/.test(t.textContent)), dots = [...document.querySelectorAll('#score g[data-tabjp="0"] circle')].map(c => ({ x: +c.getAttribute('cx'), y: +c.getAttribute('cy') }));
          out.jp = dg.map(t => { const x = +t.getAttribute('x'), y = +t.getAttribute('y'); return t.textContent + "'".repeat(dots.filter(d => Math.abs(d.x - x) < 0.3 && d.y < y - 10).length); }).join(' '); } }
      for (const k in X) { const g = parseGPIFXml(X[k]); const b = g.error ? g : buildSongFromGP(g.gp || g, [0]); const n = b.error ? null : b.song.measures[0].tabs[0][0].notes[0]; out.gpif[k] = n ? (n.tech || '-') + ':' + (n.hmT || '') : (b.error || 'x'); }
      return out; }, [gp5, X]);
    T(r11.gp5 === 'hm: hm:A hm:T hm:P hm:A' && r11.jp === "3' 6' 6' 6' 6'" && r11.gpif.Natural === 'hm:' && r11.gpif.Artificial === 'hm:A' && r11.gpif.Tap === 'hm:T' && r11.gpif.Pinch === 'hm:P' && r11.gpif.Semi === 'hm:A',
      'T11 GP 导入泛音类型逐一映射（GP5 1 自然 / 2 人工 / 3 点弦 / 4 拨片 / 5 半泛音；GPIF 同名）→ 联排行按发声音高写（人工 1 弦 5 品 → 6̇，不是 3̈）', J(r11));
  }

  /* T12 切音扫弦（箭头带点 c.mute，节奏型 md/mu）与切音 ×（'x'）同记「X」；普通扫弦（有和弦形）照旧取最高音 */
  {
    const r12 = await pg.evaluate(() => {
      const s = createSong('guitar', { title: '切音', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 }); s.tabJp = true;
      const sh = chordShape('C'); s.measures[0].tabs[0] = [['d', 1], ['md', 2], ['u', 2], ['x', 2], ['mu', 2]].map(([t, d]) => evToCol([t, 8 / d * 1, 0], sh));
      s.measures[0].tabs[0].forEach(c => { c.dur = 8; }); s.measures[0].tabs[0][0].chord = 'C'; s.measures[0].tabs[0].push(__T(4, [{ s: 2, f: 1 }])); s.measures[0].tabs[0].push(__T(8, [{ s: 2, f: 1 }]));
      if (typeof undoStack !== 'undefined') undoStack.length = 0; loadSong(s); blurSel = true; render();
      return { heads: __jpDigits(0).map(t => t.textContent).join(''), kinds: s.measures[0].tabs[0].slice(0, 5).map(c => (c.strum || '-') + (c.mute ? 'm' : '')).join(' ') }; });
    T(r12.heads === '3X3XX11' && r12.kinds === 'd dm u -m um', 'T12 切音扫弦（md/mu：扫弦箭头带点）与切音 ×（x）同写 X，普通扫弦取和弦最高音', J(r12));
  }

  /* T13 长休止按 GB 逐拍写 0：二分 0 0 / 附点二分 0 0 0 / 全音 0 0 0 0；补写的 0 落在拍位列（与另一轨同拍音符列纵向对齐）、不与相邻数字相碰 */
  {
    const r13 = await pg.evaluate(() => {
      const svg = document.getElementById('score');
      const s = createSong('guitar', { title: '休止', beats: 4, unit: 4, key: 'C', nMea: 3, nTab: 2, nVox: 0, lyr: 0 }); s.tabJp = true;
      const q = () => [0, 1, 3, 1].map(f => __T(4, [{ s: 2, f }]));
      s.measures[0].tabs[0] = [__T(2, []), __T(4, [{ s: 2, f: 1 }]), __T(4, [{ s: 2, f: 3 }])];
      s.measures[1].tabs[0] = [__T(1, [])];
      s.measures[2].tabs[0] = [__T(2, [], { dotted: true }), __T(4, [{ s: 2, f: 1 }])];
      s.measures.forEach(m => { m.tabs[1] = q(); });
      if (typeof undoStack !== 'undefined') undoStack.length = 0; loadSong(s); blurSel = true; render();
      const d0 = __jpDigits(0), d1 = __jpDigits(1);
      const xs1 = d1.map(t => +t.getAttribute('x'));
      const zeros = d0.filter(t => t.textContent === '0').map(t => +t.getAttribute('x'));
      const align = zeros.every(x => xs1.some(x1 => Math.abs(x1 - x) < 0.6));
      const bb = d0.map(t => t.getBBox()).sort((a, b) => a.x - b.x); let gap = 1e9; for (let i = 1; i < bb.length; i++) gap = Math.min(gap, bb[i].x - (bb[i - 1].x + bb[i - 1].width));
      return { heads: d0.map(t => t.textContent).join(' '), align, gap: +gap.toFixed(2), dash: svg.querySelectorAll('g[data-tabjp="0"] line.jdash').length }; });
    T(r13.heads === '0 0 1 2 0 0 0 0 0 0 0 1' && r13.align && r13.gap > 0 && r13.dash === 0,
      'T13 长休止逐拍写 0（二分 0 0 / 全音 0 0 0 0 / 附点二分 0 0 0）、补写的 0 对齐另一轨拍位列、不接增时线', J(r13));
  }

  /* T14 组内连音线 × 连音弧：连音弧抬一档，两弧不再同起点相压（联排行与简谱声部同一口径） */
  {
    const r14 = await pg.evaluate(() => {
      const svg = document.getElementById('score');
      const samp = el => { const L = el.getTotalLength(), o = []; for (let i = 0; i <= 60; i++) { const p = el.getPointAtLength(L * i / 60); o.push([p.x, p.y]); } return o; };
      const near = (A, B) => { let m = 1e9; A.forEach(([x, y]) => B.forEach(([u, v]) => { m = Math.min(m, Math.hypot(x - u, y - v)); })); return m; };
      const out = {};
      /* 联排行：三连音前两音同音延音（1 弦 20 品） */
      { const s = createSong('guitar', { title: 't', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0 }); s.tabJp = true;
        s.measures[0].tabs[0] = [__T(8, [{ s: 1, f: 20 }], { tup: 3 }), __T(8, [{ s: 1, f: 20, tieIn: true }], { tup: 3 }), __T(8, [{ s: 1, f: 22 }], { tup: 3 }), __T(4, [{ s: 1, f: 8 }]), __T(2, [{ s: 1, f: 8 }])];
        if (typeof undoStack !== 'undefined') undoStack.length = 0; loadSong(s); blurSel = true; render();
        const tie = svg.querySelector('g[data-tabjp] path.jptie'), tup = [...svg.querySelectorAll('g[data-tabjp] path')].find(p => !p.classList.contains('jptie'));
        const box = svg.querySelector('g[data-tabjp] rect');
        const tb = tie && tie.getBBox(), rb = box && box.getBBox();
        out.jp = { d: tie && tup ? +near(samp(tie), samp(tup)).toFixed(2) : null, boxClear: !!(tb && rb && (rb.y + rb.height <= tb.y + 0.01 || rb.x >= tb.x + tb.width || rb.x + rb.width <= tb.x)) }; }
      /* 简谱声部：同节奏（TAB 在上方 → 弧顶到 TAB 墨迹的净距也量；与同谱去掉连音线（不抬弧）对比，抬弧不得吃掉上方净距——上方空间同抬一档） */
      const vox = tie => { const s = createSong('guitar', { title: 'v', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 1, lyr: 0 });
        s.measures[0].tabs[0] = [__T(8, [{ s: 6, f: 3 }], { tup: 3 }), __T(8, [{ s: 6, f: 3 }], { tup: 3 }), __T(8, [{ s: 6, f: 3 }], { tup: 3 }), __T(4, [{ s: 6, f: 3 }]), __T(2, [{ s: 6, f: 3 }])];
        s.measures[0].voxes[0] = [__V(1, 8, { tup: 3, oct: 2, tie }), __V(1, 8, { tup: 3, oct: 2 }), __V(2, 8, { tup: 3, oct: 2 }), __V(3, 4), __V(1, 2)];
        if (typeof undoStack !== 'undefined') undoStack.length = 0; loadSong(s); blurSel = true; render();
        /* 简谱声部数字基线 vy（17 号 font-ui，联排行未点亮）→ 其上方 45px 内的弧 = 声部的连音线 / 连音弧（按宽度分：窄＝连音线） */
        const vd = [...svg.querySelectorAll('text')].filter(t => t.getAttribute('font-size') === '17' && t.getAttribute('font-family') === 'var(--font-ui)' && /^[1-7]$/.test(t.textContent));
        const vy = +vd[0].getAttribute('y');
        const arcs = [...svg.querySelectorAll('path')].filter(p => /^M [\d.]+ [\d.]+ Q/.test(p.getAttribute('d') || '')).filter(p => { const q = p.getBBox(), c = q.y + q.height / 2; return c > vy - 45 && c < vy; }).sort((a, b) => a.getBBox().width - b.getBBox().width);
        const tieV = arcs[0], tupV = arcs[arcs.length - 1];
        const boxV = [...svg.querySelectorAll('rect')].find(r => r.getAttribute('fill') === 'var(--paper)' && +r.getAttribute('height') === 9 && Math.abs(r.getBBox().y + 4.5 - (vy - 30)) < 20);
        const tb = tieV && tieV.getBBox(), rb = boxV && boxV.getBBox();
        /* 弧顶 / 底块到上方其他墨迹（TAB 符干 / 符杠 / 连音括线数字…）的净距 */
        const top = rb ? Math.min(rb.y, tupV.getBBox().y) : null;
        const above = top == null ? [] : [...svg.querySelectorAll('text,line,path,circle,polygon')].filter(el => el !== tieV && el !== tupV && __vis(el)).map(el => ({ el, q: el.getBBox() }))
          .filter(o => o.q.y + o.q.height <= top + 2 && o.q.y + o.q.height > top - 40 && Math.min(o.q.x + o.q.width, rb.x + rb.width + 20) - Math.max(o.q.x, rb.x - 20) > 0);
        const upGap = above.length ? Math.min(...above.map(o => top - (o.el.tagName === 'text' ? __inkT(o.el).b / svg.getScreenCTM().d - (svg.getBoundingClientRect().top / svg.getScreenCTM().d) : o.q.y + o.q.height))) : 99;
        return { n: arcs.length, d: tieV && tupV && tieV !== tupV ? +near(samp(tieV), samp(tupV)).toFixed(2) : null, boxClear: !!(tb && rb && (rb.y + rb.height <= tb.y + 0.01 || rb.x >= tb.x + tb.width || rb.x + rb.width <= tb.x)),
          upGap: +upGap.toFixed(2) }; };
      out.vox = vox(true); out.vox0 = vox(false);
      return out; });
    T(r14.jp.d >= 1.5 && r14.jp.boxClear && r14.vox.n === 2 && r14.vox.d >= 1.5 && r14.vox.boxClear && r14.vox.upGap >= r14.vox0.upGap - 0.5,
      'T14 组内连音线与连音弧不相压：连音弧抬一档（联排行 / 简谱声部同口径），连音数字的纸色底块不切断连音线；声部上方空间同抬一档（弧顶到上方 TAB 墨迹的净距不小于不抬弧时）', J(r14));
  }

  /* T15 render 之外量版面（合行按钮 / 打印预估 / 回归套件）：虚拟简谱列逐小节只回溯一次前面小节的和弦（此前逐列回溯，无和弦长谱 O(n²)） */
  {
    const r15 = await pg.evaluate(() => {
      const s = createSong('guitar', { title: '长谱', beats: 4, unit: 4, key: 'C', nMea: 64, nTab: 2, nVox: 0, lyr: 0 }); s.tabJp = true;
      s.measures.forEach(m => { [0, 1].forEach(vi => { m.tabs[vi] = [0, 1, 3, 1, 0, 3, 1, 0].map(f => __T(8, [{ s: 2, f }])); }); });
      if (typeof undoStack !== 'undefined') undoStack.length = 0; loadSong(s); blurSel = true; render();
      const f0 = window.chordEvtsMea; let n = 0; window.chordEvtsMea = function () { n++; return f0.apply(this, arguments); };
      let L; try { L = layoutSystems(); } finally { window.chordEvtsMea = f0; }
      return { calls: n, measures: s.measures.length, sys: L.length }; });
    T(r15.sys > 0 && r15.calls <= r15.measures * 6, 'T15 render 外 layoutSystems：和弦回溯次数 O(小节数)（64 小节 × 2 轨 ≤ 6×小节数）', J(r15));
  }

  if (errs.length) { T(false, '页面报错', errs.slice(0, 3).join(' | ')); }
  else console.log('NO ERRORS');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
