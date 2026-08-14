/* v58.0 标注功能回归：固定标注（常用词一键）+ 自由标注（任意文字）落当前光标列（col.anno）
   覆盖：信息页卡片存在与位置（曲谱信息卡下方）、固定/自由标注写入与覆盖、清除、
   TAB/简谱渲染文本（转义防 XSS）、撤销、MusicXML 导出 words */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });
  let pass = 0, total = 0;
  const T = (ok, name, detail) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };

  const build = `
    const Tc = (ext) => Object.assign({dur:4, dotted:false, chord:'', notes:[], strum:'', tech:''}, ext);
    const s = createSong('guitar', {title:'an', beats:4, unit:4, key:'C', nMea:1, nTab:1, nVox:1, lyr:0});
    s.measures[0].tabs[0] = [Tc({chord:'C', notes:[{s:5,f:3}]}), Tc({notes:[{s:1,f:0}]}), Tc({notes:[]}), Tc({notes:[]})];
    s.measures[0].voxes[0] = [0,1,2,3].map(()=>({dur:4,dotted:false,deg:1,acc:'',oct:0,lyrics:[],tie:false}));
    loadSong(s);`;

  // T1 卡片存在于信息页、位于曲谱信息卡下方；含固定标注词与自由输入
  let r = await pg.evaluate(() => {
    const card = document.getElementById('rc-anno');
    const prev = card && card.previousElementSibling;
    setRTab('info');
    const vis = !!card && !!card.offsetParent;
    const chips = card? card.querySelectorAll('#anno-fixed [data-anno]').length : 0;
    setRTab('make');
    return { exists: !!card, afterInfo: prev && prev.id==='rc-songinfo', vis, chips,
      hasInput: !!document.getElementById('anno-input'), hasDel: !!document.getElementById('anno-del') };
  });
  T(r.exists && r.afterInfo && r.vis && r.chips===12 && r.hasInput && r.hasDel,
    'T1 标注卡在曲谱信息下方（12 固定词+自由输入+清除）', JSON.stringify(r));

  // T2 固定标注写入 col.anno + 渲染文本；再次标注覆盖
  r = await pg.evaluate((code) => {
    eval(code);
    sel = { row:'tab', vi:0, mi:0, ci:0, si:5 };
    document.querySelector('#anno-fixed [data-anno="前奏"]').click();
    const a1 = song.measures[0].tabs[0][0].anno;
    const svg1 = document.getElementById('score').innerHTML.includes('>前奏</text>');
    document.querySelector('#anno-fixed [data-anno="扫弦"]').click();
    const a2 = song.measures[0].tabs[0][0].anno;
    return { a1, svg1, a2, over: a2==='扫弦' };
  }, build);
  T(r.a1==='前奏' && r.svg1 && r.over, 'T2 固定标注写入+渲染+覆盖', JSON.stringify(r));

  // T3 自由标注（含 XSS 转义）+ 简谱行标注渲染
  r = await pg.evaluate(() => {
    sel = { row:'vox', vi:0, mi:0, ci:1, si:0 };
    const inp = document.getElementById('anno-input');
    inp.value = '轻一点<b>';
    document.getElementById('anno-add').click();
    const a = song.measures[0].voxes[0][1].anno;
    const html = document.getElementById('score').innerHTML;
    return { a, esc: html.includes('轻一点&lt;b&gt;'), raw: html.includes('轻一点<b>') };
  });
  T(r.a==='轻一点<b>' && r.esc && !r.raw, 'T3 自由标注+简谱渲染+转义防XSS', JSON.stringify(r));

  // T4 清除 + 撤销恢复
  r = await pg.evaluate(() => {
    document.getElementById('anno-del').click();
    const cleared = !('anno' in song.measures[0].voxes[0][1]);
    undo();
    const back = song.measures[0].voxes[0][1].anno === '轻一点<b>';
    undo(); undo();   /* 回退自由标注与覆盖 */
    return { cleared, back };
  });
  T(r.cleared && r.back, 'T4 清除+撤销恢复', JSON.stringify(r));

  // T5 MusicXML 导出 words（简谱+TAB 声部）
  r = await pg.evaluate((code) => {
    eval(code);
    song.measures[0].tabs[0][0].anno = '慢起';
    song.measures[0].voxes[0][2].anno = '自由地';
    const xml = exportMusicXML(song);
    return { tab: xml.includes('<words>慢起</words>'), vox: xml.includes('<words>自由地</words>') };
  }, build);
  T(r.tab && r.vox, 'T5 MusicXML 导出 words（TAB+简谱声部）', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
