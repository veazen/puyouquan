const { chromium } = require('playwright');
/* v69.0 S2 有意迁移（规格 f90 §8.4）：新外壳下两个配谱弹窗改成主按钮直接执行——本套件测的是弹窗路径，改跑 ?next=0（只对本次访问回到 v68.9 形态，弹窗一字不动）；新路径的等价在 tv_next N2 */
const F0=process.env.MUSETAB_URL || 'file://'+require('path').resolve(__dirname,'../index.html');
const F=(()=>{ const i=F0.indexOf('#'), b=i>=0? F0.slice(0,i) : F0, h=i>=0? F0.slice(i) : ''; return b+(b.includes('?')? '&' : '?')+'next=0'+h; })();
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR:'+e.message)); pg.on('console',m=>{if(m.type()==='error'&&!/sounds|CORS|Failed to load|TUNNEL/.test(m.text()))errs.push('CONSOLE:'+m.text());});
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });   // v41.5 单窗口化：测试内直通未保存确认对话（tv_safety 专测该对话）
  let pass=0;
  const MEL=`
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('vocal',{nVox:1,lyr:1,beats:4,unit:4,key:'C',nMea:4,title:'小曲'});
    s.measures[0].voxes[0]=[V(1,4,{lyrics:['一']}),V(3,4,{lyrics:['二']}),V(5,4),V(3,4)];
    s.measures[1].voxes[0]=[V(4,4),V(6,4),V(1,4,{oct:1}),V(6,4)];
    s.measures[2].voxes[0]=[V(5,4),V(7,4),V(2,4,{oct:1}),V(7,4)];
    s.measures[3].voxes[0]=[V(1,4),V(1,4),V(1,2)];`;
  // T1 默认产出：教学对照谱 + 双手伴奏（旋律/歌词保留）
  const t1 = await pg.evaluate(`(()=>{ ${MEL}
    const before=JSON.stringify(s);
    const r=arrangeAccompaniment(s,{texId:'slow'});
    const o=r.song;
    loadSong(o);
    const h=document.getElementById('score').innerHTML;
    return { pure:JSON.stringify(s)===before,
      voices:o.voxVoices.join(','), nota:(o.voxNotations||[]).join(','), dual:(o.voxDual||[])[0],
      type:docType(o), chords:o.measures.map(m=>m.voxes[0][0].chord||'-').join(' '),
      melKept:o.measures[0].voxes[0][0].deg===1 && (o.measures[0].voxes[0][0].lyrics||[])[0]==='一',
      rhNotes:o.measures[0].voxes[1].filter(c=>c.deg).length,
      lhNotes:o.measures[0].voxes[2].filter(c=>c.deg).length,
      done:r.gen.done, renderOK:h.length>1000 && !h.includes('NaN') };
  })()`);
  const ok1 = t1.pure && t1.voices==='旋律,右手伴奏,左手伴奏' && t1.nota==='staff,staff,bass' && t1.dual===true
    && t1.type==='teach' && t1.chords==='C F G C' && t1.melKept && t1.rhNotes===8 && t1.lhNotes===2
    && t1.done===4 && t1.renderOK;
  console.log((ok1?'✅':'❌')+' T1 教学对照产出: 原谱未动='+t1.pure+' 声部='+t1.voices+' 记谱='+t1.nota+' dual='+t1.dual+' type='+t1.type+' 和弦='+t1.chords+' 旋律歌词保留='+t1.melKept+' 右手音='+t1.rhNotes+'/8 左手音='+t1.lhNotes+'/2 渲染='+t1.renderOK);
  if(ok1) pass++;
  // T2 纯伴奏产出
  const t2 = await pg.evaluate(`(()=>{ ${MEL}
    const r=arrangeAccompaniment(s,{texId:'block', pure:true});
    const o=r.song; loadSong(o);
    return { type:docType(o), acc:!!o.pianoAcc, voices:o.voxVoices.join(','),
      chordOnRH:o.measures.map(m=>m.voxes[0].some(c=>c.chord)).every(Boolean),
      firstChord:o.measures[0].voxes[0][0].chord,
      rhAdds:(o.measures[0].voxes[0][0].adds||[]).length,
      noMelody:o.voxVoices.length===2 };
  })()`);
  const ok2 = t2.type==='pianoacc' && t2.acc && t2.voices==='右手,左手' && t2.chordOnRH && t2.firstChord==='C' && t2.rhAdds===2 && t2.noMelody;
  console.log((ok2?'✅':'❌')+' T2 纯伴奏产出: type='+t2.type+' pianoAcc='+t2.acc+' 声部='+t2.voices+' 和弦回填='+t2.chordOnRH+'('+t2.firstChord+') 柱式adds='+t2.rhAdds);
  if(ok2) pass++;
  // T3 换调联动：生成后 C→D，和弦整体移调
  const t3 = await pg.evaluate(`(()=>{ ${MEL}
    const r=arrangeAccompaniment(s,{texId:'slow'});
    loadSong(r.song);
    document.getElementById('b-meta').click();
    document.getElementById('mm-key').value='D';
    document.getElementById('mm-ok').click();
    return { key:song.key, chords:song.measures.map(m=>m.voxes[0][0].chord||'-').join(' ') };
  })()`);
  const ok3 = t3.key==='D' && t3.chords==='D G A D';
  console.log((ok3?'✅':'❌')+' T3 换调联动: 1=D 和弦='+t3.chords+'(期望 D G A D)');
  if(ok3) pass++;
  // T4 已填和弦不被建议覆盖（suggest 尊重）
  const t4 = await pg.evaluate(`(()=>{ ${MEL}
    s.measures[1].voxes[0][0].chord='Dm7';
    const r=arrangeAccompaniment(s,{texId:'slow'});
    return { m1:r.song.measures[1].voxes[0][0].chord };
  })()`);
  console.log((t4.m1==='Dm7'?'✅':'❌')+' T4 已填和弦保留: '+t4.m1+'(期望 Dm7)');
  if(t4.m1==='Dm7') pass++;
  // T5 入口显隐 + 弹窗
  const t5 = await pg.evaluate(`(()=>{ ${MEL}
    loadSong(s);
    const vis1=document.getElementById('b-arrange').style.display!=='none';
    document.getElementById('b-arrange').click();
    // v60.19：4/4 织体 9→15 套（依 POP909 统计新增 6 套）。改为「与 PIANO_TEX 里 4/4 的条数一致」，
    // 而不是钉死数字——以后增删织体这条仍有效，且能抓住「弹窗漏渲染某个难度组」的回退（本版就踩到过）。
    const want44=PIANO_TEX.filter(t=>t.beats===4).length;
    const got44=document.querySelectorAll('input[name="arr-tex"]').length;
    const modal=!!document.getElementById('arr-go') && got44===want44 && want44>=15;
    document.getElementById('arr-cancel').click();
    const p2=createSong('pianoacc',{lyr:0,beats:4,unit:4,key:'C',nMea:1}); loadSong(p2);
    const vis2=document.getElementById('b-arrange').style.display==='none';
    return {vis1, modal, vis2};
  })()`);
  const ok5 = t5.vis1 && t5.modal && t5.vis2;
  console.log((ok5?'✅':'❌')+' T5 入口: 歌谱可见='+t5.vis1+' 弹窗织体数与库一致='+t5.modal+' 钢琴弹唱谱隐藏='+t5.vis2);
  if(ok5) pass++;
  // T6 v44.9 属七终止：旋律含 b7(级数4) 的属和弦小节 → V7（G7），末小节回 I
  const t6 = await pg.evaluate(`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('vocal',{nVox:1,lyr:0,beats:4,unit:4,key:'C',nMea:4});
    s.measures[0].voxes[0]=[V(1,4),V(3,4),V(5,4),V(3,4)];
    s.measures[1].voxes[0]=[V(4,4),V(6,4),V(1,4,{oct:1}),V(6,4)];
    s.measures[2].voxes[0]=[V(5,4),V(7,4),V(2,4,{oct:1}),V(4,4,{oct:1})];
    s.measures[3].voxes[0]=[V(1,4),V(1,4),V(1,2)];
    return suggestChords(s,0).join(' ');
  })()`);
  const ok6 = t6==='C F G7 C';
  console.log((ok6?'✅':'❌')+' T6 属七终止: '+t6+'(期望 C F G7 C)');
  if(ok6) pass++;
  // T7 v44.9 功能进行连贯：全局 Viterbi 产出合法功能进行（无 D→S 逆行）
  const t7 = await pg.evaluate(`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('vocal',{nVox:1,lyr:0,beats:4,unit:4,key:'C',nMea:5});
    s.measures[0].voxes[0]=[V(1,4),V(3,4),V(5,4),V(1,4)];
    s.measures[1].voxes[0]=[V(3,4),V(1,4),V(6,4),V(1,4)];
    s.measures[2].voxes[0]=[V(4,4),V(6,4),V(2,4,{oct:1}),V(4,4)];
    s.measures[3].voxes[0]=[V(5,4),V(2,4,{oct:1}),V(7,4),V(5,4)];
    s.measures[4].voxes[0]=[V(1,4),V(3,4),V(1,2)];
    const ch=suggestChords(s,0);
    const FN={C:'T',Am:'T',Em:'T',F:'S',Dm:'S',G:'D',G7:'D'};
    const fns=ch.map(c=>FN[c]||'?');
    let retro=false; for(let i=1;i<fns.length;i++) if(fns[i-1]==='D'&&fns[i]==='S') retro=true;
    return { ch:ch.join(' '), fns:fns.join(''), retro, endsI: ch[ch.length-1]==='C', startsI: ch[0]==='C' };
  })()`);
  // v60.15：期望值由 C C F G C 改为 C Am F G C。不是为了让测试变绿——
  // 第 2 小节旋律 3-1-6-1 的四个音**全部**落在 Am 内（C 只覆盖三个，6 是外音，实测 vi=4/4 vs I=3/4），
  // 且 A8 套路层在此命中 1-6-4-5（50s 进行）。功能序列仍是 T-T-S-D-T、无 D→S 逆行、首末为 I，
  // 原断言的结构性部分一条没放松，只把「钉住旧解」的那一条更新为更优解。
  const ok7 = !t7.retro && t7.endsI && t7.startsI && t7.ch==='C Am F G C';
  console.log((ok7?'✅':'❌')+' T7 功能进行: '+t7.ch+' 功能='+t7.fns+' 无逆行D→S='+!t7.retro+' 首末=I');
  if(ok7) pass++;
  // T8 v45.0 和声节奏：小节前半 I(1,3)/后半 V(7,2) → 拆成两个和弦(C@拍0 + G@拍2)；全 I 小节不拆
  const t8 = await pg.evaluate(`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('vocal',{nVox:1,lyr:0,beats:4,unit:4,key:'C',nMea:2});
    s.measures[0].voxes[0]=[V(1,4),V(3,4),V(7,4),V(2,4,{oct:1})];
    s.measures[1].voxes[0]=[V(1,4),V(3,4),V(1,2)];
    const plan=suggestChordPlan(s,0);
    const r=arrangeAccompaniment(s,{texId:'block'});
    const placed=r.song.measures[0].voxes[0].map((c,i)=>c.chord?(i+':'+c.chord):null).filter(Boolean).join(' ');
    return { split:JSON.stringify(plan[0]), m1:JSON.stringify(plan[1]), placed };
  })()`);
  const ok8 = t8.split==='[{"beat":0,"chord":"C"},{"beat":2,"chord":"G"}]' && t8.m1==='[{"beat":0,"chord":"C"}]' && t8.placed==='0:C 2:G';
  console.log((ok8?'✅':'❌')+' T8 和声节奏: M0拆='+t8.split+' M1单='+t8.m1+' 回填='+t8.placed+'(期望 0:C 2:G)');
  if(ok8) pass++;
  // T9 v45.1 织体扩拍号：2/4(march2) 与 6/8(barc68) 生成时值和=拍数、有音、无 NaN
  const t9 = await pg.evaluate(`(()=>{
    const test=(beats,unit,texId)=>{
      const s=createSong('pianoacc',{lyr:0,beats,unit,key:'C',nMea:1});
      s.measures[0].voxes[0][0].chord='C'; loadSong(s);
      const g=genAccompaniment(texId,0,0,{chordVi:0,rhVi:0,lhVi:1});
      const sum=vi=>{let t=0;song.measures[0].voxes[vi].forEach(c=>t+=beatsOf(c));return +t.toFixed(3);};
      const notes=vi=>song.measures[0].voxes[vi].filter(c=>c.deg||(c.adds||[]).length).length;
      return { done:g.done, rh:sum(0), lh:sum(1), rhN:notes(0), lhN:notes(1), nan:document.getElementById('score').innerHTML.includes('NaN') };
    };
    return { m2:test(2,4,'march2'), b68:test(6,8,'barc68') };
  })()`);
  const ok9 = t9.m2.done===1 && t9.m2.rh===2 && t9.m2.lh===2 && t9.m2.rhN>0 && !t9.m2.nan
    && t9.b68.done===1 && t9.b68.rh===6 && t9.b68.lh===6 && t9.b68.rhN>0 && !t9.b68.nan;
  console.log((ok9?'✅':'❌')+' T9 织体扩拍号: 2/4('+t9.m2.rh+'拍/'+t9.m2.rhN+'音) 6/8('+t9.b68.rh+'拍/'+t9.b68.rhN+'音) 无NaN='+(!t9.m2.nan&&!t9.b68.nan));
  if(ok9) pass++;
  // T10 v45.2 副属和弦（保守·旋律驱动）：含 #4 且下一小节为 V → 该小节升级 D7(V/V)；纯自然音不触发
  const t10 = await pg.evaluate(`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const A=createSong('vocal',{nVox:1,lyr:0,beats:4,unit:4,key:'C',nMea:4});
    A.measures[0].voxes[0]=[V(1,4),V(3,4),V(5,4),V(3,4)];
    A.measures[1].voxes[0]=[V(2,4),V(4,4,{acc:'#'}),V(5,4),V(2,4)];
    A.measures[2].voxes[0]=[V(5,4),V(7,4),V(2,4,{oct:1}),V(7,4)];
    A.measures[3].voxes[0]=[V(1,4),V(1,4),V(1,2)];
    const B=createSong('vocal',{nVox:1,lyr:0,beats:4,unit:4,key:'C',nMea:4});
    B.measures[0].voxes[0]=[V(1,4),V(3,4),V(5,4),V(3,4)];
    B.measures[1].voxes[0]=[V(4,4),V(6,4),V(1,4,{oct:1}),V(6,4)];
    B.measures[2].voxes[0]=[V(5,4),V(7,4),V(2,4,{oct:1}),V(7,4)];
    B.measures[3].voxes[0]=[V(1,4),V(1,4),V(1,2)];
    return { A:suggestChords(A,0).join(' '), B:suggestChords(B,0).join(' ') };
  })()`);
  const ok10 = t10.A==='C D7 G C' && t10.B==='C F G C';
  console.log((ok10?'✅':'❌')+' T10 副属和弦: 含#4→'+t10.A+'(期望 C D7 G C) 纯自然音→'+t10.B+'(期望 C F G C 不触发)');
  if(ok10) pass++;
  // ===== v60.14 A1 小调候选集 =====
  // 改动前（HEAD~）实测：自然小调→"C G F Am"（开头配成大调主）、流行小调→"Am G F C"（末小节配成 C 大调）、
  // 1=F 的 d 小调→"F C Bb Dm"。这三条是「小调系统性配错」的原样复现，下列断言即以修正后结果为准。
  const MIN=`
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const mk=(rows,key)=>{ const s=createSong('vocal',{nVox:1,lyr:0,beats:4,unit:4,key:key||'C',nMea:rows.length});
      rows.forEach((r,i)=> s.measures[i].voxes[0]=r); return s; };`;
  // T11 自然小调：主音落 6 → i ♭VII ♭VI i（改动前首小节是 C）
  const t11 = await pg.evaluate(`(()=>{ ${MIN}
    const B=mk([[V(6,4),V(1,4,{oct:1}),V(3,4,{oct:1}),V(1,4,{oct:1})],[V(5,4),V(7,4),V(2,4,{oct:1}),V(7,4)],
                [V(4,4),V(6,4),V(1,4,{oct:1}),V(6,4)],[V(3,4),V(2,4),V(6,2)]]);
    const D=mk([[V(6,4),V(6,4),V(1,4,{oct:1}),V(3,4,{oct:1})],[V(5,4),V(5,4),V(7,4),V(2,4,{oct:1})],
                [V(4,4),V(4,4),V(6,4),V(1,4,{oct:1})],[V(5,4),V(7,4),V(6,2)]]);
    return { natMode:detectMinorMode(B,0), nat:suggestChords(B,0).join(' '),
             popMode:detectMinorMode(D,0), pop:suggestChords(D,0).join(' '),
             plan:suggestChordPlan(B,0).map(p=>p.map(x=>x.chord).join('+')).join(' ') };
  })()`);
  const ok11 = t11.natMode===true && t11.nat==='Am G F Am' && t11.popMode===true && t11.pop==='Am G F Am'
    && t11.plan.split(' ')[0]==='Am';
  console.log((ok11?'✅':'❌')+' T11 自然小调: 判别='+t11.natMode+' 和弦='+t11.nat+'(期望 Am G F Am) 流行小调='+t11.pop+'(期望 Am G F Am，改前 Am G F C) 半小节计划首和弦='+t11.plan.split(' ')[0]);
  if(ok11) pass++;
  // T12 和声小调：旋律含导音 #5 → 属和弦取大三 E（而非自然小调 Em）
  const t12 = await pg.evaluate(`(()=>{ ${MIN}
    const C=mk([[V(6,4),V(1,4,{oct:1}),V(3,4,{oct:1}),V(6,4,{oct:1})],[V(4,4),V(6,4),V(2,4,{oct:1}),V(4,4,{oct:1})],
                [V(3,4),V(5,4,{acc:'#'}),V(7,4),V(5,4,{acc:'#'})],[V(6,2),V(6,2)]]);
    return { mode:detectMinorMode(C,0), ch:suggestChords(C,0).join(' ') };
  })()`);
  const ok12 = t12.mode===true && t12.ch==='Am Dm E Am';
  console.log((ok12?'✅':'❌')+' T12 和声小调导音: 判别='+t12.mode+' 和弦='+t12.ch+'(期望 Am Dm E Am，属和弦须为大三 E)');
  if(ok12) pass++;
  // T13 大调不回归 + 误判防线：大调旋律结果不变；「大调歌偶然结在 6」不得判成小调
  const t13 = await pg.evaluate(`(()=>{ ${MIN}
    const A=mk([[V(1,4),V(3,4),V(5,4),V(3,4)],[V(4,4),V(6,4),V(1,4,{oct:1}),V(6,4)],
                [V(5,4),V(7,4),V(2,4,{oct:1}),V(7,4)],[V(1,4),V(1,4),V(1,2)]]);
    const E=mk([[V(1,2),V(1,2)],[V(5,2),V(3,2)],[V(1,2),V(1,4),V(2,4)],[V(3,4),V(2,4),V(6,2)]]);
    return { majMode:detectMinorMode(A,0), maj:suggestChords(A,0).join(' '),
             guardMode:detectMinorMode(E,0), guard:suggestChords(E,0).join(' ') };
  })()`);
  const ok13 = t13.majMode===false && t13.maj==='C F G C' && t13.guardMode===false && t13.guard==='C C C Am';
  console.log((ok13?'✅':'❌')+' T13 大调不回归: 大调判别='+t13.majMode+' 和弦='+t13.maj+'(期望 C F G C) 结在6的大调判别='+t13.guardMode+'(期望 false) 和弦='+t13.guard);
  if(ok13) pass++;
  // T14 换调保真：同一小调旋律写在 1=F → d 小调，按调号拼写降号
  const t14 = await pg.evaluate(`(()=>{ ${MIN}
    const G=mk([[V(6,4),V(1,4,{oct:1}),V(3,4,{oct:1}),V(1,4,{oct:1})],[V(5,4),V(7,4),V(2,4,{oct:1}),V(7,4)],
                [V(4,4),V(6,4),V(1,4,{oct:1}),V(6,4)],[V(3,4),V(2,4),V(6,2)]],'F');
    return { mode:detectMinorMode(G,0), ch:suggestChords(G,0).join(' ') };
  })()`);
  const ok14 = t14.mode===true && t14.ch==='Dm C Bb Dm';
  console.log((ok14?'✅':'❌')+' T14 小调换调: 1=F 判别='+t14.mode+' 和弦='+t14.ch+'(期望 Dm C Bb Dm，改前 F C Bb Dm)');
  if(ok14) pass++;
  console.log('PASS '+pass+'/14');
  console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS');
  await b.close();
})();
