/* v68.7 S0 文字量审计 · 页内抽取（tv_textbudget 用）。
   出处：界面简约化方案阶段的审计工具 f83ux/extract.js（口径见 docs/design-2026-10g/research/01-text-audit.md 与 audit.json），原样入库，只改两处：
   ① 区域表加 ['#flw-sbar', 'sbar']（v68.3 起悬浮条在 #score-wrap 里，原表记成 score-area；只影响区域标签与入口表，不影响任何字数）；
   ② 另挂 window.__auditWhy()：可见元素上的 data-why（置灰原因）——P3 指路词扫描用，不进 __audit() 的任何计数。
   ③ v68.8：状态栏位置读数记 num——#flw-st-pos 里的可见文字符合读数格式（「第 12/16 小节 · 1 拍」「第 2–4/16 小节」，拍位可带小数，窄屏无「· N 拍」）时
      种类记 num（读数，不计入总字 / 说明字），此前两位数小节 9 字被 kind() 记成 desc；只认这个元素 + 这个格式（别处同样文字、追加了句子的读数照旧按 kind()），
      悬停 title（全称「第 12 小节，共 16 · 第 1 拍」）不变，仍按 kind() 计入悬停字数。
   作为 init 脚本注入（ctx.addInitScript），定义 window.__audit()。字＝\p{L}\p{N}；分组、种类（label / phrase / desc / key / num / sym）、
   可点元素、纯图标钮、悬停 title 的判定与方案阶段逐字节相同。 */
