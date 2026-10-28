'use strict';
/* v69.4「纠错一」MusicXML 导入组（五线谱全面复核 T1 / T4 / T5 / T7–T10 / T12 / T13 / T15 / F1 的导入侧）。file:// 直载，真实浏览器；
   曲库断言直接读 deploy/library 的 10 份 OpenScore 源谱（不读 seed，修前副本也能跑），合成样谱在本文件里拼。
   S  拼写（A1）：S1 曲库 10 首源谱与「导入 → 再导出」按 part / 小节 / 音高配对逐音比 step+alter，0 处改拼 · S2 新建五线谱 C / F / G / ♭B / D 调写 ♭2 ♭3 ♭6 ♭7 ♯4，
      导出再导入 deg/acc/oct 不变 · S3 双变音不再错半音（D 大调 F𝄪、F 大调 B𝄫）· S4 倚音、和音附加音按 step 拼 · S5 fifths=-7 → Cb（KEYSIG / 调号 7 降 / 再导出 -7）
   T  速度（A2）：T1 曲库 5 首改正（摇篮曲 75 / 骊歌 80 / 城市 60 / 去会情人 116 / 天鹅之歌 80）、其余 5 首不变 · T2 自家 e / dq 单位往返不变 · T3 合成：首小节 sound、后面 metronome → 取首小节
   O  装饰音与顿强（A3）：O1 圣母颂 m11 逆波音 → orn up · O2 mordent / trill-mark（+wavy-line）/ turn / accidental-mark（上 / 下）/ strong-accent
   D  力度（A4）：D1 fz / ffff / rfz / sffz / n 原样收、导出写回、播放有增益 · D2 other-dynamics（solo → 标注；SMuFL 括号力度 → 文字力度）· D3 真力度＋文字力度同位置不再互相覆盖 ·
      D4 力度＋渐强渐弱同音：力度留本列、楔形从下一列起；只覆盖一个音时回到旧口径 · D5 曲库点名处（城市 m35 f / m38 pp、侏儒 m58 pp、阿特拉斯 m6 / m8 mf、m56 fz）· D6 导入报告列出有损映射
   G  倚音时值（A5）：G1 圣母颂 32 / 16 分、摇篮曲 16 分写进 grace.dur，八分不写 · G2 合成
   L  歌词（A6）：L1 摇篮曲 m11「Gott」· L2 elision 拼接 · L3 5 段词往返、lyricLines 5
   W  文字（A7）：W1 阿特拉斯无「.6」类残片 · W2 自家往返 anno / dyn 各回各位（dolce / cantabile / p＋dolce）· W3 cresc. / dim. + dashes → dynTo（天鹅之歌 13 条、阿特拉斯 crescendo 规范化）·
      W4 自家 cresc.＋dynTo 导出 words＋dashes（不再写 wedge），往返不变 · W5 谱面画出虚线（两套外壳）
   P  声部名与括线（A8）：P1 声部名无换行 · P2 骊歌方括号只括 Women＋Men · P3 合成 SATB 部分括 · P4 花括号单 part 不重复 · P5 骊歌谱名不变
   X  零碎（A9）：X1 backup→p→forward 挂本小节 · X2 第二声部前的 f 挂本小节 · X3 9:8 只印 9、8:7 照印（两套外壳）· X4 拆谱表时 backup/forward 不计入跳过
   M  钢琴音色（A10）：M1 曲库 10 首钢琴行 mixer=piano、人声行不写 · M2 合成（midi-program 1 / Flügelhorn 排除）
   R  移调（A11）：R1 单簧管＋钢琴 → 实音、钢琴调号拼写不动、提示 · R2 钢琴在前 · R3 单簧管独奏 → song.transp=-2 · R4 吉他 octave-change → transp -12 · R5 人声＋八度吉他不换实音
   E  页面脚本错误 0
   env：MUSETAB_URL 被测页（缺省 ../index.html）· ONLY=S,T,… 只跑部分段。 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q;
const ROOT = path.resolve(__dirname, '..', '..');
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const want = k => !ONLY.length || ONLY.includes(k);
const J = x => JSON.stringify(x);
let pass = 0, total = 0; const fails = [], errs = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (!ok && d != null ? '：' + String(d).slice(0, 1400) : '')); };

/* ---------- 曲库源谱 ---------- */
const MAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'deploy', 'library', 'manifest.json'), 'utf8'));
const SRC = {}; MAN.items.forEach(it => { SRC[it.id] = fs.readFileSync(path.join(ROOT, 'deploy', 'library', it.file), 'utf8'); });
const ID = { ave: 'lib-os-lc6389103', wieg: 'lib-os-lc5701612', aloha: 'lib-os-lc6650166', atlas: 'lib-os-lc4985985', stadt: 'lib-os-lc4985973',
  zwerg: 'lib-os-lc6838113', schmied: 'lib-os-lc5654485', gang: 'lib-os-lc5705406', marm: 'lib-os-lc6491461', schwan: 'lib-os-lc5100543' };

/* ---------- 合成 MusicXML ---------- */
const SP = p => `<score-part id="${p.id}"><part-name>${p.name || p.id}</part-name>${p.inst ? `<score-instrument id="${p.id}-I1"><instrument-name>${p.inst}</instrument-name></score-instrument>` : ''}${p.prog ? `<midi-instrument id="${p.id}-I1"><midi-program>${p.prog}</midi-program></midi-instrument>` : ''}</score-part>`;
const ATTR = (o = {}) => `<attributes><divisions>${o.div || 1}</divisions><key><fifths>${o.fifths || 0}</fifths></key><time><beats>${o.beats || 4}</beats><beat-type>4</beat-type></time>${o.staves ? `<staves>${o.staves}</staves>` : ''}${o.clef || '<clef><sign>G</sign><line>2</line></clef>'}${o.tr || ''}</attributes>`;
const MX = (parts, o = {}) => `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><identification><encoding><software>${o.sw || 'MuseScore 3.6.2'}</software></encoding></identification>` +
  `<part-list>${o.plist || parts.map(SP).join('')}</part-list>` +
  parts.map(p => `<part id="${p.id}">${p.ms.map((m, i) => `<measure number="${i + 1}">${i === 0 ? ATTR(p.attr) : ''}${m}</measure>`).join('')}</part>`).join('') + `</score-partwise>`;
