'use strict';
/* v70.3 B1「导入台账」（基石方案 docs/plan-2026-11-foundation.md §3.1 B1–B3）：MusicXML 源文件 → importMusicXML，按元素和取值域逐类统计「保留 / 进报告 / 静默丢」。
   输入：曲库源谱 deploy/library/openscore/（manifest items 10 份）＋ tests/fixtures/mxl/ 下的第三方文件（有就收）＋ 本文件里的合成探针。
   范围：note / notations / direction-type / ornaments / technical / articulations / barline 之下的元素（编辑器里的白名单 MXL_LED）。
   本套件不读导入器的判断，独立按 DOM 走一遍：哪些音被收下（v70.5 起同谱表第二声部收成层、第 3 个起的声部 → skip.voices；第 4 个起 / 和弦 / 无音高的倚音、超出 3 个的附加音 → skip.notes）、
   每个元素按取值域该「保留」「引擎重算」还是「进报告」（报告名＝skip.otherBy 的键），再与导入结果核对：
     · 进报告：skip.otherBy 逐名与独立统计相等——少报＝静默丢，多报＝报错；skip.notes / voices / lyrics 同样逐项相等
     · 保留：能落到谱面数据上的逐类数数（延长号 / 演奏法分类型 / 换气 / 装饰音分类型 / 单音震音 / 倚音 / 歌词 / 指法 / 和音指法 / 滑音 / 延续虚线），少了＝静默丢
     · 引擎重算（stem / beam / 普通 accidental / notehead normal / tuplet / staff / voice / duration）单列，不算丢
   S1 每份输入「静默丢」0、「多报」0（打印全体输入的分类汇总表）
   S2 《侏儒》双音震音 188 对、《阿特拉斯》51 对：v70.3 起点名计数（skip.otherBy['震音']）；v70.4 收进 col.trem2——保留数 188 / 51、报告不再有「震音」
   v70.5 B 组 有意迁移（规格 §10.4，独立镜像）：声部按谱表排名、全曲固定（§4.2：编号约定按 part 判、归属谱表取多数、有音高的声部 rank0 宿主 / rank1 层 / rank≥2 丢）——
      层音记保留并进逐元素统计；rank≥2 的有音高音与倚音计 skip.voices，休止不计；「本谱表的音」按声部归属谱表判（不再按 <staff>）；
      旋律行空拍补隐形休止（保留），只有凑不成 64 分音符整数倍的才进报告「空拍」；有层的谱表小节末补齐到本谱表写到的最大时间；倚音计数按声部分开
   S3 探针：① 5 个倚音一组 → skip.notes=2、前 3 个挂到主音 ② 六线谱 4 个四分音符＋backup＋voice 2 全音符 → 4 列、skip.voices=1、小节不超拍
          ③ number="1, 2" 与 "3" 的房子各计 1（房子编号 2），单个 1 / 2 不计 ④ 和弦每音带 <arpeggiate> → 琶音按列计 1 ⑤ 和弦倚音计 skip.notes
          ⑥ 杂项（caesura / cue / 菱形符头 / 颤音线 / 持续音踏板 / 跟 rit. 的延续虚线 / 休止上的歌词…）全部按名进报告
          ⑦ v70.5：同谱表第二声部成层（不计 skip.voices）、第 3 个声部计 skip.voices、钢琴 voice 1 跨谱表的音留在右手（lossy.xstaff）、只有休止的 voice 2 不计、
             print-object="no" 的休止与 voice 1 forward 空拍成隐形休止（不计空拍）、三连音里凑不成整时值的空拍仍计「空拍」
   S4 白名单 MXL_LED 在、skipText 按名点出前 5 类（多于 5 类写「等」）
   S5 B4 曲库质量门 ③ 扩口径（deploy/build-library.js skipAllow 逐曲签字白名单）：反例清单（侏儒去掉白名单、阿特拉斯白名单与实际不符且没签字）不过门、逐曲点名
   C  §3.1 编辑纠错（同版互通组一并验收）：C1 普通插入 / 前插（不顶替时）平移跨列引用 dynTo / ottTo / tk，数据断言插入前后指向同一个列对象、撤销回原 JSON；
      C2 measures 含 null 时 exportMusicXML 不抛错、按空小节导出、存储不改、导出提示点名小节号
   E  页面脚本错误 0
   env：MUSETAB_URL 被测页（缺省 ../index.html；修前副本跑红用；S5 走 build-library.js 自己的编辑器路径）。单跑约 30 秒 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const toUrl = u => /^file:/.test(u) ? u : 'file://' + path.resolve(u);
const URL0 = process.env.MUSETAB_URL ? toUrl(process.env.MUSETAB_URL) : 'file://' + path.resolve(__dirname, '../index.html');
const ROOT = path.resolve(__dirname, '..', '..');
const J = x => JSON.stringify(x);
let pass = 0, total = 0; const fails = [], errs = [];
const T = (ok, name, d) => { total++; if (ok) pass++; else fails.push(name.split(' ')[0]); console.log((ok ? '✅' : '❌') + ' ' + name + (!ok && d != null ? '：' + String(d).slice(0, 1600) : '')); };

/* ---------- 输入 ---------- */
const MAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'deploy', 'library', 'manifest.json'), 'utf8'));
const SRC = MAN.items.map(it => ({ name: it.id + ' ' + it.title, x: fs.readFileSync(path.join(ROOT, 'deploy', 'library', it.file), 'utf8') }));
const FIXDIR = path.join(__dirname, 'fixtures', 'mxl');
if (fs.existsSync(FIXDIR)) fs.readdirSync(FIXDIR).filter(f => /\.(musicxml|xml)$/i.test(f)).forEach(f => SRC.push({ name: 'fixture ' + f, x: fs.readFileSync(path.join(FIXDIR, f), 'utf8') }));

