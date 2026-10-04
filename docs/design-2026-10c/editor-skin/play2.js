(async () => {
  await new Promise(r => setTimeout(r, 300));
  blurSel = true; selRange = null; render();
  await new Promise(r => setTimeout(r, 300));
  const mi = 5, mb = meaBoxes[mi], band = meaBands[mi];
  const ph = document.getElementById('playhead'), pl = document.getElementById('playline');
  ph.setAttribute('x', mb.x); ph.setAttribute('y', band.y); ph.setAttribute('width', mb.w); ph.setAttribute('height', band.h); ph.setAttribute('opacity', '0.12');
  const x = mb.x + mb.w * 0.42; pl.setAttribute('x1', x); pl.setAttribute('x2', x); pl.setAttribute('y1', band.y + 4); pl.setAttribute('y2', band.y + band.h - 4); pl.setAttribute('opacity', '0.9');
  return 'ok';
})()
