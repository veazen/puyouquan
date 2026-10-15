/* v67.5 收尾测试用 MusicXML 小构造器（tv_nfimport I16–I28）：单旋律 / 低音谱号 / 钢琴一个 part 两行谱表 / 人声＋钢琴 / 只有 TAB / 不写拍号 / 3/16 等。
   divisions=2（四分音符＝2），音名 'C4' 'F#3'，'r'＝休止。 */
const TY = { 1: 'eighth', 2: 'quarter', 3: 'quarter', 4: 'half', 6: 'half', 8: 'whole' };
function note(n) {
  if (n.p === 'r') return '<note><rest/><duration>' + n.d + '</duration><type>' + TY[n.d] + '</type>' + (n.d === 3 || n.d === 6 ? '<dot/>' : '') + '</note>';
  const m = /^([A-G])(#|b)?(\d)$/.exec(n.p), alt = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return '<note><pitch><step>' + m[1] + '</step>' + (alt ? '<alter>' + alt + '</alter>' : '') + '<octave>' + m[3] + '</octave></pitch><duration>' + n.d + '</duration>'
    + (n.voice ? '<voice>' + n.voice + '</voice>' : '') + '<type>' + TY[n.d] + '</type>' + (n.d === 3 || n.d === 6 ? '<dot/>' : '') + (n.staff ? '<staff>' + n.staff + '</staff>' : '')
    + (n.s ? '<notations><technical><string>' + n.s + '</string><fret>' + n.f + '</fret></technical></notations>' : '')
    + (n.ly ? '<lyric number="1"><syllabic>single</syllabic><text>' + n.ly + '</text></lyric>' : '') + '</note>';
}
/* o：{title, sw, fifths(null 不写), time:[b,t]|null, bpm, parts:[{name, clef:'G'|'F'|'TAB', staves:2, measures}]}；staves:2 时每小节＝[右手, 左手] */
function mx(o) {
  let x = '<?xml version="1.0" encoding="UTF-8"?>\n<score-partwise version="3.1"><work><work-title>' + (o.title || 'T') + '</work-title></work>'
    + '<identification>' + (o.sw ? '<encoding><software>' + o.sw + '</software></encoding>' : '') + '</identification><part-list>'
    + o.parts.map((p, i) => '<score-part id="P' + (i + 1) + '"><part-name>' + (p.name || 'P' + (i + 1)) + '</part-name></score-part>').join('') + '</part-list>';
  o.parts.forEach((p, pi) => {
    x += '<part id="P' + (pi + 1) + '">';
    p.measures.forEach((mm, mi) => {
      x += '<measure number="' + (mi + 1) + '">';
      if (!mi) {
        x += '<attributes><divisions>2</divisions>' + (o.fifths != null ? '<key><fifths>' + o.fifths + '</fifths></key>' : '')
          + (o.time ? '<time><beats>' + o.time[0] + '</beats><beat-type>' + o.time[1] + '</beat-type></time>' : '')
          + (p.staves ? '<staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef>'
            : p.clef === 'TAB' ? '<clef><sign>TAB</sign><line>5</line></clef><staff-details><staff-lines>6</staff-lines>' + [['E', 2], ['A', 2], ['D', 3], ['G', 3], ['B', 3], ['E', 4]].map(([s, oc], i) => '<staff-tuning line="' + (i + 1) + '"><tuning-step>' + s + '</tuning-step><tuning-octave>' + oc + '</tuning-octave></staff-tuning>').join('') + '</staff-details>'
            : '<clef><sign>' + (p.clef || 'G') + '</sign><line>' + (p.clef === 'F' ? 4 : 2) + '</line></clef>') + '</attributes>';
        if (!pi && o.bpm) x += '<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>' + o.bpm + '</per-minute></metronome></direction-type><sound tempo="' + o.bpm + '"/></direction>';
      }
      if (p.staves) { const tot = mm[0].reduce((a, n) => a + n.d, 0); x += mm[0].map(n => note(Object.assign({ staff: 1, voice: 1 }, n))).join('') + '<backup><duration>' + tot + '</duration></backup>' + mm[1].map(n => note(Object.assign({ staff: 2, voice: 5 }, n))).join(''); }
      else x += mm.map(note).join('');
      x += '</measure>';
    });
    x += '</part>';
  });
  return x + '</score-partwise>';
}
/* 小星星式旋律：nMea 小节、每小节 per 拍四分音符；oct 起始八度；ly 带一个字的歌词 */
const STEP = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
function melody(nMea, opt) {
  opt = opt || {};
  const seq = opt.seq || [1, 1, 5, 5, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1], per = opt.per || 4, oct = opt.oct || 4, out = []; let i = 0;
  for (let m = 0; m < nMea; m++) {
    const row = [];
    for (let b = 0; b < per; b++) { const idx = seq[i % seq.length] - 1; row.push({ p: STEP[idx % 7] + (oct + Math.floor(idx / 7)), d: 2, ly: opt.ly ? '啦' : '' }); i++; }
    out.push(row);
  }
  return out;
}
module.exports = { mx, melody };