const N = (step, oct, o = {}) => `<note>${o.grace ? '<grace/>' : ''}${o.chord ? '<chord/>' : ''}<pitch><step>${step}</step>${o.alter ? `<alter>${o.alter}</alter>` : ''}<octave>${oct}</octave></pitch>` +
  `${o.grace ? '' : `<duration>${o.d || 1}</duration>`}<voice>${o.v || 1}</voice><type>${o.type || 'quarter'}</type>${o.staff ? `<staff>${o.staff}</staff>` : ''}${o.not ? `<notations>${o.not}</notations>` : ''}${o.lyr || ''}</note>`;
const R = (d = 1, o = {}) => `<note><rest/><duration>${d}</duration><voice>${o.v || 1}</voice>${o.staff ? `<staff>${o.staff}</staff>` : ''}</note>`;
const DIR = (inner, o = {}) => `<direction>${inner}${o.off != null ? `<offset>${o.off}</offset>` : ''}${o.staff ? `<staff>${o.staff}</staff>` : ''}${o.snd || ''}</direction>`;
const DT = x => `<direction-type>${x}</direction-type>`;
const DYN = d => DT(`<dynamics><${d}/></dynamics>`);
const WORDS = (w, st) => DT(`<words${st ? ' font-style="italic"' : ''}>${w}</words>`);

