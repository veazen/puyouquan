/* v63.8 B5 TAB 变调正确性（2026-10 评审团 §6.3 B5 ①–④：P1-23）
   T1 唱高 2 度（+1 +1）再夹 2 品：与原谱逐音相同（JSON 全等），1=C · 夹 2
   T2 手动反向变调零损失：+3 −3；关弹窗再开 +2、再开 −2；顶栏 ♯ ♭——都回到原谱
   T3 撤销后接着按净量算：+2 +2 撤销 −2 → 原谱；中途手改过的音不被回滚（以当前谱重立基准）
   T4 伴奏锁定低音：C→G 低音不再落成 B（G/B），从低音扫起的柱式改从 6 弦扫；F/A→C/E 斜杠低音落到 E（此前落成 C）
   T5 跨列技法：跨弦击弦、空弦滑音挪回同一根弦，tk.si 指向目标音所在弦，音高＝原音高＋移调量
   T6 哪根弦都放不下（6 弦 1→3 品滑音降半音成空弦滑音）：如实提示「1 处技法失效」
   突变实证：对 v63.8 之前的文件复跑，T1–T6 全部报红（0/6）。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = (process.env.MUSETAB_URL || '').startsWith('file://') ? process.env.MUSETAB_URL.slice(7) : path.resolve(__dirname, '../index.html');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR:' + e.message));
  await pg.goto('file://' + FILE); await pg.waitForTimeout(1000);
  await pg.evaluate(`(()=>{ guardReplace=(p)=>p(); hideStartPad(); window.__toasts=[]; const ot=toast; toast=(m)=>{ __toasts.push(String(m)); try{ ot(m); }catch(_){} };
    window.TC=(o)=>Object.assign({dur:4,dotted:false,chord:'',notes:[],strum:'',tech:''},o||{});
    window.N=(s,f,o)=>Object.assign({s,f},o||{});
    window.popOn=()=>{ const p=document.getElementById('ekey-pop'); if(p) p.classList.remove('on'); openEdKeyPop(); };
    window.popOff=()=>{ const p=document.getElementById('ekey-pop'); if(p) p.classList.remove('on'); };
    window.mkGuitar=()=>{ const s=createSong('guitar',{title:'变调',key:'C',beats:4,unit:4,nMea:3,nTab:1,nVox:0,lyr:0});
      s.measures[0].tabs[0]=[TC({chord:'C',notes:[N(5,3)]}),TC({notes:[N(3,0)]}),TC({notes:[N(2,1)]}),TC({strum:'d',notes:[N(5,3),N(4,2),N(3,0),N(2,1),N(1,0)]})];
      s.measures[1].tabs[0]=[TC({chord:'G',notes:[N(6,3)]}),TC({notes:[N(4,0)]}),TC({notes:[N(3,0)]}),TC({notes:[N(1,3)]})];
      s.measures[2].tabs[0]=[TC({notes:[N(3,7)]}),TC({notes:[N(2,8)]}),TC({notes:[N(1,5)]}),TC({notes:[N(3,9)]})];
      return s; };
  })()`);
  let pass = 0, total = 0;
  const T = (ok, name, d) => { total++; if (ok) pass++; console.log((ok ? '✅' : '❌') + ' ' + name + (d ? ': ' + d : '')); };
  const EV = s => pg.evaluate(s).catch(e => ({ err: e.message }));

  /* T1 */
  let r = await EV(`(()=>{ loadSong(mkGuitar()); undoStack.length=0; const o=JSON.stringify(song.measures);
    popOn(); edTranspose(1); edTranspose(1); const mid=song.key; edSetCapo(2);
    return {same:JSON.stringify(song.measures)===o, key:song.key, capo:song.capo, mid}; })()`);
  T(r.same && r.key === 'C' && r.capo === 2 && r.mid === 'D', 'T1 唱高 2 度再夹 2 品：与原谱逐音相同', JSON.stringify(r));

  /* T2 */
  r = await EV(`(()=>{ loadSong(mkGuitar()); const o=JSON.stringify(song.measures); const out={};
    popOn(); edTranspose(3); edTranspose(-3); out.a=JSON.stringify(song.measures)===o && song.key==='C';
    popOff(); popOn(); edTranspose(2); out.k2=song.key; popOff(); popOn(); edTranspose(-2); popOff();
    out.b=JSON.stringify(song.measures)===o && song.key==='C';
    stepKey(1); stepKey(1); stepKey(-1); stepKey(-1); out.c=JSON.stringify(song.measures)===o && song.key==='C';
    return out; })()`);
  T(r.a && r.b && r.c && r.k2 === 'D', 'T2 手动反向变调零损失（弹窗内、跨弹窗、顶栏）', JSON.stringify(r));

  /* T3 */
  r = await EV(`(()=>{ loadSong(mkGuitar()); undoStack.length=0; const o=JSON.stringify(song.measures); const out={};
    popOn(); edTranspose(2); edTranspose(2); undo(); out.k=song.key; edTranspose(-2); out.a=JSON.stringify(song.measures)===o && song.key==='C';
    /* 中途手改：+2 → 把第 3 小节第 1 个音升一品 → −2：这一品的改动必须还在 */
    const tun=tuningOf(); const P=n=>tun[n.s-1]+n.f;
    edTranspose(2); const n0=song.measures[2].tabs[0][0].notes[0]; const p0=P(n0);
    mutate(()=>{ song.measures[2].tabs[0][0].notes[0].f+=1; });
    edTranspose(-2); const n1=song.measures[2].tabs[0][0].notes[0];
    out.p=[p0, P(n1)]; out.keep = P(n1)===p0+1-2; out.key=song.key; popOff();
    return out; })()`);
  T(r.a && r.k === 'D' && r.keep && r.key === 'C', 'T3 撤销后按净量接着算；手改过的音不被回滚', JSON.stringify(r));

  /* T4 */
  r = await EV(`(()=>{ const s=createSong('guitar',{title:'低音',key:'C',beats:4,unit:4,nMea:2,nTab:1,nVox:0,lyr:0});
    s.measures[0].tabs[0]=[TC({chord:'C',notes:[N(5,3)]}),TC({notes:[N(4,2)]}),TC({strum:'d',notes:[N(5,3),N(4,2),N(3,0),N(2,1),N(1,0)]}),TC({notes:[N(2,1)]})];
    s.measures[1].tabs[0]=[TC({chord:'F/A',notes:[N(5,0)]}),TC({notes:[N(4,3)]}),TC({notes:[N(3,2)]}),TC({notes:[N(1,1)]})];
    loadSong(s); popOn(); edTranspose(7); popOff();
    const tun=tuningOf(); const pc=n=>(tun[n.s-1]+n.f)%12; const m0=song.measures[0].tabs[0], m1=song.measures[1].tabs[0];
    return {key:song.key, bass:m0[0].notes.map(n=>n.s+':'+n.f).join(','), bassPc:pc(m0[0].notes[0]),
      strum:m0[2].notes.map(n=>n.s+':'+n.f).join(','), alt:m0[1].notes.map(n=>n.s+':'+n.f).join(','),
      ch1:m1[0].chord, slash:m1[0].notes.map(n=>n.s+':'+n.f).join(','), slashPc:pc(m1[0].notes[0])}; })()`);
  T(r.key === 'G' && r.bassPc === 7 && r.bass === '6:3' && r.strum === '1:3,2:0,3:0,4:0,5:2,6:3' && r.alt === '4:0'
    && r.ch1 === 'C/E' && r.slashPc === 4, 'T4 伴奏锁定根音/斜杠低音（C→G 不再成 G/B）', JSON.stringify(r));

  /* T5 */
  r = await EV(`(()=>{ const s=createSong('solo',{title:'技法',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0});
    s.measures[0].tabs[0]=[TC({notes:[N(3,2,{tech:'h',tk:{mi:0,ci:1,si:3}})]}),TC({notes:[N(3,4)]}),
      TC({notes:[N(3,4,{tech:'sl',tk:{mi:0,ci:3,si:3}})]}),TC({notes:[N(3,2)]})];
    loadSong(s); const tun=tuningOf(); const P=n=>tun[n.s-1]+n.f;
    const p0=song.measures[0].tabs[0].map(c=>P(c.notes[0]));
    popOn(); edTranspose(5); popOff();
    const cs=song.measures[0].tabs[0]; const nn=cs.map(c=>c.notes[0]);
    const link=(a,t)=>{ const n=nn[a], tg=nn[t]; return {ok:n.s===tg.s && n.tk && n.tk.si===tg.s && n.tk.ci===t, s:n.s+'/'+tg.s, f:n.f+'/'+tg.f, si:n.tk&&n.tk.si}; };
    return {h:link(0,1), sl:link(2,3), slF:nn[2].f>=1 && nn[3].f>=1, pitch:nn.every((n,i)=>P(n)===p0[i]+5), tech:nn[0].tech+nn[2].tech}; })()`);
  T(r.h && r.h.ok && r.sl && r.sl.ok && r.slF && r.pitch && r.tech === 'hsl', 'T5 跨弦击弦/空弦滑音挪回同弦，tk.si 重连，音高正确', JSON.stringify(r));

  /* T6 */
  r = await EV(`(()=>{ const s=createSong('solo',{title:'失效',key:'C',beats:4,unit:4,nMea:1,nTab:1,nVox:0,lyr:0});
    s.measures[0].tabs[0]=[TC({notes:[N(6,1,{tech:'sl',tk:{mi:0,ci:1,si:6}})]}),TC({notes:[N(6,3)]}),TC({notes:[]}),TC({notes:[]})];
    loadSong(s); __toasts.length=0; popOn(); edTranspose(-1); popOff();
    const nn=song.measures[0].tabs[0].map(c=>c.notes[0]);
    return {msg:__toasts.join('|'), si:nn[0].tk&&nn[0].tk.si, s:nn[0].s+'/'+nn[1].s, f:nn[0].f+'/'+nn[1].f}; })()`);
  T(/1 处技法失效/.test(r.msg || '') && r.si === 6, 'T6 放不下的技法如实提示「1 处技法失效」', JSON.stringify(r));

  console.log(`PASS ${pass}/${total}`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exit(pass === total && !errs.length ? 0 : 1);
})();
