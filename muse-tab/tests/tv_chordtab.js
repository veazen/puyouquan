'use strict';
/* v68.9 B 轨：六线谱 / 尤克里里指法编辑器（GP 式）强化——多把位、斜杠和弦把位、试听、连续标注、CK 面板头、小屏底栏、新外壳文案。
   file:// 直载真实浏览器（视口 1440×900；T8 用 1366×768 / 1280×720），默认新外壳，标「旧」的项加 ?shell=classic。
   T1  入口：新外壳六线谱行从悬浮条 / Ctrl+K / 文字页 / 命令面板 / 谱面和弦图打开的都是 .modal[data-ce="tab"]，#ck-in 有焦点；尤克里里卡片 shape 长 4
   T2  多把位：C G Am F Bm 卡片 ≥6、pos 不递减、每张图 6 条竖线、pos>1 标签含「品」、新外壳与当前指法相同的卡 .on 恰 1 张
   T3  斜杠卡（R5）：Am7/G、C/D、Dm/C 所有卡最低音＝低音、含 302010 / xx0010 / x30231、首张「常用」；跨度 ≤4；尤克里里 C/G 不过滤 ≥3 张；旧外壳同样生效
   T4  默认指法（R6）：chordShape 库外斜杠取原位库图＋低音；库内斜杠 7 个不变；40 个非斜杠常用和弦与基线逐个相等；customChords 仍优先
   T5  试听：点卡 / 悬停 300ms / 长按 450ms 各响 1 次且不进撤销；♪ 关后不响（musetab-chordhear='0'）；▶ 照旧
   T6  写入与 remap：回车没动指法＝与旧快速框同口径（remapCols 现算、customChords 不变、斜杠名不进 customChords）；选高把位卡再「应用」进 customChords 并按卡 remap；撤销逐步
   T7  GP 连续标注：C␣G␣Am⇥F↵ 落 col0 / col2 / col4 / 下一小节 col0，撤销 +4；每跳 #ck-in 预填本处（不继承）、ceState 换列；弹窗位置不动
   T8  小屏底栏（R4，两外壳）：1366×768、1280×720 下 #ce-ok 在可视区内且点得中，.ce-foot 吸底
   T9  旧外壳 GP 零差异：C、Am7 的 DOM 签名与基线相同，只多 .ce-foot 包裹层
   T10 GP 里的 CK 头：调内芯片装入不写；有 #ck-sug / #ck-diag（曲首写进 diagPos）；⇄ 开同拍简谱构建器；键入防抖 250ms 装入、焦点与插入点不丢
   T11 新外壳文案：无「按住标题可拖动」与两句提示、#ce-ok「应用」、按钮可见字 ≤4、title ≤12；旧外壳逐字保留
   T12 数据红线：song 字段零新增、JSON 往返不变；新本机键只有 musetab-chordhear
   T14 新外壳 1440 GP 外框不压锚点列（几何断言，最左 / 最右列头）、浅遮罩
   T13 GP 提交边界：认不出就地报错不写不关；点框外未提交提示「和弦未写入」带「写入」；「应用」先装入刚键入的名字；Esc 不提交
   基线（修前红 / 零差异对拍）：git show a93d0be:muse-tab/index.html 写到 os.tmpdir()；取不到时相关子项标 ℹ️ 不计数。
   依赖 A 轨共享接口（A0：ckHeadHTML / ckWire / chordWriteAt / chordHear 等）与入口分发（A1：chordOpen）的子项，接口缺席时标 ℹ️ 不计数（单独跑 B 轨分支时）；
   集成后全部计数。env：MUSETAB_URL 被测页 · MUSETAB_REF 基线页 · ONLY=T2,T3 只跑部分。 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cp = require('child_process');
const REF_COMMIT = 'a93d0be';
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
let pass = 0, total = 0, skipped = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (d ? '：' + d : '')); };
const INFO = (name, d) => { skipped++; console.log('ℹ️ ' + name + (d ? '：' + d : '')); };
const J = x => JSON.stringify(x);

const REF_URL = (() => {
  if (process.env.MUSETAB_REF === 'none') return null;
  if (process.env.MUSETAB_REF) return toUrl(process.env.MUSETAB_REF);
  try {
    const src = cp.execFileSync('git', ['-C', __dirname, 'show', REF_COMMIT + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
    const f = path.join(os.tmpdir(), 'tv_chordtab_ref_' + REF_COMMIT + '.html'); fs.writeFileSync(f, src); return 'file://' + f;
  } catch (_) { return null; }
})();

/* ---------- 页内工具 ---------- */
const HELP = () => {
  window.guardReplace = p => p();
  window.__TC = o => Object.assign({ dur: 8, dotted: false, chord: '', notes: [], strum: '', tech: '' }, o || {});
  /* 吉他弹唱谱（六线谱 + 旋律简谱）：每小节 8 个八分列；m0 = C 的分解（5弦3品 · 4弦2品 · 3弦0 · 2弦1品 …） */
  window.__mkG = (o) => { o = o || {};
    const s = createSong(o.inst === 'uku' ? 'uku' : 'guitar', { title: '和弦', key: o.key || 'C', beats: 4, unit: 4, nMea: o.nMea || 3, nTab: 1, nVox: o.nVox == null ? 1 : o.nVox, lyr: 0 });
    const C = [[5, 3], [4, 2], [3, 0], [2, 1], [1, 0], [3, 0], [2, 1], [4, 2]];
    s.measures.forEach((m, mi) => { m.tabs[0] = C.map(([st, f], i) => __TC({ chord: (mi === 0 && i === 0 && !o.noChord) ? 'C' : '', notes: o.inst === 'uku' ? [{ s: Math.min(st, 4), f: 0 }] : [{ s: st, f }] })); });
    return s; };
  window.__ld = (s, row, ci, mi) => { try { hideStartPad(); } catch (_) {}
    loadSong(s); undoStack.length = 0; redoStack.length = 0;
    sel = { mi: mi || 0, row: row || 'tab', vi: 0, ci: ci || 0, si: 1 }; selRange = null; render();
    try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {} return true; };
  window.__posOf = sh => { const f = [...sh].map(ch => ch === 'x' ? -1 : parseInt(ch, 36)).filter(v => v > 0); return f.length ? Math.min(...f) : 0; };
  window.__low = sh => { if (!sh || sh.length !== 6) return null; for (let i = 0; i < 6; i++) { const ch = sh[i]; if (ch !== 'x') return (OPEN_PC[5 - i] + parseInt(ch, 36)) % 12; } return null; };
  window.__span = sh => { const p = [...sh].map(ch => ch === 'x' ? null : parseInt(ch, 36)).filter(v => v != null && v > 0); return p.length ? Math.max(...p) - Math.min(...p) : 0; };
  /* 用指定和弦打开 GP（与谱面「编辑和弦…」同一入口：先写进列，再 showChordEditor） */
  window.__open = (name, mi, ci) => { mi = mi || 0; ci = ci || 0; song.measures[mi].tabs[0][ci].chord = name; closeModal(); showChordEditor(mi, ci, 0); song.measures[mi].tabs[0][ci].chord = ''; return !!document.querySelector('.modal'); };
  window.__cards = () => [...document.querySelectorAll('#ce-pos [data-cpos]')].map(c => ({ sh: c.dataset.shape, lab: (c.querySelector('.bt') || {}).textContent || '', on: c.classList.contains('on'),
    vl: [...c.querySelectorAll('svg line')].filter(l => l.getAttribute('x1') === l.getAttribute('x2')).length }));
  window.__songJ = () => JSON.stringify(song);
  window.__hasA0 = () => typeof ckHeadHTML === 'function' && typeof ckWire === 'function' && typeof chordWriteAt === 'function';
};
const EV = (pg, f, a) => pg.evaluate(f, a).catch(e => ({ err: String(e && e.message || e) }));
async function openPage(b, url, vp, extra) {
  const ctx = await b.newContext(Object.assign({ viewport: vp || { width: 1440, height: 900 } }, extra || {}));
  const pg = await ctx.newPage();
  pg.__errs = []; pg.on('pageerror', e => pg.__errs.push('PAGEERR:' + e.message));
  await pg.goto(url); await pg.waitForTimeout(900);
  await EV(pg, HELP);
  return pg;
}
const errsAll = [];
const closePg = async pg => { errsAll.push(...pg.__errs); await pg.context().close(); };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await openPage(b, URL0);
  const hasA0 = await EV(pg, () => __hasA0());
  const flow = await EV(pg, () => flowOn());
  console.log('被测：' + URL0 + '  新外壳=' + flow + '  A0 接口=' + hasA0 + '  基线=' + (REF_URL || '（无）'));

  /* ===== T1 入口（新外壳六线谱行）===== */
  if (want('T1')) {
    const a1 = await EV(pg, () => typeof chordOpen === 'function' && /chordOpen/.test(String(showChordQuick)));
    if (!a1) INFO('T1 新外壳入口分流', 'A1 入口分发（showChordQuick → chordOpen）未合入（单跑 B 轨分支），跳过');
    else {
      const prep = async () => { await EV(pg, () => { closeModal(); closePop(); __ld(__mkG(), 'tab', 2); return 1; }); };
      const got = async () => { await pg.waitForTimeout(150); return EV(pg, () => { const m = document.querySelector('.modal[data-ce="tab"]'); const i = document.getElementById('ck-in');
        return { tab: !!m, ckIn: !!(m && i && m.contains(i)), focus: document.activeElement === i, ci: ceState && ceState.ci }; }); };
      const res = {};
      await prep(); const sb = await pg.$('#flw-sbar .flw-sb-tool[data-v="chord"]');
      if (sb && await sb.isVisible()) { await sb.click(); res.sbar = await got(); } else res.sbar = { vis: false };
      await prep(); await pg.keyboard.press('Control+k'); res.ctrlk = await got();
      await prep();
      for (const t of ['#flw-rp-tabs [data-fa="rd:page"][data-p="text"]', '#flw-rstrip [data-fa="rd:tab"][data-p="text"]']) if (await pg.isVisible(t).catch(() => false)) { await pg.click(t); break; }
      await pg.waitForTimeout(150);
      const tq = await pg.$('.flw-rx-btn[data-v="chordq"]');
      if (tq && await tq.isVisible()) { await tq.click(); res.text = await got(); } else res.text = { vis: false };
      await prep(); await pg.keyboard.press('Control+Slash'); await pg.waitForTimeout(200); await pg.keyboard.type('输入和弦'); await pg.waitForTimeout(200); await pg.keyboard.press('Enter'); res.cmd = await got();
      await prep(); await EV(pg, () => { song.measures[0].tabs[0][0].chord = 'C'; render(); return 1; });
      /* 谱面和弦图：与 tv_chordsys 同口径派发 pointerdown（悬浮条 / 页底矩形会截走 playwright 的真实点击判定） */
      const gOk = await EV(pg, () => { const g = document.querySelector('#score g[data-tchord="0:0:0"]'); if (!g) return false; const bb = g.getBoundingClientRect();
        g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: bb.x + 5, clientY: bb.y + 5, button: 0 })); return !!document.getElementById('cp-edit'); });
      if (gOk) { await pg.click('#cp-edit'); res.score = await got(); } else res.score = { menu: false };
      const uk = await EV(pg, () => { closeModal(); closePop(); __ld(__mkG({ inst: 'uku' }), 'tab', 0); return 1; });
      await pg.keyboard.press('Control+k'); const ru = await got();
      const uc = await EV(pg, () => [...document.querySelectorAll('#ce-pos [data-cpos]')].map(c => c.dataset.shape.length));
      await EV(pg, () => { closeModal(); return 1; });
      const okAll = ['sbar', 'ctrlk', 'text', 'cmd'].every(k => res[k].tab && res[k].ckIn && res[k].focus && res[k].ci === 2) && res.score.tab && res.score.ckIn && res.score.focus;
      T(okAll && ru.tab && uc.length >= 3 && uc.every(n => n === 4), 'T1 新外壳六线谱行：悬浮条 / Ctrl+K / 文字页 / 命令面板 / 谱面和弦图都打开 GP（.modal[data-ce=tab]，#ck-in 有焦点）；尤克里里卡片四线', J({ res, ru, uc: uc.length }));
    }
  }

  /* ===== T2 多把位 ===== */
  if (want('T2')) {
    const r = await EV(pg, () => { __ld(__mkG({ noChord: true })); const out = {};
      for (const n of ['C', 'G', 'Am', 'F', 'Bm']) { __open(n); const cs = __cards(); const pos = cs.map(c => __posOf(c.sh));
        out[n] = { n: cs.length, mono: pos.every((p, i) => !i || p >= pos[i - 1]), vl6: cs.every(c => c.vl === 6),
          pin: cs.every((c, i) => pos[i] <= 1 || /品/.test(c.lab)), on: cs.filter(c => c.on).length,
          onIsCur: (cs.find(c => c.on) || {}).sh === (ceState.custom || ceShape()) }; closeModal(); }
      return out; });
    const ok = r && !r.err && Object.values(r).every(x => x.n >= 6 && x.mono && x.vl6 && x.pin && x.on === 1 && x.onIsCur);
    T(ok, 'T2 多把位：C/G/Am/F/Bm 卡 ≥6、按把位排序、6 弦图、高把位标品、当前指法卡 .on 恰 1 张', J(r));
  }

  /* ===== T3 斜杠卡（R5） ===== */
  if (want('T3')) {
    const probe = async (p) => EV(p, () => { __ld(__mkG({ noChord: true })); const out = {};
      const one = (n, bass, must) => { __open(n); const cs = __cards();
        out[n] = { n: cs.length, low: cs.every(c => __low(c.sh) === bass), must: cs.some(c => c.sh === must), first: (cs[0] || {}).lab, firstSh: (cs[0] || {}).sh,
          span: Math.max(...cs.map(c => __span(c.sh))), shapes: cs.map(c => c.sh).join(' ') }; closeModal(); };
      one('Am7/G', 7, '302010'); one('C/D', 2, 'xx0010'); one('Dm/C', 0, 'x30231'); return out; });
    const r = await probe(pg);
    const okA = r['Am7/G'] && r['Am7/G'].low && r['Am7/G'].must && r['Am7/G'].first === '常用' && r['Am7/G'].firstSh === '302010';
    T(okA, 'T3a Am7/G：所有卡最低音 G、含 302010、首张「常用」', J(r['Am7/G']));
    T(r['C/D'] && r['C/D'].low && r['C/D'].must, 'T3b C/D：所有卡最低音 D、含 xx0010', J(r['C/D']));
    T(r['Dm/C'] && r['Dm/C'].low && r['Dm/C'].must, 'T3c Dm/C：所有卡最低音 C、含 x30231', J(r['Dm/C']));
    T(r['Am7/G'] && ['Am7/G', 'C/D', 'Dm/C'].every(k => r[k].span <= 4 && r[k].n >= 3), 'T3d 斜杠卡跨度 ≤4（按弦最高品 − 最低品，空弦不算）且每个 ≥3 张', J(['Am7/G', 'C/D', 'Dm/C'].map(k => r[k] && [r[k].n, r[k].span])));
    const u = await EV(pg, () => { __ld(__mkG({ inst: 'uku', noChord: true })); __open('C/G'); const cs = __cards(); closeModal();
      return { n: cs.length, len4: cs.every(c => c.sh.length === 4), shapes: cs.map(c => c.sh).join(' ') }; });
    T(u.n >= 3 && u.len4, 'T3e 尤克里里 C/G 不按低音过滤：≥3 张、四线指法', J(u));
    const pc = await openPage(b, withQ(URL0, 'shell=classic'));
    const rc = await probe(pc); await closePg(pc);
    T(rc['Am7/G'] && rc['Am7/G'].low && rc['Am7/G'].must && rc['Am7/G'].first === '常用' && rc['C/D'].low && rc['Dm/C'].low, 'T3f 旧外壳同样按低音校正（R5 两外壳同改）', J({ a: rc['Am7/G'] && rc['Am7/G'].shapes, d: rc['C/D'] && rc['C/D'].shapes }));
  }

  /* ===== T4 默认指法（R6） ===== */
  const NON_SLASH = (() => { const R = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']; const o = [];
    R.forEach(r => ['', 'm', '7'].forEach(q => o.push(r + q))); return o.concat(['Cmaj7', 'Am7', 'Dsus4', 'Gadd9']); })();
  if (want('T4')) {
    const shapesOf = (p, names) => EV(p, (names) => { __ld(__mkG({ noChord: true })); const o = {}; names.forEach(n => { o[n] = chordShape(n); }); return o; }, names);
    const a = await shapesOf(pg, ['Am7/G', 'Dm/C', 'C/D']);
    T(a['Am7/G'] === '302010' && a['Dm/C'] === 'x30231' && a['C/D'] === 'xx0010', 'T4a 库外斜杠取原位库图＋低音：Am7/G→302010、Dm/C→x30231、C/D→xx0010', J(a));
    const LIB = { 'C/G': '332010', 'G/B': 'x20003', 'D/F#': '2x0232', 'C/E': '032010', 'Am/G': '302210', 'F/C': 'x33211', 'Em/D': 'xx0000' };
    const bl = await shapesOf(pg, Object.keys(LIB));
    T(Object.keys(LIB).every(k => bl[k] === LIB[k]), 'T4b 库内斜杠和弦 7 个不变', J(bl));
    const cur = await shapesOf(pg, NON_SLASH);
    if (REF_URL) {
      const pr = await openPage(b, REF_URL); const ref = await shapesOf(pr, NON_SLASH); await closePg(pr);
      const diff = NON_SLASH.filter(n => cur[n] !== ref[n]);
      T(NON_SLASH.length === 40 && !diff.length && NON_SLASH.every(n => !!cur[n]), 'T4c 40 个非斜杠常用和弦与基线 ' + REF_COMMIT + ' 逐个相等', diff.length ? J(diff.map(n => [n, ref[n], cur[n]])) : '40/40');
    } else INFO('T4c 非斜杠和弦与基线对拍', '取不到基线，跳过');
    const d = await EV(pg, () => { __ld(__mkG({ noChord: true })); song.customChords['Am7/G'] = '3x2010'; const o = chordShape('Am7/G'); delete song.customChords['Am7/G']; return o; });
    T(d === '3x2010', 'T4d customChords 仍优先于 R6 兜底', J(d));
  }

  /* ===== T5 试听 ===== */
  if (want('T5')) {
    const spy = () => { window.__heard = []; window.chordHear = (n, sh) => { __heard.push(sh || chordShape(n)); }; window.auditionShape = sh => { __heard.push(sh); }; };
    await EV(pg, spy);
    await EV(pg, () => { try { localStorage.removeItem('musetab-chordhear'); } catch (_) {} __ld(__mkG()); __open('C'); return true; });
    /* T5a 点卡 */
    const a = await EV(pg, () => { const j0 = __songJ(), u0 = undoStack.length; __heard.length = 0;
      const c = document.querySelectorAll('#ce-pos [data-cpos]')[3]; const sh = c.dataset.shape; c.click();
      return { sh, heard: __heard.slice(), custom: ceState.custom, same: __songJ() === j0 && undoStack.length === u0,
        on: (document.querySelector('#ce-pos .pat-card.on') || {}).dataset ? document.querySelector('#ce-pos .pat-card.on').dataset.shape : null }; });
    T(a.heard && a.heard.length === 1 && a.heard[0] === a.sh && a.custom === a.sh && a.same && a.on === a.sh, 'T5a 点把位卡：选中＋试听这张卡（1 次），song 与撤销栈不变', J(a));
    /* T5b 悬停 350ms / 长按 500ms / 关掉 ♪ */
    await pg.mouse.move(5, 5); await pg.waitForTimeout(80);
    await EV(pg, () => { __heard.length = 0; return 1; });
    const box = await EV(pg, () => { const c = document.querySelectorAll('#ce-pos [data-cpos]')[1]; c.scrollIntoView({ block: 'nearest' }); const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, sh: c.dataset.shape }; });
    await pg.mouse.move(box.x, box.y, { steps: 3 }); await pg.waitForTimeout(350);
    const h1 = await EV(pg, () => __heard.slice());
    await pg.waitForTimeout(400);
    const h1b = await EV(pg, () => __heard.slice());
    await pg.mouse.move(5, 5); await pg.waitForTimeout(80);
    /* 触屏长按（hasTouch 上下文；CDP 触摸事件按住 500ms） */
    const pt = await openPage(b, URL0, { width: 1440, height: 900 }, { hasTouch: true });
    await EV(pt, spy);
    await EV(pt, () => { try { localStorage.removeItem('musetab-chordhear'); } catch (_) {} __ld(__mkG()); __open('C'); __heard.length = 0; return 1; });
    const tb = await EV(pt, () => { const c = document.querySelectorAll('#ce-pos [data-cpos]')[2]; const r = c.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), sh: c.dataset.shape, cust: ceState.custom }; });
    const cdp = await pt.context().newCDPSession(pt);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tb.x, y: tb.y }] });
    await pt.waitForTimeout(500);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await pt.waitForTimeout(150);
    const h2 = await EV(pt, () => ({ heard: __heard.slice(), cust: ceState.custom, j: JSON.stringify(song.customChords), u: undoStack.length }));
    await closePg(pt);
    /* 关掉悬停试听（♪ 存在时点它；否则直接写本机偏好）后再悬停 */
    const off = await EV(pg, () => { const hb = document.getElementById('ck-hear'); if (hb) hb.click(); else localStorage.setItem('musetab-chordhear', '0');
      __heard.length = 0; return { via: hb ? 'ck-hear' : 'ls', ls: localStorage.getItem('musetab-chordhear') }; });
    const box2 = await EV(pg, () => { const c = document.querySelectorAll('#ce-pos [data-cpos]')[4]; const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await pg.mouse.move(box2.x, box2.y, { steps: 3 }); await pg.waitForTimeout(450);
    const h3 = await EV(pg, () => __heard.slice());
    await pg.mouse.move(5, 5);
    await EV(pg, () => { try { localStorage.removeItem('musetab-chordhear'); } catch (_) {} return 1; });
    T(h1.length === 1 && h1[0] === box.sh && h1b.length === 1 && h2.heard.length === 1 && h2.heard[0] === tb.sh && h2.cust === tb.cust && h2.u === 0 && off.ls === '0' && h3.length === 0,
      'T5b 悬停 350ms 响 1 次（停留不重复）、长按 500ms 响 1 次且不选卡不写入、♪ 关掉后悬停 0 次', J({ h1, h1b: h1b.length, h2, off, h3 }));
    const c5 = await EV(pg, () => { __heard.length = 0; document.getElementById('ce-play').click(); return { heard: __heard.slice(), cur: ceState.custom || ceShape() }; });
    T(c5.heard.length === 1 && c5.heard[0] === c5.cur, 'T5c ▶ 试听照旧（当前指法）', J(c5));
    await EV(pg, () => { closeModal(); return 1; });
  }

  /* GP 打开：新外壳优先走 Ctrl+K（A1 统一入口）；入口未合入时直接 showChordEditor（谱面「编辑和弦…」同一函数） */
  const openGP = async (p, mi, ci) => {
    await EV(p, (a) => { closeModal(); closePop(); sel = { mi: a[0], row: 'tab', vi: 0, ci: a[1], si: 1 }; selRange = null; render(); try { document.activeElement.blur(); } catch (_) {} return 1; }, [mi, ci]);
    await p.keyboard.press('Control+k'); await p.waitForTimeout(120);
    const how = await EV(p, (a) => { if (document.querySelector('.modal[data-ce="tab"]')) return 'ctrlk'; closePop(); showChordEditor(a[0], a[1], 0); return 'direct'; }, [mi, ci]);
    await p.waitForTimeout(60); return how; };
  const typeIn = async (p, txt) => { await EV(p, () => { const i = document.getElementById('ck-in'); if (i) { i.focus(); i.select(); } return 1; }); if (txt) await p.keyboard.type(txt); };

  /* ===== T6 写入与 remap ===== */
  if (want('T6')) {
    if (!hasA0) INFO('T6 写入与 remap', 'A0 共享接口未合入，跳过');
    else {
      const prep = () => EV(pg, () => { closeModal(); __ld(__mkG()); window.__m0 = () => JSON.stringify(song.measures[0].tabs[0]); return 1; });
      await prep();
      const exp = await EV(pg, () => { const cols = JSON.parse(JSON.stringify(song.measures[0].tabs[0])); cols[0].chord = 'Am';
        let end = cols.length; for (let i = 1; i < cols.length; i++) if (cols[i].chord) { end = i; break; }
        remapCols(cols, 0, end, chordShape('C'), chordShape('Am')); return { cols: JSON.stringify(cols), cc: JSON.stringify(song.customChords), u: undoStack.length, s0: JSON.stringify(song.measures) }; });
      const how = await openGP(pg, 0, 0);
      await typeIn(pg, 'Am'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(120);
      const a = await EV(pg, () => ({ cols: __m0(), cc: JSON.stringify(song.customChords), u: undoStack.length, open: !!document.querySelector('.modal'), meas: JSON.stringify(song.measures) }));
      let refEq = null;
      if (REF_URL) { const pr = await openPage(b, REF_URL); await EV(pr, () => { __ld(__mkG()); sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 1 }; render(); try { document.activeElement.blur(); } catch (_) {} return 1; });
        await pr.keyboard.press('Control+k'); await pr.waitForTimeout(80); await pr.keyboard.type('Am'); await pr.keyboard.press('Enter'); await pr.waitForTimeout(100);
        const rm = await EV(pr, () => JSON.stringify(song.measures)); await closePg(pr); refEq = rm === a.meas; }
      T(a.cols === exp.cols && a.cc === exp.cc && a.u === exp.u + 1 && !a.open && refEq !== false, 'T6a 回车写 Am（没动指法）：音符＝remapCols 现算、customChords 不变、一步撤销、面板关闭' + (refEq == null ? '（基线缺席，未对拍）' : '、与基线快速框逐字节相同'), J({ how, eq: a.cols === exp.cols, cc: a.cc, du: a.u - exp.u, open: a.open, refEq }));
      /* T6b 选 A 型高把位卡 → 应用 */
      await openGP(pg, 0, 0);
      const pick = await EV(pg, () => { const c = [...document.querySelectorAll('#ce-pos [data-cpos]')].find(x => /A型/.test(x.textContent)) || [...document.querySelectorAll('#ce-pos [data-cpos]')].pop();
        const before = JSON.parse(__m0()); const oldSh = chordShape('Am'); c.click(); const sh = ceState.custom;
        let end = before.length; for (let i = 1; i < before.length; i++) if (before[i].chord) { end = i; break; }
        remapCols(before, 0, end, oldSh, sh); return { sh, exp: JSON.stringify(before), u: undoStack.length }; });
      await EV(pg, () => { document.getElementById('ce-ok').click(); return 1; }); await pg.waitForTimeout(100);
      const bb = await EV(pg, () => ({ cc: song.customChords.Am, cols: __m0(), u: undoStack.length, open: !!document.querySelector('.modal') }));
      T(bb.cc === pick.sh && bb.cols === pick.exp && bb.u === pick.u + 1 && !bb.open, 'T6b 选 A 型把位卡再「应用」：customChords.Am＝该卡、本和弦管辖的音按该卡指法 remap、一步撤销', J({ sh: pick.sh, cc: bb.cc, remapOk: bb.cols === pick.exp, du: bb.u - pick.u }));
      /* T6c 撤销逐步 */
      const c6 = await EV(pg, (s0) => { undo(); const u1 = { am: song.measures[0].tabs[0][0].chord, cc: song.customChords.Am || null, cols: __m0() }; undo();
        return { u1, back0: JSON.stringify(song.measures) === s0 }; }, exp.s0);
      T(c6.u1.am === 'Am' && c6.u1.cc === null && c6.u1.cols === exp.cols && c6.back0, 'T6c 撤销 1 次回到 T6b 之前、再撤销 1 次回到 T6a 之前', J(c6));
      /* T6e 动过指法（点高把位卡）后在 #ck-in 回车＝应用口径（与点「应用」同结果） */
      await prep();
      await EV(pg, () => { song.measures[0].tabs[0][0].chord = 'Am'; render(); return 1; });
      await openGP(pg, 0, 0);
      const e0 = await EV(pg, () => { const c = [...document.querySelectorAll('#ce-pos [data-cpos]')].find(x => /A型/.test(x.textContent)); c.click(); return { sh: ceState.custom, dirty: !!ceState.ceDirty, u: undoStack.length }; });
      await EV(pg, () => { const i = document.getElementById('ck-in'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); return 1; });
      await pg.keyboard.press('Enter'); await pg.waitForTimeout(80);
      const e1 = await EV(pg, () => ({ cc: song.customChords.Am, u: undoStack.length, open: !!document.querySelector('.modal') }));
      T(e0.dirty && e1.cc === e0.sh && e1.u === e0.u + 1 && !e1.open, 'T6e 点高把位卡后回车：走应用口径（customChords.Am＝该卡）、一步撤销、关闭', J({ e0, e1 }));
      /* T6d 斜杠名不进 customChords */
      await prep(); await openGP(pg, 0, 2); await typeIn(pg, 'Am7/G'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(100);
      const d = await EV(pg, () => ({ ch: song.measures[0].tabs[0][2].chord, has: Object.prototype.hasOwnProperty.call(song.customChords, 'Am7/G') }));
      T(d.ch === 'Am7/G' && !d.has, 'T6d 键入 Am7/G 回车（没动指法）：写入、customChords 不多键', J(d));
    }
  }

  /* ===== T7 GP 连续标注 ===== */
  if (want('T7')) {
    if (!hasA0) INFO('T7 GP 连续标注', 'A0 共享接口未合入，跳过');
    else {
      await EV(pg, () => { closeModal(); __ld(__mkG({ noChord: true })); return 1; });
      await openGP(pg, 0, 0);
      const snap = () => EV(pg, () => { const m = document.querySelector('.modal'), r = m ? m.getBoundingClientRect() : null, i = document.getElementById('ck-in');
        return { mi: ceState && ceState.mi, ci: ceState && ceState.ci, val: i ? i.value : null, focus: document.activeElement === i, all: i ? (i.selectionStart === 0 && i.selectionEnd === i.value.length) : null, l: r && Math.round(r.left), t: r && Math.round(r.top), u: undoStack.length }; });
      const s0 = await snap(); const steps = [s0];
      await typeIn(pg, 'C'); await pg.keyboard.press('Space'); await pg.waitForTimeout(150); steps.push(await snap());
      await pg.keyboard.type('G'); await pg.keyboard.press('Space'); await pg.waitForTimeout(150); steps.push(await snap());
      await pg.keyboard.type('Am'); await pg.keyboard.press('Tab'); await pg.waitForTimeout(150); steps.push(await snap());
      await pg.keyboard.type('F'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(150);
      const fin = await EV(pg, () => ({ ch: [0, 1, 2, 3, 4, 5].map(i => song.measures[0].tabs[0][i].chord || ''), m1: song.measures[1].tabs[0][0].chord || '', u: undoStack.length, open: !!document.querySelector('.modal') }));
      T(fin.ch.join(',') === 'C,,G,,Am,' && fin.m1 === 'F' && fin.u === s0.u + 4 && !fin.open, 'T7a C␣G␣Am⇥F↵：col0 C、col2 G、col4 Am、下一小节 col0 F，撤销 +4，面板关闭', J(fin));
      const pos = steps.slice(1).map(x => [x.mi, x.ci]);
      T(J(pos) === J([[0, 2], [0, 4], [1, 0]]) && steps.slice(1).every(x => x.val === '' && x.focus), 'T7b 每跳一次 ceState 换到新列、#ck-in 预填本处（空，不继承）且有焦点', J(steps.map(x => [x.mi, x.ci, x.val, x.focus])));
      T(steps.every(x => x.l != null && Math.abs(x.l - s0.l) <= 1 && Math.abs(x.t - s0.t) <= 1), 'T7c 连续标注期间弹窗位置不动（±1px）', J(steps.map(x => [x.l, x.t])));
    }
  }

  /* ===== T10 GP 里的 CK 头 ===== */
  if (want('T10')) {
    if (!hasA0) INFO('T10 GP 里的 CK 头', 'A0 共享接口未合入，跳过');
    else {
      await EV(pg, () => { closeModal(); __ld(__mkG()); return 1; }); await openGP(pg, 0, 2);
      const a = await EV(pg, () => { const j0 = __songJ(); const f = [...document.querySelectorAll('[data-ckk]')].find(x => (x.dataset.ckk || '') === 'F' || x.textContent.trim().startsWith('F') || x.title.startsWith('F'));
        if (!f) return { chip: false, n: document.querySelectorAll('[data-ckk]').length }; f.click();
        return { chip: true, root: ceState.root, qual: ceState.qual, title: (document.getElementById('ce-title') || {}).textContent, same: __songJ() === j0, inp: (document.getElementById('ck-in') || {}).value }; });
      T(a.chip && a.root === 'F' && a.qual === '' && a.title === 'F' && a.same, 'T10a 点调内芯片 F：编辑器装入 F（主音 / 标题），song 不变', J(a));
      const bq = await EV(pg, () => { const o = { sug: !!document.getElementById('ck-sug'), diag: !!document.querySelector('#ck-diag [data-ckd="top"]') }; const t = document.querySelector('#ck-diag [data-ckd="top"]'); if (t) t.click(); o.dp = song.diagPos; return o; });
      T(bq.sug && bq.diag && bq.dp === 'top', 'T10b 吉他弹唱谱：有 #ck-sug、#ck-diag，点「曲首」写进 song.diagPos', J(bq));
      await EV(pg, () => { closeModal(); __ld(__mkG()); return 1; }); await openGP(pg, 0, 2);
      const c = await EV(pg, () => { const w = document.getElementById('ck-swap'); if (!w) return { swap: false }; w.click();
        return { swap: true, row: sel.row, mi: sel.mi, ci: sel.ci, vox: !!document.querySelector('#popmenu[data-ce="vox"]') || !!document.getElementById('vc-ok'), modal: !!document.querySelector('.modal[data-ce="tab"]') }; });
      T(c.swap && c.row === 'vox' && c.vox && !c.modal, 'T10c ⇄：关 GP、光标到同一拍的简谱位置并打开级数构建器', J(c));
      await EV(pg, () => { closePop(); closeModal(); __ld(__mkG()); return 1; }); await openGP(pg, 0, 2);
      await typeIn(pg, ''); await pg.keyboard.type('Am7'); await pg.waitForTimeout(320);
      const d = await EV(pg, () => { const i = document.getElementById('ck-in'); return { title: (document.getElementById('ce-title') || {}).textContent, root: ceState.root, qual: ceState.qual, focus: document.activeElement === i, val: i && i.value, caret: i && i.selectionStart, end: i && i.value.length }; });
      T(d.title === 'Am7' && d.focus && d.val === 'Am7' && d.caret === d.end, 'T10d 键入 Am7 停 300ms：防抖装入编辑器（标题 Am7），#ck-in 焦点与插入点（末尾）不丢', J(d));
      await EV(pg, () => { closeModal(); return 1; });
    }
  }

  /* ===== T13 GP 提交边界：认不出就地报错 / 点框外未写入提示 / 「应用」先装入刚键入的名字 ===== */
  if (want('T13')) {
    if (!hasA0) INFO('T13 GP 提交边界', 'A0 共享接口未合入，跳过');
    else {
      await EV(pg, () => { closeModal(); __ld(__mkG()); return 1; }); await openGP(pg, 0, 2);
      const j0 = await EV(pg, () => ({ j: __songJ(), u: undoStack.length }));
      await typeIn(pg, 'Hzz9'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(80);
      const a = await EV(pg, () => { const i = document.getElementById('ck-in'), e = document.getElementById('ck-err');
        return { open: !!document.querySelector('.modal[data-ce="tab"]'), inv: i && i.getAttribute('aria-invalid'), err: e && !e.hidden ? e.textContent : '', j: __songJ(), u: undoStack.length }; });
      T(a.open && a.inv === 'true' && /认不出/.test(a.err) && a.j === j0.j && a.u === j0.u, 'T13a 认不出的名字回车：就地报错（#ck-err、aria-invalid）、不写不关', J({ open: a.open, inv: a.inv, err: a.err, same: a.j === j0.j }));
      /* 点框外：键入 Dm7 未提交 → 遮罩 pointerdown 关闭 → song 不变、提示「和弦未写入」带「写入」→ 点它写到原处 */
      await typeIn(pg, 'Dm7'); await pg.waitForTimeout(20);
      const b0 = await EV(pg, () => { const mk = document.getElementById('modal-mask'); mk.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 5, clientY: 5 }));
        const t = document.getElementById('toast'), btn = t && t.querySelector('.flw-ta');
        return { closed: !document.getElementById('modal-mask'), k: t && t.dataset.k, txt: t && t.textContent, btn: btn && btn.textContent, j: __songJ() }; });
      await EV(pg, () => { const btn = document.querySelector('#toast .flw-ta'); if (btn) btn.click(); return 1; });
      const b1 = await EV(pg, () => song.measures[0].tabs[0][2].chord);
      T(b0.closed && b0.k === 'limit' && /和弦未写入/.test(b0.txt) && b0.btn === '写入' && b0.j === j0.j && b1 === 'Dm7', 'T13b 点框外未提交：关闭、song 不变、提示「和弦未写入」，点「写入」落到原处', J({ b0: Object.assign({}, b0, { j: b0.j === j0.j }), b1 }));
      /* 「应用」：刚键入 G7（防抖未到）直接点应用 → 写 G7 */
      await openGP(pg, 0, 4); await typeIn(pg, 'G7');
      await EV(pg, () => { document.getElementById('ce-ok').click(); return 1; }); await pg.waitForTimeout(60);
      const c = await EV(pg, () => ({ ch: song.measures[0].tabs[0][4].chord, open: !!document.querySelector('.modal') }));
      T(c.ch === 'G7' && !c.open, 'T13c 刚键入（防抖未到）就点「应用」：先装入键入的名字再写', J(c));
      /* Esc：不提交直接关闭 */
      await openGP(pg, 0, 6); await typeIn(pg, 'Em'); const j2 = await EV(pg, () => __songJ()); await pg.keyboard.press('Escape'); await pg.waitForTimeout(60);
      const d = await EV(pg, (j2) => ({ closed: !document.querySelector('.modal'), same: __songJ() === j2, ch: song.measures[0].tabs[0][6].chord || '' }), j2);
      T(d.closed && d.same && d.ch === '', 'T13d #ck-in 里 Esc：不提交直接关闭', J(d));
    }
  }

  /* ===== T14 新外壳 GP 避开锚点列（几何）+ 浅遮罩 ===== */
  if (want('T14')) {
    const geo = await EV(pg, () => { closeModal(); __ld(__mkG({ nMea: 8 })); const out = [];
      const rectOf = (mi, ci) => { const b = colBoxes['t0:' + mi + ':' + ci], svg = document.getElementById('score'), vb = svg.viewBox.baseVal, sr = svg.getBoundingClientRect(), k = sr.width / vb.width;
        return b ? { l: sr.left + b.x * k, r: sr.left + (b.x + b.w) * k, t: sr.top + b.y * k, b: sr.top + (b.y + b.h) * k } : null; };
      const keys = Object.keys(colBoxes).filter(k => /^t0:/.test(k)).map(k => k.split(':').slice(1).map(Number));
      /* 取最左、最右（视口内）的两个列头 */
      const vis = keys.map(([mi, ci]) => ({ mi, ci, R: rectOf(mi, ci) })).filter(x => x.R && x.R.t > 60 && x.R.b < innerHeight - 40).sort((a, b) => a.R.l - b.R.l);
      for (const x of [vis[0], vis[vis.length - 1]]) { if (!x) continue;
        sel = { mi: x.mi, row: 'tab', vi: 0, ci: x.ci, si: 1 }; render(); showChordEditor(x.mi, x.ci, 0);
        const m = document.querySelector('.modal').getBoundingClientRect(), R = rectOf(x.mi, x.ci), mk = getComputedStyle(document.getElementById('modal-mask'));
        out.push({ at: x.mi + ':' + x.ci, R: [Math.round(R.l), Math.round(R.r)], M: [Math.round(m.left), Math.round(m.right), Math.round(m.top), Math.round(m.bottom)],
          apart: m.left >= R.r || m.right <= R.l, inVp: m.top >= 0 && m.bottom <= innerHeight, bg: mk.backgroundColor, bf: mk.backdropFilter }); closeModal(); }
      return out; });
    T(geo.length === 2 && geo.every(g => g.apart && g.inVp && /rgba\(0, 0, 0, 0\.12\)/.test(g.bg) && g.bf === 'none'), 'T14 新外壳 1440：GP 外框与锚点列 R 不相交（最左 / 最右列头各一）、在视口内；遮罩浅（α .12、无模糊）', J(geo));
  }

  /* ===== T8 小屏底栏（R4，两外壳） ===== */
  if (want('T8')) {
    const foot = async (url, vp) => { const p = await openPage(b, url, vp);
      const r = await EV(p, () => { __ld(__mkG()); __open('C', 1, 0);
        const ok = document.getElementById('ce-ok'), rr = ok.getBoundingClientRect();
        const hit = document.elementFromPoint(rr.x + rr.width / 2, rr.y + rr.height / 2);
        const f = document.querySelector('.ce-foot');
        return { bottom: Math.round(rr.bottom), ih: innerHeight, hit: hit === ok || ok.contains(hit), sticky: f ? getComputedStyle(f).position : null }; });
      await closePg(p); return r; };
    for (const [w, h] of [[1366, 768], [1280, 720]]) for (const sh of ['', 'shell=classic']) {
      const r = await foot(sh ? withQ(URL0, sh) : URL0, { width: w, height: h });
      T(r.bottom <= r.ih - 4 && r.hit && r.sticky === 'sticky', `T8 ${w}×${h}${sh ? ' 旧外壳' : ''}：「应用」在可视区内且点得中、.ce-foot 吸底`, J(r));
    }
  }

  /* ===== T9 旧外壳 GP 零差异 ===== */
  if (want('T9')) {
    if (!REF_URL) INFO('T9 旧外壳零差异', '取不到基线，跳过');
    else {
      const sig = async (url) => { const p = await openPage(b, withQ(url, 'shell=classic'));
        const r = await EV(p, () => { const o = {}; __ld(__mkG({ noChord: true }));
          for (const n of ['C', 'Am7']) { __open(n); const m = document.querySelector('.modal');
            o[n] = { ids: [...m.querySelectorAll('[id]')].map(x => x.id).join(','), cr: m.querySelectorAll('[data-cr]').length, cq: m.querySelectorAll('[data-cq]').length,
              calt: m.querySelectorAll('[data-calt]').length, cpos: m.querySelectorAll('[data-cpos]').length, cards: [...m.querySelectorAll('[data-cpos]')].map(c => c.dataset.shape + '|' + c.textContent.trim()).join(' '),
              heads: [...m.querySelectorAll('.ce-sec>b')].map(x => x.firstChild.textContent.trim()).join('/'), h3: m.querySelector('h3').textContent,
              ok: document.getElementById('ce-ok').textContent, text: m.innerText.replace(document.getElementById('ce-pos').innerText, '').replace(/\s+/g, ' ').trim(), foot: !!m.querySelector('.ce-foot'), mask: document.getElementById('modal-mask').className, dce: m.dataset.ce || '',
              good: typeof shapePlayable !== 'function' || [...m.querySelectorAll('[data-cpos]')].every(c => { const sh = c.dataset.shape, lab = (c.querySelector('.bt') || {}).textContent || ''; return /开放|常用/.test(lab) || shapePlayable(sh); }) };
            closeModal(); }
          return o; });
        await closePg(p); return r; };
      const cur = await sig(URL0), ref = await sig(REF_URL);
      /* v68.9 收尾（TAB-3/13）有意迁移：把位卡的生成两外壳同改（推导卡改按必需音搜索、弹不了 / 缺必需音的模板卡不出），旧外壳的卡片张数与内容不再对拍，
         改断言「库图以外的卡都可弹（≤4 指、跨度 ≤3）」；其余 DOM（ids、主音 / 类型 / 变化音计数、分区标题、正文去掉卡片区）仍与基线逐字相同 */
      const keys = ['ids', 'cr', 'cq', 'calt', 'heads', 'h3', 'ok', 'text', 'mask', 'dce'];
      const diff = [];
      for (const n of ['C', 'Am7']) for (const k of keys) if (J(cur[n] && cur[n][k]) !== J(ref[n] && ref[n][k])) diff.push(n + '.' + k);
      T(!diff.length && cur.C.foot && !ref.C.foot && cur.C.ok === '应用到小节' && cur.C.good && cur.Am7.good && cur.C.cpos >= 6, 'T9 旧外壳 GP（C、Am7）DOM 签名与基线相同（卡片区除外：两外壳同改，库图以外的卡都可弹、C ≥6 张），只多 .ce-foot 包裹层', diff.length ? J(diff.map(d => [d, J(ref[d.split('.')[0]][d.split('.')[1]]).slice(0, 120), J(cur[d.split('.')[0]][d.split('.')[1]]).slice(0, 120)])) : 'ids/计数/卡片/标题/正文全同');
    }
  }

  /* ===== T11 新外壳文案 ===== */
  if (want('T11')) {
    const r = await EV(pg, () => { __ld(__mkG()); __open('C'); const m = document.querySelector('.modal');
      const txt = m.innerText;
      const btns = [...m.querySelectorAll('button')].filter(x => x.getClientRects().length && !x.matches('[data-cr],[data-cq],[data-calt],[data-comit],[data-cacc],[data-ckk],[data-ckx],[data-ckn],[data-ckd]') && !x.closest('#ck-used,#ck-sug'))
        .map(x => x.textContent.replace(/[\s＋+▶⠿×‹›♪⇄▦]/g, '')).filter(t => [...t].length > 4);
      const titles = [...m.querySelectorAll('[title]')].filter(x => x.closest('.modal')).map(x => x.getAttribute('title')).filter(t => [...t].length > 12);
      const pos = /左栏|右栏|行 2|右侧|左侧/.test(txt);
      const o = { drag: /按住标题可拖动/.test(txt), hint1: /自定义名称 →/.test(txt), hint2: /点格改音/.test(txt), ok: document.getElementById('ce-ok').textContent,
        heads: [...m.querySelectorAll('.ce-sec>b')].map(x => x.firstChild.textContent.trim()).join('/'), long: btns, longT: titles, pos };
      closeModal(); return o; });
    T(!r.drag && !r.hint1 && !r.hint2 && r.ok === '应用' && /变化音/.test(r.heads) && !/延伸/.test(r.heads) && /构成音/.test(r.heads) && !/点击省略/.test(r.heads) && /(^|\/)把位(\/|$)/.test(r.heads)
      && !r.long.length && !r.longT.length && !r.pos, 'T11 新外壳 GP 文案：无拖动说明与两句提示、标题两三字、#ce-ok「应用」、按钮 ≤4 字、title ≤12 字、无位置词', J(r));
    const pc = await openPage(b, withQ(URL0, 'shell=classic'));
    const rc = await EV(pc, () => { __ld(__mkG()); __open('C'); const m = document.querySelector('.modal'); const t = m.innerText;
      const o = { drag: /⠿ 按住标题可拖动/.test(t), hint1: /自定义名称 → 空白和弦图点格编辑 → 保存（随本谱携带与分享）。/.test(t), hint2: /点格改音 · 顶部切 ×\/○ · 图即所得/.test(t), ok: document.getElementById('ce-ok').textContent }; closeModal(); return o; });
    await closePg(pc);
    T(rc.drag && rc.hint1 && rc.hint2 && rc.ok === '应用到小节', 'T11b 旧外壳文案逐字保留', J(rc));
  }

  /* ===== T12 数据红线 ===== */
  if (want('T12')) {
    const r = await EV(pg, () => { __ld(__mkG()); const k0 = Object.keys(song).sort().join(','); __open('Am7/G'); document.querySelectorAll('#ce-pos [data-cpos]')[1].click(); document.getElementById('ce-ok').click();
      const k1 = Object.keys(song).sort().join(','); const j = JSON.parse(JSON.stringify(song)); loadSong(j); const rt = JSON.stringify(song) === JSON.stringify(j);
      const lsk = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^musetab-chord/.test(k)) lsk.push(k); }
      return { same: k0 === k1, k0, k1, rt, lsk, ch: song.measures[0].tabs[0][0].chord }; });
    /* 只许出现已有的可选字段（chordRecent / diagPos / funcNames / customChords，v60 起就有）；不新增字段 */
    const OLD_OPT = ['chordRecent', 'diagPos', 'funcNames', 'customChords'];
    const nk = r.k1.split(',').filter(k => !r.k0.split(',').includes(k));
    T(nk.every(k => OLD_OPT.includes(k)) && r.rt && r.lsk.every(k => k === 'musetab-chordhear'), 'T12 song 不新增字段（只写已有可选字段）、JSON 往返不变、本机新键只有 musetab-chordhear', J({ nk, rt: r.rt, lsk: r.lsk, ch: r.ch }));
  }

  await closePg(pg);
  console.log(`PASS ${pass}/${total}` + (skipped ? `（ℹ️ ${skipped} 项接口缺席跳过）` : ''));
  console.log(errsAll.length ? 'ERRORS:\n' + errsAll.join('\n') : 'NO ERRORS');
  if (fails.length) console.log('FAILS: ' + fails.join(' '));
  await b.close();
  process.exit(pass === total && !errsAll.length ? 0 : 1);
})();
