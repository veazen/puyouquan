'use strict';
/* v70.5 同谱表双声部 a（读得进·听得到·导得出）B 组：互通与播放（规格 docs/spec-2026-11-v705.md §4–§7、§10.3「tv_v705layer」）。file:// 直载，真实浏览器。
   夹具：tests/fixtures/v705/F01…F27.musicxml（含 F01b–F01d；手写的第三方写法，标注见各文件 <software>，不依赖外网；§10.2）。
   N  N9 三个前置小改（§4.1，不建层）：① 主声部每谱表全曲固定（预扫，不再逐小节取第一个 voice；voice 过滤在倚音块之前）
      ② 跨谱表的音不占对面谱表（按声部的归属谱表归行）③ 只有休止的第二声部不算丢弃（只计有音高的音）；按谱表编号 / 不写 voice 的大谱表不并行；
      自家旧写法（1@1 / 2@2、弱起）与 c9882a4 导入逐字节相同
   I  导入夹具 F01–F27（§10.2 期望列）：层＝紧跟宿主的行（voxLayer＋见证 mixer lay:1）、空拍按拍位补 hid（D-18）、按谱表 tMax 补齐（D-19）、方向记号按 voice 分流（D-9）、
      两遍截断（D-20）、编号约定按 part 判（D-21）、曲中谱号 / 八度线 / 和弦名按时间；I0 层不变式（谱表属性、mixer、简称、名字）、I0b 每行 hid 总时值守恒
   Q  导入报告：skipText 四个分项（vBy）、GP / 旧数据照旧；新建面板依据行（同谱表第二声部 N 张谱表、跨谱表的音）
   K  分类接缝（需 A 组分类入口接谱表视图，规格 §2.3）：分层钢琴＝钢琴独奏谱、女高女低同谱表＝合唱谱 3 声部、单件乐器带层 parts＝1
   E  页面脚本错误 0
   修前红：MUSETAB_URL 指向 git show a73fecc:muse-tab/index.html 的副本复跑——见各段头注。
   env：MUSETAB_URL 被测页（缺省 ../index.html）· V705_REF 基线页（缺省 git show c9882a4，v70.4 行为）· ONLY=N,I 只跑部分段 */
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const REF_COMMIT = 'c9882a4c1f243470e4bf8f6ce3ff63224b107e75';
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (d != null && !ok ? '：' + String(d).slice(0, 1600) : '')); };
const J = x => JSON.stringify(x);
const FXD = path.join(__dirname, 'fixtures', 'v705');
const FX = n => fs.readFileSync(path.join(FXD, n + '.musicxml'), 'utf8');
const refUrl = () => {
  if (process.env.V705_REF) return toUrl(process.env.V705_REF);
  try { const t = path.join(os.tmpdir(), 'v705_ref_' + REF_COMMIT.slice(0, 12) + '.html');
    if (!fs.existsSync(t) || fs.statSync(t).size < 1e5) fs.writeFileSync(t, execFileSync('git', ['-C', path.resolve(__dirname, '..', '..'), 'show', REF_COMMIT + ':muse-tab/index.html'], { maxBuffer: 1 << 28 }));
    return 'file://' + t; } catch (_) { return null; }
};