/* ---------- 合成探针 ---------- */
const HEAD = (parts, extra) => `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><identification><encoding><software>MuseScore 3.6.2</software></encoding></identification><part-list>${parts.map(p => `<score-part id="${p}"><part-name>${p}</part-name></score-part>`).join('')}</part-list>${extra}</score-partwise>`;
const ATT = (clef, more) => `<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>${clef || '<clef><sign>G</sign><line>2</line></clef>'}${more || ''}</attributes>`;
const NT = (st, oc, o = {}) => `<note>${o.grace ? '<grace slash="yes"/>' : ''}${o.chord ? '<chord/>' : ''}<pitch><step>${st}</step><octave>${oc}</octave></pitch>${o.grace ? '' : `<duration>${o.d || 1}</duration>`}<voice>${o.v || 1}</voice><type>${o.type || 'quarter'}</type>${o.x || ''}${o.not ? `<notations>${o.not}</notations>` : ''}${o.ly || ''}</note>`;
const RS = (d, o = {}) => `<note><rest/><duration>${d}</duration><voice>${o.v || 1}</voice><type>${o.type || 'quarter'}</type>${o.ly || ''}</note>`;
const TABATT = ATT('<clef><sign>TAB</sign><line>5</line></clef>', '<staff-details><staff-lines>6</staff-lines>' + [['E', 2], ['A', 2], ['D', 3], ['G', 3], ['B', 3], ['E', 4]].map(([s, o], i) => `<staff-tuning line="${i + 1}"><tuning-step>${s}</tuning-step><tuning-octave>${o}</tuning-octave></staff-tuning>`).join('') + '</staff-details>');
const TN = (s, f, o = {}) => `<note>${o.chord ? '<chord/>' : ''}<pitch><step>E</step><octave>3</octave></pitch><duration>${o.d || 1}</duration><voice>${o.v || 1}</voice><type>${o.type || 'quarter'}</type><notations><technical><string>${s}</string><fret>${f}</fret></technical></notations></note>`;
const PROBE = {
  grace5: HEAD(['P1'], `<part id="P1"><measure number="1">${ATT()}${['D', 'E', 'F', 'G', 'A'].map(s => NT(s, 5, { grace: true, type: '16th' })).join('')}${NT('C', 5, { d: 4, type: 'whole' })}</measure></part>`),
  tabv2: HEAD(['P1'], `<part id="P1"><measure number="1">${TABATT}${TN(1, 0)}${TN(1, 1)}${TN(1, 3)}${TN(2, 1)}<backup><duration>4</duration></backup>${TN(6, 0, { d: 4, v: 2, type: 'whole' })}</measure></part>`),
  volta: HEAD(['P1'], `<part id="P1">` +
    `<measure number="1">${ATT()}<barline location="left"><repeat direction="forward"/></barline>${NT('C', 5, { d: 4, type: 'whole' })}</measure>` +
    `<measure number="2"><barline location="left"><ending number="1, 2" type="start"/></barline>${NT('D', 5, { d: 4, type: 'whole' })}<barline location="right"><ending number="1, 2" type="stop"/><repeat direction="backward"/></barline></measure>` +
    `<measure number="3"><barline location="left"><ending number="3" type="start"/></barline>${NT('E', 5, { d: 4, type: 'whole' })}<barline location="right"><ending number="3" type="discontinue"/></barline></measure>` +
    `<measure number="4"><barline location="left"><ending number="1" type="start"/></barline>${NT('F', 5, { d: 4, type: 'whole' })}<barline location="right"><ending number="1" type="stop"/></barline></measure>` +
    `<measure number="5"><barline location="left"><ending number="2" type="start"/></barline>${NT('G', 5, { d: 4, type: 'whole' })}<barline location="right"><bar-style>light-heavy</bar-style><ending number="2" type="stop"/></barline></measure></part>`),
  arp: HEAD(['P1'], `<part id="P1"><measure number="1">${ATT()}${NT('C', 4, { d: 4, type: 'whole', not: '<arpeggiate/>' })}${NT('E', 4, { d: 4, type: 'whole', chord: true, not: '<arpeggiate/>' })}${NT('G', 4, { d: 4, type: 'whole', chord: true, not: '<arpeggiate/>' })}</measure>` +
    `<measure number="2">${NT('C', 4, { d: 4, type: 'whole', not: '<non-arpeggiate type="bottom"/>' })}${NT('G', 4, { d: 4, type: 'whole', chord: true, not: '<non-arpeggiate type="top"/>' })}</measure></part>`),
  gchord: HEAD(['P1'], `<part id="P1"><measure number="1">${ATT()}${NT('D', 5, { grace: true, type: 'eighth' })}${NT('F', 5, { grace: true, chord: true, type: 'eighth' })}${NT('C', 5, { d: 4, type: 'whole' })}</measure></part>`),
  misc: HEAD(['P1'], `<part id="P1"><measure number="1">${ATT()}` +
    `<direction><direction-type><words>rit.</words></direction-type><direction-type><dashes type="start"/></direction-type></direction>` +
    `<direction><direction-type><pedal type="sostenuto"/></direction-type></direction>` +
    `<direction><direction-type><bracket type="start" line-end="down"/></direction-type></direction>` +
    NT('C', 5, { not: '<articulations><staccato/><caesura/></articulations><ornaments><trill-mark/><wavy-line type="start"/></ornaments>' }) +
    NT('D', 5, { x: '<notehead>diamond</notehead>', not: '<ornaments><wavy-line type="stop"/></ornaments><technical><up-bow/></technical>' }) +
    `<direction><direction-type><dashes type="stop"/></direction-type></direction>` +
    RS(1, { ly: '<lyric number="1"><syllabic>single</syllabic><text>啊</text></lyric>' }) +
    NT('E', 5, { x: '<cue/>', not: '<dynamics><sf/></dynamics>' }) +
    `<barline location="right"><bar-style>dashed</bar-style><fermata/></barline></measure></part>`),
  /* v70.5 B 组 S3⑦ */
  lay: HEAD(['P1'], `<part id="P1"><measure number="1">${ATT()}${NT('C', 5)}${NT('D', 5)}${NT('E', 5)}${NT('F', 5)}<backup><duration>4</duration></backup><forward><duration>2</duration><voice>2</voice></forward>${NT('A', 4, { d: 2, v: 2, type: 'half', not: '<articulations><accent/></articulations>' })}</measure>`
    + `<measure number="2">${NT('G', 5, { d: 4, type: 'whole' })}</measure></part>`),
  v3: HEAD(['P1'], `<part id="P1"><measure number="1">${ATT()}${NT('C', 5, { d: 4, type: 'whole' })}<backup><duration>4</duration></backup>${NT('A', 4, { d: 4, v: 2, type: 'whole' })}<backup><duration>4</duration></backup>`
    + `${NT('F', 4, { d: 2, v: 3, type: 'half' })}${RS(2, { v: 3, type: 'half' })}${NT('E', 4, { grace: true, v: 3, type: '16th' })}</measure></part>`),
  xst: HEAD(['P1'], `<part id="P1"><measure number="1">${ATT('<staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef>')}`
    + `${NT('C', 5, { x: '<staff>1</staff>' })}${NT('G', 3, { x: '<staff>2</staff>' })}${NT('E', 5, { x: '<staff>1</staff>' })}${NT('F', 5, { x: '<staff>1</staff>' })}<backup><duration>4</duration></backup>${NT('C', 3, { d: 4, v: 5, type: 'whole', x: '<staff>2</staff>' })}</measure></part>`),
  rest2: HEAD(['P1'], `<part id="P1"><measure number="1">${ATT()}${NT('C', 5, { d: 4, type: 'whole' })}<backup><duration>4</duration></backup>${RS(2, { v: 2, type: 'half' })}${RS(2, { v: 2, type: 'half' })}</measure></part>`),
  po: HEAD(['P1'], `<part id="P1"><measure number="1">${ATT()}${NT('C', 5)}<note print-object="no"><rest/><duration>1</duration><voice>1</voice><type>quarter</type></note><forward><duration>1</duration><voice>1</voice></forward>${NT('G', 5)}</measure></part>`),
  tup: HEAD(['P1'], `<part id="P1"><measure number="1"><attributes><divisions>3</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>`
    + `${NT('C', 5, { d: 12, type: 'whole' })}<backup><duration>12</duration></backup>${NT('A', 4, { d: 1, v: 2, type: 'eighth', x: '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>' })}<forward><duration>1</duration><voice>2</voice></forward>`
    + `${NT('G', 4, { d: 1, v: 2, type: 'eighth', x: '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>' })}${NT('F', 4, { d: 9, v: 2, type: 'half', x: '<dot/>' })}</measure></part>`),
};
Object.keys(PROBE).forEach(k => SRC.push({ name: 'probe ' + k, x: PROBE[k], probe: k }));

