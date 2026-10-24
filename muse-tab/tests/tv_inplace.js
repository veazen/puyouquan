'use strict';
/* v69.1 界面简约化 S3 · A 轨「书写就地」——规格 f91 §3（A1 页头就地改 · A2 红点就地修 + 撤编辑模式两档 · A3 配伴奏后下一次播放从第 1 小节起 · A4 右栏默认带字竖条 D5）。
   被测页＝默认外壳新形态；?next=0 / ?shell=classic 与基线页对拍（git show tests/inplace_ref.json 的提交＝v69.0 658d425；env MUSETAB_BASE 覆盖，MUSETAB_BASE=none 本地跳过；CI 拿不到判红）。
   Z   零差异：?shell=classic / ?next=0 点页头（曲名 / 1=X / 拍号 / 速度 / 变调夹）＝原弹窗（#b-meta · #ekey-pop 无调网格 · 原 popmenu 文案）、时值不符时 #beat-status / #err-drop、
       ?next=0「⋯」菜单两档——与基线逐字节相同；新节点（#flw-hdp / #flw-fixp / #flw-errdots / #ek-grid / .flw-hdm）0 个；新形态 #score 与基线新外壳逐字节相同（规矩 1）
   H1–H9  页头就地改：点曲名＝#flw-hdp（点中项聚焦全选、面板不压被点文字、输入即上谱不入撤销、Enter 一步撤销）· 点署名行聚焦对应项、空署名可填 · Esc 还原 / 点外提交 ·
          1=X 调网格（点 D＝stepKey(+2) 逐字节同）· 拍号 / 速度小面板 · #score 打开关闭前后逐字节同、快照 / 打印无面板 · 曲谱信息入口 2 处 · 字数 / 对比度 / 命中区
   R0–R11 红点就地修：?next=0 两档原样 · ERR_MARKS 与 beatErrors 一一对应、红点盖住「!」中心 · ⚠N 读数 · 出错不弹面板 · 按情况出修法 · ⚠N 跳第一处跟滚 · ‹ › ·
          修法与 autoFixMeasure / overflowCarry / #err-fixall 同结果逐字节 · 两档撤掉（musetab-editmode 照读不写）· 排版 / 输出 / 启动台 / 谱架 / 打印不出 · 对比度 / 命中区
   P0–P6  配伴奏后光标不动、下一次播放从第 1 小节起（只用一次；动光标 / 循环 / 撤销即作废；织体条 / 生成伴奏同；节奏型条不在内）；?next=0 / 旧外壳仍落第 1 小节
   D0–D3  右栏默认 52 带字竖条：?next=0 原样 · 新形态 1280 / 1440 / 1920 竖条 52 · 浮出 / 钉住 / 刷新 / 取消钉住 · 排版竖条「版式」（输出无页待 B2）
   KS     键盘写 32 小节旋律按键数与 v69.0 相同（tv_v688 KC 同贪心打法：送别×2 232 键）· 快捷键菜单逐字节同
   LS     本机键集合差：整套只多被测动作本来就写的键（谱面数据 / 钉住），没有任何新键
   突变实证（修前 / 突变红，修后绿；见 f91out/a 报告）：
     m1 去掉 FLOW.hd 在 #score [data-hd] 的接管（走回 showHeadMenu）→ H1–H6 红；m2 FLOW.fix.paint 不出红点 → R1 / R3 / R4 / R4b / R6–R8 / R10 / R11 红（ONLY=R 实测 2026-10-24）；
     m3 runArrange 新形态分支改回 sel={mi:p.m1…} → P1 / P2 / P4 红（ONLY=P 实测，P0 / P3 / P5 / P6 护栏照绿）；m4 play() 不读 PLAY_ONCE → P2 / P5 红；m5 dockOn 去掉 !F.nxOn() → D1 / D2 红；
     m6 F.menus.stmore 照出两档 → R9 红；m7 rdp 照出「曲谱信息…」→ H8 红
   env：MUSETAB_URL 被测页 · MUSETAB_BASE 基线页 · ONLY=Z,H,R,P,D,KS · SHOTS=目录 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => { const i = u.indexOf('#'), base = i >= 0 ? u.slice(0, i) : u, h = i >= 0 ? u.slice(i) : ''; return base + (base.includes('?') ? '&' : '?') + q + h; };
const REF = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'inplace_ref.json'), 'utf8')); } catch (_) { return {}; } })();
const BASE_COMMIT = process.env.MUSETAB_BASE_COMMIT || REF.commit || '658d4252b780f6534cec556fdf4d9f96609f5928';
const BASE_SHORT = BASE_COMMIT.slice(0, 7);
const IN_CI = !!process.env.CI && process.env.MUSETAB_BASE !== 'none';
const BASEU = (() => {
  const e = process.env.MUSETAB_BASE;
  if (e === 'none') return '';
  if (e) { const f = e.replace(/^file:\/\//, '').replace(/[?#].*$/, ''); return fs.existsSync(f) ? (e.startsWith('file://') ? e : 'file://' + path.resolve(e)) : ''; }
  try { const txt = require('child_process').execFileSync('git', ['-C', __dirname, 'show', BASE_COMMIT + ':muse-tab/index.html'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
    const f = path.join(require('os').tmpdir(), 'tv_inplace_base_' + BASE_SHORT + '.html'); fs.writeFileSync(f, txt); return 'file://' + f; } catch (_) { return ''; }
})();
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const SHOTS = process.env.SHOTS || '';
const J = x => JSON.stringify(x);
let pass = 0, total = 0; const OUT = {}, errs = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; (OUT[id] = OUT[id] || []).push((ok ? '✅ ' : '❌ ') + name + (d != null ? ': ' + String(d).slice(0, ok ? 400 : 2400) : '')); };
const NOTE = (id, s) => { (OUT[id] = OUT[id] || []).push(s); };
/* 数据红线：被测动作本来就写的键＝谱面数据（编辑后自动保存）；本套件跑完不许出现别的新键（含 v69.1 不新增本机键） */
const ALLOW_K = new Set(['musetab-docs-v1', 'musetab-song-v1', 'musetab-library-v1']);   /* library：关掉改过的窗口时自动存入我的曲谱（v69.0 原有） */

