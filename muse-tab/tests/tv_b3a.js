/* v65.1 B3a 互操作保真（一）（2026-10 评审团 §6.3 B3a ①②⑤⑥：P1-20 / P1-21 / P2-15 / P3-04 harmony kind）
   T1 导出分流：tie 链里异音对写 <slur>、同音对写 <tie>/<tied>；C(tie)D(tie)E → 一条 slur 从 C 到 E、无 tied；跨小节 C(tie)C → tie 无 slur；链尾落在休止的那一环丢弃
   T2 导入圆滑线：slur start…stop 之间的音得 tie 标记（链），stop 音不带；再导出 slur 位置不变
   T3 结构导出：房子 ending start/stop/discontinue、𝄋 segno、⊕ tocoda/coda、D.S./Fine words+sound、段落双细线 light-light、终止线
   T4 结构往返：导入导出后 volta/segno/coda/dc/ds/fine/sectionBar/finalBar/repeat 全同，buildPlayOrder 序列相同
   T5 第三方写法导入：words「D.C. al Fine」+sound dacapo → dc；words Fine + sound fine → fine；ending number="1" 跨两小节 → 两小节 volta=1；bar-style light-light → sectionBar；末小节 light-heavy 不当 finalBar
   T6 和弦类型导出：Am7→minor-seventh、G7sus4→suspended-fourth+degree 7 -1 add、C69→major-sixth+add 9、F#m7b5→half-diminished（root-alter 1）、Bb7b9→dominant+degree 9 -1（root-alter -1）、Dmaj7#11→major-seventh+add 11 +1
   T7 和弦类型导入（无 text）：half-diminished→m7b5、dominant+♭9 add→7b9、suspended-fourth+♭7 add→7sus4、major-sixth+add 9→69、augmented-seventh→aug7；有 text 以 text 为准
   T8 跳过分项：10 个 part 只取 8（v65.2 上限）→ skip.parts=2 且 partNames 点名、第二 voice 音符 → skip.voices、第 6 行歌词 → skip.lyrics（v69.4 有意迁移：导入段数上限 3 → MAX_LYR=5，此前用第 4 行）；skipText 文案逐项点名
   突变实证：对 v65.1 之前的文件复跑，T1–T8 全部报红。 */
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
    window.V = (d, u, o) => Object.assign({ dur: u, dotted: false, deg: d, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    /* 最小 score-partwise：parts=[{id,name,measures:[xmlBody...]}] */
    window.MX = (parts) => '<?xml version="1.0"?><score-partwise version="4.0"><part-list>' +
      parts.map(p => `<score-part id="${p.id}"><part-name>${p.name || p.id}</part-name></score-part>`).join('') + '</part-list>' +
      parts.map(p => `<part id="${p.id}">` + p.measures.map((m, i) => `<measure number="${i + 1}">` +
        (i === 0 ? '<attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>' : '') + m + '</measure>').join('') + '</part>').join('') + '</score-partwise>';
    window.N = (step, oct, extra, inner) => `<note><pitch><step>${step}</step><octave>${oct || 4}</octave></pitch><duration>4</duration>${inner || ''}<voice>1</voice><type>quarter</type>${extra || ''}</note>`;
    window.notesOf = (xml, pid) => { const d = new DOMParser().parseFromString(xml, 'application/xml');
      return [...d.querySelectorAll(`part[id="${pid}"] note`)].map(n => ({ st: n.querySelector('rest') ? 'R' : n.querySelector('step').textContent,
        sS: !!n.querySelector('slur[type="start"]'), sE: !!n.querySelector('slur[type="stop"]'), tS: !!n.querySelector('tie[type="start"]'), tdS: !!n.querySelector('tied[type="start"]'), tE: !!n.querySelector('tie[type="stop"]') })); };
    window.meaXml = (xml, pid, i) => new XMLSerializer().serializeToString(new DOMParser().parseFromString(xml, 'application/xml').querySelectorAll(`part[id="${pid}"] > measure`)[i]);
    window.flags = (s) => { const AB = { volta: 'v', segno: 'sg', coda: 'co', dc: 'dc', ds: 'ds', fine: 'fi', sectionBar: 'sb', finalBar: 'fb', repeatStart: 'rS', repeatEnd: 'rE' };
      return s.measures.map(m => Object.keys(AB).map(k => m[k] ? (k === 'volta' ? 'v' + m.volta : AB[k]) : '').filter(Boolean).join(',')).join('|'); };
  });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = f => pg.evaluate(f).catch(e => ({ err: e.message }));

  /* T1 */
  let r = await EV(() => { const s = createSong('vocal', { title: '连线', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 0 });
    s.measures[0].voxes[0] = [V(1, 4, { tie: true }), V(2, 4, { tie: true }), V(3, 4), V(1, 4, { tie: true })];
    s.measures[1].voxes[0] = [V(1, 4), V(5, 4, { tie: true }), V(0, 4), V(1, 4)];
    loadSong(s); const xml = exportMusicXML(song); const ns = notesOf(xml, 'P1');
    return { n: ns.length, seq: ns.map(n => n.st + (n.sS ? '(' : '') + (n.sE ? ')' : '') + (n.tS ? '_' : '') + (n.tE ? '^' : '') + (n.tdS ? 't' : '')).join(' '), slurs: (xml.match(/<slur /g) || []).length, tied: (xml.match(/<tied /g) || []).length }; });
  T(!r.err && r.seq === 'C( D E) C_t C^ G R C' && r.slurs === 2 && r.tied === 2, 'T1 导出：异音 tie 链写一条 slur、同音写 tie、落休止的丢弃', JSON.stringify(r));

  /* T2 */
  r = await EV(() => { const xml = MX([{ id: 'P1', measures: [N('C', 4, '<notations><slur type="start" number="1"/></notations>') + N('D', 4) + N('E', 4, '<notations><slur type="stop" number="1"/></notations>') + N('F', 4)] }]);
    const res = importMusicXML(xml); if (!res.song) return { err: res.error };
    const c = res.song.measures[0].voxes[0]; const ns = notesOf(exportMusicXML(res.song), 'P1');
    return { ties: c.map(x => x.tie ? 1 : 0).join(''), degs: c.map(x => x.deg).join(''), re: ns.map(n => n.st + (n.sS ? '(' : '') + (n.sE ? ')' : '')).join(' '), skip: res.skip.slurs }; });
  T(!r.err && r.ties === '1100' && r.degs === '1234' && r.re === 'C( D E) F' && r.skip === 0, 'T2 导入 slur → tie 链；再导出位置不变', JSON.stringify(r));

  /* T3 */
  r = await EV(() => { const s = createSong('vocal', { title: '结构', key: 'C', beats: 4, unit: 4, nMea: 5, nVox: 1, lyr: 0 });
    s.measures.forEach(m => { m.voxes[0] = [V(1, 4), V(2, 4), V(3, 4), V(5, 4)]; });
    const M = s.measures; M[0].segno = true; M[0].sectionBar = true; M[1].repeatStart = true; M[2].volta = 1; M[2].repeatEnd = true;
    M[3].volta = 2; M[3].coda = true; M[3].ds = true; M[4].coda = true; M[4].fine = true;
    loadSong(s); window.T3S = JSON.stringify(s); const xml = exportMusicXML(song); const m = i => meaXml(xml, 'P1', i);
    return { m0: /<segno\/>/.test(m(0)) && /sound segno=/.test(m(0)) && /<bar-style>light-light<\/bar-style>/.test(m(0)),
      m1: /location="left"><bar-style>heavy-light<\/bar-style><repeat direction="forward"\/>/.test(m(1)),
      m2: /location="left"><ending number="1" type="start"\/>/.test(m(2)) && /location="right"><bar-style>light-heavy<\/bar-style><ending number="1" type="stop"\/><repeat direction="backward"\/>/.test(m(2)),
      m3: /<ending number="2" type="start"\/>/.test(m(3)) && /<ending number="2" type="discontinue"\/>/.test(m(3)) && /<coda\/>/.test(m(3)) && /sound tocoda=/.test(m(3)) && /<words>D\.S\.<\/words>/.test(m(3)) && /sound dalsegno=/.test(m(3)),
      m4: /<coda\/>/.test(m(4)) && /sound coda="coda"/.test(m(4)) && /<words>Fine<\/words>/.test(m(4)) && /sound fine=/.test(m(4)) && /location="right"><bar-style>light-heavy<\/bar-style><\/barline>/.test(m(4)),
      dsPos: m(3).indexOf('<words>D.S.') > m(3).lastIndexOf('<note>') }; });
  T(!r.err && r.m0 && r.m1 && r.m2 && r.m3 && r.m4 && r.dsPos, 'T3 结构导出：房子/𝄋/⊕/D.S./Fine/段落线/终止线', JSON.stringify(r));

  /* T4 */
  r = await EV(() => { const s0 = JSON.parse(window.T3S); loadSong(JSON.parse(window.T3S)); audio.loop = null; const o0 = buildPlayOrder(0).join(','); const f0 = flags(song);
    const res = importMusicXML(exportMusicXML(song)); if (!res.song) return { err: res.error };
    loadSong(res.song); audio.loop = null; const o1 = buildPlayOrder(0).join(','); const f1 = flags(song);
    return { f0, f1, o0, o1, n: res.song.measures.length, sk: res.skip.other + res.skip.slurs + res.skip.notes }; });
  T(!r.err && r.f0 === r.f1 && r.o0 === r.o1 && r.n === 5 && r.sk === 0 && /v1/.test(r.f0) && /sg/.test(r.f0), 'T4 结构往返：字段全同、播放顺序相同', JSON.stringify(r));

  /* T5 */
  r = await EV(() => { const xml = MX([{ id: 'P1', measures: [
      N('C', 4) + '<direction placement="above"><direction-type><words>Fine</words></direction-type><sound fine="yes"/></direction>',
      '<barline location="left"><ending number="1" type="start"/></barline>' + N('D', 4) + '<barline location="right"><bar-style>light-light</bar-style></barline>',
      N('E', 4) + '<direction placement="above"><direction-type><words>D.C. al Fine</words></direction-type><sound dacapo="yes"/></direction><barline location="right"><bar-style>light-heavy</bar-style><ending number="1" type="stop"/><repeat direction="backward"/></barline>'] }]);
    const res = importMusicXML(xml); if (!res.song) return { err: res.error }; const M = res.song.measures;
    return { f: flags(res.song), term: res.song.tempoTerm || '', fb: !!M[2].finalBar }; });
  T(!r.err && r.f === 'fi|v1,sb|v1,dc,rE' && r.term === '' && !r.fb, 'T5 第三方写法：D.C. al Fine / Fine / ending 跨小节 / light-light', JSON.stringify(r));

  /* T6 */
  r = await EV(() => { const s = createSong('vocal', { title: '和弦', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 0 });
    const ch = ['Am7', 'G7sus4', 'C69', 'F#m7b5', 'Bb7b9', 'Dmaj7#11'];
    s.measures[0].voxes[0] = [V(1, 4, { chord: ch[0] }), V(2, 4, { chord: ch[1] }), V(3, 4, { chord: ch[2] }), V(5, 4, { chord: ch[3] })];
    s.measures[1].voxes[0] = [V(1, 4, { chord: ch[4] }), V(2, 4, { chord: ch[5] }), V(3, 4), V(5, 4)];
    loadSong(s); const xml = exportMusicXML(song); const d = new DOMParser().parseFromString(xml, 'application/xml');
    return [...d.querySelectorAll('harmony')].map(h => { const k = h.querySelector('kind'); const ra = h.querySelector('root-alter');
      return (ra ? ra.textContent : '0') + ':' + k.textContent + '[' + k.getAttribute('text') + ']' + [...h.querySelectorAll('degree')].map(g => g.querySelector('degree-value').textContent + '/' + g.querySelector('degree-alter').textContent + '/' + g.querySelector('degree-type').textContent).join(';'); }).join(' '); });
  T(!r.err && r === '0:minor-seventh[m7] 0:suspended-fourth[7sus4]7/-1/add 0:major-sixth[69]9/0/add 1:half-diminished[m7b5] -1:dominant[7b9]9/-1/add 0:major-seventh[maj7#11]11/1/add', 'T6 和弦类型导出 kind + degree', JSON.stringify(r));

  /* T7 */
  r = await EV(() => { const H = (root, kind, degs, text) => `<harmony><root><root-step>${root}</root-step></root><kind${text != null ? ` text="${text}"` : ''}>${kind}</kind>` +
      (degs || []).map(([v, a, t]) => `<degree><degree-value>${v}</degree-value><degree-alter>${a}</degree-alter><degree-type>${t}</degree-type></degree>`).join('') + '</harmony>';
    const xml = MX([{ id: 'P1', measures: [H('F', 'half-diminished') + N('C', 4) + H('G', 'dominant', [[9, -1, 'add']]) + N('D', 4) + H('G', 'suspended-fourth', [[7, -1, 'add']]) + N('E', 4) + H('C', 'major-sixth', [[9, 0, 'add']]) + N('F', 4),
      H('E', 'augmented-seventh') + N('C', 4) + H('A', 'minor-seventh', null, 'min7') + N('D', 4) + H('C', 'major') + N('E', 4) + H('D', 'dominant', [[5, -1, 'alter']]) + N('F', 4)] }]);
    const res = importMusicXML(xml); if (!res.song) return { err: res.error };
    return res.song.measures.map(m => m.voxes[0].map(c => c.chord || '-').join(' ')).join('|'); });
  T(!r.err && r === 'Fm7b5 G7b9 G7sus4 C69|Eaug7 Amin7 C D7b5', 'T7 和弦类型导入（无 text 走 kind+degree，有 text 以 text 为准）', JSON.stringify(r));

  /* T8 */
  r = await EV(() => { const mk = (id, name) => ({ id, name, measures: [N('C', 4) + N('D', 4) + N('E', 4) + N('F', 4)] });
    const p1 = { id: 'P1', name: '女高', measures: [N('C', 4, '', '') + N('D', 4) + N('E', 4, '<lyric number="6"><text>六</text></lyric>') + N('F', 4) +
      '<backup><duration>16</duration></backup>' + N('A', 3).replace('<voice>1</voice>', '<voice>2</voice>') + N('G', 3).replace('<voice>1</voice>', '<voice>2</voice>')] };
    const xml = MX([p1, mk('P2', '女低'), mk('P3', '男高'), mk('P4', '男低'), mk('P5', '声部5'), mk('P6', '声部6'), mk('P7', '声部7'), mk('P8', '声部8'), mk('P9', '钢琴右手'), mk('P10', '钢琴左手')]);   /* v65.2 上限 8：第 9、10 个被点名 */
    const res = importMusicXML(xml); if (!res.song) return { err: res.error };
    return { nv: res.song.voxVoices.length, parts: res.skip.parts, names: (res.skip.partNames || []).join('/'), voices: res.skip.voices, lyrics: res.skip.lyrics, txt: skipText(res.skip) }; });
  T(!r.err && r.nv === 8 && r.parts === 2 && r.names === '钢琴右手/钢琴左手' && r.voices === 2 && r.lyrics === 1 && /声部 2 个（钢琴右手、钢琴左手）/.test(r.txt) && /第二声部音符 2/.test(r.txt) && /歌词 1/.test(r.txt), 'T8 跳过分项计数 + 文案点名', JSON.stringify(r));

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
