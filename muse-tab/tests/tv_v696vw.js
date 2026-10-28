'use strict';
/* v69.6「纠错二」观看页与移调组（五线谱全面复核 F7 / F9 / F11，不新增 song 字段）。file:// 直载、真实浏览器；曲库谱读 api/seed-library.json。
   VN  观看页记谱法（F7 ①）：VN1 ⚙ 设置「记谱法」三选一（简谱 / 五线 / 对照，按钮 ≤4 字）可见、亮当前一档 · VN2 点「简谱」全部旋律声部（含低音谱表）成简谱、
       「对照」＝原谱号＋简谱行；原发布数据 / 撤销栈 / 编辑器原谱都不动 · VN3 变调重建后仍保留所选记谱法 · VN4 本地谱友圈观看退出后编辑器原谱逐字节还原（两套外壳）
   FL  播放跟滚（F7 ②）：FL1 1024×768 / 844×390 观看页逐系统跟滚：放得下的系统整个落在顶栏与播放条之间，放不下（骊歌 5 行谱）的当前谱表整条落在里面 ·
       FL2 独奏轨（单行）跟到该谱表 · FL3 编辑器（两套外壳）跟滚落点仍是原口径（vy − max(220, 谱型条底 + 60)）
   TS  首屏提示（F7 ③）：TS1 歌谱不提「指法 / 变调夹」、吉他谱提「变调夹」 · TS2 手机 390 提示条底边在底部播放条之上（不盖 ▶ 播放）
   SC  分享卡（F7 ④）：SC1 390 宽骊歌首系统不被拦腰截断（裁切高 ≥ 第一个系统下沿）、普通谱照旧裁到最后一个完整系统 · SC2 卡面调号＝页头写法 1=♭A ·
       SC3 小节数按 meaNo 口径（骊歌 20、去会情人 60；观看页「N 小节」同口径）· SC4 服务端落地页小节数 / 调号写法与编辑器同口径（10 首逐首对拍）
   KT  移调选调（F9）：KT1 transposeSong：♭E−2＝♭D、♭A−2＝♭G、♭A+5＝♭D、C+6＝♯F、D+4＝♯F、♭B+8＝♭G，转调标记 / 和弦名同规则 ·
       KT2 编辑器 ♭♯ 步进：页头 1=♭D、headKeyOf＝Db（两套外壳）· KT3 新外壳调网格键名＝点下去会落成的写法（♭E 调里是 ♭G，C 调里是 ♯F）·
       KT4 观看页变调：唱调显示 Db 调、谱面 1=♭D · KT5 改记谱调速选写 ♭D，选它落 song.key＝Db、音高不变
   KP  保持音高（F9）：KP1 纯五线谱中途转调默认开：转 1=♭E 后音高逐音不变、一步撤销逐字节还原，清除转调同样不变 · KP2 简谱默认关（原语义：数字不变、音随新调），
       手动开后音高不变 · KP3 菜单文案（纯五线谱不写「简谱读」）· KP4 respellMeasures 抽出、respellSongKey 复用（含和音 / 倚音 / 装饰音邻音音高不变）·
       KP5 新外壳调网格「保持音高」开关：纯五线谱默认开＝改记谱调、简谱默认关＝移调
   JL  简谱行首声部名（F11）：JL1 曲库 10 首切简谱后行名全部在左页边距内（bbox 不越出谱纸左缘、右端不过 oxH−4），以 oxH−6 右对齐 · JL2 短名（Voice / 右手）·
       JL3 中文短名照原名不缩（两套外壳）
   env：MUSETAB_URL 被测页（缺省 ../index.html）· MUSETAB_API 服务端（缺省 ../../api/server.js）· ONLY=VN,FL,TS,SC,KT,KP,JL 只跑部分段。 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const API = process.env.MUSETAB_API || path.resolve(__dirname, '../../api/server.js');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const LIB = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'api', 'seed-library.json'), 'utf8'));
const LIBD = Object.fromEntries(LIB.map(x => [x.id, x.data]));
const LI = id => LIBD['lib-os-' + id];
let pass = 0, total = 0; const fails = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (d ? '：' + d : '')); };
const J = x => JSON.stringify(x);

const HELP = () => {
  window.SF_PLAYWAIT = false;
  try { localStorage.setItem('musetab-humanize', 'off'); } catch (_) {}
  window.__ld = s => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {}
    undoStack.length = 0; redoStack.length = 0; loadSong(JSON.parse(JSON.stringify(s)));
    sel = { mi: 0, row: (song.voxVoices || []).length ? 'vox' : 'tab', vi: 0, ci: 0, si: 1 }; clampSel(); selRange = null; noteSel = []; measureSel = null; render(); return song.measures.length; };
  window.__share = s => { enterShareViewer({ song: JSON.parse(JSON.stringify(s)) }); return song.measures.length; };
  /* 每个旋律音的 MIDI（含和音 adds），按小节分组 */
  window.__pitch = () => song.measures.map((m, mi) => (m.voxes || []).map(cols => (cols || []).map(c => c && c.deg >= 1 ? [voxMidi(c, mi)].concat((c.adds || []).filter(a => a && a.deg >= 1).map(a => voxMidi(Object.assign({}, c, a), mi))).join('+') : '-').join(' ')).join(' / ')).join(' | ');
  window.__toastT = () => { const t = document.getElementById('toast'); return t ? t.textContent : ''; };
  window.__wait = ms => new Promise(r => setTimeout(r, ms));
};

