'use strict';
/* 分类升级 P1 搜索词解析（方案 docs/design-2026-11-taxonomy §七；2026-10-31 负责人「好的，按建议」＝§十五 30 项按推荐）。
   不进 PQ_KIND 逐字节同步段（只在服务端用；编辑器谱友圈在线时把 q 交给接口、离线只做子串搜索）；kindname.test 核对这里每个目标 id 都在 PQ_KIND.PZ / INST 里。
   规则：
   ① 先去停用词（大全 / 曲谱 / 乐谱 / 谱子 / 完整版 / 高清 / 原版 / 简单版 / 带歌词）：整词丢掉，词尾的也剥掉（「二胡曲谱大全」→「二胡」）；
   ② 只认整词（空格隔开的词），另认查询**末尾**一个词的「X谱 / X简谱 / X五线谱」后缀（「茉莉花简谱」）；不在曲名中间截词（「黄河大合唱」不拆）；
   ③ 两个类目词同现：合唱＋简谱 → 合唱谱 › 简谱合唱；钢琴＋简谱 → 钢琴谱（打开看简谱）；吉他 / 尤克里里＋简谱 → 吉他谱 / 尤克里里；
      乐器＋简谱 / 五线谱 → 该一级 › 器乐（乐器）；和弦谱＋吉他 / 尤克里里 → 弹唱；其余先到的作筛选、后到的不筛；
   ④ 调词：与吉他 / 尤克里里同现＝指法调；与葫芦丝 / 笛子 / 箫 / 巴乌 / 口琴 / 萨克斯 / 陶笛 / 竖笛 / 单簧管同现＝乐器的调，不筛选、只把同调的排前；其余＝实际调；
   ⑤ 只有谱种词（「简谱」「钢琴谱」）＝点了这个一级（only，不含可转）；有曲名时简谱 / 五线谱默认含可转（conv）；
   ⑥ 「器乐谱 / 器乐」不加筛选，给提示条（hint）；作曲家等其余词按曲名 / 演唱 / 署名 / 作曲搜。
   ⑦ 伴奏词：合唱谱下＝「伴奏」三选（hacc：带伴奏 / 有伴奏 → yes，无伴奏 / 无伴奏合唱 → no；与合唱同现的 伴奏 / 钢琴伴奏 / 伴奏谱 也按带伴奏，不落钢琴谱、不悄悄丢掉）；
      不在合唱谱时 带伴奏＝「带伴奏」开关（acc）；单独的「无伴奏」（没有谱种 / 二级 / 乐器）＝合唱谱 › 无伴奏，与乐器同现（「无伴奏 小提琴」）只筛不带伴奏的。
   parse(q) → {words（剩下的词）, conds:[{k, v, label, rm（去掉这一条后的查询）}], pz, sub, inst, zt, acc, hacc, style, parts, key, fkey, keySort, nota, conv, only, tail, hint}
   只读：不碰数据库；输入截 40 字（同接口） */
const KIND = require('./kindname');

