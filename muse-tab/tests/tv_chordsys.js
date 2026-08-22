/* tv_chordsys —— v60.31 和弦系统修正回归（用户报告：57sus 与 37/#5 无法实现；
   和弦编辑弹窗要可移动；点击和弦图先出中间面板，不直接进编辑器）
   覆盖：级数写法直入（degChordName）/ 级数显示按拼写字母定级（chordDegree）/
   构建器半音转位低音（VC_BASS·vcParse/vcBuild 半音制）/ 音名变音后置上标 /
   构建器弹窗拖动 / 图点击中间面板。
   变异实证（写入时验证过）：chordDegree 低音退回半音查表 → T2 当场红（#5 变 b6）。 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 850 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  let pass = 0, total = 0; const T = (ok, n, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + n + (d ? ': ' + d : '')); };

  let r = await pg.evaluate(() => {
    window.guardReplace = p => p();
    loadSong(createSong('guitar', { title: 'cs', beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 0 }));
    const inC = { a: degChordName('57sus'), b: degChordName('37/#5'), c: degChordName('4m7'),
      d: degChordName('#4dim'), e: degChordName('2ø'), f: degChordName('X'), g: degChordName('6m') };
    const o = song.key; song.key = 'D';
    const inD = degChordName('37/#5');
    song.key = o;
    return { ...inC, inD };
  });
  T(r.a === 'G7sus4' && r.b === 'E7/G#' && r.c === 'Fm7' && r.d === 'F#dim' && r.e === 'Dm7b5'
    && r.f === null && r.g === 'Am' && r.inD === 'F#7/A#',
    'T1 级数写法直入（57sus/37#5/别名/跨调）', JSON.stringify(r));

  r = await pg.evaluate(() => ({
    a: chordDegree('E7/G#'), b: chordDegree('E7/Ab'), c: chordDegree('F#m7'),
    d: chordDegree('G7'), e: chordDegree('Am'), f: chordDegree('C/E') }));
  T(r.a === '37/#5' && r.b === '37/b6' && r.c === '#4m7' && r.d === '57' && r.e === '6m' && r.f === '1/3',
    'T2 级数显示按拼写字母定级（G#=#5、Ab=b6，调内不回归）', JSON.stringify(r));

  r = await pg.evaluate(() => {
    const p1 = vcParse('E7/G#');
    const b1 = vcBuild({ deg: 2, suf: '7', bass: 8 });
    const nC = vcBassName(10);
    const o = song.key; song.key = 'D'; const nD = vcBassName(10); song.key = o;
    return { p1, b1, nC, nD };
  });
  T(r.p1 && r.p1.deg === 2 && r.p1.suf === '7' && r.p1.bass === 8 && r.b1 === 'E7/G#'
    && r.nC === 'Bb' && r.nD === 'C',
    'T3 半音转位低音（vcParse/vcBuild 往返；b7 拼写随调）', JSON.stringify(r));

  /* 构建器：12 半音低音钮就位，点 /#5 应用出 /G#；自定义框级数直写 */
  r = await pg.evaluate(() => {
    sel.row = 'vox'; sel.vi = 0; sel.mi = 0; sel.ci = 0; sel.q = 0; render();
    showVoxChordMenu(300, 120);
    const pm = document.getElementById('popmenu');
    const nB = pm.querySelectorAll('[data-vb]').length;
    const b5 = pm.querySelector('[data-vb="8"]');
    pm.querySelector('[data-vd="2"]').click();          // 3 级
    pm.querySelector('[data-vs="7"]').click();          // 属七
    pm.querySelector('[data-vb="8"]').click();          // /#5
    const got = song.measures[0].voxes[0][0].chord;
    closePop();
    sel.ci = 1; render(); showVoxChordMenu(300, 120);
    const inp = document.getElementById('vc-custom');
    inp.value = '37/#5';
    document.getElementById('vc-ok').click();
    const got2 = song.measures[0].voxes[0][1].chord;
    closePop();
    return { nB, b5: !!b5, got, got2 };
  });
  T(r.nB === 13 && r.b5 && r.got === 'E7/G#' && r.got2 === 'E7/G#',
    'T4 构建器点选 /#5 与自定义框级数直写', JSON.stringify(r));

  /* 音名变音后置（G♯ 不再画成 ♯G）；级数维持前置（♯5） */
  r = await pg.evaluate(() => {
    const svg = chordSvgLabel('E7/G#', 12), svg2 = chordSvgLabel('#5', 12);
    const html = chordHtmlLabel('G#m7');
    return { letterAfter: svg.indexOf('G') < svg.indexOf('♯'), degBefore: svg2.indexOf('♯') < svg2.indexOf('5'),
      htmlAfter: html.indexOf('G') < html.indexOf('♯') };
  });
  T(r.letterAfter && r.degBefore && r.htmlAfter, 'T5 变音记号顺序（音名后置/级数前置）', JSON.stringify(r));

  /* 点击谱面和弦图 → 中间面板（编辑…/试听/清除），「编辑…」才进构建器 */
  r = await pg.evaluate(() => {
    const g = document.querySelector('#score g[data-vchord="0:0:0"]');
    if (!g) return { g: false };
    const bb = g.getBoundingClientRect();
    g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: bb.x + 5, clientY: bb.y + 5, button: 0 }));
    const hub = !!document.getElementById('vp-edit');
    const noEditor = !document.getElementById('vc-ok');
    document.getElementById('vp-edit').click();
    const editor = !!document.getElementById('vc-ok');
    closePop();
    return { g: true, hub, noEditor, editor };
  });
  T(r.g && r.hub && r.noEditor && r.editor, 'T6 点和弦图先出中间面板，编辑…再进构建器', JSON.stringify(r));

  /* 构建器弹窗可拖动（标题把手） */
  r = await pg.evaluate(() => {
    showVoxChordMenu(200, 150);
    const pm = document.getElementById('popmenu');
    const h = pm.querySelector('.pm-drag');
    const l0 = parseFloat(pm.style.left), t0 = parseFloat(pm.style.top);
    const bb = h.getBoundingClientRect();
    const fire = (type, x, y) => pm.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 7 }));
    h.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: bb.x + 40, clientY: bb.y + 6, pointerId: 7 }));
    fire('pointermove', bb.x + 80, bb.y + 36);
    fire('pointerup', bb.x + 80, bb.y + 36);
    const dl = parseFloat(pm.style.left) - l0, dt = parseFloat(pm.style.top) - t0;
    closePop();
    return { dl, dt };
  });
  T(Math.abs(r.dl - 40) < 2 && Math.abs(r.dt - 30) < 2, 'T7 构建器弹窗拖动（标题把手 +40/+30）', JSON.stringify(r));

  T(errs.length === 0, 'T8 无报错', errs.join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
