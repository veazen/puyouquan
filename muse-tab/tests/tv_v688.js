'use strict';
/* v68.8（P0 MusicXML 换行互通 · P2 空列改短补空列 · P3 状态栏读数审计口径——③ 的断言在 tv_textbudget TB4）。
   file:// 直载，真实浏览器；几何断言用数值坐标（colBoxes / meaBoxes / SYS_GEO，容差 ±0.5），MusicXML 用 DOMParser 结构断言 + 逐字节比较。
   MX  互通（ENG-6）：MX1 导出位置 · MX2 往返（行首序列 / 页内相对几何 / 再导出逐字节）· MX3 第三方与无效写法不收 · MX4 同小节换页优先（收尾 IO-1：那一位 brk 经 pyq-brk-pg 往返）· MX5 pull 覆盖 ·
       MX6 边界（第 1 / 末小节、brk 只认数字 1）· MX7 钢琴大谱表 / TAB 独奏 / 弱起 · MX8 锁行（锁定状态不往返，有意）· MX9 pull 不映射（有意，行界变化只记 ℹ️）·
       MX10 分谱副本与「看分谱时导出的是总谱」· MX11 两套外壳 UI 导出逐字节相同 · MX12 .mtab 往返 · MX13 xmllint ·
       MX3b 多个 <software> 只认纯自家（收尾 IO-3）· MX14 新外壳排版工具组调过的行往返行界保留（收尾 IO-2）
   IN  输入（每条在新外壳与 ?shell=classic 各跑一次，两外壳的结果串相同）：IN1 报障原样（点 #eb-dur 8 分钮 + 几何）· IN2 键盘 · IN3 补列规则表＋一步撤销 ·
       IN4 不补的边界与 v68.7 相同 · IN5 超拍小节 · IN6 TAB 空列 / 两位品位 / 五线谱行 · IN7 附点（含 I-10 超拍吸收）· IN8 撤销 · IN9 反例钉子（不沿用时值）·
       IN10 已有音符的列上 q w e r t y u . d D 与 v68.7 相同
   KC  按键数：KC1 小星星 32 键 · KC2 四首贪心打法键数恰为 232 / 256 / 320 / 103，且少于 v68.7 同打法（263 / 299 / 343 / 116，结果是错的）与 v68.7 能打对的 Insert 补格打法（256 / 320 / 416 / 115，FX4c）· KC3 逐音按时值键 320 键结果正确
   FX  收尾（验收发现）：FX1 弱起首小节 / 散拍草稿改短不补、附点后不吃（IN-1 / R2 / IN-4，与 v68.7 逐字相同）· FX2 吸收只吃空白列（R1：带和弦名 / 延长号 / 被引用的列不吃）·
       FX3 补列 / 吸收后跨列引用平移（IN-3）与拍位和弦搬家 · FX4 Insert 老打法兼容（IN-2：紧接着的插入顶替刚补出的一格，优先同值 FX4d；32 小节原样重放与 v68.7 逐字节相同）
   v68.7 的对照数写死在本文件里（测于 27a74c1），不依赖 CI 基线。修前红：MUSETAB_URL 指向 git show 27a74c1:muse-tab/index.html 复跑 13/38——
   红 MX1 / 2 / 3（正对照）/ 6 / 7 / 8 / 10a / 10b / 11、IN1–3 / 6–9（两套外壳各一）、KC2 / KC3；绿的是「不变」守卫 MX4 / 5 / 9 / 12 / 13、IN4 / 5 / 10、IN·shell、KC1。
   env：MUSETAB_URL 被测页（缺省 ../index.html）· ONLY=MX,IN,KC 只跑部分段。 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (d ? '：' + d : '')); };
const J = x => JSON.stringify(x);
const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 0.5 : t);

/* ---------- 页内工具 ---------- */
const HELP = () => {
  window.__h = s => { s = String(s); let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16) + ':' + s.length; };
  window.__rep = (s, k) => { const base = JSON.parse(JSON.stringify(s.measures)); for (let i = 1; i < k; i++) s.measures.push(...JSON.parse(JSON.stringify(base))); return s; };
  /* L60：小星星 15 小节 ×4、固定版宽（同 tv_pgbrk） */
  window.__L60 = () => { const s = __rep(PRESETS[0].make(), 4); s.layout = { fixed: true }; return s; };
  window.__ld = s => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    undoStack.length = 0; redoStack.length = 0; loadSong(s);
    sel = { mi: 0, row: (song.tabVoices || []).length && !(song.voxVoices || []).length ? 'tab' : 'vox', vi: 0, ci: 0, si: 1 }; clampSel(); lastEnt = null; selRange = null; noteSel = []; render(); return song.measures.length; };
  window.__idx = (s, k) => s.measures.map((m, i) => m[k] === 1 ? i : -1).filter(i => i >= 0).join(',');
  /* 分页口径（打印 / 预览同口径）的行：[首小节, 末小节] */
  window.__rowsA = () => { const pp = PRINT_PAGING; PRINT_PAGING = true; try { return layoutSystems().map(x => [x.measures[0].mi, x.measures[x.measures.length - 1].mi]); } finally { PRINT_PAGING = pp; } };
  window.__rowsP = () => __rowsA().map(r => r[0] + '-' + r[1]).join(' ');
  /* 成品分页口径的 SYS_GEO：每行所在页、页内相对首行的 y0、行高（页 1 的题头高度随导入的元数据而变，故比页内相对量） */
  window.__geoRel = () => { let o = null; withCleanSnap(() => { const step = PV_GEO.pgH + PV_GEO.gap, top = {};
      o = SYS_GEO.map(x => { const pg = Math.floor((x.y0 + 0.5) / step); if (top[pg] == null) top[pg] = x.y0; return [pg, +(x.y0 - top[pg]).toFixed(2), +(x.y1 - x.y0).toFixed(2)]; }); }, { paging: true }); return o; };
  /* MusicXML 结构：每个 part 里第一个子元素是 <print> 的小节（下标:S＝new-system / P＝new-page），print 总数 */
  window.__chk = x => { const d = new DOMParser().parseFromString(x, 'application/xml'); const parts = [...d.querySelectorAll('score-partwise > part')];
    return { parts: parts.length, ns: parts.map(p => [...p.querySelectorAll(':scope > measure')].map((m, i) => { const f = m.firstElementChild;
      return f && f.tagName === 'print' ? i + ':' + (f.getAttribute('new-system') === 'yes' ? 'S' : '') + (f.getAttribute('new-page') === 'yes' ? 'P' : '') : null; }).filter(Boolean).join(',')),
      allPrint: d.querySelectorAll('print').length, nsYes: (x.match(/<print new-system="yes"\/>/g) || []).length, nsNo: /new-system="no"/.test(x), perr: !!d.querySelector('parsererror') }; };
  /* 输入：新建 4/4 简谱歌谱（同报障）；列串 */
  window.__fresh = (o) => { o = o || {}; const s = createSong(o.kind || 'vox', Object.assign({ title: '录入', key: 'C', beats: 4, unit: 4, nMea: 3, nVox: 1, lyr: 1 }, o.opt || {}));
    if (o.setup) o.setup(s); window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    loadSong(s); undoStack.length = 0; redoStack.length = 0;
    sel = { mi: 0, row: o.row || 'vox', vi: 0, ci: o.ci || 0, si: o.si || 1 }; lastEnt = null; noteSel = []; selRange = null; render();
    try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {} return true; };
  window.__f = c => (c.deg != null ? c.deg : ((c.notes || []).map(n => n.s + '.' + n.f).join('+') || '0')) + '/' + c.dur + (c.dotted === 2 ? '..' : c.dotted ? '.' : '') + (c.tup ? 't' + c.tup : '') + (c.tie ? '~' : '');
  window.__cols = (mi, row) => { const m = song.measures[mi]; if (!m) return null; row = row || sel.row; return row === 'tab' ? m.tabs[sel.vi] : m.voxes[sel.vi]; };
  window.__dump = (n, row) => song.measures.slice(0, n || 2).map((m, mi) => (__cols(mi, row) || []).map(__f).join(' ')).join(' | ');
  window.__sum = (mi, row) => +(__cols(mi, row) || []).reduce((a, c) => a + beatsOf(c, meaMeter(mi).unit), 0).toFixed(4);
  window.__st = () => ({ m: __dump(2), be: beatErrors().length, sel: sel.mi + ':' + sel.ci, u: undoStack.length });
  /* 导出捕获：URL.createObjectURL 的 Blob 与 a.download 文件名（不真下载） */
  window.__capOn = () => { window.__blobs = []; window.__dls = []; if (!window.__oCOU) { window.__oCOU = URL.createObjectURL; window.__oAC = HTMLAnchorElement.prototype.click; }
    URL.createObjectURL = b => { window.__blobs.push(b); return window.__oCOU.call(URL, b); }; HTMLAnchorElement.prototype.click = function () { window.__dls.push(this.download || ''); }; };
  window.__capOff = async () => { if (window.__oCOU) { URL.createObjectURL = window.__oCOU; HTMLAnchorElement.prototype.click = window.__oAC; }
    const txt = []; for (const b of window.__blobs || []) txt.push(await b.text()); return { txt, dl: (window.__dls || []).slice(), toast: (document.getElementById('toast') || {}).textContent || '' }; };
};