/* ---------- 页内工具 ---------- */
const HELP = () => {
  /* 列摘要：音级（^八度）或 0 / h（隐形休止），/时值(.)，t连音，+和音数，g倚音，[力度]，{和弦名}，<谱号>，~八度线，"歌词" */
  window.__c = c => (c.deg ? c.deg + (c.acc || '') + (c.oct ? '^' + c.oct : '') : (c.hid === 1 ? 'h' : '0')) + '/' + c.dur + (c.dotted === 2 ? '..' : c.dotted ? '.' : '') + (c.tup ? 't' + c.tup : '')
    + (c.adds && c.adds.length ? '+' + c.adds.length : '') + (c.grace ? 'g' + (c.grace.notes || []).length : '') + (c.dyn ? '[' + c.dyn + ']' : '') + (c.chord ? '{' + c.chord + '}' : '') + (c.clef ? '<' + c.clef + '>' : '')
    + (c.ott ? '~' + c.ott + (c.ottTo ? '>' + c.ottTo.mi + ':' + c.ottTo.ci : '') : '') + ((c.lyrics || []).some(Boolean) ? '"' + c.lyrics.map(x => x || '').join('|') + '"' : '');
  window.__imp = x => { const r = importMusicXML(x); if (!r || r.error || !r.song) return { err: (r && r.error) || '导入失败' };
    const s = r.song, u = mi => (s.measures[mi] || {}).unit || s.unit;
    return { s, vv: s.voxVoices, vn: s.voxNotations, vl: s.voxLayer === undefined ? '无' : s.voxLayer, vg: s.voxGroups || null, mx: s.mixer || null, short: s.voxShort || null, rowNames: s.rowNames || 0, pickup: !!s.pickup,
      rows: s.measures.map(m => (m.voxes || []).map(row => (row || []).map(__c).join(' '))),
      tot: s.measures.map((m, mi) => (m.voxes || []).map(row => Math.round((row || []).reduce((a, c) => a + beatsOf(c, u(mi)), 0) * 1000) / 1000)),
      irr: s.measures.map(m => m.irr || 0), skip: r.skip, lossy: r.lossy, warn: r.warn || '', txt: typeof skipText === 'function' ? skipText(r.skip) : '',
      hidQ: s.measures.map(m => (m.voxes || []).map(row => (row || []).reduce((a, c) => a + (c.hid === 1 && !c.deg ? beatsOf(c, 4) : 0), 0))),
      inv: __inv(s) }; };
  /* 层不变式（规格 §4.3-4、§4.6）：层与宿主 voxNotations / voxClefOct / voxTransp / voxDual 逐项相等，mixer 条目除 lay:1 外相等（宿主没有条目＝trackCfg 缺省），
     层 voxShort 为 null，层名「宿主名·2」（自家 pyq-voice-names 另核），voxLayer 长度＝行数、只认 1；返回不符的条目（空＝通过） */
  window.__inv = (s, names) => { const bad = [], vl = s.voxLayer; if (vl === undefined) return bad;
    if (!Array.isArray(vl) || vl.length !== s.voxVoices.length) { bad.push('voxLayer 长度'); return bad; }
    const g = (k, i) => (s[k] || [])[i], DF = { on: true, solo: false, inst: 'ah', vol: 1, pan: null };
    vl.forEach((x, i) => { if (x == null) return; if (x !== 1 || i === 0 || vl[i - 1] === 1) { bad.push('第 ' + i + ' 行值 ' + x); return; }
      ['voxNotations', 'voxClefOct', 'voxTransp', 'voxDual'].forEach(k => { if ((g(k, i) ?? null) !== (g(k, i - 1) ?? null)) bad.push(k + '[' + i + ']'); });
      const m = (s.mixer || {})['vox:' + i], h = (s.mixer || {})['vox:' + (i - 1)] || DF;
      if (!m || m.lay !== 1) bad.push('见证 vox:' + i); else { const c = Object.assign({}, m); delete c.lay; if (JSON.stringify(c) !== JSON.stringify(h)) bad.push('mixer vox:' + i + ' ≠ 宿主'); }
      if (g('voxShort', i) != null) bad.push('voxShort[' + i + ']');
      if (!names && s.voxVoices[i] !== s.voxVoices[i - 1] + '·2') bad.push('名字 ' + s.voxVoices[i]); });
    Object.keys(s.mixer || {}).forEach(k => { const m = /^vox:(\d+)$/.exec(k); if (m && s.mixer[k] && s.mixer[k].lay !== undefined && vl[+m[1]] !== 1) bad.push('多余见证 ' + k); });
    return bad; };
  /* 源谱里每个 voice 每小节可见内容的时值（四分；非和音非倚音，print-object="no" 的休止不算）——hid 总时值守恒的独立口径 */
  window.__vis = x => { const d = new DOMParser().parseFromString(x, 'application/xml'), out = {}; let div = 1;
    d.querySelectorAll('part').forEach((p, pi) => p.querySelectorAll(':scope > measure').forEach((m, mi) => [...m.children].forEach(el => {
      if (el.tagName === 'attributes') { const dv = el.querySelector('divisions'); if (dv) div = +dv.textContent || div; return; }
      if (el.tagName !== 'note' || el.querySelector(':scope > chord') || el.querySelector(':scope > grace') || el.getAttribute('print-object') === 'no') return;
      const v = (el.querySelector(':scope > voice') || { textContent: '' }).textContent.trim(), k = pi + '|' + v + '|' + mi;
      out[k] = (out[k] || 0) + (+(el.querySelector(':scope > duration') || { textContent: 0 }).textContent || 0) / div; })));
    return out; };
};
async function open(b, url, q) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const pg = await ctx.newPage(); await pg.addInitScript(HELP);
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss().catch(() => {}));
  await pg.goto(withQ(url, q || 'shell=classic'));
  await pg.waitForFunction(() => typeof importMusicXML === 'function' && typeof loadSong === 'function', null, { timeout: 30000 });
  await pg.evaluate(() => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} try { const t = document.querySelector('#flw-tour'); if (t) t.remove(); } catch (_) {} });
  return { ctx, pg, errs };
}
const EV = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => ({ err: String(e.message || e).slice(0, 300) }));
const IMP = (pg, x) => EV(pg, x => { const r = __imp(x); if (r.s) delete r.s; return r; }, x);
const SONG = (pg, x) => EV(pg, x => { const r = importMusicXML(x); return r && r.song ? JSON.stringify(r.song) : 'ERR ' + (r && r.error); }, x);