(async () => {
  const t0 = Date.now();
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const open = async (q) => { const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
    pg.on('pageerror', e => errs.push(String(e && e.message || e)));
    await pg.goto(withQ(URL0, q || 'shell=classic')); await pg.waitForFunction(() => typeof importMusicXML === 'function' && typeof loadSong === 'function');
    await pg.evaluate(() => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} });
    return pg; };
  /* 每次导入后：取歌曲（JSON）与导入结果附带项 */
  const imp = (pg, x) => pg.evaluate(x => { const r = importMusicXML(x); if (!r || r.error) return { err: r && r.error };
    return { song: r.song, warn: r.warn || '', lossy: r.lossy || null, skip: r.skip }; }, x);
  const PG = await open();
  try {
    /* ================= S 拼写 ================= */
    if (want('S')) {
      /* S1 曲库 10 首：每首新页面导入 → loadSong → 再导出；按（part 序、小节下标、MIDI）配对比 step+alter 多重集 */
      const bad = [], tot = { n: 0, d: 0 };
      for (const it of MAN.items) {
        const pg = await open();
        const r = await pg.evaluate(x => { const im = importMusicXML(x); loadSong(im.song); const ex = exportMusicXML(song);
          const L = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
          const sp = xs => { const d = new DOMParser().parseFromString(xs, 'application/xml'), M = {};
            d.querySelectorAll('score-partwise > part').forEach(p => [...p.querySelectorAll(':scope > measure')].forEach((m, i) => m.querySelectorAll('note').forEach(n => {
              const pe = n.querySelector('pitch'); if (!pe) return; const st = pe.querySelector('step').textContent, al = +((pe.querySelector('alter') || {}).textContent || 0);
              const k = i + ':' + ((+pe.querySelector('octave').textContent + 1) * 12 + L[st] + al) + (n.querySelector('grace') ? 'g' : ''); (M[k] = M[k] || []).push(st + al); }))); return M; };
          const A = sp(x), B = sp(ex); let n = 0, d = 0; const ex2 = [];
          Object.keys(A).forEach(k => { const c = {}; A[k].forEach(v => { c[v] = (c[v] || 0) + 1; n++; }); (B[k] || []).forEach(v => { if (c[v]) c[v]--; });
            const left = Object.values(c).reduce((s, v) => s + v, 0); d += left; if (left && ex2.length < 4) ex2.push(k + ' ' + A[k].join('/') + '→' + (B[k] || []).join('/')); });
          return { n, d, ex2 }; }, SRC[it.id]);
        await pg.close();
        tot.n += r.n; tot.d += r.d; if (r.d) bad.push([it.id, r.d, r.ex2]);
      }
      T(!bad.length && tot.n > 8000, 'S1 曲库 10 首源谱与再导出逐音同拼写（' + tot.n + ' 个音含倚音，改拼 ' + tot.d + '）', J(bad));
      /* S2 新建五线谱：五个调各写 ♭2 ♭3 ♭6 ♭7 ♯4 ♯1，导出再导入 deg/acc/oct 不变 */
      const r2 = await PG.evaluate(() => { const V = (deg, acc, oct) => ({ dur: 4, dotted: false, deg, acc, oct, lyrics: [], tie: false }); const out = {};
        ['C', 'F', 'G', 'Bb', 'D'].forEach(k => { const s = createSong('instr', { title: 'x', key: k, beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 0, clef: 'staff' });
          s.measures[0].voxes[0] = [V(2, 'b', 0), V(3, 'b', 0), V(6, 'b', 0), V(7, 'b', 0)];
          s.measures[1].voxes[0] = [V(4, '#', 0), V(1, '#', 1), V(5, '#', 0), V(7, '', -1)];
          const want = J(s.measures.map(m => m.voxes[0].map(c => [c.deg, c.acc, c.oct])));
          const r = importMusicXML(exportMusicXML(s)); const got = J(r.song.measures.map(m => m.voxes[0].map(c => [c.deg, c.acc || '', c.oct || 0])));
          out[k] = want === got ? 'ok' : got; }); return out; function J(x) { return JSON.stringify(x); } });
      T(Object.values(r2).every(v => v === 'ok'), 'S2 新建五线谱 C/F/G/♭B/D 调 ♭2 ♭3 ♭6 ♭7 ♯4 ♯1 往返 deg/acc/oct 不变', J(r2));
      /* S3 双变音：D 大调 F𝄪4（MIDI 67）、F 大调 B𝄫4（MIDI 69）——导入后 MIDI 与 step/alter 都对 */
      const x3 = fifths => MX([{ id: 'P1', attr: { fifths }, ms: [fifths === 2 ? N('F', 4, { alter: 2 }) + N('D', 4) + N('E', 4) + N('D', 4) : N('B', 4, { alter: -2 }) + N('F', 4) + N('G', 4) + N('A', 4)] }]);
      const r3 = await PG.evaluate(([a, c]) => { const one = x => { const s = importMusicXML(x).song, c0 = s.measures[0].voxes[0][0];
          const xm = exportMusicXML(s), d = new DOMParser().parseFromString(xm, 'application/xml'), pe = d.querySelector('note pitch');
          return { deg: c0.deg, acc: c0.acc, midi: keyRefOf(s.key, 0) + DEG_SEMI[c0.deg] + accSemi(c0.acc) + 12 * (c0.oct || 0), st: pe.querySelector('step').textContent, al: +((pe.querySelector('alter') || {}).textContent || 0) }; };
        return [one(a), one(c)]; }, [x3(2), x3(-1)]);
      T(r3[0].midi === 67 && r3[0].st === 'F' && r3[0].al === 2 && r3[0].deg === 3 && r3[0].acc === '#' && r3[1].midi === 69 && r3[1].st === 'B' && r3[1].al === -2 && r3[1].deg === 4 && r3[1].acc === 'b',
        'S3 双变音音高不再错半音：D 大调 F𝄪4＝3♯（MIDI 67）、F 大调 B𝄫4＝4♭（MIDI 69），再导出 step/alter 同源', J(r3));
      /* S4 倚音、和音附加音：C 大调 B♭ 倚音 → 7♭；E♭ 和音附加音 → 3♭（此前 ♯6 / ♯2） */
      const x4 = MX([{ id: 'P1', ms: [N('B', 4, { alter: -1, grace: true, type: 'eighth' }) + N('C', 5) + N('C', 4, { d: 1 }) + N('E', 4, { alter: -1, chord: true }) + N('G', 4) + N('A', 4, { alter: -1 })] }]);
      const r4 = await imp(PG, x4); const c4 = r4.song.measures[0].voxes[0];
      T(c4[0].grace && c4[0].grace.notes[0].deg === 7 && c4[0].grace.notes[0].acc === 'b' && c4[1].adds && c4[1].adds[0].deg === 3 && c4[1].adds[0].acc === 'b' && c4[3].deg === 6 && c4[3].acc === 'b',
        'S4 倚音 B♭＝♭7、和音附加音 E♭＝♭3、A♭＝♭6（按 step 拼）', J(c4.map(c => [c.deg, c.acc, c.grace, c.adds])));
      /* S5 fifths=-7：key Cb、调号 7 降、Cb4＝1、再导出 fifths -7 / C♭ */
      const x5 = MX([{ id: 'P1', attr: { fifths: -7 }, ms: [N('C', 4, { alter: -1 }) + N('D', 4, { alter: -1 }) + N('E', 4, { alter: -1 }) + N('F', 4, { alter: -1 })] }]);
      const r5 = await PG.evaluate(x => { const s = importMusicXML(x).song; const xm = exportMusicXML(s), d = new DOMParser().parseFromString(xm, 'application/xml');
        const K = staffKeyInfoOf(s.key, s.key);
        return { key: s.key, sig: sigOf(s.key), nAlt: Object.keys(K.alt).length, degs: s.measures[0].voxes[0].map(c => c.deg + (c.acc || '')).join(','), f: d.querySelector('key fifths').textContent,
          p0: d.querySelector('note pitch step').textContent + (d.querySelector('note pitch alter') || {}).textContent, lbl: keyLabel(s.key) }; }, x5);
      T(r5.key === 'Cb' && r5.sig === -7 && r5.nAlt === 7 && r5.degs === '1,2,3,4' && r5.f === '-7' && r5.p0 === 'C-1' && r5.lbl === '♭C', 'S5 fifths=-7 → 1=♭C（7 个降号，再导出 fifths -7、C♭4）', J(r5));
    }

    /* ================= T 速度 ================= */
    if (want('T')) {
      const ids = Object.values(ID); const tp = {};
      for (const id of ids) { const r = await imp(PG, SRC[id]); tp[id] = [r.song.tempo, r.song.tempoUnit || 'q']; }
      const WANT = { [ID.wieg]: 75, [ID.aloha]: 80, [ID.stadt]: 60, [ID.gang]: 116, [ID.schwan]: 80, [ID.ave]: 44, [ID.atlas]: 90, [ID.zwerg]: 114, [ID.schmied]: 144, [ID.marm]: 110 };
      const badT = ids.filter(id => tp[id][0] !== WANT[id] || tp[id][1] !== 'q');
      T(!badT.length, 'T1 起始速度：摇篮曲 75 · 骊歌 80 · 城市 60 · 去会情人 116 · 天鹅之歌 80（此前 70/78/45/125/74），其余 5 首不变', J(badT.map(id => [id, tp[id], WANT[id]])));
      const r2 = await PG.evaluate(() => { const o = {}; [['e', 132, 6, 8], ['dq', 60, 6, 8], ['q', 96, 3, 4]].forEach(([u, t, bt, un]) => {
        const s = createSong('instr', { title: 'x', key: 'C', beats: bt, unit: un, nMea: 1, nVox: 1, lyr: 0, clef: 'staff' }); s.tempo = t; s.tempoUnit = u;
        const r = importMusicXML(exportMusicXML(s)).song; o[u] = [r.tempo, r.tempoUnit || 'q']; }); return o; });
      T(J(r2) === J({ e: [132, 'e'], dq: [60, 'dq'], q: [96, 'q'] }), 'T2 自家导出的 ♪=132 / ♩.=60 / ♩=96 往返单位与数值不变', J(r2));
      const x3 = MX([{ id: 'P1', ms: [DIR(WORDS('Andante'), { snd: '<sound tempo="66"/>' }) + N('C', 4, { d: 4, type: 'whole' }), N('C', 4, { d: 4, type: 'whole' }),
        DIR(DT('<metronome><beat-unit>quarter</beat-unit><per-minute>40</per-minute></metronome>'), { snd: '<sound tempo="40"/>' }) + N('C', 4, { d: 4, type: 'whole' })] },
        { id: 'P2', ms: [N('C', 3, { d: 4, type: 'whole' }), DIR(DT('<metronome><beat-unit>quarter</beat-unit><per-minute>50</per-minute></metronome>')) + N('C', 3, { d: 4, type: 'whole' }), N('C', 3, { d: 4, type: 'whole' })] }]);
      const r3 = await imp(PG, x3);
      T(r3.song.tempo === 66 && r3.song.tempoTerm === 'Andante', 'T3 合成：首小节只有 sound tempo、后面小节才有 metronome（含别的 part）→ 取首小节 66', J([r3.song.tempo, r3.song.tempoTerm]));
    }

    /* ================= O 装饰音 / 顿强 ================= */
    if (want('O')) {
      const r1 = await imp(PG, SRC[ID.ave]); const hits = [];
      r1.song.measures.forEach((m, mi) => (m.voxes[0] || []).forEach((c, ci) => { if (c.orn) hits.push([mi, ci, c.orn]); }));
      T(hits.length === 1 && hits[0][0] === 10 && hits[0][2] === 'up', 'O1 圣母颂人声 m11（下标 10，无弱起）逆波音 inverted-mordent → 上波音 orn:up（此前丢）', J(hits));
      const OR = x => `<ornaments>${x}</ornaments>`;
      const x2 = MX([{ id: 'P1', attr: { fifths: -1 }, ms: [
        N('A', 4, { not: OR('<inverted-mordent/><accidental-mark placement="above">natural</accidental-mark>') }) +
        N('G', 4, { not: OR('<mordent/><accidental-mark placement="below">sharp</accidental-mark>') }) +
        N('C', 5, { not: OR('<trill-mark/><wavy-line type="start"/>') }) +
        N('D', 5, { not: OR('<turn/>') + '<articulations><strong-accent type="up"/></articulations>' })] }]);
      const r2 = await imp(PG, x2); const c2 = r2.song.measures[0].voxes[0].map(c => [c.orn, c.ornAcc || '', c.ornAccLo || '', c.artic || '']);
      T(J(c2) === J([['up', '#', '', ''], ['down', '', '#', ''], ['tr', '', '', ''], ['turn', '', '', 'marcato']]),
        'O2 mordent→down · inverted-mordent→up · trill-mark（wavy-line 不读）→tr · turn→turn · accidental-mark 上 / 下 → ornAcc / ornAccLo（F 调 B♮＝♯、F♯＝♯）· strong-accent→marcato', J(c2));
    }

    /* ================= D 力度 ================= */
    if (want('D')) {
      const x1 = MX([{ id: 'P1', ms: [DIR(DYN('fz')) + N('C', 4) + DIR(DYN('ffff')) + N('D', 4) + DIR(DYN('rfz')) + N('E', 4) + DIR(DYN('sffz')) + N('F', 4),
        DIR(DYN('pppp')) + N('C', 4) + DIR(DYN('n')) + N('D', 4) + DIR(DYN('sfzp')) + N('E', 4) + DIR(DYN('fff')) + N('F', 4)] }]);
      const r1 = await PG.evaluate(x => { const s = importMusicXML(x).song; const d = s.measures.flatMap(m => m.voxes[0].map(c => c.dyn));
        const xm = exportMusicXML(s); return { d, xml: d.map(v => xm.includes('<dynamics><' + v + '/></dynamics>')), gain: d.map(v => DYN_GAIN[v] > 0) }; }, x1);
      T(J(r1.d) === J(['fz', 'ffff', 'rfz', 'sffz', 'pppp', 'n', 'sfzp', 'fff']) && r1.xml.every(Boolean) && r1.gain.every(Boolean),
        'D1 fz / ffff / rfz / sffz / pppp / n / sfzp / fff 原样收进 col.dyn、导出写回 <dynamics>、播放 DYN_GAIN 有值（此前前 7 个导入即丢、fff 无增益）', J(r1));
      const x2 = MX([{ id: 'P1', ms: [DIR(DT('<dynamics><other-dynamics> solo</other-dynamics></dynamics>')) + N('C', 4) + DIR(DT('<dynamics><other-dynamics>()</other-dynamics></dynamics>')) + N('D', 4) +
        DIR(DT('<dynamics><other-dynamics>( )</other-dynamics></dynamics>')) + N('E', 4) + N('F', 4)] }]);
      const r2 = await imp(PG, x2); const c2 = r2.song.measures[0].voxes[0];
      T(c2[0].anno === 'solo' && !c2[0].dyn && c2[1].dyn === '(pp)' && !c2[2].anno && !c2[2].dyn, 'D2 other-dynamics：「solo」→ 标注、SMuFL 括号力度「(pp)」→ 文字力度、只有括号的丢弃', J(c2.map(c => [c.dyn, c.anno])));
      const x3 = MX([{ id: 'P1', ms: [DIR(DYN('f')) + DIR(WORDS('dim.')) + N('C', 4) + DIR(WORDS('cresc.')) + DIR(DYN('pp')) + N('D', 4) + DIR(DT('<dynamics><p/></dynamics>') + WORDS('dolce')) + N('E', 4) + N('F', 4)] }]);
      const r3 = await imp(PG, x3); const c3 = r3.song.measures[0].voxes[0].map(c => [c.dyn || '', c.anno || '']);
      T(J(c3.slice(0, 3)) === J([['f', 'dim.'], ['pp', 'cresc.'], ['p', 'dolce']]), 'D3 真力度与文字力度同位置：f＋dim. / cresc.＋pp / p＋dolce → 力度留 col.dyn、文字进 anno（此前文字覆盖力度）', J(c3));
      const W = t => DT(`<wedge type="${t}"/>`);
      const x4 = MX([{ id: 'P1', ms: [DIR(DYN('mf')) + DIR(W('crescendo')) + N('C', 4) + N('D', 4) + N('E', 4) + DIR(W('stop')) + N('F', 4),
        DIR(DYN('p')) + DIR(W('diminuendo')) + N('C', 4) + DIR(W('stop')) + N('D', 4) + N('E', 4) + N('F', 4)] }]);
      const r4 = await imp(PG, x4); const m0 = r4.song.measures[0].voxes[0], m1 = r4.song.measures[1].voxes[0];
      T(m0[0].dyn === 'mf' && m0[1].dyn === '<' && J(m0[1].dynTo) === J({ mi: 0, ci: 2 }) && m1[0].dyn === '>' && !m1[0].dynTo && m1[1].dyn === 'p',
        'D4 力度＋渐强渐弱同音：力度留本列、楔形从下一列起（dynTo 不变）；楔形只覆盖这一个音时回到旧口径（楔形占本列、力度顺延）', J([m0.map(c => [c.dyn, c.dynTo]), m1.map(c => [c.dyn, c.dynTo])]));
      /* D5 曲库点名处 */
      const st = (await imp(PG, SRC[ID.stadt])).song, zw = (await imp(PG, SRC[ID.zwerg])).song, at = (await imp(PG, SRC[ID.atlas])).song;
      const dy = (s, mi, vi) => (s.measures[mi].voxes[vi] || []).map(c => c.dyn).filter(Boolean);
      const d5 = { st35: dy(st, 34, 2), st38: dy(st, 37, 2), zw58: dy(zw, 57, 1), at6: dy(at, 5, 1), at8: dy(at, 7, 1), at56: dy(at, 55, 1).concat(dy(at, 55, 2)), st34: [].concat(dy(st, 33, 0), dy(st, 33, 1), dy(st, 33, 2)) };
      T(d5.st35.includes('f') && d5.st38.includes('pp') && d5.zw58.includes('pp') && d5.at6.includes('mf') && d5.at8.includes('mf') && d5.at56.includes('fz') && d5.st34.includes('ffff'),
        'D5 曲库：城市 m35 左手 f、m38 pp、m34 ffff · 侏儒 m58 右手 pp · 阿特拉斯 m6 / m8 右手 mf、m56 fz 都在', J(d5));
      const r6 = await imp(PG, SRC[ID.zwerg]);
      T(/近似导入/.test(r6.warn) && /其他力度 2 处/.test(r6.warn) && r6.lossy && r6.lossy.odyn === 2, 'D6 导入报告列出有损映射（侏儒：其他力度 2 处按文字记号导入…）', J([r6.warn, r6.lossy]));
    }

    /* ================= G 倚音时值 ================= */
    if (want('G')) {
      const g = s => { const o = []; s.measures.forEach((m, mi) => (m.voxes || []).forEach((r, vi) => (r || []).forEach(c => { if (c.grace) o.push([mi, vi, c.grace.dur || 8, c.grace.notes.length]); }))); return o; };
      const av = g((await imp(PG, SRC[ID.ave])).song), wi = g((await imp(PG, SRC[ID.wieg])).song), mm = g((await imp(PG, SRC[ID.marm])).song);
      T(J(av.map(x => x[2])) === J([32, 32, 16, 16]) && J(wi.map(x => x[2]).sort()) === J([16, 8]) && mm.every(x => x[2] === 8),
        'G1 倚音 <type> → grace.dur：圣母颂 m4 / m8 32 分、m11 / m12 16 分 · 摇篮曲 m17 16 分、m14 八分 · 土拨鼠八分（八分不写 dur）', J({ av, wi, mm }));
      const r2 = await imp(PG, MX([{ id: 'P1', ms: [N('D', 5, { grace: true, type: '16th' }) + N('E', 5, { grace: true, type: '16th' }) + N('C', 5) + N('G', 4, { grace: true, type: 'eighth' }) + N('A', 4) + N('B', 4) + N('C', 5)] }]));
      const c2 = r2.song.measures[0].voxes[0];
      T(c2[0].grace && c2[0].grace.dur === 16 && c2[0].grace.notes.length === 2 && c2[1].grace && c2[1].grace.dur == null, 'G2 合成：两音 16 分倚音组 dur 16、八分倚音不写 dur', J(c2.map(c => c.grace)));
    }

    /* ================= L 歌词 ================= */
    if (want('L')) {
      const s = (await imp(PG, SRC[ID.wieg])).song;
      T((s.measures[11].voxes[0][2].lyrics || [])[0] === 'Gott', 'L1 摇篮曲 m11 第 3 音第 1 段「Gott」（<text> </text><text> Gott</text> 拼接）', J(s.measures[11].voxes[0][2].lyrics));
      const LY = (n, inner) => `<lyric number="${n}">${inner}</lyric>`;
      const x2 = MX([{ id: 'P1', ms: [N('C', 4, { lyr: LY(1, '<syllabic>single</syllabic><text>a</text><elision/><syllabic>single</syllabic><text>e</text>') }) +
        N('D', 4, { lyr: LY(1, '<text>do</text><elision>_</elision><text>re</text>') }) + N('E', 4, { lyr: LY(1, '<text>mi</text><text font-family="X">fa</text>') }) + N('F', 4)] }]);
      const c2 = (await imp(PG, x2)).song.measures[0].voxes[0].map(c => (c.lyrics || [])[0]);
      T(J(c2.slice(0, 3)) === J(['a‿e', 'do_re', 'mifa']), 'L2 elision 拼接：空 elision 补「‿」、有文本用它自己的、换字体的 <text> 直接相连', J(c2));
      const r3 = await PG.evaluate(() => { const s = createSong('vocal', { title: 'x', key: 'C', beats: 4, unit: 4, nMea: 1, nVox: 1, lyr: 5, clef: 'staff' });
        s.lyricLines = 5; s.measures[0].voxes[0].forEach((c, i) => { c.deg = i + 1; c.lyrics = ['一', '二', '三', '四', '五']; });
        const r = importMusicXML(exportMusicXML(s)); return { ll: r.song.lyricLines, l: r.song.measures[0].voxes[0][0].lyrics, sk: r.skip.lyrics }; });
      T(r3.ll === 5 && J(r3.l) === J(['一', '二', '三', '四', '五']) && !r3.sk, 'L3 自家 5 段词往返：5 段都在、lyricLines 5（此前只收 3 段）', J(r3));
    }

    /* ================= W 文字 / 渐变虚线 ================= */
    if (want('W')) {
      const at = (await imp(PG, SRC[ID.atlas])).song; const jk = [];
      at.measures.forEach((m, mi) => (m.voxes || []).forEach(r => (r || []).forEach(c => { if (c.anno && /^[\s.\d]+$/.test(c.anno)) jk.push(mi + ':' + c.anno); })));
      T(!jk.length, 'W1 阿特拉斯 m49–52 节拍器拆写残片「.6 .3 …」不再进标注（9 处）', J(jk));
      const r2 = await PG.evaluate(() => { const V = (deg, o) => Object.assign({ dur: 4, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
        const s = createSong('instr', { title: 'x', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 0, clef: 'staff' });
        s.measures[0].voxes[0] = [V(1), V(2, { anno: 'dolce' }), V(3, { dyn: 'dolce' }), V(4, { dyn: 'p', anno: 'dolce' })];
        s.measures[1].voxes[0] = [V(5, { dyn: 'cantabile' }), V(6, { anno: 'rit.' }), V(7, { dyn: 'rit.' }), V(1, { dyn: 'tacet' })];
        const r = importMusicXML(exportMusicXML(s)).song; return r.measures.flatMap(m => m.voxes[0].map(c => [c.dyn || '', c.anno || ''])); });
      T(J(r2) === J([['', ''], ['', 'dolce'], ['dolce', ''], ['p', 'dolce'], ['cantabile', ''], ['', 'rit.'], ['rit.', ''], ['tacet', '']]),
        'W2 自家往返：标注 dolce / rit. 仍是 anno、力度 dolce / cantabile / rit. / tacet 仍是 dyn、p＋dolce 两个都在', J(r2));
      const sw = (await imp(PG, SRC[ID.schwan])).song, at2 = at; const dsh = [], dshA = [];
      sw.measures.forEach((m, mi) => (m.voxes || []).forEach((r, vi) => (r || []).forEach((c, ci) => { if ((c.dyn === 'cresc.' || c.dyn === 'dim.') && c.dynTo) dsh.push(c.dyn); })));
      at2.measures.forEach((m, mi) => (m.voxes || []).forEach((r, vi) => (r || []).forEach((c, ci) => { if ((c.dyn === 'cresc.' || c.dyn === 'dim.') && c.dynTo) dshA.push(mi + ':' + c.dyn + '>' + c.dynTo.mi); })));
      T(dsh.length === 13 && dshA.length === 3 && dshA.some(x => /^34:cresc\.>36$/.test(x)), 'W3 cresc. / dim. ＋ <dashes> → dynTo：天鹅之歌 13 条、阿特拉斯 3 条（m35「crescendo」规范成 cresc.、延到 m37）', J({ n: dsh.length, dshA }));
      const r4 = await PG.evaluate(() => { const V = (deg, o) => Object.assign({ dur: 4, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
        const s = createSong('instr', { title: 'x', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 0, clef: 'staff' });
        s.measures[0].voxes[0] = [V(1, { dyn: 'cresc.', dynTo: { mi: 1, ci: 1 } }), V(2), V(3), V(4)]; s.measures[1].voxes[0] = [V(5), V(6), V(7, { dyn: '<', dynTo: { mi: 1, ci: 3 } }), V(1)];
        const xm = exportMusicXML(s), r = importMusicXML(xm).song;
        return { dashS: (xm.match(/<dashes type="start"/g) || []).length, dashE: (xm.match(/<dashes type="stop"/g) || []).length, wedgeC: (xm.match(/<wedge type="crescendo"/g) || []).length,
          c0: [r.measures[0].voxes[0][0].dyn, r.measures[0].voxes[0][0].dynTo], c2: [r.measures[1].voxes[0][2].dyn, r.measures[1].voxes[0][2].dynTo] }; });
      T(r4.dashS === 1 && r4.dashE === 1 && r4.wedgeC === 1 && J(r4.c0) === J(['cresc.', { mi: 1, ci: 1 }]) && J(r4.c2) === J(['<', { mi: 1, ci: 3 }]),
        'W4 自家「cresc. - - -」导出 words＋dashes start/stop（不再写成 wedge），往返 dyn / dynTo 不变；楔形照旧写 wedge', J(r4));
      for (const q of ['shell=classic', '']) {
        const pg = await open(q);
        const n = await pg.evaluate(x => { loadSong(importMusicXML(x).song); render(); return document.getElementById('score').querySelectorAll('line[stroke-dasharray="4 3"]').length; }, SRC[ID.schwan]);
        await pg.close();
        T(n >= 13, 'W5 天鹅之歌谱面画出「文字＋虚线」延续线 ' + n + ' 段（' + (q || '新外壳') + '）', n);
      }
    }

    /* ================= P 声部名 / 括线 ================= */
    if (want('P')) {
      const nl = []; for (const id of Object.values(ID)) { const s = (await imp(PG, SRC[id])).song; (s.voxVoices || []).forEach(v => { if (/\s{2,}|\n/.test(v)) nl.push(id + ':' + J(v)); }); }
      T(!nl.length, 'P1 曲库声部名空白归一（「Singstimme\\nVoice」→「Singstimme Voice」）', J(nl));
      const al = (await imp(PG, SRC[ID.aloha])).song;
      T(J(al.voxGroups) === J([{ type: 'bracket', from: 1, to: 2 }, { type: 'brace', from: 3, to: 4 }]), 'P2 骊歌 part-group：方括号只括 Women＋Men（第 1–2 行），独唱 Voice 不括；钢琴花括号照旧', J(al.voxGroups));
      const pl3 = SP({ id: 'P1', name: 'S' }) + '<part-group type="start" number="1"><group-symbol>bracket</group-symbol></part-group>' + SP({ id: 'P2', name: 'A' }) + SP({ id: 'P3', name: 'T' }) +
        '<part-group type="stop" number="1"/>' + SP({ id: 'P4', name: 'B' });
      const ps = id => ({ id, ms: [N('C', 4) + N('D', 4) + N('E', 4) + N('F', 4)] });
      const r3 = (await imp(PG, MX([ps('P1'), ps('P2'), ps('P3'), ps('P4')], { plist: pl3 }))).song;
      const r3b = (await imp(PG, MX([ps('P1'), ps('P2'), ps('P3'), ps('P4')]))).song;
      T(J(r3.voxGroups) === J([{ type: 'bracket', from: 1, to: 2 }]) && r3b.voxGroups === undefined, 'P3 四声部只括中间两行：显式 bracket 1–2；没有 part-group 的同谱仍不写（按推断）', J([r3.voxGroups, r3b.voxGroups]));
      const pl4 = SP({ id: 'P1', name: 'Voice' }) + '<part-group type="start" number="1"><group-symbol>brace</group-symbol></part-group>' + SP({ id: 'P2', name: 'Piano' }) + '<part-group type="stop" number="1"/>';
      const pn = { id: 'P2', attr: { staves: 2, clef: '<clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef>' }, ms: [N('C', 5, { d: 4, type: 'whole', staff: 1 }) + '<backup><duration>4</duration></backup>' + N('C', 3, { d: 4, type: 'whole', staff: 2, v: 5 })] };
      const r4 = (await imp(PG, MX([{ id: 'P1', ms: [N('C', 4, { d: 4, type: 'whole' })] }, pn], { plist: pl4 }))).song;
      T(J(r4.voxGroups) === J([{ type: 'brace', from: 1, to: 2 }]), 'P4 part-group 花括号正好包住一个钢琴 part 的两行：与大谱表配对等价，不重复写', J(r4.voxGroups));
      const nm = await PG.evaluate(x => PQ_KIND.nameOf(importMusicXML(x).song), SRC[ID.aloha]);
      T(/合唱/.test(nm), 'P5 骊歌谱名仍是合唱谱（' + nm + '）', nm);
    }

    /* ================= X 零碎 ================= */
    if (want('X')) {
      const x1 = MX([{ id: 'P1', ms: [N('C', 4, { d: 4, type: 'whole' }) + '<backup><duration>2</duration></backup>' + DIR(DYN('p')) + '<forward><duration>2</duration></forward>', N('D', 4, { d: 4, type: 'whole' })] }]);
      const r1 = (await imp(PG, x1)).song;
      T(r1.measures[0].voxes[0][0].dyn === 'p' && !r1.measures[1].voxes[0][0].dyn, 'X1 全音符第 3 拍 backup→p→forward：p 挂在本小节那个音上（此前挂到下一小节首音）', J([r1.measures[0].voxes[0][0].dyn, r1.measures[1].voxes[0][0].dyn]));
      const x2 = MX([{ id: 'P1', ms: [N('C', 4) + N('D', 4) + N('E', 4) + N('F', 4) + '<backup><duration>4</duration></backup>' + DIR(DYN('f')) + N('C', 4, { v: 2, d: 4, type: 'whole' }), N('G', 4, { d: 4, type: 'whole' })] }]);
      const r2 = await imp(PG, x2);
      T(r2.song.measures[0].voxes[0][0].dyn === 'f' && !r2.song.measures[1].voxes[0][0].dyn && r2.skip.voices === 1, 'X2 同谱表第二声部前的 f：按时间位置挂到本小节第 1 拍那一列（第二声部音照旧跳过计数）', J([r2.song.measures[0].voxes[0].map(c => c.dyn), r2.skip]));
      for (const q of ['shell=classic', '']) {
        const pg = await open(q);
        const r = await pg.evaluate(x => { loadSong(importMusicXML(x).song); render(); const h = document.getElementById('score').innerHTML;
          const n98 = (h.match(/>9:8</g) || []).length, n9 = (h.match(/>9</g) || []).length;
          const s = createSong('instr', { title: 'x', key: 'C', beats: 4, unit: 4, nMea: 1, nVox: 1, lyr: 0, clef: 'staff' });
          s.measures[0].voxes[0] = Array.from({ length: 8 }, (_, i) => ({ dur: 16, dotted: false, deg: (i % 7) + 1, acc: '', oct: 0, lyrics: [], tie: false, tup: 8, tupM: 7 })).concat([{ dur: 2, dotted: false, deg: 1, acc: '', oct: 0, lyrics: [], tie: false }]);
          loadSong(s); render(); const h2 = document.getElementById('score').innerHTML; return { n98, n9, n87: (h2.match(/>8:7</g) || []).length, lbl: typeof tupLabel === 'function' ? [tupLabel(9, 8), tupLabel(3, 2), tupLabel(5, 4), tupLabel(8, 7), tupLabel(2, 3), tupLabel(7)] : null }; }, SRC[ID.stadt]);
        await pg.close();
        T(r.n98 === 0 && r.n9 >= 17 && r.n87 >= 1 && J(r.lbl) === J(['9', '3', '5', '8:7', '2:3', '7']), 'X3 城市 9:8 连音只印「9」（' + r.n9 + ' 处）、自定 8:7 照印比值（' + (q || '新外壳') + '）', J(r));
      }
      const r4 = (await imp(PG, SRC[ID.atlas])).skip; const r4b = (await imp(PG, SRC[ID.stadt])).skip;
      T(r4.other === 2 && r4b.other === 0, 'X4 拆谱表时保留的 backup / forward 不计入「其他记号」跳过（阿特拉斯 2 · 城市 0，与修前同）', J([r4, r4b]));
    }

    /* ================= M 钢琴音色 ================= */
    if (want('M')) {
      const bad = [];
      for (const id of Object.values(ID)) { const s = (await imp(PG, SRC[id])).song; const mx = s.mixer || {};
        (s.voxVoices || []).forEach((v, i) => { const isP = /Piano/.test(v), m = mx['vox:' + i]; if (isP !== !!(m && m.inst === 'piano')) bad.push(id + ':' + i + ':' + v + ':' + J(m)); }); }
      T(!bad.length, 'M1 曲库 10 首：钢琴拆出的两行 mixer 写 accMixPiano（inst piano），人声 / 合唱行不写（缺省人声「啊」）', J(bad));
      const r2 = (await imp(PG, MX([{ id: 'P1', name: 'Keys', prog: 1, ms: [N('C', 4, { d: 4, type: 'whole' })] }, { id: 'P2', name: 'Flügelhorn', inst: 'Flügelhorn', prog: 57, ms: [N('C', 4, { d: 4, type: 'whole' })] },
        { id: 'P3', name: 'Voice', prog: 53, ms: [N('C', 4, { d: 4, type: 'whole' })] }]))).song;
      T(J(Object.keys(r2.mixer || {})) === J(['vox:0']), 'M2 合成：midi-program 1 的「Keys」算钢琴、Flügelhorn（铜管）与 Choir Aahs 不算', J(r2.mixer));
    }

    /* ================= R 移调 ================= */
    if (want('R')) {
      const TRS = (c, d, o) => `<transpose>${d != null ? `<diatonic>${d}</diatonic>` : ''}<chromatic>${c}</chromatic>${o ? `<octave-change>${o}</octave-change>` : ''}</transpose>`;
      const cl = { id: 'P1', name: 'Clarinet in B♭', attr: { fifths: 2, tr: TRS(-2, -1) }, ms: [N('D', 5, { d: 4, type: 'whole' })] };
      const pn = { id: 'P2', name: 'Piano', prog: 1, ms: [N('C', 4, { d: 4, type: 'whole' }) + N('E', 4, { d: 4, type: 'whole', chord: true }) + N('G', 4, { d: 4, type: 'whole', chord: true })] };
      const mid = s => (c, vi) => keyRefOf(s.key, 0) + DEG_SEMI[c.deg] + ({ '#': 1, b: -1, x: 2, bb: -2 }[c.acc] || 0) + 12 * (c.oct || 0);
      const DEG_SEMI = [null, 0, 2, 4, 5, 7, 9, 11];
      const KREF = { C: 60, D: 62, G: 55, F: 65, Bb: 58 };
      const keyRefOf = k => KREF[k];
      const r1 = await imp(PG, MX([cl, pn])); const s1 = r1.song, M1 = mid(s1);
      const cc = s1.measures[0].voxes[0][0], pc = s1.measures[0].voxes[1][0];
      T(s1.transp == null && s1.key === 'C' && M1(cc) === 72 && cc.deg === 1 && !cc.acc && J([pc.deg, pc.acc, (pc.adds || []).map(a => a.deg + a.acc)]) === J([1, '', ['3', '5']]) && /已按实音导入/.test(r1.warn),
        'R1 单簧管（记谱 D5）＋钢琴 C–E–G：不写全曲 transp、调号取钢琴（C）、单簧管换实音 C5、钢琴仍是 1 3 5（此前钢琴被移低、拼成 ♯7）、提示「已按实音导入」', J({ transp: s1.transp, key: s1.key, cc, pc, warn: r1.warn }));
      const r2 = await imp(PG, MX([Object.assign({}, pn, { id: 'P1' }), Object.assign({}, cl, { id: 'P2' })])); const s2 = r2.song, M2 = mid(s2);
      T(s2.transp == null && s2.key === 'C' && M2(s2.measures[0].voxes[1][0]) === 72 && /已按实音导入/.test(r2.warn), 'R2 钢琴在前、单簧管在后：同样换实音（此前 transp 没读到、单簧管按记谱音高一个全音）', J({ transp: s2.transp, key: s2.key, c: s2.measures[0].voxes[1][0] }));
      const r3 = await imp(PG, MX([cl])); const s3 = r3.song;
      T(s3.transp === -2 && s3.key === 'D' && s3.measures[0].voxes[0][0].deg === 1 && !/实音/.test(r3.warn || ''), 'R3 单簧管独奏：照旧记谱音（1=D、记谱 D5＝1）＋ song.transp=-2', J({ transp: s3.transp, key: s3.key, c: s3.measures[0].voxes[0][0] }));
      const gt = { id: 'P1', name: 'Guitar', attr: { tr: TRS(0, 0, -1) }, ms: [N('E', 4, { d: 4, type: 'whole' })] };
      const r4 = (await imp(PG, MX([gt]))).song;
      T(r4.transp === -12, 'R4 吉他高音谱号 octave-change -1：transp = chromatic + 12×octave-change = -12（此前 0，导入后高八度）', r4.transp);
      const r5 = await imp(PG, MX([{ id: 'P1', name: 'Voice', ms: [N('E', 4, { d: 4, type: 'whole' })] }, Object.assign({}, gt, { id: 'P2' })])); const s5 = r5.song;
      T(s5.transp == null && s5.measures[0].voxes[1][0].deg === 3 && (s5.measures[0].voxes[1][0].oct || 0) === 0 && !/实音/.test(r5.warn || ''), 'R5 人声＋八度吉他（只差八度）：不换实音、不写全曲 transp（八度谱号留 v69.5）', J({ transp: s5.transp, c: s5.measures[0].voxes[1][0], warn: r5.warn }));
    }
  } catch (e) { T(false, 'X 执行异常', e && e.stack || e); }
  await b.close();
  T(!errs.length, 'E 页面脚本错误 0', J(errs.slice(0, 5)));
  console.log('（单跑 ' + Math.round((Date.now() - t0) / 1000) + ' 秒）');
  console.log((pass === total ? 'PASS' : 'FAIL') + ' ' + pass + '/' + total + (fails.length ? '  红：' + fails.join(' ') : ''));
  process.exit(pass === total ? 0 : 1);
})();