/* ---------- 页面内的独立统计 ---------- */
function censusFn(x) {
  const im = importMusicXML(x); if (!im || im.error) return { err: (im && im.error) || '导入失败' };
  const d = new DOMParser().parseFromString(x, 'application/xml'), root = d.querySelector('score-partwise');
  const q = (el, s) => el.querySelector(':scope > ' + s), tx = (el, s) => { const n = el && q(el, s); return n ? n.textContent.trim() : null; };
  const half = c => { const t = c.getAttribute('type'); return t === 'stop' || t === 'continue' || t === 'discontinue'; };
  const C = {}, EXP = {};
  const k = (cls, disp, name) => { const e = C[cls] || (C[cls] = { keep: 0, derive: 0, rep: 0 }); e[disp]++; if (disp === 'rep' && name) EXP[name] = (EXP[name] || 0) + 1; };
  const BOX = ['articulations', 'ornaments', 'technical'];
  const VN = ['pitch', 'rest', 'duration', 'voice', 'type', 'dot', 'accidental', 'time-modification', 'stem', 'notehead', 'staff', 'beam', 'notations', 'lyric', 'chord', 'grace', 'tie'];
  const TNL = VN.filter(t => t !== 'lyric');
  const DER = ['duration', 'voice', 'staff', 'stem', 'beam'];
  const VNOT = ['tied', 'slur', 'tuplet', 'fermata', 'articulations', 'ornaments', 'technical', 'arpeggiate', 'non-arpeggiate', 'slide', 'glissando'];
  const TNOT = ['tied', 'tuplet', 'fermata', 'technical', 'slide'];
  const VART = ['staccatissimo', 'staccato', 'tenuto', 'accent', 'strong-accent'], VORN = ['trill-mark', 'inverted-mordent', 'mordent', 'turn'];
  const AMV = ['sharp', 'natural', 'flat', 'double-sharp', 'sharp-sharp', 'flat-flat', 'double-flat'];
  const TTECH = ['string', 'fret', 'fingering', 'pluck', 'down-bow', 'up-bow', 'hammer-on', 'pull-off', 'tap', 'bend', 'harmonic', 'other-technical'];
  const OTT = ['P.M.', 'vibrato', 'let ring', 'slide-in up', 'slide-in down', 'slide-out up', 'slide-out down'];
  const VDIR = ['words', 'dynamics', 'wedge', 'dashes', 'octave-shift', 'pedal', 'metronome', 'rehearsal', 'segno', 'coda'], TDIR = ['words', 'metronome', 'rehearsal', 'segno', 'coda'];
  const BAR = ['bar-style', 'repeat', 'ending'];
  const ART_V = { staccatissimo: 'staccatissimo', staccato: 'stacc', tenuto: 'tenuto', accent: 'accent', 'strong-accent': 'marcato' }, ORN_V = { 'trill-mark': 'tr', 'inverted-mordent': 'up', mordent: 'down', turn: 'turn' };
  const KIND = ['major', 'minor', 'dominant', 'major-seventh', 'minor-seventh', 'dominant-ninth', 'suspended-fourth', 'suspended-second', 'diminished', 'diminished-seventh', 'half-diminished', 'augmented', 'augmented-seventh',
    'major-sixth', 'minor-sixth', 'major-ninth', 'minor-ninth', 'dominant-11th', 'minor-11th', 'dominant-13th', 'major-13th', 'minor-13th', 'power', 'major-minor', 'none', 'other'];
  const TYI = { whole: 1, half: 2, quarter: 4, eighth: 8, '16th': 16, '32nd': 32, '64th': 64 };
  const P = { ferm: 0, breath: 0, trem: 0, trem2: 0, grace: 0, lyr: 0, fing: 0, afing: 0, gliss: 0, artic: {}, orn: {}, dash: 0 };
  let expNotes = 0, expVoices = 0, expLyr = 0;
  /* 拆谱表后的「虚拟声部」：每个 part × staff；六线谱＝该谱表首个谱号 TAB 或带 staff-tuning */
  const vparts = [];
  [...root.querySelectorAll(':scope > part')].forEach(p => { const at = p.querySelector(':scope > measure > attributes'), nSt = at ? +(tx(at, 'staves') || 1) : 1;
    for (let kk = 1; kk <= Math.max(1, nSt); kk++) { let tab = false;
      if (at) { const cl = [...at.querySelectorAll(':scope > clef')].filter(c => nSt >= 2 ? +(c.getAttribute('number') || 1) === kk : true), sg = cl[0] && tx(cl[0], 'sign');
        const sd = [...at.querySelectorAll(':scope > staff-details')].filter(s => nSt >= 2 ? +(s.getAttribute('number') || 1) === kk : true);
        tab = sg === 'TAB' || sg === 'tab' || sd.some(s => s.querySelector('staff-tuning')); }
      vparts.push({ p, k: kk, nSt, tab }); } });
  if (im.skip.parts) return { partsSkipped: im.skip.parts };
  const primary = vparts.find(v => !v.tab) || vparts[0], voxCount = vparts.filter(v => !v.tab).length;
  let tBestEl = null; { let bm = Infinity; [...root.querySelectorAll(':scope > part')].forEach(p => { const ms = p.querySelectorAll(':scope > measure');
    for (let mi = 0; mi < ms.length && mi < bm; mi++) { const ev = [...ms[mi].children].find(el => el.tagName === 'direction' ? !!(el.querySelector(':scope > sound[tempo]') || el.querySelector(':scope > direction-type > metronome')) : (el.tagName === 'sound' && el.hasAttribute('tempo')));
      if (ev) { bm = mi; tBestEl = ev; break; } } }); }
  { const fa = d.querySelector('part > measure > attributes'), u = +(tx(fa, 'time > beat-type') || 4) || 4; if (u !== 2 && u !== 4 && u !== 8) EXP['拍号'] = (EXP['拍号'] || 0) + 1; }
  const navOf = el => { const sd = q(el, 'sound'), dt = el.querySelector('direction-type'), wd = dt && dt.querySelector('words'), w = wd ? wd.textContent.trim() : '';
    return !!((dt && (dt.querySelector('segno') || dt.querySelector('coda'))) || (sd && ['segno', 'coda', 'tocoda', 'dacapo', 'dalsegno', 'fine'].some(a => sd.hasAttribute(a))) || /to\s*coda/i.test(w) || /^D\.?\s?C\b/i.test(w) || /^D\.?\s?S\b/i.test(w) || /^fine$/i.test(w)); };
  let mainEl = null, colId = 0, arpCol = -1;
  const boxRep = (c, suf) => [...c.children].forEach(g => { if (!half(g)) k(c.tagName + '>' + g.tagName + suf, 'rep', g.tagName); });
  const noteCensus = (el, kind, tab) => {
    const NL = tab ? TNL : VN;
    [...el.children].forEach(c => { const tg = c.tagName, cls = 'note>' + tg + (tab ? '[六线谱]' : '');
      if (NL.indexOf(tg) < 0) { if (!half(c)) k(cls, 'rep', tg); return; }
      if (tg === 'accidental') { if (['cautionary', 'editorial', 'parentheses', 'bracket'].some(a => c.getAttribute(a) === 'yes')) k(cls + '[提醒]', 'rep', 'accidental'); else k(cls, 'derive'); return; }
      if (tg === 'notehead') { const v = c.textContent.trim(), xh = tab && /x/i.test(v), ok = (v === 'normal' || xh) && c.getAttribute('parentheses') !== 'yes' && c.getAttribute('filled') !== 'no';
        /* v70.4 验收修③ 分名：括号符头 notehead-paren 优先；异形符头按值 notehead-x（旋律行）/ -diamond / -slash；其余（空心等）notehead */
        const nhK = c.getAttribute('parentheses') === 'yes' ? 'notehead-paren' : (v === 'normal' || xh) ? 'notehead' : ({ x: 'notehead-x', diamond: 'notehead-diamond', slash: 'notehead-slash' })[v] || 'notehead';
        if (ok) k(cls + (xh ? '[x]' : ''), xh ? 'keep' : 'derive'); else k(cls + '[' + v + (c.getAttribute('parentheses') === 'yes' ? ' 括号' : '') + (c.getAttribute('filled') === 'no' ? ' 空心' : '') + ']', 'rep', nhK); return; }
      if (tg === 'lyric') { const kids = [...c.children], has = kids.some(t => t.tagName === 'text' && t.textContent.trim());
        if (kind !== 'main') { if (has) k(cls + '[' + kind + ']', 'rep', 'lyric'); return; }
        if (!kids.some(t => t.tagName === 'text') && kids.some(t => t.tagName === 'extend')) { k(cls + '[拖腔]', 'keep'); return; }
        const n2 = Math.max(1, +(c.getAttribute('number') || 1)); if (n2 > MAX_LYR) { expLyr++; k(cls + '[第 6 段起]', 'rep'); return; }
        let lt = ''; kids.forEach(t => { if (t.tagName === 'text') lt += t.textContent; else if (t.tagName === 'elision') lt += t.textContent.trim() ? t.textContent : '‿'; });
        if (lt.trim()) P.lyr++; k(cls, 'keep'); return; }
      k(cls, DER.indexOf(tg) >= 0 ? 'derive' : 'keep'); });
    const nt = q(el, 'notations'); if (!nt) return;
    const rest = kind === 'rest';
    if (!tab) {
      if ((kind === 'main' || rest) && nt.querySelector('fermata')) P.ferm++;
      if ((kind === 'main' || rest) && nt.querySelector('articulations > breath-mark')) P.breath++;
      const pickA = kind === 'main' ? VART.find(t => nt.querySelector('articulations > ' + t)) : null; if (pickA) P.artic[ART_V[pickA]] = (P.artic[ART_V[pickA]] || 0) + 1;
      if (kind === 'main' && [...nt.querySelectorAll('slide, glissando')].some(s => s.getAttribute('type') === 'start')) P.gliss++;
      [...nt.children].forEach(c => { const tg = c.tagName, cls = 'notations>' + tg;
        if (tg === 'arpeggiate' || tg === 'non-arpeggiate') { if (arpCol !== colId) { arpCol = colId; k(cls, 'rep', '琶音'); } else k(cls + '[同列]', 'rep'); return; }
        if (tg === 'tuplet') { k(cls, 'derive'); return; }
        if (half(c)) return;
        if (VNOT.indexOf(tg) < 0) { k(cls, 'rep', tg); return; }
        if (kind === 'grace') { if (tg === 'slur' || tg === 'tied') { k(cls + '[倚音]', 'derive'); return; } if (BOX.indexOf(tg) >= 0) boxRep(c, '[倚音]'); else k(cls + '[倚音]', 'rep', tg); return; }
        if (kind === 'chord') {
          if (tg === 'tied') { k(cls + '[和音]', 'keep'); return; }
          if (tg === 'technical') { let fg = 0; [...c.children].forEach(g => { if (half(g)) return; if (g.tagName === 'fingering' && !fg && /^[1-5]$/.test(g.textContent.trim())) { fg = 1; P.afing++; k('technical>fingering[和音]', 'keep'); return; } k('technical>' + g.tagName + '[和音]', 'rep', g.tagName); }); return; }
          if (BOX.indexOf(tg) >= 0) { [...c.children].forEach(g => { if (half(g)) return; const dup = !!(mainEl && mainEl.querySelector(':scope > notations > ' + tg + ' > ' + g.tagName));
            if (dup) k(tg + '>' + g.tagName + '[和音·主音已有]', 'keep'); else k(tg + '>' + g.tagName + '[和音]', 'rep', g.tagName === 'tremolo' ? '震音' : g.tagName); }); return; }
          if (mainEl && mainEl.querySelector(':scope > notations > ' + tg)) k(cls + '[和音·主音已有]', 'keep'); else k(cls + '[和音]', 'rep', tg); return; }
        if (tg === 'slur') { if (rest) k(cls + '[休止]', 'rep', 'slur'); else k(cls, 'keep'); return; }
        if (tg === 'slide' || tg === 'glissando') { if (rest) k(cls + '[休止]', 'rep', tg); else k(cls, 'keep'); return; }
        if (tg === 'fermata' || tg === 'tied') { k(cls, 'keep'); return; }
        if (tg === 'articulations') { [...c.children].forEach(g => { const t = g.tagName, cl = 'articulations>' + t; if (half(g)) return;
          if (t === 'breath-mark') { k(cl, 'keep'); return; }
          if (VART.indexOf(t) >= 0 && t === pickA) { k(cl, 'keep'); return; }
          k(cl + (VART.indexOf(t) >= 0 ? '[同音第二个]' : ''), 'rep', t); }); return; }
        if (tg === 'ornaments') { const pick = (rest || c !== q(nt, 'ornaments')) ? null : VORN.find(t => c.querySelector(':scope > ' + t));
          if (pick) P.orn[ORN_V[pick]] = (P.orn[ORN_V[pick]] || 0) + 1;
          [...c.children].forEach(g => { const t = g.tagName, cl = 'ornaments>' + t; if (half(g)) return;
            if (t === 'tremolo') { const ty = g.getAttribute('type') || 'single', n = +g.textContent.trim();
              if (!rest && ty === 'single' && n >= 1 && n <= 3) { k(cl + '[单音]', 'keep'); if (g === nt.querySelector('ornaments > tremolo')) P.trem++; }
              /* v70.4 有意迁移：双音震音 start（1–4 杠）收进 col.trem2（stop 是半个，上面 half 已跳过）——由「进报告」改「保留」 */
              else if (!rest && ty === 'start' && n >= 1 && n <= 4 && n === Math.round(n)) { k(cl + '[双音]', 'keep'); if (g === nt.querySelector('ornaments > tremolo')) P.trem2++; }
              else k(cl + '[' + ty + ']', 'rep', '震音'); return; }
            if (t === 'accidental-mark') { if (pick && AMV.indexOf((g.textContent || '').trim()) >= 0) k(cl, 'keep'); else k(cl, 'rep', t); return; }
            if (VORN.indexOf(t) >= 0 && t === pick) { k(cl, 'keep'); return; }
            k(cl, 'rep', t); }); return; }
        if (tg === 'technical') { let fg = 0; [...c.children].forEach(g => { if (half(g)) return; const cl = 'technical>' + g.tagName;
          if (g.tagName === 'fingering' && !fg && !rest) { fg = 1; if (/^[1-5]$/.test(g.textContent.trim())) { P.fing++; k(cl, 'keep'); return; } }
          k(cl, 'rep', g.tagName); }); return; }
      });
      return;
    }
    if ((kind === 'main' || rest) && nt.querySelector('fermata')) P.ferm++;
    const techs = []; let slideSt = false;
    [...nt.children].forEach(c => { const tg = c.tagName, cls = 'notations>' + tg + '[六线谱]';
      if (tg === 'tuplet') { k(cls, 'derive'); return; }
      if (half(c)) return;
      if (TNOT.indexOf(tg) < 0) { if (BOX.indexOf(tg) >= 0) boxRep(c, '[六线谱]'); else k(cls, 'rep', tg); return; }
      if (tg === 'tied') { k(cls, 'keep'); return; }
      if (tg === 'slide') { if (kind === 'grace' || rest) k(cls, 'rep', 'slide'); else slideSt = true; return; }
      if (tg === 'fermata') { if (kind === 'grace' || (kind === 'chord' && !(mainEl && mainEl.querySelector(':scope > notations > fermata')))) k(cls, 'rep', 'fermata'); else k(cls, 'keep'); return; }
      [...c.children].forEach(g => { const t = g.tagName, cl = 'technical>' + t + '[六线谱]', v = (g.textContent || '').trim(); if (half(g)) return;
        if (kind === 'grace') { if (t === 'string' || t === 'fret') k(cl, 'keep'); else k(cl, 'rep', t); return; }
        if (TTECH.indexOf(t) < 0) { k(cl, 'rep', t); return; }
        if (t === 'string' || t === 'fret') { k(cl, 'keep'); return; }
        if (t === 'fingering') { /^[0-4T]$/.test(v.toUpperCase()) ? k(cl, 'keep') : k(cl, 'rep', t); return; }
        if (t === 'pluck') { /^[pima]$/.test(v) ? k(cl, 'keep') : k(cl, 'rep', t); return; }
        if (t === 'down-bow' || t === 'up-bow') { (kind === 'chord' && !(mainEl && mainEl.querySelector(':scope > notations > technical > ' + t))) ? k(cl, 'rep', t) : k(cl, 'keep'); return; }
        if (t === 'other-technical') { if (/^w\.bar /.test(v) || /^[APT]\.H\.?$/.test(v) || v === 'bend-target') { k(cl, 'keep'); return; } if (OTT.indexOf(v) < 0) { k(cl, 'rep', t); return; } techs.push('ot'); return; }
        if ((t === 'hammer-on' || t === 'pull-off') && g.getAttribute('type') !== 'start') { k(cl, 'rep', t); return; }
        techs.push(t); }); });
    if (kind === 'grace' || rest) return;
    const have = []; ['hammer-on', 'pull-off', 'tap', 'bend', 'harmonic', 'slide', 'ot'].forEach(t => { const n = t === 'slide' ? (slideSt ? 1 : 0) : techs.filter(x => x === t).length; for (let i = 0; i < n; i++) have.push(t); });
    have.forEach((t, i) => { const nm = t === 'ot' ? 'other-technical' : t, cl = (t === 'slide' ? 'notations>slide' : 'technical>' + nm) + '[六线谱]'; if (!i) k(cl, 'keep'); else k(cl + '[同音第二个技法]', 'rep', nm); });
  };
  const dirCensus = (el, vp, isPrim) => {
    const dy = el.querySelector('direction-type > dynamics > *');
    if (!vp.tab && dy && dy.tagName === 'other-dynamics') { const SMD = { '': 'p', '': 'm', '': 'f', '': 'r', '': 's', '': 'z', '': 'n' };
      if (!dy.textContent.replace(/[-]/g, c => SMD[c]).replace(/[\s()\[\]]/g, '')) EXP['other-dynamics'] = (EXP['other-dynamics'] || 0) + 1; }
    [...el.querySelectorAll(':scope > direction-type')].forEach(dt => [...dt.children].forEach(c => { const tg = c.tagName, cls = 'direction-type>' + tg + (vp.tab ? '[六线谱]' : '');
      if (half(c)) return;
      if (vp.tab) { if (TDIR.indexOf(tg) < 0) { k(cls, 'rep', tg); return; }
        if (tg === 'words') { (isPrim && navOf(el)) ? k(cls + '[导航]', 'keep') : k(cls, 'rep', 'words'); return; }
        if (tg === 'metronome') { (voxCount > 0 || (el === tBestEl && vp.nSt < 2)) ? k(cls, 'keep') : k(cls, 'rep', 'metronome'); return; }
        k(cls, 'keep'); return; }
      if (VDIR.indexOf(tg) < 0) { k(cls, 'rep', tg); return; }
      if (tg === 'dashes') { P.dash++; k(cls, 'keep'); return; }   /* 延续虚线按谱面数据守恒核对：挂上的（cresc. / dim. 的 dynTo）＋ 报告的＝源里的 */
      if (tg === 'pedal') { const t = c.getAttribute('type'); (t === 'start' || t === 'change') ? k(cls, 'keep') : k(cls + '[' + t + ']', 'rep', 'pedal'); return; }
      if (tg === 'octave-shift') { const s = c.getAttribute('size') || '8'; (s === '8' || s === '15') ? k(cls, 'keep') : k(cls + '[size ' + s + ']', 'rep', 'octave-shift'); return; }
      k(cls, 'keep'); }));
  };
  const barCensus = bl => [...bl.children].forEach(c => { const tg = c.tagName, cls = 'barline>' + tg; if (half(c)) return;
    if (BAR.indexOf(tg) < 0) { k(cls, 'rep', tg); return; }
    if (tg === 'ending') { const n = c.getAttribute('number') || '1'; /^\s*[12]\s*$/.test(n) ? k(cls, 'keep') : k(cls + '[' + n + ']', 'rep', '房子编号'); return; }
    if (tg === 'bar-style') { const v = c.textContent.trim(); ['regular', 'light-light', 'light-heavy', 'heavy-light'].indexOf(v) >= 0 ? k(cls, 'keep') : k(cls + '[' + v + ']', 'rep', 'bar-style'); return; }
    k(cls, 'keep'); });
  /* 时值读不出（type 缺、duration 凑不成单个时值、休止也拆不开）→ 照收但计 skip.notes（同导入） */
  const durBad = (el, div, tab) => { const rE = q(el, 'rest'), mR = !tab && !!(rE && rE.getAttribute('measure') === 'yes'); if (!mR && TYI[tx(el, 'type') || '']) return false;
    const qn = (+(tx(el, 'duration') || 0)) / div;
    for (const v of [4, 2, 1, 0.5, 0.25, 0.125, 0.0625]) if ([1, 1.5, 1.75, 2 / 3].some(f => Math.abs(qn - v * f) < 1e-3)) return false;
    if (!tab && rE && qn > 0) { let left = qn, n = 0; for (const v of [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.375, 0.25, 0.125, 0.0625]) while (left >= v - 1e-3 && n < 16) { n++; left -= v; } if (n && left < 1e-3) return false; }
    return true; };
  /* v70.5 B 组 声部预扫（独立实现，规格 §4.2）：每个源 part 拆谱表之前扫一遍；R1 缺 voice 记 ''、和音继承主音、倚音同下一个主音；
     R2 任一声部同一小节两张谱表时间重叠（非和音非倚音，含休止）＝按谱表编号，键＝(v, staff)，否则键＝v、归属谱表取个数多数（平票取小号）；
     R3 每谱表有音高的声部按 voice 号升序：宿主 / 层 / 丢（rank≥2）；纯休止声部不排名（本谱表没有有音高的声部时取最小的当宿主） */
  const PREm = new Map();
  [...root.querySelectorAll(':scope > part')].forEach(p => { const at = p.querySelector(':scope > measure > attributes'), nSt = at ? +(tx(at, 'staves') || 1) : 1, R = [];
    [...p.querySelectorAll(':scope > measure')].forEach((m, mi) => { let t = 0, last = null; const pg = [];
      [...m.children].forEach(el => { const tg = el.tagName;
        if (tg === 'backup' || tg === 'forward') { const dd = +(tx(el, 'duration') || 0) || 0; if (tg === 'forward' && tx(el, 'voice') != null) R.push({ el, v: tx(el, 'voice'), st: +(tx(el, 'staff') || 1) || 1, fw: true, mi, a: t, b: t + dd });
          t = tg === 'backup' ? Math.max(0, t - dd) : t + dd; return; }
        if (tg !== 'note') return;
        const gr = !!q(el, 'grace'), ch = !!q(el, 'chord'), v0 = tx(el, 'voice'), du = +(tx(el, 'duration') || 0) || 0;
        const r = { el, v: v0, st: +(tx(el, 'staff') || 1) || 1, gr, ch, pit: !!(q(el, 'pitch') || el.querySelector(':scope > notations > technical > fret')), mi, a: t, b: (!gr && !ch) ? t + du : t };
        if (v0 == null) { if (ch) r.v = last == null ? '' : last; else if (gr) pg.push(r); else r.v = ''; }
        if (!gr && !ch) { t += du; last = r.v; pg.splice(0).forEach(g => { g.v = r.v; }); }
        R.push(r); });
      pg.forEach(g => { g.v = last == null ? '' : last; }); });
    let perSt = false;
    if (nSt >= 2) { const by = {}; R.forEach(r => { if (r.fw || r.gr || r.ch || !(r.b > r.a)) return; (by[r.mi + '|' + r.v] = by[r.mi + '|' + r.v] || []).push(r); });
      perSt = Object.values(by).some(L => L.some(x => L.some(y => x.st !== y.st && x.a < y.b - 1e-6 && y.a < x.b - 1e-6))); }
    const cnt = {}, home = {}, vOf = {}, role = {}, kOf = new Map();
    R.forEach(r => { r.k = perSt ? r.v + '@' + r.st : r.v; vOf[r.k] = r.v; kOf.set(r.el, r.k); if (!r.fw && !r.gr && !r.ch) { const c = cnt[r.k] = cnt[r.k] || {}; c[r.st] = (c[r.st] || 0) + 1; } });
    R.forEach(r => { if (home[r.k] != null) return; if (nSt < 2) home[r.k] = 1; else if (perSt || !cnt[r.k]) home[r.k] = r.st;
      else { const c = cnt[r.k]; home[r.k] = +Object.keys(c).sort((x, y) => c[y] - c[x] || x - y)[0]; } });
    const num = v => v === '' ? -Infinity : (/^\s*-?\d+(\.\d+)?\s*$/.test(v) ? +v : Infinity);
    for (let st = 1; st <= Math.max(1, nSt); st++) {
      const ks = [...new Set(R.filter(r => home[r.k] === st).map(r => r.k))].sort((x, y) => (num(vOf[x]) - num(vOf[y])) || (vOf[x] < vOf[y] ? -1 : vOf[x] > vOf[y] ? 1 : 0));
      const pk = ks.filter(x => R.some(r => r.k === x && !r.fw && r.pit));
      if (pk.length) { role[pk[0]] = 'host'; if (pk[1] != null) role[pk[1]] = 'lay'; pk.slice(2).forEach(x => { role[x] = 'drop'; }); }
      else { const h = ks.find(x => R.some(r => r.k === x && !r.fw)); if (h != null) role[h] = 'host'; } }
    PREm.set(p, { home, role, kOf, nSt }); });
  /* 空拍补隐形休止：至少一个 64 分音符；凑不成 64 分音符整数倍（或起点不在 64 分音符格上）的才进报告「空拍」——同导入的按拍位拆（起点对齐的二分时值） */
  const hidOk = (a, b2, div) => { const g = (b2 - a) / div, s0 = a / div; return Math.abs(g * 16 - Math.round(g * 16)) < 0.02 && Math.abs(s0 * 16 - Math.round(s0 * 16)) < 0.02; };
  const gapK = (a, b2, div) => { if (b2 - a >= div / 16 - 1e-6) { if (hidOk(a, b2, div)) k('（时间）空拍 → 隐形休止', 'keep'); else k('（时间）空拍[凑不成整时值]', 'rep', '空拍'); } };
  vparts.forEach(vp => { const isPrim = vp === primary, tab = vp.tab, PM = PREm.get(vp.p); let div = 24; const SK = {};
    const sk = kk => SK[kk] || (SK[kk] = { fill: 0, nCols: 0, addN: 0, gN: 0, mainEl: null });
    const roleOf = kk => (PM.home[kk] === vp.k || vp.nSt < 2) ? PM.role[kk] : 'other';
    const pair = !tab && Object.keys(PM.role).some(x => PM.role[x] === 'lay' && (vp.nSt < 2 || PM.home[x] === vp.k));   /* 本谱表有第二声部（层）：小节末按谱表补齐 */
    [...vp.p.querySelectorAll(':scope > measure')].forEach(m => {
      let tcur = 0; Object.keys(SK).forEach(x => { SK[x].fill = 0; SK[x].nCols = 0; SK[x].addN = 0; });
      [...m.children].forEach(el => { const tg = el.tagName;
        if (tg === 'attributes') { const dv = tx(el, 'divisions'); if (dv) div = +dv || div; return; }
        const st = +(tx(el, 'staff') || 1), mine = !(vp.nSt >= 2 && st !== vp.k);
        if (tg === 'backup' || tg === 'forward') { const dd = +(tx(el, 'duration') || 0) || 0;
          /* 本行声部的 forward：前面的空拍与它自己那段都补隐形休止 */
          if (tg === 'forward' && !tab) { const fk = PM.kOf.get(el), ro = fk != null ? roleOf(fk) : null;
            if (ro === 'host' || ro === 'lay') { const S0 = sk(fk); gapK(S0.fill, tcur, div); gapK(Math.max(S0.fill, tcur), tcur + dd, div); S0.fill = Math.max(S0.fill, tcur + dd); } }
          tcur = tg === 'backup' ? Math.max(0, tcur - dd) : tcur + dd; return; }
        if (tg === 'direction') { if (mine) dirCensus(el, vp, isPrim); return; }
        if (tg === 'harmony') { if (!mine) return; const kd = q(el, 'kind'); if (kd && kd.getAttribute('text') == null && KIND.indexOf(kd.textContent.trim()) < 0) EXP['和弦类型'] = (EXP['和弦类型'] || 0) + 1; return; }
        if (tg === 'barline') { if (isPrim) barCensus(el); return; }
        if (tg !== 'note') return;
        const gr = !!q(el, 'grace'), ch = !!q(el, 'chord'), du = +(tx(el, 'duration') || 0) || 0, kk = PM.kOf.get(el), ro = roleOf(kk);
        const tS = tcur; if (!gr && !ch) tcur += du;
        /* 不是本谱表的声部（归属谱表不在这里）：只推进游标 */
        if (ro === 'other' || ro == null) return;
        /* rank≥2（六线谱：第二声部起）：有音高的音（主音 / 和音 / 倚音）计 skip.voices，休止不计 */
        if (ro === 'drop' || (tab && ro === 'lay')) { if (q(el, 'pitch') || el.querySelector(':scope > notations > technical > fret')) { expVoices++; k(tab ? 'note[同谱表第二声部][六线谱]' : 'note[同谱表第 3 个起的声部]', 'rep'); } return; }
        const S0 = sk(kk);
        /* v70.4 有意迁移（v70.3 验收 minor）：六线谱第一声部 forward 留下的空拍按时值补普通休止（保留，不再进报告）；v70.5：旋律行补隐形休止，凑不成整时值的才进报告 */
        const gap = () => { if (tab) { if (tS - S0.fill >= div / 16 - 1e-6) k('（时间）forward 空拍 → 补休止[六线谱]', 'keep'); } else gapK(S0.fill, tS, div); S0.fill = tcur; };
        mainEl = S0.mainEl;
        if (!tab) {
          if (gr) { if (q(el, 'pitch') && !ch && S0.gN < 3) { S0.gN++; P.grace++; noteCensus(el, 'grace', false); } else { expNotes++; k('note[倚音·第 4 个起 / 和弦 / 无音高]', 'rep'); } return; }
          if (durBad(el, div, false)) expNotes++;
          if (q(el, 'rest')) { gap(); S0.nCols++; colId++; S0.addN = 0; mainEl = S0.mainEl = el; noteCensus(el, 'rest', false); return; }
          if (!q(el, 'pitch')) { expNotes++; S0.fill = tcur; k('note[无音高]', 'rep'); return; }
          if (ch && S0.nCols > 0) { if (S0.addN < 3) { S0.addN++; noteCensus(el, 'chord', false); } else { expNotes++; k('note[第 4 个起的附加音]', 'rep'); } return; }
          gap(); S0.nCols++; colId++; S0.addN = 0; S0.gN = 0; mainEl = S0.mainEl = el; noteCensus(el, 'main', false); return;
        }
        const tech = el.querySelector(':scope > notations technical'), sE = tech && tech.querySelector('string'), fE = tech && tech.querySelector('fret');
        if (gr) { if (sE && fE && S0.gN < 3) { S0.gN++; noteCensus(el, 'grace', true); } else { expNotes++; k('note[倚音·超出][六线谱]', 'rep'); } return; }
        if (durBad(el, div, true)) expNotes++;
        if (q(el, 'rest')) { gap(); S0.nCols++; mainEl = S0.mainEl = el; noteCensus(el, 'rest', true); return; }
        if (!sE || !fE) { expNotes++; if (!ch) S0.fill = tcur; k('note[无弦 / 品][六线谱]', 'rep'); return; }
        if (ch && S0.nCols > 0) { noteCensus(el, 'chord', true); return; }
        gap(); S0.nCols++; S0.gN = 0; mainEl = S0.mainEl = el; noteCensus(el, 'main', true); });
      /* 小节末：没有层的行照旧（末尾 forward 留下的空拍进报告 / 六线谱补休止）；有层的谱表两行都补到本谱表写到的最大时间 */
      const mineK = Object.keys(SK).filter(x => roleOf(x) === 'host' || (!tab && roleOf(x) === 'lay'));
      if (pair) { const tM = Math.max(0, ...mineK.map(x => SK[x].fill)); mineK.forEach(x => { if (SK[x].fill > 0 || tM > 0) gapK(SK[x].fill, tM, div); }); }
      else mineK.forEach(x => { const S0 = SK[x]; if (S0.nCols && tcur - S0.fill >= div / 16 - 1e-6) { if (tab) k('（时间）forward 空拍 → 补休止[六线谱]', 'keep'); else k('（时间）forward 留下的空拍', 'rep', '空拍'); } }); }); });
  /* 谱面数据上的保留数 */
  const S = im.song, got = { ferm: 0, breath: 0, trem: 0, trem2: 0, grace: 0, lyr: 0, fing: 0, afing: 0, gliss: 0, artic: {}, orn: {}, dash: 0 };
  S.measures.forEach(m => { (m.voxes || []).forEach(r => (r || []).forEach(c => { if (!c) return;
      if (c.ferm) got.ferm++; if (c.breath) got.breath++; if (c.trem) got.trem++; if (c.trem2) got.trem2++; if (c.grace && c.grace.notes) got.grace += c.grace.notes.length;
      (c.lyrics || []).forEach(t => { if (t && String(t).trim()) got.lyr++; }); if (c.fing) got.fing++; (c.adds || []).forEach(a => { if (a && a.fing) got.afing++; });
      if (c.gliss) got.gliss++; if (c.artic) got.artic[c.artic] = (got.artic[c.artic] || 0) + 1; if (c.orn) got.orn[c.orn] = (got.orn[c.orn] || 0) + 1;
      if (c.dynTo && (c.dyn === 'cresc.' || c.dyn === 'dim.')) got.dash++; }));
    (m.tabs || []).forEach(r => (r || []).forEach(c => { if (c && c.ferm) got.ferm++; })); });
  const OB = (im.skip && im.skip.otherBy) || {};
  if (P.dash > got.dash) { const n = P.dash - got.dash; EXP['dashes'] = (EXP['dashes'] || 0) + n;   /* 没挂上的延续虚线（跟别的文字 / 跟在真力度后转成标注的 cresc.）该进报告 */
    C['direction-type>dashes'].keep -= n; (C['direction-type>dashes[没挂上]'] = C['direction-type>dashes[没挂上]'] || { keep: 0, derive: 0, rep: 0 }).rep += n; }
  let silent = 0, over = 0; const why = [];
  const cmp = (lbl, e, g) => { if (e > g) { silent += e - g; why.push('静默丢 ' + lbl + ' ' + (e - g)); } else if (g > e) { over += g - e; why.push('多出 ' + lbl + ' ' + (g - e)); } };
  [...new Set([...Object.keys(EXP), ...Object.keys(OB)])].forEach(nm => cmp('报告「' + nm + '」', EXP[nm] || 0, OB[nm] || 0));
  cmp('skip.notes', expNotes, im.skip.notes | 0); cmp('skip.voices', expVoices, im.skip.voices | 0); cmp('skip.lyrics', expLyr, im.skip.lyrics | 0);
  cmp('skip.other 合计', Object.values(EXP).reduce((a, b) => a + b, 0), im.skip.other | 0);
  ['ferm', 'breath', 'trem', 'trem2', 'grace', 'lyr', 'fing', 'afing', 'gliss'].forEach(kk => cmp('保留·' + kk, P[kk], got[kk]));
  [...new Set([...Object.keys(P.artic), ...Object.keys(got.artic)])].forEach(kk => cmp('保留·artic ' + kk, P.artic[kk] || 0, got.artic[kk] || 0));
  [...new Set([...Object.keys(P.orn), ...Object.keys(got.orn)])].forEach(kk => cmp('保留·orn ' + kk, P.orn[kk] || 0, got.orn[kk] || 0));
  if (P.dash < got.dash) cmp('保留·dashes', P.dash, got.dash);
  return { C, EXP, OB, silent, over, why, skip: im.skip, txt: typeof skipText === 'function' ? skipText(im.skip) : '', P, got,
    cols: S.measures.map(m => [(m.voxes || []).map(r => (r || []).length), (m.tabs || []).map(r => (r || []).length)]),
    beats: S.measures.map(m => (m.tabs || []).concat(m.voxes || []).map(r => (r || []).reduce((a, c) => a + beatsOf(c, m.unit || S.unit), 0))),
    grace0: ((((S.measures[0] || {}).voxes || [])[0] || [])[0] || {}).grace || null };
}

