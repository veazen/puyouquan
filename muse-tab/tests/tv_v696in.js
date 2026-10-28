'use strict';
/* v69.6 纠错二 · 录入与新建组（复核 docs/review-2026-10-staff-audit.md N1 / N2 / N3 / N4 / N6 / N8 中标 v69.6 的项）。file:// 直载，真实浏览器；
   键盘 / 鼠标用 Playwright 真按键、真点击（谱面坐标由 data-staffb / data-sbot 算出线 / 间的屏幕 y），录入类在新外壳（默认）与 ?shell=classic 各跑一遍。
   I1 五线谱录入八度（i 为验收 L1）：a 1=G / ♭A / A / ♭B / B 新建五线谱歌谱键入 1 2 3 落在高音谱表内（C 调 1＝C4 不变）· b 教学对照 1=G：refOct 1、简谱行不带点、1＝G4 ·
      c 钢琴左手（C / G 调）键入 1–7 落在低音谱表内 · d 最近八度（跨小节按上一个音；验收 L1 起 1 5 1 3 | 2 7 1 5 → C4 G4 C5 E5 | D5 B4 C5 G4）与 1=G 音名键 C..B 单调上行 · e 纯简谱行（J / JG 旋律行）键入结果与 v69.4 逐字节相同（对照串写死，测于 a077b50）·
      f 贝斯（低音谱号）1 5 1 5 落在低音谱表内 · i（验收 L1）四度 / 五度二选一且最近的出谱表（要加线）时取离中线近的：C 调「1 1 5 5 6 6 5」＝C4 C4 G4 G4 A4 A4 G4、
      1=A「1 2 3 5 1」末音 A4；低音谱号 C 调「1 5」仍取最近（C3 G2）· g 「直接建 G」与「建 C 再换 G」键入 1 同音高（67）· h 新建面板预览样谱（NWPV.sampleOf）与真实建谱 refOct 相同
   I2 外文歌词分词：a Blüth' / più / così / mio‿ben / mio_ben / Aloha ʻOe / NFD ü / 「te_ _ lan」 · b 中文 / 日文 / 韩文分词与 v69.4 逐字节相同（一闪一闪亮晶晶 仍逐字一格）·
      c 填词框逐字键入外文（两外壳）· d 智能填词预载按同一规则拼回（外文加空格、多字连写），原样点「填入」不动、加一个空格再填也不动 · e 曲库 10 首原样「填入」歌词逐字节不变
   I3 鼠标 / 键盘录入细节：a Ctrl+点击已选中列的线 / 间＝加和音 · b 点在符头上 / 点别的列仍是多选 · c 再点已选中音的自己符头：不动（♯ 与和音保留）· d 新建谱第一次点击只选中、第二次才定音高 ·
      e 键盘移动后第一次点击只选中；双击不改音 · f ~ 连和弦：同音高附加音一起连、再按全部取消、角色互换、选区 / 多选路径、跨小节线拆和弦 · g 「e 3 w . 2」附点落在当前格（3/4 2/2.），「3 .」后置附点不变
   I4 合唱默认：四部 女高 / 女低 / 男高 / 男低（staff ×3 + bass）· 三部 女高 / 女低 / 男低（staff staff bass）· 二部两个高音谱号 · 无词重奏 / 老入口 createSong 不变 · 谱名仍是合唱谱 · 预览样谱同谱号
   I5 弱起：命令面板「弱起 / rq / pickup」找得到「曲谱信息…」· 弱起首小节 / irr / 散拍草稿 Delete 直接删、不并时值 · 普通小节 Delete 与 v69.4 相同
   I6 钢琴谱括号：新建钢琴独奏显式花括号，右手填词仍是花括号、谱名钢琴独奏谱 · 没写分组的老 G 谱认 instKey piano / 右手·左手 · 反例（两行无身份有词）仍是方括号 · 服务端 api/kindname.js 同结论
   E  页面脚本错误 0
   修前红：MUSETAB_URL 指向 git show a077b50:muse-tab/index.html 复跑（报告里列红项；I1e / I2b / I3g′ / I5c 等「不变」守卫在修前也绿）。
   env：MUSETAB_URL 被测页（缺省 ../index.html）· ONLY=I1,I3 只跑部分段。 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (d != null && !ok ? '：' + String(d).slice(0, 900) : '')); };
const J = x => JSON.stringify(x);
const W = ms => new Promise(r => setTimeout(r, ms));

/* v69.4（a077b50）对照串：纯简谱行键入结果与 CJK 分词（I1e / I2b），测于修前文件，写死 */
const JP0 = '1/4 2/4 3o1/4 5/4 | 1/4 7o-1/4 6/4 5/4 | 0/4 3/4 1/4 0/4#u';
const REF = { jpJ: { J: JP0, JB: JP0, JG: JP0 }, cjk: 'fce87dd7890a53cb356fae056f253a42f4d0914f:3312' };
const sha = s => require('crypto').createHash('sha1').update(s).digest('hex') + ':' + s.length;

const HELP = () => {
  window.__ld = s => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    try { const t = document.querySelector('#flw-tour'); if (t) t.remove(); } catch (_) {}
    undoStack.length = 0; redoStack.length = 0; loadSong(s);
    sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; clampSel(); lastEnt = null; selRange = null; noteSel = []; blurSel = false; render();
    try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {} return true; };
  window.__mk = (k, o) => __ld(NWB.build(k, Object.assign({ title: '录入', nMea: 3 }, o || {})));
  window.__V = (deg, dur, x) => Object.assign({ dur: dur || 4, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, x || {});
  window.__cols = (mi, vi) => ((song.measures[mi] || {}).voxes || [])[vi || 0] || [];
  window.__step = (mi, vi, ci) => { const c = __cols(mi, vi)[ci]; return c && c.deg ? staffStep(c, staffKeyInfoAt(mi)) : null; };
  window.__f = c => (c.deg || 0) + (c.acc || '') + (c.oct ? 'o' + c.oct : '') + '/' + c.dur + (c.dotted === 2 ? '..' : c.dotted ? '.' : '') + (c.tie ? '~' : '')
    + ((c.adds || []).length ? '+[' + c.adds.map(a => a.deg + (a.acc || '') + (a.oct ? 'o' + a.oct : '') + (a.tie ? '~' : '')).join(',') + ']' : '');
  window.__dump = (n, vi) => song.measures.slice(0, n || 2).map((m, mi) => __cols(mi, vi).map(__f).join(' ')).join(' | ');
  window.__midi = (mi, vi, ci) => { const c = __cols(mi, vi)[ci]; return c && c.deg ? voxMidi(c, mi) : null; };
  /* 谱面第 vi 声部 mi 小节 ci 列、绝对音级 step 的屏幕坐标（线 / 间中心） */
  window.__pt = (mi, vi, ci, step) => { const rect = document.querySelector('[data-row="vox"][data-vi="' + vi + '"][data-mi="' + mi + '"][data-ci="' + ci + '"][data-staffb]');
    if (!rect) return null; rect.scrollIntoView({ block: 'center' });
    const svg = document.getElementById('score'), R = svg.getBoundingClientRect(), k = R.height / svg.viewBox.baseVal.height, bb = rect.getBoundingClientRect();
    const sb = +rect.dataset.staffb, bot = +rect.dataset.sbot || 37;
    const x = bb.x + bb.width / 2, y = R.top + (sb - 3.75 * (step - bot)) * k, h = document.elementFromPoint(x, y);
    return { x, y, hit: !!(h && h.dataset && h.dataset.staffb !== undefined && +h.dataset.mi === mi && +h.dataset.ci === ci) }; };
};

