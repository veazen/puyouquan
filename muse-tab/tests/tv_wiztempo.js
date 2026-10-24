/* v67.3 新建曲谱填速度（产品反馈「歌曲创建时没有速度可以填写」）回归：
   原向导速度框只有一个「♩=」前缀、没有字名，用户认不出；x/8 拍号下框前仍写 ♩=，建出来页头却是 ♪=（单位不一致）；
   填 300 / 空 / 非数字原样落谱（无校验）；「曲谱信息」弹窗只有速度术语、没有 ♩= 数值（向导提示「创建后在曲谱信息改」却改不了）。
   T1 结构：基础信息逐项带名（曲名/调/拍号/速度），速度框有 <label for=nw-tempo>速度</label>、默认 90、x/4 显示 ♩ 字形且单位下拉隐藏
   T2 真实 UI 填速度（4/4）：键盘输入 120 → 创建 → song.tempo=120、页头 ♩=120、真播放 spb=0.5s/小节 2.0s、MIDI 四分 120
   T3 x/8 联动 + 默认 ♪：选 6/8 → ♩ 字形让位单位下拉（默认 ♪ 八分，与老口径 x/8=八分一致）→ 填 100 → 页头 ♪=100、
      tempoUnit 不落字段（隐式 e）、真播放八分 0.6s；切回 4/4 → 下拉收起、字形回 ♩
   T4 x/8 选 ♩.：6/8 + ♩. 附点四分 + 60 → tempoUnit 'dq'、页头 ♩.=60、真播放八分 0.333s/小节 2.0s、MIDI 四分 90
   T5 默认值：不碰速度直接创建（器乐/声乐/功能/钢琴 4 类）→ 一律 90、页头 ♩=90、无 tempoUnit 字段（与 createSong 默认一致）
   T6 越界/非法：输入 300 即时红框+提示，失焦夹到 240 并提示，创建后 song.tempo=240 且建成提示点名；
      输入 10 → 30；清空 → 默认 90；95.6 → 96（静默取整）；非数字（e）→ 默认 90
   T7 「曲谱信息」弹窗：有速度数值＋单位下拉；改成 ♩.=72 → 落谱+页头 ♩.=72，Ctrl+Z 一步撤回；
      不碰速度点确定 → 谱面逐字段不变（不凭空写 tempoUnit）；x/4 谱改拍号到 x/8 且未动单位 → 下拉随动显示 ♪
   T8 手机 390 宽：向导无横向溢出、速度框与「速度」字名在弹窗内可见
   T9 导入不受影响（护栏）：向导里填 150 后改走 MusicXML 导入（文件自带 ♩=72）→ song.tempo=72
   ——验收收尾补断言（T10–T16 对实现者初版全红；对 v67.1 原版除 T13 外全红——T13 以 v67.1 曲名框宽为基线，旧版自然绿）——
   T10 向导边输入不误报：键入 1→12→120 全程无红框/无提示、弹窗高度不跳；键入 300 仍即时报（>240 再敲也救不回）；
       键入 2 再 Tab → 失焦才提示「最小 30，已调整为 30」
   T11 「曲谱信息」越界不再悄悄改：输 300 失焦 → 框下另起一行说明（对齐输入列）、确定 toast 点名「最大 240」；
       输 0 → 30 并点名；输 300 失焦后改口 120 → 确定不残留旧说明
   T12 「曲谱信息」单位以值论：♩→♪→♩ 确定不落 tempoUnit（之后页头改 6/8 仍按 ♪ 隐式，qpm 45）；
       4/4 谱选 ♪ 确定 → 显式 e；♩→♪→♩ 后在弹窗里改 8 分母 → 下拉随动 ♪、确定不落字段
   T13 曲名框不被挤窄：1280/768/390/320 四档、x/4 与 x/8 下曲名框宽度均 ≥ v67.1 同档（371/385/252/185）且两种拍号等宽
   T14 「曲谱信息」速度行 320 宽：「速度」标签与其他行同宽同右缘、单位下拉 ≥ 60px 可读、无横向溢出、范围注记不折行
   T15 可访问名称：#nw-tunit/#mm-tunit 有 aria-label；「调」「拍号」是 label[for]，点字名聚焦对应下拉；
       「曲谱信息」点「速度」字名聚焦数值框（不是单位下拉）
   T16 页头速度弹窗与向导同口径：95.6→96（此前 parseInt 截成 95）、300→240 且 toast 点名、0→30
   突变实证：MUSETAB_URL=file://…/v67.1 原版 复跑 → PASS 4/16：T1/T3/T4/T6/T7/T8/T10/T11/T12/T14/T15/T16 红
   （T2/T5/T9 为护栏：旧版 4/4 填数本就生效、默认 90、导入取文件速度；T13 为宽度基线）；实现者初版复跑 → PASS 9/16（T10–T16 红）。
   ——第二轮验收补（修前副本 scratchpad/v673/r3/before-r3.html 复跑 PASS 16/22：T1–T16 绿、T17–T22 全红）——
   T17 真鼠标点页头 ♩=90 → 不点输入框直接敲 120 回车：速度＝120、谱面不变（此前焦点落回 body，数字写进谱面、速度不变）
   T18 速度浮层打开时点浮层空白处（焦点离开输入框）再敲数字 / 方向键：数字进输入框、方向键不移动谱面光标，Enter＝确定
   T19 手机 390×844：调 / 拍号 / 速度同一行，「创建」按钮不滚动即在弹窗可视区内（v67.2 口径）
   T20 「曲谱信息」手选 ♪ 后改拍号分母 8 → 再改回 4：下拉仍是用户选的 ♪，确定落 tempoUnit 'e'、页头 ♪=90
   T21 播放坞 #i-tempo 与各入口同口径：95.6→96 提示取整；清空＝保持原速 133；0→30、300→240 均提示
   T22 向导敲「-」第一键不误报「需为数字」（失焦才提示）；老谱 300 在页头弹窗 / 曲谱信息清空回车：提示「最大 240」而不是「未填有效数字」
   ——v67.4 新建面板（三意图卡向导下线，docs/design-2026-10e 已拍板）随流程必然改变的口径：
   · 「向导」＝新建面板，速度 / 拍号 / 单位下拉的 id 与 v67.3 口径不变；默认速度改为「按用途」——本套件统一选「歌谱 · 合唱」（♩=90），原 90 断言照旧；
   · T5 不碰速度直接建：四类用途各落各自的默认速度（吉他弹唱 80 / 歌谱 90 / 和弦谱 84 / 器乐·钢琴 90），页头一致、不落 tempoUnit；
   · 手机（拍板 1：先不开放手机新建；只拦真手机＝触屏粗指针、屏幕短边 <600）→ T8 手机档验「发到电脑继续」说明不溢出、主按钮可见；
     电脑浏览器窄窗口（390，非触屏）照常出完整面板，恢复 v67.3 口径：「速度」字名 / 单位下拉 / 数值框都在弹窗内；
     T13 电脑档按面板右栏新基线（1280 / 1100 / 1024），窄窗口 768 / 390 / 320 恢复 v67.1 同档基线（385 / 252 / 185）；
     T19 改验电脑紧凑档（1280×720 / 1024×700）调·拍号·速度同一行、「创建」不滚动即可见。其余断言不变。 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
/* v69.1 C：本套件的新建面板版式断言（字段带名、曲名框宽、紧凑档同一行）是 v67.3–v69.0 右栏表单口径——新形态参数行合稿由 tv_newpanel2 覆盖，本套件改跑 ?next=0；
   速度口径（夹紧 / 取整 / 单位）两形态同一套 tempoInputVal 与 onChange，页头 / 曲谱信息 / 播放坞用例照旧 */
