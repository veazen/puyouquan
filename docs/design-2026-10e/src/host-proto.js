/* 宿主适配 · 独立原型（proto.html）：面板代码与注入真实编辑器的是同一份（nf-ui.js）；
   这里只把「预览 / 创建 / 导入」接到预渲染数据与实拍截图上：
   预览＝真实刻版引擎预先排好的 SVG（按 谱行×调×拍号×声部×乐器 查表；没预渲染的组合按同谱行默认调拍显示并注明）；
   落地＝真实编辑器注入实拍（热区可点：一键配伴奏 → 生成 → 换谱类；生成六线谱）。 */
(function () {
  'use strict';
  const D = window.PROTO; const ic = (k, s) => pqIcon(k, s || 20);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (k, o) => JSON.stringify([k, o.key, o.mode, o.beats, o.unit, o.nVox || 1, o.inst || '', o.clef || '', o.instKey || '', o.pen || '', o.lyr > 0]);
  const S = window.PS = { dev: 'desk', theme: 'light', mobileCreate: false, screen: 'start', last: null, shot: null };
  const frame = () => document.getElementById('frame');
  function toastP(m) { const t = document.getElementById('ptoast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastP.t); toastP.t = setTimeout(() => t.classList.remove('on'), 3200); }
  window.NF_HOST = {
    isMobile: () => S.dev === 'mob',
    mobileCreate: () => S.mobileCreate,
    toast: toastP,
    lastLoad: () => S.last, lastSave: o => { S.last = o; },
    preview(k, o) {
      let r = D.pv[norm(k, o)], approx = '';
      if (!r) {
        const keys = Object.keys(D.pv).map(x => [x, JSON.parse(x)]);
        const f = keys.find(([, a]) => a[0] === k && a[5] === (o.nVox || 1) && a[6] === (o.inst || '') && a[8] === (o.instKey || '') && a[9] === (o.pen || '') && a[3] === o.beats && a[4] === o.unit)
          || keys.find(([, a]) => a[0] === k && a[5] === (o.nVox || 1) && a[6] === (o.inst || '') && a[8] === (o.instKey || '') && a[9] === (o.pen || ''))
          || keys.find(([, a]) => a[0] === k);
        if (f) { r = D.pv[f[0]]; approx = '原型未预渲染此组合：按同谱行的默认调拍显示（实拍为现场刻版）'; }
      }
      if (!r) return { err: '原型未预渲染' };
      let svg = r.svg; if (o.title && o.title !== '未命名曲谱') svg = svg.replace('>小星星<', '>' + esc(o.title) + '<');
      return { svg, bands: r.bands, approx };
    },
    create(P) { landing(P); },
    copyLink(u) { try { navigator.clipboard.writeText(u).catch(() => {}); } catch (_) {} },
    recent: () => null,
    examples: () => D.ex.map(e => ({ i: e.i, name: e.name, ic: e.ic })),
    examplePreview: i => ({ svg: (D.ex[i] || {}).svg || '' }),
    exampleApply(i, mode) { showShot('E01', '已按示例格式新建（内容留空）：原型以空白谱落地示意'); },
    importPick() { toastP('原型里用示例文件演示：《送别（AI 转谱）》'); NF.importLoaded(impA()); },
    importDemo() { NF.importLoaded(impA()); },
    importKind: (a, t) => D.imp.kinds[t], importPreview: (a, t) => D.imp.pv[t],
    importApply(a, t) { showShot(t === 'acc' ? 'F17' : 'F13', '已导入为' + D.imp.kinds[t] + '《送别（AI转谱）》16 小节 · 新窗口打开，原谱保留'); },
  };
  const impA = () => Object.assign({}, D.imp, { song: null });

  /* ───── 实拍落地：截图 + 热区 ───── */
  const LANDING = { JG: 'F14', SG: 'F14', SJG: 'F14', CG: 'F14', JT: 'F19', SJ: 'E02', S: 'E03', C: 'E04', CJ: 'E04', CS: 'E04' };
  function landing(P) {
    if (S.dev === 'mob') { showShot('M08', '已新建' + P.kind.name + ' · 新窗口打开'); return; }
    const k = LANDING[P.stack] || 'E01';
    showShot(k, '已新建' + P.kind.name + ' · ' + (P.o.mode === 'minor' ? NF.MINOR[P.o.key] + ' 小调' : '1=' + NF.kl(P.o.key)) + ' ' + P.o.beats + '/' + P.o.unit + ' ♩=' + P.o.tempo + ' · 新窗口打开，原谱保留'
      + (LANDING[P.stack] ? '' : '（原型以同版式实拍示意）'));
  }
  const HOT = {   /* 截图名 → [热区, 目标截图, 说明] */
    F14: [['demo', 'F15', '演示：模拟录完《送别》旋律']], F15: [['go', 'F16', '一键配伴奏']], F16: [['go', 'F17', '生成（填进当前谱）']], F17: [['kind', 'F18', '换谱类 ▾']], F18: [['close', 'F17', '关闭菜单']],
    F19: [['go', 'F20', '生成六线谱']], F13: [['kind', null, '']], E01: [['kind', 'F21', '换谱类 ▾']], F21: [['close', 'E01', '']],
    F01: [], M01: [], M08: [],
  };
  function showShot(name, msg) {
    S.screen = 'shot'; S.shot = name; NF.close(true); render();
    if (msg) toastP(msg);
  }
  window.PROTO_SHOW = showShot;
  function shotURL(n) { const ks = Object.keys(D.shots).filter(k => k.split('-')[0] === n && k.endsWith('-' + S.theme)); const k = ks.find(x => x.includes(S.dev === 'mob' ? '-mob-' : '-desk-')) || ks[0]; return k ? D.shots[k] : ''; }
  function hotHTML(name) {
    const L = D.log[name] || {}; const out = [];
    (HOT[name] || []).forEach(([h, to, lab]) => {
      let r = L.hot && L.hot[h]; if (h === 'kind' && !r && name === 'E01') r = D.hot.blank && { x: D.hot.blank.kind[0], y: D.hot.blank.kind[1], w: D.hot.blank.kind[2], h: D.hot.blank.kind[3] };
      if (h === 'kind' && !r && name === 'F21') r = null;
      if (h === 'demo') r = { x: 300, y: 380, w: 520, h: 60 };
      if (h === 'close') r = { x: 0, y: 0, w: 1280, h: 800 };
      if (!r || !to) return;
      out.push(`<button class="hs${h === 'demo' ? ' demo' : ''}${h === 'close' ? ' cl' : ''}" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px" data-to="${to}" title="${esc(lab)}">${h === 'demo' ? esc(lab) + ' →' : ''}</button>`);
    });
    return out.join('');
  }
  /* 启动台：实拍 + 卡片热区 */
  function startHot() {
    const H = S.dev === 'mob' ? D.hot.mstart : D.hot.start; if (!H) return '';
    return Object.entries(H).map(([k, r]) => `<button class="hs" data-sp="${k}" style="left:${r[0]}px;top:${r[1]}px;width:${r[2]}px;height:${r[3]}px" title="${k}"></button>`).join('');
  }
  function editorHot() {
    const H = D.hot.editor; if (!H || S.dev === 'mob') return '';
    return `<button class="hs" data-ed="new" style="left:${H.new[0]}px;top:${H.new[1]}px;width:${H.new[2]}px;height:${H.new[3]}px" title="新建（Alt+N）"></button>
      <button class="hs" data-ed="dd" style="left:${H.dd[0]}px;top:${H.dd[1]}px;width:${H.dd[2]}px;height:${H.dd[3]}px" title="快速新建 ▾"></button>
      <button class="hs" data-ed="new" style="left:${H.add[0]}px;top:${H.add[1]}px;width:${H.add[2]}px;height:${H.add[3]}px" title="＋ 新建"></button>`;
  }
  function render() {
    const f = frame(); const mob = S.dev === 'mob';
    document.documentElement.setAttribute('data-theme', S.theme);
    f.className = mob ? 'mob' : 'desk';
    let bg = '', hs = '';
    if (S.screen === 'start') { bg = shotURL(mob ? 'M01' : 'F01'); hs = startHot(); }
    else if (S.screen === 'editor') { bg = shotURL(mob ? 'M01' : 'E00'); hs = editorHot(); }
    else if (S.screen === 'shot') { bg = shotURL(S.shot); hs = hotHTML(S.shot) + (S.shot.startsWith('M') ? '' : editorHot()); }
    f.querySelector('#bg').style.backgroundImage = bg ? `url(${bg})` : 'none';
    f.querySelector('#hot').innerHTML = hs;
    fit(); nav();
  }
  function fit() {
    const f = frame(), mob = S.dev === 'mob', W = mob ? 390 : 1280, H = mob ? 844 : 800;
    const aw = window.innerWidth - 32 - (window.innerWidth > 1100 ? 300 : 0), ah = window.innerHeight - 32;
    const k = Math.min(1, aw / W, ah / H);
    f.style.width = W + 'px'; f.style.height = H + 'px'; f.style.transform = `scale(${k})`;
    document.getElementById('wrap').style.width = Math.round(W * k) + 'px'; document.getElementById('wrap').style.height = Math.round(H * k) + 'px';
  }
  window.addEventListener('resize', fit);
  function openPanel(o) { S.screen = S.screen === 'start' ? 'start' : 'editor'; render(); NF.open(Object.assign({ mount: frame().querySelector('#mount'), onClose: () => { if (S.screen === 'shot') return; } }, o || {})); nav(); }
  window.PROTO_OPEN = openPanel;
  document.addEventListener('click', e => {
    const h = e.target.closest('#hot [data-to]'); if (h) { showShot(h.dataset.to); return; }
    const sp = e.target.closest('#hot [data-sp]'); if (sp) { const v = sp.dataset.sp;
      if (v === 'new') openPanel(); else if (v === 'imp') openPanel({ tab: 'import' }); else if (v === 'last') NF.quickCreate('last'); else if (v.startsWith('sc:')) openPanel({ scene: v.slice(3) });
      else toastP(v === 'open' ? '打开文件：沿用编辑器现有「打开」' : v === 'mine' ? '我的曲谱：沿用编辑器现有谱库' : '看示例：沿用编辑器现有谱库'); return; }
    const ed = e.target.closest('#hot [data-ed]'); if (ed) { if (ed.dataset.ed === 'dd') quick(); else { if (S.screen === 'shot') S.screen = 'editor'; openPanel(); } return; }
    const q = e.target.closest('.nf-qm [data-q]'); if (q) { const v = q.dataset.q; document.querySelector('.nf-qm').remove(); if (v === 'panel') openPanel(); else if (v === 'import') openPanel({ tab: 'import' }); else NF.quickCreate(v); return; }
    const nv = e.target.closest('#pnav [data-nav]'); if (nv) { navGo(nv.dataset.nav, nv.dataset.v); return; }
    if (!e.target.closest('.nf-qm') && document.querySelector('.nf-qm') && !e.target.closest('[data-ed="dd"]')) document.querySelector('.nf-qm').remove();
  });
  function quick() { const old = document.querySelector('.nf-qm'); if (old) { old.remove(); return; } const w = document.createElement('div'); w.innerHTML = NF.quickMenu(); const m = w.firstChild; frame().querySelector('#mount').appendChild(m); const H = D.hot.editor.dd; m.style.position = 'absolute'; m.style.left = Math.max(8, H[0] - 120) + 'px'; m.style.top = (H[1] + H[3] + 6) + 'px'; }
  document.addEventListener('keydown', e => { if (e.altKey && e.code === 'KeyN') { e.preventDefault(); if (e.shiftKey) NF.quickCreate('last'); else { if (S.screen === 'shot') S.screen = 'editor'; openPanel(); } } });

  /* ───── 演示导航 ───── */
  const JUMPS = [['start', '启动台'], ['panel', '新建面板（默认）'], ['panel:pacc', '钢琴即兴伴奏 · 考编'], ['panel:kids', '儿歌弹唱 · 师范'], ['panel:conflict', '谱行冲突与撤销'], ['import', '从已有音乐 · AI 转谱'], ['quick', '新建 ▾ 快捷菜单'],
    ['shot:F14', '落地：谱型条＋起步条'], ['shot:F15', '写完旋律 → 一键配伴奏'], ['shot:F17', '伴奏已填进当前谱'], ['shot:F18', '换谱类（有内容）'], ['shot:F21', '换谱类（空谱）'], ['shot:F20', '吉他弹唱：生成六线谱'], ['shot:F13', '导入为教学对照谱']];
  const MJUMPS = [['start', '手机启动台'], ['panel', '开始一份谱（列表）'], ['mdetail', '详情：儿歌弹唱'], ['msent', '发到电脑继续'], ['import', '从已有音乐'], ['shot:M08', '若开放手机新建：落地']];
  function nav() {
    const n = document.getElementById('pnav'); const mob = S.dev === 'mob';
    const P = NF.state && NF.root ? NF.planOf(NF.state) : null;
    n.innerHTML = `<h4>演示导航</h4>
      <div class="pg"><button data-nav="dev" data-v="desk" aria-pressed="${!mob}">电脑 1280</button><button data-nav="dev" data-v="mob" aria-pressed="${mob}">手机 390</button></div>
      <div class="pg"><button data-nav="theme" data-v="light" aria-pressed="${S.theme === 'light'}">浅色</button><button data-nav="theme" data-v="dark" aria-pressed="${S.theme === 'dark'}">深色</button></div>
      ${mob ? `<div class="pg"><button data-nav="mc" data-v="0" aria-pressed="${!S.mobileCreate}">发到电脑（现行）</button><button data-nav="mc" data-v="1" aria-pressed="${S.mobileCreate}">若开放手机新建</button></div>` : ''}
      <ol>${(mob ? MJUMPS : JUMPS).map(([k, t]) => `<li><button data-nav="go" data-v="${k}">${t}</button></li>`).join('')}</ol>
      ${P ? `<details open><summary>数据映射（当前面板）</summary><code>${esc(callText(P))}</code><p>谱行 ${P.stack} · 谱名「${esc(P.kind.name)}」· 零新增 song 字段</p></details>` : '<p class="tip">点画面里的按钮即可走流程；面板、谱行、预览、导入都可交互。</p>'}`;
  }
  function callText(P) { const s = NWB.STACKS[P.stack]; const o = Object.assign({}, P.o); delete o.pen; return 'NWB.build(\'' + P.stack + '\') → createSong(\'' + s.type + '\', ' + JSON.stringify(o).replace(/"(\w+)":/g, '$1:') + ')'; }
  window.PROTO_NAV = nav;
  setInterval(() => { const n = document.querySelector('#pnav details code'); if (n && NF.root && NF.state) { const t = callText(NF.planOf(NF.state)); if (n.textContent !== t) nav(); } else if (!NF.root && document.querySelector('#pnav details')) nav(); }, 600);
  function navGo(a, v) {
    if (a === 'dev') { S.dev = v; NF.close(true); S.screen = 'start'; render(); return; }
    if (a === 'theme') { S.theme = v; const was = NF.root ? NF.state : null; render(); if (was) NF.draw(); return; }
    if (a === 'mc') { S.mobileCreate = v === '1'; if (NF.root) NF.draw(); nav(); return; }
    NF.close(true); const m = document.querySelector('.nf-qm'); if (m) m.remove();
    if (v === 'start') { S.screen = 'start'; render(); }
    else if (v === 'panel') { S.screen = 'editor'; openPanel(); }
    else if (v.startsWith('panel:')) { const x = v.slice(6); S.screen = 'editor'; if (x === 'conflict') { openPanel({ scene: 'gtr' }); NF.toggleRow('G'); } else openPanel({ scene: x, vals: x === 'pacc' ? { title: '送别' } : {} }); }
    else if (v === 'import') { S.screen = 'editor'; openPanel({ tab: 'import' }); }
    else if (v === 'quick') { S.screen = 'editor'; render(); quick(); }
    else if (v === 'mdetail') { S.screen = 'start'; render(); NF.open({ mount: frame().querySelector('#mount'), scene: 'kids', mob: 'detail' }); nav(); }
    else if (v === 'msent') { S.screen = 'start'; render(); NF.open({ mount: frame().querySelector('#mount'), scene: 'kids', mob: 'detail' }); document.querySelector('[data-act="send"]') && document.querySelector('[data-act="send"]').click(); nav(); }
    else if (v.startsWith('shot:')) showShot(v.slice(5));
  }
  /* 深链：#s=panel:pacc&dev=mob&theme=dark（截图与评审直达） */
  function boot() {
    const h = new URLSearchParams(location.hash.slice(1));
    S.dev = h.get('dev') === 'mob' ? 'mob' : 'desk'; S.theme = h.get('theme') === 'dark' ? 'dark' : 'light'; S.mobileCreate = h.get('mc') === '1';
    render(); const s = h.get('s'); if (s && s !== 'start') navGo('go', s);
  }
  window.PROTO_BOOT = boot;
  window.addEventListener('hashchange', () => { NF.close(true); boot(); });
})();
