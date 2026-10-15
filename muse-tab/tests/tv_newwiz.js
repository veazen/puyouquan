/* v67.4 新建面板「按用途开谱」回归（重写：v60.41 起的三意图卡一屏向导由新建面板替换，入口函数名 showNewWizard 保留）：
   T1 面板结构：真实点击顶栏「新建」→ 一屏三栏（左「按用途」listbox：弹唱伴奏 / 课堂声乐 / 独奏乐队三组 9 个用途＋空白谱＋自选记谱法，
      考编 / 师范 / 艺考 / 课堂 / 乐队 标签）；中栏「将建成 · 谱名」＋「要哪几种谱」五个开关＋谱行示意；右栏 曲名 / 调 / 拍号 / 速度；
      底栏「创建 · {谱名}」；旧三意图卡 .nw-int / 九卡 .ntype 不在；首访默认＝吉他弹唱；从已有音乐页 MusicXML / Guitar Pro / MIDI 三个入口
   T2 一击默认建谱＝吉他弹唱谱（吉他1＋旋律1 · 16 小节 · 1 段词 · ♩=80 · 1=C 4/4 · 固定版宽）
   T3 映射矩阵（独立口径表，不读 NWB）：28 种「用途 × 变体 × 旋律用」经真实点击建谱 → docType / 谱行字段（tab/vox/voxNotations/voxDual/voxGroups/
      pianoAcc/chordOnly/func/tabStaff/inst/instKey/mode/lyricLines/小节数）与 README「可行性映射」表逐项一致，谱名＝面板「将建成」＝docTypeLabel
   T4 联动：「旋律用」只在能互换的用途出现（其余写明固定用什么）；变体随用途换；乐器下拉 20 种按方案分 4 组（键盘 / 西洋管弦·五线谱 / 民乐·简谱 / 其他，贝斯在西洋管弦组末）；「只要伴奏」时旋律用改为说明
   T5 基础信息生效：程序化改值（不经事件）与真实键盘/下拉两条路都落到 song（曲名 / 调 / 小调 / 拍号 / 速度 / 小节数 / 歌词段数）
   T6 乐器身份＋音色预置：二胡→instKey erhu、混音台 strings；器乐·钢琴→instKey piano、双手 piano；吉他弹唱不写 instKey、人声轨仍 ah；
      钢琴伴奏歌谱伴奏两行预置钢琴音色、旋律行不动
   T7 53231323 十六分两款（v60.47 产品指定，经面板默认吉他弹唱建谱）：数据口径 + C 和弦套用逐列实证
   T8 手机 390（拍板 1：先不开放手机新建）：showNewWizard / ☰「新建」→「发到电脑继续」说明，不出旧向导、不出新建面板，无横向溢出，主按钮在可视区
   突变实证：MUSETAB_URL=file://…/v67.3 原版 → 无新建面板（.nf-modal / [data-scene]）→ T1–T6 当场红。file:// 直载。 */
