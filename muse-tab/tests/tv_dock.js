/* v38.6 左栏谱类感知布局回归：页签显隐/命名、面板集合/排序、类型专属工具 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  let pass = 0, total = 0;
  const T = (ok, name, detail) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };

  const probe = code => pg.evaluate(`(()=>{ ${code}
    const rail = {};
    ['tab','vox','lyr'].forEach(k=>{ const el=document.querySelector('.ltab[data-t="'+k+'"]');
      rail[k] = el.style.display!=='none' ? el.textContent : null; });
    const panels = t => Array.from(document.querySelectorAll('.panel-p'))
      .filter(el=>el.id.startsWith('panel-'+t+'-') && el.style.display!=='none')
      .sort((a,b2)=>(+a.style.order||0)-(+b2.style.order||0))
      .map(el=>el.id.slice(('panel-'+t+'-').length));
    return { rail, active: activeTab, tabPanels: panels('tab'), voxPanels: panels('vox'),
      voiceTitle: document.querySelector('#panel-vox-voice .rg-title').textContent };
  })()`);

  // T1 弹唱谱（吉他）：三页齐全，tab 页顺序=声部/记谱法/和弦/扫弦/音符/节奏型/列
  let r = await probe("loadSong(createSong('guitar',{beats:4,unit:4,key:'C',nMea:2,nTab:1,nVox:1,lyr:1})); setRibbon('tab');");
  T(r.rail.tab === '吉他谱' && r.rail.vox === '简谱' && r.rail.lyr === '歌词'
    && r.tabPanels.join() === 'voice,notation,chord,strum,mark,pat,col',
    'T1 弹唱谱', 'rail=' + JSON.stringify(r.rail) + ' tab页=' + r.tabPanels.join('/'));

  // T2 独奏谱：无简谱/歌词页，标签「独奏谱」，技法优先和弦后置
  r = await probe("loadSong(createSong('solo',{beats:4,unit:4,key:'C',nMea:2,nTab:1,lyr:0})); ");
  T(r.rail.tab === '独奏谱' && r.rail.vox === null && r.rail.lyr === null && r.active === 'tab'
    && r.tabPanels.join() === 'voice,notation,strum,mark,pat,chord,col',
    'T2 独奏谱', 'rail=' + JSON.stringify(r.rail) + ' 回退页=' + r.active);

  // T3 钢琴弹唱：标签「钢琴伴奏」，伴奏工具置顶，无节奏型，无歌词页
  r = await probe("loadSong(createSong('pianoacc',{beats:4,unit:4,key:'C',nMea:2,lyr:0}));");
  T(r.rail.tab === null && r.rail.vox === '钢琴伴奏' && r.rail.lyr === null && r.active === 'vox'
    && r.voxPanels.join() === 'acc,voice,notation,mark,col,lyradd' && r.voiceTitle === '钢琴声部',
    'T3 钢琴弹唱', 'vox页=' + r.voxPanels.join('/') + ' 标题=' + r.voiceTitle);

  // T4 钢琴独奏：标签「钢琴」，无伴奏工具面板
  r = await probe("loadSong(createSong('piano',{beats:4,unit:4,key:'C',nMea:2,lyr:0}));");
  T(r.rail.vox === '钢琴' && !r.voxPanels.includes('acc') && r.voxPanels[0] === 'voice',
    'T4 钢琴独奏', 'vox页=' + r.voxPanels.join('/'));

  // T5 纯和弦谱：只留 和弦/列 两面板，标签「和弦谱」
  r = await probe("loadSong(createSong('func',{ftype:'chord',nVox:1,beats:4,unit:4,key:'G',nMea:2,lyr:0}));");
  T(r.rail.vox === '和弦谱' && r.voxPanels.join() === 'fn,col',
    'T5 纯和弦谱', 'vox页=' + r.voxPanels.join('/'));

  // T6 功能谱：级数面板置顶；歌谱/教学/器乐：智能配谱面板存在
  r = await probe("loadSong(createSong('func',{nVox:1,beats:4,unit:4,key:'G',nMea:2,lyr:1}));");
  const t6a = r.rail.vox === '功能谱' && r.voxPanels[0] === 'fn';
  r = await probe("loadSong(createSong('teach',{nVox:1,beats:4,unit:4,key:'C',nMea:2,lyr:1}));");
  T(t6a && r.rail.vox === '教学谱' && r.voxPanels.includes('arr') && !r.voxPanels.includes('lyradd'),
    'T6 功能谱/教学谱', '教学vox页=' + r.voxPanels.join('/'));

  // T7 器乐五线谱：标签「五线谱」+ 声部标题「器乐声部」+ 无歌词时 lyradd 显示
  r = await probe("loadSong(createSong('instr',{nVox:1,clef:'alto',beats:4,unit:4,key:'D',nMea:2,lyr:0}));");
  T(r.rail.vox === '五线谱' && r.rail.lyr === null && r.voiceTitle === '器乐声部' && r.voxPanels.includes('lyradd'),
    'T7 器乐谱', 'vox页=' + r.voxPanels.join('/') + ' 标题=' + r.voiceTitle);

  // T8 ＋添加歌词行：点击后 lyricLines=1、歌词页出现并激活、lyradd 消失
  r = await pg.evaluate(() => {
    document.getElementById('vl-add').click();
    const lb = document.querySelector('.ltab[data-t="lyr"]');
    return { lines: song.lyricLines, lyrShown: lb.style.display !== 'none', active: activeTab,
      lyraddGone: document.getElementById('panel-vox-lyradd').style.display === 'none' || activeTab!=='vox' };
  });
  T(r.lines === 1 && r.lyrShown && r.active === 'lyr' && r.lyraddGone,
    'T8 ＋歌词行', 'lines=' + r.lines + ' 激活页=' + r.active);

  // T9 类型专属按钮真实生效：一键配和弦（pianoacc）标注和弦；级数↔音名切换 funcNames
  r = await pg.evaluate(() => {
    const s = createSong('pianoacc', {beats:4, unit:4, key:'C', nMea:2, lyr:0});
    s.measures[0].voxes[0] = [ {dur:4,dotted:false,deg:1,acc:'',oct:0,lyrics:[]}, {dur:4,dotted:false,deg:3,acc:'',oct:0,lyrics:[]},
      {dur:4,dotted:false,deg:5,acc:'',oct:0,lyrics:[]}, {dur:4,dotted:false,deg:1,acc:'',oct:1,lyrics:[]} ];
    loadSong(s);
    document.getElementById('va-sug').click();
    const withChord = song.measures.filter(m => (m.voxes[0]||[]).some(c => c.chord)).length;
    const f0 = !!song.funcNames;
    document.getElementById('vf-names').click();
    return { withChord, flipped: song.funcNames !== f0 };
  });
  T(r.withChord >= 1 && r.flipped, 'T9 专属按钮生效', '配和弦小节=' + r.withChord + ' 级数切换=' + r.flipped);

  // T10 旧行为不回归：弹唱谱三页往返切换 + 面板 ID 完整（关键按钮都在）
  r = await pg.evaluate(() => {
    loadSong(PRESETS[0].make());
    setRibbon('vox'); const v = activeTab;
    setRibbon('lyr'); const l = activeTab;
    setRibbon('tab');
    const ids = ['b-mute','b-strum-d','b-arp','b-notation','i-chord','b-inscol-t','tab-quick',
      'vn-jp','vn-st','b-sharp','b-tie','b-addnote','vox-quick','i-lyric','b-fill'];
    return { v, l, t: activeTab, allIds: ids.every(i => !!document.getElementById(i)) };
  });
  T(r.v === 'vox' && r.l === 'lyr' && r.t === 'tab' && r.allIds, 'T10 旧行为兼容', '关键控件齐全=' + r.allIds);

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
