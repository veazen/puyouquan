'use strict';
/* 分类升级 P0 修前参照（23b6b01 冻结副本，只读）：统一谱名表 @pq-kindname 段、服务端旧 isChoirOf / docTypeOf、编辑器旧 docType——
   tv_taxonomy 用它对拍「旧 type / typeLabel 逐值不变（只有方案 §十二第 5 条点名的边角变化）」。不要改这份文件；规则改动写在 api/kindname.js 与编辑器同步段。 */
/* @pq-kindname-prev begin —— v67.6 统一谱名表（新建流程方案 docs/design-2026-10e，拍板 4 / 5：谱库分类 docType 不改，只统一显示名）。
   编辑器（谱名 / 页签 / 谱型条 / 观看页标题 / 分享卡 / 谱库卡片）与服务端（api/server.js typeLabelOf：谱库卡片、SSR 落地页、og 封面）共用这一段，
   两处逐字节相同（语法闸 deploy/check-syntax.js、api/kindname.test.js、tv_kindsync 核对）。只读推断：曲谱 JSON → 谱行组合 stackOf（14 种：
   J / S / SJ / T / JT / ST / G / CG / JG / SG / SJG / CJ / CS / C）＋上下文 ctxOf（声部数、乐器、instKey、歌词、对照）→ 谱名 kindName / nameOf；
   不写任何字段，不读全局，脏数据（null 小节 / 缺数组）不抛错。 */
