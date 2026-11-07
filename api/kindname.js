'use strict';
// v67.6 统一谱名表（服务端副本）：谱库卡片 typeLabel、SSR 落地页标题 / 描述 / og 封面的谱名都读它。
// 下面 @pq-kindname begin … end 之间与编辑器 muse-tab/index.html 里内联的那一段逐字节相同（单文件无构建，只能两处各放一份）：
// 改规则时两处一起改；语法闸 deploy/check-syntax.js、api/kindname.test.js、muse-tab/tests/tv_kindsync.js 三处核对一致。
/* @pq-kindname begin —— v67.6 统一谱名表（新建流程方案 docs/design-2026-10e，拍板 4 / 5：谱库分类 docType 不改，只统一显示名）。
   编辑器（谱名 / 页签 / 谱型条 / 观看页标题 / 分享卡 / 谱库卡片）与服务端（api/server.js typeLabelOf：谱库卡片、SSR 落地页、og 封面）共用这一段，
   两处逐字节相同（语法闸 deploy/check-syntax.js、api/kindname.test.js、tv_kindsync 核对）。只读推断：曲谱 JSON → 谱行组合 stackOf（14 种：
   J / S / SJ / T / JT / ST / G / CG / JG / SG / SJG / CJ / CS / C）＋上下文 ctxOf（声部数、乐器、instKey、歌词、对照）→ 谱名 kindName / nameOf；
   不写任何字段，不读全局，脏数据（null 小节 / 缺数组）不抛错。
   分类升级 P0（方案 docs/design-2026-11-taxonomy §五 / §十四，2026-10-31 负责人「好的，按建议」＝§十五 30 项按推荐）同段新增：
   谱种表 PZ（一级 7 个＋二级，id 只增不改）、乐器族 INST_FAM（＝编辑器 NW_INSTS.fam）、按音轨名推乐器 ikOf（instKey 缺省时用，只读不回写）、
   主谱种 › 二级＋也出现在 pzOf（§5.2 判法表 24 行，自上而下首条命中）、分面 facetsOf（§5.5）、旧谱类 docTypeOf（原编辑器 docType 的判法改防脏写法，
   编辑器 docType() 与服务端 type 都读它；取值不变）、筛选 pzMatch（谱库列表与计数共用一个函数）；拍板 22 / 26：J 多声部谱名分三支。
   分类升级 P1（§四 4.3 / §十四 P1）同段新增：可转池 pzConv（简谱 / 五线谱 / 合唱谱两个二级的「还有 N 首是五线谱 · 用简谱看」，按二级镜像、与原稿去重、对照谱永不进）；
   拍板 10：纯伴奏 CG 谱名「钢琴弹唱谱（纯伴奏）」改「钢琴伴奏谱（纯伴奏）」（与归属 钢琴谱 › 伴奏 名实一致；type 仍是 pianoacc）。
   分类升级 P2a（规格 docs/spec-2026-11-v700.md §2 / §4 / §5，v70.0 第 0 步）同段：乐器表 INST / INST_FAM 只增 6 种、旧键名义不变（简谱族 竖笛 recorder · 口风琴 melodica ·
   陶笛 ocarina · 箫 xiao；五线谱族 大提琴 cello · 单簧管 clarinet），IK_ALIAS 按音轨名认它们（竖笛排在长笛前，Flauto dolce 不被长笛吃掉）、LIB_MEL 同增；
   拍板 11：合唱带钢琴的谱名加「（含钢琴伴奏）」（ctxOf 加 pno）；拍板 22 后半：无词旋律＋钢琴带乐器身份叫「X＋钢琴伴奏谱（简谱 / 五线谱）」；
   判法表第 11 行 intent 加 vocal（歌谱＋钢琴伴奏还没填词时归 钢琴谱 › 弹唱）；导出 intentOf（song.intent 读一律经它：不是字符串或不在 11 个用途里＝没写）。 */
