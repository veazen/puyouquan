/* 在真实编辑器页面里执行：从 song / sel / docs 只读地取外壳模型（不写任何字段）。注入实拍用它实时取数；原型用它预先导出的 JSON。 */
function fxModel() {
  const s = song;
  let dt = ''; try { dt = docType(s); } catch (_) {}
  const lock = dt === 'piano' || dt === 'pianoacc' || dt === 'chord';
  const mx = k => (s.mixer || {})[k] || {};
  const T = [];
  (s.tabVoices || []).forEach((n, i) => T.push({ k: 'tab', i, name: n || ('吉他' + (i + 1)), ic: trkIcon('tv', i, 18), ic16: trkIcon('tv', i, 16), ic14: trkIcon('tv', i, 14), nota: 'tab', inst: s.inst === 'uku' ? 'uku' : 'guitar',
    jpRow: !!(s.tabJpVoices || [])[i], on: sel.row === 'tab' && sel.vi === i, mute: mx('tab:' + i).on === false, solo: !!mx('tab:' + i).solo }));
  const nTab = T.length, nL = s.lyricLines | 0;
  (s.voxVoices || []).forEach((n, i) => {
    const nv = (s.voxNotations || [])[i]; let ly = 0;
    try { ly = nL && (voxHasLyrics(s, i, i) || (i === 0 && !(s.voxGroups || []).some(g => i >= g.from && i <= g.to))) ? nL : 0; } catch (_) {}
    T.push({ k: 'vox', i, name: n || ('旋律' + (i + 1)), ic: trkIcon('vv', i, 18), ic16: trkIcon('vv', i, 16), ic14: trkIcon('vv', i, 14),
      nota: (nv === 'staff' || nv === 'bass' || nv === 'alto') ? nv : 'jp', dual: !!(s.voxDual || [])[i], on: sel.row === 'vox' && sel.vi === i,
      mute: mx('vox:' + i).on === false, solo: !!mx('vox:' + i).solo, lyrics: ly });
  });
  if (T.length && !T.some(x => x.on)) T[0].on = true;
  const G = [];
  if (nTab) G.push({ type: 'gtr', name: s.inst === 'uku' ? '尤克里里轨' : '吉他轨', from: 0, to: nTab - 1 });
  (s.voxGroups || []).forEach(g => G.push({ type: g.type === 'brace' ? 'brace' : 'bracket', name: g.type === 'brace' ? '钢琴 · 大谱表' : '声部组', from: nTab + g.from, to: nTab + g.to }));
  try { if (!(s.voxGroups || []).length && isChoir(s) && s.voxVoices.length > 1) G.push({ type: 'bracket', name: '合唱 · ' + ['', '', '二', '三', '四', '五', '六'][s.voxVoices.length] + '声部', from: nTab, to: nTab + s.voxVoices.length - 1 }); } catch (_) {}
  let lib = []; try { lib = libLoad(); } catch (_) {}
  const D = docs.map((d, i) => { const s2 = i === curDocI ? song : d.song; let kind = ''; try { kind = NWB.kindOfSong(s2).name; } catch (_) { try { kind = docTypeLabel(s2); } catch (__) {} }
    return { title: s2.title || '未命名曲谱', kind, ic: docIcon(s2), saved: !!(s2.id && lib.some(x => x.id === s2.id)), on: i === curDocI }; });
  let kind = '', kindIc = ''; try { const k = NWB.kindOfSong(s); kind = k.name; kindIc = pqIcon(k.ic, 16); } catch (_) {}
  const cur = T.find(x => x.on) || T[0];
  const meas = s.measures || [], mi = Math.max(0, Math.min(meas.length - 1, sel.mi | 0));
  let selNote = { pos: '第 ' + (mi + 1) + ' 小节 · 第 ' + ((sel.ci | 0) + 1) + ' 个音' };
  try {
    const col = cur && cur.k === 'vox' ? ((meas[mi].voxes || [])[cur.i] || [])[sel.ci | 0] : null;
    if (col) { const DN = { 1: '全音符', 2: '二分音符', 4: '四分音符', 8: '八分音符', 16: '十六分音符', 32: '三十二分音符' };
      selNote.pitch = col.deg ? String(col.deg) + (col.oct > 0 ? '（高八度）' : col.oct < 0 ? '（低八度）' : '') : '休止';
      selNote.dur = (DN[col.dur] || (col.dur ? col.dur + ' 分' : '')) + (col.dot ? ' 附点' : '');
      const mk = []; if (col.dyn) mk.push('dyn-' + col.dyn); if (col.ferm) mk.push('fermata'); if (col.art === 'acc') mk.push('accent'); if (col.art === 'stacc') mk.push('staccato'); selNote.marks = mk; }
  } catch (_) {}
  const canGen = !lock && dt !== 'func' && (s.inst === 'guitar' || s.inst === 'uku' || !s.inst) && !!(s.voxVoices || []).length;
  return { docs: D, tracks: T, groups: G, tabStaff: !!s.tabStaff, inst: s.inst === 'uku' ? 'uku' : (s.inst || 'guitar'), kind, kindIc, dt,
    lockAdd: lock ? (kind || '这种谱') + '保持整谱形态（谱行由谱类决定），不能单独增删轨。要加旋律或吉他，请「换谱类」。' : null,
    canGenTab: canGen, key: '1=' + (s.key || 'C'), keyName: s.key || 'C', meter: (s.beats || 4) + '/' + (s.unit || 4), tempo: s.tempo || 90,
    bars: meas.length, mi, ci: sel.ci | 0, verses: nL, verse: 1, save: (() => { const st = saveStatusText(s); return { saved: st.saved, time: '' }; })(), selNote,
    dur: (() => { const b = document.querySelector('#eb-dur .on,[data-dur].on'); return b ? +b.dataset.dur || 4 : 4; })() };
}