const PQ_KIND = (function(){
  const own = (o, k)=> typeof k==='string' && Object.prototype.hasOwnProperty.call(o, k);
  function isStaffNota(n){ return n==='staff' || n==='bass' || n==='alto'; }
  const hasLy = c=> !!(c && c.lyrics && c.lyrics.some && c.lyrics.some(x=>String(x||'').trim()));
  /* 第 a–b 行（声部下标）里有没有真歌词 */
  function voxHasLyrics(s, a, b){
    return (s.measures||[]).some(m=>((m&&m.voxes)||[]).some((cols,vi)=> vi>=a && vi<=b && (cols||[]).some(hasLy)));
  }
  /* v64.4 B4e 声部分组：显式 voxGroups 里至少一组合法（类型对、不越界、跨两行以上） */
  function groupsExplicitOk(s){ const n=(s.voxVoices||[]).length; return (s.voxGroups||[]).some(g=>g && (g.type==='brace'||g.type==='bracket') && g.from>=0 && g.to<n && g.to>g.from); }
  /* 显式合法组优先；全部失效时按谱面推断——从第一个五线谱声部起连续的五线谱声部（≥2 行）：钢琴弹唱、或高音＋低音谱表恰好两行且没有歌词 → 花括号，其余 → 方括号 */
  function groupsOf(s){
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
    if(Array.isArray(s.voxGroups) && s.voxGroups.length && groupsExplicitOk(s)) return groupsOf(s).some(g=>g.type==='bracket');
    if(s.pianoAcc) return false;
    return groupsOf(s).some(g=>g.type==='bracket' && voxHasLyrics(s, g.from, g.to));
  }
  /* 钢琴伴奏歌谱（旋律 ＋ 右手伴奏五线 ＋ 左手伴奏低音谱表）：显式分组时只认「1–2 行花括号」，没写分组的老谱只认一键配伴奏产物的声部名 */
  /* v69.3 显式花括号把 a、b 两行连成大谱表（钢琴右手开头是低音谱号的谱——如舒伯特《阿特拉斯》——靠它认作钢琴，而不是两行低音的合唱） */
  function braceAt(s, a, b){ return Array.isArray(s.voxGroups) && s.voxGroups.length>0 && groupsExplicitOk(s) && s.voxGroups.some(g=>g && g.type==='brace' && g.from===a && g.to===b); }
  function isPianoAccStack(s){
    if(!s || (s.tabVoices||[]).length || s.pianoAcc || s.func || s.chordOnly) return false;
    const vv=s.voxVoices||[], vn=s.voxNotations||[];
    if(vv.length!==3 || vn[2]!=='bass' || !(vn[1]==='staff' || (vn[1]==='bass' && braceAt(s, 1, 2)))) return false;
    if(Array.isArray(s.voxGroups) && s.voxGroups.length && groupsExplicitOk(s)) return s.voxGroups.some(g=>g && g.type==='brace' && g.from===1 && g.to===2);
    return vv[1]==='右手伴奏' && vv[2]==='左手伴奏';
  }
  /* 任意曲谱 → 谱行组合 */
  function stackOf(s){
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
    violin:'小提琴', flute:'长笛', sax:'萨克斯', trumpet:'小号', horn:'圆号', trombone:'长号',
    erhu:'二胡', dizi:'笛子', hulusi:'葫芦丝', suona:'唢呐', guzheng:'古筝', pipa:'琵琶', yangqin:'扬琴', harmonica:'口琴', other:'其他器乐'};
  const instName = k=> k==='other' || !own(INST, k)? '器乐' : INST[k];
  /* 谱名。ctx：{nVox, inst:'guitar'|'uku', instKey, lyr(有歌词或留了歌词行), dual(钢琴两行带简谱对照)}
     五线谱一族说「歌 / 合唱」要看 lyr（简谱一族按惯例本就是歌谱，不看）：单行 五线谱歌谱 / 五线谱旋律，多行 五线谱合唱谱 / 五线谱重奏谱，
     旋律＋钢琴 钢琴伴奏歌谱（五线谱）/ 旋律＋钢琴伴奏谱（五线谱）——没词也没留词位的器乐谱不叫「歌谱」「合唱」（收尾验收 major：导入的小提琴独奏、长笛＋钢琴、弦乐四重奏） */
  function kindName(k, ctx){
    ctx=ctx||{}; const ik=ctx.instKey && ctx.instKey!=='piano'? ctx.instKey : '', nv=ctx.nVox||1, uku=ctx.inst==='uku';
    switch(k){
      case 'J':  return nv>1? '简谱合唱谱' : ik? instName(ik)+'谱（简谱）' : '简谱歌谱';
      case 'S':  return nv>1? (ctx.lyr? '五线谱合唱谱' : '五线谱重奏谱') : ik? instName(ik)+'谱（五线谱）' : ctx.lyr? '五线谱歌谱' : '五线谱旋律';
      case 'SJ': return '教学对照谱';
      case 'SJG':return '教学对照谱（含伴奏）';
      case 'T':  return uku? '尤克里里谱（四线谱）' : '吉他谱（六线谱）';
      case 'JT': return uku? '尤克里里弹唱谱' : '吉他弹唱谱';
      case 'ST': return uku? '尤克里里独奏谱' : '吉他独奏谱';
      case 'G':  return (ik? instName(ik)+'独奏谱' : '钢琴独奏谱')+(ctx.dual? '（五线＋简谱对照）' : '');
      case 'CG': return ctx.dual? '钢琴弹唱谱（纯伴奏，五线＋简谱对照）' : '钢琴弹唱谱（纯伴奏）';
      case 'JG': return '钢琴伴奏歌谱';
      case 'SG': return ctx.lyr? '钢琴伴奏歌谱（五线谱）' : '旋律＋钢琴伴奏谱（五线谱）';
      case 'CJ': return '功能谱';
      case 'CS': return '五线谱和弦谱';
      case 'C':  return '和弦谱';
      default:   return '曲谱';
    }
  }
  /* 谱名上下文（只读）：歌词＝有词或建谱时留了歌词行（先看 lyricLines，为 0 再扫词；五线谱一族的叫法要看它）；
     几声部＝与首行同一记谱法的旋律行数（钢琴伴奏歌谱删掉左手行后剩「简谱旋律＋右手五线」不算合唱） */
  function ctxOf(s){
    const vv=s.voxVoices||[], k=stackOf(s);
    const lyr = (s.lyricLines|0)>0 || (s.measures||[]).some(m=>((m&&m.voxes)||[]).some(cols=>(cols||[]).some(hasLy)));
    const vn=s.voxNotations||[], nSame = k==='J'? vv.filter((_,i)=>!isStaffNota(vn[i])).length : k==='S'? vv.filter((_,i)=>isStaffNota(vn[i])).length : 1;
    return {nVox:Math.max(1, nSame), inst:s.inst, instKey:s.instKey, lyr, dual:(k==='G'||k==='CG') && (s.voxDual||[]).some(Boolean)};
  }
  const nameOf = s=>kindName(stackOf(s), ctxOf(s));
  return {own, isStaffNota, voxHasLyrics, groupsExplicitOk, groupsOf, isChoir, isPianoAccStack, stackOf, INST, instName, kindName, ctxOf, nameOf};
})();
/* @pq-kindname-prev end */
/* ---- 服务端旧谱类（api/server.js 23b6b01） ---- */
function isChoirOf(d) {
  const vn = d.voxNotations || [], n = (d.voxVoices || []).length, staff = x => x === 'staff' || x === 'bass' || x === 'alto';
  if (Array.isArray(d.voxGroups) && d.voxGroups.length)
    return d.voxGroups.some(g => g && g.type === 'bracket' && g.from >= 0 && g.to < n && g.to > g.from);
  let a = -1; for (let i = 0; i < n; i++) if (staff(vn[i])) { a = i; break; }
  if (a < 0) return false;
  let b = a; while (b + 1 < n && staff(vn[b + 1])) b++;
  if (b === a) return false;
  /* v67.6 收尾：小节 / 声部 / 列 / 歌词不是数组的坏谱按没词算（与编辑器 isChoir 同口径：歌词不是数组＝没词）——此前一份「歌词写成字符串」的
     已发布谱在这里抛错，谱库列表 /api/pub/scores 整页 500。自足写法（tv_b4e 把本段截出来单独跑，不能引用模块里的其他名字） */
  const A = v => Array.isArray(v) ? v : [];
  const lyr = A(d.measures).some(m => A(m && m.voxes).some((cols, vi) => vi >= a && vi <= b && A(cols).some(c =>
    c && Array.isArray(c.lyrics) && c.lyrics.some(x => String(x || '').trim()))));
  return !d.pianoAcc && lyr;   /* 推断时：确有歌词才算合唱（三行以上的器乐重奏仍是器乐谱） */
}
function docTypeOf(d) {
  const vn = d.voxNotations || [], staff = n => n === 'staff' || n === 'bass' || n === 'alto';
  if ((d.tabVoices || []).length) { if (d.tabStaff && !(d.voxVoices || []).length) return 'solo'; return d.inst === 'uku' ? 'uku' : 'guitar'; }
  if (d.chordOnly) return 'chord';
  if (d.func) return 'func';
  if (vn[0] === 'staff' && vn[1] === 'bass') return d.pianoAcc ? 'pianoacc' : (isChoirOf(d) ? 'vocal' : 'piano');
  if (staff(vn[0])) return (d.voxDual || [])[0] ? 'teach' : (isChoirOf(d) ? 'vocal' : 'instr');
  return 'vocal';
}
/* ---- 编辑器旧 docType（muse-tab/index.html 23b6b01） ---- */
function docTypeEd(s){
  const vn=s.voxNotations||[];
  if(s.tabVoices.length){
    if(s.tabStaff && !(s.voxVoices||[]).length) return 'solo';
    return s.inst==='uku'?'uku':'guitar';
  }
  if(s.chordOnly) return 'chord';
  if(s.func) return 'func';
  if(vn[0]==='staff' && vn[1]==='bass') return s.pianoAcc? 'pianoacc' : (PQ_KIND.isChoir(s)? 'vocal' : 'piano');   /* v64.4 B4e 二声部合唱不是钢琴谱 */
  if(PQ_KIND.isStaffNota(vn[0])) return (s.voxDual||[])[0]? 'teach' : (PQ_KIND.isChoir(s)? 'vocal' : 'instr');
  return 'vocal';
}
module.exports = { PQ_KIND, docTypeSrv: docTypeOf, isChoirSrv: isChoirOf, docTypeEd };