module.exports = function INIT() {
  const PUNCT = /[，。；：、！？（）“”「」]|[,;:!?](\s|$)/;
  const KEYRE = /^(Ctrl|Alt|Shift|Cmd|⌘|Esc|Enter|Tab|Del|Delete|Insert|Backspace|Space|空格|F\d{1,2})([+\s·\/ ]|$)|^[A-Z]$|^(Ctrl|Alt|Shift)\s*\/?$/i;
  const cnt = s => (String(s).match(/[\p{L}\p{N}]/gu) || []).length;
  const isKey = (el, t) => (el && el.closest && el.closest('kbd')) || /^((Ctrl|Alt|Shift|Cmd|⌘)\s*[+＋]\s*)+\S+$/i.test(t) || /^Ctrl\s*\/$/.test(t) || /^(Esc|Enter|F\d+)$/.test(t);
  const kind = (t, el) => {
    const n = cnt(t);
    if (!n) return 'sym';
    if (isKey(el, t)) return 'key';
    if (/^[\d\s.%×x:/–\-+=♩ᵛᵃᵇ▾]+$/.test(t)) return 'num';
    if (PUNCT.test(t) || n > 8) return 'desc';
    if (n <= 4) return 'label';
    return 'phrase';
  };
  /* ③ v68.8 状态栏位置读数（posHTML 的可见格式；拍位 pos().beat 是两位小数内的数，如 1.33 / 2.5） */
  const POS_RE = /^第 \d+(–\d+)?\/\d+ 小节( · \d+(\.\d+)? 拍)?$/;
  const INLINE = new Set(['inline', 'contents']);
  const CLICK = 'button, a[href], [role=button], [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox], [role=option], [role=tab], [role=radio], [role=checkbox], [role=switch], summary, label, select, [data-fa], [data-q], [data-scene], [data-sp], [data-fm], [onclick]';
  const regionOf = el => {
    const R = [
      ['#flw-tour', () => 'tour'], ['#modal-mask', () => 'modal'], ['.nf-qm', () => 'quickmenu'],
      ['#popmenu', e => 'menu:' + (e.dataset.m || (e.classList.contains('flw-cmd') ? 'cmd' : e.className.replace(/\s+/g, '.')))],
      ['#flw-msheet', e => 'm-sheet:' + (document.querySelector('[data-fm="sheet"][aria-expanded="true"]') || { dataset: {} }).dataset.v],
      ['#flw-mtop', () => 'm-top'], ['#flw-mbar', () => 'm-bar'],
      ['#flw-r1', () => 'row1'], ['#editbar', () => 'row2'],
      ['#flw-trk', () => 'left-track'], ['#flw-pal', () => 'left-sign'], ['#flw-lay-rep', () => 'left-layout'], ['#flw-out-list', () => 'left-output'], ['#flw-left', () => 'left'],
      ['#right-dock', () => 'right'], ['#flw-rstrip', () => 'rstrip'], ['#mixer-dock', () => 'status'],
      ['#start-pad', () => 'startpad'], ['#flw-sbar', () => 'sbar'], ['#lb-wrap', () => 'typebar'], ['#toast', () => 'toast'], ['#score-wrap', () => 'score-area'], ['#top', () => 'top-other']
    ];
    for (const [s, f] of R) { const c = el.closest(s); if (c) return f(c); }
    let b = el; while (b.parentElement && b.parentElement !== document.body) b = b.parentElement;
    return 'body:' + (b.id || b.className || b.tagName);
  };
  const styleVis = el => { for (let x = el; x && x.nodeType === 1; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; } return true; };
  const clipRects = el => { const out = []; for (let x = el.parentElement; x && x !== document.documentElement; x = x.parentElement) { const cs = getComputedStyle(x); if (/(hidden|auto|scroll|clip)/.test(cs.overflow + cs.overflowX + cs.overflowY)) out.push(x.getBoundingClientRect()); } return out; };
  const inter = (a, b) => !(a.right <= b.left + 1 || a.left >= b.right - 1 || a.bottom <= b.top + 1 || a.top >= b.bottom - 1);
  const VP = () => ({ left: 0, top: 0, right: innerWidth, bottom: innerHeight });
  const notOcc = (el, r) => {
    const pts = [[(r.left + r.right) / 2, (r.top + r.bottom) / 2], [r.left + Math.min(4, r.width / 3), (r.top + r.bottom) / 2], [r.right - Math.min(4, r.width / 3), (r.top + r.bottom) / 2]];
    for (const [x, y] of pts) {
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const h = document.elementFromPoint(x, y); if (!h) continue;
      if (h === el || el.contains(h) || h.contains(el)) return true;
    }
    return false;
  };
  const anchorOf = el => { let a = el; while (a && a !== document.body && INLINE.has(getComputedStyle(a).display) && !/^(BUTTON|A|KBD|LABEL|OPTION|SELECT|SUMMARY|TD|TH|LI|H[1-6]|P)$/.test(a.tagName)) a = a.parentElement; return a || el; };
  const desc = el => { if (!el || el.nodeType !== 1) return ''; let s = el.tagName.toLowerCase(); if (el.id) s += '#' + el.id; else if (el.classList.length) s += '.' + [...el.classList].slice(0, 2).join('.');
    const da = el.dataset || {}; ['fa', 'm', 'q', 'scene', 'v', 'fm', 'sp', 'tour'].forEach(k => { if (da[k] != null) s += '[data-' + k + '=' + da[k] + ']'; }); return s; };
  const SKIP = el => el.closest('script,style,noscript,template,#score,#paper,.pagebg,#boot-veil,svg');

  /* 读屏专用（视觉隐藏）：clip / clip-path 裁成 0 或 1px 盒 */
  const srOnly = el => { for (let x = el; x && x.nodeType === 1 && x !== document.body; x = x.parentElement) { const cs = getComputedStyle(x); const r = x.getBoundingClientRect();
      if ((cs.clip && cs.clip !== 'auto' && /rect\(\s*0/.test(cs.clip)) || /inset\(50%|inset\(100%/.test(cs.clipPath || '') || (cs.position === 'absolute' && r.width <= 2 && r.height <= 2)) return true; } return false; };
  window.__audit = (opt) => {
    opt = opt || {};
    const groups = new Map(); const order = [];
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) {
      const t = n.nodeValue; if (!t || !t.trim()) continue;
      const p = n.parentElement; if (!p || SKIP(p)) continue;
      if (!styleVis(p) || srOnly(p)) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      const rs = [...rg.getClientRects()].filter(r => r.width > 0.5 && r.height > 0.5);
      if (!rs.length) continue;
      const clips = clipRects(p);
      const vr = rs.filter(r => inter(r, VP()) && clips.every(c => inter(r, c)));
      if (!vr.length) continue;
      const occ = !vr.some(r => notOcc(p, r));
      const a = anchorOf(p);
      let g = groups.get(a);
      if (!g) { g = { el: a, parts: [], occ: true, rects: [] }; groups.set(a, g); order.push(a); }
      g.parts.push(t); if (!occ) g.occ = false; g.rects.push(...vr);
    }
    /* 输入框 placeholder / value、select 选中项 */
    document.querySelectorAll('input, textarea, select').forEach(el => {
      if (SKIP(el) || !styleVis(el)) return; const r = el.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0) || !inter(r, VP())) return;
      if (!clipRects(el).every(c => inter(r, c))) return;
      let t = ''; if (el.tagName === 'SELECT') t = (el.options[el.selectedIndex] || {}).text || ''; else if (/^(text|search|number|)$/.test(el.type || '') || el.tagName === 'TEXTAREA') t = el.value || el.placeholder || '';
      if (!t.trim()) return;
      groups.set(el, { el, parts: [t], occ: !notOcc(el, r), rects: [r], input: true }); order.push(el);
    });
    const clicks = new Map(); let ci = 0;
    const out = order.map(el => {
      const g = groups.get(el); const text = g.parts.join('').replace(/\s+/g, ' ').trim();
      const c = el.closest(CLICK);
      let cid = null; if (c) { if (!clicks.has(c)) clicks.set(c, { id: ci++, el: c, g: [] }); cid = clicks.get(c).id; }
      const r = g.rects.reduce((m, x) => ({ l: Math.min(m.l, x.left), t: Math.min(m.t, x.top), r: Math.max(m.r, x.right), b: Math.max(m.b, x.bottom) }), { l: 1e9, t: 1e9, r: -1e9, b: -1e9 });
      let trunc = false; try { for (let x = el; x && x !== document.body && !trunc; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.textOverflow === 'ellipsis' && x.scrollWidth > x.clientWidth + 1) trunc = true; if (x === c) break; } } catch (_) {}
      const k0 = kind(text, el);
      const k = (k0 !== 'sym' && el.closest && el.closest('#flw-st-pos') && POS_RE.test(text)) ? 'num' : k0;   /* ③ v68.8 */
      const o = { region: regionOf(el), text, n: cnt(text), k, el: desc(el), click: cid, occ: g.occ, input: !!g.input, trunc, box: [Math.round(r.l), Math.round(r.t), Math.round(r.r - r.l), Math.round(r.b - r.t)] };
      if (cid != null) clicks.get(c).g.push(o);
      return o;
    }).filter(o => o.n > 0);
    /* 可点元素：标签（首组）· 是否带副标题 */
    const cl = [...clicks.values()].map(c => {
      const gs = c.g.filter(x => x.k !== 'key' && x.k !== 'sym' && !x.occ);
      const label = (gs[0] || {}).text || c.el.getAttribute('aria-label') || c.el.getAttribute('title') || '';
      const sub = gs.slice(1).filter(x => x.k === 'desc' || x.k === 'phrase');
      return { id: c.id, el: desc(c.el), region: regionOf(c.el), label, aria: c.el.getAttribute('aria-label') || '', title: c.el.getAttribute('title') || '', sub: sub.map(x => x.text), subN: sub.reduce((s, x) => s + x.n, 0), occ: !gs.length };
    });
    /* 图标按钮（无可见文字）：可点、可见、但没有任何可见文字组 */
    const iconOnly = [];
    document.querySelectorAll('button, [role=button], [role=menuitem], [role=tab]').forEach(b => {
      if (clicks.has(b) || SKIP(b) || !styleVis(b)) return; const r = b.getBoundingClientRect(); if (!(r.width > 4 && r.height > 4) || !inter(r, VP())) return;
      if (!clipRects(b).every(c => inter(r, c)) || !notOcc(b, r)) return;
      iconOnly.push({ el: desc(b), region: regionOf(b), aria: b.getAttribute('aria-label') || '', title: b.getAttribute('title') || '' });
    });
    /* 悬停提示：可见元素上的 title= */
    const titles = [];
    document.querySelectorAll('[title]').forEach(e => {
      if (e.tagName === 'svg' || SKIP(e) || !styleVis(e)) return; const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0) || !inter(r, VP())) return;
      if (!clipRects(e).every(c => inter(r, c)) || !notOcc(e, r)) return;
      const t = e.getAttribute('title'); if (!t || !t.trim()) return;
      titles.push({ region: regionOf(e), el: desc(e), text: t, n: cnt(t), k: kind(t, e) });
    });
    return { groups: out, clicks: cl, iconOnly, titles, vw: innerWidth, vh: innerHeight };
  };
  /* v68.7：可见元素（同 title 的可见判定）上的 data-why 文字——只给 P3 扫描用 */
  window.__auditWhy = () => {
    const out = [];
    document.querySelectorAll('[data-why]').forEach(e => {
      if (SKIP(e) || !styleVis(e)) return; const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0) || !inter(r, VP())) return;
      if (!clipRects(e).every(c => inter(r, c)) || !notOcc(e, r)) return;
      const t = e.getAttribute('data-why'); if (!t || !t.trim()) return;
      out.push({ region: regionOf(e), el: desc(e), text: t, n: cnt(t) });
    });
    return out;
  };
};
