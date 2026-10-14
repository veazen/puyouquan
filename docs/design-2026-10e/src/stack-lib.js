/* 最终方案 · 谱行引擎（底稿＝方向 B stack-lib.js，合稿新增：统一谱名表 KIND、换谱类规则 switchPlan、器乐 instKey/谱号）。
   方向 B「记谱法优先」参考实现（页面上下文运行，依赖编辑器全局：createSong / blankVoxCols / migrate / render / docType / docTypeLabel / svgResolveVars）。
   NWB.ROWS    五种谱行（简谱 J / 五线谱 S / 六线谱 T / 大谱表 G / 和弦 C）
   NWB.STACKS  14 种合法叠加 → 现有 createSong 类型 + 后处理（只写既有字段，零新增必需字段）
   NWB.resolve 点选谱行时的叠加/替换规则
   NWB.build   真实建谱（空白，8 小节）——方案落地时 showNewWizard 的「创建」直接调它
   NWB.sample  同一段《小星星》前 4 小节灌进任意叠加——预览用
   NWB.svg     借谱渲染（同 buildThumbCanvas 的借还口径）→ 裁出页头＋首行的 SVG 字符串 */
(function(){
const ROWS = {
  C:{k:'C', name:'和弦',   sub:'和弦名 / 级数 / 小节格'},
  J:{k:'J', name:'简谱',   sub:'数字谱 · 首调'},
  S:{k:'S', name:'五线谱', sub:'单谱表 · 高/中/低音谱号'},
  G:{k:'G', name:'钢琴大谱表', sub:'双手 · 高音＋低音谱表'},
  T:{k:'T', name:'六线谱', sub:'TAB · 吉他 / 尤克里里'},
};
/* 行序＝谱面自上而下的顺序（和弦在最上，旋律其次，伴奏乐器在下） */
const ORDER = ['C','S','J','G','T'];
const STACKS = {
  J:   {rows:['J'],          type:'vocal',    title:'简谱旋律'},
  S:   {rows:['S'],          type:'instr',    title:'五线谱旋律'},
  SJ:  {rows:['S','J'],      type:'teach',    title:'五线谱＋简谱对照'},
  T:   {rows:['T'],          type:'tanchang', title:'六线谱（仅 TAB）'},
  JT:  {rows:['J','T'],      type:'tanchang', title:'简谱旋律＋六线谱'},
  ST:  {rows:['S','T'],      type:'solo',     title:'五线谱＋六线谱联排'},
  G:   {rows:['G'],          type:'piano',    title:'钢琴大谱表'},
  CG:  {rows:['C','G'],      type:'pianoacc', title:'和弦名＋钢琴伴奏'},
  JG:  {rows:['J','G'],      type:'vocal',    title:'简谱旋律＋钢琴伴奏'},
  SG:  {rows:['S','G'],      type:'instr',    title:'五线谱旋律＋钢琴伴奏'},
  SJG: {rows:['S','J','G'],  type:'teach',    title:'对照旋律＋钢琴伴奏'},
  CJ:  {rows:['C','J'],      type:'func',     title:'简谱＋和弦'},
  CS:  {rows:['C','S'],      type:'func',     title:'五线谱＋和弦'},
  C:   {rows:['C'],          type:'func',     title:'和弦格（小节格）'},
};
const keyOf = rows => ORDER.filter(r=>rows.includes(r)).join('');
const VALID = Object.keys(STACKS);
/* 冲突说明：点选后若组合不合法，保留新点的行、尽量多保留原有行，并说清换掉了什么、为什么 */
function why(want){
  const h=r=>want.includes(r);
  if(h('T')&&h('G')) return '六线谱和钢琴大谱表是两种乐器——先建一种，建好后左栏「＋音轨」再加另一种';
  if(h('T')&&h('J')&&h('S')) return '六线谱只配一行旋律：简谱（弹唱）或五线谱（独奏联排）';
  if(h('C')&&h('T')) return '六线谱自带和弦图与和弦名，不必再叠「和弦」行';
  if(h('C')&&h('S')&&h('J')) return '教学对照谱的和弦在建好后用左栏「和弦」标注';
  if(h('C')&&h('G')) return '钢琴伴奏的和弦名随伴奏一起生成，不另占一行';
  if(want.length>3) return '最多叠 3 行谱';
  return '这几行不能排在同一页';
}
const WHY = {why};
function resolve(cur, tap){
  const has = cur.includes(tap);
  if(has){
    if(cur.length===1) return {rows:cur, note:'至少保留一行谱'};
    const next = cur.filter(r=>r!==tap); const k=keyOf(next);
    if(STACKS[k]) return {rows:STACKS[k].rows.slice(), note:''};
    const c = VALID.filter(v=>next.every(r=>STACKS[v].rows.includes(r))).sort((a,b)=>STACKS[a].rows.length-STACKS[b].rows.length)[0];
    return {rows:(c?STACKS[c].rows:next).slice(), note:''};
  }
  /* 「和弦」已含在内：六线谱自带和弦图；旋律＋钢琴伴奏的和弦名随伴奏生成——不改组合，只说明 */
  if(tap==='C' && (cur.includes('T') || (cur.includes('G') && (cur.includes('J')||cur.includes('S')))))
    return {rows:cur.slice(), note: cur.includes('T')? '六线谱已自带和弦图与和弦名，不必再叠「和弦」行；要做纯和弦谱请点常用组合「和弦谱」' : '钢琴伴奏的和弦名随伴奏一起生成，已包含在内'};
  const want = cur.concat(tap); const k=keyOf(want);
  if(STACKS[k]) return {rows:STACKS[k].rows.slice(), note:''};
  let best=null, bs=-1e9;
  VALID.forEach(v=>{ const rr=STACKS[v].rows; if(!rr.includes(tap)) return;
    /* 计分：保留原有行（乐器行 T/G 略优先）减去「用户没点、却被顺带加上」的行 */
    const keep = rr.filter(r=>cur.includes(r)).reduce((a,r)=>a+(r==='T'||r==='G'?10.5:r==='C'?9.5:10),0), added = rr.filter(r=>r!==tap && !cur.includes(r)).length;
    const sc = keep - added;
    if(sc>bs){ bs=sc; best=v; } });
  const dropped = cur.filter(r=>!STACKS[best].rows.includes(r));
  return {rows:STACKS[best].rows.slice(), note: dropped.length? ('已换下「'+dropped.map(r=>ROWS[r].name).join('」「')+'」：'+why(want)) : ''};
}

/* ---------- 建谱：一律走 createSong，后处理只写既有字段 ---------- */
const DUR = (beats, unit)=>blankVoxCols(beats, unit);
function addVoxRow(s, name, nota){
  s.voxVoices.push(name);
  s.voxNotations = s.voxNotations || s.voxVoices.slice(0,-1).map(()=>undefined);
  while(s.voxNotations.length < s.voxVoices.length-1) s.voxNotations.push(undefined);
  s.voxNotations.push(nota);
  s.measures.forEach(m=>m.voxes.push(DUR(s.beats, s.unit)));
}
function build(id, o){
  o = Object.assign({title:'未命名曲谱', key:'C', beats:4, unit:4, tempo:90, nMea:8, nVox:1, inst:'guitar'}, o||{});
  const st = STACKS[id]; if(!st) throw new Error('unknown stack '+id);
  const base = {title:o.title, key:o.key, beats:o.beats, unit:o.unit, tempo:o.tempo, nMea:o.nMea, capo:o.capo||0,
    maker:o.maker||'', tempoUnit:o.tempoUnit, tuning:o.tuning};
  let s;
  switch(id){
    case 'J':  s = createSong('vocal', Object.assign(base,{nVox:o.nVox, lyr:o.lyr!=null?o.lyr:1})); break;
    case 'S':  s = createSong('instr', Object.assign(base,{nVox:o.nVox, clef:o.clef||'staff', lyr:o.lyr!=null?o.lyr:0})); break;
    case 'SJ': s = createSong('teach', Object.assign(base,{nVox:o.nVox, lyr:o.lyr!=null?o.lyr:1})); break;
    case 'T':  s = createSong('tanchang', Object.assign(base,{inst:o.inst, nTab:1, nVox:0, lyr:0})); break;
    case 'JT': s = createSong('tanchang', Object.assign(base,{inst:o.inst, nTab:1, nVox:1, lyr:1})); break;
    case 'ST': s = createSong('solo', Object.assign(base,{nTab:1, nVox:0, lyr:0, gtype:o.gtype})); break;
    case 'G':  s = createSong('piano', Object.assign(base,{lyr:0})); break;
    case 'CG': s = createSong('pianoacc', Object.assign(base,{lyr:1})); break;
    case 'CJ': s = createSong('func', Object.assign(base,{ftype:'func', nVox:1, lyr:1})); break;
    case 'CS': s = createSong('func', Object.assign(base,{ftype:'func', nVox:1, lyr:1})); s.voxNotations=['staff']; break;
    case 'C':  s = createSong('func', Object.assign(base,{ftype:'chord', nVox:1, lyr:0})); break;
    case 'JG': case 'SG': case 'SJG': {
      /* 旋律＋钢琴伴奏＝arrangeAccompaniment（v45 起「一键配伴奏」产物）的同一结构：旋律 / 右手伴奏 / 左手伴奏 */
      s = createSong(id==='JG'?'vocal':'instr', Object.assign(base,{nVox:1, clef:'staff', lyr:o.lyr!=null?o.lyr:1}));
      s.voxVoices=['旋律']; s.voxNotations=[id==='JG'? undefined : 'staff'];
      addVoxRow(s,'右手伴奏','staff'); addVoxRow(s,'左手伴奏','bass');
      if(id==='SJG') s.voxDual=[true,false,false];
      s.funcNames = true;
      /* 显式把钢琴两行标成花括号组（v64.4 voxGroups 既有字段）：否则五线谱旋律一填词，isChoir 推断会把三行当合唱，谱类漂成「五线谱合唱谱」 */
      s.voxGroups = [{type:'brace', from:1, to:2}];
      break; }
  }
  if(o.mode==='minor') s.mode='minor';
  if((id==='J'||id==='S'||id==='SJ') && (s.voxVoices||[]).length>1) s.voxGroups=[{type:'bracket', from:0, to:s.voxVoices.length-1}];
  s.layout = Object.assign({}, s.layout||{}, {fixed:true});
  if(o.instKey && ['J','S','G','CG','JG','SG','SJG'].includes(id)){ /* 合稿：民乐（J）/管弦（S）/键盘（G）都写 instKey */
    s.instKey=o.instKey;
    /* 同现状 v60.46：按乐器预置混音台默认音色（NW_INSTS.tim） */
    const it=(typeof NW_INSTS!=='undefined') && NW_INSTS.find(x=>x.k===o.instKey);
    if(it && it.tim){ s.mixer={}; s.voxVoices.forEach((_,i)=>{ s.mixer['vox:'+i]={on:true,solo:false,inst:it.tim,vol:1,pan:null}; }); }
  }
  return s;
}

/* ---------- 预览样例：同一段旋律灌进任意叠加（默认《小星星》首句；导入演示用《茉莉花》） ---------- */
/* 记法：数字＝四分音符的级数；[级数, 时值(4/8/2/16), 八度, 附点?] */
const TUNES = {
  twinkle:{ title:'小星星', composer:'法国民谣',
    '4/4':{mel:[[1,1,5,5],[6,6,[5,2]],[4,4,3,3],[2,2,[1,2]]], ly:[['一','闪','一','闪'],['亮','晶','晶'],['满','天','都','是'],['小','星','星']],
           ch:[['C'],['F',null,'C'],['F',null,'C'],['G7',null,'C']]},
    '2/4':{mel:[[1,1],[5,5],[6,6],[[5,2]]], ly:[['一','闪'],['一','闪'],['亮','晶'],['晶']], ch:[['C'],[null],['F'],['C']]},
    '3/4':{mel:[[1,1,5],[5,6,6],[[5,2,0,1]]], ly:[['一','闪','一'],['闪','亮','晶'],['晶']], ch:[['C'],[null,'F'],['C']]},
    '6/8':{mel:[[1,[1,8],5,[5,8]],[6,[6,8],[5,4,0,1]]], ly:[['一','闪','一','闪'],['亮','晶','晶']], ch:[['C'],['F',null,'C']]} },
  jasmine:{ title:'茉莉花', composer:'江苏民歌',
    '2/4':{mel:[[[3,8],[3,8],[5,8],[6,8]],[[1,8,1],[1,8,1],[6,8],[5,8]],[[5,2]]], ly:[['好','一','朵','美'],['丽','的','茉','莉'],['花']],
           ch:[['F'],['F',null,'Dm'],['C']]} },
};
const ALTO= [[1,1,3,3],[4,4,[3,2]],[2,2,1,1],[[7,4,-1],[7,4,-1],[1,2]]];
const TEN = [[[5,4,-1],[5,4,-1],1,1],[1,1,[1,2]],[[6,4,-1],[6,4,-1],[5,4,-1],[5,4,-1]],[[5,4,-1],[5,4,-1],[5,2,-1]]];
const BAS = [[[1,4,-1],[1,4,-1],[1,4,-1],[1,4,-1]],[[4,4,-1],[4,4,-1],[1,2,-1]],[[4,4,-1],[4,4,-1],[1,4,-1],[1,4,-1]],[[5,4,-2],[5,4,-2],[1,2,-1]]];
function vc(x, ly, ch){ const a=Array.isArray(x)?x:[x,4,0];
  return {dur:a[1]||4, dotted:!!a[3], deg:a[0], acc:'', oct:a[2]||0, lyrics: ly?[ly]:[], tie:false, chord: ch||''}; }
function tuneOf(o){ const t=TUNES[o.tune||'twinkle']; const m=(o.beats||4)+'/'+(o.unit||4); return {t, P:t[m]||t['4/4']||t['2/4']}; }
function melCols(P, mi, opt){ return P.mel[mi].map((x,i)=>vc(x, opt.ly? P.ly[mi][i]:'', opt.ch? (P.ch[mi][i]||''):'')); }
function partCols(Q, mi){ return Q[mi].map(x=>vc(x)); }
function T(notes, ch, dur){ return {dur:dur||8, dotted:false, chord:ch||'', notes:notes.map(n=>({s:n[0],f:n[1]})), strum:''}; }
const ARP = {
  guitar:{C:[[5,3],[3,0],[2,1],[3,0]], F:[[4,3],[3,2],[2,1],[3,2]], G7:[[6,3],[3,0],[2,0],[1,1]]},
  uku:   {C:[[4,0],[3,0],[2,0],[1,3]], F:[[4,2],[3,0],[2,1],[1,0]], G7:[[4,0],[3,2],[2,1],[1,2]]},
};
function arpMea(inst, mi, beats, unit){
  const A=ARP[inst]; const out=[];
  const halves = mi===0? ['C','C'] : mi===1? ['F','C'] : mi===2? ['F','C'] : ['G7','C'];
  const n8 = Math.max(2, Math.round((beats||4)*8/(unit||4))), cut = Math.ceil(n8/2);   /* 按拍号铺满八分音符分解 */
  for(let i=0;i<n8;i++){ const h=i<cut?0:1, c=halves[h], j=h?i-cut:i;
    out.push(T([A[c][j%4]], (j===0 && !(h===1 && halves[0]===c))? c : '', 8)); }
  return out;
}
const GPOS = {1:[2,1], 2:[2,3], 3:[1,0], 4:[1,1], 5:[1,3], 6:[1,5]};
const GBASS = {C:[5,3], F:[4,3], G7:[6,3]};
function soloMea(P, mi){
  return P.mel[mi].map((x,i)=>{ const d=Array.isArray(x)?x[0]:x, dur=Array.isArray(x)?x[1]:4;
    const ch=P.ch[mi][i]; const ns=[GPOS[d]]; if(ch && GBASS[ch]) ns.unshift(GBASS[ch]);
    return Object.assign(T(ns, '', dur), {dotted:Array.isArray(x)&&!!x[3]}); });
}
function sample(id, o){
  o = Object.assign({inst:'guitar', nVox:1, key:'C', beats:4, unit:4}, o||{});
  const {t, P} = tuneOf(o);
  o.title = o.title || t.title; o.nMea = P.mel.length;
  if(!o.tune || o.tune==='twinkle'){ if(o.beats===4 && o.unit===4) o.nMea=2; }
  const s = build(id, Object.assign({}, o));
  delete s.layout;   /* 预览按窄版宽排（NWB.svg 临时把 #paper 设成预览框宽），不走 A4 固定版宽 */
  s.composer = t.composer;
  const nv = (s.voxVoices||[]).length;
  if(id==='CG'||id==='JG'||id==='SG'||id==='SJG'){
    /* 伴奏行用编辑器自己的织体引擎生成（arrangeAccompaniment→genAccompaniment，按拍号取第一套织体）——不是手画 */
    const mel = build(id==='JG'?'J':'S', Object.assign({}, o));
    mel.measures.forEach((m,mi)=>{ m.voxes[0]=melCols(P,mi,{ly:true, ch:true}); });
    const r = arrangeAccompaniment(mel, {pure: id==='CG', suggest:false});
    const t2 = r.song; t2.title=s.title; t2.composer=s.composer;
    if(id==='JG'){ t2.voxNotations=[undefined,'staff','bass']; delete t2.voxDual; }
    if(id==='SG'){ delete t2.voxDual; }
    if(id!=='CG') t2.voxGroups=[{type:'brace', from:1, to:2}];
    delete t2.layout; if(s.mode) t2.mode=s.mode;
    t2.measures[t2.measures.length-1].finalBar = true;
    return t2;
  }
  s.measures.forEach((m,mi)=>{
    switch(id){
      case 'J': case 'S': case 'SJ':
        m.voxes[0] = melCols(P,mi,{ly: id!=='S' || !!o.lyr});
        if(nv>1) m.voxes[1]=partCols(ALTO,mi);
        if(nv>2) m.voxes[2]=partCols(TEN,mi);
        if(nv>3) m.voxes[3]=partCols(BAS,mi);
        break;
      case 'CJ': case 'CS': m.voxes[0] = melCols(P,mi,{ly:true, ch:true}); break;
      case 'C': { const n=o.beats||4; m.voxes[0] = Array.from({length:n},(_,i)=>Object.assign(vc([0,o.unit||4]),{chord:(P.ch[mi][i]||'')})); break; }
      case 'T': m.tabs[0] = arpMea(o.inst, mi, o.beats, o.unit); break;
      case 'JT': m.tabs[0] = arpMea(o.inst, mi, o.beats, o.unit); m.voxes[0]=melCols(P,mi,{ly:true}); break;
      case 'ST': m.tabs[0] = soloMea(P, mi); break;
      case 'G': m.voxes[0] = melCols(P,mi,{}); if(o.beats===4 && o.unit===4) m.voxes[1] = partCols(BAS,mi); break;
    }
  });
  if(id==='C') s.lyricLines=0;
  s.measures[s.measures.length-1].finalBar = true;
  return s;
}
/* 导入演示：旋律按文件（五线谱、带词）→ 任意目标叠加；六线谱目标真实调用 mapVoxToTab（编辑器「显示·六线谱」同一函数） */
function sampleFromMelody(id, o){
  o = Object.assign({tune:'jasmine', key:'F', beats:2, unit:4, inst:'guitar'}, o||{});
  if(id==='JT' || id==='ST' || id==='T'){
    const {t,P} = tuneOf(o);
    const s = build('JT', Object.assign({}, o, {title:t.title, nMea:P.mel.length}));
    delete s.layout; s.composer=t.composer;
    s.measures.forEach((m,mi)=>{ m.voxes[0]=melCols(P,mi,{ly:true, ch:true}); m.tabs[0]=[]; });
    s.tabVoices=[]; s.measures.forEach(m=>m.tabs=[]);
    const o0=song; song=s; try{ mapVoxToTab(0,'follow'); } finally { song=o0; }
    if(id==='ST'||id==='T'){ s.voxVoices=[]; s.measures.forEach(m=>m.voxes=[]); s.lyricLines=0; delete s.voxNotations; }
    if(id==='ST') s.tabStaff=true;
    s.measures[s.measures.length-1].finalBar=true;
    return s;
  }
  if(id==='G' || id==='C'){
    const {t,P} = tuneOf(o);
    const s = build(id, Object.assign({}, o, {title:t.title, nMea:P.mel.length})); delete s.layout; s.composer=t.composer;
    s.measures.forEach((m,mi)=>{
      if(id==='G') m.voxes[0]=melCols(P,mi,{});
      else { const n=o.beats||4; m.voxes[0]=Array.from({length:n},(_,i)=>Object.assign(vc([0,o.unit||4]),{chord:(P.ch[mi][i]||'')})); }
    });
    if(id==='C') s.lyricLines=0;
    s.measures[s.measures.length-1].finalBar=true;
    return s;
  }
  return sample(id, o);
}
/* 反向映射：任意曲谱数据 → 谱行组合（导入推荐 / 页签图标 / 统一名称都读它；只读数据，不存字段，不会漂移出错） */
function stackOf(s){
  const vn=s.voxNotations||[], nv=(s.voxVoices||[]).length, dual=s.voxDual||[];
  if((s.tabVoices||[]).length){ if(s.tabStaff && !nv) return 'ST'; return nv? 'JT' : 'T'; }
  if(s.chordOnly) return 'C';
  if(s.func) return isStaffNota(vn[0])? 'CS' : 'CJ';
  if(s.pianoAcc) return 'CG';
  const pair = nv>=2 && vn[nv-2]==='staff' && vn[nv-1]==='bass';
  if(pair && nv===2 && !isChoir(s)) return 'G';
  if(pair && nv===3) return isStaffNota(vn[0])? (dual[0]? 'SJG' : 'SG') : 'JG';
  if(isStaffNota(vn[0])) return dual[0]? 'SJ' : 'S';
  return 'J';
}
/* ---------- 借谱渲染 → 页头＋首行 SVG ---------- */
function svg(data, opt){
  opt = opt||{};
  const el = document.getElementById('score');
  const keep = {song:song, blur:blurSel, note:noteSel, sel:sel, bar:barSel, rng:selRange,
    mSel:measureSel, mRng:measureRange, mHnd:meaHandleOn, aTab:activeTab, pp:PRINT_PAGING};
  let inner='', vw=0, ms=0, bb=null, bands={};
  const paper=document.getElementById('paper'), pst=paper? paper.getAttribute('style') : null;
  try{
    PRINT_PAGING = true;
    if(paper && opt.paperW){ paper.style.width=opt.paperW+'px'; paper.style.maxWidth=opt.paperW+'px'; paper.style.minWidth=opt.paperW+'px'; }
    if(paper && getComputedStyle(paper).display==='none'){ paper.style.display='block'; }   /* 启动台遮住 #paper 时也能量墨迹（正式版用离屏目标，无此问题） */
    song = migrate(JSON.parse(JSON.stringify(data)));
    blurSel = !opt.cursor; noteSel=[]; barSel=null; selRange=null; measureSel=null; measureRange=null; meaHandleOn=false;
    sel = opt.sel || {mi:0, row:(song.tabVoices.length && !opt.penVox)?'tab':'vox', vi:0, ci:0, si:1};
    const t0=performance.now(); render(); ms = performance.now()-t0;
    inner = el.innerHTML; vw = el.viewBox.baseVal.width;
    /* 内容包围盒：取所有一级子元素的 bbox 并集（#paper 必须可见） */
    /* 墨迹包围盒：叶子图元的屏幕矩形换回用户坐标；跳过页底纸 .pagebg 与透明热区 */
    const R=el.getBoundingClientRect(), k=R.width/vw; let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    el.querySelectorAll('text,line,path,circle,ellipse,polyline,polygon,rect,use').forEach(n=>{
      if(n.classList.contains('pagebg')) return;
      const f=n.getAttribute('fill'); if(n.tagName==='rect' && (f==='transparent'||f==='none'||n.hasAttribute('data-hd'))) return;
      if(n.closest('title')) return;
      const b=n.getBoundingClientRect(); if(!b.width && !b.height) return;
      x0=Math.min(x0,(b.left-R.left)/k); y0=Math.min(y0,(b.top-R.top)/k); x1=Math.max(x1,(b.right-R.left)/k); y1=Math.max(y1,(b.bottom-R.top)/k); });
    bb={x0,y0,x1,y1};
    bands={}; Object.keys(colBoxes).forEach(key=>{ const m=/^([tv])(\d+):0:0$/.exec(key); if(m){ const b=colBoxes[key]; bands[m[1]+m[2]]={y:b.y, h:b.h}; } });
  } finally {
    song=keep.song; blurSel=keep.blur; noteSel=keep.note; sel=keep.sel; barSel=keep.bar; selRange=keep.rng;
    measureSel=keep.mSel; measureRange=keep.mRng; meaHandleOn=keep.mHnd; activeTab=keep.aTab; PRINT_PAGING=keep.pp;
    if(paper){ if(pst==null) paper.removeAttribute('style'); else paper.setAttribute('style', pst); }
    if(!opt.noRestore){ try{ render(); }catch(_){} }
  }
  const pad=6, x=Math.max(0,bb.x0-pad), y=Math.max(0,bb.y0-pad), w=Math.min(vw, bb.x1+pad)-x, h=bb.y1-y+pad;
  const xml = svgResolveVars('<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+x.toFixed(1)+' '+y.toFixed(1)+' '+w.toFixed(1)+' '+h.toFixed(1)+'" width="'+w.toFixed(0)+'" height="'+h.toFixed(0)+'">'
    + '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" fill="#ffffff"/>' + inner + '</svg>');
  const fb={}; Object.keys(bands).forEach(k2=>{ fb[k2]={t:+((bands[k2].y-y)/h).toFixed(4), b:+((bands[k2].y+bands[k2].h-y)/h).toFixed(4)}; });
  return {xml, ms, w, h, vw, bands:fb, crop:{x,y,w,h}};
}
window.NWB = {ROWS, ORDER, STACKS, VALID, WHY, keyOf, resolve, build, sample, sampleFromMelody, stackOf, svg};

/* ---------- 合稿新增 ①：统一谱名表（面板标题 / 创建按钮 / 谱型条 / 页签提示 / 谱库卡片读同一张表；只读数据，不新增字段） ---------- */
const INST_N = {epiano:'电钢琴', synth:'电子琴', accordion:'手风琴', violin:'小提琴', flute:'长笛', sax:'萨克斯', trumpet:'小号', horn:'圆号', trombone:'长号', bass:'贝斯',
  erhu:'二胡', dizi:'笛子', hulusi:'葫芦丝', suona:'唢呐', guzheng:'古筝', pipa:'琵琶', yangqin:'扬琴', harmonica:'口琴', other:'器乐'};
const KIND_IC = {J:'type-vocal', S:'type-instr', SJ:'type-teach', SJG:'type-teach', T:'type-guitar', JT:'type-guitar', ST:'type-solo', G:'type-piano', CG:'type-pianoacc',
  JG:'type-jg', SG:'type-jg', CJ:'type-func', CS:'type-lead', C:'type-chord'};
/* ctx：{nVox, inst:'guitar'|'uku', instKey, lyr(是否有歌词), scene} */
function kindOf(k, ctx){
  ctx = ctx||{}; const ik = ctx.instKey && ctx.instKey!=='piano' ? ctx.instKey : '', nv = ctx.nVox||1, uku = ctx.inst==='uku';
  let name, ic = KIND_IC[k]||'type-blank';
  switch(k){
    case 'J':  name = nv>1? '简谱合唱谱' : ik? (INST_N[ik]||'器乐')+'谱（简谱）' : '简谱歌谱'; if(nv>1) ic='type-choir'; break;
    case 'S':  name = nv>1? '五线谱合唱谱' : ik? (INST_N[ik]||'器乐')+'谱（五线谱）' : ctx.lyr? '五线谱歌谱' : '五线谱旋律'; if(nv>1) ic='type-choir'; break;
    case 'SJ': name = '教学对照谱'; break;
    case 'SJG':name = '教学对照谱（含伴奏）'; break;
    case 'T':  name = uku? '尤克里里谱（四线谱）' : '吉他谱（六线谱）'; if(uku) ic='type-uku'; break;
    case 'JT': name = uku? '尤克里里弹唱谱' : '吉他弹唱谱'; if(uku) ic='type-uku'; break;
    case 'ST': name = '吉他独奏谱'; break;
    case 'G':  name = ik? (INST_N[ik]||'键盘')+'独奏谱' : '钢琴独奏谱'; break;
    case 'CG': name = '钢琴弹唱谱（纯伴奏）'; break;
    case 'JG': name = '钢琴伴奏歌谱'; break;
    case 'SG': name = '钢琴伴奏歌谱（五线谱）'; break;
    case 'CJ': name = '功能谱'; break;
    case 'CS': name = '五线谱和弦谱'; break;
    case 'C':  name = '和弦谱'; break;
    default:   name = '曲谱';
  }
  return {k, name, ic};
}
/* 已有曲谱 → kindOf 的 ctx（页签 / 谱型条 / 谱库读它） */
function ctxOf(s){
  const vv=s.voxVoices||[], k=stackOf(s);
  const lyr=(s.measures||[]).some(m=>(m.voxes||[]).some(cols=>(cols||[]).some(c=>c&&c.lyrics&&c.lyrics.some(x=>String(x||'').trim()))));
  /* 歌词：有词，或建谱时就留了歌词行（lyricLines>0）——修「五线谱歌谱未填词时显示器乐五线谱」 */
  return {nVox: (k==='J'||k==='S')? vv.length : 1, inst:s.inst, instKey:s.instKey, lyr: lyr || (s.lyricLines|0)>0};
}
const kindOfSong = s => kindOf(stackOf(s), ctxOf(s));

/* ---------- 合稿新增 ②：换谱类（谱型条「谱类 ▾」）——空谱任意换（同曲名/调/拍/速度重建，无损）；
   有内容时只给「不动音符」的换法（direct）或「另建一份，带上旋律」（copy），其余不可换（no）并说明原因 ---------- */
const MEL = ['J','S','SJ','JG','SG','SJG','CJ','CS'];          /* 旋律行在 vox[0] 的组合 */
const ACCROWS = k => ['JG','SG','SJG'].includes(k);
function isEmptySong(s){
  return !(s.measures||[]).some(m=>(m.voxes||[]).some(cs=>(cs||[]).some(c=>c&&((c.deg>0)||(c.chord)||(c.lyrics||[]).some(x=>String(x||'').trim()))))
    || (m.tabs||[]).some(cs=>(cs||[]).some(c=>c&&((c.notes||[]).length||c.chord))));
}
function accEmpty(s){ return (s.measures||[]).every(m=>[1,2].every(i=>!(m.voxes[i]||[]).some(c=>c&&c.deg>0))); }
function switchPlan(s, to){
  const from = stackOf(s);
  if(from===to) return {mode:'same'};
  if(isEmptySong(s)) return {mode:'rebuild', why:'空谱：按同样的曲名、调、拍号、速度重建'};
  const both = MEL.includes(from) && MEL.includes(to);
  if(both){
    const fromAcc=ACCROWS(from), toAcc=ACCROWS(to);
    if(fromAcc && !toAcc && !accEmpty(s)) return {mode:'copy', why:'伴奏行已有音符：另建一份只带旋律，原谱保留'};
    if(['CJ','CS'].includes(from)!==['CJ','CS'].includes(to) && (toAcc||fromAcc)) return {mode:'copy', why:'和弦谱式与伴奏行不同源：另建一份，带上旋律'};
    return {mode:'direct', why:'只改记谱方式与行，音符不动'};
  }
  if(MEL.includes(from) && (to==='JT')) return {mode:'copy', why:'加六线谱需要生成把位：另建一份，旋律带过去后一键生成'};
  if(MEL.includes(from) && (to==='C')) return {mode:'direct', why:'只显示和弦格，旋律保留在数据里'};
  return {mode:'no', why:'内容不同源（如六线谱 → 钢琴），请另建一份'};
}
/* direct：原地改字段（只写既有字段：voxNotations / voxDual / func / chordOnly / voxVoices / voxGroups / funcNames） */
function applyDirect(s, to){
  const nota = to==='J'||to==='JG'||to==='CJ'? undefined : 'staff';
  const from = stackOf(s), mel0 = s.measures.map(m=>m.voxes[0]);
  if(ACCROWS(to) && !ACCROWS(from)){
    s.voxVoices=['旋律','右手伴奏','左手伴奏']; s.voxNotations=[nota,'staff','bass'];
    s.measures.forEach((m,mi)=>{ m.voxes=[mel0[mi]||blankVoxCols(s.beats,s.unit), blankVoxCols(s.beats,s.unit), blankVoxCols(s.beats,s.unit)]; });
    s.voxGroups=[{type:'brace', from:1, to:2}]; s.funcNames=true;
  } else if(!ACCROWS(to) && ACCROWS(from)){
    s.voxVoices=[s.voxVoices[0]||'旋律1']; s.voxNotations=[nota]; s.measures.forEach(m=>{ m.voxes=[m.voxes[0]]; }); delete s.voxGroups;
  } else {
    s.voxNotations = (s.voxNotations||s.voxVoices.map(()=>undefined)).slice(); s.voxNotations[0]=nota;
    if(ACCROWS(to)){ s.voxNotations[1]='staff'; s.voxNotations[2]='bass'; }
  }
  if(to==='SJ'||to==='SJG'){ s.voxDual=s.voxVoices.map((_,i)=>i===0); } else delete s.voxDual;
  if(to==='CJ'||to==='CS'){ s.func=true; s.funcNames=true; } else if(from==='CJ'||from==='CS') delete s.func;
  if(to==='C'){ s.func=true; s.chordOnly=true; s.funcNames=true; } else if(from==='C') delete s.chordOnly;
  return s;
}
/* copy：按目标组合新建一份，把 vox[0] 旋律（含歌词、和弦）带过去 */
function copyMelody(s, to, o){
  const ns = build(to, Object.assign({title:s.title, key:s.key, beats:s.beats, unit:s.unit, tempo:s.tempo, nMea:s.measures.length, capo:s.capo||0, maker:s.maker||''}, o||{}));
  const vi = to==='JT'? 0 : 0;
  ns.measures.forEach((m,mi)=>{ const src=s.measures[mi]; if(src && src.voxes[0]) m.voxes[vi]=JSON.parse(JSON.stringify(src.voxes[0])); });
  if(s.mode) ns.mode=s.mode;
  ns.lyricLines = Math.max(ns.lyricLines||0, s.lyricLines||0);
  return ns;
}
Object.assign(window.NWB, {kindOf, kindOfSong, ctxOf, switchPlan, applyDirect, copyMelody, isEmptySong, INST_N});
})();
