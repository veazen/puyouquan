/* v57.1 弹唱「和弦隐含音」回归：× = 教材式和弦内音（按指法实音化）+ 扫弦/琶音箭头按指法补全
   用户反馈（女儿国）：G 和弦 1 弦 × 应为 3 品实音（关联五线谱显示实音高）；单音下琶音应发整个和弦。
   覆盖：chordImpliedNotes 单元语义（含哑音保留场景）、联排五线谱几何（实音符头对齐/琶音六符头柱式）、
   MIDI/MusicXML 导出随动、节奏型库切音列 mute 标记与切音点、光标卡文案 */
const { chromium } = require('playwright');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });
  let pass = 0, total = 0;
  const T = (ok, name, detail) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ': ' + detail : '')); };

  /* 测试谱：弹唱（guitar，nVox=1 非独奏）+ 联排；M0=×实音化、M1=下琶音补全、M2=切音列、M3=拍弦列 */
  const buildSong = `
    const Tc = (ext) => Object.assign({dur:4, dotted:false, chord:'', notes:[], strum:'', tech:''}, ext);
    const s = createSong('guitar', {title:'xt', beats:4, unit:4, key:'G', nMea:4, nTab:1, nVox:1, lyr:0});
    s.tabStaff = true;
    s.measures[0].tabs[0] = [
      Tc({dur:8, chord:'G', notes:[{s:1, f:0, x:true}]}),          // × @1弦：应解析为 3 品 G
      Tc({dur:8, notes:[{s:1, f:3}]}),                             // 真实 1弦3品（同音参照）
      Tc({dur:4, notes:[{s:2, f:0, x:true}]}),                     // × @2弦：应解析为 0 品 B
      Tc({dur:4, notes:[]}), Tc({dur:4, notes:[]})
    ];
    s.measures[0].voxes[0] = [0,1,2,3].map(()=>({dur:4, dotted:false, deg:1, acc:'', oct:0, lyrics:[], tie:false}));
    s.measures[1].tabs[0] = [
      Tc({dur:2, notes:[{s:1, f:3}], strum:'arpd', strumTop:1, strumBot:6}),   // 单音下琶音：应补全 G 和弦 6 音
      Tc({dur:2, notes:[]})
    ];
    s.measures[2].tabs[0] = [                                       // 节奏型库切音列（mute 标记）：保持哑音
      Tc({dur:4, mute:true, notes:[{s:6,f:0,x:true},{s:5,f:0,x:true},{s:4,f:0,x:true}]}),
      Tc({dur:4, notes:[]}), Tc({dur:4, notes:[]}), Tc({dur:4, notes:[]})
    ];
    s.measures[3].tabs[0] = [                                       // 拍弦列：保持哑音
      Tc({dur:4, slap:true, notes:[{s:5, f:0, x:true}]}),
      Tc({dur:4, notes:[]}), Tc({dur:4, notes:[]}), Tc({dur:4, notes:[]})
    ];
    loadSong(s);`;

  // T1 chordImpliedNotes 单元语义：×实音化 + 哑音保留场景（mute/slap/扫弦内×/独奏/指法x弦）
  let r = await pg.evaluate((code) => {
    eval(code); const G = chordShape('G');
    const one = (col) => chordImpliedNotes(col, G, false);
    const o = {};
    o.x1 = one({notes:[{s:1,f:0,x:true}]});                             // → 3品实音
    o.x4 = one({notes:[{s:4,f:0,x:true}]});                             // → 0品实音（空弦和弦内音）
    o.keepMute = one({mute:true,  notes:[{s:6,f:0,x:true}]})[0].x === true;
    o.keepSlap = one({slap:true,  notes:[{s:5,f:0,x:true}]})[0].x === true;
    o.keepStrumX = one({strum:'d', strumTop:1, strumBot:6, notes:[{s:1,f:0,x:true}]}).find(n=>n.s===1).x === true;
    o.keepSolo = chordImpliedNotes({notes:[{s:1,f:0,x:true}]}, G, true)[0].x === true;
    o.keepXStr = chordImpliedNotes({notes:[{s:6,f:0,x:true}]}, chordShape('D'), false)[0].x === true;   // D 指法 6 弦=x（不发声弦）→ 保持哑音
    o.dataIntact = (()=>{ const c={notes:[{s:1,f:0,x:true}]}; one(c); return c.notes[0].x===true && c.notes[0].f===0; })();  // 发声视角不改数据
    return o;
  }, buildSong);
  T(r.x1.length===1 && r.x1[0].f===3 && !r.x1[0].x && r.x4[0].f===0 && !r.x4[0].x,
    'T1a ×实音化：G和弦 1弦×→3品 / 4弦×→0品', JSON.stringify([r.x1, r.x4]));
  T(r.keepMute && r.keepSlap && r.keepStrumX && r.keepSolo && r.keepXStr && r.dataIntact,
    'T1b 哑音保留：切音/拍弦/扫弦内×/独奏/指法x弦 + 不改原数据', JSON.stringify(r));

  // T2 琶音/扫弦补全单元：单音下琶音 → 六音全和弦（品位按 320003）
  r = await pg.evaluate((code) => {
    eval(code); const G = chordShape('G');
    const got = chordImpliedNotes(song.measures[1].tabs[0][0], G, false)
      .sort((a,b2)=>a.s-b2.s).map(n=>n.s+':'+n.f).join(',');
    const partial = chordImpliedNotes({strum:'arp', strumTop:1, strumBot:3, notes:[]}, G, false)
      .sort((a,b2)=>a.s-b2.s).map(n=>n.s+':'+n.f).join(',');
    return {got, partial};
  }, buildSong);
  T(r.got==='1:3,2:0,3:0,4:0,5:2,6:3', 'T2a 下琶音单音列补全为 G 和弦六音', r.got);
  T(r.partial==='1:3,2:0,3:0', 'T2b 箭头只跨 1–3 弦时仅补三音', r.partial);

  // T3 联排五线谱几何：×列实音符头与真实 1弦3品 符头 y 相等；琶音列 6 个二分符头（不同 y 柱式）；
  //    切音/拍弦列保持 × 叉头（stroke-width 1.3 的双线叉）
  r = await pg.evaluate((code) => {
    eval(code); blurSel = true; render();
    const tOf = p2 => { const m = /translate\((-?[\d.]+),(-?[\d.]+)\)/.exec(p2.getAttribute('transform')); return {x:+m[1], y:+m[2]}; };
    const glyph = d => [...document.querySelectorAll('#score path')].filter(p2 => p2.getAttribute('d') === d).map(tOf);
    const black = glyph(SMUFL.noteheadBlack.d).sort((a,b2)=>a.x-b2.x);
    const half  = glyph(SMUFL.noteheadHalf.d).sort((a,b2)=>a.y-b2.y);
    const cross = [...document.querySelectorAll('#score path')]
      .filter(p2 => (p2.getAttribute('stroke-width')==='1.3') && /^M .+ L .+ M .+ L /.test(p2.getAttribute('d')||''));
    const svg = document.getElementById('score').innerHTML;
    return { nBlack: black.length, yEq: black.length>=2 && Math.abs(black[0].y-black[1].y)<0.01,
      nHalf: half.length, halfYs: new Set(half.map(h=>h.y.toFixed(1))).size,
      nCross: cross.length, bad: /NaN|undefined/.test(svg) };
  }, buildSong);
  T(r.nBlack===3 && r.yEq, 'T3a ×列实音符头与真实3品符头同高（几何相等）', 'black=' + r.nBlack + ' yEq=' + r.yEq);
  T(r.nHalf===6 && r.halfYs===6, 'T3b 琶音列联排显示 6 个二分符头柱式', 'half=' + r.nHalf + '/' + r.halfYs);
  T(r.nCross===4 && !r.bad, 'T3c 切音3×+拍弦1× 保持叉头（共4）且无 NaN', 'cross=' + r.nCross);

  // T4 MIDI 导出随动：×实音与琶音补全发音，切音/拍弦仍跳过（skipped=4）；note-on 总数=13
  r = await pg.evaluate((code) => {
    eval(code);
    const out = exportMIDI(song);
    const by = out.bytes; let i = 14, ons = 0;   // MThd(14) 后逐轨解析（生成器不用 running status）
    const vlen = () => { let v=0; for(;;){ const c=by[i++]; v=(v<<7)|(c&127); if(!(c&128)) return v; } };
    while (i < by.length) {
      i += 4; let len=0; for(let k2=0;k2<4;k2++) len=(len<<8)|by[i++];
      const end=i+len;
      while (i<end) { vlen(); const st=by[i++];
        if(st===0xFF){ i++; const l2=vlen(); i+=l2; }
        else if((st&0xF0)===0xC0 || (st&0xF0)===0xD0){ i++; }
        else { const d1=by[i++], d2=by[i++]; if((st&0xF0)===0x90 && d2>0) ons++; }
      }
      i=end;
    }
    return { skipped: out.skipped, ons };
  }, buildSong);
  T(r.skipped===4 && r.ons===13, 'T4 MIDI：skipped=4（切音3+拍弦1）且 note-on=13（vox4+×实音3+琶音6）', JSON.stringify(r));

  // T5 MusicXML 导出随动：notehead x 只剩 4 个（切音3+拍弦1）；1弦3品出现≥2 次；<chord/>=7（琶音5+切音2）
  r = await pg.evaluate((code) => {
    eval(code);
    const xml = exportMusicXML(song);
    const cnt = (re) => (xml.match(re)||[]).length;
    return { nx: cnt(/<notehead>x<\/notehead>/g),
      s1f3: cnt(/<string>1<\/string><fret>3<\/fret>/g),
      chords: cnt(/<chord\/>/g) };
  }, buildSong);
  T(r.nx===4 && r.s1f3>=2 && r.chords===7, 'T5 MusicXML：notehead x=4 · 1弦3品≥2 · chord=7', JSON.stringify(r));

  // T6 节奏型库切音 token：evToCol 打 mute 标记；TAB 切音列 × 上方有切音点（r=1.7）
  r = await pg.evaluate((code) => {
    eval(code);
    const cx = evToCol(['x',4,0], '320003');
    const ca = evToCol(['a',2,0], '320003');
    blurSel = true; render();
    const dots = [...document.querySelectorAll('#score circle')].filter(c2 => c2.getAttribute('r')==='1.7');
    return { mute: cx.mute===true && cx.notes.length===3 && cx.notes.every(n=>n.x),
      arp: ca.strum==='arp' && !ca.mute && ca.notes.length===6, nDot: dots.length };
  }, buildSong);
  T(r.mute && r.arp && r.nDot>=1, 'T6 切音列 mute 标记 + TAB 切音点', JSON.stringify(r));

  // T8 v57.9 TAB 显示严格跟随输入：教材式下输入 0/3（指法内品位）显示数字不再自动记 ×；
  //    全数字模式下 × 显示解析品位（数据不变）
  r = await pg.evaluate(() => {
    const Tc = (ext) => Object.assign({dur:4, dotted:false, chord:'', notes:[], strum:'', tech:''}, ext);
    const s = createSong('guitar', {title:'xd', beats:4, unit:4, key:'G', nMea:1, nTab:1, nVox:1, lyr:0});
    s.measures[0].tabs[0] = [
      Tc({chord:'G', notes:[{s:1, f:3}]}),        // 显式 3 品（=指法音，旧逻辑会显示 ×）
      Tc({notes:[{s:3, f:0}]}),                   // 显式 0 品（用户反馈场景）
      Tc({notes:[{s:1, f:0, x:true}]}),           // × 输入
      Tc({notes:[]})
    ];
    loadSong(s); blurSel = true; render();
    const digits = () => [...document.querySelectorAll('#score text')]
      .filter(t2 => t2.getAttribute('font-size')==='10.5' && /^\d+$/.test(t2.textContent)).map(t2=>t2.textContent);
    const xs = () => [...document.querySelectorAll('#score text')]
      .filter(t2 => t2.getAttribute('font-size')==='15' && t2.textContent==='×').length;
    const eduD = digits().sort().join(','), eduX = xs();
    tabNotation='num'; render();
    const numD = digits().sort().join(','), numX = xs();
    tabNotation='x'; render();
    return { eduD, eduX, numD, numX };
  });
  T(r.eduD==='0,3' && r.eduX===1 && r.numD==='0,3,3' && r.numX===0,
    'T8 输入0/3显示数字·×按输入显示·全数字模式×→解析品位', JSON.stringify(r));

  // T7 光标卡：弹唱 × 显示「和弦内音（1弦3品）」；切音列 × 仍显示「闷音」
  r = await pg.evaluate((code) => {
    eval(code);
    sel = { row:'tab', vi:0, mi:0, ci:0, si:1 }; barSel=null; selRange=null; noteSel=[]; syncInputs();
    const t1 = document.getElementById('cursor-info').textContent;
    sel = { row:'tab', vi:0, mi:2, ci:0, si:6 }; syncInputs();
    const t2 = document.getElementById('cursor-info').textContent;
    return { tone: /× 和弦内音（1弦3品）/.test(t1), mute: /× 闷音/.test(t2) };
  }, buildSong);
  T(r.tone && r.mute, 'T7 光标卡：和弦内音（1弦3品）/ 闷音区分', JSON.stringify(r));

  console.log(`\ntv_xtone: ${pass}/${total} 通过` + (errs.length ? '\n' + errs.join('\n') : ''));
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
