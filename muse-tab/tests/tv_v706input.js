'use strict';
/* v70.6 同谱表双声部 · 录入组：tv_v706input（规格 docs/spec-2026-11-v705.md §12.3–12.6，PROJECT.md §9.0 v70.5 遗留四条）。
   file:// 直载，真实浏览器（Playwright chromium，CHROMIUM_PATH）；新外壳 1280 为主，旧外壳 / ?next=0 / 回滚副本只验「没有入口」。
   K  键盘与声部开关（§12.3、G9）
      K1 G9 新外壳从空谱开始全程键盘写一小节两声部：时值键 + 数字写声部 1 → Ctrl+/ 搜「新建第二声部」回车 → 光标落到声部 2 同一拍 → 写 4 个四分 → Ctrl+Alt+1 回声部 1
      K2 撤销 / 重做：新建第二声部＝一步撤销（撤销后 JSON＝新建前），重做 JSON＝新建后；写完再撤销一步、重做一步 JSON 相等
      K3 弱起 / 不完整小节 / 复拍子：新建第二声部后每小节层与宿主等长（弱起 1 拍、irr 小节取 meaPkRef、6/8 整小节 6 个八分），全是隐形休止；时值检查 0 处
      K4 Ctrl+Alt+1 / 2 按拍位对齐（moveVoice 口径）：宿主二分二分 / 层四个四分，层第 4 拍 → 宿主第 2 列；宿主第 2 列 → 层第 3 列
      K5 右栏属性页分段开关「声部 1 / 声部 2」：只在层对里出；按下态＝光标所在声部；点「声部 2」光标到层；按钮 ≤4 字、悬停名称 ≤12 字
      K6 快捷键只增不改：六线谱行 Ctrl+Alt+1 仍写左手指法 1；Alt+↓ 仍走 moveVoice；没有第二声部的旋律行 Ctrl+Alt+2 不改谱、提示「没有第二声部」（data-k=limit）；
         快捷键菜单：没有第二声部的谱与 v70.5（7af5743）逐字相同，有第二声部时恰多一行「声部 1 / 2 · Ctrl+Alt+1 / 2」
   T  音轨树与菜单（§12.3）
      T1 层挂在宿主下：层行 aria-level＝宿主＋1、带 .flw-tnest，子行不出记谱法层（data-layer jp / st）
      T2 本轨 ⋯：五线谱宿主没有层＝「新建第二声部」可用；简谱轨不出；有层后宿主 / 层两行都是「拆成独立一行」、不再有「新建第二声部」；菜单项 ≤6 字；从菜单点「新建第二声部」建出层
      T3 拆成独立一行：voxLayer 删键、见证删、两行 hid 全删、行数不变；一步撤销 JSON 复原
      T4 命令面板：新外壳搜「xjdesb」首条＝新建第二声部；?next=0 两条隐藏
      T5 新建第二声部的附带写法：宿主是组末行时组撑到层；八度谱号 / 移调 / 简谱对照复制到层；曲中谱号 / 八度线按起拍落到层列；层混音＝宿主拷贝＋lay:1；总轨数满 15 不建
   O  旧外壳 / ?next=0 / 回滚副本（VOX_LAYER_DRAW = 0）零入口（§12.5）：voxInOn 假；Ctrl+Alt+2 不动光标；没有声部开关；音轨树不缩进；⋯ 菜单没有两项；快捷键菜单没有那一行
   E  编辑一致性（§12.4）：结果与「剥掉层标记的同一份谱（各行独立）」逐行相同——E1 整小节复制粘贴 · E2 插小节 / 删小节 · E3 移调 · E4 时值检查；
      E5 从层行改谱号两行一起改、一步撤销；E6 hid 列光标能落、写音后成普通列、空格改时值后成普通列且补出的余量是可见休止
   L  v70.5 遗留四条
      L1 ① 孤立 hid：删宿主 / 删层后成独立行的那一行没有 hid；配伴奏（整组重写行）后旋律行没有 hid；旧版本编辑留下的残留（缺见证）MusicXML 导出写可见休止、
         partSong 删 hid；没有残留的单声部隐形休止照旧 print-object="no"；有效层对照旧 <forward>
      L2 ② MuseScore 交叉手（fixtures/v706/xhand.musicxml）：voice 5 归下谱表、跨谱表 3 个音、不建层；同一文件改成 voice 2（没有 ≥5 编号）照旧取多数；
         v70.5 的 30 份导入夹具（F01–F27）导入结果与 7af5743 逐字节相同
      L3 ③ 单件小提琴带第二声部：?next=0 悬浮条工具有「配伴奏」（旋律数按分类视图单元 lbMelHosts＝1）；闭合二部合唱（声乐层）仍是 2 个单元
      L4 ④ restBlank 把 hid 当空白：空格改长吸收后面的隐形休止（不超拍）、被部分吸收的那一列仍是 hid；录入时值沿用改长同样吸收
   W  文案：node deploy/check-wording.js 字数预算各项新增 0、禁止词 0
   E0 页面脚本错误 0
   修前红：MUSETAB_URL 指 git show 7af5743:muse-tab/index.html 的副本——K1 K2a K3–K6 T1–T5 L1a–c L2a L3 L4 红（没有入口与修改）；
   K2b、O1、E1–E6、L2b、L2c（与自己比）、W1（跑工作区的闸）是守卫，基线同绿。CI 浅克隆没有 7af5743 时 K6 的基线对照与 L2c 改比对拍快照 fixtures/v706_ref_snap.json 的 input 段（v70.6 集成；node tv_v706input.js --write-snap 用基线页重写，只写 K6 文本与 L2c 的 sha1）。
   env：MUSETAB_URL 被测页（缺省 ../index.html）· V706_REF 基线页（缺省 git show 7af5743）· ONLY=K,T,O,E,L,W 只跑部分段 */
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const REF_COMMIT = '7af5743';
const ROOT = path.resolve(__dirname, '..', '..');
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (d != null && !ok ? '：' + String(d).slice(0, 1600) : '')); };
const J = x => JSON.stringify(x);
const fileOf = u => { const m = /^file:\/\/([^?#]*)/.exec(u); return m ? decodeURIComponent(m[1]) : null; };
const FX5 = fs.readdirSync(path.join(__dirname, 'fixtures', 'v705')).filter(f => /\.musicxml$/.test(f)).sort();
const XH = fs.readFileSync(path.join(__dirname, 'fixtures', 'v706', 'xhand.musicxml'), 'utf8');
const NEEDLE = 'const VOX_LAYER_DRAW = 1;';
const SNAPM = require('./v706_snap.js');
const WSNAP = process.argv.includes('--write-snap');
const SNAP = WSNAP ? null : SNAPM.section('input');
const SNAPW = {};
const refUrl = () => {
  if (process.env.V706_NOREF) return null;   /* 模拟 CI 浅克隆（取不到基线提交）：走快照 */
  if (process.env.V706_REF) return toUrl(process.env.V706_REF);
  try { const t = path.join(os.tmpdir(), 'v706_ref_' + REF_COMMIT + '.html');
    if (!fs.existsSync(t) || fs.statSync(t).size < 1e5) { const x = t + '.' + process.pid; fs.writeFileSync(x, execFileSync('git', ['-C', ROOT, 'show', REF_COMMIT + ':muse-tab/index.html'], { maxBuffer: 1 << 28 })); fs.renameSync(x, t); }
    return 'file://' + t; } catch (_) { return null; }
};
const rollbackUrl = u => {
  const f = fileOf(u); if (!f) return null;
  const txt = fs.readFileSync(f, 'utf8'); if (txt.split(NEEDLE).length - 1 !== 1) return null;
  const out = txt.replace(NEEDLE, 'const VOX_LAYER_DRAW = 0;');
  const t = path.join(os.tmpdir(), 'v706_rollback_' + crypto.createHash('sha1').update(out).digest('hex').slice(0, 12) + '.html');
  if (!fs.existsSync(t)) { const x = t + '.' + process.pid; fs.writeFileSync(x, out); fs.renameSync(x, t); }
  return 'file://' + t;
};

/* 页内助手（每页注入一次）：__C 列模板 · __LV 分层夹具 · __ld 载入（清撤销栈、光标回第 1 小节）· __rows 行摘要 · __S 当前谱快照 */
const PAGE_INIT = () => {
  window.SF_PLAYWAIT = false; window.guardReplace = p => p();
  try { hideStartPad(); } catch (_) {} try { const t = document.querySelector('#flw-tour'); if (t) t.remove(); } catch (_) {}
  window.__C = (deg, dur, x) => Object.assign({ dur: dur || 4, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, x || {});
  /* 分层夹具：names / nota / lay（undefined＝不写键）；o.w 见证行（缺省＝lay 为 1 的行）；每行每小节 4 个四分（宿主 1 2 3 4 级，层「5 · 隐形 · 6 · 隐形」） */
  window.__LV = (names, nota, lay, o) => { o = Object.assign({}, o); const w = o.w; delete o.w; const nm = o.nMea || 2; delete o.nMea;
    const wr = w || (Array.isArray(lay) ? lay.map((x, i) => (x === 1 ? i : -1)).filter(i => i >= 0) : []);
    const isL = i => Array.isArray(lay) && lay[i] === 1, C = window.__C;
    const row = (i, mi) => { const oc = nota[i] === 'bass' ? -1 : 0;
      if (isL(i)) return [C(5, 4, { oct: oc }), C(0, 4, { hid: 1 }), C(6, 4, { oct: oc }), C(0, 4, { hid: 1 })];
      return [1, 2, 3, 4].map(d => C(((d + i + mi) % 7) + 1, 4, { oct: oc })); };
    const mixer = {}; names.forEach((_, i) => { mixer['vox:' + i] = { on: true, solo: false, inst: o.inst0 || 'piano', vol: 1, pan: null }; if (wr.includes(i)) mixer['vox:' + i].lay = 1; });
    delete o.inst0;
    const d = { v: 3, title: '分层夹具', key: 'C', beats: 4, unit: 4, tempo: 90, capo: 0, tabVoices: [], voxVoices: names.slice(), voxNotations: nota.slice(), lyricLines: 0, customChords: {}, mixer,
      measures: Array.from({ length: nm }, (_, mi) => ({ tabs: [], voxes: names.map((_, i) => row(i, mi)), repeatStart: false, repeatEnd: false })) };
    if (lay !== undefined) d.voxLayer = lay;
    return Object.assign(d, o); };
  window.__ld = s => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    undoStack.length = 0; redoStack.length = 0; loadSong(migrate(JSON.parse(JSON.stringify(s))));
    sel = { mi: 0, row: (song.voxVoices || []).length ? 'vox' : 'tab', vi: 0, ci: 0, si: 1 }; clampSel(); selRange = null; noteSel = []; measureSel = null; measureRange = null; blurSel = false; render(); return true; };
  window.__S = () => JSON.parse(JSON.stringify(song));
  window.__row = (vi, mi) => (((song.measures[mi] || {}).voxes || [])[vi] || []).map(c => (c.deg ? c.deg : (c.hid === 1 ? 'h' : '0')) + '/' + c.dur + (c.dotted ? '.' : '')).join(' ');
  window.__beats = (vi, mi) => { const u = meaMeter(mi).unit; return (((song.measures[mi] || {}).voxes || [])[vi] || []).reduce((a, c) => a + beatsOf(c, u), 0); };
  window.__f = fn => { try { return fn(); } catch (e) { return '抛 ' + String(e && e.message || e).slice(0, 80); } };
  window.__strip = s => { s = JSON.parse(JSON.stringify(s)); delete s.voxLayer; Object.values(s.mixer || {}).forEach(e => { if (e && typeof e === 'object') delete e.lay; });
    (s.measures || []).forEach(m => ((m && m.voxes) || []).forEach(r => (r || []).forEach(c => { if (c) delete c.hid; }))); return s; };
  return true;
};
async function open(b, url, q, w) {
  const ctx = await b.newContext({ viewport: { width: w || 1280, height: 900 } });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss().catch(() => {}));
  await pg.goto(withQ(url, q || 'x=1'));
  await pg.waitForFunction(() => typeof importMusicXML === 'function' && typeof loadSong === 'function' && document.readyState === 'complete', null, { timeout: 30000 });
  await pg.waitForTimeout(400);
  await pg.evaluate(PAGE_INIT);
  return { ctx, pg, errs };
}
const EV = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => ({ err: String(e.message || e).slice(0, 400) }));
const wait = (pg, ms) => pg.waitForTimeout(ms);
/* 光标停在谱面上（焦点交还 body，键盘事件落到编辑器） */
const toBody = pg => pg.evaluate(() => { const ae = document.activeElement; if (ae && ae !== document.body && ae.blur) ae.blur(); try { closePop(); } catch (_) {} try { FLOW.menu.close(); } catch (_) {} return true; });

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const allErrs = [];
  const REF = refUrl();
  const A = await open(b, URL0, 'x=1');
  const P = A.pg;
  try {
    /* ================= K：键盘与声部开关 ================= */
    if (want('K')) {
      /* K1 / K2：空谱（一行五线谱、2 小节）从键盘写起 */
      await EV(P, () => { const s = createSong('instr', { nMea: 2, beats: 4, unit: 4, nVox: 1 }); s.title = '空谱'; window.__ld(s); return 1; });
      await toBody(P);
      const keys = [];
      const press = async k => { keys.push(k); await P.keyboard.press(k); await wait(P, 30); };
      for (const k of ['w', '5', '3']) await press(k);                              /* 声部 1：二分 5、二分 3（时值沿用） */
      for (const k of ['ArrowLeft', 'ArrowLeft']) await press(k);                   /* 回到第 1 小节第 1 列 */
      const J0 = await EV(P, () => JSON.stringify(song));
      await press('Control+Slash'); await wait(P, 300);
      await P.keyboard.type('xjdesb'); keys.push('xjdesb'); await wait(P, 300);
      await press('Enter'); await wait(P, 300);
      const k1a = await EV(P, () => ({ vl: song.voxLayer, vv: song.voxVoices, sel: [sel.vi, sel.mi, sel.ci], row1: window.__row(1, 0), ae: document.activeElement === document.body, pop: !!document.getElementById('popmenu') }));
      const J1 = await EV(P, () => JSON.stringify(song));
      await toBody(P);
      await press('Control+z'); const Ju = await EV(P, () => JSON.stringify(song));
      await press('Control+y'); const Jr = await EV(P, () => JSON.stringify(song));
      await EV(P, () => { sel = { mi: 0, row: 'vox', vi: 1, ci: 0, si: 1 }; clampSel(); render(); return 1; });   /* 重做后光标回到层第 1 列（撤销 / 重做不管光标） */
      for (const k of ['e', '1', '2', '3', '4']) await press(k);                   /* 声部 2：四分 1 2 3 4（写在隐形休止上） */
      await press('Control+Alt+Digit1');
      const k1 = await EV(P, () => ({ h: window.__row(0, 0), l: window.__row(1, 0), ok: PQ_KIND.voxLayerOk(song), sel: [sel.row, sel.vi], be: beatErrors().filter(e => e.mi === 0).length,
        hid: song.measures[0].voxes[1].some(c => 'hid' in c), w: (song.mixer || {})['vox:1'] && song.mixer['vox:1'].lay }));
      T(k1a.vl && J(k1a.vl) === '[null,1]' && k1a.sel[0] === 1 && k1a.sel[1] === 0 && k1a.sel[2] === 0 && k1a.row1 === 'h/4 h/4 h/4 h/4' && !k1a.pop
        && k1.h === '5/2 3/2' && k1.l === '1/4 2/4 3/4 4/4' && J(k1.ok) === '[0,1]' && k1.sel[1] === 0 && k1.be === 0 && !k1.hid && k1.w === 1,
        'K1 G9 新外壳空谱全程键盘写一小节两声部（' + keys.length + ' 次按键：w 5 3 ← ← · Ctrl+/ 搜 xjdesb 回车 · e 1 2 3 4 · Ctrl+Alt+1）：层＝宿主后一行、见证 lay:1、光标落声部 2 同一拍；写完声部 2 无隐形休止、本小节时值无误、回到声部 1',
        J({ k1a, k1 }));
      T(Ju === J0 && Jr === J1, 'K2a 新建第二声部＝一步撤销（Ctrl+Z 后 JSON＝新建前；Ctrl+Y 后 JSON＝新建后）', J({ undoEq: Ju === J0, redoEq: Jr === J1 }));
      const Je = await EV(P, () => JSON.stringify(song));
      await toBody(P); await press('Control+z'); const Je1 = await EV(P, () => JSON.stringify(song)); await press('Control+y'); const Je2 = await EV(P, () => JSON.stringify(song));
      T(Je1 !== Je && Je2 === Je, 'K2b 写完两声部后撤销一步再重做：JSON 与重做前逐字节相同', J({ changed: Je1 !== Je, same: Je2 === Je }));

      /* K3 弱起 / irr / 6/8 */
      const k3 = await EV(P, () => { const C = window.__C; const s = createSong('instr', { nMea: 4, beats: 4, unit: 4, nVox: 1 }); s.pickup = true;
        s.measures[0].voxes[0] = [C(5, 4)];                                   /* 弱起 1 拍 */
        s.measures[1].voxes[0] = [C(1, 2), C(3, 2)];
        s.measures[2].irr = 1; s.measures[2].voxes[0] = [C(2, 2), C(4, 4)];   /* 不完整小节 3 拍 */
        s.measures[3].beats = 6; s.measures[3].unit = 8; s.measures[3].voxes[0] = [C(1, 4, { dotted: true }), C(2, 4, { dotted: true })];   /* 6/8 */
        window.__ld(s); sel = { mi: 1, row: 'vox', vi: 0, ci: 0, si: 1 }; render();
        const at = voxLayerNew(0);
        return { at, eq: song.measures.map((m, mi) => [window.__beats(0, mi), window.__beats(1, mi)]), rows: song.measures.map((m, mi) => window.__row(1, mi)),
          allHid: song.measures.every(m => m.voxes[1].every(c => c.hid === 1 && !c.deg)), be: beatErrors().length, pk: meaPkRef(0), irr: meaPkRef(2) }; });
      T(!k3.err && k3.at === 1 && k3.eq.every(([h, l]) => Math.abs(h - l) < 1e-6) && k3.rows[0] === 'h/4' && k3.rows[2] === 'h/2 h/4' && k3.rows[3] === 'h/8 h/8 h/8 h/8 h/8 h/8' && k3.allHid && k3.be === 0,
        'K3 弱起 / 不完整小节 / 6/8 新建第二声部：每小节层与宿主等长（弱起 1 拍＝一个四分、irr 3 拍＝二分＋四分、6/8 整小节＝6 个八分），全是隐形休止，时值检查 0 处', J(k3));

      /* K4 按拍位对齐 */
      const k4 = await EV(P, () => { const C = window.__C; const s = window.__LV(['旋律', '旋律·2'], ['staff', 'staff'], [null, 1], { inst0: 'ah' });
        s.measures[0].voxes[0] = [C(1, 2), C(3, 2)]; s.measures[0].voxes[1] = [C(5, 4), C(6, 4), C(7, 4), C(1, 4)];
        window.__ld(s); const o = {};
        sel = { mi: 0, row: 'vox', vi: 1, ci: 3, si: 1 }; render(); voxSwitch(1); o.a = [sel.vi, sel.ci];
        sel = { mi: 0, row: 'vox', vi: 0, ci: 1, si: 1 }; render(); voxSwitch(2); o.b = [sel.vi, sel.ci];
        voxSwitch(2); o.c = [sel.vi, sel.ci];   /* 已在声部 2：不动 */
        return o; });
      T(!k4.err && J(k4.a) === '[0,1]' && J(k4.b) === '[1,2]' && J(k4.c) === '[1,2]', 'K4 声部切换按拍位对齐（moveVoice 口径）：层第 4 拍 → 宿主第 2 列；宿主第 2 列（第 3 拍起）→ 层第 3 列；已在目标声部不动', J(k4));

      /* K5 右栏分段开关 */
      const k5 = await EV(P, async () => { const s = window.__LV(['小提琴', '小提琴·2'], ['staff', 'staff'], [null, 1], { inst0: 'violin' });
        window.__ld(s); try { FLOW.rd.show('prop'); FLOW.rd.open('prop'); } catch (_) {}
        render(); try { FLOW.rdp.paint(); } catch (_) {}
        const box = document.getElementById('flw-rx-voice'), bs = box ? [...box.querySelectorAll('button[data-fa="rdp:voice"]')] : [];
        const o = { has: !!box, n: bs.length, txt: bs.map(x => x.textContent), pr: bs.map(x => x.getAttribute('aria-pressed')), ti: bs.map(x => x.title) };
        if (bs[1]) bs[1].click();
        await new Promise(r => setTimeout(r, 60));
        o.after = [sel.vi]; const bs2 = [...document.querySelectorAll('#flw-rx-voice button[data-fa="rdp:voice"]')]; o.pr2 = bs2.map(x => x.getAttribute('aria-pressed'));
        /* 光标移到不在层对里的谱：区块为空 */
        window.__ld(window.__LV(['长笛'], ['staff'], undefined, {})); try { FLOW.rdp.paint(); } catch (_) {}
        const b2 = document.getElementById('flw-rx-voice'); o.emptyNo = b2 ? b2.innerHTML : null; o.vis = b2 ? getComputedStyle(b2).display : null;
        return o; });
      const nm12 = t => String(t || '').split(/[（(：]| · /)[0];
      T(!k5.err && k5.has && k5.n === 2 && J(k5.txt) === J(['声部 1', '声部 2']) && J(k5.pr) === J(['true', 'false']) && J(k5.after) === '[1]' && J(k5.pr2) === J(['false', 'true'])
        && k5.txt.every(t => Array.from(t).length <= 4) && k5.ti.every(t => Array.from(nm12(t)).length <= 12) && k5.emptyNo === '' && k5.vis === 'none',
        'K5 右栏属性页「声部 1 / 声部 2」：层对里出、按下＝光标所在声部、点「声部 2」光标到层；按钮 ≤4 字、悬停名称 ≤12 字；不在层对里区块为空不显示', J(k5));

      /* K6 快捷键只增不改 */
      const tabRun = async pg => { await EV(pg, PAGE_INIT); await EV(pg, () => { const s = createSong('guitar', { nMea: 2, beats: 4, unit: 4, nTab: 1, nVox: 1 });
          s.measures[0].tabs[0][0] = Object.assign(tcol(), { dur: 4, notes: [{ s: 2, f: 3 }] }); window.__ld(s); sel = { mi: 0, row: 'tab', vi: 0, ci: 0, si: 2 }; render(); return 1; });
        await toBody(pg); await pg.keyboard.press('Control+Alt+Digit1'); await wait(pg, 60);
        return EV(pg, () => { const c = song.measures[0].tabs[0][0]; return { lhF: (c.notes || [])[0] && c.notes[0].lhF, sel: [sel.row, sel.vi] }; }); };
      const helpOf = async (pg, s) => { await EV(pg, s0 => { window.__ld(s0); return 1; }, s); await toBody(pg);
        const r = await EV(pg, () => { try { FLOW.menu.open('help', document.getElementById('flw-st-help')); } catch (_) {}
          const p = document.getElementById('popmenu'); const t = p ? [...p.querySelectorAll('.flw-st-kv')].map(x => x.textContent) : null; try { FLOW.menu.close(); } catch (_) {} return t; });
        return r; };
      const k6 = {};
      k6.tab = await tabRun(P);
      const sNo = await EV(P, () => createSong('instr', { nMea: 2, beats: 4, unit: 4, nVox: 1 }));
      const sLay = await EV(P, () => window.__LV(['旋律', '旋律·2'], ['staff', 'staff'], [null, 1], { inst0: 'ah' }));
      k6.alt = await EV(P, s => { window.__ld(s); return 1; }, sLay); await toBody(P); await P.keyboard.press('Alt+ArrowDown'); await wait(P, 60);
      k6.alt = await EV(P, () => [sel.row, sel.vi]);
      await EV(P, s => { window.__ld(s); try { toastHide(); } catch (_) {} return 1; }, sNo); await toBody(P);
      const jb = await EV(P, () => JSON.stringify(song));
      await P.keyboard.press('Control+Alt+Digit2'); await wait(P, 80);
      k6.no = await EV(P, jb => { const t = document.getElementById('toast'); return { same: JSON.stringify(song) === jb, sel: [sel.row, sel.vi], k: t && t.dataset ? t.dataset.k || '' : '', t: t ? t.textContent : '' }; }, jb);
      k6.helpNo = await helpOf(P, sNo); k6.helpLay = await helpOf(P, sLay);
      if (REF) { const R = await open(b, REF, 'x=1'); k6.refTab = await tabRun(R.pg); k6.refHelp = await helpOf(R.pg, sNo); allErrs.push(...R.errs); await R.ctx.close(); if (WSNAP) SNAPW.k6 = { refTab: k6.refTab, refHelp: k6.refHelp }; }
      else if (SNAP && SNAP.k6) { k6.refTab = SNAP.k6.refTab; k6.refHelp = SNAP.k6.refHelp; }
      const HASREF = !!(REF || (SNAP && SNAP.k6));
      const extra = (k6.helpLay || []).filter(x => !(k6.helpNo || []).includes(x));
      T(k6.tab && k6.tab.lhF === '1' && (!HASREF || (k6.refTab && k6.refTab.lhF === '1')) && J(k6.alt) === J(['vox', 1])
        && k6.no.same && J(k6.no.sel) === J(['vox', 0]) && k6.no.k === 'limit' && /没有第二声部/.test(k6.no.t),
        'K6a 快捷键只增不改：六线谱行 Ctrl+Alt+1 仍写左手指法 1（同 7af5743）；Alt+↓ 仍走 moveVoice；没有第二声部的旋律行 Ctrl+Alt+2 不改谱、光标不动、提示「没有第二声部」', J({ tab: k6.tab, refTab: k6.refTab, alt: k6.alt, no: k6.no }));
      T(Array.isArray(k6.helpNo) && (!HASREF || J(k6.helpNo) === J(k6.refHelp)) && Array.isArray(k6.helpLay) && k6.helpLay.length === k6.helpNo.length + 1 && extra.length === 1 && /声部 1 \/ 2/.test(extra[0]) && /Ctrl\+Alt\+1 \/ 2/.test(extra[0]),
        'K6b 快捷键菜单：没有第二声部的谱与 7af5743 逐字相同；有第二声部时恰多一行「声部 1 / 2 · Ctrl+Alt+1 / 2」', J({ no: k6.helpNo, ref: k6.refHelp, extra }));
    }

    /* ================= T：音轨树与菜单 ================= */
    if (want('T')) {
      const menuOf = (vi) => EV(P, vi => { try { FLOW.menu.close(); } catch (_) {} const btn = document.querySelector('#flw-tr-vox-' + vi + ' [data-fa="tree:more"]');
        if (!btn) return null; FLOW.act('tree:more', btn, { detail: 1 }); const p = document.getElementById('popmenu');
        const it = p ? [...p.querySelectorAll('[data-fa="tree:layer"],[data-fa="tree:split"]')].map(x => ({ a: x.dataset.fa, t: x.querySelector('.flw-ml') ? x.querySelector('.flw-ml').textContent : x.textContent, dis: x.getAttribute('aria-disabled') === 'true' })) : null;
        return it; }, vi);
      const t1 = await EV(P, () => { window.__ld(window.__LV(['右手', '右手·2', '左手'], ['staff', 'staff', 'bass'], [null, 1, null], { voxGroups: [{ type: 'brace', from: 0, to: 2 }], instKey: 'piano' }));
        sel = { mi: 0, row: 'vox', vi: 1, ci: 0, si: 1 }; render(); try { FLOW.tree.paint(true); } catch (_) {}
        const r = i => document.getElementById('flw-tr-vox-' + i);
        const subs = i => { const x = r(i); const g = x && x.nextElementSibling && x.nextElementSibling.classList.contains('flw-tsubs') ? x.nextElementSibling : null; return g ? [...g.querySelectorAll('[data-layer]')].map(y => y.dataset.layer) : []; };
        return { lv: [0, 1, 2].map(i => r(i) && +r(i).getAttribute('aria-level')), nest: [0, 1, 2].map(i => !!(r(i) && r(i).classList.contains('flw-tnest'))), sub1: subs(1), sub0: subs(0), cur: sel.vi }; });
      T(!t1.err && t1.lv[1] === t1.lv[0] + 1 && t1.lv[2] === t1.lv[0] && J(t1.nest) === J([false, true, false]) && t1.sub1.length === 0,
        'T1 音轨树：层行挂在宿主下（aria-level＝宿主＋1、.flw-tnest），层的子行不出记谱法层（谱表级属性归宿主）', J(t1));
      /* T2 菜单 */
      await EV(P, () => { const s = createSong('instr', { nMea: 2, beats: 4, unit: 4, nVox: 2 }); s.voxNotations = ['staff', undefined]; window.__ld(s); try { FLOW.tree.paint(true); } catch (_) {} return 1; });
      const m0 = await menuOf(0), mJ = await menuOf(1);
      const made = await EV(P, () => { const p = document.getElementById('popmenu'); try { FLOW.menu.close(); } catch (_) {}
        const btn = document.querySelector('#flw-tr-vox-0 [data-fa="tree:more"]'); FLOW.act('tree:more', btn, { detail: 1 });
        const it = document.querySelector('#popmenu [data-fa="tree:layer"]'); if (it) it.click();
        return { vl: song.voxLayer, vv: song.voxVoices }; });
      await EV(P, () => { try { FLOW.tree.paint(true); } catch (_) {} return 1; });
      const mH = await menuOf(0), mL = await menuOf(1);
      T(m0 && m0.length === 1 && m0[0].a === 'tree:layer' && m0[0].t === '新建第二声部' && !m0[0].dis && Array.isArray(mJ) && mJ.length === 0
        && J(made.vl) === '[null,1,null]' && J(made.vv) === J(['旋律1', '旋律1·2', '旋律2'])
        && mH && mH.length === 1 && mH[0].a === 'tree:split' && mH[0].t === '拆成独立一行' && mL && mL.length === 1 && mL[0].a === 'tree:split'
        && [m0, mH].every(x => x.every(y => Array.from(y.t).length <= 6)),
        'T2 本轨 ⋯：五线谱宿主没有层＝「新建第二声部」（可用）、简谱轨不出；从菜单点它建出层（插在宿主后）；之后宿主与层都是「拆成独立一行」；菜单项 ≤6 字', J({ m0, mJ, made, mH, mL }));
      /* T3 拆成独立一行 */
      const t3 = await EV(P, () => { const s = window.__LV(['小提琴', '小提琴·2'], ['staff', 'staff'], [null, 1], { inst0: 'violin' });
        s.measures[0].voxes[0][1] = window.__C(0, 4, { hid: 1 });   /* 宿主上也放一个隐形休止 */
        window.__ld(s); const j0 = JSON.stringify(song); const ok = voxLayerSplit(1);
        const o = { ok, vl: song.voxLayer, lay: Object.keys(song.mixer).filter(k => 'lay' in song.mixer[k]), hid: song.measures.some(m => m.voxes.some(r => r.some(c => 'hid' in c))), n: song.voxVoices.length };
        undo(); o.undo = JSON.stringify(song) === j0; return o; });
      T(!t3.err && t3.ok === true && t3.vl === undefined && t3.lay.length === 0 && !t3.hid && t3.n === 2 && t3.undo,
        'T3 拆成独立一行：voxLayer 删键、见证删、宿主与层的 hid 全删（成为普通休止）、行数不变；一步撤销 JSON 复原', J(t3));
      /* T4 命令面板 */
      await EV(P, () => { window.__ld(createSong('instr', { nMea: 2, beats: 4, unit: 4, nVox: 1 })); return 1; }); await toBody(P);
      await P.keyboard.press('Control+Slash'); await wait(P, 250); await P.keyboard.type('xjdesb'); await wait(P, 250);
      const t4 = await EV(P, () => { const f = document.querySelector('#flw-cmdl [data-fa="cmd:go"]'); const o = { first: f && f.dataset.v, txt: f && f.textContent }; try { FLOW.menu.close(); } catch (_) {} return o; });
      let t4n = null; { const N = await open(b, URL0, 'next=0'); t4n = await EV(N.pg, () => (FLOW.cmd.list() || []).filter(x => /^trk:(layer|split)$/.test(x.id)).map(x => [x.id, !!(x.hide && x.hide())])); allErrs.push(...N.errs); await N.ctx.close(); }
      T(!t4.err && t4.first === 'trk:layer' && /新建第二声部/.test(t4.txt || '') && J(t4n) === J([['trk:layer', true], ['trk:split', true]]),
        'T4 命令面板：新外壳搜「xjdesb」首条＝新建第二声部；?next=0 两条隐藏', J({ t4, t4n }));
      /* T5 新建第二声部的附带写法：组撑到层 · 谱表级属性复制 · 曲中谱号 / 八度线按起拍落到层 · 混音条目＝宿主拷贝＋见证 · 上限 */
      const t5 = await EV(P, () => { const C = window.__C, o = {};
        const pn = window.__LV(['右手', '左手'], ['staff', 'bass'], undefined, { voxGroups: [{ type: 'brace', from: 0, to: 1 }], instKey: 'piano' });
        window.__ld(pn); voxLayerNew(1); o.lh = { g: song.voxGroups, ok: PQ_KIND.voxLayerOk(song), vv: song.voxVoices };
        window.__ld(pn); voxLayerNew(0); o.rh = { g: song.voxGroups, ok: PQ_KIND.voxLayerOk(song) };
        const s = window.__LV(['单簧管'], ['staff'], undefined, { inst0: 'flute', voxTransp: [-2], voxClefOct: [-1], voxDual: [true] });
        s.measures[0].voxes[0][2].clef = 'bass';
        s.measures[1].voxes[0][0].ott = '8va'; s.measures[1].voxes[0][0].ottTo = { mi: 1, ci: 1 }; s.measures[1].voxes[0][1].ott = '8va';
        window.__ld(s); voxLayerNew(0);
        const L = song.measures.map(m => m.voxes[1]);
        o.copy = { tr: song.voxTransp, co: song.voxClefOct, du: song.voxDual, ok: PQ_KIND.voxLayerOk(song), clef: L[0].map(c => c.clef || ''), ott: L[1].map(c => (c.ott || '') + (c.ottTo ? '>' + c.ottTo.mi + ':' + c.ottTo.ci : '')),
          mx: song.mixer['vox:1'], mx0: song.mixer['vox:0'] };
        const big = window.__LV(Array.from({ length: 15 }, (_, i) => 'V' + i), Array.from({ length: 15 }, () => 'staff'), undefined, { nMea: 1 });
        window.__ld(big); o.cap = voxLayNewWhy(0); const n0 = song.voxVoices.length; voxLayerNew(0); o.capN = song.voxVoices.length === n0;
        return o; });
      T(!t5.err && J(t5.lh.g) === J([{ type: 'brace', from: 0, to: 2 }]) && J(t5.lh.ok) === '[0,0,1]' && J(t5.lh.vv) === J(['右手', '左手', '左手·2'])
        && J(t5.rh.g) === J([{ type: 'brace', from: 0, to: 2 }]) && J(t5.rh.ok) === '[0,1,0]'
        && J(t5.copy.tr) === '[-2,-2]' && J(t5.copy.co) === '[-1,-1]' && J(t5.copy.du) === '[true,true]' && J(t5.copy.ok) === '[0,1]'
        && J(t5.copy.clef) === J(['', '', 'bass', '']) && J(t5.copy.ott) === J(['8va>1:1', '8va', '', '']) && t5.copy.mx.lay === 1 && t5.copy.mx.inst === t5.copy.mx0.inst
        && /音轨最多 15 条/.test(t5.cap) && t5.capN,
        'T5 新建第二声部：宿主是组末行时组撑到层（左手）、组内宿主随插入撑大（右手）；八度谱号 / 移调 / 简谱对照复制到层且层对生效；曲中谱号与八度线按起拍落到层列；层的混音条目＝宿主拷贝＋lay:1；总轨数满 15 不建（原因 ≤16 字）', J(t5));
    }

    /* ================= O：旧外壳 / ?next=0 / 回滚副本零入口 ================= */
    if (want('O')) {
      const rb = rollbackUrl(URL0);
      const envs = [['classic', URL0, 'shell=classic'], ['next0', URL0, 'next=0']].concat(rb ? [['rollback', rb, 'x=1']] : []);
      const out = {};
      for (const [k, u, q] of envs) {
        const X = await open(b, u, q);
        await EV(X.pg, () => { window.__ld(window.__LV(['旋律', '旋律·2', '长笛'], ['staff', 'staff', 'staff'], [null, 1, null], { inst0: 'ah' })); try { FLOW.rdp.paint(); } catch (_) {} try { FLOW.tree.paint(true); } catch (_) {} return 1; });
        await toBody(X.pg);
        const j0 = await EV(X.pg, () => JSON.stringify(song));
        await X.pg.keyboard.press('Control+Alt+Digit2'); await wait(X.pg, 60);
        out[k] = await EV(X.pg, j0 => { const f = fn => { try { return fn(); } catch (e) { return '无'; } };
          const box = document.getElementById('flw-rx-voice');
          let mi = null; const btn = document.querySelector('#flw-tr-vox-0 [data-fa="tree:more"]');
          if (btn && typeof FLOW !== 'undefined') { try { FLOW.act('tree:more', btn, { detail: 1 }); const p = document.getElementById('popmenu'); mi = p ? p.querySelectorAll('[data-fa="tree:layer"],[data-fa="tree:split"]').length : null; FLOW.menu.close(); } catch (_) {} }
          let help = null; try { const h = FLOW.menus.help(); help = /Ctrl\+Alt\+1 \/ 2/.test(h); } catch (_) {}
          return { on: f(() => voxInOn()), same: JSON.stringify(song) === j0, sel: [sel.row, sel.vi], box: box ? box.innerHTML : null, nest: document.querySelectorAll('#flw-tlist .flw-tnest').length, mi, help }; }, j0);
        allErrs.push(...X.errs); await X.ctx.close();
      }
      const okEnv = o => o && !o.err && o.on !== true && o.same && J(o.sel) === J(['vox', 0]) && !o.box && o.nest === 0 && !o.mi && !o.help;
      T(okEnv(out.classic) && okEnv(out.next0) && (!rb || okEnv(out.rollback)),
        'O1 旧外壳 / ?next=0 / 回滚副本（VOX_LAYER_DRAW = 0）零入口：voxInOn 假；Ctrl+Alt+2 不改谱不动光标；没有声部开关；音轨树不缩进；⋯ 菜单没有两项；快捷键菜单没有那一行', J(out));
    }

    /* ================= E：编辑一致性（§12.4） ================= */
    if (want('E')) {
      /* 同一操作在分层谱与「剥掉层标记」的同一份谱上各跑一次，逐行比（比较前两边都剥层标记与 hid） */
      const same = async (name, op) => EV(P, ({ op }) => {
        const run = s => { window.__ld(s); (0, eval)(op); return JSON.stringify(window.__strip(song).measures); };
        const s = window.__LV(['右手', '右手·2', '左手'], ['staff', 'staff', 'bass'], [null, 1, null], { voxGroups: [{ type: 'brace', from: 0, to: 2 }], instKey: 'piano', nMea: 3 });
        const a = run(s), ok = window.__f(() => PQ_KIND.voxLayerOk(song)), keep = J => J;
        const bb = run(window.__strip(s));
        return { eq: a === bb, ok }; }, { op });
      const e1 = await same('copy', 'measureRange={m1:0,m2:0}; copyMeasure(); measureRange=null; sel={mi:2,row:"vox",vi:0,ci:0,si:1}; measureSel=2; pasteMeasure();');
      const e1b = await EV(P, () => { window.__ld(window.__LV(['小提琴', '小提琴·2'], ['staff', 'staff'], [null, 1], { inst0: 'violin', nMea: 3 }));
        measureRange = { m1: 0, m2: 0 }; copyMeasure(); measureRange = null; sel = { mi: 2, row: 'vox', vi: 0, ci: 0, si: 1 }; measureSel = 2; pasteMeasure();
        return { l0: window.__row(1, 0), l2: window.__row(1, 2), ok: PQ_KIND.voxLayerOk(song) }; });
      T(!e1.err && e1.eq && J(e1.ok) === '[0,1,0]' && !e1b.err && e1b.l2 === e1b.l0 && J(e1b.ok) === '[0,1]',
        'E1 整小节复制粘贴：两个声部与各行独立时结果相同；层的隐形休止一起粘过去、层仍生效', J({ e1, e1b }));
      const e2 = await same('ins/del', 'sel={mi:0,row:"vox",vi:1,ci:0,si:1}; insMeasure(); sel={mi:2,row:"vox",vi:0,ci:0,si:1}; delMeasure();');
      const e2b = await EV(P, () => { window.__ld(window.__LV(['小提琴', '小提琴·2'], ['staff', 'staff'], [null, 1], { inst0: 'violin', nMea: 3 }));
        sel = { mi: 0, row: 'vox', vi: 1, ci: 0, si: 1 }; insMeasure(); const n1 = song.measures.length, ok1 = PQ_KIND.voxLayerOk(song);
        sel = { mi: 1, row: 'vox', vi: 0, ci: 0, si: 1 }; delMeasure();
        return { n1, n2: song.measures.length, ok1, ok2: PQ_KIND.voxLayerOk(song), rows: song.measures.every(m => m.voxes.length === 2), be: beatErrors().length }; });
      T(!e2.err && e2.eq && !e2b.err && e2b.n1 === 4 && e2b.n2 === 3 && J(e2b.ok1) === '[0,1]' && J(e2b.ok2) === '[0,1]' && e2b.rows && e2b.be === 0,
        'E2 插小节 / 删小节：两个声部与各行独立时结果相同；层仍生效、每小节两行、时值检查 0 处', J({ e2, e2b }));
      const e3 = await same('transpose', 'stepKey(2);');
      T(!e3.err && e3.eq, 'E3 移调（stepKey +2）：两个声部与各行独立时结果相同', J(e3));
      const e4 = await EV(P, () => { const C = window.__C; const s = window.__LV(['小提琴', '小提琴·2'], ['staff', 'staff'], [null, 1], { inst0: 'violin' });
        s.measures[1].voxes[1].push(C(3, 4));   /* 层第 2 小节超拍 */
        const be = x => { window.__ld(x); return beatErrors().map(e => [e.mi, e.row, e.vi]); };
        return { a: be(s), b: be(window.__strip(s)) }; });
      T(!e4.err && J(e4.a) === J(e4.b) && e4.a.some(e => e[0] === 1 && e[2] === 1), 'E4 时值检查：层超拍照常报在层行上，与各行独立时结果相同', J(e4));
      const e5 = await EV(P, () => { window.__ld(window.__LV(['小提琴', '小提琴·2'], ['staff', 'staff'], [null, 1], { inst0: 'violin' })); const j0 = JSON.stringify(song), n0 = undoStack.length;
        sel = { mi: 0, row: 'vox', vi: 1, ci: 0, si: 1 }; voxClefSet(1, 'bass');
        const o = { vn: song.voxNotations.slice(), steps: undoStack.length - n0, ok: PQ_KIND.voxLayerOk(song) }; undo(); o.undo = JSON.stringify(song) === j0; return o; });
      T(!e5.err && J(e5.vn) === J(['bass', 'bass']) && e5.steps === 1 && J(e5.ok) === '[0,1]' && e5.undo, 'E5 从层行改谱号：两行一起改、层仍生效、一步撤销复原（§1.4）', J(e5));
      const e6 = await EV(P, () => { const o = {}; const s = window.__LV(['小提琴', '小提琴·2'], ['staff', 'staff'], [null, 1], { inst0: 'violin' });
        window.__ld(s); sel = { mi: 0, row: 'vox', vi: 1, ci: 1, si: 1 }; clampSel(); render(); o.land = [sel.vi, sel.ci, song.measures[0].voxes[1][1].hid];
        inputDigit(3); o.w = { deg: song.measures[0].voxes[1][1].deg, hid: 'hid' in song.measures[0].voxes[1][1] };
        window.__ld(s); sel = { mi: 1, row: 'vox', vi: 1, ci: 1, si: 1 }; clampSel(); render(); setDur(8);
        o.d = { row: window.__row(1, 1), hid1: 'hid' in song.measures[1].voxes[1][1], hid2: 'hid' in song.measures[1].voxes[1][2], b: window.__beats(1, 1) };
        return o; });
      T(!e6.err && J(e6.land) === '[1,1,1]' && e6.w.deg === 3 && !e6.w.hid && e6.d.row === '5/4 0/8 0/8 6/4 h/4' && !e6.d.hid1 && !e6.d.hid2 && e6.d.b === 4,
        'E6 hid 列：光标能落（选中隐形休止）；写音后成普通列；空格改八分后成普通列、补出的余量是可见休止，小节时值不变', J(e6));
    }

    /* ================= L：v70.5 遗留四条 ================= */
    if (want('L')) {
      /* L1 ① 孤立 hid */
      const l1 = await EV(P, () => { const C = window.__C, o = {};
        const base = () => { const s = window.__LV(['长笛', '小提琴', '小提琴·2'], ['staff', 'staff', 'staff'], [null, null, 1], { inst0: 'violin' }); s.measures[0].voxes[1][2] = C(0, 4, { hid: 1 }); return s; };
        window.__ld(base()); delVoiceAt('vox', 1); o.delHost = { vv: song.voxVoices, vl: song.voxLayer, hid: song.measures.some(m => m.voxes[1].some(c => 'hid' in c)) };
        window.__ld(base()); delVoiceAt('vox', 2); o.delLay = { vv: song.voxVoices, vl: song.voxLayer, hid: song.measures.some(m => m.voxes[1].some(c => 'hid' in c)) };
        /* 配伴奏（整组重写行；产物只取第 0 行） */
        const sm = window.__LV(['旋律', '旋律·2'], ['staff', 'staff'], [null, 1], { inst0: 'ah' }); sm.measures[0].voxes[0][3] = C(0, 4, { hid: 1 });
        window.__ld(sm); const ar = arrangeAccompaniment(song, { suggest: true }); const as = ar && ar.song;
        o.arr = as ? { vl: as.voxLayer, hid: as.measures.some(m => (m.voxes || []).some(r => (r || []).some(c => c && 'hid' in c))) } : 'null';
        /* 旧版本编辑留下的残留（缺见证）vs 有效层对 vs 第三方单声部隐形休止 */
        const mk = w => { const s = createSong('instr', { nMea: 1, beats: 4, unit: 4, nVox: 2 }); s.voxNotations = ['staff', 'staff'];
          s.measures[0].voxes[0] = [C(1, 2), C(0, 2, { hid: 1 })]; s.measures[0].voxes[1] = [C(0, 2, { hid: 1 }), C(5, 2)];
          s.voxLayer = [null, 1]; s.mixer = { 'vox:0': { on: true, solo: false, inst: 'ah', vol: 1, pan: null }, 'vox:1': Object.assign({ on: true, solo: false, inst: 'ah', vol: 1, pan: null }, w ? { lay: 1 } : {}) }; return s; };
        const cnt = (x, re) => (x.match(re) || []).length;
        const xo = exportMusicXML(mk(false)), xk = exportMusicXML(mk(true));
        const s3 = createSong('instr', { nMea: 1, beats: 4, unit: 4, nVox: 1 }); s3.measures[0].voxes[0] = [C(1, 2), C(0, 2, { hid: 1 })];
        const x3 = exportMusicXML(s3);
        o.exp = { orphPO: cnt(xo, /print-object="no"/g), orphFw: cnt(xo, /<forward>/g), okFw: cnt(xk, /<forward>/g), okPO: cnt(xk, /print-object="no"/g), solo: cnt(x3, /print-object="no"/g) };
        const so = migrate(mk(false)); window.__ld(so); const pl = partsPlan(song);
        const hidIn = r => { const ps = r && (r.song || r); return ps ? (ps.measures || []).some(m => (m.voxes || []).some(r2 => (r2 || []).some(c => c && 'hid' in c))) : 'null'; };
        o.part = (pl.parts || []).map(p => hidIn(partSong(p)));
        o.solo = hidIn(partSong({ id: 'v0', kind: 'inst', vox: [0, 1], tab: [] }));   /* 两行都留的一份：残留不成对（缺见证）→ 照样删 hid */
        o.orph = [...(hidOrphRows(song) || [])].sort();
        return o; });
      T(!l1.err && l1.delHost.vl === undefined && !l1.delHost.hid && l1.delLay.vl === undefined && !l1.delLay.hid,
        'L1a ① 删宿主 / 删层：成独立行的那一行（原层 / 原宿主）hid 删掉、成为普通休止（与「拆成独立一行」同口径）', J({ delHost: l1.delHost, delLay: l1.delLay }));
      T(!l1.err && l1.arr && l1.arr !== 'null' && l1.arr.vl === undefined && !l1.arr.hid, 'L1b ① 配伴奏（整组重写行）：产物旋律行没有 hid、没有 voxLayer', J(l1.arr));
      T(!l1.err && l1.exp.orphPO === 0 && l1.exp.orphFw === 0 && l1.exp.okFw === 2 && l1.exp.okPO === 0 && l1.exp.solo === 1 && J(l1.orph) === '[0,1]' && l1.part.every(x => !x) && l1.solo === false,
        'L1c ① 旧版本编辑留下的残留（voxLayer=1 但缺见证）：MusicXML 导出写可见休止（无 print-object="no"、无 forward）、partSong 删 hid；有效层对照旧 2 个 forward；第三方单声部隐形休止照旧 print-object="no"', J(l1));

      /* L2 ② 交叉手 */
      const imp = (pg, x) => EV(pg, x => { const c = c => (c.deg ? c.deg + (c.oct ? '^' + c.oct : '') : (c.hid === 1 ? 'h' : '0')) + '/' + c.dur; const r = importMusicXML(x); const s = r.song;
        return { vv: s.voxVoices, vl: s.voxLayer || null, rows: s.measures.map(m => m.voxes.map(rw => rw.map(c).join(' '))), xs: (r.lossy && r.lossy.xstaff) || 0 }; }, x);
      const l2 = await imp(P, XH), l2b = await imp(P, XH.replace(/<voice>5<\/voice>/g, '<voice>2</voice>'));
      T(!l2.err && J(l2.vv) === J(['右手', '左手']) && l2.vl === null && l2.rows[0][1] === '1^-1/2 3^1/4 5^1/4' && l2.rows[1][1] === '7^-2/2 6^1/2' && l2.xs === 3,
        'L2a ② MuseScore 交叉手（voice 5 多数音写在上谱表）：按编号惯例归下谱表——左手一行、跨谱表的 3 个音搬回左手（lossy.xstaff 3），不建「右手·2」、低音谱表不空', J(l2));
      T(!l2b.err && J(l2b.vv) === J(['右手', '右手·2', '左手']) && J(l2b.vl) === '[null,1,null]', 'L2b ② 同一文件改成 voice 2（没有 ≥5 编号）：照旧取多数（成「右手·2」）——惯例只用于出现 ≥5 编号的文件', J(l2b));
      if (REF) {
        const R = await open(b, REF, 'x=1'), xs = FX5.map(f => fs.readFileSync(path.join(__dirname, 'fixtures', 'v705', f), 'utf8'));
        const run = pg => EV(pg, xs => xs.map(x => { const r = importMusicXML(x); return JSON.stringify([r.song, r.skip, r.lossy || null]); }), xs);
        const a = await run(P), r = await run(R.pg); allErrs.push(...R.errs); await R.ctx.close();
        const diff = Array.isArray(a) && Array.isArray(r) ? FX5.filter((f, i) => a[i] !== r[i]) : ['运行失败'];
        if (WSNAP && Array.isArray(r)) SNAPW.l2c = Object.fromEntries(FX5.map((f, i) => [f, SNAPM.H1(r[i])]));
        T(diff.length === 0, 'L2c ② v70.5 的 ' + FX5.length + ' 份导入夹具（F01–F27）导入结果（song / skip / lossy）与 7af5743 逐字节相同', diff.join(' '));
      } else if (SNAP && SNAP.l2c) {   /* CI 浅克隆：比快照里的基线 sha1 */
        const xs = FX5.map(f => fs.readFileSync(path.join(__dirname, 'fixtures', 'v705', f), 'utf8'));
        const a = await EV(P, xs => xs.map(x => { const r = importMusicXML(x); return JSON.stringify([r.song, r.skip, r.lossy || null]); }), xs);
        const diff = Array.isArray(a) ? FX5.filter((f, i) => SNAPM.H1(a[i]) !== SNAP.l2c[f]) : ['运行失败'];
        T(diff.length === 0 && Object.keys(SNAP.l2c).length === FX5.length, 'L2c ② v70.5 的 ' + FX5.length + ' 份导入夹具（F01–F27）导入结果（song / skip / lossy）与 7af5743（快照）逐字节相同', diff.join(' '));
      }

      /* L3 ③ 单件小提琴带第二声部：配伴奏入口 */
      { const N = await open(b, URL0, 'next=0');
        const l3 = await EV(N.pg, () => { window.__ld(window.__LV(['小提琴', '小提琴·2'], ['staff', 'staff'], [null, 1], { instKey: 'violin', inst0: 'violin' })); try { FLOW.sbar.sync(); } catch (_) {}
          const o = { mh: lbMelHosts(song), mv: lbMelVoices(song), tools: [...document.querySelectorAll('#flw-sbar [data-fa="sbar:tool"]')].map(x => x.dataset.v) };
          window.__ld(window.__LV(['女高', '女低'], ['staff', 'staff'], [null, 1], { inst0: 'ah' }));
          song.lyricLines = 1; song.measures.forEach(m => m.voxes.forEach(r => r.forEach(c => { if (c.deg) c.lyrics = ['啊']; }))); render();
          o.duet = lbMelHosts(song).length; return o; });
        allErrs.push(...N.errs); await N.ctx.close();
        T(!l3.err && J(l3.mh) === '[0]' && J(l3.mv) === '[0,1]' && l3.tools.includes('arr') && l3.duet === 2,
          'L3 ③ 单件小提琴带第二声部：旋律数按分类视图单元（lbMelHosts [0]；「旋律用」切换仍是 [0,1] 两行一起切）——?next=0 悬浮条工具有「配伴奏」；闭合二部合唱（声乐层）仍是 2 个单元', J(l3)); }

      /* L4 ④ restBlank 把 hid 当空白 */
      const l4 = await EV(P, () => { const C = window.__C, o = {};
        const s = createSong('instr', { nMea: 1, beats: 4, unit: 4, nVox: 1 }); s.measures[0].voxes[0] = [C(0, 4, { hid: 1 }), C(0, 4, { hid: 1 }), C(0, 2, { hid: 1 })];
        o.rb = restBlank(s.measures[0].voxes[0][1], 'vox') && !restBlank(C(0, 4, { hid: 1, dyn: 'p' }), 'vox');
        window.__ld(s); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); setDur(2);
        o.blank = { row: window.__row(0, 0), be: beatErrors().length };
        window.__ld(s); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); setDur(2); sel.ci = 0; extendBeat_(1);
        o.ext = { row: window.__row(0, 0), be: beatErrors().length };
        window.__ld(s); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); setDur(1);
        o.whole = { row: window.__row(0, 0), be: beatErrors().length };
        return o; });
      T(!l4.err && l4.rb && l4.blank.row === '0/2 h/2' && l4.blank.be === 0 && l4.whole.row === '0/1' && l4.whole.be === 0,
        'L4 ④ restBlank 把 hid 当空白（带力度等内容的仍不算）：空格改二分吸收后面的隐形四分、改全音符吸收整小节隐形休止，都不超拍；所改列成可见休止', J(l4));
    }

    /* ================= W：文案 ================= */
    if (want('W')) {
      let out = '', code = 0;
      try { out = execFileSync('node', [path.join(ROOT, 'deploy', 'check-wording.js')], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { code = e.status || 1; out = String(e.stdout || '') + String(e.stderr || ''); }
      const adds = (out.match(/新增 (\d+)/g) || []).map(x => +x.replace(/\D/g, ''));
      T(code === 0 && adds.length >= 5 && adds.every(n => n === 0), 'W1 措辞闸：禁止词 0、字数预算各项新增 0（按钮 ≤4 字、菜单项 ≤6 字、悬停 ≤12 字）', out.split('\n').filter(l => /新增|❌/.test(l)).join(' | '));
    }
    if (WSNAP) { if (!SNAPW.k6 || !SNAPW.l2c) throw new Error('--write-snap：基线页取不到（git show ' + REF_COMMIT + ' 或 V706_REF），或没跑 K / L 段'); SNAPM.save('input', SNAPW); console.log('→ ' + SNAPM.FILE + '（input 段）'); }
  } catch (e) { T(false, 'RUN 运行异常', String(e && e.stack || e).slice(0, 800)); }
  allErrs.push(...A.errs);
  const real = allErrs.filter(e => !/ResizeObserver|AudioContext|autoplay/i.test(e));
  T(real.length === 0, 'E0 页面脚本错误 0', real.slice(0, 6).join(' | '));
  await b.close();
  console.log('\n' + (pass === total ? 'PASS' : 'FAIL') + ' ' + pass + '/' + total + (fails.length ? '  红：' + fails.join(' ') : ''));
  process.exit(pass === total ? 0 : 1);
})();
