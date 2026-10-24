'use strict';
/* v69.1 界面简约化 S3 · B 轨「输出模式 + 发布」（规格 f91 §4 B2 / §6.4 tv_output2；方案 docs/design-2026-10g ③输出 / ④#16 / D2 / D12 / S7 / S8）。
   被测页＝默认新外壳（flow 新形态）；O0 另开 ?next=0；O2 另开 ?next=0 比同 id 键的调用。
   修前（658d425，MUSETAB_URL 指向它）应红：O0 在基线上本来成立，其余各条都以输出悬浮条 / 左栏格式卡 / 行 1 发布弹层为前提。
   O0  ?next=0：行 2 7 个导出键可见、行 1「发布」切到输出 + 右栏发布卡（#flw-pub-go）、没有 #flw-out-fmt / #flw-pubp（v69.0 原样）
   O1  新形态进输出：悬浮条 flw-sb-m-output，内容恰为 总谱 | 分谱 · 纸张 select · 「共 N 页」· 存 PDF · 智能 ▾ · 收起；存 PDF 是工作区唯一实底（同 tv_next 口径：工作区 1、行 1 1）；
       几何：条底 ≤ 预览顶、条左右缘＝预览区；行 2 只留「预览」分段
   O2  左栏格式卡 7 张常显（不在 ▾ 里）、同 id；每张真实点击的调用（EXPORT_ACT 方法与参数 · 底层导出函数 · pyqEvent）＝?next=0 行 2 同 id 键（打桩逐项对拍）；
       打印 / 图片卡有第 1 页缩略图 svg（非空），其余有图标；分享卡 / 互动谱带格式徽章 PNG / HTML；命中区 ≥44、字 ≤3、悬停 ≤12
   O3  记住上次格式：点「图片」卡 → 主按钮字「存图片」→ 点主按钮＝EXPORT_ACT.png；刷新 →「存 PDF」；本机键集合不变（只在内存）
   O4  分谱：四声部合唱夹具 → 分谱段徽标 4；选分谱 → 存 PDF＝EXPORT_ACT.parts(PSIZE, 勾选集)；全不勾 → 主按钮灰显「先勾选分谱」、点了不打印；
       单演奏者（送别）→ 分谱段 aria-disabled + 锁 + 原因「只有一位演奏者」；回书写再进输出＝回到「总谱」
   O5  纸张：#flw-out-psize 在悬浮条、选项字 ≤4、change → 打印调用带新纸张（打印卡与存 PDF 同）；#flw-out-pages「共 N 页」，看分谱时为这一份的页数
   O6  左栏警示条与开关：#flw-out-brkr（≥2 份且有手动换行）/ #flw-out-trim（末尾空小节，点删除＝trimTrailing 一步撤销）/ #flw-out-pnw（A3 印页码打 A4）都在 #flw-left 里可见；
       右栏与竖条在输出模式不显示、预览右缘＝视口右缘（1440 停靠 / 1280 竖条两档）
   O7  输出屏（textaudit 单屏抽取）：说明字 0、P3 指路 0；悬停 ≤12（工作区可点控件）
   O8  发布：书写 / 排版 / 输出任意模式点行 1「发布」→ 模式不变、#flw-pubp 出现、三点「存入 › 审核 › 上架」+ 当前步；未入库 stage 0「提交」→ 存入 + 云端（同 tv_publish 桩）
       → 落「审核中」（第 2 点当前、主动作「查看进度」）、location.href 不变；管理员直接上架 → 三点都完成 +「复制链接」
   O9  线上未登录（PYQ_CLOUD 真、ACCT 空）→ 主动作「登录后发布」→ 点了 openLogin 被调、不存入
   O10 本机演示：定价 / 试读两格可见、值带进发布记录（同原功能）；末尾空小节 → 弹层里「删除」可见、点了删掉且弹层不收
   O11 分谱 v68.6 能力抽样回归：切预览 / 勾选三态 / ⚠ 跳小节 / 沿用总谱换行 / 看分谱时 PNG＝partPng（与 tv_parts_ui 同口径）
   O12 打印媒体与快照：#flw-pubp 打印隐藏；FLOW.snapHTML 里没有 #flw-pubp / #flw-out-fmt / 缩略图
   RL  数据红线：本机键集合差 ⊆ 基线源码里出现过的键名；song 字段只多发布 / 存入本来就写的 id 等
   env：MUSETAB_URL 被测页 · ONLY=O1,O4 · SHOTS=目录 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const { runState } = require('./lib/textaudit/states.js');
const M = require('./lib/textaudit/metrics.js');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => { const i = u.indexOf('#'), b = i >= 0 ? u.slice(0, i) : u, h = i >= 0 ? u.slice(i) : ''; return b + (b.includes('?') ? '&' : '?') + q + h; };
const NX0 = withQ(URL0, 'next=0');
const REFJ = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'inplace_ref.json'), 'utf8')); } catch (_) { return {}; } })();
const BASE_COMMIT = process.env.MUSETAB_BASE_COMMIT || REFJ.commit || '658d4252b780f6534cec556fdf4d9f96609f5928';
/* 数据红线「已有键名」：基线源码里出现过的 musetab-* 键名都算已有（同 tv_layout2 RL 口径） */
const KNOWN = (() => { const lit = t => new Set((String(t || '').match(/musetab-[a-z0-9-]+/g) || []));
  try { return lit(execFileSync('git', ['-C', __dirname, 'show', BASE_COMMIT + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] })); }
  catch (_) { try { return lit(fs.readFileSync(URL0.replace(/^file:\/\//, '').replace(/[?#].*$/, ''), 'utf8')); } catch (__) { return new Set(); } } })();
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const SHOTS = process.env.SHOTS || '';
const J = x => JSON.stringify(x);
const W = ms => new Promise(r => setTimeout(r, ms));
const cnt = s => (String(s || '').match(/[\p{L}\p{N}]/gu) || []).length;
let pass = 0, total = 0; const OUT = {}, fails = [], errs = [], RL = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; else fails.push(id + ' ' + name); (OUT[id] = OUT[id] || []).push((ok ? '✅ ' : '❌ ') + id + ' ' + name + (!ok && d != null ? '\n     ' + String(d).slice(0, 1800) : '')); };
const NOTE = (id, s) => { (OUT[id] = OUT[id] || []).push('ℹ️ ' + s); };

/* —— 页面内工具（init 脚本：只定义 window.__*）—— */
function INIT() {
  window.__P = n => { const p = PRESETS.find(x => x.name.indexOf(n) >= 0); if (!p) throw new Error('无预设 ' + n); return migrate(p.make()); };
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    if (getComputedStyle(e).visibility !== 'visible') return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.opacity === '0') return false; } return true; };
  window.__hit = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e) return false; const r = e.getBoundingClientRect(); const x = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!x && (x === e || e.contains(x)); };
  window.__R = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e) return null; const r = e.getBoundingClientRect(), f = v => Math.round(v * 10) / 10; return { x: f(r.left), y: f(r.top), w: f(r.width), h: f(r.height), r: f(r.right), b: f(r.bottom) }; };
  window.__keys = () => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort();
  window.__fields = () => { const S = new Set(), s = song; if (!s) return []; Object.keys(s).forEach(k => S.add('S.' + k));
    if (s.layout && typeof s.layout === 'object') Object.keys(s.layout).forEach(k => S.add('L.' + k)); (s.measures || []).forEach(m => { if (m) Object.keys(m).forEach(k => S.add('M.' + k)); }); return [...S].sort(); };
  window.__shut = () => { try { FLOW.menu.close(); } catch (_) {} try { closePop(); } catch (_) {} try { closeModal(); } catch (_) {} };
  window.__one = s => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; try { hideStartPad(); } catch (_) {} __shut(); const t = document.querySelector('#flw-tour'); if (t) t.remove();
    addDoc(s, () => {}); while (docs.length > 1) closeDocAt(0); try { closeModal(); } catch (_) {}
    sel = { mi: 0, row: (s.tabVoices || []).length && !(s.voxVoices || []).length ? 'tab' : 'vox', vi: 0, ci: 0, si: 1 }; try { blurSel = false; selRange = null; measureRange = null; } catch (_) {} render();
    try { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); } catch (_) {} return s.measures.length; };
  const cl = x => JSON.parse(JSON.stringify(x));
  /* 末尾空小节（trailingEmptyN 认得的「空」）——同 tv_parts_ui __emptyMea */
  window.__emptyMea = m => { const e = cl(m);
    ['label', 'keyTo', 'volta', 'repeatStart', 'repeatEnd', 'segno', 'coda', 'dc', 'ds', 'fine', 'finalBar', 'brk', 'pull', 'pgbrk', 'wf'].forEach(k => delete e[k]);
    (e.voxes || []).forEach(cs => (cs || []).forEach(c => { if (!c) return; c.deg = 0; delete c.lyrics; delete c.chord; delete c.chords; }));
    (e.tabs || []).forEach(cs => (cs || []).forEach(c => { if (!c) return; c.notes = []; c.strum = ''; c.chord = ''; delete c.perc; }));
    return e; };
  /* 夹具（同 tv_parts_ui __fx 口径） */
  window.__fx = k => { let s;
    switch (k) {
      case '两只老虎': s = PRESETS[3].make(); break;
      case '送别': s = PRESETS[10].make(); break;
      case '小星星': s = PRESETS[0].make(); break;
      case '小星星+换行': s = PRESETS[0].make(); s.measures[6].brk = 1; break;
      case '小星星+冲突和弦': s = PRESETS[0].make(); { const mi = s.measures.findIndex(m => ((m.tabs || [])[0] || [])[0] && m.tabs[0][0].chord); const c = s.measures[mi].voxes[0][0]; c.chord = s.measures[mi].tabs[0][0].chord === 'Am' ? 'Dm' : 'Am'; } break;
      case '两只老虎+末尾空2': s = PRESETS[3].make(); { const L = s.measures[s.measures.length - 1]; s.measures.push(__emptyMea(L), __emptyMea(L)); } break;
      case '送别+末尾空2': s = PRESETS[10].make(); { const L = s.measures[s.measures.length - 1]; s.measures.push(__emptyMea(L), __emptyMea(L)); } break;
      case '合唱四声部': s = NWB.build('S', { title: '合唱夹具', nMea: 4, nVox: 4 }); s.voxVoices = ['女高音', '女低音', '男高音', '男低音']; s.voxNotations = ['staff', 'staff', 'staff', 'bass'];
        s.measures.forEach(m => (m.voxes || []).forEach(cs => { const c = (cs || [])[0]; if (c) { c.deg = c.deg || 1; c.lyrics = ['啊']; } })); s.voxGroups = [{ type: 'bracket', from: 0, to: 3 }]; break;
      default: throw new Error('未知夹具 ' + k);
    }
    return migrate(s); };
  /* 调用记录：EXPORT_ACT 各方法（方法名＋参数）· 底层导出函数 · window.print · pyqEvent（同 tv_modes M8 / tv_parts_ui __spy 口径） */
  window.__spy = () => { window.__EV = []; const arg = a => typeof a === 'function' ? 'fn' : JSON.stringify(a);
    Object.keys(EXPORT_ACT).forEach(k => { const f = EXPORT_ACT[k]; if (typeof f !== 'function' || f.__spy) return; const g = function () { __EV.push(k + '(' + [...arguments].map(arg).join(',') + ')'); return f.apply(this, arguments); }; g.__spy = 1; EXPORT_ACT[k] = g; });
    ['exportPNG', 'exportShareCard', 'exportInteractiveCard', 'downloadMusicXML', 'downloadMIDI', 'exportSong'].forEach(f => { window[f] = function () { __EV.push('fn:' + f + '(' + [...arguments].map(arg).join(',') + ')'); }; });
    try { svgPngDownload = function (xml, vb, k, name) { __EV.push('svgpng:' + name); }; } catch (_) {}
    window.print = () => { __EV.push('print'); };
    try { pyqEvent = function (n, m) { __EV.push('ev:' + n + (m ? ':' + m : '')); }; } catch (_) {} };
  window.__take = () => { const r = (window.__EV || []).join(' '); if (window.__EV) __EV.length = 0; return r; };
  /* 实底计数（同 tv_next __solid 口径：按 --btn-pri 计算色；弹窗 / 菜单 / 提示条不算；主按钮与它的 ▾ 合计 1） */
  window.__solid = () => { const pr = document.createElement('i'); pr.style.background = 'var(--btn-pri)'; document.body.appendChild(pr); const pri = getComputedStyle(pr).backgroundColor; pr.remove();
    const all0 = [...document.querySelectorAll('button,[role="button"],a')].filter(e => __vis(e) && !e.closest('#modal-mask,#popmenu,#toast,.modal-mask') && getComputedStyle(e).backgroundColor === pri);
    const all = [...new Set(all0.map(e => e.closest('.flw-sb-gog') || e))];
    const r1 = all.filter(e => e.closest('#flw-r1')), ws = all.filter(e => !e.closest('#flw-r1'));
    return { r1: r1.length, ws: ws.length, wsIds: ws.map(e => e.id || e.className).join(',') }; };
  window.__go = () => { const g = document.getElementById('flw-sb-go'); return g ? { t: ((g.querySelector('.flw-sb-l') || g).textContent || '').trim(), dis: g.getAttribute('aria-disabled'), why: g.dataset.why || '', act: g.dataset.act } : null; };
  window.__pub = () => { const p = document.getElementById('flw-pubp'); if (!p) return null; const ol = p.querySelector('.flw-pbst'), g = p.querySelector('#flw-pubp-go');
    return { vis: __vis(p), say: ol && ol.getAttribute('aria-label'), dots: ol ? [...ol.querySelectorAll('li')].map(li => li.className + ':' + li.textContent.trim()) : [], go: g && g.textContent.trim(), v: g && g.dataset.v,
      price: __vis('#flw-pubp-price'), prev: __vis('#flw-pubp-prev'), trim: (b => !!b && __vis(b))(p.querySelector('[data-fa="r1:pubtrim"]')), re: !!p.querySelector('[data-fa="r1:pubre"]') }; };
  window.__toasts = [];
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const open = async (w, h, o) => { o = o || {};
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: o.scheme || 'light', deviceScaleFactor: 1 });
    ctx.setDefaultTimeout(8000);
    await ctx.addInitScript(INIT);
    const pg = await ctx.newPage(); pg._ctx = ctx;
    pg.on('pageerror', e => errs.push((o.tag || '') + ' PAGEERR: ' + e.message));
    pg.on('dialog', d => d.dismiss().catch(() => {}));
    await pg.goto(o.url || URL0); await pg.waitForTimeout(1000);
    await prep(pg);
    return pg; };
  const prep = pg => pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
    try { if (!toast.__tv) { const ot = toast; toast = function (m) { __toasts.push(String(m)); try { return ot.apply(this, arguments); } catch (_) {} }; toast.__tv = 1; } } catch (_) {}
    if (!document.getElementById('tv-o2-notrans')) { const st = document.createElement('style'); st.id = 'tv-o2-notrans'; st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}'; document.head.appendChild(st); } });
  const close = pg => pg._ctx.close().catch(() => {});
  const EV = (pg, f, a) => pg.evaluate(f, a);
  const shot = async (pg, n) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, n + '.png') }); };
  const SAFE = async (id, fn) => { try { await fn(); } catch (e) { T(id, false, '执行异常', String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } };
  const modeTo = async (pg, m) => { await pg.click('#flw-mode-' + m); await pg.waitForTimeout(m === 'write' ? 500 : 1200); };
  const ld = async (pg, k) => { await EV(pg, k => __one(__fx(k)), k); await pg.waitForTimeout(250); };
  const redBase = pg => EV(pg, () => ({ f: __fields(), k: __keys() }));
  const redEnd = async (id, pg, base, allowF) => { const now = await redBase(pg);
    const nf = now.f.filter(x => !base.f.includes(x) && !(allowF || []).includes(x)), nk = now.k.filter(x => !base.k.includes(x) && !KNOWN.has(x));
    RL.push({ id, ok: !nf.length && !nk.length, d: id + (nf.length ? ' 新字段 ' + nf.join(',') : '') + (nk.length ? ' 新键 ' + nk.join(',') : '') }); };
  const KS = ['print', 'png', 'card', 'icard', 'mxl', 'mid', 'mtab'];

  /* ================= O0 ?next=0 ================= */
  if (want('O0')) await SAFE('O0', async () => {
    const pg = await open(1280, 800, { url: NX0, tag: 'O0' });
    await ld(pg, '送别');
    await pg.click('#flw-pub'); await pg.waitForTimeout(600);
    const a = await EV(pg, () => ({ nx: FLOW.nxOn(), cur: FLOW.mode.cur, page: FLOW.rd.page(), card: __vis('#flw-pub-go'),
      keys: ['print', 'png', 'card', 'icard', 'mxl', 'mid', 'mtab'].map(k => { const e = document.getElementById('flw-out-' + k); return !!e && __vis(e) && !!e.closest('#editbar'); }),
      fmt: !!document.getElementById('flw-out-fmt'), pubp: !!document.getElementById('flw-pubp'), sb: getComputedStyle(document.getElementById('flw-sbar')).visibility }));
    T('O0', !a.nx && a.cur === 'output' && a.page === 'pub' && a.card && a.keys.every(Boolean) && !a.fmt && !a.pubp && a.sb === 'hidden',
      'O0 ?next=0：行 1「发布」切到输出 + 右栏发布卡；行 2 7 个导出键可见；没有格式卡 / 发布弹层；输出时悬浮条 hidden（v69.0 原样）', J(a));
    await close(pg);
  });

  /* ================= O1 输出悬浮条 ================= */
  if (want('O1')) for (const [w, h] of [[1280, 800], [1440, 900]]) await SAFE('O1', async () => {
    const pg = await open(w, h, { tag: 'O1-' + w });
    await ld(pg, '两只老虎'); const base = await redBase(pg);
    await modeTo(pg, 'output');
    const a = await EV(pg, () => { const sb = document.getElementById('flw-sbar'), bar = document.getElementById('flw-sb-bar'), q = __R(sb), pv = __R('#preview-ov'), ps = __R('#pv-stage');
      const kids = [...bar.querySelectorAll('button, select')].filter(x => __vis(x)).map(x => x.id || ('[' + x.dataset.fa + (x.dataset.v ? '=' + x.dataset.v : '') + ']'));
      const r2 = [...document.querySelectorAll('#editbar button')].filter(x => __vis(x)).map(x => x.id || x.dataset.fa + ':' + (x.dataset.v || ''));
      return { cls: sb.classList.contains('flw-sb-m-output'), vis: __vis(sb), kids, pages: (document.getElementById('flw-out-pages') || {}).textContent, pagesVis: __vis('#flw-out-pages'),
        go: __go(), solid: __solid(), geo: { b: q.b, pt: ps.y, l: q.x, r: q.r, pl: pv.x, pr: pv.r }, ovf: bar.scrollWidth - bar.clientWidth, r2,
        arr: [...document.querySelectorAll('#flw-out-arr button')].map(x => x.textContent.trim()) }; });
    const expK = ['[out:job=score]', 'flw-out-parts', 'flw-out-psize', 'flw-sb-go', 'flw-sb-smart', 'flw-sb-tg'], g = a.geo;
    T('O1', a.cls && a.vis && J(a.kids) === J(expK) && a.pagesVis && /^共 \d+ 页$/.test(a.pages || '') && a.go && a.go.t === '存 PDF' && !a.go.dis && a.solid.ws === 1 && a.solid.r1 === 1 && /flw-sb-go|flw-sb-gog/.test(a.solid.wsIds)
      && g.b <= g.pt + 1 && Math.abs(g.l - g.pl) <= 1 && Math.abs(g.r - g.pr) <= 1 && a.ovf <= 1,
      'O1 ' + w + ' 进输出：悬浮条 flw-sb-m-output 可见，内容恰为 总谱 | 分谱 · 纸张 · 「共 N 页」· 存 PDF · 智能 ▾ · 收起；存 PDF 是工作区唯一实底（行 1 只有「发布」）；条底 ≤ 预览顶、左右缘＝预览区、不溢出', J(a));
    T('O1', J(a.arr) === J(['适宽', '整页', '横排']) && a.r2.filter(x => /^(out:|flw-out-)/.test(x) && !/arr/.test(x)).length === 0,
      'O1b ' + w + ' 行 2 输出只留「预览 适宽 / 整页 / 横排」（导出键都搬到左栏格式卡）', J({ r2: a.r2, arr: a.arr }));
    if (w === 1440) await shot(pg, 'O1-output-1440');
    await modeTo(pg, 'write'); await redEnd('O1-' + w, pg, base);
    await close(pg);
  });

  /* ================= O2 格式卡 ＝ ?next=0 行 2 同 id 键 ================= */
  if (want('O2')) await SAFE('O2', async () => {
    const run = async url => { const pg = await open(1440, 900, { url, tag: 'O2' + (url === NX0 ? '-nx0' : '') });
      await ld(pg, '送别'); await modeTo(pg, 'output'); await EV(pg, () => __spy());
      const res = {};
      for (const k of KS) { await EV(pg, () => __take()); await pg.click('#flw-out-' + k); await pg.waitForTimeout(400); res[k] = await EV(pg, () => __take());
        await EV(pg, () => { try { closeModal(); } catch (_) {} }); await pg.waitForTimeout(80); }
      const info = await EV(pg, () => ['print', 'png', 'card', 'icard', 'mxl', 'mid', 'mtab'].map(k => { const e = document.getElementById('flw-out-' + k), q = e.getBoundingClientRect(), th = e.querySelector('.flw-ofth svg'), ic = e.querySelector('.flw-ofic svg'), bd = e.querySelector('.flw-ofb');
        return { k, inFmt: !!e.closest('#flw-out-fmt'), inLeft: !!e.closest('#flw-left'), inMenu: !!e.closest('#popmenu'), vis: __vis(e), hit: __hit(e), w: Math.round(q.width), h: Math.round(q.height),
          lab: ((e.querySelector('.flw-ofl') || {}).firstChild || {}).textContent, title: e.title, th: !!th && th.childElementCount > 0, ic: !!ic, badge: bd ? bd.textContent : '' }; }));
      await shot(pg, 'O2-fmt' + (url === NX0 ? '-nx0' : ''));
      await close(pg); return { res, info }; };
    const nx = await run(URL0), old = await run(NX0);
    const same = KS.map(k => [k, nx.res[k] === old.res[k], nx.res[k], old.res[k]]);
    T('O2', same.every(x => x[1] && x[2].length > 0) && /^print\("A4"\)/.test(nx.res.print) && /png\(\)/.test(nx.res.png),
      'O2a 7 张格式卡真实点击的调用（EXPORT_ACT 方法与参数 · 底层导出函数 · pyqEvent）与 ?next=0 行 2 同 id 键逐项相同', J(same));
    const inf = nx.info, badges = inf.map(x => x.k + ':' + x.badge).join(',');
    T('O2', inf.every(x => x.inFmt && x.inLeft && !x.inMenu && x.vis && x.hit && Math.min(x.w, x.h) >= 44 && (/^[A-Z]{2,4}$/.test(x.lab) || cnt(x.lab) <= 3) && cnt(x.title) <= 12)
      && inf.filter(x => x.k === 'print' || x.k === 'png').every(x => x.th) && inf.filter(x => x.k !== 'print' && x.k !== 'png').every(x => x.ic)
      && badges === 'print:,png:,card:PNG,icard:HTML,mxl:,mid:,mtab:' && J(inf.map(x => x.lab)) === J(['打印', '图片', '分享卡', '互动谱', 'XML', 'MID', 'MTAB']),
      'O2b 左栏「格式」7 张卡常显（不在 ▾ 里）、同 id、命中区 ≥44、字 ≤3（格式缩写 XML / MID / MTAB 算一个词）、悬停 ≤12；打印 / 图片卡有第 1 页缩略图 svg，其余有图标；分享卡 / 互动谱带 PNG / HTML 徽章', J(inf));
  });

  /* ================= O3 记住上次格式 ================= */
  if (want('O3')) await SAFE('O3', async () => {
    const pg = await open(1440, 900, { tag: 'O3' });
    await ld(pg, '送别'); await modeTo(pg, 'output'); await EV(pg, () => __spy());
    const k0 = await EV(pg, () => __keys()), g0 = await EV(pg, () => __go());
    await pg.click('#flw-out-png'); await pg.waitForTimeout(800); await EV(pg, () => __take());
    const g1 = await EV(pg, () => __go());
    await pg.mouse.move(700, 600); await pg.waitForTimeout(100);
    await pg.click('#flw-sb-go'); await pg.waitForTimeout(500);
    const e1 = await EV(pg, () => __take());
    await pg.click('#flw-out-mxl'); await pg.waitForTimeout(800); await EV(pg, () => __take());
    const g2 = await EV(pg, () => __go());
    await pg.reload(); await pg.waitForTimeout(1200); await prep(pg);
    await EV(pg, () => { try { hideStartPad(); } catch (_) {} setMode('output'); }); await pg.waitForTimeout(1200);
    const g3 = await EV(pg, () => __go()), k1 = await EV(pg, () => __keys());
    T('O3', g0.t === '存 PDF' && g1.t === '存图片' && /^png\(\)/.test(e1) && /fn:exportPNG\(2\)/.test(e1) && g2.t === '存 XML' && g3 && g3.t === '存 PDF' && J(k1.filter(k => !k0.includes(k) && !KNOWN.has(k))) === '[]',
      'O3 记住上次格式（只在内存）：点「图片」卡 → 主按钮「存图片」、点主按钮＝EXPORT_ACT.png（exportPNG(2)）；再点「XML」卡 →「存 XML」；刷新 → 回「存 PDF」；不新增本机键', J({ g0, g1, e1, g2, g3, newKeys: k1.filter(k => !k0.includes(k)) }));
    await close(pg);
  });

  /* ================= O4 分谱 ================= */
  if (want('O4')) await SAFE('O4', async () => {
    const pg = await open(1440, 900, { tag: 'O4' });
    await ld(pg, '合唱四声部'); const base = await redBase(pg);
    await modeTo(pg, 'output'); await EV(pg, () => __spy());
    const a = await EV(pg, () => { const p = document.getElementById('flw-out-parts'), g = p.querySelector('.flw-gbn'); return { badge: g && !g.hidden ? g.textContent : '', dis: p.getAttribute('aria-disabled'), pr: p.getAttribute('aria-pressed'),
      job: FLOW.out.job, ck: FLOW.out.checked(), n: partsPlan(song).parts.length, al: p.getAttribute('aria-label') }; });
    await pg.click('#flw-out-parts'); await pg.waitForTimeout(800);
    const b1 = await EV(pg, () => ({ job: FLOW.out.job, pr: document.getElementById('flw-out-parts').getAttribute('aria-pressed'), go: __go(), ps: document.getElementById('flw-out-psize').value }));
    await EV(pg, () => __take()); await pg.mouse.move(700, 600);
    await pg.click('#flw-sb-go'); await pg.waitForTimeout(700);
    const e1 = await EV(pg, () => __take());
    await EV(pg, () => window.dispatchEvent(new Event('afterprint'))); await pg.waitForTimeout(300);
    await pg.click('#flw-out-chkall'); await pg.waitForTimeout(200);
    const c0 = await EV(pg, () => ({ ck: FLOW.out.checked(), all: document.getElementById('flw-out-chkall').checked }));
    if (c0.all || c0.ck.length) { await pg.click('#flw-out-chkall'); await pg.waitForTimeout(200); }
    await pg.waitForTimeout(700);
    const c1 = await EV(pg, () => ({ ck: FLOW.out.checked(), go: __go() }));
    await EV(pg, () => { __take(); __toasts.length = 0; });
    await pg.click('#flw-sb-go', { force: true }); await pg.waitForTimeout(400);
    const e2 = await EV(pg, () => ({ ev: __take(), t: __toasts.slice(-1)[0] }));
    const ids = await EV(pg, () => partsPlan(song).parts.filter(p => !p.opt).map(p => p.id));
    T('O4', a.badge === '4' && a.dis === null && a.pr === 'false' && a.job === 'score' && ids.length === 4 && J(a.ck) === J(ids) && a.al === '分谱（4 份）' && b1.job === 'parts' && b1.pr === 'true' && b1.go.t === '存 PDF' && !b1.go.dis
      && new RegExp('^parts\\(' + J(b1.ps).replace(/[()[\]]/g, '\\$&') + ',' + J(ids).replace(/[()[\]]/g, '\\$&') + '\\)').test(e1),
      'O4a 四声部合唱：分谱段徽标「4」、读屏名「分谱（4 份）」；选「分谱」→ 主按钮仍「存 PDF」、点它＝EXPORT_ACT.parts(纸张, 勾选集 ' + J(ids) + ')', J({ a, b1, e1 }));
    T('O4', c1.ck.length === 0 && c1.go.dis === 'true' && c1.go.why === '先勾选分谱' && !/parts\(|print/.test(e2.ev) && e2.t === '先勾选分谱',
      'O4b 全不勾：主按钮灰显、原因「先勾选分谱」；点了只说原因、不打印', J({ c1, e2 }));
    await modeTo(pg, 'write'); await modeTo(pg, 'output');
    const r = await EV(pg, () => ({ job: FLOW.out.job, pr: document.getElementById('flw-out-parts').getAttribute('aria-pressed'), go: __go() }));
    T('O4', r.job === 'score' && r.pr === 'false' && r.go.t === '存 PDF' && !r.go.dis, 'O4c 回书写再进输出：回到「总谱」（选哪一份只在内存、按窗口）', J(r));
    await modeTo(pg, 'write'); await redEnd('O4', pg, base);
    await ld(pg, '送别'); await modeTo(pg, 'output');
    const s = await EV(pg, () => { const p = document.getElementById('flw-out-parts'); return { dis: p.getAttribute('aria-disabled'), why: p.dataset.why || '', lock: !!p.querySelector('svg'), al: p.getAttribute('aria-label'), vis: __vis(p) }; });
    await EV(pg, () => { __toasts.length = 0; }); await pg.click('#flw-out-parts', { force: true }); await pg.waitForTimeout(400);
    const s2 = await EV(pg, () => ({ job: FLOW.out.job, t: __toasts.slice(-1)[0] }));
    T('O4', s.vis && s.dis === 'true' && s.why === '只有一位演奏者' && s.lock && s.al === '分谱（只有一位演奏者）' && s2.job === 'score' && s2.t === '只有一位演奏者',
      'O4d 单演奏者（送别）：分谱段 aria-disabled + 锁、原因「只有一位演奏者」；点了只说原因、仍是总谱', J({ s, s2 }));
    await close(pg);
  });

  /* ================= O5 纸张 / 页数 ================= */
  if (want('O5')) await SAFE('O5', async () => {
    const pg = await open(1440, 900, { tag: 'O5' });
    await ld(pg, '两只老虎'); await modeTo(pg, 'output'); await EV(pg, () => __spy());
    const a = await EV(pg, () => { const s = document.getElementById('flw-out-psize'); return { inSb: !!s.closest('#flw-sbar'), vis: __vis(s), opts: [...s.options].map(o => [o.value, o.textContent, o.title]), v: s.value, pages: document.getElementById('flw-out-pages').textContent, n: PV.geo.n }; });
    await pg.selectOption('#flw-out-psize', 'A4L'); await pg.waitForTimeout(400);
    await EV(pg, () => __take());
    await pg.click('#flw-out-print'); await pg.waitForTimeout(400); const e1 = await EV(pg, () => __take());
    await EV(pg, () => { FLOW.out.resync && FLOW.out.resync(); });
    await pg.click('#flw-out-list .flw-onm[data-id="t1"]'); await pg.waitForTimeout(900);
    const v = await EV(pg, () => ({ cur: FLOW.out.cur, pages: document.getElementById('flw-out-pages').textContent, n: PV.geo.n }));
    T('O5', a.inSb && a.vis && a.opts.every(o => cnt(o[1]) <= 4 && o[2].length > 0) && J(a.opts.map(o => o[1])) === J(['A4 纵向', 'A4 横向', '信纸', '自适应']) && a.v === 'A4'
      && a.pages === '共 ' + a.n + ' 页' && /^print\("A4L"\) setPrintPage|^print\("A4L"\)/.test(e1) && /setPrintPage\(A4L\)|print/.test(e1) && v.cur === 't1' && v.pages === '共 ' + v.n + ' 页',
      'O5 纸张 #flw-out-psize 在悬浮条（选项字 ≤4、尺寸进 option title）；改「A4 横向」→ 打印卡调用 EXPORT_ACT.print("A4L")；读数「共 N 页」＝PV.geo.n，看分谱时为这一份', J({ a, e1, v }));
    await close(pg);
  });

  /* ================= O6 左栏警示条与开关 · 右栏不出 ================= */
  if (want('O6')) for (const [w, h] of [[1440, 900], [1280, 800]]) await SAFE('O6', async () => {
    const pg = await open(w, h, { tag: 'O6-' + w });
    await ld(pg, '两只老虎+末尾空2'); await EV(pg, () => { song.measures[2].brk = 1; render(); }); await pg.waitForTimeout(200);
    await modeTo(pg, 'output');
    const a = await EV(pg, () => { const L = id => { const e = document.getElementById(id); return { vis: !!e && !e.hidden && __vis(e), left: !!(e && e.closest('#flw-left')), t: e ? e.textContent.trim() : '' }; };
      return { brk: L('flw-out-brkr'), trim: L('flw-out-trim'), rd: __vis('#right-dock'), rs: __vis('#flw-rstrip'), pvR: Math.round(document.getElementById('preview-ov').getBoundingClientRect().right), iw: innerWidth, n: song.measures.length, u: undoStack.length,
        rpPub: !!document.getElementById('flw-rp-pub') }; });
    if (w === 1440) await shot(pg, 'O6-left-1440');
    await pg.click('#flw-out-trim [data-fa="out:trim"]'); await pg.waitForTimeout(800);
    const t1 = await EV(pg, () => ({ n: song.measures.length, u: undoStack.length, trim: __vis('#flw-out-trim') }));
    await pg.keyboard.press('Control+z'); await pg.waitForTimeout(800);
    const t2 = await EV(pg, () => ({ n: song.measures.length }));
    T('O6', a.brk.vis && a.brk.left && a.trim.vis && a.trim.left && /末尾 2 个空小节/.test(a.trim.t) && !a.rd && !a.rs && Math.abs(a.pvR - a.iw) <= 1 && !a.rpPub
      && t1.n === a.n - 2 && t1.u === a.u + 1 && !t1.trim && t2.n === a.n,
      'O6a ' + w + '：「沿用总谱换行」与「末尾 2 个空小节 · 删除」在左栏里可见；点删除＝trimTrailing（少 2 小节、一步撤销、Ctrl+Z 回来）；右栏 / 竖条不显示、#flw-rp-pub 不建、预览右缘＝视口右缘', J({ a, t1, t2 }));
    await modeTo(pg, 'write');
    await EV(pg, () => { song.layout = { fixed: true, page: 'A3', pgno: { on: true, pos: 'bc', start: 1, first: false } }; render(); }); await modeTo(pg, 'output');
    const p = await EV(pg, () => { const e = document.getElementById('flw-out-pnw'); return { vis: !!e && !e.hidden && __vis(e), left: !!(e && e.closest('#flw-left')), t: e ? e.textContent.trim() : '' }; });
    T('O6', p.vis && p.left && /页码可能印不到/.test(p.t), 'O6b ' + w + '：A3 版面印页码、打印纸 A4 → 左栏警示条「页码可能印不到 · 改 A4」', J(p));
    await close(pg);
  });

  /* ================= O7 输出屏文案 ================= */
  if (want('O7')) await SAFE('O7', async () => {
    const st = await runState(b, { id: 'output', name: '输出模式', go: async p => { await p.evaluate(() => __scn('songbie')); await W(800); await p.click('#flw-mode-output'); await W(1800); } }, { base: URL0 });
    const x = M.screen(st);
    const longHover = (st.clicks || []).filter(c => !c.occ && c.region !== 'menu:cmd' && c.title && !/（[^（）]*）$/.test(c.title) && cnt(c.title) > 12).map(c => c.region + ':' + c.title);
    T('O7', x.desc === 0 && x.p3 === 0 && !st.err && !longHover.length, 'O7 输出屏（textaudit 单屏抽取）：说明字 0、P3 指路 0、可点控件悬停 ≤12（灰显「名称（原因）」除外）；总字 ' + x.total + ' · 悬停 ' + x.hoverChars,
      J({ desc: x.desc, descTexts: (st.groups || []).filter(g => g.k === 'desc' && !g.occ).map(g => g.region + ':' + g.text), p3: x._p3, longHover, err: st.err }));
  });

  /* ================= O8 O9 发布弹层（云端打桩） ================= */
  const cloud = (pg, role) => EV(pg, role => {
    window.__calls = []; window.__remote = {};
    window.fetch = async (url, opt) => { const method = (opt && opt.method) || 'GET'; const body = opt && opt.body ? JSON.parse(opt.body) : null; window.__calls.push({ url, method });
      const J0 = o => ({ ok: true, status: 200, json: async () => o });
      if (url === '/api/me/creator' && method === 'POST') return J0({ user: { id: 'u1', nickname: '谱友', role: 'creator' } });
      const pm = url.match(/^\/api\/scores\/([^/]+)\/publish$/);
      if (pm && method === 'POST') { const adm = !!(typeof ACCT !== 'undefined' && ACCT && ACCT.role === 'admin'); window.__remote[pm[1]] = adm ? 'published' : 'pending'; return J0({ published: adm, status: adm ? 'published' : 'pending', pending: !adm }); }
      const sm = url.match(/^\/api\/scores\/([^/]+)$/);
      if (sm && method === 'PUT') { window.__remote[sm[1]] = 'saved'; return J0({ saved: true, updated_at: body && body.updated_at }); }
      if (url === '/api/scores' && method === 'GET') return J0({ scores: [] });
      return J0({}); };
    try { scoreThumbUpload = () => {}; } catch (_) {}
    window.PYQ_CLOUD = true; ACCT = role ? { id: 'u1', nickname: '谱友', role } : null; }, role);
  if (want('O8')) await SAFE('O8', async () => {
    const pg = await open(1280, 800, { tag: 'O8' });
    const res = [];
    for (const m of ['write', 'engrave', 'output']) {
      await ld(pg, '送别'); if (m !== 'write') await modeTo(pg, m);
      await pg.click('#flw-pub'); await pg.waitForTimeout(400);
      res.push(await EV(pg, m => ({ m, cur: FLOW.mode.cur, pub: __pub(), ae: document.activeElement && document.activeElement.id }), m));
      await EV(pg, () => __shut()); await pg.waitForTimeout(150);
      if (m !== 'write') await modeTo(pg, 'write');
    }
    T('O8', res.every(r => r.cur === r.m && r.pub && r.pub.vis && r.pub.say === '第 1 步 存入' && J(r.pub.dots) === J(['now:存入', 'todo:审核', 'todo:上架']) && r.ae === 'flw-pubp-go'),
      'O8a 书写 / 排版 / 输出三种模式点行 1「发布」：模式不变、就地出 #flw-pubp（三点「存入 › 审核 › 上架」、当前第 1 步）、焦点在主动作', J(res));
    if (true) await shot(pg, 'O8-pubp-1280');
    /* 创作者：stage 0「提交」→ 存入 + 云端 → 审核中 */
    await ld(pg, '送别'); await cloud(pg, 'creator'); const base = await redBase(pg);
    const h0 = await EV(pg, () => location.href);
    await pg.click('#flw-pub'); await pg.waitForTimeout(400);
    const p0 = await EV(pg, () => __pub());
    await pg.click('#flw-pubp-go'); await pg.waitForTimeout(700);
    const s1 = await EV(pg, () => ({ id: song.id || null, inLib: !!(song.id && libLoad().some(x => x.id === song.id)), calls: __calls.map(c => c.method + ' ' + c.url.replace(/\/scores\/[^/]+/, '/scores/:id')),
      modal: ((document.querySelector('#modal-mask .modal h3') || {}).textContent || '').trim(), href: location.href, cur: FLOW.mode.cur }));
    await EV(pg, () => { try { closeModal(); } catch (_) {} });
    await pg.click('#flw-pub'); await pg.waitForTimeout(400);
    const p1 = await EV(pg, () => __pub());
    await EV(pg, () => __shut());
    T('O8', p0.go === '提交' && p0.v === 'submit' && !p0.price && s1.inLib && s1.calls.includes('PUT /api/scores/:id') && s1.calls.includes('POST /api/scores/:id/publish') && /已提交审核/.test(s1.modal) && s1.href === h0 && s1.cur === 'write'
      && p1.say === '第 2 步 审核中' && J(p1.dots) === J(['done:存入', 'now:审核', 'todo:上架']) && p1.go.replace('↗', '') === '查看进度' && p1.v === 'progress' && p1.re,
      'O8b 线上创作者：未入库「提交」→ 先存入（song.id 在我的曲谱里）→ PUT 存谱 + POST 发布 →「已提交审核」；再开弹层＝第 2 步「审核中」（第 1 点完成）、主动作「查看进度」、另有「重新提交」；location.href 不变、模式不变', J({ p0, s1, p1 }));
    await redEnd('O8', pg, base, ['S.id', 'S.updatedAt', 'S.savedAt', 'S.createdAt']);
    /* 管理员：直接上架 → 三点都完成 +「复制链接」 */
    await ld(pg, '两只老虎'); await cloud(pg, 'admin');
    await pg.click('#flw-pub'); await pg.waitForTimeout(400); await pg.click('#flw-pubp-go'); await pg.waitForTimeout(700);
    await EV(pg, () => { try { closeModal(); } catch (_) {} });
    await pg.click('#flw-pub'); await pg.waitForTimeout(400);
    const p2 = await EV(pg, () => __pub());
    T('O8', p2.say === '第 3 步 已上架' && J(p2.dots) === J(['done:存入', 'done:审核', 'done:上架']) && p2.go === '复制链接' && p2.v === 'copy', 'O8c 管理员发布＝直接上架：三点都完成、主动作「复制链接」', J(p2));
    await EV(pg, () => __shut());
    /* O9 线上未登录 */
    await ld(pg, '送别'); await cloud(pg, null);
    await EV(pg, () => { window.__login = 0; openLogin = function () { window.__login++; }; });
    await pg.click('#flw-pub'); await pg.waitForTimeout(400);
    const q0 = await EV(pg, () => __pub());
    await pg.click('#flw-pubp-go'); await pg.waitForTimeout(400);
    const q1 = await EV(pg, () => ({ login: window.__login, id: song.id || null, pubp: !!document.getElementById('flw-pubp') }));
    T('O9', q0.go === '登录后发布' && q0.v === 'login' && q1.login === 1 && !q1.id && !q1.pubp, 'O9 线上未登录：主动作「登录后发布」→ 点了调 openLogin、不存入、弹层收起', J({ q0, q1 }));
    await close(pg);
  });

  /* ================= O10 本机演示 ================= */
  if (want('O10')) await SAFE('O10', async () => {
    const pg = await open(1280, 800, { tag: 'O10' });
    await ld(pg, '送别+末尾空2'); const n0 = await EV(pg, () => song.measures.length);
    await pg.click('#flw-pub'); await pg.waitForTimeout(400);
    const a = await EV(pg, () => __pub());
    await pg.click('#flw-pubp [data-fa="r1:pubtrim"]'); await pg.waitForTimeout(500);
    const b1 = await EV(pg, () => ({ n: song.measures.length, pub: __pub() }));
    await pg.fill('#flw-pubp-price', '6'); await pg.fill('#flw-pubp-prev', '4');
    await pg.click('#flw-pubp-go'); await pg.waitForTimeout(600);
    const c = await EV(pg, () => { const r = circlePubs().find(x => x.libId === song.id); return { rec: r ? [r.price, r.preview, r.status] : null, t: __toasts.slice(-1)[0] }; });
    await EV(pg, () => { try { if (document.getElementById('pcenter')) pcxBack(); } catch (_) {} });
    T('O10', a.go === '本机发布' && a.price && a.prev && a.trim && b1.n === n0 - 2 && b1.pub && b1.pub.vis && !b1.pub.trim && J(c.rec) === J([6, 4, 'pending']) && /已记录发布（¥6 · 试读4小节）/.test(c.t || ''),
      'O10 本机演示：主动作「本机发布」、定价 / 试读两格可见；「删除」末尾 2 个空小节后弹层不收、删除钮消失；定价 6 / 试读 4 带进发布记录（同原 #pub-go）', J({ a, b1, c }));
    await close(pg);
  });

  /* ================= O11 分谱抽样回归 ================= */
  if (want('O11')) await SAFE('O11', async () => {
    const pg = await open(1440, 900, { tag: 'O11' });
    await ld(pg, '两只老虎'); await modeTo(pg, 'output'); await EV(pg, () => __spy());
    await pg.click('#flw-out-list .flw-onm[data-id="t1"]'); await pg.waitForTimeout(900);
    const v = await EV(pg, () => ({ cur: FLOW.out.cur, cks: PV.cks, ac: [...document.querySelectorAll('#flw-out-list .flw-onm[aria-current="true"]')].map(x => x.dataset.id) }));
    await EV(pg, () => __take()); await pg.click('#flw-out-png'); await pg.waitForTimeout(500);
    const png = await EV(pg, () => __take());
    const first = await EV(pg, () => partsPlan(song).parts[0].id);
    await pg.click('#flw-out-list input.flw-ock[data-id="' + first + '"]'); await pg.waitForTimeout(200);
    const tri = await EV(pg, () => { const a = document.getElementById('flw-out-chkall'); return { ind: a.indeterminate, ck: a.checked }; });
    await modeTo(pg, 'write');
    await ld(pg, '小星星+换行'); await modeTo(pg, 'output');
    await pg.click('#flw-out-list .flw-onm[data-id="v0"]'); await pg.waitForTimeout(700);
    await pg.click('#flw-out-brkr'); await pg.waitForTimeout(800);
    const br = await EV(pg, () => ({ brk: FLOW.out.brk, ck: document.getElementById('flw-out-brk').checked, sig: FLOW.mode.snapSig().slice(-3) }));
    await modeTo(pg, 'write');
    await ld(pg, '小星星+冲突和弦'); await modeTo(pg, 'output');
    const wb = await EV(pg, () => { const w = document.querySelector('#flw-out-list .flw-owarn'); if (!w) return null; const p = partsPlan(song).parts.find(x => x.id === w.dataset.id); return { at: partSong(p, { brk: false }).dropAt }; });
    if (wb) { await pg.click('#flw-out-list .flw-owarn'); await pg.waitForTimeout(600); }
    const wa = await EV(pg, () => ({ mode: FLOW.mode.cur, mi: sel.mi }));
    T('O11', v.cur === 't1' && v.cks === null && J(v.ac) === '["t1"]' && /^partPng\("t1"\)/.test(png) && tri.ind === true && tri.ck === false && br.brk === true && br.ck === true && /\|1$/.test(br.sig)
      && !!wb && wa.mode === 'write' && wa.mi === wb.at,
      'O11 分谱抽样（tv_parts_ui 同口径）：点「吉他 · 扫弦」切预览（aria-current、PV.cks＝null）；看分谱时「图片」卡＝partPng("t1")；去掉一份 → 全选半选；「沿用总谱换行」勾上（snapSig「|1」）；⚠ 点了回书写落到那一小节', J({ v, png, tri, br, wb, wa }));
    await close(pg);
  });

  /* ================= O12 打印媒体与快照 ================= */
  if (want('O12')) await SAFE('O12', async () => {
    const pg = await open(1440, 900, { tag: 'O12' });
    await ld(pg, '两只老虎'); await modeTo(pg, 'output'); await pg.waitForTimeout(400);
    const th = await EV(pg, () => !!document.querySelector('#flw-out-fmt .flw-ofth svg'));
    await pg.click('#flw-pub'); await pg.waitForTimeout(400);
    /* 快照按 DOM 查（样式表 / 脚本正文里本来就有这些选择器名，不算） */
    const snap = await EV(pg, () => { const d = new DOMParser().parseFromString(FLOW.snapHTML(), 'text/html'), q = s => d.querySelectorAll(s).length;
      return { pubp: q('#flw-pubp, .flw-pubp'), fmt: q('#flw-out-fmt, .flw-ofth, .flw-ofc'), rowt: q('#flw-rowt, .flw-pvfix, .flw-pvshort, .flw-pvhov'), live: !!document.getElementById('flw-pubp') }; });
    await pg.emulateMedia({ media: 'print' }); await pg.waitForTimeout(150);
    const pr = await EV(pg, () => { const p = document.getElementById('flw-pubp'), f = document.getElementById('flw-out-fmt'); return { pubp: !!p && getComputedStyle(p).display, fmt: f ? (f.getClientRects().length ? 'shown' : 'none') : 'gone' }; });
    await pg.emulateMedia({ media: 'screen' });
    T('O12', th && snap.live && !snap.pubp && !snap.fmt && !snap.rowt && pr.pubp === 'none' && pr.fmt !== 'shown', 'O12 快照（互动谱）里没有发布弹层 / 格式卡 / 缩略图 / 排版叠层；打印媒体下发布弹层与格式卡不显示', J({ th, snap, pr }));
    await close(pg);
  });

  await b.close();
  const order = ['O0', 'O1', 'O2', 'O3', 'O4', 'O5', 'O6', 'O7', 'O8', 'O9', 'O10', 'O11', 'O12'];
  order.forEach(k => (OUT[k] || []).forEach(l => console.log(l)));
  if (RL.length) { const bad = RL.filter(x => !x.ok); total++; if (!bad.length) pass++; else fails.push('RL');
    console.log((bad.length ? '❌ ' : '✅ ') + 'RL 数据红线：不新增本机键名、song 字段只多存入本来就写的 id 等：' + RL.map(x => x.d).join('；')); }
  if (errs.length) { total++; fails.push('页面报错'); console.log('❌ 页面报错 ' + errs.length + '：' + errs.slice(0, 5).join(' | ')); } else { total++; pass++; console.log('✅ 页面无报错'); }
  console.log('\ntv_output2: ' + pass + '/' + total + (fails.length ? '\n失败：' + fails.join('；') : ''));
  process.exit(pass === total ? 0 : 1);
})();
