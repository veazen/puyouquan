(() => {
  const $ = s => document.querySelector(s), mk = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
  const I = {
    undo: '<svg class="v3-ic" viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>',
    redo: '<svg class="v3-ic" viewBox="0 0 24 24"><path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/></svg>',
    menu: '<svg class="v3-ic" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    chord: '<svg class="v3-ic" viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9.7 3v18M14.3 3v18M5 8h14M5 13h14"/><circle cx="12" cy="10.5" r="1.4" fill="currentColor"/></svg>',
    acc: '<svg class="v3-ic" viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h16M4 18h16"/><path d="M8 18V7M14 14V5"/></svg>',
    check: '<svg class="v3-ic" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    trans: '<svg class="v3-ic" viewBox="0 0 24 24"><path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/></svg>',
    panel: '<svg class="v3-ic" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M15 4v16"/></svg>',
  };
  const mb = $('#top .main-bar'); const logo = mb.querySelector('.logo');
  [...mb.children].forEach(c => { if (c !== logo) c.style.display = 'none'; });
  let ttl = '未命名'; try { ttl = song.title; } catch (e) {}
  logo.innerHTML = '<span class="mark"></span><span class="nm">谱友圈</span>';
  mb.append(mk(`<span class="v3-doc"><b>${ttl}</b><span class="v3-more">${window.V3_DOC || '吉他弹唱谱 · 15 小节'}</span></span>`));
  mb.append(mk('<span style="flex:1"></span>'));
  mb.append(mk('<span class="v3-save"><i></i>已存本机</span>'));
  mb.append(mk('<span class="v3-sep"></span>'));
  mb.append(mk(`<button title="撤销" style="width:34px">${I.undo}</button>`)); mb.append(mk(`<button title="重做" style="width:34px">${I.redo}</button>`));
  mb.append(mk('<span class="v3-sep"></span>'));
  mb.append(mk('<span class="v3-seg"><span class="on">编辑</span><span>演奏</span></span>'));
  mb.append(mk('<button class="v3-cta">导出</button>'));
  mb.append(mk('<span class="v3-av">谱</span>'));
  mb.append(mk(`<button style="width:34px">${I.menu}</button>`));
  // 上下文条：保留品位 + 时值 + 编辑三组（各加标签）
  const keep = (id, lab) => { const u = document.getElementById(id); if (!u) return; u.classList.add('v3-keep'); const g = u.querySelector('.eb-grp'); if (g && lab) g.before(mk(`<span class="v3-lab">${lab}</span>`)); };
  keep('ebu-eb-note', '品位'); keep('ebu-eb-dur', '时值'); keep('ebu-eb-edit', '编辑');
  const eb = $('#editbar'); const ue = $('#ebu-eb-edit'), un = $('#ebu-eb-note'), ud = $('#ebu-eb-dur');
  if (ue && un && ud) { eb.prepend(ue); eb.prepend(mk('<span class="v3-vsep" style="order:0;display:none"></span>')); eb.prepend(ud); eb.prepend(un);
    un.after(mk('<span class="v3-vsep"></span>')); ud.after(mk('<span class="v3-vsep"></span>')); }
  // 编辑组只留 4 个常用 + 更多
  [...(ue ? ue.querySelectorAll('.eb') : [])].forEach((b, i) => { if (i > 3) b.style.display = 'none'; });
  if (ue) ue.querySelector('.eb-grp').append(mk('<button class="eb" style="min-width:56px">更多 ▾</button>'));
  [...(un ? un.querySelectorAll('#eb-fret-more') : [])].forEach(b => b.style.display = 'none');
  // 右侧：整谱四动作 + 检查器开关
  document.body.append(mk(`<div class="v3-insp"><button title="配和弦">${I.chord}</button><button title="配伴奏">${I.acc}</button><button title="节拍检查">${I.check}</button><button title="移调">${I.trans}</button><span style="height:1px;background:#e6e6e6;margin:4px 6px"></span><button title="检查器">${I.panel}</button></div>`));
  // 缩放到 125%
  const zt = window.V3_ZOOM || 100; for (let i = 0; i < 8 && parseInt($('#zoom-lbl').textContent) < zt; i++) $('#z-in').click();
  window.dispatchEvent(new Event('resize')); render();
})()
