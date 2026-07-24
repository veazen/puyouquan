/* v44.2 分享卡真二维码：验证内嵌零依赖 qrModules 生成的 QR 能被 jsQR 解码回原 URL，
   且 buildShareCardSVG 集成真码。file:// 直载。 */
const { chromium } = require('playwright');
const jsQR = require('jsqr');
const F = process.env.MUSETAB_URL || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR:'+e.message));
  await pg.goto(F); await pg.waitForTimeout(700);
  let pass=0,total=0; const T=(ok,n,d)=>{total++;if(ok)pass++;console.log((ok?'✅':'❌')+' '+n+(d?': '+d:''));};
  const decode = (mat, u) => {
    const n=mat.length, scale=6, quiet=4, S=(n+quiet*2)*scale;
    const data=new Uint8ClampedArray(S*S*4).fill(255);
    for(let r=0;r<n;r++)for(let c=0;c<n;c++){ if(!mat[r][c])continue; for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){ const y=(r+quiet)*scale+dy,x=(c+quiet)*scale+dx,i=(y*S+x)*4; data[i]=data[i+1]=data[i+2]=0; }}
    return jsQR(data,S,S);
  };
  const urls=['https://zhipu.puyouquan.com/?pub=sz82bbxr0','https://puyouquan.com','https://zhipu.puyouquan.com/?pub='+'x'.repeat(24)];
  for(const u of urls){
    const mat = await pg.evaluate(url=>{ const m=qrModules(url); return m.map(row=>row.map(v=>v?1:0)); }, u);
    const res=decode(mat,u);
    T(res && res.data===u, 'QR往返解码 '+u.slice(8,44), res?res.data.slice(0,44):'null');
  }
  const r2 = await pg.evaluate(()=>{
    window.guardReplace=(p)=>p();
    loadSong(createSong('guitar',{beats:4,unit:4,key:'C',nMea:2,nTab:1,nVox:1,lyr:0}));
    const url=shareCardURL(); const svg=buildShareCardSVG();
    return { url, hasCap: /微信扫码看谱|扫码上谱友圈制谱/.test(svg), rects:(svg.match(/<rect/g)||[]).length };
  });
  T(r2.url==='https://puyouquan.com', 'shareCardURL 未发布→官网', r2.url);
  T(r2.hasCap && r2.rects>100, '分享卡集成真码', 'rects='+r2.rects);
  T(errs.length===0, '无报错', errs.join('|')||'none');
  console.log('PASS '+pass+'/'+total);
  await b.close();
  process.exit(pass===total?0:1);
})();
