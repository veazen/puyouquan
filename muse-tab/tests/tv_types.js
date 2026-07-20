const { chromium } = require('playwright');
const F=process.env.MUSETAB_URL || 'file://'+require('path').resolve(__dirname,'../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR:'+e.message)); pg.on('console',m=>{if(m.type()==='error'&&!/sounds|CORS|Failed to load|TUNNEL/.test(m.text()))errs.push('CONSOLE:'+m.text());});
  await pg.goto(F); await pg.waitForTimeout(900);
  const cases=[
    ['tanchang-guitar', "createSong('tanchang',{inst:'guitar',nTab:1,nVox:1,lyr:1,beats:4,unit:4,key:'C',nMea:2})", 'guitar'],
    ['tanchang-uku',    "createSong('tanchang',{inst:'uku',nTab:1,nVox:1,lyr:1,beats:4,unit:4,key:'C',nMea:2})", 'uku'],
    ['solo',            "createSong('solo',{nTab:1,nVox:0,lyr:0,beats:4,unit:4,key:'C',nMea:2})", 'solo'],
    ['pianoacc',        "createSong('pianoacc',{lyr:1,beats:4,unit:4,key:'C',nMea:2})", 'pianoacc'],
    ['piano',           "createSong('piano',{lyr:0,beats:4,unit:4,key:'C',nMea:2})", 'piano'],
    ['vocal-4声部',     "createSong('vocal',{nVox:4,lyr:2,beats:4,unit:4,key:'C',nMea:2})", 'vocal'],
    ['teach',           "createSong('teach',{nVox:1,lyr:1,beats:4,unit:4,key:'C',nMea:2})", 'teach'],
    ['instr-alto',      "createSong('instr',{clef:'alto',nVox:1,lyr:0,beats:4,unit:4,key:'D',nMea:2})", 'instr'],
    ['func',            "createSong('func',{ftype:'func',nVox:1,lyr:0,beats:4,unit:4,key:'C',nMea:2})", 'func'],
    ['func-chord',      "createSong('func',{ftype:'chord',nVox:1,lyr:0,beats:4,unit:4,key:'C',nMea:2})", 'chord'],
    ['旧guitar',        "createSong('guitar',{nTab:1,nVox:1,lyr:1,beats:4,unit:4,key:'C',nMea:2})", 'guitar'],
    ['旧vox',           "createSong('vox',{nVox:1,lyr:1,beats:4,unit:4,key:'C',nMea:2})", 'vocal'],
    ['旧staff',         "createSong('staff',{nVox:1,lyr:1,beats:4,unit:4,key:'C',nMea:2})", 'instr'],
  ];
  let pass=0;
  for(const [name, code, expType] of cases){
    const r=await pg.evaluate(`(()=>{ try{
      const s=${code}; loadSong(s);
      const h=document.getElementById('score').innerHTML;
      return {t:docType(song), len:h.length, nan:h.includes('NaN'), cn:TYPE_CN[docType(song)]};
    }catch(e){ return {err:e.message}; } })()`);
    const ok=r && !r.err && r.t===expType && r.len>1000 && !r.nan;
    console.log((ok?'✅':'❌')+' '+name+': type='+(r.t||r.err)+'('+(r.cn||'')+') 期望='+expType);
    if(ok) pass++;
  }
  // 特性抽查：solo=联排无歌词；teach=谱表+简谱行；instr-alto=C谱号；pianoacc标志
  const feat=await pg.evaluate(()=>{
    const s1=createSong('solo',{nMea:1,beats:4,unit:4,key:'C'});
    const s2=createSong('teach',{nVox:1,lyr:1,nMea:1,beats:4,unit:4,key:'C'});
    const s3=createSong('instr',{clef:'alto',nVox:1,nMea:1,beats:4,unit:4,key:'C'});
    return { soloStaff:!!s1.tabStaff && s1.voxVoices.length===0,
      teachDual:!!(s2.voxDual&&s2.voxDual[0]) && s2.voxNotations[0]==='staff',
      altoClef:s3.voxNotations[0]==='alto',
      accFlag:(()=>{const p=createSong('pianoacc',{nMea:1,beats:4,unit:4,key:'C'}); return !!p.pianoAcc && p.voxNotations.join()==='staff,bass';})() };
  });
  console.log('特性: solo联排='+feat.soloStaff+' teach对照='+feat.teachDual+' alto谱号='+feat.altoClef+' pianoAcc='+feat.accFlag,
    feat.soloStaff&&feat.teachDual&&feat.altoClef&&feat.accFlag?'✅':'❌');
  console.log('PASS '+pass+'/'+cases.length);
  console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'NO ERRORS');
  await b.close();
})();