async function open(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 900 } });
  const pg = await ctx.newPage();
  await pg.addInitScript(HELP);
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss().catch(() => {}));
  let u = URL0; if (o.shell === 'classic') u = withQ(u, 'shell=classic');
  await pg.goto(u); await pg.waitForTimeout(1200);
  await pg.evaluate(() => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} try { const t = document.querySelector('#flw-tour'); if (t) t.remove(); } catch (_) {} });
  return { ctx, pg, errs };
}
const EV = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => ({ err: String(e.message || e).slice(0, 300) }));
async function keys(pg, seq) { for (const k of seq.split(' ').filter(Boolean)) { await pg.keyboard.press(k); await pg.waitForTimeout(25); } }
async function clickStep(pg, mi, vi, ci, step, mod) {
  const p = await pg.evaluate(a => __pt(a[0], a[1], a[2], a[3]), [mi, vi, ci, step]);
  if (!p || !p.hit) { console.log('   ⚠ 点不到第 ' + (mi + 1) + ' 小节第 ' + (ci + 1) + ' 格的谱表热区（被遮挡）'); return false; }
  if (mod) await pg.keyboard.down(mod);
  await pg.mouse.click(p.x, p.y);
  if (mod) await pg.keyboard.up(mod);
  await pg.waitForTimeout(80); return true;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const allErrs = [];
  const shells = ['flow', 'classic'];
  try {
    for (const sh of shells) {
      const A = await open(b, { shell: sh }); const pg = A.pg, tag = '〔' + (sh === 'flow' ? '新外壳' : '旧外壳') + '〕';
      /* ================= I1 五线谱录入八度 ================= */
      if (want('I1')) {
        const r = {};
        for (const k of ['G', 'Ab', 'A', 'Bb', 'B', 'C', 'F', 'F#']) {
          await pg.evaluate(k => __mk('S', { key: k, lyr: 1 }), k); await keys(pg, '1 2 3');
          r[k] = await pg.evaluate(() => ({ st: [0, 1, 2].map(i => __step(0, 0, i)), m: __midi(0, 0, 0), ro: song.refOct | 0 }));
        }
        const inStaff = a => a.every(x => x != null && x >= 37 && x <= 45);
        T(['G', 'Ab', 'A', 'Bb', 'B'].every(k => inStaff(r[k].st)) && r.G.m === 67 && r.B.m === 71, 'I1a' + tag + ' 1=G / ♭A / A / ♭B / B 新建五线谱歌谱键入 1 2 3 落在高音谱表内（1=G 首音 G4＝67）', J(r));
        T(r.C.st[0] === 35 && r.C.m === 60 && r.F.m === 65 && r['F#'].m === 66 && r.C.ro === 0, 'I1a′' + tag + ' C / F / ♯F 调 1＝C4 / F4 / ♯F4 与 v69.4 相同（refOct 不设）', J({ C: r.C, F: r.F, Fs: r['F#'] }));
        await pg.evaluate(() => __mk('SJ', { key: 'G', lyr: 1 })); await keys(pg, '1 2 3');
        const b1 = await pg.evaluate(() => ({ ro: song.refOct, c: __cols(0, 0).slice(0, 3).map(c => c.oct || 0), m: __midi(0, 0, 0) }));
        T(b1.ro === 1 && b1.c.join() === '0,0,0' && b1.m === 67, 'I1b' + tag + ' 教学对照 1=G：refOct 1、简谱对照行 1 2 3 不带点、1＝G4', J(b1));
        const lh = {};
        for (const k of ['C', 'G', 'F']) {
          await pg.evaluate(k => { __mk('G', { key: k }); sel.vi = 1; render(); }, k); await keys(pg, '1 2 3 4 5 6 7');
          lh[k] = await pg.evaluate(() => ({ st: __cols(0, 1).concat(__cols(1, 1)).filter(c => c.deg).length, steps: [0, 1].flatMap(mi => __cols(mi, 1).map((c, ci) => c.deg ? __step(mi, 1, ci) : null)).filter(x => x != null), m: __midi(0, 1, 0) }));
        }
        T(['C', 'G'].every(k => lh[k].steps.length === 7 && lh[k].steps.every(x => x >= 24 && x <= 34)) && lh.C.m === 48 && lh.G.m === 43 && lh.F.steps[0] === 31,
          'I1c' + tag + ' 钢琴左手键入 1–7 落在低音谱表内（C 调 C3–B3、G 调 G2–♯F3；F 调首音 F3）', J(lh));
        await pg.evaluate(() => __mk('S', { key: 'C', lyr: 1 })); await keys(pg, '1 5 1 3 2 7 1 5');
        const d1 = await pg.evaluate(() => [0, 1].flatMap(mi => __cols(mi, 0).map((c, ci) => c.deg ? __step(mi, 0, ci) : null)).filter(x => x != null));
        /* 验收 L1 迁移：C4 后的 5 原取下四度 G3（要加线），现取离中线 B4 近的 G4，之后照旧按上一个音取最近（G4→C5 上四度在谱表内，取最近） */
        T(J(d1) === J([35, 39, 42, 44, 43, 41, 42, 39]), 'I1d' + tag + ' 最近八度：1 5 1 3 | 2 7 1 5 → C4 G4 C5 E5 | D5 B4 C5 G4（跨小节按上一个音；四度 / 五度出谱表取中线近的）', J(d1));
        await pg.evaluate(() => { __mk('S', { key: 'G', lyr: 1 }); [4, 5, 6, 7, 1, 2, 3].forEach(k => inputDigit(k)); });
        const d2 = await pg.evaluate(() => [0, 1].flatMap(mi => __cols(mi, 0).map((c, ci) => c.deg ? __midi(mi, 0, ci) : null)).filter(x => x != null));
        T(d2.length === 7 && d2.every((x, i) => !i || x > d2[i - 1]), 'I1d′' + tag + ' 1=G 依次点音名键 C D E ♯F G A B（数据 4 5 6 7 1 2 3）单调上行', J(d2));
        /* I1e 纯简谱行与 v69.4 逐字节相同 */
        const jp = await pg.evaluate(() => { const run = (k, o, seq) => { __mk(k, o); seq.forEach(x => { if (typeof x === 'number') inputDigit(x); else if (x === '+') bumpOct(1); else if (x === '-') bumpOct(-1); }); return __dump(3, 0) + '#' + (song.refOct == null ? 'u' : song.refOct); };
          const seq = [1, 2, 3, '+', 5, 1, 7, '-', 6, 5, 0, 3, 1];
          return { J: run('J', { key: 'G', lyr: 1 }, seq), JB: run('J', { key: 'B', lyr: 1 }, seq), JG: run('JG', { key: 'A', lyr: 1 }, seq) }; });
        if (process.env.V696_DUMP) console.log('REF jp', J(jp));
        T(REF.jpJ ? (jp.J === REF.jpJ.J && jp.JB === REF.jpJ.JB && jp.JG === REF.jpJ.JG) : false, 'I1e' + tag + ' 纯简谱行（简谱歌谱 1=G / 1=B、钢琴伴奏歌谱旋律行 1=A）键入结果与 v69.4 逐字节相同', J({ now: jp, ref: REF.jpJ }));
        await pg.evaluate(() => __mk('S', { key: 'C', lyr: 0, clef: 'bass', instKey: 'bass' })); await keys(pg, '1 5 1 5');
        const f1 = await pg.evaluate(() => ({ st: __cols(0, 0).map((c, ci) => __step(0, 0, ci)), m: __cols(0, 0).map((c, ci) => __midi(0, 0, ci)) }));
        T(f1.st.every(x => x != null && x >= 24 && x <= 34) && J(f1.m) === J([48, 43, 48, 43]), 'I1f' + tag + ' 贝斯（低音谱号）1 5 1 5 → C3 G2 C3 G2，落在低音谱表内（G2 在第一线上，四度 / 五度仍取最近）', J(f1));
        /* I1i 验收 L1：四度 / 五度二选一时最近的出谱表就取离中线近的 */
        await pg.evaluate(() => __mk('S', { key: 'C', lyr: 1 })); await keys(pg, '1 1 5 5 6 6 5');
        const i1 = await pg.evaluate(() => [0, 1].flatMap(mi => __cols(mi, 0).map((c, ci) => c.deg ? __midi(mi, 0, ci) : null)).filter(x => x != null));
        await pg.evaluate(() => __mk('S', { key: 'A', lyr: 1 })); await keys(pg, '1 2 3 5 1');
        const i2 = await pg.evaluate(() => [0, 1].flatMap(mi => __cols(mi, 0).map((c, ci) => c.deg ? __midi(mi, 0, ci) : null)).filter(x => x != null));
        await pg.evaluate(() => { __mk('G', { key: 'C' }); sel.vi = 1; render(); }); await keys(pg, '1 5');
        const i3 = await pg.evaluate(() => __cols(0, 1).filter(c => c.deg).map((c, ci) => __midi(0, 1, ci)));
        T(J(i1) === J([60, 60, 67, 67, 69, 69, 67]) && J(i2) === J([69, 71, 73, 76, 69]) && J(i3) === J([48, 43]),
          'I1i' + tag + ' 四度 / 五度二选一、最近的要加线时取离中线近的：C 调「1 1 5 5 6 6 5」＝C4 C4 G4 G4 A4 A4 G4；1=A「1 2 3 5 1」末音 A4；钢琴左手 C 调「1 5」仍最近（C3 G2）', J({ i1, i2, i3 }));
        const g1 = await pg.evaluate(() => { const s = NWB.build('S', { title: 'x', key: 'C', nMea: 2, lyr: 1 }); transposeSong(s, 7); __ld(s); inputDigit(1); const a = { key: song.key, ro: song.refOct, m: __midi(0, 0, 0) };
          __mk('S', { key: 'G', lyr: 1 }); inputDigit(1); return { viaC: a, direct: { key: song.key, ro: song.refOct, m: __midi(0, 0, 0) } }; });
        T(g1.viaC.key === 'G' && g1.viaC.m === 67 && g1.direct.m === 67 && g1.viaC.ro === g1.direct.ro, 'I1g' + tag + ' 「直接建 1=G」与「建 1=C 再换到 G」键入 1 同为 G4（refOct 同为 1）', J(g1));
        const h1 = await pg.evaluate(() => { const o = { title: '未命名曲谱', key: 'A', beats: 4, unit: 4, tempo: 90, nVox: 1, lyr: 1 };
          return ['S', 'SJ', 'SG', 'J'].map(k => { const sm = NWPV.sampleOf(k, o), bd = NWB.build(k, Object.assign({}, o, { nMea: 4 })); return k + ':' + (sm.refOct | 0) + '/' + (bd.refOct | 0); }); });
        T(h1.join() === 'S:1/1,SJ:1/1,SG:1/1,J:0/0', 'I1h' + tag + ' 新建面板预览样谱与真实建谱 refOct 相同（1=A：五线谱 / 对照 / 五线谱＋伴奏 1，简谱 0）', J(h1));
      }
      /* ================= I2 外文歌词 ================= */
      if (want('I2')) {
        const a = await pg.evaluate(() => { const v = (s, o) => smartTokenize(s, o).map(t => t.t === 'syl' ? t.v : t.t === 'skip' ? '·' : '⏎').join('|');
          return { bl: v("Blüth' und Träu-me", { hyph: true }), pi: v('più, co-sì, per-ché', { hyph: true }), mio: v('mio‿ben'), mio2: v('mio_ben'), al: v('Aloha ʻOe'),
            nfd: v('Blüthe'), ext: v('te_ _ lan'), cor: v('corazón Erhöre niño Grüß'), ru: v('Я помню чудное'), el: v('Κύριε ἐλέησον'), hua: v('花_儿 好') }; });
        T(a.bl === "Blüth'|und|Träu|me" && a.pi === 'più,|co|sì,|per|ché' && a.mio === 'mio‿ben' && a.mio2 === 'mio‿ben' && a.al === 'Aloha|ʻOe' && a.nfd === 'Blüthe' && a.ext === 'te|·|·|lan'
          && a.cor === 'corazón|Erhöre|niño|Grüß' && a.ru === 'Я|помню|чудное' && a.el === 'Κύριε|ἐλέησον' && a.hua === '花儿|好',
          'I2a' + tag + " 外文分词：Blüth' / più / così / mio‿ben / mio_ben→mio‿ben / Aloha ʻOe / NFD ü 归一 / 「te_ _ lan」单独「_」跳一个音 / 西里尔 / 希腊；中文连写照旧", J(a));
        const cjk = await pg.evaluate(() => JSON.stringify(['一闪一闪亮晶晶，满天都是小星星\n挂在天上放光明', 'きらきら ひかる おそらの ほしよ', '반짝반짝 작은 별 아름답게 비치네', '花_儿 为什么 这样红-', '我爱你 中国（一）', 'ＡＢＣ ＤＥ１２', '春眠不觉晓，处处闻啼鸟。'].map(s => smartTokenize(s, { hyph: true }).concat([{ t: 'br' }], smartTokenize(s)))));
        if (process.env.V696_DUMP) console.log('REF cjk', J(cjk));
        const one = await pg.evaluate(() => smartTokenize('一闪一闪亮晶晶').map(t => t.v).join('|'));
        T(sha(cjk) === REF.cjk, 'I2b' + tag + ' 中文 / 日文 / 韩文 / 全角字母分词与 v69.4 逐字节相同', cjk.slice(0, 300));
        T(one === '一|闪|一|闪|亮|晶|晶', 'I2b′' + tag + ' 「一闪一闪亮晶晶」仍逐字一格', one);
        /* I2c 填词框逐字键入 */
        await pg.evaluate(() => { const s = NWB.build('S', { title: 'ly', key: 'C', nMea: 3, lyr: 1 }); s.measures.forEach(m => { m.voxes[0] = [1, 2, 3, 4].map(d => __V(d)); }); __ld(s); activeLyr = 0; });
        await keys(pg, 'Enter'); await pg.waitForTimeout(150);   /* Enter＝给这个音填歌词（两外壳同一快捷键：焦点进 #i-lyric） */
        const foc = await pg.evaluate(() => (document.activeElement || {}).id || '');
        await pg.keyboard.type("Blüth' und Träu-me più così ", { delay: 15 });
        await pg.waitForTimeout(100);
        const c = await pg.evaluate(() => song.measures.slice(0, 2).flatMap(m => m.voxes[0].map(c => (c.lyrics || [])[0] || '')).join('|'));
        await pg.evaluate(() => { try { document.activeElement.blur(); } catch (_) {} });
        T(foc === 'i-lyric' && c === "Blüth'|und|Träu|me|più|così||", 'I2c' + tag + ' 填词框逐字键入「Blüth\' und Träu-me più così 」一词（音节）一音', J({ foc, c }));
        /* I2d 智能填词预载 */
        const d = await pg.evaluate(() => { const s = NWB.build('S', { title: 'ly', key: 'C', nMea: 3, lyr: 1 }); const L = ['Ave', 'Ma', 'ri', 'a!', '花儿', '晶，', 'mio‿ben', 'Jung', '', 'frau', 'mild', '一'];
          s.measures.forEach((m, mi) => { m.voxes[0] = [1, 2, 3, 4].map((dg, i) => __V(dg, 4, { lyrics: [L[mi * 4 + i]] })); }); __ld(s);
          const before = JSON.stringify(song.measures);
          document.getElementById('b-fill').onclick(); const ta = document.getElementById('fill-text'), v0 = ta.value, u0 = undoStack.length;
          document.getElementById('fill-ok').click(); const same0 = JSON.stringify(song.measures) === before, u1 = undoStack.length;
          document.getElementById('b-fill').onclick(); const ta2 = document.getElementById('fill-text'); ta2.value = ta2.value + ' '; ta2.dispatchEvent(new Event('input', { bubbles: true }));
          document.getElementById('fill-ok').click(); const same1 = JSON.stringify(song.measures) === before;
          return { v0, same0, noUndo: u1 === u0, same1, after: song.measures.flatMap(m => m.voxes[0].map(c => (c.lyrics || [])[0] || '')).join('|') }; });
        T(d.v0 === 'Ave Ma ri a!花_儿晶， mio‿ben Jung - frau mild 一' && d.same0 && d.noUndo && d.same1,
          'I2d' + tag + ' 智能填词预载按分词规则拼回（外文加空格、一个音上的多字用「_」连写）；原样点「填入」不动（不进撤销栈），加一个空格再填结果也相同', J(d));
        /* I2f 验收 L2：智能填词弹窗同填词框口径——字母后紧跟的「-」＝音节分界，前后有空格的「-」仍跳过一个音；中文「-」照旧跳过 */
        const f = await pg.evaluate(() => { const fill = txt => { const s = NWB.build('S', { title: 'ly', key: 'C', nMea: 3, lyr: 1 }); s.measures.forEach(m => { m.voxes[0] = [1, 2, 3, 4].map(dg => __V(dg)); }); __ld(s); activeLyr = 0;
            document.getElementById('b-fill').onclick(); const ta = document.getElementById('fill-text'); ta.value = txt; ta.dispatchEvent(new Event('input', { bubbles: true }));
            const stat = (document.getElementById('sf-stat') || {}).textContent || ''; document.getElementById('fill-ok').click();
            const cells = song.measures.flatMap(m => m.voxes[0].map(c => (c.lyrics || [])[0] || ''));
            document.getElementById('b-fill').onclick(); const pre = document.getElementById('fill-text').value; document.getElementById('fill-ok').click();
            const again = song.measures.flatMap(m => m.voxes[0].map(c => (c.lyrics || [])[0] || '')).join('|') === cells.join('|');
            closeModal(); return { cells: cells.join('|'), stat, pre, again }; };
          return { sn: fill('Stil-le Nacht, hei-li-ge Nacht! Al-les schläft'), am: fill('A-ve Ma-ri-a! Jung-frau mild!'), sp: fill('A - ve Ma-ri-a'), zh: fill('一闪-一闪 亮晶晶') }; });
        T(f.sn.cells === 'Stil|le|Nacht,|hei|li|ge|Nacht!|Al|les|schläft||' && /正好对齐|还差/.test(f.sn.stat) && f.sn.again
          && f.am.cells === 'A|ve|Ma|ri|a!|Jung|frau|mild!||||' && f.am.again
          && f.sp.cells === 'A||ve|Ma|ri|a||||||' && f.zh.cells === '一|闪||一|闪|亮|晶|晶||||',
          'I2f' + tag + ' 智能填词：「Stil-le Nacht」「A-ve Ma-ri-a」字母后紧跟的「-」分音节（同填词框），「A - ve」前后有空格仍跳过一个音、中文「-」照旧跳过；重新打开原样填入不变', J(f));
      }
      /* I2e 曲库 10 首：打开智能填词不改内容点「填入」→ 歌词逐字节不变；预载文本加一个空格再填 → 改动的音数（v69.4 实测 5–71 个） */
      if (want('I2') && sh === 'flow') {
        const lib = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../api/seed-library.json'), 'utf8')).map(x => ({ t: x.title, d: typeof x.data === 'string' ? x.data : JSON.stringify(x.data) }));
        const e = await pg.evaluate(lib => lib.map(({ t, d }) => { const s = migrate(JSON.parse(d)); __ld(s); const out = { t, same0: true, diff1: 0, n: 0, skip: 0 };
          const lyrOf = () => song.measures.map(m => (m.voxes || []).map(cs => (cs || []).map(c => JSON.stringify(c.lyrics || [])).join(',')).join(';')).join('|');
          (song.voxVoices || []).forEach((_, vi) => { for (let li = 0; li < (song.lyricLines | 0); li++) {
            if (!smartSlots(vi, 0, 0).some(x => ((x.col.lyrics || [])[li] || '').trim())) continue; out.n++;
            sel = { mi: 0, row: 'vox', vi, ci: 0, si: 1 }; activeLyr = li;
            const b0 = lyrOf(); document.getElementById('b-fill').onclick(); document.getElementById('fill-ok').click(); if (lyrOf() !== b0) out.same0 = false;
            const cells = () => song.measures.flatMap(m => ((m.voxes || [])[vi] || []).map(c => (c.lyrics || [])[li] || ''));
            /* 预载表示不了的两种（与本版无关、跳过这一段）：连音线后续音上的歌词（智能填词恒清空）、一个音上带空格 / 以「-」「_」开头的歌词（如「1. Es」「- läu」） */
            const sl = smartSlots(vi, 0, 0), odd = sl.some(x => { const v = (x.col.lyrics || [])[li] || ''; return x.kind === 'cont' ? !!v.trim() : (/\s/.test(v.trim()) || /^[-_＿]/.test(v.trim())); });
            if (odd) { out.skip++; continue; }
            const c0 = cells(); document.getElementById('b-fill').onclick(); const ta = document.getElementById('fill-text'); ta.value += ' '; ta.dispatchEvent(new Event('input', { bubbles: true }));
            document.getElementById('fill-ok').click(); const c1 = cells(); out.diff1 += c0.filter((x, i) => x !== c1[i]).length; while (undoStack.length && lyrOf() !== b0) undo(); } });
          return out; }), lib);
        T(e.length === 10 && e.every(x => x.n > 0 && x.same0), 'I2e' + tag + ' 曲库 10 首：打开智能填词不改内容点「填入」，每声部每段歌词逐字节不变', J(e));
        T(e.every(x => x.diff1 === 0) && e.reduce((a, x) => a + x.n - x.skip, 0) >= 8, 'I2e′' + tag + ' 曲库：预载文本只加一个空格再「填入」，可表示的各段（不含连音后续音带词 / 音内带空格的段）没有一个音的歌词被改', J(e.map(x => x.t.slice(0, 4) + ':' + x.diff1 + '/' + (x.n - x.skip) + '段')));
      }
      /* ================= I3 鼠标 / 键盘录入细节 ================= */
      if (want('I3')) {
        await pg.evaluate(() => { try { if (!flowOn()) closeFlyout(); } catch (_) {} });   /* 旧外壳：I2c 按 Enter 打开的左侧歌词浮层会盖住谱面左端，先收起 */
        await W(400);
        /* a / b Ctrl+点击 */
        await pg.evaluate(() => { const s = NWB.build('S', { title: 'ck', key: 'C', nMea: 3, lyr: 0 }); s.measures[0].voxes[0] = [__V(1), __V(2), __V(3), __V(4)]; __ld(s); });
        await clickStep(pg, 0, 0, 0, 35);                       /* 选中第 1 格（点在自己的符头上：不改音） */
        const a0 = await pg.evaluate(() => ({ sel: sel.mi + ':' + sel.ci, f: __f(__cols(0)[0]) }));
        await clickStep(pg, 0, 0, 0, 39, 'Control');            /* Ctrl+点第二线 G4 */
        const a1 = await pg.evaluate(() => ({ f: __f(__cols(0)[0]), ns: noteSel.length }));
        await clickStep(pg, 0, 0, 0, 37, 'Control');            /* 再 Ctrl+点 E4 */
        const a2 = await pg.evaluate(() => ({ f: __f(__cols(0)[0]), ns: noteSel.length }));
        T(a0.f === '1/4' && a1.f === '1/4+[5]' && a1.ns === 0 && a2.f === '1/4+[5,3]' && a2.ns === 0, 'I3a' + tag + ' Ctrl+点击已选中列的线 / 间＝叠加和音（C4 上加 G4、E4），不进多选', J({ a0, a1, a2 }));
        await clickStep(pg, 0, 0, 0, 35, 'Control');            /* Ctrl+点主音符头＝多选 */
        const b1 = await pg.evaluate(() => ({ f: __f(__cols(0)[0]), ns: noteSel.map(n => n.mi + ':' + n.ci).join() }));
        await clickStep(pg, 0, 0, 2, 37, 'Control');            /* Ctrl+点别的列＝多选 */
        const b2 = await pg.evaluate(() => ({ f: __f(__cols(0)[2]), ns: noteSel.map(n => n.mi + ':' + n.ci).join() }));
        await pg.evaluate(() => { noteSel = []; render(); });
        await clickStep(pg, 0, 0, 1, 36); await clickStep(pg, 0, 0, 3, 38, 'Shift');
        const b3 = await pg.evaluate(() => ({ f: __dump(1), ns: noteSel.length, sr: !!selRange }));
        T(b1.f === '1/4+[5,3]' && b1.ns === '0:0' && b2.f === '3/4' && b2.ns === '0:0,0:2' && b3.f === '1/4+[5,3] 2/4 3/4 4/4' && (b3.ns > 0 || b3.sr),
          'I3b' + tag + ' Ctrl+点在已有符头上、Ctrl+点其他列仍是多选；Shift+点不变（不改音）', J({ b1, b2, b3 }));
        /* c 再点已选中的音自己的符头 */
        await pg.evaluate(() => { const s = NWB.build('S', { title: 'ck', key: 'C', nMea: 3, lyr: 0 }); s.measures[0].voxes[0] = [__V(4, 4, { acc: '♯' }), __V(1, 4, { adds: [{ deg: 3, acc: '', oct: 0 }] }), __V(3), __V(4)]; __ld(s); });
        const c0 = await pg.evaluate(() => JSON.stringify(song.measures[0]));
        await clickStep(pg, 0, 0, 0, 38); await W(520); await clickStep(pg, 0, 0, 0, 38);
        await clickStep(pg, 0, 0, 1, 35); await W(520); await clickStep(pg, 0, 0, 1, 35);
        const c1 = await pg.evaluate(c0 => ({ same: JSON.stringify(song.measures[0]) === c0, f: __dump(1) }), c0);
        await W(520); await clickStep(pg, 0, 0, 1, 39);
        const c2 = await pg.evaluate(() => __f(__cols(0)[1]));
        T(c1.same && c2 === '5/4+[3]', 'I3c' + tag + ' 再点已选中音自己的符头：♯F4 的升号、C4 上的和音都保留；点到别的线才改音高', J({ c1, c2 }));
        /* d 新建谱第一次点击只选中 */
        await pg.evaluate(() => __mk('S', { key: 'C', lyr: 0 }));
        const d0 = await pg.evaluate(() => sel.mi + ':' + sel.ci + ':' + (__cols(0)[0].deg || 0));
        await clickStep(pg, 0, 0, 0, 41);
        const d1 = await pg.evaluate(() => __cols(0)[0].deg || 0);
        await W(520); await clickStep(pg, 0, 0, 0, 41);
        const d2 = await pg.evaluate(() => __f(__cols(0)[0]));
        T(d0 === '0:0:0' && d1 === 0 && d2 === '7/4', 'I3d' + tag + ' 新建谱光标在第 1 格：第一次点击只选中（仍是休止），再点一次才定音高（B4）', J({ d0, d1, d2 }));
        /* e 键盘移动后、双击 */
        await pg.evaluate(() => { const s = NWB.build('S', { title: 'ck', key: 'C', nMea: 3, lyr: 0 }); s.measures[0].voxes[0] = [__V(1), __V(2), __V(3), __V(4)]; __ld(s); });
        await clickStep(pg, 0, 0, 1, 36); await keys(pg, 'ArrowRight ArrowLeft'); await W(520); await clickStep(pg, 0, 0, 1, 40);
        const e1 = await pg.evaluate(() => ({ f: __f(__cols(0)[1]), sel: sel.ci }));
        await W(520); await clickStep(pg, 0, 0, 2, 37);
        const p2 = await pg.evaluate(() => __pt(0, 0, 2, 41));
        await pg.mouse.click(p2.x, p2.y, { clickCount: 2 }); await W(120);
        const e2 = await pg.evaluate(() => __f(__cols(0)[2]));
        await W(520); await clickStep(pg, 0, 0, 1, 40);
        const e3 = await pg.evaluate(() => __f(__cols(0)[1]));
        T(e1.f === '2/4' && e1.sel === 1 && e2 === '3/4' && e3 === '2/4', 'I3e' + tag + ' 键盘 → ← 回到这格后第一次点击只选中；双击不改音；换格后第一次点击只选中', J({ e1, e2, e3 }));
        await W(520); await clickStep(pg, 0, 0, 1, 40);
        const e4 = await pg.evaluate(() => __f(__cols(0)[1]));
        T(e4 === '6/4', 'I3e′' + tag + ' 选中后隔一会儿再点线 / 间照旧定音高（A4）', e4);
        /* f ~ 连和弦 */
        const f = await pg.evaluate(() => { const s = NWB.build('S', { title: 'tie', key: 'C', nMea: 3, lyr: 0 });
          const ch = (x) => __V(1, 2, Object.assign({ adds: [{ deg: 3, acc: '', oct: 0 }, { deg: 5, acc: '', oct: 0 }] }, x || {}));
          s.measures[0].voxes[0] = [ch(), ch()]; s.measures[1].voxes[0] = [ch(), __V(1, 2, { adds: [{ deg: 5, acc: '', oct: 0 }] })];
          s.measures[2].voxes[0] = [__V(1, 2, { adds: [{ deg: 3, acc: '', oct: 0 }] }), __V(3, 2, { adds: [{ deg: 1, acc: '', oct: 0 }] })]; __ld(s); return true; });
        await keys(pg, 'Shift+Backquote');
        const f1 = await pg.evaluate(() => __dump(1));
        await keys(pg, 'Shift+Backquote');
        const f2 = await pg.evaluate(() => ({ d: __dump(1), raw: JSON.stringify(song.measures[0].voxes[0][0].adds) }));
        await pg.evaluate(() => { sel.mi = 1; sel.ci = 1 - 1; render(); }); await keys(pg, 'Shift+Backquote');   /* 跨小节：第 2 小节首个和弦 → 下一列只有 5 */
        await pg.evaluate(() => { sel.mi = 1; sel.ci = 1; render(); }); await keys(pg, 'Shift+Backquote');       /* 第 2 小节末列 → 第 3 小节首列（1+[3]）：主音同、5 无配对 */
        await pg.evaluate(() => { sel.mi = 2; sel.ci = 0; render(); }); await keys(pg, 'Shift+Backquote');       /* 角色互换：1+[3] → 3+[1] */
        const f3 = await pg.evaluate(() => __dump(3).split(' | ').slice(1).join(' | '));
        T(f1 === '1/2~+[3~,5~] 1/2+[3,5]' && f2.d === '1/2+[3,5] 1/2+[3,5]' && !/tie/.test(f2.raw),
          'I3f' + tag + ' ~ 连和弦：同音高附加音一起写 adds[].tie；整组再按一次全部取消', J({ f1, f2 }));
        T(f3 === '1/2~+[3,5~] 1/2~+[5] | 1/2~+[3~] 3/2+[1]', 'I3f′' + tag + ' 只连下一列有同音高的附加音（含跨小节、角色互换 pSame 口径）', f3);
        const f4 = await pg.evaluate(() => { const s = NWB.build('S', { title: 'tie', key: 'C', nMea: 3, lyr: 0 });
          const ch = () => __V(1, 4, { adds: [{ deg: 3, acc: '', oct: 0 }, { deg: 5, acc: '', oct: 0 }] });
          s.measures[0].voxes[0] = [ch(), ch(), ch(), ch()]; __ld(s);
          selRange = { row: 'vox', vi: 0, m1: 0, c1: 0, m2: 0, c2: 1 }; toggleTie(); const rg = __dump(1); selRange = null;
          noteSel = [{ mi: 0, ci: 2, si: 0, vi: 0, row: 'vox' }, { mi: 0, ci: 3, si: 0, vi: 0, row: 'vox' }]; toggleTie(); const ms = __dump(1);
          /* 跨小节线拆和弦（顺延 overflowCarry） */
          const s2 = NWB.build('S', { title: 'tie', key: 'C', nMea: 3, lyr: 0 }); s2.measures[0].voxes[0] = [__V(2), __V(2), __V(2), __V(1, 2, { adds: [{ deg: 3, acc: '', oct: 0 }, { deg: 5, acc: '', oct: 0 }] })]; __ld(s2);
          mutate(() => overflowCarry(0, 'vox', 0, true)); return { rg, ms, ov: __dump(2) }; });
        T(/^1\/4~\+\[3~,5~\] 1\/4\+\[3,5\]/.test(f4.rg) && /1\/4~\+\[3~,5~\] 1\/4\+\[3,5\]$/.test(f4.ms) && /1\/4~\+\[3~,5~\] \| 1\/4\+\[3,5\]/.test(f4.ov),
          'I3f″' + tag + ' 选区 / 多选路径同样连附加音；顺延跨小节线拆和弦时附加音也连过去', J(f4));
        /* g 预选时值后的附点 */
        const g = {};
        for (const k of ['S', 'J']) {
          for (const [nm, seq] of [['pre', 'e 3 w . 2'], ['post', 'e 3 . 2'], ['fresh', 'w . 2']]) {
            await pg.evaluate(k => __mk(k, { key: 'C', lyr: k === 'J' ? 1 : 0 }), k); await keys(pg, seq);
            g[k + nm] = await pg.evaluate(() => ({ d: __dump(1).replace(/o-?\d/g, ''), be: beatErrors().length }));
          }
        }
        T(g.Spre.d === '3/4 2/2.' && g.Jpre.d === '3/4 2/2.' && !g.Spre.be && !g.Jpre.be, 'I3g' + tag + ' 「e 3 w . 2」：附点作用于预选时值的当前格（3 四分＋2 附点二分，小节不超拍；五线谱 / 简谱）', J(g));
        T(g.Spost.d === '3/4. 2/8 0/4 0/4' && g.Jpost.d === '3/4. 2/8 0/4 0/4' && g.Sfresh.d === '2/2. 0/4' && g.Jfresh.d === '2/2. 0/4', 'I3g′' + tag + ' 「3 .」后置附点、空小节「w . 2」与 v69.4 相同', J(g));
      }
      allErrs.push(...A.errs.map(x => sh + ': ' + x));
      await A.ctx.close();
    }
    /* ================= I4 / I5 / I6（引擎段只跑一次；命令面板只在新外壳） ================= */
    const A = await open(b); const pg = A.pg;
    if (want('I4')) {
      const r = await pg.evaluate(() => { const o = n => ({ title: '合', key: 'C', nVox: n, lyr: 1, nMea: 2 });
        const d = s => ({ v: s.voxVoices.join('/'), n: (s.voxNotations || []).map(x => x || '-').join('/'), name: NWB.kindOfSong(s).name, g: J0(s.voxGroups) });
        const J0 = x => JSON.stringify(x || null);
        return { S4: d(NWB.build('S', o(4))), S3: d(NWB.build('S', o(3))), S2: d(NWB.build('S', o(2))), SJ4: d(NWB.build('SJ', o(4))), J4: d(NWB.build('J', o(4))),
          S4i: d(NWB.build('S', Object.assign(o(4), { lyr: 0 }))), cs4: d(createSong('instr', { nVox: 4, lyr: 1 })),
          pv: NWPV.sampleOf('S', { title: '未命名曲谱', key: 'C', beats: 4, unit: 4, tempo: 90, nVox: 4, lyr: 1 }).voxNotations.join('/') }; });
      T(r.S4.v === '女高/女低/男高/男低' && r.S4.n === 'staff/staff/staff/bass' && r.S4.name === '五线谱合唱谱', 'I4a 新建四部合唱（五线）：女高 / 女低 / 男高 / 男低，谱号 高 高 高 低，谱名五线谱合唱谱', J(r.S4));
      T(r.S3.v === '女高/女低/男低' && r.S3.n === 'staff/staff/bass' && /合唱/.test(r.S3.name) && r.S2.n === 'staff/staff' && /合唱/.test(r.S2.name), 'I4b 三部 SAB：女高 / 女低 / 男低（高 高 低）；二部两个高音谱号', J({ S3: r.S3, S2: r.S2 }));
      T(r.SJ4.n === 'staff/staff/staff/bass' && r.SJ4.v === '女高/女低/男高/男低' && r.J4.v === '女高/女低/男高/男低' && r.J4.n === '' ? true : (r.J4.n.split('/').every(x => x === '-') && r.SJ4.n === 'staff/staff/staff/bass' && r.J4.v === '女高/女低/男高/男低'),
        'I4c 教学对照四部同谱号；简谱合唱只改声部名（不写谱号）', J({ SJ4: r.SJ4, J4: r.J4 }));
      T(r.S4i.v === '旋律1/旋律2/旋律3/旋律4' && r.S4i.n === 'staff/staff/staff/staff' && r.cs4.v === '旋律1/旋律2/旋律3/旋律4' && r.pv === 'staff/staff/staff/bass',
        'I4d 无词五线谱多行（重奏谱）与老入口 createSong 不变；新建面板预览样谱四部同谱号', J({ S4i: r.S4i, cs4: r.cs4, pv: r.pv }));
    }
    if (want('I5')) {
      const c = await pg.evaluate(() => { const out = {}; ['弱起', 'rq', 'pickup'].forEach(q => { try { FLOW.menu.close(); } catch (_) {} FLOW.cmd.open(''); const i = document.getElementById('flw-cmdq'); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true }));
        out[q] = [...document.querySelectorAll('#flw-cmdl .flw-cmdr')].map(r => r.dataset.v).slice(0, 4); }); try { FLOW.menu.close(); } catch (_) {} return out; });
      T(['弱起', 'rq', 'pickup'].every(q => (c[q] || []).includes('r1:meta')), 'I5a 命令面板搜「弱起」「rq」「pickup」找得到「曲谱信息…」（弱起开关所在）', J(c));
      const d = {};
      for (const [nm, setup] of [['pk', 's => { s.pickup = true; }'], ['irr', 's => { s.measures[0].irr = 1; }'], ['free', 's => { s.freeMeter = true; }'], ['norm', 's => {}']]) {
        await pg.evaluate(a => { const s = NWB.build('S', { title: 'pk', key: 'C', beats: 3, unit: 4, nMea: 2, lyr: 0 }); s.measures[0].voxes[0] = [__V(5), __V(0), __V(0)]; s.measures[1].voxes[0] = [__V(1), __V(2), __V(3)];
          (new Function('return ' + a))()(s); __ld(s); sel.ci = 1; render(); }, setup);
        await keys(pg, 'Delete Delete');
        await pg.evaluate(() => { sel.mi = 1; sel.ci = 1; render(); }); await keys(pg, 'Delete');
        d[nm] = await pg.evaluate(() => ({ m: __dump(2), be: beatErrors().length }));
      }
      T(d.pk.m.split(' | ')[0] === '5/4' && d.irr.m.split(' | ')[0] === '5/4' && d.free.m.split(' | ')[0] === '5/4' && d.pk.be === 0, 'I5b 弱起首小节 / 不完整小节 / 散拍草稿里 Delete 直接删、不并时值（3/4 弱起留 1 拍）', J(d));
      T(d.norm.m === '5/2. | 1/4 3/2' && d.pk.m.split(' | ')[1] === '1/4 3/2', 'I5c 普通小节 Delete 与 v69.4 相同（删掉的时值并进相邻音）', J(d));
    }
    if (want('I6')) {
      const r = await pg.evaluate(() => { const s = NWB.build('G', { title: '琴', key: 'C', nMea: 2 }); const g0 = JSON.stringify(s.voxGroups);
        s.measures[0].voxes[0] = [__V(1, 4, { lyrics: ['一'] }), __V(2, 4, { lyrics: ['闪'] }), __V(3), __V(4)]; s.lyricLines = 1;
        const k = x => ({ g: PQ_KIND.groupsOf(x).map(y => y.type + y.from + '-' + y.to).join(), st: PQ_KIND.stackOf(x), nm: PQ_KIND.nameOf(x) });
        const old1 = JSON.parse(JSON.stringify(s)); delete old1.voxGroups;
        const old2 = JSON.parse(JSON.stringify(old1)); delete old2.instKey;
        const neg = JSON.parse(JSON.stringify(old2)); neg.voxVoices = ['甲', '乙'];
        __ld(s); const svgBrace = document.getElementById('score').innerHTML.includes('brace');
        return { g0, now: k(s), old1: k(old1), old2: k(old2), neg: k(neg), js: JSON.stringify({ old1, old2, neg }) }; });
      T(r.g0 === '[{"type":"brace","from":0,"to":1}]' && r.now.g === 'brace0-1' && r.now.st === 'G' && r.now.nm === '钢琴独奏谱', 'I6a 新建钢琴独奏显式花括号；右手填词后仍是花括号、谱名钢琴独奏谱', J(r.now));
      T(r.old1.g === 'brace0-1' && r.old1.nm === '钢琴独奏谱' && r.old2.g === 'brace0-1' && r.old2.nm === '钢琴独奏谱' && r.neg.g === 'bracket0-1',
        'I6b 没写分组的老钢琴谱：instKey piano 或声部名右手 / 左手 认花括号；反例（两行无钢琴身份、有词）仍是方括号', J({ old1: r.old1, old2: r.old2, neg: r.neg }));
      const KN = require(path.resolve(__dirname, '../../api/kindname.js')); const P = KN.PQ_KIND || KN;
      const sv = JSON.parse(r.js), sk = x => P.groupsOf(x).map(y => y.type + y.from + '-' + y.to).join() + ':' + P.nameOf(x);
      const srv = { old1: sk(sv.old1), old2: sk(sv.old2), neg: sk(sv.neg) };
      T(srv.old1 === 'brace0-1:钢琴独奏谱' && srv.old2 === 'brace0-1:钢琴独奏谱' && /^bracket0-1:/.test(srv.neg), 'I6c 服务端 api/kindname.js 同结论（谱库卡片 / 落地页谱名）', J(srv));
    }
    allErrs.push(...A.errs.map(x => 'flow2: ' + x));
    await A.ctx.close();
  } catch (e) { console.log('❌ 运行异常 ' + (e && e.stack || e)); fails.push('EXC'); total++; }
  T(!allErrs.length, 'E 页面脚本错误 0', allErrs.slice(0, 5).join(' / '));
  await b.close();
  console.log('\nPASS ' + pass + '/' + total + (fails.length ? '  失败：' + fails.join(' ') : ''));
  console.log(allErrs.length ? 'ERRORS' : 'NO ERRORS');
  process.exit(fails.length ? 1 : 0);
})();
