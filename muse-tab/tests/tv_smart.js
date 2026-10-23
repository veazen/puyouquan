'use strict';
/* v69.0 S2 B 轨：悬浮条「智能 ▾」画廊 + 撤右栏「智能」页 + 收起态主按钮位 + 同名去重 + ?next=0 回退
   （方案 docs/design-2026-10g ③「右栏」行 / ⑥ / ⑦ D4；规格 f90 §5 / §6 / §8.3）。被测页＝默认新外壳（flow），SM9 另开 ?next=0 与基线 v68.9 页，SM13 ?shell=classic，SM14 手机 390。
   修前（v68.9 · 4c675f2，MUSETAB_URL 指向它）应红：除 SM9 / SM13 / SM14 这三组不变量（基线上本来成立）外，每条都以 #flw-sb-smart / FLOW.gal / 两页右栏为前提。
   SM1  「智能 ▾」#flw-sb-smart[data-fa=sbar:more] 在 1180 / 1280 / 1440 / 1920 与强制条宽 700→360（n1–n5）都可见、字「智能」不收、aria-haspopup=menu；条上没有可见的「更多」
   SM2  14 谱型：画廊 6 卡、顺序＝谱类优先序 + 可用在前；可用集＝独立判据表，且与 ?next=0 右栏「智能」页的项同一判据（钢琴独奏谱例外：+织体 −节奏型，SBAR-6）；
        每卡可见、中心命中自己、名 ≤4 字、1 秒内缩略图是 svg.pq-offscore；锁卡 aria-disabled + 锁图标 + 原因 ≤16 字，点了网格下出原因、不执行、菜单不关
   SM3  可用卡执行＝委托目标：与同一页直接点旧入口（#rt-arr / #b-acctex / #rt-lab / #rt-fill / openRhyLib / showVoxTabMenu）比弹窗 / 菜单签名、song、撤销栈；ui_cmd gal:<v>
   SM4  功能保全（原右栏智能页 8 项 + 一键配和弦）：每项先断言新家可见（菜单类先打开菜单再看项），再点，再与 ?next=0 下原智能页入口比到达（弹窗签名 / 结果）
   SM5  右栏：书写页签 2（属性 · 文字）、竖条 2 + 钉住、无 #flw-rp-smart / #flw-rx-ai、show('smart')===false、open('make')→属性；≥1440 停靠、1280 竖条；钉住读写 musetab-rdock 与 ?next=0 相同
   SM6  去重：书写 5 屏「更多」不跨区（只剩行 2「更多 ▾」）；记号格 dyn-more 混合档 2 字「表情」（?next=0「更多」）；悬停 / 读屏名仍是全名
   SM7  命令面板：搜「智能」首条 rd:smart，回车打开画廊、焦点在首卡；↑↓ 选中 sm:arrange 描边「智能 ▾」、sm:midi 描边文件 ▾；Esc 撤描边、不留画廊
   SM8  收起态：有主按钮（A 轨 FLOW.nx.goHTML；未合入时测试桩）＝摘要 + 紧凑主按钮 + 留白 + ⌄，条高 28 / 外框 34；点摘要 / 空白 / ⌄ 展开，点主按钮执行且不展开；
        没有主按钮＝与 ?next=0 收起态逐字节相同
   SM9  ?next=0 对拍基线 v68.9（git show 4c675f2；env MUSETAB_BASE）：14 谱 × 空 / 有音的 #flw-sbar outerHTML、#flw-rp-tabs / #flw-rstrip / #flw-rp-smart、偏好弹窗、dyn-more 格、帮助新外壳原文逐字节相同；
        「更多」切右栏「智能」页；不写任何本机键
   SM10 画廊键盘：键盘打开焦点落首卡；→ / ← / ↓ / ↑ / Home / End 在网格里走；Enter 执行；Esc 关闭、焦点回「智能」钮
   SM11 画廊焦点层：项名 ≤4 字、卡内没有第二段文字（无副标题）、可见字 / 悬停 / data-why 无 P3 指路词
   SM12 数据红线：开关画廊、补缩略图、键盘走查、点锁卡前后 song 逐字节、撤销 / 重做栈、docs、musetab-* 键值都不变
   SM13 旧外壳 ?shell=classic 零差异：没有 #flw-sbar / .flw-gc / #flw-sb-smart，F.nxOn 不改旧外壳（body 无 flw-nx0）
   SM14 手机 390：没有可见的「智能 ▾」；☰「智能」抽屉照旧（toggleSmartSheet，原 #rt-arr 可见可点）
   env：MUSETAB_URL 被测页 · MUSETAB_BASE 基线页（缺省 git show 4c675f2:muse-tab/index.html）· ONLY=SM1,SM9 · SHOTS=目录（新外壳 1440 浅 / 深 + 旧外壳 + 手机 390） */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const M = require('./lib/textaudit/metrics.js');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => { const i = u.indexOf('#'), b = i >= 0 ? u.slice(0, i) : u, h = i >= 0 ? u.slice(i) : ''; return b + (b.includes('?') ? '&' : '?') + q + h; };
