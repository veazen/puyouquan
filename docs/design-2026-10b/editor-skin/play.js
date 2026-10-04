(async () => {
  document.body.classList.add('v3-play'); document.getElementById('b-play').classList.add('v3-on');
  await new Promise(r => setTimeout(r, 900));
  blurSel = true; selRange = null; render();
  await new Promise(r => setTimeout(r, 300));
  const mi = +(window.V3_MI || 5), mb = meaBoxes[mi], band = meaBands[mi];
  const ph = document.getElementById('playhead'), pl = document.getElementById('playline');
  ph.setAttribute('x', mb.x); ph.setAttribute('y', band.y); ph.setAttribute('width', mb.w); ph.setAttribute('height', band.h); ph.setAttribute('opacity', '0.12');
  const x = mb.x + mb.w * 0.42; pl.setAttribute('x1', x); pl.setAttribute('x2', x); pl.setAttribute('y1', band.y + 4); pl.setAttribute('y2', band.y + band.h - 4); pl.setAttribute('opacity', '0.9');
  document.querySelectorAll('.mxc').forEach((c, i) => { if (i < mi) c.classList.add('done'); if (i === mi) c.classList.add('cur'); });
  const t = document.createElement('div'); t.className = 'v3-exit'; t.innerHTML = '<b>' + song.title + '</b><span>第 ' + (mi + 1) + ' / ' + song.measures.length + ' 小节</span><kbd>Esc 退出演奏</kbd>'; document.body.append(t);
  const sv = document.getElementById('score'), r = sv.getBoundingClientRect();
  document.getElementById('score-wrap').scrollTop = Math.max(0, band.y * (r.height / sv.viewBox.baseVal.height) - 200);
  return document.getElementById('playhead').getAttribute('opacity');
})()
