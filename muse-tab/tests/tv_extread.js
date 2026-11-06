'use strict';
/* v70.4 E 独立读取器门禁（基石方案 docs/plan-2026-11-foundation.md §3.2 E / §1.1「互通」）：谱友圈导出的 MusicXML 交给 music21 读，
   不靠自家导入器自证——逐谱表、逐小节核三件事：
     X1 时值＝拍号：music21 读出的每小节拍号长（barDuration）＝谱面数据的拍号；每个声部的时值和＝拍号（弱起首小节 / 不完整小节 irr＝谱面这一行实际的时值；散拍草稿 freeMeter 不核）。
        已知读法差异单列不记红：不完整小节里只有一个整小节休止（<rest measure="yes"/> 不写 type、duration 是实际时值，同 MuseScore 写法）时 music21 按拍号撑满——
        打印处数；要让 music21 也读对，得给这类休止写 <type>（改曲库导出字节，v700data_base 要前移，另议）
     X2 声部数：music21 读出的谱表数＝谱面的旋律行＋六线谱行数；每小节每谱表的声部数＝1（同谱表第二声部 v70.5 起再改期望）
     X3 音数：每小节每谱表有音高的非倚音音头数（和弦逐音计）＝谱面数据（简谱 / 五线谱列 deg≠0 计 1＋附加音，六线谱列计 notes 数）
   样本：内置预设 PRESETS（16 首）· 曲库种子 api/seed-library.json 全部（OpenScore 10 首＋示例 / 公版小品）· 两首震音曲《阿特拉斯》《侏儒》从源谱
         deploy/library/openscore/ 现导入再导出（震音 trem2 落地后走的就是它）。每份样本一条断言（X1–X3 合在一起，失败时列出前 6 处）。
   XN 门禁自检（反例）：同一份样本的导出改坏三处——一个音 duration ×2 / 删掉一个有音高的音 / 同谱表塞进第二声部，比对必须各自报出 X1 / X3 / X2。
   修前：本套件量的是导出质量，导出在 16de944 上与本版相同（v70.4 只多了 pyq-src），所以修前同样全绿；门禁有效性靠 XN 反例证明
   依赖：python3 + music21（CI：pip install music21；本机：PYTHONPATH 指到装好的目录）。读取脚本 tests/tv_extread.py（只读、输出 JSON）。
   本机没有 music21：打印「跳过」与安装提示后退出 0；EXTREAD_REQUIRE=1（CI 装了 music21 时设）则记红。
   env：MUSETAB_URL 被测页 · EXTREAD_PY python 可执行文件（缺省 python3）· EXTREAD_REQUIRE=1 · ONLY=preset,lib,trem 只跑部分样本。单跑约 60–90 秒（music21 解析为主） */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const ROOT = path.resolve(__dirname, '..', '..');
const PY = process.env.EXTREAD_PY || 'python3';
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (!ok && d != null ? '：' + String(d).slice(0, 1600) : '')); };

/* ---------- 0 有没有 music21 ---------- */
const probe = spawnSync(PY, ['-c', 'import music21; print(music21.__version__)'], { encoding: 'utf8', env: process.env });
if (probe.status !== 0) {
  const msg = '本机没有 music21（' + PY + '：' + String(probe.stderr || probe.error || '').trim().split('\n').pop().slice(0, 120) + '）——安装：pip install music21（或 PYTHONPATH 指到装好的目录）';
  if (process.env.EXTREAD_REQUIRE === '1') { T(false, 'X0 独立读取器 music21 可用', msg); console.log('\n' + pass + '/' + total + ' 通过'); process.exit(1); }
  console.log('⏭ 跳过 tv_extread：' + msg); console.log('SKIP 0/0'); process.exit(0);
}
console.log('music21 ' + probe.stdout.trim() + '（' + PY + '）');

/* ---------- 样本 ---------- */
const SEEDS = JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'seed-library.json'), 'utf8'));
const MAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'deploy', 'library', 'manifest.json'), 'utf8'));
const TREM = MAN.items.filter(it => /阿特拉斯|侏儒/.test(it.title)).map(it => ({ title: it.title, x: fs.readFileSync(path.join(ROOT, 'deploy', 'library', it.file), 'utf8') }));