const PQ_KIND = (function(){
  const own = (o, k)=> typeof k==='string' && Object.prototype.hasOwnProperty.call(o, k);
  function isStaffNota(n){ return n==='staff' || n==='bass' || n==='alto'; }
  const hasLy = c=> !!(c && c.lyrics && c.lyrics.some && c.lyrics.some(x=>String(x||'').trim()));
  /* v70.5 同谱表双声部（规格 docs/spec-2026-11-v705.md §1.2 / §2）：voxLayer[i]===1＝第 i 行（层）画在第 i−1 行（宿主）的谱表上，作为它的第二声部。
     下面四个函数只读推断：不写字段、不抛错、不改入参、单遍线性；没有 voxLayer 的老谱第一句就返回，零分配。
     voxLayerLinks＝结构链接：数组长度＝旋律声部数、值是数字 1、i≥1、上一行原值不是 1（不递归，写不出链 / 环）、层行在 mixer['vox:i'] 带见证 lay===1、
       宿主与层之间不是显式合法组（花括号 / 方括号）的边界；不看记谱法（插入点顺延 voxInsAt 用）。
     voxLayerOk＝生效：再要两行 voxNotations 相同且是五线谱、voxClefOct / voxTransp 归一后相等、整曲不是 chordOnly / func；
       mode==='sync'＝一致对：不要求是五线谱（谱表级同步用：宿主与层一起切成简谱、再切回五线谱要能复原）。返回 null 或逐行 0 / 1 数组。
     layerRows / collapseLayers＝谱表视图：mode 缺省＝物理谱表（生效层全部折进宿主：导出 / MIDI / 分谱 / 伴奏取行）；
       'kind'＝分类视图（器乐层折叠；声乐层——所在物理谱表有真歌词且不在花括号组里——照独立声部算，与剥掉 voxLayer 的同一份谱同名同类）。
       layerRows 返回 null（这种视图下没有要折的层）或 {rows:[[行]…], of:[行→单元]}；collapseLayers 没有要折的层时原样返回 s，否则返回视图：
       浅拷顶层、逐声部数组只留每个单元首行、分组映射到单元下标（映射后 to≤from 的丢掉）、去掉 voxLayer（视图上再 collapse 返回它自己）；
       measures 是同一引用、仍是行空间——视图只供只读推断，不可回写 / 渲染 / 存盘。VIEW 登记视图 → {src, rows}，voxHasLyrics 在视图上把单元下标换回源谱行区间 */
  const VIEW = new WeakMap();
  function voxLayerLinks(s){
    const a = s && s.voxLayer; if(a===undefined || a===null) return null;
    const n = Array.isArray(s.voxVoices)? s.voxVoices.length : 0;
    if(!Array.isArray(a) || a.length!==n) return null;
    const mx = s.mixer && typeof s.mixer==='object'? s.mixer : null;
    let cut = null;   /* cut[i]=1：第 i−1 行与第 i 行之间是某个显式合法组的边界（Uint8Array：from / to 是非整数等坏值时下标赋值被忽略，不抛错） */
    if(Array.isArray(s.voxGroups)) for(const g of s.voxGroups)
      if(g && (g.type==='brace'||g.type==='bracket') && g.from>=0 && g.to<n && g.to>g.from){ (cut = cut || new Uint8Array(n+1))[g.from] = 1; cut[+g.to+1] = 1; }
    let out = null;
    for(let i=1; i<n; i++){ const w = mx && mx['vox:'+i];
      if(a[i]===1 && a[i-1]!==1 && w && typeof w==='object' && w.lay===1 && !(cut && cut[i])) (out = out || new Array(n).fill(0))[i] = 1; }
    return out;
  }
  function voxLayerOk(s, mode){
    const L = voxLayerLinks(s); if(!L || s.chordOnly || s.func) return null;
    const vn = Array.isArray(s.voxNotations)? s.voxNotations : [], co0 = Array.isArray(s.voxClefOct)? s.voxClefOct : [], tr0 = Array.isArray(s.voxTransp)? s.voxTransp : [];
    const co = i=>{ const v=co0[i]; return v===1 || v===-1? v : 0; };
    const tr = i=>{ const v=tr0[i]; return typeof v==='number' && isFinite(v)? Math.round(v) : 0; };
    let out = null;
    for(let i=1; i<L.length; i++)
      if(L[i] && (mode==='sync' || isStaffNota(vn[i])) && vn[i]===vn[i-1] && co(i)===co(i-1) && tr(i)===tr(i-1)) (out = out || new Array(L.length).fill(0))[i] = 1;
    return out;
  }
  function layerRows(s, mode){
    const ok = voxLayerOk(s); if(!ok) return null;
    let fold = ok;   /* fold[i]=1：第 i 行折进上一行 */
    if(mode==='kind'){
      const P = collapseLayers(s), pr = VIEW.get(P).rows, gs = groupsOf(P);   /* 物理视图上的组（单元下标） */
      fold = ok.slice();
      pr.forEach((rs, k)=>{ if(rs.length<2) return;
        const inBrace = gs.some(g=>g.type==='brace' && k>=g.from && k<=g.to);
        if(!inBrace && voxHasLyrics(s, rs[0], rs[1])) fold[rs[1]] = 0; });   /* 声乐层：不折 */
      if(!fold.some(Boolean)) return null;
    }
    const rows=[], of=[];
    for(let i=0; i<ok.length; i++){ if(fold[i]) rows[rows.length-1].push(i); else rows.push([i]); of[i]=rows.length-1; }
    return {rows, of};
  }
  function collapseLayers(s, mode){
    const R = layerRows(s, mode); if(!R) return s;
    const V = {...s};   /* 展开而不是 Object.assign：自有键 __proto__（坏数据）只当普通键拷，不会变成视图的原型 */
    for(const k of ['voxVoices', 'voxNotations', 'voxDual', 'voxClefOct', 'voxTransp', 'voxShort']) if(Array.isArray(s[k])){ const a=s[k]; V[k] = R.rows.map(rs=>a[rs[0]]); }
    delete V.voxLayer;
    if(Array.isArray(s.voxGroups)) V.voxGroups = s.voxGroups
      .map(g=> g && typeof g==='object'? {...g, from:R.of[g.from], to:R.of[g.to]} : g)
      .filter(g=> !(g && typeof g==='object') || !(g.from!=null && g.to!=null) || g.to>g.from);   /* 映射后 to≤from 的丢掉；坏组原样交给 groupsOf 过滤 */
    VIEW.set(V, {src:s, rows:R.rows});
    return V;
  }
  /* 第 a–b 行（声部下标）里有没有真歌词。s 是谱表视图（VIEW 命中）时 a / b 是单元下标：换成源谱行区间再扫（measures 本就是源谱的）；越界的单元＝没有 */
  function voxHasLyrics(s, a, b){
    const w = VIEW.get(s); if(w){ const ra = w.rows[a], rb = w.rows[b]; if(!ra || !rb) return false; a = ra[0]; b = rb[rb.length-1]; }
    return (s.measures||[]).some(m=>((m&&m.voxes)||[]).some((cols,vi)=> vi>=a && vi<=b && (cols||[]).some(hasLy)));
  }
  /* v64.4 B4e 声部分组：显式 voxGroups 里至少一组合法（类型对、不越界、跨两行以上） */
  function groupsExplicitOk(s){ const n=(s.voxVoices||[]).length; return (s.voxGroups||[]).some(g=>g && (g.type==='brace'||g.type==='bracket') && g.from>=0 && g.to<n && g.to>g.from); }
  /* 显式合法组优先；全部失效时按谱面推断——从第一个五线谱声部起连续的五线谱声部（≥2 行）：钢琴弹唱、或高音＋低音谱表恰好两行且没有歌词 → 花括号，其余 → 方括号。
     v70.5（规格 §2.4）：有生效层时在分类视图上校验 / 推断（单元下标），返回前展开回行下标（from＝首单元首行，to＝末单元末行）——
     渲染 / 导出 / MIDI / 播放 / 分谱 / 观看页都按行用它；视图上的嵌套调用（isChoir / pnoOf / facetsOf 里）拿到的是单元下标，与视图上的其余判定同一个空间 */
  function groupsOf(s){
    const V = collapseLayers(s, 'kind'); if(V===s) return groupsOfU(s);
    const rows = VIEW.get(V).rows;
    return groupsOfU(V).map(g=>({...g, from:rows[g.from][0], to:rows[g.to][rows[g.to].length-1]}));
  }
  function groupsOfU(s){
    const n=(s.voxVoices||[]).length, vn=s.voxNotations||[];
    if(Array.isArray(s.voxGroups) && s.voxGroups.length){
      const ok=s.voxGroups.filter(g=>g && (g.type==='brace'||g.type==='bracket') && g.from>=0 && g.to<n && g.to>g.from);
      if(ok.length) return ok;
    }
    let a=-1; for(let i=0;i<n;i++) if(isStaffNota(vn[i])){ a=i; break; }
    if(a<0) return [];
    let b=a; while(b+1<n && isStaffNota(vn[b+1])) b++;
    if(b===a) return [];
    /* v69.6 I6（复核 N8）没写分组的老钢琴独奏谱：乐器身份 instKey==='piano' 或声部名「右手 / 左手」也认花括号——此前右手一填词就判成合唱方括号、谱名变成合唱谱 */
    const pno = b-a===1 && (s.instKey==='piano' || ((s.voxVoices||[])[a]==='右手' && (s.voxVoices||[])[b]==='左手'));
    const piano = s.pianoAcc || (b-a===1 && vn[a]==='staff' && vn[b]==='bass' && (pno || !voxHasLyrics(s,a,b)));
    return [{type: piano? 'brace' : 'bracket', from:a, to:b}];
  }
  /* 合唱：显式方括号组，或推断出的五线谱组里确有歌词（三行以上的器乐重奏照样方括号，但不算合唱） */
  function isChoir(s){
    s = collapseLayers(s, 'kind');   /* v70.5 分类视图（§2.5）：器乐层折叠、声乐层照独立声部算；老谱原样返回 */
    if(Array.isArray(s.voxGroups) && s.voxGroups.length && groupsExplicitOk(s)) return groupsOf(s).some(g=>g.type==='bracket');
    if(s.pianoAcc) return false;
    return groupsOf(s).some(g=>g.type==='bracket' && voxHasLyrics(s, g.from, g.to));
  }
  /* 钢琴伴奏歌谱（旋律 ＋ 右手伴奏五线 ＋ 左手伴奏低音谱表）：显式分组时只认「1–2 行花括号」，没写分组的老谱只认一键配伴奏产物的声部名 */
  /* v69.3 显式花括号把 a、b 两行连成大谱表（钢琴右手开头是低音谱号的谱——如舒伯特《阿特拉斯》——靠它认作钢琴，而不是两行低音的合唱） */
  function braceAt(s, a, b){ return Array.isArray(s.voxGroups) && s.voxGroups.length>0 && groupsExplicitOk(s) && s.voxGroups.some(g=>g && g.type==='brace' && g.from===a && g.to===b); }
  function isPianoAccStack(s){
    s = collapseLayers(s, 'kind');   /* v70.5 分类视图：为真之后编辑器按 0 / 1 / 2 取行的地方经 layerRows(s,'kind') 把单元换成行 */
    if(!s || (s.tabVoices||[]).length || s.pianoAcc || s.func || s.chordOnly) return false;
    const vv=s.voxVoices||[], vn=s.voxNotations||[];
    if(vv.length!==3 || vn[2]!=='bass' || !(vn[1]==='staff' || (vn[1]==='bass' && braceAt(s, 1, 2)))) return false;
    if(Array.isArray(s.voxGroups) && s.voxGroups.length && groupsExplicitOk(s)) return s.voxGroups.some(g=>g && g.type==='brace' && g.from===1 && g.to===2);
    return vv[1]==='右手伴奏' && vv[2]==='左手伴奏';
  }
  /* 任意曲谱 → 谱行组合 */
  function stackOf(s){
    s = collapseLayers(s, 'kind');   /* v70.5 分类视图 */
    const vn=s.voxNotations||[], nv=(s.voxVoices||[]).length, dual=s.voxDual||[];
    if((s.tabVoices||[]).length){ if(s.tabStaff && !nv) return 'ST'; return nv? 'JT' : 'T'; }
    if(s.chordOnly) return 'C';
    if(s.func) return isStaffNota(vn[0])? 'CS' : 'CJ';
    if(s.pianoAcc) return 'CG';
    const pair = nv>=2 && vn[nv-1]==='bass' && (vn[nv-2]==='staff' || (vn[nv-2]==='bass' && braceAt(s, nv-2, nv-1)));
    if(pair && nv===2 && !isChoir(s)) return 'G';
    /* 三行且末两行是高 / 低音谱表：要有正面证据（isPianoAccStack）才是钢琴伴奏歌谱，否则按合唱 / 五线谱（导入的 SAB 三部合唱不写分组） */
    if(pair && nv===3 && isPianoAccStack(s)) return isStaffNota(vn[0])? (dual[0]? 'SJG' : 'SG') : 'JG';
    if(isStaffNota(vn[0])) return dual[0]? 'SJ' : 'S';
    return 'J';
  }
  /* 乐器身份 instKey → 名字（＝编辑器新建面板 NW_INSTS 的 name；tv_kindsync 逐项核对） */
  const INST = {guitar:'吉他', uku:'尤克里里', bass:'贝斯', piano:'钢琴', epiano:'电钢琴', synth:'电子琴', accordion:'手风琴',
    violin:'小提琴', flute:'长笛', sax:'萨克斯', trumpet:'小号', horn:'圆号', trombone:'长号', cello:'大提琴', clarinet:'单簧管',
    erhu:'二胡', dizi:'笛子', hulusi:'葫芦丝', suona:'唢呐', guzheng:'古筝', pipa:'琵琶', yangqin:'扬琴', harmonica:'口琴',
    recorder:'竖笛', melodica:'口风琴', ocarina:'陶笛', xiao:'箫', other:'其他器乐'};
  const instName = k=> k==='other' || !own(INST, k)? '器乐' : INST[k];
  /* 谱名。ctx：{nVox, inst:'guitar'|'uku', instKey, lyr(有歌词或留了歌词行), dual(钢琴两行带简谱对照), pno(J / S 多声部下面带钢琴花括号组)}
     五线谱一族说「歌 / 合唱」要看 lyr（简谱一族按惯例本就是歌谱，不看）：单行 五线谱歌谱 / 五线谱旋律，多行 五线谱合唱谱 / 五线谱重奏谱，
     旋律＋钢琴 钢琴伴奏歌谱（五线谱）/ 旋律＋钢琴伴奏谱（五线谱）——没词也没留词位的器乐谱不叫「歌谱」「合唱」（收尾验收 major：导入的小提琴独奏、长笛＋钢琴、弦乐四重奏）。
     分类升级 P0（拍板 22 / 26，判法表 15a–15c）：简谱多行也看词与乐器——有词或留了词位 简谱合唱谱；没词、带乐器身份（古筝左右手、二胡二重奏）X谱（简谱）；
     没词也没乐器 简谱重奏谱（此前一律「简谱合唱谱」：古筝双手简谱、二胡二重奏被叫成合唱谱、进了合唱谱一级）。
     分类升级 P2a：拍板 11 合唱带钢琴（ctx.pno）加「（含钢琴伴奏）」，无词的重奏谱 / X谱（简谱）不加；拍板 22 后半 旋律＋钢琴（JG / SG）没词、带乐器身份（不含钢琴）
     叫「X＋钢琴伴奏谱（简谱）/（五线谱）」（instKey 是 other 或不在表里＝「器乐＋钢琴伴奏谱…」），有词或没乐器照旧 */
  function kindName(k, ctx){
    ctx=ctx||{}; const ik=ctx.instKey && ctx.instKey!=='piano'? ctx.instKey : '', nv=ctx.nVox||1, uku=ctx.inst==='uku';
    switch(k){
      case 'J':  return nv>1? (ctx.lyr? '简谱合唱谱'+(ctx.pno? '（含钢琴伴奏）' : '') : ik? instName(ik)+'谱（简谱）' : '简谱重奏谱') : ik? instName(ik)+'谱（简谱）' : '简谱歌谱';
      case 'S':  return nv>1? (ctx.lyr? '五线谱合唱谱'+(ctx.pno? '（含钢琴伴奏）' : '') : '五线谱重奏谱') : ik? instName(ik)+'谱（五线谱）' : ctx.lyr? '五线谱歌谱' : '五线谱旋律';
      case 'SJ': return '教学对照谱';
      case 'SJG':return '教学对照谱（含伴奏）';
      case 'T':  return uku? '尤克里里谱（四线谱）' : '吉他谱（六线谱）';
      case 'JT': return uku? '尤克里里弹唱谱' : '吉他弹唱谱';
      case 'ST': return uku? '尤克里里独奏谱' : '吉他独奏谱';
      case 'G':  return (ik? instName(ik)+'独奏谱' : '钢琴独奏谱')+(ctx.dual? '（五线＋简谱对照）' : '');
      case 'CG': return ctx.dual? '钢琴伴奏谱（纯伴奏，五线＋简谱对照）' : '钢琴伴奏谱（纯伴奏）';
      case 'JG': return !ctx.lyr && ik? instName(ik)+'＋钢琴伴奏谱（简谱）' : '钢琴伴奏歌谱';
      case 'SG': return ctx.lyr? '钢琴伴奏歌谱（五线谱）' : (ik? instName(ik) : '旋律')+'＋钢琴伴奏谱（五线谱）';
      case 'CJ': return '功能谱';
      case 'CS': return '五线谱和弦谱';
      case 'C':  return '和弦谱';
      default:   return '曲谱';
    }
  }
  /* 谱名上下文（只读）：歌词＝有词或建谱时留了歌词行（先看 lyricLines，为 0 再扫词；五线谱一族的叫法要看它）；
     几声部＝与首行同一记谱法的旋律行数（钢琴伴奏歌谱删掉左手行后剩「简谱旋律＋右手五线」不算合唱）；
     pno（P2a 拍板 11）＝J / S 多声部且有钢琴花括号组（pnoOf 是本段函数声明，已提升），其余 false */
  function ctxOf(s){
    s = collapseLayers(s, 'kind');   /* v70.5 分类视图：声乐层计入 nVox，器乐层不计 */
    const vv=s.voxVoices||[], k=stackOf(s);
    const lyr = (s.lyricLines|0)>0 || (s.measures||[]).some(m=>((m&&m.voxes)||[]).some(cols=>(cols||[]).some(hasLy)));
    const vn=s.voxNotations||[], nSame = k==='J'? vv.filter((_,i)=>!isStaffNota(vn[i])).length : k==='S'? vv.filter((_,i)=>isStaffNota(vn[i])).length : 1;
    const nVox=Math.max(1, nSame);
    return {nVox, inst:s.inst, instKey:s.instKey, lyr, dual:(k==='G'||k==='CG') && (s.voxDual||[]).some(Boolean), pno:(k==='J'||k==='S') && nVox>1 && pnoOf(s)};
  }
  const nameOf = s=>{ s = collapseLayers(s, 'kind'); return kindName(stackOf(s), ctxOf(s)); };   /* v70.5：视图只建一次，stackOf / ctxOf 在视图上再 collapse 返回它自己 */

  /* ===== 分类升级 P0：谱种（方案 docs/design-2026-11-taxonomy §五）。全部只读推断，不写字段；坏谱不抛错（pzOf / facetsOf 自带兜底） ===== */
  /* 旧谱类（谱库 type 字段 / 旧外壳谱友圈 10 类按钮）：编辑器原 docType 的判法原样搬来，改防脏写法（缺数组 / 非数组不抛错）——
     编辑器 docType() 与服务端 type 从此只此一份（此前服务端另有 isChoirOf / docTypeOf，v69.6 I6 只改了编辑器一边）。取值不变 */
  function docTypeOf(s){
    if(!s || typeof s!=='object') return 'vocal';
    s = collapseLayers(s, 'kind');   /* v70.5 分类视图 */
    const len = v=> Array.isArray(v)? v.length : 0, vn = Array.isArray(s.voxNotations)? s.voxNotations : [];
    if(len(s.tabVoices)){ if(s.tabStaff && !len(s.voxVoices)) return 'solo'; return s.inst==='uku'? 'uku' : 'guitar'; }
    if(s.chordOnly) return 'chord';
    if(s.func) return 'func';
    if(vn[0]==='staff' && vn[1]==='bass') return s.pianoAcc? 'pianoacc' : (isChoir(s)? 'vocal' : 'piano');
    if(isStaffNota(vn[0])) return (s.voxDual||[])[0]? 'teach' : (isChoir(s)? 'vocal' : 'instr');
    return 'vocal';
  }
  /* 谱种表：一级 7 个（顺序固定）× 二级（单选）。id 只增不改（接口参数、URL、埋点 lib: 都用它）；slug 给 SSR 分类页 */
  const PZ = [
    {id:'jianpu',   name:'简谱',     slug:'jianpu',      subs:[{id:'gequ', name:'歌曲'}, {id:'erge', name:'儿歌'}, {id:'hechang', name:'合唱'}, {id:'qiyue', name:'器乐'}, {id:'shichang', name:'视唱'}, {id:'duizhao', name:'对照谱'}]},
    {id:'wuxian',   name:'五线谱',   slug:'wuxianpu',    subs:[{id:'gequ', name:'歌曲'}, {id:'hechang', name:'合唱'}, {id:'qiyue', name:'器乐'}, {id:'chongzou', name:'重奏'}, {id:'shichang', name:'视唱'}, {id:'duizhao', name:'对照谱'}]},
    {id:'gangqin',  name:'钢琴谱',   slug:'gangqinpu',   subs:[{id:'duzou', name:'独奏'}, {id:'tanchang', name:'弹唱'}, {id:'banzou', name:'伴奏'}]},
    {id:'jita',     name:'吉他谱',   slug:'jitapu',      subs:[{id:'tanchang', name:'弹唱'}, {id:'zhitan', name:'指弹'}]},
    {id:'uku',      name:'尤克里里', slug:'youkelilipu', subs:[{id:'tanchang', name:'弹唱'}, {id:'zhitan', name:'指弹'}]},
    {id:'hechang',  name:'合唱谱',   slug:'hechangpu',   subs:[{id:'jianpu', name:'简谱合唱'}, {id:'wuxian', name:'五线合唱'}]},
    {id:'gongneng', name:'功能谱',   slug:'gongnengpu',  subs:[{id:'jishu', name:'级数谱'}, {id:'hexian', name:'和弦格'}]}
  ];
  const pzDef = id=> typeof id==='string'? (PZ.find(p=>p.id===id) || null) : null;
  /* 参数校验（接口 ?pz=&sub= 只认表里的 id）：pzHas('jianpu') / pzHas('jianpu','qiyue') / pzHas('','duizhao')（只给二级＝任一一级里有这个二级） */
  function pzHas(pz, sub){
    const sOk = p=> sub==null || sub==='' || p.subs.some(x=>x.id===sub);
    if(pz==null || pz==='') return typeof sub==='string' && sub!=='' && PZ.some(sOk);
    const p=pzDef(pz); return !!p && sOk(p);
  }
  /* 归属的显示名：'gangqin.tanchang' → 「钢琴谱 › 弹唱」（发布对话框「将归入」、面包屑用） */
  function pzName(place){
    const a=String(place||'').split('.'), p=pzDef(a[0]); if(!p) return '';
    const sb=p.subs.find(x=>x.id===a[1]); return sb? p.name+' › '+sb.name : p.name;
  }
  /* 乐器族（＝编辑器新建面板 NW_INSTS.fam，tv_kindsync / kindname.test 逐项核对）：tab 六线谱一族 / kbd 键盘 / staff 西洋（五线谱）/ jianpu 民乐（简谱）/ other */
  const INST_FAM = {guitar:'tab', uku:'tab', bass:'staff', piano:'kbd', epiano:'kbd', synth:'kbd', accordion:'kbd',
    violin:'staff', flute:'staff', sax:'staff', trumpet:'staff', horn:'staff', trombone:'staff', cello:'staff', clarinet:'staff',
    erhu:'jianpu', dizi:'jianpu', hulusi:'jianpu', suona:'jianpu', guzheng:'jianpu', pipa:'jianpu', yangqin:'jianpu', harmonica:'jianpu',
    recorder:'jianpu', melodica:'jianpu', ocarina:'jianpu', xiao:'jianpu', other:'other'};
  /* 建谱用途（P2a 起建谱时写 song.intent；只认这 11 个值，其余当没写）。intent 只在谱面推断有歧义时裁定（判法表第 11、20–22 行与儿歌） */
  const INTENTS = ['gtr', 'pacc', 'kids', 'vocal', 'teach', 'sight', 'solo', 'inst', 'chord', 'blank', 'custom'];
  const intentOf = s=> !!s && typeof s.intent==='string' && INTENTS.indexOf(s.intent)>=0? s.intent : '';   /* P2a 起导出（坏谱 null 也不抛） */
  /* 按音轨名推乐器（v2 复核 T4：直接打开的 MusicXML / MIDI 不写 instKey）：取首个旋律行的名字（voxVoices[0]，导入名「Piano·右手」只看「·」前），
     查别名表；人声词（Soprano / Voice / 女高音 / 主唱）、钢琴词、单独的 Bass（合唱男低音）都不算。只读，不回写 instKey。
     首条命中制：P2a 新增 6 种里竖笛必须排在长笛前（Flauto dolce 会被长笛的 ^flauto 吃掉）、箫放在笛子后（「笛箫」不归箫） */
  const IK_ALIAS = [
    ['sax', /sax|萨克斯/], ['epiano', /electric ?piano|e-piano|rhodes|电钢琴/], ['synth', /^synth|电子琴/], ['accordion', /accordion|akkordeon|手风琴/],
    ['violin', /^(violins?|violino|vln|vn|vl)(\d|\.|\s|$)|小提琴|geige/],
    ['recorder', /^(recorders?|blockfl(ö|o)te|flauto dolce|rec)(\d|\.|\s|$)|竖笛|直笛/], ['flute', /^(flutes?|flauto|fl)(\d|\.|\s|$)|^flöte|^flûte|长笛/],
    ['trumpet', /^(trumpets?|tromba|tpt|trp)(\d|\.|\s|$)|小号/], ['horn', /^(french horn|horns?|corno|hn)(\d|\.|\s|$)|圆号/],
    ['trombone', /^(trombones?|tbn|trb)(\d|\.|\s|$)|长号/],
    ['cello', /^(violoncellos?|cellos?|vc|vlc)(\d|\.|\s|$)|大提琴/], ['clarinet', /^(clarinets?|clarinetto|klarinette|cl|clar)(\d|\.|\s|$)|单簧管|黑管/],
    ['bass', /bass guitar|electric bass|e-bass|贝斯/],
    ['erhu', /erhu|二胡|胡琴/], ['dizi', /^dizi|笛子|竹笛/], ['xiao', /^xiao(\d|\s|$)|洞箫|^箫/], ['hulusi', /hulusi|葫芦丝/], ['suona', /suona|唢呐/],
    ['guzheng', /guzheng|^zheng(\d|\s|$)|古筝/], ['pipa', /^pipa|琵琶/], ['yangqin', /yangqin|扬琴/], ['harmonica', /harmonica|mouth ?organ|口琴/],
    ['melodica', /melodica|pianica|口风琴/], ['ocarina', /ocarina|陶笛/]
  ];
  function ikOf(s){
    const v0 = s && Array.isArray(s.voxVoices)? s.voxVoices[0] : '';
    const nm = (typeof v0==='string'? v0 : '').split('·')[0].trim().toLowerCase();
    if(!nm) return '';
    for(const [k, re] of IK_ALIAS) if(re.test(nm)) return k;
    return '';
  }
  /* 判法用的乐器身份 ik：写了 instKey 就认它（piano 不算；不在表里的键按「其他」，与谱名 instName 的「器乐」同口径），没写才按音轨名推 */
  function ikEff(s){
    const k=s.instKey;
    if(k && k!=='piano') return own(INST, k)? k : 'other';
    if(k) return '';
    return ikOf(s);
  }
  const txt = v=> typeof v==='string'? v.trim() : (typeof v==='number' && v)? String(v) : '';
  const A = v=> Array.isArray(v)? v : [];
  /* 谱面扫描（一次）：真歌词、各段是否有词、旋律行 / 六线谱行上的和弦、扫弦记号（d / u；arp 琶音不算） */
  function scanOf(s){
    const r={lyr:false, verses:0, vChord:false, tChord:false, strum:false}, vs=[];
    A(s.measures).forEach(m=>{ if(!m || typeof m!=='object') return;
      A(m.voxes).forEach(cols=>A(cols).forEach(c=>{ if(!c || typeof c!=='object') return;
        A(c.lyrics).forEach((x, i)=>{ if(txt(x)){ r.lyr=true; vs[i]=1; } });
        if(txt(c.chord) || A(c.chords).some(x=>x && txt(x.chord))) r.vChord=true; }));
      A(m.tabs).forEach(cols=>A(cols).forEach(c=>{ if(!c || typeof c!=='object') return;
        if(txt(c.chord)) r.tChord=true; if(c.strum==='d' || c.strum==='u') r.strum=true; }));
    });
    r.verses=vs.filter(Boolean).length;
    return r;
  }
  /* 钢琴花括号组：正好盖住「高音或低音谱表＋低音谱表」两行 */
  function pnoOf(s){ const vn=A(s.voxNotations); return groupsOf(s).some(g=>g.type==='brace' && g.to-g.from===1 && isStaffNota(vn[g.from]) && vn[g.to]==='bass'); }
  /* 主谱种 › 二级＋也出现在（§5.2 判法表，自上而下首条命中）。返回 {pz, sub, inst, also:['jianpu.gequ'…], row}：
     inst＝本谱的乐器身份（二级「器乐」下按乐器分组 / 筛选用；器乐谱没有乐器身份时记 other）；row＝命中的判法表行号（测试与排查用）。
     一级内唯一（§5.4 第 4 条）：同一一级至多一个二级，先到先得（主谱种最先）。坏谱退回 简谱 › 歌曲（与 docTypeOf 退回 vocal 同口径） */
  function pzOf(s){
    try{
      s = s && typeof s==='object' && !Array.isArray(s)? s : {};
      s = collapseLayers(s, 'kind');   /* v70.5 分类视图：规范化之后 collapse 一次，内部嵌套调用恒等 */
      const k=stackOf(s), c=ctxOf(s), it=intentOf(s), kids=it==='kids', sc=scanOf(s);
      const tabPz = c.inst==='uku'? 'uku' : 'jita', mel = (k==='S'||k==='SG'||k==='CS')? 'wuxian' : 'jianpu';
      const gq = p=> p==='jianpu' && kids? 'erge' : 'gequ';
      const out=[]; let row='', ik='';
      const put = (p, sb)=>{ if(!out.some(x=>x.split('.')[0]===p)) out.push(p+'.'+sb); };
      if(k==='JT'){ row='1'; put(tabPz, 'tanchang'); }
      else if(k==='T'){ if(c.lyr || (sc.tChord && sc.strum)){ row='2'; put(tabPz, 'tanchang'); } else { row='3'; put(tabPz, 'zhitan'); } }
      else if(k==='ST'){ row='4'; put(tabPz, 'zhitan'); }
      else if(k==='C'){ row='5'; put('gongneng', 'hexian'); }
      else if(k==='CJ' || k==='CS'){ row='6'; put('gongneng', 'jishu'); if(c.lyr) put(mel, gq(mel)); }
      else if(k==='CG'){ row='7'; put('gangqin', 'banzou'); if(c.dual){ put('wuxian', 'duizhao'); put('jianpu', 'duizhao'); } }
      else if(k==='SJ' || k==='SJG'){ row='8'; put('wuxian', 'duizhao'); put('jianpu', 'duizhao'); if(k==='SJG') put('gangqin', c.lyr? 'tanchang' : 'banzou'); }
      else if(k==='JG' || k==='SG'){
        ik=ikEff(s);
        if(c.lyr){ row='9'; put('gangqin', 'tanchang'); put(mel, gq(mel)); }
        else if(ik){ row='10'; put(mel, 'qiyue'); put('gangqin', 'banzou'); }
        else if(it==='pacc' || it==='vocal' || kids){ row='11'; put('gangqin', 'tanchang'); put(mel, gq(mel)); }   /* P2a：vocal＝歌谱＋钢琴伴奏还没填词 */
        else if(k==='JG'){ row='12'; put('gangqin', 'tanchang'); put('jianpu', 'gequ'); }
        else { row='13'; put('gangqin', 'banzou'); put('wuxian', 'qiyue'); }
      }
      else if(k==='G'){
        ik=ikEff(s);
        if(!ik || INST_FAM[ik]==='kbd'){ row='14a'; put('gangqin', 'duzou'); } else { row='14b'; put('wuxian', 'qiyue'); }
        if(c.dual){ put('wuxian', 'duizhao'); put('jianpu', 'duizhao'); }
      }
      else if(c.nVox>1){   /* J / S 多声部（与首行同一记谱法的行数 ≥2） */
        ik=ikEff(s);
        if(k==='J'){ if(c.lyr){ row='15b'; put('hechang', 'jianpu'); put('jianpu', 'hechang'); } else if(ik){ row='15a'; put('jianpu', 'qiyue'); } else { row='15c'; put('jianpu', 'qiyue'); } }
        else if(c.lyr){ row='16'; put('hechang', 'wuxian'); put('wuxian', 'hechang'); }
        else { row='17'; put('wuxian', 'chongzou'); }
        if(pnoOf(s)) put('gangqin', 'banzou');
      }
      else {   /* J / S 单声部。空白谱 / 自选建谱默认留一行词位，留位不代表是歌：这两种只认真有词（T19） */
        ik=ikEff(s);
        const lyr1 = (it==='blank' || it==='custom')? sc.lyr : c.lyr;
        if(ik){ row='18'; put(mel, 'qiyue'); }
        else if(lyr1){ row='19'; put(mel, gq(mel)); }
        else if(it==='sight'){ row='20'; put(mel, 'shichang'); }
        else if(it==='vocal' || kids){ row='21'; put(mel, gq(mel)); }
        else if(it==='inst' || it==='blank' || it==='custom'){ row='22'; put(mel, 'qiyue'); }
        else if(mel==='jianpu'){ row='23'; put('jianpu', 'gequ'); }
        else { row='24'; put('wuxian', 'shichang'); }
        /* 含有一致（§5.4 第 3 条）：单行简谱下面跟着推断出的钢琴两行（没写分组、没有一键配伴奏声部名的老谱）也算含钢琴伴奏——表外补 */
        if(pnoOf(s)) put('gangqin', 'banzou');
      }
      const m0=out[0].split('.');
      return {pz:m0[0], sub:m0[1], inst: ik || (out.some(p=>/\.qiyue$/.test(p))? 'other' : ''), also:out.slice(1), row};
    }catch(_){ return {pz:'jianpu', sub:'gequ', inst:'', also:[], row:''}; }
  }
  /* 指法调（六线谱 / 四线谱）＝调号减变调夹：1=G 夹 2 → F（「C调指法 · 夹2」的 C） */
  const PCN=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'], PCV={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11,Fb:4,'E#':5,'B#':0};
  function fingerKey(key, capo){
    const m=/^([A-G][#b]?)(m?)$/.exec(typeof key==='string'? key.trim() : '');
    if(!m || !own(PCV, m[1])) return '';
    const cp = typeof capo==='number' && Number.isFinite(capo)? Math.round(capo) : (typeof capo==='string' && /^\d{1,2}$/.test(capo)? +capo : 0);
    return PCN[((PCV[m[1]]-cp)%12+12)%12]+m[2];
  }
  /* 分面（§5.5，只读）：inst 乐器（器乐身份＋钢琴 / 键盘＋六线谱的吉他 / 尤克里里）、parts 编制（不在钢琴组里的旋律 / 人声行数；六线谱数条数）、
     chord 已配和弦、acc 带伴奏（钢琴独奏不算）、ens 合奏（卡片「分谱」小标）、verses 真有词的段数（卡片外层的 verses 是 lyricLines 留的词行数，口径不同）、
     nota0 原稿记谱（jp / st / dual / 空）、fkey 指法调 */
  function facetsOf(s){
    try{
      s = s && typeof s==='object' && !Array.isArray(s)? s : {};
      s = collapseLayers(s, 'kind');   /* v70.5 分类视图：parts / ens 按分类视图单元计（声乐层算一个声部，器乐层不算） */
      const k=stackOf(s), c=ctxOf(s), sc=scanOf(s), vv=A(s.voxVoices), tv=A(s.tabVoices), grp=groupsOf(s), pno=pnoOf(s);
      const tab = k==='T' || k==='JT' || k==='ST', inBrace = i=> grp.some(g=>g.type==='brace' && i>=g.from && i<=g.to);
      const inst=[], add = x=>{ if(x && inst.indexOf(x)<0) inst.push(x); };
      if(tab) add(c.inst==='uku'? 'uku' : 'guitar');
      else if(k!=='C'){ const ik=ikEff(s);
        if(k==='G') add(ik || 'piano'); else { add(ik); if(k==='CG' || k==='JG' || k==='SG' || k==='SJG' || pno) add('piano'); } }
      const free = vv.map((_, i)=>i).filter(i=>!inBrace(i));
      const noLy = free.filter(i=>!voxHasLyrics(s, i, i)).length;
      return {
        inst,
        parts: Math.max(1, tab? tv.length : free.length),
        chord: k==='CJ' || k==='CS' || k==='C' || sc.vChord || sc.tChord,
        acc: k==='CG' || k==='JG' || k==='SG' || k==='SJG' || (k!=='G' && (pno || !!txt(s.texId))),
        ens: grp.some(g=>g.type==='bracket' && g.to>g.from) || (!tab && noLy>=2) || tv.length>=2,
        verses: sc.verses,
        nota0: (tab || k==='C')? '' : (k==='SJ' || k==='SJG' || c.dual)? 'dual' : (k==='J' || k==='JG' || k==='CJ')? 'jp' : 'st',
        fkey: tab? fingerKey(s.key, s.capo) : ''
      };
    }catch(_){ return {inst:[], parts:1, chord:false, acc:false, ens:false, verses:0, nota0:'', fkey:''}; }
  }
  /* 筛选（谱库列表与 /api/pub/cats 计数共用；P1 编辑器新外壳谱友圈同样调它）：r＝卡片 {pz, sub, inst, also, fx}，f＝{pz, sub, inst}。
     命中主谱种返回 0、只命中「也出现在」返回 1（一级列表主谱种在前），不命中 -1。乐器：简谱 / 五线谱下＝本谱的器乐身份 inst，
     没选二级时只看「器乐」（五线谱另含「重奏」，T20）；其他一级与不限一级时＝分面 fx.inst 里有它（键盘族在钢琴谱、钢琴伴奏、吉他…） */
  function pzMatch(r, f){
    if(!r || typeof r.pz!=='string') return -1;
    f = f || {};
    const pl=[r.pz+'.'+r.sub].concat(A(r.also)), fi = r.fx && Array.isArray(r.fx.inst)? r.fx.inst : [r.inst];
    for(let i=0; i<pl.length; i++){
      const a=String(pl[i]).split('.'), p=a[0], sb=a[1];
      if(f.pz && p!==f.pz) continue;
      if(f.sub && sb!==f.sub) continue;
      if(f.inst){
        if(p==='jianpu' || p==='wuxian'){ if(r.inst!==f.inst || (!f.sub && sb!=='qiyue' && sb!=='chongzou')) continue; }
        else if(fi.indexOf(f.inst)<0) continue;
      }
      return i===0? 0 : 1;
    }
    return -1;
  }
  /* 分类升级 P1 可转池（§4.3，v2 复核 T9 / T15）：r＝卡片、f＝当前筛选 {pz, sub, inst}。这份谱不在当前筛选里、但在对面一级的镜像二级里（打开时换成本一级的记谱法看）
     → 返回观看页记谱法 'jp'（简谱、合唱谱 › 简谱合唱）/ 'st'（五线谱、合唱谱 › 五线合唱），否则 ''。
     镜像表：歌曲 ↔ 歌曲（简谱 › 儿歌 → 五线谱 › 歌曲）、合唱 ↔ 合唱、器乐 ↔ 器乐（同一乐器；五线谱 › 重奏 → 简谱 › 器乐）、视唱 ↔ 视唱；没选二级＝对面一级除对照谱外的全部。
     去重：已在当前筛选里的（主谱种或也出现在）不进；对照谱两边都是原稿，永不进。只看卡片字段，谱库列表 / 计数 / 编辑器谱友圈共用 */
  const CONV_SRC = {jianpu:{gequ:['gequ'], hechang:['hechang'], qiyue:['qiyue', 'chongzou'], shichang:['shichang']},
    wuxian:{gequ:['gequ', 'erge'], hechang:['hechang'], qiyue:['qiyue'], shichang:['shichang']}};
  function pzConv(r, f){
    if(!r || typeof r.pz!=='string' || !f || pzMatch(r, f)>=0) return '';
    let opp='', subs=null, nota='';
    if(f.pz==='hechang'){ if(f.sub!=='jianpu' && f.sub!=='wuxian') return ''; opp='hechang'; subs=[f.sub==='jianpu'? 'wuxian' : 'jianpu']; nota=f.sub==='jianpu'? 'jp' : 'st'; }
    else if(f.pz==='jianpu' || f.pz==='wuxian'){
      const m=CONV_SRC[f.pz]; opp=f.pz==='jianpu'? 'wuxian' : 'jianpu'; nota=f.pz==='jianpu'? 'jp' : 'st';
      if(f.sub) subs=own(m, f.sub)? m[f.sub] : [];
      if(f.inst) subs=(subs || ['qiyue', 'chongzou']).filter(x=>x==='qiyue' || (x==='chongzou' && f.pz==='jianpu'));
    }
    else return '';
    if(subs && !subs.length) return '';
    const pl=[r.pz+'.'+r.sub].concat(A(r.also));
    for(let i=0; i<pl.length; i++){
      const a=String(pl[i]).split('.');
      if(a[0]!==opp || a[1]==='duizhao' || (subs && subs.indexOf(a[1])<0)) continue;
      if(f.inst && r.inst!==f.inst) continue;
      return nota;
    }
    return '';
  }
  /* ===== 分类升级 P1 谱库列表引擎（§四 4.1–4.4 / §七 / §九）：服务端 /api/pub/scores、/api/pub/cats 与编辑器新外壳谱友圈共用这一份；
     官网是静态页读不到，pyq.js PYQ_PZ 抄一份（tv_libpz 对拍）。c＝卡片 {id, title, singer, author, composer, pz, sub, inst, also, fx, key, beats, unit, tempo, favs, views, typeLabel, intent}。
     pzQuery(cards, o)，o＝{f:{pz,sub,inst}, words, conv, more, x（抽屉分面）, zt, style, sort, keySort, tail, shichang}，返回 {list:[{c, sec, nota, i}], n0, nConv, tail}：
     段 sec 0 主谱种在本筛选 · 1 只在「也出现在」· 2 可转（pzConv，nota＝jp / st）· 3 尾节（tail：tab＝和弦谱后接吉他 / 尤克里里弹唱谱；jp＝「X 简谱」后接吉他弹唱谱里的简谱旋律；
     more 且乐器结果不满 6 首＝mel，接同一级的单旋律歌曲，T5）；段内按 sort（new 原顺序＝最新 / fav 最多收藏 / view 最多浏览），keySort（乐器的调）同调排前。
     原稿数 n0＝段 0＋1；可转数 nConv 不论 conv 开没开都给（列表末尾「还有 N 首是五线谱」） */
  const LIB_MEL = {erhu:1, dizi:1, hulusi:1, suona:1, harmonica:1, sax:1, flute:1, violin:1, trumpet:1, horn:1, trombone:1,
    recorder:1, melodica:1, ocarina:1, xiao:1, cello:1, clarinet:1};
  const libInPl = (c, re)=> [c.pz+'.'+c.sub].concat(A(c.also)).some(p=>re.test(p));
  function pzWordsOk(c, words){
    if(!words) return true;
    const hay=((c.title||'')+' '+(c.singer||'')+' '+(c.author||'')+' '+(c.composer||'')).toLowerCase();
    return String(words).toLowerCase().split(/[\s　]+/).filter(Boolean).every(w=>hay.indexOf(w)>=0);
  }
  const libErge = c=> libInPl(c, /\.erge$/) || c.intent==='kids';
  /* 抽屉分面 x：parts 编制（1 独唱独奏 · 2 · 3 · 4＝四部以上，多选取并）· chord 已配和弦 · acc 带伴奏 · verses 多段歌词 · erge 儿歌 ·
     keys 调（六线谱 / 四线谱比指法调 fx.fkey）· meters 拍号 · speeds 速度（slow <72 · mid 72–120 · fast >120）· hacc 合唱谱伴奏三选（yes / no） */
  function pzFxOk(c, x){
    if(!x) return true;
    const fx=c.fx||{};
    if(x.parts && x.parts.length && x.parts.indexOf(Math.min(4, Math.max(1, fx.parts|0)))<0) return false;
    if(x.chord && !fx.chord) return false;
    if((x.acc || x.hacc==='yes') && !fx.acc) return false;
    if(x.hacc==='no' && fx.acc) return false;
    if(x.verses && !((fx.verses|0)>=2)) return false;
    if(x.erge && !libErge(c)) return false;
    if(x.keys && x.keys.length){ const k=(c.pz==='jita' || c.pz==='uku') && fx.fkey? fx.fkey : String(c.key||''); if(x.keys.indexOf(k)<0) return false; }
    if(x.meters && x.meters.length && x.meters.indexOf(c.beats+'/'+c.unit)<0) return false;
    if(x.speeds && x.speeds.length){ const t=+c.tempo||0, sp=!t? '' : t<72? 'slow' : t<=120? 'mid' : 'fast'; if(x.speeds.indexOf(sp)<0) return false; }
    return true;
  }
  /* 专题（§4.4 并集口径）：考编即兴伴奏 · 艺考视唱（只收 intent＝sight，T4）· 师范儿歌弹唱 · 课堂对照谱 */
  function pzZtOk(c, zt){
    const fx=c.fx||{};
    switch(zt){
      case 'kaobian': return libInPl(c, /^gangqin\.(tanchang|banzou)$|^gongneng\.jishu$/) || (libInPl(c, /^(jianpu|wuxian)\.(gequ|erge|shichang|qiyue)$/) && (fx.parts|0)<=1 && !!fx.chord);
      case 'yikao': return libInPl(c, /^(jianpu|wuxian)\.shichang$/) && c.intent==='sight';
      case 'shifan': return libErge(c) || libInPl(c, /\.duizhao$/);
      case 'ketang': return libInPl(c, /\.duizhao$/) || (libInPl(c, /^jianpu\.gequ$/) && !!fx.acc);
      default: return true;
    }
  }
  function pzQuery(cards, o){
    o = o || {};
    const f=o.f||{}, x=o.x||null, out=[], hasF=!!(f.pz || f.sub || f.inst);
    A(cards).forEach((c, i)=>{
      if(!c || !pzWordsOk(c, o.words) || !pzFxOk(c, x) || (o.zt && !pzZtOk(c, o.zt)) || (o.style==='erge' && !libErge(c))) return;
      let sec=-1, nota='';
      if(!hasF) sec=0;
      else { const g=pzMatch(c, f); if(g>=0) sec=(o.shichang && !f.pz)? (libInPl(c, /^wuxian\.shichang$/)? 0 : 1) : g; else { nota=pzConv(c, f); if(nota) sec=2; } }
      if(sec>=0) out.push({c, sec, nota, i});
    });
    const n0=out.filter(e=>e.sec<2).length, nConv=out.filter(e=>e.sec===2).length;
    const list=o.conv? out : out.filter(e=>e.sec<2);
    let tail='';
    const have={}; list.forEach(e=>{ have[e.c.id]=1; });
    const addTail = pred=>{ let n=0; A(cards).forEach((c, i)=>{ if(!c || have[c.id] || !pzWordsOk(c, o.words) || !pzFxOk(c, x) || !pred(c)) return; have[c.id]=1; list.push({c, sec:3, nota:'', i}); n++; }); return n; };
    if(o.tail==='tab'){ if(addTail(c=>libInPl(c, /^(jita|uku)\.tanchang$/))) tail='tab'; }
    else if(o.tail==='jp'){ if(addTail(c=>(c.pz==='jita' || c.pz==='uku') && /弹唱谱$/.test(c.typeLabel||''))) tail='jp'; }
    if(o.more && f.inst && LIB_MEL[f.inst] && n0<6){
      const lv = f.pz==='wuxian'? /^wuxian\.(gequ|erge)$/ : f.pz==='jianpu'? /^jianpu\.(gequ|erge)$/ : (INST_FAM[f.inst]==='jianpu'? /^jianpu\.(gequ|erge)$/ : /^(jianpu|wuxian)\.(gequ|erge)$/);
      if(addTail(c=>libInPl(c, lv) && ((c.fx||{}).parts|0)<=1)) tail=tail || 'mel';
    }
    const sk = o.sort==='fav'? (e=>-(+e.c.favs||0)) : o.sort==='view'? (e=>-(+e.c.views||0)) : (()=>0);
    const ks = o.keySort? (e=>String(e.c.key||'')===o.keySort? 0 : 1) : (()=>0);
    list.sort((a, b)=>a.sec-b.sec || ks(a)-ks(b) || sk(a)-sk(b) || a.i-b.i);
    return {list, n0, nConv, tail};
  }
  /* 计数（/api/pub/cats）：各一级（主谱种 ∪ 也出现在）、各二级、简谱 / 五线谱「器乐」按乐器（器乐 ∪ 重奏，与筛选同口径）；一级内唯一 → 一级＝各二级之和。
     conv＝可转数（pzConv）：简谱 / 五线谱的一级、各二级、器乐乐器，合唱谱两个二级 */
  function pzCats(cards){
    const out={total:A(cards).length, pz:{}}, cv={jianpu:{n:0, sub:{}, inst:{}}, wuxian:{n:0, sub:{}, inst:{}}, hechang:{sub:{jianpu:0, wuxian:0}}};
    PZ.forEach(p=>{ const o=out.pz[p.id]={n:0, sub:{}}; p.subs.forEach(x=>{ o.sub[x.id]=0; });
      if(p.id==='jianpu' || p.id==='wuxian'){ o.inst={}; p.subs.forEach(x=>{ cv[p.id].sub[x.id]=0; }); } });
    A(cards).forEach(c=>{
      if(!c) return;
      PZ.forEach(p=>{
        if(pzMatch(c, {pz:p.id})<0) return;
        const o=out.pz[p.id]; o.n++;
        p.subs.forEach(x=>{ if(pzMatch(c, {pz:p.id, sub:x.id})>=0) o.sub[x.id]++; });
        if(o.inst && c.inst && pzMatch(c, {pz:p.id, inst:c.inst})>=0) o.inst[c.inst]=(o.inst[c.inst]||0)+1;
      });
      ['jianpu', 'wuxian'].forEach(t=>{ const o=cv[t];
        if(pzConv(c, {pz:t})) o.n++;
        Object.keys(o.sub).forEach(sb=>{ if(pzConv(c, {pz:t, sub:sb})) o.sub[sb]++; });
        if(c.inst && pzConv(c, {pz:t, inst:c.inst})) o.inst[c.inst]=(o.inst[c.inst]||0)+1; });
      ['jianpu', 'wuxian'].forEach(sb=>{ if(pzConv(c, {pz:'hechang', sub:sb})) cv.hechang.sub[sb]++; });
    });
    out.conv=cv;
    return out;
  }
  return {own, isStaffNota, voxHasLyrics, groupsExplicitOk, groupsOf, isChoir, isPianoAccStack, stackOf, INST, instName, kindName, ctxOf, nameOf,
    docTypeOf, PZ, pzHas, pzName, INST_FAM, INTENTS, intentOf, ikOf, pzOf, fingerKey, facetsOf, pzMatch, pzConv, pzWordsOk, pzFxOk, pzZtOk, pzQuery, pzCats,
    voxLayerLinks, voxLayerOk, layerRows, collapseLayers};
})();
/* @pq-kindname end */

/* ---------- 服务端专用：存储 JSON → 观看页看到的谱（v67.6 收尾验收 minor：两端谱名在恶意 / 老格式数据上分家） ----------
   观看页（编辑器 openRemotePub）拿到他人发布的谱先 sanitizeUntrusted 清洗、再深拷 + migrate，服务端此前直接读原始 JSON：
   短码字段带引号（voxNotations "staff'"、inst 'uku`'、instKey 'erhu"'）、歌词 / 声部名只差尖括号、没有 v 字段或 v:2 的老格式时，
   谱库卡片 / 落地页与观看页叫法不同。这里按同一口径先清洗再推断（v67.6 只用于谱名；分类升级 P0 起谱类 type、谱种、分面也从这份副本算，见文末 pubKindOf）：
   ① 清洗＝编辑器 sanitizeUntrusted：数值字段转数、非有限→0；dyn 的楔形 < > 原样；自由文本去 < >；其余字符串去 < > " ' `；键名同样去；
      键名 __proto__ 丢掉（观看页清洗时它变成原型、随后深拷丢失）。字段表＝api/scoredata.js（与编辑器 SAN_* 同一张，kindname.test 核对）。
   ② migrate：v:3 原样；v:2 → 吉他弹唱（其余字段保留）；其他 → 吉他弹唱谱骨架。没有小节（观看页报「曲谱数据异常」打不开）→ null（谱名回落「曲谱」）。
   绝大多数谱没有这些字符：先只读扫一遍，确实要清洗才深拷（谱库列表每条都算，免得整页多一倍开销）。只读：不改入参。 */
const { SD_NUM, SD_FREE, SD_KEEP } = require('./scoredata');
const DIRTY = /[<>"'`]/;
function needsClean(v, key, depth) {
  if (depth > 60) return true;
  if (typeof v === 'string') {
    if (key && SD_NUM.has(key)) return true;
    if (key && SD_KEEP[key] && SD_KEEP[key].has(v)) return false;
    return key && SD_FREE.has(key) ? /[<>]/.test(v) : DIRTY.test(v);
  }
  if (typeof v === 'number') return !!(key && SD_NUM.has(key) && !Number.isFinite(v));
  if (Array.isArray(v)) { for (const x of v) if (needsClean(x, key, depth + 1)) return true; return false; }
  if (v && typeof v === 'object') { for (const k of Object.keys(v)) if (k === '__proto__' || DIRTY.test(k) || needsClean(v[k], k, depth + 1)) return true; }
  return false;
}
function sanitizeLike(v, key) {
  if (typeof v === 'string') {
    if (key && SD_NUM.has(key)) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
    if (key && SD_KEEP[key] && SD_KEEP[key].has(v)) return v;
    if (key && SD_FREE.has(key)) return v.replace(/[<>]/g, '');
    return v.replace(/[<>"'`]/g, '');
  }
  if (Array.isArray(v)) return v.map(x => sanitizeLike(x, key));
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) { const k2 = String(k).replace(/[<>"'`]/g, ''); if (k2 === '__proto__') continue; o[k2] = sanitizeLike(v[k], k); }
    return o;
  }
  if (typeof v === 'number' && key && SD_NUM.has(key) && !Number.isFinite(v)) return 0;
  return v;
}
/* v67.6 第二轮验收：观看页打得开的最低结构（v3）——声部名是数组、每个小节是对象、声部 / 六线谱 / 列（有则）是数组、歌词（有则）是数组。
   编辑器产出的谱都满足；不满足的（缺 tabVoices、小节里有 null、歌词写成字符串…）观看页 migrate 后渲染抛错、提示「曲谱数据异常」，
   谱库谱名照观看页的实际表现回落「曲谱」（此前给出「简谱歌谱 / 钢琴独奏谱 / 吉他弹唱谱」，点进去却打不开） */
function openable3(s) {
  if (!Array.isArray(s.tabVoices) || !Array.isArray(s.voxVoices)) return false;
  for (const m of s.measures) {
    if (!m || typeof m !== 'object' || Array.isArray(m)) return false;
    for (const f of ['voxes', 'tabs']) {
      if (m[f] == null) continue;
      if (!Array.isArray(m[f])) return false;
      for (const cols of m[f]) {
        if (cols == null) continue;
        if (!Array.isArray(cols)) return false;
        for (const c of cols) if (c && typeof c === 'object' && c.lyrics != null && !Array.isArray(c.lyrics)) return false;
      }
    }
  }
  return true;
}
const cleanOf = d => needsClean(d, '', 0) ? sanitizeLike(d) : d;
function viewOf(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const s = cleanOf(d);
  if (!Array.isArray(s.measures) || !s.measures.length) return null;
  if (s.v === 3) return openable3(s) ? s : null;
  if (s.v === 2) return Object.assign({}, s, { v: 3, tabVoices: ['吉他1'], voxVoices: ['旋律1'], lyricLines: 1 });
  return { v: 3, tabVoices: ['吉他1'], voxVoices: ['旋律1'], lyricLines: 1, measures: [] };
}
/* 谱库口径的谱名（server.js typeLabelOf）：观看页看到的谱 → 统一谱名；打不开 / 推断出错 → 曲谱 */
function pubNameOf(d) {
  try { const s = viewOf(d); return s ? PQ_KIND.nameOf(s) : '曲谱'; } catch (_) { return '曲谱'; }
}
/* 分类升级 P0（方案 §十四，v1 评审 R12）：谱库卡片的谱类字段一次算齐——旧谱类 type、统一谱名 typeLabel、主谱种 pz / sub、乐器身份 inst、也出现在 also、分面 fx，
   都从同一份「清洗＋migrate」副本（观看页看到的谱）算，各自兜底（safe）：一份坏谱只让自己退回默认（vocal / 曲谱 / 简谱 › 歌曲），不拖垮整页列表。
   观看页打不开的谱（viewOf 为 null）：谱名照旧回落「曲谱」；type / 谱种按清洗后的原始结构推断（与修前的 type 取值一致，不另造一类）。
   此前 type 读原始 JSON、typeLabel 读清洗副本，两边口径不同：脏短码（inst 带反引号等）、v:2 / 无 v 老格式的谱 type 随之改正（§十二第 5 条点名的第三类边角） */
function pubKindOf(d) {
  const safe = (fn, dflt) => { try { return fn(); } catch (_) { return dflt; } };
  const v = safe(() => viewOf(d), null);
  const base = v || safe(() => (d && typeof d === 'object' && !Array.isArray(d) ? cleanOf(d) : {}), {});
  const p = PQ_KIND.pzOf(base);
  return { type: safe(() => PQ_KIND.docTypeOf(base), 'vocal'), typeLabel: safe(() => (v ? PQ_KIND.nameOf(v) : '曲谱'), '曲谱'),
    pz: p.pz, sub: p.sub, inst: p.inst, also: p.also, fx: PQ_KIND.facetsOf(base) };
}
module.exports = Object.assign({}, PQ_KIND, { viewOf, pubNameOf, sanitizeLike, pubKindOf });
