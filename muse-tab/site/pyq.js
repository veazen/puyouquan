/* ================================================================
   谱友圈官网 · 共享脚本：线性图标库 / 导航页脚注入 / 主题 / 进场动画 / 文档路由
   ================================================================ */
(function(){
'use strict';

/* ---------- 线性 SVG 图标（Lucide 风格，stroke=currentColor） ---------- */
const P = (d)=>`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS = {
  layout:   P('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/>'),
  sliders:  P('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/>'),
  printer:  P('<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>'),
  pencil:   P('<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>'),
  repeat:   P('<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>'),
  play:     P('<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4Z"/>'),
  guitar:   P('<path d="m20 4-3.5 3.5"/><path d="M18 2l4 4-2 1-1 2-2-2-2 1 1-3Z" fill="currentColor" stroke="none" opacity=".18"/><path d="M15.5 8.5 12 12"/><circle cx="8.5" cy="15.5" r="5.5"/><circle cx="8.5" cy="15.5" r="1.6"/>'),
  music:    P('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  shield:   P('<path d="M12 2 4 5v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V5Z"/><path d="m9 12 2 2 4-4"/>'),
  book:     P('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5Z"/><path d="M20 17v5H6.5a2.5 2.5 0 0 1 0-5"/>'),
  compass:  P('<circle cx="12" cy="12" r="10"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>'),
  heart:    P('<path d="M19 14c1.5-1.5 3-3.3 3-5.5A4.5 4.5 0 0 0 17.5 4c-1.7 0-3 .8-4 2.1a5 5 0 0 0-4-2.1A4.5 4.5 0 0 0 5 8.5C5 10.7 6.5 12.5 8 14l4 4Z"/>'),
  clock:    P('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  sparkles: P('<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3.2"/>'),
  eye:      P('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
  zap:      P('<path d="M13 2 4 14h6l-1 8 9-12h-6Z"/>'),
  check:    P('<circle cx="12" cy="12" r="10"/><path d="m8.5 12.2 2.4 2.4 4.8-5"/>'),
  arrow:    P('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  rocket:   P('<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M14 4c3-1.5 7-1 7-1s.5 4-1 7c-1.6 3.2-4.5 5.8-7.5 7L8 12.5C9.2 9.5 10.8 6 14 4Z"/><circle cx="14.5" cy="9.5" r="1.6"/>'),
  file:     P('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>'),
  grid:     P('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  type:     P('<path d="M4 7V5h16v2M12 5v14M9 19h6"/>'),
  mail:     P('<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m2 7 10 6L22 7"/>'),
  users:    P('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16.5 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.3c2 .8 3 2.6 3 5.7"/>'),
  moon:     P('<path d="M20 13.5A8.5 8.5 0 0 1 10.5 4 8.5 8.5 0 1 0 20 13.5Z"/>'),
  scan:     P('<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>'),
  wand:     P('<path d="m14 6 4 4L6 22l-4-4Z"/><path d="M12 8l4 4M15 3v2M19 7h2M18 4l1-1"/>'),
};
window.PYQ_ICON = n => ICONS[n]||'';

/* ---------- v58.9 头像系统：统一渲染器 + 8 枚预设（四族社色×2，SVG→base64 data URI） ----------
   判定一条：avatar 非空即 <img>（data:/http: 均可，onerror 回退首字），为空即首字渐变圆。
   值只进 <img src> 属性（esc），绝不 innerHTML——SVG 在 img 上下文脚本惰性。 */
window.PYQ_AV = (function(){
  const eA = s => String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const AV_SVG = (c1,c2,inner)=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">'
    +'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
    +`<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`
    +'<circle cx="48" cy="48" r="48" fill="url(#g)"/>'
    +`<g transform="translate(26 26) scale(1.83)" fill="none" stroke="#fff" stroke-opacity=".95" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
  const P8=[
    ['#d24a37','#c33a29','<path d="M11 20 q-3.4 -.6 -3.6 -3.4 q-.2 -2.4 2 -2.6 q2.2 -.2 2.4 2.2 L9.4 3.5 q-.4 -3 1.8 -3.3 q2 2 1.3 4.6 q-.6 2.6 -3.6 5.2 q-3.2 2.8 -3.2 5.6 q0 3.4 3.4 3.8 q3.4 .4 3.9 -2.6 q.4 -2.8 -2.2 -3.5"/>'],
    ['#d24a37','#c33a29','<path d="m20 4-3.5 3.5"/><path d="M15.5 8.5 12 12"/><circle cx="8.5" cy="15.5" r="5.5"/><circle cx="8.5" cy="15.5" r="1.6"/>'],
    ['#44688c','#33587a','<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 6v7M12 6v7M16 6v7"/>'],
    ['#44688c','#33587a','<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'],
    ['#3c7f5f','#2f6d4f','<rect x="9" y="3" width="6" height="10" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/>'],
    ['#3c7f5f','#2f6d4f','<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="6.5" rx="2"/><rect x="16.5" y="14" width="4.5" height="6.5" rx="2"/>'],
    ['#b98738','#a8762a','<path d="M9.5 3h5L18 20H6z"/><path d="M12 16.5L16.8 7"/><circle cx="16.8" cy="7" r="1.4"/>'],
    ['#b98738','#a8762a','<path d="M9 3v7a3 3 0 0 0 6 0V3"/><path d="M12 13v7M9 20.5h6"/>'],
  ];
  const PRESETS = P8.map(a=>'data:image/svg+xml;base64,'+btoa(AV_SVG(a[0],a[1],a[2])));
  function html(u, cls){
    const av=(u&&u.avatar)||'', ch=eA(((u&&u.nickname)||'谱').charAt(0));
    if(av && (av.slice(0,11)==='data:image/' || av.slice(0,4)==='http'))
      return `<span class="${cls||'acct-av'} has-img"><img src="${eA(av)}" alt="" onerror="this.parentNode.classList.remove('has-img');this.parentNode.textContent='${ch}'"></span>`;
    return `<span class="${cls||'acct-av'}">${ch}</span>`;
  }
  html.PRESETS = PRESETS;
  return html;
})();

