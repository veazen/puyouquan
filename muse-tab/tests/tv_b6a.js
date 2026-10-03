/* v65.6 B6a 性能（2026-10 评审团 §6.3 B6a ①②③⑤⑥：P1-37 / P3-39 / P3-40）
   T1 落盘防抖：mutate 后 persist.pending=true、350ms 内 LS_KEY 未写（旧值）、400ms 后写入；pagehide 立即 flush
   T2 LS_DOCS 只在窗口集合变化时重写：5 次 mutate 写 LS_DOCS 0 次（LS_KEY 1 次）；addDoc 后 1 次；切窗口后 1 次；启动时 LS_KEY 覆盖回 docs[cur]（模拟：LS_DOCS 存旧标题、LS_KEY 存新标题 → reload 后用新标题）
   T3 撤销栈字节上限：64 小节大谱连 pushUndo 300 次 → 栈总字节 ≤ UNDO_MAX_BYTES 且 ≥20 步；小谱仍留 200 步
   T4 键盘自动重复合并渲染：repeat:true 的连续 5 次方向键只渲染 1 次（下一帧），不重复时每次按键同步渲染
   T5 语法闸：async function 重名 / 跨段同名箭头常量 → 拦截；当前文件通过
   T6 更新日志瘦身：内联 <li> ≤ 40 条且末尾有 log-full.html 链接；site/log-full.html 收有历史版本（含 v37.1）且无重复版本号
   T7 编辑后立即关页，重开不丢：mutate 改标题后马上 reload → 标题仍在（pagehide flush）
   代理指标：RENDER_STAT.ms（64 小节歌谱单次渲染耗时，只打印不断言）与 layoutCalls
   突变实证：对 v65.6 之前的文件复跑，T1–T6 报红（T7 为护栏，旧文件同步落盘也绿）。 */
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs'); const cp = require('child_process'); const os = require('os');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');
const ROOT = process.env.MUSETAB_ROOT || path.resolve(__dirname, '../..');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto('file://' + FILE); await pg.waitForTimeout(1000);
  const prep = () => pg.evaluate(() => { guardReplace = (p) => p(); hideStartPad(); blurSel = true;
    window.big = (n) => { const s = createSong('vocal', { title: '大谱', key: 'C', beats: 4, unit: 4, nMea: n || 64, nVox: 1, lyr: 1 }); s.measures.forEach(m => { m.voxes[0] = [1, 2, 3, 5, 6, 5, 3, 2].map(d => ({ dur: 8, dotted: false, deg: d, acc: '', oct: 0, lyrics: ['啊'], tie: false })); }); return s; }; });
  await prep();
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = f => pg.evaluate(f).catch(e => ({ err: e.message }));

  /* T1 */
  let r = await EV(() => { loadSong(big(8)); persistNow(); const before = localStorage.getItem(LS_KEY);
    mutate(() => { song.title = '防抖一'; }); const pend = !!persist.pending; const during = localStorage.getItem(LS_KEY) === before;
    return { pend, during }; });
  await pg.waitForTimeout(450);
  const t1b = await EV(() => { const after = JSON.parse(localStorage.getItem(LS_KEY)).title; const pend2 = !!persist.pending;
    mutate(() => { song.title = '防抖二'; }); window.dispatchEvent(new Event('pagehide')); const flushed = JSON.parse(localStorage.getItem(LS_KEY)).title; return { after, pend2, flushed, pend3: !!persist.pending }; });
  T(!r.err && r.pend && r.during && t1b.after === '防抖一' && !t1b.pend2 && t1b.flushed === '防抖二' && !t1b.pend3, 'T1 落盘防抖 350ms + pagehide 立即 flush', JSON.stringify({ r, t1b }));

  /* T2 */
  r = await EV(() => { loadSong(big(8)); if (!docs.length) { docs.push({ song, sel: null }); curDocI = 0; } persistNow();
    const cnt = { docs: 0, key: 0 }; const si = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === LS_DOCS) cnt.docs++; if (k === LS_KEY) cnt.key++; return si.call(this, k, v); };
    try { for (let i = 0; i < 5; i++) mutate(() => { song.measures[0].voxes[0][0].deg = 1 + (i % 7); }); persistNow(); const a = { ...cnt };
      cnt.docs = 0; cnt.key = 0; const n0 = docs.length; addDoc(big(2)); persistNow(); const b2 = { ...cnt, n: docs.length - n0 };
      cnt.docs = 0; switchDocTo(0); persistNow(); const c = { ...cnt }; return { a, b: b2, c }; }
    finally { Storage.prototype.setItem = si; } });
  T(!r.err && r.a.docs === 0 && r.a.key === 1 && r.b.docs === 1 && r.b.n === 1 && r.c.docs === 1, 'T2 LS_DOCS 只在窗口集合变化时重写', JSON.stringify(r));
  /* T2b 启动覆盖：LS_DOCS 存旧标题、LS_KEY 存新标题 → reload 后用 LS_KEY 的 */
  await EV(() => { loadSong(big(2)); song.title = '旧标题'; localStorage.setItem(LS_DOCS, JSON.stringify({ cur: 0, docs: [song] })); const s2 = JSON.parse(JSON.stringify(song)); s2.title = '新标题'; localStorage.setItem(LS_KEY, JSON.stringify(s2)); if (persistTimer) clearTimeout(persistTimer); persistTimer = 0; persist.pending = false; });
  await pg.reload(); await pg.waitForTimeout(900); await prep();
  r = await EV(() => ({ title: song.title, n: docs.length }));
  T(!r.err && r.title === '新标题', 'T2b 启动时 LS_KEY 覆盖回 docs[cur]', JSON.stringify(r));

  /* T3 */
  r = await EV(() => { loadSong(big(160)); undoStack.length = 0; for (let i = 0; i < 300; i++) pushUndo(); let bytes = 0; undoStack.forEach(u => bytes += u.length); const nBig = undoStack.length;
    loadSong(big(2)); undoStack.length = 0; for (let i = 0; i < 300; i++) pushUndo(); return { nBig, bytes, cap: UNDO_MAX_BYTES, nSmall: undoStack.length, one: JSON.stringify(song).length }; });
  T(!r.err && r.bytes <= r.cap && r.nBig >= 20 && r.nBig < 200 && r.nSmall === 200, 'T3 撤销栈字节上限（大谱截断、小谱仍 200 步）', JSON.stringify(r));

  /* T4 */
  r = await EV(() => { loadSong(big(4)); render(); const n0 = RENDER_STAT.n;
    selRange = null; noteSel = []; cursor = { mi: 0, ci: 0, vi: 0 };   /* 光标落在第 1 列：数字键改音级走 mutate */
    const key = (rep) => window.dispatchEvent(new KeyboardEvent('keydown', { key: '5', bubbles: true, repeat: rep }));
    for (let i = 0; i < 5; i++) key(true); const nRep = RENDER_STAT.n - n0; window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
    return new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => { const nAfter = RENDER_STAT.n - n0; const n1 = RENDER_STAT.n; for (let i = 0; i < 3; i++) key(false); res({ nRep, nAfter, nPlain: RENDER_STAT.n - n1, ms: +RENDER_STAT.ms.toFixed(1) }); }))); });
  T(!r.err && r.nRep === 0 && r.nAfter === 1 && r.nPlain === 3, 'T4 键盘自动重复合并渲染（5 次连发只渲染 1 次；单次按键同步渲染）', JSON.stringify(r));

  /* T5 */
  { const src = fs.readFileSync(FILE, 'utf8'); const gate = path.join(ROOT, 'deploy/check-syntax.js');
    const run = (html) => { const tmp = path.join(os.tmpdir(), 'b6a-gate-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.html'); fs.writeFileSync(tmp, html); let code = 0; try { cp.execFileSync('node', [gate, tmp], { stdio: 'pipe' }); } catch (e) { code = e.status || 1; } fs.unlinkSync(tmp); return code; };
    const ok = run(src) === 0;
    const dupAsync = run(src.replace(/function keyRefOf\(/, 'async function keyRefOf(x){ return x; }\nfunction keyRefOf(')) !== 0;
    const i2 = src.lastIndexOf('<script>'); const dupArrow = run(src.slice(0, i2) + '<script>\nconst tempoUnitOf = (s)=>s;\n</script>\n' + src.slice(i2)) !== 0;
    T(ok && dupAsync && dupArrow, 'T5 语法闸盖住 async function 与跨段箭头常量重名', JSON.stringify({ ok, dupAsync, dupArrow })); }

  /* T6 */
  { const src = fs.readFileSync(FILE, 'utf8'); const inline = (src.match(/^ {4}<li><span class="v">v[\d.]+<\/span>/gm) || []).length;
    const link = /<li><span class="v">更早<\/span><div>[^<]*<a href="https:\/\/www\.puyouquan\.com\/log-full\.html"/.test(src);
    const fullP = path.join(path.dirname(FILE), 'site', 'log-full.html'); const full = fs.existsSync(fullP) ? fs.readFileSync(fullP, 'utf8') : '';
    const vers = [...full.matchAll(/<li><span class="v">(v[\d.]+)<\/span>/g)].map(m => m[1]);
    T(inline <= 40 && inline >= 20 && link && vers.includes('v37.1') && new Set(vers).size === vers.length && vers.length >= 300, 'T6 更新日志瘦身：内联 ≤40 条 + 完整日志页', JSON.stringify({ inline, link, nFull: vers.length })); }

  /* T7 */
  await EV(() => { loadSong(big(3)); mutate(() => { song.title = '关页前改的标题'; }); });
  await pg.reload(); await pg.waitForTimeout(900); await prep();
  r = await EV(() => ({ title: song.title }));
  T(!r.err && r.title === '关页前改的标题', 'T7 编辑后立即关页，重开不丢（护栏）', JSON.stringify(r));

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