async function open(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 900 } });
  const pg = await ctx.newPage();
  await pg.addInitScript(HELP);
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss().catch(() => {}));
  let u = o.url || URL0; if (o.shell === 'classic') u = withQ(u, 'shell=classic');
  await pg.goto(u); await pg.waitForTimeout(1200);
  await pg.evaluate(() => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} });
  return { ctx, pg, errs, close: () => ctx.close() };
}
const EV = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => ({ err: String(e.message || e).slice(0, 300) }));

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const allErrs = [];
  try {
    /* ================= MX MusicXML「此处换行」↔ <print new-system> ================= */
    if (want('MX')) {
      const A = await open(b);
      const r = await EV(A.pg, () => {
        const R = {};
        /* MX1 / MX2 L60 两处「此处换行」 */
        { __ld(__L60()); sysBreakAt(12); sysBreakAt(30); render();
          R.a = { brk: __idx(song, 'brk'), pull: __idx(song, 'pull'), rows0: __rowsP(), geo0: __geoRel() };
          const x = exportMusicXML(song); window.__X1 = x; R.a.x = __chk(x); R.a.xml = x;
          { const d = new DOMParser().parseFromString(x, 'application/xml'); R.a.noPage = !d.querySelector('print[new-page]'); }
          const im = importMusicXML(x).song; R.a.rt = { brk: __idx(im, 'brk'), pull: __idx(im, 'pull'), pg: __idx(im, 'pgbrk') };
          __ld(im); R.a.rows1 = __rowsP(); R.a.geo1 = __geoRel(); R.a.reexp = exportMusicXML(song) === x; }
        /* MX3 第三方与无效写法 */
        { const x = window.__X1, sw = (t, n) => t.replace(/<software>[^<]*<\/software>/, '<software>' + n + '</software>');
          R.c = { third: ['MuseScore 4.4.2', 'Finale v27', 'Sibelius 2023'].map(n => __idx(importMusicXML(sw(x, n)).song, 'brk')),
            noenc: __idx(importMusicXML(x.replace(/<encoding>[\s\S]*?<\/encoding>/, '')).song, 'brk'), hasOwn: /<software>谱友圈/.test(x) };
          __ld(__L60()); const x0 = exportMusicXML(song); const auto = importMusicXML(x0).song; __ld(auto); R.c.rowsAuto = __rowsP();
          /* MuseScore 风格：每 4 小节一个带 system-layout 的 new-system，第 1 小节一个只带 system-layout 的 print */
          const msx = sw(x0, 'MuseScore 4.4.2').replace(/<measure number="(\d+)"([^>]*)>/g, (m, n) => { const i = +n - 1;
            return m + (i === 0 ? '<print><system-layout><system-margins><left-margin>0.00</left-margin><right-margin>0.00</right-margin></system-margins><top-system-distance>70.00</top-system-distance></system-layout></print>'
              : i % 4 === 0 ? '<print new-system="yes"><system-layout><system-margins><left-margin>0.00</left-margin><right-margin>0.00</right-margin></system-margins><system-distance>100.00</system-distance></system-layout></print>' : ''); });
          R.c.msPrints = (msx.match(/<print new-system="yes">/g) || []).length;
          const ms = importMusicXML(msx).song; R.c.ms = { brk: __idx(ms, 'brk'), pg: __idx(ms, 'pgbrk') }; __ld(ms); R.c.msRows = __rowsP();
          /* 自家文件：print 放进第 1 个 <measure>（不收）· new-system="no"（不收）· 正对照：第 13 小节 new-system="yes"（收，brk[11]） */
          R.c.first = __idx(importMusicXML(x0.replace(/<measure number="1">/g, '<measure number="1"><print new-system="yes"/>')).song, 'brk');
          R.c.no = __idx(importMusicXML(x0.replace(/<measure number="13">/g, '<measure number="13"><print new-system="no"/>')).song, 'brk');
          R.c.ctl = __idx(importMusicXML(x0.replace(/<measure number="13">/g, '<measure number="13"><print new-system="yes"/>')).song, 'brk'); }
        /* MX4 同小节换页优先 */
        { const s = __L60(); s.measures[20].brk = 1; s.measures[21].pgbrk = 1; __ld(s); const r0 = __rowsP(); const x = exportMusicXML(song);
          const im = importMusicXML(x).song; R.d = { x: __chk(x), pg: __idx(im, 'pgbrk'), brk: __idx(im, 'brk'), misc: (x.match(/<miscellaneous-field name="pyq-brk-pg">\[20\]<\/miscellaneous-field>/g) || []).length };
          __ld(im); R.d.same = __rowsP() === r0; R.d.rows = r0;
          /* 收尾 IO-1：两边都取消换页后行界相同（此前往返谱这一行回到自动断行）；第三方（software 换名）带着这个字段也不读 */
          sysPageBreak(21, false); R.d.c1 = __rowsP(); __ld(JSON.parse(JSON.stringify(s))); sysPageBreak(21, false); R.d.c0 = __rowsP();
          R.d.third = __idx(importMusicXML(x.replace(/<software>[^<]*<\/software>/, '<software>MuseScore 4.4.2</software>')).song, 'brk');
          /* 自家文件被改过：pyq-brk-pg 指的下一小节没有换页（new-page 被删）/ 下标越界、非整数、负数 → 都不读、不抛错 */
          R.d.forged = [x.replace(/<print new-page="yes"\/>/g, ''), x.replace('[20]</miscellaneous-field>', '[999,"a",-1,2.5]</miscellaneous-field>')]
            .map(t => { const r = importMusicXML(t); return r.error ? 'ERR' : __idx(r.song, 'brk') + '/' + __idx(r.song, 'pgbrk'); });
          R.d.noMisc = [window.__X1, (() => { const t = __L60(); t.measures[21].pgbrk = 1; __ld(t); return exportMusicXML(song); })(), (() => { const t = __L60(); t.measures[20].brk = 1; t.measures[21].pgbrk = 1; t.measures[21].pull = 1; __ld(t); return exportMusicXML(song); })()].map(t => /pyq-brk-pg/.test(t)); }
        /* MX3b（收尾 IO-3）多个 <software>：只有每个都是谱友圈才收版面断点（换行 brk / 换页 pgbrk 同口径） */
        { const two = (t, a, b2) => t.replace(/<software>[^<]*<\/software>/, '<software>' + a + '</software><software>' + b2 + '</software>');
          const xb = window.__X1, xp = (() => { const s = __L60(); s.measures[21].pgbrk = 1; __ld(s); return exportMusicXML(song); })();
          const own = '谱友圈 puyouquan.com', ms = 'MuseScore 4.4.2';
          R.c2 = { ownMs: [__idx(importMusicXML(two(xb, own, ms)).song, 'brk'), __idx(importMusicXML(two(xp, own, ms)).song, 'pgbrk')],
            msOwn: [__idx(importMusicXML(two(xb, ms, own)).song, 'brk'), __idx(importMusicXML(two(xp, ms, own)).song, 'pgbrk')],
            ownOwn: [__idx(importMusicXML(two(xb, own, own)).song, 'brk'), __idx(importMusicXML(two(xp, own, own)).song, 'pgbrk')],
            one: [__idx(importMusicXML(xb).song, 'brk'), __idx(importMusicXML(xp).song, 'pgbrk')] }; }
        /* MX5 pull 覆盖 */
        { const s = __L60(); s.measures[11].brk = 1; s.measures[12].pull = 1; __ld(s); const x = exportMusicXML(song); __ld(__L60()); const y = exportMusicXML(song);
          R.e = { prints: __chk(x).allPrint, same: x === y }; }
        /* MX6 边界 */
        { const plain = (() => { __ld(__L60()); return exportMusicXML(song); })();
          const one = f => { const s = __L60(); f(s.measures); __ld(s); return exportMusicXML(song); };
          const x0 = one(M => { M[0].brk = 1; });
          R.f = { first: __chk(x0).ns, last: one(M => { M[59].brk = 1; }) === plain,
            neutral: [true, '1', 2].map(v => one(M => { M[11].brk = v; }) === plain) }; }
        /* MX7 钢琴大谱表 / TAB 独奏 / 弱起 */
        { const s = __rep(PRESETS[8].make(), 3); s.measures[5].brk = 1; __ld(s); const x = exportMusicXML(song); const d = new DOMParser().parseFromString(x, 'application/xml');
          const m6 = d.querySelectorAll('score-partwise > part')[0].querySelectorAll(':scope > measure')[6], tags = m6 ? [...m6.children].map(c => c.tagName) : [];
          R.g = { piano: __chk(x), staves2: /<staves>2<\/staves>/.test(x), printFirst: tags[0] === 'print', beforeBackup: tags.indexOf('backup') > 0, rt: __idx(importMusicXML(x).song, 'brk') }; }
        { const s = __rep(PRESETS[7].make(), 3); s.measures[3].brk = 1; __ld(s); const x = exportMusicXML(song); R.g.tab = __chk(x); R.g.tabRt = __idx(importMusicXML(x).song, 'brk'); }
        { const s = __L60(); s.pickup = true; s.measures[0].brk = 1; s.measures[4].brk = 1; __ld(s); const x = exportMusicXML(song);
          const im = importMusicXML(x).song; R.g.pk = { pickup: !!song.pickup, rt: __idx(im, 'brk'), rtPickup: !!im.pickup,
            n1: /<measure number="1"><print new-system="yes"\/>/.test(x), n5: /<measure number="5"><print new-system="yes"\/>/.test(x), x: __chk(x) }; }
        /* MX8 锁行（第 3 行） */
        { __ld(__L60()); const L = layoutSystems(), row = L[2], m1 = row.measures[0].mi, m2 = row.measures[row.measures.length - 1].mi; sysLockRow(m1, m2); render();
          const r0 = __rowsP(), x = exportMusicXML(song); R.h = { m1, m2, locked0: sysRowLocked(m1, m2), brk0: __idx(song, 'brk'), pull0: __idx(song, 'pull'), x: __chk(x) };
          const im = importMusicXML(x).song; __ld(im); R.h.brk = __idx(song, 'brk'); R.h.pull = __idx(song, 'pull'); R.h.locked = sysRowLocked(m1, m2); R.h.same = __rowsP() === r0; }
        /* MX9 pull 不映射：每行 ＋ */
        { __ld(__L60()); const [a, b2] = __rowsA()[0]; const ok = sysAct('pull', a, b2); render(); const r0 = __rowsP(), x = exportMusicXML(song);
          R.i = { ok, pull0: __idx(song, 'pull'), x: __chk(x) }; const im = importMusicXML(x).song; R.i.pull = __idx(im, 'pull'); __ld(im); R.i.rows0 = r0; R.i.rows1 = __rowsP(); }
        /* MX10 分谱副本 */
        { const s = __rep(PRESETS[3].make(), 3); s.measures[1].brk = 1; s.measures[6].pull = 1; s.measures[4].pgbrk = 1; __ld(migrate(s)); const P = partsPlan(song);
          R.j = { n: P.parts.length, ids: P.parts.map(p => p.id), off: P.parts.map(p => __chk(exportMusicXML(partSong(p, { brk: false }).song))),
            on: P.parts.map(p => __chk(exportMusicXML(partSong(p, { brk: true }).song))), total: __chk(exportMusicXML(song)) }; }
        /* MX12 .mtab 往返（JSON 存取 + 载入） */
        { const s = __L60(); s.measures[11].brk = 1; s.measures[12].pull = 1; s.measures[20].brk = 1; s.measures[30].pgbrk = 1; __ld(s); const h0 = __h(document.getElementById('score').innerHTML);
          const txt = JSON.stringify(song); __ld(__L60()); __ld(JSON.parse(txt));
          R.k = { json: JSON.stringify(song) === txt, score: __h(document.getElementById('score').innerHTML) === h0, brk: __idx(song, 'brk'), pull: __idx(song, 'pull'), pg: __idx(song, 'pgbrk') }; }
        return R; });
      if (r.err) T(false, 'MX 取样', r.err);
      else {
        const a = r.a, ns2 = a.x.ns;
        T(a.brk === '11,29' && a.pull === '' && a.x.parts === 2 && ns2.length === 2 && ns2.every(s => s === '12:S,30:S') && a.x.allPrint === 4 && a.x.nsYes === 4 && a.noPage && !a.x.perr,
          'MX1 导出：L60 用「此处换行」在第 13、31 小节前换行（brk＝[11,29]）——2 个 part 的下标 12、30 的 <measure> 第一个子元素都是 <print new-system="yes"/>（无 new-page），别的小节没有 print，print 共 4 个',
          J({ brk: a.brk, x: a.x }));
        const gOk = a.geo0.length === a.geo1.length && a.geo0.every((g, i) => g[0] === a.geo1[i][0] && near(g[1], a.geo1[i][1]) && near(g[2], a.geo1[i][2]));
        T(a.rt.brk === '11,29' && a.rt.pull === '' && a.rt.pg === '' && a.rows1 === a.rows0 && gOk && a.reexp,
          'MX2 往返：importMusicXML 读回 brk＝[11,29]、无 pull / pgbrk；载入后分页口径的行首末逐行相同、SYS_GEO 每行同页且页内相对 y0 / 行高 ±0.5；再导出与第一次逐字节相同',
          J({ rt: a.rt, rows0: a.rows0, rows1: a.rows1 === a.rows0 ? '同' : a.rows1, geo: gOk ? a.geo0.length + ' 行同' : { g0: a.geo0.slice(0, 6), g1: a.geo1.slice(0, 6) }, reexp: a.reexp }));
        const c = r.c;
        T(c.hasOwn && c.third.every(x => x === '') && c.noenc === '' && c.msPrints === 28 && c.ms.brk === '' && c.ms.pg === '' && c.msRows === c.rowsAuto && c.first === '' && c.no === '' && c.ctl === '11',
          'MX3 只认自家导出：<software> 换成 MuseScore 4.4.2 / Finale v27 / Sibelius 2023、去掉 <encoding> → brk 全无；MuseScore 风格文件（2 个 part 各 14 个带 system-layout 的 new-system＋第 1 小节 print）→ brk / pgbrk 都没有、行界＝自动断行；自家文件 print 放进第 1 个 <measure>、new-system="no" → 不收（正对照：第 13 小节 new-system="yes" → brk[11]）',
          J(c));
        const c2 = r.c2;
        T(c2.ownMs.join('|') === '|' && c2.msOwn.join('|') === '|' && c2.ownOwn.join('|') === '11,29|21' && c2.one.join('|') === '11,29|21',
          'MX3b 多个 <software>（收尾 IO-3）：「谱友圈＋MuseScore」「MuseScore＋谱友圈」→ brk / pgbrk 都不收（别家另存过，print 可能已是对方的自动断点）；两个都是谱友圈、只有一个谱友圈 → brk [11,29] / pgbrk [21] 照收',
          J(c2));
        const d = r.d;
        T(d.x.ns.every(s => s === '21:P') && d.x.nsYes === 0 && d.pg === '21' && d.brk === '20' && d.misc === 1 && d.same && d.c1 === d.c0 && d.third === '' && d.noMisc.every(v => v === false) && J(d.forged) === J(['/', '/21']),
          'MX4 同小节换页优先：brk[20]＋pgbrk[21] → 第 22 小节只有 <print new-page="yes"/>（没有 new-system）；收尾 IO-1：那一位 brk 记在 <miscellaneous-field name="pyq-brk-pg">[20]，读回 pgbrk＝[21]、brk＝[20]，' +
          '行界相同、两边都取消换页后行界也相同；software 换成 MuseScore 不读；字段指的下一小节没有换页 / 下标无效时不读；只有换行 / 只有换页 / 换行被 pull 压掉时不写这个字段（输出与修前逐字节相同）', J(Object.assign({}, d, { c0: d.c0.split(' ').slice(4, 7).join(' '), c1: d.c1.split(' ').slice(4, 7).join(' ') })));
        T(r.e.prints === 0 && r.e.same, 'MX5 pull 覆盖：brk[11]＋pull[12]（谱面上那里不断行）→ 导出没有 print，与只去掉这两个字段的谱逐字节相同', J(r.e));
        T(r.f.first.every(s => s === '1:S') && r.f.last && r.f.neutral.every(Boolean), 'MX6 边界：brk[0] → print 在下标 1（第 2 小节开头）；brk[59]（末小节之后没有小节）不写；brk 为 true / \'1\' / 2 → 与不带字段逐字节相同（只认数字 1）', J(r.f));
        const g = r.g;
        T(g.piano.parts === 1 && g.piano.ns[0] === '6:S' && g.staves2 && g.printFirst && g.beforeBackup && g.rt === '5' && g.tab.parts === 1 && g.tab.ns[0] === '4:S' && g.tabRt === '3'
          && g.pk.pickup && g.pk.rtPickup && g.pk.n1 && g.pk.n5 && g.pk.rt === '0,4',
          'MX7 钢琴独奏（单 part、<staves>2）brk[5]：下标 6 的 print 是第一个子元素、在 <backup> 之前，往返 [5]；TAB 独奏 brk[3]：下标 4，往返 [3]；弱起 L60 brk[0]、brk[4]：print 在 <measure number="1"> 与 number="5" 开头，往返 [0,4]',
          J(g));
        const h = r.h, inner = [];
        for (let k = h.m1 + 1; k <= h.m2; k++) inner.push(k);
        T(h.locked0 && h.x.ns.every(s => s === h.m1 + ':S,' + (h.m2 + 1) + ':S') && h.x.nsYes === 2 * h.x.parts && h.brk === (h.m1 - 1) + ',' + h.m2 && h.pull === '' && h.locked === false && h.same,
          'MX8 锁行（第 3 行 ' + (h.m1 + 1) + '–' + (h.m2 + 1) + ' 小节）：导出两端（下标 ' + h.m1 + ' 与 ' + (h.m2 + 1) + '）各一个 new-system、行内没有；读回两端 brk 保留、pull 全无、sysRowLocked＝false（锁定状态不往返，有意）、同版宽行界相同', J(h));
        T(r.i.ok === true && r.i.pull0 !== '' && r.i.x.allPrint === 0 && !r.i.x.nsNo && r.i.pull === '', 'MX9 pull 不映射（有意）：旧外壳行尾 ○＋（sysAct pull）的谱导出 0 个 print、全文没有 new-system="no"；读回没有 pull', J({ pull0: r.i.pull0, x: r.i.x, pull: r.i.pull }));
        console.log('ℹ️ MX9 已知限制（不判）：旧外壳谱面行尾 ○＋（sysAct pull，只写 pull、不钉两端）调过的行 MusicXML 往返后回到自动断行（新外壳排版工具组的每行 ＋ / 并入上一行钉了两端 brk，行界保留，见 MX14）——原 ' + r.i.rows0.split(' ').slice(0, 6).join(' ') + ' … → 回 ' + r.i.rows1.split(' ').slice(0, 6).join(' ') + ' …' + (r.i.rows0 === r.i.rows1 ? '（这一例碰巧相同）' : ''));
        const j = r.j;
        T(j.n >= 2 && j.off.every(x => x.allPrint === 0) && j.on.every(x => x.parts >= 1 && x.ns.every(s => s === '2:S') && x.nsYes === x.parts) && j.total.ns.every(s => s === '2:S,4:P'),
          'MX10a 分谱副本：两只老虎×3（brk[1]、pull[6]、pgbrk[4]）' + j.n + ' 份——partSong(p,{brk:false}) 导出 0 个 print；{brk:true} 每个 part 恰一个 new-system 在下标 2、0 个 new-page（换页总是剥掉）；总谱 2:S,4:P', J({ ids: j.ids, off: j.off.map(x => x.allPrint), on: j.on.map(x => x.ns), total: j.total.ns }));
        T(r.k.json && r.k.score && r.k.brk === '11,20' && r.k.pull === '12' && r.k.pg === '30', 'MX12 .mtab 往返（JSON 存取 + 载入）：brk / pull / pgbrk 原样、JSON 与 #score 逐字节相同', J(r.k));
        /* MX13 xmllint */
        { const fp = path.join(os.tmpdir(), 'tv_v688_mx13_' + process.pid + '.musicxml'); let ok = true, msg = '';
          try { fs.writeFileSync(fp, a.xml); execFileSync('xmllint', ['--noout', fp], { stdio: ['ignore', 'pipe', 'pipe'] }); msg = 'xmllint 通过'; }
          catch (e) { if (e.code === 'ENOENT') msg = '本机没有 xmllint（跳过，DOMParser 已判 parsererror＝' + a.x.perr + '）'; else { ok = false; msg = String(e.stderr || e.message).slice(0, 200); } }
          try { fs.unlinkSync(fp); } catch (_) {}
          T(ok && !a.x.perr, 'MX13 带 new-system 的导出 xmllint --noout 通过（同 tv_mxl 口径）', msg); }
        /* MX10b 新外壳输出模式看着一份分谱时点 MusicXML：导出的是总谱，提示条带「（总谱）」 */
        { await EV(A.pg, () => { const s = __rep(PRESETS[3].make(), 3); s.measures[1].brk = 1; s.measures[6].pull = 1; s.measures[4].pgbrk = 1; __ld(migrate(s)); setMode('output'); });
          await A.pg.waitForTimeout(600);
          const id = j.ids[0]; await EV(A.pg, id => FLOW.out.view(id), id); await A.pg.waitForTimeout(500);
          await EV(A.pg, () => __capOn()); await A.pg.click('#flw-out-mxl'); await A.pg.waitForTimeout(300);
          const c2 = await EV(A.pg, async () => { const o = await __capOff(); o.score = exportMusicXML(song); o.cur = FLOW.out.cur; return o; });
          const t = (c2.txt || [])[0] || '', ch = t ? await EV(A.pg, x => __chk(x), t) : {};
          T(!c2.err && c2.cur === id && t === c2.score && ch.parts === j.total.parts && ch.nsYes === j.total.parts && /（总谱）$/.test(c2.toast),
            'MX10b 新外壳输出模式看着分谱「' + id + '」时点 MusicXML：导出的是总谱（与 exportMusicXML(song) 逐字节相同、part 数＝总谱、含 new-system），提示条末尾「（总谱）」',
            J({ cur: c2.cur, same: t === c2.score, parts: ch.parts, ns: ch.nsYes, toast: c2.toast, err: c2.err }));
          await EV(A.pg, () => setMode('write')); }
        /* MX14（收尾 IO-2）新外壳排版工具组「每行 ＋」「并入上一行」「每行 ＋ 后锁定此行」：两端钉成 brk（pinStart / pinEnd）→ 同版宽 MusicXML 往返行界逐行相同，只丢 pull 字段与锁定标记 */
        { const cases = [['bars', 9, [['lay:bars', { d: '1' }]]], ['join', 13, [['lay:join', {}]]], ['bars2', 9, [['lay:bars', { d: '1' }], ['lay:bars', { d: '1' }]]], ['barsLock', 9, [['lay:bars', { d: '1' }], ['lay:lock', { v: '1' }]]]];
          const out = {};
          for (const [nm, mi, acts] of cases) {
            out[nm] = await EV(A.pg, async ({ mi, acts }) => { __ld(__L60()); const auto = __rowsP(); setMode('engrave'); await new Promise(r => setTimeout(r, 300));
              const oks = []; for (const [a, ds] of acts) { sel.mi = mi; sel.ci = 0; oks.push(FLOW.lay.act(a, { dataset: ds })); render(); }
              setMode('write'); render(); const rows0 = __rowsP(), brk = __idx(song, 'brk'), pull = __idx(song, 'pull');
              const im = importMusicXML(exportMusicXML(song)).song; __ld(im);
              return { oks, auto, rows0, rows1: __rowsP(), brk, pull, rtBrk: __idx(song, 'brk'), rtPull: __idx(song, 'pull') }; }, { mi, acts }); }
          const bad = Object.keys(out).filter(k => { const o = out[k]; return !o || o.err || o.rows0 === o.auto || o.rows1 !== o.rows0 || o.rtPull !== '' || !o.pull; });
          T(!bad.length, 'MX14 新外壳排版工具组（每行 ＋ / 并入上一行 / 每行 ＋ 两次 / 每行 ＋ 后锁定此行）调过的行：MusicXML 往返后分页口径的行界逐行相同（与自动断行不同），读回没有 pull（只丢 pull 字段与锁定标记）',
            bad.map(k => k + J(out[k])).join(' | ') || Object.keys(out).map(k => k + ' ' + out[k].rows0.split(' ').slice(0, 4).join(' ') + '… brk ' + out[k].brk + ' pull ' + out[k].pull).join(' · ')); }
      }
      allErrs.push(...A.errs); await A.close();
      /* MX4b（收尾 IO-1）界面路径：新外壳排版工具组「此处换行」→「本行换页」（同一行首）；旧外壳 sysBreakAt → sysPageBreak（小节线菜单同函数）。
         MusicXML 往返后两边都取消换页，行界相同 */
      const ui4 = {};
      for (const shell of ['flow', 'classic']) {
        const P = await open(b, { shell });
        ui4[shell] = await EV(P.pg, async () => { __ld(__L60()); const flow = document.body.classList.contains('flow'); sel.mi = 14;
          if (flow) { setMode('engrave'); await new Promise(r => setTimeout(r, 300)); FLOW.lay.act('lay:brk', { dataset: {} }); render(); sel.mi = 14; FLOW.lay.act('lay:pbrk', { dataset: { v: '1' } }); render(); setMode('write'); }
          else { sysBreakAt(14); sysPageBreak(14); }
          render(); const A = { brk: __idx(song, 'brk'), pg: __idx(song, 'pgbrk'), rows: __rowsP() }; const x = exportMusicXML(song), js = JSON.stringify(song);
          sysPageBreak(14, false); A.cancel = __rowsP();
          __ld(importMusicXML(x).song); const B = { brk: __idx(song, 'brk'), pg: __idx(song, 'pgbrk'), rows: __rowsP() }; sysPageBreak(14, false); B.cancel = __rowsP();
          return { flow, A, B }; });
        allErrs.push(...P.errs); await P.close();
      }
      { const f = ui4.flow, c = ui4.classic, ok = o => o && !o.err && o.A.pg === '14' && /(^|,)13(,|$)/.test(o.A.brk) && o.B.brk === o.A.brk && o.B.pg === '14' && o.B.rows === o.A.rows && o.B.cancel === o.A.cancel;
        T(ok(f) && ok(c) && f.flow && !c.flow, 'MX4b 界面路径（新外壳排版工具组「此处换行」→「本行换页」· 旧外壳 sysBreakAt → sysPageBreak，同一行首第 15 小节）：MusicXML 往返读回同样的 brk / pgbrk，取消换页后两边行界逐行相同（收尾 IO-1；此前往返谱这一行回到自动断行）',
          J({ flow: f && f.A && { brk: f.A.brk, rt: f.B.brk, c0: f.A.cancel.split(' ').slice(2, 5).join(' '), c1: f.B.cancel.split(' ').slice(2, 5).join(' ') }, classic: c && c.A && { brk: c.A.brk, rt: c.B.brk, c0: c.A.cancel.split(' ').slice(2, 5).join(' '), c1: c.B.cancel.split(' ').slice(2, 5).join(' ') }, err: (f && f.err) || (c && c.err) })); }
      /* MX11 两套外壳的 UI 导出路径 */
      const got = {};
      for (const shell of ['flow', 'classic']) {
        const P = await open(b, { shell });
        await EV(P.pg, () => { __ld(__L60()); sysBreakAt(12); sysBreakAt(30); render(); __capOn(); });
        if (shell === 'flow') { await EV(P.pg, () => setMode('output')); await P.pg.waitForTimeout(600); await P.pg.click('#flw-out-mxl'); }
        else { await P.pg.click('#b-print'); await P.pg.waitForTimeout(400); await P.pg.click('#ex-mxl'); }
        await P.pg.waitForTimeout(300);
        got[shell] = await EV(P.pg, async () => { const o = await __capOff(); o.title = song.title; o.flow = document.body.classList.contains('flow'); return o; });
        allErrs.push(...P.errs); await P.close();
      }
      { const f = got.flow, c = got.classic, tf = (f.txt || [])[0] || '', tc = (c.txt || [])[0] || '', nf = (tf.match(/<print new-system="yes"\/>/g) || []).length;
        T(!f.err && !c.err && f.flow && !c.flow && tf.length > 1000 && tf === tc && nf === 4 && (tc.match(/<print new-system="yes"\/>/g) || []).length === 4 && f.dl[0] === f.title + '.musicxml' && c.dl[0] === c.title + '.musicxml',
          'MX11 两套外壳 UI 路径（新外壳输出模式 #flw-out-mxl · 旧外壳 #b-print → #ex-mxl）：下载的 Blob 文本逐字节相同、各含 4 个 new-system，文件名「曲名.musicxml」',
          J({ same: tf === tc, len: tf.length, ns: nf, dl: [f.dl, c.dl], err: f.err || c.err })); }
    }

    /* ================= IN 输入（两套外壳） ================= */
    if (want('IN')) {
      const res = {};
      for (const shell of ['flow', 'classic']) {
        const P = await open(b, { shell, vp: { width: 1280, height: 900 } }), pg = P.pg, R = res[shell] = {};
        const keys = async ks => { for (const k of ks) await pg.keyboard.press(k); };
        const run = async (nm, o, ks) => { const po = o ? { kind: o.kind, opt: o.opt, row: o.row, si: o.si, ci: o.ci } : null; await EV(pg, po => __fresh(po), po);
          if (o && o.pre) await EV(pg, o.pre); await keys(ks); R[nm] = await EV(pg, () => __st()); return R[nm]; };
        /* IN1 报障原样：点 8 分时值钮 */
        { await EV(pg, () => __fresh()); const u0 = await EV(pg, () => undoStack.length);
          await pg.click('#eb-dur [data-dur="8"]'); await pg.waitForTimeout(80);
          const s1 = await EV(pg, () => ({ m: __dump(1), sum: __sum(0), u: undoStack.length }));
          await keys(['5', '6']); await pg.click('#eb-dur [data-dur="8"]'); await pg.waitForTimeout(80); await keys(['5', '4', '3', '1']);
          const s2 = await EV(pg, () => { render(); const mb = meaBoxes[0], bx = [0, 1, 2, 3, 4, 5].map(ci => colBoxes['v0:0:' + ci]);
            return Object.assign(__st(), { mb: mb && [mb.x, mb.w], bx: bx.map(x => x ? [+x.x.toFixed(2), +x.w.toFixed(2)] : null), m1: (__cols(1) || []).map(__f).join(' ') }); });
          R.in1 = { u0, s1, s2 }; }
        /* IN2 键盘 */
        await run('in2a', null, ['r', '5', 'r', '6', 'r', '5', 'r', '4', '3', '1']);
        await run('in2b', null, ['r', '5', '6', 'r', '5', '4', '3', '1']);
        await run('in2c', null, ['t', '1', '2', '3', '4', '5', '6', '7']);
        /* IN3 / IN4 / IN5 规则表（setDur 直调；一步撤销回到原 JSON） */
        R.rules = await EV(pg, () => { const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
          const one = (o, act) => { __fresh(Object.assign({ opt: { nMea: 2 } }, o)); const j0 = JSON.stringify(song.measures[0]), u0 = undoStack.length; act(); render();
            const out = { m: (__cols(0) || []).map(__f).join(' '), sum: __sum(0), du: undoStack.length - u0 };
            if (out.du > 0) { undo(); render(); out.back = JSON.stringify(song.measures[0]) === j0; } return out; };
          const at = (ci, d) => () => { sel.ci = ci; setDur(d); };
          return {
            jp_4to16: one({}, at(0, 16)),
            jp_2to8: one({ setup: s => { s.measures[0].voxes[0] = [V(0, 2), V(0, 4), V(0, 4)]; } }, at(0, 8)),
            jp_1to64: one({ setup: s => { s.measures[0].voxes[0] = [V(0, 1)]; } }, at(0, 64)),
            jp_dot4to8: one({ setup: s => { s.measures[0].voxes[0] = [V(0, 4, { dotted: true }), V(0, 8), V(0, 2)]; } }, at(0, 8)),
            jp_dd8to32: one({ setup: s => { s.measures[0].voxes[0] = [V(0, 8, { dotted: 2 }), V(0, 32), V(0, 4), V(0, 2)]; } }, at(0, 32)),
            m68: one({ opt: { nMea: 2, beats: 6, unit: 8 } }, at(2, 16)),
            tab_4to8: one({ kind: 'solo', opt: { nMea: 2, nVox: 0 }, row: 'tab', si: 2 }, at(0, 8)),
            staff_4to8: one({ setup: s => { s.voxNotations = ['staff']; } }, at(0, 8)),
            /* IN4 不补：已有音符的列 · 连音组 · 选区批量 · 同值 */
            filled: one({ setup: s => { s.measures[0].voxes[0][0].deg = 5; } }, at(0, 8)),
            tup: one({ setup: s => { s.measures[0].voxes[0] = [1, 2, 3].map(() => V(0, 8, { tup: 3 })).concat([V(0, 4), V(0, 2)]); } }, at(0, 16)),
            range: one({}, () => { selRange = { row: 'vox', vi: 0, m1: 0, c1: 0, m2: 0, c2: 1 }; setDur(8); selRange = null; }),
            same: one({}, at(0, 4)),
            /* IN5 超拍小节（5 个空四分）首列按 t */
            over: one({ setup: s => { s.measures[0].voxes[0].push(V(0, 4)); } }, at(0, 16)) }; });
        await run('in4w', null, ['5', 'w']);
        /* IN6 TAB 空列：r → 3 → 两位品位 1 2（700ms 内） · 五线谱旋律行 r */
        { await EV(pg, () => __fresh({ kind: 'solo', opt: { nVox: 0 }, row: 'tab', si: 3 })); await keys(['r']);
          const t1 = await EV(pg, () => __dump(1, 'tab')); await keys(['3']);
          const t2 = await EV(pg, () => ({ m: __dump(1, 'tab'), sel: sel.mi + ':' + sel.ci, si: sel.si })); await keys(['1', '2']);
          const t3 = await EV(pg, () => ({ m: __dump(1, 'tab'), sel: sel.mi + ':' + sel.ci }));
          R.in6 = { t1, t2, t3 }; }
        await run('in6s', { pre: () => { song.voxNotations = ['staff']; render(); } }, ['r']);
        /* IN7 附点 */
        await run('in7a', null, ['5', 'r', '.', '6', '3', '1']);
        await run('in7b', null, ['5', '.', '6', '3', '1']);
        await run('in7c', null, ['5', '.', 'r', '6', '3', '1']);
        await run('in7d', null, ['r', '5', '.', '6', '3', '2', '1']);
        await run('in7e', null, ['w', '5', '.']);
        /* IN8 撤销 */
        { await EV(pg, () => __fresh()); await keys(['5', 'r']); const a8 = await EV(pg, () => __st()); await keys(['Control+z']); R.in8 = { a: a8, b: await EV(pg, () => __st()) }; }
        /* IN9 反例钉子 */
        await run('in9', null, ['r', '5', '6', '5', '4', '3', '1']);
        /* IN10 已有音符的列上：q w e r t y u . d D（光标停在第 2 个音上，没有刚落的音） */
        R.in10 = {};
        for (const k of ['q', 'w', 'e', 'r', 't', 'y', 'u', '.', 'd', 'Shift+D']) {
          await EV(pg, () => __fresh()); await keys(['5', '6', '5', '4']);
          await EV(pg, () => { sel = { mi: 0, row: 'vox', vi: 0, ci: 1, si: 1 }; lastEnt = null; render(); });
          await keys([k]); R.in10[k] = await EV(pg, () => __dump(2)); }
        allErrs.push(...P.errs); await P.close();
      }
      for (const shell of ['flow', 'classic']) {
        const R = res[shell], tag = ' [' + shell + ']';
        const i1 = R.in1, s2 = i1.s2 || {}, bx = s2.bx || [], mb = s2.mb || [0, 0];
        const inside = bx.length === 6 && bx.every(x => x && x[0] >= mb[0] - 0.5 && x[0] + x[1] <= mb[0] + mb[1] + 0.5);
        const narrow = bx.length === 6 && bx.every(Boolean) && Math.max(bx[0][1], bx[1][1], bx[2][1], bx[3][1]) < Math.min(bx[4][1], bx[5][1]);
        T(i1.s1.m === '0/8 0/8 0/4 0/4 0/4' && i1.s1.sum === 4 && i1.s1.u === i1.u0 + 1 && s2.m === '5/8 6/8 5/8 4/8 3/4 1/4 | 0/4 0/4 0/4 0/4' && s2.be === 0 && s2.sel === '1:0' && s2.m1 === '0/4 0/4 0/4 0/4' && inside && narrow,
          'IN1' + tag + ' 报障原样：4/4 空小节点 8 分时值钮 → 第 1 小节 [8,8,4,4,4]、总 4 拍、撤销栈 +1；键入 5 6、再点 8 分、键入 5 4 3 1 →「5/8 6/8 5/8 4/8 3/4 1/4」、无节拍错误、光标 1:0；几何：6 列 colBoxes 都在 meaBoxes[0] 内、八分列宽 < 四分列宽、第 2 小节 4 列全空',
          J({ s1: i1.s1, m: s2.m, be: s2.be, sel: s2.sel, mb, bx }));
        const w2 = '5/8 6/8 5/8 4/8 3/4 1/4 | 0/4 0/4 0/4 0/4';
        T(R.in2a.m === w2 && R.in2b.m === w2 && R.in2c.m === '1/16 2/16 3/16 4/16 5/4 6/4 7/4 | 0/4 0/4 0/4 0/4' && [R.in2a, R.in2b, R.in2c].every(x => x.be === 0),
          'IN2' + tag + ' 键盘：「r5 r6 r5 r4 3 1」与「r 5 6 r 5 4 3 1」都得「5/8 6/8 5/8 4/8 3/4 1/4」；「t 1 2 3 4 5 6 7」→ 1/16 2/16 3/16 4/16 5/4 6/4 7/4；都无节拍错误',
          J({ a: R.in2a.m, b: R.in2b.m, c: R.in2c.m }));
        const q = R.rules || {};
        const W3 = { jp_4to16: '0/16 0/16 0/16 0/16 0/4 0/4 0/4', jp_2to8: '0/8 0/8 0/8 0/8 0/4 0/4', jp_1to64: Array(16).fill('0/64').join(' ') + ' 0/2.', jp_dot4to8: '0/8. 0/8. 0/8 0/2',
          jp_dd8to32: '0/32. 0/32. 0/32. 0/32. 0/32 0/32 0/4 0/2', m68: '0/8 0/8 0/16 0/16 0/8 0/8 0/8', tab_4to8: '0/8 0/8 0/4 0/4 0/4', staff_4to8: '0/8 0/8 0/4 0/4 0/4' };
        const S3 = { m68: 6 }, bad3 = Object.keys(W3).filter(k => !q[k] || q[k].m !== W3[k] || q[k].sum !== (S3[k] || 4) || q[k].du !== 1 || q[k].back !== true);
        T(!q.err && !bad3.length, 'IN3' + tag + ' 补列规则（' + Object.keys(W3).length + ' 例：4→16 / 2→8 / 全→64 上限 16 格＋余数 / 附点四分→附点八分 / 双附点八分→32（降单附点）/ 6/8 中 8→16 / TAB 空列 / 五线谱行）：数据串与总拍（改前＝改后）逐条相同，撤销栈 +1，Ctrl+Z 一步回到原 JSON',
          q.err || (bad3.length ? bad3.map(k => k + '=' + J(q[k])).join(' ') : 'ok'));
        /* v68.7 的数据（测于 27a74c1）：不补的路径必须逐字相同 */
        const W4 = { filled: '5/8 0/4 0/4 0/4', tup: '0/16t3 0/8t3 0/8t3 0/4 0/2', range: '0/8 0/8 0/4 0/4', same: '0/4 0/4 0/4 0/4' };
        const bad4 = Object.keys(W4).filter(k => !q[k] || q[k].m !== W4[k]);
        T(!q.err && !bad4.length && R.in4w.m === '5/4 0/2 0/4 | 0/4 0/4 0/4 0/4',
          'IN4' + tag + ' 不补的边界与 v68.7 数据逐字相同：已有音符的列（5/8 0/4 0/4 0/4，照旧 3.5 拍报错）· 连音组内的空列 · 选区批量 · 同值 · 改长「5 w」→ 5/4 0/2 0/4（v63.6 吸收）',
          q.err || J(Object.assign({}, ...Object.keys(W4).map(k => ({ [k]: q[k] && q[k].m })), { w: R.in4w.m })));
        T(q.over && q.over.m === '0/16 0/8. 0/4 0/4 0/4' && q.over.sum === 4, 'IN5' + tag + ' 超拍小节（5 个空四分）首列按 t → 「0/16 0/8. 0/4 0/4 0/4」（补列后照旧吸收，与 v68.7 相同）', J(q.over));
        const i6 = R.in6 || {};
        T(i6.t1 === '0/8 0/8 0/4 0/4 0/4' && i6.t2 && i6.t2.m === '3.3/8 0/8 0/4 0/4 0/4' && i6.t2.sel === '0:1' && i6.t3 && i6.t3.m === '3.3/8 3.12/8 0/4 0/4 0/4' && i6.t3.sel === '0:2' && R.in6s.m.split(' | ')[0] === '0/8 0/8 0/4 0/4 0/4',
          'IN6' + tag + ' TAB 空列：按 r → [8,8,4,4,4]；键入 3 落在第 1 列第 3 弦、光标前进到补出的八分列；两位品位「1」「2」700ms 内合成 12 落在同一列；五线谱旋律行按 r 同简谱',
          J({ t1: i6.t1, t2: i6.t2, t3: i6.t3, staff: R.in6s.m }));
        const w7 = '5/4. 6/8 3/4 1/4 | 0/4 0/4 0/4 0/4';
        /* v69.6 I3（复核 N3，有意迁移）：按了时值键、尚未落音时的「.」作用于这一格——「5 r .」是给预选的八分加附点（6 落成附点八分，余下 16 分给 3），
           不再回落到刚落的 5（v68.7 / v68.8 的口径）；「5 . 6」「5 . r 6」「r 5 . 6」后置附点不变 */
        const w7a = '5/4 6/8. 3/16 1/4 0/4 | 0/4 0/4 0/4 0/4';
        T(R.in7a.m === w7a && R.in7b.m === w7 && R.in7c.m === w7 && R.in7d.m === '5/8. 6/16 3/4 2/4 1/4 | 0/4 0/4 0/4 0/4' && R.in7e.m === '5/2. 0/4 | 0/4 0/4 0/4 0/4' && [R.in7a, R.in7b, R.in7c, R.in7d, R.in7e].every(x => x.be === 0),
          'IN7' + tag + ' 附点：「5 . 6」「5 . r 6」都得 5/4. 6/8 3/4 1/4（与 v68.7 相同）；「5 r . 6」＝预选八分加附点 → 5/4 6/8. 3/16 1/4（v69.6）；「r 5 . 6」→ 5/8. 6/16 3/4 2/4 1/4；「w 5 .」附点后超拍 → 吃回 4 拍（5/2. 0/4）；都无节拍错误',
          J({ a: R.in7a.m, b: R.in7b.m, c: R.in7c.m, d: R.in7d.m, e: R.in7e.m }));
        T(R.in8.a.m === '5/4 0/8 0/8 0/4 0/4 | 0/4 0/4 0/4 0/4' && R.in8.b.u === R.in8.a.u - 1 && R.in8.b.m === '5/4 0/4 0/4 0/4 | 0/4 0/4 0/4 0/4',
          'IN8' + tag + ' 撤销：「5 r」（5/4 0/8 0/8 0/4 0/4）后 Ctrl+Z，撤销栈只少 1、第 1 小节回到 5/4 0/4 0/4 0/4（补列与改时值是同一步）', J(R.in8));
        T(R.in9.m === '5/8 6/8 5/4 4/4 3/4 | 1/4 0/4 0/4 0/4', 'IN9' + tag + ' 反例钉子（不沿用时值）：「r 5 6 5 4 3 1」→ 5/8 6/8 5/4 4/4 3/4 | 1/4——只有 r 那一格补出的八分是八分，第 3 个音起按原四分格落', R.in9.m);
        /* v68.7 的数据（测于 27a74c1）：已有音符的列上时值键 / 附点 / 增时线的结果 */
        const W10 = { q: '5/4 6/1 5/4 4/4 | 0/4 0/4 0/4 0/4', w: '5/4 6/2 5/4 4/4 | 0/4 0/4 0/4 0/4', e: '5/4 6/4 5/4 4/4 | 0/4 0/4 0/4 0/4', r: '5/4 6/8 5/4 4/4 | 0/4 0/4 0/4 0/4',
          t: '5/4 6/16 5/4 4/4 | 0/4 0/4 0/4 0/4', y: '5/4 6/32 5/4 4/4 | 0/4 0/4 0/4 0/4', u: '5/4 6/64 5/4 4/4 | 0/4 0/4 0/4 0/4', '.': '5/4 6/4. 5/8 4/4 | 0/4 0/4 0/4 0/4',
          d: '5/4 6/4 5/4 4/4 | 0/4 0/4 0/4 0/4', 'Shift+D': '5/4 6/4 5/4 4/4 | 0/4 0/4 0/4 0/4' };
        const bad10 = Object.keys(W10).filter(k => R.in10[k] !== W10[k]);
        T(!bad10.length, 'IN10' + tag + ' 快捷键含义不改：已有音符的列上 q w e r t y u . d D 与 v68.7 结果逐字相同（setDur 只改这一格，不补、不吸收）', bad10.length ? bad10.map(k => k + '=' + R.in10[k]).join(' · ') : 'ok');
      }
      { const f = res.flow, c = res.classic, keysOf = o => Object.keys(o).sort(), dif = keysOf(f).filter(k => J(f[k]) !== J(c[k]));
        /* IN1 的几何坐标（colBoxes / meaBoxes）随外壳版宽不同，不比；其余结果串逐字相同 */
        const dif2 = dif.filter(k => k !== 'in1' || J(Object.assign({}, f.in1.s2, { mb: 0, bx: 0 })) !== J(Object.assign({}, c.in1.s2, { mb: 0, bx: 0 })) || J(f.in1.s1) !== J(c.in1.s1));
        T(!dif2.length, 'IN·shell 两套外壳的输入结果串（IN1–IN10）逐字相同', dif2.join(',') || 'ok'); }
    }

    /* ================= FX 收尾（验收发现）：弱起 / 散拍不补 · 吸收不删内容列 · 跨列引用平移 · 拍位和弦搬家 · Insert 老打法兼容 ================= */
    if (want('FX')) {
      /* v68.7 的数据（测于 27a74c1；MUSETAB_URL 指向它复跑本段时这些「与 v68.7 相同」项为绿，带 ★ 的是本版修的 v68.7 老问题，在 v68.7 上为红） */
      const V687 = { pk1: '5/8', pk2: '5/16 | 6/4 0/4 0/4 0/4', pk3: '0/4 5/8', pkUI4: '5/4 | 1/4 1/4 5/4 5/4 | 6/4 6/4 5/2', pkUI8: '5/8 | 1/4 1/4 5/4 5/4 | 6/4 6/4 5/2', fm: 1.25,
        ins1: '5/8 6/8 5/8 4/8 3/4 1/4 | 0/4 0/4 0/4 0/4', ins2: '1/16 2/16 3/16 4/16 5/4 6/4 7/4 | 0/4 0/4 0/4 0/4', ins3: '0/8 5/8 6/4 0/4 0/4 | 0/4 0/4 0/4 0/4', insTab: '3.3/8 3.5/8 0/4 0/4 0/4', insDot: '5/8 6/8. 7/8 0/2' };
      const fx = {};
      for (const shell of ['flow', 'classic']) {
        const P = await open(b, { shell, vp: { width: 1280, height: 900 } }), pg = P.pg, R = fx[shell] = {};
        const keys = async ks => { for (const k of ks) await pg.keyboard.press(k); };
        const prep = (o) => EV(pg, o => { const V = (deg, dur) => ({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false });
          __fresh({ opt: o.opt, ci: o.ci, setup: s => { if (o.pk) s.pickup = true; if (o.m0) s.measures[0].voxes[0] = o.m0.map(d => V(0, d)); } }); return true; }, o);
        /* FX1 弱起首小节（IN-1 / R2）与散拍草稿（IN-4）：改短不补 */
        await prep({ pk: 1, m0: [4] }); await keys(['r', '5']); R.pk1 = await EV(pg, () => ({ m: __dump(1), be: beatErrors().length, n0: song.measures[0].voxes[0].length }));
        await prep({ pk: 1, m0: [4] }); await keys(['t', '5', '6']); R.pk2 = await EV(pg, () => __dump(2));
        await prep({ pk: 1, m0: [4, 4], ci: 1 }); await keys(['r', '5']); R.pk3 = await EV(pg, () => ({ m: __dump(1), be: beatErrors().length }));
        for (const [nm, k] of [['pkUI4', 'e'], ['pkUI8', 'r']]) {   /* 真实打法：弱起勾上 → Delete×3 并成 0/1 → 时值键定弱起 → 落音 */
          await prep({ pk: 1, opt: { nMea: 3 } }); await keys(['Delete', 'Delete', 'Delete', k, '5', '1', '1', '5', '5', '6', '6', '5', 'd']);
          R[nm] = await EV(pg, () => ({ m: __dump(3), be: beatErrors().length, w0: (render(), meaBoxes[0] ? +meaBoxes[0].w.toFixed(1) : null), w1: meaBoxes[1] ? +meaBoxes[1].w.toFixed(1) : null })); }
        R.fm = await EV(pg, () => { __fresh({ kind: 'solo', opt: { nVox: 0, beats: 2, nMea: 2 }, row: 'tab', si: 3, setup: s => { s.freeMeter = true; } }); setDur(16); return +__sum(0, 'tab'); });
        /* FX4 Insert / Shift+Insert 老打法（IN-2）：v68.7 熟手改短后补一格 */
        await prep({}); await keys('r Shift+Insert 5 6 r Shift+Insert 5 4 3 1'.split(' ')); R.ins1 = await EV(pg, () => ({ m: __dump(2), be: beatErrors().length }));
        await prep({}); await keys('t Shift+Insert Shift+Insert Shift+Insert 1 2 3 4 5 6 7'.split(' ')); R.ins2 = await EV(pg, () => ({ m: __dump(2), be: beatErrors().length }));
        await prep({}); await keys('r Insert 5 6'.split(' ')); R.ins3 = await EV(pg, () => ({ m: __dump(2), be: beatErrors().length }));
        /* 附点空列（补出的是附点格、插入格不带附点）：顶替那一格，结果仍与 v68.7 相同（含 v68.7 本身的欠拍） */
        await EV(pg, () => { const V = (d, dt) => ({ dur: d, dotted: dt, deg: 0, acc: '', oct: 0, lyrics: [], tie: false });
          __fresh({ setup: s => { s.measures[0].voxes[0] = [V(4, true), V(8, false), V(2, false)]; } }); return true; }); await keys('r Shift+Insert 5 6 7'.split(' '));
        R.insDot = await EV(pg, () => ({ m: __dump(1), be: beatErrors().length }));
        /* TAB 行同一打法（两位品位合并窗 700ms，两个品位之间停 800ms） */
        await EV(pg, () => __fresh({ kind: 'solo', opt: { nVox: 0 }, row: 'tab', si: 3 })); await keys(['r', 'Shift+Insert', '3']); await pg.waitForTimeout(800); await keys(['5']);
        R.insTab = await EV(pg, () => ({ m: __dump(1, 'tab'), be: beatErrors().length }));
        /* 标记失效：落过音 / 撤销后再插入，照常多一格（与 v68.7 同属「插入即加一格」） */
        await prep({}); await keys(['r', '5', 'Shift+Insert']); R.stale1 = await EV(pg, () => __dump(1));
        await prep({}); await keys(['r', 'Control+z', 'Shift+Insert']); R.stale2 = await EV(pg, () => __dump(1));
        await prep({}); await keys(['r', 'ArrowRight', 'Shift+Insert']); R.stale3 = await EV(pg, () => __dump(1));
        await prep({}); await keys(['r', 'Shift+Insert']); R.insU = await EV(pg, () => { const a = __dump(1), u = undoStack.length; undo(); render(); return { a, u, b: __dump(1) }; });
        /* 补出的格时值不一（全音符改 64 分：15 格 64 分 + 余数附点二分）：插入的 64 分顶替同值的一格，不顶替余数格（小节仍 4 拍） */
        await prep({ m0: [1] }); await keys(['u', 'Shift+Insert']); R.ins64 = await EV(pg, () => ({ m: __dump(1), be: beatErrors().length, sum: +__sum(0) }));
        allErrs.push(...P.errs); await P.close();
      }
      for (const shell of ['flow', 'classic']) {
        const R = fx[shell], tag = ' [' + shell + ']';
        T(R.pk1.m === V687.pk1 && R.pk1.be === 0 && R.pk1.n0 === 1 && R.pk2 === V687.pk2 && R.pk3.m === V687.pk3 && R.pk3.be === 0,
          'FX1a' + tag + ' 弱起首小节（IN-1 / R2）改短不补：1 拍弱起 [0/4] 按「r 5」→「5/8」（半拍弱起，1 列、无节拍错误）；「t 5 6」→ 5/16 | 6/4…；2 拍弱起 [0/4 0/4] 第 2 列「r 5」→ 0/4 5/8——都与 v68.7 逐字相同',
          J({ pk1: R.pk1, pk2: R.pk2, pk3: R.pk3 }));
        T(R.pkUI4.m === V687.pkUI4 && R.pkUI8.m === V687.pkUI8 && R.pkUI4.be === 0 && R.pkUI8.be === 0 && R.pkUI4.w0 < R.pkUI4.w1 - 10 && R.pkUI8.w0 < R.pkUI8.w1 - 10,
          'FX1b' + tag + ' 弱起真实打法（Delete×3 → e / r → 5 1 1 5 5 6 6 5 d）：「5/4 | 1 1 5 5 | 6 6 5 -」「5/8 | …」与 v68.7 相同；几何：弱起小节 meaBoxes[0].w 比第 1 整小节窄 10 以上（v68.8 修前补满 4 拍，两者同宽 250.8 / 弱起更宽）',
          J({ e: R.pkUI4, r: R.pkUI8 }));
        T(R.fm === V687.fm, 'FX1c' + tag + ' 散拍草稿（freeMeter，IN-4）2 拍 TAB 空列按 t → 实际拍数 1.25（不补，与 v68.7 相同）', String(R.fm));
        T(R.ins1.m === V687.ins1 && R.ins2.m === V687.ins2 && R.ins3.m === V687.ins3 && R.insTab.m === V687.insTab && [R.ins1, R.ins2, R.ins3, R.insTab].every(x => x.be === 0) && R.insDot.m === V687.insDot && R.insDot.be === 1,
          'FX4a' + tag + ' Insert 老打法（IN-2）：「r Shift+Insert 5 6 r Shift+Insert 5 4 3 1」「t Shift+Insert×3 1 2 3 4 5 6 7」「r Insert 5 6」、TAB 行「r Shift+Insert 3 5」与 v68.7 逐字相同（插入格顶替刚补出的一格），无节拍错误；附点空列 [0/4. 0/8 0/2]「r Shift+Insert 5 6 7」→ 5/8 6/8. 7/8 0/2（顶替附点补出格，与 v68.7 相同，连 v68.7 的欠拍 1 处也相同）',
          J({ a: R.ins1.m, b: R.ins2.m, c: R.ins3.m, tab: R.insTab.m, dot: R.insDot }));
        T(R.stale1 === '5/8 0/8 0/8 0/4 0/4 0/4' && R.stale2 === '0/4 0/4 0/4 0/4 0/4' && R.stale3 === '0/8 0/8 0/8 0/4 0/4 0/4' && R.insU.a === '0/8 0/8 0/4 0/4 0/4' && R.insU.b === '0/8 0/8 0/4 0/4 0/4' && R.insU.u >= 2,
          'FX4b' + tag + ' 顶替只在紧接着时：「r 5 Shift+Insert」「r Ctrl+Z Shift+Insert」「r → Shift+Insert」照常多插一格；「r Shift+Insert」= 两步撤销、撤销插入回到补列后的 [8,8,4,4,4]',
          J({ s1: R.stale1, s2: R.stale2, s3: R.stale3, u: R.insU }));
        T(R.ins64.m === Array(16).fill('0/64').join(' ') + ' 0/2.' && R.ins64.be === 0 && R.ins64.sum === 4,
          'FX4d' + tag + ' 顶替优先同值：全音符空列按 u（补出 15 格 64 分 + 余数 0/2.）再 Shift+Insert → 顶替一格 64 分、余数格不动，16 格 64 分 + 0/2.、小节仍 4 拍', J(R.ins64));
      }
      { const dif = Object.keys(fx.flow).filter(k => !/^pkUI/.test(k) && J(fx.flow[k]) !== J(fx.classic[k]))
          .concat(['pkUI4', 'pkUI8'].filter(k => fx.flow[k].m !== fx.classic[k].m));
        T(!dif.length, 'FX·shell 两套外壳的 FX1 / FX4 结果串逐字相同', dif.join(',') || 'ok'); }
      /* FX2 / FX3 数据层（单外壳，setDur / toggleDot 直调） */
      const A = await open(b);
      const q = await EV(A.pg, () => {
        const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
        const F = c => !c ? 'OUT' : (c.deg != null ? c.deg : ((c.notes || []).map(n => n.s + '.' + n.f).join('+') || '0')) + '/' + c.dur + (c.dotted ? '.' : '') + (c.chord ? '[' + c.chord + ']' : '') + (c.ferm ? '{F}' : '')
          + ((c.chords || []).length ? '{' + c.chords.map(x => x.q + ':' + x.chord).join(',') + '}' : '') + (c.ott ? '^' : '');
        const D = (mi, row) => (__cols(mi, row) || []).map(F).join(' ');
        const ld = (s, o) => { o = o || {}; window.guardReplace = p => p(); loadSong(s); undoStack.length = 0; redoStack.length = 0;
          sel = { mi: o.mi || 0, row: o.row || 'vox', vi: 0, ci: o.ci || 0, si: o.si || 1 }; lastEnt = null; selRange = null; noteSel = []; render(); };
        const base = o => createSong(o && o.kind || 'vox', Object.assign({ title: 't', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 1 }, (o && o.opt) || {}));
        const chordChart = cs => { const s = PRESETS.find(p => /纯和弦谱/.test(p.name)).make(); s.measures[0].voxes[0] = cs; return s; };
        const R = {};
        /* FX2 吸收只吃空白列（R1） */
        { ld(chordChart([V(0, 4, { chord: 'C' }), V(0, 8, { chord: 'G' }), V(0, 8, { chord: 'D' }), V(0, 4, { chord: 'Am' }), V(0, 4, { chord: 'F' })])); toggleDot(); R.chordDot = D(0); }
        { const s = base(); s.measures[0].voxes[0] = [V(5, 4), V(0, 8), V(0, 8, { chord: 'G', ferm: 1 }), V(0, 4), V(0, 4)]; ld(s); toggleDot(); R.vocDot = D(0); }
        { const s = base(); s.measures[0].voxes[0] = [V(5, 4), V(0, 8), V(0, 8, { ferm: 1 }), V(0, 4), V(0, 4)]; ld(s); toggleDot(); R.fermDot = D(0); }
        { const s = base(); s.measures[0].voxes[0] = [V(5, 4), V(0, 8), V(0, 8, { lyrics: ['啊'] }), V(0, 4), V(0, 4)]; ld(s); toggleDot(); R.lyrDot = D(0) + '|' + JSON.stringify(song.measures[0].voxes[0].map(c => (c.lyrics || [])[0] || '')); }
        { const s = base({ kind: 'solo', opt: { nVox: 0 } }); const T0 = (d, ch, nt) => Object.assign(tcol(), { dur: d, chord: ch, notes: nt || [] });
          s.measures[0].tabs[0] = [T0(4, 'C', [{ s: 5, f: 3 }]), T0(8, 'G'), T0(8, 'D'), T0(4, 'Am'), T0(4, 'F')]; ld(s, { row: 'tab', si: 5 }); toggleDot(); R.tabDot = D(0, 'tab'); }
        { ld(chordChart([V(0, 4, { chord: 'C' }), V(0, 4, { chord: 'G' }), V(0, 4, { chord: 'Am' }), V(0, 4, { chord: 'F' })])); setDur(2); R.chordLen = D(0); }
        { const s = base(); s.measures[0].voxes[0] = [V(5, 4, { dyn: '<', dynTo: { mi: 0, ci: 2 } }), V(0, 4), V(0, 4), V(0, 4)]; ld(s, { ci: 1 }); setDur(2);
          const c = __cols(0); R.refTgt = { m: D(0), to: c[0].dynTo.ci, same: c[c[0].dynTo.ci] === song.measures[0].voxes[0][2] }; }
        { const s = base(); s.measures[0].voxes[0] = [V(5, 4, { ott: '8va', ottTo: { mi: 0, ci: 3 } }), V(0, 4, { ott: '8va' }), V(0, 4, { ott: '8va' }), V(4, 4, { ott: '8va' })]; ld(s, { ci: 1 }); setDur(2);
          const c = __cols(0); R.ottAbs = { m: D(0), to: F(c[c[0].ottTo.ci]) }; }
        { const s = base(); s.measures[0].voxes[0] = [V(5, 4, { dyn: '<', dynTo: { mi: 0, ci: 3 } }), V(0, 4), V(0, 4), V(4, 4)]; ld(s, { ci: 1 }); setDur(2);
          const c = __cols(0); R.dynAbs = { m: D(0), to: F(c[c[0].dynTo.ci]) }; }
        /* FX3 补列后跨列引用平移（IN-3）与拍位和弦搬家 */
        { const s = base(); s.measures[0].voxes[0] = [V(5, 4, { dyn: 'cresc', dynTo: { mi: 0, ci: 3 } }), V(0, 4), V(3, 4), V(4, 4)]; ld(s, { ci: 1 }); setDur(8);
          const c = __cols(0); R.r1 = { m: D(0), to: F(c[c[0].dynTo.ci]) }; }
        { const s = base(); s.measures[0].voxes[0] = [V(5, 4, { dyn: 'cresc', dynTo: { mi: 0, ci: 3 } }), V(0, 4), V(3, 4), V(4, 4)]; ld(s, { ci: 1 }); setDur(8); insertNote(true);
          const c = __cols(0); R.r1i = { m: D(0), to: F(c[c[0].dynTo.ci]) }; }
        /* 引用终点就是被改短的那一格（渐强收在休止上）：Shift+Insert 插在它前面并顶替补出的格 → 终点随原来那一格后移一位（仍是同一个列对象） */
        { const s = base(); s.measures[0].voxes[0] = [V(5, 4, { dyn: 'cresc', dynTo: { mi: 0, ci: 1 } }), V(0, 4), V(3, 4), V(4, 4)]; ld(s, { ci: 1 }); const o = song.measures[0].voxes[0][1];
          setDur(8); insertNote(true); const c = __cols(0); R.r1j = { m: D(0), to: c[0].dynTo.ci, same: c[c[0].dynTo.ci] === o }; }
        { const s = base(); s.voxNotations = ['staff']; s.measures[0].voxes[0] = [V(5, 4, { ott: '8va', ottTo: { mi: 0, ci: 3 } }), V(0, 4, { ott: '8va' }), V(3, 4, { ott: '8va' }), V(4, 4, { ott: '8va' })];
          ld(s, { ci: 1 }); setDur(16); const c = __cols(0); R.r2 = { m: D(0), to: F(c[c[0].ottTo.ci]) }; }
        { const s = base({ kind: 'solo', opt: { nVox: 0 } }); const c0 = s.measures[0].tabs[0]; c0[0].notes = [{ s: 3, f: 5, tech: 'sl', tk: { mi: 0, ci: 2, si: 3 } }]; c0[2].notes = [{ s: 3, f: 7 }];
          ld(s, { row: 'tab', ci: 1, si: 3 }); setDur(8); const c = __cols(0, 'tab'), t = c[0].notes[0].tk; R.r3 = { m: D(0, 'tab'), to: F(c[t.ci]), si: t.si }; }
        { const s = base(); s.measures[0].voxes[0] = [V(1, 4), V(2, 4), V(3, 4), V(4, 4, { dyn: 'cresc', dynTo: { mi: 1, ci: 3 } })]; s.measures[1].voxes[0] = [V(5, 4), V(0, 4), V(6, 4), V(7, 4)];
          ld(s, { mi: 1, ci: 1 }); setDur(8); const t = song.measures[0].voxes[0][3].dynTo; R.r5 = { m: D(1), to: F(song.measures[1].voxes[0][t.ci]), mi: t.mi }; }
        { ld(chordChart([V(0, 1, { chord: 'C', chords: [{ q: 2, chord: 'G' }] })])); setDur(4); R.chq = D(0); }
        { ld(chordChart([V(0, 1, { chord: 'C', chords: [{ q: 1, chord: 'Em' }, { q: 3, chord: 'G' }] })])); setDur(2); R.chq2 = D(0); }
        /* FX1d 允许欠拍的小节附点后不吃（弱起首小节 / 散拍草稿，与 v68.7 相同；对照：普通小节吃回 4 拍） */
        { const s = base(); s.pickup = true; s.measures[0].voxes[0] = [V(5, 2), V(0, 4), V(0, 4)]; ld(s); toggleDot(); R.pkDot = D(0); }
        { const s = base(); s.freeMeter = true; s.measures[0].voxes[0] = [V(5, 2), V(0, 4), V(0, 4)]; ld(s); toggleDot(); R.fmDot = D(0); }
        { const s = base(); s.measures[0].voxes[0] = [V(5, 2), V(0, 4), V(0, 4)]; ld(s); toggleDot(); R.nDot = D(0); }
        /* 撤销一步回到原 JSON（引用平移、和弦搬家同一步） */
        { const s = base(); s.measures[0].voxes[0] = [V(5, 4, { dyn: 'cresc', dynTo: { mi: 0, ci: 3 } }), V(0, 4), V(3, 4), V(4, 4)]; ld(s, { ci: 1 }); const j0 = JSON.stringify(song.measures); setDur(16); undo(); R.undo = JSON.stringify(song.measures) === j0; }
        return R; });
      allErrs.push(...A.errs); await A.close();
      if (q.err) T(false, 'FX 取样', q.err);
      else {
        T(q.pkDot === '5/2. 0/4 0/4' && q.fmDot === '5/2. 0/4 0/4' && q.nDot === '5/2. 0/4',
          'FX1d 附点后超拍吸收不碰允许欠拍的小节：弱起首小节 / 散拍草稿 [5/2 0/4 0/4] 按「.」→ 5/2. 0/4 0/4（不吃，与 v68.7 相同）；对照普通小节 → 5/2. 0/4（吃回 4 拍，v68.8 有意改动 #3）',
          J({ pk: q.pkDot, fm: q.fmDot, n: q.nDot }));
        T(q.chordDot === '0/4.[C] 0/8[G] 0/8[D] 0/4[Am] 0/4[F]' && q.vocDot === '5/4. 0/8 0/8[G]{F} 0/4 0/4' && q.tabDot === '5.3/4.[C] 0/8[G] 0/8[D] 0/4[Am] 0/4[F]'
          && q.fermDot === '5/4. 0/8 0/8{F} 0/4 0/4' && q.lyrDot === '5/4. 0/8 0/8 0/4 0/4|["","","啊","",""]',
          'FX2a 附点后超拍吸收不删内容列（R1）：纯和弦谱 [C/4 G/8 D/8 Am/4 F/4] 在 C 上按「.」→ D 列保留（4.5 拍照常报节拍错误）；简谱带和弦 + 延长号的休止、只带延长号 / 只带歌词的休止、TAB 带和弦名的空列同样保留——与 v68.7 相同',
          J({ c: q.chordDot, v: q.vocDot, t: q.tabDot, f: q.fermDot, l: q.lyrDot }));
        T(q.chordLen === '0/2[C] 0/4[G] 0/4[Am] 0/4[F]', 'FX2b ★ 改长吸收（v63.6）同一判据：纯和弦谱 [C G Am F] 在 C 上按 w → G 列保留（5 拍报节拍错误；v68.7 会静默删掉 G 列）', q.chordLen);
        T(q.refTgt.m === '5/4 0/2 0/4 0/4' && q.refTgt.to === 2 && q.refTgt.same && q.ottAbs.m === '5/4^ 0/2^ 4/4^' && q.ottAbs.to === '4/4^' && q.dynAbs.m === '5/4 0/2 4/4' && q.dynAbs.to === '4/4',
          'FX2c ★ 吸收与跨列引用：被渐强终点引用的空列不吃（停下）；8va 段内的空列照吃（ott 不算内容），吃掉后 ottTo / dynTo 前移仍指着 4（v68.7 删列后引用不动，指到别的列或出界）',
          J({ ref: q.refTgt, ott: q.ottAbs, dyn: q.dynAbs }));
        T(q.r1.to === '4/4' && q.r1.m === '5/4 0/8 0/8 3/4 4/4' && q.r2.to === '4/4^' && q.r2.m === '5/4^ 0/16^ 0/16^ 0/16^ 0/16^ 3/4^ 4/4^' && q.r3.to === '3.7/4' && q.r3.si === 3 && q.r5.to === '7/4' && q.r5.mi === 1 && q.r1i.m === '5/4 0/8 0/8 3/4 4/4' && q.r1i.to === '4/4' && q.r1j.m === '5/4 0/8 0/8 3/4 4/4' && q.r1j.to === 2 && q.r1j.same && q.undo,
          'FX3a 补列后跨列引用平移（IN-3）：渐强终点（同小节 / 跨小节）、五线谱 8va 终点、TAB 滑音 tk 终点在补列后仍指着原来的音（4 / 4 / 7 品 / 7）；补列后紧接着 Shift+Insert 顶替一格，渐强终点仍是 4、收在被改短那一格上的渐强终点随它后移一位；8va 段内补出的格也带 ott；一步撤销回到原 JSON',
          J({ r1: q.r1, r2: q.r2, r3: q.r3, r5: q.r5, r1i: q.r1i, r1j: q.r1j, undo: q.undo }));
        T(q.chq === '0/4[C] 0/4 0/4[G] 0/4' && q.chq2 === '0/2[C]{1:Em} 0/2{1:G}',
          'FX3b 拍位和弦搬家：纯和弦谱全音符 C（第 3 拍 G）改四分 → G 成为第 3 格的列头和弦；C（第 2 拍 Em、第 4 拍 G）改二分 → Em 留在原列增时线、G 落到补出二分的增时线拍位（此前留在原列，原列没有那条增时线，画在列头和弦上）',
          J({ a: q.chq, b: q.chq2 }));
      }
      /* FX4c 32 小节 Insert 老打法原样重放（按键序列测于 27a74c1，v68.7 上结果全对）：本版结果与 v68.7 的数据逐字节相同 */
      { const P = await open(b), pg = P.pg;
        const rep = (p, n) => Array(n).fill(p).join(' ');
        const SEQ = {
          xxx: [{ opt: { nMea: 32 } }, rep('r Shift+Insert 5 6 r Shift+Insert 5 4 3 1', 32)],
          jtrun: [{ opt: { nMea: 32 } }, rep(rep('r Shift+Insert 1 2 r Shift+Insert 3 4 r Shift+Insert 5 6 r Shift+Insert 5 4', 3) + ' 1 2 3 1', 8)],
          songbie32: [{ opt: { nMea: 32 } }, rep('5 r Shift+Insert 3 Shift+Backquote 5 w 1 + 6 1 + w 5 5 r Shift+Insert 1 Shift+Backquote 2 3 r Shift+Insert 2 Shift+Backquote 1 w 2 d 0 5 r Shift+Insert 3 Shift+Backquote 5 1 + . 7 6 1 + w 5 5 r Shift+Insert 2 Shift+Backquote 3 4 . 7 - w 1 d 0 6 1 + w 1 + 7 r Shift+Insert 6 Shift+Backquote 7 w 1 + r Shift+Insert 6 Shift+Backquote 7 r Shift+Insert 1 + Shift+Backquote 6 r Shift+Insert 6 Shift+Backquote 5 r Shift+Insert 3 Shift+Backquote 1 w 2 d 0 5 r Shift+Insert 3 Shift+Backquote 5 1 + . 7 6 1 + w 5 5 r Shift+Insert 2 Shift+Backquote 3 4 . 7 - w 1 d 0', 2)],
          minuet: [{ opt: { nMea: 11, beats: 3, unit: 4 } }, '5 + r Shift+Insert 1 + 2 + r Shift+Insert 3 + 4 + 5 + 1 + 1 + 6 + r Shift+Insert 4 + 5 + r Shift+Insert 6 + 7 + 1 + + 1 + Shift+Backquote 1 + 4 + r Shift+Insert 5 + 4 + r Shift+Insert 3 + 2 + 3 + r Shift+Insert 4 + 3 + r Shift+Insert 2 + 1 + 2 + r Shift+Insert 3 + 2 + r Shift+Insert 1 + 7 w 1 + 0 3 + + r Shift+Insert 2 + + 1 + + r Shift+Insert 7 + 6 + 5 + . 3 + 2 + 7 w 1 +'],
          pk4: [{ opt: { nMea: 33 }, pk: 1 }, 'Delete Delete Delete e 5 ' + rep('1 1 5 5', 32)],
          pk8: [{ opt: { nMea: 33 }, pk: 1 }, 'Delete Delete Delete r 5 ' + rep('1 1 5 5', 32)] };
        /* v68.7 结果的指纹（全曲 voxes JSON 的 __h，测于 27a74c1） */
        const H687 = { xxx: 'eed3e5a92d185cd3:14337', jtrun: '6c94bf5969ec74ba:16705', songbie32: 'c81ec913300d136:9269', minuet: '96146a8bfbf4b041:3225', pk4: '440338d590037b5a:9679', pk8: '415964eab8d6d5e:9679' };
        const got = {};
        for (const [nm, [o, ks]] of Object.entries(SEQ)) {
          await EV(pg, o => __fresh({ opt: o.opt, setup: s => { if (o.pk) s.pickup = true; } }), o);
          const list = ks.split(' '); for (const k of list) await pg.keyboard.press(k);
          got[nm] = await EV(pg, n => ({ h: __h(JSON.stringify(song.measures.map(m => m.voxes))), be: beatErrors().length, keys: n, m0: __dump(2) }), list.length); }
        const bad = Object.keys(SEQ).filter(nm => !got[nm] || got[nm].h !== H687[nm] || got[nm].be !== 0);
        console.log('ℹ️ FX4c 指纹：' + J(Object.fromEntries(Object.entries(got).map(([k, v]) => [k, v.h]))));
        T(!bad.length, 'FX4c 32 小节老打法原样重放（xxx 320 键 / 八分为主 416 / 送别×2 256 / 小步舞曲 115 / 一拍弱起 133 / 半拍弱起 133，按键序列测于 27a74c1）：全曲数据与 v68.7 逐字节相同（指纹一致）、无节拍错误',
          bad.map(nm => nm + J(got[nm])).join(' | ') || Object.keys(SEQ).map(nm => nm + ' ' + got[nm].keys + ' 键').join(' · '));
        allErrs.push(...P.errs); await P.close(); }
    }

    /* ================= KC 按键数 ================= */
    if (want('KC')) {
      const P = await open(b), pg = P.pg;
      const KEY = { 1: 'q', 2: 'w', 4: 'e', 8: 'r', 16: 't', 32: 'y', 64: 'u' };
      /* KC1 小星星 8 小节（tv_b1a T2 原序列） */
      { await EV(pg, () => __fresh({ opt: { nMea: 8 } }));
        const seq = '1155665d4433221d5544332d5544332d'.split(''); for (const k of seq) await pg.keyboard.press(k);
        const m = await EV(pg, () => ({ m: __dump(8), be: beatErrors().length }));
        T(seq.length === 32 && m.be === 0 && m.m === '1/4 1/4 5/4 5/4 | 6/4 6/4 5/2 | 4/4 4/4 3/4 3/4 | 2/4 2/4 1/2 | 5/4 5/4 4/4 4/4 | 3/4 3/4 2/2 | 5/4 5/4 4/4 4/4 | 3/4 3/4 2/2',
          'KC1 小星星 8 小节 32 键，结果与 tv_b1a T2 的期望串相同、无节拍错误', J(m)); }
      /* KC2 / KC3 贪心打法（驱动同规格 p3.js）：槽位时值≠目标就按时值键；附点四分 / 八分＝数字＋「.」；附点二分＝w＋数字＋d；八度 / 变音 / 连音线照按 */
      const bench = async (nm, habit) => {
        const tgt = await EV(pg, nm => { const V = (deg, dur, o) => Object.assign({ deg, dur, dotted: false, acc: '', oct: 0, tie: false }, o || {});
          let meter = [4, 4], M = [];
          const byName = n => PRESETS.find(p => p.name.indexOf(n) >= 0);
          if (nm === 'songbie32' || nm === 'minuet') { const s = byName(nm === 'songbie32' ? '送别' : '小步舞曲').make(); meter = [s.beats, s.unit];
            M = s.measures.map(m => (m.voxes[0] || []).map(c => ({ deg: c.deg, dur: c.dur, dotted: c.dotted || false, acc: c.acc || '', oct: c.oct || 0, tie: !!c.tie, tup: c.tup || 0 })));
            if (nm === 'songbie32') M = M.concat(JSON.parse(JSON.stringify(M)));
            if (nm === 'minuet') M = M.filter(cs => !cs.some(c => c.tup)); }
          if (nm === 'xxx') for (let i = 0; i < 32; i++) M.push([V(5, 8), V(6, 8), V(5, 8), V(4, 8), V(3, 4), V(1, 4)]);
          if (nm === 'jtrun') for (let i = 0; i < 32; i++) M.push(i % 4 === 3 ? [V(1, 4), V(2, 4), V(3, 4), V(1, 4)] : [1, 2, 3, 4, 5, 6, 5, 4].map(d => V(d, 8)));
          __fresh({ opt: { beats: meter[0], unit: meter[1], nMea: M.length } }); return M; }, nm);
        if (tgt.err) return { err: tgt.err };
        let keys = 0; const press = async k => { keys++; await pg.keyboard.press(k); };
        for (const cs of tgt) for (const t of cs) {
          const ed = await pg.evaluate(() => { const c = curCol(); return c ? c.dur : null; });
          let post = [];
          if (habit === 'old') { if (t.dur !== 4) await press(KEY[t.dur]); }   /* KC3：逐音先按时值键（v68.7 上同样按法 32 小节全错；v68.7 能打对的是「改短后 Shift+Insert 补一格」，见 FX4c） */
          else if (t.dotted && t.dur === 2) { if (ed !== 2) await press('w'); post = ['d']; }
          else if (t.dotted) { if (ed !== t.dur) await press(KEY[t.dur]); post = ['.']; }
          else if (ed !== t.dur) await press(KEY[t.dur]);
          await press(String(t.deg));
          for (let i = 0; i < Math.abs(t.oct); i++) await press(t.oct > 0 ? '+' : '-');
          if (t.acc === '#') await press('Shift+Digit3'); if (t.acc === 'b') await press('b');
          for (const k of post) await press(k);
          if (t.tie) await press('Shift+Backquote');
        }
        const res = await EV(pg, tgt => { const f = c => c.deg + '/' + c.dur + (c.dotted ? '.' : '') + (c.oct ? 'o' + c.oct : '') + (c.tie ? '~' : '');
          const got = song.measures.map(m => m.voxes[0].filter(c => c).map(f).join(' ')), wantS = tgt.map(cs => cs.map(f).join(' '));
          let bad = 0, firstBad = -1; wantS.forEach((w, i) => { const g = (got[i] || '').replace(/( 0\/\d+\.?)+$/, ''); if (g !== w && got[i] !== w) { bad++; if (firstBad < 0) firstBad = i; } });
          return { n: tgt.reduce((a, c) => a + c.length, 0), meas: tgt.length, bad, firstBad, be: beatErrors().length, nMea: song.measures.length, got0: firstBad >= 0 ? got.slice(firstBad, firstBad + 2) : [] }; }, tgt);
        return Object.assign({ keys }, res); };
      /* 期望键数（本版）与 v68.7 同打法的键数（测于 27a74c1，那时结果都是错的） */
      /* [名, 标签, 本版键数, v68.7 同打法键数（结果错）, v68.7 能打对的 Insert 补格打法键数（f88v kflow 实测，同 FX4c 的序列）] */
      const KC = [['songbie32', '送别×2（32 小节）', 232, 263, 256], ['xxx', '「5̲6̲5̲4̲ 3 1」×32', 256, 299, 320], ['jtrun', '八分为主 32 小节', 320, 343, 416], ['minuet', '小步舞曲 11 小节（去掉三连音小节）', 103, 116, 115]];
      const kr = [];
      for (const [nm, lab, k1, k0, kOk] of KC) { const x = await bench(nm); kr.push({ nm, lab, k1, k0, kOk, x }); }
      const bad = kr.filter(o => o.x.err || o.x.bad !== 0 || o.x.be !== 0 || o.x.keys !== o.k1 || o.x.keys > o.k0 || o.x.keys > o.kOk);
      T(!bad.length, 'KC2 按键数（同一贪心打法、真键盘驱动）：' + kr.map(o => o.lab + ' ' + o.x.keys + ' 键（v68.7 同打法 ' + o.k0 + ' 键结果错 · v68.7 Insert 补格打法 ' + o.kOk + ' 键）').join(' · ') + '——每首结果等于目标、无节拍错误，键数恰为 232 / 256 / 320 / 103，不多于 v68.7 的任一打法',
        bad.map(o => o.nm + J(o.x)).join(' | ') || kr.map(o => o.nm + ' ' + o.x.n + ' 音 ' + o.x.keys + ' 键').join(' · '));
      { const x = await bench('xxx', 'old');
        T(!x.err && x.keys === 320 && x.bad === 0 && x.be === 0, 'KC3 逐音按时值键的打法：「5̲6̲5̲4̲ 3 1」×32 共 320 键、结果正确（v68.7 同样按法 32 小节全错；v68.7 熟手的 Insert 补格打法另见 FX4c，结果与 v68.7 逐字节相同）', J(x)); }
      allErrs.push(...P.errs); await P.close();
    }
  } catch (e) { T(false, '套件异常', String(e && e.stack || e).slice(0, 400)); }
  console.log('\nPASS ' + pass + '/' + total + (fails.length ? '\n失败：' + fails.join(' | ') : ''));
  const real = allErrs.filter(e => !/ResizeObserver/.test(e));
  console.log(real.length ? 'ERRORS:\n' + real.slice(0, 10).join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !real.length ? 0 : 1);
})();
