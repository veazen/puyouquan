/* 谱友圈 · 新建曲谱最终方案「按用途开谱 · 所见即所建」—— 面板单一实现（注入真实编辑器与独立原型共用同一份代码）
   主干＝方向 B（谱行引擎 NWB：14 种合法组合 → 现有 createSong，零新增 song 字段；引擎实时预览）
   嫁接：A 的「按用途」场景层（9 场景＋空白，带考编/师范/艺考/课堂/乐队标签与默认值）、A 的「新建 ▾」与 Alt+N、A 的起步条；
        C 的依据（可解释回执）、空谱无损换谱类（谱型条）、深链、手机「发到电脑继续」。
   依赖：window.pqIcon（图标运行时）、window.NWB（stack-lib.js）、window.NF_HOST（宿主适配：真实编辑器 / 原型）。
   本机只新增一个键：musetab-nw-last（记住上次设置；读写都包 try/catch，由宿主实现）。 */
(function () {
  'use strict';
  const ic = (k, s, c) => (window.pqIcon ? pqIcon(k, s || 20, c) : '');
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const kl = k => (k.length === 2 ? (k[1] === 'b' ? '♭' : '♯') + k[0] : k);
  const MINOR = { C: 'a', 'C#': '♯a', D: 'b', Eb: 'c', E: '♯c', F: 'd', 'F#': '♯d', G: 'e', Ab: 'f', A: '♯f', Bb: 'g', B: '♯g' };
  const METERS = ['2/4', '3/4', '4/4', '6/8', '3/8', '2/2', '5/4', '7/8', '9/8', '12/8'];
  const TUN = [['std', '标准 EADGBE'], ['dropD', 'Drop D'], ['dadgad', 'DADGAD'], ['openG', 'Open G'], ['openD', 'Open D']];
  /* 器乐独奏：乐器 → 惯用记谱（与编辑器 NW_INSTS 同口径：kbd＝大谱表，staff＝五线谱（谱号预置），jianpu＝民乐简谱） */
  const INSTS = [
    ['键盘', [['piano', '钢琴', 'kbd'], ['epiano', '电钢琴', 'kbd'], ['synth', '电子琴', 'kbd'], ['accordion', '手风琴', 'kbd']]],
    ['西洋管弦 · 五线谱', [['violin', '小提琴', 'staff'], ['flute', '长笛', 'staff'], ['sax', '萨克斯', 'staff'], ['trumpet', '小号', 'staff'], ['horn', '圆号', 'staff'], ['trombone', '长号', 'bass'], ['bass', '贝斯', 'bass']]],
    ['民乐 · 简谱', [['erhu', '二胡', 'jianpu'], ['dizi', '笛子', 'jianpu'], ['hulusi', '葫芦丝', 'jianpu'], ['suona', '唢呐', 'jianpu'], ['guzheng', '古筝', 'jianpu'], ['pipa', '琵琶', 'jianpu'], ['yangqin', '扬琴', 'jianpu'], ['harmonica', '口琴', 'jianpu']]],
    ['其他', [['other', '其他器乐', 'staff']]]];
  const INST = {}; INSTS.forEach(([, l]) => l.forEach(([k, n, f]) => INST[k] = { k, n, f }));
  const famOf = k => { const f = (INST[k] || INST.violin).f; return f === 'bass' ? 'staff' : f; };

  /* ───────── 场景表：场景＝谱行组合＋一套默认值（与「自定谱行」是同一份状态） ───────── */
  const GROUPS = [['弹唱伴奏', ['gtr', 'pacc', 'kids']], ['课堂声乐', ['vocal', 'teach', 'sight']], ['独奏乐队', ['solo', 'inst', 'chord']], ['', ['blank']]];
  const SC = {
    gtr: { n: '吉他弹唱', ic: 'type-guitar', desc: '和弦图 · 简谱旋律 · 歌词 · 六线谱', long: '简谱旋律与歌词在上，六线谱与和弦图在下。', def: { key: 'C', meter: '4/4', tempo: 80, nMea: 16, lyr: 1 }, vars: ['inst', 'pen'], fixedMel: '简谱（弹唱谱惯例）' },
    pacc: { n: '钢琴即兴伴奏', tag: '考编', ic: 'type-jg', desc: '写旋律，一键配和弦与伴奏', long: '先写旋律，再一键配和弦、选织体，生成双手伴奏。', def: { key: 'C', meter: '4/4', tempo: 72, nMea: 16, lyr: 1 }, vars: ['acc'] },
    kids: { n: '儿歌弹唱', tag: '师范', ic: 'type-kids', desc: '2/4 简谱＋歌词，配儿歌伴奏', long: '短小的 2/4 儿歌，配可以自弹自唱的钢琴伴奏。', def: { key: 'F', meter: '2/4', tempo: 104, nMea: 8, lyr: 2 }, vars: ['acc'] },
    vocal: { n: '歌谱 · 合唱', ic: 'type-vocal', desc: '一到四个声部，歌词逐字对位', long: '每个声部一行，歌词逐字对位，合唱自动加括号。', def: { key: 'C', meter: '4/4', tempo: 90, nMea: 16, lyr: 1 }, vars: ['parts'] },
    teach: { n: '教学对照谱', tag: '课堂', ic: 'type-teach', desc: '五线谱与简谱逐音对齐', long: '五线谱与简谱逐音对齐、歌词在下：音乐课与考级的标配。', def: { key: 'C', meter: '4/4', tempo: 88, nMea: 16, lyr: 1 }, vars: ['tacc'], fixedMel: '五线谱＋简谱（对照）' },
    sight: { n: '视唱练耳谱例', tag: '艺考', ic: 'type-sight', desc: '五线谱单旋律，可选小调', long: '规范的五线谱单旋律，不带歌词，大调小调直接建。', def: { key: 'C', meter: '4/4', tempo: 72, nMea: 8, lyr: 0 }, vars: ['clef'], fixedMel: '五线谱（视唱惯例）' },
    solo: { n: '指弹 · 吉他独奏', ic: 'type-solo', desc: '六线谱＋五线谱联排', long: '六线谱与五线谱联排同步，推弦、击勾、泛音等技法齐全。', def: { key: 'C', meter: '4/4', tempo: 90, nMea: 8, lyr: 0 }, vars: [], fixedMel: '六线谱＋五线谱联排' },
    inst: { n: '器乐独奏', ic: 'type-instr', desc: '键盘 · 管弦 · 民乐 20 种', long: '键盘用大谱表，管弦用五线谱，民乐用简谱（可切五线谱）。', def: { key: 'C', meter: '4/4', tempo: 90, nMea: 8, lyr: 0 }, vars: ['instKey'] },
    chord: { n: '和弦谱 · 功能谱', tag: '乐队', ic: 'type-chord', desc: '小节格和弦 / 旋律＋级数', long: '小节格和弦进行，或在旋律上标级数和弦，移调即时生效。', def: { key: 'C', meter: '4/4', tempo: 84, nMea: 16, lyr: 0 }, vars: ['ftype'] },
    blank: { n: '空白谱', ic: 'type-blank', desc: '一条旋律行，其余自己搭', long: '一条旋律行，其余音轨建好后在左栏「＋音轨」加。', def: { key: 'C', meter: '4/4', tempo: 90, nMea: 8, lyr: 1 }, vars: [] },
    custom: { n: '自选记谱法', ic: 'type-custom', desc: '五种记谱自由组合', long: '简谱、五线谱、六线谱、大谱表、和弦自由组合，最多 3 种。', def: { key: 'C', meter: '4/4', tempo: 90, nMea: 8, lyr: 1 }, vars: [] },
  };
  const VARS = {
    inst: { lab: '乐器', opts: [['guitar', '吉他'], ['uku', '尤克里里']], d: 'guitar' },
    pen: { lab: '从哪写起', opts: [['T', '直接写六线谱'], ['J', '先写旋律']], d: 'T' },
    acc: { lab: '要哪几行', opts: [['mel', '旋律＋伴奏'], ['pure', '只要伴奏']], d: 'mel' },
    tacc: { lab: '钢琴伴奏', opts: [['no', '不要'], ['with', '加伴奏']], d: 'no' },
    parts: { lab: '声部', opts: [[1, '独唱'], [2, '二部'], [3, '三部'], [4, '四部']], d: 1 },
    clef: { lab: '谱号', opts: [['staff', '高音谱号'], ['bass', '低音谱号']], d: 'staff' },
    ftype: { lab: '谱式', opts: [['C', '和弦格'], ['CJ', '旋律＋级数']], d: 'C' },
    instKey: { lab: '乐器', d: 'piano', opts: [['piano', '钢琴'], ['violin', '小提琴'], ['erhu', '二胡'], ['guzheng', '古筝']] },
  };
  const ROWS = [['J', '简谱', 'nota-jianpu'], ['S', '五线谱', 'nota-staff'], ['T', '六线谱', 'nota-tab6'], ['G', '大谱表', 'nota-grand'], ['C', '和弦', 'nota-chord']];
  const ROWN = { J: '简谱', S: '五线谱', T: '六线谱', G: '钢琴大谱表', C: '和弦' };

  function sceneStack(id, v, mel) {
    switch (id) {
      case 'gtr': return 'JT';
      case 'pacc': case 'kids': return v.acc === 'pure' ? 'CG' : (mel === 'S' ? 'SG' : 'JG');
      case 'vocal': case 'blank': return mel === 'S' ? 'S' : 'J';
      case 'teach': return v.tacc === 'with' ? 'SJG' : 'SJ';
      case 'sight': return 'S';
      case 'solo': return 'ST';
      case 'inst': { const f = famOf(v.instKey); return f === 'kbd' ? 'G' : f === 'jianpu' ? (mel === 'S' ? 'S' : 'J') : 'S'; }
      case 'chord': return v.ftype === 'CJ' ? (mel === 'S' ? 'CS' : 'CJ') : 'C';
    }
    return null;
  }
  function melLive(id, v) {
    if (['gtr', 'teach', 'sight', 'solo', 'custom'].includes(id)) return false;
    if ((id === 'pacc' || id === 'kids') && v.acc === 'pure') return false;
    if (id === 'inst') return famOf(v.instKey) === 'jianpu';
    if (id === 'chord') return v.ftype === 'CJ';
    return true;
  }
  function melFixedText(st) {
    const id = st.scene, v = st.v;
    if (SC[id].fixedMel) return SC[id].fixedMel;
    if (id === 'inst') { const f = famOf(v.instKey); return f === 'kbd' ? '钢琴大谱表（键盘惯例）' : '五线谱（' + (INST[v.instKey] || {}).n + '惯例）'; }
    if (id === 'pacc' || id === 'kids') return '不含旋律（纯伴奏）';
    if (id === 'chord') return '不含旋律（小节格）';
    return '';
  }
  const stackRows = k => (window.NWB && NWB.STACKS[k] ? NWB.STACKS[k].rows.slice() : []);
  const keyOfRows = rows => (window.NWB ? NWB.keyOf(rows) : rows.join(''));

  /* ───────── 状态 ───────── */
  const DEFV = { title: '', key: 'C', mode: 'major', meter: '4/4', tempo: 90, nMea: 8, lyr: 1, capo: 0, tuning: 'std' };
  function varDefaults() { const o = {}; Object.keys(VARS).forEach(k => o[k] = VARS[k].d); return o; }
  function fresh(opt) {
    opt = opt || {};
    const last = (NF_HOST.lastLoad && NF_HOST.lastLoad()) || null;
    const st = { tab: 'new', scene: 'gtr', rows: ['J', 'T'], v: Object.assign({}, DEFV, varDefaults()), mel: 'J', src: {}, more: false, note: null, hint: '', imp: { src: 'file', a: null, target: null, ex: null }, mob: 'list', sent: null };
    if (last && SC[last.scene]) {
      st.scene = last.scene; st.mel = last.mel === 'S' ? 'S' : 'J';
      Object.assign(st.v, last.v || {}); st.v.title = '';
      ['key', 'meter', 'tempo', 'nMea', 'lyr', 'mode'].forEach(f => st.src[f] = 'last');
      if (last.scene === 'custom' && last.stack && NWB.STACKS[last.stack]) st.rows = stackRows(last.stack);
      else st.rows = stackRows(sceneStack(st.scene, st.v, st.mel));
    } else applyScene(st, 'gtr', true);
    if (opt.scene && SC[opt.scene]) applyScene(st, opt.scene, true);
    if (opt.rows && NWB.STACKS[opt.rows]) { st.scene = 'custom'; st.rows = stackRows(opt.rows); }
    if (opt.vals) Object.keys(opt.vals).forEach(k => { if (opt.vals[k] != null && opt.vals[k] !== '') { st.v[k] = opt.vals[k]; st.src[k] = 'link'; } });
    if (opt.tab) st.tab = opt.tab;
    if (opt.mob) st.mob = opt.mob;
    return st;
  }
  function applyScene(st, id, init) {
    const s = SC[id]; st.scene = id; if (id !== 'custom') st.srcScene = id;
    Object.keys(s.def).forEach(f => { if (init || st.src[f] !== 'user') { st.v[f] = s.def[f]; st.src[f] = 'scene'; } });
    if (init || st.src.mode !== 'user') { st.v.mode = 'major'; st.src.mode = 'scene'; }
    s.vars.forEach(k => { st.v[k] = VARS[k].d; });
    if (id !== 'custom') st.rows = stackRows(sceneStack(id, st.v, st.mel));
  }
  const stackOfState = st => (st.scene === 'custom' ? keyOfRows(st.rows) : sceneStack(st.scene, st.v, st.mel));
  function optsOf(st) {
    const v = st.v, [b, u] = String(v.meter).split('/').map(Number), k = stackOfState(st);
    const o = { title: (v.title || '').trim() || '未命名曲谱', key: v.key, beats: b, unit: u, tempo: +v.tempo || 90, nMea: Math.max(1, Math.min(200, +v.nMea || 8)), capo: +v.capo || 0, lyr: +v.lyr, mode: v.mode };
    if (k === 'T' || k === 'JT') o.inst = v.inst;
    if (k === 'J' || k === 'S' || k === 'SJ') o.nVox = (st.scene === 'vocal' || st.scene === 'custom') ? +v.parts : 1;
    if (k === 'S') o.clef = st.scene === 'inst' ? ((INST[v.instKey] || {}).f === 'bass' ? 'bass' : 'staff') : v.clef;
    if (st.scene === 'inst') { o.instKey = v.instKey; o.lyr = 0; }
    if (st.scene === 'sight') o.lyr = 0;
    if (['T', 'JT', 'ST'].includes(k) && v.tuning && v.tuning !== 'std') o.tuningKey = v.tuning;
    if (!['J', 'S', 'SJ', 'JT', 'JG', 'SG', 'SJG', 'CJ', 'CS', 'CG'].includes(k)) o.lyr = 0;
    o.pen = k === 'JT' ? v.pen : '';
    return o;
  }
  function kindOfState(st) { const k = stackOfState(st), o = optsOf(st); return NWB.kindOf(k, { nVox: o.nVox, inst: o.inst, instKey: o.instKey, lyr: o.lyr > 0 }); }
  /* 计划：宿主「创建」与回归测试都读它（场景 → 谱行组合 → createSong 参数） */
  function planOf(st) { const k = stackOfState(st), o = optsOf(st), kind = kindOfState(st); return { scene: st.scene, stack: k, o, kind, pen: o.pen, mel: st.mel, v: Object.assign({}, st.v) }; }

  /* 谱面自上而下的行标（与引擎排出的行位置对齐；不编号，只标「从这行开始写」） */
  function bandRows(k, o) {
    const n = o.nVox || 1, last = 'v' + (n - 1);
    switch (k) {
      case 'J': return [{ a: 'v0', b: last, t: n > 1 ? '简谱 · ' + n + ' 声部' : '简谱旋律', pen: 1 }];
      case 'S': return [{ a: 'v0', b: last, t: n > 1 ? '五线谱 · ' + n + ' 声部' : '五线谱旋律', pen: 1 }];
      case 'SJ': return [{ a: 'v0', b: last, t: '五线＋简谱', pen: 1 }];
      case 'T': return [{ a: 't0', b: 't0', t: '六线谱', pen: 1 }];
      case 'JT': return [{ a: 'v0', b: 'v0', t: '简谱旋律', pen: o.pen === 'J' }, { a: 't0', b: 't0', t: '六线谱', pen: o.pen !== 'J' }];
      case 'ST': return [{ a: 't0', b: 't0', t: '五线＋六线', pen: 1 }];
      case 'G': return [{ a: 'v0', b: 'v1', t: '钢琴大谱表', pen: 1 }];
      case 'CG': return [{ a: 'v0', b: 'v1', t: '和弦名＋大谱表', pen: 1 }];
      case 'JG': return [{ a: 'v0', b: 'v0', t: '简谱旋律', pen: 1 }, { a: 'v1', b: 'v2', t: '钢琴伴奏' }];
      case 'SG': return [{ a: 'v0', b: 'v0', t: '五线谱旋律', pen: 1 }, { a: 'v1', b: 'v2', t: '钢琴伴奏' }];
      case 'SJG': return [{ a: 'v0', b: 'v0', t: '对照旋律', pen: 1 }, { a: 'v1', b: 'v2', t: '钢琴伴奏' }];
      case 'CJ': return [{ a: 'v0', b: 'v0', t: '简谱＋级数', pen: 1 }];
      case 'CS': return [{ a: 'v0', b: 'v0', t: '五线谱＋和弦', pen: 1 }];
      case 'C': return [{ a: 'v0', b: 'v0', t: '和弦格', pen: 1 }];
    }
    return [];
  }
  const ACC_NOTE = { JG: '伴奏行建好后一键生成', SG: '伴奏行建好后一键生成', SJG: '伴奏行建好后一键生成', CG: '写好和弦后选织体生成伴奏' };

  /* ───────── 面板挂载 ───────── */
  let root = null, st = null, onClose = null, noteTimer = 0, pvTimer = 0;
  const pvCache = new Map();
  function preview(k, o) {
    const key = JSON.stringify([k, o.title, o.key, o.mode, o.beats, o.unit, o.tempo, o.nVox, o.inst, o.clef, o.instKey, o.pen, o.lyr > 0]);
    if (pvCache.has(key)) return pvCache.get(key);
    let r = null; try { r = NF_HOST.preview(k, o); } catch (e) { r = { err: String(e && e.message || e) }; }
    if (r) pvCache.set(key, r);
    return r;
  }
  function open(opt) {
    close(true);
    opt = opt || {};
    st = fresh(opt); onClose = opt.onClose || null;
    root = document.createElement('div');
    root.className = 'nf-root ' + (NF_HOST.isMobile() ? 'nf-m' : 'nf-d');
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', '新建曲谱');
    (opt.mount || document.body).appendChild(root);
    root.addEventListener('click', onClick); root.addEventListener('change', onChange); root.addEventListener('input', onInput);
    root.addEventListener('keydown', onKey); root.addEventListener('mouseover', onHover); root.addEventListener('focusin', onHover);
    root.addEventListener('mousedown', e => { if (e.target === root && !NF_HOST.isMobile()) close(); });
    draw();
    if (opt.analysis) importLoaded(opt.analysis);
    setTimeout(() => { const f = root && (root.querySelector('.nf-sc[aria-selected="true"]') || root.querySelector('.nf-mrow')); if (f && !NF_HOST.isMobile()) f.focus({ preventScroll: true }); }, 0);
    return api;
  }
  function close(silent) {
    if (root) { root.remove(); root = null; }
    clearTimeout(noteTimer);
    if (!silent && onClose) { const f = onClose; onClose = null; f(); }
  }
  /* 重画：保住焦点与光标 */
  function draw() {
    if (!root) return;
    const a = document.activeElement, id = a && root.contains(a) ? (a.id || (a.dataset && (a.dataset.scene ? 'sc:' + a.dataset.scene : a.dataset.row ? 'row:' + a.dataset.row : ''))) : '';
    const ss = a && a.selectionStart, scr = [...root.querySelectorAll('[data-scroll]')].map(e => [e.dataset.scroll, e.scrollTop]);
    root.className = 'nf-root ' + (NF_HOST.isMobile() ? 'nf-m' : 'nf-d');
    root.innerHTML = NF_HOST.isMobile() ? mobile() : desktop();
    scr.forEach(([k, t]) => { const e = root.querySelector('[data-scroll="' + k + '"]'); if (e) e.scrollTop = t; });
    if (id) {
      const e = id.startsWith('sc:') ? root.querySelector('[data-scene="' + id.slice(3) + '"]') : id.startsWith('row:') ? root.querySelector('[data-row="' + id.slice(4) + '"]') : root.querySelector('#' + id);
      if (e) { e.focus({ preventScroll: true }); if (ss != null && e.setSelectionRange) try { e.setSelectionRange(ss, ss); } catch (_) {} }
    }
  }

  /* ───────── 桌面 ───────── */
  function desktop() {
    return `<div class="nf-modal" role="document">
      <header class="nf-hd"><h2>新建曲谱</h2>
        <div class="nf-tabs" role="tablist"><button type="button" role="tab" data-act="tab" data-v="new" aria-selected="${st.tab === 'new'}">${ic('act-new', 18)}新建</button><button type="button" role="tab" data-act="tab" data-v="import" aria-selected="${st.tab === 'import'}">${ic('act-import', 18)}从已有音乐</button></div>
        <button type="button" class="nf-x" data-act="close" aria-label="关闭（Esc）" title="关闭（Esc）">${ic('act-close', 20)}</button></header>
      ${st.tab === 'new' ? deskNew() : deskImport()}
    </div>`;
  }
  function sceneOpt(id) {
    const s = SC[id], on = st.scene === id;
    return `<div class="nf-sc" role="option" data-scene="${id}" aria-selected="${on}" tabindex="${on ? 0 : -1}">${ic(s.ic, 24)}<b>${s.n}</b>${s.tag ? `<em class="nf-tag">${s.tag}</em>` : ''}</div>`;
  }
  function deskNew() {
    const k = stackOfState(st), o = optsOf(st), kind = kindOfState(st), s = SC[st.scene];
    const rows = stackRows(k);
    return `<div class="nf-body">
      <aside class="nf-left" data-scroll="left">
        <div class="nf-lh">按用途</div>
        <div role="listbox" aria-label="按用途选谱" class="nf-list">${GROUPS.filter(x => x[0]).map(([g, ids]) => `<div class="nf-gl" role="presentation">${g}</div>` + ids.map(sceneOpt).join('')).join('')}<div class="nf-gsep" role="presentation"></div><div class="nf-pair">${sceneOpt('blank')}${sceneOpt('custom')}</div></div>
      </aside>
      <section class="nf-mid" data-scroll="mid">
        <div class="nf-mh"><div><span class="nf-ey">将建成</span><h3>${ic(kind.ic, 24)}<span id="nf-kind">${esc(kind.name)}</span></h3></div><span class="nf-scn">${ic(s.ic, 16)}${s.n}</span></div>
        <p class="nf-desc">${esc(st.scene === 'custom' ? SC.custom.long : s.long)}</p>
        <div class="nf-rowbar"><span class="nf-rbl" title="点亮 / 熄灭；与左侧用途是同一份设置">要哪几种谱</span><div class="nf-rows" role="group" aria-label="要哪几种谱">${ROWS.map(([r, n, i], x) => `<button type="button" class="nf-row" data-row="${r}" aria-pressed="${rows.includes(r)}" title="${n}（键盘 ${x + 1}）">${ic(i, 18)}<span>${n}</span></button>`).join('')}</div></div>
        <p class="nf-rowhint" aria-live="polite">${esc(st.hint || '')}</p>
        ${paper(k, o)}
        ${st.note ? `<div class="nf-note" role="status">${ic('act-info', 18)}<span>${esc(st.note.text)}</span><button type="button" data-act="undo">${ic('act-undo', 16)}撤销</button></div>` : ''}
        <p class="nf-same">${ic('act-swap', 18)}<span><b>简谱 · 五线谱 · 六线谱</b>同一份数据，建好后随时互切</span></p>
      </section>
      <aside class="nf-right" data-scroll="right">${fields(k)}</aside>
    </div>
    <footer class="nf-ft"><p class="nf-keys" title="↑↓ 选用途 · 1–5 切换谱行 · Enter 创建 · Esc 关闭 · Alt+Shift+N 按上次设置直接建"><kbd>↑↓</kbd> 选 <kbd>Enter</kbd> 建 <kbd>Alt+Shift+N</kbd> 按上次</p>
      <span class="nf-where">新窗口打开 · 当前谱保留</span>
      <button type="button" class="nf-go" data-act="create" id="nf-go">${ic('act-new', 20)}创建 · <span>${esc(kind.name)}</span><kbd>↵</kbd></button></footer>`;
  }
  function paper(k, o, mob) {
    const r = preview(k, o);
    if (!r || r.err || !r.svg) return `<div class="nf-paper nf-empty"><p>${r && r.err ? '预览暂不可用：' + esc(r.err) : '预览生成中…'}</p></div>`;
    const lab = bandRows(k, o).map(x => {
      const a = (r.bands || {})[x.a], b = (r.bands || {})[x.b] || a; if (!a) return '';
      const top = ((a.t + b.b) / 2 * 100).toFixed(1), h = ((b.b - a.t) * 100).toFixed(1);
      return `<span class="nf-bl${x.pen ? ' pen' : ''}" style="top:${top}%;--h:${h}%">${x.pen ? ic('act-new', 14) : ''}<b>${x.t}</b>${x.pen ? '<i>从这行开始写</i>' : ''}</span>`;
    }).join('');
    const acc = ACC_NOTE[k] ? `<span class="nf-pvnote">${ACC_NOTE[k]}</span>` : '';
    if (mob) return `<div class="nf-paper m"><div class="nf-svg">${r.svg}</div></div><p class="nf-mrows">${bandRows(k, o).map(x => `<span${x.pen ? ' class="pen"' : ''}>${x.pen ? ic('act-new', 14) : ''}${x.t}</span>`).join('<i>›</i>')}</p>`;
    return `<figure class="nf-paper"><div class="nf-svg">${r.svg}</div><div class="nf-bands" aria-label="谱面自上而下">${lab}</div>
      <figcaption>${r.approx ? esc(r.approx) : '实时刻版预览'}${acc}</figcaption></figure>`;
  }
  function seg(name, opts, cur, extra) {
    return `<div class="nf-seg" role="radiogroup" aria-label="${name}">${opts.map(([v, t]) => `<button type="button" role="radio" aria-checked="${String(cur) === String(v)}" ${extra || ''} data-v="${v}">${t}</button>`).join('')}</div>`;
  }
  const SRCN = { scene: '场景惯例', last: '沿用上次', user: '你改的', default: '默认值', link: '链接预填', file: '按文件' };
  function fields(k) {
    const v = st.v, id = st.scene, o = optsOf(st);
    const keyLabel = v.mode === 'minor' ? MINOR[v.key] + ' 小调' : '1=' + kl(v.key);
    const fx = f => `<i class="nf-dot s-${st.src[f] || 'default'}" title="${SRCN[st.src[f] || 'default']}"></i>`;
    let h = `<label class="nf-f"><span>曲名</span><input id="nf-title" type="text" value="${esc(v.title)}" placeholder="未命名曲谱（可稍后再填）" autocomplete="off"></label>`;
    if (id !== 'custom') {
      h += `<div class="nf-f"><span>旋律用</span>${melLive(id, v) ? `<div class="nf-seg" role="radiogroup" aria-label="旋律用">${[['J', '简谱', 'nota-jianpu'], ['S', '五线谱', 'nota-staff']].map(([m, t, i]) => `<button type="button" role="radio" data-act="mel" data-v="${m}" aria-checked="${st.mel === m}">${ic(i, 18)}${t}</button>`).join('')}</div>` : `<p class="nf-fixed">${esc(melFixedText(st))}</p>`}</div>`;
    }
    const varsShown = id === 'custom' ? customVars(k) : SC[id].vars;
    varsShown.forEach(vk => {
      if (vk === 'instKey') {
        const top = VARS.instKey.opts.some(([kk]) => kk === v.instKey);
        h += `<div class="nf-f"><span>乐器<em>${INST[v.instKey] ? INST[v.instKey].n + ' · ' + ({ kbd: '大谱表', staff: '五线谱', jianpu: '简谱' }[famOf(v.instKey)]) : ''}</em></span>${seg('乐器', VARS.instKey.opts, top ? v.instKey : '', 'data-act="var" data-k="instKey"')}
          <select id="nf-inst" aria-label="更多乐器"><option value="">${top ? '更多乐器（共 20 种）…' : '已选：' + INST[v.instKey].n}</option>${INSTS.map(([g, l]) => `<optgroup label="${g}">${l.map(([kk, n]) => `<option value="${kk}"${!top && v.instKey === kk ? ' selected' : ''}>${n}</option>`).join('')}</optgroup>`).join('')}</select></div>`;
      } else {
        const d = VARS[vk];
        h += `<div class="nf-f"><span>${d.lab}${d.note ? `<em>${d.note}</em>` : ''}</span>${seg(d.lab, d.opts, v[vk], 'data-act="var" data-k="' + vk + '"')}</div>`;
      }
    });
    h += `<div class="nf-f3"><label class="nf-f"><span>调${fx('key')}</span><select id="nf-key" aria-label="调">${['major', 'minor'].map(m => `<optgroup label="${m === 'major' ? '大调' : '小调（按关系大调记谱）'}">${KEYS.map(kk => `<option value="${kk}|${m}"${v.key === kk && v.mode === m ? ' selected' : ''}>${m === 'major' ? '1=' + kl(kk) : MINOR[kk] + ' 小调'}</option>`).join('')}</optgroup>`).join('')}</select></label>
      <label class="nf-f"><span>拍号${fx('meter')}</span><select id="nf-meter">${METERS.map(m => `<option${v.meter === m ? ' selected' : ''}>${m}</option>`).join('')}</select></label>
      <label class="nf-f"><span>速度${fx('tempo')}</span><span class="nf-tempo"><i>♩=</i><input id="nf-tempo" type="number" min="20" max="300" value="${esc(v.tempo)}"></span></label></div>`;
    /* 依据（可解释回执）：每个值从哪来 */
    const groups = {}; [['key', keyLabel], ['meter', v.meter], ['tempo', '♩=' + v.tempo], ['nMea', o.nMea + ' 小节'], ['lyr', o.lyr > 0 ? o.lyr + ' 段词' : '']].forEach(([f, t]) => { if (!t) return; const s2 = st.src[f] || 'default'; (groups[s2] = groups[s2] || []).push(t); });
    if ((v.title || '').trim()) (groups.user = groups.user || []).unshift('《' + v.title.trim() + '》');
    const why = { scene: '按「' + SC[st.srcScene || id].n + '」惯例', last: '沿用上次', user: '你改的', default: '默认值', link: '链接预填', file: '按文件' };
    h += `<div class="nf-basis"><b>依据</b>${Object.keys(groups).map(s2 => `<p><span class="nf-chips">${groups[s2].map(t => `<i class="c-${s2}">${esc(t)}</i>`).join('')}</span><em>${why[s2]}</em></p>`).join('')}</div>`;
    h += `<button type="button" class="nf-more" data-act="more" aria-expanded="${st.more}">${ic('act-settings', 18)}更多设置<span>${o.nMea} 小节${o.lyr > 0 ? ' · ' + o.lyr + ' 段词' : ''}${['T', 'JT', 'ST'].includes(k) ? ' · 定弦' : ''}</span>${ic('act-chevron', 16)}</button>`;
    if (st.more) {
      h += `<div class="nf-moreb"><label class="nf-f"><span>小节数</span><input id="nf-nmea" type="number" min="1" max="200" value="${esc(v.nMea)}"></label>`;
      if (['J', 'S', 'SJ', 'JT', 'JG', 'SG', 'SJG', 'CJ', 'CS', 'CG'].includes(k) && id !== 'sight' && id !== 'inst') h += `<label class="nf-f"><span>歌词段数</span><select id="nf-lyr">${[0, 1, 2, 3, 4].map(n => `<option value="${n}"${+v.lyr === n ? ' selected' : ''}>${n ? n + ' 段' : '不要歌词'}</option>`).join('')}</select></label>`;
      if (['T', 'JT', 'ST'].includes(k) && o.inst !== 'uku') h += `<label class="nf-f"><span>定弦</span><select id="nf-tuning">${TUN.map(([t, n]) => `<option value="${t}"${v.tuning === t ? ' selected' : ''}>${n}</option>`).join('')}</select></label>`;
      if (['T', 'JT'].includes(k)) h += `<label class="nf-f"><span>变调夹</span><select id="nf-capo">${[0, 1, 2, 3, 4, 5, 6, 7].map(n => `<option value="${n}"${+v.capo === n ? ' selected' : ''}>${n ? n + ' 品' : '不夹'}</option>`).join('')}</select></label>`;
      h += `</div>`;
    }
    return h;
  }
  function customVars(k) { const a = []; if (k === 'T' || k === 'JT') a.push('inst'); if (k === 'JT') a.push('pen'); if (['J', 'S', 'SJ'].includes(k)) a.push('parts'); if (k === 'S') a.push('clef'); return a; }

  /* ───────── 从已有音乐（导入 / AI 转谱 / 示例做同款 / 接着做） ───────── */
  const ISRC = [
    ['file', 'act-import', '打开或导入文件', 'MusicXML · Guitar Pro · MIDI · 谱友圈文件'],
    ['ai', 'src-ai', '整理 AI 转谱结果', 'AI 工具导出的 MusicXML：定调、配和弦、转教学用谱'],
    ['ex', 'src-example', '示例做同款', '16 份示例，沿用格式、内容留空'],
    ['recent', 'src-recent', '接着做', ''],
    ['audio', 'src-audio', '录音转谱', '暂停中'],
    ['image', 'src-image', '图片识谱', '规划中']];
  const TARGETS = [
    ['orig', '按原文件', 'type-blank'], ['J', '转成简谱', 'nota-jianpu'], ['SJ', '五线＋简谱对照', 'nota-dual'],
    ['acc', '配钢琴伴奏', 'nota-texture'], ['JT', '生成吉他弹唱', 'type-guitar'], ['CJ', '标级数和弦', 'nota-degree']];
  function impTargets(a) {
    return TARGETS.map(([t, n, i]) => {
      const kind = NF_HOST.importKind(a, t); let dis = '';
      if (t === 'JT' && !a.melody) dis = '需要单旋律'; if (t === 'acc' && !a.melody) dis = '需要单旋律';
      if (t === 'orig') return { t, n: n + '（' + kind + '）', i: (NWB.kindOf(a.stack, { nVox: a.parts, lyr: a.hasLyrics }) || {}).ic || i, kind, dis };
      return { t, n, i, kind, dis };
    });
  }
  function deskImport() {
    const I = st.imp, a = I.a;
    const recent = NF_HOST.recent && NF_HOST.recent();
    const left = `<aside class="nf-left" data-scroll="ileft"><div class="nf-lh">从哪里开始</div><div role="listbox" aria-label="来源" class="nf-list">${ISRC.map(([s2, i, n, d]) => {
      const dd = s2 === 'recent' ? (recent ? '《' + esc(recent.title) + '》 · ' + esc(recent.kind) : '还没有自己的谱') : d;
      const off = s2 === 'audio' || s2 === 'image';
      return `<div class="nf-sc nf-src${off ? ' off' : ''}" role="option" data-isrc="${s2}" aria-selected="${I.src === s2}" tabindex="${I.src === s2 ? 0 : -1}">${ic(i, 24)}<span><b>${n}</b><small>${dd}</small></span></div>`; }).join('')}</div>
      <p class="nf-drop-tip">${ic('act-info', 16)}文件拖到编辑器任意处，也会打开这里。</p></aside>`;
    let mid = '', right = '', go = '';
    if ((I.src === 'file' || I.src === 'ai') && !a) {
      mid = `<section class="nf-mid nf-dropwrap"><div class="nf-drop" data-act="pick">${ic(I.src === 'ai' ? 'src-ai' : 'act-import', 40)}<b>${I.src === 'ai' ? '把 AI 转谱导出的 MusicXML 拖到这里' : '把文件拖到这里'}</b><span>或</span><button type="button" class="nf-go2" data-act="pick">选择文件…</button>
        <p>${I.src === 'ai' ? 'AI 转谱工具里选「导出 MusicXML（.musicxml / .mxl）」。读进来后会按内容定调、补和弦，并可直接转成教学对照谱或配好伴奏。音频文件请先在转谱工具里转成 MusicXML。' : 'MusicXML（.musicxml / .xml / .mxl）· Guitar Pro（.gp / .gp5 等）· MIDI（.mid）· 谱友圈曲谱（.mtab.json）。MIDI 会先打开选轨与量化设置；Guitar Pro 会先选音轨。'}</p></div>
        <button type="button" class="nf-link" data-act="demo">试一试：用示例文件《送别（AI 转谱）》</button></section>`;
      right = `<aside class="nf-right"><div class="nf-f"><span>读进来以后</span><ul class="nf-steps"><li>${ic('act-check', 16)}先看依据：调、拍号、速度、声部、歌词</li><li>${ic('act-check', 16)}选「做成哪种谱」，预览立刻换</li><li>${ic('act-check', 16)}导入到新窗口，原谱保留</li></ul></div></aside>`;
      go = `<button type="button" class="nf-go" disabled>${ic('act-import', 20)}导入</button>`;
    } else if (I.src === 'file' || I.src === 'ai') {
      const tg = impTargets(a), cur = I.target || a.recommend, kind = NF_HOST.importKind(a, cur);
      const r = NF_HOST.importPreview(a, cur);
      mid = `<section class="nf-mid" data-scroll="mid"><div class="nf-file">${ic(a.ai ? 'src-ai' : 'src-mxl', 28)}<div><b>${esc(a.name)}</b><span>${esc(a.fmt)} · ${a.measures} 小节 · ${a.parts} 声部 · ${a.hasLyrics ? '有歌词' : '无歌词'}</span></div><button type="button" class="nf-link" data-act="unload">换一个文件</button></div>
        <div class="nf-basis wide"><b>依据</b>${a.basis.map(([s2, t, w]) => `<p><span class="nf-chips"><i class="c-${s2}">${esc(t)}</i></span><em>${esc(w)}</em></p>`).join('')}</div>
        ${r && r.svg ? `<figure class="nf-paper"><div class="nf-svg">${r.svg}</div><figcaption>预览：文件前几小节按「${esc(kind)}」实时刻版</figcaption></figure>` : '<div class="nf-paper nf-empty"><p>预览生成中…</p></div>'}</section>`;
      right = `<aside class="nf-right" data-scroll="right"><div class="nf-f"><span>做成哪种谱</span><div class="nf-tg" role="radiogroup" aria-label="做成哪种谱">${tg.map(x => `<button type="button" role="radio" data-act="target" data-v="${x.t}" aria-checked="${cur === x.t}"${x.dis ? ' disabled' : ''}>${ic(x.i, 20)}<span><b>${x.n}</b><small>${x.dis || (x.t === 'orig' ? '不改记谱' : '→ ' + x.kind)}</small></span>${x.t === a.recommend ? '<em class="nf-tag">推荐</em>' : ''}</button>`).join('')}</div></div>
        <p class="nf-fixed">${ic('act-info', 16)}导入后在谱面上方还能随时换「旋律用 简谱 | 五线谱」，音符不动。</p></aside>`;
      go = `<button type="button" class="nf-go" data-act="import-go" id="nf-go">${ic('act-import', 20)}导入为 <span>${esc(kind)}</span><kbd>↵</kbd></button>`;
    } else if (I.src === 'ex') {
      const ex = NF_HOST.examples(), sel = I.ex == null ? 13 : I.ex, e = ex[sel] || ex[0];
      const r = NF_HOST.examplePreview(sel);
      mid = `<section class="nf-mid" data-scroll="mid"><div class="nf-exgrid" role="listbox" aria-label="示例">${ex.map((x, i) => `<div class="nf-ex" role="option" data-ex="${i}" aria-selected="${i === sel}" tabindex="${i === sel ? 0 : -1}">${ic(x.ic, 20)}<span>${esc(x.name)}</span></div>`).join('')}</div>
        ${r && r.svg ? `<figure class="nf-paper sm"><div class="nf-svg">${r.svg}</div><figcaption>示例《${esc(e.name)}》首行</figcaption></figure>` : ''}</section>`;
      right = `<aside class="nf-right"><div class="nf-f"><span>做同款</span><p class="nf-fixed">沿用《${esc(e.name)}》的谱类、谱行、调、拍号与版式，音符、歌词、和弦留空。</p></div><label class="nf-f"><span>曲名</span><input id="nf-extitle" type="text" placeholder="${esc(e.name.replace(/（.*$/, ''))}（同款）"></label><button type="button" class="nf-link" data-act="ex-open">只看示例：在新窗口打开《${esc(e.name)}》</button></aside>`;
      go = `<button type="button" class="nf-go" data-act="ex-go" id="nf-go">${ic('src-example', 20)}按此格式新建<kbd>↵</kbd></button>`;
    } else if (I.src === 'recent') {
      mid = `<section class="nf-mid nf-dropwrap"><div class="nf-drop">${ic('src-recent', 40)}<b>${recent ? '接着做《' + esc(recent.title) + '》' : '还没有自己的谱'}</b><p>${recent ? esc(recent.kind) + ' · ' + esc(recent.when || '') : '「接着做」只列你自己保存过的谱，不含示例谱和空谱。建一份新谱后，这里就会出现。'}</p>${recent ? '<button type="button" class="nf-go2" data-act="recent-go">打开</button>' : ''}</div></section>`;
      right = '<aside class="nf-right"></aside>';
      go = `<button type="button" class="nf-go" data-act="tab" data-v="new">${ic('act-new', 20)}去新建</button>`;
    } else {
      const au = I.src === 'audio';
      mid = `<section class="nf-mid nf-dropwrap"><div class="nf-drop off">${ic(au ? 'src-audio' : 'src-image', 40)}<b>${au ? '录音转谱暂停中' : '图片识谱在规划中'}</b><p>${au ? '先用 AI 转谱工具把录音转成 MusicXML，再从左边「整理 AI 转谱结果」拖进来：定调、配和弦、转教学对照谱都在这里一次完成。' : '纸质谱或截图暂时不能直接识别。可以先用识谱软件导出 MusicXML，再从「打开或导入文件」进来。'}</p><button type="button" class="nf-go2" data-act="isrc" data-v="ai">去「整理 AI 转谱结果」</button></div></section>`;
      right = '<aside class="nf-right"></aside>';
      go = `<button type="button" class="nf-go" disabled>${ic('act-import', 20)}导入</button>`;
    }
    return `<div class="nf-body">${left}${mid}${right}</div><footer class="nf-ft"><p class="nf-keys"><kbd>↑</kbd><kbd>↓</kbd> 选来源 · <kbd>Enter</kbd> 导入 · <kbd>Esc</kbd> 关闭</p><span class="nf-where">新窗口打开 · 当前谱保留</span>${go}</footer>`;
  }

  /* ───────── 手机（≤820）：列表 → 详情；默认「发到电脑继续」（手机只读的既定口径），是否开放手机新建待拍板 ───────── */
  function mobile() {
    const m = st.mob;
    if (m === 'sent') return mSent();
    if (st.tab === 'import') return mImport();
    if (m === 'detail') return mDetail();
    const head = `<header class="nf-mh2"><button type="button" class="nf-x" data-act="close" aria-label="关闭">${ic('act-close', 22)}</button><h2>开始一份谱</h2><span></span></header>
      <div class="nf-mtabs" role="tablist"><button type="button" role="tab" data-act="tab" data-v="new" aria-selected="true">按用途</button><button type="button" role="tab" data-act="tab" data-v="import" aria-selected="false">从已有音乐</button></div>`;
    return `${head}<div class="nf-mbody" data-scroll="mlist">${GROUPS.map(([g, ids]) => (g ? `<h4>${g}</h4>` : '<h4>其他</h4>') + ids.map(id => { const s = SC[id]; return `<button type="button" class="nf-mrow" data-act="mscene" data-v="${id}"><span class="nf-mi">${ic(s.ic, 26)}</span><span class="nf-mt"><b>${s.n}${s.tag ? `<em class="nf-tag">${s.tag}</em>` : ''}</b><small>${s.desc}</small></span>${ic('act-step', 18)}</button>`; }).join('')).join('')}
      <p class="nf-mfoot">${ic('act-info', 16)}自选记谱法（五种记谱自由组合）请在电脑上用。</p></div>`;
  }
  function mDetail() {
    const k = stackOfState(st), o = optsOf(st), kind = kindOfState(st), s = SC[st.scene];
    const canCreate = !!(NF_HOST.mobileCreate && NF_HOST.mobileCreate());
    return `<header class="nf-mh2"><button type="button" class="nf-x" data-act="mback" aria-label="返回">${ic('act-back', 22)}</button><h2>${s.n}${s.tag ? `<em class="nf-tag">${s.tag}</em>` : ''}</h2><span></span></header>
      <div class="nf-mbody" data-scroll="mdet"><p class="nf-mkind">将建成 <b>${ic(kind.ic, 20)}${esc(kind.name)}</b></p>${paper(k, o, true)}
      <div class="nf-mfields">${fields(k)}</div></div>
      <div class="nf-mbar">${canCreate ? `<button type="button" class="nf-go" data-act="create" id="nf-go">${ic('act-new', 20)}创建 · ${esc(kind.name)}</button>`
        : `<button type="button" class="nf-go" data-act="send" id="nf-go">${ic('act-pc', 20)}发到电脑继续</button><p>手机上可以看谱、播放、移调；写谱在电脑上更顺手。链接会带上这套设置。</p>`}</div>`;
  }
  function mSent() {
    const url = st.sent || '';
    return `<header class="nf-mh2"><button type="button" class="nf-x" data-act="mback" aria-label="返回">${ic('act-back', 22)}</button><h2>发到电脑继续</h2><span></span></header>
      <div class="nf-mbody"><div class="nf-sent">${ic('act-check', 32)}<b>链接已复制</b><p>在电脑浏览器打开，新建面板会按这套设置预填，按回车就能建：</p><code>${esc(url)}</code>
      <ol><li>微信「文件传输助手」发给自己，或直接粘贴到电脑</li><li>电脑打开链接：已选好「${esc(SC[st.scene].n)}」、${esc(st.v.mode === 'minor' ? MINOR[st.v.key] + ' 小调' : '1=' + kl(st.v.key))}、${esc(st.v.meter)}、♩=${esc(st.v.tempo)}</li><li>按回车创建</li></ol>
      <button type="button" class="nf-go2" data-act="copy">${ic('act-link', 18)}再复制一次</button></div></div>`;
  }
  function mImport() {
    const recent = NF_HOST.recent && NF_HOST.recent();
    return `<header class="nf-mh2"><button type="button" class="nf-x" data-act="close" aria-label="关闭">${ic('act-close', 22)}</button><h2>开始一份谱</h2><span></span></header>
      <div class="nf-mtabs" role="tablist"><button type="button" role="tab" data-act="tab" data-v="new" aria-selected="false">按用途</button><button type="button" role="tab" data-act="tab" data-v="import" aria-selected="true">从已有音乐</button></div>
      <div class="nf-mbody">${ISRC.map(([s2, i, n, d]) => { const dd = s2 === 'recent' ? (recent ? '《' + esc(recent.title) + '》' : '还没有自己的谱') : d; return `<button type="button" class="nf-mrow${s2 === 'audio' || s2 === 'image' ? ' off' : ''}" data-act="${s2 === 'file' || s2 === 'ai' ? 'pick' : 'mtoast'}" data-v="${s2}"><span class="nf-mi">${ic(i, 26)}</span><span class="nf-mt"><b>${n}</b><small>${dd}</small></span>${ic('act-step', 18)}</button>`; }).join('')}
      <p class="nf-mfoot">${ic('act-info', 16)}手机上导入的文件以看谱模式打开：可以播放、移调、转简谱查看。</p></div>`;
  }

  /* ───────── 交互 ───────── */
  function setNote(text, prev) { st.note = text ? { text, prev } : null; clearTimeout(noteTimer); if (text) noteTimer = setTimeout(() => { if (st && st.note && st.note.text === text) { st.note = null; draw(); } }, 6000); }
  function toggleRow(r) {
    if (!window.NWB) return;
    const prev = { scene: st.scene, rows: st.rows.slice(), v: Object.assign({}, st.v), mel: st.mel };
    const cur = stackRows(stackOfState(st));
    const res = NWB.resolve(cur, r);
    const nk = keyOfRows(res.rows);
    /* 改谱行：若当前用途在某个变体下正好是这套谱行，就留在该用途；否则切到「自定」 */
    let stay = false;
    if (st.scene !== 'custom') {
      const tries = [{}, { mel: st.mel === 'S' ? 'J' : 'S' }];
      (SC[st.scene].vars || []).forEach(vk => (VARS[vk].opts || []).forEach(([val]) => tries.push({ [vk]: val })));
      for (const t of tries) { const v2 = Object.assign({}, st.v, t), m2 = t.mel || st.mel; if (sceneStack(st.scene, v2, m2) === nk) { Object.assign(st.v, t); delete st.v.mel; st.mel = m2; stay = true; break; } }
    }
    if (!stay) st.scene = 'custom';
    st.rows = res.rows.slice();
    setNote(res.note || '', prev);
    st.hint = '';
    draw();
  }
  function rowHint(r) {
    const cur = stackRows(stackOfState(st)); const res = NWB.resolve(cur, r);
    const nk = keyOfRows(res.rows), name = NWB.kindOf(nk, {}).name;
    if (cur.includes(r)) return res.rows.length === cur.length ? '至少保留一行谱' : '熄灭「' + ROWN[r] + '」→ ' + name;
    const dropped = cur.filter(x => !res.rows.includes(x));
    if (res.rows.join() === cur.join()) return res.note || '';
    return '点亮「' + ROWN[r] + '」→ ' + name + (dropped.length ? '（将换下「' + dropped.map(x => ROWN[x]).join('」「') + '」）' : '');
  }
  function create() {
    const P = planOf(st);
    try { NF_HOST.lastSave && NF_HOST.lastSave({ scene: P.scene, stack: P.stack, v: Object.assign({}, st.v, { title: '' }), mel: st.mel }); } catch (_) {}
    close(true);
    NF_HOST.create(P);
  }
  function deepLink() {
    const v = st.v, q = new URLSearchParams();
    q.set('new', st.scene); if (st.scene === 'custom') q.set('rows', stackOfState(st));
    q.set('key', v.key + (v.mode === 'minor' ? 'm' : '')); q.set('meter', v.meter); q.set('tempo', v.tempo);
    SC[st.scene].vars.forEach(k => q.set(k, v[k])); if (melLive(st.scene, v)) q.set('mel', st.mel);
    if ((v.title || '').trim()) q.set('title', v.title.trim());
    return 'https://zhipu.puyouquan.com/?' + q.toString().replace(/%2F/g, '/');
  }
  function onClick(e) {
    const t = e.target.closest('[data-act],[data-scene],[data-row],[data-isrc],[data-ex]'); if (!t || t.disabled) return;
    if (t.dataset.scene) { const id = t.dataset.scene; if (id !== st.scene) { const prevS = st.scene; applyScene(st, id); setNote('', null); st.hint = ''; } draw(); if (e.detail === 2) create(); return; }
    if (t.dataset.row) { toggleRow(t.dataset.row); return; }
    if (t.dataset.isrc) { st.imp.src = t.dataset.isrc; draw(); return; }
    if (t.dataset.ex) { st.imp.ex = +t.dataset.ex; draw(); if (e.detail === 2) NF_HOST.exampleApply(+t.dataset.ex, 'same', ''); return; }
    const a = t.dataset.act, v = t.dataset.v;
    switch (a) {
      case 'close': close(); break;
      case 'tab': st.tab = v; if (NF_HOST.isMobile()) st.mob = 'list'; draw(); break;
      case 'mel': st.mel = v; st.rows = stackRows(sceneStack(st.scene, st.v, st.mel)); draw(); break;
      case 'var': { const k = t.dataset.k; st.v[k] = /^\d+$/.test(v) ? +v : v; if (st.scene !== 'custom') st.rows = stackRows(sceneStack(st.scene, st.v, st.mel)); draw(); break; }
      case 'more': st.more = !st.more; draw(); break;
      case 'undo': if (st.note && st.note.prev) { const p = st.note.prev; st.scene = p.scene; st.rows = p.rows; st.v = p.v; st.mel = p.mel; setNote('', null); draw(); } break;
      case 'create': create(); break;
      case 'mscene': applyScene(st, v); st.mob = 'detail'; draw(); { const b = root.querySelector('.nf-mbody'); if (b) b.scrollTop = 0; } break;
      case 'mback': st.mob = st.mob === 'sent' ? 'detail' : 'list'; draw(); break;
      case 'send': st.sent = deepLink(); try { NF_HOST.copyLink(st.sent); } catch (_) {} st.mob = 'sent'; draw(); break;
      case 'copy': try { NF_HOST.copyLink(st.sent); } catch (_) {} NF_HOST.toast && NF_HOST.toast('链接已复制'); break;
      case 'mtoast': NF_HOST.toast && NF_HOST.toast(v === 'audio' ? '录音转谱暂停中：请先用 AI 转谱工具导出 MusicXML' : v === 'image' ? '图片识谱在规划中' : v === 'ex' ? '示例：在「我的 → 预设」里看' : '接着做：打开「我的」'); break;
      case 'pick': NF_HOST.importPick(st.imp.src === 'ai' ? 'ai' : 'file'); break;
      case 'demo': NF_HOST.importDemo(st.imp.src === 'ai'); break;
      case 'unload': st.imp.a = null; st.imp.target = null; draw(); break;
      case 'target': st.imp.target = v; draw(); break;
      case 'import-go': { const A = st.imp.a, tg = st.imp.target || A.recommend; close(true); NF_HOST.importApply(A, tg); break; }
      case 'isrc': st.imp.src = v; draw(); break;
      case 'ex-go': { const ti = (root.querySelector('#nf-extitle') || {}).value || ''; const i = st.imp.ex == null ? 13 : st.imp.ex; close(true); NF_HOST.exampleApply(i, 'same', ti); break; }
      case 'ex-open': { const i = st.imp.ex == null ? 13 : st.imp.ex; close(true); NF_HOST.exampleApply(i, 'open'); break; }
      case 'recent-go': close(true); NF_HOST.recentOpen && NF_HOST.recentOpen(); break;
    }
  }
  function onChange(e) {
    const t = e.target, v = st.v;
    if (t.id === 'nf-key') { const [k, m] = t.value.split('|'); v.key = k; v.mode = m; st.src.key = st.src.mode = 'user'; }
    else if (t.id === 'nf-meter') { v.meter = t.value; st.src.meter = 'user'; }
    else if (t.id === 'nf-inst') { if (!t.value) return; v.instKey = t.value; st.rows = stackRows(sceneStack(st.scene, v, st.mel)); }
    else if (t.id === 'nf-lyr') { v.lyr = +t.value; st.src.lyr = 'user'; }
    else if (t.id === 'nf-tuning') v.tuning = t.value;
    else if (t.id === 'nf-capo') v.capo = +t.value;
    else if (t.id === 'nf-nmea') { v.nMea = +t.value || 8; st.src.nMea = 'user'; }
    else if (t.id === 'nf-tempo') { v.tempo = +t.value || v.tempo; st.src.tempo = 'user'; }
    else return;
    draw();
  }
  function onInput(e) {
    const t = e.target;
    if (t.id === 'nf-title') { st.v.title = t.value; clearTimeout(pvTimer); pvTimer = setTimeout(draw, 220); }
    else if (t.id === 'nf-tempo') { const n = +t.value; if (n >= 20 && n <= 300) { st.v.tempo = n; st.src.tempo = 'user'; clearTimeout(pvTimer); pvTimer = setTimeout(draw, 400); } }
  }
  function onHover(e) {
    const t = e.target.closest && e.target.closest('[data-row]'); if (!t || !root) return;
    const h = root.querySelector('.nf-rowhint'); if (h) h.textContent = rowHint(t.dataset.row);
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); if (NF_HOST.isMobile() && st.mob !== 'list') { st.mob = 'list'; draw(); } else close(); return; }
    const tg = e.target, inField = /^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName);
    const lb = tg.closest && tg.closest('[role=listbox]');
    if (lb && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const opts = [...lb.querySelectorAll('[role=option]')], i = opts.indexOf(tg.closest('[role=option]'));
      const n = opts[Math.max(0, Math.min(opts.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]; if (n) n.click(), setTimeout(() => { const f = root && root.querySelector('[role=option][aria-selected="true"]'); if (f) f.focus(); }, 0);
      return;
    }
    if (e.key === 'Enter' && !e.isComposing && (!inField || tg.id === 'nf-title' || tg.id === 'nf-extitle') && !(tg.tagName === 'BUTTON' && !tg.closest('[role=listbox]'))) {
      e.preventDefault(); const g = root.querySelector('#nf-go'); if (g && !g.disabled) g.click(); return;
    }
    if (!inField && st.tab === 'new' && /^[1-5]$/.test(e.key) && !e.altKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleRow(ROWS[+e.key - 1][0]); }
  }
  function importLoaded(a) {
    if (!root) open({ tab: 'import' });
    st.tab = 'import'; st.imp.src = a.ai ? 'ai' : 'file'; st.imp.a = a; st.imp.target = a.recommend; if (NF_HOST.isMobile()) st.mob = 'list';
    draw();
  }

  /* ───────── 「新建 ▾」快捷菜单 ───────── */
  function quickMenu() {
    const last = NF_HOST.lastLoad && NF_HOST.lastLoad();
    const lastSt = fresh({}); const lk = kindOfState(lastSt), lv = lastSt.v;
    const sc = id => `<button type="button" role="menuitem" class="nf-qi" data-q="${id}">${ic(SC[id].ic, 20)}<b>${SC[id].n}</b>${SC[id].tag ? `<em class="nf-tag">${SC[id].tag}</em>` : ''}</button>`;
    return `<div class="nf-qm" role="menu" aria-label="快速新建">
      <button type="button" role="menuitem" class="nf-qi nf-qlast" data-q="last">${ic('tpl-last', 20)}<span><b>${last ? '按上次：' + SC[lastSt.scene].n : '按默认：吉他弹唱'}</b><small>${esc(lk.name)} · ${lv.mode === 'minor' ? MINOR[lv.key] + ' 小调' : '1=' + kl(lv.key)} ${lv.meter} ♩=${lv.tempo}</small></span><kbd>Alt+Shift+N</kbd></button>
      <div class="nf-qsep"></div>${['gtr', 'pacc', 'kids', 'vocal', 'teach', 'sight', 'solo', 'inst', 'chord'].map(sc).join('')}
      <div class="nf-qsep"></div><button type="button" role="menuitem" class="nf-qi" data-q="import">${ic('act-import', 20)}<b>从已有音乐…</b><small>MusicXML · GP · MIDI · AI 转谱</small></button>
      <button type="button" role="menuitem" class="nf-qi" data-q="panel">${ic('act-new', 20)}<b>新建面板…</b><kbd>Alt+N</kbd></button></div>`;
  }
  function quickCreate(id) {
    const s2 = id === 'last' ? fresh({}) : fresh({ scene: id });
    const P = planOf(s2);
    try { NF_HOST.lastSave && NF_HOST.lastSave({ scene: P.scene, stack: P.stack, v: Object.assign({}, s2.v, { title: '' }), mel: s2.mel }); } catch (_) {}
    NF_HOST.create(P);
  }

  /* ───────── 落地：谱型条（谱类 ▾ ＋ 旋律用 ＋ 起步条），锚在 #paper 宽度内，不压左栏 ───────── */
  function barHTML(info, mob) {
    const { kind, stack, steps, mel, melOk } = info;
    const stp = steps ? steps.map((x, i) => `<li class="${x.state}">${x.state === 'done' ? `<i>${ic('act-check', 14)}</i>` : `<i>${i + 1}</i>`}<span>${x.t}</span></li>`).join('') : '';
    const nxt = steps ? steps.find(x => x.state === 'now' && x.btn) : null;
    const curI = steps ? steps.findIndex(x => x.state === 'now') : -1;
    if (mob) return `<div class="nf-bar m" role="region" aria-label="下一步">${ic(kind.ic, 20)}<b>${esc(kind.name)}</b>${nxt ? `<button type="button" class="nf-bgo" data-bact="${nxt.act}">${nxt.btn}</button>` : curI >= 0 ? `<span class="nf-mstep"><i>${curI + 1}</i>${steps[curI].t}</span>` : ''}<button type="button" class="nf-bx" data-bact="hide" aria-label="收起">${ic('act-close', 18)}</button></div>`;
    return `<div class="nf-bar" role="region" aria-label="谱型与下一步">
      <button type="button" class="nf-bk" data-bact="kind" aria-haspopup="menu" title="换谱类">${ic(kind.ic, 20)}<b>${esc(kind.name)}</b>${ic('act-chevron', 16)}</button>
      ${melOk ? `<span class="nf-bsep"></span><span class="nf-bml">旋律用</span><div class="nf-seg sm" role="radiogroup" aria-label="旋律用">${[['J', '简谱'], ['S', '五线谱']].map(([m, t]) => `<button type="button" role="radio" data-bact="mel" data-v="${m}" aria-checked="${mel === m}">${t}</button>`).join('')}</div>` : ''}
      <span class="nf-bsep"></span>${steps ? `<ol class="nf-steps2">${stp}</ol>` : `<span class="nf-tip">${esc(info.tip || '')}</span>`}
      ${nxt ? `<button type="button" class="nf-bgo" data-bact="${nxt.act}">${ic(nxt.ic || 'act-step', 18)}${nxt.btn}</button>` : ''}
      <button type="button" class="nf-bx" data-bact="hide" aria-label="收起" title="收起">${ic('act-close', 18)}</button></div>`;
  }
  function switchMenuHTML(s) {
    const cur = NWB.stackOf(s), ctx = NWB.ctxOf(s);
    const G2 = [['旋律', ['J', 'S', 'SJ']], ['旋律＋钢琴伴奏', ['JG', 'SG', 'SJG']], ['弹唱 · 独奏', ['JT', 'ST', 'G', 'CG']], ['和弦', ['CJ', 'CS', 'C']]];
    const MB = { rebuild: '直接换', direct: '直接换 · 不动音符', copy: '另建一份', no: '不可换', same: '当前' };
    return `<div class="nf-sw" role="menu" aria-label="换谱类"><p class="nf-swh">${NWB.isEmptySong(s) ? '谱还是空的：任意换，按同样的曲名、调、拍号、速度重建。' : '已有内容：只给不动音符的换法；其余另建一份，旋律带过去，原谱保留。'}</p>${G2.map(([g, ks]) => `<div class="nf-swg">${g}</div>` + ks.map(k => {
      const p = NWB.switchPlan(s, k), kd = NWB.kindOf(k, Object.assign({}, ctx, { nVox: 1 }));
      return `<button type="button" role="menuitem" class="nf-swi m-${p.mode}" data-sw="${k}"${p.mode === 'no' || p.mode === 'same' ? ' aria-disabled="true"' : ''} title="${esc(p.why || '')}">${ic(kd.ic, 20)}<b>${esc(kd.name)}</b><em>${MB[p.mode]}</em></button>`; }).join('')).join('')}</div>`;
  }
  const api = { open, close, draw, importLoaded, quickMenu, quickCreate, barHTML, switchMenuHTML, planOf, fresh, applyScene, sceneStack, optsOf, kindOfState, stackOfState, SC, VARS, GROUPS, INST, famOf, kl, MINOR, deepLink: () => deepLink(), get state() { return st; }, get root() { return root; }, toggleRow, rowHint };
  window.NF = api;

  /* ───────── 样式（只用编辑器令牌：两主题自动跟随；谱纸恒白） ───────── */
  api.css = `
.nf-root{position:fixed;inset:0;z-index:400;font-family:var(--font-ui,system-ui,sans-serif);color:var(--text);-webkit-font-smoothing:antialiased}
.nf-root.nf-d{background:rgba(14,12,36,.42);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(1.5px)}
:root[data-theme=dark] .nf-root.nf-d{background:rgba(0,0,0,.56)}
.nf-root .pqi{flex:0 0 auto;display:block}
.nf-root :where(button){font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.nf-root :focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.nf-root kbd{font:600 11px/1 var(--font-ui,system-ui);padding:3px 5px;border:1px solid var(--border);border-bottom-width:2px;border-radius:5px;background:var(--panel);color:var(--muted)}
.nf-tag{font-style:normal;font-size:11.5px;font-weight:600;line-height:1;padding:4px 6px;border-radius:6px;background:var(--accent-soft);color:var(--accent-ink);white-space:nowrap}
.nf-modal{width:min(1200px,calc(100vw - 48px));height:min(744px,calc(100vh - 40px));background:var(--panel);border:1px solid var(--border);border-radius:16px;box-shadow:0 24px 64px rgba(18,16,52,.28);display:grid;grid-template-rows:60px minmax(0,1fr) 68px;overflow:hidden}
.nf-hd{display:flex;align-items:center;gap:16px;padding:0 12px 0 24px;border-bottom:1px solid var(--border)}
.nf-hd h2{margin:0;font-size:18px;font-weight:700;letter-spacing:.01em}
.nf-tabs{display:inline-flex;padding:3px;border-radius:11px;background:var(--fill,var(--bg));gap:2px}
.nf-tabs button{display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 14px;border:0;border-radius:9px;background:none;font-size:14px;font-weight:600;color:var(--muted)}
.nf-tabs button[aria-selected=true]{background:var(--panel);color:var(--text);box-shadow:0 1px 3px rgba(18,16,52,.12)}
.nf-x{margin-left:auto;width:44px;height:44px;border:0;border-radius:10px;background:none;display:inline-flex;align-items:center;justify-content:center;color:var(--muted)}
.nf-x:hover{background:var(--hover);color:var(--text)}
.nf-body{display:grid;grid-template-columns:288px minmax(0,1fr) 300px;min-height:0}
.nf-left,.nf-right,.nf-mid{min-height:0;overflow:auto}
.nf-left{border-right:1px solid var(--border);padding:12px 12px 16px;background:var(--toolbar,var(--panel))}
.nf-right{border-left:1px solid var(--border);padding:16px 18px 18px;display:flex;flex-direction:column;gap:14px}
.nf-mid{padding:16px 22px 18px;display:flex;flex-direction:column;gap:10px}
.nf-lh{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;padding:4px 8px 6px}
.nf-lh span{font-weight:400;color:var(--muted);font-size:12px}
.nf-lh2{margin-top:10px;padding-top:12px;border-top:1px solid var(--border)}
.nf-lh .pqi{color:var(--muted)}
.nf-gl{font-size:12px;font-weight:600;color:var(--muted);padding:7px 10px 2px;letter-spacing:.04em}
.nf-pair{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.nf-gsep{height:1px;background:var(--border);margin:6px 8px}
.nf-sc{display:flex;align-items:center;gap:10px;min-height:44px;padding:0 10px;border-radius:10px;border:1px solid transparent;cursor:pointer;color:var(--text);outline-offset:-2px}
.nf-sc .pqi{color:var(--muted)}
.nf-sc b{font-size:14px;font-weight:600;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nf-sc:hover{background:var(--hover)}
.nf-sc[aria-selected=true]{background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 55%,transparent)}
.nf-sc[aria-selected=true] .pqi{color:var(--accent-ink)}
.nf-sc[aria-selected=true] b{color:var(--accent-ink)}
.nf-src span{display:flex;flex-direction:column;min-width:0;flex:1}.nf-src small{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nf-src{min-height:56px}.nf-src.off b,.nf-src.off .pqi{color:var(--muted)}
.nf-rowbar{display:flex;align-items:center;gap:10px}
.nf-rbl{display:flex;flex-direction:column;font-size:13px;font-weight:700;white-space:nowrap}.nf-rbl small{font-size:11.5px;font-weight:400;color:var(--muted)}
.nf-rows{display:flex;flex-wrap:wrap;gap:6px;flex:1}
.nf-row{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:44px;padding:0 11px;border:1px solid var(--border);border-radius:10px;background:var(--panel);color:var(--muted);font-size:13px;font-weight:600;flex:1 1 auto}
.nf-row:hover{border-color:color-mix(in srgb,var(--accent) 50%,var(--border));color:var(--text)}
.nf-row[aria-pressed=true]{border-color:var(--accent);background:var(--accent-soft);color:var(--accent-ink)}
.nf-rowhint{margin:-2px 0 0;font-size:12px;line-height:1.5;color:var(--muted);min-height:18px}
.nf-mh{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
.nf-ey{font-size:12px;color:var(--muted);font-weight:600}
.nf-mh h3{margin:2px 0 0;display:flex;align-items:center;gap:8px;font-size:21px;font-weight:700}
.nf-mh h3 .pqi{color:var(--accent-ink)}
.nf-scn{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted);padding:6px 10px;border:1px solid var(--border);border-radius:999px;white-space:nowrap}
.nf-desc{margin:0;font-size:13px;line-height:1.6;color:var(--muted)}
.nf-paper{position:relative;margin:0;background:#fff;border:1px solid var(--border);border-radius:12px;padding:10px 128px 30px 10px;color:#141414}
.nf-paper.nf-empty{min-height:220px;display:flex;align-items:center;justify-content:center;padding:10px;color:#5c5b73;font-size:13px}
.nf-svg svg{display:block;width:100%;height:auto;max-height:340px}
.nf-paper.sm .nf-svg svg{max-height:200px}
.nf-bands{position:absolute;top:10px;bottom:30px;right:0;width:122px}
.nf-bl{position:absolute;left:0;right:8px;transform:translateY(-50%);display:flex;flex-wrap:wrap;align-items:center;gap:2px 5px;padding-left:12px;font-size:12px;color:#5c5b73;line-height:1.3}
.nf-bl::before{content:'';position:absolute;left:0;top:50%;height:max(var(--h),18px);max-height:140px;transform:translateY(-50%);border-left:2px solid #d9d7ea;border-radius:2px}
.nf-bl b{font-weight:600;color:#1b1a2e}
.nf-bl.pen::before{border-color:#5b4cf0}.nf-bl.pen b{color:#4a3ad6}.nf-bl.pen .pqi{color:#4a3ad6}
.nf-bl i{font-style:normal;width:100%;font-size:11.5px;color:#4a3ad6}
.nf-paper figcaption{position:absolute;left:12px;right:12px;bottom:8px;display:flex;justify-content:space-between;gap:8px;font-size:12px;color:#5c5b73}
.nf-pvnote{color:#4a3ad6;font-weight:600}
.nf-note{display:flex;align-items:center;gap:8px;padding:8px 8px 8px 12px;border-radius:10px;background:var(--accent-soft);color:var(--text);font-size:13px;line-height:1.5}
.nf-note .pqi{color:var(--accent-ink)}.nf-note span{flex:1}
.nf-note button{display:inline-flex;align-items:center;gap:4px;height:36px;padding:0 12px;border-radius:8px;border:1px solid var(--border);background:var(--panel);font-size:13px;font-weight:600}
.nf-same{display:flex;align-items:flex-start;gap:8px;margin:2px 0 0;font-size:12.5px;line-height:1.6;color:var(--muted)}
.nf-same .pqi{color:var(--accent-ink);margin-top:1px}.nf-same b{color:var(--text);font-weight:600}
.nf-root .nf-same{justify-content:flex-start;text-align:left}.nf-root .nf-same>span{flex:1 1 auto;margin:0!important;text-align:left}
.nf-f{display:flex;flex-direction:column;gap:6px;min-width:0}
.nf-f>span{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--muted)}
.nf-f>span em{font-style:normal;font-weight:400;font-size:11.5px;margin-left:auto}
.nf-f input,.nf-f select{height:44px;border:1px solid var(--border);border-radius:10px;background:var(--ed-raise,var(--panel));color:var(--text);font:inherit;font-size:14px;padding:0 12px;min-width:0;width:100%;box-sizing:border-box}
.nf-f select{padding-right:6px}
.nf-f3{display:grid;grid-template-columns:1.25fr .95fr 1fr;gap:8px}
.nf-root input[type=number]{-moz-appearance:textfield;appearance:textfield}.nf-root input[type=number]::-webkit-inner-spin-button,.nf-root input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.nf-tempo{position:relative;display:block}.nf-tempo i{position:absolute;left:10px;top:50%;transform:translateY(-50%);font-style:normal;color:var(--muted);font-size:13px}.nf-tempo input{padding-left:30px;padding-right:6px}
i.nf-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-left:2px}
i.nf-dot.s-user,i.nf-dot.s-file,i.nf-dot.s-link{background:var(--accent)}i.nf-dot.s-scene{border:1.5px dashed var(--accent);box-sizing:border-box}i.nf-dot.s-last,i.nf-dot.s-default{background:var(--muted)}
.nf-seg{display:flex;padding:2px;border-radius:11px;background:var(--fill,var(--bg));gap:2px}
.nf-seg button{flex:1;display:inline-flex;align-items:center;justify-content:center!important;gap:5px;min-height:40px;padding:0 8px;border:0;border-radius:9px;background:none;font-size:13.5px;font-weight:600;color:var(--muted);white-space:nowrap}
.nf-seg button[aria-checked=true]{background:var(--panel);color:var(--accent-ink);box-shadow:0 1px 3px rgba(18,16,52,.14)}
.nf-fixed{margin:0;display:flex;align-items:center;gap:6px;min-height:40px;padding:0 12px;border-radius:10px;background:var(--fill,var(--bg));font-size:13px;color:var(--muted);line-height:1.5}
.nf-right>.nf-fixed{padding:10px 12px}
.nf-basis{border:1px dashed var(--border);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:4px}
.nf-basis>b{font-size:12px;color:var(--muted)}
.nf-basis p{margin:0;display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:12px}
.nf-basis em{font-style:normal;color:var(--muted)}
.nf-chips{display:flex;flex-wrap:wrap;gap:4px}
.nf-chips i{font-style:normal;font-size:12px;font-weight:600;padding:2px 6px;border-radius:6px;border:1px solid var(--border);color:var(--muted)}
.nf-chips i.c-user,.nf-chips i.c-file,.nf-chips i.c-link{background:var(--accent-soft);border-color:transparent;color:var(--accent-ink)}
.nf-chips i.c-scene{border:1px dashed color-mix(in srgb,var(--accent) 70%,transparent);color:var(--accent-ink)}
.nf-basis.wide{max-width:none}
.nf-more{justify-content:flex-start;display:flex;align-items:center;gap:8px;min-height:44px;border:0;border-top:1px solid var(--border);background:none;padding:6px 2px 0;font-size:13.5px;font-weight:600;color:var(--text);text-align:left}
.nf-more span{margin-left:auto;font-weight:400;font-size:12px;color:var(--muted)}
.nf-more[aria-expanded=true] .pqi:last-child{transform:rotate(180deg)}
.nf-moreb{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.nf-ft{display:flex;align-items:center;gap:14px;padding:0 14px 0 24px;border-top:1px solid var(--border);background:var(--toolbar,var(--panel))}
.nf-keys{margin:0;font-size:12px;color:var(--muted);display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.nf-where{margin-left:auto;font-size:12px;color:var(--muted);white-space:nowrap}
.nf-go{display:inline-flex;align-items:center;gap:8px;height:48px;padding:0 14px 0 18px;border:0;border-radius:12px;background:var(--btn-pri,var(--accent));color:var(--ed-on-pri,#fff);font-size:15px;font-weight:700;white-space:nowrap;max-width:440px}
.nf-go span{overflow:hidden;text-overflow:ellipsis}
.nf-go:hover{background:var(--btn-pri-h,var(--accent))}
.nf-go[disabled]{opacity:.45;cursor:default}
.nf-go kbd{background:none;border-color:rgba(255,255,255,.55);color:#fff;margin-left:4px}
.nf-go2{display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 18px;border-radius:10px;border:1px solid var(--border);background:var(--panel);font-size:14px;font-weight:600}
.nf-link{border:0;background:none;color:var(--accent-ink);font-size:13px;font-weight:600;padding:10px 0;text-align:left;min-height:44px}
.nf-dropwrap{justify-content:center;align-items:center}
.nf-drop{width:100%;max-width:560px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:10px;padding:36px 28px;border:2px dashed color-mix(in srgb,var(--accent) 45%,var(--border));border-radius:16px;text-align:center;background:color-mix(in srgb,var(--accent) 4%,transparent)}
.nf-drop.off{border-color:var(--border);background:none}
.nf-drop .pqi{color:var(--accent-ink)}.nf-drop.off .pqi{color:var(--muted)}
.nf-drop b{font-size:17px}.nf-drop>span{font-size:12px;color:var(--muted)}.nf-drop p{margin:6px 0 0;font-size:12.5px;line-height:1.7;color:var(--muted)}
.nf-drop-tip{display:flex;gap:6px;align-items:flex-start;margin:12px 8px 0;font-size:12px;color:var(--muted);line-height:1.5}
.nf-steps{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;font-size:13px;color:var(--text)}
.nf-steps li{display:flex;gap:8px;align-items:center}.nf-steps .pqi{color:var(--ok)}
.nf-file{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--border);border-radius:12px}
.nf-file .pqi{color:var(--accent-ink)}.nf-file div{flex:1;display:flex;flex-direction:column;min-width:0}.nf-file b{font-size:14px}.nf-file span{font-size:12px;color:var(--muted)}
.nf-tg{display:flex;flex-direction:column;gap:6px}
.nf-tg button{justify-content:flex-start;display:flex;align-items:center;gap:10px;min-height:52px;padding:6px 10px;border:1px solid var(--border);border-radius:10px;background:var(--panel);text-align:left}
.nf-tg button span{flex:1;display:flex;flex-direction:column;min-width:0}.nf-tg b{font-size:13.5px}.nf-tg small{font-size:11.5px;color:var(--muted)}
.nf-tg button .pqi{color:var(--muted)}
.nf-tg button[aria-checked=true]{border-color:var(--accent);background:var(--accent-soft)}.nf-tg button[aria-checked=true] .pqi,.nf-tg button[aria-checked=true] b{color:var(--accent-ink)}
.nf-tg button[disabled]{opacity:.5;cursor:default}
.nf-exgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:4px}
.nf-ex{display:flex;align-items:center;gap:8px;min-height:44px;padding:0 10px;border-radius:9px;border:1px solid transparent;font-size:13px;cursor:pointer}
.nf-ex .pqi{color:var(--muted)}.nf-ex:hover{background:var(--hover)}.nf-ex[aria-selected=true]{background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 55%,transparent);color:var(--accent-ink)}
@media (max-height:760px){.nf-modal{grid-template-rows:56px minmax(0,1fr) 64px}.nf-gl{padding-top:4px}.nf-desc{display:none}.nf-mid{gap:8px;padding-top:12px}.nf-sc{min-height:42px}.nf-svg svg{max-height:270px}}
@media (max-width:1100px){.nf-body{grid-template-columns:260px minmax(0,1fr);grid-template-rows:max-content max-content;overflow:auto;align-content:start}.nf-body>.nf-mid,.nf-body>.nf-right{grid-column:2;overflow:visible}.nf-right{border-left:0;border-top:1px solid var(--border);display:grid;grid-template-columns:1fr 1fr;align-items:start}.nf-right>.nf-f3,.nf-right>.nf-basis,.nf-right>.nf-more,.nf-right>.nf-moreb{grid-column:1 / -1}.nf-left{grid-row:1 / span 2;position:sticky;top:0;align-self:start;max-height:calc(min(744px,100vh - 40px) - 124px);overflow:auto}.nf-keys{display:none}.nf-rbl small{display:none}}
/* 手机 */
.nf-root.nf-m{background:var(--bg);display:flex;flex-direction:column}
.nf-mh2{display:grid;grid-template-columns:48px 1fr 48px;align-items:center;height:56px;padding:0 4px;background:var(--panel);border-bottom:1px solid var(--border);flex:0 0 auto}
.nf-mh2 h2{margin:0;text-align:center;font-size:17px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px}
.nf-mh2 .nf-x{margin:0}
.nf-mtabs{display:flex;margin:10px 16px 2px;padding:3px;border-radius:12px;background:var(--fill,var(--toolbar));flex:0 0 auto}
.nf-mtabs button{flex:1;height:44px;border:0;border-radius:10px;background:none;font-size:14px;font-weight:600;color:var(--muted)}
.nf-mtabs button[aria-selected=true]{background:var(--panel);color:var(--text);box-shadow:0 1px 3px rgba(18,16,52,.12)}
.nf-mbody{flex:1;overflow:auto;padding:4px 16px 24px;-webkit-overflow-scrolling:touch}
.nf-mbody h4{margin:14px 4px 6px;font-size:12.5px;color:var(--muted);font-weight:600;letter-spacing:.04em}
.nf-mrow{justify-content:flex-start;display:flex;align-items:center;gap:12px;width:100%;min-height:64px;padding:8px 10px 8px 8px;margin-bottom:6px;border:1px solid var(--border);border-radius:14px;background:var(--panel);text-align:left}
.nf-mrow.off{opacity:.62}
.nf-mi{width:44px;height:44px;border-radius:11px;background:var(--fill,var(--bg));display:inline-flex;align-items:center;justify-content:center;color:var(--accent-ink);flex:0 0 auto}
.nf-mt{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}.nf-mt b{font-size:15px;display:flex;align-items:center;gap:6px}.nf-mt small{font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nf-mrow>.pqi:last-child{color:var(--muted)}
.nf-mfoot{display:flex;gap:6px;align-items:flex-start;font-size:12.5px;color:var(--muted);margin:14px 4px;line-height:1.6}
.nf-mkind{margin:12px 2px 8px;font-size:13px;color:var(--muted);display:flex;align-items:center;gap:6px}.nf-mkind b{display:inline-flex;align-items:center;gap:5px;color:var(--text);font-size:15px}.nf-mkind .pqi{color:var(--accent-ink)}
.nf-paper.m{padding:6px}
.nf-paper.m .nf-svg svg{max-height:260px}
.nf-mrows{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;margin:8px 2px 4px;font-size:12.5px;color:var(--muted)}.nf-mrows span{display:inline-flex;align-items:center;gap:3px}.nf-mrows span.pen{color:var(--accent-ink);font-weight:600}.nf-mrows i{font-style:normal}
.nf-mfields{display:flex;flex-direction:column;gap:14px;margin-top:12px;padding-bottom:110px}
.nf-mfields .nf-f3{grid-template-columns:1.2fr 1fr 1fr}
.nf-mbar{position:fixed;left:0;right:0;bottom:0;padding:10px 16px calc(12px + env(safe-area-inset-bottom));background:var(--panel);border-top:1px solid var(--border);display:flex;flex-direction:column;gap:6px;z-index:2}
.nf-mbar .nf-go{width:100%;justify-content:center;height:52px;max-width:none}
.nf-mbar p{margin:0;font-size:12px;color:var(--muted);text-align:center;line-height:1.5}
.nf-sent{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:28px 6px}.nf-sent>.pqi{color:var(--ok)}.nf-sent b{font-size:18px}.nf-sent p{margin:0;font-size:13.5px;color:var(--muted);line-height:1.6}
.nf-sent code{display:block;width:100%;box-sizing:border-box;padding:12px;border-radius:10px;background:var(--panel);border:1px solid var(--border);font-size:12px;word-break:break-all;text-align:left;color:var(--text)}
.nf-sent ol{text-align:left;margin:4px 0 6px;padding-left:20px;font-size:13px;line-height:1.8;color:var(--text)}
/* 新建 ▾ 快捷菜单 */
.nf-qm{position:fixed;z-index:420;width:330px;padding:6px;background:var(--panel);border:1px solid var(--border);border-radius:14px;box-shadow:0 16px 40px rgba(18,16,52,.22);font-family:var(--font-ui,system-ui);color:var(--text)}
.nf-qi{justify-content:flex-start;display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:4px 10px;border:0;border-radius:9px;background:none;text-align:left;font:inherit;color:inherit;cursor:pointer}
.nf-qi .pqi{color:var(--muted)}.nf-qi:hover,.nf-qi:focus-visible{background:var(--hover)}
.nf-qi b{font-size:14px;font-weight:600}.nf-qi small{font-size:12px;color:var(--muted)}.nf-qi kbd{margin-left:auto;font:600 11px/1 var(--font-ui,system-ui);padding:3px 5px;border:1px solid var(--border);border-radius:5px;color:var(--muted)}
.nf-qi>span{display:flex;flex-direction:column;min-width:0}.nf-qi .nf-tag{margin-left:auto}
.nf-qlast{background:var(--accent-soft)}.nf-qlast .pqi,.nf-qlast b{color:var(--accent-ink)}
.nf-qsep{height:1px;background:var(--border);margin:5px 6px}
/* 谱型条 */
#nf-barwrap{position:sticky;top:0;z-index:6;margin:0 auto;padding:10px 0 2px;box-sizing:border-box}
.nf-bar{display:flex;align-items:center;gap:8px;min-height:56px;padding:6px 6px 6px 8px;background:var(--panel);border:1px solid var(--border);border-radius:12px;box-shadow:0 2px 10px rgba(18,16,52,.07);font-family:var(--font-ui,system-ui);color:var(--text);box-sizing:border-box}
.nf-bar button{font:inherit;color:inherit;cursor:pointer}
.nf-bk{display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 8px;border:0;border-radius:9px;background:none;white-space:nowrap}
.nf-bk:hover{background:var(--hover)}.nf-bk b{font-size:14px}.nf-bk .pqi:first-child{color:var(--accent-ink)}.nf-bk .pqi:last-child{color:var(--muted)}
.nf-bsep{width:1px;height:24px;background:var(--border);flex:0 0 auto}
.nf-bml{font-size:12.5px;color:var(--muted);white-space:nowrap}
.nf-seg.sm button{min-height:40px;padding:0 10px;font-size:13px}
.nf-steps2{display:flex;align-items:center;gap:4px;margin:0;padding:0;list-style:none;flex:1;min-width:0}
.nf-steps2 li{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);white-space:nowrap}
.nf-steps2 li+li::before{content:'';width:14px;height:1px;background:var(--border);margin-right:2px}
.nf-steps2 li i{font-style:normal;width:22px;height:22px;border-radius:50%;border:1px solid var(--border);display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex:0 0 auto}
.nf-steps2 li.now{color:var(--text);font-weight:600}.nf-steps2 li.now i{background:var(--accent);border-color:var(--accent);color:var(--ed-on-accent,#fff)}
.nf-steps2 li.done i{background:var(--accent-soft);border-color:transparent;color:var(--accent-ink)}
.nf-tip{flex:1;font-size:13px;color:var(--muted);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nf-bgo{display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 14px;border:0;border-radius:10px;background:var(--btn-pri,var(--accent));color:var(--ed-on-pri,#fff)!important;font-size:14px;font-weight:700;white-space:nowrap}
.nf-bx{width:44px;height:44px;border:0;border-radius:9px;background:none;display:inline-flex;align-items:center;justify-content:center;color:var(--muted)}
.nf-mstep{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--text);white-space:nowrap}.nf-mstep i{font-style:normal;width:22px;height:22px;border-radius:50%;background:var(--accent);color:var(--ed-on-accent,#fff);display:inline-flex;align-items:center;justify-content:center;font-size:12px}
.nf-bar.m{min-height:56px;gap:8px}.nf-bar.m b{font-size:14px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nf-bar.m>.pqi{color:var(--accent-ink)}
.nf-sw{position:fixed;z-index:430;width:340px;max-height:min(560px,calc(100vh - 120px));overflow:auto;padding:6px;background:var(--panel);border:1px solid var(--border);border-radius:14px;box-shadow:0 16px 40px rgba(18,16,52,.22);font-family:var(--font-ui,system-ui);color:var(--text)}
.nf-swh{margin:6px 8px 8px;font-size:12.5px;line-height:1.55;color:var(--muted)}
.nf-swg{font-size:12px;font-weight:600;color:var(--muted);padding:6px 10px 2px}
.nf-swi{justify-content:flex-start;display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:0 10px;border:0;border-radius:9px;background:none;text-align:left;font:inherit;color:inherit;cursor:pointer}
.nf-swi:hover{background:var(--hover)}.nf-swi .pqi{color:var(--muted)}.nf-swi b{font-size:13.5px;font-weight:600;flex:1}
.nf-swi em{font-style:normal;font-size:11.5px;font-weight:600;padding:3px 6px;border-radius:6px;white-space:nowrap}
.nf-swi.m-rebuild em,.nf-swi.m-direct em{background:var(--accent-soft);color:var(--accent-ink)}.nf-swi.m-copy em{border:1px dashed var(--border);color:var(--muted)}
.nf-swi.m-no{opacity:.5;cursor:default}.nf-swi.m-same{background:var(--accent-soft);cursor:default}.nf-swi.m-same b,.nf-swi.m-same .pqi{color:var(--accent-ink)}.nf-swi.m-same em{color:var(--accent-ink)}
/* 启动台：开始一份谱 */
.nf-spd{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;width:min(880px,calc(100vw - 64px));font-family:var(--font-ui,system-ui);text-align:left}
.nf-spcol{display:flex;flex-direction:column;gap:8px}.nf-spcol button{flex:1;display:flex;align-items:center;justify-content:flex-start!important;gap:8px;padding:0 14px;border:1px solid var(--border);border-radius:12px;background:var(--panel);font:inherit;font-size:14px;font-weight:600;color:var(--text);cursor:pointer;min-height:44px}.nf-spcol .pqi{color:var(--muted)}
.nf-spc{display:flex;flex-direction:column;align-items:flex-start!important;justify-content:flex-start!important;gap:6px;min-height:118px;padding:16px;border:1px solid var(--border);border-radius:14px;background:var(--panel);color:var(--text);text-align:left;font:inherit;cursor:pointer}
.nf-spc:hover{border-color:color-mix(in srgb,var(--accent) 50%,var(--border))}
.nf-spc .pqi{color:var(--accent-ink);margin:0!important}.nf-spc b{font-size:15.5px}.nf-spc small{font-size:12.5px;color:var(--muted);line-height:1.5}
.nf-spc.pri{grid-column:span 2;background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 45%,transparent)}
.nf-spc.pri b{font-size:18px;color:var(--accent-ink)}
.nf-spchips{grid-column:1 / -1;display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:12.5px;color:var(--muted)}
.nf-spchips button{display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 12px;border:1px solid var(--border);border-radius:999px;background:var(--panel);font:inherit;font-size:13px;font-weight:600;color:var(--text);cursor:pointer}
.nf-spchips button .pqi{color:var(--muted)}
.nf-spgap{margin-left:auto}.nf-mobonly{display:none}
@media (max-width:820px){.nf-spd{grid-template-columns:1fr 1fr;width:calc(100vw - 32px);gap:10px}.nf-spc{min-height:104px;padding:14px}.nf-spc.pri{grid-column:1 / -1;min-height:96px}.nf-mobonly{display:flex}.nf-spchips{order:5}.nf-spgap{display:none}.nf-spchips>span:first-child{width:100%}}
.nf-dropmask{position:fixed;inset:0;z-index:450;background:rgba(91,76,240,.12);border:3px dashed var(--accent);display:flex;align-items:center;justify-content:center;font:700 20px var(--font-ui,system-ui);color:var(--accent-ink);pointer-events:none}
`;
})();
