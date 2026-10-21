#!/usr/bin/env node
/* v63.3 A5 ⑥ 文案禁止词 lint（2026-10 评审团 §6.2「A5 禁止词 lint 词表」）。
   范围：编辑器 muse-tab/index.html + 官网 muse-tab/site/*.html|*.js 的**用户可见文字**——
   去掉 HTML 注释、JS 块注释与行注释，排除更新日志历史条目（<li><span class="v">…）。
   命中即退出码 1（发版流水线与 CI 语法闸同级拦截）。新增禁止词：只改下面 RULES。
   豁免：同一行写 wording-ok 并注明原因（仅限已下线、对用户不可见的入口）。 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const RULES = [
  [/智能曲谱平台/, '对外定位已改口为「专业曲谱平台」（2026-08-31）'],
  [/人人都能做谱/, '旧口号'],
  [/不懂五线谱[，,、\s]*也能/, '与师范/考编等专业人群定位冲突的旧口号'],
  [/为吉他爱好者打造/, '旧定位'],
  [/九种场景|八场景|八大场景/, 'v60.41 起为三意图卡'],
  [/单窗口/, 'v60.99 起多开窗口'],
  [/C端/, '内部黑话'],
  [/11\s*套/, '织体共 22 套（4/4 15 套，2/4 3 套，3/4、6/8 各 2 套），须按拍号如实写'],
  [/哼唱成谱/, '入口已下线'],
  [/解锁专业功能/, '会员没有这项权益'],
  /* 「打开已有曲谱替换当前窗口」是现行行为（loadSong + guardReplace），只拦「新建 / 导入 / 生成…替换当前窗口」这类旧说法 */
  [/(新建|导入|生成|新曲谱|伴奏谱)[^。；]{0,12}替换当前窗口/, 'v60.99 起新建/导入/生成另开窗口'],
  [/「＋和弦」/, 'v60.28 已撤销该入口'],
  /* v67.8 编辑器顶栏按钮「预设」改名「示例曲谱」（方案 docs/design-2026-10f）：只拦指代该按钮的说法，「预设织体」「预设小节」等别的含义不拦 */
  [/顶栏[「“]预设[」”]|[「“]预设[」”]按钮|>预设<\/button>|预设 · 我的曲谱|[「“]我的[」”]里(选)?(的)?预设/, 'v67.8 起编辑器按钮叫「示例曲谱」'],
  /* v67.8 验收 F5：示例曲谱页头署名（PRESETS 的 maker 常量，打印 / 发布会带出去）不再印「…预设」 */
  [/maker:\s*['"][^'"]*预设/, 'v67.8 起「预设」改名「示例曲谱」，示例谱署名用「谱友圈」'],
  /* v67.8 验收 S-3：右栏预提示宿主 v56.6 已撤，四个本机偏好（落音自动前进等）的开关 v67.8 起在顶栏「偏好设置」 */
  [/预提示里一键(关闭|开启)/, 'v67.8 起在顶栏「偏好设置」里开关（右栏预提示 v56.6 已撤）'],
  /* v68.2 新外壳切默认（计划 §5.6）：方案原稿（docs/design-2026-10f/ 的 README / COMPARE / directions / judges）写的是四步「书写 › 排版 › 播放 › 输出」，
     负责人拍板改成三步、播放常驻底部播放与状态栏——防原稿口径漏进界面与官网文案。docs/ 不在本闸扫描范围（files() 只扫编辑器 + muse-tab/site 一层），原稿照旧存档 */
  /* v68.2 收尾 ENG-9：分隔符同义写法一并拦（›、&rsaquo;、&#8250;、>、&gt;、全角＞、→、、、/）——此前只认 U+203A「›」 */
  [/书写\s*(?:›|&rsaquo;|&#8250;|&#x203[aA];|>|&gt;|＞|→|&rarr;|、|\/)\s*排版\s*(?:›|&rsaquo;|&#8250;|&#x203[aA];|>|&gt;|＞|→|&rarr;|、|\/)\s*播放/, '拍板为三步：书写 › 排版 › 输出（2026-10-16）'],
  [/四步工作流|四步模式/, '拍板为三步：书写 › 排版 › 输出（2026-10-16）'],
  /* v68.2 收尾 NU-2：内部开发 / 流程用语不进界面（v68.1 预览期的灰显说明写过「需负责人拍板」「measures[].pbrk」「不属于外壳这一层」「下一批」）——
     对用户一律说「即将推出」；源码注释不受影响（visible() 已去掉注释） */
  [/拍板|需负责人|负责人拍板|measures\[\]|外壳这一层|下一批/, '内部开发 / 流程用语，对用户写「即将推出」或直接说明现状'],
];
function visible(src, isJs) {
  let s = src.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
  s = s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  /* 行注释：// 前须是行首或空白/分号/括号，且不是 URL 的 :// */
  s = s.replace(/(^|[\s;{}(),])\/\/(?!\/)[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
  return s.split('\n').map(l => /<li><span class="v">v\d/.test(l) ? '' : l);
}
function files() {
  const out = [path.join(ROOT, 'muse-tab/index.html')];
  const sd = path.join(ROOT, 'muse-tab/site');
  fs.readdirSync(sd).filter(f => /\.(html|js)$/.test(f)).forEach(f => out.push(path.join(sd, f)));
  return out;
}
let hits = 0;
for (const f of files()) {
  const raw = fs.readFileSync(f, 'utf8'), rawL = raw.split('\n');
  const lines = visible(raw, /\.js$/.test(f));
  lines.forEach((l, i) => {
    if (/wording-ok/.test(rawL[i] || '')) return;   // 显式豁免：已下线、常隐的入口（行内须写明原因）
    for (const [re, why] of RULES) {
      const m = re.exec(l);
      if (m) { hits++; console.error(`❌ ${path.relative(ROOT, f)}:${i + 1} 「${m[0]}」——${why}\n     ${l.trim().slice(0, 140)}`); }
    }
  });
}
/* v68.7 S0：字数预算报告（只报告、不改退出码；实现见文件末尾 budget()）。--budget-base 只重写基线；任何异常只打印一行，不影响上面的拦截结果 */
try { budget(); } catch (e) { console.log('ℹ️ 字数预算报告未生成：' + String(e && e.message || e).slice(0, 160)); }
if (hits) { console.error(`❌ 文案禁止词命中 ${hits} 处`); process.exit(1); }
console.log('✅ 文案禁止词 lint：0 命中（编辑器 + 官网用户可见文字）');


/* ================= v68.7 S0 字数预算（只报告、不改退出码）=================
   方案 docs/design-2026-10g/README.md ② P2（按钮 ≤4 字、菜单项 ≤6 字且不带副标题、悬停名称 ≤12 字）· P3（不指路）；规格 v68.7 §6.C1。
   v68.7 只报告；v69.0 起改拦截时再定基（届时把「新增」改成退出码 1）。
   扫描（静态：JS 词法去注释，字符串字面量 + 模板字面量静态段）：
     · FLOW 块（`var FLOW = (function(){` 起，到 `/* ================= v60.62 指板` 前）——新外壳专属文案；
     · 全文件 toastSay( 第 2 参里 t: 的字面量（新外壳提示条短文）；
     · 共享代码里新外壳分支：if(…flowOn()…) 的 then 分支（条件里 flowOn() 被 ! 取反的不算）、flowOn()? 的真分支、!flowOn()? 的假分支。
   规则：btn4 按钮 ≤4 字（>文字</button> 字面、GB() 第 3 参、rdp btn() 第 4 参、悬浮条 TOOLS[*].t、SEG 可见字）·
         mi6 菜单项 ≤6 字且无句读（F.mi label、lbMenuFlowHTML / quickMenuFlowHTML 里的 <b>…</b>）· sub 菜单副标题存量（F.mi 带 d:）·
         title12 悬停名称段 ≤12 字（title="…" / title:'…' / .title='…' / setAttribute('title', '…')；名称段＝第一个「（」「(」「：」「 · 」前）· p3 指路词。
   豁免：谱类名（…谱）/ 乐器名（NW_INSTS）/ 曲名（《》）≤6 字、纯数字；命令面板 C() 第 3、4 参（搜索别名 / 位置）；console.* / F.track( / FLOW.track( 参数；
         toastSay( 第 1 参（＝改前原文，只在旧外壳 / 手机新外壳出现；新外壳出的是第 2 参 t:，另行扫描）；
         aria-label="…" 的值（地标名 / 读屏名，规格 R4）、'右栏' '左栏'；页签「关闭右侧」'关闭右侧' '右侧没有窗口' '右侧'（页签方向，不是指路）；同一源码行写 p3-ok:（注明理由，只给 S4 项用）。
   输出：每条规则「存量 N（基线 M）· 新增 K」，新增的前 10 条列行号与文本；「新增」＝当前文本不在 deploy/wording-budget-base.json（按文本比，不按行号）。
   node deploy/check-wording.js --budget-base 重写基线（v68.6 5cddfb8 生成并入库）。 */
function budgetScan(src) {
  const P3 = /行 ?[12](?![\d.])|[左右底顶]栏|状态栏|标题行|右侧|左侧|谱面上方|行尾「|「[^」]{1,8}」页|原「|原(?:顶|底)栏|(?:文件|账号|更多) ?▾/;
  const PUNCT = /[，。；：、！？（）“”「」]/;
  const cnt = t => (String(t).match(/[\p{L}\p{N}]/gu) || []).length;
  const ls = [0]; for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) ls.push(i + 1);
  const lineOf = p => { let lo = 0, hi = ls.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ls[m] <= p) lo = m; else hi = m - 1; } return lo + 1; };
  const rawLine = n => src.slice(ls[n - 1], n < ls.length ? ls[n] - 1 : src.length);
  /* —— JS 词法：s 字符串（模板的 ${} 段写成 \u0000，段内的记号 nested=true）· i 标识符 · p 标点 —— */
  const ESC = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' };
  const KW = /^(return|typeof|case|in|of|delete|void|throw|new|else|do|instanceof|yield|await)$/;
  const IDS = /[A-Za-z_$\u00c0-\uffff]/, IDC = /[\w$\u00c0-\uffff]/;
  function lex(from, to) {
    const out = []; let prev = '(';
    const unesc = (j) => { const c = src[j + 1];
      if (c === 'u') { if (src[j + 2] === '{') { const k = src.indexOf('}', j + 3); return [String.fromCodePoint(parseInt(src.slice(j + 3, k), 16) || 0x3f), k + 1]; } return [String.fromCharCode(parseInt(src.slice(j + 2, j + 6), 16) || 0x3f), j + 6]; }
      if (c === 'x') return [String.fromCharCode(parseInt(src.slice(j + 2, j + 4), 16) || 0x3f), j + 4];
      if (c === '\n') return ['', j + 2];
      return [ESC[c] != null ? ESC[c] : c, j + 2]; };
    function run(i, end, nested, stopBrace) {
      let depth = 0;
      while (i < end) {
        const c = src[i], c2 = src[i + 1];
        if (c === ' ' || c === '\n' || c === '\t' || c === '\r') { i++; continue; }
        if (c === '/' && c2 === '/') { const j = src.indexOf('\n', i); i = j < 0 || j > end ? end : j; continue; }
        if (c === '/' && c2 === '*') { const j = src.indexOf('*/', i + 2); i = j < 0 ? end : j + 2; continue; }
        if (c === "'" || c === '"') { let j = i + 1, v = ''; while (j < end && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') { const [ch, nj] = unesc(j); v += ch; j = nj; continue; } v += src[j++]; }
          out.push({ t: 's', s: i, e: j + 1, v, nested }); i = j + 1; prev = 'v'; continue; }
        if (c === '`') { const tok = { t: 's', s: i, e: 0, v: '', nested, tpl: true }; out.push(tok); let j = i + 1;
          while (j < end && src[j] !== '`') { if (src[j] === '\\') { const [ch, nj] = unesc(j); tok.v += ch; j = nj; continue; }
            if (src[j] === '$' && src[j + 1] === '{') { j = run(j + 2, end, true, true); tok.v += '\u0000'; continue; } tok.v += src[j++]; }
          tok.e = j + 1; i = j + 1; prev = 'v'; continue; }
        if (c === '/' && prev !== 'v') { let j = i + 1, cls = false; while (j < end && src[j] !== '\n') { if (src[j] === '\\') { j += 2; continue; } if (cls) { if (src[j] === ']') cls = false; } else if (src[j] === '[') cls = true; else if (src[j] === '/') break; j++; }
          j++; while (j < end && /[a-z]/i.test(src[j])) j++; i = j; prev = 'v'; continue; }
        if (IDS.test(c)) { let j = i + 1; while (j < end && IDC.test(src[j])) j++; const w = src.slice(i, j); out.push({ t: 'i', s: i, e: j, v: w, nested }); prev = KW.test(w) ? '(' : 'v'; i = j; continue; }
        if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(c2))) { let j = i + 1; while (j < end && /[\w.]/.test(src[j])) j++; i = j; prev = 'v'; continue; }
        if (stopBrace) { if (c === '{') depth++; else if (c === '}') { if (depth === 0) return i + 1; depth--; } }
        out.push({ t: 'p', s: i, e: i + 1, v: c, nested }); prev = (c === ')' || c === ']' || c === '}') ? 'v' : c; i++;
      }
      return i;
    }
    run(from, to, false, false);
    return out;
  }
  const sA = src.indexOf('<script>\n', src.indexOf('<script id="sf-embed">')), sB = src.lastIndexOf('</script>');
  const fA = src.indexOf('var FLOW = (function(){'), fB = src.indexOf('/* ================= v60.62 指板');
  if (sA < 0 || sB < 0 || fA < 0 || fB < 0 || !(sA < fA && fA < fB && fB < sB)) throw new Error('找不到主脚本或 FLOW 块边界');
  const T = lex(sA + 8, sB);
  const strs = T.filter(t => t.t === 's');
  const inR = (p, rs) => rs.some(([a, b]) => p >= a && p < b);
  const inFlow = p => p >= fA && p < fB;
  const P = (k, v) => T[k] && T[k].t === 'p' && T[k].v === v && !T[k].nested;
  const I = (k, v) => T[k] && T[k].t === 'i' && (v == null || T[k].v === v) && !T[k].nested;
  /* 调用实参：k＝「(」记号下标 → 各参数的源码区间 [s, e)；只认非嵌套标点 */
  function args(k) { let d = 0, st = T[k].e; const a = [];
    for (let j = k + 1; j < T.length; j++) { const t = T[j]; if (t.nested || t.t !== 'p') continue;
      if ('([{'.indexOf(t.v) >= 0) d++; else if (')]}'.indexOf(t.v) >= 0) { if (!d) { a.push([st, t.s]); return { a, end: j }; } d--; } else if (t.v === ',' && !d) { a.push([st, t.s]); st = t.e; } }
    return { a, end: T.length - 1 }; }
  const tokIdx = p => { let lo = 0, hi = T.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (T[m].s < p) lo = m + 1; else hi = m; } return lo; };
  const match = k => { const o = T[k].v, c = { '(': ')', '[': ']', '{': '}' }[o]; let d = 0;
    for (let j = k; j < T.length; j++) { const t = T[j]; if (t.nested || t.t !== 'p') continue; if (t.v === o) d++; else if (t.v === c) { d--; if (!d) return j; } } return T.length - 1; };
  const litsIn = ([a, b]) => strs.filter(t => t.s >= a && t.e <= b);
  /* —— 豁免区间：C() 第 3、4 参（FLOW 块）· console.* / F.track / FLOW.track 的全部参数 —— */
  const EXR = [];
  for (let k = 0; k < T.length - 1; k++) {
    if (I(k, 'C') && P(k + 1, '(') && inFlow(T[k].s) && !(T[k - 1] && T[k - 1].t === 'p' && T[k - 1].v === '.')) { const r = args(k + 1); if (r.a.length >= 4) EXR.push(r.a[2], r.a[3]); }
    if (I(k, 'toastSay') && P(k + 1, '(') && !I(k - 1, 'function')) { const r = args(k + 1); if (r.a[0]) EXR.push(r.a[0]); }   /* 旧外壳原文 */
    if (P(k + 1, '.') && I(k + 2) && P(k + 3, '(') && ((I(k, 'console') && /^(log|warn|error|info|debug)$/.test(T[k + 2].v)) || ((I(k, 'F') || I(k, 'FLOW')) && T[k + 2].v === 'track'))) { const r = args(k + 3); r.a.forEach(x => EXR.push(x)); }
  }
  const EXACT = new Set(['右栏', '左栏', '关闭右侧', '右侧没有窗口', '右侧']);
  const okLine = p => /p3-ok:/.test(rawLine(lineOf(p)));
  /* 专名（谱类名 / 乐器名 / 曲名）≤6 字豁免 */
  const INST = new Set(); { const a = src.indexOf('const NW_INSTS=['); if (a >= 0) { const seg = src.slice(a, src.indexOf('];', a)); (seg.match(/name:'([^']+)'/g) || []).forEach(m => INST.add(m.slice(6, -1))); } }
  const proper = t => { const x = String(t).trim(); const n = cnt(x); return n <= 6 && (/谱$/.test(x) || INST.has(x) || /^《[^》]*》$/.test(x)); };
  const clean = t => String(t).replace(/<[^>]*>/g, ' ').replace(/&[#\w]+;/g, ' ').replace(/\s+/g, ' ').trim();
  const R = { btn4: [], mi6: [], sub: [], title12: [], p3: [], p3syn: [], title16: [] };
  /* v68.7 收尾 BUD-3：P3 定稿正则之外的同义指路（「点下面的按钮」「标题旁的按钮」「右端」…）——只报告的观察名单，不进 p3、不进验收线；
     同 p3 的扫描范围与豁免（FLOW 块字面量 · toastSay 第 2 参 t: · 共享代码新外壳分支） */
  const P3SYN = /下面的|上面的|旁的按钮|下方的按钮|上方的按钮|右端|左端/;
  const synTest = (t) => { if (inR(t.s, EXR) || okLine(t.s)) return false; return P3SYN.test(t.v.replace(/aria-label="[^"]*"/g, '')); };
  const hit = (r, p, text) => R[r].push({ ln: lineOf(p), t: String(text).replace(/\u0000/g, '…').slice(0, 90) });
  /* —— p3：FLOW 块字面量 —— */
  const p3Test = (t) => { if (EXACT.has(t.v) || inR(t.s, EXR) || okLine(t.s)) return false; const v = t.v.replace(/aria-label="[^"]*"/g, '');   /* 规格 R4：aria-label 值（地标名 / 读屏名）不在 p3 扫描范围（集成时由只剥「右栏 / 左栏」放宽，例 #flw-rd-close「收起右栏」） */ return P3.test(v); };
  strs.forEach(t => { if (inFlow(t.s) && p3Test(t)) hit('p3', t.s, t.v); });
  strs.forEach(t => { if (inFlow(t.s) && synTest(t)) hit('p3syn', t.s, t.v); });
  /* —— p3：toastSay( 第 2 参 t: —— */
  for (let k = 0; k < T.length - 1; k++) { if (!(I(k, 'toastSay') && P(k + 1, '(')) || (T[k - 1] && T[k - 1].t === 'i' && T[k - 1].v === 'function')) continue;
    const r = args(k + 1); const a2 = r.a[1]; if (!a2) continue; const k0 = tokIdx(a2[0]);
    for (let j = k0; j < T.length && T[j].s < a2[1]; j++) if (I(j, 't') && P(j + 1, ':')) { let d = 0, e = a2[1];
      for (let q = j + 2; q < T.length && T[q].s < a2[1]; q++) { const t = T[q]; if (t.nested || t.t !== 'p') continue; if ('([{'.indexOf(t.v) >= 0) d++; else if (')]}'.indexOf(t.v) >= 0) { if (!d) { e = t.s; break; } d--; } else if (t.v === ',' && !d) { e = t.s; break; } }
      litsIn([T[j + 1].e, e]).forEach(t => { if (!inFlow(t.s) && p3Test(t)) hit('p3', t.s, t.v); if (!inFlow(t.s) && synTest(t)) hit('p3syn', t.s, t.v); }); }
  }
  /* —— p3：共享代码里 flowOn() 的新外壳分支 —— */
  const BR = [];
  const ternEnd = (k, stopColon) => { let d = 0, tn = 0; for (let j = k; j < T.length; j++) { const t = T[j]; if (t.nested || t.t !== 'p') continue;
      if ('([{'.indexOf(t.v) >= 0) d++; else if (')]}'.indexOf(t.v) >= 0) { if (!d) return j; d--; }
      else if (!d && t.v === '?') tn++; else if (!d && t.v === ':') { if (tn) tn--; else if (stopColon) return j; else return j; } else if (!d && (t.v === ',' || t.v === ';') && !stopColon) return j; else if (!d && t.v === ';') return j; } return T.length - 1; };
  for (let k = 1; k < T.length - 3; k++) {
    if (!(I(k, 'flowOn') && P(k + 1, '(') && P(k + 2, ')')) || inFlow(T[k].s) || I(k - 1, 'function')) continue;
    const neg = P(k - 1, '!');
    if (P(k + 3, '?')) { const c = ternEnd(k + 4, true); if (!P(c, ':')) continue;
      if (!neg) BR.push([T[k + 3].e, T[c].s]); else { const e = ternEnd(c + 1, false); BR.push([T[c].e, T[e] ? T[e].s : sB]); } continue; }
    /* 是否在 if( 条件里：向前找没配对的「(」；途中遇到被 ! 取反的括号就算取反 */
    let d = 0, negIn = neg, ifk = -1;
    for (let j = k - 1; j >= Math.max(0, k - 80); j--) { const t = T[j]; if (t.nested || t.t !== 'p') continue;
      if (t.v === ')') d++; else if (t.v === '(') { if (d) { d--; continue; } if (I(j - 1, 'if')) { ifk = j; break; } if (P(j - 1, '!')) negIn = true; }
      else if (!d && (t.v === ';' || t.v === '{' || t.v === '}')) break; }
    if (ifk < 0 || negIn) continue;
    const m = match(ifk); const b0 = m + 1; if (!T[b0]) continue;
    if (P(b0, '{')) BR.push([T[b0].s, T[match(b0)].e]);
    else { let dd = 0, e = T.length - 1; for (let j = b0; j < T.length; j++) { const t = T[j]; if (t.nested || t.t !== 'p') continue; if ('([{'.indexOf(t.v) >= 0) dd++; else if (')]}'.indexOf(t.v) >= 0) { if (!dd) { e = j; break; } dd--; } else if (t.v === ';' && !dd) { e = j; break; } }
      BR.push([T[b0].s, T[e].e]); }
  }
  const seenP = new Set(R.p3.map(h => h.ln + '|' + h.t));
  BR.forEach(r => litsIn(r).forEach(t => { if (inFlow(t.s) || !p3Test(t)) return; const k = lineOf(t.s) + '|' + t.v.slice(0, 90); if (seenP.has(k)) return; seenP.add(k); hit('p3', t.s, t.v); }));
  const seenS = new Set(R.p3syn.map(h => h.ln + '|' + h.t));
  BR.forEach(r => litsIn(r).forEach(t => { if (inFlow(t.s) || !synTest(t)) return; const k = lineOf(t.s) + '|' + t.v.slice(0, 90); if (seenS.has(k)) return; seenS.add(k); hit('p3syn', t.s, t.v); }));
  /* 一个表达式（记号下标 [k0, k1)）里「显示出来的」字符串：按顶层 ? / : 切成段，丢掉条件段（后面跟 ? 的）；
     调用实参里的字面量（f('x')）与比较两侧的字面量（x==='a'）不算；段里有顶层 + 就把字面量拼成一条（动态部分记 〈〉） */
  function valStrs(k0, k1) {
    const segs = [[]]; const plus = [false]; let d = 0; const stk = [];
    for (let j = k0; j < k1; j++) { const t = T[j]; if (t.nested && t.t === 'p') continue;
      if (t.t === 'p') {
        if ('([{'.indexOf(t.v) >= 0) { const pv = T[j - 1]; stk.push(t.v === '(' && pv && (pv.t === 'i' || (pv.t === 'p' && (pv.v === ')' || pv.v === ']'))) && !(pv.t === 'i' && KW.test(pv.v)) ? 'call' : 'grp'); d++; continue; }
        if (')]}'.indexOf(t.v) >= 0) { stk.pop(); d--; continue; }
        if (!d && (t.v === '?' || t.v === ':')) { segs[segs.length - 1].q = t.v === '?'; segs.push([]); plus.push(false); continue; }
        if (!d && t.v === '+') plus[plus.length - 1] = true;
        continue; }
      if (t.t !== 's' || t.nested || stk.indexOf('call') >= 0) continue;
      const pv = T[j - 1], nx = T[j + 1], nx2 = T[j + 2];
      if ((pv && pv.t === 'p' && pv.v === '=' ) || (nx && nx.t === 'p' && (nx.v === '=' || nx.v === '!') && nx2 && nx2.t === 'p' && nx2.v === '=')) continue;
      segs[segs.length - 1].push(t); }
    const out = [];
    segs.forEach((sg, i) => { if (sg.q || !sg.length) return; if (plus[i]) out.push({ s: sg[0].s, v: sg.map(t => t.v).join('〈〉') }); else sg.forEach(t => out.push({ s: t.s, v: t.v })); });
    return out; }
  /* 值的记号区间：从 k0 起到顶层 , ; ) ] } 为止 */
  const valEnd = (k0) => { let d = 0; for (let j = k0; j < T.length; j++) { const t = T[j]; if (t.nested || t.t !== 'p') continue; if ('([{'.indexOf(t.v) >= 0) d++; else if (')]}'.indexOf(t.v) >= 0) { if (!d) return j; d--; } else if (!d && (t.v === ',' || t.v === ';')) return j; } return T.length; };
  /* —— F.mi：mi6 / sub —— */
  const objKeys = (k) => { const o = {}; const e = match(k); let d = 0;
    for (let j = k + 1; j < e; j++) { const t = T[j]; if (t.nested) continue;
      if (t.t === 'p') { if ('([{'.indexOf(t.v) >= 0) d++; else if (')]}'.indexOf(t.v) >= 0) d--; continue; }
      if (!d && t.t === 'i' && P(j + 1, ':') && (P(j - 1, '{') || P(j - 1, ','))) { let dd = 0, q = j + 2; for (; q < e; q++) { const x = T[q]; if (x.nested || x.t !== 'p') continue; if ('([{'.indexOf(x.v) >= 0) dd++; else if (')]}'.indexOf(x.v) >= 0) dd--; else if (x.v === ',' && !dd) break; }
        o[t.v] = { r: [T[j + 1].e, q < e ? T[q].s : T[e].s], k0: j + 2, k1: q }; } }
    return o; };
  const valText = (v) => { if (!v) return null; const L = valStrs(v.k0, v.k1).map(x => x.v); return L.length ? L : null; };
  for (let k = 0; k < T.length - 4; k++) {
    if (!((I(k, 'F') || I(k, 'FLOW')) && P(k + 1, '.') && I(k + 2, 'mi') && P(k + 3, '(') && P(k + 4, '{')) || !inFlow(T[k].s)) continue;
    const o = objKeys(k + 4); const lab = valText(o.label) || valText(o.html) || ['〈动态〉'];
    if (o.label) (valText(o.label) || []).forEach(x => { const c = clean(x.replace(/〈〉/g, '')); if (!c) return; if ((cnt(c) > 6 && !proper(c)) || PUNCT.test(c)) hit('mi6', T[k].s, c); });
    if (o.d) hit('sub', T[k].s, clean(lab.join(' / ')) + '｜' + clean((valText(o.d) || ['〈动态〉']).join(' / ')));
  }
  ['lbMenuFlowHTML', 'quickMenuFlowHTML'].forEach(nm => { for (let k = 0; k < T.length; k++) { if (!I(k, nm)) continue;
      let j = k + 1; if (!(P(j, '(') || P(j, '=') || P(j, ':'))) continue; let open = -1; for (let q = j; q < Math.min(T.length, j + 40); q++) if (P(q, '{')) { open = q; break; } if (open < 0) continue;
      const e = match(open); litsIn([T[open].s, T[e].e]).forEach(t => { (t.v.match(/<b>([^<]*)<\/b>/g) || []).forEach(m => { const c = clean(m); if (c && ((cnt(c) > 6 && !proper(c)) || PUNCT.test(c))) hit('mi6', t.s, c); }); });
      /* v68.7 收尾 BUD-6：<b> 内由「'字面量' + 变量」拼成的名称（'<b>'+(last? '按上次 · '+谱名 : …)+'</b>'）——单个字面量里看不到完整 <b>…</b>，
         上面那条扫不到。取 '…<b>' + 表达式 + '</b>…' 之间的表达式，按顶层 ? : 分段（丢条件段）：段内字面量拼起来超 6 字 / 带句读，
         或字面量与动态值拼接（名称里拼进了谱名等变量，长度不受控）＝命中；纯动态（esc(谱名)）是专名，不算 */
      for (let j = T[open].s, q = tokIdx(T[open].s); q < e; q++) {
        const t0 = T[q]; if (t0.t !== 's' || t0.nested || t0.v.lastIndexOf('<b>') < 0 || t0.v.lastIndexOf('<b>') < t0.v.lastIndexOf('</b>') || !P(q + 1, '+')) continue;
        let d = 0, z = -1; for (let w = q + 2; w < e; w++) { const x = T[w]; if (x.nested) continue; if (x.t === 'p') { if ('([{'.indexOf(x.v) >= 0) d++; else if (')]}'.indexOf(x.v) >= 0) d--; continue; }
          if (x.t === 's' && !d && P(w - 1, '+') && x.v.indexOf('</b>') >= 0) { z = w; break; } }
        if (z < 0) continue;
        let a = q + 2, b = z - 1; while (P(a, '(') && match(a) === b - 1) { a++; b--; }
        const segs = [[]]; let dd = 0; for (let w = a; w < b; w++) { const x = T[w]; if (x.nested) continue;
          if (x.t === 'p') { if ('([{'.indexOf(x.v) >= 0) dd++; else if (')]}'.indexOf(x.v) >= 0) dd--; else if (!dd && (x.v === '?' || x.v === ':')) { segs[segs.length - 1].q = x.v === '?'; segs.push([]); } else segs[segs.length - 1].push(x); continue; }
          segs[segs.length - 1].push(x); }
        segs.forEach(sg => { if (sg.q) return; const lit = sg.filter(x => x.t === 's' && !x.nested).map(x => x.v).join(''); const dyn = sg.some(x => x.t === 'i');
          const c = clean(lit); if (!c) return;
          if ((cnt(c) > 6 && !proper(c)) || PUNCT.test(c) || dyn) hit('mi6', t0.s, c + (dyn ? '〈拼接〉' : '')); });
        q = z; }
      k = e; } });
  /* —— title12 —— */
  const nameSeg = t => String(t).split(/（|\(|：| · /)[0];
  /* v68.7 收尾 BUD-2：整条也有上限（只报告）——title12 只量名称段，「名称：长说明」「名称（长说明）」量不出。
     整条 ≤16 字；末尾括注是快捷键 / 数值范围（括注里除「空格」外没有汉字，如（Ctrl+K）（Esc）（1–999））不计。灰显原因多在运行时拼（setD / F.mi why），不在静态字面量里 */
  const keyParen = /（([^（）]*)）$/;
  const tHit = (p, v) => { const c = clean(v.replace(/\u0000/g, '')); if (!/[\u4e00-\u9fff]/.test(c)) return; if (cnt(nameSeg(c)) > 12) hit('title12', p, c);
    const m = keyParen.exec(c), body = (m && !/[\u4e00-\u9fff]/.test(m[1].replace(/空格/g, ''))) ? c.slice(0, m.index) : c;
    if (cnt(body) > 16) hit('title16', p, c); };
  strs.forEach(t => { if (!inFlow(t.s) || inR(t.s, EXR)) return; (t.v.match(/title="([^"]+)"/g) || []).forEach(m => tHit(t.s, m.slice(7, -1))); });
  for (let k = 0; k < T.length - 2; k++) { if (!inFlow(T[k].s) || T[k].nested) continue;
    if (I(k, 'title') && P(k + 1, ':') && !P(k - 1, '.') && (P(k - 1, '{') || P(k - 1, ','))) valStrs(k + 2, valEnd(k + 2)).forEach(x => tHit(x.s, x.v));
    if (P(k, '.') && I(k + 1, 'title') && P(k + 2, '=') && !P(k + 3, '=')) valStrs(k + 3, valEnd(k + 3)).forEach(x => tHit(x.s, x.v));
    if (I(k, 'setAttribute') && P(k + 1, '(') && T[k + 2] && T[k + 2].t === 's' && T[k + 2].v === 'title') { const r = args(k + 1); if (r.a[1]) litsIn(r.a[1]).forEach(t => tHit(t.s, t.v)); }
  }
  /* —— btn4 —— */
  const bHit = (p, v) => { const c = clean(String(v).replace(/\u0000/g, '')); if (!c || /^[\d\s.%×x:/–+\-]+$/.test(c)) return; if (cnt(c) > 4 && !proper(c)) hit('btn4', p, c); };
  strs.forEach(t => { if (!inFlow(t.s) || inR(t.s, EXR)) return; (t.v.match(/>([^<>]*)<\/button>/g) || []).forEach(m => { const x = m.slice(1, -9); if (x.indexOf('\u0000') < 0) bHit(t.s, x); }); });
  for (let k = 0; k < T.length - 1; k++) { if (!inFlow(T[k].s) || T[k].nested) continue;
    if ((I(k, 'GB') || I(k, 'btn')) && P(k + 1, '(') && !I(k - 1, 'function') && !P(k - 1, '.')) { const prevT = T[k - 1]; if (prevT && prevT.t === 'i' && /^(const|let|var)$/.test(prevT.v)) continue;
      const r = args(k + 1); const a = r.a[I(k, 'GB') ? 2 : 3]; if (a) litsIn(a).filter(t => !t.nested).forEach(t => bHit(t.s, t.v)); }
    if ((I(k, 'TOOLS') || I(k, 'SEG')) && P(k + 1, '=') && I(k - 1, 'const')) { const o = k + 2, e = match(o);
      if (T[k].v === 'TOOLS') { for (let j = o; j < e; j++) if (I(j, 't') && P(j + 1, ':')) { let d = 0; for (let q = j + 2; q < e; q++) { const t = T[q]; if (t.t === 's' && !t.nested) { bHit(t.s, t.v); continue; } if (t.nested || t.t !== 'p') continue; if ('([{'.indexOf(t.v) >= 0) d++; else if (')]}'.indexOf(t.v) >= 0) { if (!d) break; d--; } else if (!d && t.v === ',') break; } } }
      else { for (let j = o + 1; j < e; j++) if (P(j, '[')) { const r = args(j); const a = r.a[2]; if (a) litsIn(a).forEach(t => bHit(t.s, t.v)); j = r.end; } }
    }
  }
  return R;
}
function budget() {
  const BASE = path.join(__dirname, 'wording-budget-base.json');
  const f = path.join(ROOT, 'muse-tab/index.html');
  const src = fs.readFileSync(f, 'utf8');
  const R = budgetScan(src);
  if (process.argv.includes('--budget-base')) {
    let commit = ''; try { commit = require('child_process').execFileSync('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (_) {}
    const ver = (src.match(/const APP_VER\s*=\s*'([^']+)'/) || [])[1] || '';
    const o = { version: ver, commit, note: 'v68.7 S0 字数预算基线（check-wording.js budget()，只报告）；按文本比，不按行号', rules: {} };
    Object.keys(R).forEach(k => { o.rules[k] = R[k].map(h => h.t); });
    fs.writeFileSync(BASE, JSON.stringify(o, null, 1) + '\n');
    console.log('📏 字数预算基线已写入 ' + path.relative(ROOT, BASE) + '（' + ver + ' ' + commit + '）：' + Object.keys(R).map(k => k + ' ' + R[k].length).join(' · '));
    return;
  }
  let B = null; try { B = JSON.parse(fs.readFileSync(BASE, 'utf8')); } catch (_) { B = null; }
  const NAME = { btn4: '按钮 ≤4 字', mi6: '菜单项 ≤6 字', sub: '菜单副标题', title12: '悬停名称 ≤12 字', p3: '指路词', p3syn: '同义指路（观察）', title16: '悬停整条 ≤16 字' };
  console.log('📏 字数预算（v68.7 S0，只报告、不拦截；基线 ' + (B ? 'deploy/wording-budget-base.json ' + B.version + ' ' + B.commit : '缺失') + '）');
  Object.keys(R).forEach(k => {
    const base = B && B.rules && B.rules[k] ? B.rules[k] : []; const bs = new Set(base);
    const nw = R[k].filter(h => !bs.has(h.t));
    console.log('   ' + k.padEnd(8) + NAME[k].padEnd(12 - NAME[k].length + NAME[k].length) + '  存量 ' + R[k].length + '（基线 ' + base.length + '）· 新增 ' + nw.length);
    (process.argv.includes('--budget-all') ? R[k] : nw.slice(0, 10)).forEach(h => console.log('      ' + (bs.has(h.t) ? '·' : '+') + ' L' + h.ln + ' 「' + h.t.replace(/\s+/g, ' ') + '」'));
  });
}
