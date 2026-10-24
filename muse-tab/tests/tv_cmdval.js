'use strict';
/* v69.1 C 轨（方案 ⑧ 命令面板值语法；规格 v69.1 §5 C3、§6.4 tv_cmdval）：命令面板直接输入值 → 最上面一条值行（名称即回显），Enter 执行；只新形态。
   V0  ?next=0：输入「1=D」没有值行（v69.0 原样）
   V1  「1=D」→ 首行 .flw-cmdv「换到 1=D」先断言可见；Enter → song.key==='D'，与页头 ♭♯ 步进 stepKey(+2) 结果逐字节同（同一 ekMove）；一步撤销回原样；同调再输 → 行灰显「已是 1=D」
   V2  「1=bE」「1=E♭」「1=#F」解析为 ♭E / ♭E / ♯F；「1=H」灰显「认不出这个调」
   V3  「3/4」→ beats 3 unit 4（一步撤销）；「13/4」灰显「拍数 1–12」
   V4  「=90」「♩=90」→ tempo 90；「=300」→ 240（tempoInputVal 口径）
   V5  「capo 2」「变调夹 2」→ song.capo 2，与页头变调夹菜单点「2 品」结果逐字节同；没有吉他轨的谱灰显「这份谱没有吉他轨」
   V6  「>Am7」光标在简谱音上 → 与 chordWriteAt(chordSlot(),'Am7') 结果逐字节同；六线谱列上同引擎（指法按 Am7 重排，与直调同）；光标不在音位灰显「先选一个音」；
       「>Hzz」第一次 Enter 不写、行内报错、面板不关，第二次 Enter 照写（ckNameGate 口径）
   V7  排版模式里输入「3/4」→ 先回书写再执行
   V8  埋点只记种类：cmd:val:key / cmd:val:chord…（不带值，格式 ^[a-z][a-z0-9]*(:[a-z0-9:-]+)*$）
   V9  值行之下关键词结果照常（「1=D」下面列出换调类命令）
   V10 TCH-6：搜「导入MIDI」首条 r1:import（从已有音乐…）；新形态「编辑模式」首条 st:beat、st:emfree / st:emsmart / sm:midi / out:pubpage 不出现
   E   页面脚本错误 0；本机键集合差为空（musetab-cmd-recent 与谱存档本来就写）
   突变实证（报告里列）：① valOf 的调名正则去掉 ♭ → V2 红；② runVal 不先回书写 → V7 红；③ chord 分支直接 chordWriteAt 不过 ckNameGate → V6「Hzz」红。
   env：MUSETAB_URL · ONLY=V1,V6 */
const { chromium } = require('playwright');
const path = require('path');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const J = x => JSON.stringify(x), W = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, total = 0; const lines = [], pageErrs = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; lines.push((ok ? '✅ ' : '❌ ') + id + ' ' + name + (!ok && d != null ? '\n     ' + String(d).slice(0, 1600) : '')); };

