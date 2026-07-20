const { chromium } = require('playwright');
const F=process.env.MUSETAB_URL || 'file://'+require('path').resolve(__dirname,'../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR:'+e.message)); pg.on('console',m=>{if(m.type()==='error'&&!/sounds|CORS|Failed to load|TUNNEL/.test(m.text()))errs.push('CONSOLE:'+m.text());});
  await pg.goto(F); await pg.waitForTimeout(900);
  const HELP = `
    const posOf=(g)=>{ const h=document.getElementById('score').innerHTML;
      const key='d="'+SMUFL[g].d+'" transform="translate(';
      const out=[]; let i=0;
      while((i=h.indexOf(key,i))>=0){ const m=h.slice(i+key.length-10).match(/translate\\(([\\d.-]+),([\\d.-]+)\\)/); if(m) out.push({x:+m[1],y:+m[2]}); i+=key.length; }
      return out; };`;

  // T1: 高音谱表 G大调——谱线起点、谱号锚线、调号音位（F5顶线）
  const t1 = await pg.evaluate(HELP+`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('staff',{title:'',beats:4,unit:4,key:'G',nMea:2,nVox:1,lyr:0});
    s.measures[0].voxes[0]=[V(1,4),V(2,4),V(3,4),V(4,4)];
    loadSong(s);
    const h=document.getElementById('score').innerHTML;
    const HGx=staffHeadGeom();
    const lineM=h.match(/<line x1="(\\d+)" y1="([\\d.]+)" x2="[\\d.]+" y2="\\2" stroke="var\\(--ink\\)" stroke-width="0.8"/);
    const clef=posOf('gClef')[0], sh=posOf('accidentalSharp')[0];
    // 谱表几何：staffB=谱底线y。从谱线y集合推：取5条0.8线的y
    const ys=[...h.matchAll(/<line x1="\\d+" y1="([\\d.]+)" x2="[\\d.]+" y2="\\1" stroke="var\\(--ink\\)" stroke-width="0.8"/g)].map(m=>+m[1]).slice(0,5);
    const staffB=Math.max(...ys), SG=7.5;
    return { lineX0:+lineM[1], clefX:clef.x, clefY:clef.y, expClefY:staffB-SG,
      shX:sh.x, shY:sh.y, expShY:staffB-(45-37)*SG/2, HG:HGx, MARGIN:56 };
  })()`);
  {
    const ok = t1.lineX0===56 && Math.abs(t1.clefX-(56+t1.HG.clefX))<0.6 && Math.abs(t1.clefY-t1.expClefY)<0.6
      && Math.abs(t1.shX-(56+t1.HG.accX))<0.6 && Math.abs(t1.shY-t1.expShY)<0.6;
    console.log('T1 高音谱头部: 谱线起点='+t1.lineX0+'(期望56) 谱号@('+t1.clefX+','+t1.clefY+')期望('+(56+t1.HG.clefX)+','+t1.expClefY+') 升号@('+t1.shX+','+t1.shY+')期望('+(56+t1.HG.accX)+','+t1.expShY+'/F5顶线)', ok?'✅':'❌');
  }
  // T2: Eb大调三降号音位 B4 E5 A4（依次全宽排列，无重叠）
  const t2 = await pg.evaluate(HELP+`(()=>{
    song.key='Eb'; render();
    const h=document.getElementById('score').innerHTML;
    const ys=[...h.matchAll(/<line x1="\\d+" y1="([\\d.]+)" x2="[\\d.]+" y2="\\1" stroke="var\\(--ink\\)" stroke-width="0.8"/g)].map(m=>+m[1]).slice(0,5);
    const staffB=Math.max(...ys), SG=7.5, st=(n)=>staffB-(n-37)*SG/2;
    const fl=posOf('accidentalFlat').slice(0,3);
    return { got:fl.map(f=>[Math.round(f.x),Math.round(f.y)]), expY:[st(41),st(44),st(40)], dx:fl.length>1? +(fl[1].x-fl[0].x).toFixed(1):0, adv:staffHeadGeom().accAdv };
  })()`);
  {
    const okY = t2.got.every((g,i)=>Math.abs(g[1]-t2.expY[i])<0.6);
    const okX = Math.abs(t2.dx-t2.adv)<0.3 && t2.dx>6.5;
    console.log('T2 Eb三降号: 位置='+JSON.stringify(t2.got)+' 期望y='+t2.expY.map(v=>Math.round(v))+' 间距='+t2.dx+'(全宽'+t2.adv.toFixed(1)+')', okY&&okX?'✅':'❌');
  }
  // T3: 低音谱表 G大调升号在 F3 线；钢琴谱两谱表调号对齐
  const t3 = await pg.evaluate(HELP+`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('piano',{title:'',beats:4,unit:4,key:'G',nMea:2,lyr:0});
    s.measures[0].voxes[0]=[V(1,4),V(2,4),V(3,4),V(4,4)];
    s.measures[0].voxes[1]=[V(1,2,{oct:-1}),V(5,2,{oct:-1})];
    loadSong(s);
    const f=posOf('fClef')[0], g2=posOf('gClef')[0], sh=posOf('accidentalSharp');
    return { fClefX:f.x, gClefX:g2.x, shXs:sh.map(o=>Math.round(o.x)), shYs:sh.map(o=>Math.round(o.y)) };
  })()`);
  {
    const okAlign = t3.fClefX===t3.gClefX && t3.shXs[0]===t3.shXs[1];
    console.log('T3 钢琴谱: G/F谱号x对齐='+(t3.fClefX===t3.gClefX)+' 两谱表升号x对齐='+(t3.shXs[0]===t3.shXs[1])+' y='+JSON.stringify(t3.shYs), okAlign?'✅':'❌');
  }
  // T4: 中音谱表——C谱号锚定中线、G大调升号在F4(38)
  const t4 = await pg.evaluate(HELP+`(()=>{
    const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
    const s=createSong('staff',{title:'',beats:4,unit:4,key:'G',nMea:1,nVox:1,lyr:0});
    s.voxNotations=['alto'];
    s.measures[0].voxes[0]=[V(1,4),V(2,4),V(3,4),V(4,4)];
    loadSong(s);
    const h=document.getElementById('score').innerHTML;
    const ys=[...h.matchAll(/<line x1="\\d+" y1="([\\d.]+)" x2="[\\d.]+" y2="\\1" stroke="var\\(--ink\\)" stroke-width="0.8"/g)].map(m=>+m[1]).slice(0,5);
    const staffB=Math.max(...ys), SG=7.5;
    const c=posOf('cClef')[0], sh=posOf('accidentalSharp')[0];
    return { cY:c&&c.y, expC:staffB-2*SG, shY:sh&&sh.y, expSh:staffB-(38-31)*SG/2, nan:h.includes('NaN') };
  })()`);
  {
    const ok = t4.cY!=null && Math.abs(t4.cY-t4.expC)<0.6 && Math.abs(t4.shY-t4.expSh)<0.6 && !t4.nan;
    console.log('T4 中音谱表: C谱号y='+t4.cY+'(期望中线'+t4.expC+') 升号y='+t4.shY+'(期望F4='+t4.expSh+')', ok?'✅':'❌');
  }
  // T5: 联排——谱线起点56、内容不侵入头部
  const t5 = await pg.evaluate(HELP+`(()=>{
    const T=(f,dur)=>({dur,dotted:false,chord:'',notes:f==null?[]:[{s:1,f}],strum:''});
    const s=createSong('guitar',{title:'',beats:4,unit:4,key:'E',nMea:1,nTab:1,nVox:0,lyr:0});
    s.tabStaff=true;
    s.measures[0].tabs[0]=[T(0,4),T(2,4),T(4,4),T(5,4)];
    loadSong(s);
    const h=document.getElementById('score').innerHTML;
    const clef=posOf('gClef')[0], sh=posOf('accidentalSharp');
    const heads=posOf('noteheadBlack');
    const HGx=staffHeadGeom();
    return { clefX:clef.x, nSharps:sh.length, firstHeadX:Math.min(...heads.map(o=>o.x)), headEnd:56+HGx.w };
  })()`);
  {
    const ok = Math.abs(t5.clefX-61)<0.6 && t5.nSharps===4 && t5.firstHeadX>t5.headEnd;
    console.log('T5 联排(E调4♯): 谱号x='+t5.clefX+' 升号数='+t5.nSharps+' 首符头x='+Math.round(t5.firstHeadX)+'>头部端'+Math.round(t5.headEnd), ok?'✅':'❌');
  }
  console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS');
  await b.close();
})();
