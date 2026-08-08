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
    const dash = svg => (svg.match(/>–<\/text>/g) || []).length;
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

  console.log('PASS ' + pass + '/' + total);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
