/* B3a ⑨ MusicXML 往返结构覆盖率（2026-10 评审团 §6.3 B3a ⑨：按 fixture × 特性清单逐项计分，目标 ≥90%）
   fixture = 16 首内置预设（PRESETS[i].make()）+ 3 首合成谱（结构导航 / 大谱表＋合唱 / 移调＋弱起＋2/2）；
   特性清单（present=源谱里有、kept=导出→导入后该特性字段逐项相等）：
     notes(各旋律声部事件级 songCompare=1) tab(弦/品/×) meter key tempo lyrics ties chords tabChords dyn wedge ott ped
     repeats volta nav(𝄋/⊕/D.C./D.S./Fine) bars(段落/终止线) label keyTo clef grace tup dotted artic fing trem gliss
     tabTech(技法/幅度/落点) tabFing(左右手指法/拨片) piano(大谱表配对) pickup transp mode capo tuning voices
   输出 fixture × 特性矩阵（✓ 保留 / ✗ 丢失 / · 源谱无），覆盖率 = ✓ / (✓+✗)。
   T1 总覆盖率 ≥ 0.90；T2 每个 fixture 零跳过（skip 各项为 0）；T3 没有任何特性列全丢（每列至少一处 ✓）；
   T4 第三方 fixture（MuseScore 风格手写：移调 + 弱起 + 大谱表 + 房子）导入后关键字段齐全。
   覆盖率计分表本身即「往返结构覆盖率」定义；负责人供第三方 fixture 后把文件丢进 tests/fixtures/mxl/ 即纳入（T5 自动遍历）。 */
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');
const FIXDIR = path.resolve(__dirname, 'fixtures/mxl');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto('file://' + FILE); await pg.waitForTimeout(1000);
  await pg.evaluate(() => {
    guardReplace = (p) => p(); hideStartPad(); blurSel = true;
    const V = (d, u, o) => Object.assign({ dur: u, dotted: false, deg: d, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    const J = x => JSON.stringify(x === undefined ? null : x);
    const eachVox = (s, f) => s.measures.forEach((m, mi) => (m.voxes || []).forEach((cols, vi) => (cols || []).forEach((c, ci) => f(c, mi, vi, ci))));
    const eachTab = (s, f) => s.measures.forEach((m, mi) => (m.tabs || []).forEach((cols, ti) => (cols || []).forEach((c, ci) => f(c, mi, ti, ci))));
    const voxSig = (s, pick) => { const o = []; eachVox(s, (c, mi, vi, ci) => { const v = pick(c); if (v != null && v !== false && v !== '' && !(Array.isArray(v) && !v.length)) o.push(mi + ':' + vi + ':' + ci + '=' + J(v)); }); return o.join('|'); };
    const tabSig = (s, pick) => { const o = []; eachTab(s, (c, mi, ti, ci) => { const v = pick(c); if (v != null && v !== false && v !== '' && !(Array.isArray(v) && !v.length)) o.push(mi + ':' + ti + ':' + ci + '=' + J(v)); }); return o.join('|'); };
    const meaSig = (s, pick) => s.measures.map((m, mi) => { const v = pick(m); return (v != null && v !== false && v !== '') ? mi + '=' + J(v) : ''; }).filter(Boolean).join('|');
    const has = sig => sig.length > 0;
    const lyr3 = c => (c.lyrics || []).slice(0, 3).map(x => String(x || '').trim()).join('\u0001').replace(/\u0001+$/, '') || null;
    const tkOf = n => n.tk ? [n.tk.mi, n.tk.ci, n.tk.si || n.s] : null;
    /* 特性清单：[名, present(s), kept(a,b)]；默认 kept = 两边签名相等 */
    const S = (name, sigFn) => [name, s => has(sigFn(s)), (a, b2) => sigFn(a) === sigFn(b2)];
    window.FEATURES = [
      ['notes', s => (s.voxVoices || []).length > 0, (a, b2) => (a.voxVoices || []).every((_, vi) => (b2.voxVoices || [])[vi] != null && songCompare(a, b2, vi).score === 1)],
      /* 弹唱谱的 ×（教材式＝弹该弦的和弦音，v57.1）按和弦指法解析成实音后比较：导出写实音品位，导入后教材式视图照样显示 ×（应用内等价写法） */
      ['tab', s => s.measures.some(m => (m.tabs || []).some(cols => (cols || []).some(c => (c.notes || []).length))), (a, b2) => { const sig = s => { const o0 = song; song = s; try { return tabSig(s, c => c); } finally { song = o0; } };
        const res = s => { const o0 = song; song = s; try { const o = []; s.measures.forEach((m, mi) => (m.tabs || []).forEach((cols, ti) => (cols || []).forEach((c, ci) => { const ns = chordImpliedNotes(c, chordShape(chordAtCol(mi, ti, ci)), soloTabCtx(s)); if (ns.length) o.push(mi + ':' + ti + ':' + ci + '=' + ns.filter(n => n && n.s >= 1).map(n => n.s + '/' + (n.x ? 'x' : (n.f | 0))).sort().join(',')); }))); return o.join('|'); } finally { song = o0; } };
        void sig; return res(a) === res(b2); }],
      S('meter', s => [s.beats, s.unit].join('/') + '|' + meaSig(s, m => (m.beats || m.unit) ? [m.beats, m.unit] : null)),
      S('key', s => s.key), S('tempo', s => [s.tempo, tempoUnitOf(s)].join('/')),
      S('lyrics', s => voxSig(s, lyr3)), S('ties', s => voxSig(s, c => !!c.tie)),
      S('chords', s => voxSig(s, c => c.chord)), S('tabChords', s => tabSig(s, c => c.chord)),
      S('dyn', s => voxSig(s, c => (c.dyn && !c.dynTo) ? c.dyn : null)), S('wedge', s => voxSig(s, c => c.dynTo ? [c.dyn, c.dynTo.mi, c.dynTo.ci] : null)),
      S('ott', s => voxSig(s, c => c.ott ? [c.ott, c.ottTo && [c.ottTo.mi, c.ottTo.ci]] : null)), S('ped', s => voxSig(s, c => c.ped)),
      S('repeats', s => meaSig(s, m => (m.repeatStart || m.repeatEnd) ? [!!m.repeatStart, !!m.repeatEnd] : null)),
      S('volta', s => meaSig(s, m => m.volta)), S('nav', s => meaSig(s, m => (m.segno || m.coda || m.dc || m.ds || m.fine) ? [!!m.segno, !!m.coda, !!m.dc, !!m.ds, !!m.fine] : null)),
      S('bars', s => meaSig(s, m => (m.sectionBar || (m.finalBar && m !== s.measures[s.measures.length - 1])) ? [!!m.sectionBar, !!m.finalBar] : null)),   /* 末小节终止线本就必画 */
      S('label', s => meaSig(s, m => m.label)), S('keyTo', s => meaSig(s, m => m.keyTo)),
      S('clef', s => (s.voxVoices || []).map((_, vi) => (s.voxNotations || [])[vi] || 'jp').join(',') + '|' + (s.voxVoices || []).map((_, vi) => (s.voxDual || [])[vi] ? 1 : 0).join('') + '|' + voxSig(s, c => c.clef)),
      S('grace', s => voxSig(s, c => c.grace ? normGrace(c.grace).notes.map(g => [g.deg, g.oct | 0]) : null)),
      S('tup', s => voxSig(s, c => c.tup ? [(c.tup === 3 && !c.tupM) ? 1 : c.tup, c.tupM || 0] : null)),   /* tup 3 ≡ 旧写法 1 */ S('dotted', s => voxSig(s, c => c.dotted ? (c.dotted === 2 ? 2 : 1) : null)),
      S('artic', s => voxSig(s, c => (c.ferm || c.artic || c.breath) ? [!!c.ferm, c.artic || '', !!c.breath] : null)),
      S('fing', s => voxSig(s, c => c.fing)), S('anno', s => voxSig(s, c => c.anno)), S('trem', s => voxSig(s, c => c.trem)), S('gliss', s => voxSig(s, c => !!c.gliss)),
      S('tabTech', s => tabSig(s, c => (c.notes || []).filter(n => n.tech || n.bar).map(n => [n.s, n.tech || '', (n.tech === 'b' || n.tech === 'bd') ? (n.bAmt || 'full') : '', n.hmT || '', tkOf(n), n.bar || '']))),   /* bAmt 缺省＝full（bendSemi） */
      S('tabFing', s => tabSig(s, c => { const f = (c.notes || []).filter(n => n.lhF || n.rhFing).map(n => [n.s, n.lhF || '', n.rhFing || '']); return (f.length || c.pk) ? [f, c.pk || ''] : null; })),
      S('piano', s => { const g = voxGroupsOf(s).filter(x => x.type === 'brace'); return g.length ? J(g) + '|' + docType(s) : ''; }),
      S('pickup', s => !!s.pickup), S('transp', s => s.transp | 0), S('mode', s => s.mode || ''),
      S('capo', s => (s.capo | 0) + '|' + J(s.tabCapos || null)), S('tuning', s => J(s.tuning || null)),
      S('voices', s => (s.voxVoices || []).length + '/' + (s.tabVoices || []).length),
    ];
    /* 合成 fixture */
    window.SYNTH = [
      ['结构导航', () => { const s = createSong('vocal', { title: '结构', key: 'C', beats: 4, unit: 4, nMea: 6, nVox: 1, lyr: 1 });
        s.measures.forEach((m, mi) => { m.voxes[0] = [V(1, 4, { lyrics: ['一'] }), V(2, 4, { tie: true }), V(3, 4), V(5, 4, { dyn: mi === 0 ? 'mf' : '' })]; });
        const M = s.measures; M[0].segno = true; M[0].label = 'A'; M[1].repeatStart = true; M[2].volta = 1; M[2].repeatEnd = true; M[3].volta = 2; M[3].coda = true; M[3].ds = true; M[3].sectionBar = true; M[4].keyTo = 'G'; M[5].coda = true; M[5].fine = true; M[1].voxes[0][0].dyn = '<'; M[1].voxes[0][0].dynTo = { mi: 1, ci: 3 }; return s; }],
      ['大谱表＋合唱', () => { const s = createSong('vocal', { title: '合唱钢琴', key: 'F', beats: 4, unit: 4, nMea: 2, nVox: 4, lyr: 1 });
        s.voxNotations = ['staff', 'staff', 'staff', 'bass', 'staff', 'bass']; s.voxVoices = ['S', 'A', 'T', 'B', '右手', '左手']; s.voxGroups = [{ type: 'bracket', from: 0, to: 3 }, { type: 'brace', from: 4, to: 5 }];
        s.measures.forEach(m => { m.voxes = [[V(5, 4, { lyrics: ['啊'] }), V(5, 4), V(6, 4), V(5, 4)], [V(3, 4), V(3, 4), V(4, 4), V(3, 4)], [V(1, 4), V(1, 4), V(2, 4), V(1, 4)], [V(1, 4, { oct: -1 }), V(5, 4, { oct: -2 }), V(4, 4, { oct: -2 }), V(1, 4, { oct: -1 })], [V(1, 8, { chord: 'F' }), V(3, 8), V(5, 8), V(3, 8), V(1, 8), V(3, 8), V(5, 8), V(3, 8)], [V(1, 2, { oct: -1, ped: 'on' }), V(5, 2, { oct: -2, ped: 'off' })]]; }); return s; }],
      ['移调弱起2/2', () => { const s = createSong('instr', { title: '小号', key: 'Bb', beats: 2, unit: 2, nMea: 3, nVox: 1, lyr: 0 }); s.pickup = true; s.transp = -2; s.mode = 'major';
        s.measures[0].voxes[0] = [V(5, 4)]; s.measures[1].voxes[0] = [V(1, 2, { tup: 1 }), V(2, 2, { tup: 1 }), V(3, 2, { tup: 1 })]; s.measures[2].voxes[0] = [V(1, 2, { dotted: true }), V(0, 4)]; return s; }],
    ];
    window.runCov = (list) => { const rows = []; const skipAll = [];
      list.forEach(([name, mk]) => { let src; try { src = migrate(mk()); } catch (e) { rows.push({ name, err: String(e.message || e) }); return; }
        const o0 = song; song = src; let xml; try { xml = exportMusicXML(src); } finally { song = o0; }
        if (!xml) { rows.push({ name, err: 'empty' }); return; }
        const res = importMusicXML(xml); if (!res.song) { rows.push({ name, err: res.error }); return; }
        const sk = res.skip; skipAll.push({ name, parts: sk.parts, voices: sk.voices, notes: sk.notes, lyrics: sk.lyrics, slurs: sk.slurs, other: sk.other });
        const cells = FEATURES.map(([f, present, kept]) => { let p = false, k = false; try { p = !!present(src); k = p ? !!kept(src, res.song) : false; } catch (e) { p = true; k = false; } return p ? (k ? '✓' : '✗') : '·'; });
        rows.push({ name, cells }); });
      return { rows, skipAll, names: FEATURES.map(f => f[0]) }; };
  });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };

  const cov = await pg.evaluate(() => { const list = PRESETS.map((p, i) => [p.name, p.make]).concat(SYNTH); return runCov(list); });
  /* 矩阵打印 */
  const W = 14; const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
  console.log(pad('fixture', W) + cov.names.map(n => n.slice(0, 5).padEnd(6)).join(''));
  let kept = 0, lost = 0; const colKept = cov.names.map(() => 0); const lostList = [];
  cov.rows.forEach(r => { if (r.err) { console.log(pad(r.name, W) + 'ERR ' + r.err); return; }
    console.log(pad(r.name, W) + r.cells.map(c => c.padEnd(6)).join(''));
    r.cells.forEach((c, i) => { if (c === '✓') { kept++; colKept[i]++; } else if (c === '✗') { lost++; lostList.push(r.name + '/' + cov.names[i]); } }); });
  const rate = kept / Math.max(1, kept + lost);
  console.log('覆盖率 ' + kept + '/' + (kept + lost) + ' = ' + (rate * 100).toFixed(1) + '%' + (lostList.length ? '；丢失：' + lostList.join('、') : ''));
  T(rate >= 0.9 && !cov.rows.some(r => r.err), 'T1 往返结构覆盖率 ≥ 90%', (rate * 100).toFixed(1) + '%');
  const skipBad = cov.skipAll.filter(s => s.parts || s.voices || s.notes || s.lyrics || s.slurs || s.other);
  T(!skipBad.length, 'T2 每个 fixture 往返零跳过', skipBad.length ? JSON.stringify(skipBad) : '0');
  const dead = cov.names.filter((n, i) => colKept[i] === 0 && cov.rows.some(r => r.cells && r.cells[i] === '✗'));
  T(!dead.length, 'T3 没有整列丢失的特性', dead.join(',') || '无');

  /* T4 第三方风格 fixture（MuseScore 写法）*/
  const r4 = await pg.evaluate(() => { const N = (st, oc, o) => { o = o || {}; return `<note><pitch><step>${st}</step><octave>${oc}</octave></pitch><duration>${o.d || 4}</duration><voice>${o.v || 1}</voice><type>${o.t || 'quarter'}</type>${o.staff ? `<staff>${o.staff}</staff>` : ''}${o.x || ''}</note>`; };
    const attr = (clef, extra) => `<attributes><divisions>4</divisions><key><fifths>-2</fifths><mode>major</mode></key><time><beats>2</beats><beat-type>2</beat-type></time>${extra || ''}${clef}</attributes>`;
    const xml = '<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Trumpet in Bb</part-name></score-part><score-part id="P2"><part-name>Piano</part-name></score-part></part-list>' +
      `<part id="P1"><measure number="0" implicit="yes">${attr('<clef><sign>G</sign><line>2</line></clef>', '<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>')}<direction placement="above"><direction-type><metronome><beat-unit>half</beat-unit><per-minute>60</per-minute></metronome></direction-type><sound tempo="120"/></direction>${N('F', 4)}</measure>` +
      `<measure number="1"><barline location="left"><bar-style>heavy-light</bar-style><repeat direction="forward"/></barline>${N('C', 5, { d: 8, t: 'half' })}${N('D', 5, { d: 8, t: 'half' })}</measure>` +
      `<measure number="2"><barline location="left"><ending number="1" type="start"/></barline>${N('E', 5, { d: 16, t: 'whole' })}<barline location="right"><bar-style>light-heavy</bar-style><ending number="1" type="stop"/><repeat direction="backward"/></barline></measure></part>` +
      `<part id="P2"><measure number="0" implicit="yes">${attr('<clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef>', '<staves>2</staves>')}${N('F', 4, { staff: 1 })}<backup><duration>4</duration></backup>${N('F', 3, { staff: 2, v: 5 })}</measure>` +
      `<measure number="1">${N('C', 5, { staff: 1, d: 16, t: 'whole' })}<backup><duration>16</duration></backup>${N('F', 2, { staff: 2, v: 5, d: 16, t: 'whole' })}</measure><measure number="2">${N('E', 5, { staff: 1, d: 16, t: 'whole' })}<backup><duration>16</duration></backup>${N('C', 3, { staff: 2, v: 5, d: 16, t: 'whole' })}</measure></part></score-partwise>`;
    const res = importMusicXML(xml); if (!res.song) return { err: res.error }; const s = res.song; const M = s.measures;
    return { key: s.key, meter: s.beats + '/' + s.unit, pickup: !!s.pickup, transp: s.transp, tempo: s.tempo + '/' + s.tempoUnit, nv: s.voxVoices.length, names: s.voxVoices.join('/'), groups: JSON.stringify(s.voxGroups || null),
      rS: !!M[1].repeatStart, rE: !!M[2].repeatEnd, volta: M[2].volta, m0: M[0].voxes[0].length, sk: res.skip.other + res.skip.voices + res.skip.notes + res.skip.parts,
      warn: res.warn || '', tp0: M[0].voxes[0][0].deg + (M[0].voxes[0][0].acc || '') }; });
  /* v69.4 A11 有意迁移：小号（移调 -2）＋钢琴（不移调）各 part 移调不一致 → 不再把 -2 写成全曲 song.transp（此前钢琴也被一起移低），
     小号换实音（记谱 F4 → 实音 E♭4＝1=♭B 的 4 级）、调号取钢琴、导入提示「已按实音导入」 */
  T(!r4.err && r4.key === 'Bb' && r4.meter === '2/2' && r4.pickup && r4.transp == null && r4.tp0 === '4' && /已按实音导入/.test(r4.warn) && r4.tempo === '120/q' && r4.nv === 3 && r4.names === 'Trumpet in Bb/Piano·右手/Piano·左手' && r4.rS && r4.rE && r4.volta === 1 && r4.m0 === 1 && r4.sk === 0,
    'T4 MuseScore 风格第三方文件：移调（换实音）+ 弱起 + 2/2 + 大谱表 + 房子', JSON.stringify(r4));

  /* T5 负责人供件：tests/fixtures/mxl/*.musicxml|*.xml 自动遍历（没有文件时跳过并提示） */
  const files = fs.existsSync(FIXDIR) ? fs.readdirSync(FIXDIR).filter(f => /\.(musicxml|xml)$/i.test(f)) : [];
  if (!files.length) console.log('ℹ️ T5 第三方 fixture 目录为空（tests/fixtures/mxl/）：待负责人用 MuseScore/Sibelius/Dorico 导出公版曲目后纳入');
  else {
    const bad = [];
    for (const f of files) { const xml = fs.readFileSync(path.join(FIXDIR, f), 'utf8');
      const r5 = await pg.evaluate((x) => { const a = importMusicXML(x); if (!a.song) return { err: a.error }; const o0 = song; song = a.song; let x2; try { x2 = exportMusicXML(a.song); } finally { song = o0; }
        const b2 = importMusicXML(x2); if (!b2.song) return { err: 'reimport: ' + b2.error }; const sc = (a.song.voxVoices || []).map((_, vi) => songCompare(a.song, b2.song, vi).score); return { skip: a.skip, sc, nMea: a.song.measures.length }; }, xml);
      const ok = !r5.err && r5.sc.every(x => x === 1); console.log((ok ? '  ✓ ' : '  ✗ ') + f + ' ' + JSON.stringify(r5).slice(0, 160)); if (!ok) bad.push(f); }
    T(!bad.length, 'T5 第三方 fixture 导入→导出→导入 音符零丢失', bad.join(',') || files.length + ' 个');
  }

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
