/* tv_chordeng — v68.9「和弦引擎恢复 + 强化」A 轨（规格 f89 §7.1 E1–E15）。负责人 2026-10-22：「和弦引擎被阉割了……不单止不能阉割，而且还要强化优化」。
   根因：新外壳的悬浮条「和弦」/ 文字页「输入和弦…」/ Ctrl+K / 命令面板全走 v63.9 的快速框（只有文本框），两个完整引擎几乎没有入口。
   E1 入口分流（真实点击，先断言可见）· E2 构建器能力在场 · E3 写入数据正确（拍位 / 八分对齐 / remap / 别名 / 校验 / 点框外 / 同拍去重）·
   E4 连续标注光标推进（空格 / ⇧空格 / Tab / ⇧Tab / → / ← · 6/8 复合拍 · 功能谱八分格 · 谱末 · 重新锚定）· E5 键盘老打法对拍基线（P8）·
   E6 建议＝配和弦引擎打分 · E7 乐理抽样与色标对比度 · E8 试听不进撤销 · E9 旧外壳零差异（只放行 R1–R3）· E10 文案预算 · E11 小橙色块护栏 ·
   E12 手机 · E13 钢琴弹唱第 1 步 · E14 工作台「契合 100%」· E15 帮助 / 官网 / 新建面板文案。
   基线：git show a93d0be:muse-tab/index.html（env CK_BASE 改提交；取不到时 E5 / E6e / E9 的对拍项标 ℹ️ 不计数）。
   B 轨（GP 指法编辑器的 CK 头 / 吸底底栏）未合入时，只依赖 B 的几项标 ℹ️ 不计数（判据：页面里有没有 ceLoad）。
   修前红：MUSETAB_URL=基线文件跑，E9 / E14 以外的新能力断言全红（E9 是零差异项、E14 本身就是修前红项）。
   ONLY=E1,E3… 只跑这些组；SHOTS=目录 → 存截图。单跑约 2–3 分钟（一个浏览器、各组顺序开页）。 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => { const i = u.indexOf('#'), base = i >= 0 ? u.slice(0, i) : u, h = i >= 0 ? u.slice(i) : ''; return base + (base.includes('?') ? '&' : '?') + q + h; };
const CLASSIC = withQ(URL0, 'shell=classic');
const BASE_COMMIT = process.env.CK_BASE || 'a93d0be';
const BASEU = (() => {
  if (process.env.CK_BASE === 'none') return '';
  try {
    const txt = execFileSync('git', ['-C', __dirname, 'show', BASE_COMMIT + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
    const f = path.join(os.tmpdir(), 'tv_chordeng_base_' + BASE_COMMIT + '.html'); fs.writeFileSync(f, txt); return 'file://' + f;
  } catch (_) { return ''; }
})();
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const SHOTS = process.env.SHOTS || '';
const J = x => JSON.stringify(x);
let pass = 0, total = 0; const errs = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅ ' : '❌ ') + id + ' ' + name + (!ok && d != null ? ': ' + String(d).slice(0, 1800) : '')); };
const INFO = (id, s) => console.log('ℹ️  ' + id + ' ' + s);
const wait = (pg, ms) => pg.waitForTimeout(ms);
const EV = (pg, f, a) => pg.evaluate(f, a).catch(e => ({ __err: e.message }));

/* —— 页面内工具（每次 goto 之后注入）—— */
function HELP() {
  window.guardReplace = p => p(); window.SF_PLAYWAIT = false; window.J = x => JSON.stringify(x);
  try { hideStartPad(); } catch (_) {}
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false;
    const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; }
    return true; };
  window.__R = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e) return null; const r = e.getBoundingClientRect(), f = v => Math.round(v * 10) / 10;
    return { x: f(r.left), y: f(r.top), w: f(r.width), h: f(r.height), r: f(r.right), b: f(r.bottom) }; };
  /* 先断言可见再点：getClientRects 有、elementFromPoint(中心) 落在它自己身上 */
  window.__hit = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e) return { ok: false, why: 'none' };
    const rs = e.getClientRects(); if (!rs.length) return { ok: false, why: 'norect' };
    const r = e.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { ok: !!h && (h === e || e.contains(h)), x: r.left + r.width / 2, y: r.top + r.height / 2, why: h ? (h.id || h.className && String(h.className.baseVal != null ? h.className.baseVal : h.className) || h.tagName) : 'nohit' }; };
  /* 谱面和弦标注（<g> 里只有描过的线 / 字可点）：取它里面第一个落点就是自己的子元素（字优先） */
  window.__hitIn = q => { const g = document.querySelector(q); if (!g) return { ok: false, why: 'none' };
    for (const c of [...g.querySelectorAll('text'), ...g.querySelectorAll('circle,line,path,rect')]) { const r = c.getBoundingClientRect(); if (!(r.width > 0 || r.height > 0)) continue;
      const x = r.left + r.width / 2, y = r.top + r.height / 2, h = document.elementFromPoint(x, y); if (h && g.contains(h)) return { ok: true, x, y }; }
    return { ok: false, why: 'nopaint' }; };
  if (!window.__toastW) { window.__toastW = 1; window.__toasts = []; const t0 = window.toast; window.toast = function (m) { try { __toasts.push(String(m)); } catch (_) {} return t0.apply(this, arguments); }; }
  window.__one = s => { addDoc(s, () => {}); while (docs.length > 1) closeDocAt(0); try { closeModal(); } catch (_) {} render(); return s; };
  window.__V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
  window.__TC = o => Object.assign({ dur: 4, dotted: false, chord: '', notes: [], strum: '', tech: '' }, o || {});
  /* 吉他弹唱谱（简谱旋律 + 六线谱）：degs[mi]＝[级数 | [级数, 时值]]；o.inst＝'uku' 尤克里里 */
  window.__jt = o => { o = o || {};
    const s = createSong(o.inst || 'guitar', { title: o.title || '和弦', key: o.key || 'C', beats: o.beats || 4, unit: o.unit || 4, nMea: o.nMea || 4, nTab: o.nTab == null ? 1 : o.nTab, nVox: o.nVox == null ? 1 : o.nVox, lyr: 0 });
    if (o.degs) o.degs.forEach((ds, mi) => { if (ds) s.measures[mi].voxes[0] = ds.map(d => Array.isArray(d) ? __V(d[0], d[1], d[2]) : __V(d, s.unit)); });
    if (o.mod) o.mod(s);
    __one(s); return true; };
  window.__sel = (row, mi, ci, vi, q) => { sel = { mi, row, vi: vi || 0, ci, si: 1, q: q || 0 }; selRange = null; render(); __blur(); return true; };
  window.__blur = () => { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); };
  window.__shut = () => { try { if (typeof ckEnd === 'function') ckEnd(true); } catch (_) {} try { FLOW.menu.close(); } catch (_) {} try { closePop(); } catch (_) {} try { closeModal(); } catch (_) {} try { closeSuggest(); } catch (_) {} };
  /* 面板读数：构建器 #popmenu[data-ce=vox] / GP .modal[data-ce=tab] */
  window.__pane = () => { const p = document.getElementById('popmenu'), m = document.querySelector('#modal-mask .modal'), i = document.getElementById('ck-in');
    const root = (p && p.dataset.ce) ? p : (m && m.dataset.ce) ? m : null;
    return { ce: root ? root.dataset.ce : null, pop: !!p, popCe: p ? (p.dataset.ce || '') : null, modal: !!m, modalCe: m ? (m.dataset.ce || '') : null,
      ck: !!i, focus: !!i && document.activeElement === i, val: i ? i.value : null, vcOk: !!document.getElementById('vc-ok'),
      vd: document.querySelectorAll('#popmenu [data-vd]').length, vs: document.querySelectorAll('#popmenu [data-vs]').length, vb: document.querySelectorAll('#popmenu [data-vb]').length,
      bass: !!document.getElementById('ce-bass'), play: !!document.getElementById('ce-play'), cpos: document.querySelectorAll('#ce-pos [data-cpos]').length,
      shapes: [...document.querySelectorAll('#ce-pos [data-cpos]')].map(x => x.dataset.shape), rect: root ? __R(root) : null }; };
  window.JT_STD_DEGS = () => ({ degs: [[1, 3, 5, 1], [5, 7, 2, 5], [1, 3, 5, 3], [4, 6, 1, 6]] });
  window.__ch = (row, mi, ci, vi) => { const c = (((song.measures[mi] || {})[row === 'tab' ? 'tabs' : 'voxes'] || [])[vi || 0] || [])[ci]; return c ? (c.chord || '') : null; };
}

