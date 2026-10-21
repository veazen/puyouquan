/* v60.44 旋律轨→吉他把位轨回归（音轨化 P3：手稿「换谱自动映射＋把位选择推荐」）：
   T1 入口谱类显隐：歌谱「六」灯可见；钢琴谱隐藏；＋音轨选择器含「从旋律生成把位」
      （v68.2 默认新外壳：音轨树「由此生成六线谱轨…」+ 加轨菜单生成项，真实点击；旧外壳原断言移到 ?shell=classic 页 T1c）
   T2 低把位：C 大调音阶映射后逐音音高等价（tun[s-1]+capo+f === voxMidi）、时值/连音线复制、
      新轨列数与旋律逐小节一致、低把位品位 ≤8
   T3 中把位：同旋律全部品位 ≥4（虚拟 capo 禁空弦）、逐音等价、零折八度
   T4 跟随和弦图直取实证：B3+Bm——follow 取 Bm 指法上的 3弦4品，low 档取 2弦空弦，
      两档不同=「跟随和弦图」真的在跟图（非同解巧合）
   T5 原轨零损 + 一步撤销：旋律列 JSON 前后逐字相等；undo() 一步回到生成前
   T6 统计如实：超低音旋律折八度计数上报且实装音高=折后音高
   对 v60.43 旧文件跑：无 mapVoxToTab/nl-voxtab → 当场红（突变实证）。file:// 直载。 */