const NX0 = withQ(URL0, 'next=0');
/* 对拍基线：tests/next_ref.json（完整 SHA；deploy.yml 浅克隆后按它单独补取这一个提交，REG-1）；CI 里拿不到＝判红（REG-6），MUSETAB_BASE=none 是本地显式跳过 */
const NEXT_REF = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'next_ref.json'), 'utf8')); } catch (_) { return {}; } })();
const BASE_COMMIT = process.env.MUSETAB_BASE_COMMIT || NEXT_REF.commit || '4c675f24a1cf48330da74bca3dd29bf492f8fa82';
const BASE_SHORT = BASE_COMMIT.slice(0, 7);
const IN_CI = !!process.env.CI && process.env.MUSETAB_BASE !== 'none';
const BASEU = (() => {
  const e = process.env.MUSETAB_BASE;
  if (e) return e === 'none' ? '' : toUrl(e);
  try { const txt = execFileSync('git', ['-C', __dirname, 'show', BASE_COMMIT + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
    const f = path.join(os.tmpdir(), 'tv_smart_base_' + BASE_SHORT + '.html'); fs.writeFileSync(f, txt); return 'file://' + f; } catch (_) { return ''; }
})();
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const SHOTS = process.env.SHOTS || '';
const J = x => JSON.stringify(x);
const W = ms => new Promise(r => setTimeout(r, ms));
const cnt = s => (String(s || '').match(/[\p{L}\p{N}]/gu) || []).length;
const FLOW_RE = /^[a-z][a-z0-9]*(:[a-z0-9:-]+)*$/;   /* FLOW.track 的 id 格式 */
let pass = 0, total = 0; const OUT = {}, fails = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; else fails.push(id + ' ' + name); (OUT[id] = OUT[id] || []).push((ok ? '✅ ' : '❌ ') + id + ' ' + name + (!ok && d != null ? '\n     ' + String(d).slice(0, 1800) : '')); };
const NOTE = (id, s) => { (OUT[id] = OUT[id] || []).push('ℹ️ ' + s); };
const KINDS = ['J', 'S', 'SJ', 'JG', 'SG', 'SJG', 'JT', 'T', 'ST', 'G', 'CG', 'CJ', 'CS', 'C'];
/* 独立判据表（规格 §5.2 由 v68.9 右栏「智能」页实测推出的可用卡；钢琴独奏谱 G：织体可用、节奏型锁——一个功能一个名，SBAR-6） */
const AV = { J: 'arr lab fill rhy gen', S: 'arr lab rhy gen', SJ: 'arr lab fill rhy gen', JG: 'arr tex lab fill rhy gen', SG: 'arr tex lab fill rhy gen', SJG: 'arr tex lab fill rhy gen',
  JT: 'lab fill rhy gen', T: 'rhy', ST: 'rhy', G: 'tex lab', CG: 'tex lab fill', CJ: 'lab fill rhy', CS: 'lab fill rhy', C: 'lab' };
const O1 = 'arr tex lab fill rhy gen', O2 = 'arr lab fill gen rhy tex', O3 = 'rhy gen lab fill arr tex', O4 = 'lab fill rhy arr tex gen';
const ORD = { JG: O1, SG: O1, SJG: O1, J: O2, S: O2, SJ: O2, JT: 'gen rhy lab fill arr tex', T: O3, ST: O3, G: 'tex lab rhy arr gen fill', CG: 'tex lab fill arr rhy gen', CJ: O4, CS: O4, C: 'lab arr tex rhy gen fill' };
const NAME = { arr: '配伴奏', tex: '织体', lab: '配和弦', rhy: '节奏型', gen: '六线谱', fill: '智能填词' };
const expOrder = k => { const o = ORD[k].split(' '), a = AV[k].split(' '); return o.filter(v => a.includes(v)).concat(o.filter(v => !a.includes(v))); };

/* —— 页面内工具（init 脚本：只定义 window.__*）—— */
function INIT() {
  window.__P = n => { const p = PRESETS.find(x => x.name.indexOf(n) >= 0); if (!p) throw new Error('无预设 ' + n); return migrate(p.make()); };
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; } return true; };
  window.__hit = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e) return false; const r = e.getBoundingClientRect(); const x = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!x && (x === e || e.contains(x)); };
  window.__shut = () => { try { FLOW.menu.close(); } catch (_) {} try { closePop(); } catch (_) {} try { lbMenuClose(); } catch (_) {} try { closeModal(); } catch (_) {} try { FLOW.rd.close(false); } catch (_) {}
    try { if (FLOW.nx && FLOW.nx.tbar && FLOW.nx.tbar.isOpen && FLOW.nx.tbar.isOpen()) FLOW.nx.tbar.close(false); } catch (_) {} try { if (FLOW.nx && FLOW.nx.rbar && FLOW.nx.rbar.isOpen && FLOW.nx.rbar.isOpen()) FLOW.nx.rbar.close(false); } catch (_) {} };
  window.__one = s => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; try { hideStartPad(); } catch (_) {} __shut(); const t = document.querySelector('#flw-tour'); if (t) t.remove();
    addDoc(s, () => {}); while (docs.length > 1) closeDocAt(0); try { closeModal(); } catch (_) {} render(); return s; };
  window.__V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
  window.__melIn = (s, vi, mis) => { mis.forEach(mi => { const m = s.measures[mi], b = m.beats || s.beats, u = m.unit || s.unit; m.voxes[vi] = Array.from({ length: b }, (_, i) => __V(((mi * 3 + i) % 7) + 1, u)); }); return s; };
  window.__new = (k, o) => { o = o || {}; const s = NWB.build(k, Object.assign({ title: '测' + k, nMea: o.nMea || 8 }, o.b || {}));
    if (o.mel && (s.voxVoices || []).length) __melIn(s, 0, [0, 1, 2, 3]);
    if (o.mod) o.mod(s); __one(s);
    if (o.meta !== false) LBAR.open(Object.assign({ from: 'new' }, o.meta || {}));
    const tab = (k === 'T' || k === 'ST' || (k === 'JT' && !(o.meta && o.meta.pen === 'J')));
    sel = { mi: 0, row: tab ? 'tab' : 'vox', vi: 0, ci: 0, si: 1 }; blurSel = false; selRange = null; render(); try { document.activeElement.blur(); } catch (_) {} return NWB.stackOf(song); };
  window.__sig = () => { const m = document.querySelector('#modal-mask .modal'), p = document.getElementById('popmenu'), lm = document.getElementById('lb-menu');
    return { modal: m ? ((m.querySelector('h3') || {}).textContent || '').trim() + '|' + m.querySelectorAll('button').length + '|' + m.querySelectorAll('input,select,textarea').length : null,
      pop: p ? (p.dataset.m || '') + '|' + p.className + '|' + p.querySelectorAll('button').length + '|' + (p.textContent || '').replace(/\s+/g, '').slice(0, 60) : null, lb: lm ? lm.querySelectorAll('.lb-mi').length : null,
      tbar: !!(document.getElementById('flw-nx-tbar') && __vis('#flw-nx-tbar')), rbar: !!(document.getElementById('flw-nx-rbar') && __vis('#flw-nx-rbar')) }; };
  window.__st = () => ({ j: JSON.stringify(song), u: undoStack.length, ul: undoStack.length ? undoStack[undoStack.length - 1] : null, r: redoStack.length, d: docs.length });
  window.__keys = () => { const o = {}; Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort().forEach(k => { o[k] = localStorage.getItem(k); }); return JSON.stringify(o); };
  window.__restore = st => { song = JSON.parse(st.j); docs[curDocI].song = song; undoStack.length = Math.min(undoStack.length, st.u); redoStack.length = 0; render(); };
  window.__gal = () => { const p = document.getElementById('popmenu'); if (!p || p.dataset.m !== 'smart') return null;
    return { cards: [...p.querySelectorAll('.flw-gc')].map(c => { const n = c.querySelector('.flw-gn'); return { v: c.dataset.v, name: n ? n.textContent.trim() : '', dis: c.getAttribute('aria-disabled') === 'true', why: c.dataset.why || '',
        lock: !!c.querySelector('.flw-mlock'), vis: __vis(c), hit: __hit(c), svg: !!c.querySelector('.flw-gth svg.pq-offscore'), role: c.getAttribute('role'), fa: c.dataset.fa }; }),
      tools: [...p.querySelectorAll('[data-fa="sbar:tool"]')].map(b => b.dataset.v), why: (p.querySelector('.flw-gwhy') || {}).textContent || '', act: (document.activeElement && document.activeElement.dataset && document.activeElement.dataset.v) || '' }; };
  window.__galWait = async ms => { const t0 = performance.now(); while (performance.now() - t0 < (ms || 1000)) { const g = __gal(); if (g && g.cards.length && g.cards.every(c => c.svg)) return performance.now() - t0; await new Promise(r => requestAnimationFrame(r)); } return -1; };
  window.__trk = []; window.__trkOn = () => { if (window.__trkW) return; window.__trkW = 1; const t0 = FLOW.track; FLOW.track = function (id) { try { __trk.push(String(id)); } catch (_) {} return t0.apply(this, arguments); }; };
}
const SCN = require('./lib/textaudit/states.js').SCN;
async function open(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 }, colorScheme: o.scheme || 'light', deviceScaleFactor: 1, hasTouch: !!o.touch, isMobile: !!o.mobile });
  await ctx.addInitScript(INIT); await ctx.addInitScript(SCN);
  const pg = await ctx.newPage(); pg._errs = [];
  pg.on('pageerror', e => pg._errs.push(String(e.message || e).slice(0, 200)));
  await pg.goto(o.url || URL0);
  await pg.waitForFunction(m => typeof FLOW !== 'undefined' && typeof PRESETS !== 'undefined' && typeof song !== 'undefined' && (m ? true : FLOW.active), !!o.mob, { timeout: 15000 });
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; try { hideStartPad(); } catch (_) {} const t = document.querySelector('#flw-tour'); if (t) t.remove(); });
  await W(300);
  return pg;
}
const EV = (pg, f, a) => pg.evaluate(f, a);
const close = async pg => { try { await pg.context().close(); } catch (_) {} };
const raf = pg => EV(pg, () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 0)))));
const galOpen = async (pg, kb) => { if (kb) { await EV(pg, () => { const b = document.getElementById('flw-sb-smart'); b.focus(); return 1; }); await pg.keyboard.press('Enter'); } else await pg.click('#flw-sb-smart'); await W(120); return EV(pg, () => __galWait(1500)); };
const SAFE = async (id, name, fn) => { try { await fn(); } catch (e) { T(id, false, name + ' 执行异常', e && e.stack || e); } };