async function open(b, o) {
  o = o || {};
  const ctx = o.ctx || await b.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 }, hasTouch: !!o.touch, colorScheme: o.dark ? 'dark' : 'light' });
  const pg = await ctx.newPage(); pg.__ctx = ctx;
  pg.on('pageerror', e => errs.push((o.tag || '') + ':' + e.message));
  await pg.goto(o.url || URL0); await wait(pg, 1000);
  await EV(pg, HELP);
  if (o.dark) await EV(pg, () => { document.documentElement.dataset.theme = 'dark'; });   /* 深色：显式套 data-theme（与偏好设置「深色」同一写法），不只靠系统配色 */
  return pg;
}
const close = async pg => { try { if (pg.__ctx) await pg.__ctx.close(); else await pg.close(); } catch (_) {} };
const blur = pg => EV(pg, () => __blur());
const shot = async (pg, name) => { if (!SHOTS) return; try { fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, name + '.png') }); } catch (_) {} };
const press = async (pg, keys, gap) => { for (const k of keys) { await pg.keyboard.press(k); await wait(pg, gap || 40); } };
const typeKeys = async (pg, s) => { await pg.keyboard.type(s); await wait(pg, 40); };
/* 吉他弹唱谱的标准夹具：m0 1 3 5 1（简谱和弦 C）· m1 5 7 2 5（六线谱列 0 和弦 G）· m2 1 3 5 3 · m3 4 6 1 6 */
const JT_STD = { degs: [[1, 3, 5, 1], [5, 7, 2, 5], [1, 3, 5, 3], [4, 6, 1, 6]] };
const jtStd = (pg, extra) => EV(pg, (x) => __jt(Object.assign({}, { degs: x.degs, mod: s => { s.measures[0].voxes[0][0].chord = 'C'; s.measures[1].tabs[0][0].chord = 'G'; s.measures[1].tabs[0][0].notes = [{ s: 6, f: 3 }]; } }, x.extra || {})), { degs: JT_STD.degs, extra });

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const HAS_B = await (async () => { const pg = await open(b, { tag: 'probe' }); const r = await EV(pg, () => typeof ceLoad === 'function'); await close(pg); return r === true; })();
  if (!HAS_B) INFO('B', 'B 轨（GP 面板头 / 吸底底栏）未合入：只依赖 B 的断言标 ℹ️ 不计数');

  /* ================= E1 入口分流 ================= */
  if (want('E1')) try {
    const pg = await open(b, { tag: 'E1' });
    await jtStd(pg);
    const ENT = {
      sbar: async () => { const h = await EV(pg, () => __hit('#flw-sbar [data-fa="sbar:tool"][data-v="chord"]')); if (h.ok) await pg.mouse.click(h.x, h.y); return h; },
      rp: async () => { await EV(pg, () => FLOW.rd.show('text')); await wait(pg, 120); const h = await EV(pg, () => __hit('#flw-rp-text [data-v="chordq"]')); if (h.ok) await pg.mouse.click(h.x, h.y); return h; },
      key: async () => { await blur(pg); await pg.keyboard.press('Control+k'); return { ok: true }; },
      cmd: async () => { await blur(pg); await pg.keyboard.press('Control+Slash'); await wait(pg, 200); await typeKeys(pg, '输入和弦'); await wait(pg, 250); await pg.keyboard.press('Enter'); return { ok: true }; },
      score: async row => { const q = row === 'vox' ? '#score g[data-vchord="0:0:0"]' : '#score g[data-tchord="1:0:0"]';
        const h = await EV(pg, s => __hitIn(s), q); if (!h.ok) return h;
        await pg.mouse.click(h.x, h.y); await wait(pg, 200);
        const h2 = await EV(pg, s => __hit(s), row === 'vox' ? '#vp-edit' : '#cp-edit'); if (!h2.ok) return Object.assign({ hub: false }, h2);
        await pg.mouse.click(h2.x, h2.y); return { ok: true }; }
    };
    const res = { vox: {}, tab: {} }, vis = [];
    for (const row of ['vox', 'tab']) for (const k of Object.keys(ENT)) {
      await EV(pg, r => { __shut(); __sel(r, 2, 0); }, row); await wait(pg, 100);
      const h = await ENT[k](row); await wait(pg, 300);
      vis.push(row + ':' + k + '=' + (h.ok ? 'ok' : h.why));
      res[row][k] = await EV(pg, () => __pane());
      if (k === 'key' && row === 'vox') await shot(pg, 'E1b-vox-ctrlk');
      if (k === 'key' && row === 'tab') await shot(pg, 'E1c-tab-ctrlk');
      await EV(pg, () => __shut()); await wait(pg, 80);
    }
    T('E1', vis.every(x => /=ok$/.test(x)), 'E1a 每个入口点击前可见（getClientRects + elementFromPoint 中心是它自己）', vis.join(' '));
    const vOk = p => p.popCe === 'vox' && p.ck && p.focus && p.vcOk && p.vd === 8 && p.vs === 22 && p.vb === 13;
    T('E1', Object.values(res.vox).every(vOk), 'E1b 吉他弹唱谱简谱行 × 悬浮条和弦 / 文字页「输入和弦…」/ Ctrl+K / 命令面板「输入和弦」/ 谱面和弦「编辑和弦…」→ 级数构建器（#ck-in 聚焦、#vc-ok、级数 8 · 类型 22 · 转位 13）',
      J(Object.fromEntries(Object.entries(res.vox).map(([k, p]) => [k, [p.popCe, p.ck, p.focus, p.vcOk, p.vd, p.vs, p.vb]]))));
    const tOk = p => p.modalCe === 'tab' && p.ck && p.focus && p.bass && p.play && p.cpos >= 6;
    const tabKeys = HAS_B ? Object.keys(res.tab) : Object.keys(res.tab).filter(k => k !== 'score');
    if (!HAS_B) INFO('E1', 'E1c 谱面和弦图 →「编辑和弦…」进 GP 的面板头由 B 轨在 renderChordEditor 里接入，B 未合入不计：' + J(res.tab.score && [res.tab.score.modal, res.tab.score.modalCe, res.tab.score.ck]));
    T('E1', tabKeys.every(k => tOk(res.tab[k])), 'E1c 六线谱行 × 同样的入口 → GP 指法编辑器 .modal[data-ce=tab]（#ck-in 聚焦、#ce-bass、#ce-play、和弦 C 的把位卡 ≥6）',
      J(Object.fromEntries(tabKeys.map(k => [k, [res.tab[k].modalCe, res.tab[k].ck, res.tab[k].focus, res.tab[k].bass, res.tab[k].play, res.tab[k].cpos]]))));
    /* E1f 谱面已有和弦：先小菜单（v60.31）再进面板 */
    await EV(pg, () => { __shut(); __sel('vox', 2, 0); });
    const hv = await EV(pg, () => __hitIn('#score g[data-vchord="0:0:0"]'));
    if (hv.ok) await pg.mouse.click(hv.x, hv.y); await wait(pg, 200);
    const f1 = await EV(pg, () => ({ hub: !!document.getElementById('vp-edit'), vcOk: !!document.getElementById('vc-ok') }));
    await pg.click('#vp-edit').catch(() => {}); await wait(pg, 200);
    const f2 = await EV(pg, () => __pane());
    T('E1', hv.ok && f1.hub && !f1.vcOk && f2.popCe === 'vox' && f2.vcOk, 'E1f 点谱面已有和弦仍先出小菜单（#vp-edit、没有 #vc-ok），点「编辑和弦…」才进构建器', J({ hv: hv.ok, f1, f2: [f2.popCe, f2.vcOk] }));
    await close(pg);

    /* E1d 谱类覆盖 */
    const pd = await open(b, { tag: 'E1d' });
    const cov = {};
    const kOpen = async () => { await blur(pd); await pd.keyboard.press('Control+k'); await wait(pd, 300); return EV(pd, () => __pane()); };
    for (const k of ['J', 'S', 'C']) {
      await EV(pd, kk => { __shut(); __one(NWB.build(kk, { title: '测' + kk, nMea: 4 })); __sel('vox', 0, 0); }, k);
      cov[k] = await kOpen(); await EV(pd, () => __shut());
    }
    /* JG：旋律 + 伴奏都写过（起步做完 → 工具阶段），悬浮条第 2 个工具是「和弦」 */
    await EV(pd, () => { __shut(); const s = NWB.build('JG', { title: '测JG', nMea: 4 });
      s.measures.forEach((m, mi) => { const u = m.unit || s.unit; m.voxes[0] = [1, 2, 3, 4].map(i => __V(((mi + i) % 7) + 1, u)); [1, 2].forEach(v => { m.voxes[v] = [1, 2, 3, 4].map(i => __V(((mi + i) % 5) + 1, u, { oct: -1 })); }); });
      __one(s); __sel('vox', 0, 0); });
    await wait(pd, 300);
    const jg = await EV(pd, () => ({ tools: [...document.querySelectorAll('#flw-sbar .flw-sb-tool')].map(x => x.dataset.v), hit: __hit('#flw-sbar .flw-sb-tool[data-v="chord"]') }));
    if (jg.hit && jg.hit.ok) await pd.mouse.click(jg.hit.x, jg.hit.y); await wait(pd, 300);
    cov.JG = Object.assign(await EV(pd, () => __pane()), { tools: jg.tools }); await EV(pd, () => __shut());
    /* CJ（功能谱）：音轨区 ⋯ →「和弦 / 级数…」 */
    await EV(pd, () => { __shut(); __one(NWB.build('CJ', { title: '测CJ', nMea: 4 })); __sel('vox', 0, 0); });
    await pd.click('#flw-thd [data-fa="tree:hdr"]').catch(() => {}); await wait(pd, 200);
    const hv2 = await EV(pd, () => __hit('#popmenu [data-fa="tree:vfedit"]'));
    if (hv2.ok) await pd.mouse.click(hv2.x, hv2.y); await wait(pd, 300);
    cov.CJ = await EV(pd, () => __pane()); await EV(pd, () => __shut());
    /* 尤克里里弹唱谱六线谱行 → GP，四线卡片 */
    await EV(pd, () => { __shut(); __jt({ inst: 'uku', degs: [[1, 3, 5, 1]] }); __sel('tab', 0, 0); });
    cov.uku = await kOpen(); await EV(pd, () => __shut());
    const vx = p => p && p.popCe === 'vox' && p.ck && p.vd === 8;
    T('E1', vx(cov.J) && vx(cov.S) && vx(cov.C) && vx(cov.JG) && cov.JG.tools[1] === 'chord' && vx(cov.CJ) && cov.uku.modalCe === 'tab' && cov.uku.ck && cov.uku.shapes.length >= 3 && cov.uku.shapes.every(x => x.length === 4),
      'E1d 谱类覆盖：简谱 J / 五线谱 S / 和弦谱 C / 钢琴伴奏歌谱 JG（悬浮条第 2 个工具＝和弦）/ 功能谱 CJ（⋯ →「和弦 / 级数…」）进构建器；尤克里里六线谱行进 GP、卡片 4 弦',
      J(Object.fromEntries(Object.entries(cov).map(([k, p]) => [k, [p.popCe || p.modalCe, p.ck, p.vd, p.tools ? p.tools.join('') : '', (p.shapes || []).slice(0, 3).join('/')]]))));
    await close(pd);

    /* E1e 手机 390×844：「记号」抽屉的「和弦」格；☰ → 智能 →「和弦」 */
    const pm = await open(b, { tag: 'E1e', w: 390, h: 844, touch: true });
    await jtStd(pm); await EV(pm, () => __sel('vox', 2, 0)); await wait(pm, 400);
    const m0 = await EV(pm, () => ({ flwM: document.body.classList.contains('flw-m') }));
    await pm.click('#flw-mbar [data-fm="sheet"][data-v="pal"]').catch(() => {}); await wait(pm, 300);
    const mc = await EV(pm, () => __hit('#flw-msheet [data-fm="chord"]'));
    if (mc.ok) await pm.mouse.click(mc.x, mc.y); await wait(pm, 400);
    const e1 = await EV(pm, () => __pane());
    await shot(pm, 'E1e-mobile-pal-chord');
    await EV(pm, () => { __shut(); __sel('vox', 2, 0); });
    await pm.click('#flw-mtop [data-fm="sheet"][data-v="menu"]').catch(() => {}); await wait(pm, 300);
    await pm.click('#flw-msheet [data-fm="smart"]').catch(() => {}); await wait(pm, 400);
    const rc = await EV(pm, () => __hit('#rt-chord'));
    if (rc.ok) await pm.mouse.click(rc.x, rc.y); await wait(pm, 400);
    const e2 = await EV(pm, () => __pane());
    await shot(pm, 'E1e-mobile-smart-chord');
    /* v68.9 收尾（UX-9）有意迁移：手机构建器改贴底抽屉（底边＝视口底 844，满宽），原「bottom≤836」改为整块在视口内 */
    const inV = p => p && p.rect && p.rect.y >= 0 && p.rect.b <= 844.5 && p.rect.r <= 390 && p.rect.x >= 0;
    T('E1', m0.flwM && mc.ok && rc.ok && e1.popCe === 'vox' && e1.ck && e2.popCe === 'vox' && e2.ck && inV(e1) && inV(e2),
      'E1e 手机 390×844：「记号」抽屉「和弦」格与 ☰ → 智能 →「和弦」都打开完整构建器（贴底抽屉），外框在视口内', J({ m0, mc: mc.ok, rc: rc.ok, e1: [e1.popCe, e1.rect], e2: [e2.popCe, e2.rect] }));
    /* E12 手机：芯片 ≥40×40；GP #ce-ok 完整可见 */
    await EV(pm, () => { __shut(); __sel('vox', 2, 0); chordOpen({ src: 't' }); });
    await wait(pm, 300);
    const e12 = await EV(pm, () => { const sz = q => [...document.querySelectorAll(q)].map(x => { const r = x.getBoundingClientRect(); return Math.min(r.width, r.height); });
      return { ckx: sz('#popmenu [data-ckx]'), vd: sz('#popmenu [data-vd]'), b: __R('#popmenu').b }; });
    T('E12', e12.ckx.length === 8 && e12.vd.length === 8 && [...e12.ckx, ...e12.vd].every(v => v >= 39.5) && e12.b <= 844.5,
      'E12a/b 手机构建器（贴底抽屉）外框在视口内；调外芯片与级数格都 ≥40×40', J({ minCkx: Math.min(...e12.ckx), minVd: Math.min(...e12.vd), b: e12.b }));
    await EV(pm, () => { __shut(); __sel('tab', 2, 0); chordOpen({ src: 't' }); });
    await wait(pm, 400);
    const e12c = await EV(pm, () => { const o = document.getElementById('ce-ok'); if (!o) return { ok: false }; o.scrollIntoView({ block: 'nearest' }); const r = o.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { ok: true, top: Math.round(r.top), b: Math.round(r.bottom), ih: innerHeight, hit: h === o || o.contains(h) }; });
    T('E12', e12c.ok && e12c.b <= e12c.ih && e12c.top >= 0 && e12c.hit, 'E12c 手机 GP：#ce-ok 完整可见、点得中', J(e12c));
    await close(pm);
  } catch (e) { T('E1', false, 'E1 组异常（没跑完）', String(e && e.message || e).slice(0, 300)); }

  /* ================= E2 构建器能力在场（新外壳，1=C 吉他弹唱谱）================= */
  if (want('E2')) try {
    const pg = await open(b, { tag: 'E2' });
    await jtStd(pg); await EV(pg, () => { song.chordRecent = ['C', 'G7']; __sel('vox', 2, 0); });
    await pg.keyboard.press('Control+k'); await wait(pg, 300);
    const r = await EV(pg, () => { const pm = document.getElementById('popmenu');
      return { ce: pm.dataset.ce || '', vd: pm.querySelectorAll('[data-vd]').length, loc: !!pm.querySelector('#ck-loc'), step: pm.querySelectorAll('[data-ckstep]').length, hear: !!pm.querySelector('#ck-hear'), names: !!pm.querySelector('#vc-names'), swap: !!pm.querySelector('#ck-swap'),
        diag: pm.querySelectorAll('#ck-diag [data-ckd]').length, drag: !!pm.querySelector('.pm-drag'),
        fn: [...pm.querySelectorAll('[data-vd][data-fn]')].map(x => x.dataset.fn).join(','), pri: [...pm.querySelectorAll('[data-vd][data-pri="1"]')].map(x => +x.dataset.vd + 1).join(','),
        ckx: [...pm.querySelectorAll('[data-ckx]')].map(x => x.dataset.ckx).join(','), sug: pm.querySelectorAll('#ck-sug [data-ckn]').length,
        used: [...pm.querySelectorAll('#ck-used [data-ckn]')].map(x => x.dataset.ckn).slice(0, 2).join(','), custom: !!pm.querySelector('#vc-custom'), clr: !!pm.querySelector('#vc-clr') }; });
    T('E2', r.loc && r.step === 2 && r.hear && r.names && r.swap && r.diag === 3 && r.drag, 'E2a CK 头：#ck-loc、‹ ›、#ck-hear、#vc-names、#ck-swap、#ck-diag 三钮、.pm-drag', J(r));
    T('E2', r.fn === 'T,S,T,S,D,T,D' && r.pri === '1,4,5', 'E2b 级数格色标 T,S,T,S,D,T,D；正三和弦（data-pri=1）＝1、4、5 级', J({ fn: r.fn, pri: r.pri }));
    T('E2', r.ckx === 'D7,E7,A7,C7,Bb,Ab,Eb,Fm', 'E2c 调外行 8 个：副属 D7 E7 A7 C7 + 借用 Bb Ab Eb Fm', r.ckx);
    T('E2', r.sug === 3 && r.used === 'C,G7', 'E2d 建议 3 个；常用前两个＝chordRecent 的 C、G7', J({ sug: r.sug, used: r.used }));
    await shot(pg, 'E2-builder-1440-light');
    await EV(pg, () => __shut());
    const pc = await open(b, { tag: 'E2e', url: CLASSIC });
    await jtStd(pc); await EV(pc, () => { __sel('vox', 2, 0); showVoxChordMenu(300, 200); });
    const rc = await EV(pc, () => ({ custom: !!document.getElementById('vc-custom'), clr: !!document.getElementById('vc-clr'), ck: document.querySelectorAll('#popmenu [id^="ck-"]').length }));
    T('E2', r.ce === 'vox' && r.vd === 8 && !r.custom && !r.clr && rc.custom && rc.clr && rc.ck === 0, 'E2e 新外壳撤掉底部自定义行（没有 #vc-custom / #vc-clr）；旧外壳两者都在、没有 #ck-*', J({ flow: [r.custom, r.clr], classic: rc }));
    await close(pc); await close(pg);
  } catch (e) { T('E2', false, 'E2 组异常（没跑完）', String(e && e.message || e).slice(0, 300)); }

  /* ================= E3 写入数据正确（新外壳）================= */
  if (want('E3')) try {
    const pg = await open(b, { tag: 'E3' });
    const kWrite = async (row, mi, ci, txt, o) => { o = o || {};
      await EV(pg, a => { __shut(); if (a.key) song.key = a.key; __sel(a.row, a.mi, a.ci, 0, a.q); }, { row, mi, ci, key: o.key, q: o.q });
      await pg.keyboard.press('Control+k'); await wait(pg, 150);
      const pn = await EV(pg, () => __pane()); panes.push(row + ':' + (pn.ce || '-'));
      await pg.keyboard.press('Control+a'); await typeKeys(pg, txt); await pg.keyboard.press('Enter'); await wait(pg, 150); };
    const panes = [], paneOk = () => panes.every(x => x === 'vox:vox' || x === 'tab:tab');
    await jtStd(pg);
    await kWrite('vox', 2, 0, 'Am7');
    const a = await EV(pg, () => ({ c: __ch('vox', 2, 0), open: !!document.getElementById('ck-in') }));
    T('E3', a.c === 'Am7' && !a.open && paneOk(), 'E3a 简谱列 Ctrl+K 打开的是级数构建器，键入 Am7 回车 → col.chord=Am7、面板关闭', J({ a, panes }));
    const lv = {};
    for (const [t, ci] of [['6m', 0], ['57sus', 1], ['37/#5', 2]]) { await kWrite('vox', 3, ci, t); lv[t] = await EV(pg, c => __ch('vox', 3, c), ci); }
    await kWrite('vox', 3, 3, '37/#5', { key: 'D' }); lv.D = await EV(pg, () => { const v = __ch('vox', 3, 3); song.key = 'C'; return v; });
    T('E3', lv['6m'] === 'Am' && lv['57sus'] === 'G7sus4' && lv['37/#5'] === 'E7/G#' && lv.D === 'F#7/A#' && paneOk(), 'E3b 级数写法 6m→Am · 57sus→G7sus4 · 37/#5→E7/G#（1=C）· 1=D 时 37/#5→F#7/A#', J(lv));
    await kWrite('vox', 2, 1, 'G/B');
    T('E3', (await EV(pg, () => __ch('vox', 2, 1))) === 'G/B' && paneOk(), 'E3c 斜杠 G/B 原样写入（构建器面板头）', J(panes));
    /* E3d 拍位和弦：二分音符（带增时线）q=1 */
    await EV(pg, () => __jt({ degs: [[1, 3, [5, 2]]] }));
    await kWrite('vox', 0, 2, 'F', { q: 1 });
    const d = await EV(pg, () => { const c = song.measures[0].voxes[0][2]; return { chords: c.chords || null, chord: c.chord || '' }; });
    T('E3', J(d.chords) === J([{ q: 1, chord: 'F' }]) && d.chord === '', 'E3d 拍位和弦：二分音符增时线 sel.q=1，Ctrl+K 写 F → col.chords=[{q:1,chord:F}]、col.chord 不变（基线写进 col.chord）', J(d));
    /* E3e 功能谱八分对齐：光标在第 2 个十六分音符 */
    await EV(pg, () => __jt({ nTab: 0, degs: [[[1, 16], [2, 16], [3, 8], [4, 4], [5, 2]]], mod: s => { s.func = true; } }));
    await kWrite('vox', 0, 1, 'G');
    const e = await EV(pg, () => ({ c0: __ch('vox', 0, 0), c1: __ch('vox', 0, 1) }));
    T('E3', e.c0 === 'G' && e.c1 === '', 'E3e 功能谱八分对齐：光标在 c1（拍 0.25）写 G → 落在 c0，c1 没有和弦（基线写在 c1）', J(e));
    /* E3f 六线谱列写 Am：本小节是 C 的分解 → 与 remapCols 现算一致；customChords 不变 */
    await EV(pg, () => __jt({ mod: s => { const C = chordShape('C'); s.measures[0].tabs[0] = [__TC({ chord: 'C', notes: [{ s: 5, f: 3 }] }), __TC({ notes: [{ s: 3, f: 0 }] }), __TC({ notes: [{ s: 2, f: 1 }] }), __TC({ notes: [{ s: 1, f: 0 }] })]; } }));
    const exp = await EV(pg, () => { const cols = JSON.parse(JSON.stringify(song.measures[0].tabs[0])); cols[0].chord = 'Am'; remapCols(cols, 0, cols.length, chordShape('C'), chordShape('Am')); return { n: J(cols), cc: J(song.customChords || {}) }; });
    await kWrite('tab', 0, 0, 'Am');
    const got = await EV(pg, () => ({ n: J(song.measures[0].tabs[0]), cc: J(song.customChords || {}) }));
    T('E3', got.n === exp.n && got.cc === exp.cc && paneOk(), 'E3f 六线谱列写 Am：音符＝对深拷贝 remapCols(C→Am) 的结果；customChords 不变', got.n === exp.n ? got.cc : got.n.slice(0, 300) + ' / ' + exp.n.slice(0, 300));
    /* E3g 构建器点选 3 → 7 → /#5 */
    await EV(pg, () => { __jt(JT_STD_DEGS()); __sel('vox', 2, 0); });
    await pg.keyboard.press('Control+k'); await wait(pg, 200);
    const u0 = await EV(pg, () => undoStack.length);
    await pg.click('#popmenu [data-vd="2"]'); await pg.click('#popmenu [data-vs="7"]'); await pg.click('#popmenu [data-vb="8"]'); await wait(pg, 100);
    const g = await EV(pg, (u) => ({ c: __ch('vox', 2, 0), du: undoStack.length - u, foc: document.activeElement && document.activeElement.id, val: (document.getElementById('ck-in') || {}).value }), u0);
    T('E3', g.c === 'E7/G#' && g.du === 3 && g.foc === 'ck-in' && g.val === 'E7/G#', 'E3g 构建器点级数 3 → 类型 7 → 转位 /#5 → E7/G#，撤销步 +3；每次写入后焦点回 #ck-in、值＝该处当前和弦', J(g));
    await EV(pg, () => __shut());
    /* E3h 别名与校验 */
    await EV(pg, () => { __jt(Object.assign(JT_STD_DEGS(), { nMea: 8, mod: s => { s.customChords = { '我的C': 'x32010' }; } })); });
    const al = {};
    let ci = 0;
    for (const t of ['CM7', 'c#m', 'Bø', 'C°7', '我的C']) { await kWrite('vox', 4 + (ci >> 2), ci & 3, t); al[t] = await EV(pg, x => __ch('vox', 4 + (x >> 2), x & 3), ci); ci++; }
    await EV(pg, () => { __shut(); __sel('vox', 6, 0); });
    await pg.keyboard.press('Control+k'); await wait(pg, 150);
    const h0 = await EV(pg, () => ({ j: J(song), u: undoStack.length }));
    await typeKeys(pg, 'Hzz9'); await pg.keyboard.press('Enter'); await wait(pg, 150);
    const h1 = await EV(pg, (h) => { const er = document.getElementById('ck-err'), i = document.getElementById('ck-in');
      return { same: J(song) === h.j, du: undoStack.length - h.u, err: !!er && __vis(er) && /认不出/.test(er.textContent), inv: !!i && i.getAttribute('aria-invalid') === 'true', open: !!document.querySelector('#popmenu[data-ce="vox"]') }; }, h0);
    T('E3', al.CM7 === 'Cmaj7' && al['c#m'] === 'C#m' && al['Bø'] === 'Bm7b5' && al['C°7'] === 'Cdim7' && al['我的C'] === '我的C' && h1.same && h1.du === 0 && h1.err && h1.inv && h1.open,
      'E3h 别名 CM7→Cmaj7 · c#m→C#m · Bø→Bm7b5 · C°7→Cdim7 · 自定义「我的C」原样；Hzz9 → song 不变、撤销栈不变、#ck-err「认不出」、aria-invalid、面板开着', J({ al, h1 }));
    await EV(pg, () => __shut());
    /* E3i 点框外未写入 */
    await EV(pg, () => __sel('vox', 6, 1));
    await pg.keyboard.press('Control+k'); await wait(pg, 150);
    const i0 = await EV(pg, () => J(song));
    await typeKeys(pg, 'Dm7');
    const blank = await EV(pg, () => { const p = document.getElementById('paper').getBoundingClientRect(); return { x: p.left + 30, y: p.bottom - 30 }; });
    await pg.mouse.click(blank.x, blank.y); await wait(pg, 200);
    const i1 = await EV(pg, (j0) => { const t = document.getElementById('toast'), a2 = t && t.querySelector('.flw-ta'); return { same: J(song) === j0, k: t ? t.dataset.k : null, act: a2 ? a2.textContent : null }; }, i0);
    await pg.click('#toast .flw-ta').catch(() => {}); await wait(pg, 150);
    const i2 = await EV(pg, () => __ch('vox', 6, 1));
    T('E3', i1.same && i1.k === 'limit' && i1.act === '写入' && i2 === 'Dm7', 'E3i 键入 Dm7 后点谱面空白 → song 不变、提示条 data-k=limit 带「写入」；点它后该处＝Dm7', J({ i1, i2 }));
    /* E3j 同拍去重：六线谱 col0 已有 Am，简谱 col0 写 G */
    await EV(pg, () => __jt({ degs: [[1, 3, 5, 1]], mod: s => { s.measures[0].tabs[0][0].chord = 'Am'; s.measures[0].tabs[0][0].notes = [{ s: 5, f: 0 }]; } }));
    await kWrite('vox', 0, 0, 'G');
    await wait(pg, 200);
    const dj = await EV(pg, () => { const ev = chordEvtsMea(0).filter(e2 => Math.abs(e2.beat) < 1e-6);
      const b0 = colBoxes['v0:0:0'], svg = document.getElementById('score'), R = svg.getBoundingClientRect(), k = R.width / svg.viewBox.baseVal.width, x0 = R.left + (b0.x + b0.w / 2) * k;
      const g2 = [...document.querySelectorAll('#score [data-vchord^="0:"], #score [data-tchord^="0:"]')].filter(e2 => { const r = e2.getBoundingClientRect(); return r.width > 0 && Math.abs((r.left + r.width / 2) - x0) <= 6 + r.width / 2; });
      return { v: __ch('vox', 0, 0), t: __ch('tab', 0, 0), n0: ev.length, names: [...new Set(ev.map(e2 => e2.chord))].join(','), notes: J(song.measures[0].tabs[0][0].notes) }; });
    /* v68.9 收尾（H1）有意迁移：同拍规则由「删掉其他行」改为「其他行改成同一个新名字（六线谱按新和弦重排该段指法）」——删六线谱和弦会留下旧指法、丢钢琴弹唱的和弦行 */
    T('E3', dj.v === 'G' && dj.t === 'G' && dj.names === 'G' && dj.notes === '[{"s":6,"f":3}]', 'E3j 同拍同步：六线谱 col0 有 Am（5 弦空弦）、简谱 col0 写 G → 两行都是 G、拍 0 只有一个和弦名、六线谱低音按 G 重排到 6 弦 3 品', J(dj));
    await close(pg);
  } catch (e) { T('E3', false, 'E3 组异常（没跑完）', String(e && e.message || e).slice(0, 300)); }

  /* ================= E4 连续标注 ================= */
  if (want('E4')) try {
    const pg = await open(b, { tag: 'E4' });
    const st = () => EV(pg, () => ({ mi: sel.mi, ci: sel.ci, q: sel.q | 0, row: sel.row, open: !!document.querySelector('[data-ce] #ck-in'), foc: document.activeElement && document.activeElement.id,
      val: (document.getElementById('ck-in') || {}).value, all: (() => { const i = document.getElementById('ck-in'); return !!i && i.selectionStart === 0 && i.selectionEnd === i.value.length; })() }));
    const sq = async (keys) => { const out = []; for (const k of keys) { await pg.keyboard.press(k); await wait(pg, 120); const s = await st(); out.push(s.mi + ':' + s.ci + (s.q ? 'q' + s.q : '')); } return out; };
    const opn = async (row, mi, ci, q) => { await EV(pg, a => { __shut(); __sel(a.row, a.mi, a.ci, 0, a.q); }, { row, mi, ci, q }); await pg.keyboard.press('Control+k'); await wait(pg, 200); };
    /* E4a / E4b：m0＝[四分, 四分, 二分（增时线）] */
    await EV(pg, () => __jt({ nTab: 0, degs: [[1, 2, [3, 2]], [1, 2, 3, 4]] }));
    await opn('vox', 0, 0);
    const a = await sq(['Space', 'Space', 'Space', 'Space']);
    T('E4', J(a) === J(['0:1', '0:2', '0:2q1', '1:0']), 'E4a 4/4 [四分, 四分, 二分] 从 m1c0 按空格 ×4 → c1@1 → c2@2 → c2q1@3 → m2c0', J(a));
    const bb = await sq(['Shift+Space', 'Shift+Space']);
    T('E4', J(bb) === J(['0:2q1', '0:2']), 'E4b ⇧空格 ×2 → c2q1 → c2', J(bb));
    /* E4c 五线谱行没有拍位 */
    await EV(pg, () => __jt({ nTab: 0, degs: [[1, 2, [3, 2]], [1, 2, 3, 4]], mod: s => { s.voxNotations = ['staff']; } }));
    await opn('vox', 0, 2);
    const c = await sq(['Space']);
    T('E4', J(c) === J(['1:0']), 'E4c 五线谱行从 c2 按空格 → 直接到 m2c0（没有增时线拍位）', J(c));
    /* E4d 6/8：6 个八分 */
    await EV(pg, () => __jt({ nTab: 0, beats: 6, unit: 8, nMea: 2, degs: [[1, 2, 3, 4, 5, 6].map(d => [d, 8])] }));
    await opn('vox', 0, 0);
    const d = await sq(['Space', 'Space']);
    T('E4', J(d) === J(['0:3', '1:0']), 'E4d 6/8 小节 6 个八分，从 c0 按空格 ×2 → c3 → 下一小节 c0（一拍＝附点四分）', J(d));
    /* E4e 六线谱 4/4 8 个八分列 */
    await EV(pg, () => __jt({ nVox: 1, nMea: 2, mod: s => { s.measures[0].tabs[0] = Array.from({ length: 8 }, (_, i) => __TC({ dur: 8, notes: [{ s: (i % 3) + 1, f: 0 }] })); } }));
    await opn('tab', 0, 0);
    const e = await sq(['Space', 'Space', 'Space', 'Space']);
    T('E4', J(e) === J(['0:2', '0:4', '0:6', '1:0']), 'E4e 六线谱 4/4 八分列，从 c0 按空格 ×4 → c2 → c4 → c6 → 下一小节 c0', J(e));
    /* E4f 功能谱 [16,16,8,4,2] 从 c0 按 → */
    await EV(pg, () => __jt({ nTab: 0, nMea: 2, degs: [[[1, 16], [2, 16], [3, 8], [4, 4], [5, 2]]], mod: s => { s.func = true; } }));
    await opn('vox', 0, 0);
    const f = await sq(['ArrowRight']);
    T('E4', J(f) === J(['0:2']), 'E4f 功能谱 [16,16,8,4,2] 从 c0（空值）按 → → c2（跳过不在八分格上的 c1）', J(f));
    /* E4g Tab / ⇧Tab */
    await EV(pg, () => __jt({ nTab: 0, nMea: 3, degs: [[1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4]] }));
    await opn('vox', 0, 1);
    const g1 = await sq(['Tab']);
    await opn('vox', 1, 2);
    const g2 = await sq(['Shift+Tab', 'Shift+Tab']);
    T('E4', J(g1) === J(['1:0']) && J(g2) === J(['1:0', '0:0']), 'E4g Tab → 下一小节 c0；从 m2c2 按 ⇧Tab → m2c0，再按 → m1c0', J({ g1, g2 }));
    /* E4h → 只在插入点在末尾时跳 */
    await EV(pg, () => { song.measures[0].voxes[0][1].chord = 'Am'; render(); });
    await opn('vox', 0, 1);
    const h0 = await st();
    await pg.keyboard.press('ArrowRight'); await wait(pg, 100); const h1 = await st();
    await pg.keyboard.press('ArrowRight'); await wait(pg, 120); const h2 = await st();
    T('E4', h0.val === 'Am' && h0.all && h1.ci === 1 && h1.mi === 0 && h2.ci === 2 && h2.mi === 0, 'E4h 预填 Am 且全选时按 → 第 1 次不跳（插入点收到末尾），第 2 次跳到 c2', J({ h0, h1, h2 }));
    /* E4i 谱末 */
    const nM = await EV(pg, () => song.measures.length);
    await opn('vox', 2, 3);
    await EV(pg, () => { window.__toasts.length = 0; });
    await pg.keyboard.press('Space'); await wait(pg, 150);
    const i = await EV(pg, () => ({ mi: sel.mi, ci: sel.ci, open: !!document.querySelector('[data-ce] #ck-in'), k: (document.getElementById('toast') || {}).dataset ? document.getElementById('toast').dataset.k : null, n: song.measures.length, t: __toasts.slice(-1)[0] }));
    T('E4', i.mi === 2 && i.ci === 3 && i.open && i.k === 'limit' && i.n === nM, 'E4i 谱末按空格：位置不变、面板开着、提示 data-k=limit「已到最后」、不自动加小节', J(i));
    /* E4j 连续键入 C␣G␣Am␣F↵ */
    await EV(pg, () => __jt({ nTab: 0, nMea: 3, degs: [[1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4]], mod: s => { s.measures[0].voxes[0][3].chord = 'Dm'; } }));
    await opn('vox', 1, 0);
    const u0 = await EV(pg, () => undoStack.length);
    const pre = [];
    for (const [t, k] of [['C', 'Space'], ['G', 'Space'], ['Am', 'Space'], ['F', 'Enter']]) {
      const s0 = await st(); pre.push([s0.val, s0.foc === 'ck-in', s0.all]);
      await typeKeys(pg, t); await pg.keyboard.press(k); await wait(pg, 150);
    }
    const j = await EV(pg, u => ({ ch: [0, 1, 2, 3].map(ci2 => __ch('vox', 1, ci2)), open: !!document.querySelector('[data-ce] #ck-in'), du: undoStack.length - u }), u0);
    T('E4', J(j.ch) === J(['C', 'G', 'Am', 'F']) && !j.open && j.du === 4 && pre.every(p => p[0] === '' && p[1] && p[2]),
      'E4j 连续键入 C␣G␣Am␣F↵ → 位置 0–3 依次 C G Am F、面板关闭、撤销步 +4；每跳一次 #ck-in 预填本处自己的和弦（前一小节有 Dm 也为空）、聚焦、全选', J({ j, pre }));
    /* E4k 跳位时构建器重新锚定（1440 宽）+ 跟滚 */
    await EV(pg, () => __jt({ nTab: 1, nMea: 16, degs: Array.from({ length: 16 }, () => [1, 2, 3, 4]) }));
    await opn('vox', 0, 0);
    const ks = [];
    for (let n = 0; n < 6; n++) { await pg.keyboard.press('Tab'); await wait(pg, 150);
      ks.push(await EV(pg, () => { const p = document.querySelector('#popmenu[data-ce="vox"]'), P = p.getBoundingClientRect(), R = ckColRect(chordSlot()), sw = document.getElementById('score-wrap').getBoundingClientRect();
        const inter = !(P.right <= R.left || P.left >= R.right || P.bottom <= R.top || P.top >= R.bottom);
        return { mi: sel.mi, inter, inView: R.top >= sw.top - 1 && R.bottom <= Math.min(sw.bottom, innerHeight) + 1 }; })); }
    T('E4', ks.every(k => !k.inter && k.inView), 'E4k 连续 Tab 跳 6 个小节：每次新面板外框与新列 R 不相交（1440 宽），且跟滚后 R 在谱面可视区内', J(ks));
    await close(pg);
  } catch (e) { T('E4', false, 'E4 组异常（没跑完）', String(e && e.message || e).slice(0, 300)); }

  /* ================= E5 键盘老打法对拍（P8）================= */
  if (want('E5')) try {
    const run = async url => {
      const pg = await open(b, { tag: 'E5', url, w: 1280, h: 900 });
      const out = {};
      const mkG = () => EV(pg, () => { const s = createSong('guitar', { title: '和弦', key: 'C', beats: 4, unit: 4, nMea: 2, nTab: 1, nVox: 1, lyr: 0 });
        s.measures[0].tabs[0] = [__TC({ chord: 'Cmaj7', notes: [{ s: 5, f: 3 }] }), __TC({ notes: [{ s: 3, f: 0 }] }), __TC({ notes: [{ s: 2, f: 1 }] }), __TC({ notes: [{ s: 1, f: 0 }] })]; __one(s); });
      await mkG(); await EV(pg, () => __sel('tab', 0, 2));
      let keys = 0; await pg.keyboard.press('Control+k'); keys++; await wait(pg, 120); await typeKeys(pg, 'Am7'); keys += 3; await pg.keyboard.press('Enter'); keys++; await wait(pg, 150);
      out.t1 = await EV(pg, () => ({ m: J(song.measures), open: !!document.getElementById('ck-in') })); out.k1 = keys;
      await EV(pg, () => __sel('tab', 0, 2)); await pg.keyboard.press('Control+k'); await wait(pg, 120);
      await pg.keyboard.press('Control+a'); await pg.keyboard.press('Backspace'); await pg.keyboard.press('Enter'); await wait(pg, 150);
      out.t1c = await EV(pg, () => ({ m: J(song.measures), open: !!document.getElementById('ck-in') }));
      await EV(pg, () => { const s = createSong('vocal', { title: '级数', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 0 }); s.measures[0].voxes[0].forEach((c, i) => { c.deg = [6, 1, 3, 1][i]; }); __one(s); __sel('vox', 0, 0); window.__toasts.length = 0; });
      await pg.keyboard.press('Control+k'); await wait(pg, 120); await typeKeys(pg, '6m'); await pg.keyboard.press('Enter'); await wait(pg, 150);
      out.t2 = await EV(pg, () => ({ m: J(song.measures), open: !!document.getElementById('ck-in'), toast: __toasts.find(x => /已标注/.test(x)) || '' }));
      /* E5c 值没改时按 Enter */
      await EV(pg, () => __sel('vox', 0, 0)); const u0 = await EV(pg, () => undoStack.length);
      await pg.keyboard.press('Control+k'); await wait(pg, 120); await pg.keyboard.press('Enter'); await wait(pg, 150);
      out.du = await EV(pg, u => undoStack.length - u, u0);
      /* E5d Ctrl+K 再按 Ctrl+K */
      await EV(pg, () => __sel('vox', 0, 1)); await pg.keyboard.press('Control+k'); await wait(pg, 150);
      await EV(pg, () => { window.__pm1 = document.getElementById('popmenu'); __blur(); });   /* 焦点不在面板里时再按（在 #ck-in 里按由面板自己全选） */
      await pg.keyboard.press('Control+k'); await wait(pg, 150);
      out.same = await EV(pg, () => ({ same: document.getElementById('popmenu') === window.__pm1, foc: document.activeElement && document.activeElement.id }));
      await close(pg); return out;
    };
    const A = await run(URL0);
    T('E5', A.k1 === 5 && !A.t1.open && !A.t1c.open && !A.t2.open, 'E5a 按键数：Ctrl+K 1 + 键入 3 + Enter 1 = 5 次，Enter 后面板关闭（三个用例）', J({ k: A.k1, open: [A.t1.open, A.t1c.open, A.t2.open] }));
    if (BASEU) {
      const B = await run(BASEU);
      T('E5', A.t1.m === B.t1.m && A.t1c.m === B.t1c.m && A.t2.m === B.t2.m && A.t2.toast === '已标注 Am（级数 6m）', 'E5b 六线谱 Am7 / 留空清除 / 简谱 6m 三个用例的 song.measures 与基线 ' + BASE_COMMIT + ' 快速框逐字节相等；简谱提示「已标注 Am（级数 6m）」',
        J({ t1: A.t1.m === B.t1.m, t1c: A.t1c.m === B.t1c.m, t2: A.t2.m === B.t2.m, toast: A.t2.toast }));
      T('E5', A.du === 0 && B.du === 1, 'E5c 值没改时按 Enter 不新增撤销步（基线 +1，有意改进）', J({ now: A.du, base: B.du }));
    } else INFO('E5', 'E5b / E5c 基线文件取不到，跳过');
    T('E5', A.same.same && A.same.foc === 'ck-in', 'E5d 面板开着再按 Ctrl+K 不重开（#popmenu 同一节点）、焦点在 #ck-in', J(A.same));
  } catch (e) { T('E5', false, 'E5 组异常（没跑完）', String(e && e.message || e).slice(0, 300)); }

  /* ================= E6 建议与配和弦引擎一致 ================= */
  if (want('E6')) try {
    const pg = await open(b, { tag: 'E6' });
    await EV(pg, () => __jt({ degs: [[1, 3, 5, 1], [5, 7, 2, 5], [1, 3, 5, 3]], nMea: 3, mod: s => { s.measures[0].voxes[0][0].chord = 'C'; s.measures[1].voxes[0][0].chord = 'G'; } }));
    const a = await EV(pg, () => {
      const R = chordSolve(song, 0), CAND = R.CAND, kG = CAND.findIndex(c => chordCandName(c, 'C') === 'G');
      /* v68.9 收尾（H13）有意迁移：建议不推荐与上一和弦（G）相同的、同根同性质只留分高的一个 */
      const ded = L => { const seen = new Set(); return L.filter(x => { if (x.name === 'G') return false; const t = chordTones(x.name), k = t.pc + (t.iv[3] === 3 ? 'm' : 'M'); if (seen.has(k)) return false; seen.add(k); return true; }); };
      const calc = (emitF) => ded(CAND.map((c, j) => ({ name: chordCandName(c, 'C'), s: emitF(c, j) + chordTrans(CAND, kG, j, false), j })).sort((x, y) => (y.s - x.s) || (x.j - y.j))).slice(0, 3);
      const exp0 = calc((c, j) => R.emit[2][j]), got0 = chordNextRank({ row: 'vox', mi: 2, vi: 0, ci: 0, q: 0 }, 3);
      const cols = song.measures[2].voxes[0];
      const exp2 = calc(c => chordRangeScore(c, cols, 2, 4)), got2 = chordNextRank({ row: 'vox', mi: 2, vi: 0, ci: 2, q: 0 }, 3);
      const eq = (E, G) => E.length === G.length && E.every((x, i) => x.name === G[i].name && Math.abs(x.s - G[i].score) < 1e-9);
      return { a: eq(exp0, got0), b: eq(exp2, got2), top: got0[0] && got0[0].name, exp0: exp0.map(x => x.name), got0: got0.map(x => x.name), exp2: exp2.map(x => x.name), got2: got2.map(x => x.name) }; });
    T('E6', a.a && a.top === 'C', 'E6a m2c0：chordNextRank 前 3＝R.emit[2][j]+chordTrans(CAND,kG,j) 现算排序（分差 <1e-9），第 1 名 C', J(a));
    T('E6', a.b, 'E6b 半小节 m2c2（拍 2）：emit 改用 chordRangeScore(…, 2, 4)，与现算一致', J({ exp2: a.exp2, got2: a.got2 }));
    const c = await EV(pg, () => { __jt({ nVox: 0, nMea: 2, mod: s => { s.measures[0].tabs[0][0].chord = 'G'; } }); const r = chordNextRank({ row: 'tab', mi: 1, vi: 0, ci: 0, q: 0 }, 3); return { fn: r[0] && r[0].fn, names: r.map(x => x.name), sc: r.map(x => x.score) }; });
    T('E6', c.fn === 'T' && c.sc.every(x => x === 0.85), 'E6c 纯六线谱（没有旋律）前一和弦 G：只按转移分排，第 1 名功能 T', J(c));
    /* E6d 200 小节打开面板耗时 */
    const d = await EV(pg, () => { __jt({ nMea: 200, degs: Array.from({ length: 200 }, (_, mi) => [1, 2, 3, 4].map(i => ((mi + i) % 7) + 1)) }); __sel('vox', 120, 1);
      const t0 = performance.now(); chordOpen({ src: 't' }); const t1 = performance.now(); const ok = !!document.querySelector('#popmenu[data-ce="vox"] #ck-sug'); __shut(); return { ms: Math.round(t1 - t0), ok }; });
    T('E6', d.ok && d.ms <= 150, 'E6d 200 小节谱打开构建器（含建议）≤150ms：' + d.ms + 'ms', J(d));
    /* E6f 页面上的建议＝chordNextRank */
    await EV(pg, () => { __jt({ degs: [[1, 3, 5, 1], [5, 7, 2, 5], [1, 3, 5, 3]], nMea: 3, mod: s => { s.measures[0].voxes[0][0].chord = 'C'; s.measures[1].voxes[0][0].chord = 'G'; } }); __sel('vox', 2, 0); chordOpen({ src: 't' }); });
    const f = await EV(pg, () => ({ dom: [...document.querySelectorAll('#ck-sug [data-ckn]')].map(x => x.dataset.ckn), api: chordNextRank(chordSlot(), 3).map(x => x.name) }));
    T('E6', f.dom.length === 3 && J(f.dom) === J(f.api), 'E6f #ck-sug 芯片依次＝chordNextRank 的名字', J(f));
    await close(pg);
    /* E6e chordSolve 零变化（与基线逐项相等） */
    if (BASEU) {
      const solve = async url => { const p = await open(b, { tag: 'E6e', url });
        const r = await EV(p, () => { const out = {};
          const min = createSong('vocal', { title: 'm', key: 'C', beats: 4, unit: 4, nMea: 4, nVox: 1, lyr: 0 }); [[6, 1, 3, 6], [3, 5, 7, 3], [4, 6, 1, 4], [3, 5, 7, 6]].forEach((ds, mi) => ds.forEach((d2, i) => { min.measures[mi].voxes[0][i].deg = d2; }));
          min.measures[1].voxes[0][1].acc = '#';
          [['xx', migrate(PRESETS[0].make())], ['hl', migrate(PRESETS[1].make())], ['min', min]].forEach(([k, s]) => { const R = chordSolve(s, 0); out[k] = J({ out: R.out, emit: R.emit, minor: R.minor }); });
          return out; });
        await close(p); return r; };
      const A = await solve(URL0), B = await solve(BASEU);
      T('E6', A.xx === B.xx && A.hl === B.hl && A.min === B.min && A.xx.length > 50, 'E6e chordSolve 零变化：小星星 / 欢乐颂 / 小调各一份，out 与 emit 与基线逐项相等', J({ xx: A.xx === B.xx, hl: A.hl === B.hl, min: A.min === B.min }));
    } else INFO('E6', 'E6e 基线文件取不到，跳过');
  } catch (e) { T('E6', false, 'E6 组异常（没跑完）', String(e && e.message || e).slice(0, 300)); }

  /* ================= E7 乐理抽样 ================= */
  if (want('E7')) try {
    const pg = await open(b, { tag: 'E7' });
    const r = await EV(pg, () => { __jt({ degs: [[1, 3, 5, 1]] }); const g = k => { song.key = k; const kc = chordKeyChords(0);
        return { inn: kc.filter(x => x.kind === 'in').map(x => x.name + '/' + x.fn + (x.pri ? '*' : '')).join(' '), sec: kc.filter(x => x.kind === 'sec').map(x => x.name + '→' + x.to).join(' '), bor: kc.filter(x => x.kind === 'bor').map(x => x.name).join(' ') }; };
      const o = { C: g('C'), G: g('G'), F: g('F') };
      song.key = 'C'; song.mode = 'minor'; const kc = chordKeyChords(0);
      o.min = { inn: kc.filter(x => x.kind === 'in').map(x => x.name + '/' + x.fn + (x.pri ? '*' : '')).join(' '), out: kc.filter(x => x.kind !== 'in' || x.xg).map(x => x.name).join(' '), bor: kc.filter(x => x.kind === 'bor').length };
      delete song.mode; return o; });
    T('E7', r.C.inn === 'C/T* Dm/S Em/T F/S* G/D* G7/D* Am/T Bdim/D' && r.C.sec === 'D7→G E7→Am A7→Dm C7→F' && r.C.bor === 'Bb Ab Eb Fm', 'E7a 1=C 调内 / 副属 / 借用', J(r.C));
    T('E7', r.G.inn.replace(/\/[A-Za-z]\*?/g, '') === 'G Am Bm C D D7 Em F#dim' && r.G.sec === 'A7→D B7→Em E7→Am G7→C' && r.G.bor === 'F Eb Bb Cm', 'E7b 1=G', J(r.G));
    T('E7', r.F.inn.replace(/\/[A-Za-z]\*?/g, '') === 'F Gm Am Bb C C7 Dm Edim' && r.F.sec === 'G7→C A7→Dm D7→Gm F7→Bb' && r.F.bor === 'Eb Db Ab Bbm', 'E7c 1=F', J(r.F));
    /* v68.9 收尾（H9）有意迁移：VII 记属组 d（斯波索宾功能组 / Riemann dP）；小调补 V/iv、重属两个副属与皮卡第三、那不勒斯、多利亚 IV 三个借用（构建器把 V / V7 单列「和声」行） */
    T('E7', r.min.inn === 'Am/t* Dm/s* E/D* E7/D Em/d F/s G/d C/t Bdim/s' && r.min.out === 'E E7 A7 B7 A Bb D' && r.min.bor === 3, 'E7d 小调（1=C，mode=minor）：t s D 色标、正三和弦 i iv V、VII 属组 d；调外＝和声小调属 + A7 B7 副属 + A Bb D 借用', J(r.min));
    const e = await EV(pg, () => { song.key = 'D'; render(); __sel('vox', 0, 0); chordOpen({ src: 't' }); const b7 = document.querySelector('#popmenu [data-vb="10"] small'); const o = { nm: vcBassName(10), btn: b7 ? b7.textContent : null }; __shut(); song.key = 'C'; render(); return o; });
    T('E7', e.nm === 'C' && e.btn === 'C', 'E7e 1=D 的转位低音：vcBassName(10)=C、/b7 钮小字 C', J(e));
    const f = await EV(pg, () => { __sel('vox', 0, 1); chordWriteAt(chordSlot(), 'Bb', { quiet: true }); chordOpen({ src: 't' }); const x = document.querySelector('#popmenu [data-ckx="Bb"]'); const o = { on: !!x && x.classList.contains('on'), lab: x ? x.textContent : null }; __shut(); return o; });
    T('E7', f.on, 'E7f 1=C 写入 Bb 后重开构建器：调外行 ♭7 芯片 .on（按名字点亮，不依赖 vcParse）', J(f));
    /* E7g 色标对比度（浅 / 深）：9px 字母颜色对 --panel ≥4.5 */
    const cr = async dark => { const p = await open(b, { tag: 'E7g', dark });
      const o = await EV(p, () => { __jt({ degs: [[1, 3, 5, 1]] }); __sel('vox', 0, 0); chordOpen({ src: 't' });
        const lum = c => { const m = c.match(/[\d.]+/g).map(Number).slice(0, 3).map(v => v / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
        const ratio = (a2, b2) => { const x = lum(a2), y = lum(b2); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
        const pan = getComputedStyle(document.getElementById('popmenu')).backgroundColor;
        const fl = [...document.querySelectorAll('#popmenu [data-vd]:not(.on) .ck-fl, #popmenu .ck-chip:not(.on) .ck-fl')];
        const rs = fl.map(x => ({ fn: x.textContent, fs: getComputedStyle(x).fontSize, r: Math.round(ratio(getComputedStyle(x).color, pan) * 100) / 100 }));
        return { pan, n: rs.length, min: Math.min(...rs.map(x => x.r)), fs: [...new Set(rs.map(x => x.fs))], fns: [...new Set(rs.map(x => x.fn))].join('') }; });
      await close(p); return o; };
    const L = await cr(false), D = await cr(true);
    T('E7', L.n >= 10 && D.n >= 10 && L.min >= 4.5 && D.min >= 4.5 && L.fs.includes('9px') && /T/.test(L.fns) && /S/.test(L.fns) && /D/.test(L.fns), 'E7g 色标字母（9px）对 --panel 对比度：浅色最小 ' + L.min + ' · 深色最小 ' + D.min + '（都 ≥4.5）', J({ L, D }));
    await close(pg);
  } catch (e) { T('E7', false, 'E7 组异常（没跑完）', String(e && e.message || e).slice(0, 300)); }

  /* ================= E8 试听不进撤销 ================= */
  if (want('E8')) try {
    const pg = await open(b, { tag: 'E8', touch: true });
    await jtStd(pg);
    await EV(pg, () => { window.__hear = []; window.__snd = []; const h0 = chordHear; window.chordHear = (n, s) => { __hear.push(n); return h0(n, s); };   /* 包一层计数，照样走真的 chordHear（发声函数换成记录器，不出声） */
      window.auditionShape = sh => __snd.push(sh); window.chordLabAudition = n => __snd.push(n); localStorage.removeItem('musetab-chordhear'); __sel('vox', 2, 0); chordOpen({ src: 't' }); window.__j0 = J(song); window.__u0 = undoStack.length; });
    const x = await EV(pg, () => __hit('#popmenu [data-ckx="E7"]'));
    await pg.mouse.move(x.x, x.y); await wait(pg, 380);
    const a = await EV(pg, () => ({ calls: __hear.slice(), snd: __snd.length, same: J(song) === __j0, du: undoStack.length - __u0, rd: redoStack.length }));
    T('E8', a.calls.length === 1 && a.calls[0] === 'E7' && a.snd === 1 && a.same && a.du === 0, 'E8a 调外芯片悬停 350ms：chordHear 1 次、参数＝芯片名、发声 1 次，song 与撤销栈不变', J(a));
    await pg.mouse.move(5, 5); await wait(pg, 50);
    const bb = await EV(pg, () => { __hear.length = 0; const el = document.querySelector('#popmenu [data-ckx="A7"]'), r = el.getBoundingClientRect(), o = { bubbles: true, pointerType: 'touch', pointerId: 9, clientX: r.left + 5, clientY: r.top + 5 };
      el.dispatchEvent(new PointerEvent('pointerdown', o));
      return new Promise(res => setTimeout(() => { el.dispatchEvent(new PointerEvent('pointerup', o)); el.click(); res({ calls: __hear.slice(), same: J(song) === __j0, du: undoStack.length - __u0 }); }, 520)); });
    T('E8', bb.calls.length === 1 && bb.calls[0] === 'A7' && bb.same && bb.du === 0, 'E8b 触屏长按 500ms：试听 1 次，随后的 click 被吞掉、不写入', J(bb));
    await pg.click('#ck-hear'); await wait(pg, 80);
    await EV(pg, () => { __hear.length = 0; });
    const y = await EV(pg, () => __hit('#popmenu [data-ckx="D7"]'));
    await pg.mouse.move(y.x, y.y); await wait(pg, 400);
    const c1 = await EV(pg, () => ({ calls: __hear.length, ls: localStorage.getItem('musetab-chordhear'), ap: document.getElementById('ck-hear').getAttribute('aria-pressed') }));
    await pg.reload(); await wait(pg, 1000); await EV(pg, HELP); await jtStd(pg); await EV(pg, () => { __sel('vox', 2, 0); chordOpen({ src: 't' }); });
    const c2 = await EV(pg, () => ({ ls: localStorage.getItem('musetab-chordhear'), on: ckHearOn(), ap: document.getElementById('ck-hear').getAttribute('aria-pressed') }));
    T('E8', c1.calls === 0 && c1.ls === '0' && c1.ap === 'false' && c2.ls === '0' && !c2.on && c2.ap === 'false', 'E8c 点 #ck-hear 关掉后悬停 0 次；musetab-chordhear=0；重开页面仍是关', J({ c1, c2 }));
    const d = await EV(pg, () => { window.__aud = []; window.auditionShape = sh => __aud.push(sh); const j0 = J(song), u0 = undoStack.length;
      chordWriteAt(chordSlot(), 'Am', { quiet: true }); __shut(); chordOpen({ src: 't' }); const j1 = J(song), u1 = undoStack.length;
      document.getElementById('vc-play').click(); return { aud: __aud.length, shape: __aud[0], exp: chordShape('Am'), same: J(song) === j1 && undoStack.length === u1, wrote: j0 !== j1 }; });
    T('E8', d.aud === 1 && d.shape === d.exp && d.same, 'E8d #vc-play 调 auditionShape（Am 指法），song 不变', J(d));
    await close(pg);
  } catch (e) { T('E8', false, 'E8 组异常（没跑完）', String(e && e.message || e).slice(0, 300)); }

  /* ================= E9 旧外壳零差异（与基线比） ================= */
  if (want('E9')) try {
    const sig = async url => {
      const pg = await open(b, { tag: 'E9', url: withQ(url, 'shell=classic') });
      const o = {};
      await jtStd(pg); await EV(pg, () => __sel('vox', 2, 0));
      await pg.keyboard.press('Control+k'); await wait(pg, 150);
      o.quick = await EV(pg, () => { const p = document.getElementById('popmenu'); return p ? { ids: [...p.querySelectorAll('[id]')].map(x => x.id).join(','), btn: [...p.querySelectorAll('button')].map(x => x.textContent.trim()).join('|'), ph: (document.getElementById('ck-in') || {}).placeholder, t: (p.querySelector('.t') || {}).textContent, ce: p.dataset.ce || '' } : null; });
      await typeKeys(pg, 'Am7'); await pg.keyboard.press('Enter'); await wait(pg, 150);
      o.quickW = await EV(pg, () => J(song.measures));
      await EV(pg, () => { __shut(); __sel('vox', 2, 1); showVoxChordMenu(300, 200); });
      o.vb = await EV(pg, () => { const p = document.getElementById('popmenu'); return { vd: p.querySelectorAll('[data-vd]').length, vs: p.querySelectorAll('[data-vs]').length, vb: p.querySelectorAll('[data-vb]').length,
        t: [...p.querySelectorAll('.t')].map(x => x.textContent.replace(/\s+/g, ' ').trim()).join('|'), custom: !!p.querySelector('#vc-custom'), clr: !!p.querySelector('#vc-clr'), ck: p.querySelectorAll('[id^="ck-"]').length, ce: p.dataset.ce || '' }; });
      await pg.click('#popmenu [data-vd="1"]'); await pg.click('#popmenu [data-vs="7"]'); await pg.click('#popmenu [data-vb="7"]'); await wait(pg, 100);
      o.vbW = await EV(pg, () => J(song.measures));
      await EV(pg, () => __shut());
      /* #rt-chord / #b-vchord / #b-chord-edit 分流 */
      const via = async (id, row) => { await EV(pg, r => { __shut(); __sel(r, 2, 2); }, row); const h = await EV(pg, i => __hit('#' + i), id);
        if (h.ok) await pg.mouse.click(h.x, h.y); await wait(pg, 200); const p = await EV(pg, () => ({ vox: !!document.getElementById('vc-custom'), gp: !!document.getElementById('ce-ok') })); await EV(pg, () => __shut()); return [h.ok, p.vox ? 'vox' : p.gp ? 'gp' : '-']; };
      await EV(pg, () => { try { setRTab('ai'); } catch (_) {} });
      o.split = { rtV: await via('rt-chord', 'vox'), rtT: await via('rt-chord', 'tab') };
      o.split.ceV = await EV(pg, () => { __sel('vox', 2, 2); document.getElementById('b-chord-edit').click(); const r = !!document.getElementById('vc-custom'); __shut(); return r; });
      o.split.ceT = await EV(pg, () => { __sel('tab', 2, 2); document.getElementById('b-chord-edit').click(); const r = !!document.getElementById('ce-ok'); __shut(); return r; });
      o.split.vch = await EV(pg, () => { __sel('vox', 2, 2); document.getElementById('b-vchord').click(); const r = !!document.getElementById('vc-custom'); __shut(); return r; });
      await close(pg); return o;
    };
    const A = await sig(URL0);
    if (BASEU) {
      const B = await sig(BASEU);
      T('E9', J(A.quick) === J(B.quick) && A.quickW === B.quickW && !!A.quick, 'E9a 旧外壳 Ctrl+K 快速框 DOM 签名（id / 按钮字 / placeholder / 标题 / 和弦图三钮）与输入合法值 Am7 的结果＝基线', J({ A: A.quick, B: B.quick, w: A.quickW === B.quickW }));
      T('E9', J(A.vb) === J(B.vb) && A.vb.custom && A.vb.clr && A.vb.ck === 0, 'E9b 旧外壳 showVoxChordMenu 签名（[data-vd] 8 / [data-vs] 22 / [data-vb] 13、.t 各行文字、#vc-custom #vc-clr 在、没有 #ck-*）＝基线', J({ A: A.vb, B: B.vb }));
      T('E9', J(A.split) === J(B.split) && A.split.rtV[1] === 'vox' && A.split.rtT[1] === 'gp' && A.split.ceV && A.split.ceT && A.split.vch, 'E9c 旧外壳 #rt-chord / #b-vchord / #b-chord-edit 可见并按行分流＝基线', J({ A: A.split, B: B.split }));
      T('E9', A.vbW === B.vbW, 'E9d 同一串构建器点击（级数 2 → 类型 7 → 转位 /5）后 song.measures＝基线');
    } else INFO('E9', 'E9a–d 基线文件取不到，跳过');
    /* E9e R1–R3 在旧外壳生效（有意改动） */
    const pg = await open(b, { tag: 'E9e', url: CLASSIC });
    await EV(pg, () => { __jt({ degs: [[1, 3, [5, 2]]] }); __sel('vox', 0, 2, 0, 1); });
    await pg.keyboard.press('Control+k'); await wait(pg, 120); await typeKeys(pg, 'F'); await pg.keyboard.press('Enter'); await wait(pg, 150);
    const r1 = await EV(pg, () => { const c = song.measures[0].voxes[0][2]; return { chords: J(c.chords || null), chord: c.chord || '' }; });
    await EV(pg, () => { __jt({ nTab: 0, degs: [[[1, 16], [2, 16], [3, 8], [4, 4], [5, 2]]], mod: s => { s.func = true; } }); __sel('vox', 0, 1); });
    await pg.keyboard.press('Control+k'); await wait(pg, 120); await typeKeys(pg, 'G'); await pg.keyboard.press('Enter'); await wait(pg, 150);
    const r2 = await EV(pg, () => ({ c0: __ch('vox', 0, 0), c1: __ch('vox', 0, 1) }));
    await EV(pg, () => __sel('vox', 0, 3));
    await pg.keyboard.press('Control+k'); await wait(pg, 120); const j0 = await EV(pg, () => J(song));
    await typeKeys(pg, 'Hzz9'); await pg.keyboard.press('Enter'); await wait(pg, 150);
    const r3 = await EV(pg, (j) => ({ same: J(song) === j, err: !!document.getElementById('ck-err') && /认不出/.test(document.getElementById('ck-err').textContent), open: !!document.getElementById('ck-in'), inv: (document.getElementById('ck-in') || { getAttribute: () => null }).getAttribute('aria-invalid') }), j0);
    T('E9', r1.chords === J([{ q: 1, chord: 'F' }]) && r1.chord === '' && r2.c0 === 'G' && r2.c1 === '' && r3.same && r3.err && r3.open && r3.inv === 'true',
      'E9e 旧外壳 R1（拍位 q 写进 col.chords）· R2（功能谱八分对齐）· R3（Hzz9 就地报错、不写、不关）生效——登记过的有意改动', J({ r1, r2, r3 }));
    await close(pg);
  } catch (e) { T('E9', false, 'E9 组异常（没跑完）', String(e && e.message || e).slice(0, 300)); }

  /* ================= E10 文案预算 ================= */
  if (want('E10')) try {
    try { execFileSync(process.execPath, [path.resolve(__dirname, '../../deploy/check-wording.js')], { stdio: ['ignore', 'pipe', 'pipe'] }); T('E10', true, 'E10b node deploy/check-wording.js 0 命中'); }
    catch (e) { T('E10', false, 'E10b node deploy/check-wording.js 0 命中', String(e.stdout || e.message).slice(-600)); }
    const pg = await open(b, { tag: 'E10' });
    await jtStd(pg);
    const scan = () => EV(pg, () => { const bad = [];
      const root = document.querySelector('#popmenu[data-ce], #modal-mask .modal[data-ce]'); if (!root) return ['no-pane'];
      const chip = el => el.matches('[data-vd],[data-vs],[data-vb],[data-ckn],[data-ckx],[data-ckk],[data-cr],[data-cq],[data-calt],[data-comit],[data-cpos],[data-cacc]');
      root.querySelectorAll('button').forEach(el => { if (!__vis(el) || chip(el)) return; const t = (el.innerText || '').replace(/\s+/g, ''); if (t.length > 4) bad.push('btn:' + t); });
      root.querySelectorAll('[title]').forEach(el => { if (!(el.matches('[data-ckstep],[data-ckd],[data-ckn],[data-ckx],[data-ckk],[id^="ck-"],.vc-grid *,[class^="ce-"],[class*=" ce-"]'))) return;
        const t = el.getAttribute('title'); if ([...t].length > 12) bad.push('title:' + t); });
      if (/左栏|右栏|行 2/.test(root.innerText)) bad.push('pos-word');
      return bad; });
    await EV(pg, () => __sel('vox', 2, 0)); await pg.keyboard.press('Control+k'); await wait(pg, 200);
    const v = await scan(); await EV(pg, () => __shut());
    await EV(pg, () => __sel('tab', 2, 0)); await pg.keyboard.press('Control+k'); await wait(pg, 300);
    const t = await scan(); await EV(pg, () => __shut());
    if (!HAS_B) INFO('E10', 'E10c GP 一侧的文案瘦身（「应用到小节」→「应用」、长 title）是 B 轨 B6，未合入只查 CK 头：' + J(t.slice(0, 4)));
    const tb = HAS_B ? t : t.filter(x => /ck-|上一拍|下一拍|悬停试听|谱面写法|和弦图|拖动|关闭/.test(x));
    T('E10', !v.length && !tb.length, 'E10c 面板内文案（新外壳）：芯片外按钮可见字 ≤4、CK 头 / 级数格 / GP 的 title ≤12、不含「左栏」「右栏」「行 2」', J({ v, t }));
    await close(pg);
  } catch (e) { T('E10', false, 'E10 组异常（没跑完）', String(e && e.message || e).slice(0, 300)); }

  /* ================= E11 小橙色块护栏 ================= */
  if (want('E11')) try {
    const bad = [], seen = [];
    for (const [w, h] of [[1280, 800], [1366, 768], [1440, 900], [1920, 1080]]) for (const dark of [false, true]) {
      const pg = await open(b, { tag: 'E11', w, h, dark });
      await EV(pg, () => __jt({ key: 'B', degs: [[1, 3, 5, 1], [5, 7, 2, 5], [1, 3, 5, 3], [4, 6, 1, 6]], mod: s => { s.measures[0].voxes[0][0].chord = 'B'; s.measures[1].tabs[0][0].chord = 'F#'; } }));
      for (const row of ['vox', 'tab']) {
        await EV(pg, r => { __shut(); __sel(r, 2, 0); }, row); await pg.keyboard.press('Control+k'); await wait(pg, 300);
        const r = await EV(pg, () => {
          const root = document.querySelector('#popmenu[data-ce], #modal-mask .modal[data-ce]'); if (!root) return { n: -1 };
          const P = root.getBoundingClientRect(), X = { l: P.left - 40, t: P.top - 40, r: P.right + 40, b: P.bottom + 40 };
          const hsl = c => { const m = (c || '').match(/rgba?\(([^)]+)\)/); if (!m) return null; const a = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); if (a.length > 3 && a[3] === 0) return null;
            const [r2, g2, b2] = a.slice(0, 3).map(v => v / 255), mx = Math.max(r2, g2, b2), mn = Math.min(r2, g2, b2), l = (mx + mn) / 2; if (mx === mn) return { h: 0, s: 0, l };
            const d2 = mx - mn, s2 = l > 0.5 ? d2 / (2 - mx - mn) : d2 / (mx + mn); let hh = mx === r2 ? (g2 - b2) / d2 + (g2 < b2 ? 6 : 0) : mx === g2 ? (b2 - r2) / d2 + 2 : (r2 - g2) / d2 + 4; return { h: hh * 60, s: s2, l }; };
          const orange = c => { const v = hsl(c); return !!v && v.h >= 0 && v.h <= 45 && v.s > 0.5 && v.l >= 0.35 && v.l <= 0.75; };
          const hits = [];
          document.querySelectorAll('body *').forEach(el => { if (el.closest('#ck-err')) return; const r = el.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return;
            if (r.right < X.l || r.left > X.r || r.bottom < X.t || r.top > X.b) return;
            const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return;
            const props = ['backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'color', 'fill', 'stroke'];
            for (const p of props) { if (p.startsWith('border') && parseFloat(cs[p.replace('Color', 'Width')]) === 0) continue; if ((p === 'fill' || p === 'stroke') && !(el instanceof SVGElement)) continue;
              if (p === 'color' && !(el.childNodes && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))) continue;
              if (orange(cs[p])) { hits.push((el.id || el.tagName) + '.' + p + '=' + cs[p]); break; } } });
          return { n: hits.length, hits: hits.slice(0, 5) }; });
        seen.push(w + 'x' + h + (dark ? 'D' : 'L') + row + ':' + r.n);
        if (r.n !== 0) bad.push({ w, h, dark, row, r });
        if (w === 1440 && row === 'vox') await shot(pg, 'E11-builder-1440-' + (dark ? 'dark' : 'light'));
        await EV(pg, () => __shut());
      }
      await close(pg);
    }
    T('E11', !bad.length, 'E11 4 种视口 × 浅 / 深色 × 简谱行 / 六线谱行，吉他弹唱谱 1=B 打开面板：外框外扩 40px 内可见元素的背景 / 边框 / 文字 / 描边 / 填充没有橙红色（H 0–45°、S>0.5、L 0.35–0.75；#ck-err 除外）', J({ seen, bad: bad.slice(0, 3) }));
  } catch (e) { T('E11', false, 'E11 组异常（没跑完）', String(e && e.message || e).slice(0, 300)); }

  /* ================= E13 钢琴弹唱谱（CG）第 1 步 ================= */
  if (want('E13')) try {
    const pg = await open(b, { tag: 'E13' });
    await EV(pg, () => { __shut(); __one(NWB.build('CG', { title: '测CG', nMea: 4 })); LBAR.open({ from: 'new' }); sel = { mi: 1, row: 'vox', vi: 1, ci: 0, si: 1 }; render(); __blur(); });
    await wait(pg, 300);
    const g = await EV(pg, () => { const b2 = document.querySelector('#flw-sbar [data-fa="sbar:go"]'); return { t: b2 ? b2.textContent.trim() : null, act: b2 ? b2.dataset.act : null, hit: __hit(b2) }; });
    if (g.hit && g.hit.ok) await pg.mouse.click(g.hit.x, g.hit.y); await wait(pg, 300);
    const p = await EV(pg, () => Object.assign(__pane(), { vi: sel.vi, row: sel.row }));
    await typeKeys(pg, 'C'); await pg.keyboard.press('Enter'); await wait(pg, 300);
    const s2 = await EV(pg, () => ({ steps: [...document.querySelectorAll('#flw-sbar .flw-sb-steps li')].map(li => li.className + ':' + (li.querySelector('.flw-sb-t') || {}).textContent).join('|'), ph: (document.getElementById('flw-sbar') || { dataset: {} }).dataset.ph,
      pri: (document.querySelector('#flw-sbar .flw-sb-tool.pri') || { dataset: {} }).dataset.v, ch: (song.measures[1].voxes[0][0] || {}).chord }));
    await shot(pg, 'E13-cg-step1');
    await close(pg);
    const pc = await open(b, { tag: 'E13c', url: CLASSIC });
    await EV(pc, () => { __one(NWB.build('CG', { title: '测CG', nMea: 4 })); LBAR.open({ from: 'new' }); render(); });
    await wait(pc, 300);
    const c = await EV(pc, () => { const w = document.getElementById('lb-wrap'); return { go: w ? w.querySelectorAll('.lb-go').length : -1, txt: w ? w.innerText.replace(/\s+/g, ' ') : '' }; });
    await close(pc);
    T('E13', g.t === '标和弦' && g.act === 'chord' && g.hit.ok && p.popCe === 'vox' && p.vi === 0 && p.ck && s2.ch === 'C' && (s2.ph === 'tools' ? s2.pri === 'tex' : /now:织体/.test(s2.steps)) && c.go === 0 && /Ctrl\+K/.test(c.txt),
      'E13 钢琴弹唱谱新外壳：悬浮条主按钮「标和弦」可见；点了在 voxes[0]（右手）打开构建器；写入 C 后进到「选织体」；旧外壳谱型条仍只有提示、没有新按钮', J({ g: [g.t, g.act, g.hit.ok], p: [p.popCe, p.vi, p.ck], s2, c }));
  } catch (e) { T('E13', false, 'E13 组异常（没跑完）', String(e && e.message || e).slice(0, 300)); }

  /* ================= E14 配和弦工作台「契合 100%」（两外壳，R7）================= */
  if (want('E14')) try {
    const res = {};
    for (const [k, url] of [['flow', URL0], ['classic', CLASSIC]]) {
      const pg = await open(b, { tag: 'E14', url });
      res[k] = await EV(pg, () => { __jt({ degs: [[1, 3, 5, 1], [5, 7, 2, 5], [1, 3, 5, 3], [4, 6, 1, 6]] }); __sel('vox', 0, 0); chordLabOpen();
        return new Promise(r => setTimeout(() => { const sc = [...document.querySelectorAll('.cl-sc')]; r({ n: sc.length, over: sc.filter(x => x.scrollWidth > x.clientWidth).map(x => x.scrollWidth + '>' + x.clientWidth).slice(0, 3), has100: sc.some(x => /100%/.test(x.textContent)) }); }, 300)); });
      await close(pg);
    }
    T('E14', ['flow', 'classic'].every(k => res[k].n > 0 && !res[k].over.length && res[k].has100), 'E14 配和弦工作台两外壳：所有 .cl-sc scrollWidth≤clientWidth、含「100%」（基线 60>36）', J(res));
  } catch (e) { T('E14', false, 'E14 组异常（没跑完）', String(e && e.message || e).slice(0, 300)); }

  /* ================= E15 文案落地 ================= */
  if (want('E15')) try {
    const pg = await open(b, { tag: 'E15' });
    const r = await EV(pg, () => { const src = document.documentElement.outerHTML; return { flowHelp: (() => { try { return [...document.scripts].map(s => s.textContent).join('\n').match(/\['级数和弦','选中音符[^\n]*/g) || []; } catch (_) { return []; } })() }; });
    const html = fs.readFileSync(URL0.startsWith('file://') ? URL0.slice(7).replace(/[?#].*$/, '') : path.resolve(__dirname, '../index.html'), 'utf8');
    const site = fs.readFileSync(path.resolve(__dirname, '../site/help.html'), 'utf8');
    const flowLine = (html.match(/\['级数和弦','选中音符按[^\n]*/) || [''])[0];
    const np = (html.match(/if\(h\('C'\)&&h\('S'\)&&h\('J'\)\) return '[^']*'/) || [''])[0];
    T('E15', !!flowLine && !/音轨标题行/.test(flowLine) && /级数构建/.test(flowLine) && /指法编辑/.test(flowLine) && /级数构建器/.test(site) && /指法编辑器/.test(site) && !!np && !/左栏/.test(np),
      'E15 新外壳帮助「级数和弦」条不含「音轨标题行」、讲两个面板；site/help.html 含「级数构建器」「指法编辑器」；新建面板教学对照谱提示不含「左栏」', J({ flowLine: flowLine.slice(0, 80), np, r: r.flowHelp.length }));
    await close(pg);
  } catch (e) { T('E15', false, 'E15 组异常（没跑完）', String(e && e.message || e).slice(0, 300)); }

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
