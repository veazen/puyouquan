(async () => {
  const m = document.querySelector('#mixer-dock .mx-bar'); const mode = window.V4_M || 'a';
  const play = '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z"/></svg>', pause = '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  const d = document.createElement('div'); d.className = 'v4-mini';
  d.innerHTML = `<span class="pb">${mode === 'b' ? pause : play}</span><span class="t"><b>${mode === 'b' ? '' : song.title}</b><span>${mode === 'b' ? '7 / 16 小节' : '第 1 / 16 小节 · ♩ = 66'}</span></span><span class="ib back"><svg viewBox="0 0 24 24"><path d="M6 5v14"/><path d="M19 5 9 12l10 7z"/></svg></span><span class="ib more"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg></span><span class="pg"><i style="--p:${mode === 'b' ? '42%' : '3%'}"></i></span>`;
  m.append(d);
  if (mode === 'b') {
    document.body.classList.add('v4-small');
    await new Promise(r => setTimeout(r, 300));
    const mi = 6, mb = meaBoxes[mi], band = meaBands[mi];
    const ph = document.getElementById('playhead'), pl = document.getElementById('playline');
    ph.setAttribute('x', mb.x); ph.setAttribute('y', band.y); ph.setAttribute('width', mb.w); ph.setAttribute('height', band.h); ph.setAttribute('opacity', '0.12');
    const x = mb.x + mb.w * 0.3; pl.setAttribute('x1', x); pl.setAttribute('x2', x); pl.setAttribute('y1', band.y + 4); pl.setAttribute('y2', band.y + band.h - 4); pl.setAttribute('opacity', '0.9');
    const sv = document.getElementById('score'), r = sv.getBoundingClientRect(); window.scrollTo(0, band.y * (r.height / sv.viewBox.baseVal.height) - 260);
  }
  if (mode === 'c') {
    const s = document.createElement('div'); s.className = 'v4-sheet';
    s.innerHTML = `<div class="h"></div><div class="hd"><b>播放设置</b><a>完成</a></div>
      <div class="r"><label>速度</label><span class="sl"><span class="tr"><i></i><b></b></span>♩ = 66</span></div>
      <div class="r"><label>变调</label><span class="st"><b>−</b><span>C 调</span><b>＋</b></span></div>
      <div class="r"><label>倍速</label><span class="sg"><span>0.75×</span><span class="on">1×</span><span>1.25×</span></span></div>
      <div class="r"><label>节拍器</label><span class="tg on"><i></i></span></div>
      <div class="r"><label>循环第 5–8 小节</label><span class="tg"><i></i></span></div>`;
    document.body.append(s);
  }
  return mode;
})()
