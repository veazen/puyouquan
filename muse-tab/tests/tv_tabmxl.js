/* v44.7 TAB↔MusicXML 往返回归：
   - 吉他弹唱(vox+tab) 导出：xmllint 通过 + TAB 谱号/staff-tuning/string-fret + vox 声部并存。
   - TAB 往返一致：自定义调弦(dropD)+capo+和音+x闷音+附点+休止，string/fret/x/时值集合逐项一致、tuning/capo 保留、skip=0。
   - uku 往返：4 弦 → inst=uku、4 条 staff-tuning。
   - 第三方 fixture（MuseScore 式 divisions=480 + staff-details + TAB 谱号）导入 → tabVoices + s/f 正确 + 渲染非空。
   - 纯 TAB(solo) 导出/导入：只有 tab part，导入 tabVoices 非空。 */
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tabmxl-'));
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  // T1 吉他弹唱导出：结构 + xmllint
  const x1 = await pg.evaluate(() => {
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 1 });
    s.measures[0].tabs[0] = [{ dur: 4, dotted: false, notes: [{ s: 6, f: 3 }, { s: 5, f: 2 }] }, { dur: 4, dotted: false, notes: [{ s: 1, f: 0 }] }];
    loadSong(s); return exportMusicXML(song);
  });
  let ok1 = !!x1 && !x1.includes('NaN') && !x1.includes('undefined')
    && /<clef><sign>TAB<\/sign>/.test(x1) && x1.includes('<staff-tuning')
    && /<technical><string>6<\/string><fret>3<\/fret><\/technical>/.test(x1)
    && x1.includes('<part id="P1">') && x1.includes('<part id="T1">');
  if (ok1) { const fp = path.join(tmp, 't1.musicxml'); fs.writeFileSync(fp, x1);
    try { cp.execSync(`xmllint --noout "${fp}"`); } catch (e) { ok1 = false; } }
  T(ok1, 'T1 吉他弹唱导出(vox+tab)', 'len=' + (x1 ? x1.length : 0));

  // T2 TAB 往返一致（dropD + capo + 和音/x/附点/休止）
  const r2 = await pg.evaluate(() => {
    const s = createSong('guitar', { beats: 4, unit: 4, key: 'C', nMea: 2, nTab: 1, nVox: 1, lyr: 1 });
    s.tuning = [64, 59, 55, 50, 45, 38]; s.capo = 2;
    s.measures[0].tabs[0] = [
      { dur: 4, dotted: false, notes: [{ s: 6, f: 0 }, { s: 5, f: 2 }] },
      { dur: 8, dotted: false, notes: [{ s: 3, f: 2, x: 1 }] },
      { dur: 8, dotted: false, notes: [{ s: 1, f: 3 }] },
      { dur: 2, dotted: true, notes: [] },
    ];
    s.measures[1].tabs[0] = [{ dur: 2, dotted: false, notes: [{ s: 2, f: 1 }] }, { dur: 2, dotted: false, notes: [{ s: 4, f: 4 }] }];
    loadSong(s);
    const im = importMusicXML(exportMusicXML(song));
    if (im.error) return { error: im.error };
    const b2 = im.song;
    const flat = x => x.measures.map(m => (m.tabs[0] || []).map(c => ({ d: c.dur, dot: !!c.dotted, n: (c.notes || []).map(nn => nn.s + '/' + nn.f + (nn.x ? 'x' : '')).join(',') })));
    return { same: JSON.stringify(flat(song)) === JSON.stringify(flat(b2)), tuning: JSON.stringify(b2.tuning), capo: b2.capo, skip: im.skip.notes + im.skip.other };
  });
  T(!r2.error && r2.same && r2.tuning === '[64,59,55,50,45,38]' && r2.capo === 2 && r2.skip === 0,
    'T2 TAB 往返一致(dropD/capo/和音/x/附点)', JSON.stringify(r2));

  // T3 uku 往返（4 弦 → inst=uku）
  const r3 = await pg.evaluate(() => {
    const s = createSong('uku', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 1, lyr: 0 });
    s.measures[0].tabs[0] = [{ dur: 4, dotted: false, notes: [{ s: 1, f: 3 }, { s: 2, f: 0 }] }, { dur: 4, dotted: false, notes: [{ s: 4, f: 2 }] }];
    loadSong(s);
    const xml = exportMusicXML(song);
    const nTun = (xml.match(/<staff-tuning /g) || []).length;
    const im = importMusicXML(xml);
    if (im.error) return { error: im.error };
    const b2 = im.song;
    const flat = x => x.measures.map(m => (m.tabs[0] || []).map(c => (c.notes || []).map(nn => nn.s + '/' + nn.f).join(',')));
    return { nTun, inst: b2.inst, same: JSON.stringify(flat(song)) === JSON.stringify(flat(b2)), skip: im.skip.notes + im.skip.other };
  });
  T(!r3.error && r3.nTun === 4 && r3.inst === 'uku' && r3.same && r3.skip === 0, 'T3 uku 往返(4弦)', JSON.stringify(r3));

  // T4 第三方 MuseScore 式 TAB fixture 导入
  const FIX = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>' +
    '<part id="P1"><measure number="1"><attributes><divisions>480</divisions><key><fifths>0</fifths></key>' +
    '<time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>TAB</sign><line>5</line></clef>' +
    '<staff-details><staff-lines>6</staff-lines>' +
    '<staff-tuning line="1"><tuning-step>E</tuning-step><tuning-octave>2</tuning-octave></staff-tuning>' +
    '<staff-tuning line="2"><tuning-step>A</tuning-step><tuning-octave>2</tuning-octave></staff-tuning>' +
    '<staff-tuning line="3"><tuning-step>D</tuning-step><tuning-octave>3</tuning-octave></staff-tuning>' +
    '<staff-tuning line="4"><tuning-step>G</tuning-step><tuning-octave>3</tuning-octave></staff-tuning>' +
    '<staff-tuning line="5"><tuning-step>B</tuning-step><tuning-octave>3</tuning-octave></staff-tuning>' +
    '<staff-tuning line="6"><tuning-step>E</tuning-step><tuning-octave>4</tuning-octave></staff-tuning></staff-details></attributes>' +
    '<note><pitch><step>E</step><octave>2</octave></pitch><duration>480</duration><voice>1</voice><type>quarter</type>' +
    '<notations><technical><string>6</string><fret>0</fret></technical></notations></note>' +
    '<note><pitch><step>C</step><octave>3</octave></pitch><duration>480</duration><voice>1</voice><type>quarter</type>' +
    '<notations><technical><string>5</string><fret>3</fret></technical></notations></note>' +
    '<note><rest/><duration>960</duration><voice>1</voice><type>half</type></note>' +
    '</measure></part></score-partwise>';
  const r4 = await pg.evaluate((fix) => {
    const im = importMusicXML(fix);
    if (im.error) return { error: im.error };
    loadSong(im.song);
    const h = document.getElementById('score').innerHTML;
    const cols = im.song.measures[0].tabs[0] || [];
    const sig = cols.map(c => (c.notes || []).map(nn => nn.s + '/' + nn.f).join(',') || 'rest').join(' ');
    return { nTab: (im.song.tabVoices || []).length, name: (im.song.tabVoices || [])[0], sig, renderOK: h.length > 800 && !h.includes('NaN'), skip: im.skip.notes };
  }, FIX);
  T(!r4.error && r4.nTab === 1 && r4.sig === '6/0 5/3 rest' && r4.renderOK, 'T4 第三方 TAB fixture 导入', JSON.stringify(r4));

  // T5 纯 TAB(solo) 导出/导入：只有 tab part
  const r5 = await pg.evaluate(() => {
    const s = createSong('solo', { beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1 });
    // 确保没有 vox 声部
    s.voxVoices = []; s.voxNotations = []; s.measures.forEach(m => m.voxes = []);
    s.measures[0].tabs[0] = [{ dur: 4, dotted: false, notes: [{ s: 3, f: 2 }] }, { dur: 4, dotted: false, notes: [{ s: 2, f: 3 }] }];
    loadSong(s);
    const xml = exportMusicXML(song);
    const onlyTab = xml.indexOf('<part id="P1">') < 0 && xml.indexOf('<part id="T1">') > 0;
    const im = importMusicXML(xml);
    if (im.error) return { error: im.error, onlyTab };
    return { onlyTab, hasTab: (im.song.tabVoices || []).length, noVox: (im.song.voxVoices || []).length === 0, skip: im.skip.notes + im.skip.other };
  });
  T(!r5.error && r5.onlyTab && r5.hasTab === 1 && r5.noVox && r5.skip === 0, 'T5 纯TAB(solo)导出/导入', JSON.stringify(r5));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
