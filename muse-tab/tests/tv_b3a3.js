/* v65.3 B3a 互操作保真（三）（2026-10 评审团 §6.3 B3a ④：P1-22 弹唱谱 TAB 和弦与技法随 MusicXML 出入）
   T1 TAB 列和弦导出：T1 part 里 <harmony> C（kind major）带 <frame>：6 弦、frame-note 5 个（6 弦 x 不写）、5 弦 3 品 / 4 弦 2 品 / 2 弦 1 品
   T2 技法导出：h 起点 hammer-on start、落点 stop；bend full → bend-alter 2；自然泛音 harmonic natural；sl 起止 slide（notations 级）；P.M. → other-technical；p 起止 pull-off；A.H. → artificial + other-technical
   T3 往返：导入导出后每列 notes 的 s/f/tech/bAmt/hmT/tk 全同、列和弦 C 保留、零跳过
   T4 第三方写法：无 frame 的 <harmony> → 列和弦 Am；hammer-on start/stop → tech h + tk 指向下一列同弦音；bend-alter 1 → b + bAmt 1/2；harmonic artificial → hm + hmT A；slide start → sl + tk
   突变实证：对 v65.3 之前的文件复跑，T1–T4 全部报红。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto('file://' + FILE); await pg.waitForTimeout(1000);
  await pg.evaluate(() => {
    guardReplace = (p) => p(); hideStartPad(); blurSel = true;
    window.TC = (notes, o) => Object.assign({ dur: 4, dotted: false, notes }, o || {});
    window.TN = (s, f, o) => Object.assign({ s, f }, o || {});
    window.sig = (s) => s.measures.map(m => (m.tabs[0] || []).map(c => (c.chord || '-') + ':' + (c.notes || []).map(n => [n.s, n.f, n.tech || '', n.bAmt || '', n.hmT || '', n.tk ? n.tk.mi + '.' + n.tk.ci + '.' + n.tk.si : ''].join('/')).join(',')).join(' ')).join('|');
    window.tabNotes = (xml) => { const d = new DOMParser().parseFromString(xml, 'application/xml'); return [...d.querySelectorAll('part[id="T1"] note')].map(n => new XMLSerializer().serializeToString(n)); };
    window.MXT = (measures) => '<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="T1"><part-name>吉他</part-name></score-part></part-list><part id="T1">' +
      measures.map((m, i) => `<measure number="${i + 1}">` + (i === 0 ? '<attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><staff-details><staff-lines>6</staff-lines></staff-details><clef><sign>TAB</sign><line>5</line></clef></attributes>' : '') + m + '</measure>').join('') + '</part></score-partwise>';
    window.XN = (s, f, tech, extra) => `<note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type><notations>${extra || ''}<technical><string>${s}</string><fret>${f}</fret>${tech || ''}</technical></notations></note>`;
  });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = f => pg.evaluate(f).catch(e => ({ err: e.message }));

  /* T1 + T2 share one song */
  let r = await EV(() => { const s = createSong('guitar', { title: '技法', key: 'C', beats: 4, unit: 4, nMea: 2, nTab: 1, nVox: 0, lyr: 0 });
    s.measures[0].tabs[0] = [TC([TN(1, 5, { tech: 'h', tk: { mi: 0, ci: 1, si: 1 } })], { chord: 'C' }), TC([TN(1, 7)]), TC([TN(2, 5, { tech: 'b', bAmt: 'full' })]), TC([TN(3, 12, { tech: 'hm' })])];
    s.measures[1].tabs[0] = [TC([TN(1, 5, { tech: 'sl', tk: { mi: 1, ci: 1, si: 1 } })]), TC([TN(1, 7, { tech: 'pm' })]), TC([TN(2, 3, { tech: 'p', tk: { mi: 1, ci: 3, si: 2 } })]), TC([TN(2, 1, { tech: 'hm', hmT: 'A' })])];
    loadSong(s); window.S3 = JSON.stringify(s); const xml = exportMusicXML(song); window.X3 = xml;
    const d = new DOMParser().parseFromString(xml, 'application/xml'); const h = d.querySelector('part[id="T1"] harmony');
    const fr = h && h.querySelector('frame'); const fn = fr ? [...fr.querySelectorAll('frame-note')].map(x => x.querySelector('string').textContent + ':' + x.querySelector('fret').textContent).join(' ') : '';
    const ns = tabNotes(xml);
    return { h: !!h, kind: h && h.querySelector('kind').textContent, strings: fr && fr.querySelector('frame-strings').textContent, fn,
      n0: /<hammer-on type="start" number="1">H<\/hammer-on>/.test(ns[0]), n1: /<hammer-on type="stop" number="1"\/>/.test(ns[1]), n2: /<bend><bend-alter>2<\/bend-alter><\/bend>/.test(ns[2]), n3: /<harmonic><natural\/><\/harmonic>/.test(ns[3]),
      n4: /<slide type="start" number="1"\/>/.test(ns[4]) && ns[4].indexOf('<slide') < ns[4].indexOf('<technical>'), n5: /<slide type="stop" number="1"\/>/.test(ns[5]) && /<other-technical>P\.M\.<\/other-technical>/.test(ns[5]),
      n6: /<pull-off type="start" number="1">P<\/pull-off>/.test(ns[6]), n7: /<pull-off type="stop" number="1"\/>/.test(ns[7]) && /<harmonic><artificial\/><\/harmonic><other-technical>A\.H\.<\/other-technical>/.test(ns[7]) }; });
  T(!r.err && r.h && r.kind === 'major' && r.strings === '6' && r.fn === '5:3 4:2 3:0 2:1 1:0', 'T1 TAB 列和弦 → harmony + frame 指法图', JSON.stringify({ h: r.h, kind: r.kind, strings: r.strings, fn: r.fn, err: r.err }));
  T(!r.err && r.n0 && r.n1 && r.n2 && r.n3 && r.n4 && r.n5 && r.n6 && r.n7, 'T2 技法 → technical（h/p 起止、bend、harmonic、slide、P.M.、A.H.）', JSON.stringify({ n0: r.n0, n1: r.n1, n2: r.n2, n3: r.n3, n4: r.n4, n5: r.n5, n6: r.n6, n7: r.n7 }));

  /* T3 */
  r = await EV(() => { const s0 = JSON.parse(window.S3); const res = importMusicXML(window.X3); if (!res.song) return { err: res.error };
    return { same: sig(s0) === sig(res.song), a: sig(s0), b: sig(res.song), sk: res.skip.notes + res.skip.other + res.skip.slurs }; });
  T(!r.err && r.same && r.sk === 0 && /^C:/.test(r.a), 'T3 TAB 和弦与技法往返零损失', JSON.stringify(r));

  /* T4 */
  r = await EV(() => { const m = '<harmony><root><root-step>A</root-step></root><kind>minor</kind></harmony>' +
      XN(1, 5, '<hammer-on type="start" number="1">H</hammer-on>') + XN(1, 7, '<hammer-on type="stop" number="1"/>') + XN(2, 5, '<bend><bend-alter>1</bend-alter></bend>') + XN(3, 5, '<harmonic><artificial/></harmonic>');
    const m2 = XN(1, 5, '', '<slide type="start" number="1"/>') + XN(1, 7, '', '<slide type="stop" number="1"/>') + XN(2, 3, '<other-technical>P.M.</other-technical>') + XN(2, 3);
    const res = importMusicXML(MXT([m, m2])); if (!res.song) return { err: res.error };
    return { sig: sig(res.song), nt: res.song.tabVoices.length, sk: res.skip.notes + res.skip.other }; });
  T(!r.err && r.sig === 'Am:1/5/h///0.1.1 -:1/7//// -:2/5/b/1/2// -:3/5/hm//A/|-:1/5/sl///1.1.1 -:1/7//// -:2/3/pm/// -:2/3////' && r.nt === 1 && r.sk === 0, 'T4 第三方 TAB：harmony 无 frame、hammer-on 起止、bend-alter 1、artificial、slide', JSON.stringify(r));

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