const { chromium } = require('playwright');
const path = require('path');
const F = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });

  const base = { beats: 4, unit: 4, key: 'C', tempo: 90, nMea: 2, singer: '', lyricist: '', composer: '', maker: '', capo: 0 };

  /* T1 入口谱类显隐 + ＋音轨选择器入口
     v68.2 默认外壳＝新外壳：旧左栏面板（#nl-voxtab「六」灯所在）整体隐藏，同一入口搬到
       ① 音轨树当前旋律轨下的动作行「由此生成六线谱轨…」[data-fa="tree:gentab"]（canGen＝!lockOf(dt)&&dt!=='func'，与 #nl-voxtab 的
          piano/pianoacc/chord/func 隐藏同一规则，L10773 vs L25390）；
       ② 音轨区「＋」加轨菜单「由「旋律」生成六线谱轨…」[data-fa="tree:gen"]（＝旧「＋ 音轨」弹窗的 #ta-map）。
     T1 改为在默认外壳真实点击这两个入口（可见 + 点开就是 showVoxTabMenu 的把位弹窗），钢琴谱两处都不给；
     旧外壳原断言（#nl-voxtab 可见性 + #ta-map）原样移到 ?shell=classic 页面 T1c。 */
  const clickVis = async (sel) => { const loc = pg.locator(sel).first(); if (!(await loc.count()) || !(await loc.isVisible())) return false;
    await loc.click({ timeout: 3000 }); await pg.waitForTimeout(120); return true; };
  await pg.evaluate((base2) => {
    loadSong(createSong('vocal', Object.assign({ nVox: 1, lyr: 0 }, base2)));
    song.measures[0].voxes[0][0].deg = 1; render(); setRibbon('vox'); render();
  }, base);
  const flowOn = await pg.evaluate(() => document.body.classList.contains('flow'));
  /* v68.7 S1 迁移（README ③合并表，规格 B3）：音轨树「由此生成六线谱轨…」子行撤掉 → 断言它不在了，同一功能走 ＋加轨 ›「由「旋律」生成六线谱轨…」[data-fa="tree:gen"]
     （同一 showVoxTabMenu 把位弹窗，「低把位 / 中把位」两项照断言）。修前红修后绿：改前子行还在（noRow 为假） */
  const noRow = await pg.evaluate(() => { FLOW.tree.sync(); return !document.querySelector('#flw-left [data-fa="tree:gentab"]'); });
  const addClick = await clickVis('#flw-left [data-fa="tree:add"]');
  const addGen = await pg.evaluate(() => { const it = document.querySelector('#popmenu [data-fa="tree:gen"]');
    const ok = !!it && it.getAttribute('aria-disabled') !== 'true' && it.offsetParent !== null; return ok; });
  if (addGen) { await pg.locator('#popmenu [data-fa="tree:gen"]').click({ timeout: 3000 }); await pg.waitForTimeout(120); }
  const addModal = await pg.evaluate(() => { const m = document.getElementById('modal-mask'); const ok = !!m && /低把位/.test(m.textContent) && /中把位/.test(m.textContent);
    try { closeModal(); } catch (_) {} try { closePop(); } catch (_) {} return ok; });
  const pianoF = await pg.evaluate((base2) => {
    loadSong(createSong('piano', Object.assign({ lyr: 0 }, base2))); setRibbon('vox'); render();
    const row = document.querySelector('#flw-left [data-fa="tree:gentab"]');
    const ab = document.querySelector('#flw-left [data-fa="tree:add"]'); if (ab) ab.click();
    const it = document.querySelector('#popmenu [data-fa="tree:gen"]');
    const menuGen = !it ? 'none' : (it.getAttribute('aria-disabled') === 'true' ? 'dis' : 'on');
    try { closePop(); } catch (_) {}
    return { row: !!row, menuGen };
  }, base);
  T(flowOn && noRow && addClick && addGen && addModal && !pianoF.row && pianoF.menuGen !== 'on',
    'T1 入口谱类显隐（默认新外壳：歌谱的生成入口在 ＋加轨 › 生成六线谱（v68.7 音轨树不再有「由此生成…」子行）＝把位弹窗「低把位 / 中把位」；钢琴谱不给）',
    JSON.stringify({ flowOn, noRow, addClick, addGen, addModal, pianoF }));

  /* T1c 旧外壳兜底（?shell=classic）：原 T1 断言一字不改 */
  {
    const pc = await b.newPage({ viewport: { width: 1280, height: 950 } });
    pc.on('pageerror', e => errs.push('classic:' + e.message));
    await pc.goto(F + '?shell=classic'); await pc.waitForTimeout(900);
    await pc.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });
    const rc = await pc.evaluate((base2) => {
      loadSong(createSong('vocal', Object.assign({ nVox: 1, lyr: 0 }, base2)));
      song.measures[0].voxes[0][0].deg = 1; render();
      const vis = id => { const el = document.getElementById(id); return !!el && el.offsetParent !== null; };
      setRibbon('vox');
      const vocalLit = vis('nl-voxtab');
      showAddTrackMenu();
      const mapEntry = !!document.getElementById('ta-map');
      document.getElementById('ta-cancel').click();
      loadSong(createSong('piano', Object.assign({ lyr: 0 }, base2)));
      setRibbon('vox'); render();
      const pianoHidden = !vis('nl-voxtab');
      return { flow: document.body.classList.contains('flow'), vocalLit, mapEntry, pianoHidden };
    }, base);
    await pc.close();
    T(!rc.flow && rc.vocalLit && rc.mapEntry && rc.pianoHidden, 'T1c 旧外壳（?shell=classic）入口谱类显隐（歌谱亮/钢琴隐/＋音轨含生成项）', JSON.stringify(rc));
  }

  let r;

  // 构造器注入页面：C 大调音阶 8 列（第 3 列挂连音线），供 T2/T3
  await pg.evaluate((base2) => {
    window.__mkScale = () => {
      loadSong(createSong('vocal', Object.assign({ nVox: 1, lyr: 0 }, base2)));
      const degs = [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [1, 1]];
      degs.forEach(([d, o], i) => { const c = song.measures[Math.floor(i / 4)].voxes[0][i % 4];
        c.deg = d; c.oct = o; });
      song.measures[0].voxes[0][2].tie = true;
      render();
    };
  }, base);

  // T2 低把位：逐音等价 + 时值/tie 复制 + 品位 ≤8
  r = await pg.evaluate(() => {
    window.__mkScale();
    const before = JSON.stringify(song.measures.map(m => m.voxes[0]));
    const st = mapVoxToTab(0, 'low');
    const ti = song.tabVoices.length - 1;
    const bad = [];
    let maxF = 0, tieOk = false, colsOk = true;
    song.measures.forEach((m, mi) => {
      const vc = m.voxes[0], tc = m.tabs[ti];
      if (vc.length !== tc.length) colsOk = false;
      vc.forEach((c, ci) => {
        const t2 = tc[ci];
        if (t2.dur !== c.dur) colsOk = false;
        if (ci === 2 && mi === 0 && t2.tie) tieOk = true;
        if (c.deg > 0) {
          const want = voxMidi(c, mi);
          const n = (t2.notes || [])[0];
          if (!n || tuningOf()[n.s - 1] + (song.capo || 0) + n.f !== want) bad.push({ mi, ci });
          if (n) maxF = Math.max(maxF, n.f);
        }
      });
    });
    return { bad: bad.length, maxF, tieOk, colsOk, oct: st.octShift, drop: st.dropped, before,
      after: JSON.stringify(song.measures.map(m => m.voxes[0])), nTab: song.tabVoices.length, name: st.name };
  });
  const t2 = r;
  T(r.bad === 0 && r.maxF <= 8 && r.tieOk && r.colsOk && r.oct === 0 && r.drop === 0 && /吉他/.test(r.name),
    'T2 低把位（逐音等价·时值tie复制·品位≤8·零折零丢）', JSON.stringify({ bad: r.bad, maxF: r.maxF, tieOk: r.tieOk, colsOk: r.colsOk }));

  // T5 原轨零损 + 一步撤销（接着 T2 的状态）
  r = await pg.evaluate((before) => {
    const untouched = before === JSON.stringify(song.measures.map(m => m.voxes[0]));
    const nTabAfter = song.tabVoices.length;
    undo();
    return { untouched, nTabAfter, nTabUndo: song.tabVoices.length,
      voxBack: before === JSON.stringify(song.measures.map(m => m.voxes[0])) };
  }, t2.before);
  T(r.untouched && r.nTabAfter === 1 && r.nTabUndo === 0 && r.voxBack,
    'T5 原轨零损·一步撤销', JSON.stringify(r));

  // T3 中把位：全部品位 ≥4、逐音等价、零折八度
  r = await pg.evaluate(() => {
    window.__mkScale();
    const st = mapVoxToTab(0, 'mid');
    const ti = song.tabVoices.length - 1;
    let minF = 99; const bad = [];
    song.measures.forEach((m, mi) => m.voxes[0].forEach((c, ci) => {
      if (c.deg > 0) {
        const n = (m.tabs[ti][ci].notes || [])[0];
        if (!n || tuningOf()[n.s - 1] + (song.capo || 0) + n.f !== voxMidi(c, mi)) bad.push(ci);
        if (n) minF = Math.min(minF, n.f);
      }
    }));
    return { bad: bad.length, minF, oct: st.octShift };
  }, base);
  T(r.bad === 0 && r.minF >= 4 && r.oct === 0, 'T3 中把位（品位≥4·逐音等价·零折）', JSON.stringify(r));

  // T4 跟随和弦图直取实证：B3+Bm → follow=3弦4品（图上），low=2弦空弦（图外更低成本）
  r = await pg.evaluate((base2) => {
    loadSong(createSong('vocal', Object.assign({ nVox: 1, lyr: 0 }, base2)));
    song.customChords['Bm'] = 'x24432';
    const c0 = song.measures[0].voxes[0][0];
    c0.deg = 7; c0.oct = -1; c0.chord = 'Bm';   // B3=59
    render();
    const fl = mapVoxToTab(0, 'follow');
    const tiF = song.tabVoices.length - 1;
    const nF = song.measures[0].tabs[tiF][0].notes[0];
    undo();
    mapVoxToTab(0, 'low');
    const tiL = song.tabVoices.length - 1;
    const nL = song.measures[0].tabs[tiL][0].notes[0];
    undo();
    return { hit: fl.hit, f: nF, l: nL,
      fOk: nF && nF.s === 3 && nF.f === 4, lOk: nL && nL.s === 2 && nL.f === 0 };
  }, base);
  T(r.hit === 1 && r.fOk && r.lOk, 'T4 跟随和弦图直取（follow=图上3弦4品 ≠ low=2弦空弦）', JSON.stringify(r));

  // T6 统计如实：C1（超出音域）→ 折八度上报且实装为折后音高
  r = await pg.evaluate((base2) => {
    loadSong(createSong('vocal', Object.assign({ nVox: 1, lyr: 0 }, base2)));
    const c0 = song.measures[0].voxes[0][0];
    c0.deg = 1; c0.oct = -3;   // C1=24 → 折至 48
    render();
    const dry = mapVoxToTab(0, 'low', true);
    mapVoxToTab(0, 'low');
    const ti = song.tabVoices.length - 1;
    const n = song.measures[0].tabs[ti][0].notes[0];
    const got = n ? tuningOf()[n.s - 1] + (song.capo || 0) + n.f : -1;
    undo();
    return { dryOct: dry.octShift, got };
  }, base);
  T(r.dryOct >= 1 && r.got === 48, 'T6 统计如实（折八度上报·实装折后音高 C3=48）', JSON.stringify(r));

  T(errs.length === 0, '无页面报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
