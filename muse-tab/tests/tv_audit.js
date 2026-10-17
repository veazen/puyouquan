const { chromium } = require('playwright');
const F=process.env.MUSETAB_URL || 'file://'+require('path').resolve(__dirname,'../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR:'+e.message)); pg.on('console',m=>{if(m.type()==='error'&&!/sounds|CORS|Failed to load|TUNNEL/.test(m.text()))errs.push('CONSOLE:'+m.text());});
  await pg.goto(F); await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.guardReplace = (p) => p(); });   // v41.5 单窗口化：测试内直通未保存确认对话（tv_safety 专测该对话）
  // 字形计数辅助（SMuFL 路径按 d 串精确匹配）
  const CNT = `const cnt=g=>{const d='d="'+SMUFL[g].d+'"';const h=document.getElementById('score').innerHTML;let n=0,i=0;while((i=h.indexOf(d,i))>=0){n++;i+=d.length;}return n;};`;

  // T1: 小节内临时记号进位（C大调，调号0 → 谱面 ♯/♮ 全部来自临时记号）
  const t1 = await pg.evaluate(CNT+`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('staff',{title:'审计',beats:4,unit:4,key:'C',nMea:3,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(4,4,{acc:'#'}),V(4,4,{acc:'#'}),V(4,4),V(5,4)];
    s.measures[1].voxes[0]=[V(4,4),V(4,4),V(5,4),V(5,4)];
    s.measures[2].voxes[0]=[V(4,4,{acc:'#'}),V(4,4,{oct:1}),V(5,4),V(5,4)];
    loadSong(s);
    return { sharps:cnt('accidentalSharp'), nats:cnt('accidentalNatural') };
  })()`);
  console.log('T1 记号进位: ♯='+t1.sharps+' (期望2) ♮='+t1.nats+' (期望1)', t1.sharps===2&&t1.nats===1?'✅':'❌');

  // T2: 拍号（SMuFL timeSig4 ×2）
  const t2 = await pg.evaluate(CNT+`(()=>({ four:cnt('timeSig4') }))()`);
  console.log('T2 五线谱拍号: timeSig4字形='+t2.four+' (期望2)', t2.four===2?'✅':'❌');
  await pg.waitForTimeout(150);
  await pg.screenshot({path:'audit-1.png', clip:{x:330,y:170,width:820,height:300}});

  // T3: 连音线贴符头（低音区下方弧、高音区上方弧）。
  //     连音线画法已升级为出版级「填充双弧闭合路径」（M..Q..Q..Z fill，中粗端细的刻版 tie），
  //     不再是 1px 描边单弧——本断言曾停在旧画法，且套件不在 CORE 门禁，静默失效至今。
  const t3 = await pg.evaluate(`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('staff',{title:'',beats:4,unit:4,key:'C',nMea:2,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(1,2,{tie:true}),V(1,2)];
    s.measures[1].voxes[0]=[V(1,2,{oct:1,tie:true}),V(1,2,{oct:1})];
    loadSong(s);
    const svg=document.getElementById('score').innerHTML;
    const ties=[...svg.matchAll(/d="M ([\\d.]+) ([\\d.]+) Q [\\d.]+ ([\\d.]+) [\\d.]+ [\\d.]+ Q [\\d.]+ [\\d.]+ [\\d.]+ [\\d.]+ Z" fill="var\\(--ink\\)"/g)]
      .map(m=>({x:+m[1], y:+m[2], cp:+m[3]}));
    const dHalf='d="'+SMUFL.noteheadHalf.d+'" transform="translate(';
    const heads=[]; let i=0;
    while((i=svg.indexOf(dHalf,i))>=0){ const m=svg.slice(i,i+dHalf.length+24).match(/translate\\(([\\d.-]+),([\\d.-]+)/); if(m) heads.push(+m[2]); i+=dHalf.length; }
    return { ties, heads };
  })()`);
  {
    const [lo,hi]=t3.ties, h1=t3.heads[0], h3=t3.heads[2];
    const okLo = lo && Math.abs(lo.y-h1)<12 && lo.y>h1 && lo.cp>lo.y;   // 低音区：弧在符头下、弯向下
    const okHi = hi && Math.abs(hi.y-h3)<12 && hi.y<h3 && hi.cp<hi.y;   // 高音区：弧在符头上、弯向上
    console.log('T3 连音线贴符头: 低音区', lo?JSON.stringify(lo):'无', '符头y='+h1, okLo?'✅':'❌', '| 高音区', hi?JSON.stringify(hi):'无', '符头y='+h3, okHi?'✅':'❌');
  }
  await pg.screenshot({path:'audit-2.png', clip:{x:330,y:170,width:820,height:260}});

  // T4: 左栏标签
  /* v40.9 图标+小字结构后标签文本在 .lb 子节点（图标 SVG 内含字形文本，不能读整个 textContent——
     tv_dock 早已按此口径，本套件没跟上） */
  const lbTxt = `(()=>{ const el=document.querySelector('.ltab[data-t="vox"]'); const lb=el.querySelector('.lb'); return (lb||el).textContent; })()`;
  /* v68.2 收尾 ENG-8（PLAN §5.4 列为 P）：.ltab 是旧外壳左轨（默认外壳 flow 下隐藏，文字照常更新）——本套件其余项都是谱面刻版审计，要在默认外壳上跑，
     所以不整套钉旧外壳，而是 T4 两段：旧左轨文字（同前）＋ 默认外壳下左栏音轨树当前旋律轨的记谱法层（FLOW.tree.model：五线谱曲谱＝高音谱表 treble、吉他预设＝简谱 jp），
     两者都对才算过 */
  const treeNota = `(()=>{ if(!document.body.classList.contains('flow')) return 'n/a'; const m=FLOW.tree.model(); const x=m && m.T.find(t=>t.k==='vox' && t.i===0); return x? x.nota : null; })()`;
  const t4a = await pg.evaluate(lbTxt), t4af = await pg.evaluate(treeNota);
  const t4b = await pg.evaluate(`(()=>{ loadSong(PRESETS[0].make()); return ${lbTxt}; })()`), t4bf = await pg.evaluate(`(()=>{ render(); return ${treeNota}; })()`);
  const okA = t4a==='五线谱' && (t4af==='n/a' || t4af==='treble'), okB = t4b==='简谱' && (t4bf==='n/a' || t4bf==='jp');
  console.log('T4 左栏标签: 五线谱曲谱→'+t4a+' / 音轨树 '+t4af, okA?'✅':'❌', '| 吉他预设→'+t4b+' / 音轨树 '+t4bf, okB?'✅':'❌');

  // T5: 联排记号进位
  const t5 = await pg.evaluate(CNT+`(()=>{
    const T=(f,dur)=>({dur,dotted:false,chord:'',notes:f==null?[]:[{s:1,f}],strum:''});
    const s=createSong('guitar',{title:'',beats:4,unit:4,key:'C',nMea:1,nTab:1,nVox:0,lyr:0});
    s.tabStaff=true;
    s.measures[0].tabs[0]=[T(2,4),T(2,4),T(1,4),T(null,4)];
    loadSong(s);
    return { sharps:cnt('accidentalSharp'), nats:cnt('accidentalNatural'), four:cnt('timeSig4') };
  })()`);
  console.log('T5 联排记号进位: ♯='+t5.sharps+' (期望1) ♮='+t5.nats+' (期望1) 拍号字形='+t5.four+' (期望2)', t5.sharps===1&&t5.nats===1&&t5.four===2?'✅':'❌');
  await pg.screenshot({path:'audit-3.png', clip:{x:330,y:170,width:820,height:330}});

  // T6: 调号+临时记号交互（G大调）
  const t6 = await pg.evaluate(CNT+`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('staff',{title:'',beats:4,unit:4,key:'G',nMea:1,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(7,4),V(7,4,{acc:'b'}),V(7,4),V(5,4)];
    loadSong(s);
    return { sharps:cnt('accidentalSharp'), nats:cnt('accidentalNatural') };
  })()`);
  console.log('T6 调号交互(G): ♯='+t6.sharps+' (期望2=调号1+补回1) ♮='+t6.nats+' (期望1)', t6.sharps===2&&t6.nats===1?'✅':'❌');

  // T7: 字形库健全性（45枚均可绘制、宽度合理）
  const t7 = await pg.evaluate(()=>{
    const bad=[];
    Object.keys(SMUFL).forEach(k=>{ const g=SMUFL[k]; if(!g.d||g.d.length<20) bad.push(k);
      if(g.bb && (g.bb[2]-g.bb[0]<=0 || g.bb[3]-g.bb[1]<=0)) bad.push(k+':bb'); });
    return {total:Object.keys(SMUFL).length, bad};
  });
  console.log('T7 字形库: '+t7.total+'枚', t7.bad.length? '异常:'+t7.bad.join(','):'全部正常 ✅');

  console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS');
  await b.close();
})();
