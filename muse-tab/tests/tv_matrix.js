const { chromium } = require('playwright');
const F=process.env.MUSETAB_URL || 'file://'+require('path').resolve(__dirname,'../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR:'+e.message));
  pg.on('console',m=>{if(m.type()==='error'&&!/sounds|CORS|Failed to load|TUNNEL/.test(m.text()))errs.push('CONSOLE:'+m.text());});
  await pg.goto(F); await pg.waitForTimeout(900);

  const CASES = [
    ['吉他预设(TAB+简谱+歌词)', `loadSong(PRESETS[0].make());`],
    ['吉他联排 Eb调', `const s=PRESETS[0].make(); s.tabStaff=true; s.key='Eb'; loadSong(s);`],
    ['吉他联排 B调', `const s=PRESETS[0].make(); s.tabStaff=true; s.key='B'; loadSong(s);`],
    ['五线谱满符号 C调', `
      const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
      const s=createSong('staff',{title:'满',beats:4,unit:4,key:'C',nMea:4,nVox:1,lyr:2});
      s.measures[0].voxes[0]=[V(1,1,{lyrics:['全','一'],dyn:'mf',chord:'C'})];
      s.measures[0].repeatStart=true; s.measures[0].segno=true;
      s.measures[1].voxes[0]=[V(5,8,{tup:1,oct:1}),V(6,8,{tup:1,oct:1}),V(5,8,{tup:1,oct:1}),V(3,4,{orn:'tr'}),V(2,4,{dyn:'<'}),V(1,4,{grace:{notes:[{deg:2,oct:0}],dur:16}})];
      s.measures[2].voxes[0]=[V(4,4,{acc:'#',graceA:{notes:[{deg:5,oct:0}],dur:16}}),V(4,4),V(2,2,{tie:true,orn:'up'})];
      s.measures[2].volta=1;
      s.measures[3].voxes[0]=[V(2,2,{dyn:'rit.'}),V(1,2,{oct:-1,orn:'turn'})];
      s.measures[3].repeatEnd=true; s.measures[3].coda=true; s.measures[3].finalBar=true;
      loadSong(s);`],
    ['五线谱满符号 G调', `song.key='G'; render();`],
    ['五线谱满符号 Db调', `song.key='Db'; render();`],
    ['重升重降(G调7#/F调4b)', `
      const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
      const s=createSong('staff',{title:'',beats:4,unit:4,key:'G',nMea:1,nVox:1,lyr:0});
      s.measures[0].voxes[0]=[V(7,4,{acc:'#'}),V(7,4),V(4,4,{acc:'b'}),V(4,4)];
      loadSong(s);`],
    ['钢琴谱双手+歌词', `
      const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
      const s=createSong('piano',{title:'钢',beats:4,unit:4,key:'C',nMea:2,lyr:1});
      s.measures[0].voxes[0]=[V(1,8,{lyrics:['右']}),V(2,8),V(3,8),V(4,8),V(5,2)];
      s.measures[0].voxes[1]=[V(1,2,{oct:-1}),V(0,4),V(5,4,{oct:-1})];
      s.measures[1].voxes[0]=[V(1,1,{oct:1})];
      s.measures[1].voxes[1]=[V(1,1,{oct:-2})];
      loadSong(s);`],
    ['混合记谱(五线+简谱同屏)', `
      const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
      const s=createSong('vox',{title:'混',beats:4,unit:4,key:'C',nMea:2,nVox:2,lyr:1});
      s.voxNotations=['staff',undefined];
      s.measures[0].voxes[0]=[V(1,4),V(3,4),V(5,4),V(1,4,{oct:1})];
      s.measures[0].voxes[1]=[V(1,4,{lyrics:['混']}),V(2,4),V(3,4),V(4,4)];
      loadSong(s);`],
    ['功能谱+五线谱', `
      const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
      const s=createSong('func',{title:'功',beats:4,unit:4,key:'C',nMea:2,nVox:1,lyr:1});
      s.voxNotations=['staff'];
      s.measures[0].voxes[0]=[V(1,4,{chord:'C',lyrics:['功']}),V(3,4),V(5,4,{chord:'Am',oct:1}),V(6,4)];
      loadSong(s);`],
    ['尤克里里联排', `const s=createSong('uku',{title:'尤',beats:4,unit:4,key:'C',nMea:2,nTab:1,nVox:0,lyr:0}); s.tabStaff=true;
      s.measures[0].tabs[0]=[{dur:4,dotted:false,chord:'',notes:[{s:1,f:0}],strum:''},{dur:4,dotted:false,chord:'',notes:[{s:2,f:1}],strum:''},{dur:2,dotted:false,chord:'',notes:[],strum:''}];
      loadSong(s);`],
    ['五线谱全音符/附点休止', `
      const V=(deg,dur,o)=>Object.assign({dur,dotted:false,deg,acc:'',oct:0,lyrics:[]},o||{});
      const s=createSong('staff',{title:'',beats:4,unit:4,key:'C',nMea:2,nVox:1,lyr:0});
      s.measures[0].voxes[0]=[V(3,1)];
      s.measures[1].voxes[0]=[V(0,2,{dotted:true}),V(0,4)];
      loadSong(s);`],
  ];
  let pass=0;
  for(const [name, code] of CASES){
    const r = await pg.evaluate(`(()=>{ try{ ${code}
      const h=document.getElementById('score').innerHTML;
      return {len:h.length, nan:h.includes('NaN'), undef:h.includes('undefined')};
    }catch(e){ return {err:e.message}; } })()`);
    const ok = r && !r.err && r.len>1000 && !r.nan && !r.undef;
    console.log((ok?'✅':'❌')+' '+name+': '+JSON.stringify(r));
    if(ok) pass++;
  }
  // 打印预览逐类 + 反色 + 排版预设
  const extra = await pg.evaluate(`(async()=>{ const out=[];
    for(const t of ['staff','piano']){
      const s=createSong(t,{title:'',beats:4,unit:4,key:'G',nMea:2,nVox:1,lyr:0}); loadSong(s);
      document.getElementById('b-preview').click(); await new Promise(r=>setTimeout(r,250));
      out.push(t+'-preview:'+document.getElementById('preview-ov').classList.contains('on'));
      document.getElementById('pv-close') ? document.getElementById('pv-close').click() : document.getElementById('preview-ov').classList.remove('on');
      await new Promise(r=>setTimeout(r,120));
    }
    const s2=createSong('staff',{title:'',beats:4,unit:4,key:'C',nMea:2,nVox:1,lyr:0}); loadSong(s2);
    document.getElementById('paper').classList.add('score-invert'); render();
    out.push('invert-nan:'+document.getElementById('score').innerHTML.includes('NaN'));
    document.getElementById('paper').classList.remove('score-invert');
    song.layout={page:'A3',preset:'compact',density:0.88,scale:1,noteGap:1,rowGap:{tab:1,vox:1,lyric:1}}; render();
    out.push('A3-compact-len:'+(document.getElementById('score').innerHTML.length>1000));
    song.layout={page:'A5',preset:'loose',density:1.15,scale:1.1,noteGap:1.1,rowGap:{tab:1,vox:1.2,lyric:1}}; render();
    out.push('A5-loose-len:'+(document.getElementById('score').innerHTML.length>1000));
    return out; })()`);
  console.log('EXTRA:', JSON.stringify(extra));
  console.log('PASS '+pass+'/'+CASES.length);
  console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS');
  await b.close();
})();