const { chromium } = require('playwright');
const path = require('path');
const F = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const pg = await ctx.newPage();
  pg.setDefaultTimeout(4000);
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = p => p(); window.SF_PLAYWAIT = false; });
  const EV = s => pg.evaluate(s).catch(e => ({ err: String(e.message || e).split('\n')[0] }));
  const guard = async (name, fn) => { try { await fn(); } catch (e) { T(false, name, 'EXC: ' + String(e.message || e).split('\n')[0]); await EV(`(()=>{ try{ closeModal(); }catch(_){} })()`); } };
  /* 每次从干净的「上次设置」开面板（musetab-nw-last 的记忆行为在 tv_newpanel 里单独验） */
  const openPanel = async () => { await EV(`(()=>{ try{ closeModal(); }catch(_){} try{ localStorage.removeItem('musetab-nw-last'); }catch(_){} })()`); await pg.click('#b-new'); await pg.waitForSelector('.nf-modal [data-scene]', { timeout: 2500 }); };

  /* ---------- T1 面板结构 ---------- */
  await guard('T1 面板结构', async () => {
    await openPanel();
    const r = await EV(`(()=>{
      const q=s=>document.querySelectorAll(s).length, m=document.querySelector('.nf-modal');
      const opts=[...m.querySelectorAll('[role=listbox] [role=option]')].map(o=>o.dataset.scene);
      const tags={}; m.querySelectorAll('[role=option]').forEach(o=>{ const t=o.querySelector('.nf-tag'); if(t) tags[o.dataset.scene]=t.textContent; });
      const groups=[...m.querySelectorAll('.nf-gl')].map(x=>x.textContent);
      const rows=[...m.querySelectorAll('.nf-row')].map(x=>x.dataset.row+':'+x.getAttribute('aria-pressed'));
      const L=m.querySelector('.nf-left').getBoundingClientRect(), M=m.querySelector('.nf-mid').getBoundingClientRect(), R=m.querySelector('.nf-right').getBoundingClientRect();
      return { opts, tags, groups, rows, sel:(m.querySelector('[role=option][aria-selected="true"]')||{}).dataset.scene,
        kind:(document.getElementById('nf-kind')||{}).textContent, go:(document.getElementById('nw-create')||{}).textContent,
        cols: L.right<=M.left+1 && M.right<=R.left+1, schem: !!m.querySelector('.nf-paper .nf-svg') && q('.nf-bl.pen')>=1,
        basics: ['nw-title','nw-key','nw-beats','nw-unit','nw-tempo'].every(id=>!!document.getElementById(id)),
        old: q('.nw-int')+q('.ntype')+q('#nw-sub'), files: ['nw-mxlfile','nw-gpfile','nw-midifile'].every(id=>!!document.getElementById(id)),
        where: /新窗口打开/.test(m.textContent) };
    })()`);
    await pg.click('.nf-tabs [data-v="import"]');
    const imp = await EV(`(()=>({ n: document.querySelectorAll('.nf-modal .nw-imp .nwi').length, ids: [...document.querySelectorAll('.nf-modal .nwi')].map(x=>x.id).join(','),
      midiAccept: (document.getElementById('nw-midifile')||{}).accept }))()`);
    await pg.click('.nf-tabs [data-v="new"]');
    T(!r.err && r.opts.join() === 'gtr,pacc,kids,vocal,teach,sight,solo,inst,chord,blank,custom' && r.groups.join() === '弹唱伴奏,课堂声乐,独奏乐队'
      && r.tags.pacc === '考编' && r.tags.kids === '师范' && r.tags.sight === '艺考' && r.tags.teach === '课堂' && r.tags.chord === '乐队'
      && r.rows.join() === 'J:true,S:false,T:true,G:false,C:false' && r.sel === 'gtr' && r.kind === '吉他弹唱谱' && /创建 · 吉他弹唱谱/.test(r.go)
      && r.cols && r.schem && r.basics && r.old === 0 && r.files && r.where
      && imp.n === 3 && imp.ids === 'nw-import,nw-gp,nw-midi' && /\.mid/.test(imp.midiAccept || ''),
      'T1 面板一屏三栏（按用途 11 项分组带标签 / 五种谱开关 / 谱行示意 / 右栏基础信息 / 创建·谱名；旧意图卡不在；从已有音乐三入口）', JSON.stringify({ r, imp }));
  });

  /* ---------- T2 一击默认建谱 ---------- */
  await guard('T2 一击默认建谱', async () => {
    await pg.click('#nw-create'); await pg.waitForTimeout(250);
    const r = await EV(`({ tab: song.tabVoices.slice(), vox: song.voxVoices.slice(), mea: song.measures.length, lyr: song.lyricLines, inst: song.inst,
      title: song.title, tempo: song.tempo, key: song.key, m: song.beats+'/'+song.unit, fixed: !!(song.layout&&song.layout.fixed), modal: !!document.getElementById('modal-mask'), dt: docType(song) })`);
    T(r.tab.join() === '吉他1' && r.vox.join() === '旋律1' && r.mea === 16 && r.lyr === 1 && r.inst === 'guitar' && r.title === '未命名曲谱'
      && r.tempo === 80 && r.key === 'C' && r.m === '4/4' && r.fixed && !r.modal && r.dt === 'guitar',
      'T2 一击默认建谱＝吉他弹唱谱（吉他1＋旋律1 · 16 小节 · 1 段词 · ♩=80 · 固定版宽）', JSON.stringify(r));
  });

  /* ---------- T3 映射矩阵（独立口径表） ---------- */
  await guard('T3 映射矩阵', async () => {
    /* [用途, 点击序列（var:k=v / mel:J|S / inst:<select> / key:<value>）, 期望] */
    const N = null;
    const CASES = [
      ['gtr', [], { dt: 'guitar', tab: '吉他1', vox: '旋律1', nota: N, inst: 'guitar', lyr: 1, mea: 16, kind: '吉他弹唱谱' }],
      ['gtr', ['var:inst=uku'], { dt: 'uku', tab: '尤克里里1', vox: '旋律1', inst: 'uku', kind: '尤克里里弹唱谱' }],
      ['gtr', ['var:pen=J'], { dt: 'guitar', tab: '吉他1', vox: '旋律1', row: 'vox', kind: '吉他弹唱谱' }],
      ['pacc', [], { dt: 'vocal', tab: '', vox: '旋律/右手伴奏/左手伴奏', nota: [N, 'staff', 'bass'], groups: '[{"type":"brace","from":1,"to":2}]', fnm: true, fn: false, mea: 16, tempo: 72, kind: '钢琴伴奏歌谱' }],
      ['pacc', ['mel:S'], { dt: 'instr', vox: '旋律/右手伴奏/左手伴奏', nota: ['staff', 'staff', 'bass'], dual: N, kind: '钢琴伴奏歌谱（五线谱）' }],
      ['pacc', ['var:acc=pure'], { dt: 'pianoacc', vox: '右手/左手', nota: ['staff', 'bass'], pa: true, kind: '钢琴弹唱谱（纯伴奏）' }],
      ['kids', [], { dt: 'vocal', vox: '旋律/右手伴奏/左手伴奏', key: 'F', meter: '2/4', tempo: 104, mea: 8, lyr: 2, kind: '钢琴伴奏歌谱' }],
      ['vocal', [], { dt: 'vocal', tab: '', vox: '旋律1', nota: N, lyr: 1, mea: 16, tempo: 90, kind: '简谱歌谱' }],
      ['vocal', ['var:parts=4'], { dt: 'vocal', vox: '旋律1/旋律2/旋律3/旋律4', groups: '[{"type":"bracket","from":0,"to":3}]', kind: '简谱合唱谱' }],
      ['vocal', ['mel:S'], { dt: 'instr', vox: '旋律1', nota: ['staff'], lyr: 1, kind: '五线谱歌谱' }],
      ['vocal', ['mel:S', 'var:parts=2'], { dt: 'vocal', vox: '旋律1/旋律2', nota: ['staff', 'staff'], kind: '五线谱合唱谱' }],
      ['teach', [], { dt: 'teach', vox: '旋律1', nota: ['staff'], dual: [true], tempo: 88, kind: '教学对照谱' }],
      ['teach', ['var:tacc=with'], { dt: 'teach', vox: '旋律/右手伴奏/左手伴奏', nota: ['staff', 'staff', 'bass'], dual: [true, false, false], kind: '教学对照谱（含伴奏）' }],
      ['sight', [], { dt: 'instr', vox: '旋律1', nota: ['staff'], lyr: 0, mea: 8, tempo: 72, kind: '五线谱旋律' }],
      ['sight', ['var:clef=bass', 'key:C|minor'], { dt: 'instr', nota: ['bass'], mode: 'minor', key: 'C', kind: '五线谱旋律' }],
      ['solo', [], { dt: 'solo', tab: '吉他1', vox: '', ts: true, lyr: 0, kind: '吉他独奏谱' }],
      ['inst', [], { dt: 'piano', vox: '右手/左手', nota: ['staff', 'bass'], ik: 'piano', lyr: 0, kind: '钢琴独奏谱' }],
      ['inst', ['var:instKey=violin'], { dt: 'instr', vox: '旋律1', nota: ['staff'], ik: 'violin', kind: '小提琴谱（五线谱）' }],
      ['inst', ['var:instKey=erhu'], { dt: 'vocal', vox: '旋律1', nota: N, ik: 'erhu', lyr: 0, kind: '二胡谱（简谱）' }],
      ['inst', ['var:instKey=erhu', 'mel:S'], { dt: 'instr', nota: ['staff'], ik: 'erhu', kind: '二胡谱（五线谱）' }],
      ['inst', ['inst:trombone'], { dt: 'instr', nota: ['bass'], ik: 'trombone', kind: '长号谱（五线谱）' }],
      ['inst', ['inst:epiano'], { dt: 'piano', vox: '右手/左手', ik: 'epiano', kind: '电钢琴独奏谱' }],
      ['inst', ['inst:other', 'var:oclef=alto'], { dt: 'instr', nota: ['alto'], ik: 'other', kind: '器乐谱（五线谱）' }],
      ['chord', [], { dt: 'chord', vox: '旋律1', co: true, lyr: 0, kind: '和弦谱' }],
      ['chord', ['var:ftype=CJ'], { dt: 'func', vox: '旋律1', fn: true, nota: N, kind: '功能谱' }],
      ['chord', ['var:ftype=CJ', 'mel:S'], { dt: 'func', nota: ['staff'], kind: '五线谱和弦谱' }],
      ['blank', [], { dt: 'vocal', vox: '旋律1', nota: N, mea: 8, kind: '简谱歌谱' }],
      ['blank', ['mel:S'], { dt: 'instr', nota: ['staff'], kind: '五线谱歌谱' }],
    ];
    const bad = [];
    for (const [sc, clicks, want] of CASES) {
      await openPanel();
      await pg.click('[data-scene="' + sc + '"]');
      for (const c of clicks) {
        const [k, v] = [c.slice(0, c.indexOf(':')), c.slice(c.indexOf(':') + 1)];
        if (k === 'var') { const [vk, vv] = v.split('='); await pg.click('.nf-modal [data-act="var"][data-k="' + vk + '"][data-v="' + vv + '"]'); }
        else if (k === 'mel') await pg.click('.nf-modal [data-act="mel"][data-v="' + v + '"]');
        else if (k === 'inst') await pg.selectOption('#nf-inst', v);
        else if (k === 'key') await pg.selectOption('#nw-key', v);
      }
      const pk = await EV(`document.getElementById('nf-kind').textContent`);
      await pg.click('#nw-create'); await pg.waitForTimeout(120);
      const got = await EV(`(()=>({ dt: docType(song), tab: song.tabVoices.join('/'), vox: song.voxVoices.join('/'), nota: song.voxNotations===undefined? null : JSON.parse(JSON.stringify(song.voxNotations)),
        dual: song.voxDual? song.voxDual.slice() : null, groups: song.voxGroups? JSON.stringify(song.voxGroups) : null, pa: !!song.pianoAcc, co: !!song.chordOnly, fn: !!song.func, fnm: !!song.funcNames, ts: !!song.tabStaff,
        inst: song.inst, ik: song.instKey||null, mode: song.mode||'major', key: song.key, meter: song.beats+'/'+song.unit, tempo: song.tempo, lyr: song.lyricLines, mea: song.measures.length,
        row: sel.row, label: docTypeLabel(song) }))()`);
      const diff = [];
      Object.keys(want).forEach(f => {
        if (f === 'kind') { if (got.label !== want.kind || pk !== want.kind) diff.push('kind:' + pk + '/' + got.label); return; }
        if (JSON.stringify(got[f]) !== JSON.stringify(want[f])) diff.push(f + ':' + JSON.stringify(got[f]));
      });
      if (diff.length) bad.push(sc + clicks.join('+') + ' → ' + diff.join(' '));
      await EV(`(()=>{ if(docs.length>3) closeDocAt(curDocI); })()`);
    }
    T(bad.length === 0, 'T3 映射矩阵（' + CASES.length + ' 种用途×变体×旋律用：docType / 谱行字段 / 谱名＝面板＝docTypeLabel 与可行性映射表一致）', bad.join(' | ') || 'all match');
  });

  /* ---------- T4 联动 ---------- */
  await guard('T4 联动', async () => {
    await openPanel();
    const look = () => EV(`(()=>{ const m=document.querySelector('.nf-modal');
      return { live: !!m.querySelector('[data-act="mel"]'), fixed: (m.querySelector('.nf-right .nf-fixed')||{}).textContent||'',
        vars: [...new Set([...m.querySelectorAll('[data-act="var"]')].map(x=>x.dataset.k))].join(',') }; })()`);
    const seen = {};
    for (const sc of ['gtr', 'pacc', 'kids', 'vocal', 'teach', 'sight', 'solo', 'inst', 'chord', 'blank']) { await pg.click('[data-scene="' + sc + '"]'); seen[sc] = await look(); }
    await pg.click('[data-scene="pacc"]'); await pg.click('[data-act="var"][data-k="acc"][data-v="pure"]'); const pure = await look();
    await pg.click('[data-scene="inst"]'); await pg.click('[data-act="var"][data-k="instKey"][data-v="erhu"]'); const erhu = await look();
    const insts = await EV(`(()=>{ const s=document.getElementById('nf-inst'); return { n: s? s.querySelectorAll('option[value]:not([value=""])').length : 0, g: s? s.querySelectorAll('optgroup').length : 0,
      gl: s? [...s.querySelectorAll('optgroup')].map(g=>g.label).join('|') : '', bassIn: s? (()=>{ const o=s.querySelector('option[value="bass"]'); const g=o&&o.parentElement; return g? g.label+'#'+([...g.children].indexOf(o)===g.children.length-1) : ''; })() : '' }; })()`);
    await pg.click('[data-scene="chord"]'); await pg.click('[data-act="var"][data-k="ftype"][data-v="CJ"]'); const cj = await look();
    T(!seen.gtr.live && /简谱/.test(seen.gtr.fixed) && seen.gtr.vars === 'inst,pen' && seen.pacc.live && seen.pacc.vars === 'acc' && seen.kids.live
      && seen.vocal.live && seen.vocal.vars === 'parts' && !seen.teach.live && /对照/.test(seen.teach.fixed) && seen.teach.vars === 'tacc'
      && !seen.sight.live && seen.sight.vars === 'clef' && !seen.solo.live && !seen.inst.live && /大谱表/.test(seen.inst.fixed) && seen.inst.vars === 'instKey'
      && !seen.chord.live && seen.chord.vars === 'ftype' && seen.blank.live && !pure.live && /纯伴奏/.test(pure.fixed) && erhu.live && cj.live
      && insts.n === 20 && insts.g === 4 && insts.gl === '键盘|西洋管弦 · 五线谱|民乐 · 简谱|其他' && insts.bassIn === '西洋管弦 · 五线谱#true',
      'T4 联动（旋律用只在能互换的用途出现、其余写明固定；变体随用途；乐器 20 种按方案分 4 组、贝斯在西洋管弦组末；只要伴奏→说明）', JSON.stringify({ seen, pure, erhu, cj, insts }));
    await EV(`closeModal()`);
  });

  /* ---------- T5 基础信息生效 ---------- */
  await guard('T5 基础信息生效', async () => {
    await openPanel(); await pg.click('[data-scene="vocal"]');
    let r1 = await EV(`(()=>{ document.getElementById('nw-title').value='试验曲'; document.getElementById('nw-key').value='G';
      document.getElementById('nw-beats').value='3'; document.getElementById('nw-tempo').value='120'; document.getElementById('nw-create').click();
      return { t: song.title, k: song.key, b: song.beats, tp: song.tempo }; })()`);
    await openPanel(); await pg.click('[data-scene="vocal"]');
    await pg.fill('#nw-title', '小调练习'); await pg.selectOption('#nw-key', 'Eb|minor');
    await pg.selectOption('#nw-beats', '6'); await pg.selectOption('#nw-unit', '8');
    await pg.click('#nw-tempo', { clickCount: 3 }); await pg.keyboard.type('66');
    await pg.click('.nf-more'); await pg.fill('#nf-nmea', '24'); await pg.selectOption('#nf-lyr', '3');
    await pg.click('#nw-create'); await pg.waitForTimeout(150);
    const r2 = await EV(`({ t: song.title, k: song.key, mode: song.mode, m: song.beats+'/'+song.unit, tp: song.tempo, mea: song.measures.length, lyr: song.lyricLines, name: docTypeLabel(song) })`);
    T(r1.t === '试验曲' && r1.k === 'G' && r1.b === 3 && r1.tp === 120
      && r2.t === '小调练习' && r2.k === 'Eb' && r2.mode === 'minor' && r2.m === '6/8' && r2.tp === 66 && r2.mea === 24 && r2.lyr === 3,
      'T5 基础信息生效（程序化改值 / 真实键盘与下拉：曲名、调、c 小调＝关系大调 ♭E＋mode、拍号、速度、小节数、歌词段数）', JSON.stringify({ r1, r2 }));
  });

  /* ---------- T6 乐器身份与音色 ---------- */
  await guard('T6 乐器身份与音色', async () => {
    const mk = async (sc, clicks) => { await openPanel(); await pg.click('[data-scene="' + sc + '"]'); for (const c of clicks) await pg.click(c); await pg.click('#nw-create'); await pg.waitForTimeout(100); };
    await mk('inst', ['[data-act="var"][data-k="instKey"][data-v="erhu"]']);
    const erhu = await EV(`({ ik: song.instKey, tim: ((song.mixer||{})['vox:0']||{}).inst, live: trackCfg('vox',0).inst, icon: !!INST_ICON[song.instKey] })`);
    await mk('inst', []);
    const pn = await EV(`({ ik: song.instKey, t0: trackCfg('vox',0).inst, t1: trackCfg('vox',1).inst })`);
    await mk('gtr', []);
    const gt = await EV(`({ noIk: song.instKey===undefined, vox: trackCfg('vox',0).inst })`);
    await mk('pacc', []);
    const jg = await EV(`({ mel: trackCfg('vox',0).inst, r: trackCfg('vox',1).inst, l: trackCfg('vox',2).inst, noIk: song.instKey===undefined })`);
    T(erhu.ik === 'erhu' && erhu.tim === 'strings' && erhu.live === 'strings' && erhu.icon && pn.ik === 'piano' && pn.t0 === 'piano' && pn.t1 === 'piano'
      && gt.noIk && gt.vox === 'ah' && jg.mel === 'ah' && jg.r === 'piano' && jg.l === 'piano' && jg.noIk,
      'T6 乐器身份＋音色（二胡 strings / 钢琴双手 piano / 弹唱人声 ah / 伴奏歌谱旋律 ah·伴奏 piano）', JSON.stringify({ erhu, pn, gt, jg }));
  });

  /* ---------- T7 53231323 十六分两款 ---------- */
  await guard('T7 53231323', async () => {
    await openPanel(); await pg.click('[data-scene="gtr"]'); await pg.click('#nw-create'); await pg.waitForTimeout(100);
    const r = await EV(`(()=>{
      const items = TAB_PATTERN_GROUPS.flatMap(g=>g.items);
      const p44 = items.find(p=>p.name==='53231323 十六分（4/4）'), p24 = items.find(p=>p.name==='53231323 十六分（2/4）');
      if(!p44||!p24) return {miss:1};
      const seq = ['b','s3','s2','s3','s1','s3','s2','s3'];
      const tok44 = p44.ev.map(e=>e[0]).join()===seq.concat(seq).join() && p44.ev.every(e=>e[1]===16);
      const tok24 = p24.ev.map(e=>e[0]).join()===seq.join() && p24.ev.every(e=>e[1]===16);
      song.measures[0].tabs[0][0].chord='C';
      sel={mi:1,row:'tab',vi:0,ci:0,si:1}; selRange=null;
      applyTabPattern(p44);
      const cols=song.measures[1].tabs[0], nn=c=>JSON.stringify(c.notes);
      return { miss:0, tok44, tok24, b44:+patBeats(p44).toFixed(2), b24:+patBeats(p24).toFixed(2), n:cols.length, allDur:cols.every(c=>c.dur===16),
        root0:nn(cols[0]), s3:nn(cols[1]), s2:nn(cols[2]), s1:nn(cols[4]), root8:nn(cols[8]) }; })()`);
    T(!r.miss && r.tok44 && r.tok24 && r.b44 === 4 && r.b24 === 2 && r.n === 16 && r.allDur
      && r.root0 === '[{"s":5,"f":3}]' && r.s3 === '[{"s":3,"f":0}]' && r.s2 === '[{"s":2,"f":1}]' && r.s1 === '[{"s":1,"f":0}]' && r.root8 === '[{"s":5,"f":3}]',
      'T7 53231323 十六分 4/4+2/4（后半保持根音非交替低音；C 指法逐列实证）', JSON.stringify(r));
  });
  await ctx.close();

  /* ---------- T8 手机 390 ---------- */
  const errsM = [];
  await guard('T8 手机发到电脑继续', async () => {
    const mc = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'zh-CN' });
    const pm = await mc.newPage(); pm.on('pageerror', e => errsM.push(e.message));
    await pm.goto(F); await pm.waitForTimeout(900);
    const look = () => pm.evaluate(() => { const m = document.querySelector('.modal'); const pc = document.getElementById('nw-pc');
      const r = pc ? pc.getBoundingClientRect() : null;
      return { modal: !!m, panel: !!document.querySelector('.nf-modal,[data-scene]'), old: document.querySelectorAll('.nw-int,#nw-create').length,
        pc: !!pc && /发到电脑继续/.test(pc.textContent), pcVis: !!r && r.bottom <= innerHeight && r.top >= 0, over: document.documentElement.scrollWidth - innerWidth,
        mOver: m ? m.scrollWidth - m.clientWidth : 99 }; });
    await pm.evaluate(() => showNewWizard()); await pm.waitForTimeout(150);
    const a = await look();
    await pm.evaluate(() => closeModal());
    await pm.evaluate(() => showMobileMenu()); await pm.waitForTimeout(100);
    await pm.click('[data-mm="b-new"]'); await pm.waitForTimeout(150);
    const m2 = await look();
    await mc.close();
    T(a.modal && !a.panel && a.old === 0 && a.pc && a.pcVis && a.over <= 0 && a.mOver <= 1 && m2.pc && !m2.panel,
      'T8 手机 390：新建＝「发到电脑继续」说明（不进旧向导 / 新建面板，☰ 新建同口径），无横向溢出、主按钮可见', JSON.stringify({ a, m2 }));
  });

  T(errs.concat(errsM).length === 0, '无页面报错', errs.concat(errsM).join('|') || 'none');
  console.log('PASS ' + pass + '/' + total);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})();