const F0 = process.env.MUSETAB_URL || 'file://' + path.resolve(__dirname, '../index.html');
const F = F0 + (F0.includes('?') ? '&' : '?') + 'next=0';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  pg.setDefaultTimeout(8000);
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(1000);
  await pg.evaluate(`(()=>{ window.guardReplace=(p)=>p(); window.SF_PLAYWAIT=false;
    window.hdr=()=>{ const t=[...document.getElementById('score').querySelectorAll('text')].map(x=>x.textContent).find(x=>/[♩♪]\\.?=\\d+/.test(x))||''; return (t.match(/[♩♪]\\.?=\\d+/)||[''])[0]; };
    /* 新建谱是空小节，parseSMF 会以「没有音符事件」拒收——直接扫 FF 51 03 速度元事件（四分音符微秒数） */
    window.midiTempo=(s)=>{ const out=exportMIDI(s||song); const u=out&&out.bytes? out.bytes : out;
      for(let i=0;i+5<u.length;i++) if(u[i]===0xFF&&u[i+1]===0x51&&u[i+2]===0x03) return +(60000000/((u[i+3]<<16)|(u[i+4]<<8)|u[i+5])).toFixed(2);
      return null; };
    /* 真播放：play() 排程后读 audio.evCtx（spb＝单位音符秒长、starts＝各小节起点），立即停 */
    window.playProbe=()=>{ try{ play(); const c=audio.evCtx||{}; const r={spb:+(+c.spb).toFixed(3), mea:c.starts&&c.starts.length>1? +(c.starts[1]-c.starts[0]).toFixed(3) : null}; stopPlay(); return r; }catch(e){ try{stopPlay();}catch(_){} return {err:String(e.message||e)}; } };
  })()`);
  const EV = s => pg.evaluate(s).catch(e => ({ err: e.message }));
  /* 打开向导：走当前外壳的真实入口——v68.2 收尾 ENG-8：默认外壳（flow）是页签「＋」#dt-add，旧外壳是顶栏「新建」#b-new；两者都不在屏上
     （启动台 inert、手机 / 窄窗口）时按 Alt+N（真实按键，同一 showNewWizard）。此前只点 #b-new、点不到静默回落 showNewWizard，
     默认外壳下每次白等 1.5 秒、也测不到真实入口（本机 93s，CI 上 a8c2089 只要 32s） */
  const openWiz = async () => {
    await EV(`(()=>{ try{ closeModal(); }catch(_){} try{ localStorage.removeItem('musetab-nw-last'); }catch(_){} })()`);
    const ent = await EV(`(()=>{ const ok=id=>{ const e=document.getElementById(id); if(!e || !e.offsetParent || e.closest('[inert]')) return false; const r=e.getBoundingClientRect(); return r.width>0 && r.height>0; };
      return ok('dt-add')? '#dt-add' : ok('b-new')? '#b-new' : ''; })()`);
    if (ent) await pg.click(ent); else await pg.keyboard.press('Alt+KeyN');
    await pg.waitForSelector('#nw-create', { timeout: 3000 });
    /* v67.4 新建面板：选「歌谱 · 合唱」用途（默认 ♩=90，与 v67.3 默认速度口径一致） */
    await pg.click('.nf-modal [data-scene="vocal"]', { timeout: 1500 }).catch(() => {});
  };
  const typeTempo = async (txt) => {
    await pg.click('#nw-tempo', { clickCount: 3 });
    await pg.keyboard.press('Control+a'); await pg.keyboard.press('Backspace');
    if (txt) await pg.keyboard.type(txt);
  };
  const state = () => EV(`(()=>({tempo:song.tempo, tu:song.tempoUnit===undefined? 'none' : song.tempoUnit, unit:song.unit, beats:song.beats, hdr:hdr()}))()`);

  /* ---------- T1 结构 ---------- */
  await openWiz();
  let r = await EV(`(()=>{
    const lab=document.querySelector('label[for="nw-tempo"]');
    const labs=[...document.querySelectorAll('.nw-basics .nw-lab')].map(x=>x.textContent.trim());
    const g=document.getElementById('nw-tglyph'), tu=document.getElementById('nw-tunit'), tp=document.getElementById('nw-tempo');
    const vis=el=>!!el && !el.hidden && el.getBoundingClientRect().width>0;
    return { lab: lab? lab.textContent.trim() : null, labs, def: tp && tp.value, min: tp && tp.min, max: tp && tp.max,
      glyph: vis(g)? g.textContent : null, tuHidden: !vis(tu) }; })()`);
  T(r.lab === '速度' && ['曲名', '调', '拍号', '速度'].every(x => (r.labs || []).includes(x)) && r.def === '90'
    && r.min === '30' && r.max === '240' && r.glyph === '♩' && r.tuHidden,
    'T1 基础信息逐项带名（曲名/调/拍号/速度）、速度默认 90、x/4 显示 ♩ 且单位下拉隐藏', JSON.stringify(r));

  /* ---------- T2 真实 UI 填速度 4/4 ---------- */
  await typeTempo('120');
  await pg.click('#nw-create'); await pg.waitForTimeout(150);
  r = await state();
  let p = await EV(`playProbe()`), mt = await EV(`midiTempo()`);
  T(r.tempo === 120 && r.tu === 'none' && r.hdr === '♩=120' && p.spb === 0.5 && p.mea === 2 && mt === 120,
    'T2 键盘填 120 → song.tempo=120、页头 ♩=120、真播放四分 0.5s/小节 2.0s、MIDI 120', JSON.stringify({ r, p, mt }));

  /* ---------- T3 x/8 联动 + 默认 ♪ ---------- */
  await openWiz();
  await pg.selectOption('#nw-beats', '6'); await pg.selectOption('#nw-unit', '8');
  let link = await EV(`(()=>{ const g=document.getElementById('nw-tglyph'), tu=document.getElementById('nw-tunit'), tp=document.getElementById('nw-tempo');
    const vis=el=>!!el && !el.hidden && el.getBoundingClientRect().width>0;
    return { glyphShown: vis(g), tuShown: vis(tu), tuVal: tu && tu.value, opts: tu? [...tu.options].map(o=>o.value).join(',') : '', tip: tp && tp.title }; })()`);
  await typeTempo('100');
  await pg.click('#nw-create'); await pg.waitForTimeout(150);
  r = await state(); p = await EV(`playProbe()`);
  await openWiz();
  await pg.selectOption('#nw-unit', '8'); await pg.selectOption('#nw-unit', '4');
  const back = await EV(`(()=>{ const g=document.getElementById('nw-tglyph'), tu=document.getElementById('nw-tunit');
    return { glyph: !!g && !g.hidden, tuHidden: !tu || tu.hidden }; })()`);
  T(!link.glyphShown && link.tuShown && link.tuVal === 'e' && link.opts === 'e,dq' && /八分/.test(link.tip || '')
    && r.unit === 8 && r.beats === 6 && r.tempo === 100 && r.tu === 'none' && r.hdr === '♪=100' && p.spb === 0.6 && p.mea === 3.6
    && back.glyph && back.tuHidden,
    'T3 选 6/8 → 单位下拉（默认 ♪ 八分）替换 ♩、填 100 → 页头 ♪=100、真播放八分 0.6s/小节 3.6s；切回 4/4 下拉收起', JSON.stringify({ link, r, p, back }));

  /* ---------- T4 x/8 选 ♩. ---------- */
  await pg.selectOption('#nw-beats', '6'); await pg.selectOption('#nw-unit', '8');
  let t4ok = true;
  try { await pg.selectOption('#nw-tunit', 'dq', { timeout: 1500 }); } catch (_) { t4ok = false; }
  await typeTempo('60');
  await pg.click('#nw-create'); await pg.waitForTimeout(150);
  r = await state(); p = await EV(`playProbe()`); mt = await EV(`midiTempo()`);
  T(t4ok && r.tempo === 60 && r.tu === 'dq' && r.hdr === '♩.=60' && p.spb === 0.333 && p.mea === 2 && mt === 90,
    'T4 6/8 选 ♩. 附点四分 60 → tempoUnit dq、页头 ♩.=60、真播放八分 0.333s/小节 2.0s、MIDI 四分 90', JSON.stringify({ t4ok, r, p, mt }));

  /* ---------- T5 默认值（4 类谱都不碰速度；v67.4 按用途的默认速度） ---------- */
  const defs = [];
  for (const [scene, want] of [['gtr', 80], ['vocal', 90], ['chord', 84], ['inst', 90]]) {
    await openWiz();
    await pg.click('.nf-modal [data-scene="' + scene + '"]');
    await pg.click('#nw-create'); await pg.waitForTimeout(120);
    const s = await state(); defs.push(scene + '=' + s.tempo + '/' + s.tu + '/' + s.hdr + (s.tempo === want && s.hdr === '♩=' + want ? '' : '≠' + want));
  }
  T(defs.every(x => /=(\d+)\/none\/♩=\1$/.test(x)), 'T5 不碰速度直接创建（吉他弹唱 80 / 歌谱 90 / 和弦谱 84 / 器乐·钢琴 90）→ 用途默认速度、页头一致、不落 tempoUnit', defs.join(' '));

  /* ---------- T6 越界 / 非法 ---------- */
  await openWiz();
  await typeTempo('300');
  const live = await EV(`(()=>{ const m=document.getElementById('nw-tpmsg'), tp=document.getElementById('nw-tempo');
    return { msg: m? m.textContent : '', shown: !!m && getComputedStyle(m).display!=='none', bad: tp.classList.contains('bad') }; })()`);
  await pg.keyboard.press('Tab');
  const blur = await EV(`(()=>{ const m=document.getElementById('nw-tpmsg'), tp=document.getElementById('nw-tempo');
    return { val: tp.value, msg: m? m.textContent : '', bad: tp.classList.contains('bad') }; })()`);
  await pg.click('#nw-create'); await pg.waitForTimeout(150);
  const hi = await state();
  const toast6 = await EV(`document.getElementById('toast').textContent`);
  const vals = {};
  for (const [txt, key] of [['10', 'low'], ['', 'empty'], ['95.6', 'round'], ['e', 'nan']]) {
    await openWiz();
    await typeTempo(txt);
    await pg.click('#nw-create'); await pg.waitForTimeout(120);
    vals[key] = (await state()).tempo;
  }
  T(/240/.test(live.msg) && live.shown && live.bad && blur.val === '240' && /240/.test(blur.msg) && !blur.bad
    /* v68.7 S1 迁移（集成时补；规格 §6.C3 #57：新外壳建成提示只出短文 + 「撤销」）：原 /速度最大 240/（整句提示里的 tpNote）→ /速度(最大|按) 240/——
       新外壳短文在速度被夹时照实写「已新建 · 速度按 240」（集成时补的「建成提示点名」），旧外壳 / 手机原句不变；意图不变（建成提示点名 240）。
       修前红修后绿：集成未补点名前短文是「已新建简谱歌谱」（T6 红，21/22）；5cddfb8 整句含「速度最大 240」，新正则照旧绿 */
    && hi.tempo === 240 && hi.hdr === '♩=240' && /速度(最大|按) 240/.test(toast6)
    && vals.low === 30 && vals.empty === 90 && vals.round === 96 && vals.nan === 90,
    'T6 越界/非法：300 即时红框提示→失焦夹 240→落谱 240 且建成提示点名；10→30、空→90、95.6→96、e→90',
    JSON.stringify({ live, blur, hi, toast6, vals }));

  /* ---------- T7 曲谱信息弹窗 ---------- */
  await openWiz(); await pg.click('#nw-create'); await pg.waitForTimeout(120);
  await EV(`(()=>{ undoStack.length=0; document.getElementById('b-meta').onclick(); })()`);
  const mm0 = await EV(`(()=>{ const tp=document.getElementById('mm-tempo'), tu=document.getElementById('mm-tunit');
    return { has: !!tp && !!tu, val: tp && tp.value, tu: tu && tu.value }; })()`);
  let mm = { set: null, undo: null, same: null, follow: null };
  if (mm0.has) {
    await pg.selectOption('#mm-tunit', 'dq');
    await pg.click('#mm-tempo', { clickCount: 3 }); await pg.keyboard.press('Control+a'); await pg.keyboard.type('72');
    await pg.click('#mm-ok'); await pg.waitForTimeout(100);
    mm.set = await state();
    await EV(`undo()`); await pg.waitForTimeout(60);
    mm.undo = await state();
    /* 不碰速度直接确定 → 速度字段不变、不凭空写 tempoUnit；再确定一次整谱逐字段不变
       （首次确定会把老字段 tempoTerm/pickup 规整成 ''/false，属弹窗既有行为，故以第二次为准） */
    mm.same = await EV(`(()=>{ const ok=()=>{ document.getElementById('b-meta').onclick(); document.getElementById('mm-ok').click(); };
      const t0=song.tempo; ok(); const f1=song.tempo===t0 && !('tempoUnit' in song);
      const a=JSON.stringify(song); ok(); return f1 && JSON.stringify(song)===a; })()`);
    /* x/4 → x/8 拍号、单位未动 → 下拉随动 ♪ */
    await EV(`document.getElementById('b-meta').onclick()`);
    await pg.selectOption('#mm-unit', '8');
    mm.follow = await EV(`document.getElementById('mm-tunit').value`);
    await pg.click('#mm-cancel');
  }
  T(mm0.has && mm0.val === '90' && mm0.tu === 'q' && mm.set.tempo === 72 && mm.set.tu === 'dq' && mm.set.hdr === '♩.=72'
    && mm.undo.tempo === 90 && mm.undo.tu === 'none' && mm.undo.hdr === '♩=90' && mm.same === true && mm.follow === 'e',
    'T7 曲谱信息弹窗有速度数值＋单位：改 ♩.=72 落谱+页头、Ctrl+Z 一步撤回、不碰速度确定零改动、改 x/8 单位随动 ♪', JSON.stringify({ mm0, mm }));

  /* ---------- T8 手机 390 宽（v67.4 拍板 1：手机先不开放新建 →「发到电脑继续」说明）＋ 电脑窄窗口 390 照常出面板 ---------- */
  {
    const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    m.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    await m.goto(F); await m.waitForTimeout(1000);
    await m.evaluate(() => showNewWizard());
    await m.waitForTimeout(200);
    const g = await m.evaluate(() => {
      const md = document.querySelector('.modal'), mr = md.getBoundingClientRect(), pc = document.getElementById('nw-pc');
      const pr = pc ? pc.getBoundingClientRect() : null;
      const inside = rc => !!rc && rc.width > 0 && rc.left >= mr.left - 0.5 && rc.right <= mr.right + 0.5 && rc.bottom <= innerHeight;
      return { sw: document.documentElement.scrollWidth, mOver: md.scrollWidth - md.clientWidth, pc: inside(pr), noForm: !document.getElementById('nw-tempo') && !document.getElementById('nw-create') };
    });
    await m.close();
    /* 电脑浏览器窗口拉到 390 宽（非触屏）：不是手机，照常出面板（验收：此前只看宽度，电脑半屏也建不了谱）——v67.3 原口径 */
    const d = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    d.on('pageerror', e => errs.push('PAGEERR:' + e.message));
    await d.goto(F); await d.waitForTimeout(1000);
    await d.evaluate(() => { try { localStorage.removeItem('musetab-nw-last'); } catch (_) {} showNewWizard(); });
    await d.waitForTimeout(200);
    await d.selectOption('#nw-unit', '8').catch(() => {});
    const g2 = await d.evaluate(() => {
      const md = document.querySelector('.modal').getBoundingClientRect();
      const tp = document.getElementById('nw-tempo'); const tr = tp ? tp.getBoundingClientRect() : null;
      const lab = document.querySelector('label[for="nw-tempo"]'); const lr = lab ? lab.getBoundingClientRect() : null;
      const tu = document.getElementById('nw-tunit'); const ur = tu && !tu.hidden ? tu.getBoundingClientRect() : null;
      const inside = rc => !!rc && rc.width > 0 && rc.left >= md.left - 0.5 && rc.right <= md.right + 0.5;
      return { sw: document.documentElement.scrollWidth, mOver: document.querySelector('.modal').scrollWidth - document.querySelector('.modal').clientWidth,
        tp: inside(tr), lab: inside(lr), tu: inside(ur), tpW: tr ? Math.round(tr.width) : 0, mpc: !!document.getElementById('nw-pc') };
    });
    await d.close();
    T(g.sw <= 390 && g.mOver <= 0 && g.pc && g.noForm && g2.sw <= 390 && g2.mOver <= 0 && g2.tp && g2.lab && g2.tu && g2.tpW >= 56 && !g2.mpc,
      'T8 手机 390：新建＝「发到电脑继续」说明（不出建谱表单）、无横溢、主按钮可见；电脑窄窗口 390：照常出面板，「速度」字名/单位下拉/数值框都在弹窗内', JSON.stringify({ g, g2 }));
  }

  /* ---------- T9 导入不受影响（护栏） ---------- */
  {
    const xml = '<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><work><work-title>导入速度</work-title></work>'
      + '<part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list><part id="P1"><measure number="1">'
      + '<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>'
      + '<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>72</per-minute></metronome></direction-type><sound tempo="72"/></direction>'
      + ['C', 'D', 'E', 'G'].map(s => '<note><pitch><step>' + s + '</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>').join('')
      + '</measure></part></score-partwise>';
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiztempo-'));
    const fp = path.join(dir, 'tempo72.musicxml'); fs.writeFileSync(fp, xml);
    await openWiz();
    await typeTempo('150');
    await pg.setInputFiles('#nw-mxlfile', fp); await pg.waitForTimeout(500);
    await pg.click('#nf-impgo'); await pg.waitForTimeout(200);   /* v67.5 依据页「导入」（按原文件） */
    const s = await state(); const title = await EV(`song.title`);
    T(title === '导入速度' && s.tempo === 72 && s.hdr === '♩=72', 'T9 向导里填 150 后改走 MusicXML 导入 → 速度取文件 ♩=72（导入路径不受影响）', JSON.stringify({ title, s }));
  }

  /* 新增断言块（T10–T16）元素缺失时（如旧版没有该控件）记红而不是整套崩溃 */
  const guard = async (name, fn) => { try { await fn(); } catch (e) { T(false, name, 'EXC: ' + String(e.message || e).split('\n')[0]); await EV(`(()=>{ try{ closePop(); }catch(_){} try{ closeModal(); }catch(_){} })()`); } };
  /* ---------- T10 向导边输入不误报（验收 F1） ---------- */
  await guard('T10 向导边输入不误报', async () => {
    await openWiz();
    await pg.click('#nw-tempo', { clickCount: 3 }); await pg.keyboard.press('Control+a'); await pg.keyboard.press('Backspace');
    const snap = () => EV(`(()=>{ const t=document.getElementById('nw-tempo'), m=document.getElementById('nw-tpmsg');
      return { v:t.value, bad:t.classList.contains('bad'), msg: m && m.classList.contains('on')? m.textContent : '', mh: Math.round(document.querySelector('.modal').getBoundingClientRect().height) }; })()`);
    const seq = [];
    for (const ch of '120') { await pg.keyboard.type(ch); seq.push(await snap()); }
    await pg.keyboard.press('Control+a'); await pg.keyboard.press('Backspace');
    const hi = []; for (const ch of '300') { await pg.keyboard.type(ch); hi.push(await snap()); }
    await pg.keyboard.press('Control+a'); await pg.keyboard.press('Backspace'); await pg.keyboard.type('2');
    const low = await snap(); await pg.keyboard.press('Tab'); const lowBlur = await snap();
    const mh0 = seq[0].mh;
    T(seq.every(x => !x.bad && !x.msg && x.mh === mh0) && !hi[0].bad && !hi[1].bad && hi[2].bad && /最大 240/.test(hi[2].msg)
      && !low.bad && !low.msg && lowBlur.v === '30' && /最小 30，已调整为 30/.test(lowBlur.msg),
      'T10 向导边输入不误报：1→12→120 无红框/无提示/高度不跳；300 即时报；2 失焦才提示并夹到 30', JSON.stringify({ seq, hi, low, lowBlur }));
    await EV(`closeModal()`);
  });

  /* ---------- T11 曲谱信息越界说明（验收 F2） ---------- */
  await guard('T11 曲谱信息越界说明', async () => {
    await openWiz(); await pg.click('#nw-create'); await pg.waitForTimeout(120);
    const metaType = async (txt, blur) => {
      await EV(`(()=>{ document.getElementById('toast').textContent=''; document.getElementById('b-meta').onclick(); })()`);
      await pg.click('#mm-tempo', { clickCount: 3 }); await pg.keyboard.press('Control+a'); await pg.keyboard.type(txt);
      if (blur) await pg.keyboard.press('Tab');
    };
    const warnInfo = () => EV(`(()=>{ const w=document.getElementById('mm-tpwarn'), md=document.querySelector('.modal').getBoundingClientRect(), tp=document.getElementById('mm-tempo').getBoundingClientRect();
      if(!w) return {has:false}; const r=w.getBoundingClientRect();
      return { has:true, on: getComputedStyle(w).display!=='none' && r.height>0, txt:w.textContent, below: r.top>=tp.bottom-1, inside: r.right<=md.right+0.5, val: document.getElementById('mm-tempo').value }; })()`);
    await metaType('300', true);
    const w1 = await warnInfo();
    await pg.click('#mm-ok'); await pg.waitForTimeout(80);
    const a1 = await EV(`({t:song.tempo, toast:document.getElementById('toast').textContent})`);
    await metaType('0', true); await pg.click('#mm-ok'); await pg.waitForTimeout(80);
    const a2 = await EV(`({t:song.tempo, toast:document.getElementById('toast').textContent})`);
    await metaType('300', true); const w3a = await warnInfo();
    await pg.click('#mm-tempo', { clickCount: 3 }); await pg.keyboard.press('Control+a'); await pg.keyboard.type('120');
    const w3b = await warnInfo();
    await pg.click('#mm-ok'); await pg.waitForTimeout(80);
    const a3 = await EV(`({t:song.tempo, toast:document.getElementById('toast').textContent})`);
    T(w1.has && w1.on && /最大 240/.test(w1.txt) && w1.below && w1.inside && w1.val === '240'
      && a1.t === 240 && /速度最大 240/.test(a1.toast) && a2.t === 30 && /速度最小 30/.test(a2.toast)
      && w3a.on && !w3b.on && a3.t === 120 && !/调整/.test(a3.toast),
      'T11 曲谱信息越界：300 失焦框下说明+确定 toast 点名 240；0→30 点名；改口 120 不残留旧说明', JSON.stringify({ w1, a1, a2, w3a, w3b, a3 }));
  });

  /* ---------- T12 曲谱信息单位以值论（验收 F3） ---------- */
  await guard('T12 曲谱信息单位以值论', async () => {
    const fresh = async () => { await openWiz(); await pg.click('#nw-create'); await pg.waitForTimeout(100); await EV(`document.getElementById('b-meta').onclick()`); };
    const st = () => EV(`(()=>({tu:'tempoUnit' in song? song.tempoUnit : 'none', glyph:tempoGlyph(song), qpm:tempoQPM(song)}))()`);
    await fresh();
    await pg.selectOption('#mm-tunit', 'e'); await pg.selectOption('#mm-tunit', 'q');
    await pg.click('#mm-ok'); await pg.waitForTimeout(60);
    const r1 = await st();
    await EV(`mutate(()=>{ song.beats=6; song.unit=8; })`);   // 页头拍号菜单 6/8 同一写法
    const r1b = await st();
    await fresh();
    await pg.selectOption('#mm-tunit', 'e'); await pg.click('#mm-ok'); await pg.waitForTimeout(60);
    const r2 = await st();
    await fresh();
    await pg.selectOption('#mm-tunit', 'e'); await pg.selectOption('#mm-tunit', 'q');
    await pg.selectOption('#mm-unit', '8');
    const fol = await EV(`document.getElementById('mm-tunit').value`);
    await pg.click('#mm-ok'); await pg.waitForTimeout(60);
    const r3 = await st();
    T(r1.tu === 'none' && r1b.tu === 'none' && r1b.glyph === '♪' && r1b.qpm === 45 && r2.tu === 'e' && fol === 'e' && r3.tu === 'none' && r3.glyph === '♪',
      'T12 曲谱信息单位以值论：♩→♪→♩ 不落字段（后改 6/8 仍 ♪/qpm 45）；选 ♪ 落显式 e；改回后再改 8 分母随动 ♪ 不落字段', JSON.stringify({ r1, r1b, r2, fol, r3 }));
  });

  /* ---------- T13 曲名框不被挤窄（验收 F4；v67.4 面板右栏新基线：曲名独占一行 ≥240，紧凑两栏档铺满 ≥480；电脑窄窗口 768 / 390 / 320 回到 v67.1 同档基线） ---------- */
  await guard('T13 曲名框不被挤窄', async () => {
    const res = [];
    for (const [w, h, min] of [[1280, 900, 240], [1100, 800, 480], [1024, 700, 480], [768, 1024, 385], [390, 844, 252], [320, 568, 185]]) {
      const m = await b.newPage({ viewport: { width: w, height: h } });
      m.on('pageerror', e => errs.push('PAGEERR(t13):' + e.message));
      await m.goto(F); await m.waitForTimeout(700);
      await m.evaluate(() => showNewWizard());
      let w4 = 0, w8 = 0;
      if (min) {
        await m.waitForSelector('#nw-create');
        const tw = () => m.evaluate(() => Math.round(document.getElementById('nw-title').getBoundingClientRect().width));
        w4 = await tw();
        await m.selectOption('#nw-beats', '12'); await m.selectOption('#nw-unit', '8');
        w8 = await tw();
      }
      const sw = await m.evaluate(() => document.documentElement.scrollWidth);
      res.push({ w, min, w4, w8, sw });
      await m.close();
    }
    T(res.every(x => x.w4 >= x.min && x.w8 >= x.min && Math.abs(x.w4 - x.w8) <= 1 && x.sw <= x.w),
      'T13 曲名框不被挤窄：1280 / 1100 / 1024 下 x/4、x/8 等宽且 ≥ 面板基线；电脑窄窗口 768 / 390 / 320 ≥ v67.1 同档（385 / 252 / 185）、无横向溢出', JSON.stringify(res));
  });

  /* ---------- T14 曲谱信息速度行 320 宽（验收 F5） ---------- */
  await guard('T14 曲谱信息速度行 320 宽', async () => {
    const m = await b.newPage({ viewport: { width: 320, height: 640 } });
    m.on('pageerror', e => errs.push('PAGEERR(t14):' + e.message));
    await m.goto(F); await m.waitForTimeout(700);
    await m.evaluate(() => document.getElementById('b-meta').onclick());
    const g = await m.evaluate(() => {
      const tp = document.getElementById('mm-tempo'); if (!tp) return { has: false };
      const row = tp.closest('label'), lab = row.querySelector('span').getBoundingClientRect();
      const ref = document.getElementById('mm-capo').closest('label').querySelector('span').getBoundingClientRect();
      const md = document.querySelector('.modal'), mr = md.getBoundingClientRect();
      const fn = row.querySelector('.fnote'); const fr = fn ? fn.getBoundingClientRect() : null;
      const lh = fn ? parseFloat(getComputedStyle(fn).lineHeight) || 20 : 0;
      return { has: true, labW: Math.round(lab.width), refW: Math.round(ref.width), labR: Math.round(lab.right), refR: Math.round(ref.right),
        selW: Math.round(document.getElementById('mm-tunit').getBoundingClientRect().width),
        tpIn: tp.getBoundingClientRect().right <= mr.right + 0.5, over: md.scrollWidth - md.clientWidth,
        fnOneLine: !fr || fr.height === 0 || fr.height <= lh + 1 };
    });
    T(g.has && g.labW === g.refW && g.labR === g.refR && g.selW >= 60 && g.tpIn && g.over <= 0 && g.fnOneLine,
      'T14 曲谱信息速度行 320 宽：标签与其他行同宽同右缘、单位下拉 ≥60px、数值框在弹窗内、范围注记不折行', JSON.stringify(g));
    await m.close();
  });

  /* ---------- T15 可访问名称（验收 F6） ---------- */
  await guard('T15 可访问名称', async () => {
    await openWiz();
    const a = await EV(`(()=>({ tuAria: (document.getElementById('nw-tunit')||{getAttribute(){return null}}).getAttribute('aria-label'),
      keyLab: !!document.querySelector('label[for="nw-key"]'), beatsLab: !!document.querySelector('label[for="nw-beats"]') }))()`);
    let keyFocus = null, beatsFocus = null;
    if (a.keyLab) { await pg.click('label[for="nw-key"]'); keyFocus = await EV(`document.activeElement.id`); }
    if (a.beatsLab) { await pg.click('label[for="nw-beats"]'); beatsFocus = await EV(`document.activeElement.id`); }
    await pg.click('#nw-create'); await pg.waitForTimeout(100);
    await EV(`document.getElementById('b-meta').onclick()`);
    const mAria = await EV(`document.getElementById('mm-tunit').getAttribute('aria-label')`);
    await pg.click('label:has(#mm-tempo) > span:first-child');
    const metaFocus = await EV(`document.activeElement.id`);
    await pg.click('#mm-cancel');
    T(a.tuAria === '速度单位' && keyFocus === 'nw-key' && beatsFocus === 'nw-beats' && mAria === '速度单位' && metaFocus === 'mm-tempo',
      'T15 可访问名称：单位下拉有 aria-label；点「调」「拍号」聚焦下拉；曲谱信息点「速度」聚焦数值框', JSON.stringify({ a, keyFocus, beatsFocus, mAria, metaFocus }));
  });

  /* ---------- T16 页头速度弹窗同口径（验收 F7） ---------- */
  await guard('T16 页头速度弹窗同口径', async () => {
    const hp = async (txt) => {
      await EV(`(()=>{ song.tempo=90; document.getElementById('toast').textContent=''; showHeadMenu('tempo', 300, 200); })()`);
      await pg.waitForSelector('#tp-val');
      await pg.click('#tp-val', { clickCount: 3 }); await pg.keyboard.press('Control+a'); if (txt) await pg.keyboard.type(txt); else await pg.keyboard.press('Backspace');
      await pg.keyboard.press('Enter'); await pg.waitForTimeout(60);
      return EV(`({t:song.tempo, toast:document.getElementById('toast').textContent})`);
    };
    const h1 = await hp('95.6'), h2 = await hp('300'), h3 = await hp('0'), h4 = await hp('');
    T(h1.t === 96 && h2.t === 240 && /最大 240/.test(h2.toast) && h3.t === 30 && /最小 30/.test(h3.toast) && h4.t === 90,
      'T16 页头速度弹窗与向导同口径：95.6→96、300→240 点名、0→30 点名、空→沿用原速度', JSON.stringify({ h1, h2, h3, h4 }));
  });

  /* ======== 第二轮验收补 ======== */
  const newSong = async () => { await openWiz(); await pg.click('#nw-create'); await pg.waitForTimeout(150); await EV(`(()=>{ const t=document.getElementById('toast'); if(t) t.textContent=''; })()`); };
  const hdCenter = () => EV(`(()=>{ const r=document.querySelector('#score [data-hd="tempo"]').getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; })()`);
  const sig1 = () => EV(`JSON.stringify(song.measures[0])`);
  /* ---------- T17 真鼠标点页头速度后直接打字 ---------- */
  await guard('T17 真鼠标点页头速度直接打字', async () => {
    await newSong();
    const s0 = await sig1(), u0 = await EV(`undoStack.length`);
    const p = await hdCenter();
    await pg.mouse.click(p.x, p.y); await pg.waitForTimeout(120);
    const ae = await EV(`document.activeElement.id||document.activeElement.tagName`);
    await pg.keyboard.type('120'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(80);
    const r = await EV(`({t:song.tempo, pop:!!document.getElementById('popmenu'), hdr:hdr()})`);
    r.same = (await sig1()) === s0; r.undo = (await EV(`undoStack.length`)) - u0; r.ae = ae;
    T(r.ae === 'tp-val' && r.t === 120 && !r.pop && r.hdr === '♩=120' && r.same && r.undo === 1,
      'T17 真鼠标点页头 ♩=90 后直接敲 120 回车：焦点在速度框、速度＝120、谱面不变、一步撤销', JSON.stringify(r));
  });
  /* ---------- T18 速度浮层焦点离开输入框后的按键 ---------- */
  await guard('T18 速度浮层按键不进谱面', async () => {
    await newSong();
    const s0 = await sig1(), c0 = await EV(`sel.mi+':'+sel.ci`);
    const p = await hdCenter();
    await pg.mouse.click(p.x, p.y); await pg.waitForTimeout(120);
    const tb = await EV(`(()=>{ const r=document.querySelector('#popmenu .t, #popmenu .flw-hdm-h').getBoundingClientRect(); return {x:r.left+6, y:r.top+r.height/2}; })()`);   /* v69.1 A1：新外壳新形态的速度浮层是就地小面板，标题行 .flw-hdm-h（旧外壳 / ?next=0 仍是 .t） */
    await pg.mouse.click(tb.x, tb.y); await pg.waitForTimeout(60);
    const ae = await EV(`document.activeElement.id||document.activeElement.tagName`);
    await pg.keyboard.press('ArrowRight'); await pg.keyboard.press('ArrowDown');
    const c1 = await EV(`sel.mi+':'+sel.ci`);
    await pg.mouse.click(tb.x, tb.y); await pg.waitForTimeout(60);
    await pg.keyboard.type('132'); const v = await EV(`(document.getElementById('tp-val')||{}).value`);
    await pg.mouse.click(tb.x, tb.y); await pg.keyboard.press('Enter'); await pg.waitForTimeout(80);
    const r = await EV(`({t:song.tempo, pop:!!document.getElementById('popmenu')})`);
    r.same = (await sig1()) === s0; r.ae = ae; r.v = v; r.c0 = c0; r.c1 = c1;
    T(r.ae !== 'tp-val' && r.c1 === r.c0 && r.v === '132' && r.t === 132 && !r.pop && r.same,
      'T18 浮层打开、焦点离开速度框：方向键不移动谱面光标；敲 132 落进速度框；Enter＝确定；谱面不变', JSON.stringify(r));
  });
  /* ---------- T19 电脑紧凑档「创建」可见（v67.4：手机不开放新建，原 390 口径移到面板紧凑档 1280×720 / 1024×700） ---------- */
  await guard('T19 紧凑档创建钮可见', async () => {
    const out = [];
    for (const [w, h] of [[1280, 720], [1024, 700]]) {
      const m = await b.newPage({ viewport: { width: w, height: h } });
      m.on('pageerror', e => errs.push('PAGEERR(t19):' + e.message));
      await m.goto(F); await m.waitForTimeout(700);
      await m.evaluate(() => showNewWizard()); await m.waitForSelector('#nw-create');
      out.push(await m.evaluate(() => { const tops = [...document.querySelectorAll('.nw-basics .nb:not(.nb-ti)')].map(e => Math.round(e.getBoundingClientRect().top));
        const md = document.querySelector('.modal'), mr = md.getBoundingClientRect(), cb = document.getElementById('nw-create').getBoundingClientRect();
        return { tops, cbB: Math.round(cb.bottom), mB: Math.round(mr.bottom), vh: innerHeight, ti: Math.round(document.getElementById('nw-title').getBoundingClientRect().width), sw: document.documentElement.scrollWidth, w: innerWidth }; }));
      await m.close();
    }
    T(out.every(g => g.tops.length === 3 && Math.max(...g.tops) - Math.min(...g.tops) <= 2 && g.cbB <= g.mB && g.mB <= g.vh && g.ti >= 240 && g.sw <= g.w),
      'T19 电脑紧凑档 1280×720 / 1024×700：调/拍号/速度同一行、「创建」不滚动即可见、曲名框 ≥240、无横溢', JSON.stringify(out));
  });
  /* ---------- T20 曲谱信息手选单位不被拍号联动冲掉 ---------- */
  await guard('T20 曲谱信息手选单位', async () => {
    await newSong();
    await EV(`document.getElementById('b-meta').onclick()`);
    await pg.selectOption('#mm-tunit', 'e');
    await pg.selectOption('#mm-unit', '8'); await pg.selectOption('#mm-unit', '4');
    const v = await EV(`document.getElementById('mm-tunit').value`);
    await pg.click('#mm-ok'); await pg.waitForTimeout(60);
    const r = await EV(`({tu:'tempoUnit' in song? song.tempoUnit : 'none', unit:song.unit, hdr:hdr()})`); r.v = v;
    T(r.v === 'e' && r.tu === 'e' && r.unit === 4 && r.hdr === '♪=90', 'T20 曲谱信息 4/4 手选 ♪ → 分母改 8 再改回 4：下拉仍 ♪、确定落 tempoUnit e、页头 ♪=90', JSON.stringify(r));
  });
  /* ---------- T21 播放坞速度框同口径 ---------- */
  await guard('T21 播放坞速度框同口径', async () => {
    await newSong();
    await EV(`(()=>{ song.tempo=133; render(); })()`);
    const it = async (txt) => {
      await EV(`document.getElementById('toast').textContent=''`);
      await pg.click('#i-tempo', { clickCount: 3 }); await pg.keyboard.press('Control+a'); await pg.keyboard.press('Backspace');
      if (txt) await pg.keyboard.type(txt);
      await pg.keyboard.press('Enter'); await pg.waitForTimeout(80);
      return EV(`({t:song.tempo, v:document.getElementById('i-tempo').value, hdr:hdr(), toast:document.getElementById('toast').textContent})`);
    };
    const a = await it('95.6'); await EV(`(()=>{ song.tempo=133; render(); })()`);
    const e2 = await it(''); const z = await it('0'); const h = await it('300');
    T(a.t === 96 && a.hdr === '♩=96' && /取整/.test(a.toast) && e2.t === 133 && e2.v === '133' && z.t === 30 && /最小 30/.test(z.toast) && h.t === 240 && /最大 240/.test(h.toast),
      'T21 播放坞速度框：95.6→96 提示取整、清空保持原速 133、0→30、300→240 均提示', JSON.stringify({ a, e2, z, h }));
  });
  /* ---------- T22 未敲完的前缀不误报 / 越界原速清空的文案 ---------- */
  await guard('T22 前缀不误报与清空文案', async () => {
    await openWiz();
    await pg.click('#nw-tempo', { clickCount: 3 }); await pg.keyboard.press('Control+a'); await pg.keyboard.press('Backspace');
    await pg.keyboard.type('-');
    const w1 = await EV(`(()=>{ const t=document.getElementById('nw-tempo'), m=document.getElementById('nw-tpmsg'); return {bad:t.classList.contains('bad'), msg:m.classList.contains('on')? m.textContent : ''}; })()`);
    await pg.keyboard.type('5'); await pg.keyboard.press('Tab');
    const w2 = await EV(`(()=>({v:document.getElementById('nw-tempo').value, msg:document.getElementById('nw-tpmsg').textContent}))()`);
    await EV(`closeModal()`);
    await newSong();
    await EV(`(()=>{ song.tempo=300; render(); document.getElementById('toast').textContent=''; showHeadMenu('tempo', 300, 200); })()`);
    await pg.waitForSelector('#tp-val');
    await pg.click('#tp-val', { clickCount: 3 }); await pg.keyboard.press('Control+a'); await pg.keyboard.press('Backspace'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(60);
    const h = await EV(`({t:song.tempo, toast:document.getElementById('toast').textContent})`);
    await EV(`(()=>{ song.tempo=300; render(); document.getElementById('toast').textContent=''; document.getElementById('b-meta').onclick(); })()`);
    await pg.click('#mm-tempo', { clickCount: 3 }); await pg.keyboard.press('Control+a'); await pg.keyboard.press('Backspace');
    await pg.click('#mm-ok'); await pg.waitForTimeout(80);
    const mm = await EV(`({t:song.tempo, toast:document.getElementById('toast').textContent})`);
    T(!w1.bad && !w1.msg && w2.v === '30' && /最小 30/.test(w2.msg) && h.t === 240 && /最大 240/.test(h.toast) && !/未填/.test(h.toast) && mm.t === 240 && /最大 240/.test(mm.toast),
      'T22 向导敲「-」不即时误报（-5 失焦夹到 30 才提示）；老谱 300 在页头弹窗 / 曲谱信息清空：提示「最大 240」', JSON.stringify({ w1, w2, h, mm }));
  });

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
