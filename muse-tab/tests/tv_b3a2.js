/* v65.2 B3a 互操作保真（二）（2026-10 评审团 §6.3 B3a ③：P1-19 钢琴/多声部 MusicXML、P2-15 part 上限提示、P2-18 声部上限；D-12 ①）
   T1 钢琴谱导出：一个 score-part、<staves>2、clef number 1/2（G/F）、右手音 <staff>1、左手音 <staff>2 + voice 2、每小节一个 <backup>（右手时值和 384）、右小节线只有一条且在左手之后
   T2 钢琴谱往返：导出只有 1 个 part；导入回 2 个声部（右手/左手、staff/bass）、docType piano、两手音级序列不变、skip.voices/other 为 0
   T3 MuseScore 式钢琴 part（voice 1/5 + backup + 踏板挂 staff 2）：左手 2 个二分音（1/-1、5/-2）、踏板落在左手首列、无跳过
   T4 SATB＋钢琴：6 个声部全保留、钢琴虚拟 part 名「Piano·右手/左手」、voxGroups = bracket 0–3 + brace 4–5、谱类＝五线谱合唱谱
   T5 上限：9 个旋律 part 取 8、第 9 个点名；8 旋律＋8 吉他取到总轨 15（吉他 7）、第 8 条吉他点名
   T6 编辑器同口径：MAX_VOICES=8、MAX_TRACKS=15；8 声部时「＋声部」被拦（文案含 8）、7＋8=15 轨时被拦（文案含 15）、7 声部可加
   突变实证：对 v65.2 之前的文件复跑，T1–T6 全部报红。 */
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
    window.ATTR = (clefs, staves) => '<attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>' +
      (staves ? `<staves>${staves}</staves>` : '') + clefs + '</attributes>';
    window.MX = (parts) => '<?xml version="1.0"?><score-partwise version="4.0"><part-list>' +
      parts.map(p => `<score-part id="${p.id}"><part-name>${p.name || p.id}</part-name></score-part>`).join('') + '</part-list>' +
      parts.map(p => `<part id="${p.id}">` + p.measures.map((m, i) => `<measure number="${i + 1}">` + (i === 0 ? (p.attr || ATTR('<clef><sign>G</sign><line>2</line></clef>')) : '') + m + '</measure>').join('') + '</part>').join('') + '</score-partwise>';
    window.N = (step, oct, o) => { o = o || {}; return `<note><pitch><step>${step}</step><octave>${oct || 4}</octave></pitch><duration>${o.dur || 4}</duration><voice>${o.voice || 1}</voice><type>${o.type || 'quarter'}</type>${o.staff ? `<staff>${o.staff}</staff>` : ''}${o.extra || ''}</note>`; };
    window.seqOf = (s, vi) => s.measures.map(m => (m.voxes[vi] || []).map(c => c.deg + '/' + c.oct).join(' ')).join('|');
    window.cnt = (str, re) => (str.match(re) || []).length;
  });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = f => pg.evaluate(f).catch(e => ({ err: e.message }));

  /* T1 */
  let r = await EV(() => { const s = createSong('piano', { title: '大谱表', key: 'C', beats: 4, unit: 4, nMea: 2, lyr: 0 });
    s.measures.forEach(m => { m.voxes[0] = [V(1, 4), V(2, 4), V(3, 4), V(5, 4)]; m.voxes[1] = [V(1, 2, { oct: -1 }), V(5, 2, { oct: -2 })]; });
    loadSong(s); window.T1S = JSON.stringify(s); const xml = exportMusicXML(song); window.T1X = xml;
    const m2 = xml.split('<measure number="2">')[1] || '';
    return { sp: cnt(xml, /<score-part /g), parts: cnt(xml, /<part id=/g), staves: /<staves>2<\/staves>/.test(xml), c1: /<clef number="1"><sign>G<\/sign>/.test(xml), c2: /<clef number="2"><sign>F<\/sign>/.test(xml),
      st1: cnt(xml, /<staff>1<\/staff>/g), st2: cnt(xml, /<staff>2<\/staff>/g), v2: cnt(xml, /<voice>2<\/voice>/g), bk: cnt(xml, /<backup><duration>384<\/duration><\/backup>/g),
      rb: cnt(m2, /<barline location="right"/g), rbLast: /<\/barline><\/measure><\/part>/.test(xml), pn: (xml.match(/<part-name>([^<]*)</) || [])[1] }; });
  T(!r.err && r.sp === 1 && r.parts === 1 && r.staves && r.c1 && r.c2 && r.st1 === 8 && r.st2 === 4 && r.v2 === 4 && r.bk === 2 && r.rb === 1 && r.rbLast && r.pn === '钢琴', 'T1 钢琴谱导出为一个 part 两个谱表', JSON.stringify(r));

  /* T2 */
  r = await EV(() => { const s0 = JSON.parse(window.T1S); const res = importMusicXML(window.T1X); if (!res.song) return { err: res.error }; const s1 = res.song;
    return { nv: s1.voxVoices.length, names: s1.voxVoices.join('/'), nt: (s1.voxNotations || []).join('/'), dt: docType(s1), same0: seqOf(s0, 0) === seqOf(s1, 0), same1: seqOf(s0, 1) === seqOf(s1, 1), sk: res.skip.voices + res.skip.other + res.skip.notes + res.skip.parts, parts: cnt(window.T1X, /<part id=/g) }; });
  T(!r.err && r.nv === 2 && r.names === '右手/左手' && r.nt === 'staff/bass' && r.dt === 'piano' && r.same0 && r.same1 && r.sk === 0 && r.parts === 1, 'T2 钢琴谱往返：两手都在、钢琴谱类、零跳过', JSON.stringify(r));

  /* T3 */
  r = await EV(() => { const attr = ATTR('<clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef>', 2);
    const m = N('C', 4, { staff: 1 }) + N('D', 4, { staff: 1 }) + N('E', 4, { staff: 1 }) + N('F', 4, { staff: 1 }) + '<backup><duration>16</duration></backup>' +
      '<direction placement="below"><direction-type><pedal type="start"/></direction-type><staff>2</staff></direction>' +
      N('C', 3, { staff: 2, voice: 5, dur: 8, type: 'half' }) + N('G', 2, { staff: 2, voice: 5, dur: 8, type: 'half' });
    const res = importMusicXML(MX([{ id: 'P1', name: 'Piano', attr, measures: [m, m] }])); if (!res.song) return { err: res.error }; const s1 = res.song;
    return { nv: s1.voxVoices.length, names: s1.voxVoices.join('/'), nt: (s1.voxNotations || []).join('/'), rh: seqOf(s1, 0), lh: seqOf(s1, 1), ped: s1.measures[0].voxes[1][0].ped, pedR: s1.measures[0].voxes[0][0].ped || '', sk: res.skip.voices + res.skip.other + res.skip.notes, dt: docType(s1) }; });
  T(!r.err && r.nv === 2 && r.names === '右手/左手' && r.nt === 'staff/bass' && r.rh === '1/0 2/0 3/0 4/0|1/0 2/0 3/0 4/0' && r.lh === '1/-1 5/-2|1/-1 5/-2' && r.ped === 'on' && r.pedR === '' && r.sk === 0 && r.dt === 'piano', 'T3 MuseScore 式 staves/voice 5/backup/踏板 staff 2', JSON.stringify(r));

  /* T4 */
  r = await EV(() => { const attrP = ATTR('<clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef>', 2);
    const mel = (ly) => N('C', 4, { extra: ly ? '<lyric number="1"><syllabic>single</syllabic><text>啊</text></lyric>' : '' }) + N('D', 4) + N('E', 4) + N('F', 4);
    const pm = N('E', 5, { staff: 1 }) + N('G', 5, { staff: 1, dur: 12, type: 'half', extra: '<dot/>' }) + '<backup><duration>16</duration></backup>' + N('C', 3, { staff: 2, voice: 5, dur: 16, type: 'whole' });
    const xml = MX([{ id: 'P1', name: 'Soprano', measures: [mel(true)] }, { id: 'P2', name: 'Alto', measures: [mel()] }, { id: 'P3', name: 'Tenor', measures: [mel()] },
      { id: 'P4', name: 'Bass', attr: ATTR('<clef><sign>F</sign><line>4</line></clef>'), measures: [mel()] }, { id: 'P5', name: 'Piano', attr: attrP, measures: [pm] }]);
    const res = importMusicXML(xml); if (!res.song) return { err: res.error }; const s1 = res.song;
    return { nv: s1.voxVoices.length, names: s1.voxVoices.join('/'), nt: (s1.voxNotations || []).join('/'), groups: JSON.stringify(s1.voxGroups), gOf: JSON.stringify(voxGroupsOf(s1)), label: docTypeLabel(s1), parts: res.skip.parts, lh: seqOf(s1, 5), rh: seqOf(s1, 4) }; });
  T(!r.err && r.nv === 6 && r.names === 'Soprano/Alto/Tenor/Bass/Piano·右手/Piano·左手' && r.nt === 'staff/staff/staff/bass/staff/bass' && r.groups === '[{"type":"bracket","from":0,"to":3},{"type":"brace","from":4,"to":5}]' && r.label === '五线谱合唱谱' && r.parts === 0 && r.lh === '1/-1' && r.rh === '3/1 5/1',
    'T4 SATB＋钢琴：6 声部、括线分组、合唱谱类', JSON.stringify(r));

  /* T5 */
  r = await EV(() => { const mel = () => N('C', 4) + N('D', 4) + N('E', 4) + N('F', 4);
    const vox = Array.from({ length: 9 }, (_, i) => ({ id: 'V' + (i + 1), name: '声部' + (i + 1), measures: [mel()] }));
    const r1 = importMusicXML(MX(vox)); if (!r1.song) return { err: r1.error };
    const tabAttr = ATTR('<staff-details><staff-lines>6</staff-lines></staff-details><clef><sign>TAB</sign><line>5</line></clef>');
    const tn = () => `<note><pitch><step>E</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice><type>whole</type><notations><technical><string>1</string><fret>0</fret></technical></notations></note>`;
    const tabs = Array.from({ length: 8 }, (_, i) => ({ id: 'T' + (i + 1), name: '吉他' + (i + 1), attr: tabAttr, measures: [tn()] }));
    const r2 = importMusicXML(MX(vox.slice(0, 8).concat(tabs))); if (!r2.song) return { err: r2.error };
    return { a: { nv: r1.song.voxVoices.length, parts: r1.skip.parts, names: r1.skip.partNames.join('/') }, b: { nv: r2.song.voxVoices.length, nt: r2.song.tabVoices.length, parts: r2.skip.parts, names: r2.skip.partNames.join('/') } }; });
  T(!r.err && r.a.nv === 8 && r.a.parts === 1 && r.a.names === '声部9' && r.b.nv === 8 && r.b.nt === 7 && r.b.parts === 1 && r.b.names === '吉他8', 'T5 导入上限：旋律 8、总轨 15，超出点名', JSON.stringify(r));

  /* T6 */
  r = await EV(() => { const ts = []; const t0 = window.toast; window.toast = m => ts.push(String(m));
    try {
      const s = createSong('vocal', { title: '上限', key: 'C', beats: 4, unit: 4, nMea: 1, nVox: 8, lyr: 0 }); loadSong(s); addVoice('vox'); const n8 = song.voxVoices.length; const m8 = ts[ts.length - 1] || '';
      const s2 = createSong('guitar', { title: '上限2', key: 'C', beats: 4, unit: 4, nMea: 1, nVox: 7, nTab: 8, lyr: 0 }); loadSong(s2); ts.length = 0; addVoice('vox'); const n15 = song.voxVoices.length + song.tabVoices.length; const m15 = ts[ts.length - 1] || '';
      const s3 = createSong('vocal', { title: '上限3', key: 'C', beats: 4, unit: 4, nMea: 1, nVox: 7, lyr: 0 }); loadSong(s3); addVoice('vox'); const n7 = song.voxVoices.length;
      return { MV: MAX_VOICES, MT: MAX_TRACKS, room: typeof trackRoom, n8, m8, n15, m15, n7 };
    } finally { window.toast = t0; } });
  T(!r.err && r.MV === 8 && r.MT === 15 && r.room === 'function' && r.n8 === 8 && /8/.test(r.m8) && r.n15 === 15 && /15/.test(r.m15) && r.n7 === 8, 'T6 编辑器上限同口径：8 声部 / 15 轨', JSON.stringify(r));

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