/* ---------- 导航 / 页脚（各页共用，data-page 定当前项） ----------
   v58.7 搜索型定位：菜单收敛为 4 项（找谱=首页即谱库；谱库/日志/赞助商入页脚），
   个人中心升级独立页 me.html（登录后头像直达） */
/* v60.86 产品拍板：定位话术回归「专业曲谱平台」；v60.89 产品指示：主菜单收敛为
   找谱/制谱/学习 三项（「课程」改「学习」直达课程内容；功能/帮助收进页脚） */
const MENU = [
  ['index.html','找谱'],['make.html','制谱'],['kecheng.html','学习'],
];
const page = document.body.dataset.page || '';
const navEl = document.getElementById('site-nav');
if(navEl){
  navEl.innerHTML = `<nav id="nav"><div class="bar">
    <a class="brand" href="index.html"><span class="mark"></span>谱友圈<span class="sub">专业曲谱平台</span></a>
    <div id="menu">${MENU.map(([h,t,k])=>`<a href="${h}" class="${(k||h.replace('.html',''))===page?'on':''}">${t}</a>`).join('')}</div>
    <div class="nav-r">
      <button id="theme-btn" title="明暗切换">${ICONS.moon}</button>
      <span id="nav-acct"></span>
      <a class="btn" href="//zhipu.puyouquan.com/">开始制谱 ${ICONS.arrow}</a>
    </div>
  </div></nav>`;
}
const footEl = document.getElementById('site-foot');
if(footEl){
  /* v58.8 极简页脚（用户点名去冗）：品牌+slogan 一行 5 链 + 备案行；场景内链移居首页 .scene-strip */
  footEl.innerHTML = `<footer id="foot"><div class="wrap">
    <div class="f-line">
      <a class="brand" href="index.html"><span class="mark"></span>谱友圈<span class="sub">专业曲谱平台</span></a>
      <nav class="f-links">
        <a href="//zhipu.puyouquan.com/">在线制谱</a>
        <a href="features.html">功能</a>
        <a href="help.html">帮助</a>
        <a href="log.html">更新日志</a>
        <a href="sponsors.html">赞助商</a>
        <a href="mailto:support@puyouquan.com">联系我们</a>
      </nav>
    </div>
    <div class="beian">
      <span>© 2026 谱友圈 puyouquan.com · 专业曲谱平台</span>
      <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">粤ICP备2026100396号-1</a>
    </div>
  </div></footer>`;
}

/* ---------- 主题切换 ---------- */
const tb = document.getElementById('theme-btn');
if(tb) tb.onclick = ()=>{
  const r=document.documentElement;
  const isDark = r.dataset.theme ? r.dataset.theme==='dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  r.dataset.theme = isDark?'light':'dark';
};

/* ---------- 图标占位替换：<i data-i="name"></i> ---------- */
document.querySelectorAll('i[data-i]').forEach(el=>{ el.outerHTML = ICONS[el.dataset.i]||''; });

/* ---------- 进场动画 ---------- */
const io = new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} }),{threshold:.12});
document.querySelectorAll('.rv').forEach(el=>io.observe(el));