(async () => {
  const t0 = Date.now();
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  pg.on('pageerror', e => errs.push(String(e && e.message || e)));
  await pg.goto(URL0 + (URL0.includes('?') ? '&' : '?') + 'shell=classic');
  await pg.waitForFunction(() => typeof importMusicXML === 'function' && typeof loadSong === 'function');
  const R = {};
  for (const s of SRC) R[s.name] = await pg.evaluate(censusFn, s.x);

  /* S1 分类汇总表 + 每份静默丢 / 多报 */
  const ALL = {};
  Object.values(R).forEach(r => { if (!r || !r.C) return; for (const c in r.C) { const a = ALL[c] || (ALL[c] = { keep: 0, derive: 0, rep: 0 }); ['keep', 'derive', 'rep'].forEach(x => { a[x] += r.C[c][x]; }); } });
  console.log('元素 / 取值域'.padEnd(44) + '保留    重算    进报告');
  Object.keys(ALL).sort().forEach(c => { const a = ALL[c]; console.log('  ' + c.padEnd(42) + String(a.keep).padEnd(8) + String(a.derive).padEnd(8) + a.rep); });
  let silent = 0, over = 0; const bad = [];
  for (const s of SRC) { const r = R[s.name];
    if (!r || r.err || r.partsSkipped) { bad.push(s.name + '：' + (r ? (r.err || ('超出声部上限 ' + r.partsSkipped + '，未核对')) : '无结果')); continue; }
    silent += r.silent; over += r.over;
    console.log('  ' + (r.silent || r.over ? '✗ ' : '· ') + s.name.padEnd(46) + ' 进报告 ' + J(r.OB) + (r.why.length ? '  ' + r.why.join('；') : ''));
    if (r.silent || r.over) bad.push(s.name + '：' + r.why.join('；')); }
  T(!bad.length && silent === 0 && over === 0, 'S1 导入台账：' + SRC.length + ' 份输入（曲库 ' + MAN.items.length + ' ＋ fixture ' + SRC.filter(s => /^fixture/.test(s.name)).length + ' ＋ 探针 ' + Object.keys(PROBE).length + '）「静默丢」0、「多报」0',
    '静默丢 ' + silent + ' · 多报 ' + over + '；' + bad.join(' | '));

  /* S2 震音点名 */
  const zw = R[SRC.find(s => /lc6838113/.test(s.name)).name], at = R[SRC.find(s => /lc4985985/.test(s.name)).name];
  /* v70.4 有意迁移（基石方案 §3.2 A）：双音震音收进 col.trem2——由「进报告」改「保留」：skip.otherBy 不再有「震音」、导入报告不再点名，保留数 188 / 51 对（独立统计 P 与谱面数据 got 相等） */
  T(zw.OB && !zw.OB['震音'] && !/震音/.test(zw.txt) && at.OB && !at.OB['震音'] && !/震音/.test(at.txt) && zw.P.trem2 === 188 && zw.got.trem2 === 188 && at.P.trem2 === 51 && at.got.trem2 === 51,
    'S2《侏儒》双音震音 188 对、《阿特拉斯》51 对收进 col.trem2（保留；skip.otherBy 与导入报告不再有「震音」）', J({ zw: [zw.OB, zw.txt, zw.P.trem2, zw.got.trem2], at: [at.OB, at.txt, at.P.trem2, at.got.trem2] }));

  /* S3 探针 */
  const pr = k => R['probe ' + k];
  { const r = pr('grace5'); T(r.skip.notes === 2 && r.grace0 && (r.grace0.notes || []).length === 3, 'S3① 5 个倚音一组 → skip.notes=2、前 3 个挂到主音', J([r.skip, r.grace0])); }
  { const r = pr('tabv2'); T(r.cols[0][1][0] === 4 && r.skip.voices === 1 && Math.abs(r.beats[0][0] - 4) < 1e-6, 'S3② 六线谱 4 个四分音符＋backup＋voice 2 全音符 → 4 列、skip.voices=1、小节 4 拍不超拍', J({ cols: r.cols[0], beats: r.beats[0], skip: r.skip })); }
  { const r = pr('volta'); T(r.OB['房子编号'] === 2 && r.skip.other === 2, 'S3③ number="1, 2" 与 "3" 的房子各计 1（房子编号 2）、单个 1 / 2 不计', J(r.skip)); }
  { const r = pr('arp'); T(r.OB['琶音'] === 2 && r.skip.other === 2, 'S3④ 琶音按列计：和弦每音带 <arpeggiate> 计 1、<non-arpeggiate> 计 1', J(r.skip)); }
  { const r = pr('gchord'); T(r.skip.notes === 1 && r.grace0 && (r.grace0.notes || []).length === 1, 'S3⑤ 和弦倚音（<grace> 带 <chord>）计 skip.notes、第一个倚音照收', J([r.skip, r.grace0])); }
  { const r = pr('misc'), want = ['caesura', 'wavy-line', 'notehead-diamond', 'up-bow', 'pedal', 'bracket', 'dashes', 'lyric', 'dynamics', 'bar-style', 'fermata', 'cue'];
    T(want.every(n => r.OB[n] >= 1) && !r.silent, 'S3⑥ 杂项按名进报告：' + want.join(' / '), J(r.OB)); }
  /* v70.5 B 组 S3⑦（静默丢 / 多报已由 S1 逐份核对；这里另核谱面形态） */
  { const L = pr('lay'), V3 = pr('v3'), X = pr('xst'), R2 = pr('rest2'), PO = pr('po'), TU = pr('tup');
    T(L.skip.voices === 0 && L.cols[0][0].length === 2 && V3.skip.voices === 2 && X.skip.voices === 0 && X.cols[0][0].join() === '4,1' && R2.skip.voices === 0 && R2.cols[0][0].length === 1
      && !(PO.OB['空拍']) && TU.OB['空拍'] === 1 && !L.silent && !V3.silent && !X.silent && !R2.silent && !PO.silent && !TU.silent,
      'S3⑦ 同谱表第二声部成层（不计 skip.voices）、第 3 个声部的有音高音与倚音计 2（休止不计）、跨谱表的音留在右手、只有休止的 voice 2 不计、print-object 休止与 voice 1 forward 成隐形休止、三连音里的空拍仍计「空拍」',
      J({ lay: [L.skip, L.cols[0]], v3: V3.skip, xst: [X.skip, X.cols[0]], rest2: [R2.skip, R2.cols[0]], po: PO.OB, tup: TU.OB })); }

  /* S4 白名单与文案 */
  const s4 = await pg.evaluate(() => ({ led: typeof MXL_LED === 'object' && Array.isArray(MXL_LED.vox && MXL_LED.vox.note) && Array.isArray(MXL_LED.tab && MXL_LED.tab.technical) && Array.isArray(MXL_LED.barline),
    t6: skipText({ other: 21, otherBy: { '震音': 6, accent: 5, notehead: 4, dashes: 3, 'detached-legato': 2, caesura: 1 } }), t1: skipText({ other: 3, otherBy: { '房子编号': 3 } }), t0: skipText({ other: 2 }) }));
  T(s4.led && /其他记号 21 处（震音 6 对、重音 5、符头样式 4、延续虚线 3、半断奏 2 等）/.test(s4.t6) && /其他记号 3 处（房子编号 3）/.test(s4.t1) && /其他记号 2 处$/.test(s4.t0),
    'S4 MXL_LED 白名单在；skipText 按名点出前 5 类（多于 5 类写「等」，没有 otherBy 照旧只报总数）', J(s4));

  /* S5 B4 质量门 ③ 扩口径（deploy/build-library.js）：造一份反例清单——侏儒去掉白名单、阿特拉斯白名单少 1 对且没签字——必须不过门、逐曲点名；
     （正例：曲库 10 首与签字白名单一致＝tv_library L1 的 build-library --check） */
  { const man = JSON.parse(JSON.stringify(MAN)), zi = man.items.find(i => /lc6838113/.test(i.id)), ai = man.items.find(i => /lc4985985/.test(i.id));
    delete zi.skipAllow; ai.skipAllow = { other: { '震音': 50 }, why: '反例' };
    const tmp = path.join(require('os').tmpdir(), 'pyq-mxlsrc-' + process.pid + '.json');
    fs.writeFileSync(tmp, JSON.stringify({ items: [zi, ai] }));
    let msg = '', code = 0;
    try { msg = require('child_process').execFileSync('node', [path.join(ROOT, 'deploy', 'build-library.js'), '--check', '--manifest=' + tmp], { encoding: 'utf8', env: Object.assign({}, process.env, { MUSETAB_URL: '' }), timeout: 300000, stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { code = e.status; msg = (e.stdout || '') + (e.stderr || ''); }
    try { fs.unlinkSync(tmp); } catch (_) {}
    /* v70.4 有意迁移：震音不再计数——侏儒去掉白名单后剩下的延续虚线 3 / 括号符头 9 不过门；阿特拉斯白名单写了已经不计的「震音」50 对（实际 0）且没签字也不过门 */
    T(code === 1 && /未过质量门/.test(msg) && /lc6838113[^\n]*其他「dashes」3（白名单 0）/.test(msg) && /lc6838113[^\n]*其他「notehead-paren」9（白名单 0）/.test(msg) && !/lc6838113[^\n]*震音/.test(msg)
      && /lc4985985[^\n]*白名单缺签字[^\n]*其他「震音」0（白名单 50）/.test(msg),
      'S5 质量门③：去掉白名单的侏儒（虚线 3 / 符头 9，不再有震音）、白名单与实际不符且没签字的阿特拉斯都不过门，逐曲点名', msg.trim().slice(0, 900)); }

  /* ===== C 编辑纠错（§3.1 C） ===== */
  const c1 = await pg.evaluate(() => { const R = {};
    const V = (deg, dur, o) => Object.assign({ dur, dotted: false, deg, acc: '', oct: 0, lyrics: [], tie: false }, o || {});
    const ld = (s, o) => { o = o || {}; window.guardReplace = p => p(); loadSong(s); undoStack.length = 0; redoStack.length = 0;
      sel = { mi: o.mi || 0, row: o.row || 'vox', vi: 0, ci: o.ci || 0, si: o.si || 1 }; lastEnt = null; selRange = null; noteSel = []; render(); };
    const base = (k, o) => createSong(k || 'vox', Object.assign({ title: 't', key: 'C', beats: 4, unit: 4, nMea: 2, nVox: 1, lyr: 1 }, o || {}));
    /* ① 普通插入（后插）：同小节渐强终点、跨小节渐强终点（终点在下一小节）都随之后移 */
    { const s = base(); s.measures[0].voxes[0] = [V(1, 4, { dyn: '<', dynTo: { mi: 0, ci: 3 } }), V(2, 4), V(3, 4), V(4, 4, { dyn: '>', dynTo: { mi: 1, ci: 2 } })];
      s.measures[1].voxes[0] = [V(5, 4), V(6, 4), V(7, 4), V(1, 4, { oct: 1 })];
      const s0 = JSON.stringify(s);
      ld(JSON.parse(s0), { ci: 1 }); const j0 = JSON.stringify(song.measures);
      const tgt0 = song.measures[0].voxes[0][3], tgt1 = song.measures[1].voxes[0][2];
      insertNote(false); const c0 = song.measures[0].voxes[0], a = c0[0].dynTo, b = c0[4].dynTo;
      R.after = { n: c0.length, a, same: c0[a.ci] === tgt0, b, same2: song.measures[b.mi].voxes[0][b.ci] === tgt1 };
      undo(); R.undo = JSON.stringify(song.measures) === j0;
      ld(JSON.parse(s0), { mi: 1, ci: 0 }); const tgt2 = song.measures[1].voxes[0][2]; insertNote(true); const b2 = song.measures[0].voxes[0][3].dynTo;
      R.before = { b2, same: song.measures[1].voxes[0][b2.ci] === tgt2 }; }
    /* ② 前插：五线谱 8va 终点 ottTo 随之后移 */
    { const s = base(); s.voxNotations = ['staff']; s.measures[0].voxes[0] = [V(5, 4, { ott: '8va', ottTo: { mi: 0, ci: 3 } }), V(6, 4, { ott: '8va' }), V(7, 4, { ott: '8va' }), V(1, 4, { ott: '8va', oct: 1 })];
      ld(s, { ci: 2 }); const tgt = song.measures[0].voxes[0][3]; insertNote(true); const c = song.measures[0].voxes[0], t = c[0].ottTo;
      R.ott = { t, same: c[t.ci] === tgt, deg: c[t.ci] && c[t.ci].deg }; }
    /* ③ 六线谱：击弦 tk 落点随之后移（插在起点之后、落点之前） */
    { const s = base('solo', { nVox: 0 }); const c0 = s.measures[0].tabs[0]; c0[0].notes = [{ s: 3, f: 5, tech: 'h', tk: { mi: 0, ci: 2, si: 3 } }]; c0[2].notes = [{ s: 3, f: 7 }];
      ld(s, { row: 'tab', ci: 0, si: 3 }); const tgt = song.measures[0].tabs[0][2]; insertNote(false); const c = song.measures[0].tabs[0], t = c[0].notes[0].tk;
      R.tab = { t, same: c[t.ci] === tgt, f: c[t.ci] && (c[t.ci].notes || [])[0] && c[t.ci].notes[0].f }; }
    /* ④ 插入点在终点之后：引用不动 */
    { const s = base(); s.measures[0].voxes[0] = [V(1, 4, { dyn: '<', dynTo: { mi: 0, ci: 1 } }), V(2, 4), V(3, 4), V(4, 4)];
      ld(s, { ci: 2 }); insertNote(false); const c = song.measures[0].voxes[0]; R.stay = { t: c[0].dynTo, deg: c[c[0].dynTo.ci].deg }; }
    return R; });
  T(c1.after.n === 5 && c1.after.same && c1.after.a.ci === 4 && c1.after.same2 && c1.after.b.mi === 1 && c1.after.b.ci === 2 && c1.before.same && c1.before.b2.ci === 3 && c1.undo
    && c1.ott.same && c1.ott.t.ci === 4 && c1.ott.deg === 1 && c1.tab.same && c1.tab.t.ci === 3 && c1.tab.f === 7 && c1.stay.t.ci === 1 && c1.stay.deg === 2,
    'C1 普通插入 / 前插（不顶替时）平移跨列引用：渐强终点（同小节 / 跨小节）、8va 终点、六线谱击弦落点插入后仍指着原来的音；插在终点之后的不动；一步撤销回原 JSON', J(c1));
  const c2 = await pg.evaluate(() => { const s = createSong('vox', { title: 'n', key: 'C', beats: 3, unit: 4, nMea: 4, nVox: 1, lyr: 0 });
    s.measures[1].beats = 2; s.measures[1].unit = 4; s.measures[2] = null; const j0 = JSON.stringify(s.measures);
    let xml = null, err = ''; try { xml = exportMusicXML(s); } catch (e) { err = String(e && e.message || e); }
    const nm = (exportMusicXML.nullMeas || []).slice();
    let im = null; try { im = xml && importMusicXML(xml); } catch (e) { err = err || String(e.message); }
    const m3 = im && im.song && im.song.measures[2];
    let toastTxt = ''; const t0 = window.toast; window.toast = t => { toastTxt = String(t); };
    const o0 = song, U = URL.createObjectURL, A = HTMLAnchorElement.prototype.click; URL.createObjectURL = () => 'blob:x'; HTMLAnchorElement.prototype.click = function () {};
    try { song = s; downloadMusicXML(); } catch (e) { err = err || String(e.message); } finally { song = o0; window.toast = t0; URL.createObjectURL = U; HTMLAnchorElement.prototype.click = A; }
    return { err, ok: !!xml, nm, kept: JSON.stringify(s.measures) === j0, n: im && im.song ? im.song.measures.length : 0,
      m3: m3 ? m3.voxes[0].map(c => c.deg + '/' + c.dur).join(' ') : '', q3: m3 ? m3.voxes[0].reduce((a, c) => a + (c.deg ? 99 : beatsOf(c, 4)), 0) : -1, toastTxt }; });
  T(!c2.err && c2.ok && J(c2.nm) === '[3]' && c2.kept && c2.n === 4 && c2.q3 === 2 && /第 3 小节数据缺失，按空小节导出/.test(c2.toastTxt),
    'C2 measures 里有 null：exportMusicXML 不抛错、按空小节导出（沿用前面的 2/4）、存储不改；导出提示点名「第 3 小节数据缺失」', J(c2));

  T(!errs.length, 'E 页面脚本错误 0', errs.slice(0, 5).join(' | '));
  console.log((pass === total ? 'PASS ' : 'FAIL ') + pass + '/' + total + (fails.length ? '  红：' + fails.join(' ') : '') + '  ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
