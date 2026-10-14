/* 宿主适配 · 真实编辑器（file:///home/user/puyouquan/muse-tab/index.html）
   面板（nf-ui.js）只认 NF_HOST；这里把它接到编辑器的真函数上：
   预览＝NWB.sample＋NWB.svg（借谱渲染后归还；正式版改 render() 离屏目标，见 README §7）
   创建＝NWB.build → createSong（零新增 song 字段）→ addDoc（新窗口）
   导入＝importMusicXML / mxlKeyPost / arrangeAccompaniment / suggestChordPlan / mapVoxToTab / parseSMF→showMidiImport / parseGP→showGPTrackModal
   落地＝谱型条（WeakMap 记在内存里，不写进 song：数据红线） */
(function () {
  'use strict';
  const LS_LAST = 'musetab-nw-last';
  const ic = (k, s) => pqIcon(k, s || 20);
  const isMob = () => window.innerWidth <= 820;
  const BARS = new WeakMap();
  const getMeta = () => (typeof docs !== 'undefined' && docs[curDocI] && BARS.get(docs[curDocI])) || null;
  const setMeta = m => { if (typeof docs !== 'undefined' && docs[curDocI]) BARS.set(docs[curDocI], m); };
  const clone = o => JSON.parse(JSON.stringify(o));
  const hasLy = s => (s.measures || []).some(m => (m.voxes || []).some(cs => (cs || []).some(c => c && c.lyrics && c.lyrics.some(x => String(x || '').trim()))));
  const svgFit = r => ({ svg: r.xml.replace(/width="[\d.]+" height="[\d.]+"/, 'preserveAspectRatio="xMidYMin meet"'), bands: r.bands, ms: r.ms });
  const LAT = window.NF_LAT = [];

  /* ───── 宿主接口 ───── */
  const H = window.NF_HOST = {
    isMobile: isMob,
    mobileCreate: () => !!window.NF_MOBILE_CREATE,
    toast: m => { try { toast(m); } catch (_) {} },
    lastLoad() { try { const j = JSON.parse(localStorage.getItem(LS_LAST) || 'null'); return j && j.scene ? j : null; } catch (_) { return null; } },
    lastSave(o) { try { localStorage.setItem(LS_LAST, JSON.stringify(o)); } catch (_) {} },
    preview(k, o) {
      const t0 = performance.now();
      const s2 = NWB.sample(k, { inst: o.inst || 'guitar', nVox: o.nVox || 1, key: o.key, mode: o.mode, beats: o.beats, unit: o.unit, clef: o.clef, instKey: o.instKey,
        title: o.title && o.title !== '未命名曲谱' ? o.title : '', tempo: o.tempo, lyr: o.lyr });
      const r = NWB.svg(s2, { paperW: 660 });
      LAT.push({ k, total: performance.now() - t0, engine: r.ms });
      return svgFit(r);
    },
    create(P) { realCreate(P); },
    copyLink(url) { try { navigator.clipboard.writeText(url).catch(() => {}); } catch (_) {} window.NF_LAST_LINK = url; },
    recent() {
      /* 「接着做」只列自己保存过、非示例、非空的谱（修 P2-24：首访不再把示例当上次编辑） */
      try { const names = new Set(PRESETS.map(p => p.name)); const L = libLoad().filter(x => x && !names.has(x.title) && x.song && !NWB.isEmptySong(x.song));
        if (!L.length) return null; const x = L[0]; return { title: x.title || '未命名曲谱', kind: NWB.kindOfSong(migrate(clone(x.song))).name, when: '' }; } catch (_) { return null; }
    },
    examples: () => PRESETS.map((p, i) => ({ i, name: p.name, ic: NWB.kindOf(NWB.stackOf(p.make()), NWB.ctxOf(p.make())).ic })),
    examplePreview(i) { try { const d = migrate(PRESETS[i].make()); const s = clone(d); s.measures = s.measures.slice(0, 4); s.measures[s.measures.length - 1].finalBar = true; delete s.layout; return svgFit(NWB.svg(s, { paperW: 660 })); } catch (e) { return null; } },
    exampleApply(i, mode, title) {
      const d = migrate(PRESETS[i].make());
      if (mode === 'open') { addDoc(d, () => { render(); toast('已在新窗口打开示例《' + d.title + '》'); }); return; }
      const s = clone(d); s.title = (title || '').trim() || String(d.title || '').replace(/（.*$/, '') + '（同款）';
      const o0 = song; song = s;
      try { s.measures = s.measures.map(m => { const b = blankMeasure(); ['repeatStart', 'repeatEnd', 'finalBar'].forEach(k => { if (m[k]) b[k] = m[k]; }); if (m.beats) { b.beats = m.beats; b.unit = m.unit; } return b; }); } finally { song = o0; }
      delete s.id; s.layout = Object.assign({}, s.layout || {}, { fixed: true });
      addDoc(s, () => { render(); setMeta({ from: 'example' }); showBar(); toast('已按《' + d.title + '》的格式新建《' + s.title + '》：谱行、调、拍号、版式沿用，内容留空'); });
    },
    importPick(kind) { pickFile(kind === 'ai'); },
    importDemo(ai) { NF.importLoaded(analyzeMXL('送别（AI 转谱）.musicxml', window.NF_DEMO_XML, true)); },
    importKind(a, t) { return kindAfter(a, t); },
    importPreview(a, t) {
      const key = t; a._pv = a._pv || {}; if (a._pv[key]) return a._pv[key];
      try { const s = convert(a, t, true); s.measures = s.measures.slice(0, t === 'acc' || t === 'JT' ? 2 : 3); s.measures[s.measures.length - 1].finalBar = true; delete s.layout;
        if (t === 'JT') withTempSong(s, () => mapVoxToTab(0, 'follow'));
        return (a._pv[key] = svgFit(NWB.svg(s, { paperW: 660 }))); } catch (e) { console.warn(e); return null; }
    },
    importApply(a, t) {
      const s = convert(a, t, false);
      addDoc(s, () => {
        if (t === 'JT') { try { mapVoxToTab(0, 'follow'); } catch (e) { console.warn(e); } }
        try { setRibbon('vox'); } catch (_) {}
        render(); setMeta({ from: 'import', t }); showBar();
        try { pyqImportDone('mxl'); } catch (_) {}
        toast('已导入为' + NWB.kindOfSong(song).name + '《' + song.title + '》' + song.measures.length + ' 小节 · 新窗口打开，原谱保留');
      });
    },
  };

  /* ───── 真实创建 ───── */
  function buildFromPlan(P) {
    const o = Object.assign({}, P.o, { maker: (typeof profileLoad === 'function' && profileLoad().maker) || '' });
    if (o.tuningKey && typeof TUNINGS !== 'undefined' && TUNINGS[o.tuningKey] && TUNINGS[o.tuningKey].t) o.tuning = TUNINGS[o.tuningKey].t.slice();
    delete o.tuningKey; delete o.pen;
    if (o.instKey === 'piano') delete o.instKey;
    return NWB.build(P.stack, o);
  }
  function realCreate(P) {
    const ns = buildFromPlan(P);
    try { pyqEvent('create_song', P.stack + ':' + P.scene); } catch (_) {}
    addDoc(ns, () => {
      setMeta({ from: 'new', P });
      const vfirst = P.stack !== 'T' && P.stack !== 'ST' && !(P.stack === 'JT' && P.pen !== 'J');
      if (vfirst && song.voxVoices && song.voxVoices.length) { sel.row = 'vox'; sel.vi = 0; sel.ci = 0; try { clampSel(); } catch (_) {} }
      try { setRibbon(sel.row === 'vox' ? 'vox' : 'tab'); } catch (_) {}
      render(); try { hideStartPad(); } catch (_) {}
      showBar();
      window.NF_MADE = { stack: P.stack, scene: P.scene, docType: docType(song), label: NWB.kindOfSong(song).name, label0: (window.__docTypeLabel0 || docTypeLabel)(song), stackOf: NWB.stackOf(song), tabs: docs.length };
      toast('已新建' + P.kind.name + ' · ' + (P.o.mode === 'minor' ? NF.MINOR[P.o.key] + ' 小调' : '1=' + NF.kl(P.o.key)) + ' ' + P.o.beats + '/' + P.o.unit + ' ♩=' + P.o.tempo + ' · 新窗口打开，原谱保留');
    });
  }

  /* ───── 导入：真解析 → 依据 → 做成哪种谱 ───── */
  function analyzeMXL(name, xml, ai) {
    const r = typeof xml === 'string' ? importMusicXML(xml) : xml; if (r.error) { toast('读取失败：' + r.error); return null; }
    /* AI 转谱工具导出的文件：<encoding><software> 写着转谱软件名时按「AI 转谱结果」处理（默认推荐教学对照谱） */
    const sw = typeof xml === 'string' ? ((/<software>([^<]{1,80})<\/software>/i.exec(xml) || [])[1] || '') : '';
    const swAI = /transcri|\bAI\b|klangio|anthemscore|scorecloud|piano2notes|songscription|转谱/i.test(sw);
    ai = ai || swAI;
    try { mxlKeyPost(r); } catch (_) {}
    const s = r.song, nv = (s.voxVoices || []).length, tabs = (s.tabVoices || []).length, ly = hasLy(s);
    const melody = nv === 1 && !tabs, staff = isStaffNota((s.voxNotations || [])[0]);
    const kname = (s.mode === 'minor' ? NF.MINOR[s.key] + ' 小调' : '1=' + NF.kl(s.key));
    const basis = [
      [r.keyDet ? 'scene' : 'file', kname, r.keyDet ? '文件没写调号，按音符内容推断' : r.keyDefaulted ? '没读到调号，按 1=C' : '按文件'],
      ['file', s.beats + '/' + s.unit + ' · ♩=' + s.tempo, '按文件'],
      ['file', nv + ' 声部 · ' + (ly ? '有歌词' : '无歌词') + ' · ' + (staff ? '五线谱' : '简谱'), '按内容'],
    ];
    if (swAI) basis.push(['file', '来源：' + sw.trim(), '文件里写明由转谱软件导出 → 按 AI 转谱结果处理']);
    if (ai && melody) basis.push(['scene', '推荐：教学对照谱', 'AI 转谱多为单旋律＋歌词，课堂最常用五线＋简谱对照']);
    return { name, fmt: /\.mxl$/i.test(name) ? 'MusicXML（压缩）' : 'MusicXML', song: s, stack: NWB.stackOf(s), parts: nv, measures: s.measures.length, hasLyrics: ly, melody, staff, basis, recommend: ai && melody ? 'SJ' : 'orig', ai: !!ai };
  }
  function kindAfter(a, t) {
    const ctx = { nVox: a.parts, lyr: a.hasLyrics };
    switch (t) { case 'orig': return NWB.kindOfSong(a.song).name; case 'J': return NWB.kindOf('J', ctx).name; case 'SJ': return '教学对照谱';
      case 'acc': return a.staff ? '钢琴伴奏歌谱（五线谱）' : '钢琴伴奏歌谱'; case 'JT': return '吉他弹唱谱'; case 'CJ': return '功能谱'; }
    return '曲谱';
  }
  function withTempSong(s, fn) {
    const o0 = song, u = undoStack.slice(), rd = redoStack.slice();
    song = s; try { return fn(); } finally { song = o0; undoStack.length = 0; u.forEach(x => undoStack.push(x)); redoStack.length = 0; rd.forEach(x => redoStack.push(x)); }
  }
  function suggestInto(s) {
    withTempSong(s, () => { const plan = suggestChordPlan(s, 0); s.measures.forEach((m, mi) => { const cols = m.voxes[0] || []; if (cols.length && plan[mi] && plan[mi].length && !cols.some(c => c.chord)) placeChordPlan(cols, plan[mi]); }); });
  }
  function convert(a, t, forPreview) {
    let s = migrate(clone(a.song));
    switch (t) {
      case 'J': s.voxNotations = (s.voxVoices || []).map(() => undefined); delete s.voxDual; break;
      case 'SJ': s.voxNotations = (s.voxVoices || []).map(() => 'staff'); s.voxDual = s.voxVoices.map(() => true); break;
      case 'acc': { const t0 = s.title; const r = arrangeAccompaniment(s, { suggest: true }); s = r.song; s.title = t0; delete s.voxDual; if (!a.staff) s.voxNotations = [undefined, 'staff', 'bass']; s.voxGroups = [{ type: 'brace', from: 1, to: 2 }]; break; }
      case 'JT': s.voxNotations = (s.voxVoices || []).map(() => undefined); delete s.voxDual; s.inst = 'guitar'; suggestInto(s); break;
      case 'CJ': suggestInto(s); s.func = true; s.funcNames = true; s.voxNotations = [undefined]; delete s.voxDual; break;
    }
    if (!forPreview) s.layout = Object.assign({}, s.layout || {}, { fixed: true });
    return s;
  }
  function pickFile(ai) {
    let inp = document.getElementById('nf-file');
    if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.id = 'nf-file'; inp.style.display = 'none'; document.body.appendChild(inp); }
    inp.accept = '.musicxml,.xml,.mxl,.gp,.gp3,.gp4,.gp5,.gpx,.mid,.midi,.json';
    inp.onchange = () => { const f = inp.files[0]; inp.value = ''; if (f) readFile(f, ai); };
    inp.click();
  }
  function readFile(f, ai) {
    const rd = new FileReader(), n = f.name;
    rd.onload = () => {
      const u8 = new Uint8Array(rd.result);
      if (/\.(mid|midi)$/i.test(n)) { NF.close(true); try { showMidiImport(parseSMF(u8)); } catch (e) { toast('MIDI 读取失败'); } return; }
      if (/\.gp\w*$/i.test(n)) { NF.close(true); const r = parseGP(rd.result); if (r.error) toast('导入失败：' + r.error); else showGPTrackModal(r.gp); return; }
      if (/\.json$/i.test(n)) { NF.close(true); try { const s = migrate(JSON.parse(new TextDecoder().decode(u8))); addDoc(s, () => { render(); toast('已打开《' + s.title + '》'); }); } catch (e) { toast('不是谱友圈曲谱文件'); } return; }
      let a = null;
      if (/\.mxl$/i.test(n)) { const r = importMXLBuffer(rd.result); if (r && !r.error) a = analyzeMXL(n, r, ai); else toast('导入失败：' + ((r && r.error) || '无法解压')); }
      else a = analyzeMXL(n, decodeXmlBytes(u8), ai || /ai|转谱/i.test(n));
      if (a) NF.importLoaded(a);
    };
    rd.readAsArrayBuffer(f);
  }

  /* ───── 落地谱型条：锚在 #paper 宽度内（不压左栏、不压歌词抽屉），按窗口记、不写进 song ───── */
  function stepsOf(s, meta) {
    const k = NWB.stackOf(s), mel0 = s.measures.some(m => (m.voxes[0] || []).some(c => c && c.deg > 0));
    const acc = s.measures.some(m => [1, 2].some(i => (m.voxes[i] || []).some(c => c && c.deg > 0)));
    const tab = s.measures.some(m => (m.tabs || []).some(cs => (cs || []).some(c => (c.notes || []).length)));
    const P = meta && meta.P;
    if (['JG', 'SG', 'SJG'].includes(k)) return [
      { t: '写旋律', state: mel0 ? 'done' : 'now' },
      { t: '配和弦与伴奏', state: acc ? 'done' : mel0 ? 'now' : 'todo', btn: '一键配伴奏', act: 'arrange', ic: 'src-arrange' },
      { t: '选织体', state: acc ? 'now' : 'todo', btn: '换织体', act: 'arrange', ic: 'nota-texture' }];
    if (k === 'JT' && P && P.pen === 'J') return [
      { t: '写旋律', state: mel0 ? 'done' : 'now' },
      { t: '生成六线谱', state: tab ? 'done' : mel0 ? 'now' : 'todo', btn: '生成六线谱', act: 'tabgen', ic: 'nota-tab6' },
      { t: '调把位与扫弦', state: tab ? 'now' : 'todo' }];
    if (k === 'CG') { const ch = s.measures.some(m => (m.voxes || []).some(cs => (cs || []).some(c => c && c.chord))); return [
      { t: '写和弦', state: ch ? 'done' : 'now' }, { t: '选织体', state: ch ? 'now' : 'todo', btn: '生成伴奏', act: 'acctex', ic: 'nota-texture' }]; }
    return null;
  }
  const TIP = { J: '数字键 1–7 录音，空格进下一拍；歌词点左栏「歌词」', S: '数字键按调录音高，↑↓ 升降八度', SJ: '在五线谱或简谱行输入都行，另一行同步', T: '方向键选弦，数字键输入品位', JT: '方向键选弦，数字键输入品位；和弦图点「和弦」',
    ST: '在六线谱输入，五线谱自动同步', G: 'Tab 在右手 / 左手之间切换', CJ: '先写旋律，再逐拍标级数和弦', CS: '先写旋律，再逐拍标和弦', C: '按小节输入和弦，每拍一格' };
  function showBar() {
    const old = document.getElementById('nf-barwrap'); const meta = getMeta();
    if (!meta || meta.hidden || (typeof viewerMode !== 'undefined' && viewerMode)) { if (old) old.remove(); return; }
    const k = NWB.stackOf(song), kind = NWB.kindOfSong(song), steps = stepsOf(song, meta);
    const info = { kind, stack: k, steps, mel: isStaffNota((song.voxNotations || [])[0]) ? 'S' : 'J', melOk: ['J', 'S', 'JG', 'SG', 'CJ', 'CS', 'JT'].includes(k), tip: TIP[k] || '' };
    const wrap = old || document.createElement('div'); wrap.id = 'nf-barwrap';
    const paper = document.getElementById('paper'), sw = document.getElementById('score-wrap');
    if (!old) sw.insertBefore(wrap, paper);
    const mob = isMob(); const pr = paper.getBoundingClientRect(), wr = sw.getBoundingClientRect();
    if (mob) { wrap.style.width = (sw.clientWidth - 16) + 'px'; wrap.style.marginLeft = '8px'; }
    else { wrap.style.width = pr.width + 'px'; wrap.style.marginLeft = '0px'; const base = wrap.getBoundingClientRect().left; wrap.style.marginLeft = Math.round(pr.left - base) + 'px'; }
    const html = NF.barHTML(info, mob);
    if (wrap.dataset.h !== html) { wrap.innerHTML = html; wrap.dataset.h = html; }
  }
  window.NF_SHOWBAR = showBar;
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#nf-barwrap [data-bact]'); const swi = e.target.closest && e.target.closest('.nf-sw [data-sw]');
    if (swi) { doSwitch(swi.dataset.sw); return; }
    if (!e.target.closest || !e.target.closest('.nf-sw')) { const m = document.querySelector('.nf-sw'); if (m && !(b && b.dataset.bact === 'kind')) m.remove(); }
    if (!b) return;
    const a = b.dataset.bact, meta = getMeta() || {};
    if (a === 'hide') { meta.hidden = true; setMeta(meta); showBar(); }
    else if (a === 'kind') { let m = document.querySelector('.nf-sw'); if (m) { m.remove(); return; } const w = document.createElement('div'); w.innerHTML = NF.switchMenuHTML(song); m = w.firstChild; document.body.appendChild(m); const r = b.getBoundingClientRect(); m.style.left = r.left + 'px'; m.style.top = (r.bottom + 6) + 'px'; m.style.maxHeight = (window.innerHeight - r.bottom - 18) + 'px'; }
    else if (a === 'mel') { const want = b.dataset.v, k = NWB.stackOf(song); const map = { J: 'S', S: 'J', JG: 'SG', SG: 'JG', CJ: 'CS', CS: 'CJ' };
      if (k === 'JT') mutate(() => { song.voxNotations = (song.voxNotations || song.voxVoices.map(() => undefined)).slice(); song.voxNotations[0] = want === 'S' ? 'staff' : undefined; });
      else if (map[k] && (want === 'S') !== isStaffNota((song.voxNotations || [])[0])) mutate(() => NWB.applyDirect(song, map[k]));
      showBar(); }
    else if (a === 'arrange') openArrange();
    else if (a === 'tabgen') { try { showVoxTabMenu(0); } catch (_) {} }
    else if (a === 'acctex') { const x = document.getElementById('b-acctex'); if (x) x.click(); }
  }, true);
  function doSwitch(k) {
    const m = document.querySelector('.nf-sw'); if (m) m.remove();
    const p = NWB.switchPlan(song, k); const meta = getMeta() || { from: 'switch' };
    if (p.mode === 'no' || p.mode === 'same') { if (p.mode === 'no') toast(p.why); return; }
    if (p.mode === 'rebuild') {
      const o = { title: song.title, key: song.key, beats: song.beats, unit: song.unit, tempo: song.tempo, nMea: song.measures.length, mode: song.mode, inst: song.inst, maker: song.maker, lyr: song.lyricLines };
      const ns = NWB.build(k, o); pushUndo(); ns.id = song.id; song = ns; docs[curDocI].song = song; setMeta(Object.assign({}, meta, { P: null }));
      sel = { mi: 0, row: song.tabVoices.length ? 'tab' : 'vox', vi: 0, ci: 0, si: 1 }; clampSel(); render(); persist(); showBar(); toast('已换成' + NWB.kindOfSong(song).name + '（空谱无损重建）');
    } else if (p.mode === 'direct') { mutate(() => NWB.applyDirect(song, k)); setMeta(meta); showBar(); toast('已换成' + NWB.kindOfSong(song).name + '：音符未动，可撤销'); }
    else { const ns = NWB.copyMelody(song, k, { inst: song.inst }); const t0 = song.title; addDoc(ns, () => { setMeta({ from: 'switch', P: k === 'JT' ? { pen: 'J' } : null }); render(); showBar(); toast('已另建' + NWB.kindOfSong(song).name + '《' + t0 + '》，旋律已带过来；原谱保留在前一个窗口'); }); }
  }
  /* 一键配伴奏：在现有智能配谱弹窗里加「填进当前谱」并默认选中（旋律＋伴奏谱的伴奏行原地填，可撤销；旋律记谱法照建谱时的选择） */
  function openArrange() {
    try { const t = document.getElementById('toast'); if (t) t.style.opacity = 0; } catch (_) {}   /* 修 A-7：弹窗打开时收起 toast，不压「取消 / 生成」 */
    document.getElementById('b-arrange').click();
    const sel0 = document.getElementById('arr-out'); if (!sel0) return;
    const k = NWB.stackOf(song); if (!['JG', 'SG', 'SJG'].includes(k)) return;
    const mt = isStaffNota((song.voxNotations || [])[0]) ? '五线谱' : '简谱';
    const pp = [...document.querySelectorAll('#modal-mask p')].find(x => /新窗口打开/.test(x.textContent)); if (pp) pp.innerHTML = '对当前旋律：空小节自动配和弦（功能和声，已填的不覆盖）→ 按所选织体生成双手伴奏。<b>「填进当前谱」直接写进本谱的钢琴伴奏行，可撤销</b>；选其他产出则在新窗口打开，原谱保留。';
    const op = document.createElement('option'); op.value = 'fill'; op.textContent = '填进当前谱（' + mt + '旋律＋大谱表伴奏，可撤销）'; sel0.insertBefore(op, sel0.firstChild); sel0.value = 'fill';
    const go = document.getElementById('arr-go'), orig = go.onclick;
    go.onclick = ev => {
      if (sel0.value !== 'fill') return orig && orig.call(go, ev);
      const texId = (document.querySelector('input[name="arr-tex"]:checked') || {}).value, sug = document.getElementById('arr-sug').checked;
      const mel = clone(song); mel.voxVoices = [mel.voxVoices[0]]; mel.voxNotations = [(mel.voxNotations || [])[0]]; mel.measures.forEach(m => m.voxes = [m.voxes[0]]); delete mel.voxGroups; delete mel.voxDual;
      const r = arrangeAccompaniment(mel, { texId, suggest: sug });
      closeModal();
      mutate(() => { song.measures.forEach((m, mi) => { const rm = r.song.measures[mi]; if (!rm) return; m.voxes[0] = rm.voxes[0]; m.voxes[1] = rm.voxes[1]; m.voxes[2] = rm.voxes[2]; }); song.texId = r.song.texId; song.funcNames = true; });
      try { pyqEvent('arrange_done', (texId || '') + ':fill'); } catch (_) {}
      showBar(); toast('已配好 ' + r.gen.done + ' 小节伴奏：和弦可逐小节改，「换织体」可重生成；Ctrl+Z 撤销');
    };
  }
  /* 吉他弹唱「先写旋律」：生成六线谱时复用建谱时那条空吉他轨（修 A-6：不再多出一行空 TAB） */
  const _mapVoxToTab = mapVoxToTab;
  window.mapVoxToTab = mapVoxToTab = function (vi, mode, dry) {
    if (dry) return _mapVoxToTab.apply(this, arguments);
    const empty0 = song.tabVoices.length === 1 && song.measures.every(m => !(m.tabs[0] || []).some(c => (c.notes || []).length || c.chord));
    const r = _mapVoxToTab.apply(this, arguments);
    if (empty0 && song.tabVoices.length === 2) { song.tabVoices.splice(0, 1); song.measures.forEach(m => m.tabs.splice(0, 1)); if (Array.isArray(song.tabJpVoices)) song.tabJpVoices.splice(0, 1); try { render(); persist(); } catch (_) {} }
    return r;
  };
  const _render = render;
  window.render = render = function () { const r = _render.apply(this, arguments); if (!window.__nfBarQ) { window.__nfBarQ = 1; requestAnimationFrame(() => { window.__nfBarQ = 0; try { showBar(); } catch (_) {} }); } return r; };

  /* ───── 入口：顶栏「新建」＋ ▾、页签条 ＋、Alt+N / Alt+Shift+N、启动台、拖放、深链 ───── */
  window.__docTypeLabel0 = docTypeLabel;
  docTypeLabel = function (s2) { try { return NWB.kindOfSong(s2 || song).name; } catch (_) { return window.__docTypeLabel0(s2); } };   /* 统一谱名表（编辑器显示层） */
  docIcon = function (s2) { try { return pqIcon(NWB.kindOfSong(s2).ic, 16); } catch (_) { return ''; } };                            /* 页签按谱行取图标（修「功能谱显示钢琴」） */
  window.showNewWizard = showNewWizard = () => NF.open();
  const bn = document.getElementById('b-new');
  if (bn) {
    bn.onclick = () => NF.open(); bn.title = '新建（Alt+N）'; bn.innerHTML = ic('act-new', 16) + '<span>新建</span>'; Object.assign(bn.style, { display: 'inline-flex', alignItems: 'center', gap: '6px' });
    const dd = document.createElement('button'); dd.id = 'nf-new-dd'; dd.title = '快速新建（按场景 / 按上次）'; dd.setAttribute('aria-label', '快速新建'); dd.innerHTML = ic('act-chevron', 16);
    Object.assign(dd.style, { padding: '0 6px', minWidth: '0', display: 'inline-flex', alignItems: 'center' }); dd.onclick = openQuick; bn.after(dd);
  }
  function openQuick() {
    const old = document.querySelector('.nf-qm'); if (old) { old.remove(); return; }
    const b = document.getElementById('nf-new-dd'), r = (b || bn).getBoundingClientRect();
    const w = document.createElement('div'); w.innerHTML = NF.quickMenu(); const m = w.firstChild; document.body.appendChild(m);
    m.style.left = Math.max(8, Math.min(window.innerWidth - 340, r.left - 120)) + 'px'; m.style.top = (r.bottom + 6) + 'px';
    m.addEventListener('click', e => { const q = e.target.closest('[data-q]'); if (!q) return; m.remove(); const v = q.dataset.q;
      if (v === 'panel') NF.open(); else if (v === 'import') NF.open({ tab: 'import' }); else NF.quickCreate(v); });
    setTimeout(() => document.addEventListener('mousedown', function f(e) { if (!m.contains(e.target) && e.target !== b) { m.remove(); document.removeEventListener('mousedown', f); } }), 0);
  }
  window.NF_OPENQUICK = openQuick;
  document.addEventListener('keydown', e => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyN') { e.preventDefault(); e.stopPropagation(); if (e.shiftKey) NF.quickCreate('last'); else NF.open(); }
  }, true);
  const relabelAdd = () => { const a = document.getElementById('dt-add'); if (a && !a.dataset.nf) { a.dataset.nf = 1; a.innerHTML = ic('act-add', 16); a.title = '新建曲谱（Alt+N）'; a.setAttribute('aria-label', '新建曲谱'); a.onclick = e => { e.stopPropagation(); NF.open(); }; } };
  try { const _r = renderDocTabs; renderDocTabs = function () { const x = _r.apply(this, arguments); relabelAdd(); return x; }; } catch (_) {}
  relabelAdd();
  /* 启动台：主卡「开始一份谱」＋按上次＋从已有音乐＋打开＋我的；常用用途直达；手机同样有「开始一份谱」（修 A-8） */
  function startPad() {
    const box = document.getElementById('spd-cards'); if (!box || box.dataset.nf) return; box.dataset.nf = 1;
    const st0 = NF.fresh({}), kd = NF.kindOfState(st0), last = H.lastLoad();
    box.style.display = 'block';
    box.innerHTML = `<div class="nf-spd">
      <button type="button" class="nf-spc pri" data-sp2="new">${ic('act-new', 28)}<b>开始一份谱</b><small>按用途选：吉他弹唱、钢琴即兴伴奏、教学对照、视唱谱例……<br>预览即成品，回车就建</small></button>
      <button type="button" class="nf-spc" data-sp2="last">${ic('tpl-last', 28)}<b>${last ? '按上次' : '马上开始'}</b><small>${NF.SC[st0.scene].n} · ${NF.kl(st0.v.key)} ${st0.v.meter}<br>Alt+Shift+N 一键建</small></button>
      <button type="button" class="nf-spc" data-sp2="imp">${ic('act-import', 28)}<b>从已有音乐</b><small>MusicXML · GP · MIDI<br>AI 转谱结果</small></button>
      <div class="nf-spchips"><span>常用：</span>${['gtr', 'pacc', 'teach', 'sight', 'kids'].map(id => `<button type="button" data-sp2="sc:${id}">${ic(NF.SC[id].ic, 18)}${NF.SC[id].n}${NF.SC[id].tag ? ' · ' + NF.SC[id].tag : ''}</button>`).join('')}</div>
      <div class="nf-spchips nf-spsub"><button type="button" data-sp="open">${ic('act-open', 18)}打开文件</button><button type="button" data-sp="mine">${ic('src-mine', 18)}我的曲谱</button></div>
      <button type="button" class="nf-spc nf-mobonly" data-sp="demo">${ic('src-example', 28)}<b>看示例</b><small>16 份示例 · 可播放</small></button></div>`;
    box.addEventListener('click', e => { const t = e.target.closest('[data-sp2]'); if (!t) return; e.stopPropagation(); const v = t.dataset.sp2;
      if (v === 'new') NF.open(); else if (v === 'last') NF.quickCreate('last'); else if (v === 'imp') NF.open({ tab: 'import' });
      else if (v.startsWith('sc:')) NF.open({ scene: v.slice(3) }); }, true);
    const cont = document.getElementById('spd-cont'); if (cont && !H.recent()) cont.style.display = 'none';
  }
  window.NF_STARTPAD = startPad;
  try { startPad(); } catch (_) {}
  /* 拖放：文件拖到窗口任意处 → 面板「从已有音乐」 */
  let dragN = 0;
  window.addEventListener('dragenter', e => { if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return; dragN++; if (!document.querySelector('.nf-dropmask')) { const d = document.createElement('div'); d.className = 'nf-dropmask'; d.textContent = '松手：读文件，选做成哪种谱'; document.body.appendChild(d); } });
  window.addEventListener('dragleave', () => { if (--dragN <= 0) { dragN = 0; const d = document.querySelector('.nf-dropmask'); if (d) d.remove(); } });
  window.addEventListener('dragover', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
  window.addEventListener('drop', e => { const d = document.querySelector('.nf-dropmask'); if (d) d.remove(); dragN = 0; const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return; e.preventDefault(); e.stopPropagation(); readFile(f, /ai|转谱/i.test(f.name)); }, true);
  /* 深链：?new=<用途>&key=Fm&meter=2/4&tempo=104&title=…（统一 C 的 ?start= 与 B 的 ?new=） */
  window.NF_DEEPLINK = function (qs) {
    const q = new URLSearchParams(qs); const sc = q.get('new'); if (!sc) return false;
    const vals = {}; const k = q.get('key'); if (k) { vals.key = k.replace(/m$/, ''); vals.mode = /m$/.test(k) ? 'minor' : 'major'; }
    ['meter', 'tempo', 'title', 'acc', 'tacc', 'parts', 'clef', 'ftype', 'inst', 'pen', 'instKey'].forEach(f => { if (q.get(f)) vals[f] = /^\d+$/.test(q.get(f)) ? +q.get(f) : q.get(f); });
    NF.open({ scene: sc, rows: q.get('rows') || undefined, vals }); return true;
  };
  window.NFX = { getMeta, setMeta, realCreate, buildFromPlan, analyzeMXL, convert, showBar, BARS, openArrange, doSwitch };
})();