/* ---------- 谱库卡片渲染（复刻编辑器曲谱库卡片：迷你旋律封面 + 类型 + 免费/价 + 标题 + 作者）---------- */
const _esc = s => String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
window.PYQ_LIB = (function(){
  const TYPE_CN={guitar:'弹唱谱',uku:'尤克里里谱',solo:'独奏谱',pianoacc:'钢琴弹唱谱',piano:'钢琴独奏谱',
    vocal:'歌谱',teach:'教学对照谱',instr:'器乐五线谱',func:'功能谱',chord:'和弦谱'};
  /* ===== v58.8 封面刻版引擎（出版级排版师规格 + UI 四族社色）=====
     原则：音乐内容永远墨色（--text × 四阶透明度），家族色只出现在封面洗色/印章/水印；
     每谱种真实刻版骨架（谱线/谱号/TAB/大谱表/和弦框图），不伪造时值，空数据画诚实的休止。 */
  const FAM={guitar:'g',solo:'g',uku:'g',chord:'g',piano:'p',pianoacc:'p',vocal:'v',teach:'v',instr:'f',func:'f'};
  const T='var(--text)', M='var(--muted)', S='var(--fam)';
  const GT={'1,0':[5,3],'2,0':[4,0],'3,0':[4,2],'4,0':[4,3],'5,0':[3,0],'6,0':[3,2],'7,0':[2,0],
    '1,1':[2,1],'2,1':[2,3],'3,1':[1,0],'4,1':[1,1],'5,1':[1,3],'6,1':[1,5],'7,1':[1,7],
    '1,-1':[6,8],'2,-1':[6,10],'3,-1':[6,0],'4,-1':[6,1],'5,-1':[6,3],'6,-1':[5,0],'7,-1':[5,2]};
  const UK={'1,0':[3,0],'2,0':[3,2],'3,0':[2,0],'4,0':[2,1],'5,0':[4,0],'6,0':[1,0],'7,0':[1,2],
    '1,1':[1,3],'2,1':[1,5],'3,1':[1,7],'4,1':[1,8],'5,1':[1,10]};
  const ln=(x1,y1,x2,y2,op,w,cls)=>`<line ${cls?('class="'+cls+'" '):''}x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${T}" stroke-opacity="${op}" stroke-width="${w||1}"/>`;
  const bars=(y0,y1)=>ln(16,y0,16,y1,.3,1)+ln(227,y0,227,y1,.25,1)
    +`<rect x="230.8" y="${y0}" width="3.2" height="${y1-y0}" fill="${T}" fill-opacity=".25"/>`;
  const staff=(ys,x0)=>ys.map(y=>ln(x0||16,y,234,y,.14,1,'cv-line')).join('');
  const clefG=(x,y,sc)=>`<g transform="translate(${x} ${y}) scale(${sc})" fill="none" stroke="${S}" stroke-opacity=".6" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M-1.2 13.2 q-3.6 -.6 -3.8 -3.6 q-.2 -2.6 2.2 -2.8 q2.4 -.2 2.6 2.4 L-2.6 -19.5 q-.5 -5.5 3 -8.5 q3.1 2.6 2.1 7 q-.9 4 -5.6 8 q-5 4.3 -5 8.7 q0 5.3 5.3 5.9 q5.3 .6 6.1 -4.1 q.7 -4.3 -3.5 -5.5 q-3 -.8 -4.7 1.4"/></g>`;
  const clefF=(x,y,sc)=>`<g transform="translate(${x} ${y}) scale(${sc})" fill="${S}" fill-opacity=".6" stroke="${S}" stroke-opacity=".6"><circle r="1.9" stroke="none"/><path d="M-1.6 -1.8 q6.2 -4.6 9 .6 q2.6 4.8 -1.8 9.8 q-2.7 3.1 -6.6 5" fill="none" stroke-width="1.7" stroke-linecap="round"/><circle cx="11" cy="-2.2" r="1.2" stroke="none"/><circle cx="11" cy="2.6" r="1.2" stroke="none"/></g>`;
  const brace=(y0,y1)=>{const m=(y0+y1)/2;
    return `<path d="M18 ${y0} C12.5 ${y0+7} 18.5 ${m-8} 13.5 ${m} C18.5 ${m+8} 12.5 ${y1-7} 18 ${y1}" fill="none" stroke="${T}" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/>`;};
  const wm=()=>`<g class="cv-wm" opacity=".12"><g stroke="${S}" stroke-width="2.6" stroke-linecap="round" fill="none"><ellipse cx="188" cy="85" rx="8" ry="5.8" transform="rotate(-16 188 85)" fill="${S}" stroke="none"/><path d="M195.6 83 L195.6 36 Q209 41 211 55"/></g></g>`;
  const romanWM=()=>`<text class="cv-wm" x="200" y="88" font-size="54" font-style="italic" font-family="Georgia,serif" fill="${S}" fill-opacity=".12" text-anchor="middle">Ⅴ<tspan font-size="28" dy="-20">7</tspan></text>`;
  const rest=(cx,yLine)=>`<rect x="${cx-2.8}" y="${yLine}" width="5.6" height="2.3" fill="${T}" fill-opacity=".5"/>`;
  const tabLabel=(cx,cys,size)=>`<g class="cv-seal" fill="${S}" fill-opacity=".55" font-size="${size}" font-weight="700" text-anchor="middle">`
    +['T','A','B'].map((ch,k)=>`<text x="${cx}" y="${cys[k]}" dominant-baseline="central">${ch}</text>`).join('')+`</g>`;
  function cover(item){
    const cols=item.cover||[], n=cols.length, tp=item.type, p=[];
    const colWrap=(i,inner)=>`<g class="cv-col" style="transition-delay:${Math.min(i,8)*30}ms">${inner}</g>`;
    const octDots=(x,base,oct,r)=>{let g=''; const cnt=Math.min(2,Math.abs(oct||0));
      for(let k=0;k<cnt;k++) g+=`<circle cx="${x}" cy="${oct>0? base-14.5-k*4 : base+6.5+k*4}" r="${r}" fill="${T}" fill-opacity=".7"/>`;
      return g;};
    /* 简谱行（vocal/func/teach 副行共用）：列缺 deg 保留索引定位 */
    function jpRow(ox,w,cap,degY,lyY,noLy,degSize){
      const step=Math.min(cap,w/Math.max(1,n));
      const ds=degSize||(n>=6?15.5:17), dr=n>=6?1.3:1.5, ls=n>=6?10.5:11.5;
      return cols.map((c,i)=>{const x=ox+i*step; let g='';
        if(c.deg){ g+=`<text x="${x}" y="${degY}" font-size="${ds}" font-family="Georgia,'Times New Roman',serif" font-weight="600" fill="${T}" fill-opacity=".82" text-anchor="middle">${_esc(c.deg)}</text>`+octDots(x,degY,+c.oct||0,dr); }
        if(!noLy&&c.ly) g+=`<text x="${x}" y="${lyY}" font-size="${ls}" fill="${M}" text-anchor="middle">${_esc(String(c.ly).slice(0,2))}</text>`;
        return g?colWrap(i,g):'';}).join('');
    }
    /* 五线谱符头列：整列按中位数定符干方向；越界整八度折叠；加线略宽于符头 */
    function stNotes(ox,w,cap,base,half,lo,hi,mid,ry,ledY){
      const step=Math.min(cap,w/Math.max(1,n)), ys=[];
      cols.forEach(c=>{ if(!c.deg) return; let y=base-half*((parseInt(c.deg,10)||1)-1+7*(+c.oct||0));
        while(y<lo) y+=half*7; while(y>hi) y-=half*7; ys.push(y); });
      if(!ys.length) return '';
      const med=ys.slice().sort((a2,b2)=>a2-b2)[Math.floor(ys.length/2)];
      const up=med>mid, rx=1.3*ry, stemL=9.4*ry;
      let k=0;
      return cols.map((c,i)=>{ if(!c.deg) return '';
        const x=ox+i*step, y=ys[k++];
        let g=`<ellipse cx="${x}" cy="${y}" rx="${rx.toFixed(2)}" ry="${ry}" transform="rotate(-14 ${x} ${y})" fill="${T}" fill-opacity=".8"/>`;
        g+= up? `<rect x="${(x+rx-1.1).toFixed(2)}" y="${(y-stemL).toFixed(1)}" width="1.1" height="${stemL.toFixed(1)}" fill="${T}" fill-opacity=".8"/>`
              : `<rect x="${(x-rx).toFixed(2)}" y="${y}" width="1.1" height="${stemL.toFixed(1)}" fill="${T}" fill-opacity=".8"/>`;
        if(ledY!=null&&y>=ledY-.01) g+=ln((x-4.8).toFixed(1),ledY,(x+4.8).toFixed(1),ledY,.5,1);
        return colWrap(i,`<g class="cv-note">${g}</g>`); }).join('');
    }
    /* TAB 品位数字（骑线 + 纸底白衬），(deg,oct)→首把位[弦,品] */
    function tabRow(ox,w,cap,topY,sp,tbl,size,lyY){
      const step=Math.min(cap,w/Math.max(1,n));
      return cols.map((c,i)=>{const x=ox+i*step; let g='';
        if(c.deg){ const key=(parseInt(c.deg,10)||1)+','+Math.max(-1,Math.min(1,+c.oct||0));
          const sf=tbl[key]||tbl[(parseInt(c.deg,10)||1)+',0']||[3,0];
          g+=`<text x="${x}" y="${topY+(sf[0]-1)*sp}" font-size="${size}" font-family="Georgia,'Times New Roman',serif" font-weight="700" fill="${T}" fill-opacity=".85" text-anchor="middle" dominant-baseline="central" style="paint-order:stroke;stroke:var(--panel);stroke-width:4px">${sf[1]}</text>`; }
        if(lyY&&c.ly) g+=`<text x="${x}" y="${lyY}" font-size="11" fill="${M}" text-anchor="middle">${_esc(String(c.ly).slice(0,2))}</text>`;
        return g?colWrap(i,g):'';}).join('');
    }
    if(tp==='instr'){
      p.push(staff([40,47,54,61,68]), bars(40,68), `<g class="cv-seal">${clefG(27,61,1)}</g>`);
      p.push(n? stNotes(48,158,26,75,3.5,33,75,54,2.6,75) : rest(125,47));
      p.push(wm());
    }else if(tp==='teach'){
      p.push(staff([32,37,42,47,52]), bars(32,52), `<g class="cv-seal">${clefG(25,47,.72)}</g>`);
      if(n){ p.push(stNotes(48,158,26,57,2.5,27,57,42,2,57)); p.push(jpRow(48,158,26,74,0,true,13)); }
      else p.push(rest(125,37));
    }else if(tp==='piano'||tp==='pianoacc'){
      const hi5=tp==='piano'?[30,35,40,45,50]:[42,46.5,51,55.5,60];
      const lo5=tp==='piano'?[62,67,72,77,82]:[68,72.5,77,81.5,86];
      const y0=hi5[0], y1=lo5[4];
      p.push(staff(hi5,22), staff(lo5,22), brace(y0,y1), ln(22,y0,22,y1,.3,1), ln(227,y0,227,y1,.25,1),
        `<rect x="230.8" y="${y0}" width="3.2" height="${y1-y0}" fill="${T}" fill-opacity=".25"/>`);
      p.push(`<g class="cv-seal">${tp==='piano'? clefG(31,45,.72)+clefF(30,67,1) : clefG(30,55.5,.64)+clefF(29,72.5,.9)}</g>`);
      if(n){
        if(tp==='pianoacc'){ const step=Math.min(24,128/n);
          cols.forEach((c,i)=>{ if(c.ly) p.push(colWrap(i,`<text x="${72+i*step}" y="32" font-size="11" fill="${M}" text-anchor="middle">${_esc(String(c.ly).slice(0,2))}</text>`)); });
          p.push(stNotes(72,128,24,64.5,2.25,40.5,64.5,51,1.8,64.5));
        }else p.push(stNotes(48,158,26,55,2.5,27.5,55,40,2,55));
      }else p.push(rest(90, tp==='piano'?35:46.5));
      p.push(rest(n?125:90, tp==='piano'?67:72.5));   /* 左手无数据=诚实的空小节 */
    }else if(tp==='guitar'){
      p.push(staff([48,54,60,66,72,78]), bars(48,78), tabLabel(26,[56.1,63,69.9],8.1));
      if(n) p.push(tabRow(72,128,24,48,6,GT,10,36)); else p.push(wm());
    }else if(tp==='solo'){
      p.push(staff([38,45,52,59,66,73]), bars(38,73), tabLabel(26,[47.5,55.5,63.5],9.45));
      if(n) p.push(tabRow(48,158,26,38,7,GT,10.5,0));
      p.push(wm());
    }else if(tp==='uku'){
      p.push(staff([50,57,64,71]), bars(50,71), tabLabel(26,[52.5,60.5,68.5],8.1));
      if(n) p.push(tabRow(72,128,24,50,7,UK,10,38)); else p.push(wm());
    }else if(tp==='chord'){
      for(let i2=0;i2<6;i2++) p.push(ln(34+i2*7,34,34+i2*7,74,.25,1));
      p.push(ln(34,34,69,34,.5,3));
      [44,54,64,74].forEach(y=>p.push(ln(34,y,69,y,.25,1)));
      p.push(`<g class="cv-seal">`+[[41,59],[48,49],[62,39]].map(d=>`<circle cx="${d[0]}" cy="${d[1]}" r="2.7" fill="${S}" fill-opacity=".8"/>`).join('')
        +[[55,30],[69,30]].map(d=>`<circle cx="${d[0]}" cy="${d[1]}" r="1.7" fill="none" stroke="${S}" stroke-opacity=".4"/>`).join('')+`</g>`);
      if(n){ const step=Math.min(24,128/n);
        cols.forEach((c,i)=>{const x=96+i*step; let g='';
          if(c.deg){ g+=`<text x="${x}" y="54" font-size="15.5" font-family="Georgia,'Times New Roman',serif" font-weight="600" fill="${T}" fill-opacity=".82" text-anchor="middle">${_esc(c.deg)}</text>`+octDots(x,54,+c.oct||0,1.4);
            if(c.ly) g+=`<text x="${x}" y="74" font-size="10.5" fill="${M}" text-anchor="middle">${_esc(String(c.ly).slice(0,2))}</text>`; }
          else if(c.ly) g+=`<text x="${x}" y="58" font-size="12" fill="${M}" text-anchor="middle">${_esc(String(c.ly).slice(0,2))}</text>`;
          if(g) p.push(colWrap(i,g)); });
      }
      p.push(wm());
    }else{ /* vocal / func / 未知谱种 → 简谱纸面 */
      p.push(bars(34,70));
      if(n){ p.push(jpRow(26,200,30,54,74,false));
        if(tp==='func'){ const step=Math.min(30,200/n), x0=(26-.3*step).toFixed(1), xn=(26+(n-1)*step+.3*step).toFixed(1);
          p.push(`<path class="cv-seal" d="M${x0} 62 v3 H${xn} v-3" fill="none" stroke="${S}" stroke-opacity=".45" stroke-width="1"/>`); }
      }else{
        if(tp==='func') p.push(`<text x="26" y="58" font-size="17" font-style="italic" font-family="Georgia,serif" fill="${T}" fill-opacity=".55">Ⅰ — Ⅳ — Ⅴ — Ⅰ</text>`);
        else for(let k=0;k<4;k++) p.push(`<text x="${26+k*30}" y="54" font-size="17" font-family="Georgia,'Times New Roman',serif" font-weight="600" fill="${T}" fill-opacity=".45" text-anchor="middle">0</text>`);
      }
      p.push(tp==='func'? romanWM() : wm());
    }
    return `<svg viewBox="0 0 250 108" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${p.join('')}</svg>`;
  }
  /* v60.6 卡片信息补齐：调号/拍号/速度/小节数/段词数——挑谱时真正要看的几项，
     一眼判断「这份谱能不能直接用」，不用点进去。纯五线谱家族写「C 调」，简谱家族写惯用的「1=C」。 */
  const TYPE_STAFF = { instr: 1, piano: 1, pianoacc: 1, solo: 1 };   /* v60.7 补 pianoacc：同为大谱表，写「F 调」不写「1=F」 */
  function metaBits(item){
    const b = [], k = String(item.key||'').slice(0,6);
    if(k) b.push(TYPE_STAFF[item.type] ? k+' 调' : '1='+k);
    if(item.beats>0 && item.unit>0) b.push(item.beats+'/'+item.unit);
    if(item.tempo>0) b.push('♩='+item.tempo);
    if(item.measures>0) b.push(item.measures+' 小节');
    if(item.verses>1) b.push(item.verses+' 段词');
    return b;
  }
  /* v58.8 家族色 data-fam + 进场 stagger；v60.6 封面换真实谱面缩图：
     刻版骨架留在底层当占位（缩图 lazy 加载中/老谱没缩图/图挂了都由它兜住），真缩图盖在上面。 */
  function card(item, idx){
    /* v60.81 谱类细分标签：优先用服务端算好的 typeLabel（吉他弹唱谱/简谱歌谱…），
       旧接口没有该字段时回退粗分类——站点先发、接口后发也不破 */
    const type = item.typeLabel || TYPE_CN[item.type] || '曲谱';
    const who = [item.singer?('演唱 '+item.singer):'', item.author?('制谱 '+item.author):''].filter(Boolean).join(' · ') || '佚名';
    const bits = metaBits(item);
    const tip = [item.title||'未命名曲谱', type, who].concat(bits).join(' · ');
    /* v60.7 ?v=thumb_at 缓存戳：重新发布换图后 URL 跟着变，不再吃 max-age=86400 的陈图 */
    const shot = item.thumb
      ? `<img class="cc-shot" src="/api/pub/${encodeURIComponent(item.id)}/thumb?v=${+item.thumb||0}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`
      : '';
    return `<a class="cc-card" data-fam="${FAM[item.type]||'g'}" style="--d:${Math.min(+idx||0,8)*40}ms" title="${_esc(tip)}" href="//puku.puyouquan.com/kanpu.html?pub=${encodeURIComponent(item.id)}">
      <div class="cc-cover">${cover(item)}${shot}
        <span class="cc-type">${type}</span>
        ${item.price>0?`<span class="cc-price">¥${item.price}</span>`:''}</div>
      <div class="cc-body">
        <div class="t">${_esc(item.title||'未命名曲谱')}</div>
        <div class="a">${_esc(who)}</div>
        ${bits.length?`<div class="meta">${bits.map(x=>`<i>${_esc(x)}</i>`).join('')}</div>`:''}
      </div></a>`;
  }
  /* 拉取公开谱库渲染到指定容器；limit 限制条数 */
  async function mount(el, limit){
    if(!el) return;
    try{
      const r=await fetch('/api/pub/scores',{credentials:'include'}); if(!r.ok) throw 0;
      let list=(await r.json()).scores||[];
      if(limit) list=list.slice(0,limit);
      el.innerHTML = list.length ? list.map(card).join('')
        : '<p style="color:var(--muted)">谱库正在充实中，创作者发布的曲谱将在这里展示。</p>';
    }catch(e){ el.innerHTML='<p style="color:var(--muted)">刷新试试，谱库马上回来。</p>'; }
  }
  return { TYPE_CN, cover, card, mount };
})();

