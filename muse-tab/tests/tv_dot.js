/* v41.5 双附点与附点逻辑重设计回归：
   - 附点循环 无→附点→双附点→无（16分止步单附点、32分不可附点）+ 邻音联动（半时值再减半）
   - 拍值/播放时值（beatsOf ×1.75、measureSeconds、beatErrors 不误报）
   - 渲染：五线谱两点、简谱增时线新形态（附点二分=2条增时线、双附点四分=两点）
   - MusicXML：双 dot 出/入往返一致；dotted:true 旧数据兼容不迁移 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });   // v41.5 单窗口化：测试内直通未保存确认对话
  let pass = 0, total = 0;
  const T = (ok, name, detail) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };

  // T1 附点循环 + 邻音联动：4分 无→附点(邻音减半8分)→双附点(邻音再减半16分)→无
  let r = await pg.evaluate(() => {
    const Vc = (deg, dur) => ({dur: dur||4, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false});
    const s = createSong('vocal', {beats:4, unit:4, key:'C', nMea:1, nVox:1, lyr:0});
    s.measures[0].voxes[0] = [Vc(1,4), Vc(2,4), Vc(3,4), Vc(5,4)];
    loadSong(s);
    Object.assign(sel, {row:'vox', vi:0, mi:0, ci:0}); selRange = null;
    const cols = () => song.measures[0].voxes[0];
    const out = {};
    toggleDot(); out.s1 = [cols()[0].dotted, cols()[1].dur];      // true, 8
    toggleDot(); out.s2 = [cols()[0].dotted, cols()[1].dur];      // 2, 16
    toggleDot(); out.s3 = [cols()[0].dotted, cols()[1].dur];      // false, 16（取消不联动）
    return out;
  });
  T(r.s1[0] === true && r.s1[1] === 8 && r.s2[0] === 2 && r.s2[1] === 16 && r.s3[0] === false,
    'T1 循环+联动(4分)', JSON.stringify([r.s1, r.s2, r.s3]));

  // T1b 档位上限（v52.4 64分入体系整体下移）：16分可双附点（无→附点→双→无）；
  //   32分止步单附点；64分不可附点（保持无+128分提示）
  r = await pg.evaluate(() => {
    const Vc = (deg, dur) => ({dur, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false});
    const s = createSong('vocal', {beats:4, unit:4, key:'C', nMea:1, nVox:1, lyr:0});
    s.measures[0].voxes[0] = [Vc(1,16), Vc(2,16), Vc(3,8), Vc(5,4), Vc(6,4), Vc(1,4)];
    loadSong(s);
    Object.assign(sel, {row:'vox', vi:0, mi:0, ci:0}); selRange = null;
    const c0 = () => song.measures[0].voxes[0][0];
    const out = {};
    toggleDot(); out.a = c0().dotted;      // true（16分单附点：16+32）
    toggleDot(); out.b = c0().dotted;      // 2（16分双附点：16+32+64）
    toggleDot(); out.b2 = c0().dotted;     // false（循环归零）
    // 32分止步单附点：无→附点→无
    song.measures[0].voxes[0][0].dur = 32; render();
    toggleDot(); out.c = c0().dotted;      // true
    toggleDot(); out.c2 = c0().dotted;     // false（无双附点档）
    // 64分不可附点
    song.measures[0].voxes[0][0].dur = 64; render();
    toggleDot(); out.f = c0().dotted;      // 保持 false
    out.toast = document.getElementById('toast').textContent;
    // setDur 收敛：双附点16分 → 改32分降单附点 → 改64分去附点
    const c1 = song.measures[0].voxes[0][3]; c1.dur = 16; c1.dotted = 2;
    Object.assign(sel, {ci:3}); setDur(32); out.d = c1.dotted;
    setDur(64); out.e = c1.dotted;
    return out;
  });
  T(r.a === true && r.b === 2 && r.b2 === false && r.c === true && r.c2 === false && r.f === false
    && r.toast.includes('128') && r.d === true && r.e === false,
    'T1b 附点档位下移+setDur收敛', JSON.stringify(r));

  // T2 拍值与播放时值：beatsOf ×1.75；双附点小节 beatErrors 不误报；measureSeconds 同源
  r = await pg.evaluate(() => {
    const Vc = (deg, dur, dot) => ({dur, dotted:dot||false, deg, acc:'', oct:0, lyrics:[], tie:false});
    const s = createSong('vocal', {beats:4, unit:4, key:'C', nMea:1, nVox:1, lyr:0});
    s.measures[0].voxes[0] = [Vc(1,4,2), Vc(2,16), Vc(3,4), Vc(5,4)];   // 1.75+0.25+1+1=4
    loadSong(s);
    return { b1: beatsOf({dur:4, dotted:2}), b2: beatsOf({dur:8, dotted:2}),
      b3: beatsOf({dur:4, dotted:true}),                                 // 旧数据兼容 ×1.5
      errs: beatErrors().length, secs: measureSeconds(0, 0.5) };
  });
  T(Math.abs(r.b1 - 1.75) < 1e-9 && Math.abs(r.b2 - 0.875) < 1e-9 && Math.abs(r.b3 - 1.5) < 1e-9 &&
    r.errs === 0 && Math.abs(r.secs - 2) < 1e-9,
    'T2 拍值1.75×/旧值1.5×/校验/播放时长', JSON.stringify(r));

  // T3 五线谱渲染：双附点=两点并排（几何：同 y、x 相距 4.6）；单附点仍一点
  r = await pg.evaluate(() => {
    const Vc = (deg, dur, dot) => ({dur, dotted:dot||false, deg, acc:'', oct:0, lyrics:[], tie:false});
    const s = createSong('vocal', {beats:4, unit:4, key:'C', nMea:1, nVox:1, lyr:0});
    s.voxNotations = ['staff'];
    s.measures[0].voxes[0] = [Vc(1,4,2), Vc(2,16), Vc(3,4,true), Vc(5,8)];   // 1.75+0.25+1.5+0.5=4
    loadSong(s); blurSel = true; render();
    const svg = document.getElementById('score').innerHTML;
    const dots = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="1.6"/g)].map(m => ({x:+m[1], y:+m[2]}));
    dots.sort((a,b) => a.x - b.x);
    const pair = dots.length >= 3 ? dots[1].x - dots[0].x : -1;
    const sameY = dots.length >= 2 ? Math.abs(dots[0].y - dots[1].y) < 0.01 : false;
    return { n: dots.length, pair, sameY, nan: /NaN|undefined/.test(svg) };
  });
  T(r.n === 3 && Math.abs(r.pair - 4.6) < 0.1 && r.sameY && !r.nan,
    'T3 五线谱两点几何', '附点圆点数=' + r.n + ' 间距=' + r.pair.toFixed(1) + ' 同高=' + r.sameY);

  // T4 简谱形态：附点二分=2条增时线无圆点；双附点二分=2条增时线+1点；双附点四分=两点；全音符=3条
  r = await pg.evaluate(() => {
    const Vc = (deg, dur, dot) => ({dur, dotted:dot||false, deg, acc:'', oct:0, lyrics:[], tie:false});
    const s = createSong('vocal', {beats:4, unit:4, key:'C', nMea:1, nVox:1, lyr:0});
    const dash = svg => (svg.match(/class="jdash"/g) || []).length;   // v64.8 增时线改几何线段
    const jdot = svg => (svg.match(/r="1\.7"/g) || []).length;
    const probe = cols => {
      song.measures[0].voxes[0] = cols; blurSel = true; render();
      const svg = document.getElementById('score').innerHTML;
      return [dash(svg), jdot(svg)];
    };
    loadSong(s);
    const out = {};
    out.dotHalf  = probe([Vc(1,2,true), Vc(2,4)]);                     // 3拍+1拍：2条增时线、0点
    out.ddHalf   = probe([Vc(1,2,2), Vc(2,8)]);                        // 3.5+0.5：2条增时线+1点
    out.ddQuart  = probe([Vc(1,4,2), Vc(2,16), Vc(3,4), Vc(5,4)]);     // 双附点四分：两点、0条
    out.whole    = probe([Vc(1,1)]);                                   // 全音符：3条、0点（旧形态回归）
    out.dotQuart = probe([Vc(1,4,true), Vc(2,8), Vc(3,4), Vc(5,4)]);   // 单附点四分：1点
    return out;
  });
  T(r.dotHalf.join() === '2,0' && r.ddHalf.join() === '2,1' && r.ddQuart.join() === '0,2' &&
    r.whole.join() === '3,0' && r.dotQuart.join() === '0,1',
    'T4 简谱增时线/附点形态', JSON.stringify(r));

  // T5 MusicXML 往返：双 dot 两枚导出、duration=84(48×1.75)、导入还原 dotted:2/true/false
  r = await pg.evaluate(() => {
    const Vc = (deg, dur, dot) => ({dur, dotted:dot||false, deg, acc:'', oct:0, lyrics:[], tie:false});
    const s = createSong('vocal', {beats:4, unit:4, key:'C', nMea:1, nVox:1, lyr:0});
    s.measures[0].voxes[0] = [Vc(1,4,2), Vc(2,16), Vc(3,4,true), Vc(5,8)];   // 1.75+0.25+1.5+0.5=4
    loadSong(s);
    const xml = exportMusicXML(song);
    const dd = (xml.match(/<dot\/><dot\/>/g) || []).length;
    const singleDot = (xml.match(/<dot\/>/g) || []).length;                  // 2(双)+1(单)=3 枚
    const dur84 = xml.includes('<duration>168</duration>');   /* v52.4 divisions 48→96：双附点四分=96×1.75=168 */
    const r2 = importMusicXML(xml);
    const c = r2.song.measures[0].voxes[0];
    return { dd, singleDot, dur84,
      back: c.map(x => [x.dur, x.dotted === 2 ? 2 : !!x.dotted]),
      err: r2.error || '' };
  });
  T(r.dd === 1 && r.singleDot === 3 && r.dur84 && !r.err &&
    JSON.stringify(r.back) === JSON.stringify([[4,2],[16,false],[4,true],[8,false]]),
    'T5 MusicXML 双dot往返', JSON.stringify(r.back) + ' dur84=' + r.dur84);

  // T6 v53.9 增时线对齐拍点：TAB 八分列使各拍宽度不均，简谱全音符的 3 条横线仍须
  //    与 TAB 第 2/3/4 拍首音符列（品位 13/14/15）严格同 x；附点二分 2 条对齐第 2/3 拍
  r = await pg.evaluate(() => {
    const Vc = (deg, dur, dot) => ({dur, dotted:dot||false, deg, acc:'', oct:0, lyrics:[], tie:false});
    const Tc = f => ({dur:8, dotted:false, chord:'', notes:[{s:3, f}], strum:'', tech:''});
    const s = createSong('guitar', {beats:4, unit:4, key:'C', nMea:1, nTab:1, nVox:1, lyr:0});
    s.measures[0].tabs[0] = [Tc(12),Tc(0),Tc(13),Tc(0),Tc(14),Tc(0),Tc(15),Tc(0)];   // 拍首 12/13/14/15
    s.measures[0].voxes[0] = [Vc(6,1)];                                              // 全音符 → 3 条增时线
    loadSong(s); blurSel = true; render();
    const html = () => document.getElementById('score').innerHTML;
    const dashXs = h => [...h.matchAll(/class="jdash" data-x="([\d.]+)"/g)].map(m => +m[1]);   // v64.8 几何线段中心
    const tabX = (h, f) => { const m = h.match(new RegExp('<text x="([\\d.]+)"[^>]*>' + f + '</text>')); return m ? +m[1] : NaN; };
    let h = html();
    const whole = { d: dashXs(h), t: [tabX(h,13), tabX(h,14), tabX(h,15)] };
    song.measures[0].voxes[0] = [Vc(6,2,true), Vc(5,4)]; render(); h = html();      // 附点二分+四分
    const dotHalf = { d: dashXs(h), t: [tabX(h,13), tabX(h,14)] };
    const near = (a, b) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 0.6);
    return { whole, dotHalf, ok1: near(whole.d, whole.t), ok2: near(dotHalf.d, dotHalf.t) };
  });
  T(r.ok1 && r.ok2, 'T6 增时线对齐拍点(全音符×3+附点二分×2)',
    JSON.stringify(r.whole) + ' ' + JSON.stringify(r.dotHalf));

  // T7 v54.1 行尾空拍增时线不压小节线（用户反馈）：TAB 第4拍无音符列（半音符跨3-4拍）
  //    → 该拍此前塌到 beatFloor(7px)，末条「–」叠上小节线；现占位刚杆撑开+右边界钳制
  r = await pg.evaluate(() => {
    const Vc = (deg, dur) => ({dur, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false});
    const Tc = (f, d) => ({dur:d, dotted:false, chord:'', notes:[{s:3, f}], strum:'', tech:''});
    const s = createSong('guitar', {beats:4, unit:4, key:'C', nMea:1, nTab:1, nVox:1, lyr:0});
    s.measures[0].tabs[0] = [Tc(5,4), Tc(7,4), Tc(9,2)];
    s.measures[0].voxes[0] = [Vc(6,1)];
    loadSong(s); blurSel = true; render();
    const L = measureLayout(song.measures[0]);
    const qx = L.voxes[0].qxs[0];
    const mono = qx.every((v, i) => !i || v > qx[i-1] + 8);       // 三条横线保持间距（空拍被撑开）
    const nDash = (document.getElementById('score').innerHTML.match(/class="jdash"/g) || []).length;
    return { n: qx.length, mono, inside: qx[2] <= L.w - 14, edge: (L.w - qx[2]).toFixed(1), nDash };
  });
  T(r.n === 3 && r.mono && r.inside && r.nDash === 3, 'T7 行尾空拍增时线不压小节线', JSON.stringify(r));

  // T8 v55.1 六弦（最低弦）数字与符杠净距：8分/16分/32分在六弦上时符干区按层数下移，
  //    最上层符杠顶与数字底净距 ≥3px（此前 16 分第二层只差 0.2px 视觉重叠）
  r = await pg.evaluate(() => {
    const mk = (f, st, d) => ({dur: d, dotted: false, chord: '', notes: [{s: st, f}], strum: '', tech: ''});
    const probe = cols => {
      const s = createSong('guitar', {beats: 4, unit: 4, key: 'C', nMea: 1, nTab: 1, nVox: 0, lyr: 0});
      s.measures[0].tabs[0] = cols;
      loadSong(s); blurSel = true; render();
      const svg = document.getElementById('score');
      const tt = [...svg.querySelectorAll('text')].filter(t => t.textContent === '7')[0];
      const bb = tt.getBBox();
      const beams = [...svg.querySelectorAll('rect')]
        .map(el => ({x: +el.getAttribute('x'), y: +el.getAttribute('y'), w: +el.getAttribute('width'), h: +el.getAttribute('height')}))
        .filter(q => q.h > 1 && q.h < 4 && q.w > 8 && q.x < bb.x + bb.width && q.x + q.w > bb.x && q.y > bb.y);
      const top = Math.min(...beams.map(q => q.y));
      return +(top - (bb.y + bb.height)).toFixed(1);
    };
    const g8  = probe([mk(7,6,8), mk(7,6,8), mk(5,5,4), mk(5,5,4), mk(5,5,4)]);
    const g16 = probe([mk(7,6,16), mk(7,6,16), mk(7,6,16), mk(7,6,16), mk(5,5,4), mk(5,5,4), mk(5,5,4)]);
    const g32 = probe([mk(7,6,32), mk(7,6,32), mk(7,6,32), mk(7,6,32), mk(7,6,32), mk(7,6,32), mk(7,6,32), mk(7,6,32),
                       mk(5,5,4), mk(5,5,4), mk(5,5,4)]);
    return { g8, g16, g32 };
  });
  T(r.g8 >= 3 && r.g16 >= 3 && r.g32 >= 3, 'T8 六弦数字与符杠净距≥3px(8/16/32分)', JSON.stringify(r));

  // T9 v56.0 增时线快捷操作（简谱）：D 延长逐级 1→2→3→4 拍吸收休止、上限拒绝、Shift+D 缩短补休止
  r = await pg.evaluate(() => {
    const Vc = (deg, dur) => ({dur: dur||4, dotted:false, deg, acc:'', oct:0, lyrics:[], tie:false});
    const s = createSong('vocal', {beats:4, unit:4, key:'C', nMea:1, nVox:1, lyr:0});
    s.measures[0].voxes[0] = [Vc(5,4), Vc(0,4), Vc(0,4), Vc(0,4)];   // 5 + 三拍休止
    loadSong(s);
    Object.assign(sel, {row:'vox', vi:0, mi:0, ci:0}); selRange = null;
    const cols = () => song.measures[0].voxes[0];
    const st = () => [cols()[0].dur, !!cols()[0].dotted, cols().length].join(',');
    const out = {};
    extendBeat(1); out.b2 = st();               // 2,false,3（吸掉 1 个休止）
    extendBeat(1); out.b3 = st();               // 2,true,2
    extendBeat(1); out.b4 = st();               // 1,false,1（全音符独占小节）
    extendBeat(1); out.cap = st();              // 拒绝：仍 1,false,1
    const dash = (document.getElementById('score').innerHTML.match(/class="jdash"/g)||[]).length;
    out.dash3 = dash;                            // 4 拍=3 条增时线
    extendBeat(-1); out.shrink = st()+';'+(cols()[1] && !cols()[1].deg ? 'rest' : 'x');   // 缩回 3 拍+补休止
    return out;
  });
  T(r.b2 === '2,false,3' && r.b3 === '2,true,2' && r.b4 === '1,false,1' && r.cap === '1,false,1'
    && r.dash3 === 3 && r.shrink === '2,true,2;rest', 'T9 增时线延长/缩短(简谱)', JSON.stringify(r));

  // T10 v56.0 增时线：后面是音符时拒绝；长休止精确缩短；TAB 行同操作生效
  r = await pg.evaluate(() => {
    const Vc = (deg, dur, dotted) => ({dur: dur||4, dotted:!!dotted, deg, acc:'', oct:0, lyrics:[], tie:false});
    const s = createSong('vocal', {beats:4, unit:4, key:'C', nMea:1, nVox:1, lyr:0});
    s.measures[0].voxes[0] = [Vc(5,4), Vc(3,4), Vc(0,2)];            // 5 后面紧跟音符 3
    loadSong(s);
    Object.assign(sel, {row:'vox', vi:0, mi:0, ci:0}); selRange = null;
    const cols = () => song.measures[0].voxes[0];
    const out = {};
    extendBeat(1); out.blocked = cols()[0].dur === 4 && cols().length === 3;   // 拒绝不动
    sel.ci = 1; extendBeat(1);                                       // 音符3 吸收 2 拍休止的 1 拍
    out.partial = [cols()[1].dur, cols()[2].dur].join(',');          // 2,4（休止 2拍→1拍）
    /* TAB 行 */
    const s2 = createSong('guitar', {beats:4, unit:4, key:'C', nMea:1, nTab:1, nVox:1, lyr:0});
    s2.measures[0].tabs[0] = [
      {dur:4, dotted:false, notes:[{s:1,f:3}]},
      {dur:4, dotted:false, notes:[]}, {dur:4, dotted:false, notes:[]}, {dur:4, dotted:false, notes:[]}];
    loadSong(s2);
    Object.assign(sel, {row:'tab', vi:0, mi:0, ci:0, si:1}); selRange = null;
    extendBeat(1); extendBeat(1);
    const tc = song.measures[0].tabs[0];
    out.tab = [tc[0].dur, !!tc[0].dotted, tc.length].join(',');      // 2,true,2
    return out;
  });
  T(r.blocked === true && r.partial === '2,4' && r.tab === '2,true,2', 'T10 增时线(拒绝/精确缩短/TAB同步)', JSON.stringify(r));

  /* T11 v57.4 TAB 二分/全音符增时线（用户反馈：TAB 二分与四分只有一根符干无法区分）：
     节奏梁位短横线 rect（w9 h2.2）条数=整拍数−1：二分1条、附点二分2条（附点并入横线不画点）、
     全音符3条且无符干；四分对照 0 条；拍点 x 与简谱 qxs 同源（此处只断言条数与几何） */
  r = await pg.evaluate(() => {
    const Tc = (ext) => Object.assign({dur:4, dotted:false, chord:'', notes:[], strum:'', tech:''}, ext);
    const s = createSong('guitar', {beats:4, unit:4, key:'C', nMea:3, nTab:1, nVox:0, lyr:0});
    s.measures[0].tabs[0] = [Tc({dur:4, notes:[{s:2,f:1}]}), Tc({dur:2, notes:[{s:1,f:0}]}), Tc({dur:4, notes:[]})];
    s.measures[1].tabs[0] = [Tc({dur:2, dotted:true, notes:[{s:2,f:1}]}), Tc({dur:4, notes:[{s:1,f:0}]})];
    s.measures[2].tabs[0] = [Tc({dur:1, notes:[{s:3,f:0}]})];
    loadSong(s); blurSel = true; render();
    const dashEls = [...document.querySelectorAll('#score rect')]
      .filter(el => el.getAttribute('width') === '9' && el.getAttribute('height') === '1.9');
    const dashes = dashEls.map(el => +el.getAttribute('x')).sort((a,b2)=>a-b2);
    /* v57.6 增时线固定在六线谱垂直居中（用户指示：不随音符弦位变动）：
       每条短横中心 y == 弦线带中点（三、四弦之间空隙），且所有短横同一 y */
    const strY = [...document.querySelectorAll('#score line')]
      .filter(l2 => l2.getAttribute('stroke-width') === '0.6' && l2.getAttribute('y1') === l2.getAttribute('y2'))
      .map(l2 => +l2.getAttribute('y1'));
    const midY = (Math.min(...strY) + Math.max(...strY)) / 2;
    const dashYs = new Set(dashEls.map(el => (+el.getAttribute('y') + 0.95).toFixed(1)));
    const onString = dashYs.size === 1 && dashEls.every(el => Math.abs((+el.getAttribute('y') + 0.95) - midY) < 0.7);
    const dots = [...document.querySelectorAll('#score circle')].filter(c2 => c2.getAttribute('r') === '1.6');
    const vl = [...document.querySelectorAll('#score line')].filter(l2 =>
      l2.getAttribute('stroke-width') === '0.85' && l2.getAttribute('x1') === l2.getAttribute('x2'));
    const maxY2 = Math.max(...vl.map(l2 => +l2.getAttribute('y2')));
    const stems = vl.filter(l2 => Math.abs(+l2.getAttribute('y2') - maxY2) < 0.5);   /* 符干统一延到节奏梁位 stemY=全谱最深竖线终点 */
    return { nDash: dashes.length, ascending: dashes.every((v,i,a)=>!i||v>a[i-1]),
      noDot: dots.length === 0, nStem: stems.length, onString };
  });
  /* 符干数几经变化，如实跟随产品口径：v60.60 之前 4 → v60.60「休止也要时值线」5 →
     v60.63「单独占一拍的休止不要时值线」回到 4（m0 第三列那个空列独占一拍，符干又不画了；
     2 音符干 + m1 两条 = 4）。m2 的全音符仍无符干（dur=1 < 2，本项原意保持）。 */
  T(r.nDash === 6 && r.ascending && r.noDot && r.nStem === 4 && r.onString,
    'T11 TAB增时线：二分1+附点二分2+全音符3条·附点不画点·全音符无干·横线压弦线', JSON.stringify(r));

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
