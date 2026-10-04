(async () => {
  document.body.classList.add('v3-mplay');
  const t = document.createElement('div'); t.className = 'v3-prog'; t.innerHTML = '<i></i>'; document.body.append(t);
  await new Promise(r => setTimeout(r, 400));
  const mi = 6, mb = meaBoxes[mi], band = meaBands[mi];
  const ph = document.getElementById('playhead'), pl = document.getElementById('playline');
  ph.setAttribute('x', mb.x); ph.setAttribute('y', band.y); ph.setAttribute('width', mb.w); ph.setAttribute('height', band.h); ph.setAttribute('opacity', '0.12');
  const x = mb.x + mb.w * 0.3; pl.setAttribute('x1', x); pl.setAttribute('x2', x); pl.setAttribute('y1', band.y + 4); pl.setAttribute('y2', band.y + band.h - 4); pl.setAttribute('opacity', '0.9');
  const sv = document.getElementById('score'), r = sv.getBoundingClientRect();
  window.scrollTo(0, band.y * (r.height / sv.viewBox.baseVal.height) - 260);
  return 'ok';
})()
