// 用法：node render.js jobs.json   每个 job: {name, vw, dpr, preset, fn (string, s=>...), arrange:{pure}, play:{mi, frac}}
const { chromium } = require('playwright'); const fs = require('fs');
const jobs = JSON.parse(fs.readFileSync(process.argv[2]));
const OUT = __dirname + '/raw/'; fs.mkdirSync(OUT, { recursive: true });
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const j of jobs) {
    const pg = await b.newPage({ viewport: { width: j.vw, height: j.vh || 1400 }, deviceScaleFactor: j.dpr || 3 });
    await pg.goto('file:///home/user/puyouquan/muse-tab/index.html'); await pg.waitForTimeout(1000);
    await pg.addStyleTag({ content: ':root,:root[data-theme]{--paper:#ffffff!important} #paper,#score{background:#fff!important;box-shadow:none!important} #paper{--accent:#3e6ae1} #score .pagebg{stroke:none!important} #score #playhead{fill:#000!important;opacity:.07!important} #score #playline{stroke:#3e6ae1!important}' });
    const info = await pg.evaluate((j) => {
      guardReplace = p => p(); toast = () => {}; try{hideStartPad();}catch(e){}
      let s = PRESETS[j.preset].make();
      if (j.fn) (0, eval)('(' + j.fn + ')')(s);
      if (j.arrange) { const o = song; song = s; const r = arrangeAccompaniment(s, j.arrange); s = r.song; song = o; if (j.title) s.title = j.title; }
      if (j.fn2) (0, eval)('(' + j.fn2 + ')')(s);
      loadSong(s); cleanSnapSave(); try{ blurSel = true; selRange = null; }catch(e){} render();
      const sv = document.getElementById('score'), vb = sv.viewBox.baseVal, r = sv.getBoundingClientRect(), k = r.width / vb.width;
      if (j.play) { const mb = meaBoxes[j.play.mi], band = meaBands[j.play.mi];
        const ph = document.getElementById('playhead'), pl = document.getElementById('playline');
        ph.setAttribute('x', mb.x); ph.setAttribute('y', band.y); ph.setAttribute('width', mb.w); ph.setAttribute('height', band.h); ph.setAttribute('opacity', '1');
        const x = mb.x + mb.w * (j.play.frac || 0.45); pl.setAttribute('x1', x); pl.setAttribute('x2', x); pl.setAttribute('y1', band.y + 2); pl.setAttribute('y2', band.y + band.h - 2); pl.setAttribute('opacity', '1'); }
      const els = [...sv.querySelectorAll('text,path,line,rect,circle,ellipse,polygon,polyline,use,image')].filter(e => !e.closest('#playhead') && e.id !== 'playhead' && e.id !== 'playline').map(e => { const q = e.getBoundingClientRect(); const cs = getComputedStyle(e);
          if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return null;
          if (e.tagName === 'rect') { const f = cs.fill, st = cs.stroke; if ((f === 'none' || f === 'rgba(0, 0, 0, 0)' || f === 'rgb(255, 255, 255)') && (st === 'none' || st === 'rgba(0, 0, 0, 0)')) return null; if (+cs.fillOpacity === 0 && (st==='none')) return null; }
          return [(q.left - r.left) / k, (q.top - r.top) / k, (q.right - r.left) / k, (q.bottom - r.top) / k, e.tagName]; })
        .filter(q => q && (q[2] - q[0] > .2 || q[3] - q[1] > .2) && !((q[2] - q[0]) > vb.width * .9 && (q[3] - q[1]) > vb.height * .3));
      return { x: r.left, y: r.top, w: r.width, h: r.height, k, vbw: vb.width, vbh: vb.height, PAGE_W, MARGIN, title: song.title, bands: meaBands, boxes: meaBoxes, els, nm: song.measures.length };
    }, j);
    const h = Math.min(info.h, j.maxH ? j.maxH * info.k : info.h);
    if (info.y + h + 4 > (j.vh || 1400)) console.log('WARN viewport too short for', j.name, info.y + h);
    await pg.screenshot({ path: OUT + j.name + '.png', clip: { x: info.x, y: info.y, width: info.w, height: h } });
    info.dpr = j.dpr || 3; info.capH = h;
    fs.writeFileSync(OUT + j.name + '.json', JSON.stringify(info));
    const sys = {}; for (const [mi, bd] of Object.entries(info.bands)) { const key = Math.round(bd.y); (sys[key] = sys[key] || []).push(+mi); }
    console.log(j.name, 'PAGE_W', info.PAGE_W, 'k', info.k.toFixed(3), 'vb', Math.round(info.vbw) + 'x' + Math.round(info.vbh), 'title', info.title, 'systems', JSON.stringify(Object.entries(sys).map(([y, ms]) => [+y, ms[0], ms[ms.length - 1], Math.round(info.bands[ms[0]].h)])));
    await pg.close();
  }
  await b.close(); })();