function INIT() {
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; } return true; };
  window.__one = s => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; try { hideStartPad(); } catch (_) {} try { FLOW.menu.close(); } catch (_) {} try { closeModal(); } catch (_) {}
    const t = document.querySelector('#flw-tour'); if (t) t.remove(); addDoc(s, () => {}); while (docs.length > 1) closeDocAt(0); render(); return s; };
  window.__V = (deg, dur) => ({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false });
  window.__song = (k, o) => { o = o || {}; const s = NWB.build(k, Object.assign({ title: '值' + k, nMea: 4 }, o));
    (s.measures || []).forEach((m, mi) => { if ((s.voxVoices || []).length) m.voxes[0] = Array.from({ length: s.beats }, (_, i) => __V(((mi * 3 + i) % 7) + 1, s.unit)); }); return __one(s); };
  window.__snap = () => JSON.stringify({ key: song.key, capo: song.capo || 0, beats: song.beats, unit: song.unit, tempo: song.tempo, mea: song.measures, cc: song.customChords || null });
  window.__tr = []; window.__cmd = q => { try { FLOW.menu.close(); } catch (_) {} FLOW.cmd.open(''); const i = document.getElementById('flw-cmdq'); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })); };
  window.__row0 = () => { const r = document.querySelector('#flw-cmdl .flw-cmdr'); return r ? { val: r.classList.contains('flw-cmdv'), t: (r.querySelector('.flw-cmdt') || {}).textContent || '', why: (r.querySelector('.flw-cmdw') || {}).textContent || '',
    dis: r.getAttribute('aria-disabled') === 'true', v: r.dataset.v, fa: r.dataset.fa, vis: __vis(r) } : null; };
  window.__rows = () => [...document.querySelectorAll('#flw-cmdl .flw-cmdr')].map(r => r.dataset.v);
}
(async () => {
  const t0 = Date.now();
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const open = async (u, tag) => { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await ctx.addInitScript(INIT);
    const pg = await ctx.newPage(); pg.on('pageerror', e => pageErrs.push(tag + ' ' + e.message)); await pg.goto(u); await W(1800); return { ctx, pg }; };
  const enter = async pg => { await pg.focus('#flw-cmdq'); await pg.keyboard.press('Enter'); await W(500); };
  try {
    if (want('V0')) {
      const { ctx, pg } = await open(withQ(URL0, 'next=0'), 'V0');
      await pg.evaluate(() => { __song('J'); __cmd('1=D'); }); await W(200);
      const r = await pg.evaluate(() => ({ v: !!document.querySelector('#flw-cmdl .flw-cmdv'), n: document.querySelectorAll('#flw-cmdl .flw-cmdr').length }));
      T('V0', !r.v, '?next=0：输入「1=D」没有值行', J(r)); await ctx.close();
    }
    const { ctx, pg } = await open(URL0, 'main');
    const k0 = await pg.evaluate(() => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort());
    await pg.evaluate(() => { const o = FLOW.track; FLOW.track = (id, x) => { window.__tr.push(id); return o(id, x); }; });
    if (want('V1') || want('V9')) {
      await pg.evaluate(() => { __song('J'); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); }); await W(200);
      const s0 = await pg.evaluate(() => __snap());
      await pg.evaluate(() => __cmd('1=D')); await W(150);
      const r0 = await pg.evaluate(() => ({ r: __row0(), rows: __rows() }));
      await enter(pg);
      const a = await pg.evaluate(() => ({ key: song.key, s: __snap(), open: FLOW.cmd.isOpen() }));
      await pg.evaluate(() => undo()); await W(200);
      const u = await pg.evaluate(() => __snap());
      await pg.evaluate(() => { stepKey(2); }); await W(200);
      const bS = await pg.evaluate(() => __snap());
      await pg.evaluate(() => __cmd('1=D')); await W(150);
      const same = await pg.evaluate(() => __row0());
      await pg.evaluate(() => { FLOW.menu.close(); undo(); }); await W(150);
      if (want('V1')) T('V1', r0.r && r0.r.val && r0.r.vis && r0.r.t === '换到 1=D' && r0.r.fa === 'cmd:val' && a.key === 'D' && !a.open && a.s === bS && u === s0 && same.dis && same.why === '已是 1=D',
        '「1=D」首行值行「换到 1=D」可见；Enter → 1=D，与 stepKey(+2) 逐字节同、一步撤销回原样；同调灰显「已是 1=D」', J({ r0: r0.r, a: a.key, eq: a.s === bS, undo: u === s0, same }));
      if (want('V9')) T('V9', r0.rows.length >= 2 && r0.rows.slice(1).some(v => /keyup|keydn|keypop/.test(v)), '值行之下关键词结果照常（换调类命令）', J(r0.rows));
    }
    if (want('V2')) {
      const out = [];
      for (const q of ['1=bE', '1=E♭', '1=#F', '1=H', '１＝Ｄ']) { await pg.evaluate(q => __cmd(q), q); await W(100); out.push(await pg.evaluate(() => __row0())); }
      await pg.evaluate(() => FLOW.menu.close());
      T('V2', out[0].t === '换到 1=♭E' && out[1].t === '换到 1=♭E' && out[2].t === '换到 1=♯F' && out[3].dis && out[3].why === '认不出这个调' && out[4].t === '换到 1=D', '「1=bE」「1=E♭」→ ♭E、「1=#F」→ ♯F、全角「１＝Ｄ」→ D；「1=H」灰显「认不出这个调」', J(out));
    }
    if (want('V3')) {
      await pg.evaluate(() => __song('J')); const s0 = await pg.evaluate(() => __snap());
      await pg.evaluate(() => __cmd('3/4')); await W(100); const r = await pg.evaluate(() => __row0()); await enter(pg);
      const a = await pg.evaluate(() => [song.beats, song.unit]); await pg.evaluate(() => undo()); await W(150); const u = await pg.evaluate(() => __snap());
      await pg.evaluate(() => __cmd('13/4')); await W(100); const r2 = await pg.evaluate(() => __row0()); await pg.evaluate(() => FLOW.menu.close());
      T('V3', r.t === '拍号 3/4' && !r.dis && J(a) === '[3,4]' && u === s0 && r2.dis && r2.why === '拍数 1–12', '「3/4」→ 3/4、一步撤销；「13/4」灰显「拍数 1–12」', J({ r, a, undo: u === s0, r2 }));
    }
    if (want('V4')) {
      const out = [];
      for (const q of ['=90', '♩=96', '=300']) { await pg.evaluate(q => __cmd(q), q); await W(100); const r = await pg.evaluate(() => __row0()); await enter(pg); out.push([r.t, await pg.evaluate(() => song.tempo)]); }
      T('V4', out[0][1] === 90 && out[1][1] === 96 && out[2][1] === 240 && out[2][0] === '速度 ♩=240', '「=90」→ 90、「♩=96」→ 96、「=300」→ 240（tempoInputVal 口径）', J(out));
    }
    if (want('V5')) {
      await pg.evaluate(() => __song('JT')); const s0 = await pg.evaluate(() => __snap());
      await pg.evaluate(() => __cmd('capo 2')); await W(100); const r = await pg.evaluate(() => __row0()); await enter(pg);
      const a = await pg.evaluate(() => __snap()); await pg.evaluate(() => undo()); await W(150);
      const u = await pg.evaluate(() => __snap());
      await pg.evaluate(() => showHeadMenu('capo', 300, 200)); await W(200);
      await pg.click('#popmenu [data-c="2"], .popmenu [data-c="2"], [data-c="2"]'); await W(200);
      const bS = await pg.evaluate(() => __snap()); await pg.evaluate(() => undo()); await W(100);
      await pg.evaluate(() => __cmd('变调夹 2')); await W(100); const r2 = await pg.evaluate(() => __row0()); await pg.evaluate(() => FLOW.menu.close());
      await pg.evaluate(() => __song('J')); await pg.evaluate(() => __cmd('capo 2')); await W(100); const r3 = await pg.evaluate(() => __row0()); await pg.evaluate(() => FLOW.menu.close());
      T('V5', r.t === '夹 2 品' && a === bS && u === s0 && JSON.parse(a).capo === 2 && r2.t === '夹 2 品' && !r2.dis && r3.dis && r3.why === '这份谱没有吉他轨', '「capo 2」「变调夹 2」→ 夹 2 品，与页头变调夹菜单点 2 品逐字节同；没有吉他轨灰显', J({ r, eq: a === bS, r2, r3 }));
    }
    if (want('V6')) {
      await pg.evaluate(() => { __song('J'); sel = { mi: 1, row: 'vox', vi: 0, ci: 1, si: 1 }; render(); }); await W(150);
      await pg.evaluate(() => __cmd('>Am7')); await W(100); const r = await pg.evaluate(() => __row0()); await enter(pg);
      const a = await pg.evaluate(() => __snap()); await pg.evaluate(() => undo()); await W(100);
      await pg.evaluate(() => { chordWriteAt(chordSlot(), 'Am7'); }); await W(100); const bS = await pg.evaluate(() => __snap()); await pg.evaluate(() => undo()); await W(100);
      /* 六线谱列 */
      await pg.evaluate(() => { __song('JT'); const vi = 0; song.measures.forEach(m => { m.tabs[vi] = [{ dur: 4, dotted: false, notes: [{ s: 5, f: 3 }] }, { dur: 4, dotted: false, notes: [{ s: 4, f: 2 }] }, { dur: 4, dotted: false, notes: [{ s: 3, f: 0 }] }, { dur: 4, dotted: false, notes: [{ s: 2, f: 1 }] }]; });
        sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 4 }; render(); }); await W(150);
      await pg.evaluate(() => __cmd('>Am7')); await W(100); const rt = await pg.evaluate(() => __row0()); await enter(pg);
      const at = await pg.evaluate(() => __snap()); await pg.evaluate(() => undo()); await W(100);
      await pg.evaluate(() => { chordWriteAt(chordSlot(), 'Am7'); }); await W(100); const bt = await pg.evaluate(() => __snap()); await pg.evaluate(() => undo()); await W(100);
      /* 不在音位 */
      await pg.evaluate(() => { sel = { mi: 0, row: 'vox', vi: 0, ci: 99, si: 1 }; __cmd('>C'); }); await W(100); const rn = await pg.evaluate(() => __row0()); await pg.evaluate(() => FLOW.menu.close());
      /* 认不出：第一次不写、行内报错、面板不关；第二次照写 */
      await pg.evaluate(() => { __song('J'); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); __cmd('>Hzz'); }); await W(100);
      const s0 = await pg.evaluate(() => __snap()); await enter(pg);
      const h1 = await pg.evaluate(() => ({ s: __snap(), open: FLOW.cmd.isOpen(), r: __row0() }));
      await enter(pg);
      const h2 = await pg.evaluate(() => ({ open: FLOW.cmd.isOpen(), ch: (song.measures[0].voxes[0][0] || {}).chord }));
      T('V6', r.t === '写 Am7' && a === bS && a.includes('Am7') && rt.t === '写 Am7' && at === bt && at.includes('Am7') && rn.dis && rn.why === '先选一个音' && h1.s === s0 && h1.open && /认不出/.test(h1.r.why || h1.r.t) && !h2.open && h2.ch === 'Hzz',
        '「>Am7」简谱 / 六线谱位置与 chordWriteAt(chordSlot()) 逐字节同（完整和弦引擎）；不在音位灰显；「>Hzz」先报错不写、再回车照写', J({ r, eqV: a === bS, rt, eqT: at === bt, rn, h1: { same: h1.s === s0, open: h1.open, r: h1.r }, h2 }));
    }
    if (want('V7')) {
      await pg.evaluate(() => { __song('J'); setMode('engrave'); }); await W(600);
      await pg.evaluate(() => __cmd('3/4')); await W(100); await enter(pg); await W(400);
      const r = await pg.evaluate(() => ({ mode: FLOW.mode.cur, b: song.beats }));
      T('V7', r.mode === 'write' && r.b === 3, '排版模式里输入「3/4」→ 先回书写再执行', J(r));
    }
    if (want('V8')) {
      const tr = await pg.evaluate(() => window.__tr.filter(x => /^cmd:val/.test(x)));
      const RE = /^[a-z][a-z0-9]*(:[a-z0-9:-]+)*$/;
      T('V8', tr.length >= 3 && tr.every(x => RE.test(x) && /^cmd:val:(key|meter|tempo|capo|chord)$/.test(x)), '埋点只记种类（cmd:val:<种类>，不带值）', J(tr));
    }
    if (want('V10')) {
      await pg.evaluate(() => __song('J'));
      const one = async q => { await pg.evaluate(q => __cmd(q), q); await W(120); const r = await pg.evaluate(() => __rows()); await pg.evaluate(() => FLOW.menu.close()); return r; };
      const a = await one('导入MIDI'), m = await one('编辑模式'), all = await pg.evaluate(() => FLOW.cmd.list().filter(c => !(c.hide && c.hide())).map(c => c.id));
      T('V10', a[0] === 'r1:import' && m[0] === 'st:beat' && !all.includes('st:emfree') && !all.includes('st:emsmart') && !all.includes('sm:midi') && !all.includes('out:pubpage'),
        'TCH-6：「导入MIDI」首条 r1:import；「编辑模式」首条 st:beat；st:emfree / st:emsmart / sm:midi / out:pubpage 新形态不出现', J({ a: a.slice(0, 3), m: m.slice(0, 3) }));
    }
    const k1 = await pg.evaluate(() => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort());
    const extra = k1.filter(k => !k0.includes(k) && !/^musetab-(cmd-recent|docs|doc|song|tabs|win|autosave|last|cur|library)/.test(k));
    T('K', !extra.length, '本机键集合差为空（musetab-cmd-recent / 谱存档除外）', J({ extra }));
    await ctx.close();
  } catch (e) { T('X', false, '执行异常', e && e.stack || e); }
  await b.close();
  T('E', !pageErrs.length, '页面脚本错误 0', J(pageErrs.slice(0, 5)));
  console.log(lines.join('\n'));
  console.log('（单跑 ' + Math.round((Date.now() - t0) / 1000) + ' 秒）');
  console.log(`PASS ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})();
