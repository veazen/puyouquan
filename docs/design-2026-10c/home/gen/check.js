// 几何 / 字体 / 重叠检查
const { chromium } = require('playwright'); const D = __dirname + '/../';
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [w, h] of [[1440, 900], [390, 844], [1024, 800]]) {
    const pg = await b.newPage({ viewport: { width: w, height: h } });
    await pg.goto('file://' + D + 'home.html'); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(500);
    const cdp = await pg.context().newCDPSession(pg); await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
    const fonts = {}; const walk = async n => { if (n.nodeType === 1 && n.nodeName !== 'SCRIPT' && n.nodeName !== 'STYLE' && n.nodeName !== 'svg') {
        if ((n.children || []).some(c => c.nodeType === 3 && c.nodeValue.trim())) { try { const r = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: n.nodeId }); r.fonts.forEach(f => { fonts[f.familyName + (f.isCustomFont ? '' : ' [SYSTEM]')] = (fonts[f.familyName + (f.isCustomFont ? '' : ' [SYSTEM]')] || 0) + f.glyphCount; }); } catch (e) {} } }
      for (const c of n.children || []) await walk(c); };
    await walk(root);
    const res = await pg.evaluate(() => {
      const els = [...document.querySelectorAll('body *')].filter(e => { if (['SCRIPT','STYLE','svg','use','path','symbol','defs'].includes(e.tagName)) return false; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false; return [...e.childNodes].some(c => c.nodeType === 3 && c.textContent.trim()) || e.tagName === 'IMG' || e.tagName === 'INPUT'; });
      const R = els.map(e => { const r = e.getBoundingClientRect(); return { e, l: r.left, t: r.top + scrollY, r: r.right, b: r.bottom + scrollY }; }).filter(o => o.r - o.l > 0 && o.b - o.t > 0);
      const ov = []; for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i], c = R[j]; if (a.e.contains(c.e) || c.e.contains(a.e)) continue;
        // 横向滚动容器内的溢出不算
        const ix = Math.min(a.r, c.r) - Math.max(a.l, c.l), iy = Math.min(a.b, c.b) - Math.max(a.t, c.t); if (ix > 1 && iy > 1) ov.push([a.e.tagName + '.' + a.e.className + ':' + (a.e.textContent || a.e.alt || '').trim().slice(0, 12), c.e.tagName + '.' + c.e.className + ':' + (c.e.textContent || c.e.alt || '').trim().slice(0, 12), Math.round(ix), Math.round(iy)]); }
      // 最小字号
      const sizes = {}; els.forEach(e => { const fs = getComputedStyle(e).fontSize; sizes[fs] = (sizes[fs] || 0) + 1; });
      // 颜色清单（文本/背景/边框）
      const cols = {}; [...document.querySelectorAll('body *')].forEach(e => { const cs = getComputedStyle(e); ['color', 'backgroundColor', 'borderTopColor'].forEach(k => { const v = cs[k]; if (v && v !== 'rgba(0, 0, 0, 0)' && !(k === 'borderTopColor' && cs.borderTopWidth === '0px')) cols[v] = (cols[v] || 0) + 1; }); });
      return { sw: document.documentElement.scrollWidth, ov, sizes, cols };
    });
    console.log('== ' + w, 'scrollWidth', res.sw); console.log('fonts', JSON.stringify(fonts)); console.log('sizes', JSON.stringify(res.sizes));
    console.log('overlaps', res.ov.length, JSON.stringify(res.ov.slice(0, 20)));
    if (w === 1440) console.log('colors', JSON.stringify(res.cols));
    await pg.close(); }
  await b.close(); })();
