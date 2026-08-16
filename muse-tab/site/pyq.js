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

/* ---------- 导航 / 页脚（各页共用，data-page 定当前项） ----------
   v58.7 搜索型定位：菜单收敛为 4 项（找谱=首页即谱库；谱库/日志/赞助商入页脚），
   个人中心升级独立页 me.html（登录后头像直达） */
const MENU = [
  ['index.html','找谱'],['make.html','制谱'],['features.html','功能'],['help.html','帮助'],
];
const page = document.body.dataset.page || '';
const navEl = document.getElementById('site-nav');
if(navEl){
  navEl.innerHTML = `<nav id="nav"><div class="bar">
    <a class="brand" href="index.html"><span class="mark"></span>谱友圈<span class="sub">PUYOUQUAN</span></a>
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
  footEl.innerHTML = `<footer id="foot"><div class="wrap">
    <div class="cols">
      <div><div class="brand" style="margin-bottom:10px"><span class="mark"></span>谱友圈</div>
        <p class="fb">在线制谱工具 · 吉他谱｜尤克里里谱｜简谱｜功能谱。出版级排版，打开浏览器就能做谱。</p></div>
      <div><h5>产品</h5><a href="index.html">找谱 · 谱库</a><a href="//zhipu.puyouquan.com/">在线制谱</a><a href="features.html">功能一览</a><a href="me.html">个人中心</a></div>
      <div><h5>适用场景</h5><a href="kaobian.html">教师考编</a><a href="yikao.html">音乐艺考</a><a href="shifan.html">师范 · 音乐教育</a><a href="jixing.html">钢琴即兴伴奏</a></div>
      <div><h5>资源</h5><a href="help.html">使用手册</a><a href="log.html">更新日志</a><a href="help.html?section=faq">常见问题</a></div>
      <div><h5>关于</h5><a href="sponsors.html">赞助商</a><a href="log.html">更新日志</a><a href="mailto:support@puyouquan.com">联系我们</a></div>
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

/* ---------- 谱库卡片渲染（复刻编辑器曲谱库卡片：迷你旋律封面 + 类型 + 免费/价 + 标题 + 作者）---------- */
const _esc = s => String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
window.PYQ_LIB = (function(){
  const TYPE_CN={guitar:'弹唱谱',uku:'尤克里里谱',solo:'独奏谱',pianoacc:'钢琴弹唱谱',piano:'钢琴独奏谱',
    vocal:'歌谱',teach:'教学对照谱',instr:'器乐五线谱',func:'功能谱',chord:'和弦谱'};
  function cover(item){
    const cols=item.cover||[]; const p=[];
    for(let i=0;i<4;i++) p.push(`<line x1="14" y1="${30+i*15}" x2="240" y2="${30+i*15}" stroke="var(--text)" stroke-opacity=".06"/>`);
    p.push(`<text x="212" y="100" font-size="70" fill="var(--accent)" fill-opacity=".09" text-anchor="middle" font-weight="700">♪</text>`);
    if(cols.length){ const step=Math.min(30,200/cols.length);
      cols.forEach((c,i)=>{ const x=26+i*step;
        if(c.deg){ p.push(`<text x="${x}" y="56" font-size="17" font-weight="600" fill="var(--text)" fill-opacity=".78" text-anchor="middle">${_esc(c.deg)}</text>`);
          if(c.oct>0) p.push(`<circle cx="${x}" cy="41" r="1.4" fill="var(--text)" fill-opacity=".6"/>`);
          if(c.oct<0) p.push(`<circle cx="${x}" cy="63" r="1.4" fill="var(--text)" fill-opacity=".6"/>`); }
        if(c.ly) p.push(`<text x="${x}" y="84" font-size="11.5" fill="var(--muted)" text-anchor="middle">${_esc(c.ly)}</text>`);
      });
    }else p.push(`<text x="26" y="60" font-size="13" fill="var(--muted)" fill-opacity=".8">♩ 点击观看曲谱</text>`);
    return `<svg viewBox="0 0 250 108" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${p.join('')}</svg>`;
  }
  function card(item){
    return `<a class="cc-card" href="//puku.puyouquan.com/kanpu.html?pub=${encodeURIComponent(item.id)}">
      <div class="cc-cover">${cover(item)}
        <span class="cc-type">${TYPE_CN[item.type]||'曲谱'}</span>
        <span class="cc-price ${item.price>0?'':'free'}">${item.price>0?('¥'+item.price):'免费'}</span></div>
      <div class="cc-body">
        <div class="t">${_esc(item.title||'未命名曲谱')}</div>
        <div class="a">制谱：${_esc(item.author||'佚名')}${item.singer?(' · '+_esc(item.singer)):''}</div>
        <div class="meta"><i>${item.measures||0} 小节</i></div>
      </div></a>`;
  }
  /* 拉取公开谱库渲染到指定容器；limit 限制条数（首页用） */
  async function mount(el, limit){
    if(!el) return;
    try{
      const r=await fetch('/api/pub/scores',{credentials:'include'}); if(!r.ok) throw 0;
      let list=(await r.json()).scores||[];
      if(limit) list=list.slice(0,limit);
      el.innerHTML = list.length ? list.map(card).join('')
        : '<p style="color:var(--muted)">谱库正在充实中，创作者发布的曲谱将在这里展示。</p>';
    }catch(e){ el.innerHTML='<p style="color:var(--muted)">谱库暂时无法加载，请稍后重试。</p>'; }
  }
  return { TYPE_CN, cover, card, mount };
})();

/* ---------- 官网账号：手机验证码登录（与编辑器共享后端，Cookie 域 .puyouquan.com 互通）---------- */
window.PYQ_ACCT = (function(){
  const API_ON=/(^|\.)puyouquan\.com$/i.test(location.hostname);
  let acct=null;
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
      el.innerHTML=`<a class="acct-chip" id="acct-chip" href="me.html" title="个人中心"><span class="acct-av">${_esc((acct.nickname||'谱').charAt(0))}</span><span class="acct-nm">${_esc(acct.nickname||'')}</span></a>`;
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
      <p class="lg-sub">未注册的手机号将自动创建账号，登录后跨端同步曲谱与收藏。</p>
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
    try{ const j=await api('/me'); acct=j.user; }catch(_){ acct=null; }
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
