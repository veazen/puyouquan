/* v60.95 页头出版级改版 + 信息弹窗修正（产品指示）：
   - 词曲/制谱列右对齐、首行与左侧 1=X 信息行同基线（歌本惯例）、行距 18、标签弱化墨色
   - 版面自动让位：top 按词曲块高度取大——首行系统（含行内和弦图带）不再与词曲信息相撞
   - 词曲列可点开曲谱信息弹窗（meta 热区）
   - 曲谱信息弹窗「弱起小节」提示不再被 56px 标签列宽压成竖排（用户报障「乱码」） */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 页头几何：词曲首行与 1=X 同基线；行距 18；首行系统在词曲列底部之下（不再压和弦图）
  let r = await pg.evaluate(() => { try {
    const V = (deg, dur) => ({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false });
    const s = createSong('tanchang', { title: '页头演示', beats: 4, unit: 4, key: 'G', nMea: 2, nTab: 1, nVox: 1, lyr: 0 });
    s.singer = '演示歌手'; s.lyricist = '词甲'; s.composer = '曲乙'; s.maker = '谱友圈'; s.capo = 1;
    for (let mi = 0; mi < 2; mi++) {
      s.measures[mi].voxes[0] = [V(1, 4), V(2, 4), V(3, 4), V(5, 4)];
      s.measures[mi].tabs[0][0].chord = mi ? 'D' : 'Em';
    }
    loadSong(s); blurSel = true; render();
    const h = document.getElementById('score').innerHTML;
    const cred = [...h.matchAll(/<text x="[\d.]+" y="([\d.]+)"[^>]*text-anchor="end"[^>]*><tspan fill="var\(--muted\)">(作词：|作曲：|制谱：)<\/tspan>/g)]
      .map(m => ({ y: +m[1], k: m[2] }));
    const keyM = h.match(/<text x="[\d.]+" y="([\d.]+)"[^>]*>1=/);
    const keyY = keyM ? +keyM[1] : -1;
    const ys = cred.map(c => c.y).sort((a, b3) => a - b3);
    const gap18 = ys.length === 3 && Math.abs(ys[1] - ys[0] - 18) < 0.5 && Math.abs(ys[2] - ys[1] - 18) < 0.5;
    const sysTop = meaBands[0] ? meaBands[0].y : -1;
    return { n: cred.length, sameBase: Math.abs(ys[0] - keyY) < 0.5, gap18,
      below: sysTop > ys[2] + 4, keyY, ys, sysTop };
  } catch (e) { return { err: String(e && e.message || e) }; } });
  T(r.n === 3 && r.sameBase && r.gap18 && r.below, 'T1 词曲列同基线/18行距/系统让位', JSON.stringify(r));

  // T2 无词曲信息时版面不变（存量谱零回归）：有无词曲的系统起点差＝词曲块增量 50
  r = await pg.evaluate(() => {
    const build = (withCred) => {
      const s = createSong('tanchang', { title: 't2', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 1, lyr: 0 });
      s.singer = '歌手';
      if (withCred) { s.lyricist = 'a'; s.composer = 'b'; s.maker = 'c'; }
      loadSong(s); blurSel = true; render();
      return meaBands[0].y;
    };
    const yW = build(true), y0 = build(false);
    return { delta: +(yW - y0).toFixed(1) };
  });
  T(r.delta === 50, 'T2 词曲块让位增量=50、无词曲不变', JSON.stringify(r));

  // T3 词曲列 meta 热区可点开曲谱信息弹窗；弹窗「弱起小节」提示横排不压缩（fnote 类）
  r = await pg.evaluate(() => { try {
    const s = createSong('tanchang', { title: 't3', beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 1, lyr: 0 });
    s.lyricist = '词'; s.composer = '曲';
    loadSong(s); blurSel = true; render();
    const zs = [...document.querySelectorAll('#score [data-hd="meta"]')];
    const credZone = zs.length >= 2;
    zs[zs.length - 1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const note = document.querySelector('.modal label.f .fnote');
    const wOk = note && note.getBoundingClientRect().width > 150;   // 旧样式被压到 56px 竖排
    const pickup = !!document.getElementById('mm-pickup');
    closeModal();
    return { credZone, pickup, wOk, w: note ? Math.round(note.getBoundingClientRect().width) : -1 };
  } catch (e) { try { closeModal(); } catch (_) {} return { err: String(e && e.message || e) }; } });
  T(r.credZone && r.pickup && r.wOk, 'T3 词曲热区开弹窗+弱起提示横排', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
