'use strict';
/* tv_chordfix — v68.9 收尾：三路验收（和声 harmony / 指法 tab / 界面 ux）发现的回归与存量缺陷，逐条一组断言。
   每组标验收编号（H1–H14、TAB-1–13、UX-1–15）。修前红：MUSETAB_URL=修前副本（f89v/prefix.html）跑，除标「存量对拍」的几项外全红。
   H1   同拍其他行改同名不删（吉他弹唱 / 钢琴弹唱 CG / 两把吉他）
   H2   和弦名常见记法放行（两外壳）：C6/9 N.C. Cm(maj7) C+7；认不出的二次回车照写；已有 C6/9 不卡连续标注
   H3   默认斜杠指法：枚举 12 根音 × 10 类型 × 和弦内音低音，默认图必需音齐全、最低音＝低音、可弹（同 TAB-1/4）
   H4   12 调级数构建器 7 格按调号拼写、都带功能色标      H5  12 调 × 12 低音：转位低音音高＝主音＋半音数
   H6   换调保级数（11 个目标调）                         H7  小调纯六线谱建议走小调口径
   H8   副属 / 减和弦后建议、旋律 ♯4 时副属进建议           H9  小调构建器「和声」行与小调调外
   H10  1=E GP 低音能选 D♯                                 H11 借用和弦按级数字母拼（E♭ 调 ♭6＝C♭）
   H12  换调后常用行随调                                   H13 建议不重复、不推荐前一和弦
   H14  构建器头部带调名
   TAB-2 连续标注重排以本列生效和弦为准                    TAB-3 斜杠把位卡必需音齐全、可弹
   TAB-5 试听计夹位 / 本轨夹位                             TAB-6 尤克里里斜杠不套吉他低音
   TAB-7 GP 装入本谱自定义指法 / 自命名和弦，不动直接应用 song 不变      TAB-8 应用不冻结默认图；G/F# 选中库图
   TAB-9 同名改指法整轨重排                                TAB-10 重排终点含简谱锚定和弦
   TAB-11 本轨夹位的级数芯片按本轨指法调                   TAB-12 Drop D 和弦图按实际定弦发声
   TAB-13 原位和弦把位卡可弹、含根音三音、≥6 张
   UX-1 GP 连续标注不盖当前列（能避开时）    UX-2 构建器不盖当前小节、会话内少挪动    UX-3 同一点连点 › 单调前进
   UX-4 ↓ 进面板 / 方向键走 / Esc 回输入框  UX-6 谱尾提示写进面板    UX-7 Esc 未写入提示    UX-8 触屏不抢焦点、≥40
   UX-9 手机贴底抽屉不盖当前列、头部 ≥40    UX-10 1366×768 GP 把位卡 ≥4 张可见    UX-11 读屏    UX-12 文案
   UX-13 指针不动不自发试听    UX-14 连续标注不重算 chordSolve    UX-15 输入框里 Ctrl+Z 撤上一笔
   env：MUSETAB_URL 被测页 · ONLY=H1,TAB-2… 只跑这些组 · SHOTS=目录 存截图。单跑约 3–4 分钟（一个浏览器、各组顺序开页）。 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL0 = process.env.MUSETAB_URL ? (/^file:/.test(process.env.MUSETAB_URL) ? process.env.MUSETAB_URL : 'file://' + path.resolve(process.env.MUSETAB_URL)) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const SHOTS = process.env.SHOTS || '';
const J = x => JSON.stringify(x);
let pass = 0, total = 0; const errs = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅ ' : '❌ ') + id + ' ' + name + (!ok && d != null ? '：' + String(d).slice(0, 1500) : '')); };
const wait = (pg, ms) => pg.waitForTimeout(ms);
const EV = (pg, f, a) => pg.evaluate(f, a).catch(e => ({ __err: e.message }));

function HELP() {
  window.guardReplace = p => p(); window.SF_PLAYWAIT = false; window.J = x => JSON.stringify(x);
  try { hideStartPad(); } catch (_) {}
  window.__one = s => { loadSong(s); undoStack.length = 0; redoStack.length = 0; try { closeModal(); } catch (_) {} render(); return true; };
  window.__V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
  window.__TC = o => Object.assign({ dur: 8, dotted: false, chord: '', notes: [], strum: '', tech: '' }, o || {});
  window.__SND = sh => { const L = sh.length; return [...sh].map((ch, i) => ch === 'x' ? null : { s: L - i, f: parseInt(ch, 36) }).filter(Boolean); };
  /* 吉他弹唱谱：o.degs[mi]＝简谱级数（四分）；o.tab＝'strum'（8 个八分扫弦列，C 指法）| 'arp'（C 分解）；o.nTab / o.nVox / o.key */
  window.__jt = o => { o = o || {};
    const s = createSong(o.inst || 'guitar', { title: '修', key: o.key || 'C', beats: 4, unit: 4, nMea: o.nMea || 2, nTab: o.nTab == null ? 1 : o.nTab, nVox: o.nVox == null ? 1 : o.nVox, lyr: 0 });
    const ARP = [[5, 3], [4, 2], [3, 0], [2, 1], [1, 0], [3, 0], [2, 1], [4, 2]];
    s.measures.forEach((m, mi) => {
      (m.voxes || []).forEach((v, vi) => { const ds = (o.degs && o.degs[mi]) || [1, 3, 5, 1]; m.voxes[vi] = ds.map(d => __V(d, 4)); });
      (m.tabs || []).forEach((t, vi) => { m.tabs[vi] = ARP.map(([st, f], i) => o.tab === 'strum' ? __TC({ strum: 'd', notes: __SND('x32010') }) : __TC({ notes: [{ s: st, f }] })); });
    });
    if (o.mod) o.mod(s);
    return __one(s); };
  window.__sel = (row, mi, ci, vi, q) => { sel = { mi, row, vi: vi || 0, ci, si: 1, q: q || 0 }; selRange = null; render(); __blur(); return true; };
  window.__blur = () => { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); };
  window.__shut = () => { try { if (typeof ckEnd === 'function') ckEnd(true); } catch (_) {} try { closePop(); } catch (_) {} try { closeModal(); } catch (_) {} try { closeSuggest(); } catch (_) {} };
  window.__ch = (row, mi, ci, vi) => { const c = (((song.measures[mi] || {})[row === 'tab' ? 'tabs' : 'voxes'] || [])[vi || 0] || [])[ci]; return c ? (c.chord || '') : null; };
  window.__R = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e) return null; const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height }; };
  window.__col = (row, mi, ci, vi) => { const b = colBoxes[(row === 'tab' ? 't' : 'v') + (vi || 0) + ':' + mi + ':' + ci]; const svg = document.getElementById('score'), vb = svg.viewBox.baseVal, R = svg.getBoundingClientRect(), k = R.width / vb.width;
    return b ? { left: R.left + b.x * k, top: R.top + b.y * k, right: R.left + (b.x + b.w) * k, bottom: R.top + (b.y + b.h) * k } : null; };
  window.__mea = (row, mi, vi) => { const n = (((song.measures[mi] || {})[row === 'tab' ? 'tabs' : 'voxes'] || [])[vi || 0] || []).length; let o = null;
    for (let ci = 0; ci < n; ci++) { const r = __col(row, mi, ci, vi); if (!r) continue; o = o ? { left: Math.min(o.left, r.left), top: Math.min(o.top, r.top), right: Math.max(o.right, r.right), bottom: Math.max(o.bottom, r.bottom) } : r; } return o; };
  window.__ov = (a, b) => (!a || !b) ? 0 : Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  /* 指法判据（测试自带一份，不调被测页的同名函数）：标准调弦发声音级、手指数（横按算一指）、跨度 */
  window.__PC = { C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, F: 5, 'E#': 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11 };
  window.__pcs = (sh, tun) => { const L = sh.length, op = tun || (L === 4 ? [7, 0, 4, 9] : [4, 9, 2, 7, 11, 4]); const S = new Set();
    [...sh].forEach((ch, i) => { if (ch === 'x') return; const o = L === 4 ? op[i] : op[i]; S.add(((o + parseInt(ch, 36)) % 12 + 12) % 12); }); return S; };
  window.__low = (sh, tun) => { const op = tun || [4, 9, 2, 7, 11, 4]; for (let i = 0; i < sh.length; i++) if (sh[i] !== 'x') return ((op[i] + parseInt(sh[i], 36)) % 12 + 12) % 12; return null; };
  window.__span = sh => { const p = [...sh].map(c => c === 'x' ? null : parseInt(c, 36)).filter(v => v != null && v > 0); return p.length ? Math.max(...p) - Math.min(...p) : 0; };
  window.__fing = sh => { const f = [...sh].map(c => c === 'x' ? null : parseInt(c, 36)), pr = []; f.forEach((v, i) => { if (v != null && v > 0) pr.push({ v, i }); });
    if (!pr.length) return 0; let best = pr.length;
    for (const bv of new Set(pr.map(o => o.v))) for (let a = 0; a < f.length; a++) for (let z = a + 1; z < f.length; z++) {
      let ok = true; for (let i = a; i <= z; i++) if (f[i] === 0 || (f[i] != null && f[i] < bv)) { ok = false; break; }
      if (!ok) continue; const cov = pr.filter(o => o.i >= a && o.i <= z && o.v === bv).length; if (cov >= 2) best = Math.min(best, 1 + pr.length - cov); }
    return best; };
  /* 和弦名 → {root, third, sev, bass}（音级） */
  window.__tones = n => { const m = /^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/.exec(n); const r = __PC[m[1]], q = m[2];
    const third = /sus2/.test(q) ? 2 : /sus4|^11/.test(q) ? 5 : /^(m(?!aj)|dim|m7b5)/.test(q) ? 3 : q === '5' ? 7 : 4;
    const sev = /maj7|maj9|mmaj7/.test(q) ? 11 : /dim7/.test(q) ? 9 : /7|9|11|13/.test(q) && !/add9/.test(q) ? 10 : null;
    return { root: r, third: (r + third) % 12, sev: sev == null ? null : (r + sev) % 12, bass: m[3] ? __PC[m[3]] : null }; };
  if (!window.__toastW) { window.__toastW = 1; window.__toasts = []; const t0 = window.toast; window.toast = function (m) { try { __toasts.push(String(m)); } catch (_) {} return t0.apply(this, arguments); }; }
}
async function open(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 }, hasTouch: !!o.touch });
  const pg = await ctx.newPage(); pg.__ctx = ctx;
  pg.on('pageerror', e => errs.push((o.tag || '') + ':' + e.message));
  await pg.goto(o.url || URL0); await wait(pg, 1000);
  await EV(pg, HELP);
  return pg;
}
const close = async pg => { try { await pg.__ctx.close(); } catch (_) {} };
const shot = async (pg, name) => { if (!SHOTS) return; try { fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, name + '.png') }); } catch (_) {} };
const kWrite = async (pg, s, keysAfter) => { await pg.keyboard.press('Control+k'); await wait(pg, 250); await pg.keyboard.press('Control+a'); await pg.keyboard.type(s); await wait(pg, 60); for (const k of (keysAfter || ['Enter'])) { await pg.keyboard.press(k); await wait(pg, 120); } };
const group = async (id, fn) => { if (!want(id)) return; try { await fn(); } catch (e) { T(id, false, id + ' 组异常（没跑完）', String(e && e.message || e).slice(0, 400)); } };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  console.log('被测：' + URL0);

  /* ================= H1 同拍其他行改同名不删 ================= */
  await group('H1', async () => {
    const pg = await open(b, { tag: 'H1' });
    await EV(pg, () => { __jt({ mod: s => { s.measures[1].tabs[0][0].chord = 'C'; } }); __sel('vox', 1, 0); });
    await kWrite(pg, 'Am');
    const a = await EV(pg, () => ({ v: __ch('vox', 1, 0), t: __ch('tab', 1, 0), bass: J(song.measures[1].tabs[0][0].notes), names: [...new Set(chordEvtsMea(1).filter(e => e.beat < 1e-6).map(e => e.chord))].join(',') }));
    T('H1', a.v === 'Am' && a.t === 'Am' && a.names === 'Am' && a.bass === '[{"s":5,"f":0}]', 'H1a 吉他弹唱：六线谱 col0 有 C（C 分解），在简谱同拍写 Am → 两行都是 Am、六线谱低音按 Am 重排到 5 弦空弦（不再清空六线谱留 C 指法）', J(a));
    await EV(pg, () => { __shut(); __one(NWB.build('CG', { title: '测CG', nMea: 4 })); song.measures[1].voxes[0][0].chord = 'C'; render(); __sel('vox', 1, 0, 1); });
    await kWrite(pg, 'Am');
    const c = await EV(pg, () => ({ v0: __ch('vox', 1, 0, 0), v1: __ch('vox', 1, 0, 1) }));
    T('H1', c.v0 === 'Am' && c.v1 === 'Am', 'H1b 钢琴弹唱 CG：右手和弦行同拍有 C，在左手写 Am → 和弦行变 Am（生成织体读得到），不再清空', J(c));
    await EV(pg, () => { __shut(); __jt({ nTab: 2, nVox: 0, tab: 'strum', mod: s => { s.measures[0].tabs[0][0].chord = 'C'; s.measures[0].tabs[1][0].chord = 'C'; } }); __sel('tab', 0, 0, 1); });
    await kWrite(pg, 'Cmaj7');
    const d = await EV(pg, () => ({ t0: __ch('tab', 0, 0, 0), t1: __ch('tab', 0, 0, 1), n0: [...new Set(song.measures[0].tabs[0][0].notes.map(n => (([4, 11, 7, 2, 9, 4][n.s - 1] + n.f) % 12)))].sort().join(',') }));
    T('H1', d.t0 === 'Cmaj7' && d.t1 === 'Cmaj7' && d.n0 === '0,11,4,7'.split(',').sort().join(','), 'H1c 两把吉他：在吉他 2 写 Cmaj7 → 吉他 1 同拍也是 Cmaj7 并按 Cmaj7 重排（不再清空吉他 1）', J(d));
    await close(pg);
  });

  /* ================= H2 和弦名常见记法（两外壳） ================= */
  await group('H2', async () => {
    for (const shell of ['flow', 'classic']) {
      const pg = await open(b, { tag: 'H2' + shell, url: shell === 'classic' ? withQ(URL0, 'shell=classic') : URL0 });
      const res = {};
      for (const [row, inp, exp] of [['vox', 'C6/9', 'C69'], ['vox', 'Cm(maj7)', 'Cmmaj7'], ['vox', 'C+7', 'Caug7'], ['vox', 'Cadd2', 'Cadd9'], ['tab', 'N.C.', 'N.C.']]) {
        await EV(pg, r => { __shut(); __jt(); __sel(r, 0, 0); }, row);
        await kWrite(pg, inp);
        res[inp] = await EV(pg, (r) => __ch(r, 0, 0), row);
      }
      const okA = res['C6/9'] === 'C69' && res['Cm(maj7)'] === 'Cmmaj7' && res['C+7'] === 'Caug7' && res['Cadd2'] === 'Cadd9' && res['N.C.'] === 'N.C.';
      T('H2', okA, 'H2a ' + shell + '：Ctrl+K 键入 C6/9→C69、Cm(maj7)→Cmmaj7、C+7→Caug7、Cadd2→Cadd9、六线谱 N.C. 原样，回车一次就写入（v68.8 也能写）', J(res));
      await EV(pg, () => { __shut(); __jt(); __sel('vox', 0, 0); });
      await kWrite(pg, 'Hzz9');
      const g1 = await EV(pg, () => ({ c: __ch('vox', 0, 0), err: (document.getElementById('ck-err') || {}).textContent || '' }));
      await pg.keyboard.press('Enter'); await wait(pg, 150);
      const g2 = await EV(pg, () => __ch('vox', 0, 0));
      T('H2', g1.c === '' && /认不出/.test(g1.err) && g2 === 'Hzz9', 'H2b ' + shell + '：认不出的 Hzz9 第一次回车就地提示不写，同一个值再按回车照写（自由文本）', J({ g1, g2 }));
      await close(pg);
    }
    const pg = await open(b, { tag: 'H2c' });
    await EV(pg, () => { __jt({ mod: s => { s.measures[0].voxes[0][1].chord = 'C6/9'; } }); __sel('vox', 0, 0); });
    await pg.keyboard.press('Control+k'); await wait(pg, 250);
    await pg.keyboard.press('Space'); await wait(pg, 200); await pg.keyboard.press('Space'); await wait(pg, 200);
    const c = await EV(pg, () => ({ ci: sel.ci, loc: (document.getElementById('ck-loc') || {}).textContent, v1: __ch('vox', 0, 1) }));
    T('H2', c.ci === 2 && c.v1 === 'C6/9', 'H2c 连续标注经过谱里已有的 C6/9（值没改）按空格照常前进到第 3 拍，不原地报错卡住、原值不动', J(c));
    await close(pg);
  });

  /* ================= H3 / TAB-1 / TAB-4 默认斜杠指法 ================= */
  await group('H3', async () => {
    const pg = await open(b, { tag: 'H3' });
    const r = await EV(pg, () => { __jt({ nVox: 0 });
      const R = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'], Q = ['', 'm', '7', 'maj7', 'm7', 'sus4', 'sus2', 'add9', '6', '9'];
      const N = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'], bad = []; let n = 0;
      R.forEach(rt => Q.forEach(q => { const t = __tones(rt + q); [t.third, (t.root + 7) % 12].concat(t.sev != null ? [t.sev] : []).forEach(bp => {
        if (bp === t.root) return; const name = rt + q + '/' + N[bp]; const sh = chordShape(name); n++;
        const S = sh ? __pcs(sh) : new Set();
        const ok = sh && __low(sh) === bp && S.has(t.root) && (/sus/.test(q) || S.has(t.third)) && (t.sev == null || S.has(t.sev)) && __span(sh) <= 3 && __fing(sh) <= 4;
        if (!ok) bad.push(name + '=' + sh); }); }));
      const named = {}; ['Am7/C', 'A7/C#', 'Bb7/D', 'Cmaj7/B', 'Cm/Eb', 'Gm/Bb', 'Esus2/B'].forEach(x => { named[x] = chordShape(x); });
      return { n, bad: bad.length, sample: bad.slice(0, 12), named }; });
    T('H3', r.n >= 280 && r.bad === 0, 'H3a 默认斜杠指法枚举（12 根音 × 10 类型 × 三音 / 五音 / 七音作低音，' + r.n + ' 组）：最低音＝低音、根音 / 三音 / 七音都在、跨度 ≤3、≤4 指', J(r));
    const m = r.named || {};
    const has = (sh, pcs) => { const S = new Set(); [...(sh || '')].forEach((ch, i) => { if (ch !== 'x') S.add(([4, 9, 2, 7, 11, 4][i] + parseInt(ch, 36)) % 12); }); return pcs.every(p => S.has(p)); };
    T('H3', has(m['Am7/C'], [9, 0, 7]) && has(m['A7/C#'], [9, 1, 7]) && has(m['Bb7/D'], [10, 2, 8]) && has(m['Cmaj7/B'], [0, 4, 11]) && has(m['Cm/Eb'], [0, 3]) && has(m['Gm/Bb'], [7, 10]) && has(m['Esus2/B'], [4, 6]),
      'H3b 验收点名的错图：Am7/C 含 A、A7/C# 含 A、B♭7/D 含 B♭、Cmaj7/B 含 C、Cm/E♭ 与 Gm/B♭ 可弹、Esus2/B 不再 x29977', J(m));
    /* 老谱只有扫弦箭头的列按指法补音：Am7/C 发声里有 A */
    const im = await EV(pg, () => { const c = { dur: 4, strum: 'd', notes: [], chord: 'Am7/C' }; const ns = chordImpliedNotes(c, chordShape('Am7/C')) || []; return [...new Set(ns.map(n => ([4, 11, 7, 2, 9, 4][n.s - 1] + n.f) % 12))].sort((x, y) => x - y).join(','); });
    T('H3', typeof im === 'string' && im.split(',').map(Number).includes(9), 'H3c 老谱扫弦列按 Am7/C 补音含根音 A（播放 / MIDI / MusicXML 共用这一份）', im);
    await close(pg);
  });

  /* ================= TAB-3 / TAB-13 把位卡 ================= */
  await group('TAB-3', async () => {
    const pg = await open(b, { tag: 'TAB-3' });
    const r = await EV(pg, () => { __jt({ nVox: 0 }); const o = {};
      for (const n of ['C7/D', 'Cmaj7/B', 'Cm/Eb', 'Gm/Bb', 'Am7/C', 'C/C#', 'C7/Ab']) {
        song.measures[0].tabs[0][0].chord = n; closeModal(); showChordEditor(0, 0, 0); song.measures[0].tabs[0][0].chord = '';
        const t = __tones(n), cs = [...document.querySelectorAll('#ce-pos [data-cpos]')].map(c => c.dataset.shape);
        o[n] = { n: cs.length, bad: cs.filter(sh => !(__low(sh) === t.bass && __pcs(sh).has(t.root) && __fing(sh) <= 4 && __span(sh) <= 3)) };
        closeModal(); }
      return o; });
    const ok = Object.values(r).every(x => x.n >= 3 && !x.bad.length);
    T('TAB-3', ok, 'TAB-3 斜杠把位卡（C7/D、Cmaj7/B、Cm/E♭、Gm/B♭、Am7/C、C/C#、C7/A♭）：每张最低音＝低音、含根音、≤4 指、跨度 ≤3（钉住的「常用」卡也算），各 ≥3 张', J(r));
    const r2 = await EV(pg, () => { const o = {};
      for (const n of ['C', 'G', 'Am', 'F', 'Bm', 'C6', 'Cadd9', 'Cmaj9']) {
        song.measures[0].tabs[0][0].chord = n; closeModal(); showChordEditor(0, 0, 0); song.measures[0].tabs[0][0].chord = '';
        const t = __tones(n), cs = [...document.querySelectorAll('#ce-pos [data-cpos]')].map(c => ({ sh: c.dataset.shape, lab: (c.querySelector('.bt') || {}).textContent || '' }));
        o[n] = { n: cs.length, bad: cs.filter(c => !/开放|常用/.test(c.lab) && !(__pcs(c.sh).has(t.root) && __pcs(c.sh).has(t.third) && __fing(c.sh) <= 4 && __span(c.sh) <= 3)).map(c => c.sh + ' ' + c.lab) };
        closeModal(); }
      return o; });
    T('TAB-13', Object.entries(r2).every(([k, x]) => (['C', 'G', 'Am', 'F', 'Bm'].includes(k) ? x.n >= 6 : x.n >= 3) && !x.bad.length), 'TAB-13 原位和弦把位卡：库图以外的卡（CAGED / 推导）都含根音与三音、≤4 指、跨度 ≤3；C G Am F Bm ≥6 张', J(r2));
    await close(pg);
  });

  /* ================= TAB-2 连续标注重排以本列生效和弦为准 ================= */
  await group('TAB-2', async () => {
    const pg = await open(b, { tag: 'TAB-2' });
    await EV(pg, () => { __jt({ nVox: 0, tab: 'strum', mod: s => { s.measures[0].tabs[0][0].chord = 'C'; } }); __sel('tab', 0, 0); });
    await pg.keyboard.press('Control+k'); await wait(pg, 300);
    for (const k of ['C', 'Space', 'G', 'Space', 'C', 'Space', 'G', 'Enter']) { if (k.length === 1) await pg.keyboard.type(k); else await pg.keyboard.press(k); await wait(pg, 350); }
    const a = await EV(pg, () => { const cols = song.measures[0].tabs[0], pc = c => [...new Set(c.notes.map(n => ([4, 11, 7, 2, 9, 4][n.s - 1] + n.f) % 12))].sort((x, y) => x - y).join(',');
      return { ch: cols.map(c => c.chord || '-').join(' '), c4: pc(cols[4]), c5: pc(cols[5]), c6: pc(cols[6]) }; });
    T('TAB-2', a.ch === 'C - G - C - G -' && a.c4 === '0,4,7' && a.c5 === '0,4,7' && a.c6 === '2,7,11', 'TAB-2a 扫弦小节连续标注 C␣G␣C␣G：第 3 个 C 所在的第 4–5 列按 C 重排（此前以本小节第一个和弦为旧形、不重排，仍是 G 音）', J(a));
    await EV(pg, () => { __shut(); __jt({ nVox: 0, mod: s => { const c = s.measures[0].tabs[0]; c[0].chord = 'C'; c[4].chord = 'Am'; c[4].notes = [{ s: 5, f: 0 }]; c[5].notes = [{ s: 3, f: 2 }]; c[6].notes = [{ s: 2, f: 1 }]; c[7].notes = [{ s: 4, f: 2 }]; } }); __sel('tab', 0, 4); });
    await kWrite(pg, 'G');
    const c = await EV(pg, () => J(song.measures[0].tabs[0][4].notes));
    T('TAB-2', c === '[{"s":6,"f":3}]', 'TAB-2b 分解小节第 4 列 Am（5 弦空弦起）改 G：低音认对、落到 6 弦 3 品（此前以 C 为旧形，5 弦改成 2 品＝B）', c);
    await close(pg);
  });

  /* ================= TAB-5 试听计夹位 ================= */
  await group('TAB-5', async () => {
    const pg = await open(b, { tag: 'TAB-5' });
    const r = await EV(pg, () => { __jt({ nVox: 0, nTab: 2, tab: 'strum', mod: s => { s.capo = 3; s.tabCapos = [null, 5]; s.measures[0].tabs[0][0].chord = 'C'; s.measures[0].tabs[1][0].chord = 'C'; } });
      window.__mid = []; window.ensureLiveCtx = () => ({ currentTime: 0 }); window.buildBus = () => ({}); window.playInst = (ins, ctx, bus, f) => { __mid.push(Math.round(12 * Math.log2(f / 440) + 69)); };   /* v69.4 试听与主播放同为实音（此前低 12、这里补 +12） */
      const o = {};
      __sel('tab', 0, 0, 0); showChordEditor(0, 0, 0); document.getElementById('ce-play').click(); o.t1 = __mid.slice(); __mid.length = 0; closeModal();
      __sel('tab', 0, 0, 1); showChordEditor(0, 0, 1); document.getElementById('ce-play').click(); o.t2 = __mid.slice(); __mid.length = 0; closeModal();
      return o; });
    T('TAB-5', J(r.t1) === J([51, 55, 58, 63, 67]) && J(r.t2) === J([53, 57, 60, 65, 69]), 'TAB-5 GP ▶ 试听：整谱夹 3 品 → C 的 x32010 发 [51,55,58,63,67]（主播放同口径 +3）；第 2 轨本轨夹 5 品 → +5', J(r));
    await close(pg);
  });

  /* ================= TAB-6 尤克里里斜杠 ================= */
  await group('TAB-6', async () => {
    const pg = await open(b, { tag: 'TAB-6' });
    const r = await EV(pg, () => { __jt({ inst: 'uku', nVox: 0, tab: 'strum', mod: s => { s.measures[0].tabs[0].forEach(c => { c.notes = __SND('0003'); }); s.measures[0].tabs[0][0].chord = 'C'; } });
      song.measures[0].tabs[0][0].chord = 'C/G'; render(); __sel('tab', 0, 0); showChordEditor(0, 0, 0);
      const sh = ceShape(); const allowed = new Set([0, 4, 7]);
      document.getElementById('ce-ok').click();
      const ns = song.measures[0].tabs[0][0].notes.map(n => ([9, 4, 0, 7][n.s - 1] + n.f) % 12);
      return { sh, len: sh && sh.length, ok: !!sh && [...__pcs(sh)].every(p => allowed.has(p)), cc: J(song.customChords || {}), notes: ns, nok: ns.every(p => allowed.has(p)) }; });
    T('TAB-6', r.len === 4 && r.ok && !/C\/G/.test(r.cc) && r.nok, 'TAB-6 尤克里里 C/G 的 GP 默认图是 4 位、只含 C E G（此前 3003 含 B♭）；「应用」不写 customChords、第 0 列没有 B♭', J(r));
    await close(pg);
  });

  /* ================= TAB-7 / TAB-8 GP 装入自定义 · 应用不冻结 ================= */
  await group('TAB-7', async () => {
    const pg = await open(b, { tag: 'TAB-7' });
    const r = await EV(pg, () => { const j = () => { const s = JSON.parse(JSON.stringify(song)); delete s.chordRecent; return JSON.stringify(s); }; const o = {};
      __jt({ nVox: 0, tab: 'strum', mod: s => { s.customChords = { 'Am7/G': '3x2010' }; s.measures[0].tabs[0][0].chord = 'Am7/G'; s.measures[0].tabs[0].forEach(c => { c.notes = __SND('3x2010'); }); } });
      __sel('tab', 0, 0); let j0 = j(); showChordEditor(0, 0, 0); o.big = ceState.custom; document.getElementById('ce-ok').click(); o.same1 = j() === j0; o.cc1 = J(song.customChords);
      __jt({ nVox: 0, tab: 'strum', mod: s => { s.customChords = { '我的C': 'x3555x' }; s.measures[0].tabs[0][0].chord = '我的C'; s.measures[0].tabs[0].forEach(c => { c.notes = __SND('x3555x'); }); } });
      __sel('tab', 0, 0); j0 = j(); showChordEditor(0, 0, 0); o.name = ceName(); document.getElementById('ce-ok').click(); o.same2 = j() === j0; o.ch2 = __ch('tab', 0, 0);
      return o; });
    T('TAB-7', r.big === '3x2010' && r.same1 && r.name === '我的C' && r.same2 && r.ch2 === '我的C', 'TAB-7 GP 打开本谱自定义的 Am7/G（3x2010）与自命名「我的C」：原样装入，什么都不动点「应用」song 不变（不再覆盖成 302010、不把名字改成 C）', J(r));
    const r2 = await EV(pg, () => { const o = {};
      __jt({ nVox: 0, tab: 'strum', mod: s => { s.measures[0].tabs[0][0].chord = 'C'; } }); __sel('tab', 0, 0);
      for (const n of ['Am7/G', 'Cmaj9', 'Dm/C']) { song.measures[0].tabs[0][0].chord = n; showChordEditor(0, 0, 0); document.getElementById('ce-ok').click(); }
      o.cc = J(song.customChords || {});
      song.measures[0].tabs[0][0].chord = 'G/F#'; showChordEditor(0, 0, 0); const on = document.querySelector('#ce-pos .pat-card.on'); o.on = on ? on.dataset.shape : (ceState.custom || ceShape()); o.cur = ceShape(); closeModal();
      return o; });
    T('TAB-8', r2.cc === '{}' && r2.cur === '2x0003', 'TAB-8 没动指法点「应用」不把默认图冻结进 customChords（Am7/G、Cmaj9、Dm/C）；G/F# 当前指法＝库图 2x0003（此前拼出 220003、应用会改掉谱面图）', J(r2));
    await close(pg);
  });

  /* ================= TAB-9 同名改指法整轨重排 ================= */
  await group('TAB-9', async () => {
    const pg = await open(b, { tag: 'TAB-9', q: '' });
    await EV(pg, () => { __jt({ nVox: 0, tab: 'strum', mod: s => { s.measures[0].tabs[0][0].chord = 'C'; s.measures[1].tabs[0][0].chord = 'C'; } }); __sel('tab', 0, 0); });
    await pg.keyboard.press('Control+k'); await wait(pg, 350);
    const ok = await EV(pg, () => { const c = [...document.querySelectorAll('#ce-pos [data-cpos]')].find(x => x.dataset.shape === 'x35553'); if (!c) return false; c.click(); return true; });
    await wait(pg, 200);
    if (ok) { await pg.click('#ce-ok'); await wait(pg, 200); }
    const r = await EV(pg, () => { const nz = ns => J(ns.map(n => ({ s: n.s, f: n.f }))); return { m0: nz(song.measures[0].tabs[0][0].notes), m1: nz(song.measures[1].tabs[0][0].notes), exp: J(__SND('x35553')), cc: (song.customChords || {}).C }; });
    T('TAB-9', ok && r.cc === 'x35553' && r.m0 === r.exp && r.m1 === r.exp, 'TAB-9 第 1 小节 C 选 A 型把位卡 x35553 应用：customChords.C 改了，第 2 小节同名 C 的扫弦音也按 x35553 重排（此前图变音不变）', J(r));
    await close(pg);
  });

  /* ================= TAB-10 重排终点含简谱锚定和弦 ================= */
  await group('TAB-10', async () => {
    const pg = await open(b, { tag: 'TAB-10' });
    await EV(pg, () => { __jt({ tab: 'strum', mod: s => { s.measures[0].tabs[0][0].chord = 'C'; s.measures[0].voxes[0][2].chord = 'G'; } }); __sel('tab', 0, 0); });
    const before = await EV(pg, () => J(song.measures[0].tabs[0].slice(4).map(c => c.notes)));
    await kWrite(pg, 'Am');
    const r = await EV(pg, (b0) => ({ head: J(song.measures[0].tabs[0][0].notes.map(n => ({ s: n.s, f: n.f }))), tail: J(song.measures[0].tabs[0].slice(4).map(c => c.notes)) === b0, at4: chordAtCol(0, 0, 4) }), before);
    T('TAB-10', r.head === J([{ s: 5, f: 0 }, { s: 4, f: 2 }, { s: 3, f: 2 }, { s: 2, f: 1 }, { s: 1, f: 0 }]) && r.tail && r.at4 === 'G', 'TAB-10 简谱第 3 拍锚定 G：六线谱第 0 列改 Am 只重排到第 3 拍之前，第 4–7 列（G 管辖）不动', J(r));
    await close(pg);
  });

  /* ================= TAB-11 本轨夹位芯片 ================= */
  await group('TAB-11', async () => {
    const pg = await open(b, { tag: 'TAB-11' });
    await EV(pg, () => { __jt({ nVox: 0, nTab: 2, tab: 'strum', mod: s => { s.capo = 3; s.tabCapos = [null, 5]; } }); __sel('tab', 0, 0, 1); });
    await pg.keyboard.press('Control+k'); await wait(pg, 350);
    const r = await EV(pg, () => ({ kin: [...document.querySelectorAll('[data-ckk]')].map(x => x.dataset.ckk).join(' '), key: (document.getElementById('ck-key') || {}).textContent || '' }));
    T('TAB-11', /^Bb Cm Dm Eb F F7 Gm Adim$/.test(r.kin) && r.key === '1=Bb', 'TAB-11 整谱 1=C 夹 3 品、第 2 轨夹 5 品：第 2 轨 GP 级数行按本轨指法调 B♭ 给（B♭ Cm Dm E♭ F F7 Gm Adim），头部 1=Bb', J(r));
    await close(pg);
  });

  /* ================= TAB-12 Drop D ================= */
  await group('TAB-12', async () => {
    const pg = await open(b, { tag: 'TAB-12' });
    const r = await EV(pg, () => { __jt({ nVox: 0, mod: s => { s.tuning = [64, 59, 55, 50, 45, 38]; } });
      const tun = [38, 45, 50, 55, 59, 64].map(m => m % 12), G = chordShape('G'), DF = chordShape('D/F#');
      return { G, gp: [...__pcs(G, tun)].sort((a, b) => a - b).join(','), DF, low: __low(DF, tun), std: (() => { song.tuning = undefined; const x = chordShape('G'); return x; })() }; });
    T('TAB-12', r.gp === '2,7,11' && r.low === 6 && r.std === '320003', 'TAB-12 Drop D：G 的图按实际定弦只发 G B D（6 弦挪 2 品）、D/F# 最低音是 F#；标准定弦 G 仍是 320003', J(r));
    await close(pg);
  });

  /* ================= H4 / H5 / H14 构建器拼写 ================= */
  await group('H4', async () => {
    const pg = await open(b, { tag: 'H4' });
    const EXP = { C: 'C D E F G A B', 'C#': 'C# D# E# F# G# A# B#', D: 'D E F# G A B C#', Eb: 'Eb F G Ab Bb C D', E: 'E F# G# A B C# D#', F: 'F G A Bb C D E', 'F#': 'F# G# A# B C# D# E#', G: 'G A B C D E F#', Ab: 'Ab Bb C Db Eb F G', A: 'A B C# D E F# G#', Bb: 'Bb C D Eb F G A', B: 'B C# D# E F# G# A#' };
    const r = await EV(pg, (EXP) => { const o = {}, bad = [];
      for (const k of Object.keys(EXP)) { __shut(); __jt({ key: k }); __sel('vox', 0, 0); chordOpen({ src: 't' });
        const btn = [...document.querySelectorAll('#popmenu [data-vd]')].filter(x => +x.dataset.vd >= 0);
        const names = btn.map(x => (x.querySelector('small') || {}).textContent).join(' '), fn = btn.every(x => !!x.dataset.fn);
        const key = (document.getElementById('ck-key') || {}).textContent || '';
        if (names !== EXP[k] || !fn) bad.push(k + ':' + names + (fn ? '' : ' 缺色标'));
        o[k] = key; }
      return { bad, keys: o }; }, EXP);
    T('H4', r.bad && !r.bad.length, 'H4 12 个调的级数构建器 7 格按调号拼写（1=E 的 3 级 G♯、1=C♯ 的 3 级 E♯…）且每格都有 T/S/D 色标', J(r.bad));
    T('H14', r.keys && r.keys.E === '1=E' && r.keys.C === '1=C', 'H14 构建器头部带调名（1=E）', J(r.keys));
    const r5 = await EV(pg, () => { const bad = [];
      for (const k of ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']) { song.key = k; for (let st = 0; st < 12; st++) { const n = vcBassName(st); if (__PC[n] !== (__PC[k] + st) % 12) bad.push(k + '/' + st + '=' + n); } }
      song.key = 'C'; return bad; });
    T('H5', Array.isArray(r5) && !r5.length, 'H5 12 调 × 12 个转位低音：写出的低音音高＝主音＋半音数（1=A 的 /b7＝G，不再 A/A）', J(r5));
    await close(pg);
  });

  /* ================= H6 / H12 换调 ================= */
  await group('H6', async () => {
    const pg = await open(b, { tag: 'H6' });
    /* E7/G# 不在逐字对拍里：移到 C♯ / F♯ / B 调时 ♯5 要写重升（G##），拼写器只出单升降、退回等音（级数显示 b6），另断言音高不变 */
    const r = await EV(pg, () => { const CH = ['C', 'Dm', 'Em', 'F', 'G', 'G7', 'Am', 'Bdim', 'C/E', 'G/B', 'D7', 'E7', 'A7', 'Bb', 'Ab', 'Eb', 'Fm', 'Am/G', 'F/A', 'E7/G#'];
      const bad = [];
      for (let d = 1; d < 12; d++) {
        __jt({ nMea: 5, nTab: 0, mod: s => { let i = 0; s.measures.forEach(m => m.voxes[0].forEach(c => { if (i < CH.length) c.chord = CH[i++]; })); s.chordRecent = ['C', 'G', 'Am', 'F']; } });
        const deg0 = []; song.measures.forEach(m => m.voxes[0].forEach(c => { if (c.chord) deg0.push(chordDegree(c.chord)); }));
        transposeSong(song, d);
        const deg1 = [], nm = []; song.measures.forEach(m => m.voxes[0].forEach(c => { if (c.chord) { deg1.push(chordDegree(c.chord)); nm.push(c.chord); } }));
        const kp0 = 0, kp1 = __PC[song.key], pcOf = n => { const m = /^([A-G](?:#|b)?)[^/]*(?:\/([A-G](?:#|b)?))?$/.exec(n); return [__PC[m[1]], m[2] ? __PC[m[2]] : null]; };
        nm.forEach((x, i) => { const a = pcOf(CH[i]), c = pcOf(x); if ((a[0] + d) % 12 !== c[0] || (a[1] != null && (a[1] + d) % 12 !== c[1])) bad.push(song.key + ':音高 ' + x); });
        if (J(deg0.slice(0, 19)) !== J(deg1.slice(0, 19))) bad.push(song.key + ':' + nm.filter((x, i) => i < 19 && deg0[i] !== deg1[i]).join(','));
        if (d === 9) window.__rec = (song.chordRecent || []).join(' ');
      }
      return { bad, rec: window.__rec }; });
    T('H6', r.bad && !r.bad.length, 'H6 C 调 19 个和弦（含副属 / 借用 / 斜杠）换到 11 个调：谱面级数一个不变（C→E 的 Em→G♯m、G/B→B/D♯）；20 个和弦音高都对', J(r.bad));
    T('H12', r.rec === 'A E F#m D', 'H12 换调（C→A）后常用行的最近使用跟着移调：C G Am F → A E F#m D', J(r.rec));
    await close(pg);
  });

  /* ================= H7 / H8 / H13 建议 ================= */
  await group('H7', async () => {
    const pg = await open(b, { tag: 'H7' });
    const r = await EV(pg, () => { const o = {};
      __jt({ nVox: 0, mod: s => { s.mode = 'minor'; s.measures[0].tabs[0][0].chord = 'E'; } });
      o.minor = chordNextRank({ row: 'tab', mi: 1, vi: 0, ci: 0, q: 0 }, 3).map(x => x.name + '/' + x.fl).join(' ');
      __jt({ nVox: 0, mod: s => { s.measures[0].tabs[0][0].chord = 'D7'; } });
      o.secTab = chordNextRank({ row: 'tab', mi: 1, vi: 0, ci: 0, q: 0 }, 3).map(x => x.name).join(' ');
      __jt({ nVox: 0, mod: s => { s.measures[0].tabs[0][0].chord = 'Bdim'; } });
      o.dimTab = chordNextRank({ row: 'tab', mi: 1, vi: 0, ci: 0, q: 0 }, 3).map(x => x.name).join(' ');
      __jt({ nTab: 0, degs: [[1, 3, 5, 1], [2, 4, 6, 2], [5, 7, 2, 5], [1, 1, 1, 1]], nMea: 4, mod: s => { const c = s.measures[1].voxes[0][1]; c.acc = '#'; } });
      o.melSec = chordNextRank({ row: 'vox', mi: 1, vi: 0, ci: 0, q: 0 }, 3).map(x => x.name).join(' ');
      __jt({ nTab: 0, degs: [[1, 3, 5, 1], [5, 7, 2, 5], [1, 3, 5, 3]], nMea: 3, mod: s => { s.measures[0].voxes[0][0].chord = 'C'; s.measures[1].voxes[0][0].chord = 'G'; } });
      const L = chordNextRank({ row: 'vox', mi: 2, vi: 0, ci: 2, q: 0 }, 3), keys = L.map(x => { const t = chordTones(x.name); return t.pc + (t.iv[3] === 3 ? 'm' : 'M'); });
      o.dup = { names: L.map(x => x.name).join(' '), uniq: new Set(keys).size === keys.length, noPrev: L.every(x => x.name !== 'G') };
      return o; });
    T('H7', /^Am\/t /.test(r.minor) && !/\/[TSD](?![a-z])/.test(r.minor.replace(/\/D/g, '')), 'H7 小调纯六线谱（song.mode=minor，前一和弦 E）：建议走小调口径，Am 排第一、功能字母小写 t / s（属 D）', r.minor);
    T('H8', /^G( |$)/.test(r.secTab) && /^C( |$)/.test(r.dimTab) && r.melSec.split(' ').includes('D7'), 'H8 前一和弦是副属 D7 → 建议第 1 名 G；Bdim → C；旋律含 ♯4（2 ♯4 6 2）→ D7 进前 3', J(r));
    T('H13', r.dup.uniq && r.dup.noPrev, 'H13 建议同根同性质只留一个（G / G7 不同时占格）、不推荐与前一和弦相同的', J(r.dup));
    await close(pg);
  });

  /* ================= H9 小调构建器 ================= */
  await group('H9', async () => {
    const pg = await open(b, { tag: 'H9' });
    const r = await EV(pg, () => { __jt({ degs: [[6, 1, 3, 6], [3, 5, 7, 3]], mod: s => { s.mode = 'minor'; } }); __sel('vox', 0, 0); chordOpen({ src: 't' });
      const row = id => [...document.querySelectorAll('#' + id + ' [data-ckx]')].map(x => x.dataset.ckx).join(' ');
      return { hm: row('ck-hm'), out: row('ck-out') }; });
    T('H9', r.hm === 'E E7' && r.out === 'A7 B7 A Bb D', 'H9 小调构建器：和声小调属 E / E7 单列「和声」行（不叫调外）；调外补 A7（V/iv）B7（重属）A（皮卡第三）B♭（那不勒斯）D（多利亚）', J(r));
    await close(pg);
  });

  /* ================= H10 / H11 拼法 ================= */
  await group('H10', async () => {
    const pg = await open(b, { tag: 'H10' });
    const r = await EV(pg, () => { __jt({ key: 'E', nVox: 0, mod: s => { s.measures[0].tabs[0][0].chord = 'E'; } }); __sel('tab', 0, 0); showChordEditor(0, 0, 0);
      const o = { bass: [...document.querySelectorAll('#ce-bass option')].map(x => x.value).filter(Boolean).join(' '), roots: [...document.querySelectorAll('[data-cr]')].map(x => x.dataset.cr).join(' ') }; closeModal();
      const bor = k => { song.key = k; return chordKeyChords(null).filter(x => x.kind === 'bor').map(x => x.lab + '=' + x.name + '(' + chordDegree(x.name) + ')').join(' '); };
      o.Eb = bor('Eb'); o.Ab = bor('Ab'); o.Cs = bor('C#'); song.key = 'E'; return o; });
    T('H10', /D#/.test(r.bass) && /D#/.test(r.roots) && !/Eb/.test(r.bass), 'H10 1=E 的 GP 低音下拉与主音行按 ♯ 系（能选 /D#，写成 E/D# 级数 1/7）', J(r));
    T('H11', /♭6=Cb\(b6\)/.test(r.Eb) && /♭3=Cb\(b3\)/.test(r.Ab) && /4m=F#m\(4m\)/.test(r.Cs), 'H11 借用和弦按级数字母拼：1=E♭ 的 ♭6＝C♭（谱面级数 b6，不再 #5）、1=A♭ 的 ♭3＝C♭、1=C♯ 的 4m＝F♯m', J(r));
    await close(pg);
  });

  /* ================= UX-1 GP 连续标注不盖当前列 ================= */
  await group('UX-1', async () => {
    const out = {};
    for (const [w, h] of [[1440, 900], [1366, 768], [1280, 800]]) {
      const pg = await open(b, { tag: 'UX-1', w, h });
      await EV(pg, () => { __jt({ nMea: 8, tab: 'strum' }); __sel('tab', 0, 0); });
      await pg.keyboard.press('Control+k'); await wait(pg, 350);
      let bad = 0, cov = 0; const log = [];
      for (let i = 0; i < 8; i++) {
        const g = await EV(pg, () => { const md = __R('#modal-mask .modal'), c = __col('tab', sel.mi, sel.ci, 0), W = md.w, vw = innerWidth;
          const hit = (l) => !(l + W <= c.left || l >= c.right);
          return { cov: __ov(md, c) > 0, avoid: !hit(16) || !hit(vw - 16 - W), mi: sel.mi }; });
        if (g.cov) cov++; if (g.cov && g.avoid) bad++; log.push(g.mi + (g.cov ? '×' : '✓'));
        await pg.keyboard.type('C'); await pg.keyboard.press('Tab'); await wait(pg, 350);
      }
      out[w + 'x' + h] = { bad, cov, log: log.join(' ') };
      if (w === 1366) await shot(pg, 'UX-1-gp-1366');
      await close(pg);
    }
    T('UX-1', Object.values(out).every(x => x.bad === 0), 'UX-1 GP 连续标注 8 小节（1440 / 1366 / 1280）：能避开时当前列一次都不被弹窗盖住（钉住的位置盖住新列就换边）', J(out));
  });

  /* ================= UX-2 / UX-3 构建器定位 ================= */
  await group('UX-2', async () => {
    const pg = await open(b, { tag: 'UX-2' });
    await EV(pg, () => { __jt({ nMea: 8 }); __sel('vox', 0, 0); });
    await pg.keyboard.press('Control+k'); await wait(pg, 350);
    const st = []; let prev = null, moves = 0;
    for (let i = 0; i < 8; i++) {
      const g = await EV(pg, () => { const p = __R('#popmenu'), m = __mea('vox', sel.mi, 0); return { ov: Math.round(__ov(p, m)), l: Math.round(p.left), t: Math.round(p.top), mi: sel.mi }; });
      st.push(g); if (prev && (Math.abs(prev.l - g.l) > 2 || Math.abs(prev.t - g.t) > 2)) moves++; prev = g;
      await pg.keyboard.type('C'); await pg.keyboard.press('Space'); await wait(pg, 250); await pg.keyboard.type('G'); await pg.keyboard.press('Tab'); await wait(pg, 300);
    }
    await shot(pg, 'UX-2-builder');
    T('UX-2', st.every(x => x.ov === 0) && moves <= 5, 'UX-2 构建器连续标注 8 小节（1440×900）：每一步当前小节与面板重叠面积 0；同一小节里不挪、整段挪动 ≤5 次', J({ moves, st }));
    await EV(pg, () => { __shut(); __jt({ nMea: 4 }); __sel('vox', 0, 0); });
    await pg.keyboard.press('Control+k'); await wait(pg, 350);
    const nx = await EV(pg, () => { const r = __R('#popmenu [data-ckstep="1"]'); return { x: r.left + r.w / 2, y: r.top + r.h / 2 }; });
    const seq = [];
    for (let i = 0; i < 3; i++) { await pg.mouse.click(nx.x, nx.y); await wait(pg, 250); seq.push(await EV(pg, () => sel.mi * 10 + sel.ci)); }
    T('UX-3', seq[0] === 1 && seq[1] === 2 && seq[2] === 3, 'UX-3 鼠标停在 › 上连点 3 次：拍位 c1→c2→c3 单调前进（此前第 2 下点中挪过来的 ‹ 退回）', J(seq));
    await close(pg);
  });

  /* ================= UX-4 / UX-6 / UX-7 / UX-15 键盘 ================= */
  await group('UX-4', async () => {
    const pg = await open(b, { tag: 'UX-4' });
    await EV(pg, () => { __jt(); __sel('vox', 0, 0); });
    await pg.keyboard.press('Control+k'); await wait(pg, 300);
    await pg.keyboard.press('ArrowDown'); await wait(pg, 80);
    const a = await EV(pg, () => { const e = document.activeElement; return { vd: e && e.dataset ? e.dataset.vd : null, tag: e && e.tagName }; });
    await pg.keyboard.press('ArrowRight'); await wait(pg, 60);
    const a2 = await EV(pg, () => { const e = document.activeElement; return e && e.dataset ? e.dataset.vd : null; });
    await pg.keyboard.press('Escape'); await wait(pg, 80);
    const a3 = await EV(pg, () => ({ inp: document.activeElement && document.activeElement.id, open: !!document.getElementById('popmenu') }));
    await pg.keyboard.press('Escape'); await wait(pg, 120);
    const a4 = await EV(pg, () => !!document.getElementById('popmenu'));
    T('UX-4', a.vd === '0' && a2 === '1' && a3.inp === 'ck-in' && a3.open && !a4, 'UX-4 #ck-in 按 ↓ 进面板第一个级数格、→ 到下一格；面板里 Esc 回输入框、再按 Esc 才关', J({ a, a2, a3, a4 }));
    await EV(pg, () => { __shut(); __jt({ nMea: 1 }); __sel('vox', 0, 3); });
    await pg.keyboard.press('Control+k'); await wait(pg, 300); await pg.keyboard.press('Space'); await wait(pg, 150);
    const b6 = await EV(pg, () => { const e = document.getElementById('ck-err'); return { t: e && !e.hidden ? e.textContent : '', open: !!document.getElementById('popmenu') }; });
    T('UX-6', b6.t === '已到最后' && b6.open, 'UX-6 谱末按空格：「已到最后」写进面板里（底部提示条被面板盖住）', J(b6));
    await EV(pg, () => { __shut(); __jt(); __sel('vox', 0, 0); __toasts.length = 0; });
    await pg.keyboard.press('Control+k'); await wait(pg, 300); await pg.keyboard.type('C'); await pg.keyboard.press('Tab'); await wait(pg, 250); await pg.keyboard.type('G'); await pg.keyboard.press('Escape'); await wait(pg, 200);
    const c7 = await EV(pg, () => { const t = document.getElementById('toast'), a = t && t.querySelector('.flw-ta'); return { k: t && t.dataset.k, act: a ? a.textContent : null, m1: __ch('vox', 1, 0) }; });
    await pg.click('#toast .flw-ta').catch(() => {}); await wait(pg, 150);
    const c7b = await EV(pg, () => __ch('vox', 1, 0));
    T('UX-7', c7.k === 'limit' && c7.act === '写入' && c7.m1 === '' && c7b === 'G', 'UX-7 键入 G 后按 Esc：照常关闭，提示「和弦未写入」带「写入」，点它写到第 2 小节', J({ c7, c7b }));
    await EV(pg, () => { __shut(); __jt(); __sel('vox', 0, 0); });
    await pg.keyboard.press('Control+k'); await wait(pg, 300); await pg.keyboard.type('Am'); await pg.keyboard.press('Tab'); await wait(pg, 300);
    const u0 = await EV(pg, () => __ch('vox', 0, 0));
    await pg.keyboard.press('Control+z'); await wait(pg, 300);
    const u1 = await EV(pg, () => ({ m0: __ch('vox', 0, 0), open: !!document.getElementById('popmenu'), foc: document.activeElement && document.activeElement.id }));
    T('UX-15', u0 === 'Am' && u1.m0 === '' && u1.open && u1.foc === 'ck-in', 'UX-15 连续标注中输入框里没在改字时 Ctrl+Z 撤掉上一笔（第 1 小节 Am），面板原位留着', J({ u0, u1 }));
    await close(pg);
  });

  /* ================= UX-8 触屏 ================= */
  await group('UX-8', async () => {
    const pg = await open(b, { tag: 'UX-8', w: 1024, h: 768, touch: true });
    await EV(pg, () => { __jt(); __sel('vox', 0, 0); });
    const h = await EV(pg, () => { const e = document.querySelector('#flw-sbar [data-fa="sbar:tool"][data-v="chord"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (h) await pg.touchscreen.tap(h.x, h.y); else await EV(pg, () => chordOpen({ src: 't' }));
    await wait(pg, 350);
    const r = await EV(pg, () => { const i = document.getElementById('ck-in'), sz = q => [...document.querySelectorAll(q)].filter(x => x.getClientRects().length).map(x => { const b = x.getBoundingClientRect(); return Math.min(b.width, b.height); });
      return { open: !!i, foc: document.activeElement === i, min: Math.min(...sz('#popmenu .ck-chip'), ...sz('#popmenu [data-vd]'), ...sz('#popmenu .ck-ib')) }; });
    T('UX-8', r.open && !r.foc && r.min >= 39.5, 'UX-8 平板（1024×768 触屏）点按悬浮条「和弦」：不抢焦点到输入框（不弹软键盘），芯片 / 级数格 / 头部按钮 ≥40', J(r));
    await close(pg);
  });

  /* ================= UX-9 手机 ================= */
  await group('UX-9', async () => {
    const pg = await open(b, { tag: 'UX-9', w: 390, h: 844, touch: true });
    await EV(pg, () => { __jt({ nMea: 6 }); __sel('vox', 1, 0); });
    await wait(pg, 300);
    await EV(pg, () => chordOpen({ src: 't' })); await wait(pg, 400);
    const r = await EV(pg, () => { const p = __R('#popmenu'), c = __col('vox', sel.mi, sel.ci, 0), sz = q => [...document.querySelectorAll(q)].filter(x => x.getClientRects().length).map(x => { const b = x.getBoundingClientRect(); return Math.min(b.width, b.height); });
      return { sheet: document.getElementById('popmenu').classList.contains('ck-sheet'), pb: Math.round(p.bottom), pt: Math.round(p.top), cb: c && Math.round(c.bottom), ct: c && Math.round(c.top), min: Math.min(...sz('#popmenu .ck-ib'), ...sz('#popmenu [data-vs]'), ...sz('#popmenu [data-vb]'), ...sz('#popmenu [data-ckd]')) }; });
    await shot(pg, 'UX-9-phone');
    T('UX-9', r.sheet && r.pb >= 843 && r.cb != null && r.cb <= r.pt && r.ct >= 0 && r.min >= 39.5, 'UX-9 手机 390×844：构建器贴底抽屉、当前列滚到抽屉上方可见；‹ › ♪ × / 类型 / 转位 / 和弦图钮都 ≥40', J(r));
    await close(pg);
  });

  /* ================= UX-10 GP 把位卡折叠线 ================= */
  await group('UX-10', async () => {
    const out = {};
    for (const [w, h] of [[1366, 768], [1280, 720]]) {
      const pg = await open(b, { tag: 'UX-10', w, h });
      await EV(pg, () => { __jt({ nVox: 0, mod: s => { s.measures[0].tabs[0][0].chord = 'G'; } }); __sel('tab', 0, 0); });
      await pg.keyboard.press('Control+k'); await wait(pg, 400);
      out[w] = await EV(pg, () => { const md = __R('#modal-mask .modal'), ft = __R('.ce-foot'), lim = Math.min(innerHeight, md.bottom, ft ? ft.top : 1e9);
        return [...document.querySelectorAll('#ce-pos .pat-card')].filter(c => { const r = c.getBoundingClientRect(); return r.top >= md.top && r.bottom <= lim + 0.5; }).length; });
      await close(pg);
    }
    T('UX-10', out[1366] >= 4 && out[1280] >= 4, 'UX-10 1366×768 / 1280×720 不滚动 GP 能完整看到 ≥4 张把位卡（此前 2 张）', J(out));
  });

  /* ================= UX-11 / UX-12 读屏与文案 ================= */
  await group('UX-11', async () => {
    const pg = await open(b, { tag: 'UX-11' });
    await EV(pg, () => { __jt(); __sel('vox', 0, 0); chordOpen({ src: 't' }); });
    const r = await EV(pg, () => { const p = document.getElementById('popmenu'), rows = [...p.querySelectorAll('.ck-row')], chip = p.querySelector('[data-ckx]');
      return { role: p.getAttribute('role'), al: p.getAttribute('aria-label'), grp: rows.length > 0 && rows.every(x => x.getAttribute('role') === 'group' && document.getElementById(x.getAttribute('aria-labelledby'))),
        chip: chip && chip.getAttribute('aria-label'), vis: chip && chip.firstChild.textContent, live: document.getElementById('ck-loc').getAttribute('aria-live'),
        diag: (document.getElementById('ck-diag') || {}).textContent, vsTitle: [...p.querySelectorAll('[data-vs]')].some(x => x.hasAttribute('title')) }; });
    T('UX-11', r.role === 'dialog' && !!r.al && r.grp && r.chip && r.chip.indexOf(r.vis) === 0 && /，/.test(r.chip) && r.live === 'polite' && !r.vsTitle, 'UX-11 构建器 role=dialog；每行 role=group 以行标题为名；芯片读屏名以可见字开头再接和弦名与功能；#ck-loc aria-live；类型钮不再用分组名当悬停', J(r));
    T('UX-12', /▦/.test(r.diag || '') && /不显示/.test(r.diag || '') && !/隐藏/.test(r.diag || ''), 'UX-12 和弦图三钮前有 ▦、与文字页同叫「不显示」', J(r.diag));
    await EV(pg, () => { __shut(); __jt(); __sel('tab', 0, 0); chordOpen({ src: 't' }); });
    const g = await EV(pg, () => ({ swap: (document.getElementById('ck-swap') || {}).textContent, bassAl: document.getElementById('ce-bass').getAttribute('aria-label') }));
    T('UX-12', g.swap === '⇄旋律' && g.bassAl === '低音', 'UX-12 GP 里的 ⇄ 叫「⇄旋律」（不再与写法切换、级数行三处同名）；UX-11 #ce-bass 有读屏名「低音」', J(g));
    await close(pg);
  });

  /* ================= UX-13 指针不动不自发试听 ================= */
  await group('UX-13', async () => {
    const pg = await open(b, { tag: 'UX-13' });
    await EV(pg, () => { __jt({ nMea: 8 }); __sel('vox', 0, 0); window.__hear = []; window.chordHear = (n, s) => { __hear.push(n); }; localStorage.removeItem('musetab-chordhear'); });
    /* ① 指针停在验收点名的 3 个位置、只按空格 8 步 */
    const pts = [[700, 470], [560, 400], [820, 520]]; let n1 = 0;
    for (const [x, y] of pts) {
      await EV(pg, () => { __shut(); __sel('vox', 0, 0); __hear.length = 0; });
      await pg.mouse.move(x, y); await wait(pg, 50);
      await pg.keyboard.press('Control+k'); await wait(pg, 250);
      for (let i = 0; i < 8; i++) { await pg.keyboard.press('Space'); await wait(pg, 380); }
      n1 += await EV(pg, () => __hear.length);
    }
    /* ② 指针直接停在一颗调外芯片上（先真悬停响 1 次），之后不动只按空格：每步面板在原处重建、芯片换成新节点又落到指针下 */
    await EV(pg, () => { __shut(); __sel('vox', 0, 0); __hear.length = 0; });
    await pg.keyboard.press('Control+k'); await wait(pg, 300);
    const c = await EV(pg, () => { const r = __R('#popmenu [data-ckx]'); return { x: r.left + r.w / 2, y: r.top + r.h / 2 }; });
    await pg.mouse.move(c.x - 30, c.y - 30); await wait(pg, 50); await pg.mouse.move(c.x, c.y); await wait(pg, 450);
    const first = await EV(pg, () => __hear.length);
    await EV(pg, () => { __hear.length = 0; });
    for (let i = 0; i < 3; i++) { await pg.keyboard.press('Space'); await wait(pg, 450); }
    const n2 = await EV(pg, () => __hear.length);
    T('UX-13', n1 === 0 && first === 1 && n2 === 0, 'UX-13 鼠标停着不动、只按空格连续标注：3 个指针位置各 8 步 0 次；指针停在芯片上（真悬停响 1 次）后再按 3 次空格，面板原处重建、芯片落到指针下也不自发试听', J({ n1, first, n2 }));
    await close(pg);
  });

  /* ================= UX-14 连续标注不重算 chordSolve ================= */
  await group('UX-14', async () => {
    const pg = await open(b, { tag: 'UX-14' });
    await EV(pg, () => { __jt({ nMea: 60 }); __sel('vox', 0, 0); window.__ns = 0; const f0 = chordSolve; window.chordSolve = function () { __ns++; return f0.apply(this, arguments); }; });
    await pg.keyboard.press('Control+k'); await wait(pg, 300);
    for (const c of ['C', 'G', 'Am', 'F', 'C', 'G']) { await pg.keyboard.type(c); await pg.keyboard.press('Tab'); await wait(pg, 250); }
    const n = await EV(pg, () => __ns);
    T('UX-14', n <= 1, 'UX-14 连续标注写 6 个和弦：建议用的 chordSolve 只算 1 次（缓存键改旋律指纹，写和弦不失效）', n);
    await close(pg);
  });

  console.log(errs.length ? '页面错误：' + errs.slice(0, 5).join(' | ') : '页面错误：无');
  console.log((pass === total && !errs.length ? 'PASS ' : 'FAIL ') + pass + '/' + total);
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
