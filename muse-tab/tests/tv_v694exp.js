'use strict';
/* v69.4「纠错一 · 导出」（五线谱全面复核 F4 / F5 / T3① / T8 / T9 / T13 / T15 导出侧）：
   M1  playOrderOf(s, start) 纯函数：10 首曲库谱 + 全部预设与 buildPlayOrder 逐项相同；不看循环选区、只读传入的 s
   M2  MIDI 按演奏顺序展开：构造谱（每小节一个全音符）反复 / 1.2. 房子 / D.C. al Fine / D.S. al Coda / 𝄎 的音高序列＝buildPlayOrder 推出的序列；expand:false 线性
   M3  《圣母颂》（17 小节 → 演奏 30 小节）：MIDI ≡ 把谱按 buildPlayOrder 抄成线性谱后的 MIDI（每轨音符 / 力度 / 时值 / CC64 逐项相同），时长长于线性
   M4  力度：vel＝round(80×DYN_GAIN)，持续 / sf 只加重本音 / fp 本音强随后 p；无力度谱恒 80 / 78；大谱表左手跟右手；TAB 跟首个带力度的简谱声部；《圣母颂》钢琴力度 ≥3 档
   M5  踏板 CC64：构造钢琴谱 on/off/换踏板 → 两手通道同写 127/0（换踏板先 0 后 127、同 tick 0 在 127 前）；《圣母颂》两手 CC64 成对交替、人声轨没有
   M6  《城市》九连音不漂移：右手 / 左手每个「小节首拍发声」的音都落在精确小节线 tick 上（此前右手到曲末早 51 tick）；曲库每轨同音高不重叠
   M7  弱起 / 不完整小节拍号：《摇篮曲》0:1/8 → 240:3/4 …；构造弱起谱 MIDI 再导入：parseSMF 主拍号 3/4、pickup=240，buildSongFromMIDI 记弱起且小节线对齐；超拍小节照旧标称（tv_midi T7 口径）
   M8  倚音：前倚音拍上、从主音借时（主音推后、总长不变），后倚音从主音尾部借；TAB 逐音连音线跨反复不去延长第一遍的音
   X1  MusicXML：10 首曲库谱 + 构造谱全部过 MusicXML 4.0 XSD
   X2  divisions：《城市》288、每小节 staff 1 时值和＝backup＝864；五连音 480、七连音 672；无此类连音的谱仍 96；九连音谱 mscore3 读入不报 backup beyond measure start
   X3  踏板 <pedal type="start|stop" line="yes" sign="yes"/>；导入认 type="change"（前一列 off + 下一音符列 on）
   X4  score-instrument + midi-instrument：每个 score-part 一个，program＝GM_PROG_MAP[应用内实际音色]+1（混音台钢琴＝1、缺省人声＝54、钢弦吉他＝26）；mscore3 不报 no instrument found
   X5  速度术语与节拍器写成一个 direction（words + metronome + sound tempo），往返 tempoTerm / tempo 不变；没有术语的谱照旧
   X6  制谱署名 / 演唱：pyq-maker / pyq-singer 往返无损，另写 <encoding><encoder>；第三方文件（无这两项）照旧空串
   X7  圆滑线 number 按谱表号（大谱表下行 2）；《去会情人》mscore3 不再报 ignoring duplicate slur start
   X8  大谱表 part-name：「X·右手 / X·左手」写 X，「右手 / 左手」写「钢琴」，其余照原口径；MuseScore 式另存（去 miscellaneous、换 software）两轮往返行名不变（不动点）
   X9  part-group：四部合唱 start/stop + bracket + group-barline no；《夏威夷骊歌》一组方括号、钢琴花括号不另写
   X10 整小节休止：五线谱全休止小节写 <rest measure="yes"/>（无 type、duration＝整小节），弱起首小节 / 带力度的休止 / 简谱行不写；导入认 measure="yes"（3/4 里 type=whole 读 3 拍）与凑不成单个时值的整小节休止（5/4 拆列）
   X11 装饰音 up/down/tr/turn → inverted-mordent/mordent/trill-mark/turn（与 tremolo 同一个 <ornaments>）、marcato → strong-accent、倚音 type 按 grace.dur
   P1  《侏儒》PNG（新外壳 1440 宽 / 旧外壳 1280 宽）：按页切成多张、每张画布单边 ≤32767、都下载、提示张数，不抛错
   P2  短谱照旧一张「曲名.png」、提示「已导出 PNG 图片」；P3 画布出不来（toBlob 给空）时提示改用打印、不抛错
   E   页面脚本错误 0
   env：MUSETAB_URL（缺省 ../index.html）· NO_MSCORE=1 跳过 mscore3 两项（本机没有 mscore3 时） */
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync, spawnSync } = require('child_process');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const ROOT = path.resolve(__dirname, '..', '..');
const XSD = path.join(__dirname, 'fixtures', 'xsd', 'musicxml.xsd');
const LIB = JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'seed-library.json'), 'utf8'));
const libOf = id => (LIB.find(x => x.id === id) || {}).data;
const J = x => JSON.stringify(x);
let pass = 0, total = 0; const lines = [], pageErrs = [];
const T = (id, ok, name, d) => { total++; if (ok) pass++; lines.push((ok ? '✅ ' : '❌ ') + id + ' ' + name + (!ok && d != null ? '\n     ' + String(d).slice(0, 1600) : '')); };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tv_v694exp_'));
let nf = 0;
const xsdErr = xml => { const f = path.join(TMP, (nf++) + '.musicxml'); fs.writeFileSync(f, xml);
  try { execFileSync('xmllint', ['--noout', '--schema', XSD, f], { stdio: ['ignore', 'pipe', 'pipe'] }); return null; }
  catch (e) { return String(e.stderr || e.message || '').split('\n').filter(l => /error/i.test(l)).slice(0, 2).join(' | ') || 'xmllint 失败'; } };
const HAS_MS = !process.env.NO_MSCORE && (() => { try { execFileSync('which', ['mscore3'], { stdio: 'ignore' }); return true; } catch (_) { return false; } })();
const msErr = (xml, tag) => { const f = path.join(TMP, tag + '.musicxml'); fs.writeFileSync(f, xml);
  const r = spawnSync('mscore3', ['-o', path.join(TMP, tag + '.mscx'), f], { env: Object.assign({}, process.env, { QT_QPA_PLATFORM: 'offscreen' }), encoding: 'utf8', timeout: 180000 });
  let mscx = ''; try { mscx = fs.readFileSync(path.join(TMP, tag + '.mscx'), 'utf8'); } catch (_) {}
  return { st: r.status, err: String(r.stderr || ''), mscx }; };