(async () => {
  const t0 = Date.now();
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  try {
    /* ================= SM1 「智能 ▾」可见、不收字 ================= */
    if (want('SM1')) await SAFE('SM1', 'SM1', async () => {
      const rows = [];
      for (const [w, h] of [[1180, 800], [1280, 800], [1440, 900], [1920, 1080]]) {
        const pg = await open(b, { w, h });
        for (const st of [{ k: 'JG' }, { k: 'J', mel: true }]) {
          await EV(pg, st => __new(st.k, { mel: st.mel }), st); await raf(pg); await raf(pg);
          rows.push(Object.assign({ w, k: st.k }, await EV(pg, () => { const s = document.getElementById('flw-sb-smart'), l = s && s.querySelector('.flw-sb-l');
            const more = [...document.querySelectorAll('#flw-sbar button')].filter(x => __vis(x) && /^更多$/.test((x.textContent || '').replace(/[\s…▾]/g, '')));
            return { ok: !!s && __vis(s) && __hit(s), fa: s && s.dataset.fa, lab: l ? l.textContent : null, labVis: !!l && __vis(l), pop: s && s.getAttribute('aria-haspopup'), more: more.length, tier: FLOW.sbar.model().tier }; })));
        }
        if (w === 1440) {
          /* 工具阶段（简谱歌谱有音：4 个工具）——起步阶段没有工具可收，强制 <560 时本来就放不下（v68.9 同样），真实界面最窄 560 */
          await EV(pg, () => __new('J', { mel: true })); await raf(pg);
          for (const fw of [700, 560, 450, 400, 360]) { await EV(pg, fw => FLOW.sbar.fit({ w: fw }), fw); await raf(pg);
            rows.push(Object.assign({ w: 'fit' + fw, k: 'J' }, await EV(pg, () => { const s = document.getElementById('flw-sb-smart'), l = s && s.querySelector('.flw-sb-l'), bar = document.getElementById('flw-sb-bar');
              return { ok: !!s && __vis(s), fa: s && s.dataset.fa, lab: l ? l.textContent : null, labVis: !!l && __vis(l), pop: s && s.getAttribute('aria-haspopup'), more: 0, tier: FLOW.sbar.model().tier, ovf: bar.scrollWidth - bar.clientWidth,
                nxs: document.getElementById('flw-sbar').classList.contains('sb-nxs'), al: s && s.getAttribute('aria-label') }; }))); }
          /* n5：收起的工具列在画廊卡片上方，点其中一项与条上点同效 */
          await galOpen(pg);
          const g5 = await EV(pg, () => { const g = __gal(); const off = [...document.querySelectorAll('#flw-sb-bar .flw-sb-tool.flw-off')].map(x => x.dataset.v); return { g, off }; });
          rows.push({ w: 'n5menu', k: 'J', ok: !!g5.g && g5.g.cards.length === 6 && g5.off.length > 0 && J(g5.g.tools) === J(g5.off), fa: 'sbar:more', lab: '智能', labVis: true, pop: 'menu', more: 0, tier: 'n5', g5 });
          await EV(pg, () => { __shut(); FLOW.sbar.fit({ w: 0 }); }); await raf(pg);
        }
        await close(pg);
      }
      /* 真实界面最窄 560：560 及以上任何档字都在；只有测试强制 <560 且 n5 收完工具仍放不下时才收成图标（sb-nxs，读屏名「智能工具」不变） */
      const fw = r => /^fit(\d+)$/.test(r.w) ? +RegExp.$1 : 9999;
      const bad = rows.filter(r => !r.ok || r.fa !== 'sbar:more' || r.lab !== '智能' || r.pop !== 'menu' || r.more || (r.ovf || 0) > 1
        || (fw(r) >= 560 ? (!r.labVis || r.nxs) : !(r.labVis || (r.nxs && r.tier === 'n5' && r.al === '智能工具'))));
      T('SM1', !bad.length && rows.some(r => r.tier === 'n5'), '「智能 ▾」在 1180 / 1280 / 1440 / 1920 与强制条宽 700→360 都可见可命中、aria-haspopup=menu、条上无可见「更多」、不溢出；条宽 ≥560（真实界面最窄）任何档字「智能」都不收，n5 收起的工具列在画廊卡片上方',
        J(bad.length ? bad : rows.map(r => r.w + ':' + r.k + ':' + r.tier)));
    });

    /* ================= SM2 14 谱型卡片 ================= */
    if (want('SM2')) await SAFE('SM2', 'SM2', async () => {
      const pg = await open(b, {}), pgN = await open(b, { url: NX0 });
      const rows = [], cmp = [];
      for (const k of KINDS) {
        const meta = k === 'JT' ? { pen: 'J' } : undefined;
        await EV(pg, a => __new(a.k, { meta: a.meta }), { k, meta }); await raf(pg);
        const t = await galOpen(pg);
        const g = await EV(pg, () => __gal());
        /* 锁卡：点了网格下出原因、不执行、菜单不关 */
        let lockR = null;
        const lk = g && g.cards.find(c => c.dis);
        if (lk) { const s0 = await EV(pg, () => __st());
          await pg.click('#popmenu .flw-gc[data-v="' + lk.v + '"]', { force: true }); await W(150);   /* aria-disabled：Playwright 视为不可用，force 照样落鼠标 */
          lockR = await EV(pg, s0 => { const g = __gal(), s1 = __st(); return { open: !!g, why: g && g.why, modal: !!document.getElementById('modal-mask'), same: s1.j === s0.j && s1.u === s0.u }; }, s0); }
        await EV(pg, () => __shut());
        rows.push({ k, t: Math.round(t), g, lk: lk && lk.v, lockR });
        /* ?next=0：右栏「智能」页的项（同一判据） */
        await EV(pgN, a => __new(a.k, { meta: a.meta }), { k, meta }); await raf(pgN);
        cmp.push({ k, ai: await EV(pgN, () => { FLOW.rd.show('smart'); FLOW.rdp.paint(); return [...document.querySelectorAll('#flw-rx-ai [data-fa="rdp:ai"]')].map(x => x.dataset.v); }) });
      }
      const bad = rows.filter(r => { const g = r.g; if (!g || g.cards.length !== 6) return true;
        const ord = g.cards.map(c => c.v), avail = g.cards.filter(c => !c.dis).map(c => c.v).sort();
        return J(ord) !== J(expOrder(r.k)) || J(avail) !== J(AV[r.k].split(' ').sort()) || r.t < 0
          || g.cards.some(c => !c.vis || !c.hit || cnt(c.name) > 4 || !c.name || c.role !== 'menuitem' || c.fa !== 'gal:card' || (c.dis ? (!c.lock || !c.why || cnt(c.why) > 16) : (c.lock || c.why)))
          || g.cards.some(c => c.v !== 'gen' && c.name !== NAME[c.v])
          || (r.lk && !(r.lockR && r.lockR.open && r.lockR.why === g.cards.find(c => c.v === r.lk).why && !r.lockR.modal && r.lockR.same)); });
      T('SM2', !bad.length, '14 谱型画廊 6 卡：顺序＝谱类优先序且可用在前、可用集＝独立判据表；每卡可见、中心命中、名 ≤4 字、1 秒内缩略图是 svg.pq-offscore；锁卡 aria-disabled + 锁 + 原因 ≤16 字，点了出原因、不执行、菜单不关',
        J(bad.length ? bad.map(r => ({ k: r.k, t: r.t, ord: r.g && r.g.cards.map(c => c.v + (c.dis ? '🔒' : '') + (c.svg ? '' : '∅') + (c.hit ? '' : '¬hit')), lockR: r.lockR })) : rows.map(r => r.k + ':' + r.t + 'ms')));
      /* 同一判据：画廊可用集＝?next=0 智能页的生成类项（导入 MIDI / 时值检查不进画廊，见 SM4）；钢琴独奏谱 G：智能页的「节奏型库」打开的就是伴奏织体，画廊记在「织体」 */
      const badC = cmp.filter(c => { let ai = c.ai.filter(v => ['arr', 'tex', 'lab', 'fill', 'rhy', 'gen'].includes(v));
        if (c.k === 'G') ai = ai.filter(v => v !== 'rhy').concat(['tex']);
        return J([...new Set(ai)].sort()) !== J(AV[c.k].split(' ').sort()); });
      T('SM2', !badC.length, '可用卡与 ?next=0 右栏「智能」页同一判据（14 谱型逐项相同；钢琴独奏谱：+织体 −节奏型，同一弹窗一个名）', J(badC));
      const ms = rows.map(r => r.t).filter(x => x >= 0);
      NOTE('SM2', '缩略图补齐耗时（ms，画廊打开到 6 张都是刻版小样）：' + ms.join(' / ') + '（首屏冷缓存 ' + (ms[0] | 0) + '，之后按会话缓存）');
      await close(pg); await close(pgN);
    });

    /* ================= SM3 可用卡执行＝委托目标 ================= */
    if (want('SM3')) await SAFE('SM3', 'SM3', async () => {
      const pg = await open(b, {});
      await EV(pg, () => __trkOn());
      const CASES = [['JG', 'arr', () => document.getElementById('rt-arr').click()], ['JG', 'tex', () => document.getElementById('b-acctex').click()], ['JG', 'lab', () => document.getElementById('rt-lab').click()],
        ['JG', 'fill', () => document.getElementById('rt-fill').click()], ['J', 'rhy', () => openRhyLib()], ['J', 'gen', () => showVoxTabMenu(0)], ['G', 'tex', () => document.getElementById('b-acctex').click()],
        ['T', 'rhy', () => openRhyLib()], ['CG', 'lab', () => document.getElementById('rt-lab').click()]];
      const res = [];
      for (const [k, v, fn] of CASES) {
        await EV(pg, k => __new(k, { mel: true }), k); await raf(pg);
        const s0 = await EV(pg, () => __st());
        await galOpen(pg);
        await pg.click('#popmenu .flw-gc[data-v="' + v + '"]'); await W(350);
        const a = await EV(pg, () => ({ sig: __sig(), st: __st() }));
        await EV(pg, s0 => { __shut(); __restore(s0); }, s0); await raf(pg);
        await EV(pg, '(' + fn.toString() + ')()'); await W(350);
        const d = await EV(pg, () => ({ sig: __sig(), st: __st() }));
        await EV(pg, s0 => { __shut(); __restore(s0); }, s0);
        /* 节奏型条（A 轨）存在时，六线谱行的节奏型卡打开它（旧入口仍是节奏型库）：只断言条可见 */
        const rbarCase = k === 'T' && v === 'rhy' && a.sig.rbar;
        const same = rbarCase || (J(a.sig) === J(d.sig) && a.st.j === d.st.j && a.st.u === d.st.u);
        const did = !!(a.sig.modal || a.sig.pop || a.sig.tbar || a.sig.rbar || a.st.j !== s0.j);
        res.push({ k, v, same, did, a: a.sig, d: d.sig });
      }
      const tr = await EV(pg, () => __trk.filter(x => /^gal:/.test(x)));
      T('SM3', res.every(r => r.same && r.did), '可用卡执行＝委托目标：与同一页直接点旧入口（#rt-arr / #b-acctex / #rt-lab / #rt-fill / openRhyLib / showVoxTabMenu）的弹窗 / 菜单 / 织体条签名、song、撤销栈逐项相同（9 例，含钢琴独奏谱织体、吉他谱节奏型、钢琴弹唱谱配和弦）',
        J(res.filter(r => !r.same || !r.did)));
      T('SM3', ['gal:arr', 'gal:tex', 'gal:lab', 'gal:fill', 'gal:rhy', 'gal:gen'].every(x => tr.includes(x)) && tr.every(x => FLOW_RE.test(x)), 'ui_cmd：卡片记 gal:<v>（合 FLOW.track 格式）', J(tr));
      await close(pg);
    });

    /* ================= SM4 功能保全 ================= */
    if (want('SM4')) await SAFE('SM4', 'SM4', async () => {
      const pg = await open(b, {}), pgN = await open(b, { url: NX0 });
      const ROWS = [];
      const smartN = async (k, v, mel) => { await EV(pgN, a => { __new(a.k, { mel: a.mel }); FLOW.rd.show('smart'); FLOW.rdp.paint(); }, { k, mel }); await raf(pgN);
        const vis = await EV(pgN, v => __vis('#flw-rx-ai [data-v="' + v + '"]'), v); await pgN.click('#flw-rx-ai [data-v="' + v + '"]'); await W(350); return { vis }; };
      const shutBoth = async () => { await EV(pg, () => __shut()); await EV(pgN, () => __shut()); };
      /* 1 一键配伴奏：主按钮（钢琴伴奏歌谱 ②）· 悬浮条工具「配伴奏」（简谱歌谱）· 智能 ▾「配伴奏」 */
      {
        await EV(pg, () => __new('JG', { mel: true })); await raf(pg);
        const go = await EV(pg, () => { const g = document.querySelector('#flw-sbar [data-fa="sbar:go"]'); return g ? { vis: __vis(g), hit: __hit(g), act: g.dataset.act } : null; });
        await EV(pg, () => __new('J', { mel: true })); await raf(pg);
        const tool = await EV(pg, () => __vis('#flw-sbar .flw-sb-tool[data-v="arr"]'));
        const s0 = await EV(pg, () => __st());
        await galOpen(pg); const gv = await EV(pg, () => __vis('#popmenu .flw-gc[data-v="arr"]'));
        await pg.click('#popmenu .flw-gc[data-v="arr"]'); await W(400);
        const a = await EV(pg, () => ({ sig: __sig(), st: __st(), outs: [...document.querySelectorAll('#flw-nx-tbar [data-fa="nx:out"]')].filter(__vis).map(b => b.dataset.v).join(',') })); await EV(pg, s0 => { __shut(); __restore(s0); }, s0);
        await EV(pg, () => document.getElementById('rt-arr').click()); await W(400);
        const d = await EV(pg, () => ({ sig: __sig(), st: __st() })); await EV(pg, s0 => { __shut(); __restore(s0); }, s0);
        const nxRun = await EV(pg, () => !!(FLOW.nx && FLOW.nx.run));
        let n0 = null; if (!nxRun) { await smartN('J', 'arr', true); n0 = await EV(pgN, () => __sig()); await shutBoth(); }
        /* v69.0 收尾 F1-func 有意迁移：简谱歌谱（主按钮不是带 ▾ 的「配伴奏」）里两个入口都打开织体条配伴奏模式——产出 / 补和弦 / 全部织体都可见，点卡才执行；
           参数与结果对拍 ?next=0 弹窗在 tv_next N13（此前这一行只比新外壳两个入口彼此一致，参数不可达也全绿） */
        ROWS.push({ f: '一键配伴奏', entry: !!(go && go.vis && go.hit && go.act === 'arrange') && tool && gv, arrive: J(a.sig) === J(d.sig) && a.st.j === d.st.j && (nxRun ? (a.sig.tbar && /teach/.test(a.outs) && /pure/.test(a.outs)) : (J(a.sig.modal) === J(n0 && n0.modal) && !!(a.sig.modal || a.st.j !== s0.j))), d: { go, tool, gv, a: a.sig, outs: a.outs, d: d.sig, n0 } });
      }
      /* 2 配和弦工作台：悬浮条工具「配和弦」· 智能 ▾「配和弦」→ chordLabOpen；9 一键配和弦：工作台「应用到谱面」写入与 ?next=0 相同 */
      {
        await EV(pg, () => __new('J', { mel: true })); await raf(pg);
        const tool = await EV(pg, () => __vis('#flw-sbar .flw-sb-tool[data-v="lab"]'));
        await galOpen(pg); const gv = await EV(pg, () => __vis('#popmenu .flw-gc[data-v="lab"]'));
        await pg.click('#popmenu .flw-gc[data-v="lab"]'); await W(400);
        const a = await EV(pg, () => __sig()); const okv = await EV(pg, () => __vis('#cl-ok'));
        await pg.click('#cl-ok'); await W(300); const ja = await EV(pg, () => ({ j: JSON.stringify(song.measures), ch: song.measures.reduce((n, m) => n + (m.voxes[0] || []).filter(c => c && (c.chord || (c.chords && c.chords.length))).length, 0) }));
        const sn = await smartN('J', 'lab', true); const n0 = await EV(pgN, () => __sig());
        await pgN.click('#cl-ok'); await W(300); const jn = await EV(pgN, () => JSON.stringify(song.measures));
        await shutBoth();
        ROWS.push({ f: '配和弦工作台', entry: tool && gv && sn.vis, arrive: !!a.modal && a.modal === n0.modal, d: { tool, gv, a, n0 } });
        ROWS.push({ f: '（隐含）一键配和弦', entry: okv, arrive: ja.ch > 0 && ja.j === jn, d: { okv, ch: ja.ch, same: ja.j === jn } });
      }
      /* 3 伴奏织体：悬浮条工具「织体」（钢琴伴奏歌谱工具阶段 / 钢琴独奏谱）· 智能 ▾「织体」→ #b-acctex（A 轨：织体条） */
      {
        await EV(pg, () => __new('G', { mel: true })); await raf(pg);
        const tool = await EV(pg, () => __vis('#flw-sbar .flw-sb-tool[data-v="tex"]'));
        await EV(pg, () => { const s = NWB.build('JG', { title: '测JG', nMea: 8 }); __melIn(s, 0, [0, 1, 2, 3, 4, 5, 6, 7]); __one(s); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); }); await raf(pg);
        const s0 = await EV(pg, () => __st());
        await galOpen(pg); const gv = await EV(pg, () => __vis('#popmenu .flw-gc[data-v="tex"]'));
        await pg.click('#popmenu .flw-gc[data-v="tex"]'); await W(400);
        const a = await EV(pg, () => __sig()); await EV(pg, s0 => { __shut(); __restore(s0); }, s0);
        await EV(pg, () => document.getElementById('b-acctex').click()); await W(400);
        const d = await EV(pg, () => __sig()); await EV(pg, s0 => { __shut(); __restore(s0); }, s0);
        const hasT = await EV(pg, () => !!(FLOW.nx && FLOW.nx.tbar));
        let n0 = null; if (!hasT) { await EV(pgN, () => { const s = NWB.build('JG', { title: '测JG', nMea: 8 }); __melIn(s, 0, [0, 1, 2, 3, 4, 5, 6, 7]); __one(s); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); FLOW.rd.show('smart'); FLOW.rdp.paint(); }); await raf(pgN);
          await pgN.click('#flw-rx-ai [data-v="tex"]').catch(() => {}); await W(350); n0 = await EV(pgN, () => __sig()); await shutBoth(); }
        ROWS.push({ f: '伴奏织体', entry: tool && gv, arrive: J(a) === J(d) && !!(a.modal || a.tbar) && (hasT || J(a.modal) === J(n0 && n0.modal)), d: { tool, gv, a, d, n0 } });
      }
      /* 4 智能填词：右栏「文字」页「智能填词…」· 智能 ▾「智能填词」→ #b-fill */
      {
        await EV(pg, () => __new('J', { mel: true })); await raf(pg);
        await pg.click('#flw-rpt-text'); await W(200);
        const tv = await EV(pg, () => __vis('#flw-rp-text [data-fa="rdp:old"][data-v="b-fill"]'));
        await EV(pg, () => FLOW.rd.show('prop'));
        await galOpen(pg); const gv = await EV(pg, () => __vis('#popmenu .flw-gc[data-v="fill"]'));
        await pg.click('#popmenu .flw-gc[data-v="fill"]'); await W(400); const a = await EV(pg, () => __sig());
        await smartN('J', 'fill', true); const n0 = await EV(pgN, () => __sig()); await shutBoth();
        ROWS.push({ f: '智能填词', entry: tv && gv, arrive: !!a.modal && a.modal === n0.modal, d: { tv, gv, a, n0 } });
      }
      /* 5 节奏型库：行 2「更多 ▾」「节奏型库…」· 悬浮条工具「节奏型」（吉他谱）· 智能 ▾「节奏型」 */
      {
        await EV(pg, () => __new('T', { mel: true })); await raf(pg);
        const tool = await EV(pg, () => __vis('#flw-sbar .flw-sb-tool[data-v="rhy"]'));
        await EV(pg, () => __new('J', { mel: true })); await raf(pg);
        await pg.click('#flw-more'); await W(200); const mv = await EV(pg, () => __vis('#popmenu [data-fa="r2:rhylib"]')); await EV(pg, () => __shut());
        await galOpen(pg); const gv = await EV(pg, () => __vis('#popmenu .flw-gc[data-v="rhy"]'));
        await pg.click('#popmenu .flw-gc[data-v="rhy"]'); await W(400); const a = await EV(pg, () => __sig());
        await smartN('J', 'rhy', true); const n0 = await EV(pgN, () => __sig()); await shutBoth();
        ROWS.push({ f: '节奏型库', entry: tool && mv && gv, arrive: !!a.modal && a.modal === n0.modal, d: { tool, mv, gv, a, n0 } });
      }
      /* 6 由旋律生成六线谱轨：音轨区「＋」加轨菜单「生成六线谱…」· 智能 ▾「六线谱」→ showVoxTabMenu */
      {
        await EV(pg, () => __new('J', { mel: true })); await raf(pg);
        await pg.click('#flw-thd [data-fa="tree:add"]'); await W(200); const av = await EV(pg, () => __vis('#popmenu [data-fa="tree:gen"]')); await EV(pg, () => __shut());
        await galOpen(pg); const gv = await EV(pg, () => __vis('#popmenu .flw-gc[data-v="gen"]'));
        await pg.click('#popmenu .flw-gc[data-v="gen"]'); await W(400); const a = await EV(pg, () => __sig());
        await smartN('J', 'gen', true); const n0 = await EV(pgN, () => __sig()); await shutBoth();
        ROWS.push({ f: '由旋律生成六线谱轨', entry: av && gv, arrive: !!(a.modal || a.pop) && J(a) === J(n0), d: { av, gv, a, n0 } });
      }
      /* 7 导入 MIDI：文件 ▾「从已有音乐…」→ 选 .mid → MIDI 对话框（同 ?next=0 智能页「导入 MIDI…」） */
      {
        await EV(pg, () => { __one(__P('送别')); }); await raf(pg);
        const bytes = await EV(pg, () => Array.from(exportMIDI(song).bytes));
        const file = { name: 'tv_smart.mid', mimeType: 'audio/midi', buffer: Buffer.from(bytes) };
        await pg.click('#flw-file'); await W(200); const fv = await EV(pg, () => __vis('#popmenu [data-fa="r1:import"]'));
        await pg.click('#popmenu [data-fa="r1:import"]'); await W(500);
        let a = null;
        try { const [fc] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 3000 }), pg.click('#nw-import')]); await fc.setFiles(file); await W(900); a = await EV(pg, () => __sig()); } catch (e) { a = { err: String(e.message).slice(0, 120) }; }
        await EV(pgN, () => { __one(__P('送别')); FLOW.rd.show('smart'); FLOW.rdp.paint(); }); await raf(pgN);
        const nv = await EV(pgN, () => __vis('#flw-rx-ai [data-v="midi"]'));
        let n0 = null;
        try { const [fc] = await Promise.all([pgN.waitForEvent('filechooser', { timeout: 3000 }), pgN.click('#flw-rx-ai [data-v="midi"]')]); await fc.setFiles(file); await W(900); n0 = await EV(pgN, () => __sig()); } catch (e) { n0 = { err: String(e.message).slice(0, 120) }; }
        await shutBoth();
        ROWS.push({ f: '导入 MIDI', entry: fv && nv, arrive: !!(a && a.modal) && a.modal === (n0 && n0.modal), d: { fv, a, n0 } });
      }
      /* 8 时值检查：状态栏 ⚠（常驻）→ #err-drop 清单（条数同 ?next=0 智能页「时值检查」） */
      {
        const mk = () => { const s = __P('送别'); s.measures[1].voxes[0] = s.measures[1].voxes[0].slice(0, 1); s.measures[3].voxes[0] = s.measures[3].voxes[0].slice(0, 1); __one(s); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); };
        await EV(pg, '(' + mk.toString() + ')()'); await raf(pg);
        const bv = await EV(pg, () => { const b = document.getElementById('beat-status'); return { vis: __vis(b), hit: __hit(b), bad: b.classList.contains('bad') }; });
        await pg.click('#beat-status'); await W(300);
        const a = await EV(pg, () => { const d = document.getElementById('err-drop'); return { vis: __vis(d), n: d ? d.querySelectorAll('.err').length : -1 }; });
        await EV(pgN, '(' + mk.toString() + ')()'); await EV(pgN, () => { FLOW.rd.show('smart'); FLOW.rdp.paint(); }); await raf(pgN);
        await pgN.click('#flw-rx-ai [data-v="chk"]'); await W(300);
        const n0 = await EV(pgN, () => { const d = document.getElementById('err-drop'); return { vis: __vis(d), n: d ? d.querySelectorAll('.err').length : -1 }; });
        await pg.click('[data-m="stmore"]').catch(() => {}); await W(200);
        const sm = await EV(pg, () => { const p = document.getElementById('popmenu'); return !!p && /时值检查/.test(p.textContent || ''); }); await shutBoth();
        ROWS.push({ f: '时值检查', entry: bv.vis && bv.hit && bv.bad && sm, arrive: a.vis && a.n > 0 && a.n === n0.n && n0.vis, d: { bv, sm, a, n0 } });
      }
      const bad = ROWS.filter(r => !r.entry || !r.arrive);
      T('SM4', ROWS.length === 9 && !bad.length, '功能保全 9 行：原右栏智能页 8 项（一键配伴奏 · 配和弦工作台 · 伴奏织体 · 智能填词 · 节奏型库 · 由旋律生成六线谱轨 · 导入 MIDI · 时值检查）+ 一键配和弦，每项新家先断言可见再点，到达与 ?next=0 原入口相同',
        J(bad.length ? bad : ROWS.map(r => r.f)));
      await close(pg); await close(pgN);
    });

    /* ================= SM5 右栏两页 ================= */
    if (want('SM5')) await SAFE('SM5', 'SM5', async () => {
      const out = {};
      for (const [u, tag] of [[URL0, 'nx'], [NX0, 'n0']]) for (const [w, h] of [[1440, 900], [1280, 800]]) {
        const pg = await open(b, { url: u, w, h });
        await EV(pg, () => __new('JG', { mel: true })); await raf(pg);
        const k0 = await EV(pg, () => __keys());
        const r = await EV(pg, () => ({ tabs: [...document.querySelectorAll('#flw-rp-tabs [role="tab"]')].map(x => x.dataset.p), strip: [...document.querySelectorAll('#flw-rstrip .flw-rs-b[data-p]')].map(x => x.dataset.p),
          pin: !!document.getElementById('flw-rs-pin'), sec: !!document.getElementById('flw-rp-smart'), ai: !!document.getElementById('flw-rx-ai'), show: FLOW.rd.show('smart'),
          make: (FLOW.rd.open('make', null, false), FLOW.rd.page()), dock: document.body.classList.contains('flw-rd'), rs: document.body.classList.contains('flw-rs'), pages: FLOW.rd.pagesFor('write').map(x => x.p) }));
        await EV(pg, () => { FLOW.rd.close(false); FLOW.rd.show('prop'); });
        let pin = null;
        if (w === 1280) { await pg.click('#flw-rs-pin'); await W(200); const a = await EV(pg, () => ({ k: localStorage.getItem('musetab-rdock'), dock: document.body.classList.contains('flw-rd') }));
          await EV(pg, () => document.getElementById('flw-rd-pin') && !document.getElementById('flw-rd-pin').hidden ? document.getElementById('flw-rd-pin').click() : FLOW.act('rd:pin', { dataset: {} }, null)); await W(200);
          const c = await EV(pg, () => ({ k: localStorage.getItem('musetab-rdock'), dock: document.body.classList.contains('flw-rd') })); pin = { a, c }; }
        out[tag + w] = Object.assign(r, { pin, kn: Object.keys(JSON.parse(k0)).join(',') });
        await close(pg);
      }
      const x = out.nx1440, y = out.nx1280;
      T('SM5', J(x.tabs) === J(['prop', 'text']) && J(x.strip) === J(['prop', 'text']) && !x.sec && !x.ai && x.show === false && x.make === 'prop' && x.dock && J(x.pages) === J(['prop', 'text'])
        && J(y.strip) === J(['prop', 'text']) && y.pin && y.rs && !y.dock && !y.sec,
        '新形态右栏书写两页（属性 · 文字）：页签 2、竖条 2 + 钉住、无 #flw-rp-smart / #flw-rx-ai、show(smart)===false、open(make)→属性；1440 停靠、1280 竖条', J({ nx1440: x, nx1280: y }));
      T('SM5', J(out.n01440.tabs) === J(['prop', 'text', 'smart']) && out.n01440.sec && out.n01440.make === 'smart' && J(y.pin) === J(out.n01280.pin) && y.pin && y.pin.a.k === '1' && y.pin.a.dock && y.pin.c.k === null && !y.pin.c.dock,
        '?next=0 仍是三页（open(make)→智能）；钉住读写 musetab-rdock 新旧相同（钉住＝\'1\' 并停靠，取消＝删键）', J({ n0: out.n01440, pin: [y.pin, out.n01280.pin] }));
    });

    /* ================= SM6 去重 ================= */
    if (want('SM6')) await SAFE('SM6', 'SM6', async () => {
      const res = [];
      for (const [u, tag] of [[URL0, 'nx'], [NX0, 'n0']]) {
        const pg = await open(b, { url: u });
        for (const sc of ['pacc', 'gtr', 'inst', 'songbie']) {
          await EV(pg, sc => __scn(sc), sc); await W(400);
          res.push(Object.assign({ tag, sc }, await EV(pg, () => {
            const REG = ['#flw-sbar', '#editbar', '#flw-pal', '#flw-trk', '#right-dock', '#flw-r1', '#mixer-dock', '#flw-rstrip'];
            const norm = t => String(t || '').replace(/[…▾›\s·]/g, '');
            const regs = new Set(); [...document.querySelectorAll('button')].filter(x => __vis(x) && norm(x.textContent) === '更多').forEach(x => { const r = REG.find(s => x.closest(s)); regs.add(r || 'other'); });
            const dm = document.querySelector('#flw-pgrid .flw-sg[data-v="dyn-more"]'), gl = dm && dm.querySelector('.flw-sgl');
            return { regs: [...regs], dyn: gl ? gl.textContent : null, dynT: dm ? (dm.getAttribute('aria-label') || dm.title || '') : null, dens: (FLOW.pal && FLOW.pal.density) ? FLOW.pal.density() : null }; })));
        }
        await close(pg);
      }
      const nx = res.filter(r => r.tag === 'nx'), n0 = res.filter(r => r.tag === 'n0');
      /* 吉他弹唱（光标在六线谱行）的记号格没有力度组（dyn-more 不在场）：只看「更多」不跨区 */
      T('SM6', nx.every(r => r.regs.length <= 1 && !r.regs.includes('#flw-sbar') && !r.regs.includes('#flw-pal') && (r.dyn === null || (r.dyn === '表情' && /更多力度|表情术语/.test(r.dynT)))) && nx.filter(r => r.dyn === '表情').length >= 3,
        '书写屏「更多」不再跨区（悬浮条改「智能」、记号格 dyn-more 混合档 2 字改「表情」，只剩行 2「更多 ▾」）；格的悬停 / 读屏名仍是全名', J(nx));
      T('SM6', n0.every(r => r.dyn === null || r.dyn === '更多') && n0.filter(r => r.dyn === '更多').length >= 3 && n0.every(r => r.regs.includes('#flw-sbar')), '?next=0：悬浮条「更多」与记号格「更多」照旧（v68.9 原样）', J(n0));
    });

    /* ================= SM7 命令面板 ================= */
    if (want('SM7')) await SAFE('SM7', 'SM7', async () => {
      const pg = await open(b, {});
      await EV(pg, () => __new('JG', { mel: true })); await raf(pg);
      const first = async q => { await pg.keyboard.press('Control+Slash'); await W(200); await pg.fill('#flw-cmdq', q); await W(200);
        return EV(pg, () => { const r = document.querySelector('#flw-cmdl .flw-cmdr'); return r ? r.dataset.v : null; }); };
      const f1 = await first('智能'); await pg.keyboard.press('Enter'); await W(300);
      const g1 = await EV(pg, () => ({ g: !!__gal(), ae: document.activeElement && document.activeElement.classList.contains('flw-gc'), v: document.activeElement && document.activeElement.dataset.v }));
      await pg.keyboard.press('Escape'); await W(150);
      const g1b = await EV(pg, () => ({ g: !!__gal(), ae: document.activeElement && document.activeElement.id }));
      const hl = async (q, id) => { await pg.keyboard.press('Control+Slash'); await W(200); await pg.fill('#flw-cmdq', q); await W(200);
        const n = await EV(pg, id => [...document.querySelectorAll('#flw-cmdl .flw-cmdr')].findIndex(r => r.dataset.v === id), id);
        for (let i = 0; i <= n; i++) await pg.keyboard.press('ArrowDown');
        for (let i = 0; i < 1; i++) await pg.keyboard.press('ArrowUp');
        await W(150);
        const r = await EV(pg, () => { const e = document.querySelector('.flw-cmd-hl'); const s = document.querySelector('#flw-cmdl .flw-cmdr[aria-selected="true"]'); return { hl: e ? (e.id || e.className) : null, sel: s && s.dataset.v, gal: !!__gal() }; });
        await pg.keyboard.press('Escape'); await W(150);
        const after = await EV(pg, () => ({ hl: !!document.querySelector('.flw-cmd-hl'), gal: !!__gal(), pop: !!document.getElementById('popmenu') }));
        return { r, after }; };
      const h1 = await hl('配伴奏', 'sm:arrange'), h2 = await hl('导入 MIDI', 'sm:midi'), h3 = await hl('织体', 'sm:tex');
      T('SM7', f1 === 'rd:smart' && g1.g && g1.ae && !g1b.g, '搜「智能」首条 rd:smart：回车打开「智能 ▾」画廊、焦点在首卡；Esc 收起', J({ f1, g1, g1b }));
      const okH = (h, id, el) => h.r.sel === id && h.r.hl === el && !h.r.gal && !h.after.hl && !h.after.gal && !h.after.pop;
      T('SM7', okH(h1, 'sm:arrange', 'flw-sb-smart') && okH(h2, 'sm:midi', 'flw-file') && okH(h3, 'sm:tex', 'flw-sb-smart'),
        '↑↓ 选中原智能页命令描边它的新家：一键配伴奏 / 伴奏织体 → 「智能 ▾」，导入 MIDI → 文件 ▾；Esc 撤描边、不留画廊（命令面板本身是菜单，不叠开第二个）', J({ h1, h2, h3 }));
      await close(pg);
    });

    /* ================= SM8 收起态 ================= */
    if (want('SM8')) await SAFE('SM8', 'SM8', async () => {
      const pg = await open(b, { w: 1280, h: 800 }), pgN = await open(b, { url: NX0, w: 1280, h: 800 });
      /* A 轨 FLOW.nx.goHTML 已合入就用真的；没合入用测试桩（只验 B 轨的收起态布局与点击分派） */
      const stub = await EV(pg, () => { if (FLOW.nx && typeof FLOW.nx.goHTML === 'function') return false;
        FLOW.nx = FLOW.nx || {}; window.__goN = 0;
        FLOW.nx.goHTML = (m, o) => (m && m.go && o && o.col) ? '<button type="button" id="flw-sb-go" class="flw-sb-go flw-sb-gc" data-fa="sbar:go" data-act="' + m.go.act + '" aria-label="' + m.go.btn + '">' + m.go.btn + '</button>' : '';
        return true; });
      await EV(pg, () => __new('JG', { mel: true })); await raf(pg);
      await EV(pg, () => FLOW.sbar.toggle({ exp: false })); await raf(pg);
      const L = await EV(pg, () => { const bar = document.getElementById('flw-sb-bar'), w = document.getElementById('flw-sbar');
        const kids = [...bar.children].map(e => (e.classList.contains('flw-sb-gc') || e.querySelector('.flw-sb-gc')) ? 'go' : (e.id || e.className.split(' ')[0]));   /* A 轨主按钮可带分组外壳（span[role=group]） */
        const go = bar.querySelector('.flw-sb-go.flw-sb-gc'), sum = document.getElementById('flw-sb-tg'), tgc = document.getElementById('flw-sb-tgc');
        return { kids, h: Math.round(bar.getBoundingClientRect().height), wh: Math.round(w.getBoundingClientRect().height), sb: w.dataset.sb, go: go && { vis: __vis(go), hit: __hit(go), fa: go.dataset.fa },
          sum: sum && { cls: sum.className, lab: sum.getAttribute('aria-label'), vis: __vis(sum), hit: __hit(sum) }, tgc: tgc && { w: Math.round(tgc.getBoundingClientRect().width), h: Math.round(tgc.getBoundingClientRect().height), exp: tgc.getAttribute('aria-expanded'), lab: tgc.getAttribute('aria-label') } }; });
      const clickExp = async sel => { await EV(pg, () => FLOW.sbar.toggle({ exp: false })); await raf(pg); await pg.click(sel); await W(150); return EV(pg, () => FLOW.sbar.expanded()); };
      /* 空白处：留白 .flw-sb-grow 是 0 高的弹性占位，按它的横向中点 + 条的纵向中点落鼠标（落在条本身上） */
      const blank = async () => { await EV(pg, () => FLOW.sbar.toggle({ exp: false })); await raf(pg);
        const p = await EV(pg, () => { const g = document.querySelector('#flw-sb-bar > .flw-sb-grow').getBoundingClientRect(), b = document.getElementById('flw-sb-bar').getBoundingClientRect();
          const x = g.left + g.width / 2, y = b.top + b.height / 2, e = document.elementFromPoint(x, y); return { x, y, on: e ? (e.id || e.className) : null }; });
        await pg.mouse.click(p.x, p.y); await W(150); return Object.assign(p, { exp: await EV(pg, () => FLOW.sbar.expanded()) }); };
      const e1 = await clickExp('#flw-sb-tg'), eb = await blank(), e2 = eb.exp && eb.on === 'flw-sb-bar', e3 = await clickExp('#flw-sb-tgc');
      await EV(pg, () => FLOW.sbar.toggle({ exp: false })); await raf(pg); await W(700);   /* A 轨主按钮换字后 600ms 内不响应点击 */
      const s0 = await EV(pg, () => __st());
      await pg.click('#flw-sb-bar .flw-sb-go.flw-sb-gc'); await W(400);
      const gx = await EV(pg, s0 => ({ exp: FLOW.sbar.expanded(), did: !!document.getElementById('modal-mask') || __st().j !== s0.j || !!(document.getElementById('flw-nx-tbar') && __vis('#flw-nx-tbar')) }), s0);
      await EV(pg, s0 => { __shut(); __restore(s0); }, s0);
      /* 空谱（没有主按钮）：与 ?next=0 收起态逐字节相同 */
      await EV(pg, () => __new('JG')); await EV(pg, () => FLOW.sbar.toggle({ exp: false })); await raf(pg);
      await EV(pgN, () => __new('JG')); await EV(pgN, () => FLOW.sbar.toggle({ exp: false })); await raf(pgN);
      const hb = await EV(pg, () => document.getElementById('flw-sb-bar').innerHTML), hn = await EV(pgN, () => document.getElementById('flw-sb-bar').innerHTML);
      await EV(pg, () => FLOW.sbar.toggle({ exp: true })); await EV(pgN, () => FLOW.sbar.toggle({ exp: true }));
      const kOK = J(L.kids) === J(['flw-sb-tg', 'go', 'flw-sb-grow', 'flw-sb-smart', 'flw-sb-tgc']);   /* v69.0 收尾 F4-func 有意迁移：收起态 ⌄ 前留一枚紧凑「智能」（tv_next N16） */
      T('SM8', kOK && L.h === 28 && L.wh === 34 && L.sb === 'col' && L.go && L.go.vis && L.go.hit && L.go.fa === 'sbar:go' && /flw-sb-tgn/.test(L.sum.cls) && /展开悬浮条：钢琴伴奏歌谱/.test(L.sum.lab) && L.sum.hit
        && L.tgc && L.tgc.w === 28 && L.tgc.h === 28 && L.tgc.exp === 'false' && e1 && e2 && e3 && !gx.exp && gx.did,
        '收起态有主按钮（' + (stub ? '测试桩：A 轨未合入' : 'A 轨 FLOW.nx.goHTML') + '）：摘要 · 紧凑主按钮 · 留白 · 智能 · ⌄（28×28），条高 28 / 外框 34；点摘要 / 空白 / ⌄ 展开，点主按钮执行且不展开', J({ L, e1, eb, e3, gx }));
      T('SM8', hb === hn && /flw-sb-tgw/.test(hb) && !/flw-sb-tgc|flw-sb-gc/.test(hb), '没有主按钮（空谱）时收起态与 ?next=0（v68.9）逐字节相同', hb === hn ? '' : J({ hb: hb.slice(0, 400), hn: hn.slice(0, 400) }));
      await close(pg); await close(pgN);
    });

    /* ================= SM9 ?next=0 对拍基线 ================= */
    if (want('SM9')) await SAFE('SM9', 'SM9', async () => {
      if (!BASEU) { T('SM9', !IN_CI, '?next=0 对拍：拿不到基线页（git show ' + BASE_SHORT + '），本地只记一笔、CI 判红（deploy.yml 按 next_ref.json 补取）'); }
      else {
        const pgN = await open(b, { url: NX0 }), pgB = await open(b, { url: BASEU });
        const k0N = await EV(pgN, () => __keys()), k0B = await EV(pgB, () => __keys());
        const snap = () => { const g = id => { const e = document.getElementById(id); return e ? e.outerHTML : null; };
          const dm = document.querySelector('#flw-pgrid .flw-sg[data-v="dyn-more"]');
          FLOW.rd.show('smart'); try { FLOW.rdp.paint(); } catch (_) {}
          const r = { sbar: g('flw-sbar'), tabs: g('flw-rp-tabs'), strip: g('flw-rstrip'), smart: g('flw-rp-smart'), dyn: dm ? dm.outerHTML : null, page: FLOW.rd.page() };
          FLOW.rd.show('prop'); return r; };
        const diffs = [];
        for (const k of KINDS) for (const mel of [false, true]) {
          const meta = k === 'JT' ? { pen: 'J' } : undefined;
          const a = await EV(pgN, x => { __new(x.k, { meta: x.meta, mel: x.mel }); return 1; }, { k, meta, mel }); await raf(pgN);
          await EV(pgB, x => { __new(x.k, { meta: x.meta, mel: x.mel }); return 1; }, { k, meta, mel }); await raf(pgB);
          const sN = await EV(pgN, '(' + snap.toString() + ')()'), sB = await EV(pgB, '(' + snap.toString() + ')()');
          Object.keys(sB).forEach(f => { if (sN[f] !== sB[f]) diffs.push(k + (mel ? '+音' : '') + ':' + f); });
        }
        /* 收起态 · 偏好弹窗 · 帮助新外壳原文 */
        const extra = async pg => { await EV(pg, () => __new('JG', { mel: true })); await EV(pg, () => FLOW.sbar.toggle({ exp: false })); await raf(pg);
          const col = await EV(pg, () => document.getElementById('flw-sbar').outerHTML); await EV(pg, () => FLOW.sbar.toggle({ exp: true }));
          await EV(pg, () => showPrefs()); await W(300); const pref = await EV(pg, () => { const m = document.querySelector('#modal-mask .modal'); return m ? m.innerHTML : null; }); await EV(pg, () => closeModal());
          const help = await EV(pg, () => helpFlowHTML().replace(/<span class="hd-ver">[^<]*<\/span>/, ''));
          return { col, pref, help }; };
        const xN = await extra(pgN), xB = await extra(pgB);
        Object.keys(xB).forEach(f => { if (xN[f] !== xB[f]) diffs.push('extra:' + f); });
        /* 「更多」切右栏「智能」页（1440 停靠） */
        await EV(pgN, () => __new('J', { mel: true })); await raf(pgN); await pgN.click('#flw-sbar .flw-sb-more'); await W(200);
        const mo = await EV(pgN, () => ({ page: FLOW.rd.page(), gal: !!document.querySelector('#popmenu[data-m="smart"]'), nx0: document.body.classList.contains('flw-nx0'), smart: !!document.getElementById('flw-sb-smart') }));
        const k1N = await EV(pgN, () => __keys()), k1B = await EV(pgB, () => __keys());
        T('SM9', !diffs.length, '?next=0 对拍基线 v68.9（' + BASE_SHORT + '）：14 谱 × 空 / 有音的 #flw-sbar outerHTML、#flw-rp-tabs / #flw-rstrip / #flw-rp-smart、dyn-more 格，收起态、偏好弹窗、帮助新外壳原文逐字节相同', diffs.join(' · '));
        const kn = k => Object.keys(JSON.parse(k)).join(',');
        T('SM9', mo.page === 'smart' && !mo.gal && mo.nx0 && !mo.smart && kn(k1N) === kn(k1B) && kn(k0N) === kn(k0B), '?next=0：「更多」切到右栏「智能」页、没有画廊 / #flw-sb-smart，body.flw-nx0；本机键与基线页同一组（不读写新键）', J({ mo, kN: kn(k1N), kB: kn(k1B) }));
        await close(pgN); await close(pgB);
      }
    });

    /* ================= SM10 画廊键盘 ================= */
    if (want('SM10')) await SAFE('SM10', 'SM10', async () => {
      const pg = await open(b, {});
      await EV(pg, () => __new('JG', { mel: true })); await raf(pg);
      await galOpen(pg, true);
      const seq = [], act = () => EV(pg, () => (document.activeElement && document.activeElement.dataset && document.activeElement.dataset.v) || (document.activeElement && document.activeElement.id) || '');
      seq.push(await act());
      for (const k of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'End', 'Home', 'ArrowDown', 'ArrowDown', 'ArrowUp', 'ArrowUp']) { await pg.keyboard.press(k); await W(40); seq.push(k + '>' + await act()); }
      const order = await EV(pg, () => __gal().cards.map(c => c.v));
      const s0 = await EV(pg, () => __st());
      await pg.keyboard.press('Escape'); await W(150);
      const esc = await EV(pg, () => ({ gal: !!__gal(), ae: document.activeElement && document.activeElement.id }));
      /* 键盘打开 → → 到「织体」→ Enter 执行（委托 #b-acctex） */
      await galOpen(pg, true); await pg.keyboard.press('ArrowRight'); await W(40); await pg.keyboard.press('Enter'); await W(400);
      const ent = await EV(pg, s0 => ({ gal: !!__gal(), sig: __sig(), ch: __st().j !== s0.j }), s0);
      await EV(pg, s0 => { __shut(); __restore(s0); }, s0);
      const o = order, at = i => o[i];
      const exp = [at(0), 'ArrowRight>' + at(1), 'ArrowRight>' + at(2), 'ArrowDown>' + at(5), 'ArrowLeft>' + at(4), 'ArrowUp>' + at(1), 'End>' + at(5), 'Home>' + at(0), 'ArrowDown>' + at(3), 'ArrowDown>' + at(0), 'ArrowUp>' + at(3), 'ArrowUp>' + at(0)];
      T('SM10', J(seq) === J(exp) && !esc.gal && esc.ae === 'flw-sb-smart' && !ent.gal && !!(ent.sig.modal || ent.sig.tbar),
        '画廊键盘：键盘打开焦点落首卡；→ ← ↓ ↑ Home End 在三列网格里走（↓ 末行回首行、↑ 首行到末行同列）；Esc 关闭焦点回「智能」钮；Enter 执行卡片（织体 → 伴奏织体）', J({ seq, exp, esc, ent: { gal: ent.gal, sig: ent.sig } }));
      await close(pg);
    });

    /* ================= SM11 焦点层文字 ================= */
    if (want('SM11')) await SAFE('SM11', 'SM11', async () => {
      const pg = await open(b, {});
      const res = [];
      for (const k of ['JG', 'J', 'T', 'G', 'C']) {
        await EV(pg, k => __new(k), k); await raf(pg); await galOpen(pg);
        res.push(Object.assign({ k }, await EV(pg, () => { const p = document.getElementById('popmenu');
          const cards = [...p.querySelectorAll('.flw-gc')].map(c => { const tx = []; const tw = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { if (n.parentElement.closest('svg')) continue; const t = n.textContent.trim(); if (t) tx.push(t); } return { tx, title: c.title || '', why: c.dataset.why || '' }; });
          return { cards }; })));
        await EV(pg, () => __shut());
      }
      const bad = res.filter(r => r.cards.some(c => c.tx.length !== 1 || cnt(c.tx[0]) > 4 || M.P3.test(c.tx.join('')) || M.P3.test(c.title) || M.P3.test(c.why) || M.P3SYN.test(c.why + c.title)));
      T('SM11', !bad.length, '画廊焦点层：每卡只有一段可见字（名 ≤4，无副标题），可见字 / 悬停 / data-why 无 P3 指路词', J(bad.length ? bad : res.map(r => r.k + ':' + r.cards.map(c => c.tx.join('')).join(','))));
      await close(pg);
    });

    /* ================= SM12 数据红线 ================= */
    if (want('SM12')) await SAFE('SM12', 'SM12', async () => {
      const pg = await open(b, {});
      await EV(pg, () => { __one(__P('送别')); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); }); await raf(pg);
      await W(1500);   /* 建谱后的去抖落盘先落完，再取基线 */
      const s0 = await EV(pg, () => __st()), k0 = await EV(pg, () => __keys());
      for (let i = 0; i < 3; i++) { await galOpen(pg, i === 1); await pg.keyboard.press('ArrowRight'); await pg.keyboard.press('ArrowDown');
        const lk = await EV(pg, () => { const c = document.querySelector('#popmenu .flw-gc[aria-disabled="true"]'); return c ? c.dataset.v : null; });
        if (lk) { await pg.click('#popmenu .flw-gc[data-v="' + lk + '"]', { force: true }); await W(100); }
        await pg.keyboard.press('Escape'); await W(80); await pg.click('#flw-sb-smart'); await W(80); await pg.click('#flw-sb-smart'); await W(80); }
      await W(1500);
      const s1 = await EV(pg, () => __st()), k1 = await EV(pg, () => __keys()), th = await EV(pg, () => FLOW.gal.thumbs());
      const kd = (() => { const a = JSON.parse(k0), c = JSON.parse(k1); return [...new Set(Object.keys(a).concat(Object.keys(c)))].filter(k => a[k] !== c[k])
        .map(k => { const x = String(a[k] || ''), y = String(c[k] || ''); let i = 0; while (i < x.length && x[i] === y[i]) i++; return k + '@' + i + ':' + x.slice(Math.max(0, i - 40), i + 40) + ' → ' + y.slice(Math.max(0, i - 40), i + 40); }); })();
      T('SM12', s1.j === s0.j && s1.u === s0.u && s1.ul === s0.ul && s1.r === s0.r && s1.d === s0.d && k1 === k0 && th > 0 && !pg._errs.length,
        '数据红线：开关画廊 ×3（鼠标 / 键盘）、补缩略图、走查、点锁卡前后 song 逐字节、撤销 / 重做栈、窗口数、musetab-* 键值都不变（缩略图缓存 ' + th + ' 张，只在内存）', J({ same: s1.j === s0.j, u: [s0.u, s1.u], r: [s0.r, s1.r], d: [s0.d, s1.d], keys: k1 === k0, kd, errs: pg._errs }));
      await close(pg);
    });

    /* ================= SM13 旧外壳 ================= */
    if (want('SM13')) await SAFE('SM13', 'SM13', async () => {
      const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await ctx.addInitScript(INIT);
      const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
      await pg.goto(withQ(URL0, 'shell=classic')); await pg.waitForFunction(() => typeof song !== 'undefined' && typeof PRESETS !== 'undefined', null, { timeout: 15000 }); await W(400);
      const r = await EV(pg, () => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} __one(__P('送别'));
        return { flow: FLOW.active, sbar: !!document.getElementById('flw-sbar'), gc: !!document.querySelector('.flw-gc'), smart: !!document.getElementById('flw-sb-smart'), nx0: document.body.classList.contains('flw-nx0'),
          cls: [...document.body.classList].filter(c => /^flw-/.test(c)), rtArr: !!document.getElementById('rt-arr') }; });
      T('SM13', !r.flow && !r.sbar && !r.gc && !r.smart && !r.nx0 && !r.cls.length && r.rtArr && !errs.length, '旧外壳 ?shell=classic：没有悬浮条 / 画廊 / 「智能 ▾」、body 无 flw-* 类，原右栏智能卡片（#rt-arr 等）照旧', J({ r, errs }));
      if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'classic-1440.png') });
      await ctx.close();
    });

    /* ================= SM14 手机 390 ================= */
    if (want('SM14')) await SAFE('SM14', 'SM14', async () => {
      const pg = await open(b, { w: 390, h: 844, mob: true, touch: true, mobile: true });
      await EV(pg, () => { __one(__P('送别')); }); await W(500);
      const a = await EV(pg, () => ({ m: document.body.classList.contains('flw-m'), smart: __vis('#flw-sb-smart'), flow: FLOW.active }));
      const menuBtn = await EV(pg, () => { const b = [...document.querySelectorAll('[data-fm="sheet"][data-v="menu"]')].find(x => x.offsetParent); if (b) b.click(); return !!b; }); await W(500);
      const it = await EV(pg, () => { const x = [...document.querySelectorAll('[data-fm="smart"]')].find(e => __vis(e)); if (x) x.click(); return !!x; }); await W(600);
      const sheet = await EV(pg, () => ({ arr: __vis('#rt-arr'), lab: __vis('#rt-lab') }));
      T('SM14', a.m && !a.smart && !a.flow && menuBtn && it && (sheet.arr || sheet.lab), '手机 390：没有「智能 ▾」；☰「智能」抽屉照旧（原右栏智能卡片可见）', J({ a, menuBtn, it, sheet }));
      if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'mobile-390-smart.png') });
      await close(pg);
    });

    /* ================= 截图（新外壳 1440 浅 / 深：画廊打开）================= */
    if (SHOTS && (!ONLY.length || ONLY.includes('SHOT'))) {
      for (const sc of ['light', 'dark']) {
        const pg = await open(b, { scheme: sc });
        await EV(pg, () => __new('JG', { mel: true })); await raf(pg); await galOpen(pg);
        await pg.screenshot({ path: path.join(SHOTS, 'nx-1440-' + sc + '-gallery.png') });
        await EV(pg, () => __shut()); await EV(pg, () => FLOW.sbar.toggle({ exp: false })); await raf(pg);
        await pg.screenshot({ path: path.join(SHOTS, 'nx-1440-' + sc + '-collapsed.png'), clip: { x: 248, y: 80, width: 960, height: 140 } });
        await EV(pg, () => FLOW.sbar.toggle({ exp: true }));
        await close(pg);
      }
    }
  } finally { await b.close(); }
  for (const k of ['SM1', 'SM2', 'SM3', 'SM4', 'SM5', 'SM6', 'SM7', 'SM8', 'SM9', 'SM10', 'SM11', 'SM12', 'SM13', 'SM14']) (OUT[k] || []).forEach(l => console.log(l));
  console.log('（' + Math.round((Date.now() - t0) / 1000) + ' 秒；被测 ' + URL0 + (BASEU ? '；基线 ' + BASEU : '') + '）');
  console.log(`PASS ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch(e => { console.log('❌ 执行异常: ' + (e && e.stack || e)); process.exit(1); });