const STOP = ['大全', '曲谱', '乐谱', '谱子', '完整版', '高清', '原版', '简单版', '带歌词'];
/* 乐器词 → instKey（PQ_KIND.INST 里的键）；后缀「谱 / 简谱 / 五线谱 / 曲谱」另由 splitTail 处理 */
const INSTW = {
  '二胡': 'erhu', '胡琴': 'erhu', '古筝': 'guzheng', '筝': 'guzheng', '笛子': 'dizi', '竹笛': 'dizi', '笛箫': 'dizi', '葫芦丝': 'hulusi', '唢呐': 'suona',
  '琵琶': 'pipa', '扬琴': 'yangqin', '口琴': 'harmonica', '萨克斯': 'sax', '萨克斯风': 'sax', '萨克斯管': 'sax', '小提琴': 'violin', '长笛': 'flute',
  '小号': 'trumpet', '圆号': 'horn', '长号': 'trombone', '贝斯': 'bass', '电子琴': 'synth', '手风琴': 'accordion', '电钢琴': 'epiano',
  /* v70.0 P2a 乐器表补 6 种（规格 §4.4）：箫 / 洞箫 从「只认调」KEYSORT_W 挪来（「笛箫」仍归笛子） */
  '竖笛': 'recorder', '直笛': 'recorder', '口风琴': 'melodica', '陶笛': 'ocarina', '箫': 'xiao', '洞箫': 'xiao', '大提琴': 'cello', '单簧管': 'clarinet', '黑管': 'clarinet'
};
/* 键盘族：一级＝钢琴谱 ＋ 乐器（键盘族在 钢琴谱 › 独奏） */
const KBD = { synth: 1, accordion: 1, epiano: 1 };
/* 与这几种乐器同现的「X调」是乐器的调，不筛选只排序（T6）；v70.0 P2a 加 箫 / 陶笛 / 竖笛 / 单簧管（「G调箫」「C调陶笛」「降B调单簧管」） */
const KEYSORT_INST = { hulusi: 1, dizi: 1, harmonica: 1, sax: 1, xiao: 1, ocarina: 1, recorder: 1, clarinet: 1 };
/* 乐器表里没有、只用来认调的乐器词（v70.0 起箫 / 洞箫进了 INSTW，这里只剩巴乌） */
const KEYSORT_W = ['巴乌'];
/* 整词 → 条件（顺序无关）。pz / sub / inst / zt / acc / style / parts / nota / tail / hint / gtr（吉他 / 尤克里里 族标记，给组合规则用） */
const WORDS = {
  '简谱': { pz: 'jianpu', cat: 'jp' }, '五线谱': { pz: 'wuxian', cat: 'st' },
  '钢琴谱': { pz: 'gangqin', cat: 'pno' }, '钢琴': { pz: 'gangqin', cat: 'pno' },
  '钢琴曲': { pz: 'gangqin', sub: 'duzou', cat: 'pno' }, '钢琴独奏': { pz: 'gangqin', sub: 'duzou', cat: 'pno' }, '钢琴独奏谱': { pz: 'gangqin', sub: 'duzou', cat: 'pno' },
  '钢琴简谱': { pz: 'gangqin', nota: 'jp', cat: 'pno' }, '双手简谱': { pz: 'gangqin', nota: 'jp', cat: 'pno' },
  '钢琴弹唱': { pz: 'gangqin', sub: 'tanchang', cat: 'pno' }, '钢琴弹唱谱': { pz: 'gangqin', sub: 'tanchang', cat: 'pno' }, '自弹自唱': { pz: 'gangqin', sub: 'tanchang', cat: 'pno' },
  '儿歌弹唱': { pz: 'gangqin', sub: 'tanchang', style: 'erge', cat: 'pno' },
  '钢琴伴奏': { pz: 'gangqin', acc: 1, cat: 'pno' }, '钢琴伴奏谱': { pz: 'gangqin', acc: 1, cat: 'pno' }, '伴奏谱': { pz: 'gangqin', acc: 1, cat: 'pno' },
  '正谱伴奏': { pz: 'gangqin', acc: 1, cat: 'pno' }, '伴奏': { pz: 'gangqin', acc: 1, cat: 'pno' },
  /* 「即兴伴奏」一族＝考编专题（jx：老师常带的「教资 / 考编 + 儿歌」改落师范的那条规则不吃它们） */
  '即兴伴奏': { zt: 'kaobian', jx: 1 }, '钢琴即兴伴奏': { zt: 'kaobian', jx: 1 }, '即兴伴奏谱': { zt: 'kaobian', jx: 1 },
  /* 伴奏开关词（不带谱种）：落合唱谱时＝「伴奏」三选（hacc），否则 带伴奏＝简谱 / 五线谱的「带伴奏」开关（acc）；无伴奏 见 parse 末尾 */
  '带伴奏': { hacc: 'yes', cat: 'acc' }, '有伴奏': { hacc: 'yes', cat: 'acc' }, '无伴奏': { hacc: 'no', cat: 'nacc' },
  '无伴奏合唱': { pz: 'hechang', hacc: 'no', cat: 'ch' },
  '吉他谱': { pz: 'jita', cat: 'gtr' }, '吉他': { pz: 'jita', cat: 'gtr' }, '六线谱': { pz: 'jita', cat: 'gtr' },
  '吉他弹唱': { pz: 'jita', sub: 'tanchang', cat: 'gtr' }, '吉他弹唱谱': { pz: 'jita', sub: 'tanchang', cat: 'gtr' }, '吉他和弦谱': { pz: 'jita', sub: 'tanchang', cat: 'gtr' },
  '弹唱': { sub: 'tanchang', cat: 'tc' }, '弹唱谱': { sub: 'tanchang', cat: 'tc' },
  '指弹': { pz: 'jita', sub: 'zhitan', cat: 'zt2' }, '指弹谱': { pz: 'jita', sub: 'zhitan', cat: 'zt2' },
  '尤克里里': { pz: 'uku', cat: 'uku' }, '尤克里里谱': { pz: 'uku', cat: 'uku' }, '四线谱': { pz: 'uku', cat: 'uku' }, 'ukulele': { pz: 'uku', cat: 'uku' },
  'uke': { pz: 'uku', cat: 'uku' }, '乌克丽丽': { pz: 'uku', cat: 'uku' }, '尤克丽丽': { pz: 'uku', cat: 'uku' }, '尤克里里和弦谱': { pz: 'uku', sub: 'tanchang', cat: 'uku' },
  '合唱谱': { pz: 'hechang', cat: 'ch' }, '合唱': { pz: 'hechang', cat: 'ch' }, '混声合唱': { pz: 'hechang', cat: 'ch' }, '四部合唱': { pz: 'hechang', parts: 4, cat: 'ch' },
  '合唱简谱': { pz: 'hechang', sub: 'jianpu', cat: 'ch' }, '简谱合唱': { pz: 'hechang', sub: 'jianpu', cat: 'ch' },
  '功能谱': { pz: 'gongneng', cat: 'fn' }, '级数谱': { pz: 'gongneng', cat: 'fn' }, '和弦简谱': { pz: 'gongneng', cat: 'fn' }, '功能简谱': { pz: 'gongneng', cat: 'fn' }, '级数和弦': { pz: 'gongneng', cat: 'fn' },
  '和弦谱': { pz: 'gongneng', tail: 'tab', cat: 'hx' }, '和弦': { pz: 'gongneng', tail: 'tab', cat: 'hx' },
  '器乐谱': { hint: 'inst' }, '器乐': { hint: 'inst' },
  '视唱': { sub: 'shichang', cat: 'sc' }, '视唱练耳': { sub: 'shichang', cat: 'sc' }, '视唱谱': { sub: 'shichang', cat: 'sc' },
  '对照谱': { sub: 'duizhao', cat: 'dz' }, '对照': { sub: 'duizhao', cat: 'dz' }, '简五对照': { sub: 'duizhao', cat: 'dz' }, '线简谱': { sub: 'duizhao', cat: 'dz' },
  '线简混排': { sub: 'duizhao', cat: 'dz' }, '五线谱简谱对照': { sub: 'duizhao', cat: 'dz' }, '简谱转五线谱': { sub: 'duizhao', cat: 'dz' }, '教学对照谱': { sub: 'duizhao', cat: 'dz' },
  '儿歌': { style: 'erge' }, '少儿': { style: 'erge' }, '儿童歌曲': { style: 'erge' },
  '二部': { parts: 2 }, '三部': { parts: 3 }, '四部': { parts: 4 },
  '考编': { zt: 'kaobian' }, '教资': { zt: 'kaobian' }, '面试': { zt: 'kaobian' }, '艺考': { zt: 'yikao' }, '艺考视唱': { zt: 'yikao' }, '艺考视唱练耳': { zt: 'yikao' }, '师范': { zt: 'shifan' }, '幼师': { zt: 'shifan' },
  '课堂': { zt: 'ketang' }, '音乐课': { zt: 'ketang' }
};
const ZT_NAME = { kaobian: '考编即兴伴奏', yikao: '艺考视唱练耳', shifan: '师范儿歌弹唱', ketang: '课堂对照谱' };
/* 旧谱库按钮 id 别名（§七「旧参数别名」：?cat= 参数、接口参数与老客户端）→ 新筛选 */
const CAT_ALIAS = {
  guitar: { pz: 'jita', sub: 'tanchang' }, uku: { pz: 'uku' }, solo: { sub: 'zhitan' }, pianoacc: { pz: 'gangqin', sub: 'banzou' }, piano: { pz: 'gangqin', sub: 'duzou' },
  vocal: { pz: 'jianpu' }, vox: { pz: 'jianpu' }, teach: { sub: 'duizhao' }, instr: { pz: 'wuxian' }, staff: { pz: 'wuxian' }, func: { pz: 'gongneng', sub: 'jishu' }, chord: { pz: 'gongneng', sub: 'hexian' }
};
const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
/* 调词：C调 / G调 / 降E调 / 升F调 / bB调 / F#调 */
function keyOf(w) {
  const m = /^(降|升|b|♭|#|♯)?([A-Ga-g])(#|♯|b|♭)?调$/.exec(w);
  if (!m) return '';
  const pre = m[1] || '', suf = m[3] || '', L = m[2].toUpperCase();
  const fl = /降|b|♭/.test(pre + suf), sh = /升|#|♯/.test(pre + suf);
  return L + (fl ? 'b' : sh ? '#' : '');
}
function stripStop(w) {
  let x = w, g = 0;
  while (g++ < 6) {
    if (own(WORDS, x.toLowerCase()) || own(INSTW, x)) break;   /* 本身是类目词（「器乐谱」）不剥 */
    const s = STOP.find(t => x.length > t.length && x.endsWith(t)); if (!s) break; x = x.slice(0, -s.length);
  }
  return STOP.includes(x) ? '' : x;
}
/* 一个词 → [{seg, c}]（c＝条件对象；c 为 null 的 seg 是曲名词）。末尾词允许「X谱 / X简谱 / X五线谱 / X曲谱」后缀拆分 */
function lexWord(w, last) {
  const lw = w.toLowerCase();
  if (own(WORDS, lw)) return [{ seg: w, c: WORDS[lw] }];
  if (own(INSTW, w)) return [{ seg: w, c: { inst: INSTW[w], cat: 'inst' } }];
  const k = keyOf(w); if (k) return [{ seg: w, c: { key: k } }];
  /* 「C调葫芦丝」「降E调萨克斯」「葫芦丝C调」：调词连着乐器写 */
  const km = /^((?:降|升|b|♭|#|♯)?[A-Ga-g](?:#|♯|b|♭)?调)(.+)$/.exec(w) || /^(.+?)((?:降|升|b|♭|#|♯)?[A-Ga-g](?:#|♯|b|♭)?调)$/.exec(w);
  if (km) { const kk = keyOf(km[1]) ? km[1] : km[2], rest = kk === km[1] ? km[2] : km[1], head = lexWord(rest, false);
    if (head.every(x => x.c)) return kk === km[1] ? [{ seg: kk, c: { key: keyOf(kk) } }].concat(head) : head.concat([{ seg: kk, c: { key: keyOf(kk) } }]); }
  if (KEYSORT_W.includes(w)) return [{ seg: w, c: { ksw: 1 } }];
  /* 乐器＋后缀：二胡谱 / 二胡简谱 / 萨克斯五线谱（整词就认，不必在末尾） */
  for (const [suf, pz] of [['五线谱', 'wuxian'], ['简谱', 'jianpu'], ['谱', '']]) {
    if (!w.endsWith(suf) || w.length <= suf.length) continue;
    const head = w.slice(0, -suf.length);
    if (own(INSTW, head)) return pz ? [{ seg: head, c: { inst: INSTW[head], cat: 'inst' } }, { seg: suf, c: WORDS[suf] }] : [{ seg: w, c: { inst: INSTW[head], cat: 'inst' } }];
    if (KEYSORT_W.includes(head) && !pz) return [{ seg: w, c: { ksw: 1 } }];
  }
  /* 末尾词：「茉莉花简谱」「晴天吉他谱」「送别钢琴谱」——后缀是类目词才拆，前半当曲名 */
  if (last) {
    const SUF = Object.keys(WORDS).filter(x => /谱$/.test(x) && x.length >= 2).sort((a, b) => b.length - a.length);
    for (const suf of SUF) {
      if (w.length > suf.length && w.endsWith(suf)) { const head = w.slice(0, -suf.length); return lexWord(head, false).concat([{ seg: suf, c: WORDS[suf] }]); }
    }
  }
  return [{ seg: w, c: null }];
}
function label(k, v) {
  switch (k) {
    case 'pz': return '谱种：' + (KIND.PZ.find(p => p.id === v) || {}).name;
    case 'sub': return v.indexOf('.') > 0 ? KIND.pzName(v) : ((KIND.PZ.find(p => p.subs.some(x => x.id === v)) || { subs: [] }).subs.find(x => x.id === v) || {}).name;
    case 'inst': return '乐器：' + (KIND.INST[v] || v);
    case 'zt': return '专题：' + ZT_NAME[v];
    case 'acc': return '带伴奏';
    case 'hacc': return v === 'no' ? '无伴奏' : '带伴奏';
    case 'style': return '风格：儿歌';
    case 'parts': return '编制：' + ['', '独唱', '二部', '三部', '四部以上'][v];
    case 'key': return '调：' + v;
    case 'fkey': return '指法：' + v + '调';
    case 'keySort': return v + '调排前';
    case 'nota': return '打开看简谱';
    default: return '';
  }
}
function parse(q0) {
  const q = String(q0 == null ? '' : q0).trim().slice(0, 40);
  const toks = q.split(/[\s　]+/).filter(Boolean);
  /* 词法：每个词拆成若干段，段上挂条件 */
  const T = toks.map((w, i) => { const w2 = stripStop(w); return w2 ? lexWord(w2, i === toks.length - 1) : []; });
  const segs = []; T.forEach((list, ti) => list.forEach(s => { s.ti = ti; segs.push(s); }));
  /* 老师常带「教资 / 考编 / 面试」＋「儿歌 / 儿歌弹唱」：落师范儿歌弹唱专题（T25 验收例「教资 儿歌弹唱」），儿歌那一段并进专题、不再另筛 */
  const ztKb = segs.find(s => s.c && s.c.zt === 'kaobian' && !s.c.jx), erg = segs.find(s => s.c && s.c.style === 'erge');
  if (ztKb && erg) { ztKb.c = { zt: 'shifan' }; erg.c = { absorbed: 1 }; }
  /* ⑦ 合唱＋伴奏 / 钢琴伴奏 / 伴奏谱：＝合唱谱「伴奏」三选的「带伴奏」（此前「伴奏」那一段作第二个类目词被跳过，条件丢了还成了「只有谱种词」、搜索框被清空） */
  if (segs.some(s => s.c && s.c.cat === 'ch')) segs.forEach(s => { if (s.c && s.c.cat === 'pno' && s.c.acc) s.c = { hacc: 'yes', cat: 'acc' }; });
  const out = { words: '', conds: [], pz: '', sub: '', inst: '', zt: '', acc: 0, hacc: '', style: '', parts: 0, key: '', fkey: '', keySort: '', nota: '', conv: false, only: false, tail: '', hint: '' };
  const cats = segs.filter(s => s.c && s.c.cat).map(s => s.c.cat);
  const has = c => cats.indexOf(c) >= 0;
  const insts = segs.filter(s => s.c && s.c.inst).map(s => s.c.inst);
  const inst = insts[0] || '';
  const gtr = has('gtr') ? 'jita' : has('uku') ? 'uku' : '';
  const take = []; /* [seg, k, v] 实际生效的条件 */
  let pzSet = '', subSet = '';
  const setPz = (s, pz, sub) => { if (pzSet) return false; pzSet = pz; take.push([s, 'pz', pz]); if (sub) { subSet = sub; take.push([s, 'sub', pz + '.' + sub]); } return true; };
  /* ③ 组合规则（按优先级先处理同现） */
  const segOf = c => segs.find(s => s.c && s.c.cat === c);
  if (has('ch') && has('jp')) { const s = segOf('ch'); setPz(s, 'hechang', 'jianpu'); take.push([segOf('jp'), 'pz:', '']); }
  else if (has('pno') && has('jp')) { const s = segOf('pno'); setPz(s, 'gangqin', s.c.sub || ''); out.nota = 'jp'; take.push([segOf('jp'), 'nota', 'jp']); }
  else if (gtr && has('jp')) { setPz(segOf(gtr === 'jita' ? 'gtr' : 'uku'), gtr, segOf(gtr === 'jita' ? 'gtr' : 'uku').c.sub || ''); take.push([segOf('jp'), 'pz:', '']); }
  else if (inst && !KBD[inst] && (has('jp') || has('st'))) { const pz = has('jp') ? 'jianpu' : 'wuxian'; setPz(segOf(has('jp') ? 'jp' : 'st'), pz, 'qiyue'); }
  else if (gtr && (has('hx') || has('tc'))) { const s = segOf(has('hx') ? 'hx' : 'tc'); setPz(s, gtr, 'tanchang'); take.push([segOf(gtr === 'jita' ? 'gtr' : 'uku'), 'pz:', '']); }
  else if (gtr && has('zt2')) { const s = segOf('zt2'); setPz(s, gtr, 'zhitan'); take.push([segOf(gtr === 'jita' ? 'gtr' : 'uku'), 'pz:', '']); }
  else if (has('pno') && has('tc')) { const s = segOf('tc'); setPz(s, 'gangqin', 'tanchang'); take.push([segOf('pno'), 'pz:', '']); }
  /* 其余逐段：先到的作筛选 */
  for (const s of segs) {
    const c = s.c; if (!c || take.some(t => t[0] === s)) continue;
    if (c.absorbed) { take.push([s, 'skip', '']); continue; }
    if (c.hint) { out.hint = c.hint; take.push([s, 'hint', c.hint]); continue; }
    if (c.inst) {
      if (out.inst) { take.push([s, 'skip', '']); continue; }
      out.inst = c.inst; take.push([s, 'inst', c.inst]);
      if (KBD[c.inst] && !pzSet) { pzSet = 'gangqin'; take.push([s, 'pz:', 'gangqin']); }
      continue;
    }
    if (c.key) { take.push([s, 'keyw', c.key]); continue; }
    if (c.ksw) { take.push([s, 'ksw', 1]); continue; }
    if (c.zt) { if (!out.zt) { out.zt = c.zt; take.push([s, 'zt', c.zt]); } else take.push([s, 'skip', '']); continue; }
    if (c.style && !c.pz) { out.style = c.style; take.push([s, 'style', c.style]); continue; }
    if (c.parts && !c.pz) { out.parts = c.parts; take.push([s, 'parts', c.parts]); continue; }
    if (c.pz || c.sub) {
      if (pzSet || subSet) { take.push([s, 'skip', '']); continue; }   /* 其余两个类目词：第二个只作排序（这里不筛） */
      if (c.cat === 'tc') { setPz(s, 'jita', 'tanchang'); continue; }
      if (c.pz) setPz(s, c.pz, c.sub || '');
      else { subSet = c.sub; take.push([s, 'sub', c.sub]); }
      if (c.nota) out.nota = c.nota;
      if (c.acc) { out.acc = 1; take.push([s, 'acc', 1]); }
      if (c.style) { out.style = c.style; take.push([s, 'style', c.style]); }
      if (c.parts) { out.parts = c.parts; take.push([s, 'parts', c.parts]); }
      if (c.tail) out.tail = c.tail;
      continue;
    }
  }
  /* ⑦ 伴奏词（先到的一个）：合唱谱下＝hacc；单独「无伴奏」＝合唱谱 › 无伴奏；其余 带伴奏＝acc 开关、无伴奏＝不带伴奏 */
  const hs = segs.find(s => s.c && s.c.hacc);
  if (hs) {
    const v = hs.c.hacc;
    if (v === 'no' && !pzSet && !subSet && !out.inst) { pzSet = 'hechang'; take.push([hs, 'pz', 'hechang']); }
    if (pzSet === 'hechang' || v === 'no') { out.hacc = v; take.push([hs, 'hacc', v]); }
    else if (!out.acc) { out.acc = 1; take.push([hs, 'acc', 1]); }
  }
  out.pz = pzSet; out.sub = subSet; out.inst = out.inst || '';
  /* 只给了二级（视唱 / 对照谱）→ 不限一级；pz 与 sub 都有时 sub 记二级 id */
  if (out.sub && out.sub.indexOf('.') > 0) out.sub = out.sub.split('.')[1];
  /* ④ 调词 */
  const kw = take.find(t => t[1] === 'keyw');
  if (kw) {
    const ksort = (out.inst && KEYSORT_INST[out.inst]) || take.some(t => t[1] === 'ksw');
    if (ksort) { out.keySort = kw[2]; kw[1] = 'keySort'; }
    else if (out.pz === 'jita' || out.pz === 'uku') { out.fkey = kw[2]; kw[1] = 'fkey'; }
    else { out.key = kw[2]; kw[1] = 'key'; }
  }
  /* 剩下的词（曲名 / 演唱 / 作曲）：没挂条件的段＋巴乌（不解析的乐器词按曲名搜不合适：它只用来认调，丢掉；箫 v70.0 起是乐器词） */
  const wordsSeg = segs.filter(s => !s.c);
  out.words = wordsSeg.map(s => s.seg).join(' ');
  /* 和弦谱的尾节只在没跟吉他 / 尤克里里同现时要（同现已改成弹唱） */
  if (out.pz !== 'gongneng') out.tail = out.tail === 'tab' ? '' : out.tail;
  /* ⑤ only / conv / 「X 简谱」尾节 */
  const realConds = take.filter(t => ['pz', 'sub', 'inst', 'zt', 'acc', 'hacc', 'style', 'parts', 'key', 'fkey'].indexOf(t[1]) >= 0);
  out.only = !out.words && !out.nota && !out.hint && !out.tail && !!(out.pz || out.sub) && realConds.every(t => t[1] === 'pz' || t[1] === 'sub');
  out.conv = !!out.words && (out.pz === 'jianpu' || out.pz === 'wuxian' || (out.pz === 'hechang' && (out.sub === 'jianpu' || out.sub === 'wuxian')));
  if (out.words && out.pz === 'jianpu' && !out.sub && !out.inst) out.tail = out.tail || 'jp';
  /* 条件块（可删）：rm＝去掉这一段后的查询 */
  const qOf = drop => T.map((list, ti) => list.filter(s => !drop.has(s)).map(s => s.seg).join('')).filter(Boolean).join(' ');
  const seen = new Set();
  take.forEach(([s, k, v]) => {
    if (['pz', 'sub', 'inst', 'zt', 'acc', 'hacc', 'style', 'parts', 'key', 'fkey', 'keySort', 'nota'].indexOf(k) < 0) return;
    const lb = label(k, k === 'sub' && out.pz && String(v).indexOf('.') < 0 ? out.pz + '.' + v : v);
    if (!lb || seen.has(k)) return; seen.add(k);
    /* 删一条＝把产生它的那一段从查询里拿掉（同一段生成的其他条件随之去掉，如「钢琴独奏」的谱种与二级） */
    const drop = new Set([s]);
    out.conds.push({ k, v: k === 'sub' && String(v).indexOf('.') > 0 ? String(v).split('.')[1] : v, label: lb, rm: qOf(drop) });
  });
  /* 谱种＋二级来自同一段时只出一块（二级块包含谱种） */
  const pzC = out.conds.find(c => c.k === 'pz'), subC = out.conds.find(c => c.k === 'sub');
  if (pzC && subC && pzC.rm === subC.rm) out.conds.splice(out.conds.indexOf(pzC), 1);
  return out;
}
/* 0 结果退路说明：「没有『晴天』的功能谱，下面是其他谱」 */
function fbNote(p) {
  const nm = p.inst ? (KIND.INST[p.inst] || '') + '谱' : p.sub && p.pz ? KIND.pzName(p.pz + '.' + p.sub) : p.pz ? (KIND.PZ.find(x => x.id === p.pz) || {}).name : p.zt ? ZT_NAME[p.zt] : '谱';
  const ac = p.hacc === 'yes' || (p.acc && !p.inst) ? '带伴奏' : p.hacc === 'no' ? '无伴奏' : '';
  return '没有「' + p.words + '」的' + ac + nm + '，下面是其他谱';
}
/* 解析里每个目标 id（kindname.test 核对都在 PQ_KIND 表里） */
function targets() {
  const pz = new Set(), sub = new Set(), inst = new Set(), zt = new Set();
  Object.values(WORDS).concat(Object.values(CAT_ALIAS)).forEach(c => { if (c.pz) pz.add(c.pz); if (c.sub) sub.add((c.pz || '') + '.' + c.sub); if (c.zt) zt.add(c.zt); });
  Object.values(INSTW).forEach(k => inst.add(k));
  return { pz: [...pz], sub: [...sub], inst: [...inst], zt: [...zt] };
}
module.exports = { parse, fbNote, CAT_ALIAS, ZT_NAME, STOP, targets, keyOf };