/* 页面里的小工具：MIDI 字节 → 每轨事件；音符配对 */
const HELP = () => {
  window.__mid = u8 => { let p = 14; const trks = [];
    const vlq = () => { let v = 0, b; do { b = u8[p++]; v = v * 128 + (b & 0x7f); } while (b & 0x80); return v; };
    while (p + 8 <= u8.length) { p += 4; const len = ((u8[p] << 24) | (u8[p + 1] << 16) | (u8[p + 2] << 8) | u8[p + 3]) >>> 0; p += 4; const end = p + len; let t = 0, run = 0; const ev = [];
      while (p < end) { t += vlq(); let st = u8[p]; if (st & 0x80) { p++; if (st < 0xF0) run = st; } else st = run;
        if (st === 0xFF) { const ty = u8[p++]; const l = vlq(); ev.push({ t, meta: ty, d: Array.from(u8.slice(p, p + l)) }); p += l; }
        else if (st === 0xF0 || st === 0xF7) { const l = vlq(); p += l; }
        else { const hi = st & 0xF0; if (hi === 0xC0 || hi === 0xD0) ev.push({ t, st, a: u8[p++] }); else ev.push({ t, st, a: u8[p++], b: u8[p++] }); } }
      trks.push(ev); p = end; }
    return trks; };
  /* 音符：[{t, m, v, d}]（同音高 FIFO 配对），按 t、m 排 */
  window.__notes = tr => { const on = {}, out = [];
    tr.forEach(e => { const hi = e.st & 0xF0; if (hi === 0x90 && e.b > 0) (on[e.a] = on[e.a] || []).push(e); else if ((hi === 0x80 || hi === 0x90) && on[e.a] && on[e.a].length) { const o = on[e.a].shift(); out.push({ t: o.t, m: e.a, v: o.b, d: e.t - o.t }); } });
    return out.sort((a, b) => a.t - b.t || a.m - b.m); };
  window.__cc = tr => tr.filter(e => (e.st & 0xF0) === 0xB0 && e.a === 64).map(e => [e.t, e.b]);
  window.__V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [] }, o || {});
  window.__R = (dur, o) => Object.assign({ dur, dotted: false, deg: 0, acc: '', oct: 0, lyrics: [] }, o || {});
  /* 每小节一个全音符（C D E F G A…）的五线谱旋律谱 */
  window.__ladder = n => { const s = createSong('instr', { title: '阶梯', nVox: 1, lyr: 0, beats: 4, unit: 4, key: 'C', nMea: n || 6, tempo: 120 });
    s.measures.forEach((m, i) => { m.voxes[0] = [__V((i % 7) + 1, 1)]; }); return s; };
};

