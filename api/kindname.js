'use strict';
// v67.6 统一谱名表（服务端副本）：谱库卡片 typeLabel、SSR 落地页标题 / 描述 / og 封面的谱名都读它。
// 下面 @pq-kindname begin … end 之间与编辑器 muse-tab/index.html 里内联的那一段逐字节相同（单文件无构建，只能两处各放一份）：
// 改规则时两处一起改；语法闸 deploy/check-syntax.js、api/kindname.test.js、muse-tab/tests/tv_kindsync.js 三处核对一致。
/* @pq-kindname begin —— v67.6 统一谱名表（新建流程方案 docs/design-2026-10e，拍板 4 / 5：谱库分类 docType 不改，只统一显示名）。
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
    const piano = s.pianoAcc || (b-a===1 && vn[a]==='staff' && vn[b]==='bass' && !voxHasLyrics(s,a,b));
    return [{type: piano? 'brace' : 'bracket', from:a, to:b}];
  }
  /* 合唱：显式方括号组，或推断出的五线谱组里确有歌词（三行以上的器乐重奏照样方括号，但不算合唱） */
  function isChoir(s){
    if(Array.isArray(s.voxGroups) && s.voxGroups.length && groupsExplicitOk(s)) return groupsOf(s).some(g=>g.type==='bracket');
    if(s.pianoAcc) return false;
    return groupsOf(s).some(g=>g.type==='bracket' && voxHasLyrics(s, g.from, g.to));
  }
  /* 钢琴伴奏歌谱（旋律 ＋ 右手伴奏五线 ＋ 左手伴奏低音谱表）：显式分组时只认「1–2 行花括号」，没写分组的老谱只认一键配伴奏产物的声部名 */
  function isPianoAccStack(s){
    if(!s || (s.tabVoices||[]).length || s.pianoAcc || s.func || s.chordOnly) return false;
    const vv=s.voxVoices||[], vn=s.voxNotations||[];
    if(vv.length!==3 || vn[1]!=='staff' || vn[2]!=='bass') return false;
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
    const pair = nv>=2 && vn[nv-2]==='staff' && vn[nv-1]==='bass';
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
/* @pq-kindname end */

/* ---------- 服务端专用：存储 JSON → 观看页看到的谱（v67.6 收尾验收 minor：两端谱名在恶意 / 老格式数据上分家） ----------
   观看页（编辑器 openRemotePub）拿到他人发布的谱先 sanitizeUntrusted 清洗、再深拷 + migrate，服务端此前直接读原始 JSON：
   短码字段带引号（voxNotations "staff'"、inst 'uku`'、instKey 'erhu"'）、歌词 / 声部名只差尖括号、没有 v 字段或 v:2 的老格式时，
   谱库卡片 / 落地页与观看页叫法不同。这里按同一口径先清洗再推断（只用于谱名，谱类 type 的 docTypeOf 不动——拍板 4）：
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
function viewOf(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const s = needsClean(d, '', 0) ? sanitizeLike(d) : d;
  if (!Array.isArray(s.measures) || !s.measures.length) return null;
  if (s.v === 3) return openable3(s) ? s : null;
  if (s.v === 2) return Object.assign({}, s, { v: 3, tabVoices: ['吉他1'], voxVoices: ['旋律1'], lyricLines: 1 });
  return { v: 3, tabVoices: ['吉他1'], voxVoices: ['旋律1'], lyricLines: 1, measures: [] };
}
/* 谱库口径的谱名（server.js typeLabelOf）：观看页看到的谱 → 统一谱名；打不开 / 推断出错 → 曲谱 */
function pubNameOf(d) {
  try { const s = viewOf(d); return s ? PQ_KIND.nameOf(s) : '曲谱'; } catch (_) { return '曲谱'; }
}
module.exports = Object.assign({}, PQ_KIND, { viewOf, pubNameOf, sanitizeLike });
