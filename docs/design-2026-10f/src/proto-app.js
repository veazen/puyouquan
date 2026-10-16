/* 原型宿主：数据＝真实编辑器导出的外壳模型（data/models.json）＋引擎实拍谱纸。点击只改原型状态，不模拟业务。
   深链：#doc=pacc&trk=vox:1&mode=engrave&theme=dark&menu=file&open=8&dens=glyph&q=yc&cmd=ych&right=smart&ro=1&sheet=trk */
(function () {
  const FX = window.FX, $ = s => document.querySelector(s);
  const M = window.MODELS, IMG = window.IMGS;
  const KEYS = ['gtr', 'pacc', 'choir', 'teach', 'new', 'piano', 'minuet', 'etude'];
  const KIND_KEY = { gtr: 'guitar', pacc: 'pianoacc', choir: 'choir', teach: 'teach', new: 'pianoacc', piano: 'piano', minuet: 'instr', etude: 'solo' };
  const clone = o => JSON.parse(JSON.stringify(o));
  const D = KEYS.map(k => { const m = clone(M.docModels[k]); m.key0 = k; m.kindKey = KIND_KEY[k]; return m; });
  D[4].step = 0; D[4].isNew = true;   /* 新建的钢琴伴奏歌谱：起步三步 */
  D[1].step = null; D[1].errors = 0; D[1].recent = ['tie', 'fermata', 'dyn-mf', 'hair-cresc', 'accent', 'breath'];
  D[1].selNote = Object.assign(D[1].selNote || {}, { pos: '第 1 小节 · 第 1 拍', pitch: '5（G4）', dur: '四分音符', marks: ['dyn-mp'] });
  D[0].selNote = Object.assign(D[0].selNote || {}, { pos: '第 1 小节 · 第 1 列', pitch: '3 弦 0 品', dur: '八分音符', marks: [] });
  D.forEach((m, i) => { m.pageThumbs = [IMG['pv-1'], IMG['pv-2']]; m.user = '林'; m.save = { saved: !!M.docs[i].saved, time: ['', '', '09:58', '', '', '10:12', '', ''][i] || '10:42' }; m.pages = M.layout.pages; m.layoutIssues = [];
    m.kindSwitch = [['钢琴伴奏歌谱（五线谱）', '旋律改五线谱，伴奏不动 · 可撤销', FX.ic('type16-pianoacc', 16)], ['教学对照谱（含伴奏）', '旋律加简谱对照 · 不动音符', FX.ic('type16-teach', 16)], ['吉他弹唱谱', '不同源：钢琴伴奏不能直接换成六线谱', FX.ic('type16-guitar', 16), 1]]; });
  /* 版面检查（引擎实算：layoutSystems / PV_GEO，送别配伴奏后） */
  const L = M.layout;
  D[1].layoutIssues = [['共 ' + L.pages + ' 页 · ' + L.perLine.length + ' 行', '全谱', 0], ['每行小节 ' + L.perLine.join(' · '), '均匀', 0], ['末行 ' + L.perLine[L.perLine.length - 1] + ' 小节 · 拉满', '行 ' + L.perLine.length, 0], ['第 ' + (L.perLine.slice(0, 3).reduce((a, b) => a + b, 0)) + ' 小节后翻页', '第 1 → 2 页', 1]];
  D.forEach(m => { if (!m.layoutIssues.length) m.layoutIssues = D[1].layoutIssues; });
  /* 分谱：按演奏者，不按谱行 */
  const players = m => { const P = [], g = (m.groups || []);
    m.tracks.forEach((t, j) => { const gg = g.find(x => j >= x.from && j <= x.to);
      if (gg && gg.type === 'brace') { if (j === gg.from) P.push(['钢琴', '大谱表（右手 + 左手）算 1 份']); return; }
      if (t.k === 'tab') P.push([(m.inst === 'uku' ? '尤克里里' : '吉他') + ' · ' + t.name, '六线谱 + 简谱行 + 五线联排']);
      else P.push(['人声 · ' + t.name, t.lyrics ? '旋律 + 歌词 + 和弦' : '旋律']); });
    if (g.some(x => x.type === 'bracket')) P.push(['合唱合并', 'S A / T B 各一份（可选）']);
    return P; };
  D.forEach(m => m.players = players(m));
  /* 窗口：8 个（溢出演示），可用 #open=n 改数量 */
  const S = { mode: 'write', dens: 'label', fold: {}, q: '', hover: null, menu: null, rightTab: 'prop', rightOpen: false, cmd: null, sheet: null, cur: 1, open: 6, startHidden: false };
  const H = Object.fromEntries(location.hash.slice(1).split('&').filter(Boolean).map(x => { const i = x.indexOf('='); return [decodeURIComponent(x.slice(0, i)), decodeURIComponent(x.slice(i + 1))]; }));
  if (H.open) S.open = Math.max(1, Math.min(8, +H.open));
  if (H.doc) S.cur = Math.max(0, KEYS.indexOf(H.doc));
  if (S.cur >= S.open) S.open = S.cur + 1;
  if (H.mode) S.mode = H.mode; if (H.dens) S.dens = H.dens; if (H.q) S.q = H.q; if (H.cmd != null) S.cmd = H.cmd; if (H.right) { S.rightTab = H.right; S.rightOpen = true; } if (H.ro) S.rightOpen = true; if (H.sheet) S.sheet = H.sheet;
  if (H.theme) document.documentElement.dataset.theme = H.theme;
  if (H.hover) S.hover = H.hover;
  const cm = () => D[S.cur];
  const setTrk = (m, k, i) => m.tracks.forEach(t => t.on = (t.k === k && String(t.i) === String(i)));
  if (H.trk) { const [k, i] = H.trk.split(':'); setTrk(cm(), k, i); }
  if (H.nota) { const t = cm().tracks.find(x => x.on); if (H.nota === 'dual') { t.nota = 'staff'; t.dual = true; } else if (H.nota === 'staff') { t.nota = 'staff'; t.dual = false; } }
  if (H.tabstaff) cm().tabStaff = true;
  if (H.allstaff) cm().tracks.forEach((t, i) => { if (t.k === 'vox') { t.nota = i < 2 ? 'staff' : 'bass'; t.dual = false; } });

  const docsView = () => D.slice(0, S.open).map((m, i) => ({ title: M.docs[i].title, kind: m.kind, ic: M.docs[i].ic, saved: m.save.saved, on: i === S.cur, hidden: !!(window.__tabs && window.__tabs.widths && window.__tabs.widths[i] === 0) }));
  const paperKey = m => {
    const t = m.tracks.find(x => x.on) || m.tracks[0];
    if (m.key0 === 'gtr') { if (m.tabStaff) return 'gtr-tabstaff'; if (t.k === 'tab' && t.jpRow) return 'gtr-tabjp'; const mel = m.tracks.find(x => x.k === 'vox'); if (mel && mel.nota !== 'jp') return mel.dual ? 'gtr-meldual' : 'gtr-melstaff'; return t.k === 'vox' ? 'gtr-mel' : 'gtr'; }
    if (m.key0 === 'pacc') { const mel = m.tracks.find(x => x.k === 'vox' && x.i === 0); if (mel.nota !== 'jp') return 'pacc-dual'; return t.i === 1 ? 'pacc-rh' : t.i === 2 ? 'pacc-lh' : 'pacc'; }
    if (m.key0 === 'choir') { if (m.tracks.some(x => x.nota !== 'jp')) return 'choir-staff'; return t.i === 2 ? 'choir-t' : 'choir'; }
    return m.key0;
  };
  const model = () => { const m = cm(); m.docs = docsView(); return m; };
  const toast = msg => { let t = $('#toastx'); if (!t) { t = document.createElement('div'); t.id = 'toastx'; t.className = 'toast'; document.body.appendChild(t); } t.textContent = msg; t.style.display = ''; clearTimeout(toast.t); toast.t = setTimeout(() => t.style.display = 'none', 2600); };

  function mainHTML(m) {
    if (S.mode === 'engrave' || S.mode === 'output') {
      const out = S.mode === 'output';
      let h = '<div class="pvwrap' + (out ? ' out' : '') + '">';
      [1, 2].forEach((p, pi) => { h += '<div class="pvp"><img alt="第 ' + p + ' 页（引擎真实分页）" src="' + IMG['pv-' + p] + '">';
        if (!out) { const ys = L.sysY.filter((y, i) => Math.floor(i / 3) === pi); h += '<span class="vx"></span>'; ys.forEach((y, i) => { const li = pi * 3 + i; h += '<span class="rowtag" style="top:' + (14 + ((y - pi * (L.pgH + L.gap)) * 0.74 * 794 / 870)) + 'px">行 ' + (li + 1) + ' · ' + L.perLine[li] + ' 小节</span>'; }); }
        h += '<span class="pgl">第 ' + p + ' / ' + L.pages + ' 页</span></div>'; });
      return h + '</div>';
    }
    const k = paperKey(m);
    return '<div class="paper"><img alt="谱面（真实编辑器刻版）" src="' + (IMG['paper-' + k] || IMG['paper-' + m.key0]) + '">' + (S.mode === 'play' ? '<span class="band"></span>' : '') + '</div>';
  }
  function layout() {
    const W = innerWidth, m = model();
    if (W <= 820) {
      S.mScore = '<div class="m-paper"><img alt="" src="' + (IMG['paper-' + paperKey(m)]) + '"></div>';
      $('#app').className = 'fx mob'; $('#app').innerHTML = FX.mobile(m, S); return;
    }
    $('#app').className = 'fx desk mode-' + S.mode;
    $('#app').innerHTML = FX.r1(m, S, W) + FX.r2(m, S, W) + '<div class="ws">' + FX.left(m, S) + '<main id="main">' + mainHTML(m) + '</main>' + FX.right(m, S, W) + '</div>' + FX.status(m, S, W);
    window.__tabs = FX.fitTabs($('#app'));
    window.__r2hidden = FX.fitR2($('#app')); window.__trk = FX.fitTrk($('#app'));
    if (S.menu) openMenu(S.menu.name, S.menu.data, true);
    if (S.cmd != null) { $('#app').insertAdjacentHTML('beforeend', FX.cmd(m, S)); const i = $('.cmd input'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  }
  function openMenu(name, data, keep) {
    const m = model(); document.querySelectorAll('.mn').forEach(x => x.remove());
    const sel = '[data-m="' + name + '"]' + (data && data.i != null ? '[data-i="' + data.i + '"]' : '');
    const a = (data && data.anchor) || document.querySelector(sel) || document.querySelector('[data-m="' + name + '"]');
    if (name === 'more' && window.__r2hidden && window.__r2hidden.length) data = Object.assign({}, data, { hidden: window.__r2hidden.map(t => '<button class="mi2" role="menuitem"><span class="mic"></span><span class="ml">' + FX.esc(t) + '</span></button>').join('') + '<hr>' });
    document.body.insertAdjacentHTML('beforeend', FX.menu(name, m, S, data || {}));
    const mn = document.querySelector('.mn'); S.menu = { name, data: data && { k: data.k, i: data.i, x: data.x, y: data.y } };
    let x, y;
    if (data && data.x != null) { x = data.x; y = data.y; } else if (a) { const r = a.getBoundingClientRect(); x = r.left; y = r.bottom + 4; if (name === 'acct' || name === 'save' || name === 'help') x = r.right - mn.offsetWidth; if (name === 'help') y = r.top - mn.offsetHeight - 6; }
    x = Math.max(8, Math.min(innerWidth - mn.offsetWidth - 8, x || 8)); y = Math.max(8, Math.min(innerHeight - mn.offsetHeight - 8, y || 8));
    mn.style.left = x + 'px'; mn.style.top = y + 'px';
  }
  const closeMenu = () => { document.querySelectorAll('.mn').forEach(x => x.remove()); S.menu = null; };
  /* 动作 */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-a]');
    if (!el) { if (!e.target.closest('.mn')) closeMenu(); return; }
    const a = el.dataset.a, d = el.dataset, m = cm();
    if (a !== 'menu' && !el.closest('.mn')) closeMenu();
    switch (a) {
      case 'menu': if (S.menu && S.menu.name === d.m) { closeMenu(); return; } return openMenu(d.m, { k: d.k, i: d.i });
      case 'doc': S.cur = +d.i; closeMenu(); break;
      case 'close': { e.stopPropagation(); const i = +d.i; const t = M.docs[i].title, sv = D[i].save.saved; D.splice(i, 1); M.docs.splice(i, 1); KEYS.splice(i, 1); S.open = Math.max(1, S.open - 1); if (S.cur >= S.open) S.cur = S.open - 1; else if (S.cur > i) S.cur--; closeMenu(); toast('已关闭《' + t + '》' + (sv ? '' : '，并存入「我的曲谱」（未入库的窗口关闭时自动转存，不会丢）')); break; }
      case 'new': toast('打开新建面板（Alt+N）：按用途选，新窗口打开，当前谱保留'); return;
      case 'mode': S.mode = d.v; S.rightTab = d.v === 'write' ? 'prop' : d.v === 'engrave' ? 'lay' : d.v === 'play' ? 'prac' : 'pub'; break;
      case 'trk': setTrk(m, d.k, d.i); break;
      case 'mute': case 'solo': { e.stopPropagation(); const t = m.tracks.find(x => x.k === d.k && String(x.i) === d.i); t[a] = !t[a]; break; }
      case 'nota': { const t = m.tracks.find(x => x.k === 'vox' && String(x.i) === d.i); const st = t.nota !== 'jp'; const jpOn = !st || t.dual;
        if (d.v === 'jp') { if (jpOn && !st) return toast('至少保留一种记谱法：先打开五线谱，再关简谱'); if (jpOn) t.dual = false; else t.dual = true; }
        else { if (st && !t.dual) return toast('至少保留一种记谱法：先打开简谱，再关五线谱'); if (st) { t.nota = 'jp'; t.dual = false; } else { t.nota = t.k === 'vox' && m.key0 === 'pacc' && t.i === 2 ? 'bass' : 'staff'; t.dual = true; } }
        toast(t.nota === 'jp' ? '「' + t.name + '」：简谱' : t.dual ? '「' + t.name + '」：五线谱 + 简谱对照（两层都亮）' : '「' + t.name + '」：五线谱'); break; }
      case 'notaonly': { const t = m.tracks.find(x => x.k === 'vox' && String(x.i) === d.i); if (d.v === 'jp') { t.nota = 'jp'; t.dual = false; } else { if (t.nota === 'jp') t.nota = (m.key0 === 'pacc' && t.i === 2) ? 'bass' : 'staff'; t.dual = false; } toast('「' + t.name + '」只显示' + (d.v === 'jp' ? '简谱' : '五线谱') + '（点名字＝只显示这一种；点眼睛＝叠加对照）'); break; }
      case 'tabjp': { const t = m.tracks.find(x => x.k === 'tab' && String(x.i) === d.i); t.jpRow = !t.jpRow; toast(t.jpRow ? '「' + t.name + '」上方联排简谱行（仅本轨）' : '已关闭「' + t.name + '」的简谱行'); break; }
      case 'tabstaff': m.tabStaff = !m.tabStaff; toast(m.tabStaff ? '全部吉他轨上方联排五线谱（整曲开关）' : '已关闭五线谱联排（全部吉他轨）'); break;
      case 'gentab': toast('由「' + (m.tracks.find(x => x.on) || {}).name + '」生成一条吉他轨：选把位（低 / 中 / 跟随和弦图），原旋律轨不动，可一步撤销'); return;
      case 'verse': m.verse = +d.v; break;
      case 'verseadd': toast('已加第 ' + ((m.verses || 1) + 1) + ' 段歌词（Enter 逐字填词）'); return;
      case 'fold': S.fold[d.v] = el.getAttribute('aria-expanded') === 'true'; break;
      case 'dens': S.dens = S.dens === 'glyph' ? 'label' : 'glyph'; break;
      case 'sign': { const s = FX.SIGNS[d.v]; if (!s) return; const t = m.tracks.find(x => x.on); const r = (m.recent || FX.REC[FX.ctxOf(t)]).filter(x => x !== d.v); r.unshift(d.v); m.recent = r.slice(0, 6); if (m.selNote) { m.selNote.marks = (m.selNote.marks || []).filter(x => x !== d.v).concat([d.v]); } toast('已加「' + s[1] + '」→ ' + t.name + ' · ' + ((m.selNote && m.selNote.pos) || '')); break; }
      case 'clearmarks': if (m.selNote) m.selNote.marks = []; toast('已清除当前音的全部记号'); break;
      case 'rtab': if (S.rightTab === d.v && S.rightOpen && !FX.rightDock(innerWidth)) S.rightOpen = false; else { S.rightTab = d.v; S.rightOpen = true; } break;
      case 'rclose': S.rightOpen = false; break;
      case 'rpin': toast('钉住：≥1600 宽可常驻；1280–1599 宽钉住时左栏记号区让位'); return;
      case 'savemine': m.save = { saved: true, time: '10:42' }; toast('已存入「我的曲谱」，之后编辑实时同步'); break;
      case 'publish': m.save = { saved: true, time: '10:42' }; S.mode = 'output'; S.rightTab = 'pub'; S.rightOpen = true; toast('已存入「我的曲谱」→ 在「输出」确认后提交审核（不离开编辑器）'); break;
      case 'theme': { const r = document.documentElement; r.dataset.theme = (r.dataset.theme === 'dark' || (!r.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches)) ? 'light' : 'dark'; closeMenu(); break; }
      case 'step': toast(['① 写旋律：光标已在旋律行', '② 配和弦与伴奏：打开一键配伴奏（填进当前谱，可撤销）', '③ 选织体：22 种织体按拍号筛'][+d.v]); return;
      case 'hidestart': S.startHidden = true; toast('已收起起步（Alt+B 再调出）'); break;
      case 'cmd': S.cmd = ''; break;
      case 'cmdclose': S.cmd = null; break;
      case 'cmdgo': { const v = d.v; S.cmd = null; if (v.startsWith('mode:')) S.mode = v.slice(5); else if (v.startsWith('rtab:')) { S.rightTab = v.slice(5); S.rightOpen = true; S.mode = 'write'; } else if (v.startsWith('menu:')) { layout(); return openMenu(v.slice(5)); } else if (v.startsWith('sign:')) toast('已加「' + FX.SIGNS[v.slice(5)][1] + '」'); else if (v === 'publish') { S.mode = 'output'; S.rightTab = 'pub'; } break; }
      case 'msheet': S.sheet = d.v || null; break;
      case 'q': return;
      default: if (el.closest('.mn')) { const lab = el.querySelector('.ml'); if (lab && !el.classList.contains('dis')) toast('→ ' + lab.childNodes[0].textContent.trim() + '（委托现有功能）'); closeMenu(); } return;
    }
    layout();
  });
  document.addEventListener('contextmenu', e => { const t = e.target.closest('.tab'); if (!t) return; e.preventDefault(); openMenu('tabctx', { x: e.clientX, y: e.clientY }); });
  document.addEventListener('mouseover', e => { const g = e.target.closest('.gt[data-v]'); const pn = document.querySelector('.pinfo .pn'); if (!pn) return; const s = g && FX.SIGNS[g.dataset.v]; const t = cm().tracks.find(x => x.on);
    pn.innerHTML = s ? '<b>' + FX.esc(s[1]) + '</b> · 加到「' + FX.esc(t.name) + '」当前音' + (s[4] ? ' · ' + FX.esc(s[4]) : '') : '点一下：加到「' + FX.esc(t.name) + '」当前音；再点取消'; });
  document.addEventListener('input', e => { if (e.target.dataset.a === 'q') { S.q = e.target.value; const pos = e.target.selectionStart; layout(); const i = $('.psearch input'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } } else if (e.target.dataset.a === 'cmdq') { S.cmd = e.target.value; layout(); } });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); S.cmd = ''; layout(); return; }
    if (e.key === 'Escape') { if (S.cmd != null) S.cmd = null; else if (S.menu) closeMenu(); else if (S.rightOpen && !FX.rightDock(innerWidth)) S.rightOpen = false; else S.mode = 'write'; layout(); return; }
    const tg = (document.activeElement || {}).tagName; if (tg === 'INPUT') return;
    if (e.key === '/') { e.preventDefault(); const i = $('.psearch input'); if (i) i.focus(); return; }
    if (/^[0-7]$/.test(e.key) && S.mode !== 'write') { S.mode = 'write'; layout(); toast('已回到「书写」并落音 ' + e.key); }
  });
  addEventListener('resize', () => layout());
  window.PROTO = { S, D, layout, openMenu };
  layout();
  if (H.menu) { if (H.menu === 'tabctx') { const t = document.querySelector('.tab.on').getBoundingClientRect(); openMenu('tabctx', { x: t.left + 30, y: t.bottom }); } else openMenu(H.menu, H.menu === 'tmore' ? { k: (cm().tracks.find(x => x.on) || {}).k, i: String((cm().tracks.find(x => x.on) || {}).i) } : {}); }
})();