/* ---------- 内联夹具（N 段） ---------- */
const HEAD = (parts, body) => `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><identification><encoding><software>Hand-written fixture (v70.5 B)</software></encoding></identification><part-list>${parts.map(p => `<score-part id="${p}"><part-name>${p}</part-name></score-part>`).join('')}</part-list>${body}</score-partwise>`;
const ATT = clef => `<attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>${clef || '<clef><sign>G</sign><line>2</line></clef>'}</attributes>`;
const NT = (st, oc, d, ty, v, x) => `<note><pitch><step>${st}</step><octave>${oc}</octave></pitch><duration>${d}</duration><voice>${v}</voice><type>${ty}</type>${x || ''}</note>`;
const TABATT = '<attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>TAB</sign><line>5</line></clef><staff-details><staff-lines>6</staff-lines>'
  + [['E', 2], ['A', 2], ['D', 3], ['G', 3], ['B', 3], ['E', 4]].map(([s, o], i) => `<staff-tuning line="${i + 1}"><tuning-step>${s}</tuning-step><tuning-octave>${o}</tuning-octave></staff-tuning>`).join('') + '</staff-details></attributes>';
const TN = (s, f, d, ty, v) => `<note><pitch><step>E</step><octave>4</octave></pitch><duration>${d}</duration><voice>${v}</voice><type>${ty}</type><notations><technical><string>${s}</string><fret>${f}</fret></technical></notations></note>`;
const TR = (d, ty, v) => `<note><rest/><duration>${d}</duration><voice>${v}</voice><type>${ty}</type></note>`;
/* H：第 1 小节只有 voice 1，第 2 小节只有 voice 2（探针 H：v70.4 把 voice 2 当成第 2 小节的主声部） */
const X_H = HEAD(['P1'], `<part id="P1"><measure number="1">${ATT()}${NT('C', 5, 16, 'whole', 1)}</measure><measure number="2">${NT('E', 4, 8, 'half', 2)}${NT('F', 4, 8, 'half', 2)}</measure></part>`);
/* 六线谱：voice 2 只有休止（③ 不计）；第 2 小节 voice 2 写在 voice 1 前面（主声部仍是 voice 1） */
const X_TAB = HEAD(['P1'], `<part id="P1"><measure number="1">${TABATT}${TN(1, 0, 16, 'whole', 1)}<backup><duration>16</duration></backup>${TR(16, 'whole', 2)}</measure>`
  + `<measure number="2">${TN(2, 3, 16, 'whole', 2)}<backup><duration>16</duration></backup>${TN(1, 5, 8, 'half', 1)}${TN(1, 7, 8, 'half', 1)}</measure></part>`);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const allErrs = [];
  const A = await open(b, URL0); const pg = A.pg;
  try {
    /* ================= N：N9 三个前置小改（不建层） =================
       修前红（a73fecc）：N1 N2 N3 N4 N5 N9；N6 N7 N8 N10 是「不变」守卫（v70.4 已对，绿） */
    if (want('N')) {
      { const r = await IMP(pg, FX('F09'));
        T(!r.err && r.rows[0][0] === '1^1/4 2^1/4 3^1/4 4^1/4' && r.rows[1][0] === '1^1/1',
          'N1 ①C voice 2 的倚音不挂到 voice 1（第 2 小节首音没有倚音；过滤在倚音块之前）', J(r)); }
      { const r = await IMP(pg, X_H);
        T(!r.err && r.rows[0][0] === '1^1/1' && r.rows[1][0] === 'h/4 h/4 h/4 h/4' && r.rows[1][1] === '3/2 4/2' && r.vv.length === 2,
          'N2 ①H 主声部全曲固定：第 2 小节只有 voice 2 时不把它当主声部（建层后：宿主这一小节整小节 hid，R9）', J(r)); }
      { const r = await IMP(pg, FX('F13'));
        T(!r.err && r.rows[0][0] === '1^1/4 2^1/4 3^1/4 4^1/4' && !r.pickup,
          'N3 ①I/J voice 2（带 forward）写在 voice 1 前面：voice 1 照收、不再整条丢', J(r)); }
      { const r = await IMP(pg, FX('F03'));
        T(!r.err && r.rows[0][0] === '3^1/4 2^1/4 5^-1/4 1^1/4' && r.rows[0][1] === '1^-1/1' && r.tot[0].every(t => t === 4) && r.skip.voices === 0 && !(r.skip.otherBy || {})['空拍'],
          'N4 ②E 钢琴 voice 1 一个音写 staff 2：留在右手（音高不变）、左手 voice 5 整小节完好、两行都是 4 拍、不计空拍', J(r)); }
      { const r = await IMP(pg, FX('F02'));
        T(!r.err && r.vv.length === 1 && r.skip.voices === 0 && r.rows[0][0] === '1^1/4 3^1/4 5^1/4 1^2/4',
          'N5 ③B 只有休止的 voice 2 不算丢弃（skip.voices 0）', J(r)); }
      { const r = await IMP(pg, FX('F17'));
        T(!r.err && r.vv.length === 4 && r.rows[1][0] === '5^1/1' && r.rows[1][2] === '1^-1/2 2^-1/2' && r.rows[1][3] === '1^-2/1',
          'N6 R2 按谱表编号 {1,2@1; 1,2@2}：左手的 voice 2 不搬进右手（D-21）', J(r)); }
      { const r = await IMP(pg, FX('F22'));
        T(!r.err && r.vv.length === 2 && r.rows[0][0] === '3^1/4 2^1/4 1^1/2' && r.rows[0][1] === '1^-1/1' && r.skip.voices === 0,
          'N7 都不写 <voice> 的大谱表：按 <staff> 两行、不计 skip.voices', J(r)); }
      { const r = await IMP(pg, FX('F11'));
        T(!r.err && r.vv.length === 2 && r.rows[0][0] === '3^1/4 2^1/4 1^1/4 2^1/4' && r.rows[0][1] === '1^-1/1' && r.tot[0].every(t => t === 4),
          'N8 两谱表都用 voice 1、时间重叠（按谱表编号）：两行不并、不超拍', J(r)); }
      { const r = await IMP(pg, X_TAB), tab = await EV(pg, x => { const s = importMusicXML(x).song; return s.measures.map(m => m.tabs[0].map(c => (c.notes || []).map(n => n.s + '.' + n.f).join('+') || '0').join(' ')); }, X_TAB);
        T(!r.err && r.skip.voices === 1 && J(tab) === J(['1.0', '1.5 1.7']),
          'N9 ③六线谱：只有休止的 voice 2 不计；第 2 小节 voice 2 写在前面时主声部仍是 voice 1（voice 2 的音计 1）', J([r.skip, tab])); }
      { const ru = refUrl();
        if (!ru) T(false, 'N10 基线页（git show ' + REF_COMMIT.slice(0, 7) + '）取不到');
        else { const R = await open(b, ru), bad = [];
          for (const n of ['F15', 'F18']) { const a = await SONG(pg, FX(n)), z = await SONG(R.pg, FX(n)); if (a !== z) bad.push(n + ' ' + a.slice(0, 300) + ' ≠ ' + z.slice(0, 300)); }
          await R.ctx.close();
          T(!bad.length, 'N10 自家旧写法钢琴（1@1 / 2@2）与自家 v70.4 导出的弱起钢琴：导入结果与 c9882a4 逐字节相同（D-19）', bad.join(' | ')); } }
    }
    /* ================= I：导入夹具 F01–F27（规格 §10.2 期望列） =================
       修前红（a73fecc）：除 I11 / I15 / I18 / I22（v70.4 已对的不变守卫）外全部红（v70.4 把 voice 2 整条跳过、不写 hid） */
    if (want('I')) {
      const R = {}; for (const n of ['F01', 'F01b', 'F01c', 'F01d', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08', 'F09', 'F10', 'F11', 'F12', 'F13', 'F14', 'F16', 'F17', 'F19', 'F20', 'F21', 'F22', 'F23', 'F24', 'F25', 'F26', 'F27']) R[n] = await IMP(pg, FX(n));
      const ok = r => r && !r.err && !(r.inv || []).length;
      const L = (r, mi, vi) => ((r.rows || [])[mi] || [])[vi];
      { const r = R.F01; T(ok(r) && J(r.vl) === '[null,1]' && L(r, 0, 1) === 'h/2 3/2' && r.skip.voices === 0 && J(r.vn) === '["staff","staff"]' && (r.mx || {})['vox:1'].lay === 1,
          'I1 F01 单谱表 voice 2（forward 2 拍＋二分）→ 2 行、voxLayer [null,1]、层＝hid 二分＋二分、skip.voices 0、见证 lay:1、层与宿主谱表属性相等', J(r)); }
      { const a = R.F01b, b2 = R.F01c, c = R.F01d;
        T(ok(a) && L(a, 0, 1) === '3/4 h/4 h/2', 'I1b F01b 4/4 第 2 拍起空 3 拍 → 四分＋二分（按拍位，不合成附点二分，D-18）', J(a.rows));
        T(ok(b2) && L(b2, 0, 1) === '3/8 h/8 h/4 h/2', 'I1c F01c 从半拍起空 3.5 拍 → 八分＋四分＋二分', J(b2.rows));
        T(ok(c) && L(c, 0, 1) === '3/8 h/4 h/4.', 'I1d F01d 6/8 从第 2 个八分起 → 四分＋附点四分（不跨拍）', J(c.rows)); }
      { const r = R.F02; T(ok(r) && r.vl === '无' && r.vv.length === 1 && r.skip.voices === 0, 'I2 F02 voice 2 只有休止 → 1 行、无 voxLayer、0 计数', J(r)); }
      { const r = R.F03; T(ok(r) && L(r, 0, 0) === '3^1/4 2^1/4 5^-1/4 1^1/4' && L(r, 0, 1) === '1^-1/1' && r.tot[0].every(t => t === 4) && r.lossy.xstaff === 1 && /跨谱表的音 1 个画在本声部谱表/.test(r.warn),
          'I3 F03 跨谱表的音留在右手（音高不变）、左手完好、不超拍、lossy.xstaff=1 且 warn 点名', J(r)); }
      { const r = R.F04; T(ok(r) && L(r, 0, 1) === 'h/4 h/4 h/4 h/4' && L(r, 3, 1) === 'h/4 h/4 h/4 h/4' && L(r, 1, 1) === '1/2 2/2' && r.tot.every(m => m[0] === m[1]),
          'I4 F04 第二声部只在 m2–m3：m1 / m4 层整小节 hid（长度＝该小节 tMax）', J(r.rows)); }
      { const r = R.F05; T(ok(r) && L(r, 0, 0) === '1/1' && L(r, 0, 1) === '1^2/1', 'I5 F05 声部交叉：按 voice 号归行（宿主 voice 1 低、层 voice 2 高）', J(r.rows)); }
      { const r = R.F06; T(ok(r) && J(r.vl) === '[null,1,null]' && L(r, 0, 1) === '1^1/4"lu" 7/4"lu" 6/2"lu"' && L(r, 0, 0) === '3^1/4"la" 2^1/4"la" 1^1/2"la"' && J(r.vg) === '[{"type":"bracket","from":0,"to":2}]',
          'I6 F06 女高 / 女低同谱表不同歌词：层行有自己的词；方括号组覆盖层行', J(r)); }
      { const r = R.F07; T(ok(r) && J(r.vv) === '["右手","右手·2","左手","左手·2"]' && J(r.vl) === '[null,1,null,1]' && J(r.vg) === '[{"type":"brace","from":0,"to":3}]'
          && L(r, 0, 3) === 'h/2 5^-2/2' && L(r, 1, 1) === 'h/2 5/2' && r.tot.every(m => m.every(t => t === 4)) && r.skip.voices === 0,
          'I7 F07 MuseScore 钢琴 1/2@1、5/6@2 → [右手, 右手·2, 左手, 左手·2]、voxLayer [null,1,null,1]、显式花括号 0–3、forward 成 hid', J(r)); }
      { const r = R.F08; T(ok(r) && r.vv.length === 2 && r.skip.voices === 2 && r.skip.vBy && r.skip.vBy.rank3 === 2 && /同谱表第 3 个起的声部音符 2 个/.test(r.txt) && L(r, 0, 1) === '3^1/2 2^1/2',
          'I8 F08 voice 3 的有音高音计 skip.voices（vBy.rank3；休止不计）、文案点名', J([r.skip, r.txt])); }
      { const r = R.F09; T(ok(r) && L(r, 0, 1) === '6/2 7/2g1' && !/g/.test(L(r, 1, 0)), 'I9 F09 voice 2 的倚音挂在层的主音上', J(r.rows)); }
      { const r = R.F10; T(ok(r) && L(r, 0, 0) === '1^1/4 h/4 h/4 5^1/4' && !r.irr[0] && !(r.skip.otherBy || {})['空拍'] && r.vl === '无',
          'I10 F10 单声部 print-object="no" 休止与 voice 1 forward 空拍都是 hid 列、后面的音不提前、不再 irr、不计空拍', J(r)); }
      { const r = R.F11; T(ok(r) && r.vv.length === 2 && r.vl === '无' && r.tot[0].every(t => t === 4), 'I11 F11 按谱表编号（两谱表都用 voice 1）→ 两行、不建层、不超拍', J(r)); }
      { const r = R.F12; T(ok(r) && L(r, 0, 1) === '6^-2/2 7^-2/2<bass>' && L(r, 0, 0) === '1^1/4 2^1/4 3^-1/4<bass> 4^-1/4' && L(r, 1, 1) === '1^-1/2~8va>1:1 2^-1/2~8va',
          'I12 F12 曲中换谱号按时间落到层（第 3 拍那一列，不早 N 拍）；层列 ott / ottTo 覆盖宿主区间', J(r.rows)); }
      { const r = R.F13; T(ok(r) && L(r, 0, 0) === '1^1/4 2^1/4 3^1/4 4^1/4' && L(r, 0, 1) === 'h/2 3/2', 'I13 F13 voice 2（带 forward）写在 voice 1 前面：voice 1 是宿主', J(r.rows)); }
      { const r = R.F14; T(ok(r) && r.vv.length === 15 && r.vl.filter(x => x === 1).length === 7 && r.skip.voices === 1 && r.skip.vBy.cap === 1 && /超出音轨上限的第二声部音符 1 个/.test(r.txt) && r.skip.parts === 0,
          'I14 F14 8 个单谱表 part 各带 voice 2 → 15 行（8 宿主＋7 层）、第 8 个层计 vBy.cap、文案点名', J([r.vv.length, r.skip, r.txt])); }
      { const r = R.F16; T(ok(r) && L(r, 0, 0) === '1^1/4[f] 2^1/4[p] 3^1/4[pp] 4^1/4' && L(r, 0, 1) === '6/2[mp] 5/2' && r.skip.vBy.rank3 === 2,
          'I16 F16 方向记号按 voice 分流：宿主收 voice 1 / 不带 voice / 被丢的 voice 3，层只收 voice 2（D-9）', J(r.rows)); }
      { const r = R.F17; T(ok(r) && J(r.vv) === '["右手","右手·2","左手","左手·2"]' && L(r, 0, 1) === '1^1/2 7/2' && L(r, 1, 3) === '1^-2/1' && L(r, 1, 1) === 'h/4 h/4 h/4 h/4' && L(r, 0, 3) === 'h/4 h/4 h/4 h/4',
          'I17 F17 按谱表编号 {1,2@1; 1,2@2}：左手 voice 2 留在左手·2、不搬进右手（D-21）', J(r.rows)); }
      { const r = R.F19; T(ok(r) && r.vv.length === 14 && r.vl.filter(x => x === 1).length === 6 && r.skip.parts === 0 && r.skip.vBy.cap === 1,
          'I19 F19 7 个带层 part＋六线谱＋第 8 个 part：8 宿主＋六线谱照收（skip.parts 0）、6 个层收下、第 7 个层计 vBy.cap（D-20）', J([r.vv.length, r.skip])); }
      { const r = R.F20; T(ok(r) && L(r, 0, 1) === '1/2+1 5/2g1' && r.skip.voices === 0, 'I20 F20 voice 2 的和音与倚音挂在层列上', J(r.rows)); }
      { const r = R.F21; T(ok(r) && J(r.vv) === '["右手","左手","左手·2"]' && J(r.vl) === '[null,null,1]' && J(r.vg) === '[{"type":"brace","from":0,"to":2}]', 'I21 F21 只有左手双声部 → [右手, 左手, 左手·2]、花括号 0–2', J(r)); }
      { const r = R.F22; T(ok(r) && r.vv.length === 2 && r.vl === '无' && r.skip.voices === 0, 'I22 F22 都不写 <voice> 的大谱表 → 两行、不建层', J(r)); }
      { const r = R.F23; T(ok(r) && L(r, 0, 1) === '1^1/2"|x" 7/2"|y"' && r.s === undefined, 'I23 F23 voice 2 的第 2 段词进层列 lyrics[1]', J(r.rows)); }
      { const r = R.F24; T(ok(r) && L(r, 0, 0) === '1^1/4[mf] 2^1/4 3^1/4 4^1/4' && L(r, 0, 1) === '6/2[p] h/2' && L(r, 1, 1) === '7/1',
          'I24 F24 Finale 写法：不带 voice 的 forward 不另产生 hid（层只补到本谱表 tMax）、带 voice 的方向按声部分流', J(r.rows)); }
      { const r = R.F25; T(ok(r) && L(r, 0, 1) === '6/8t1 5/8t1 4/8t1 h/8t1 3/8t1 2/2' && (r.skip.otherBy || {})['空拍'] === 1 && r.tot[0][1] <= 4,
          'I25 F25 三连音里凑不成整时值的 forward 空拍计「空拍」、不超拍；print-object 的连音休止读成 hid 且带 tup', J([r.rows, r.tot, r.skip.otherBy])); }
      { const r = R.F26; T(ok(r) && J(r.vl) === '[null,1]' && L(r, 0, 1) === 'h/4 h/4 h/4 h/4' && L(r, 1, 1) === 'h/2 h/2',
          'I26 F26 自家分层导出：层全是 forward 也照建（pyq-voice-names 点名），voxLayer 与行数对得上', J(r)); }
      { const r = R.F27; T(ok(r) && L(r, 0, 0) === '1^1/4{C} 2^1/4 3^1/4{G7} 4^1/4' && !/\{/.test(L(r, 1, 0)), 'I27 F27 层段里的 <harmony>（backup 之后）按时间挂到宿主第 3 拍', J(r.rows)); }
      /* 不变式（全部夹具）＋ hid 总时值守恒：生效层对每行 hid ＝ 本谱表本小节长度 − 源谱里这个 voice 的可见时值（单谱表夹具逐小节核） */
      { const bad = []; for (const n of Object.keys(R)) { const r = R[n]; if (!r || r.err) { bad.push(n + ' 导入失败'); continue; } if ((r.inv || []).length) bad.push(n + ' ' + r.inv.join('/')); }
        T(!bad.length, 'I0 全部夹具：层与宿主谱表属性逐项相等、mixer 除 lay 外相等、层 voxShort null、层名「宿主名·2」、见证只在层行', bad.join(' | ')); }
      { const bad = [];
        for (const n of ['F01', 'F01b', 'F01c', 'F01d', 'F04', 'F05', 'F09', 'F12', 'F13', 'F16', 'F20', 'F23', 'F24', 'F27']) { const r = R[n], vis = await EV(pg, x => __vis(x), FX(n));
          (r.rows || []).forEach((m, mi) => { const len = r.tot[mi][0] * (n === 'F01d' ? 0.5 : 1);
            [['1', 0], ['2', 1]].forEach(([v, vi]) => { const want = len - (vis['0|' + v + '|' + mi] || 0); if (Math.abs(r.hidQ[mi][vi] - want) > 1e-6) bad.push(n + ' m' + (mi + 1) + ' voice ' + v + ' hid ' + r.hidQ[mi][vi] + '≠' + want); }); }); }
        T(!bad.length, 'I0b 生效层对每行 hid 总时值守恒（＝本谱表小节长 − 源谱该声部可见时值）', bad.join(' | ')); }
    }
    /* ================= Q：导入报告（规格 §4.7、§4.8） =================
       修前红（a73fecc）：Q1 Q3（没有分项 / 依据行）；Q2 是「GP / 旧数据照旧」守卫 */
    if (want('Q')) {
      { const r = await EV(pg, () => skipText({ voices: 7, vBy: { rank3: 1, tab: 2, jp: 3, cap: 1 }, at: { voices: { n: 4, m: 2 }, 'voices:rank3': { n: 1, m: 2 }, 'voices:tab': { n: 2, m: 3 }, 'voices:jp': { n: 1, m: 5 }, 'voices:cap': { n: 1, m: 1 } } }));
        T(typeof r === 'string' && /同谱表第 3 个起的声部音符 1 个（第 2 小节）/.test(r) && /六线谱第二声部音符 2 个（首处第 3 小节）/.test(r) && /简谱谱表的第二声部音符 3 个（第 5 小节）/.test(r)
          && /超出音轨上限的第二声部音符 1 个（第 1 小节）/.test(r) && !/同谱表第二声部音符/.test(r), 'Q1 skipText 有 skip.vBy 时按四个分项出（各附首处小节号），不再写「同谱表第二声部」', r); }
      { const r = await EV(pg, () => [skipText({ voices: 4 }), skipText({ voices: 2, vBy: {} })]);
        T(Array.isArray(r) && /同谱表第二声部音符 4 个/.test(r[0]) && /同谱表第二声部音符 2 个/.test(r[1]), 'Q2 没有 vBy（Guitar Pro 导入、旧数据）照旧「同谱表第二声部音符 N 个」', J(r)); }
      { const pick = async fp => { const A2 = await open(b, URL0, 'x=1'), p2 = A2.pg;
          try { await p2.click('#dt-add'); await p2.waitForSelector('.nf-modal [data-scene]'); await p2.click('.nf-tabs [data-v="import"]'); await p2.waitForSelector('#nf-isrc');
            const [fc] = await Promise.all([p2.waitForEvent('filechooser', { timeout: 5000 }), p2.click('#nw-import')]); await fc.setFiles(fp);
            await p2.waitForFunction(() => !!(NWP.state && NWP.state.imp.a) && !!document.querySelector('#nf-ibasis'), null, { timeout: 8000 });
            return await p2.evaluate(() => [...document.querySelectorAll('#nf-ibasis p')].map(p => p.querySelector('i').textContent + ' ‖ ' + p.querySelector('em').textContent));
          } catch (e) { return ['ERR ' + e.message]; } finally { allErrs.push(...A2.errs); await A2.ctx.close(); } };
        const b7 = await pick(path.join(FXD, 'F07.musicxml')), b3 = await pick(path.join(FXD, 'F03.musicxml')), b0 = await pick(path.join(FXD, 'F15.musicxml'));
        T(b7.some(x => /同谱表第二声部 2 张谱表，暂按单独一行显示/.test(x)) && b3.some(x => /跨谱表的音 1 个/.test(x)) && !b0.some(x => /同谱表第二声部|跨谱表/.test(x)),
          'Q3 新建面板「从已有音乐」依据：有第二声部写「同谱表第二声部 N 张谱表，暂按单独一行显示」、有跨谱表音写「跨谱表的音 N 个」；老文件不出这两行', J({ b7, b3, b0 })); }
    }
    /* ================= K：分类接缝（A 组分类入口接谱表视图之后成立；规格 §2.3 金表、§4.7） =================
       导入产物经 PQ_KIND 分类：钢琴带层仍是钢琴独奏谱 / 大谱表 2 行；女高女低同谱表＋男声是合唱谱、3 个声部 */
    if (want('K')) {
      const r = await EV(pg, xs => xs.map(x => { const s = importMusicXML(x).song; let f = null; try { f = PQ_KIND.facetsOf(s); } catch (_) {}
        return { k: NWB.stackOf(s), dt: PQ_KIND.docTypeOf(s), nm: PQ_KIND.nameOf(s), parts: f && f.parts, choir: PQ_KIND.isChoir(s) }; }), [FX('F07'), FX('F06'), FX('F01'), FX('F21')]);
      T(Array.isArray(r) && r[0].k === 'G' && r[0].dt === 'piano' && /钢琴独奏谱/.test(r[0].nm) && r[3].k === 'G' && r[3].dt === 'piano',
        'K1 F07 / F21 分层钢琴：谱类 G、docType piano、钢琴独奏谱（器乐层在分类上折叠）', J(r));
      T(Array.isArray(r) && r[1].choir && r[1].parts === 3 && /合唱/.test(r[1].nm), 'K2 F06 女高 / 女低同谱表＋男声：合唱谱、facets.parts＝3（声乐层照独立声部算）', J(r && r[1]));
      T(Array.isArray(r) && r[2].parts === 1, 'K3 F01 单件乐器带层：facets.parts＝1（不变成重奏）', J(r && r[2]));
    }
  } catch (e) { console.log('❌ 运行异常 ' + (e.stack || e)); total++; fails.push('异常'); }
  allErrs.push(...A.errs); await A.ctx.close();
  T(!allErrs.length, 'E 页面脚本错误 0', allErrs.slice(0, 5).join(' | '));
  await b.close();
  console.log('\n' + pass + '/' + total + ' 通过' + (fails.length ? '；失败：' + fails.join(' ') : ''));
  process.exit(fails.length ? 1 : 0);
})();
