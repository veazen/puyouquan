'use strict';
/* v70.5 同谱表双声部 a（读得进·听得到·导得出）B 组：互通与播放（规格 docs/spec-2026-11-v705.md §4–§7、§10.3「tv_v705layer」）。file:// 直载，真实浏览器。
   夹具：tests/fixtures/v705/F01…F27.musicxml（含 F01b–F01d；手写的第三方写法，标注见各文件 <software>，不依赖外网；§10.2）。
   N  N9 三个前置小改（§4.1，不建层）：① 主声部每谱表全曲固定（预扫，不再逐小节取第一个 voice；voice 过滤在倚音块之前）
      ② 跨谱表的音不占对面谱表（按声部的归属谱表归行）③ 只有休止的第二声部不算丢弃（只计有音高的音）；按谱表编号 / 不写 voice 的大谱表不并行；
      自家旧写法（1@1 / 2@2、弱起）与 c9882a4 导入逐字节相同
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
      irr: s.measures.map(m => m.irr || 0), skip: r.skip, lossy: r.lossy, warn: r.warn || '', txt: typeof skipText === 'function' ? skipText(r.skip) : '' }; };
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
        T(!r.err && r.rows[0][0] === '1^1/1' && r.rows[1][0].split(' ').every(c => /^0\//.test(c)) && r.vv.length === 1,
          'N2 ①H 主声部全曲固定：第 2 小节只有 voice 2 时不把它当主声部', J(r)); }
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
        T(!r.err && r.vv.length === 2 && r.rows[1][0] === '5^1/1' && r.rows[1][1] === '1^-1/2 2^-1/2',
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
  } catch (e) { console.log('❌ 运行异常 ' + (e.stack || e)); total++; fails.push('异常'); }
  allErrs.push(...A.errs); await A.ctx.close();
  T(!allErrs.length, 'E 页面脚本错误 0', allErrs.slice(0, 5).join(' | '));
  await b.close();
  console.log('\n' + pass + '/' + total + ' 通过' + (fails.length ? '；失败：' + fails.join(' ') : ''));
  process.exit(fails.length ? 1 : 0);
})();
