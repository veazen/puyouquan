/* v67.5「从已有音乐」测试用：AI 转谱工具导出的《送别》前 8 小节（MusicXML 3.1，<encoding><software> 写转谱软件名，4/4 ♩=66，带歌词，1 声部五线谱）。
   opt：{key:false 不写调号, software:'' 换软件名, title, fifths} */
const P = { C4: ['C', 4], D4: ['D', 4], E4: ['E', 4], F4: ['F', 4], G4: ['G', 4], A4: ['A', 4], B3: ['B', 3], B4: ['B', 4], C5: ['C', 5] };
const MEL = [
  [['G4', 2, '长'], ['E4', 1, '亭'], ['G4', 1], ['C5', 4, '外']],
  [['A4', 2, '古'], ['C5', 2, '道'], ['G4', 4, '边']],
  [['G4', 2, '芳'], ['C4', 1, '草'], ['D4', 1], ['E4', 2, '碧'], ['D4', 1, '连'], ['C4', 1]],
  [['D4', 6, '天'], [null, 2]],
  [['G4', 2, '晚'], ['E4', 1, '风'], ['G4', 1], ['C5', 3, '拂'], ['B4', 1, '柳']],
  [['A4', 2, '笛'], ['C5', 2, '声'], ['G4', 4, '残']],
  [['G4', 2, '夕'], ['D4', 1, '阳'], ['E4', 1], ['F4', 3, '山'], ['B3', 1, '外']],
  [['C4', 6, '山'], [null, 2]],
];
const TYPE = { 1: ['eighth', 0], 2: ['quarter', 0], 3: ['quarter', 1], 4: ['half', 0], 6: ['half', 1], 8: ['whole', 0] };
function songbieXML(opt) {
  opt = opt || {};
  const sw = opt.software == null ? 'AI Music Transcriber 2.1' : opt.software;
  const notes = mi => MEL[mi].map(([p, d, ly]) => {
    const [ty, dot] = TYPE[d];
    return '<note>' + (p ? '<pitch><step>' + P[p][0] + '</step><octave>' + P[p][1] + '</octave></pitch>' : '<rest/>') + '<duration>' + d + '</duration><voice>1</voice><type>' + ty + '</type>' + (dot ? '<dot/>' : '')
      + (ly ? '<lyric number="1"><syllabic>single</syllabic><text>' + ly + '</text></lyric>' : '') + '</note>';
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n'
    + '<score-partwise version="3.1"><work><work-title>' + (opt.title || '送别（AI 转谱）') + '</work-title></work>'
    + '<identification><creator type="composer">J. P. Ordway</creator><encoding>' + (sw ? '<software>' + sw + '</software>' : '') + '<encoding-date>2026-10-12</encoding-date></encoding></identification>'
    + '<part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list><part id="P1">'
    + MEL.map((_, mi) => '<measure number="' + (mi + 1) + '">' + (mi ? '' : '<attributes><divisions>2</divisions>'
      + (opt.key === false ? '' : '<key><fifths>' + (opt.fifths || 0) + '</fifths></key>') + '<time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>'
      + '<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>66</per-minute></metronome></direction-type><sound tempo="66"/></direction>')
      + notes(mi) + (mi === MEL.length - 1 ? '<barline location="right"><bar-style>light-heavy</bar-style></barline>' : '') + '</measure>').join('')
    + '</part></score-partwise>';
}
module.exports = { songbieXML };