(async () => {
  const t0 = Date.now();
  let hasLint = true; try { execFileSync('xmllint', ['--version'], { stdio: 'ignore' }); } catch (_) { hasLint = false; }
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const open = async (o) => { o = o || {};
    const ctx = await b.newContext({ viewport: o.vp || { width: 1440, height: 900 }, acceptDownloads: true });
    const pg = await ctx.newPage(); await pg.addInitScript(HELP);
    pg.on('pageerror', e => pageErrs.push((o.tag || '') + ': ' + String(e && e.message || e)));
    pg.on('dialog', d => d.dismiss().catch(() => {}));
    await pg.goto(URL0 + (o.classic ? (URL0.includes('?') ? '&' : '?') + 'shell=classic' : '')); await pg.waitForTimeout(1300);
    await pg.evaluate(() => { window.guardReplace = p => p(); try { hideStartPad(); } catch (_) {} });
    return { ctx, pg }; };
  const EV = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => ({ err: String(e && e.message || e).slice(0, 400) }));
  try {
    const { ctx, pg } = await open({ classic: true, tag: 'main' });

    /* ===== M1 ===== */
    { const r = await EV(pg, lib => {
        if (typeof playOrderOf !== 'function') return { err: '没有 playOrderOf' };
        const bad = []; let n = 0;
        const chk = (nm, s) => { loadSong(s); audio.loop = null; const a = J2(buildPlayOrder(0)), c = J2(playOrderOf(JSON.parse(JSON.stringify(song)), 0)); n++; if (a !== c) bad.push([nm, a, c]); };
        function J2(x) { return JSON.stringify(x); }
        lib.forEach(d => chk(d.title, d)); PRESETS.forEach(p => chk(p.name, p.make()));
        /* 循环选区：buildPlayOrder 只播选区，playOrderOf 不看 */
        loadSong(lib[0]); audio.loop = { a: 2, b: 3 }; const lp = J2(buildPlayOrder(0)), po = playOrderOf(song, 0).length; audio.loop = null;
        /* 只读传入的 s：当前谱换成别的，结果不变 */
        const s0 = JSON.parse(JSON.stringify(lib[0])); loadSong(__ladder(3)); const iso = playOrderOf(s0, 0).length;
        return { bad, n, lp, po, iso };
      }, LIB.map(x => x.data));
      T('M1', !r.err && r.n >= 26 && !r.bad.length && r.lp === '[2,3]' && r.po === 30 && r.iso === 30,
        'playOrderOf(s, 0)：' + (r.n || 0) + ' 份谱与 buildPlayOrder(0) 逐项相同；循环选区只影响 buildPlayOrder；只读传入的谱', J(r)); }

    /* ===== M2 ===== */
    { const r = await EV(pg, () => {
        const pitchSeq = s => { const tr = __mid(exportMIDI(s).bytes)[1]; return __notes(tr).map(n => n.m).join(','); };
        const want = s => { loadSong(s); audio.loop = null; const o = buildPlayOrder(0); return { o: o.join(','), p: o.map(mi => { const c = simileSrc(mi); const m = s.measures[c != null ? c : mi].voxes[0][0]; return 60 + DEG_SEMI[m.deg]; }).join(',') }; };
        const out = {};
        let s = __ladder(6); s.measures[1].repeatStart = true; s.measures[3].repeatEnd = true; s.measures[3].volta = 1; s.measures[4].volta = 2; out.volta = Object.assign(want(s), { got: pitchSeq(song) });
        s = __ladder(6); s.measures[1].repeatEnd = true; out.rep = Object.assign(want(s), { got: pitchSeq(song) });
        s = __ladder(6); s.measures[1].fine = true; s.measures[5].dc = true; out.dc = Object.assign(want(s), { got: pitchSeq(song) });
        s = __ladder(6); s.measures[1].segno = true; s.measures[2].coda = true; s.measures[4].ds = true; s.measures[5].coda = true; out.ds = Object.assign(want(s), { got: pitchSeq(song) });
        s = __ladder(6); s.measures[2].simile = 1; out.sim = Object.assign(want(s), { got: pitchSeq(song) });
        s = __ladder(6); s.measures[1].repeatEnd = true; s.measures[5].dc = true; loadSong(s);
        out.lin = __notes(__mid(exportMIDI(song, { expand: false }).bytes)[1]).map(n => n.m).join(',');
        return out; });
      const okE = k => r[k] && r[k].p === r[k].got;
      T('M2', !r.err && ['volta', 'rep', 'dc', 'ds', 'sim'].every(okE) && r.volta.o === '0,1,2,3,1,2,4,5' && r.rep.o === '0,1,0,1,2,3,4,5' && r.dc.o === '0,1,2,3,4,5,0,1'
        && r.ds.o.split(',').length > 6 && r.sim.got === '60,62,62,65,67,69' && r.lin === '60,62,64,65,67,69',
        'MIDI 按演奏顺序展开：房子 / 简单反复 / D.C. al Fine / D.S. al Coda / 𝄎 的音高序列＝buildPlayOrder 推出的序列；expand:false 按小节线性', J(r)); }

    /* ===== M3 ===== */
    { const r = await EV(pg, d => {
        loadSong(d); audio.loop = null; const s = song, order = buildPlayOrder(0);
        const u = JSON.parse(JSON.stringify(s)); let pk = null;
        u.measures = order.map((mi, i) => { const c = simileSrc(mi); const m = JSON.parse(JSON.stringify(s.measures[c != null ? c : mi]));
          ['repeatStart', 'repeatEnd', 'volta', 'dc', 'ds', 'fine', 'segno', 'coda', 'simile', 'keyTo'].forEach(k => delete m[k]);
          const k = keyAt(mi); if (i > 0 && k !== pk) m.keyTo = k; pk = k; return m; });
        u.key = keyAt(order[0]);
        const A = __mid(exportMIDI(s).bytes), B = __mid(exportMIDI(u).bytes), L = __mid(exportMIDI(s, { expand: false }).bytes);
        const sig = trs => trs.slice(1).map(tr => J(__notes(tr)) + '|' + J(__cc(tr)));
        function J(x) { return JSON.stringify(x); }
        const end = trs => Math.max(...trs.slice(1).map(tr => tr.length ? tr[tr.length - 1].t : 0));
        return { n: s.measures.length, nOrder: order.length, same: J(sig(A)) === J(sig(B)), nA: A.slice(1).map(t => __notes(t).length), nB: B.slice(1).map(t => __notes(t).length), endA: end(A), endL: end(L) };
      }, libOf('lib-os-lc6389103'));
      T('M3', !r.err && r.n === 17 && r.nOrder === 30 && r.same && r.endA > r.endL * 1.5,
        '《圣母颂》17 小节演奏 30 小节：MIDI ≡ 按 buildPlayOrder 抄成线性谱后的 MIDI（每轨音符 / 力度 / 时值 / CC64 逐项相同）；曲末 ' + r.endA + ' tick（线性 ' + r.endL + '）', J(r)); }

    /* ===== M4 ===== */
    { const r = await EV(pg, d => {
        const V = __V, vels = tr => __notes(tr).map(n => n.v);
        let s = createSong('instr', { title: '力度', nVox: 1, lyr: 0, beats: 4, unit: 4, key: 'C', nMea: 2 });
        s.measures[0].voxes[0] = [V(1, 4, { dyn: 'p' }), V(2, 4), V(3, 4, { dyn: 'f' }), V(4, 4, { dyn: 'sf' })];
        s.measures[1].voxes[0] = [V(5, 4), V(6, 4, { dyn: 'fp' }), V(5, 4), V(3, 4, { dyn: 'pp' })];
        const dynV = vels(__mid(exportMIDI(s).bytes)[1]).join(',');
        s = createSong('instr', { title: '无力度', nVox: 1, lyr: 0, beats: 4, unit: 4, key: 'C', nMea: 2 });
        s.measures.forEach(m => { m.voxes[0] = [V(1, 4), V(2, 4), V(3, 4), V(4, 4)]; });
        const flat = [...new Set(vels(__mid(exportMIDI(s).bytes)[1]))].join(',');
        s = createSong('piano', { title: '两手', lyr: 0, beats: 4, unit: 4, key: 'C', nMea: 1 });
        s.measures[0].voxes[0] = [V(5, 2, { dyn: 'f' }), V(3, 2)]; s.measures[0].voxes[1] = [V(1, 2, { oct: -1 }), V(5, 2, { oct: -1 })];
        const tw = __mid(exportMIDI(s).bytes); const lh = [...new Set(vels(tw[2]))].join(',');
        s = createSong('tanchang', { inst: 'guitar', title: 'TAB', nTab: 1, nVox: 1, lyr: 0, beats: 4, unit: 4, key: 'C', nMea: 1 });
        s.measures[0].voxes[0] = [V(1, 2, { dyn: 'p' }), V(2, 2)]; s.measures[0].tabs[0] = [{ dur: 2, dotted: false, notes: [{ s: 1, f: 0 }] }, { dur: 2, dotted: false, notes: [{ s: 2, f: 1 }] }];
        const tb = __mid(exportMIDI(s).bytes); const tabV = [...new Set(vels(tb[tb.length - 1]))].join(',');
        delete s.measures[0].voxes[0][0].dyn; const tb2 = __mid(exportMIDI(s).bytes); const tabV0 = [...new Set(vels(tb2[tb2.length - 1]))].join(',');
        loadSong(d); const pv = __mid(exportMIDI(song).bytes).slice(2).map(tr => vels(tr)); const av = pv.map(v => new Set(v).size), au = new Set([].concat(...pv)).size;
        return { dynV, flat, lh, tabV, tabV0, av, au };
      }, libOf('lib-os-lc6389103'));
      T('M4', !r.err && r.dynV === '54,54,94,102,94,90,54,42' && r.flat === '80' && r.lh === '94' && r.tabV === '53' && r.tabV0 === '78' && r.av.every(n => n >= 2) && r.au >= 3,
        '力度：p f sf（只本音）fp（本音强随后 p）pp → 54,54,94,102,94,90,54,42；无力度恒 80；左手跟右手 f＝94；TAB 跟简谱 p＝53（无力度 78）；《圣母颂》钢琴两手各 ≥2 档、合计 ≥3 档', J(r)); }

    /* ===== M5 ===== */
    { const r = await EV(pg, d => {
        const V = __V; const s = createSong('piano', { title: '踏板', lyr: 0, beats: 4, unit: 4, key: 'C', nMea: 2 });
        s.measures[0].voxes[0] = [V(5, 4), V(5, 4), V(5, 4), V(5, 4)]; s.measures[1].voxes[0] = [V(5, 4), V(5, 4), V(5, 4), V(5, 4)];
        s.measures[0].voxes[1] = [V(1, 4, { oct: -1, ped: 'on' }), V(1, 4, { oct: -1 }), V(1, 4, { oct: -1 }), V(1, 4, { oct: -1, ped: 'off' })];
        s.measures[1].voxes[1] = [V(1, 4, { oct: -1, ped: 'on' }), V(1, 4, { oct: -1 }), V(1, 4, { oct: -1, ped: 'on' }), V(1, 4, { oct: -1, ped: 'off' })];
        const t = __mid(exportMIDI(s).bytes), cR = JSON.stringify(__cc(t[1])), cL = JSON.stringify(__cc(t[2]));
        /* 同 tick：踏板 0 → 127 → 音符开（换踏板接住新音） */
        const at2880 = t[2].filter(e => e.t === 2880 && ((e.st & 0xF0) === 0xB0 || ((e.st & 0xF0) === 0x90 && e.b > 0))).map(e => (e.st & 0xF0) === 0xB0 ? 'cc' + e.b : 'on');
        loadSong(d); const A = __mid(exportMIDI(song).bytes);
        const pr = tr => { const c = __cc(tr); let ok = c.length > 0 && c[0][1] === 127 && c[c.length - 1][1] === 0; for (let i = 1; i < c.length; i++) if (c[i][1] === c[i - 1][1]) ok = false; return { n: c.length, ok }; };
        return { cR, cL, at2880: at2880.join(' '), vox: __cc(A[1]).length, rh: pr(A[2]), lh: pr(A[3]) };
      }, libOf('lib-os-lc6389103'));
      const W = '[[0,127],[1920,0],[1920,127],[2880,0],[2880,127],[3840,0]]';
      T('M5', !r.err && r.cR === W && r.cL === W && r.at2880 === 'cc0 cc127 on' && r.vox === 0 && r.rh.ok && r.lh.ok && r.rh.n === r.lh.n && r.rh.n >= 96,
        '踏板 CC64：on/off/换踏板 → 两手通道 ' + W + '（同 tick 0→127→音符开）；《圣母颂》两手各 ' + (r.rh && r.rh.n) + ' 个、127/0 交替成对，人声轨 0', J(r)); }

    /* ===== M6 ===== */
    { const r = await EV(pg, lib => {
        const out = {};
        { const d = lib.find(x => x.id === 'lib-os-lc4985973').data; loadSong(d);
          const A = __mid(exportMIDI(song).bytes); const miss = [], chk = [];
          [1, 2].forEach(vi => { const ons = new Set(A[vi + 1].filter(e => (e.st & 0xF0) === 0x90 && e.b > 0).map(e => e.t + ':' + e.a)); let n = 0;
            song.measures.forEach((m, mi) => { const c = (m.voxes[vi] || [])[0]; if (!c || !c.deg || c.grace) return;
              const pc = mi > 0 ? (song.measures[mi - 1].voxes[vi] || []).slice(-1)[0] : null;
              const pOf = (x, k) => keyRefAt(k) + DEG_SEMI[x.deg] + (x.oct || 0) * 12 + accSemi(x.acc) + voxCapo() + (song.transp | 0), p = pOf(c, mi);
              if (pc && pc.tie && pc.deg && pOf(pc, mi - 1) === p) return;
              n++; if (!ons.has((mi * 1440) + ':' + p)) miss.push([vi, mi + 1]); });
            chk.push(n); });
          out.miss = miss; out.chk = chk; }
        /* 曲库每轨：同音高的音不重叠（取整后同 tick 的 note-off 在 note-on 之前） */
        const ovl = [];
        lib.forEach(it => { loadSong(it.data); __mid(exportMIDI(song).bytes).slice(1).forEach((tr, ti) => { const last = {};
          __notes(tr).forEach(n => { if (last[n.m] != null && n.t < last[n.m]) ovl.push([it.id, ti, n.t, n.m]); last[n.m] = Math.max(last[n.m] || 0, n.t + n.d); }); }); });
        out.ovl = ovl.slice(0, 5); out.nOvl = ovl.length;
        return out; }, LIB);
      T('M6', !r.err && !r.miss.length && r.chk.every(n => n > 20) && !r.nOvl,
        '《城市》九连音不漂移：右手 / 左手各 ' + J(r.chk) + ' 个小节首拍音都落在精确小节线上；曲库 10 首每轨同音高不重叠', J(r)); }

    /* ===== M7 ===== */
    { const r = await EV(pg, d => {
        loadSong(d); const A = __mid(exportMIDI(song).bytes);
        const ts = A[0].filter(e => e.meta === 0x58).map(e => e.t + ':' + e.d[0] + '/' + (1 << e.d[1]));
        const V = __V; const s = createSong('instr', { title: '弱起', nVox: 1, lyr: 0, beats: 3, unit: 4, key: 'C', nMea: 3 }); s.pickup = true;
        s.measures[0].voxes[0] = [V(5, 8)]; s.measures[1].voxes[0] = [V(1, 4), V(2, 4), V(3, 4)]; s.measures[2].voxes[0] = [V(5, 2, { dotted: true })];
        const B = exportMIDI(s); const tsB = __mid(B.bytes)[0].filter(e => e.meta === 0x58).map(e => e.t + ':' + e.d[0] + '/' + (1 << e.d[1])).join(' ');
        const p = parseSMF(B.bytes); const im = buildSongFromMIDI(p, { mode: 'single', a: 0 }).song;
        const m0 = im.measures[0].voxes[0].map(c => c.deg + ':' + c.dur).join(' '), m1 = im.measures[1].voxes[0].map(c => c.deg + ':' + c.dur).join(' ');
        const s3 = createSong('instr', { title: '超拍', nVox: 1, lyr: 0, beats: 4, unit: 4, key: 'C', nMea: 2 }); s3.measures[0].voxes[0] = [V(1, 4), V(2, 4), V(5, 2, { dotted: true })];
        const tsC = __mid(exportMIDI(s3).bytes)[0].filter(e => e.meta === 0x58).map(e => e.t + ':' + e.d[0] + '/' + (1 << e.d[1])).join(' ');
        return { ts: ts.slice(0, 4).join(' '), nTs: ts.length, tsB, tsC, pts: p.ts.beats + '/' + p.ts.unit, ppk: p.pickup, pickup: !!im.pickup, m0, m1, nMea: im.measures.length };
      }, libOf('lib-os-lc5701612'));
      T('M7', !r.err && /^0:1\/8 240:3\/4/.test(r.ts) && /5\/8/.test(r.ts + '') && r.tsB === '0:1/8 240:3/4' && r.tsC === '0:4/4' && r.pts === '3/4' && r.ppk === 240 && r.pickup && r.m0 === '5:8' && r.m1 === '1:4 2:4 3:4' && r.nMea === 3,
        '弱起拍号：《摇篮曲》' + r.ts + '…；构造弱起谱 0:1/8 → 240:3/4，再导入主拍号 3/4、记弱起、第 2 小节「1 2 3」对齐；超拍小节照旧只写标称拍号', J(r)); }

    /* ===== M8 ===== */
    { const r = await EV(pg, () => {
        const V = __V; let s = createSong('instr', { title: '倚音', nVox: 1, lyr: 0, beats: 4, unit: 4, key: 'C', nMea: 1, tempo: 60 });
        s.measures[0].voxes[0] = [V(1, 4, { grace: { notes: [{ deg: 2, oct: 0 }], dur: 8 } }), V(3, 4, { graceA: { notes: [{ deg: 4, oct: 0 }], dur: 16 } }), V(5, 2)];
        const ns = __notes(__mid(exportMIDI(s).bytes)[1]).map(n => [n.t, n.m, n.d]);
        /* TAB 逐音连音线跨反复：第 2 小节末音连到第 3 小节首音、3–4 小节反复 → 第二遍第 3 小节首音重新拨弦（不去延长第一遍的音） */
        s = createSong('tanchang', { inst: 'guitar', title: '连音反复', nTab: 1, nVox: 0, lyr: 0, beats: 4, unit: 4, key: 'C', nMea: 4 });
        const N = (f, o) => ({ dur: 1, dotted: false, notes: [Object.assign({ s: 1, f }, o || {})] });
        s.measures[0].tabs[0] = [N(0)]; s.measures[1].tabs[0] = [N(3)]; s.measures[2].tabs[0] = [N(3, { tieIn: true })]; s.measures[3].tabs[0] = [N(5)];
        s.measures[2].repeatStart = true; s.measures[3].repeatEnd = true;
        const tt = __mid(exportMIDI(s).bytes); const tn = __notes(tt[tt.length - 1]).map(n => [n.t, n.m, n.d]);
        return { ns, tn };
      });
      const g = r.ns || [], okG = g.length === 5 && g[0][0] === 0 && g[0][1] === 62 && g[1][0] === g[0][2] && g[1][1] === 60 && g[1][0] + g[1][2] === 480
        && g[2][0] === 480 && g[2][1] === 64 && g[3][1] === 65 && g[3][0] + g[3][2] === 960 && g[2][0] + g[2][2] === g[3][0] && g[4][0] === 960;
      const tn = r.tn || [], okT = J(tn.map(x => x[0])) === J([0, 1920, 5760, 7680, 9600]) && tn[1][2] === 3840 && tn[3][2] === 1920;
      T('M8', !r.err && okG && okT, '倚音：前倚音 D 拍上、C 推后到 ' + (g[1] && g[1][0]) + ' 仍止于 480；后倚音 F 借 E 的尾巴、止于 960；TAB 连音线第一遍 2→3 小节合成一个音，第二遍第 3 小节重新拨弦', J(r)); }

    /* ===== X：MusicXML ===== */
    const R = await EV(pg, lib => {
      const V = __V, Rr = __R, out = { lib: [], docs: {} };
      lib.forEach(it => { loadSong(it.data); out.lib.push({ id: it.id, x: exportMusicXML(song) }); });
      /* 连音分母 */
      const tupSong = (N, dur, nm) => { const s = createSong('instr', { title: nm, nVox: 1, lyr: 0, beats: 4, unit: 4, key: 'C', nMea: 2 });
        s.measures[0].voxes[0] = Array.from({ length: N }, (_, i) => V((i % 7) + 1, dur, { tup: N })).concat([V(1, 2)]); return s; };
      out.docs.q5 = exportMusicXML(tupSong(5, 16, '五连音')); out.docs.q7 = exportMusicXML(tupSong(7, 16, '七连音'));
      { const s = tupSong(9, 32, '九连音'); s.measures[0].voxes[0] = Array.from({ length: 9 }, (_, i) => V((i % 7) + 1, 32, { tup: 9, tupM: 8 })).concat([V(1, 4), V(2, 2)]); out.docs.q9 = exportMusicXML(s); }
      { const s = __ladder(2); out.docs.plain = exportMusicXML(s); }
      /* 装饰音 / 演奏法 / 倚音 */
      { const s = createSong('instr', { title: '装饰', nVox: 1, lyr: 0, beats: 4, unit: 4, key: 'C', nMea: 2 });
        s.measures[0].voxes[0] = [V(1, 4, { orn: 'up' }), V(2, 4, { orn: 'down', ornAccLo: 'b' }), V(3, 4, { orn: 'tr', trem: 2 }), V(4, 4, { orn: 'turn', ornAcc: '#' })];
        s.measures[1].voxes[0] = [V(5, 4, { artic: 'marcato' }), V(6, 4, { grace: { notes: [{ deg: 5, oct: 0 }], dur: 16 } }), V(5, 4, { grace: { notes: [{ deg: 6, oct: 0 }], dur: 32 } }), V(3, 4, { grace: 2 })];
        out.docs.orn = exportMusicXML(s); }
      /* 整小节休止 */
      { const s = createSong('instr', { title: '休止', nVox: 1, lyr: 0, beats: 3, unit: 4, key: 'C', nMea: 4 });
        s.measures[1].voxes[0] = [V(1, 4), V(2, 4), V(3, 4)]; s.measures[2].voxes[0][0].dyn = 'p';
        out.docs.rest = exportMusicXML(s);
        const s2 = createSong('instr', { title: '弱起休止', nVox: 1, lyr: 0, beats: 3, unit: 4, key: 'C', nMea: 2 }); s2.pickup = true; s2.measures[0].voxes[0] = [Rr(4)];
        out.docs.restPk = exportMusicXML(s2);
        const s3 = createSong('vocal', { title: '简谱休止', nVox: 1, lyr: 0, beats: 4, unit: 4, key: 'C', nMea: 2 }); out.docs.restJp = exportMusicXML(s3); }
      /* 速度术语 / 署名 */
      { const s = __ladder(2); s.tempoTerm = 'Andante'; s.tempo = 76; s.maker = '张老师'; s.singer = '某歌手'; out.docs.tempo = exportMusicXML(s); out.docs.tempo0 = exportMusicXML(__ladder(2)); }
      /* 合唱 / 钢琴伴奏 / 钢琴 */
      out.docs.choir = exportMusicXML(NWB.build('S', { title: '合唱', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 4, lyr: 1 }));
      out.docs.sg = exportMusicXML(NWB.build('SG', { title: 'SG', key: 'C', beats: 4, unit: 4, nMea: 2 }));
      { const s = createSong('piano', { title: '钢琴', lyr: 0, beats: 4, unit: 4, key: 'C', nMea: 2 }); s.mixer = { 'vox:0': accMixPiano(), 'vox:1': accMixPiano() }; out.docs.piano = exportMusicXML(s); }
      out.docs.guitar = exportMusicXML(createSong('tanchang', { inst: 'guitar', title: '弹唱', nTab: 1, nVox: 1, lyr: 1, beats: 4, unit: 4, key: 'C', nMea: 2 }));
      return out; }, LIB);
    if (R.err) T('X', false, 'MusicXML 夹具生成异常', R.err);
    else {
      const all = R.lib.map(x => [x.id, x.x]).concat(Object.entries(R.docs));
      const bad = hasLint ? all.map(([n, x]) => [n, xsdErr(x)]).filter(x => x[1]) : [['xmllint', '不可用']];
      T('X1', !bad.length && all.length >= 24, all.length + ' 份（10 首曲库谱 + 构造谱）全部过 MusicXML 4.0 XSD', J(bad));
      /* X2 */
      const stadt = R.lib.find(x => x.id === 'lib-os-lc4985973').x;
      const divOf = x => +(x.match(/<divisions>(\d+)<\/divisions>/) || [])[1];
      const p2 = (stadt.match(/<part id="P2">[\s\S]*?<\/part>/) || [''])[0];
      const meas = p2.match(/<measure [\s\S]*?<\/measure>/g) || [];
      const badM = [];
      meas.forEach((m, i) => { const bk = m.indexOf('<backup>'); const top = bk >= 0 ? m.slice(0, bk) : m;
        const sum = (top.match(/<note>(?:(?!<\/note>)[\s\S])*<\/note>/g) || []).filter(n => !/<chord\/>/.test(n) && !/<grace/.test(n)).reduce((a, n) => a + +(n.match(/<duration>(\d+)/) || [0, 0])[1], 0);
        const bkv = bk >= 0 ? +(m.slice(bk).match(/<duration>(\d+)/) || [0, 0])[1] : sum;
        if (sum !== 864 || bkv !== 864) badM.push([i + 1, sum, bkv]); });
      let ms = { st: 'skip', err: '' }; if (HAS_MS) ms = msErr(stadt, 'stadt');
      const bkErr = (ms.err.match(/backup beyond measure start/g) || []).length;
      let ms9 = { err: '' }; if (HAS_MS) ms9 = msErr(R.docs.q9, 'q9');
      T('X2', divOf(stadt) === 288 && meas.length === 40 && !badM.length && divOf(R.docs.q5) === 480 && divOf(R.docs.q7) === 672 && divOf(R.docs.q9) === 288 && divOf(R.docs.plain) === 96
        && divOf(R.lib[0].x) === 96 && (!HAS_MS || (ms.st === 0 && bkErr === 0 && !/backup beyond/.test(ms9.err))),
        'divisions：《城市》288（40 小节 staff 1 时值和＝backup＝864）、五连音 480、七连音 672、九连音 288、普通谱 96；mscore3 读入 backup 报错 ' + (HAS_MS ? bkErr : '（跳过）'),
        J({ div: divOf(stadt), badM: badM.slice(0, 5), q5: divOf(R.docs.q5), q7: divOf(R.docs.q7), q9: divOf(R.docs.q9), st: ms.st, bkErr, e9: ms9.err.slice(0, 300) }));
      /* X3 */
      const ave = R.lib.find(x => x.id === 'lib-os-lc6389103').x;
      const peds = ave.match(/<pedal [^>]*>/g) || [];
      const pOk = peds.length > 0 && peds.every(p => /line="yes"/.test(p) && /sign="yes"/.test(p)) && peds.filter(p => /start/.test(p)).length === peds.filter(p => /stop/.test(p)).length;
      const r3 = await EV(pg, () => {
        const nt = (st, extra) => `${extra || ''}<note><pitch><step>${st}</step><octave>3</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>`;
        const pd = t => `<direction placement="below"><direction-type><pedal type="${t}" line="yes"/></direction-type></direction>`;
        const xml = `<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>F</sign><line>4</line></clef></attributes>`
          + nt('C', pd('start')) + nt('D') + nt('E', pd('change')) + nt('F') + pd('stop') + `</measure></part></score-partwise>`;
        const im = importMusicXML(xml); return im && im.song ? im.song.measures[0].voxes[0].map(c => c.ped || '-').join(' ') : 'ERR ' + (im && im.error);
      });
      T('X3', pOk && r3 === 'on off on off', '踏板：《圣母颂》' + peds.length + ' 个 <pedal> 都带 line="yes" sign="yes"、start/stop 成对；导入 start · change · stop → ' + r3, J({ peds: peds.slice(0, 3), r3 }));
      /* X4 */
      const aveWant = await EV(pg, d => { loadSong(d); return [GM_PROG_MAP[trackInstOf(song, 'vox', 0)] + 1, GM_PROG_MAP[trackInstOf(song, 'vox', 1)] + 1]; }, libOf('lib-os-lc6389103'));
      const progs = x => (x.match(/<score-part id="[^"]+">[\s\S]*?<\/score-part>/g) || []).map(sp => { const pr = (sp.match(/<midi-program>(\d+)/) || [])[1]; return (/<score-instrument id=/.test(sp) && /<midi-channel>\d+/.test(sp)) ? +pr : -1; });
      let msNoInst = -1; if (HAS_MS) msNoInst = (msErr(ave, 'ave').err.match(/no instrument found/g) || []).length;
      T('X4', J(progs(R.docs.piano)) === '[1]' && J(progs(ave)) === J(aveWant) && J(progs(R.docs.guitar)) === '[54,26]' && J(progs(R.docs.choir)) === '[54,54,54,54]' && (!HAS_MS || msNoInst === 0),
        'score-instrument + midi-instrument：混音台钢琴＝1、缺省人声＝54、钢弦吉他＝26、曲库谱＝trackInstOf（与应用内播放同一音色，MusicXML 从 1 起）；mscore3 no instrument found ' + (HAS_MS ? msNoInst : '（跳过）'),
        J({ piano: progs(R.docs.piano), ave: progs(ave), aveWant, guitar: progs(R.docs.guitar), choir: progs(R.docs.choir), msNoInst }));
      /* X5 / X6 */
      const dirs = (R.docs.tempo.match(/<direction [^>]*>(?:(?!<\/direction>)[\s\S])*<\/direction>/g) || []).filter(d => /metronome|Andante/.test(d));
      const r56 = await EV(pg, x => { const im = importMusicXML(x).song;
        const third = importMusicXML(x.replace(/<miscellaneous>[\s\S]*?<\/miscellaneous>/, '').replace('谱友圈 puyouquan.com', 'MuseScore 3.2.3')).song;
        return { term: im.tempoTerm, tempo: im.tempo, maker: im.maker, singer: im.singer, m3: third.maker, s3: third.singer }; }, R.docs.tempo);
      T('X5', dirs.length === 1 && /<words>Andante<\/words>/.test(dirs[0]) && /<metronome>/.test(dirs[0]) && /<sound tempo="76"/.test(dirs[0]) && r56.term === 'Andante' && r56.tempo === 76
        && !/<words>/.test(R.docs.tempo0) && (R.docs.tempo0.match(/<direction /g) || []).length === 1,
        '速度术语 + 节拍器写成一个 direction（words + metronome + sound tempo）；往返 tempoTerm=' + r56.term + ' ♩=' + r56.tempo + '；没有术语的谱照旧只有节拍器', J({ dirs, r56 }));
      T('X6', r56.maker === '张老师' && r56.singer === '某歌手' && /<encoder>张老师<\/encoder>/.test(R.docs.tempo) && r56.m3 === '' && r56.s3 === '',
        '制谱 / 演唱：pyq-maker / pyq-singer 往返无损（' + r56.maker + ' / ' + r56.singer + '），另写 <encoding><encoder>；去掉 miscellaneous 的第三方文件照旧空串', J(r56));
      /* X7 */
      const gang = R.lib.find(x => x.id === 'lib-os-lc5705406').x;
      const gp2 = (gang.match(/<part id="P2">[\s\S]*?<\/part>/) || [''])[0];
      const sl2 = (gp2.match(/<slur type="start" number="2"\/>/g) || []).length, sl1 = (gp2.match(/<slur type="start" number="1"\/>/g) || []).length;
      let dup = -1; if (HAS_MS) dup = (msErr(gang, 'gang').err.match(/duplicate slur/gi) || []).length;
      T('X7', sl1 > 0 && sl2 > 0 && (!HAS_MS || dup === 0), '圆滑线 number 按谱表号：《去会情人》钢琴上行 ' + sl1 + ' 条 number=1、下行 ' + sl2 + ' 条 number=2；mscore3 ignoring duplicate slur start ' + (HAS_MS ? dup : '（跳过）'), J({ sl1, sl2, dup }));
      /* X8 */
      const pn = x => (x.match(/<part-name>([^<]*)<\/part-name>/g) || []).map(t => t.replace(/<\/?part-name>/g, ''));
      const r8 = await EV(pg, x => { const ms = t => t.replace(/<miscellaneous>[\s\S]*?<\/miscellaneous>/, '').replace(/谱友圈 puyouquan\.com/g, 'MuseScore 3.2.3');
        const a = importMusicXML(ms(x)).song; const x2 = exportMusicXML(a); const b2 = importMusicXML(ms(x2)).song;
        return { r1: a.voxVoices, r2: b2.voxVoices }; }, ave);
      const want8 = J(['Singstimme\nVoice', 'Pianoforte·右手', 'Pianoforte·左手']);
      T('X8', J(pn(ave)) === J(['Singstimme\nVoice', 'Pianoforte']) && pn(R.docs.piano)[0] === '钢琴' && pn(R.docs.sg)[1] === '右手伴奏·左手伴奏' && /pyq-staff-names/.test(ave)
        && J(r8.r1) === want8 && J(r8.r2) === want8,
        '大谱表 part-name：《圣母颂》写「Pianoforte」、右手 / 左手写「钢琴」、右手伴奏 / 左手伴奏照原口径；MuseScore 式另存两轮往返行名不变', J({ ave: pn(ave), piano: pn(R.docs.piano), sg: pn(R.docs.sg), r8 }));
      /* X9 */
      const pl = x => (x.match(/<part-list>[\s\S]*?<\/part-list>/) || [''])[0];
      const cpl = pl(R.docs.choir), apl = pl(R.lib.find(x => x.id === 'lib-os-lc6650166').x);
      const okC = /^<part-list><part-group type="start" number="1"><group-symbol>bracket<\/group-symbol><group-barline>no<\/group-barline><\/part-group><score-part id="P1">/.test(cpl) && /<\/score-part><part-group type="stop" number="1"\/><\/part-list>$/.test(cpl);
      const okA = (apl.match(/<part-group type="start"/g) || []).length === 1 && /<part-group type="stop" number="1"\/><score-part id="P4">/.test(apl) && !/brace/.test(apl);
      let brk = 'skip'; if (HAS_MS) { const m9 = msErr(R.docs.choir, 'choir'); brk = /<bracket type="0" span="4"/.test(m9.mscx) ? 'ok' : 'no'; }
      T('X9', okC && okA && brk !== 'no', 'part-group：四部合唱 start/stop + bracket + group-barline no（mscore3 读出方括号 span 4：' + brk + '）；《夏威夷骊歌》一组方括号（第 1–3 行）、钢琴花括号不另写', J({ cpl: cpl.slice(0, 400), apl: apl.slice(0, 600) }));
      /* X10 */
      const mr = x => (x.match(/<rest measure="yes"\/><duration>(\d+)<\/duration><voice>1<\/voice><\/note>/g) || []).map(t => +t.match(/<duration>(\d+)/)[1]);
      const r10 = await EV(pg, x => {
        const a = importMusicXML(x).song; const cols = a.measures.map(m => m.voxes[0].map(c => c.deg + ':' + c.dur + (c.dotted ? '.' : '')).join(' '));
        const fin = `<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>V</part-name></score-part></part-list><part id="P1">`
          + `<measure number="1"><attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>3</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><rest measure="yes"/><duration>12</duration><voice>1</voice><type>whole</type></note></measure>`
          + `<measure number="2"><attributes><time><beats>5</beats><beat-type>4</beat-type></time></attributes><note><rest/><duration>20</duration><voice>1</voice></note></measure></part></score-partwise>`;
        const b2 = importMusicXML(fin); const bc = b2.song.measures.map(m => m.voxes[0].map(c => c.deg + ':' + c.dur + (c.dotted ? '.' : '')).join(' '));
        return { cols, again: (exportMusicXML(a).match(/<rest measure="yes"\/>/g) || []).length, fin: bc, sk: b2.skip && b2.skip.notes }; }, R.docs.rest);
      T('X10', J(mr(R.docs.rest)) === '[288,288]' && !/<rest measure="yes"\/>/.test((R.docs.restPk.match(/<measure number="0"[\s\S]*?<\/measure>/) || ['?'])[0]) && /<rest measure="yes"\/>/.test(R.docs.restPk) && !/<rest measure="yes"\/>/.test(R.docs.restJp) && /<rest\/><duration>96<\/duration><voice>1<\/voice><type>quarter<\/type>/.test(R.docs.rest)
        && J(r10.cols) === J(['0:2.', '1:4 2:4 3:4', '0:4 0:4 0:4', '0:2.']) && r10.again === 2 && J(r10.fin) === J(['0:2.', '0:1 0:4']) && !r10.sk,
        '整小节休止：五线谱全休止小节 <rest measure="yes"/> duration 288（第 3 小节带力度照旧逐列）；弱起首小节、简谱行不写；导入读成一列附点二分、再导出仍 2 个；3/4 里 type=whole 读 3 拍、5/4 拆成 全+四分', J({ mr: mr(R.docs.rest), r10 }));
      /* X11 */
      const o = R.docs.orn;
      const okO = /<ornaments><inverted-mordent\/><\/ornaments>/.test(o) && /<ornaments><mordent\/><accidental-mark placement="below">flat<\/accidental-mark><\/ornaments>/.test(o)
        && /<ornaments><trill-mark\/><tremolo type="single">2<\/tremolo><\/ornaments>/.test(o) && /<ornaments><turn\/><accidental-mark placement="above">sharp<\/accidental-mark><\/ornaments>/.test(o)
        && /<articulations><strong-accent\/><\/articulations>/.test(o) && (o.match(/<ornaments>/g) || []).length === 4
        && /<grace slash="yes"\/><pitch><step>G<\/step><octave>4<\/octave><\/pitch><voice>1<\/voice><type>16th<\/type>/.test(o) && /<type>32nd<\/type>/.test(o) && /<grace slash="yes"\/><pitch><step>D<\/step><octave>4<\/octave><\/pitch><voice>1<\/voice><type>eighth<\/type>/.test(o);
      T('X11', okO, '装饰音 up/down/tr/turn → inverted-mordent / mordent / trill-mark / turn（变音 → accidental-mark，与 tremolo 同一个 <ornaments>）；marcato → strong-accent；倚音 type 16th / 32nd / eighth', o.match(/<note>(?:(?!<\/note>)[\s\S])*<\/note>/g).slice(0, 9).join('\n'));
    }
    await ctx.close();

    /* ===== P：长谱 PNG ===== */
    const pngRun = async (o, id, fail) => {
      const { ctx: c2, pg: p2 } = await open(o);
      const r = await EV(p2, a => {
        window.__dl = []; window.__cv = []; window.__toasts = [];
        const oc = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (/\.png$/.test(this.download || '')) window.__dl.push(this.download); else oc.call(this); };
        const tb = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function (cb, ty) { window.__cv.push([this.width, this.height]); if (a.fail) return cb(null); return tb.call(this, bb => { window.__cv[window.__cv.length - 1].push(bb ? bb.size : -1); cb(bb); }, ty); };
        const ot = window.toast; window.toast = function (m) { window.__toasts.push(String(m)); return ot.apply(this, arguments); };
        loadSong(a.d); render(); EXPORT_ACT.png(); return true; }, { d: libOf(id), fail: !!fail });
      for (let i = 0; i < 120; i++) { await p2.waitForTimeout(500); const done = await p2.evaluate(() => window.__toasts.some(t => /PNG|图片|张图/.test(t))).catch(() => false); if (done) break; }
      await p2.waitForTimeout(400);
      const out = await EV(p2, () => ({ dl: window.__dl, cv: window.__cv, toasts: window.__toasts, title: song.title }));
      await c2.close(); return Object.assign({ r }, out); };
    { const a = await pngRun({ tag: 'P1-flow' }, 'lib-os-lc6838113'), c = await pngRun({ classic: true, vp: { width: 1280, height: 900 }, tag: 'P1-classic' }, 'lib-os-lc6838113');
      const ok = x => x.dl && x.dl.length >= 2 && x.dl.every((n, i) => n === x.title + '-' + (i + 1) + '.png') && x.cv.length >= x.dl.length
        && x.cv.slice(-x.dl.length).every(v => v[1] <= 32767 && v[2] > 0) && x.toasts.some(t => new RegExp('已导出 ' + x.dl.length + ' 张图|分成 ' + x.dl.length + ' 张').test(t));
      T('P1', ok(a) && ok(c), '《侏儒》PNG：新外壳 ' + (a.dl || []).length + ' 张、旧外壳（1280 宽）' + (c.dl || []).length + ' 张，每张画布高 ≤32767、都下载、提示张数',
        J({ flow: { dl: a.dl, cv: a.cv, t: a.toasts }, classic: { dl: c.dl, cv: c.cv, t: c.toasts } })); }
    { const a = await pngRun({ tag: 'P2' }, 'lib-os-lc6389103'), f = await pngRun({ classic: true, tag: 'P3' }, 'lib-os-lc6389103', true);
      T('P2', a.dl && a.dl.length === 1 && a.dl[0] === a.title + '.png' && a.cv.length === 1 && a.toasts.includes('已导出 PNG 图片'), '短谱（《圣母颂》）照旧一张「曲名.png」、提示「已导出 PNG 图片」', J({ dl: a.dl, cv: a.cv, t: a.toasts }));
      T('P3', f.dl && f.dl.length === 0 && f.toasts.some(t => /打印/.test(t)), '画布出不来（toBlob 给空）：不下载、提示改用打印 / 存 PDF、不抛错', J({ dl: f.dl, cv: f.cv, t: f.toasts })); }
  } catch (e) { T('X', false, '执行异常', e && e.stack || e); }
  await b.close();
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
  T('E', !pageErrs.length, '页面脚本错误 0', J(pageErrs.slice(0, 5)));
  console.log(lines.join('\n'));
  console.log('（mscore3：' + (HAS_MS ? '在场' : '跳过') + '；单跑 ' + Math.round((Date.now() - t0) / 1000) + ' 秒）');
  console.log(`PASS ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})();