/* ---------- 官网账号：手机验证码登录（与编辑器共享后端，Cookie 域 .puyouquan.com 互通）---------- */
window.PYQ_ACCT = (function(){
  const API_ON=/(^|\.)puyouquan\.com$/i.test(location.hostname);
  let acct=null;
  let unreadMsgs=0;   /* v60.87 未读站内信数（随 /api/me 带出，导航头像红点） */
  /* v58.4 微信登录能力探测：wx_web=扫码（开放平台）、wx_mp=公众号网页授权（微信内免扫码） */
  let wxWeb=false, wxMp=false;
  const inWx=/MicroMessenger/i.test(navigator.userAgent);
  async function api(path,opts){ opts=opts||{};
    const r=await fetch('/api'+path,{method:opts.method||'GET',credentials:'include',
      headers:opts.body?{'Content-Type':'application/json'}:{}, body:opts.body?JSON.stringify(opts.body):undefined});
    let j={}; try{ j=await r.json(); }catch(_){}
    if(!r.ok){ const e=new Error(j.error||('请求失败（'+r.status+'）')); e.status=r.status; throw e; } return j;
  }
  function renderNav(){
    const el=document.getElementById('nav-acct'); if(!el) return;
    if(!API_ON){ el.innerHTML=''; return; }
    if(acct){
      /* v58.7 个人中心升级独立页：头像 chip 直达 me.html（下拉菜单废除；退出等操作入 me.html） */
      /* v60.87 未读站内信红点：点头像进 me.html 的「消息」卡即可读 */
      el.innerHTML=`<a class="acct-chip" id="acct-chip" href="me.html" title="个人中心${unreadMsgs?(' · '+unreadMsgs+' 条未读消息'):''}">${PYQ_AV(acct)}<span class="acct-nm">${_esc(acct.nickname||'')}</span>${unreadMsgs?'<span class="acct-dot"></span>':''}</a>`;
    }else{
      el.innerHTML=`<button class="nav-login" id="nav-login">登录 / 注册</button>`;
      document.getElementById('nav-login').onclick=openLogin;
    }
  }
  /* ---- v58.7 个人中心升级独立页 me.html：openCenter 保留函数名向后兼容，改为跳转 ---- */
  function openCenter(){ location.href='me.html'; }
  function openLogin(){
    let m=document.getElementById('pyq-login'); if(m) m.remove();
    m=document.createElement('div'); m.id='pyq-login'; m.className='pyq-mask';
    /* v58.4 微信登录入口：微信内走公众号网页授权（免扫码），微信外走开放平台扫码。
       v58.6 网页授权需认证服务号（订阅号无此能力，wx_mp 默认关）——微信内回落扫码通道时
       提示长按二维码识别（同一部手机扫不了自己的屏） */
    const wxBtn=(wxWeb||wxMp)? `<div class="lg-or">— 或 —</div>
      <button id="lg-wx" class="lg-wx">${(inWx&&wxMp)?'微信一键登录':'微信扫码登录'}</button>
      ${(inWx&&!wxMp)?'<div class="lg-wxtip">微信内点击后，<b>长按页面上的二维码</b>即可识别登录</div>':''}` : '';
    m.innerHTML=`<div class="pyq-modal"><h3>登录 / 注册</h3>
      <p class="lg-sub">输入手机号即登录，新号自动注册，跨端同步。</p>
      <input id="lg-phone" inputmode="numeric" maxlength="11" placeholder="11 位手机号">
      <div class="lg-row"><input id="lg-code" inputmode="numeric" maxlength="6" placeholder="6 位验证码"><button id="lg-send">获取验证码</button></div>
      <div id="lg-msg" class="lg-msg"></div>
      ${wxBtn}
      <div class="lg-btns"><button id="lg-cancel">取消</button><button id="lg-go" class="primary">登录</button></div></div>`;
    document.body.appendChild(m);
    m.addEventListener('click',e=>{ if(e.target===m) m.remove(); });
    const msg=t=>{ const e=document.getElementById('lg-msg'); if(e) e.textContent=t||''; };
    let timer=0;
    { const wxb=document.getElementById('lg-wx'); if(wxb) wxb.onclick=async function(){
        this.disabled=true;
        try{ const r=await api('/wx/'+((inWx&&wxMp)?'mp':'web')+'/login-url?return='+encodeURIComponent(location.href));
          if(r.url) location.href=r.url; else { this.disabled=false; msg('微信登录暂不可用'); } }
        catch(e){ this.disabled=false; msg(e.status===503?'微信登录尚未开通':(e.message||'微信登录暂不可用')); } }; }
    document.getElementById('lg-cancel').onclick=()=>{ if(timer)clearInterval(timer); m.remove(); };
    document.getElementById('lg-send').onclick=async function(){
      const phone=document.getElementById('lg-phone').value.trim();
      if(!/^1[3-9]\d{9}$/.test(phone)) return msg('请输入正确的手机号');
      this.disabled=true;
      try{ const r=await api('/auth/sms/send',{method:'POST',body:{phone}});
        msg(r.dev_code?('测试环境验证码：'+r.dev_code):'验证码已发送，请查收短信');
        let s=60; this.textContent=s+'s';
        timer=setInterval(()=>{ if(--s<=0){clearInterval(timer);timer=0;this.disabled=false;this.textContent='获取验证码';}else this.textContent=s+'s'; },1000);
      }catch(e){ this.disabled=false; msg(e.message); }
    };
    document.getElementById('lg-go').onclick=async()=>{
      const phone=document.getElementById('lg-phone').value.trim(), code=document.getElementById('lg-code').value.trim();
      if(!/^1[3-9]\d{9}$/.test(phone)) return msg('请输入正确的手机号');
      if(!/^\d{6}$/.test(code)) return msg('请输入 6 位验证码');
      try{ const r=await api('/auth/sms/verify',{method:'POST',body:{phone,code}});
        acct=r.user; if(timer)clearInterval(timer); m.remove(); renderNav();
      }catch(e){ msg(e.message); }
    };
  }
  async function init(){ if(!API_ON){ renderNav(); return; }
    api('/health').then(j=>{ wxWeb=!!(j&&j.wx_web); wxMp=!!(j&&j.wx_mp); }).catch(()=>{});
    /* v58.4 微信登录回跳（callback 302 带 ?wxlogin=ok/fail）：清 query；fail 重开登录框提示 */
    try{ const wl=new URLSearchParams(location.search).get('wxlogin');
      if(wl){ history.replaceState(null,'',location.pathname+location.hash);
        if(wl!=='ok') setTimeout(()=>{ openLogin(); const e=document.getElementById('lg-msg'); if(e) e.textContent='微信登录未完成，请重试'; },50); }
    }catch(_){}
    try{ const j=await api('/me'); acct=j.user; unreadMsgs=j.unread_msgs|0; }catch(_){ acct=null; unreadMsgs=0; }
    renderNav();
  }
  init();
  return { openLogin, openCenter, refresh:init, get user(){ return acct; } };
})();

/* ---------- 文档路由：?section=xxx → 显示对应文章并高亮侧栏 ---------- */
window.PYQ_DOCS = function(defaultSec){
  const arts=[...document.querySelectorAll('.doc-art')];
  const links=[...document.querySelectorAll('.docs-side a[data-sec]')];
  const show=(sec,push)=>{
    if(!document.getElementById('doc-'+sec)) sec=defaultSec;
    arts.forEach(a=>a.classList.toggle('on', a.id==='doc-'+sec));
    links.forEach(l=>l.classList.toggle('on', l.dataset.sec===sec));
    if(push){ const u=new URL(location); u.searchParams.set('section',sec); history.pushState({},'',u); window.scrollTo({top:0}); }
  };
  links.forEach(l=>l.onclick=e=>{ e.preventDefault(); show(l.dataset.sec,true); });
  document.querySelectorAll('a[data-goto]').forEach(a=>a.onclick=e=>{ e.preventDefault(); show(a.dataset.goto,true); });
  window.addEventListener('popstate', ()=>show(new URLSearchParams(location.search).get('section')||defaultSec));
  show(new URLSearchParams(location.search).get('section')||defaultSec);
};
})();