async function open(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 900 }, isMobile: !!o.mobile, hasTouch: !!o.mobile });
  const pg = await ctx.newPage();
  await pg.addInitScript(HELP);
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.dismiss().catch(() => {}));
  let u = o.url || URL0; if (o.shell === 'classic') u = withQ(u, 'shell=classic');
  await pg.goto(u); await pg.waitForTimeout(1200);
  await pg.evaluate(() => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} });
  return { ctx, pg, errs, close: () => ctx.close() };
}
const EV = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => ({ err: String(e.message || e).slice(0, 300) }));
const vis = (pg, sel) => pg.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; }, sel).catch(() => false);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const allErrs = [];
  try {
    /* ================= VN 观看页记谱法 ================= */
    if (want('VN')) {
      for (const shell of ['flow', 'classic']) {
        const A = await open(b, { shell: shell === 'classic' ? 'classic' : null });
        const sx = shell === 'classic' ? '（旧外壳）' : '';
        await EV(A.pg, d => __share(d), LI('lc6650166'));
        await EV(A.pg, () => { window.__d0 = JSON.stringify(viewerCtx.pb.data); window.__u0 = undoStack.length; return 1; });
        const okSet = await vis(A.pg, '#b-vwset');
        if (okSet) await A.pg.click('#b-vwset'); await A.pg.waitForTimeout(200);
        const v1 = await EV(A.pg, () => { const g = document.getElementById('vs-nota'); if (!g) return { has: false };
          const r = g.getBoundingClientRect();
          return { has: true, vis: r.width > 0 && r.height > 0, txt: [...g.querySelectorAll('button')].map(x => x.textContent.trim()), on: [...g.querySelectorAll('button.on')].map(x => x.dataset.nt), aria: g.getAttribute('aria-label') }; });
        T(okSet && v1.has && v1.vis && J(v1.txt) === J(['简谱', '五线', '对照']) && J(v1.on) === J(['st']) && v1.txt.every(t => [...t].length <= 4),
          'VN1 观看页 ⚙ 设置有「记谱法」三选一（简谱 / 五线 / 对照，≤4 字），曲库五线谱亮「五线」' + sx, J(v1));
        const okJp = v1.has && await vis(A.pg, '#vs-nota [data-nt="jp"]');
        if (okJp) await A.pg.click('#vs-nota [data-nt="jp"]'); await A.pg.waitForTimeout(200);
        const v2 = await EV(A.pg, () => ({ vn: JSON.stringify(song.voxNotations || null), vd: JSON.stringify(song.voxDual || null), any: (song.voxNotations || []).some(isStaffNota), on: [...document.querySelectorAll('#vs-nota button.on')].map(x => x.dataset.nt),
          clefs: document.querySelectorAll('#score [data-clefhead]').length, digits: [...document.querySelectorAll('#score text')].filter(t => /^[1-7]$/.test(t.textContent)).length,
          same: JSON.stringify(viewerCtx.pb.data) === window.__d0, du: undoStack.length - window.__u0 }));
        const okDu = v1.has && await vis(A.pg, '#vs-nota [data-nt="dual"]');
        if (okDu) await A.pg.click('#vs-nota [data-nt="dual"]'); await A.pg.waitForTimeout(200);
        const v3 = await EV(A.pg, () => ({ vn: JSON.stringify(song.voxNotations || null), vd: JSON.stringify(song.voxDual || null), on: [...document.querySelectorAll('#vs-nota button.on')].map(x => x.dataset.nt), same: JSON.stringify(viewerCtx.pb.data) === window.__d0, du: undoStack.length - window.__u0 }));
        T(okJp && !v2.any && v2.clefs === 0 && v2.digits > 50 && J(v2.on) === J(['jp']) && v2.same && v2.du === 0
          && okDu && v3.vn === J(['staff', 'staff', 'bass', 'staff', 'bass']) && v3.vd === J([true, true, true, true, true]) && J(v3.on) === J(['dual']) && v3.same && v3.du === 0,
          'VN2 点「简谱」全部 5 行（含低音谱表）成简谱；「对照」＝原谱号＋简谱行；原发布数据与撤销栈不动' + sx, J({ v2, v3 }));
        await EV(A.pg, () => { closeModal(); return 1; });
        const v4 = await EV(A.pg, () => { vwSetNota('jp'); vwTranspose(-2); const r = { key: song.key, any: (song.voxNotations || []).some(isStaffNota) }; vwTranspose(2); return r; });
        T(v4.key === 'Gb' && v4.any === false, 'VN3 变调重建后仍是所选记谱法（简谱，♭A 降 2 → ♭G）' + sx, J(v4));
        /* VN4 本地谱友圈观看（openPubViewer：viewerPrev 留编辑器原谱）→ 切简谱 → 退出 → 编辑器原谱逐字节还原 */
        const v5 = await EV(A.pg, d => { exitViewer(); __ld(d); const j0 = JSON.stringify(song), u0 = undoStack.length;
          const pid = 'pv696'; const l = circlePubs().filter(x => x.pid !== pid); l.push({ pid, libId: null, title: '骊歌', author: 't', price: 0, preview: 99, data: JSON.parse(JSON.stringify(d)), type: 'vocal' }); circlePubsSave(l);
          openPubViewer(pid); const bar = (document.querySelector('#viewerbar .va') || {}).textContent || '';
          vwSetNota('jp'); const mid = (song.voxNotations || []).some(isStaffNota);
          exitViewer(); return { back: JSON.stringify(song) === j0, du: undoStack.length - u0, mid, nota: vwNota, bar, vm: viewerMode }; }, LI('lc6650166'));
        T(v5.back && v5.du === 0 && v5.mid === false && v5.nota === null && !v5.vm, 'VN4 本地观看切简谱 → 退出观看：编辑器原谱逐字节还原、撤销栈不变、记谱覆盖清空' + sx, J(v5));
        if (shell === 'flow') T(/20 小节/.test(v5.bar), 'SC3b 观看页顶栏小节数按 meaNo 口径（骊歌 23 个小节对象 → 20 小节）', v5.bar);
        allErrs.push(...A.errs); await A.close();
      }
    }

    /* ================= FL 播放跟滚 ================= */
    if (want('FL')) {
      const runFollow = async (vp, id, mobile) => {
        const A = await open(b, { vp, mobile });
        await EV(A.pg, d => __share(d), LI(id));
        await A.pg.waitForTimeout(300);
        const out = await EV(A.pg, async () => {
          const res = [];
          const sys = SYS_GEO.slice();
          const mis = []; Object.keys(meaBands).forEach(k => { const b = meaBands[k]; const si = sys.findIndex(g => Math.abs(g.y0 - b.y) < 0.5); if (si >= 0 && !mis.some(x => x.si === si)) mis.push({ si, mi: +k }); });
          mis.sort((a, b) => a.si - b.si);
          window.scrollTo(0, 0); await __wait(50);
          for (const { si, mi } of mis.slice(0, 8)) {
            const y0 = window.scrollY;
            highlight('v0', mi, 0, true);
            await __wait(700);
            const moved = Math.abs(window.scrollY - y0) > 2;
            const svg = document.getElementById('score'), r = svg.getBoundingClientRect(), k = r.height / svg.viewBox.baseVal.height;
            const g = sys[si], bx = colBoxes['v0:' + mi + ':0'];
            const vb = document.getElementById('viewerbar').getBoundingClientRect(), dk = document.getElementById('mixer-dock').getBoundingClientRect();
            const top = vb.bottom, bot = dk.top;
            const s0 = r.top + g.y0 * k, s1 = r.top + g.y1 * k, t0 = r.top + bx.y * k, t1 = r.top + (bx.y + bx.h) * k;
            const fits = (g.y1 - g.y0) * k <= bot - top - 16;
            /* 滚过的话落点贴可视区上沿（留白 ≤16）：放得下＝系统顶边，放不下＝系统顶边或当前谱表顶边（可视区尽量放满） */
            const land = !moved || (s0 >= top - 1 && s0 <= top + 16) || (!fits && t0 >= top - 1 && t0 <= top + 16);
            const ok = land && (fits ? (s0 >= top - 1 && s1 <= bot + 1) : (t0 >= top - 1 && t1 <= bot + 1));
            res.push({ si, mi, fits, moved, ok, s: [Math.round(s0), Math.round(s1)], t: [Math.round(t0), Math.round(t1)], band: [Math.round(top), Math.round(bot)] });
          }
          return res;
        });
        allErrs.push(...A.errs); await A.close();
        return out;
      };
      const r1 = await runFollow({ width: 1024, height: 768 }, 'lc6650166');
      const r2 = await runFollow({ width: 844, height: 390 }, 'lc6389103', true);
      const r3 = await runFollow({ width: 1024, height: 768 }, 'lc6389103');
      const okA = x => Array.isArray(x) && x.length >= 2 && x.every(y => y.ok);
      T(okA(r1) && r1.some(y => !y.fits) && okA(r3) && r3.some(y => y.fits) && r1.some(y => y.moved) && r3.some(y => y.moved),
        'FL1 1024×768 观看页逐系统跟滚：圣母颂系统整个落在顶栏与播放条之间（顶边贴上沿）；骊歌 5 行谱放不下，从系统顶边起铺满、当前谱表整条在里面', J({ r1: r1.filter ? r1.filter(y => !y.ok) : r1, r3: r3.filter ? r3.filter(y => !y.ok) : r3, n: [r1.length, r3.length] }));
      T(okA(r2), 'FL1b 手机横屏 844×390 圣母颂：每次换行后当前谱表（系统放不下）整条可见、不被播放条盖住', J(r2.filter ? r2.filter(y => !y.ok).slice(0, 3) : r2));
      /* FL2 独奏轨：单行跟滚（whole=false）——钢琴左手那一行整条落进可视区 */
      { const A = await open(b, { vp: { width: 1024, height: 768 } });
        await EV(A.pg, d => __share(d), LI('lc6650166'));
        const r = await EV(A.pg, async () => {
          const out = []; window.scrollTo(0, 0); await __wait(50);
          const mis = [...new Set(Object.keys(meaBands).map(Number))].filter(mi => { const b = meaBands[mi]; return mi === 0 || meaBands[mi - 1].y !== b.y; }).slice(0, 5);
          for (const mi of mis) { highlight('v4', mi, 0, false); await __wait(700);
            const svg = document.getElementById('score'), r = svg.getBoundingClientRect(), k = r.height / svg.viewBox.baseVal.height, bx = colBoxes['v4:' + mi + ':0'];
            const top = document.getElementById('viewerbar').getBoundingClientRect().bottom, bot = document.getElementById('mixer-dock').getBoundingClientRect().top;
            const t0 = r.top + bx.y * k, t1 = r.top + (bx.y + bx.h) * k; out.push({ mi, ok: t0 >= top - 1 && t1 <= bot + 1, t: [Math.round(t0), Math.round(t1)], band: [Math.round(top), Math.round(bot)] }); }
          return out; });
        T(Array.isArray(r) && r.length >= 3 && r.every(x => x.ok), 'FL2 独奏左手（单行跟随）：每个系统换行后左手谱表整条在可视区内', J(r));
        allErrs.push(...A.errs); await A.close(); }
      /* FL3 编辑器两套外壳：跟滚落点仍是原口径（记下 scrollTo 的目标，与 vy − vTo 对拍；观看页才走可视区落点） */
      for (const shell of ['flow', 'classic']) {
        const A = await open(b, { vp: { width: 1366, height: 768 }, shell: shell === 'classic' ? 'classic' : null });
        await EV(A.pg, d => __ld(d), LI('lc6650166'));
        const r = await EV(A.pg, async () => {
          const sc = scoreScroller(), tgt = sc || window; const rec = [];
          const o = tgt.scrollTo.bind(tgt); tgt.scrollTo = a => { rec.push(a && a.top); return o(Object.assign({}, a, { behavior: 'instant' })); };
          const out = [];
          try {
            for (const mi of [0, 6, 12, 18]) {
              if (sc) sc.scrollTop = 0; else window.scrollTo({ top: 0, behavior: 'instant' }); rec.length = 0;
              await __wait(30);
              const svg = document.getElementById('score'), k = svg.getBoundingClientRect().height / svg.viewBox.baseVal.height, band = meaBands[mi];
              const vy = svg.getBoundingClientRect().top + band.y * k, lbB = lbStickBottom(), vTop = Math.max(150, lbB + 8), vTo = Math.max(220, lbB + 60);
              const base = sc ? sc.scrollTop : window.scrollY;
              const exp = (vy > window.innerHeight - 280 || vy < vTop) ? Math.round(base + vy - vTo) : null;
              highlight('v0', mi, 0, true);
              out.push({ mi, exp, got: rec.length ? Math.round(rec[rec.length - 1]) : null });
            }
          } finally { tgt.scrollTo = o; }
          return out; });
        T(Array.isArray(r) && r.length === 4 && r.every(x => x.exp === x.got) && r.some(x => x.exp != null),
          'FL3 编辑器' + (shell === 'classic' ? '旧外壳' : '新外壳') + '跟滚落点不变（vy − max(220, 谱型条底 + 60)）', J(r));
        allErrs.push(...A.errs); await A.close();
      }
    }

    /* ================= TS 首屏提示 ================= */
    if (want('TS')) {
      const A = await open(b, { vp: { width: 390, height: 844 }, mobile: true });
      const t1 = await EV(A.pg, d => { __share(d); return { t: __toastT() }; }, LI('lc6389103'));
      await A.pg.waitForTimeout(120);
      const geo = await EV(A.pg, () => { const t = document.getElementById('toast').getBoundingClientRect(), p = document.getElementById('b-play').getBoundingClientRect(), d = document.getElementById('mixer-dock').getBoundingClientRect();
        return { tb: Math.round(t.bottom), tt: Math.round(t.top), pt: Math.round(p.top), dt: Math.round(d.top), op: getComputedStyle(document.getElementById('toast')).opacity }; });
      const t2 = await EV(A.pg, () => { exitViewer(); const s = PRESETS[0].make(); __share(s); return { t: __toastT(), cap: vwHasCapo() }; });
      T(t1.t && !/指法/.test(t1.t) && !/变调夹/.test(t1.t) && /页首可变调 \/ 拍速/.test(t1.t) && t2.cap && /页首可变调 \/ 变调夹 \/ 拍速/.test(t2.t) && !/指法/.test(t2.t),
        'TS1 首屏提示按谱面实际：歌谱「页首可变调 / 拍速」，吉他谱「页首可变调 / 变调夹 / 拍速」，都不写「指法」', J({ t1, t2 }));
      T(geo.tb <= geo.dt && geo.tb <= geo.pt, 'TS2 手机 390 观看页首屏提示条底边在底部播放条之上（不盖 ▶ 播放）', J(geo));
      allErrs.push(...A.errs); await A.close();
      /* 编辑器提示条不写内联位置（两套外壳原样） */
      const B = await open(b, { vp: { width: 390, height: 844 }, mobile: true });
      const e1 = await EV(B.pg, () => { toast('测试'); return document.getElementById('toast').style.bottom; });
      T(e1 === '', 'TS3 编辑器（手机）提示条不写内联 bottom（只在观看页 / 谱架抬高）', J(e1));
      allErrs.push(...B.errs); await B.close();
    }

    /* ================= SC 分享卡 ================= */
    if (want('SC')) {
      const A = await open(b, { vp: { width: 390, height: 844 }, mobile: true });
      const card = async id => EV(A.pg, d => { __share(d); const sys = withCleanSnap(() => SYS_GEO.slice(), { paging: true });
        const x = buildShareCardSVG(); const m = /<svg x="25" y="96" width="700" height="(\d+)" viewBox="0 0 (\d+) (\d+)"/.exec(x);
        const meta = (/<text x="28" y="940" font-size="13" fill="#6a6a6a">([^<]*)<\/text>/.exec(x) || [])[1] || '';
        return { cw: m && +m[2], ch: m && +m[3], dh: m && +m[1], y1: sys[0] && sys[0].y1, n: sys.length, sys2: sys.slice(0, 3).map(g => [Math.round(g.y0), Math.round(g.y1)]), meta, head: keyLabel(headKeyOf(song)) }; }, LI(id));
      const c1 = await card('lc6650166'), c2 = await card('lc6491461');
      const fitOK = c => c.ch && c.y1 && c.ch >= c.y1;
      T(fitOK(c1) && c1.dh <= 762 && fitOK(c2), 'SC1 390 宽分享卡：骊歌首系统（高过卡框）整体缩小放下、不拦腰截断；土拨鼠照旧裁到完整系统', J({ c1, c2 }));
      T(/1=♭A/.test(c1.meta) && !/1=Ab/.test(c1.meta) && c1.head === '♭A', 'SC2 卡面调号同页头写法 1=♭A（此前 1=Ab）', J({ meta: c1.meta, head: c1.head }));
      const n = await EV(A.pg, L => L.map(d => meaCountOf(d)), LIB.map(x => x.data));
      const ids = LIB.map(x => x.id.replace('lib-os-', ''));
      const nm = Object.fromEntries(ids.map((id, i) => [id, n[i]]));
      T(nm.lc6650166 === 20 && nm.lc5705406 === 60, 'SC3 小节数按 meaNo 口径（骊歌 20、去会情人 60：不算弱起与拆开的后半小节）', J(nm));
      /* SC4 服务端落地页：meaCountOf / keyLbl 与编辑器逐首对拍（从 server.js 取源码在 node 里跑，不起服务） */
      let srvOk = false, srvD = '';
      try {
        const src = fs.readFileSync(API, 'utf8');
        const a = src.indexOf('function meaCountOf('), z = src.indexOf('function pubMeta(');
        if (a < 0 || z < a) srvD = 'server.js 没有 meaCountOf';
        else {
          const arr = v => Array.isArray(v) ? v : [];
          const sNum = v => typeof v === 'number' ? (Number.isFinite(v) ? v : 0) : (typeof v === 'string' && v.trim() !== '' && Number.isFinite(+v) ? +v : 0);
          const mod = new Function('arr', 'sNum', src.slice(a, z) + '\nreturn {meaCountOf, keyLbl};')(arr, sNum);
          const sv = LIB.map(x => mod.meaCountOf(x.data));
          const usesN = /const nMea = meaCountOf\(d\)/.test(src), usesK = /1=' \+ escHtml\(keyLbl\(p\.key\)\)/.test(src);
          srvOk = J(sv) === J(n) && mod.keyLbl('Ab') === '♭A' && mod.keyLbl('F#') === '♯F' && mod.keyLbl('C') === 'C' && usesN && usesK;
          srvD = J({ sv, ed: n, usesN, usesK });
        }
      } catch (e) { srvD = String(e.message || e).slice(0, 200); }
      T(srvOk, 'SC4 服务端落地页小节数（10 首逐首＝编辑器 meaCountOf）与调号写法（1=♭A）同编辑器', srvD);
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= KT 移调选调 ================= */
    if (want('KT')) {
      const A = await open(b, {});
      const k1 = await EV(A.pg, () => {
        const mk = (k, o) => { const s = createSong('vocal', { beats: 4, unit: 4, key: k, nMea: 2, nVox: 1, lyr: 0 }); Object.assign(s, o || {}); return s; };
        const tr = (k, d) => { const s = mk(k); transposeSong(s, d); return s.key; };
        const r = { 'Eb-2': tr('Eb', -2), 'Ab-2': tr('Ab', -2), 'Ab+5': tr('Ab', 5), 'C+6': tr('C', 6), 'D+4': tr('D', 4), 'Bb+8': tr('Bb', 8), 'E+9': tr('E', 9), 'G-6': tr('G', -6), 'F+1': tr('F', 1) };
        const s = mk('Eb'); s.measures[1].keyTo = 'Ab'; s.measures[0].voxes[0][0].chord = 'Ab'; s.measures[0].voxes[0][0].deg = 4; transposeSong(s, -2);
        r.keyTo = s.measures[1].keyTo; r.chord = s.measures[0].voxes[0][0].chord;
        return r; });
      T(k1['Eb-2'] === 'Db' && k1['Ab-2'] === 'Gb' && k1['Ab+5'] === 'Db' && k1['C+6'] === 'F#' && k1['D+4'] === 'F#' && k1['Bb+8'] === 'Gb' && k1['E+9'] === 'Db' && k1['G-6'] === 'Db' && k1['F+1'] === 'Gb' && k1.keyTo === 'Gb' && k1.chord === 'Gb',
        'KT1 同音异名取升降号少的写法（♭E−2＝♭D、♭A+5＝♭D），♯F / ♭G 随原调方向（♭A−2＝♭G、D+4＝♯F）；转调标记 / 和弦名同规则', J(k1));
      for (const shell of ['flow', 'classic']) {
        const B = shell === 'flow' ? A : await open(b, { shell: 'classic' });
        const k2 = await EV(B.pg, d => { __ld(d); stepKey(-1); stepKey(-1); blurSel = true; render();
          const hd = [...document.querySelectorAll('#score text')].map(t => t.textContent).filter(t => /^1=/.test(t));
          return { key: song.key, hk: headKeyOf(song), hd, ks: sigOf(song.key) }; }, Object.assign({}, LI('lc4985973'), { voxNotations: [undefined, 'staff', 'bass'] }));
        T(k2.key === 'Db' && k2.hk === 'Db' && k2.ks === -5 && k2.hd.includes('1=♭D'), 'KT2 编辑器 ♭♯ 步进 ♭E 降 2：1=♭D（5 个降号，不是 ♯C 7 个升号），页头同写' + (shell === 'classic' ? '（旧外壳）' : ''), J(k2));
        if (shell === 'classic') { allErrs.push(...B.errs); await B.close(); }
      }
      /* KT3 新外壳调网格键名：♭E 调里 ♭G、C 调里 ♯F；点 ♭G 落 song.key＝Gb */
      const k3 = await EV(A.pg, d => { __ld(d); ekBase = null; ekCalc = null; openEdKeyPop();
        const lab = () => [...document.querySelectorAll('#ek-grid .kp-gk')].map(x => x.textContent).join(' ');
        const eb = lab(); const g = document.querySelector('#ek-grid [data-v="Gb"]'); if (g) g.click();
        const r = { eb, key: song.key, pr: [...document.querySelectorAll('#ek-grid [aria-pressed="true"]')].map(x => x.dataset.v), t: __toastT() };
        document.getElementById('ekey-pop').classList.remove('on');
        const c = createSong('vocal', { beats: 4, unit: 4, key: 'C', nMea: 1, nVox: 1, lyr: 0 }); __ld(c); ekBase = null; ekCalc = null; openEdKeyPop(); r.c = lab(); document.getElementById('ekey-pop').classList.remove('on');
        return r; }, Object.assign({}, LI('lc4985973'), { voxNotations: [undefined, undefined, undefined] }));
      T(/♭G/.test(k3.eb) && !/♯F/.test(k3.eb) && /♭D/.test(k3.eb) && k3.key === 'Gb' && J(k3.pr) === J(['Gb']) && /♭G/.test(k3.t) && k3.c === 'C G D A E B ♯F F ♭B ♭E ♭A ♭D',
        'KT3 新外壳调网格键名＝点下去会落成的写法（♭E 调：♭G；C 调：♯F），点 ♭G 落 1=♭G', J(k3));
      /* KT4 观看页变调：唱调显示与谱面同写法 */
      const k4 = await EV(A.pg, d => { __share(d); vwTranspose(-2); render(); const hv = (document.getElementById('vh-key-v') || {}).textContent;
        updateVwHdr(); return { key: song.key, hv: (document.getElementById('vh-key-v') || {}).textContent, t: __toastT() }; }, LI('lc5701612'));
      T(k4.key === 'Db' && k4.hv === 'Db调' && !/C#/.test(k4.t), 'KT4 观看页变调 ♭E 降 2：唱调「Db调」、谱面 1=♭D（此前 C#）', J(k4));
      /* KT5 改记谱调速选：12 个调里写 ♭D 不写 ♯C；选 ♭D 落 Db、音高不变 */
      const k5 = await EV(A.pg, () => { exitViewer(); const s = createSong('vocal', { beats: 4, unit: 4, key: 'C', nMea: 1, nVox: 1, lyr: 0 });
        s.measures[0].voxes[0].forEach((c, i) => { c.deg = [1, 3, 5, 6][i]; }); __ld(s); ekBase = null; openEdKeyPop();
        const tg = document.getElementById('ek-resp-tg'); const box = document.getElementById('ek-resp'); if (box) box.hidden = false; ekRespRender();
        const chips = [...document.querySelectorAll('#ek-resp [data-ekresp]')].map(x => x.dataset.ekresp);
        const p0 = __pitch(); edRespell('Db'); const r = { chips, key: song.key, same: __pitch() === p0 }; document.getElementById('ekey-pop').classList.remove('on'); return r; });
      T(Array.isArray(k5.chips) && k5.chips.includes('Db') && !k5.chips.includes('C#') && k5.key === 'Db' && k5.same, 'KT5 改记谱调速选写 ♭D（不写 ♯C），选它落 1=♭D、音高逐音不变', J(k5));
      allErrs.push(...A.errs); await A.close();
    }

    /* ================= KP 保持音高 ================= */
    if (want('KP')) {
      for (const shell of ['flow', 'classic']) {
        const A = await open(b, { shell: shell === 'classic' ? 'classic' : null });
        const sx = shell === 'classic' ? '（旧外壳）' : '';
        const p1 = await EV(A.pg, () => { keyKeepPitch = null;
          const s = createSong('staff', { title: '五', beats: 4, unit: 4, key: 'C', nMea: 4, nVox: 1, lyr: 0 });
          s.measures.forEach((m, mi) => { m.voxes[0] = [5, 6, 7, 1].map((d, i) => ({ dur: 4, dotted: false, deg: d, acc: '', oct: d === 1 ? 1 : 0, lyrics: [] })); });
          s.measures[3].voxes[0][1].adds = [{ deg: 3, acc: '', oct: 0 }]; s.measures[3].voxes[0][2].grace = { notes: [{ deg: 2, oct: 0 }], dur: 16 }; s.measures[3].voxes[0][3].orn = 'tr';
          __ld(s); const j0 = JSON.stringify(song), p0 = __pitch(), u0 = undoStack.length;
          sel = { mi: 2, row: 'vox', vi: 0, ci: 0, si: 1 }; showKeyToMenu();
          const m = document.getElementById('popmenu'), kb = m && m.querySelector('[data-ktk]');
          const r = { def: kb && kb.getAttribute('aria-pressed'), on: kb && kb.classList.contains('on'), t: (m.querySelector('.t') || {}).textContent, lab: [...m.querySelectorAll('[data-kt]')].map(x => x.textContent).slice(0, 4) };
          m.querySelector('[data-kt="Eb"]').click();
          r.kt = song.measures[2].keyTo; r.same = __pitch() === p0; r.du = undoStack.length - u0; r.m2 = song.measures[2].voxes[0].map(c => (c.acc || '') + c.deg).join(' ');
          r.m3 = song.measures[3].voxes[0].map(c => (c.acc || '') + c.deg).join(' ');
          undo(); r.undo = JSON.stringify(song) === j0;
          redo(); sel = { mi: 2, row: 'vox', vi: 0, ci: 0, si: 1 }; showKeyToMenu(); document.querySelector('#popmenu [data-kt=""]').click();
          r.clr = !song.measures[2].keyTo && __pitch() === p0;
          return r; });
        T(p1.def === 'true' && p1.on && p1.kt === 'Eb' && p1.same && p1.du === 1 && p1.undo && p1.clr && p1.m2 === '3 #4 #5 6' && p1.m3 === '3 #4 #5 6',
          'KP1 纯五线谱中途转调默认「保持音高」：转 1=♭E 后逐音（含和音 / 倚音）不变、G A B C 重拼成 3 ♯4 ♯5 6、一步撤销逐字节还原；清除转调同样不变' + sx, J(p1));
        T(/本小节起换调号/.test(p1.t || '') && !/简谱读/.test(p1.t || '') && J(p1.lab) === J(['1=C', '1=♭D', '1=D', '1=♭E']), 'KP3 纯五线谱转调菜单文案不写「简谱读」、调名 1=♭D 写法' + sx, J({ t: p1.t, lab: p1.lab }));
        const p2 = await EV(A.pg, () => { keyKeepPitch = null;
          const s = createSong('vocal', { title: '简', beats: 4, unit: 4, key: 'C', nMea: 3, nVox: 1, lyr: 0 });
          s.measures.forEach(m => { m.voxes[0] = [1, 2, 3, 5].map(d => ({ dur: 4, dotted: false, deg: d, acc: '', oct: 0, lyrics: [] })); });
          __ld(s); const p0 = __pitch(), d0 = JSON.stringify(song.measures.map(m => m.voxes[0].map(c => c.deg)));
          sel = { mi: 1, row: 'vox', vi: 0, ci: 0, si: 1 }; showKeyToMenu();
          const kb = document.querySelector('#popmenu [data-ktk]'); const r = { def: kb && kb.getAttribute('aria-pressed'), t: (document.querySelector('#popmenu .t') || {}).textContent };
          document.querySelector('#popmenu [data-kt="D"]').click();
          r.digits = JSON.stringify(song.measures.map(m => m.voxes[0].map(c => c.deg))) === d0; r.moved = __pitch() !== p0;
          undo(); sel = { mi: 1, row: 'vox', vi: 0, ci: 0, si: 1 }; showKeyToMenu(); document.querySelector('#popmenu [data-ktk]').click();
          r.def2 = document.querySelector('#popmenu [data-ktk]').getAttribute('aria-pressed');
          document.querySelector('#popmenu [data-kt="D"]').click(); r.kept = __pitch() === p0 && song.measures[1].keyTo === 'D';
          keyKeepPitch = null; return r; });
        T(p2.def === 'false' && p2.digits && p2.moved && p2.def2 === 'true' && p2.kept && /简谱读 1=X/.test(p2.t || ''),
          'KP2 简谱歌谱默认不保持（原语义：数字不变、音随新调）；手动开「保持音高」后音高逐音不变' + sx, J(p2));
        allErrs.push(...A.errs); await A.close();
      }
      { const A = await open(b, {});
        const p4 = await EV(A.pg, () => {
          const has = typeof respellMeasures === 'function', src = String(respellSongKey);
          const s = createSong('vocal', { beats: 4, unit: 4, key: 'C', nMea: 2, nVox: 1, lyr: 0 });
          s.measures[0].voxes[0] = [{ dur: 4, deg: 3, acc: 'b', oct: 0, lyrics: [], orn: 'turn' }, { dur: 4, deg: 6, acc: '', oct: 0, lyrics: [], adds: [{ deg: 1, acc: '#', oct: 1 }] },
            { dur: 4, deg: 5, acc: '', oct: 0, lyrics: [], grace: { notes: [{ deg: 4, acc: '#', oct: 0 }], dur: 16 } }, { dur: 4, deg: 1, acc: '', oct: 1, lyrics: [] }];
          __ld(s); const p0 = __pitch(); respellSongKey(song, 'A', {}); const same = __pitch() === p0;
          return { has, uses: /respellMeasures\(/.test(src), same, key: song.key }; });
        T(p4.has && p4.uses && p4.same && p4.key === 'A', 'KP4 respellMeasures 抽出、respellSongKey 复用（改记谱调含和音 / 倚音 / 回音邻音，音高逐音不变）', J(p4));
        /* KP5 新外壳调网格「保持音高」：纯五线谱默认开（点 D＝改记谱调，音高不变），简谱默认关（点 D＝移调） */
        const p5 = await EV(A.pg, () => { keyKeepPitch = null;
          const s = createSong('staff', { title: '五', beats: 4, unit: 4, key: 'C', nMea: 2, nVox: 1, lyr: 0 });
          s.measures.forEach(m => { m.voxes[0] = [1, 3, 5, 6].map(d => ({ dur: 4, dotted: false, deg: d, acc: '', oct: 0, lyrics: [] })); });
          __ld(s); ekBase = null; ekCalc = null; const p0 = __pitch(); openEdKeyPop();
          const kb = document.querySelector('#ek-keep [data-fa="hd:keep"]'); const r = { has: !!kb, def: kb && kb.getAttribute('aria-pressed'), first: document.getElementById('ekey-pop').firstElementChild && document.getElementById('ekey-pop').firstElementChild.id, n: document.querySelectorAll('#ek-grid button').length };
          document.querySelector('#ek-grid [data-v="D"]').click(); r.k1 = song.key; r.same = __pitch() === p0; document.getElementById('ekey-pop').classList.remove('on');
          const v = createSong('vocal', { title: '简', beats: 4, unit: 4, key: 'C', nMea: 2, nVox: 1, lyr: 0 });
          v.measures.forEach(m => { m.voxes[0] = [1, 3, 5, 6].map(d => ({ dur: 4, dotted: false, deg: d, acc: '', oct: 0, lyrics: [] })); });
          __ld(v); ekBase = null; ekCalc = null; const q0 = __pitch(), d0 = JSON.stringify(song.measures[0].voxes[0].map(c => c.deg)); openEdKeyPop();
          r.def2 = document.querySelector('#ek-keep [data-fa="hd:keep"]').getAttribute('aria-pressed');
          document.querySelector('#ek-grid [data-v="D"]').click(); r.k2 = song.key; r.moved = __pitch() !== q0 && JSON.stringify(song.measures[0].voxes[0].map(c => c.deg)) === d0;
          document.getElementById('ekey-pop').classList.remove('on'); keyKeepPitch = null; return r; });
        T(p5.has && p5.def === 'true' && p5.first === 'ek-grid' && p5.n === 12 && p5.k1 === 'D' && p5.same && p5.def2 === 'false' && p5.k2 === 'D' && p5.moved,
          'KP5 新外壳调网格「保持音高」：纯五线谱默认开（点 D 只换调号、音高不变），简谱默认关（点 D 整体移调）；网格仍 12 键在弹窗最上', J(p5));
        allErrs.push(...A.errs); await A.close(); }
    }

    /* ================= JL 简谱行首声部名 ================= */
    if (want('JL')) {
      for (const shell of ['flow', 'classic']) {
        const A = await open(b, { shell: shell === 'classic' ? 'classic' : null });
        const sx = shell === 'classic' ? '（旧外壳）' : '';
        const r = await EV(A.pg, L => {
          const out = [];
          for (const d of L) {
            __ld(Object.assign({}, d, { voxNotations: undefined, voxDual: undefined })); blurSel = true; render();
            const svg = document.getElementById('score'), vb = svg.viewBox.baseVal;
            const lb = [...svg.querySelectorAll('text')].filter(t => t.getAttribute('opacity') === '0.6' && (t.dataset.rowlbl != null || +t.getAttribute('x') === MARGIN - 24));
            let bad = 0, worst = null; const txt = new Set();
            lb.forEach(t => { const bb = t.getBBox(); txt.add(t.textContent); const l = bb.x, r2 = bb.x + bb.width;
              if (l < vb.x - 0.5 || r2 > MARGIN - 4 + 0.5) { bad++; if (!worst || l < worst.l) worst = { t: t.textContent, l: +l.toFixed(1), r: +r2.toFixed(1) }; } });
            out.push({ t: d.title.slice(0, 6), n: lb.length, bad, worst, txt: [...txt], anchor: lb.every(t => t.getAttribute('text-anchor') === 'end' && +t.getAttribute('x') === MARGIN - 6) });
          }
          return out; }, LIB.map(x => x.data));
        const okAll = Array.isArray(r) && r.length === 10 && r.every(x => x.n > 0 && x.bad === 0 && x.anchor);
        T(okAll, 'JL1 曲库 10 首切简谱：行首声部名全部在左页边距内（不越出谱纸左缘、右端不过 oxH−4），以 oxH−6 右对齐' + sx, J(Array.isArray(r) ? r.filter(x => !(x.n > 0 && x.bad === 0 && x.anchor)).slice(0, 4) : r));
        if (shell === 'flow') {
          const av = Array.isArray(r) ? r[0].txt : [];
          T(av.includes('Voice') && av.includes('右手') && av.includes('左手'), 'JL2 放不下时先用短名（Singstimme Voice → Voice、Pianoforte·右手 → 右手）', J(av));
        }
        const r3 = await EV(A.pg, () => { const s = createSong('piano', { title: '钢', beats: 4, unit: 4, key: 'C', nMea: 2, lyr: 0 }); s.voxNotations = []; s.voxVoices = ['钢琴·右手', '钢琴·左手']; __ld(s); blurSel = true; render();
          return [...document.querySelectorAll('#score text[data-rowlbl]')].map(t => t.textContent + '@' + t.getAttribute('font-size')); });
        T(Array.isArray(r3) && r3.includes('钢琴·右手@10') && r3.includes('钢琴·左手@10'), 'JL3 中文短名（钢琴·右手）照原名、10 号不缩' + sx, J(r3));
        allErrs.push(...A.errs); await A.close();
      }
    }
  } catch (e) { T(false, 'ZZ 运行异常', String(e && e.stack || e).slice(0, 600)); }
  T(!allErrs.length, 'ZZ 无页面错误', J(allErrs.slice(0, 5)));
  console.log(`\nPASS ${pass}/${total}` + (fails.length ? '  红：' + fails.join(' ') : ''));
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
