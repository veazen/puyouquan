'use strict';
/* v69.0 界面简约化 S2 · 悬浮条主按钮（FLOW.nx.resolve / run）——规格 f90 §1 / §4 / §8.1（方案 docs/design-2026-10g P5 / P10 / D1–D3 / D9 / D11）。
   被测页＝默认外壳（flow）；?next=0（只对本次访问）与 ?shell=classic 对拍基线页（git show 4c675f2，与 v68.9 同一份 index.html；env MUSETAB_BASE 覆盖）。
   N0  回退：?next=0 与 ?shell=classic 下 14 种谱 × 空 / 有内容的悬浮条（或谱型条）HTML 与基线页逐字节相同；?next=0 两个配谱弹窗照开、Alt+B 照切换、起步判据（SBAR-14）照旧
   N1  状态表（规格 §1.3 N01–N56 抽代表行）：resolve 字段 + DOM（#flw-sb-go 字 / data-act / data-nx / 有无 ▾ / 步骤类名 / 提示 / 工具）＋ 工作区实底 =（有主按钮?1:0）、行 1 = 1
   N2  执行语义：配伴奏（填进本谱）与 ?next=0 弹窗同参数逐字节 · 补配只改缺口小节 · 范围（从此处 / 选区）只改范围内 · 织体条写入与 #tex-go 同参数逐字节 ·
       钢琴弹唱谱「生成伴奏」同弹窗 · 「标和弦」进级数构建器 · 「生成六线谱」把位菜单 · 「排版」进排版模式 · 一步撤销、Ctrl+Z 逐字节回原
   N3  ▾：项名 ≤6 字、无副标题、锁 + 原因；改参数不改 song / 撤销栈 / 本机键；有选区缺省选区；参数按窗口记、新窗口取会话最近一次
   N4  SBAR-14：织体写入 → 排版；Ctrl+Z → 换织体；Ctrl+Y → 排版；又写音仍完成、连撤 4 次回换织体；撤销后改别的 → 换织体；切窗口再回 → 完成
   N5  换字防误点：指针停在主按钮上续写不换字、离开才换；换字后 <600ms 点无效、650ms 后有效；#lb-live 播报
   N6  Ctrl+Enter 不绑：谱面 / 条内 / 主按钮焦点下按，song、撤销栈、模式、弹窗都不变
   N7  Alt+B：首按聚焦主按钮（不切换展开、不写 musetab-sbar）→ Enter 执行；条内再按＝收起 / 展开；排版模式回书写；#i-lyric 里不响应
   N8  收起态：28 高；有主按钮时（B 轨收起态合入后）摘要 + 主按钮可见可点；空谱时与 v68.9 收起态逐字节
   N9  触屏：点一下出预览 + 「写入 / 取消」、song 不变；写入执行；取消收起；长按 0.5 秒同；无预览动作一下执行
   N10 验收：配伴奏 1 次点击 0 字（无弹窗，只出 ≤12 字结果提示）
   N11 提示条：「已配伴奏 · 第 1–8 小节」+「撤销」；点范围＝整小节选中 1–8 并在可视区；撤销回原
   N12 键盘写 32 小节旋律：按键序列 / 按键数与 ?next=0 相同、最终 song 逐字节相同；全程焦点不离开谱面
   v69.0 收尾（验收发现的回归断言，修前副本应红）：
   N13 单旋律歌谱配伴奏的参数（织体 15 / 产出 / 配和弦）在织体条里可见、结果与 ?next=0 弹窗逐字节（F1-func）；钢琴伴奏歌谱做完后「智能 ▾」配伴奏可选产出
   N14 产出 / 配和弦不串窗（F1-func）· N15 产出非本谱时主按钮不写「补配 N 小节」（F2-func）· N16 收起态留「智能」（F4-func）· N17 Alt+B 文案（F3-func）
   N18 悬停时撤销立即提交（TCH-4）· N19 提示条跳转钮淡出即摘、不进快照（REG-4）· N20 节奏型条起步默认全曲、卡名全文（TCH-5 / TCH-2）
   N21 触屏点织体条 / 节奏型条卡 + 44px 确认钮 + 偏好关时直接执行（TCH-1 / F1-pv / F7-pv / F2-pv）
   env：MUSETAB_URL 被测页 · MUSETAB_BASE 基线页 · ONLY=N1,N2 · SHOTS=目录 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => { const i = u.indexOf('#'), base = i >= 0 ? u.slice(0, i) : u, h = i >= 0 ? u.slice(i) : ''; return base + (base.includes('?') ? '&' : '?') + q + h; };
/* 对拍基线：tests/next_ref.json（完整 SHA；deploy.yml 浅克隆后按它单独补取这一个提交，REG-1）；CI 里拿不到＝判红（REG-6），MUSETAB_BASE=none 是本地显式跳过 */
const NEXT_REF = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'next_ref.json'), 'utf8')); } catch (_) { return {}; } })();
const BASE_COMMIT = process.env.MUSETAB_BASE_COMMIT || NEXT_REF.commit || '4c675f24a1cf48330da74bca3dd29bf492f8fa82';
const BASE_SHORT = BASE_COMMIT.slice(0, 7);
const IN_CI = !!process.env.CI && process.env.MUSETAB_BASE !== 'none';
const BASEU = (() => {
  const e = process.env.MUSETAB_BASE;
  if (e) { const f = e.replace(/^file:\/\//, '').replace(/[?#].*$/, ''); return fs.existsSync(f) ? (e.startsWith('file://') ? e : 'file://' + path.resolve(e)) : ''; }
  try { const txt = require('child_process').execFileSync('git', ['-C', __dirname, 'show', BASE_COMMIT + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
    const f = path.join(require('os').tmpdir(), 'tv_next_base_' + BASE_SHORT + '.html'); fs.writeFileSync(f, txt); return 'file://' + f; } catch (_) { return ''; }
})();
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const SHOTS = process.env.SHOTS || '';
const J = x => JSON.stringify(x);
let pass = 0, total = 0; const OUT = {}, errs = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; (OUT[id] = OUT[id] || []).push((ok ? '✅ ' : '❌ ') + name + (!ok && d != null ? ': ' + String(d).slice(0, 1800) : '')); };
const NOTE = (id, s) => { (OUT[id] = OUT[id] || []).push(s); };

function HELP() {
  window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
  try { hideStartPad(); } catch (_) {}
  window.$i = id => document.getElementById(id);
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false;
    const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; }
    return true; };
  window.__raf2 = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 0))));
  if (!window.__toastW) { window.__toastW = 1; window.__toasts = []; const t0 = window.toast; window.toast = function (m) { try { __toasts.push(String(m)); } catch (_) {} return t0.apply(this, arguments); }; }
  window.__one = s => { addDoc(s, () => {}); while (docs.length > 1) closeDocAt(0); try { closeModal(); } catch (_) {} render(); return s; };
  window.__V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
  window.__melIn = (s, vi, mis) => { mis.forEach(mi => { const m = s.measures[mi], b = m.beats || s.beats, u = m.unit || s.unit; m.voxes[vi] = Array.from({ length: b }, (_, i) => __V(((mi * 3 + i) % 7) + 1, u)); }); return s; };
  window.__accIn = (s, vi, mis) => { mis.forEach(mi => { const m = s.measures[mi], b = m.beats || s.beats, u = m.unit || s.unit; m.voxes[vi] = Array.from({ length: b }, (_, i) => __V(((i + mi) % 5) + 1, u, { oct: -1 })); }); return s; };
  window.__new = (k, o) => { o = o || {}; const s = NWB.build(k, Object.assign({ title: '测' + k, nMea: o.nMea || 8 }, o.b || {})); if (o.mod) o.mod(s); __one(s);
    if (o.meta !== false) LBAR.open(Object.assign({ from: 'new' }, o.meta || {}));
    const tab = (k === 'T' || k === 'ST' || (k === 'JT' && !(o.meta && o.meta.pen === 'J')));
    sel = { mi: 0, row: tab ? 'tab' : 'vox', vi: 0, ci: 0, si: 1 }; blurSel = false; render(); return 1; };
  window.__mel = (mis) => { const mv = lbMelVoices(song); const vi = mv.length ? mv[0] : 0; mutate(() => __melIn(song, vi, mis || song.measures.map((_, i) => i))); return 1; };
  window.__keys = () => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort();
  window.__ls = () => { const o = {}; Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort().forEach(k => { o[k] = localStorage.getItem(k); }); return JSON.stringify(o); };
  window.__shut = () => { try { FLOW.menu.close(); } catch (_) {} try { closePop(); } catch (_) {} try { lbMenuClose(); } catch (_) {} try { closeModal(); } catch (_) {} try { FLOW.nx.tbar.close(false); FLOW.nx.rbar.close(false); } catch (_) {} };
  window.__sig = () => { const m = document.querySelector('#modal-mask .modal'), p = document.getElementById('popmenu');
    return { modal: m ? ((m.querySelector('h3') || {}).textContent || '').trim() + '|' + m.querySelectorAll('button').length + '|' + m.querySelectorAll('input,select,textarea').length : null,
      pop: p ? p.className + '|' + p.querySelectorAll('button').length + '|' + (p.textContent || '').replace(/\s+/g, '').slice(0, 60) : null }; };
  /* 实底判定：按 --btn-pri 的计算色（同「发布」的令牌）；弹窗 / 菜单 / 提示条不算。主按钮与它的 ▾ 是同一个分体按钮（规格 §1.4.1「▾ 是同色分体段」）→ 按 .flw-sb-gog 合计 1 个 */
  window.__solid = () => { const pr = document.createElement('i'); pr.style.background = 'var(--btn-pri)'; document.body.appendChild(pr); const pri = getComputedStyle(pr).backgroundColor; pr.remove();
    const all0 = [...document.querySelectorAll('button,[role="button"],a')].filter(e => __vis(e) && !e.closest('#modal-mask,#popmenu,#toast,.modal-mask') && getComputedStyle(e).backgroundColor === pri);
    const all = [...new Set(all0.map(e => e.closest('.flw-sb-gog') || e))];
    const r1 = all.filter(e => e.closest('#flw-r1')), ws = all.filter(e => !e.closest('#flw-r1'));
    return { pri, r1: r1.length, ws: ws.length, wsIds: ws.map(e => e.id || e.className).join(',') }; };
  window.__bar = () => { const w = $i('flw-sbar'); if (!w) return null; const g = $i('flw-sb-go'), dd = $i('flw-sb-dd'), hi = $i('flw-sb-hint');
    return { sb: w.dataset.sb, ph: w.dataset.ph, go: g && __vis(g) ? { t: (g.querySelector('.flw-sb-l') || g).textContent, act: g.dataset.act, nx: g.dataset.nx, dis: g.getAttribute('aria-disabled') === 'true', nw: !!g.querySelector('.flw-mnw') } : null,
      dd: !!(dd && __vis(dd)), steps: [...w.querySelectorAll('.flw-sb-steps li')].map(li => li.className + ':' + ((li.querySelector('.flw-sb-t') || {}).textContent || '')),
      tools: [...w.querySelectorAll('.flw-sb-tool')].filter(__vis).map(b => b.dataset.v), pri: !!w.querySelector('.flw-sb-tool.pri'), hint: hi && __vis(hi) ? hi.textContent : null }; };
  window.__nx = () => FLOW.sbar.model().nx;
  window.__h = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16) + ':' + s.length; };
  return 1;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const open = async (w, h, o) => {
    o = o || {};
    const ctx = await b.newContext(Object.assign({ viewport: { width: w, height: h }, colorScheme: o.scheme || 'light', deviceScaleFactor: 1 }, o.touch ? { hasTouch: true, isMobile: false } : {}));
    if (o.init) await ctx.addInitScript(o.init);
    const pg = await ctx.newPage(); pg._ctx = ctx; pg._tag = o.tag || '';
    pg.on('pageerror', e => errs.push((o.tag || '') + ' PAGEERR: ' + e.message));
    pg.on('console', m => { if (m.type() === 'error' && /flow|悬浮|预览|织体|nx/.test(m.text())) errs.push((o.tag || '') + ' CONSOLE: ' + m.text()); });
    await pg.goto(o.url || URL0); await pg.waitForTimeout(o.boot || 1200);
    if (o.help !== false) await pg.evaluate(HELP).catch(e => errs.push('HELP: ' + e.message));
    return pg;
  };
  const close = pg => pg._ctx.close().catch(() => {});
  const EV = (pg, f, a) => pg.evaluate(f, a).catch(e => ({ __err: e.message.split('\n')[0] }));
  const wait = (pg, ms) => pg.waitForTimeout(ms);
  const raf = pg => EV(pg, () => __raf2());
  const shot = async (pg, name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, name + '.png') }).catch(() => {}); };
  const SAFE = async (id, name, fn) => { try { await fn(); } catch (e) { T(id, false, name + ' 执行异常', e.message.split('\n')[0]); } };
  const center = async (pg, sel) => { const e = await pg.$(sel); if (!e) return null; const r = await e.boundingBox(); return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; };
  const clickSel = async (pg, sel) => { const c = await center(pg, sel); if (!c) return false; await pg.mouse.click(c.x, c.y); return true; };
  /* 新建一份谱并写满旋律（旋律轨全部小节），等过 600ms 防误点窗口 */
  const KINDS = ['J', 'S', 'SJ', 'JG', 'SG', 'SJG', 'JT', 'T', 'ST', 'G', 'CG', 'CJ', 'CS', 'C'];
  const fillContent = () => { const k = NWB.stackOf(song);
    if (k === 'C' || k === 'CG') { mutate(() => { song.measures[0].voxes[0][0].chord = 'C'; }); }
    else if (k === 'T' || k === 'ST') { mutate(() => { song.measures[0].tabs[0][0].notes = [{ s: 1, f: 3 }]; }); }
    else __mel(); return 1; };

  /* ================= N0 回退对拍（?next=0 / ?shell=classic vs 基线） ================= */
  if (want('N0')) await SAFE('N0', 'N0', async () => {
    if (!BASEU) { if (IN_CI) T('N0', false, 'N0 CI 里拿不到对拍基线（git show ' + BASE_SHORT + ' 失败；deploy.yml 应按 next_ref.json 补取）：?next=0 / ?shell=classic 零差异无法验证，判红'); else NOTE('N0', '⚠️ 拿不到基线页（git show ' + BASE_SHORT + '），N0 逐字节对拍跳过（本地）'); }
    const grab = async (url, tag) => { const pg = await open(1440, 900, { url, tag });
      const out = await EV(pg, async (KINDS) => { const o = {};
        for (const k of KINDS) {
          __new(k, { meta: k === 'JT' ? { pen: 'J' } : undefined }); await __raf2();
          const w = $i('flw-sbar'), lw = $i('lb-wrap');
          o[k + ':0'] = (w ? w.outerHTML : '') + '|' + (lw ? lw.innerHTML : '');
          const kk = NWB.stackOf(song);
          if (kk === 'C' || kk === 'CG') mutate(() => { song.measures[0].voxes[0][0].chord = 'C'; });
          else if (kk === 'T' || kk === 'ST') mutate(() => { song.measures[0].tabs[0][0].notes = [{ s: 1, f: 3 }]; });
          else { const mv = lbMelVoices(song); const vi = mv.length ? mv[0] : 0; mutate(() => __melIn(song, vi, song.measures.map((_, i) => i))); }
          await __raf2();
          o[k + ':1'] = (w ? w.outerHTML : '') + '|' + (lw ? lw.innerHTML : '');
        }
        return o; }, KINDS);
      await close(pg); return out; };
    if (BASEU) {
      const bF = await grab(BASEU, 'N0-base'), nF = await grab(withQ(URL0, 'next=0'), 'N0-next0');
      const diff = Object.keys(bF).filter(k => bF[k] !== nF[k]);
      T('N0', !diff.length && Object.keys(bF).length === 28, 'N0a ?next=0：14 种谱 × 空 / 有内容的 #flw-sbar outerHTML 与基线（' + BASE_SHORT + '）逐字节相同', diff.join(',') + ' ' + (diff[0] ? J([bF[diff[0]].slice(0, 300), nF[diff[0]].slice(0, 300)]) : ''));
      const bC = await grab(withQ(BASEU, 'shell=classic'), 'N0-baseC'), nC = await grab(withQ(URL0, 'shell=classic'), 'N0-classic');
      const dc = Object.keys(bC).filter(k => bC[k] !== nC[k]);
      T('N0', !dc.length && Object.keys(bC).length === 28, 'N0b ?shell=classic：14 种谱 × 2 的谱型条 #lb-wrap 与基线逐字节相同、没有 #flw-sbar', dc.join(','));
    }
    /* ?next=0 行为：两个弹窗照开、无 FLOW.nx 节点、Alt+B 切换、SBAR-14 旧判据 */
    const pg = await open(1440, 900, { url: withQ(URL0, 'next=0'), tag: 'N0-n0' });
    const r = await EV(pg, async () => {
      const o = {};
      __new('JG'); __mel(); await __raf2();
      o.ok = FLOW.nx ? FLOW.nx.ok() : null; o.nx0 = document.body.classList.contains('flw-nx0');
      o.goNx = !!document.querySelector('#flw-sb-go'); o.goOld = !!document.querySelector('#flw-sbar .flw-sb-go[data-act="arrange"]');
      $i('b-arrange').click(); o.arr = !!$i('arr-go'); __shut();
      fillAccompaniment('slow', true); await __raf2();
      $i('b-acctex').click(); o.tex = !!$i('tex-go');
      if ($i('tex-go')) { const r0 = document.querySelector('input[name="tex"][value="arp8"]'); if (r0) r0.checked = true; $i('tex-go').click(); }
      await __raf2();
      o.after = FLOW.sbar.model().steps;
      undo(); await __raf2();
      o.undone = FLOW.sbar.model().steps;   /* v68.9 原判据：撤销后 ③ 仍显示完成（SBAR-14 在 ?next=0 / 旧外壳保留，零差异约束） */
      o.nodes = ['flw-nx-pv', 'flw-nx-tbar', 'flw-nx-rbar', 'flw-nx-cf'].filter(id => $i(id));
      o.pref = (() => { showPrefs(); const t = !!document.querySelector('.prf-row[data-prf="preview"]'); closeModal(); return t; })();
      return o; });
    T('N0', r.ok === false && r.nx0 && !r.goNx && r.arr && r.tex && !r.nodes.length && !r.pref, 'N0c ?next=0：FLOW.nx.ok() 为假、body.flw-nx0；一键配伴奏 / 伴奏织体照旧弹窗；无预览层 / 织体条节点；偏好无「停留预览」', J(r));
    T('N0', J(r.after) === J(['done:写旋律', 'done:配和弦与伴奏', 'done:选织体']) && J(r.undone) === J(r.after), 'N0d ?next=0：起步判据保持 v68.9（伴奏织体弹窗生成后 ③ 打勾，撤销后仍打勾——SBAR-14 只在新外壳修）', J([r.after, r.undone]));
    const ab = await EV(pg, () => { const e0 = FLOW.sbar.expanded(); document.activeElement && document.activeElement.blur(); return e0; });
    await pg.keyboard.press('Alt+KeyB'); await raf(pg);
    const ab2 = await EV(pg, () => ({ exp: FLOW.sbar.expanded(), ls: localStorage.getItem('musetab-sbar') }));
    await pg.keyboard.press('Alt+KeyB'); await raf(pg);
    const ab3 = await EV(pg, () => ({ exp: FLOW.sbar.expanded(), ls: localStorage.getItem('musetab-sbar') }));
    T('N0', ab === true && ab2.exp === false && ab2.ls === '0' && ab3.exp === true && ab3.ls === null, 'N0e ?next=0：Alt+B 仍是 v68.3 的展开 / 收起切换（写 / 删 musetab-sbar）', J([ab, ab2, ab3]));
    await close(pg);
  });

  /* ================= N1 状态表 ================= */
  if (want('N1')) await SAFE('N1', 'N1', async () => {
    const pg = await open(1440, 900, { tag: 'N1' });
    const row = async (name, setup, exp) => {
      const r = await EV(pg, async (setup) => { __shut(); (new Function(setup))(); await __raf2(); await __raf2();
        return { nx: __nx(), bar: __bar(), solid: __solid(), res: (() => { const R = FLOW.nx.resolve('write', NWB.stackOf(song), song, lbMeta()); return { id: R.id, btn: R.btn, act: R.act, dd: R.dd, pv: R.pv, nw: R.nw, why: R.why, phase: R.phase, hint: R.hint, steps: R.steps && R.steps.map(x => x.st + ':' + x.t2) }; })() }; }, setup);
      if (r.__err) { T('N1', false, name, r.__err); return r; }
      const bad = [];
      if (exp.id != null && r.res.id !== exp.id) bad.push('id ' + r.res.id);
      if (exp.btn !== undefined && (r.bar.go ? r.bar.go.t : null) !== exp.btn) bad.push('btn ' + (r.bar.go && r.bar.go.t));
      if (exp.dd != null && r.bar.dd !== exp.dd) bad.push('dd ' + r.bar.dd);
      if (exp.steps && J(r.bar.steps) !== J(exp.steps)) bad.push('steps ' + J(r.bar.steps));
      if (exp.hint !== undefined && r.bar.hint !== exp.hint) bad.push('hint ' + r.bar.hint);
      if (exp.tools && J(r.bar.tools) !== J(exp.tools)) bad.push('tools ' + J(r.bar.tools));
      if (exp.nw != null && !!(r.bar.go && r.bar.go.nw) !== exp.nw) bad.push('nw');
      if (exp.why != null && r.res.why !== exp.why) bad.push('why ' + r.res.why);
      if (exp.pv !== undefined && r.res.pv !== exp.pv) bad.push('pv ' + r.res.pv);
      if (r.bar.pri) bad.push('.pri 强调工具还在');
      const wsWant = r.bar.go && !r.bar.go.dis ? 1 : (r.bar.go ? (r.solid.ws <= 1 ? r.solid.ws : -1) : 0);
      if (r.solid.ws !== wsWant || r.solid.r1 !== 1) bad.push('实底 工作区 ' + r.solid.ws + '（' + r.solid.wsIds + '）行1 ' + r.solid.r1);
      T('N1', !bad.length, name, bad.join(' · ') + ' | ' + J(r.res));
      return r;
    };
    const newK = (k, o) => '__new("' + k + '"' + (o ? ',' + o : '') + ');';
    const MEL = '__mel();';
    await row('N01 简谱歌谱空谱：无主按钮、提示「按 1–7 写音」、工具 填词·和弦·配和弦·配伴奏', newK('J'), { id: 'none', btn: null, hint: '按 1–7 写音', tools: ['lyr', 'chord', 'board'] });   /* v69.1 C（S12）：生成工具只在「智能 ▾」画廊，常用工具补「键盘」 */
    await row('N02 简谱歌谱有音：主按钮「排版」（无 ▾）', newK('J') + MEL, { id: 'engrave', btn: '排版', dd: false, hint: null });
    await row('N03 简谱三声部合唱有音：排版、工具里没有「配伴奏」', newK('J') + 'mutate(()=>{ song.voxVoices=["女高","女低","男低"]; song.measures.forEach(m=>{ m.voxes=[m.voxes[0], blankVoxCols(4,4), blankVoxCols(4,4)]; }); });' + MEL, { id: 'engrave', btn: '排版', tools: ['lyr', 'chord', 'board'] });
    await row('N04 五线谱旋律空：无主按钮、和弦·配和弦·配伴奏', newK('S'), { id: 'none', btn: null, tools: ['chord', 'board'] });
    await row('N05 五线谱旋律有音：排版', newK('S') + MEL, { id: 'engrave', btn: '排版' });
    await row('N06 教学对照谱空：提示「写一行 另一行同步」', newK('SJ'), { id: 'none', btn: null, hint: '写一行 另一行同步' });
    await row('N07 教学对照谱有音：排版', newK('SJ') + MEL, { id: 'engrave', btn: '排版' });
    await row('N08 钢琴伴奏歌谱旋律空：① 当前、无主按钮、提示「按 1–7 写音」', newK('JG'), { id: 'hint', btn: null, steps: ['now:旋律', 'todo:伴奏', 'todo:织体'], hint: '按 1–7 写音' });
    await row('N09 钢琴伴奏歌谱旋律有音：「配伴奏」+ ▾、预览 fill', newK('JG') + MEL, { id: 'arrange', btn: '配伴奏', dd: true, steps: ['done:旋律', 'now:伴奏', 'todo:织体'], pv: 'fill', nw: false });
    await row('N10 同 N09 框选第 3–6 小节：仍「配伴奏」（范围＝选区，见 N3）', newK('JG') + MEL + 'measureRange={m1:2,m2:5}; render();', { id: 'arrange', btn: '配伴奏', pv: 'fill' });
    await row('N11 同 N09 ▾ 选「对照谱 ↗」：主按钮带 ↗、无预览', newK('JG') + MEL + 'FLOW.nx.act("nx:out",{dataset:{v:"teach"}},{detail:1}); render();', { id: 'arrange', btn: '配伴奏', nw: true, pv: null });
    /* N11 把产出改成了对照谱（参数按窗口记、新窗口取会话最近一次，N3d）→ 本行先回「填进本谱」 */
    await row('N12 伴奏已配后续写 3 小节旋律（缺口）：「补配 3 小节」、预览 fill-gap', newK('JG', '{nMea:8}') + 'FLOW.nx.act("nx:out",{dataset:{v:"fill"}},{detail:1}); __mel([0,1,2,3,4]); fillAccompaniment("block", true); __mel([5,6,7]);', { id: 'arrange-gap', btn: '补配 3 小节', pv: 'fill-gap', steps: ['done:旋律', 'now:伴奏', 'todo:织体'] });
    await row('N13 ② 完成（新建流程）：「换织体」+ ▾、主按钮无预览', newK('JG') + MEL + 'fillAccompaniment("block", true);', { id: 'tex', btn: '换织体', dd: true, pv: null, steps: ['done:旋律', 'done:伴奏', 'now:织体'] });
    await row('N14 ② 完成、非新建流程（无 LB_META）：③ 自动完成、主按钮「排版」、工具 织体·和弦·填词·配和弦', newK('JG', '{meta:false}') + MEL + 'fillAccompaniment("block", true);', { id: 'engrave', btn: '排版', tools: ['chord', 'lyr', 'deg', 'board'] });
    await row('N21 导入人声＋钢琴（伴奏来自文件）：③ 显示当前、主按钮「排版」、提示「伴奏来自文件」', newK('JG', '{meta:{from:"import",target:"orig"}}') + 'mutate(()=>{ __melIn(song,0,[0,1,2,3,4,5,6,7]); __accIn(song,1,[0,1,2,3,4,5,6,7]); __accIn(song,2,[0,1,2,3,4,5,6,7]); });',
      { id: 'engrave', btn: '排版', steps: ['done:旋律', 'done:伴奏', 'now:织体'], hint: '伴奏来自文件' });
    await row('N22 5/4 拍钢琴伴奏歌谱 ②：「配伴奏」锁住（5/4 暂无织体）、无预览', newK('JG', '{b:{beats:5,unit:4}}') + MEL, { id: 'arrange', btn: '配伴奏', why: '5/4 暂无织体', pv: null });
    await row('N23 五线谱钢琴伴奏歌谱 ②：配伴奏', newK('SG') + MEL, { id: 'arrange', btn: '配伴奏' });
    await row('N24 五线谱钢琴伴奏歌谱 ③（新建流程）：换织体', newK('SG') + MEL + 'fillAccompaniment("block", true);', { id: 'tex', btn: '换织体' });
    await row('N25 教学对照谱（含伴奏）②：配伴奏', newK('SJG') + MEL, { id: 'arrange', btn: '配伴奏' });
    await row('N27 吉他弹唱（从简谱写起）旋律空：① 当前、提示', newK('JT', '{meta:{pen:"J"}}'), { id: 'hint', btn: null, steps: ['now:旋律', 'todo:吉他', 'todo:节奏'] });
    await row('N28 吉他弹唱旋律有音、无六线谱：「生成六线谱」、无 ▾', newK('JT', '{meta:{pen:"J"}}') + MEL, { id: 'tabgen', btn: '生成六线谱', dd: false, pv: null });
    await row('N28u 尤克里里弹唱：「生成四线谱」', newK('JT', '{meta:{pen:"J"},b:{inst:"uku"}}') + 'song.inst="uku"; render();' + MEL, { id: 'tabgen', btn: '生成四线谱' });
    await row('N30 吉他弹唱 ② 完成（新建流程）：「节奏型」', newK('JT', '{meta:{pen:"J"}}') + MEL + 'mutate(()=>{ song.measures.forEach(m=>{ m.tabs[0][0].notes=[{s:2,f:1}]; }); });', { id: 'rhy', btn: '节奏型', steps: ['done:旋律', 'done:吉他', 'now:节奏'] });
    await row('N33 吉他弹唱 ② 完成后手加扫弦：③ 完成、排版', newK('JT', '{meta:{pen:"J"}}') + MEL + 'mutate(()=>{ song.measures.forEach(m=>{ m.tabs[0][0].notes=[{s:2,f:1}]; }); song.measures[0].tabs[0][0].strum="d"; });', { id: 'engrave', btn: '排版' });
    await row('N34 打开的弹唱谱（无 LB_META、已有六线谱）：排版', newK('JT', '{meta:false}') + MEL + 'mutate(()=>{ song.measures.forEach(m=>{ m.tabs[0][0].notes=[{s:2,f:1}]; }); });', { id: 'engrave', btn: '排版' });
    await row('N35 吉他弹唱（从六线谱写起）空谱：无起步、提示「↑↓ 选弦 数字写品位」', newK('JT'), { id: 'none', btn: null, hint: '↑↓ 选弦 数字写品位' });
    await row('N37 吉他谱空：提示、工具 和弦·节奏型·和弦图·指板', newK('T'), { id: 'none', btn: null, tools: ['chord', 'diag', 'board'] });
    await row('N38 吉他谱有音：排版', newK('T') + 'mutate(()=>{ song.measures[0].tabs[0][0].notes=[{s:1,f:3}]; });', { id: 'engrave', btn: '排版' });
    await row('N39 吉他独奏谱空：提示「写六线谱 五线谱同步」', newK('ST'), { id: 'none', btn: null, hint: '写六线谱 五线谱同步' });
    await row('N41 钢琴独奏谱空：工具 键盘·指法·和弦·织体', newK('G'), { id: 'none', btn: null, tools: ['board', 'fing', 'chord'] });
    await row('N42 钢琴独奏谱有音：排版', newK('G') + 'mutate(()=>__melIn(song,0,[0,1]));', { id: 'engrave', btn: '排版' });
    await row('N43 钢琴弹唱谱无和弦：「标和弦」、无 ▾', newK('CG'), { id: 'chord', btn: '标和弦', dd: false, steps: ['now:和弦', 'todo:织体'] });
    await row('N44 钢琴弹唱谱已标和弦、两手无音：「生成伴奏」+ ▾、预览 texgen', newK('CG') + 'mutate(()=>{ song.measures.forEach(m=>{ m.voxes[0][0].chord="C"; }); });', { id: 'texgen', btn: '生成伴奏', dd: true, pv: 'texgen', steps: ['done:和弦', 'now:织体'] });
    /* 两步都完成＝条进常用工具阶段（同 v68.9：最后一步完成后不再显示步骤，规格 N14 / N45 同口径），主按钮「排版」 */
    await row('N46 钢琴弹唱谱标了和弦又手写伴奏音：② 按内容完成（进工具阶段）、排版', newK('CG') + 'mutate(()=>{ song.measures[0].voxes[0][0].chord="C"; __accIn(song,1,[0]); });', { id: 'engrave', btn: '排版', steps: [] });
    await row('N47 功能谱空：提示「写旋律 Ctrl+K 标和弦」', newK('CJ'), { id: 'none', btn: null, hint: '写旋律 Ctrl+K 标和弦' });
    await row('N48 功能谱有音：排版', newK('CJ') + MEL, { id: 'engrave', btn: '排版' });
    await row('N49 五线谱和弦谱有音：排版', newK('CS') + MEL, { id: 'engrave', btn: '排版' });
    await row('N50 和弦谱空：提示「选一拍 Ctrl+K 写和弦」、工具 和弦·级数·段落', newK('C'), { id: 'none', btn: null, hint: '选一拍 Ctrl+K 写和弦', tools: ['chord', 'deg', 'mea'] });
    await row('N51 和弦谱有和弦：排版', newK('C') + 'mutate(()=>{ song.measures[0].voxes[0][0].chord="C"; });', { id: 'engrave', btn: '排版' });
    /* N55 / N56：v69.1 S3 B 轨起排版 / 输出模式悬浮条按模式换内容（D12，规格 f91 B1.1 / B2.1）——新形态：排版 resolve＝fix（修 N 处）或 output（N＝0，TCH-7），输出 resolve＝export（存 PDF），条可见；
       ?next=0 的「resolve none、条 hidden」由 tv_layout2 L0 / tv_output2 O0 守 */
    const md = await EV(pg, async () => { __new('J'); __mel(); await __raf2(); const R = FLOW.nx.resolve('engrave', 'J', song, lbMeta()), R2 = FLOW.nx.resolve('output', 'J', song, lbMeta());
      setMode('engrave'); await __raf2(); const vis = getComputedStyle($i('flw-sbar')).visibility; setMode('write'); await __raf2(); return { a: R.id, b: R2.id, vis }; });
    T('N1', (md.a === 'fix' || md.a === 'output') && md.b === 'export' && md.vis === 'visible', 'N55 / N56 排版 / 输出模式（新形态，v69.1 S3）：排版 resolve＝修 N 处 / 输出、输出 resolve＝存 PDF，悬浮条可见（?next=0 的 none / hidden 见 tv_layout2 L0 / tv_output2 O0）', J(md));
    /* 14 种谱：resolve 与 DOM 一致（btn＝条上字、id＝data-nx） */
    const all = await EV(pg, async (KINDS) => { const bad = [];
      for (const k of KINDS) for (const st of [0, 1]) {
        __new(k, { meta: k === 'JT' ? { pen: 'J' } : undefined });
        if (st) { const kk = NWB.stackOf(song); if (kk === 'C' || kk === 'CG') mutate(() => { song.measures[0].voxes[0][0].chord = 'C'; }); else if (kk === 'T' || kk === 'ST') mutate(() => { song.measures[0].tabs[0][0].notes = [{ s: 1, f: 3 }]; }); else __mel(); }
        await __raf2();
        const R = FLOW.nx.resolve('write', NWB.stackOf(song), song, lbMeta()), g = $i('flw-sb-go'), s = __solid();
        const t = g ? (g.querySelector('.flw-sb-l') || g).textContent : '';
        if ((R.btn || '') !== t || (g && g.dataset.nx !== R.id) || s.r1 !== 1 || s.ws !== (R.btn && !R.why ? 1 : 0) || [...String(R.btn || '').replace(/[0-9 ]/g, '')].length > 6) bad.push(k + st + ' ' + JSON.stringify([R.id, R.btn, t, s.ws, s.r1]));
      }
      return bad; }, KINDS);
    T('N1', Array.isArray(all) && !all.length, 'N1z 14 种谱 × 空 / 有内容：条上主按钮字＝resolve.btn（≤4 字，数字与「…谱」专名除外）、data-nx＝id；工作区实底＝有主按钮?1:0、行 1「发布」＝1', J(all));
    await close(pg);
  });

  /* ================= N2 执行语义 ================= */
  if (want('N2')) await SAFE('N2', 'N2', async () => {
    const A = await open(1440, 900, { tag: 'N2-nx' });
    const B = await open(1440, 900, { url: withQ(URL0, 'next=0'), tag: 'N2-n0' });
    const setJG = async pg => EV(pg, async () => { __new('JG'); __mel(); await __raf2(); return 1; });
    /* N2a 配伴奏（填进本谱）：主按钮 vs ?next=0 弹窗（同织体 / 同产出 / 空小节配和弦） */
    await setJG(A); await setJG(B); await wait(A, 650);
    const a0 = await EV(A, () => ({ s: JSON.stringify(song), u: undoStack.length }));
    await clickSel(A, '#flw-sb-go'); await raf(A);
    const a1 = await EV(A, () => ({ s: JSON.stringify(song), u: undoStack.length, modal: !!$i('modal-mask') }));
    await EV(B, () => { $i('b-arrange').click(); const o = $i('arr-out'); o.value = 'fill'; $i('arr-sug').checked = true; $i('arr-go').click(); return 1; }); await raf(B);
    const b1 = await EV(B, () => JSON.stringify(song));
    T('N2', a1.s === b1 && a1.u === a0.u + 1 && !a1.modal && a1.s !== a0.s, 'N2a 配伴奏：主按钮直接执行（无弹窗）、结果与 ?next=0 弹窗同参数逐字节相同、只多一步撤销', J({ same: a1.s === b1, du: a1.u - a0.u, modal: a1.modal }));
    await A.keyboard.press('Control+z'); await raf(A);
    const a2 = await EV(A, () => JSON.stringify(song));
    T('N2', a2 === a0.s, 'N2b 配伴奏后 Ctrl+Z 一步回原（逐字节）', a2.length + ' vs ' + a0.s.length);
    /* N2c 对照谱 / 纯伴奏（新窗口）：与弹窗同结果（比较 measures / voxVoices / texId） */
    for (const out of ['teach', 'pure']) {
      await setJG(A); await setJG(B);
      const ra = await EV(A, async (out) => { FLOW.nx.act('nx:out', { dataset: { v: out } }, { detail: 1 }); await __raf2(); await new Promise(r => setTimeout(r, 650)); const n0 = docs.length;
        $i('flw-sb-go').click(); await new Promise(r => setTimeout(r, 400)); const s = song; const o = { n: docs.length - n0, j: JSON.stringify([s.voxVoices, s.measures, s.texId, s.pianoAcc || false]) };
        FLOW.nx.act('nx:out', { dataset: { v: 'fill' } }, { detail: 1 }); return o; }, out);
      const rb = await EV(B, async (out) => { const n0 = docs.length; $i('b-arrange').click(); $i('arr-out').value = out; $i('arr-go').click(); await new Promise(r => setTimeout(r, 400)); const s = song; return { n: docs.length - n0, j: JSON.stringify([s.voxVoices, s.measures, s.texId, s.pianoAcc || false]) }; }, out);
      T('N2', ra.n === 1 && rb.n === 1 && ra.j === rb.j, 'N2c 产出「' + (out === 'teach' ? '对照谱' : '纯伴奏') + ' ↗」：新窗口打开、与 ?next=0 弹窗同结果', J({ na: ra.n, nb: rb.n, same: ra.j === rb.j }));
    }
    /* N2d 补配：只改缺口小节 */
    const gap = await EV(A, async () => { __new('JG'); __mel([0, 1, 2, 3, 4]); fillAccompaniment('block', true); __mel([5, 6, 7]); await __raf2(); await new Promise(r => setTimeout(r, 650));
      const before = song.measures.map(m => JSON.stringify(m)); const g = $i('flw-sb-go'); const t = g && g.textContent; g.click(); await __raf2();
      const after = song.measures.map(m => JSON.stringify(m)); const ch = after.map((x, i) => x !== before[i] ? i : -1).filter(i => i >= 0);
      return { t, ch, gap: FLOW.nx.gapList(song).length }; });
    T('N2', /补配 3 小节/.test(gap.t || '') && J(gap.ch) === J([5, 6, 7]) && gap.gap === 0, 'N2d 「补配 3 小节」只改缺口小节（第 6–8 小节），其余小节 JSON 不变', J(gap));
    /* N2e 范围：从此处 / 选区 */
    const rg = await EV(A, async () => { const o = {};
      __new('JG'); __mel(); await __raf2(); sel.mi = 4; render(); FLOW.nx.act('nx:rg', { dataset: { v: 'from' } }, { detail: 1 }); await new Promise(r => setTimeout(r, 650));
      let before = song.measures.map(m => JSON.stringify([m.voxes[1], m.voxes[2]])); $i('flw-sb-go').click(); await __raf2();
      o.from = song.measures.map((m, i) => JSON.stringify([m.voxes[1], m.voxes[2]]) !== before[i] ? i : -1).filter(i => i >= 0);
      FLOW.nx.act('nx:rg', { dataset: { v: 'all' } }, { detail: 1 });
      __new('JG'); __mel(); await __raf2(); measureRange = { m1: 1, m2: 2 }; render(); await new Promise(r => setTimeout(r, 650));
      before = song.measures.map(m => JSON.stringify([m.voxes[1], m.voxes[2]])); $i('flw-sb-go').click(); await __raf2();
      o.sel = song.measures.map((m, i) => JSON.stringify([m.voxes[1], m.voxes[2]]) !== before[i] ? i : -1).filter(i => i >= 0);
      return o; });
    T('N2', J(rg.from) === J([4, 5, 6, 7]) && J(rg.sel) === J([1, 2]), 'N2e 范围参数不丢：▾「第 5 小节起」只改 5–8 小节；框选第 2–3 小节时只改 2–3', J(rg));
    /* N2f 织体条写入 vs #tex-go（钢琴伴奏歌谱 ③，arp8 全曲 + 空小节配和弦） */
    const tw = async (pg, nx) => EV(pg, async (nx) => { __new('JG'); __mel(); fillAccompaniment('block', true); await __raf2(); await new Promise(r => setTimeout(r, 650));
      const u0 = undoStack.length;
      if (nx) { $i('flw-sb-go').click(); await __raf2(); const c = document.querySelector('#flw-nx-tbar [role="option"][data-v="arp8"]'); if (!c) return { err: 'no card' }; c.click(); await __raf2(); }
      else { $i('b-acctex').click(); document.querySelector('input[name="tex"][value="arp8"]').checked = true; $i('tex-go').click(); await __raf2(); }
      return { s: JSON.stringify(song), du: undoStack.length - u0 }; }, nx);
    const ta = await tw(A, true), tb = await tw(B, false);
    T('N2', ta.s && ta.s === tb.s && ta.du === 1, 'N2f 织体条点卡写入与 ?next=0「伴奏织体」弹窗同参数逐字节相同、一步撤销', J({ same: ta.s === tb.s, du: ta.du, err: ta.err }));
    /* N2g 钢琴弹唱谱「生成伴奏」vs 弹窗（缺省织体 / 全曲） */
    const cg = async (pg, nx) => EV(pg, async (nx) => { __new('CG'); mutate(() => { song.measures.forEach(m => { m.voxes[0][0].chord = 'C'; }); }); await __raf2(); await new Promise(r => setTimeout(r, 650));
      if (nx) { $i('flw-sb-go').click(); } else { $i('b-acctex').click(); $i('tex-go').click(); } await __raf2(); return JSON.stringify(song); }, nx);
    const ca = await cg(A, true), cb = await cg(B, false);
    T('N2', ca && ca === cb, 'N2g 钢琴弹唱谱 ②「生成伴奏」直接执行，与弹窗缺省参数逐字节相同', ca && cb ? ca.length + '/' + cb.length : J([ca, cb]));
    /* N2h 标和弦 → 级数构建器 · 生成六线谱 → 把位菜单 · 排版 → 排版模式 */
    const ch = await EV(A, async () => { __new('CG'); await __raf2(); await new Promise(r => setTimeout(r, 650)); $i('flw-sb-go').click(); await __raf2(); const o = { ck: !!$i('ck-in') }; __shut(); return o; });
    T('N2', ch.ck, 'N2h 钢琴弹唱谱 ①「标和弦」打开完整和弦引擎（#ck-in 级数构建器，v68.9 同签名）', J(ch));
    const tg = async (pg) => EV(pg, async () => { __new('JT', { meta: { pen: 'J' } }); __mel(); await __raf2(); await new Promise(r => setTimeout(r, 650));
      const g = document.querySelector('#flw-sbar [data-fa="sbar:go"]'); g.click(); await __raf2(); const s = __sig(); __shut(); return s; });
    const tga = await tg(A), tgb = await tg(B);
    T('N2', (tga.pop || tga.modal) && J(tga) === J(tgb), 'N2i 吉他弹唱 ②「生成六线谱」打开把位菜单 / 弹窗（同一个 lbGo("tabgen")），与 ?next=0 同签名', J([tga, tgb]));
    const eg = await EV(A, async () => { __new('J'); __mel(); await __raf2(); await new Promise(r => setTimeout(r, 650)); $i('flw-sb-go').click(); await __raf2(); const m = FLOW.mode.cur; setMode('write'); return m; });
    T('N2', eg === 'engrave', 'N2j 主按钮「排版」进排版模式（D11）', eg);
    await close(A); await close(B);
  });

  /* ================= N3 ▾ ================= */
  if (want('N3')) await SAFE('N3', 'N3', async () => {
    const pg = await open(1440, 900, { tag: 'N3' });
    await EV(pg, async () => { __new('JG'); __mel(); await __raf2(); return 1; });
    const s0 = await EV(pg, () => ({ s: JSON.stringify(song), u: undoStack.length, ls: __ls() }));
    await clickSel(pg, '#flw-sb-dd'); await raf(pg);
    const m = await EV(pg, () => { const p = $i('popmenu'); if (!p) return null;
      const items = [...p.querySelectorAll('[data-fa]')].map(b => ({ t: (b.querySelector('.flw-ml') || b).textContent.replace(/[↗]/g, '').trim(), fa: b.dataset.fa, v: b.dataset.v || '', dis: b.getAttribute('aria-disabled') === 'true', why: b.dataset.why || '', ck: b.getAttribute('aria-checked'), sub: !!b.querySelector('.flw-md,small') }));
      return { m: p.dataset.m, items, hd: [...p.querySelectorAll('.flw-mh')].map(x => x.textContent) }; });
    const L = t => [...String(t).replace(/[0-9–\- …]/g, '')].length;
    const badLen = (m && m.items || []).filter(x => L(x.t) > 6 || x.sub).map(x => x.t);
    T('N3', m && m.m === 'sbGo' && J(m.hd) === J(['范围', '产出']) && !badLen.length && m.items.some(x => x.fa === 'nx:out' && x.v === 'fill' && x.ck === 'true') && m.items.some(x => x.fa === 'nx:sug' && x.ck === 'true'),
      'N3a ▾ 菜单 #popmenu[data-m=sbGo]：「范围」「产出」两组、名称 ≤6 字无副标题、缺省产出「填进本谱」、空小节配和弦勾上', J(m));
    const lk = (m && m.items || []).find(x => x.fa === 'nx:rg' && x.v === 'sel');
    T('N3', lk && lk.dis && lk.why === '先框选小节', 'N3b 没有选区时「选区」锁住并带原因「先框选小节」（≤16 字、不隐藏）', J(lk));
    await EV(pg, () => { const b = document.querySelector('#popmenu [data-fa="nx:out"][data-v="teach"]'); b.click(); return 1; }); await raf(pg);
    const s1 = await EV(pg, () => ({ s: JSON.stringify(song), u: undoStack.length, ls: __ls(), menu: !!$i('popmenu'), nw: !!document.querySelector('#flw-sb-go .flw-mnw'), ck: (document.querySelector('#popmenu [data-fa="nx:out"][data-v="teach"]') || {}).getAttribute && document.querySelector('#popmenu [data-fa="nx:out"][data-v="teach"]').getAttribute('aria-checked') }));
    T('N3', s1.s === s0.s && s1.u === s0.u && s1.ls === s0.ls && s1.menu && s1.nw && s1.ck === 'true', 'N3c 选「对照谱」：只改参数——song / 撤销栈 / musetab-* 本机键全不变，菜单不关、主按钮带 ↗', J({ s: s1.s === s0.s, u: s1.u - s0.u, ls: s1.ls === s0.ls, menu: s1.menu, nw: s1.nw }));
    await EV(pg, () => { FLOW.menu.close(); return 1; });
    /* 新窗口取会话最近一次的范围类参数（织体范围「从此处」）；配伴奏的「产出」不沿用（v69.0 收尾 F1-func 有意迁移：看不见 ▾ 的窗口不带别处选的产出，N14）——新窗口回缺省「填进本谱」；有选区缺省「选区」 */
    const nw = await EV(pg, async () => { const p0 = FLOW.nx.arrP('arrange').out; FLOW.nx.act('nx:trg', { dataset: { v: 'from' } }, { detail: 1 }); const s = NWB.build('JG', { title: 'B', nMea: 8 }); addDoc(s, () => {}); LBAR.open({ from: 'new' }); __mel(); await __raf2();
      /* 产出对照谱 / 纯伴奏＝新窗口按全曲（▾ 范围项锁「新窗口按全曲」，规格 §1.4.3）→ 先回「填进本谱」再看选区缺省 */
      const p1 = FLOW.nx.arrP('arrange').out, tr = FLOW.nx.texP().range; FLOW.nx.act('nx:out', { dataset: { v: 'fill' } }, { detail: 1 }); measureRange = { m1: 2, m2: 4 }; render(); const p2 = FLOW.nx.arrP('arrange'); return { p0, p1, tr, r: p2.range, a: p2.m1, b: p2.m2 }; });
    T('N3', nw.p0 === 'teach' && nw.p1 === 'fill' && nw.tr === 'from' && nw.r === 'sel' && nw.a === 2 && nw.b === 4, 'N3d 参数按窗口记、新窗口取本次会话最近一次的范围（不写本机键），产出不串窗（回缺省）；有选区缺省按选区（engraver 要求范围参数不丢）', J(nw));
    await close(pg);
  });

  /* ================= N4 SBAR-14 ================= */
  if (want('N4')) await SAFE('N4', 'N4', async () => {
    const pg = await open(1440, 900, { tag: 'N4' });
    const st = () => EV(pg, () => ({ id: __nx().id, steps: FLOW.sbar.model().steps.map(x => x.split(':')[0]).join(','), tex: song.texId || '' }));
    await EV(pg, async () => { __new('JG'); __mel(); fillAccompaniment('block', true); await __raf2(); await new Promise(r => setTimeout(r, 650)); $i('flw-sb-go').click(); await __raf2();
      document.querySelector('#flw-nx-tbar [role="option"][data-v="arp8"]').click(); await __raf2(); FLOW.nx.tbar.close(false); document.activeElement && document.activeElement.blur(); return 1; });
    const s15 = await st();
    await pg.keyboard.press('Control+z'); await raf(pg); const s16 = await st();
    await pg.keyboard.press('Control+y'); await raf(pg); const s17 = await st();
    T('N4', s15.id === 'engrave' && s15.steps === 'done,done,done' && s16.id === 'tex' && s16.steps === 'done,done,now' && s16.tex === 'block' && s17.id === 'engrave' && s17.tex === 'arp8',
      'N4a N15→N16→N17：织体条写入后「排版」；Ctrl+Z 回到 ③「换织体」（修 SBAR-14）；Ctrl+Y 又完成', J([s15, s16, s17]));
    await EV(pg, () => { sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); return 1; });
    for (const k of ['5', '6', '7']) await pg.keyboard.press(k);
    await raf(pg); const s18 = await st();
    for (let i = 0; i < 3; i++) await pg.keyboard.press('Control+z');
    await raf(pg); const s18b = await st();
    await pg.keyboard.press('Control+z'); await raf(pg); const s18c = await st();
    T('N4', s18.id === 'engrave' && s18b.id === 'engrave' && s18c.id === 'tex', 'N4b N18：写入后又写 3 个音仍「排版」；撤 3 次仍完成，第 4 次撤掉织体回「换织体」', J([s18, s18b, s18c]));
    await pg.keyboard.press('Control+y'); await raf(pg); await pg.keyboard.press('Control+z'); await raf(pg);
    await EV(pg, () => { sel = { mi: 1, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); return 1; });
    await pg.keyboard.press('3'); await raf(pg); const s19 = await st();
    T('N4', s19.id === 'tex', 'N4c N19：撤销织体后改了别的音（重做栈清空）仍是「换织体」', J(s19));
    /* 主按钮刚在撤销 / 重做里换过字：等过 600ms 防误点再点（N5） */
    const s20 = await EV(pg, async () => { const d = docs[curDocI]; await new Promise(r => setTimeout(r, 650)); $i('flw-sb-go').click(); await __raf2(); document.querySelector('#flw-nx-tbar [role="option"][data-v="block"]').click(); await __raf2(); FLOW.nx.tbar.close(false);
      const a = __nx().id; const s = NWB.build('J', { title: 'x', nMea: 4 }); addDoc(s, () => {}); await __raf2(); switchDocTo(docs.indexOf(d)); await __raf2(); return { a, b: __nx().id, u: undoStack.length }; });
    T('N4', s20.a === 'engrave' && s20.b === 'engrave', 'N4d N20：写入后切到别的窗口再切回（撤销历史清空）＝永久完成「排版」', J(s20));
    await close(pg);
  });

  /* ================= N5 换字防误点 ================= */
  if (want('N5')) await SAFE('N5', 'N5', async () => {
    const pg = await open(1440, 900, { tag: 'N5' });
    await EV(pg, async () => { __new('JG'); __mel([0, 1, 2, 3, 4]); fillAccompaniment('block', true); await __raf2(); return 1; });
    await wait(pg, 700);
    const c = await center(pg, '#flw-sb-go'); await pg.mouse.move(c.x, c.y); await wait(pg, 120);
    await EV(pg, () => { sel = { mi: 6, row: 'vox', vi: 0, ci: 0, si: 1 }; blurSel = false; render(); return 1; });
    for (const k of ['1', '2', '3', '5']) await pg.keyboard.press(k);
    await raf(pg);
    const h1 = await EV(pg, () => ({ t: $i('flw-sb-go').textContent, r: FLOW.nx.resolve('write', 'JG', song, lbMeta()).btn }));
    await pg.mouse.move(c.x, c.y + 300); await wait(pg, 60); await raf(pg);
    const h2 = await EV(pg, () => ({ t: $i('flw-sb-go').textContent, live: ($i('lb-live') || {}).textContent || '' }));
    T('N5', /换织体/.test(h1.t) && /补配 1 小节/.test(h1.r) && /补配 1 小节/.test(h2.t), 'N5a 指针停在主按钮上时键盘续写出现缺口：字不换（仍「换织体」）；指针离开后才换成「补配 1 小节」', J([h1, h2]));
    const s0 = await EV(pg, () => ({ s: JSON.stringify(song), u: undoStack.length }));
    const c2 = await center(pg, '#flw-sb-go'); await pg.mouse.click(c2.x, c2.y); await raf(pg);
    const s1 = await EV(pg, () => ({ s: JSON.stringify(song), u: undoStack.length }));
    await wait(pg, 650);
    await pg.mouse.click(c2.x, c2.y); await raf(pg);
    const s2 = await EV(pg, () => ({ s: JSON.stringify(song), u: undoStack.length }));
    T('N5', s1.s === s0.s && s1.u === s0.u && s2.u === s0.u + 1 && s2.s !== s0.s, 'N5b 换字后 600ms 内点击无效（song / 撤销栈不变）、650ms 后点击有效', J({ early: s1.u - s0.u, late: s2.u - s0.u }));
    await wait(pg, 120);
    const live = await EV(pg, () => ($i('lb-live') || {}).textContent || '');
    T('N5', /可点「(换织体|排版)」/.test(live) || /第 3 步/.test(live), 'N5c 换字经 #lb-live（role=status）播报', live);
    await close(pg);
  });

  /* ================= N6 Ctrl+Enter 不绑 ================= */
  if (want('N6')) await SAFE('N6', 'N6', async () => {
    const pg = await open(1440, 900, { tag: 'N6' });
    await EV(pg, async () => { __new('JG'); __mel(); await __raf2(); return 1; }); await wait(pg, 650);
    const snap = () => EV(pg, () => ({ s: __h(JSON.stringify(song)), u: undoStack.length, m: FLOW.mode.cur, md: !!$i('modal-mask'), tb: FLOW.nx.tbar.isOpen() }));
    const s0 = await snap();
    await EV(pg, () => { document.activeElement && document.activeElement.blur(); return 1; }); await pg.keyboard.press('Control+Enter'); await raf(pg); const s1 = await snap();
    await EV(pg, () => { $i('flw-sb-kind').focus(); return 1; }); await pg.keyboard.press('Control+Enter'); await raf(pg); const s2 = await snap();
    await EV(pg, () => { $i('flw-sb-go').focus(); return 1; }); await pg.keyboard.press('Control+Enter'); await raf(pg); const s3 = await snap();
    T('N6', J(s1) === J(s0) && J(s2) === J(s0) && J(s3) === J(s0), 'N6 不设 Ctrl+Enter（D3，留给「此处换页」）：谱面 / 条内 / 主按钮焦点下按，song、撤销栈、模式、弹窗都不变', J([s0, s1, s2, s3]));
    await close(pg);
  });

  /* ================= N7 Alt+B ================= */
  if (want('N7')) await SAFE('N7', 'N7', async () => {
    const pg = await open(1440, 900, { tag: 'N7' });
    await EV(pg, async () => { __new('JG'); __mel(); await __raf2(); document.activeElement && document.activeElement.blur(); return 1; }); await wait(pg, 650);
    await pg.keyboard.press('Alt+KeyB'); await raf(pg);
    const a = await EV(pg, () => ({ ae: document.activeElement && document.activeElement.id, exp: FLOW.sbar.expanded(), ls: localStorage.getItem('musetab-sbar') }));
    T('N7', a.ae === 'flw-sb-go' && a.exp === true && a.ls === null, 'N7a Alt+B 首按：焦点落到主按钮，展开态不变、不写 musetab-sbar', J(a));
    const u0 = await EV(pg, () => undoStack.length);
    await pg.keyboard.press('Enter'); await raf(pg);
    const e = await EV(pg, () => ({ u: undoStack.length, acc: lbHasNote(song, 1), modal: !!$i('modal-mask') }));
    T('N7', e.u === u0 + 1 && e.acc && !e.modal, 'N7b 聚焦主按钮后按 Enter＝点主按钮（配伴奏直接写入）', J(e));
    await EV(pg, () => { $i('flw-sb-kind').focus(); return 1; });
    await pg.keyboard.press('Alt+KeyB'); await raf(pg);
    const c1 = await EV(pg, () => ({ exp: FLOW.sbar.expanded(), ls: localStorage.getItem('musetab-sbar'), ae: document.activeElement && document.activeElement.id }));
    await pg.keyboard.press('Alt+KeyB'); await raf(pg);
    const c2 = await EV(pg, () => ({ exp: FLOW.sbar.expanded(), ls: localStorage.getItem('musetab-sbar') }));
    T('N7', c1.exp === false && c1.ls === '0' && c2.exp === true && c2.ls === null, 'N7c 焦点已在条内再按 Alt+B＝收起 / 展开（保住 v68.3 收起手势，写 / 删 musetab-sbar）', J([c1, c2]));
    await EV(pg, () => { setMode('engrave'); document.activeElement && document.activeElement.blur(); return 1; }); await raf(pg);
    await pg.keyboard.press('Alt+KeyB'); await raf(pg);
    const m = await EV(pg, () => ({ m: FLOW.mode.cur, ae: document.activeElement && document.activeElement.id }));
    T('N7', m.m === 'write' && m.ae === 'flw-sb-go', 'N7d 排版模式 Alt+B：回书写并聚焦主按钮', J(m));
    /* 填词框：同 tv_sbar SB8 的进法（FLOW.tree.lyrEdit 打开填词、焦点落 #i-lyric） */
    const ly = await EV(pg, async () => { const i = $i('i-lyric'); if (!i) return { skip: 1 }; FLOW.sbar.toggle({ exp: true }); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; render(); FLOW.tree.lyrEdit(); await __raf2(); if (document.activeElement !== i) i.focus(); return { ok: document.activeElement === i }; });
    if (!ly.ok) T('N7', false, 'N7e 填词框 #i-lyric 拿到焦点（前提）', J(ly));
    else { await pg.keyboard.press('Alt+KeyB'); await raf(pg); const ly2 = await EV(pg, () => ({ ae: document.activeElement && document.activeElement.id, exp: FLOW.sbar.expanded() }));
      T('N7', ly2.ae === 'i-lyric' && ly2.exp === true, 'N7e 填词框 #i-lyric 里 Alt+B 不响应', J(ly2)); }
    await close(pg);
  });

  /* ================= N8 收起态 ================= */
  if (want('N8')) await SAFE('N8', 'N8', async () => {
    const pg = await open(1440, 900, { tag: 'N8' });
    const r = await EV(pg, async () => { __new('JG'); __mel(); await __raf2(); FLOW.sbar.toggle({ exp: false }); await __raf2();
      const bar = $i('flw-sb-bar'), g = document.querySelector('#flw-sbar .flw-sb-gc');
      const o = { h: Math.round(bar.getBoundingClientRect().height), gc: !!g };
      if (g) { const q = g.getBoundingClientRect(), e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); o.hit = !!e && (e === g || g.contains(e)); o.vis = __vis(g); }
      __new('J'); await __raf2(); o.empty = bar.innerHTML; FLOW.sbar.toggle({ exp: true }); return o; });
    T('N8', r.h === 28, 'N8a 收起态条高 28（v68.3 几何不变）', J(r.h));
    if (r.gc) T('N8', r.hit && r.vis, 'N8b 收起态带主按钮（B 轨收起态）：紧凑主按钮在条内、可见、中心命中自己', J(r));
    else NOTE('N8', 'ℹ️ 收起态的紧凑主按钮由 B 轨（FLOW.sbar 收起分支调 FLOW.nx.goHTML(m,{col:1})）提供，本轨单测时跳过 N8b');
    if (BASEU) { const pb = await open(1440, 900, { url: BASEU, tag: 'N8-base' });
      const be = await EV(pb, async () => { __new('J'); await __raf2(); FLOW.sbar.toggle({ exp: false }); await __raf2(); const h = $i('flw-sb-bar').innerHTML; FLOW.sbar.toggle({ exp: true }); return h; });
      await close(pb);
      const re = await EV(pg, async () => { __new('J'); await __raf2(); FLOW.sbar.toggle({ exp: false }); await __raf2(); const h = $i('flw-sb-bar').innerHTML; FLOW.sbar.toggle({ exp: true }); return h; });
      T('N8', re === be, 'N8c 空谱（没有主按钮）时收起态与 v68.9 逐字节相同', re.length + ' vs ' + be.length); }
    else if (IN_CI) T('N8', false, 'N8c CI 里拿不到对拍基线（' + BASE_SHORT + '），判红');
    await close(pg);
  });

  /* ================= N9 触屏 ================= */
  if (want('N9')) await SAFE('N9', 'N9', async () => {
    const pg = await open(1440, 900, { tag: 'N9', touch: true });
    await EV(pg, async () => { __new('JG'); __mel(); await __raf2(); return 1; }); await wait(pg, 650);
    const s0 = await EV(pg, () => ({ s: JSON.stringify(song), u: undoStack.length }));
    const c = await center(pg, '#flw-sb-go'); await pg.touchscreen.tap(c.x, c.y); await wait(pg, 500); await raf(pg);
    const t1 = await EV(pg, () => ({ s: JSON.stringify(song), u: undoStack.length, cf: !!$i('flw-nx-cf'), pv: ($i('flw-nx-pv') || {}).dataset ? $i('flw-nx-pv').dataset.st : null,
      btns: [...document.querySelectorAll('#flw-nx-cf button')].map(b => b.textContent) }));
    T('N9', t1.s === s0.s && t1.u === s0.u && t1.cf && t1.pv === 'on' && J(t1.btns) === J(['写入', '取消']), 'N9a 触屏点一下主按钮：只出预览 + 「写入 / 取消」（各 ≤4 字），song 不变', J({ same: t1.s === s0.s, cf: t1.cf, pv: t1.pv, b: t1.btns }));
    const cc = await center(pg, '#flw-nx-cf [data-fa="nx:cancel"]'); await pg.touchscreen.tap(cc.x, cc.y); await raf(pg);
    const t2 = await EV(pg, () => ({ s: JSON.stringify(song), cf: !!$i('flw-nx-cf'), pv: $i('flw-nx-pv').dataset.st }));
    T('N9', t2.s === s0.s && !t2.cf && t2.pv !== 'on', 'N9b 「取消」：收起预览与确认条，song 不变', J(t2));
    await pg.touchscreen.tap(c.x, c.y); await wait(pg, 400);
    const cw = await center(pg, '#flw-nx-cf [data-fa="nx:write"]'); if (cw) await pg.touchscreen.tap(cw.x, cw.y); await raf(pg);
    const t3 = await EV(pg, () => ({ u: undoStack.length, acc: lbHasNote(song, 1), cf: !!$i('flw-nx-cf') }));
    T('N9', t3.u === s0.u + 1 && t3.acc && !t3.cf, 'N9c 「写入」：执行配伴奏（一步撤销）', J(t3));
    /* 长按 0.5 秒＝悬停（PointerEvent pointerType=touch） */
    await EV(pg, async () => { __new('JG'); __mel(); await __raf2(); return 1; }); await wait(pg, 650);
    const lp = await EV(pg, async () => { const g = $i('flw-sb-go'), r = g.getBoundingClientRect(), o = { bubbles: true, cancelable: true, pointerType: 'touch', clientX: r.left + 5, clientY: r.top + 5, isPrimary: true, pointerId: 7 };
      g.dispatchEvent(new PointerEvent('pointerdown', o)); await new Promise(r => setTimeout(r, 650)); const cf = !!$i('flw-nx-cf'), pv = $i('flw-nx-pv') && $i('flw-nx-pv').dataset.st;
      g.dispatchEvent(new PointerEvent('pointerup', o)); const ce = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); const ok = g.dispatchEvent(ce);
      return { cf, pv, ctx: !ok, u: undoStack.length }; });
    T('N9', lp.cf && lp.pv === 'on', 'N9d 长按 0.5 秒＝悬停：出预览 + 确认条', J(lp));
    await EV(pg, () => { __shut(); FLOW.nx.act('nx:cancel', {dataset:{}}, {detail:1}); return 1; });
    /* 无预览的动作（换织体）：点一下直接执行（打开织体条） */
    await EV(pg, async () => { __new('JG'); __mel(); fillAccompaniment('block', true); await __raf2(); return 1; }); await wait(pg, 650);
    const c4 = await center(pg, '#flw-sb-go'); await pg.touchscreen.tap(c4.x, c4.y); await raf(pg);
    const t4 = await EV(pg, () => ({ tb: FLOW.nx.tbar.isOpen(), cf: !!$i('flw-nx-cf') }));
    T('N9', t4.tb && !t4.cf, 'N9e 无预览的动作（换织体）触屏点一下直接执行（打开织体条）', J(t4));
    await close(pg);
  });

  /* ================= N10 / N11 验收：1 次点击 0 字 + 提示条范围 ================= */
  if (want('N10') || want('N11')) await SAFE('N10', 'N10', async () => {
    const pg = await open(1440, 900, { tag: 'N10' });
    await EV(pg, async () => { __new('JG'); __mel(); await __raf2(); window.__mm = 0; new MutationObserver(() => { if ($i('modal-mask')) __mm++; }).observe(document.body, { childList: true }); window.__toasts.length = 0; return 1; });
    await wait(pg, 650);
    const s0 = await EV(pg, () => JSON.stringify(song));
    await clickSel(pg, '#flw-sb-go'); await raf(pg);
    const r = await EV(pg, () => { const t = $i('toast'); const tx = [...t.childNodes].filter(n => !(n.classList && n.classList.contains('flw-ta'))).map(n => n.textContent).join('');
      return { mm: __mm, acc: lbHasNote(song, 1), tx, n: [...tx.replace(/[0-9–\- ·]/g, '')].length, act: (t.querySelector('.flw-ta') || {}).textContent || '', k: t.dataset.k, j: !!t.querySelector('.flw-tj') }; });
    T('N10', r.mm === 0 && r.acc && r.n <= 12 && r.act === '撤销' && r.k === 'res', 'N10 验收：配伴奏 1 次点击即写入伴奏、期间无 #modal-mask、提示条短文 ≤12 字（读数不计）+「撤销」', J(r));
    T('N11', r.tx === '已配伴奏 · 第 1–8 小节' && r.j, 'N11a 提示条「已配伴奏 · 第 1–8 小节」，范围可点', J(r.tx));
    await EV(pg, async () => { $i('score-wrap').scrollTop = 99999; await __raf2(); return 1; });
    const tj = await center(pg, '#toast .flw-tj'); if (tj) await pg.mouse.click(tj.x, tj.y); await raf(pg); await wait(pg, 200);
    const j = await EV(pg, () => { const b = colBoxes['v0:0:0'], svg = $i('score'), R = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, k = R.width / vb.width, y = R.top + b.y * k, sw = $i('score-wrap').getBoundingClientRect();
      return { mr: measureRange, mi: sel.mi, inView: y >= sw.top && y <= sw.bottom }; });
    T('N11', j.mr && j.mr.m1 === 0 && j.mr.m2 === 7 && j.mi === 0 && j.inView, 'N11b 点范围＝整小节选中第 1–8 小节、第 1 小节跟滚到可视区', J(j));
    const ub = await center(pg, '#toast .flw-ta');
    if (ub) await pg.mouse.click(ub.x, ub.y); await raf(pg);
    const s2 = await EV(pg, () => JSON.stringify(song));
    T('N11', s2 === s0, 'N11c 提示条「撤销」回原（逐字节）', s2.length + ' vs ' + s0.length);
    await close(pg);
  });

  /* ================= N12 键盘写 32 小节旋律 ================= */
  if (want('N12')) await SAFE('N12', 'N12', async () => {
    const seq = []; for (let i = 0; i < 32; i++) seq.push(...['1', '2', '3', '5'].map((d, j) => String(((+d + i + j) % 7) + 1)));
    const runK = async (url, tag) => { const pg = await open(1440, 900, { url, tag });
      await EV(pg, async () => { __new('JG', { nMea: 32 }); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; blurSel = false; render(); document.activeElement && document.activeElement.blur(); await __raf2(); return 1; });
      let leave = 0, n = 0;
      for (const k of seq) { await pg.keyboard.press(k); n++; if (n % 16 === 0) { const a = await EV(pg, () => { const ae = document.activeElement; return !!(ae && ae.closest && ae.closest('#flw-sbar, #popmenu, #flw-nx-tbar')); }); if (a) leave++; } }
      const r = await EV(pg, () => ({ h: __h(JSON.stringify(song.measures.map(m => m.voxes))), btn: (FLOW.sbar.model().nx || {}).btn || FLOW.sbar.model().go }));
      await close(pg); return Object.assign(r, { leave, n }); };
    const a = await runK(URL0, 'N12-nx'), c = await runK(withQ(URL0, 'next=0'), 'N12-n0');
    T('N12', a.n === 128 && c.n === 128 && a.h === c.h && a.leave === 0 && a.btn === '配伴奏', 'N12 键盘写 32 小节旋律：同一串 128 键，与 ?next=0 结果逐字节相同、全程焦点不离开谱面、写完主按钮「配伴奏」', J({ a, c }));
  });

  /* ================= v69.0 收尾（验收发现的回归断言；修前副本 f90v/prefix.html 上应红） ================= */
  /* N13 F1-func：单旋律歌谱（J / S / SJ）的「配伴奏」——v68.9 弹窗里的织体 15 种、产出三选一、空小节配和弦在新外壳里都有看得见的控件（先断言可见再点），
     结果与 ?next=0 弹窗同参数逐字节相同（新窗口 song 去掉 id）；钢琴伴奏歌谱起步做完后「智能 ▾」配伴奏卡同样能选产出 */
  if (want('N13')) await SAFE('N13', 'N13', async () => {
    const A = await open(1440, 900, { tag: 'N13' }), B = await open(1440, 900, { url: withQ(URL0, 'next=0'), tag: 'N13-n0' });
    const strip = () => { const o = JSON.parse(JSON.stringify(song)); delete o.id; return { s: JSON.stringify(o), title: song.title, docs: docs.length, acc: (song.measures || []).reduce((n, m) => n + (m.voxes || []).slice(1).reduce((k, r) => k + (r || []).filter(c => c && c.deg > 0).length, 0), 0) }; };
    for (const k of ['J', 'S', 'SJ']) {
      for (const [out, sug, tex] of [['teach', true, 'block'], ['pure', false, 'arp8']].concat(k === 'J' ? [['fill', true, 'halfbrk']] : [])) {
        /* ?next=0：v68.9 弹窗 */
        await EV(B, async (k) => { __new(k); __mel(); await __raf2(); return 1; }, k);
        await wait(B, 650);
        const okB = await EV(B, async ({ out, sug, tex }) => { $i('b-arrange').click(); await __raf2(); const r = document.querySelector('input[name="arr-tex"][value="' + tex + '"]'); if (!r) return 'no-radio';
          r.checked = true; const opts = [...$i('arr-out').options].map(o => o.value).join(','); $i('arr-out').value = out; $i('arr-sug').checked = sug; $i('arr-go').click(); await new Promise(z => setTimeout(z, 400)); await __raf2(); return opts; }, { out, sug, tex });
        const rB = await EV(B, strip);
        /* 新外壳：悬浮条工具「配伴奏」（先断言可见）→ 织体条配伴奏模式 */
        await EV(A, async (k) => { __shut(); __new(k); __mel(); await __raf2(); return 1; }, k);
        await wait(A, 650);
        /* v69.1 C 迁移（规格 S12）：新形态常用工具不再放「配伴奏」（家＝「智能 ▾」画廊同名卡 + 起步主按钮）——条上没有时先开画廊、断言卡可见再点，到达同一织体条配伴奏模式 */
        let tool = await EV(A, () => { const b = document.querySelector('#flw-sbar .flw-sb-tool[data-v="arr"]'); return !!(b && __vis(b)); });
        if (tool) await clickSel(A, '#flw-sbar .flw-sb-tool[data-v="arr"]');
        else { await clickSel(A, '#flw-sb-smart'); await raf(A); tool = await EV(A, () => { const c = document.querySelector('#popmenu .flw-gc[data-v="arr"]'); return !!(c && __vis(c) && c.getAttribute('aria-disabled') !== 'true'); });
          if (tool) await clickSel(A, '#popmenu .flw-gc[data-v="arr"]'); }
        await raf(A);
        const bar = await EV(A, () => { const t = $i('flw-nx-tbar'); if (!t || !__vis(t)) return null;
          return { mode: FLOW.nx.state() && FLOW.nx.tbar.isOpen(), outs: [...t.querySelectorAll('[data-fa="nx:out"]')].filter(__vis).map(b => b.dataset.v + ':' + b.getAttribute('aria-pressed')),
            sug: (t.querySelector('[data-fa="nx:sug"]') || {}).getAttribute ? t.querySelector('[data-fa="nx:sug"]').getAttribute('aria-pressed') : null, sugVis: __vis(t.querySelector('[data-fa="nx:sug"]')),
            more: !!(t.querySelector('[data-fa="nx:tall"]') && __vis(t.querySelector('[data-fa="nx:tall"]'))), song: JSON.stringify(song).length, docs: docs.length }; });
        let nAll = 0, picked = null;
        if (bar) {
          await clickSel(A, '#flw-nx-tbar [data-fa="nx:tall"]'); await raf(A);
          nAll = await EV(A, () => [...document.querySelectorAll('#flw-nx-tbar [role="option"]')].length);
          await clickSel(A, '#flw-nx-tbar [data-fa="nx:out"][data-v="' + out + '"]'); await raf(A);
          if (!sug) { await clickSel(A, '#flw-nx-tbar [data-fa="nx:sug"]'); await raf(A); }
          picked = await EV(A, (tex) => { const c = document.querySelector('#flw-nx-tbar [role="option"][data-v="' + tex + '"]'); if (!c) return null; c.scrollIntoView({ inline: 'center', block: 'nearest' }); return 1; }, tex);
          if (picked) { await clickSel(A, '#flw-nx-tbar [role="option"][data-v="' + tex + '"]'); await wait(A, 400); await raf(A); }
        }
        const rA = await EV(A, strip);
        const nAv = await EV(A, () => texAvail(song.beats, song.unit).length);
        const outsA = bar ? bar.outs.map(x => x.split(':')[0]).join(',') : '', defA = bar ? (bar.outs.find(x => /:true$/.test(x)) || '').split(':')[0] : '';
        T('N13', tool && bar && typeof okB === 'string' && outsA === okB && defA === 'teach' && bar.sugVis && bar.sug === 'true' && bar.more && nAll === nAv && nAv >= 15 && rA.s === rB.s && rA.docs === (out === 'fill' ? 1 : 2) && rA.acc > 0 === (rB.acc > 0),
          'N13 ' + k + '：悬浮条「配伴奏」可见 → 织体条（产出＝v68.9 弹窗同一组选项 ' + okB + '、缺省对照谱 ↗，补和弦、全部 ' + nAv + ' 种织体都可见）；产出 ' + out + ' · 配和弦 ' + (sug ? '开' : '关') + ' · ' + tex + ' 与 ?next=0 弹窗新窗口逐字节相同',
          J({ tool, bar, nAll, nAv, okB, same: rA.s === rB.s, titles: [rA.title, rB.title], docs: [rA.docs, rB.docs], acc: [rA.acc, rB.acc] }));
      }
    }
    /* 「智能 ▾」配伴奏卡（J，先断言可见）同样打开织体条配伴奏模式，不直接执行 */
    await EV(A, async () => { __shut(); __new('J'); __mel(); await __raf2(); return 1; }); await wait(A, 650);
    await clickSel(A, '#flw-sb-smart'); await raf(A);
    const gv = await EV(A, () => { const c = document.querySelector('#popmenu .flw-gc[data-v="arr"]'); return !!(c && __vis(c) && c.getAttribute('aria-disabled') !== 'true'); });
    const d0 = await EV(A, () => docs.length);
    if (gv) await clickSel(A, '#popmenu .flw-gc[data-v="arr"]'); await raf(A);
    const g1 = await EV(A, () => ({ tb: FLOW.nx.tbar.isOpen(), outs: [...document.querySelectorAll('#flw-nx-tbar [data-fa="nx:out"]')].filter(__vis).length, docs: docs.length }));
    T('N13', gv && g1.tb && g1.outs >= 2 && g1.docs === d0, 'N13d 「智能 ▾」配伴奏卡（简谱歌谱）：打开织体条配伴奏模式、产出可选，不直接开新窗口', J({ gv, g1, d0 }));
    /* 钢琴伴奏歌谱配好伴奏之后：「智能 ▾」配伴奏卡 → 织体条带「填进本谱 / 对照谱 / 纯伴奏」三项（v68.9 弹窗三选一），选对照谱点卡＝新窗口，原谱不动 */
    await EV(A, async () => { __shut(); __new('JG'); __mel(); fillAccompaniment('block', true); await __raf2(); return 1; }); await wait(A, 650);
    await clickSel(A, '#flw-sb-smart'); await raf(A); await clickSel(A, '#popmenu .flw-gc[data-v="arr"]'); await raf(A);
    const noId = s => { const o = JSON.parse(JSON.stringify(s)); delete o.id; return JSON.stringify(o); };
    const jg = await EV(A, () => { const o = JSON.parse(JSON.stringify(song)); delete o.id; return { tb: FLOW.nx.tbar.isOpen(), outs: [...document.querySelectorAll('#flw-nx-tbar [data-fa="nx:out"]')].filter(__vis).map(b => b.dataset.v), s0: JSON.stringify(o), d0: docs.length }; });
    await clickSel(A, '#flw-nx-tbar [data-fa="nx:out"][data-v="teach"]'); await raf(A);
    await clickSel(A, '#flw-nx-tbar [role="option"]'); await wait(A, 400); await raf(A);
    const jg2 = await EV(A, (s0) => { const o = docs[0] && JSON.parse(JSON.stringify(docs[0].song)); if (o) delete o.id; return { docs: docs.length, title: song.title, orig: !!o && JSON.stringify(o) === s0, tb: FLOW.nx.tbar.isOpen() }; }, jg.s0);
    T('N13', jg.tb && J(jg.outs) === J(['fill', 'teach', 'pure']) && jg2.docs === jg.d0 + 1 && /对照/.test(jg2.title) && jg2.orig && !jg2.tb,
      'N13e 钢琴伴奏歌谱起步做完后：「智能 ▾」配伴奏 → 织体条带产出三项（填进本谱 / 对照谱 / 纯伴奏）；选对照谱点卡＝新窗口、原谱逐字节不动、条随原窗口收起', J({ jg: Object.assign({}, jg, { s0: undefined }), jg2 }));
    await close(A); await close(B);
  });

  /* N14 F1-func 串窗：钢琴伴奏歌谱 ▾ 里选「纯伴奏」、关掉「空小节配和弦」，再新建一份简谱歌谱——新窗口的产出 / 配和弦回到缺省（不沿用看不见的参数） */
  if (want('N14')) await SAFE('N14', 'N14', async () => {
    const A = await open(1440, 900, { tag: 'N14' });
    await EV(A, async () => { __new('JG'); __mel(); await __raf2(); return 1; }); await wait(A, 650);
    await EV(A, () => { FLOW.nx.act('nx:out', { dataset: { v: 'pure' } }, { detail: 1 }); FLOW.nx.act('nx:sug', { dataset: {} }, { detail: 1 }); return 1; });
    const p0 = await EV(A, () => FLOW.nx.params().arr);
    await EV(A, async () => { __new('J'); __mel(); await __raf2(); return 1; }); await wait(A, 650);
    const p1 = await EV(A, () => { const P = FLOW.nx.arrP('arrange'); return { out: P.out, sug: P.sug }; });
    await EV(A, () => { FLOW.nx.run('arrange', { src: 'gal' }); return 1; }); await raf(A);
    await clickSel(A, '#flw-nx-tbar [role="option"]'); await wait(A, 400); await raf(A);
    const r = await EV(A, () => ({ title: song.title, acc: (song.measures || []).reduce((n, m) => n + (m.voxes || []).slice(1).reduce((k, x) => k + (x || []).filter(c => c && c.deg > 0).length, 0), 0), toast: (__toasts || []).slice(-1)[0] }));
    T('N14', p0.out === 'pure' && p0.sug === false && p1.out === 'teach' && p1.sug === true && /伴奏对照谱/.test(r.title) && r.acc > 0,
      'N14 别的窗口 ▾ 里选的「纯伴奏」与关掉的「空小节配和弦」不串到新窗口：简谱歌谱配伴奏＝对照谱、配了和弦（伴奏有音）', J({ p0, p1, r }));
    await close(A);
  });

  /* N15 F2-func：伴奏行有手写音（不是本工具生成，产出缺省＝对照谱新窗口）时，主按钮不写「补配 N 小节」，写「配伴奏 ↗」，点了＝新窗口全曲 */
  if (want('N15')) await SAFE('N15', 'N15', async () => {
    const A = await open(1440, 900, { tag: 'N15' });
    await EV(A, async () => { __new('JG'); __mel([0, 1, 2, 3]); mutate(() => { __accIn(song, 1, [0, 1]); }); await __raf2(); return 1; }); await wait(A, 650);
    const b0 = await EV(A, () => ({ bar: __bar(), nx: __nx(), out: FLOW.nx.arrP('arrange').out }));
    await clickSel(A, '#flw-sb-go'); await wait(A, 400); await raf(A);
    const r = await EV(A, () => ({ docs: docs.length, title: song.title, toast: (__toasts || []).slice(-1)[0] }));
    T('N15', b0.out === 'teach' && b0.bar.go && b0.bar.go.t === '配伴奏' && b0.bar.go.nw && b0.nx.id === 'arrange' && r.docs === 2 && /对照/.test(r.title),
      'N15 手写伴奏 + 产出缺省对照谱：主按钮「配伴奏 ↗」（不写「补配 N 小节」），点了＝新窗口对照谱，字与结果一致', J({ b0, r }));
    await close(A);
  });

  /* N16 F4-func：悬浮条收起（有主按钮）时「智能」仍在：可见、中心命中自己，点开画廊（6 卡）且不展开悬浮条；?next=0 收起态没有它 */
  if (want('N16')) await SAFE('N16', 'N16', async () => {
    const A = await open(1440, 900, { tag: 'N16' });
    await EV(A, async () => { __new('JG'); __mel(); await __raf2(); FLOW.sbar.toggle({ exp: false }); await __raf2(); return 1; }); await wait(A, 650);
    const v = await EV(A, () => { const b = $i('flw-sb-smart'); if (!b) return null; const q = b.getBoundingClientRect(), e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
      return { vis: __vis(b), hit: !!e && (e === b || b.contains(e)), h: Math.round($i('flw-sb-bar').getBoundingClientRect().height), lab: b.getAttribute('aria-label'), txt: b.textContent.trim() }; });
    if (v) await clickSel(A, '#flw-sb-smart'); await raf(A);
    const g = await EV(A, () => ({ gal: FLOW.gal.isOpen(), n: document.querySelectorAll('#popmenu .flw-gc').length, exp: FLOW.sbar.expanded() }));
    await EV(A, () => { __shut(); FLOW.sbar.toggle({ exp: true }); return 1; });
    T('N16', v && v.vis && v.hit && v.h === 28 && v.txt === '智能' && g.gal && g.n === 6 && !g.exp, 'N16 收起态带「智能」：可见可点（条高仍 28），点开「智能 ▾」画廊 6 卡、悬浮条不展开', J({ v, g }));
    await close(A);
  });

  /* N17 F3-func：新形态 Alt+B 首按聚焦主按钮——收起 / 展开钮的悬停与帮助快捷键表不再写「展开 / 收起（Alt+B）」；?next=0 保持 v68.9 原文 */
  if (want('N17')) await SAFE('N17', 'N17', async () => {
    const grab = async (url, tag) => { const p = await open(1440, 900, { url, tag });
      const o = await EV(p, async () => { __new('JG'); __mel(); await __raf2(); const t1 = ($i('flw-sb-tg') || {}).title; FLOW.sbar.toggle({ exp: false }); await __raf2();
        const t2 = ($i('flw-sb-tgc') || $i('flw-sb-tg') || {}).title, t3 = ($i('flw-sb-tg') || {}).title; FLOW.sbar.toggle({ exp: true });
        $i('b-help').click(); await __raf2(); const row = [...document.querySelectorAll('#modal-mask .hd-row')].find(r => /Alt\+N/.test(r.textContent)); const h = row ? row.textContent : ''; closeModal(); return { t1, t2, t3, h }; });
      await close(p); return o; };
    const a = await grab(URL0, 'N17'), n = await grab(withQ(URL0, 'next=0'), 'N17-n0');
    T('N17', a.t1 === '收起' && a.t2 === '展开' && a.t3 === '展开' && /聚焦主按钮/.test(a.h) && !/展开 · 收起/.test(a.h) && n.t1 === '收起（Alt+B）' && /展开 · 收起/.test(n.h),
      'N17 新形态：收起 / 展开钮悬停「收起」「展开」、帮助快捷键「新建 / 聚焦主按钮」；?next=0 仍是「收起（Alt+B）」「悬浮条展开 · 收起」', J({ a, n }));
  });

  /* N18 TCH-4：鼠标停在主按钮上配伴奏后按 Ctrl+Z——步骤点与主按钮立即回到「② 伴奏 · 配伴奏」（撤销也是一次操作完成），600ms 后再点＝配伴奏、不打开织体条 */
  if (want('N18')) await SAFE('N18', 'N18', async () => {
    const A = await open(1440, 900, { tag: 'N18' });
    await EV(A, async () => { __new('JG'); __mel(); await __raf2(); return 1; }); await wait(A, 650);
    const c = await center(A, '#flw-sb-go'); await A.mouse.move(c.x, c.y); await wait(A, 120); await A.mouse.click(c.x, c.y); await wait(A, 700); await raf(A);
    const b1 = await EV(A, () => ({ go: (__bar().go || {}).t, acc: lbHasNote(song, 1) }));
    await A.keyboard.press('Control+z'); await wait(A, 200); await raf(A);
    const b2 = await EV(A, () => ({ go: (__bar().go || {}).t, steps: __bar().steps, acc: lbHasNote(song, 1) }));
    await wait(A, 650); await A.mouse.click(c.x, c.y); await wait(A, 300); await raf(A);
    const b3 = await EV(A, () => ({ acc: lbHasNote(song, 1), tb: FLOW.nx.tbar.isOpen() }));
    T('N18', b1.go === '换织体' && b1.acc && b2.go === '配伴奏' && /now:伴奏/.test(J(b2.steps)) && !b2.acc && b3.acc && !b3.tb,
      'N18 鼠标停在主按钮上：配伴奏 → Ctrl+Z 后条立即回到「② 伴奏 · 配伴奏」，再点＝配伴奏（不打开织体条）', J({ b1, b2, b3 }));
    await close(A);
  });

  /* N19 REG-4：提示条淡出后「第 a–b 小节」跳转钮摘成纯文字——原位置点谱面不再被它截走（measureRange / 光标不动）；显示期间的互动谱快照里也没有提示条按钮 */
  if (want('N19')) await SAFE('N19', 'N19', async () => {
    const A = await open(1440, 900, { tag: 'N19' });
    await EV(A, async () => { __new('JG', { nMea: 16 }); __mel(); await __raf2(); return 1; }); await wait(A, 650);
    await EV(A, () => { FLOW.nx.run('arrange', { src: 'go' }); return 1; }); await raf(A);
    const s1 = await EV(A, () => { const b = document.querySelector('#toast .flw-tj'), q = b && b.getBoundingClientRect(); const snap = FLOW.snapHTML();
      const doc2 = new DOMParser().parseFromString(snap, 'text/html'), t2 = doc2.getElementById('toast');
      return { tj: !!b, r: q ? [q.left + q.width / 2, q.top + q.height / 2] : null, snapTj: !!(t2 && t2.querySelector('button, [data-tj], [data-ta]')), snapTxt: t2 ? t2.textContent : null }; });
    await wait(A, 6500);
    const s2 = await EV(A, (r) => { sel.mi = 11; measureRange = null; render(); const e = r && document.elementFromPoint(r[0], r[1]);
      return { tj: !!document.querySelector('#toast .flw-tj'), hit: e ? (e.closest('#toast') ? 'toast' : (e.id || e.tagName)) : null, txt: ($i('toast') || {}).textContent }; }, s1.r);
    if (s1.r) await A.mouse.click(s1.r[0], s1.r[1]); await raf(A);
    const s3 = await EV(A, () => ({ mr: measureRange, mi: sel.mi }));
    T('N19', s1.tj && !s1.snapTj && !s2.tj && s2.hit !== 'toast' && !(s3.mr && s3.mr.m1 === 0) && /第 1–16 小节/.test(s2.txt || ''),
      'N19 提示条淡出后跳转钮换回纯文字：原位置 elementFromPoint 不再命中提示条、点了 measureRange 不变；显示期间互动谱快照不带跳转 / 撤销钮', J({ s1, s2, s3 }));
    await close(A);
  });

  /* N20 TCH-5 / TCH-2：吉他弹唱起步第 ③ 步从主按钮打开节奏型条＝范围「全曲」（同织体条），点一张卡套全曲；从工具「节奏型」打开仍是「本小节」（v68.9 节奏型库口径）；
     卡名＝标准名全文（不截字串），同一条里不重名 */
  if (want('N20')) await SAFE('N20', 'N20', async () => {
    const A = await open(1440, 900, { tag: 'N20' });
    await EV(A, async () => { __new('JT', { meta: { pen: 'J' } }); __mel(); mutate(() => { song.measures.forEach((m, i) => { m.voxes[0][0].chord = ['C', 'Am', 'F', 'G'][i % 4]; m.tabs[0][0].notes = [{ s: 2, f: 1 }]; }); }); await __raf2(); return 1; });
    await wait(A, 700);
    const b0 = await EV(A, () => ({ go: (__bar().go || {}).t }));
    await clickSel(A, '#flw-sb-go'); await raf(A);
    const r1 = await EV(A, () => { const t = $i('flw-nx-rbar'); if (!t) return null; const cs = [...t.querySelectorAll('[role="option"]')];
      return { rg: (t.querySelector('[data-fa="nx:rrg"][aria-pressed="true"]') || {}).dataset ? t.querySelector('[data-fa="nx:rrg"][aria-pressed="true"]').dataset.v : null,
        names: cs.map(c => c.querySelector('.flw-nx-nm').textContent), full: cs.map(c => c.getAttribute('aria-label')) }; });
    await clickSel(A, '#flw-nx-rbar [role="option"]'); await wait(A, 300); await raf(A);
    const r2 = await EV(A, () => ({ toast: ($i('toast') || {}).textContent, go: (__bar().go || {}).t }));
    await EV(A, () => { __shut(); return 1; });
    await EV(A, async () => { FLOW.nx.rbar.open({ src: 'tool' }); await __raf2(); return 1; });
    const r3 = await EV(A, () => { const t = $i('flw-nx-rbar'); const b = t && t.querySelector('[data-fa="nx:rrg"][aria-pressed="true"]'); return b ? b.dataset.v : null; });
    const uniq = r1 && new Set(r1.names).size === r1.names.length;
    T('N20', b0.go === '节奏型' && r1 && r1.rg === 'all' && /第 1–8 小节/.test(r2.toast || '') && r3 === 'one' && uniq && r1.names.every((n, i) => n === r1.full[i]),
      'N20 起步第 ③ 步从主按钮开节奏型条＝全曲（点卡套第 1–8 小节）、工具入口仍是本小节；卡名＝标准名全文、同条不重名', J({ b0, r1: r1 && { rg: r1.rg, names: r1.names.slice(0, 6) }, r2, r3, uniq }));
    await close(A);
  });

  /* N21 触屏 · 织体条 / 节奏型条卡（TCH-1 / F1-pv）：点一下出预览 + 「写入 / 取消」（song 不变），确认钮 ≥44px（F7-pv）；点「写入」＝预览谱逐字节、一步撤销；
     再点同一张已出预览的卡＝写入；偏好关掉停留预览时触屏点主按钮直接执行（F2-pv） */
  if (want('N21')) await SAFE('N21', 'N21', async () => {
    const A = await open(1280, 800, { tag: 'N21', touch: true });
    const scn = {
      tbar: async () => EV(A, async () => { __shut(); __new('JG'); __mel(); fillAccompaniment('block', true); await __raf2(); await new Promise(r => setTimeout(r, 650)); FLOW.nx.tbar.open({ src: 'test', mode: 'tex' }); await __raf2(); return '#flw-nx-tbar [role="option"][data-v="arp8"]'; }),
      rbar: async () => EV(A, async () => { __shut(); __new('JT', { meta: { pen: 'J' } }); __mel(); mutate(() => { song.measures.forEach((m, i) => { m.voxes[0][0].chord = ['C', 'Am', 'F', 'G'][i % 4]; m.tabs[0][0].notes = [{ s: 2, f: 1 }]; }); }); await __raf2(); await new Promise(r => setTimeout(r, 650)); FLOW.nx.rbar.open({ src: 'test' }); await __raf2(); const c = [...document.querySelectorAll('#flw-nx-rbar [role="option"]')][1]; return '#flw-nx-rbar [role="option"][data-v="' + c.dataset.v + '"]'; })
    };
    for (const [nm, fn] of Object.entries(scn)) {
      for (const how of ['write', 'again']) {
        const sel0 = await fn(); await wait(A, 300);
        const s0 = await EV(A, () => ({ s: JSON.stringify(song), u: undoStack.length }));
        const c = await center(A, sel0); await A.touchscreen.tap(c.x, c.y); await wait(A, 500); await raf(A);
        const t1 = await EV(A, () => { const cf = $i('flw-nx-cf'), P = FLOW.nx.pv._P; return { pv: ($i('flw-nx-pv') || { dataset: {} }).dataset.st, cf: !!cf, btn: cf ? [...cf.querySelectorAll('button')].map(b => { const q = b.getBoundingClientRect(); return [Math.round(q.width), Math.round(q.height)]; }) : [],
          s: JSON.stringify(song), dst: P.mounted && P.mounted.res && P.mounted.res.dst ? JSON.stringify(P.mounted.res.dst) : null }; });
        if (how === 'write') { const w = await center(A, '#flw-nx-cf [data-fa="nx:write"]'); if (w) await A.touchscreen.tap(w.x, w.y); }
        else await A.touchscreen.tap(c.x, c.y);
        await wait(A, 300); await raf(A);
        const t2 = await EV(A, () => ({ s: JSON.stringify(song), u: undoStack.length, cf: !!$i('flw-nx-cf') }));
        T('N21', t1.pv === 'on' && t1.cf && t1.s === s0.s && t1.btn.length === 2 && t1.btn.every(([w, h]) => w >= 44 && h >= 44) && t2.u === s0.u + 1 && t1.dst === t2.s && !t2.cf,
          'N21 触屏点' + (nm === 'tbar' ? '织体条' : '节奏型条') + '卡：一下出预览 + 写入 / 取消（≥44px，song 不变）；' + (how === 'write' ? '点「写入」' : '再点同一张卡') + '＝预览谱逐字节、一步撤销',
          J({ pv: t1.pv, cf: t1.cf, same0: t1.s === s0.s, btn: t1.btn, du: t2.u - s0.u, eq: t1.dst === t2.s, cf2: t2.cf }));
      }
    }
    await close(A);
    const P = await open(1280, 800, { tag: 'N21-off', touch: true, init: () => { try { localStorage.setItem('musetab-preview', '0'); } catch (_) {} } });
    await EV(P, async () => { __new('JG'); __mel(); await __raf2(); return 1; }); await wait(P, 650);
    const u0 = await EV(P, () => undoStack.length);
    const c = await center(P, '#flw-sb-go'); await P.touchscreen.tap(c.x, c.y); await wait(P, 400); await raf(P);
    const r = await EV(P, () => ({ cf: !!$i('flw-nx-cf'), acc: lbHasNote(song, 1), u: undoStack.length, undo: (document.querySelector('#toast .flw-ta') || {}).textContent || '' }));
    T('N21', !r.cf && r.acc && r.u === u0 + 1 && r.undo === '撤销', 'N21c 偏好关掉停留预览：触屏点主按钮直接执行（不出没有预览的「写入 / 取消」），提示条带「撤销」', J(r));
    await close(P);
  });

  for (const k of Object.keys(OUT)) { console.log('— ' + k + ' —'); OUT[k].forEach(l => console.log('  ' + l)); }
  if (errs.length) { console.log('— 页面错误 —'); errs.slice(0, 20).forEach(e => console.log('  ❌ ' + e)); total += 1; }
  console.log('\nPASS ' + pass + ' / ' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
