(() => {
  const $ = s => document.querySelector(s), mk = h => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
  const ic = d => `<svg class="v4-ic" viewBox="0 0 24 24">${d}</svg>`;
  const I = {
    side: ic('<rect x="3" y="4.5" width="18" height="15" rx="3"/><path d="M9 4.5v15"/>'),
    insp: ic('<rect x="3" y="4.5" width="18" height="15" rx="3"/><path d="M15 4.5v15"/>'),
    undo: ic('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
    redo: ic('<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
    back: ic('<path d="M6 5v14"/><path d="M19 5 9 12l10 7z" fill="currentColor" stroke="none"/>'),
    play: ic('<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>'),
    pause: ic('<rect x="6.5" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.9" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none"/>'),
    loop: ic('<path d="M17 2.5 20.5 6 17 9.5"/><path d="M3.5 11.5V10a4 4 0 0 1 4-4h13"/><path d="m7 21.5-3.5-3.5L7 14.5"/><path d="M20.5 12.5V14a4 4 0 0 1-4 4h-13"/>'),
    metro: ic('<path d="M9 3h6l3.5 18h-13z"/><path d="m12 15 5-8"/>'),
    spark: ic('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
    chev: '<svg class="v4-ch" viewBox="0 0 12 12"><path d="m3 4.5 3 3 3-3"/></svg>',
  };
  const playing = !!window.V4_PLAY;
  const mb = $('#top .main-bar'); const logo = mb.querySelector('.logo');
  [...mb.children].forEach(c => { if (c !== logo) c.style.display = 'none'; });
  logo.innerHTML = '<span class="mark"></span>';
  let ttl = '未命名'; try { ttl = song.title; } catch (e) {}
  mb.append(mk(`<span class="v4-l"><button class="v4-b" title="侧栏">${I.side}</button><span class="v4-doc"><b>${ttl}</b>${I.chev}</span><span class="v4-save">已存本机</span></span>`));
  const lcd = window.V4_LCD || ['1 . 1', '♩ = 92', '1 = C', '4/4'];
  mb.append(mk(`<span class="v4-c"><span class="v4-tr"><button class="v4-b">${I.back}</button><button class="v4-b v4-play">${playing ? I.pause : I.play}</button><button class="v4-b">${I.loop}</button><button class="v4-b">${I.metro}</button></span><span class="v4-lcd"><span class="pos">${lcd[0]}</span><i></i><span>${lcd[1]}</span><i></i><span>${lcd[2]}</span><i></i><span>${lcd[3]}</span></span></span>`));
  mb.append(mk(`<span class="v4-r"><button class="v4-b">${I.undo}</button><button class="v4-b">${I.redo}</button><span class="v4-sep"></span><button class="v4-b v4-txt">${I.spark}<span>智能</span>${I.chev}</button><button class="v4-cta">导出</button><button class="v4-b on">${I.insp}</button><span class="v4-av">谱</span></span>`));
  // 上下文条
  const eb = $('#editbar');
  const keep = (id) => { const u = document.getElementById(id); if (u) u.classList.add('v3-keep'); return u; };
  const un = keep('ebu-eb-note'), ud = keep('ebu-eb-dur'), ue = keep('ebu-eb-edit');
  eb.prepend(mk(`<span class="v4-trk">${window.V4_TRK || '吉他 1'}${I.chev}</span>`));
  if (un && ud) { eb.querySelector('.v4-trk').after(un); un.after(mk('<span class="v4-vsep"></span>')); un.nextSibling.after(ud); ud.after(mk('<span class="v4-vsep"></span>')); }
  if (ue) { ud.nextSibling.after(ue); [...ue.querySelectorAll('.eb')].forEach((b, i) => { if (i > 3) b.style.display = 'none'; }); }
  eb.append(mk('<span class="v4-more">»</span>'));
  [...document.querySelectorAll('#eb-fret-more,#eb-mute-n')].forEach(b => b.style.display = 'none');
  // 检查器（Pages 式，宽 280）
  const tech = window.V4_TECH || ['击弦 h', '勾弦 p', '滑音', '推弦', '揉弦', '闷音', '泛音', '扫弦'];
  const body = window.V4_INSP || `
    <div class="v4-sec"><h5>音符</h5>
      <div class="v4-row"><label>时值</label><span class="v4-seg sm"><span>♩</span><span class="on">♪</span><span>♬</span><span>附点</span></span></div>
      <div class="v4-row"><label>品位</label><span class="v4-step"><b>−</b><span>3</span><b>＋</b></span></div>
      <div class="v4-row"><label>弦</label><span class="v4-pop">5 弦${I.chev}</span></div></div>
    <div class="v4-sec"><h5>技巧</h5><div class="v4-grid">${tech.map((t, i) => `<span class="${i === 2 ? 'on' : ''}">${t}</span>`).join('')}</div></div>
    <div class="v4-sec"><h5>和弦</h5><div class="v4-row"><label>C 大三和弦</label><a class="v4-link">更换…</a></div>
      <div class="v4-row"><label>和弦图</label><span class="v4-tg on"><i></i></span></div></div>
    <div class="v4-sec"><h5>第 1 小节</h5><div class="v4-row"><label>拍号</label><span class="v4-pop">4/4${I.chev}</span></div>
      <div class="v4-row"><label>反复记号</label><span class="v4-tg"><i></i></span></div></div>
    <div class="v4-wash"><b>一键配伴奏</b><p>选一套织体，自动生成可改的双手伴奏。</p><a class="v4-link">打开配伴奏 ›</a></div>`;
  document.body.append(mk(`<aside class="v4-insp"><span class="v4-seg full"><span class="on">格式</span><span>创作</span><span>曲谱</span></span>${body}</aside>`));
  window.dispatchEvent(new Event('resize')); render();
})()
