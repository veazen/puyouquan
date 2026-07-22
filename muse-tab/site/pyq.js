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

/* ---------- 导航 / 页脚（各页共用，data-page 定当前项） ---------- */
const MENU = [
  ['index.html','首页'],['make.html','制谱'],['view.html','看谱'],['features.html','功能'],
  ['help.html','帮助'],['log.html','日志'],['sponsors.html','赞助商'],
];
const page = document.body.dataset.page || '';
const navEl = document.getElementById('site-nav');
if(navEl){
  navEl.innerHTML = `<nav id="nav"><div class="bar">
    <a class="brand" href="index.html"><span class="mark"></span>谱友圈<span class="sub">PUYOUQUAN</span></a>
    <div id="menu">${MENU.map(([h,t])=>`<a href="${h}" class="${h.replace('.html','')===page?'on':''}">${t}</a>`).join('')}</div>
    <div class="nav-r">
      <button id="theme-btn" title="明暗切换">${ICONS.moon}</button>
      <a class="btn" href="../index.html">开始制谱 ${ICONS.arrow}</a>
    </div>
  </div></nav>`;
}
const footEl = document.getElementById('site-foot');
if(footEl){
  footEl.innerHTML = `<footer id="foot"><div class="wrap">
    <div class="cols">
      <div><div class="brand" style="margin-bottom:10px"><span class="mark"></span>谱友圈</div>
        <p class="fb">在线制谱工具 · 吉他谱｜尤克里里谱｜简谱｜功能谱。出版级排版，打开浏览器就能做谱。</p></div>
      <div><h5>产品</h5><a href="../index.html">在线制谱</a><a href="view.html">看谱</a><a href="features.html">功能一览</a></div>
      <div><h5>资源</h5><a href="help.html">使用手册</a><a href="log.html">更新日志</a><a href="help.html?section=faq">常见问题</a></div>
      <div><h5>关于</h5><a href="sponsors.html">赞助商</a><a href="mailto:support@puyouquan.com">联系我们</a></div>
    </div>
    <div class="beian">
      <span>© 2026 谱友圈 puyouquan.com · 在线制谱工具</span>
      <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener" style="display:inline">粤ICP备2026100396号-1</a>
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