/* 页内：导出 MusicXML＋按谱表、按小节的期望（谱面数据） */
function pageExport(arg) {
  const out = [];
  const rows = s => [...(s.voxVoices || []).map((_, vi) => ({ k: 'vox', vi })), ...(s.tabVoices || []).map((_, vi) => ({ k: 'tab', vi }))];
  const one = (name, s0) => {
    try {
      const s = migrate(JSON.parse(JSON.stringify(s0)));
      const o0 = song; song = s; let x;
      try { x = exportMusicXML(s); } finally { song = o0; }
      if (!x) { out.push({ name, err: '导出为空' }); return; }
      const R = rows(s).map(r => ({ k: r.k, vi: r.vi, nm: (r.k === 'vox' ? s.voxVoices : s.tabVoices)[r.vi], m: (s.measures || []).map((m, mi) => {
        const cols = ((r.k === 'vox' ? m.voxes : m.tabs) || [])[r.vi] || [];
        const q = Math.round(cols.reduce((a, c) => a + beatsOf(c, 4), 0) * 1e4) / 1e4;
        const cap = Math.round(((m.beats || s.beats) * 4 / (m.unit || s.unit)) * 1e4) / 1e4;
        const n = cols.reduce((a, c) => a + (r.k === 'vox' ? (c.deg ? 1 + (c.adds || []).filter(z => z && z.deg).length : 0) : (c.notes || []).length), 0);
        return { q, cap, n, short: !!((mi === 0 && s.pickup) || m.irr === 1) }; }) }));
      out.push({ name, x, rows: R, free: !!s.freeMeter });
    } catch (e) { out.push({ name, err: String(e && e.message || e).slice(0, 200) }); }
  };
  if (arg.preset) PRESETS.forEach((p, i) => one('预设 ' + (i + 1) + ' ' + p.name, p.make()));
  (arg.seeds || []).forEach(it => one('曲库 ' + it.title, it.data));
  (arg.trem || []).forEach(it => { const r = importMusicXML(it.x); if (!r || r.error) out.push({ name: '震音曲 ' + it.title, err: '导入失败：' + (r && r.error) }); else one('震音曲 ' + it.title + '（源谱现导入）', r.song); });
  return out;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errs = [];
  let S = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss().catch(() => {}));
    await pg.goto(URL0 + (URL0.includes('?') ? '&' : '?') + 'shell=classic');
    await pg.waitForFunction(() => typeof exportMusicXML === 'function' && typeof PRESETS === 'object');
    S = await pg.evaluate(pageExport, { preset: want('preset'), seeds: want('lib') ? SEEDS : [], trem: want('trem') ? TREM : [] });
    await ctx.close();
  } catch (e) { T(false, 'X0 页内导出', e.stack || e); }
  await b.close();
  T(!errs.length, 'E 页面脚本错误 0', errs.slice(0, 3).join(' | '));

  /* ---------- 反例（门禁自检）：同一份样本的导出改坏三处，比对必须各自报出来——X1 改一个音的 duration ×2、X3 删掉一个有音高的音、X2 塞进第二声部 ---------- */
  const base = S.find(s => s.x && /欢乐颂（钢琴独奏）/.test(s.name)) || S.find(s => s.x);
  const NEG = [];
  if (base) {
    const nt = base.x.match(/<note>(?:(?!<\/note>)[\s\S])*?<pitch>(?:(?!<\/note>)[\s\S])*?<\/note>/);
    if (nt) {
      NEG.push({ k: 'X1', why: '一个音的 duration ×2', x: base.x.replace(nt[0], nt[0].replace(/<duration>(\d+)<\/duration>/, (m, d) => '<duration>' + (2 * d) + '</duration>')) });
      NEG.push({ k: 'X3', why: '删掉一个有音高的音', x: base.x.replace(nt[0], '') });
      NEG.push({ k: 'X2', why: '同谱表塞进第二声部', x: base.x.replace(nt[0], nt[0] + '<backup><duration>1</duration></backup><note><rest/><duration>1</duration><voice>9</voice></note>') });
    }
  }
  /* ---------- music21 读 ---------- */
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pyq-extread-'));
  const files = S.filter(s => s.x).map((s, i) => { const f = path.join(dir, 'x' + String(i).padStart(3, '0') + '.musicxml'); fs.writeFileSync(f, s.x); s.file = f; return f; });
  NEG.forEach((n, i) => { n.file = path.join(dir, 'neg' + i + '.musicxml'); fs.writeFileSync(n.file, n.x); files.push(n.file); });
  const t0 = Date.now();
  const pr = spawnSync(PY, [path.join(__dirname, 'tv_extread.py'), ...files], { encoding: 'utf8', env: process.env, maxBuffer: 256 * 1024 * 1024, timeout: 900000 });
  let RD = {};
  try { RD = JSON.parse(pr.stdout || '{}'); } catch (e) { T(false, 'X0 music21 读取脚本输出 JSON', (pr.stderr || '').slice(-800)); }
  console.log('music21 读 ' + files.length + ' 份，' + Math.round((Date.now() - t0) / 1000) + ' 秒');

  /* ---------- 逐份比对 ---------- */
  const close = (a, b2) => a != null && b2 != null && Math.abs(a - b2) < 1e-3;
  let nMea = 0, nNotes = 0; const known = [];
  function cmp(s, rd, tally) {
    const bad = [], kn = [];
    if (rd.parts.length !== s.rows.length) bad.push('X2 谱表数 music21 ' + rd.parts.length + ' ≠ 谱面 ' + s.rows.length + '（' + rd.parts.map(p => p.name).join(' / ') + '）');
    s.rows.forEach((r, ri) => { const P = rd.parts[ri]; if (!P) return;
      if (P.measures.length !== r.m.length) bad.push('第 ' + (ri + 1) + ' 行「' + r.nm + '」小节数 music21 ' + P.measures.length + ' ≠ ' + r.m.length);
      r.m.forEach((e, mi) => { const M = P.measures[mi]; if (!M) return; if (tally) { nMea++; nNotes += e.n; }
        const at = '第 ' + (ri + 1) + ' 行「' + r.nm + '」第 ' + (mi + 1) + ' 小节';
        if (!close(M.bar, e.cap)) bad.push('X1 ' + at + ' 拍号长 ' + M.bar + ' ≠ ' + e.cap);
        const wantQ = e.short ? e.q : e.cap;
        M.voices.forEach((v, k) => { if (s.free || close(v, wantQ)) return;
          /* 已知读法差异（不算错）：不完整小节（irr / 弱起）里的整小节休止 <rest measure="yes"/>（不写 type，duration＝这一小节实际时值，与 MuseScore 导出同写法）——
             music21 一律按拍号撑满（xmlToM21 fullMeasureRest）。只放行「这一声部只有一个整小节休止、music21 读成整拍号长」这一种 */
          if (e.short && (M.fm || [])[k] && close(v, e.cap)) { kn.push(s.name + ' ' + at); return; }
          bad.push('X1 ' + at + ' 时值 ' + M.voices.join('+') + ' ≠ ' + wantQ); });
        if (M.nv !== 1) bad.push('X2 ' + at + ' 声部数 ' + M.nv);
        if (M.notes !== e.n) bad.push('X3 ' + at + ' 音数 ' + M.notes + ' ≠ ' + e.n);
      }); });
    return { bad, kn };
  }
  S.forEach(s => {
    if (s.err) { T(false, 'X ' + s.name, s.err); return; }
    const rd = RD[s.file]; if (!rd || rd.err) { T(false, 'X ' + s.name + ' music21 读取', rd ? rd.err : '没有输出'); return; }
    const { bad, kn } = cmp(s, rd, true); known.push(...kn);
    T(!bad.length, 'X ' + s.name + '：' + s.rows.length + ' 谱表 · ' + (s.rows[0] ? s.rows[0].m.length : 0) + ' 小节，时值＝拍号、声部数、音数与谱面一致', bad.length + ' 处：' + bad.slice(0, 6).join('；'));
  });
  console.log('合计核对 ' + nMea + ' 个谱表小节、' + nNotes + ' 个音头' + (known.length ? '；已知读法差异（不完整小节的整小节休止被 music21 撑满拍号）' + known.length + ' 处：' + known.slice(0, 4).join('；') + (known.length > 4 ? ' 等' : '') : ''));
  { const got = NEG.map(n => { const rd = RD[n.file]; const r = rd && !rd.err ? cmp(base, rd, false).bad : ['读取失败']; return { k: n.k, why: n.why, hit: r.some(x => x.indexOf(n.k + ' ') === 0), first: r[0] || '' }; });
    T(NEG.length === 3 && got.every(g => g.hit), 'XN 门禁自检：' + (base ? base.name : '（无样本）') + ' 的导出改坏三处（一个音 duration ×2 / 删掉一个音 / 塞进第二声部），比对各自报出 X1 / X3 / X2', JSON.stringify(got)); }
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
  console.log('\n' + pass + '/' + total + ' 通过' + (fails.length ? '；失败：' + fails.join(' ') : ''));
  process.exit(fails.length ? 1 : 0);
})();