function HELP() {
  window.guardReplace = p => p(); window.SF_PLAYWAIT = false;
  try { hideStartPad(); } catch (_) {}
  window.$i = id => document.getElementById(id);
  window.__vis = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e || !e.isConnected) return false;
    const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; }
    return true; };
  /* 中心点命中自己（先断言可见再点：v68.9 教训） */
  window.__hit = e => { if (typeof e === 'string') e = document.querySelector(e); if (!__vis(e)) return false; const r = e.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (t === e || e.contains(t)); };
  window.__raf2 = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 0))));
  if (!window.__toastW) { window.__toastW = 1; window.__toasts = []; const t0 = window.toast; window.toast = function (m) { try { __toasts.push(String(m)); } catch (_) {} return t0.apply(this, arguments); }; }
  window.__one = s => { addDoc(s, () => {}); while (docs.length > 1) closeDocAt(0); try { closeModal(); } catch (_) {} render(); return s; };
  window.__P = n => { const p = PRESETS.find(x => x.name.indexOf(n) >= 0); return migrate(p.make()); };
  window.__V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
  window.__TC = (s, f, dur) => ({ dur: dur || 8, dotted: false, chord: '', notes: [{ s, f }], strum: '', tech: '' });
  window.__melIn = (s, vi, mis) => { mis.forEach(mi => { const m = s.measures[mi], b = m.beats || s.beats, u = m.unit || s.unit; m.voxes[vi] = Array.from({ length: b }, (_, i) => __V(((mi * 3 + i) % 7) + 1, u)); }); return s; };
  window.__new = (k, o) => { o = o || {}; const s = NWB.build(k, Object.assign({ title: '测' + k, nMea: o.nMea || 8 }, o.b || {})); if (o.mod) o.mod(s); __one(s);
    if (o.meta !== false) LBAR.open(Object.assign({ from: 'new' }, o.meta || {}));
    const tab = (k === 'T' || k === 'ST' || (k === 'JT' && !(o.meta && o.meta.pen === 'J')));
    sel = { mi: 0, row: tab ? 'tab' : 'vox', vi: 0, ci: 0, si: 1 }; blurSel = false; render(); return 1; };
  window.__mel = (mis) => { const mv = lbMelVoices(song); const vi = mv.length ? mv[0] : 0; mutate(() => __melIn(song, vi, mis || song.measures.map((_, i) => i))); return 1; };
  window.__songbie = () => { __one(__P('送别')); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; blurSel = true; render(); return 1; };
  /* 四处不符（简谱行欠拍 / 超拍 · 六线谱行欠拍 / 超拍）的吉他弹唱谱 */
  window.__err4 = () => { const s = NWB.build('JT', { title: '测错', nMea: 8 }); __one(s);
    mutate(() => { song.measures.forEach(m => { m.voxes[0] = [__V(1, 4), __V(2, 4), __V(3, 4), __V(4, 4)]; m.tabs[0] = [0, 1, 2, 3, 4, 5, 6, 7].map(k => __TC(3, k % 4)); });
      song.measures[0].voxes[0].pop(); song.measures[1].voxes[0].push(__V(5, 4)); song.measures[2].tabs[0].pop(); song.measures[3].tabs[0].push(__TC(2, 1)); });
    sel = { mi: 6, row: 'vox', vi: 0, ci: 0, si: 1 }; blurSel = true; render(); return beatErrors().length; };
  window.__keys = () => Object.keys(localStorage).filter(k => /^musetab-/.test(k)).sort();
  window.__shut = () => { try { FLOW.menu.close(); } catch (_) {} try { closePop(); } catch (_) {} try { closeModal(); } catch (_) {} try { FLOW.fix.close(false); } catch (_) {} try { FLOW.hd.cancel(); } catch (_) {}
    try { const p = $i('ekey-pop'); if (p) p.classList.remove('on'); } catch (_) {} try { FLOW.nx.tbar.close(false); FLOW.nx.rbar.close(false); } catch (_) {} };
  window.__R = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  window.__ix = (a, b) => !a || !b ? 0 : Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  /* 页头字：第一个 [data-hd] 之前的 <text>（同 FLOW.hd.headTexts，独立实现免得自证） */
  window.__head = () => { const out = []; for (const el of document.querySelectorAll('#score text, #score [data-hd]')) { if (el.hasAttribute('data-hd')) break; out.push(el); } return out; };
  window.__headR = f => { const t = __head().find(f); return t ? __R(t) : null; };
  /* 对比度（同 tv_shellflow）：半透明底逐层合成 */
  window.__col = s => { s = String(s || '').trim(); let m = s.match(/^rgba?\(([^)]+)\)/); if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    m = s.match(/^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)/); if (m) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] == null ? 1 : +m[4]]; return null; };
  window.__over = (f, b) => f[3] >= 1 ? f.slice(0, 3) : f.slice(0, 3).map((c, i) => c * f[3] + b[i] * (1 - f[3]));
  window.__L = c => { const s = c.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * s[0] + .7152 * s[1] + .0722 * s[2]; };
  window.__cr = (fg, bg) => { const B = bg.slice(0, 3), F = __over(fg, B); const a = __L(F), b = __L(B); return Math.round((Math.max(a, b) + .05) / (Math.min(a, b) + .05) * 100) / 100; };
  window.__bgOf = el => { const st = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = __col(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) { st.push(c); if (c[3] >= 1) break; } }
    let b = [255, 255, 255]; for (let i = st.length - 1; i >= 0; i--) b = __over(st[i], b); return b.concat(1); };
  window.__crOf = el => __cr(__col(getComputedStyle(el).color), __bgOf(el));
  return 1;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
  const open = async (w, h, o) => {
    o = o || {};
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: o.scheme || 'light', deviceScaleFactor: 1 });
    if (o.init) await ctx.addInitScript(o.init);
    const pg = await ctx.newPage(); pg._ctx = ctx; pg._tag = o.tag || '';
    pg.on('pageerror', e => errs.push((o.tag || '') + ' PAGEERR: ' + e.message));
    pg.on('console', m => { if (m.type() === 'error' && /flow|hd|fix|红点|页头|异常/.test(m.text())) errs.push((o.tag || '') + ' CONSOLE: ' + m.text()); });
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
  const center = async (pg, sel) => EV(pg, s => { const e = typeof s === 'string' ? document.querySelector(s) : null; if (!e || !__vis(e)) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  const clickSel = async (pg, sel) => { const c = await center(pg, sel); if (!c) return false; await pg.mouse.click(c.x, c.y); return true; };
  /* 点页头：kind＝data-hd；f＝页头字筛选（有就点那行字的中心，否则点热区中心） */
  const clickHd = async (pg, kind, which) => {
    const c = await EV(pg, ([kind, which]) => {
      let r = null;
      if (which === 'title') r = __headR(t => t.getAttribute('font-weight') === '800');
      else if (which) r = __headR(t => (t.textContent || '').indexOf(which) === 0);
      if (!r) { const hz = [...document.querySelectorAll('#score [data-hd="' + kind + '"]')].pop(); if (!hz) return null; r = __R(hz); }
      return { x: r.l + r.w / 2, y: r.t + r.h / 2 }; }, [kind, which || '']);
    if (!c || c.__err) return false; await pg.mouse.click(c.x, c.y); await wait(pg, 220); return true; };

  /* ================= Z 零差异（?shell=classic / ?next=0 vs 基线；新形态 #score vs 基线新外壳） ================= */
  if (want('Z')) await SAFE('Z', 'Z', async () => {
    if (!BASEU) { if (IN_CI) T('Z', false, 'Z CI 里拿不到对拍基线（git show ' + BASE_SHORT + ' 失败；deploy.yml 应按 inplace_ref.json 补取）：零差异无法验证，判红'); else NOTE('Z', '⚠️ 拿不到基线页（git show ' + BASE_SHORT + '），Z 逐字节对拍跳过（本地）'); }
    const grab = async (url, tag, o) => {
      const pg = await open(1440, 900, { url, tag, init: o && o.pin ? () => { try { localStorage.setItem('musetab-rdock', '1'); } catch (_) {} } : null });
      await EV(pg, () => __songbie()); await raw(pg);
      const out = {};
      if (o && o.scoreOnly) { out.score = await EV(pg, () => $i('score').innerHTML); out.e4 = await EV(pg, () => { __err4(); return $i('score').innerHTML; }); await close(pg); return out; }
      await clickHd(pg, 'meta', 'title');
      out.meta = await EV(pg, () => { const m = document.querySelector('#modal-mask .modal'); const r = m ? m.querySelector('h3').textContent + '|' + [...m.querySelectorAll('input,select')].map(x => x.id).join(',') : null; try { closeModal(); } catch (_) {} return r; });
      await clickHd(pg, 'key');
      out.key = await EV(pg, () => { const p = $i('ekey-pop'); const r = p.classList.contains('on') + '|' + p.innerHTML; p.classList.remove('on'); return r; });
      await clickHd(pg, 'meter');
      out.meter = await EV(pg, () => { const p = $i('popmenu'); const r = p ? p.className + '|' + p.innerHTML : null; closePop(); return r; });
      await clickHd(pg, 'tempo');
      out.tempo = await EV(pg, () => { const p = $i('popmenu'); const r = p ? p.className + '|' + p.innerHTML.replace(/value="\d+"/, '') : null; closePop(); return r; });
      await EV(pg, () => { __one(__P('两只老虎')); mutate(() => { song.capo = 2; }); render(); return 1; }); await raf(pg);
      await clickHd(pg, 'capo');
      out.capo = await EV(pg, () => { const p = $i('popmenu'); const r = p ? p.className + '|' + p.innerHTML : null; closePop(); return r; });
      await EV(pg, () => { __songbie(); mutate(() => { song.measures[1].voxes[0].pop(); song.measures[3].voxes[0].push(__V(5, 4)); }); return 1; }); await raf(pg);
      out.bs = await EV(pg, () => $i('beat-status').outerHTML + '|' + $i('err-drop').innerHTML);
      out.flow = await EV(pg, () => document.body.classList.contains('flow'));
      if (out.flow) { await clickSel(pg, '#flw-st-more'); await wait(pg, 200);
        out.more = await EV(pg, () => { const p = $i('popmenu'); const r = p ? p.innerHTML : null; FLOW.menu.close(); return r; });
        await clickSel(pg, '#beat-status'); await wait(pg, 200);
        out.eo = await EV(pg, () => document.body.classList.contains('flw-eo') + '|' + __vis('#err-drop')); }
      out.nodes = await EV(pg, () => document.querySelectorAll('#flw-hdp, #flw-fixp, #flw-errdots, #ek-grid, .flw-hdm').length);
      await close(pg); return out;
    };
    const cl = await grab(withQ(URL0, 'shell=classic'), 'Z-classic'), n0 = await grab(withQ(URL0, 'next=0'), 'Z-next0');
    T('Z', cl.nodes === 0 && n0.nodes === 0 && !cl.flow && n0.flow && /^曲谱信息\|mm-title/.test(cl.meta || '') && /^曲谱信息\|mm-title/.test(n0.meta || '') && /^true\|/.test(cl.key) && cl.key.indexOf('ek-grid') < 0 && n0.key.indexOf('ek-grid') < 0
      && /全曲拍号（单个小节变拍/.test(cl.meter || '') && /速度：每分钟/.test(n0.tempo || '') && /变调夹品位（0=不用）/.test(n0.capo || '') && /st:em/.test(n0.more || '') && /^true\|true/.test(n0.eo || ''),
      'Z1 ?shell=classic / ?next=0：点页头＝原弹窗（#b-meta · #ekey-pop 无调网格 · 原拍号 / 速度 / 变调夹 popmenu 文案）、新节点 0 个；?next=0「⋯」两档照有、点时值项照上弹 #err-drop',
      J({ cl: { nodes: cl.nodes, meta: cl.meta && cl.meta.slice(0, 20) }, n0: { nodes: n0.nodes, more: !!n0.more, eo: n0.eo } }));
    if (BASEU) {
      const bc = await grab(withQ(BASEU, 'shell=classic'), 'Z-base-classic'), b0 = await grab(withQ(BASEU, 'next=0'), 'Z-base-next0');
      const diff = (x, y) => Object.keys(y).filter(k => k !== 'nodes' && x[k] !== y[k]);
      const d1 = diff(cl, bc), d2 = diff(n0, b0);
      T('Z', !d1.length && !d2.length, 'Z2 与基线（' + BASE_SHORT + '）逐字节相同：?shell=classic 与 ?next=0 下 曲谱信息弹窗 / 变调弹窗 / 拍号 · 速度 · 变调夹 popmenu / 时值项与 #err-drop / 「⋯」菜单',
        J({ classic: d1, next0: d2, eg: d1[0] ? [cl[d1[0]].slice(0, 200), bc[d1[0]].slice(0, 200)] : d2[0] ? [n0[d2[0]].slice(0, 200), b0[d2[0]].slice(0, 200)] : null }));
      /* 规矩 1：#score 逐字节不变（新形态 vs 基线新外壳；两边都钉住右栏＝同一几何） */
      const sN = await grab(URL0, 'Z-score-nx', { pin: true, scoreOnly: true }), sB = await grab(BASEU, 'Z-score-base', { pin: true, scoreOnly: true });
      T('Z', sN.score === sB.score && sN.e4 === sB.e4 && sN.e4.length > 1000, 'Z3 新形态 #score innerHTML 与基线新外壳逐字节相同（送别 · 四处时值不符的吉他弹唱谱；红点 / 面板都在 #score 之外）', J({ a: sN.score === sB.score, b: sN.e4 === sB.e4, n: [sN.e4.length, sB.e4.length] }));
    }
  });
  async function raw(pg) { await raf(pg); }

  /* ================= H 页头就地改 ================= */
  if (want('H')) await SAFE('H', 'H', async () => {
    const pg = await open(1440, 900, { tag: 'H' });
    const k0 = await EV(pg, () => __keys());
    const KCP = {}; const kcp = async n => { KCP[n] = (await EV(pg, () => __keys())).filter(k => !k0.includes(k)).join(','); };
    await EV(pg, () => __songbie()); await raf(pg);
    /* H1 点曲名 */
    const s0 = await EV(pg, () => ({ html: $i('score').innerHTML, u: undoStack.length, t: song.title }));
    const tr = await EV(pg, () => __headR(t => t.getAttribute('font-weight') === '800'));
    const hitT = await EV(pg, () => { const r = __headR(t => t.getAttribute('font-weight') === '800'); const e = document.elementFromPoint(r.l + r.w / 2, r.t + r.h / 2); return e ? e.getAttribute('data-hd') : null; });
    await clickHd(pg, 'meta', 'title');
    const h1 = await EV(pg, () => { const p = $i('flw-hdp'), ae = document.activeElement; return { vis: __vis(p), ae: ae && ae.id, all: ae && ae.selectionStart === 0 && ae.selectionEnd === (ae.value || '').length && ae.value.length > 0, pr: __R(p), html: $i('score').innerHTML, u: undoStack.length }; });
    await shot(pg, 'H1-hdp-1440');
    await pg.keyboard.type('新歌'); await raf(pg);
    const h1b = await EV(pg, () => ({ t: song.title, txt: (__head().find(t => t.getAttribute('font-weight') === '800') || {}).textContent, u: undoStack.length }));
    await pg.keyboard.press('Enter'); await raf(pg);
    const h1c = await EV(pg, () => ({ t: song.title, u: undoStack.length, vis: __vis('#flw-hdp') }));
    await pg.keyboard.press('Control+z'); await raf(pg);
    const h1d = await EV(pg, () => ({ t: song.title, html: $i('score').innerHTML }));
    T('H', hitT === 'meta' && h1.vis && h1.ae === 'flw-hdp-title' && h1.all && __ixN(h1.pr, tr) === 0 && h1b.t === '新歌' && h1b.txt === '新歌' && h1b.u === s0.u && h1c.t === '新歌' && h1c.u === s0.u + 1 && !h1c.vis && h1d.t === s0.t,
      'H1 点曲名（中心点命中 [data-hd=meta]）→ #flw-hdp 出现、#flw-hdp-title 聚焦全选、面板与曲名框相交 0；输入「新歌」谱面即变、撤销栈不增；Enter 写入、撤销 +1、面板收起；Ctrl+Z 回「送别」',
      J({ hitT, h1: { vis: h1.vis, ae: h1.ae, all: h1.all, ix: __ixN(h1.pr, tr) }, h1b, h1c, back: h1d.t }));
    await kcp('H2');
    /* H2 点署名行 / 空署名可填 */
    await clickHd(pg, 'meta', '作曲：');
    const h2a = await EV(pg, () => (document.activeElement || {}).id);
    await pg.keyboard.press('Escape'); await raf(pg);
    await EV(pg, () => { __new('J'); blurSel = true; render(); return 1; }); await raf(pg);
    const c0 = await EV(pg, () => __head().filter(t => /^(作词|作曲|制谱)：/.test(t.textContent)).length);
    await clickHd(pg, 'meta', 'title');
    const h2b = await EV(pg, () => ({ ae: (document.activeElement || {}).id, ly: $i('flw-hdp-lyricist').value, co: $i('flw-hdp-composer').value }));
    await EV(pg, () => { $i('flw-hdp-lyricist').focus(); return 1; }); await pg.keyboard.type('李老师'); await pg.keyboard.press('Enter'); await raf(pg);
    const h2c = await EV(pg, () => ({ ly: song.lyricist, cred: __head().filter(t => /^作词：/.test(t.textContent)).map(t => t.textContent) }));
    T('H', h2a === 'flw-hdp-composer' && c0 === 0 && h2b.ae === 'flw-hdp-title' && h2b.ly === '' && h2b.co === '' && h2c.ly === '李老师' && J(h2c.cred) === J(['作词：李老师']),
      'H2 点「作曲：…」那一行＝聚焦 #flw-hdp-composer；没有署名的谱点标题块 → 作词 / 作曲为空可填，Enter 后页头出现「作词：李老师」', J({ h2a, c0, h2b, h2c }));
    await kcp('H3');
    /* H3 Esc 还原 / 点外提交 */
    await EV(pg, () => { __songbie(); return 1; }); await raf(pg);
    const e0 = await EV(pg, () => ({ html: $i('score').innerHTML, u: undoStack.length, j: JSON.stringify(song) }));
    await clickHd(pg, 'meta', 'title'); await pg.keyboard.type('XYZ'); await raf(pg);
    const e1 = await EV(pg, () => song.title);
    await pg.keyboard.press('Escape'); await raf(pg);
    const e2 = await EV(pg, () => ({ html: $i('score').innerHTML, u: undoStack.length, j: JSON.stringify(song), vis: __vis('#flw-hdp') }));
    await clickHd(pg, 'meta', 'title'); await pg.keyboard.type('外点'); await pg.mouse.click(700, 860); await raf(pg);
    const e3 = await EV(pg, () => ({ t: song.title, u: undoStack.length, vis: __vis('#flw-hdp') }));
    T('H', e1 === 'XYZ' && e2.html === e0.html && e2.u === e0.u && e2.j === e0.j && !e2.vis && e3.t === '外点' && e3.u === e0.u + 1 && !e3.vis,
      'H3 Esc＝还原到打开前（song 与 #score 逐字节回原、撤销栈不变）；点面板外＝提交（一步撤销）', J({ e1, esc: { same: e2.html === e0.html, u: e2.u - e0.u }, out: e3 }));
    await EV(pg, () => { undo(); return 1; });
    await kcp('H4');
    /* H4 1=X 调网格 */
    await EV(pg, () => { __songbie(); return 1; }); await raf(pg);
    const k1 = await EV(pg, () => ({ j: JSON.stringify(song), u: undoStack.length }));
    await clickHd(pg, 'key');
    const h4 = await EV(pg, () => { const g = $i('ek-grid'); return { on: $i('ekey-pop').classList.contains('on'), n: g ? g.querySelectorAll('button').length : 0, first: g && $i('ekey-pop').firstElementChild === g,
      pr: g ? [...g.querySelectorAll('[aria-pressed="true"]')].map(x => x.dataset.v) : [], keep: ['#ek-dn', '#ek-up', '#ek-reset', '#ek-resp-tg'].filter(id => __vis(id)).length, lab: g ? [...g.querySelectorAll('button')].map(x => x.textContent).join(' ') : '' }; });
    await shot(pg, 'H4-ekgrid-1440');
    const ok4 = await clickSel(pg, '#ek-grid [data-v="D"]'); await raf(pg);
    const h4b = await EV(pg, () => ({ key: song.key, j: JSON.stringify(song), u: undoStack.length, pr: [...$i('ek-grid').querySelectorAll('[aria-pressed="true"]')].map(x => x.dataset.v) }));
    const h4c = await EV(pg, (k1) => { song = JSON.parse(k1.j); docs[curDocI].song = song; render(); ekBase = null; stepKey(2); return JSON.stringify(song); }, k1);
    await EV(pg, () => { const p = $i('ekey-pop'); if (p) p.classList.remove('on'); return 1; });
    /* 变调夹一组（吉他谱）：网格下面照留 */
    await EV(pg, () => { __one(__P('两只老虎')); blurSel = true; render(); return 1; }); await raf(pg);
    await clickHd(pg, 'key');
    const h4d = await EV(pg, () => { const r = { cap: ['#ek-cdn', '#ek-cup', '#ek-chips'].filter(id => __vis(id)).length, grid: __vis('#ek-grid') }; $i('ekey-pop').classList.remove('on'); return r; });
    T('H', h4.on && h4.n === 12 && h4.first && J(h4.pr) === J(['C']) && h4.keep === 4 && h4.lab === 'C G D A E B ♯F F ♭B ♭E ♭A ♭D' && ok4 && h4b.key === 'D' && h4b.u === k1.u + 1 && J(h4b.pr) === J(['D']) && h4b.j === h4c && h4d.cap === 3 && h4d.grid,
      'H4 1=X → #ekey-pop 顶部 #ek-grid 12 键（C G D A E B ♯F F ♭B ♭E ♭A ♭D）、当前调 aria-pressed；点 D → song.key D、一步撤销、与 stepKey(+2) 逐字节同；♭♯ / 恢复原调 / 改记谱调、吉他谱变调夹 −＋ / 夹位速选都还在',
      J({ h4, ok4, h4b: { key: h4b.key, du: h4b.u - k1.u, pr: h4b.pr }, same: h4b.j === h4c, h4d }));
    await kcp('H5');
    /* H5 拍号小面板 */
    await EV(pg, () => { __songbie(); return 1; }); await raf(pg);
    const m0 = await EV(pg, () => undoStack.length);
    await clickHd(pg, 'meter');
    const h5 = await EV(pg, () => { const p = document.querySelector('#popmenu.flw-hdm'); return p ? { n: p.querySelectorAll('[data-fa="hd:meter"][data-b]').length, txt: p.textContent, pr: [...p.querySelectorAll('[aria-pressed="true"]')].map(x => x.textContent), title: p.title } : null; });
    await shot(pg, 'H5-meter');
    await clickSel(pg, '#popmenu.flw-hdm [data-b="3"][data-u="4"]'); await raf(pg);
    const h5b = await EV(pg, () => ({ b: song.beats, u: song.unit, du: undoStack.length, pop: !!$i('popmenu') }));
    await clickHd(pg, 'meter');
    await EV(pg, () => { const i = $i('flw-hdm-b'); i.focus(); i.select(); return 1; }); await pg.keyboard.type('7');
    await EV(pg, () => { $i('flw-hdm-u').value = '8'; $i('flw-hdm-b').focus(); return 1; }); await pg.keyboard.press('Enter'); await raf(pg);
    const h5c = await EV(pg, () => ({ b: song.beats, u: song.unit }));
    T('H', h5 && h5.n === 9 && !/单个小节|右键/.test(h5.txt) && J(h5.pr) === J(['4/4']) && h5.title === '全曲拍号' && h5b.b === 3 && h5b.u === 4 && h5b.du === m0 + 1 && !h5b.pop && h5c.b === 7 && h5c.u === 8,
      'H5 拍号 → .flw-hdm 9 键、无说明句（悬停「全曲拍号」）、当前 4/4 按下；点 3/4 写入一步撤销并收起；「其他」7 / 8 Enter 写入', J({ h5, h5b, h5c }));
    await kcp('H6');
    /* H6 速度小面板 */
    await EV(pg, () => { __songbie(); return 1; }); await raf(pg);
    await clickHd(pg, 'tempo');
    const h6 = await EV(pg, () => ({ ae: (document.activeElement || {}).id, units: document.querySelectorAll('#popmenu.flw-hdm [data-tu]').length }));
    await pg.keyboard.type('120'); await pg.keyboard.press('Enter'); await raf(pg);
    h6.sel = await EV(pg, () => song.tempo === 120);   /* 聚焦且全选：直接键入＝替换原值（没全选会成 66120 → 夹到 240） */
    await clickHd(pg, 'tempo');
    await pg.keyboard.type('300'); await pg.keyboard.press('Enter'); await raf(pg);
    const h6b = await EV(pg, () => ({ t: song.tempo, toast: ($i('toast') || {}).textContent }));
    await EV(pg, () => { __one(__P('小步舞曲')); mutate(() => { song.beats = 6; song.unit = 8; }); blurSel = true; render(); return 1; }); await raf(pg);
    await clickHd(pg, 'tempo');
    const h6c = await EV(pg, () => [...document.querySelectorAll('#popmenu.flw-hdm [data-tu]')].map(x => x.textContent));
    await EV(pg, () => { $i('flw-hdm-term').value = 'Andante'; $i('tp-val').focus(); return 1; }); await pg.keyboard.press('Enter'); await raf(pg);
    const h6d = await EV(pg, () => song.tempoTerm);
    T('H', h6.ae === 'tp-val' && h6.sel && h6.units === 0 && h6b.t === 240 && /^速度最大 240/.test(h6b.toast || '') && J(h6c) === J(['♩=', '♪=', '♩.=']) && h6d === 'Andante',
      'H6 速度 → 数字框聚焦全选（直接键入 120 Enter＝120；4/4 谱不出单位键）；输入 300 Enter → 240（tempoInputVal 口径，短文点名「速度最大 240」≤12 字，同 tv_wiztempo T16）；x/8 谱出 ♩= ♪= ♩.=；术语 Andante 写入 tempoTerm', J({ h6, h6b, h6c, h6d }));
    await kcp('H7');
    /* H7 #score 逐字节 / 快照 / 打印 */
    await EV(pg, () => { __songbie(); return 1; }); await raf(pg);
    const x0 = await EV(pg, () => $i('score').innerHTML);
    await clickHd(pg, 'meta', 'title');
    const x1 = await EV(pg, () => ({ h: $i('score').innerHTML, snap: !!new DOMParser().parseFromString(FLOW.snapHTML(), 'text/html').querySelector('#flw-hdp, #ek-grid, #flw-errdots, #flw-fixp, .flw-hdm') }));
    await pg.keyboard.press('Escape'); await raf(pg);
    const x2 = await EV(pg, () => $i('score').innerHTML);
    /* 打印媒体：面板 display:none（焦点随之离开面板——Esc 仍须还原：文档级兜底） */
    await clickHd(pg, 'meta', 'title');
    await pg.emulateMedia({ media: 'print' }); const pr = await EV(pg, () => getComputedStyle($i('flw-hdp')).display); await pg.emulateMedia({ media: 'screen' });
    await pg.keyboard.press('Escape'); await raf(pg);
    const x2b = await EV(pg, () => ({ h: $i('score').innerHTML, vis: __vis('#flw-hdp') }));
    await clickHd(pg, 'meta', 'title'); await pg.keyboard.press('Enter'); await raf(pg);
    const x3 = await EV(pg, () => ({ h: $i('score').innerHTML, hz: [...document.querySelectorAll('#score [data-hd] title')].map(t => t.textContent).join('|') }));
    const dAt = (a, c) => { let i = 0; while (i < a.length && a[i] === c[i]) i++; return i < Math.max(a.length, c.length) ? [i, a.slice(i - 60, i + 80), c.slice(i - 60, i + 80)] : null; };
    T('H', x1.h === x0 && x2 === x0 && x2b.h === x0 && !x2b.vis && x3.h === x0 && !x1.snap && pr === 'none' && /点击编辑曲谱信息/.test(x3.hz),
      'H7 打开面板 / Esc / 不改值 Enter 前后 #score innerHTML 逐字节相同（页头热区 <title> 照旧）；FLOW.snapHTML 不带面板；打印媒体下 #flw-hdp display:none，焦点因此离开面板后 Esc 照样还原、收起', J({ open: x1.h === x0, esc: x2 === x0, esc2: [x2b.h === x0, x2b.vis], ent: x3.h === x0, snap: x1.snap, pr, d: x2 !== x0 ? dAt(x0, x2) : x2b.h !== x0 ? dAt(x0, x2b.h) : null }));
    await kcp('H8');
    /* H8 曲谱信息入口 */
    await EV(pg, () => { FLOW.rd.open('text'); return 1; }); await raf(pg);
    const h8a = await EV(pg, () => ({ txt: !!document.querySelector('#flw-rp-text [data-v="b-meta"]'), page: FLOW.rd.page() }));
    await EV(pg, () => { FLOW.rd.close(false); return 1; });
    await clickSel(pg, '#flw-file'); await wait(pg, 200);
    const fv = await EV(pg, () => __hit('#popmenu [data-old="b-meta"]'));
    await clickSel(pg, '#popmenu [data-old="b-meta"]'); await wait(pg, 250);
    const h8b = await EV(pg, () => { const m = document.querySelector('#modal-mask .modal'); const ids = ['mm-title', 'mm-singer', 'mm-lyricist', 'mm-composer', 'mm-maker', 'mm-key', 'mm-beats', 'mm-tempo', 'mm-capo', 'mm-tempoterm', 'mm-pickup']; const r = { modal: !!m, n: ids.filter(id => $i(id)).length }; try { closeModal(); } catch (_) {} return r; });
    T('H', !h8a.txt && h8a.page === 'text' && fv && h8b.modal && h8b.n === 11, 'H8 曲谱信息入口：新形态文字页没有「曲谱信息…」；文件 ▾「曲谱信息…」可见可点、打开 11 字段弹窗（含速度术语 / 弱起）', J({ h8a, fv, h8b }));
    await kcp('H9');
    /* H9 字数 / 对比度 / 命中区 */
    const h9 = [];
    for (const sc of ['light', 'dark']) {
      const p2 = await open(1440, 900, { tag: 'H9-' + sc, scheme: sc });
      await EV(p2, () => { __songbie(); if (document.documentElement.dataset) delete document.documentElement.dataset.theme; return 1; }); await raf(p2);
      await clickHd(p2, 'meta', 'title');
      h9.push(Object.assign({ sc }, await EV(p2, () => { const p = $i('flw-hdp');
        const labs = [...p.querySelectorAll('.flw-hdp-r > span')].map(s => s.textContent), btns = [...p.querySelectorAll('button')].map(x => x.textContent.trim()), tips = [...p.querySelectorAll('[title]')].map(x => x.title);
        const cr = [...p.querySelectorAll('.flw-hdp-r > span, button, input')].map(e => __crOf(e)), hit = [...p.querySelectorAll('button, input')].map(e => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height); });
        return { labs, btns, tips, crMin: Math.min(...cr), hitMin: Math.min(...hit), al: p.getAttribute('aria-label') }; })));
      await shot(p2, 'H9-hdp-' + sc);
      await close(p2);
    }
    T('H', h9.every(x => x.labs.every(l => [...l].length <= 2) && x.btns.every(t => [...t].length <= 4) && x.tips.every(t => [...t].length <= 12) && x.crMin >= 4.5 && x.hitMin >= 28 && [...(x.al || '')].length <= 12),
      'H9 页头面板：标签 ≤2 字、按钮 ≤4、悬停 ≤12、读屏名 ≤12；浅 / 深色对比度 ≥4.5；命中区 ≥28', J(h9));
    const k1b = await EV(pg, () => __keys());
    T('H', k1b.every(k => k0.includes(k) || KNOWN_K(k)), 'H·LS 页头就地改全程本机键只多谱面数据键（无新键）', J({ extra: k1b.filter(k => !k0.includes(k)), at: KCP }));
    await close(pg);
  });
  function __ixN(a, b) { if (!a || !b) return -1; return Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t)); }
  function KNOWN_K(k) { return ALLOW_K.has(k); }

  /* ================= R 红点就地修 ================= */
  if (want('R')) await SAFE('R', 'R', async () => {
    const pg = await open(1440, 900, { tag: 'R', init: () => { try { localStorage.setItem('musetab-editmode', 'free'); } catch (_) {} } });
    const k0 = await EV(pg, () => __keys());
    await EV(pg, () => __err4()); await raf(pg);
    /* R1 记位置 / 红点 */
    const r1 = await EV(pg, () => {
      const es = beatErrors().map(e => e.row + e.vi + ':' + e.mi).sort(), ms = ERR_MARKS.map(m => m.row + m.vi + ':' + m.mi).sort();
      const gl = [...document.querySelectorAll('#score text[fill="var(--danger)"]')].filter(t => t.textContent === '!').map(t => { const r = t.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
      const ds = [...document.querySelectorAll('#flw-errdots .flw-errdot')];
      const dist = ds.map((d, i) => { const r = d.getBoundingClientRect(), c = [r.left + r.width / 2, r.top + r.height / 2]; return Math.round(Math.min(...gl.map(g => Math.hypot(g[0] - c[0], g[1] - c[1]))) * 100) / 100; });
      /* 可见红点（10px）与音符墨迹（品位 / 唱名数字字形）相交 0：数字的墨迹框取字体框下 78%（字体框上沿含行距留白；colBoxes 是整列点选区、本来就圈住「!」，不用它） */
      const ink = ds.map(d => { const r = d.getBoundingClientRect(), c = [r.left + r.width / 2, r.top + r.height / 2], dot = { l: c[0] - 5, t: c[1] - 5, r: c[0] + 5, b: c[1] + 5 };
        return [...document.querySelectorAll('#score text')].filter(t => /^[0-9]$/.test(t.textContent)).filter(t => { const q = __R(t); return __ix(dot, { l: q.l, r: q.r, b: q.b, t: q.b - q.h * 0.78 }) > 0; }).length; });
      return { es, ms, n: ds.length, dist, ink, inScore: !!document.querySelector('#score .flw-errdot, #score #flw-errdots'), lbl: ds.map(d => d.getAttribute('aria-label') + '|' + d.title) }; });
    await shot(pg, 'R1-dots-1440');
    T('R', J(r1.es) === J(r1.ms) && r1.es.length === 4 && r1.n === 4 && r1.dist.every(d => d <= 2) && r1.ink.every(n => n === 0) && !r1.inScore && r1.lbl.every(l => /^第 \d+ 小节(少|多) .+ 拍\|(少|多) .+ 拍$/.test(l) && [...l.split('|')[1]].length <= 12),
      'R1 四处不符（简谱行欠 / 超 · 六线谱行欠 / 超）→ ERR_MARKS 与 beatErrors 一一对应；#flw-errdots 4 枚（在 #score 之外），中心与「!」字形中心 ≤2px、可见红点不压音符数字；读屏「第 n 小节少 1 拍」、悬停 ≤12 字', J(r1));
    /* R2 状态栏 ⚠N */
    const r2 = await EV(pg, () => { const b = $i('beat-status'); return { txt: b.textContent.trim(), al: b.getAttribute('aria-label'), cls: b.className }; });
    const r2b = await EV(pg, () => { const j = JSON.stringify(song); __songbie(); const b = $i('beat-status'); const o = { txt: b.textContent.trim(), al: b.getAttribute('aria-label'), svg: !!b.querySelector('svg'), cls: b.className }; song = JSON.parse(j); docs[curDocI].song = song; render(); return o; });
    T('R', r2.txt === '4' && r2.al === '时值不符 4 处' && r2.cls === 'bad' && r2b.txt === '' && r2b.svg && r2b.al === '时值正确' && r2b.cls === 'good',
      'R2 状态栏 ⚠N：可见字只有读数「4」、读屏「时值不符 4 处」；无错时只有 ✓ 图标、读屏「时值正确」', J({ r2, r2b }));
    /* R3 出错时不自动出面板、不出提示条 */
    await EV(pg, () => { __songbie(); sel = { mi: 2, row: 'vox', vi: 0, ci: 0, si: 1 }; blurSel = false; render(); __toasts.length = 0; return 1; }); await raf(pg);
    await pg.keyboard.press('Insert'); await raf(pg);
    const r3 = await EV(pg, () => ({ errs: beatErrors().length, pane: __vis('#flw-fixp'), toasts: __toasts.filter(t => /已补齐|已删|已修|已顺延|时值不符|修复建议/.test(t)), dots: document.querySelectorAll('#flw-errdots .flw-errdot').length }));
    T('R', r3.errs >= 1 && !r3.pane && !r3.toasts.length && r3.dots === r3.errs, 'R3 键盘 Insert 插入一格造成超拍：只出红点 + ⚠N，不弹面板、不出提示条（不主动给建议）', J(r3));
    /* R4 点红点 → 面板读数与按钮集合 */
    await EV(pg, () => __err4()); await raf(pg);
    const fp = async (key) => { const ok = await EV(pg, key => { const d = document.querySelector('#flw-errdots .flw-errdot[data-row="' + key[0] + '"][data-mi="' + key[1] + '"]'); return d ? __hit(d) : 'none'; }, key);
      await clickSel(pg, '#flw-errdots .flw-errdot[data-row="' + key[0] + '"][data-mi="' + key[1] + '"]'); await raf(pg);
      const r = await EV(pg, () => { const p = $i('flw-fixp'); return { vis: __vis(p), v: (p.querySelector('.flw-fx-v') || {}).textContent, btns: [...p.querySelectorAll('.flw-fx-row button')].map(x => x.textContent), ae: (document.activeElement || {}).textContent, tips: [...p.querySelectorAll('.flw-fx-row button')].map(x => x.title) }; });
      await pg.keyboard.press('Escape'); await raf(pg); return Object.assign({ hit: ok }, r); };
    const q0 = await fp(['vox', 0]), q1 = await fp(['vox', 1]), q2 = await fp(['tab', 2]), q3 = await fp(['tab', 3]);
    await shot(pg, 'R4-fixp');
    T('R', [q0, q1, q2, q3].every(q => q.hit === true && q.vis && q.ae === q.btns[0]) && q0.v === '少 1 拍' && J(q0.btns) === J(['补休止', '全部修']) && q1.v === '多 1 拍' && J(q1.btns) === J(['删多余', '全部修'])
      && q2.v === '少 ½ 拍' && J(q2.btns) === J(['补齐', '全部修']) && q3.v === '多 ½ 拍' && J(q3.btns) === J(['删多余', '全部修']) && [q0, q1, q2, q3].every(q => q.tips.every(t => [...t].length <= 12)),
      'R4 点红点（中心命中）→ #flw-fixp：简谱欠拍「少 1 拍」补休止 · 简谱超拍（下一小节满、不能顺延）删多余 · 六线谱欠拍「少 ½ 拍」补齐 · 六线谱超拍删多余；N≥2 有「全部修」；焦点在第一个修复钮；悬停 ≤12 字',
      J([q0, q1, q2, q3].map(q => [q.hit, q.v, q.btns, q.ae, q.tips])));
    /* 可顺延的超拍：末小节超拍（下一小节不存在＝新建一小节承接）→ 顺延 + 删多余 */
    await EV(pg, () => { __one(__P('送别')); mutate(() => { const n = song.measures.length - 1; song.measures[n].voxes[0].push(__V(5, 4)); }); blurSel = true; render(); return 1; }); await raf(pg);
    const n1 = await EV(pg, () => song.measures.length - 1);
    const q4 = await fp(['vox', n1]);
    T('R', J(q4.btns) === J(['顺延', '删多余']) && q4.v === '多 1 拍', 'R4b 能顺延的超拍：「顺延」+「删多余」（只有 1 处时不出「全部修」）', J(q4));
    /* R5 点 ⚠N → 第一处 + 跟滚 + ‹ › */
    await EV(pg, () => { __err4(); sel = { mi: 7, row: 'tab', vi: 0, ci: 0, si: 1 }; $i('score-wrap').scrollTop = 9999; render(); return 1; }); await raf(pg);
    const st0 = await EV(pg, () => $i('score-wrap').scrollTop);
    const bsHit = await EV(pg, () => __hit('#beat-status'));
    await clickSel(pg, '#beat-status'); await wait(pg, 250);
    const r5 = await EV(pg, () => { const es = beatErrors(), e = es[0], b = colBoxes[(e.row === 'tab' ? 't' : 'v') + e.vi + ':' + e.mi + ':0'], sc = $i('score'), R = sc.getBoundingClientRect(), k = R.width / sc.viewBox.baseVal.width;
      const top = R.top + b.y * k, bot = top + b.h * k, wr = $i('score-wrap').getBoundingClientRect(), sb = $i('flw-sbar').getBoundingClientRect();
      return { sel: [sel.mi, sel.row, sel.vi], e: [e.mi, e.row, e.vi], vis: top >= Math.max(wr.top, sb.bottom) - 1 && bot <= wr.bottom + 1, pane: __vis('#flw-fixp'), n: ($i('flw-fixp').querySelector('.flw-fx-n') || {}).textContent, exp: $i('beat-status').getAttribute('aria-expanded'), st: $i('score-wrap').scrollTop }; });
    await clickSel(pg, '#flw-fixp [data-fa="fix:next"]'); await raf(pg);
    const r5b = await EV(pg, () => ({ sel: [sel.mi, sel.row], n: ($i('flw-fixp').querySelector('.flw-fx-n') || {}).textContent }));
    await clickSel(pg, '#flw-fixp [data-fa="fix:prev"]'); await raf(pg);
    const r5c = await EV(pg, () => ({ sel: [sel.mi, sel.row], n: ($i('flw-fixp').querySelector('.flw-fx-n') || {}).textContent }));
    await EV(pg, () => { const b = $i('flw-fixp').querySelector('.flw-fx-row button'); b.focus(); return 1; }); await pg.keyboard.press('PageDown'); await raf(pg);
    const r5d = await EV(pg, () => ($i('flw-fixp').querySelector('.flw-fx-n') || {}).textContent);
    await pg.keyboard.press('Escape'); await raf(pg);
    const r5e = await EV(pg, () => ({ pane: __vis('#flw-fixp'), ae: (document.activeElement || {}).id || document.activeElement.tagName, exp: $i('beat-status').getAttribute('aria-expanded') }));
    /* 焦点口径同 v67.9 B1（tv_shellflow S12i）：鼠标点开的，Esc 收起后焦点不回 ⚠N（回谱面：空格是播放不是重新打开）；键盘 Enter 打开的，Esc 收起后焦点回 ⚠N */
    await EV(pg, () => { $i('beat-status').focus(); return 1; }); await pg.keyboard.press('Enter'); await raf(pg);
    const r5f = await EV(pg, () => ({ pane: __vis('#flw-fixp'), inP: !!document.activeElement.closest('#flw-fixp') }));
    await pg.keyboard.press('Escape'); await raf(pg);
    const r5g = await EV(pg, () => ({ pane: __vis('#flw-fixp'), ae: (document.activeElement || {}).id || document.activeElement.tagName }));
    await EV(pg, () => { const a = document.activeElement; if (a && a.blur) a.blur(); return 1; });
    T('R', bsHit && J(r5.sel) === J(r5.e) && r5.vis && r5.st < st0 && r5.pane && r5.n === '1/4' && r5.exp === 'true' && r5b.n === '2/4' && r5b.sel[0] === 1 && r5c.n === '1/4' && r5c.sel[0] === 0 && r5d === '2/4'
      && !r5e.pane && r5e.ae === 'BODY' && r5e.exp === 'false' && r5f.pane && r5f.inP && !r5g.pane && r5g.ae === 'beat-status',
      'R5 点 ⚠N → 光标落第一处、跟滚到可视（不压悬浮条）、面板 1/4 打开（aria-expanded）；› 第 2 处（光标跟过去）、‹ 回第 1 处；PageDown 下一处；鼠标打开的 Esc 收起焦点回谱面（body）；键盘 Enter 打开的焦点进面板、Esc 收起焦点回 ⚠N',
      J({ r5, r5b, r5c, r5d, r5e, r5f, r5g, st0 }));
    /* R6–R8 修法与原函数同结果（同一夹具副本上直接调用对拍），各一步撤销 */
    const cmp = async (key, fa, direct) => {
      await EV(pg, () => __err4()); await raf(pg);
      const j0 = await EV(pg, () => ({ j: JSON.stringify(song), u: undoStack.length }));
      await clickSel(pg, '#flw-errdots .flw-errdot[data-row="' + key[0] + '"][data-mi="' + key[1] + '"]'); await raf(pg);
      const has = await EV(pg, fa => __hit('#flw-fixp [data-fa="' + fa + '"]'), fa);
      await clickSel(pg, '#flw-fixp [data-fa="' + fa + '"]'); await raf(pg);
      const a = await EV(pg, () => ({ j: JSON.stringify(song), u: undoStack.length, t: ($i('toast') || {}).textContent }));
      const d = await EV(pg, ([j0, direct]) => { song = JSON.parse(j0.j); docs[curDocI].song = song; (new Function(direct))(); return JSON.stringify(song); }, [j0, direct]);
      return { has, same: a.j === d && a.j !== j0.j, du: a.u - j0.u, t: a.t };
    };
    const c1 = await cmp(['vox', 0], 'fix:fill', 'autoFixMeasure(0,"vox",0)');
    const c2 = await cmp(['tab', 2], 'fix:fill', 'autoFixMeasure(2,"tab",0)');
    const c3 = await cmp(['vox', 1], 'fix:trim', 'autoFixMeasure(1,"vox",0)');
    const c4 = await cmp(['vox', 0], 'fix:all', 'const all=beatErrors().slice().sort((x,y)=>y.mi-x.mi); all.forEach(er=>{ if(er.b>er.target+1e-4){ const r=overflowCarry(er.mi,er.row,er.vi,false); if(r&&r.ok) overflowCarry(er.mi,er.row,er.vi,true); } else autoFixMeasure(er.mi,er.row,er.vi); });');
    await EV(pg, () => { __one(__P('送别')); mutate(() => { const n = song.measures.length - 1; song.measures[n].voxes[0].push(__V(5, 4)); }); blurSel = true; render(); return 1; }); await raf(pg);
    const c5 = await (async () => { const j0 = await EV(pg, () => ({ j: JSON.stringify(song), u: undoStack.length, n: song.measures.length - 1 }));
      await clickSel(pg, '#flw-errdots .flw-errdot[data-row="vox"][data-mi="' + j0.n + '"]'); await raf(pg);
      const has = await EV(pg, () => __hit('#flw-fixp [data-fa="fix:carry"]'));
      await clickSel(pg, '#flw-fixp [data-fa="fix:carry"]'); await raf(pg);
      const a = await EV(pg, () => ({ j: JSON.stringify(song), u: undoStack.length, t: ($i('toast') || {}).textContent }));
      const d = await EV(pg, (j0) => { song = JSON.parse(j0.j); docs[curDocI].song = song; overflowCarry(j0.n, 'vox', 0, true); return JSON.stringify(song); }, j0);
      return { has, same: a.j === d && a.j !== j0.j, du: a.u - j0.u, t: a.t }; })();
    T('R', [c1, c2, c3, c4, c5].every(c => c.has && c.same && c.du === 1) && /已补齐第 1 小节/.test(c1.t) && /已删第 2 小节多余/.test(c3.t) && /已修 \d+ 处/.test(c4.t) && /已顺延到第 \d+ 小节/.test(c5.t),
      'R6–R8 补休止 / 补齐 / 删多余 / 全部修 / 顺延：结果与直接调 autoFixMeasure / #err-fixall 同口径 / overflowCarry 在同一夹具副本上逐字节相同，各一步撤销；提示条 ≤12 字短文', J({ c1, c2, c3, c4, c5 }));
    /* R9 两档撤掉；musetab-editmode 照读不写 */
    await clickSel(pg, '#flw-st-more'); await wait(pg, 200);
    const r9 = await EV(pg, () => { const p = $i('popmenu'); const o = { em: p ? p.querySelectorAll('[data-fa="st:em"]').length : -1, txt: p ? p.textContent : '' }; FLOW.menu.close(); return o; });
    const r9b = await EV(pg, () => ({ tog: !!$i('em-toggle'), togVis: __vis('#em-toggle'), mode: localStorage.getItem('musetab-editmode'), more: $i('flw-st-more').getAttribute('aria-label'), c: (FLOW.PARTS || []).includes('spd'),
      cmd: (() => { try { return (FLOW.cmd.search('编辑模式').hits || []).slice(0, 3).map(h => h.id); } catch (e) { return ['ERR ' + e.message]; } })() }));
    T('R', r9.em === 0 && !/时值检查|自由编辑|修复建议/.test(r9.txt) && r9b.tog && !r9b.togVis && r9b.mode === 'free' && r9b.more === '更多：播放',
      'R9 「⋯」菜单没有两档（名字「更多：播放」）；#em-toggle 节点照留不可见；预置 musetab-editmode=free 整套不变，红点照样给修法（R4–R8）', J({ r9, r9b }));
    if (r9b.c) T('R', r9b.cmd[0] === 'st:beat', 'R9b（C 轨合入后）命令面板搜「编辑模式」首条＝st:beat（st:emfree / st:emsmart 新形态隐藏）', J(r9b.cmd));
    else NOTE('R', '   ℹ️  R9b 命令面板「编辑模式」首条 st:beat 由 C 轨（FLOW.cmd 迁移清单）做，C 未合入只打印：' + J(r9b.cmd));
    /* R10 不出红点的场合 */
    await EV(pg, () => __err4()); await raf(pg);
    const r10 = {};
    const dotsVis = () => EV(pg, () => [...document.querySelectorAll('#flw-errdots .flw-errdot')].filter(__vis).length);
    r10.write = await dotsVis();
    await EV(pg, () => { setMode('engrave'); return 1; }); await wait(pg, 600); r10.engrave = await dotsVis();
    await EV(pg, () => { setMode('output'); return 1; }); await wait(pg, 600); r10.output = await dotsVis();
    await EV(pg, () => { setMode('write'); return 1; }); await wait(pg, 300);
    await pg.emulateMedia({ media: 'print' }); r10.print = await EV(pg, () => getComputedStyle($i('flw-errdots')).display); await pg.emulateMedia({ media: 'screen' });
    r10.snap = await EV(pg, () => !!new DOMParser().parseFromString(FLOW.snapHTML(), 'text/html').querySelector('#flw-errdots, .flw-errdot, #flw-fixp'));
    await EV(pg, () => { enterStand(); return 1; }); await wait(pg, 400); r10.stand = await dotsVis(); await EV(pg, () => { exitStand(); return 1; }); await wait(pg, 300);
    await EV(pg, () => { initStartPad(); return 1; }); await wait(pg, 300); r10.pad = await dotsVis(); await EV(pg, () => { hideStartPad(); render(); return 1; }); await wait(pg, 200);
    r10.back = await dotsVis();
    T('R', r10.write === 4 && !r10.engrave && !r10.output && r10.print === 'none' && !r10.snap && !r10.stand && !r10.pad && r10.back === 4,
      'R10 书写模式 4 枚；排版 / 输出 / 打印媒体 / 谱架 / 启动台不显示，快照不带；回书写照出', J(r10));
    /* R11 对比度 / 命中区（浅 / 深 / 系统深） */
    const r11 = [];
    for (const [sc, th] of [['light', 'light'], ['dark', 'dark'], ['dark', null]]) {
      const p2 = await open(1440, 900, { tag: 'R11-' + sc + th, scheme: sc });
      await EV(p2, (th) => { if (th) document.documentElement.dataset.theme = th; __err4(); return 1; }, th); await raf(p2);
      await clickSel(p2, '#flw-errdots .flw-errdot[data-row="vox"][data-mi="0"]'); await raf(p2);
      r11.push(Object.assign({ sc, th }, await EV(p2, () => { const p = $i('flw-fixp'), bs = [...p.querySelectorAll('button')], v = p.querySelector('.flw-fx-v');
        const d = [...document.querySelectorAll('#flw-errdots .flw-errdot')].map(x => { const r = x.getBoundingClientRect(); return Math.min(r.width, r.height); });
        return { cr: Math.min(...bs.map(__crOf), __crOf(v)), hit: Math.min(...bs.map(x => { const r = x.getBoundingClientRect(); return Math.min(r.width, r.height); })), dot: Math.min(...d) }; })));
      await shot(p2, 'R11-fixp-' + sc + (th || 'sys'));
      await close(p2);
    }
    T('R', r11.every(x => x.cr >= 4.5 && x.hit >= 28 && x.dot >= 24), 'R11 就地修面板按钮 / 读数对比度 ≥4.5（浅 / 深 / 系统深）、按钮命中区 ≥28、红点命中区 ≥24', J(r11));
    const k1 = await EV(pg, () => __keys());
    T('R', k1.every(k => k0.includes(k) || KNOWN_K(k)) && (await EV(pg, () => localStorage.getItem('musetab-editmode'))) === 'free', 'R·LS 红点就地修全程本机键只多谱面数据键、musetab-editmode 未被写', J(k1.filter(k => !k0.includes(k))));
    await close(pg);
  });

  /* ================= P 配伴奏后光标不动、下一次播放从第 1 小节起 ================= */
  if (want('P')) await SAFE('P', 'P', async () => {
    const order0 = pg => EV(pg, () => audio.evCtx && audio.evCtx.order ? audio.evCtx.order[0] : null);
    const space = async pg => { await EV(pg, () => { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); return 1; }); await pg.keyboard.press('Space'); await wait(pg, 250); };
    const stop = pg => EV(pg, () => { try { stopPlay(); } catch (_) {} setPlayBtn && setPlayBtn(); return 1; });
    /* P0 ?next=0 / 旧外壳：弹窗路径照旧把光标落到第 1 小节 */
    const p0 = [];
    for (const q of ['next=0', 'shell=classic']) {
      const pg = await open(1440, 900, { url: withQ(URL0, q), tag: 'P0-' + q });
      p0.push(await EV(pg, async () => { __new('JG'); __mel(); sel = { mi: 7, row: 'vox', vi: 0, ci: 2, si: 1 }; render(); await __raf2();
        $i('b-arrange').click(); const o = $i('arr-out'); if (o) o.value = 'fill'; $i('arr-go').click(); await __raf2(); return { q: location.search, sel: [sel.mi, sel.ci], acc: song.measures[0].voxes.length }; }));
      await close(pg);
    }
    T('P', p0.every(x => x.sel[0] === 0 && x.sel[1] === 0), 'P0 ?next=0 / 旧外壳：弹窗配伴奏后光标落第 1 小节（v69.0 原样）', J(p0));
    const pg = await open(1440, 900, { tag: 'P' });
    const setup = async () => { await EV(pg, async () => { __shut(); __new('JG'); __mel(); sel = { mi: 7, row: 'vox', vi: 0, ci: 2, si: 1 }; blurSel = false; render(); await __raf2(); return 1; }); await wait(pg, 700); };
    /* P1 主按钮「配伴奏」 */
    await setup();
    const p1a = await EV(pg, () => ({ go: ($i('flw-sb-go') || {}).textContent, hit: __hit('#flw-sb-go'), acc: JSON.stringify(song.measures.map(m => m.voxes[1])) }));
    await clickSel(pg, '#flw-sb-go'); await raf(pg);
    const p1 = await EV(pg, () => ({ sel: [sel.mi, sel.row, sel.vi, sel.ci], acc: JSON.stringify(song.measures.map(m => m.voxes[1])), once: !!PLAY_ONCE, modal: !!$i('modal-mask') }));
    T('P', /配伴奏/.test(p1a.go || '') && p1a.hit && J(p1.sel) === J([7, 'vox', 0, 2]) && p1.acc !== p1a.acc && p1.once && !p1.modal,
      'P1 钢琴伴奏歌谱光标在第 8 小节第 3 拍 → 主按钮「配伴奏」（可见、中心命中）→ 光标不动（mi / row / vi / ci 逐值相等）、伴奏已写入、记下一次性起点', J({ p1a: { go: p1a.go, hit: p1a.hit }, p1 }));
    /* P2 空格从第 1 小节起；停止后光标仍在第 8 小节；再按从光标处 */
    await space(pg); const o1 = await order0(pg); await space(pg); await stop(pg);
    const s2 = await EV(pg, () => [sel.mi, sel.ci]);
    await space(pg); const o2 = await order0(pg); await stop(pg);
    T('P', o1 === 0 && J(s2) === J([7, 2]) && o2 === 7, 'P2 紧接按空格＝从第 1 小节起播（audio.evCtx.order[0]＝0）；停止后光标仍在第 8 小节；再按空格＝从光标处（order[0]＝7，只用一次）', J({ o1, s2, o2 }));
    /* P3 配完先点第 5 小节再播＝从第 5 小节 */
    await setup(); await clickSel(pg, '#flw-sb-go'); await raf(pg);
    const c5 = await EV(pg, () => { const b = colBoxes['v0:4:0'], sc = $i('score'), R = sc.getBoundingClientRect(), k = R.width / sc.viewBox.baseVal.width; return { x: R.left + (b.x + b.w / 2) * k, y: R.top + (b.y + b.h / 2) * k }; });
    await pg.mouse.click(c5.x, c5.y); await raf(pg);
    const s3 = await EV(pg, () => sel.mi);
    await space(pg); const o3 = await order0(pg); await stop(pg);
    T('P', s3 === 4 && o3 === 4, 'P3 配伴奏后先点第 5 小节再播放＝从第 5 小节起（一次性起点作废）', J({ s3, o3 }));
    /* P4 循环优先 */
    await setup(); await clickSel(pg, '#flw-sb-go'); await raf(pg);
    await EV(pg, () => { setLoop(2, 3); return 1; });
    await space(pg); const o4 = await order0(pg); await stop(pg); await EV(pg, () => { setLoop(null); return 1; });
    /* 撤销作废 */
    await setup(); await clickSel(pg, '#flw-sb-go'); await raf(pg); await EV(pg, () => { undo(); return 1; });
    await space(pg); const o4b = await order0(pg); await stop(pg);
    T('P', o4 === 2 && o4b === 7, 'P4 配伴奏后设循环第 3–4 小节 → 从第 3 小节起（循环优先）；配伴奏后撤销再播＝从光标处（song 换了，作废）', J({ o4, o4b }));
    /* P5 织体条点卡 / 智能 ▾ 织体卡 / 钢琴弹唱谱「生成伴奏」 */
    const p5 = {};
    await EV(pg, async () => { __shut(); __new('JG'); __mel(); fillAccompaniment('block', true); sel = { mi: 6, row: 'vox', vi: 0, ci: 1, si: 1 }; blurSel = false; render(); await __raf2(); return 1; }); await wait(pg, 700);
    await clickSel(pg, '#flw-sb-go'); await raf(pg);
    const card = '#flw-nx-tbar [role="option"][data-v="arp8"]';
    p5.cardHit = await EV(pg, s => __hit(s), card);
    await clickSel(pg, card); await raf(pg);
    p5.tbar = await EV(pg, () => ({ sel: [sel.mi, sel.ci], once: !!PLAY_ONCE }));
    await space(pg); p5.o1 = await order0(pg); await stop(pg);
    await EV(pg, async () => { __shut(); __new('JG'); __mel(); fillAccompaniment('block', true); sel = { mi: 5, row: 'vox', vi: 0, ci: 0, si: 1 }; blurSel = false; render(); await __raf2(); return 1; }); await wait(pg, 400);
    await clickSel(pg, '#flw-sbar [data-fa="sbar:more"]'); await wait(pg, 250);
    p5.galHit = await EV(pg, () => __hit('#popmenu .flw-gc[data-v="tex"]'));
    await clickSel(pg, '#popmenu .flw-gc[data-v="tex"]'); await raf(pg);
    await clickSel(pg, card); await raf(pg);
    p5.gal = await EV(pg, () => ({ sel: [sel.mi, sel.ci], once: !!PLAY_ONCE }));
    await space(pg); p5.o2 = await order0(pg); await stop(pg);
    await EV(pg, async () => { __shut(); __new('CG'); mutate(() => { song.measures.forEach(m => { m.voxes[0][0].chord = 'C'; }); }); sel = { mi: 3, row: 'vox', vi: 0, ci: 0, si: 1 }; blurSel = false; render(); await __raf2(); return 1; }); await wait(pg, 700);
    p5.cgGo = await EV(pg, () => ($i('flw-sb-go') || {}).textContent);
    await clickSel(pg, '#flw-sb-go'); await raf(pg);
    p5.cg = await EV(pg, () => ({ sel: [sel.mi], once: !!PLAY_ONCE, filled: song.measures.some(m => (m.voxes[1] || []).some(c => c && c.deg)) }));
    await space(pg); p5.o3 = await order0(pg); await stop(pg);
    T('P', p5.cardHit && J(p5.tbar.sel) === J([6, 1]) && p5.tbar.once && p5.o1 === 0 && p5.galHit && J(p5.gal.sel) === J([5, 0]) && p5.o2 === 0 && /生成伴奏/.test(p5.cgGo || '') && p5.cg.sel[0] === 3 && p5.cg.filled && p5.o3 === 0,
      'P5 织体条点卡 / 「智能 ▾」织体卡 / 钢琴弹唱谱主按钮「生成伴奏」写入后：光标不动、下一次播放从第 1 小节起', J(p5));
    /* P6 节奏型条（不在范围内）：写入后播放从光标处 */
    await EV(pg, async () => { __shut(); __new('JT', { meta: { pen: 'J' } }); __mel(); mutate(() => { song.measures.forEach((m, i) => { m.voxes[0][0].chord = ['C', 'Am', 'F', 'G'][i % 4]; m.tabs[0][0].notes = [{ s: 2, f: 1 }]; }); });
      sel = { mi: 3, row: 'tab', vi: 0, ci: 0, si: 1 }; render(); await __raf2(); FLOW.nx.rbar.open({ src: 'tool' }); await __raf2(); return 1; }); await wait(pg, 300);
    const rc = await EV(pg, () => { const c = [...document.querySelectorAll('#flw-nx-rbar [role="option"]')][1]; return c ? '#flw-nx-rbar [role="option"][data-v="' + c.dataset.v + '"]' : null; });
    if (rc) await clickSel(pg, rc); await raf(pg);
    const p6 = await EV(pg, () => ({ sel: sel.mi, once: !!PLAY_ONCE }));
    await space(pg); const o6 = await order0(pg); await stop(pg);
    T('P', !!rc && p6.sel === 3 && !p6.once && o6 === 3, 'P6 节奏型条写入（默认作用于本小节，不在 TCH-9 范围）：不设一次性起点，播放从光标处', J({ rc: !!rc, p6, o6 }));
    await close(pg);
  });

  /* ================= D 右栏默认 52 带字竖条 ================= */
  if (want('D')) await SAFE('D', 'D', async () => {
    const st = pg => EV(pg, () => ({ rd: __R('#right-dock'), rdv: __vis('#right-dock'), rs: __R('#flw-rstrip'), rsv: __vis('#flw-rstrip'), cls: ['flw-rd', 'flw-rs', 'flw-ro'].filter(c => document.body.classList.contains(c)),
      sw: $i('score-wrap').clientWidth, iw: innerWidth, key: localStorage.getItem('musetab-rdock') }));
    /* D0 ?next=0 原样 */
    const d0 = [];
    for (const w of [1280, 1440]) { const pg = await open(w, 900, { url: withQ(URL0, 'next=0'), tag: 'D0-' + w }); await EV(pg, () => __songbie()); await raf(pg); d0.push(Object.assign({ w }, await st(pg))); await close(pg); }
    T('D', !d0[0].rdv && d0[0].rsv && Math.abs(d0[0].rs.w - 40) < 1 && d0[1].rdv && !d0[1].rsv && Math.abs(d0[1].rd.w - 264) < 1, 'D0 ?next=0：1280 竖条 40、1440 停靠 264（v69.0 原样）', J(d0.map(x => [x.w, x.rdv, x.rsv, x.rs && x.rs.w, x.rd && x.rd.w])));
    /* D1 新形态 1280 / 1440 / 1920 */
    const d1 = [];
    for (const w of [1280, 1440, 1920]) { const pg = await open(w, 900, { tag: 'D1-' + w }); await EV(pg, () => __songbie()); await raf(pg);
      const s = await st(pg);
      s.btn = await EV(pg, () => [...document.querySelectorAll('#flw-rstrip .flw-rs-b')].filter(__vis).map(x => { const r = x.getBoundingClientRect(), v = x.querySelector('.flw-rs-v'); return { t: v.textContent, br: v.querySelectorAll('br').length, w: Math.round(r.width), h: Math.round(r.height), hit: __hit(x), lines: Math.round(v.getBoundingClientRect().height / parseFloat(getComputedStyle(v).lineHeight)) }; }));
      if (w === 1440) await shot(pg, 'D1-strip-1440');
      d1.push(Object.assign({ w }, s)); await close(pg); }
    T('D', d1.every(x => x.rsv && !x.rdv && Math.abs(x.rs.w - 52) < 1 && J(x.cls) === '["flw-rs"]' && Math.abs(x.sw - (x.iw - 248 - 52)) <= 1 && J(x.btn.map(b => b.t)) === J(['属性', '文字', '钉住']) && x.btn.every(b => b.br === 0 && b.lines === 1 && b.w >= 44 && b.h >= 44 && b.hit)),
      'D1 新形态 1280 / 1440 / 1920：竖条 52、#right-dock 不显示（body.flw-rs）、#score-wrap 内容宽＝视口 − 248 − 52；竖条键「属性 / 文字 / 钉住」横排一行、命中区 ≥44×44', J(d1.map(x => [x.w, x.rs && x.rs.w, x.rdv, x.sw, x.iw - 300, x.btn.map(b => b.t + ':' + b.w + 'x' + b.h + ':' + b.lines)])));
    /* D2 浮出 / 钉住 / 刷新 / 取消钉住（1440） */
    const pg = await open(1440, 900, { tag: 'D2' });
    await EV(pg, () => __songbie()); await raf(pg);
    await clickSel(pg, '#flw-rstrip [data-fa="rd:tab"][data-p="prop"]'); await raf(pg);
    const a = await EV(pg, () => ({ ro: document.body.classList.contains('flw-ro'), w: __R('#right-dock').w, ci: __vis('#cursor-info'), pin: __vis('#flw-rd-pin') }));
    await clickSel(pg, '#flw-rstrip [data-fa="rd:tab"][data-p="prop"]'); await raf(pg);
    const a2 = await EV(pg, () => document.body.classList.contains('flw-ro'));
    await clickSel(pg, '#flw-rs-pin'); await wait(pg, 300);
    const c = await st(pg);
    await pg.reload(); await wait(pg, 1200); await EV(pg, HELP); await EV(pg, () => __songbie()); await raf(pg);
    const c2 = await st(pg);
    const unpinVis = await EV(pg, () => __hit('#flw-rd-pin'));
    await clickSel(pg, '#flw-rd-pin'); await wait(pg, 300);
    const c3 = await st(pg);
    T('D', a.ro && Math.abs(a.w - 288) < 1 && a.ci && a.pin && !a2 && c.rdv && Math.abs(c.rd.w - 264) < 1 && !c.rsv && c.key === '1' && c2.rdv && c2.key === '1' && unpinVis && !c3.rdv && c3.rsv && c3.key === null,
      'D2 点竖条「属性」→ 浮出 288、#cursor-info 可见、浮出页上有「钉住」；再点收起；钉住 → 停靠 264、musetab-rdock=1、刷新保持；停靠页「取消钉住」可见可点 → 删键回竖条', J({ a, a2, c: [c.rdv, c.rd && c.rd.w, c.key], c2: [c2.rdv, c2.key], unpinVis, c3: [c3.rdv, c3.rsv, c3.key] }));
    /* D3 排版竖条「版式」；输出无页（B2 合入后判） */
    await EV(pg, () => { setMode('engrave'); return 1; }); await wait(pg, 500);
    const e = await EV(pg, () => ({ ps: [...document.querySelectorAll('#flw-rstrip .flw-rs-b[data-p]')].filter(__vis).map(x => x.querySelector('.flw-rs-v').textContent), rs: __vis('#flw-rstrip') }));
    await EV(pg, () => { setMode('output'); return 1; }); await wait(pg, 500);
    const o = await EV(pg, () => ({ pages: FLOW.rd.pagesFor('output').length, rs: __vis('#flw-rstrip'), rd: __vis('#right-dock') }));
    await EV(pg, () => { setMode('write'); return 1; });
    T('D', e.rs && J(e.ps) === J(['版式']), 'D3 排版模式竖条只有「版式」（横排）', J(e));
    if (o.pages === 0) T('D', !o.rs && !o.rd, 'D3b（B2 合入后）输出模式右栏与竖条都不显示', J(o));
    else NOTE('D', '   ℹ️  D3b 输出模式「右栏无页、竖条隐藏」由 B 轨 B2（BY_MODE.output=[]）做，未合入只打印：' + J(o));
    await close(pg);
  });

  /* ================= KS 键盘 32 小节旋律 / 快捷键菜单 ================= */
  if (want('KS')) await SAFE('KS', 'KS', async () => {
    const HELP_V690 = '常用快捷键音高 · 品位0–7时值Q W E R T Y U附点 / 增时.  ·  D  ·  Shift+D八度+  /  −连音线~插入 / 删除Insert · Delete · Backspace播放 / 暂停空格输入和弦Ctrl+K撤销 · 重做Ctrl+Z · Ctrl+Y切换声部Alt+↑ / Alt+↓新建 · 悬浮条Alt+N · Alt+B帮助与教程…更新日志';
    const res = {};
    for (const [tag, url] of [['nx', URL0], ['n0', withQ(URL0, 'next=0')]]) {
      const pg = await open(1440, 900, { url, tag: 'KS-' + tag });
      const KEY = { 1: 'q', 2: 'w', 4: 'e', 8: 'r', 16: 't', 32: 'y', 64: 'u' };
      const tgt = await EV(pg, () => { const s = __P('送别'); let M = s.measures.map(m => (m.voxes[0] || []).map(c => ({ deg: c.deg, dur: c.dur, dotted: c.dotted || false, acc: c.acc || '', oct: c.oct || 0, tie: !!c.tie }))); M = M.concat(JSON.parse(JSON.stringify(M)));
        const s2 = createSong('vocal', { beats: s.beats, unit: s.unit, key: 'C', nMea: M.length, nTab: 0, nVox: 1, lyr: 0 }); __one(s2); sel = { mi: 0, row: 'vox', vi: 0, ci: 0, si: 1 }; blurSel = false; render(); return M; });
      let keys = 0, pane = 0; const press = async k => { keys++; await pg.keyboard.press(k); };
      for (const cs of tgt) for (const t of cs) {
        const ed = await pg.evaluate(() => { const c = curCol(); return c ? c.dur : null; });
        let post = [];
        if (t.dotted && t.dur === 2) { if (ed !== 2) await press('w'); post = ['d']; }
        else if (t.dotted) { if (ed !== t.dur) await press(KEY[t.dur]); post = ['.']; }
        else if (ed !== t.dur) await press(KEY[t.dur]);
        await press(String(t.deg));
        for (let i = 0; i < Math.abs(t.oct); i++) await press(t.oct > 0 ? '+' : '-');
        if (t.acc === '#') await press('Shift+Digit3'); if (t.acc === 'b') await press('b');
        for (const k of post) await press(k);
        if (t.tie) await press('Shift+Backquote');
        if (await pg.evaluate(() => !!(document.getElementById('flw-fixp') && !document.getElementById('flw-fixp').hidden))) pane++;
      }
      const r = await EV(pg, (tgt) => { const f = c => c.deg + '/' + c.dur + (c.dotted ? '.' : '') + (c.oct ? 'o' + c.oct : '') + (c.tie ? '~' : '');
        const got = song.measures.map(m => m.voxes[0].filter(c => c).map(f).join(' ')), wantS = tgt.map(cs => cs.map(f).join(' '));
        let bad = 0; wantS.forEach((w, i) => { const g = (got[i] || '').replace(/( 0\/\d+\.?)+$/, ''); if (g !== w && got[i] !== w) bad++; });
        return { bad, be: beatErrors().length, j: JSON.stringify(song.measures) }; }, tgt);
      await clickSel(pg, '#flw-st-help'); await wait(pg, 200);
      const hm = await EV(pg, () => { const p = $i('popmenu'); const t = p ? p.textContent.replace(/\s+/g, '') : ''; FLOW.menu.close(); return t; });
      res[tag] = { keys, pane, bad: r.bad, be: r.be, j: r.j, hm };
      await close(pg);
    }
    T('KS', res.nx.keys === 232 && res.n0.keys === 232 && res.nx.bad === 0 && res.nx.be === 0 && res.nx.pane === 0 && res.nx.j === res.n0.j,
      'KS1 键盘写 32 小节旋律（送别×2，tv_v688 KC 同贪心打法）：新形态 232 键、与 ?next=0 键数与结果逐字节相同、无节拍错误；写的过程中就地修面板一次也没弹', J({ nx: [res.nx.keys, res.nx.bad, res.nx.be, res.nx.pane], n0: [res.n0.keys], same: res.nx.j === res.n0.j }));
    T('KS', res.nx.hm === HELP_V690.replace(/\s+/g, '') && res.n0.hm === res.nx.hm, 'KS2 快捷键菜单（状态栏 ?）与 v69.0 逐字节相同（新形态 / ?next=0）', J({ nx: res.nx.hm.slice(0, 80) }));
  });

  /* ================= 汇总 ================= */
  const order = ['Z', 'H', 'R', 'P', 'D', 'KS'];
  for (const k of order) (OUT[k] || []).forEach(l => console.log(l));
  const real = errs.filter(e => !/ResizeObserver|AudioContext|autoplay/i.test(e));
  T('ERR', real.length === 0, '页面脚本错误 0', real.slice(0, 6).join(' | '));
  (OUT.ERR || []).forEach(l => console.log(l));
  console.log('\n' + (pass === total ? 'PASS' : 'FAIL') + ' ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
