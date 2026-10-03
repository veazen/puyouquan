// 首页：web-view 直载谱库。
// ⚠️ v58.7 谱库并入主站后，puku 根路径变成跳转占位页（view.html → location.replace 到 www）——
//    web-view 里跳到未加白的域名，微信直接报「不支持打开 …」。故此处必须指向**不会跳转**的真身：
//    www.puyouquan.com 首页即搜索型谱库。业务域名白名单需同时含 www / puku（卡片链观看页在 puku）。
// v60.1：先换静默登录票据再喂 src，落地即登录态（换票失败自动回落直开，不阻塞看谱）。
const { enterUrl, pubIdFrom, track } = require('../../utils/login');
const TARGET = 'https://www.puyouquan.com/';

Page({
  data: { src: '', spa: false },
  onLoad(q) {
    /* v60.79 朋友圈单页模式（scene 1154）：该模式下 web-view 组件不可用，渲染原生占位页；
       顶部微信自带「前往小程序」按钮，点击后以完整模式重开本页（query 原样带回）。 */
    const scene = (wx.getEnterOptionsSync ? wx.getEnterOptionsSync() : wx.getLaunchOptionsSync()).scene;
    if (scene === 1154) { this.setData({ spa: true }); return; }
    /* v60.79 朋友圈卡片是「本页 + query」重开的（onShareTimeline 不能指定 path）——
       带 id 进来说明用户点的是曲谱卡，转真正的看谱页。 */
    const id = String((q && q.id) || '').replace(/[^A-Za-z0-9_-]/g, '');
    if (id) { wx.redirectTo({ url: '/pages/score/score?id=' + id + '&f=mp' }); return; }
    /* v60.5 撤销开屏登录门（方案A）：进来直接进谱库。
       ① 静默登录已在 enterUrl 里完成——用户一进来就是登录态，收藏/云同步本就能用，
          真正缺的只是「绑真实手机号以便换设备接得上」，那用个人中心的提示条更合适；
       ② 微信《平台运营规范》禁止「用户未使用服务前强制登录/授权」，开屏拦截有驳回风险；
       ③ 分享/扫码进来的人不该被登录页挡住。
       pages/login 保留：待「手机号快速验证」开通后，从个人中心或此处一行即可重新接上。 */
    wx.showShareMenu({ withShareTicket: false, menus: ['shareAppMessage', 'shareTimeline'] });   // 点亮「分享到朋友圈」
    enterUrl(TARGET).then(src => this.setData({ src }));
  },
  /* v60.79 web-view 每次落地都上报地址——分享直达不再依赖网页 postMessage：
     用户从谱库点进某首谱（web-view 内同域跳转），这里立即知道当前在看哪首。 */
  onWvLoad(e) { const u = e.detail && e.detail.src; if (u) this.curUrl = u; },
  onMsg(e) {  // 网页 postMessage 上报的分享素材（微信在分享/后退时才送达；用于补卡片标题/缩图）
    const list = (e.detail && e.detail.data) || [];
    const last = list[list.length - 1] || {};
    if (last.pubId) this.pubId = String(last.pubId).replace(/[^A-Za-z0-9_-]/g, '');
    if (last.title) this.pubTitle = String(last.title).slice(0, 30);
    /* v60.84 完整标题（歌名 - 演唱者 · 谱类）与谱面缩略图直链（只认谱库域，防被嵌入页塞外链） */
    if (last.share) this.pubShare = String(last.share).slice(0, 44);
    if (last.img && /^https:\/\/puku\.puyouquan\.com\//.test(String(last.img))) this.pubImg = String(last.img);
  },
  onShareAppMessage(e) {
    /* v60.79 直达修正（产品报告：好友点开不是谱的直达链接）：
       以 webViewUrl（微信在分享时给的 web-view 当前地址）为准解析谱 ID。
       此前只认网页 postMessage 的 pubId，而网页端从没发过这条消息——
       于是从谱库点进谱再分享，好友打开的永远是谱库首页而不是那首谱。
       v60.84 卡片补图补题：imageUrl 必设——不设时微信自动截屏 web-view，结果常是
       空白图（产品报告的「截图丢失」）；优先网页报来的谱面缩略图，回落品牌方图。 */
    const id = pubIdFrom(e && e.webViewUrl) || pubIdFrom(this.curUrl) || this.pubId || '';
    if (id) {
      const mine = this.pubId === id;
      const t = (mine && this.pubShare) || ((mine && this.pubTitle) ? this.pubTitle + ' - 谱友圈' : '给你分享一首谱 - 谱友圈');
      track('mp_share', id);   // v63.4 A7
      return { title: t, path: '/pages/score/score?id=' + id + '&f=mp',
        imageUrl: (mine && this.pubImg) || 'https://www.puyouquan.com/share-icon.png' };
    }
    track('mp_share', 'home');
    return { title: '谱友圈谱库 · 在线看谱/移调/跟谱', path: '/pages/index/index',
      imageUrl: 'https://www.puyouquan.com/share-icon.png' };
  },
  /* 朋友圈分享（v60.84 实测修正）：微信对**含 web-view 组件的页面**整体禁分享朋友圈——
     菜单置灰提示「当前页面不可分享」，showShareMenu + 本函数都改变不了（v60.79 记的
     「入口可以点亮」在真机上不成立，平台限制）。本函数与 scene 1154 占位页保留：
     若微信放开限制即自动生效，且不影响其他路径。朋友圈晒谱的可用通道是观看页
     顶栏「分享卡」生成的长按保存图片（含二维码）。 */
  onShareTimeline() {
    const id = pubIdFrom(this.curUrl) || this.pubId || '';
    const mine = !!id && this.pubId === id;
    const t = (mine && this.pubShare) || ((mine && this.pubTitle) ? this.pubTitle + ' - 谱友圈' : '谱友圈谱库 · 在线看谱/移调/跟谱');
    const r = id ? { title: t, query: 'id=' + id } : { title: t };
    r.imageUrl = (mine && this.pubImg) || 'https://www.puyouquan.com/share-icon.png';
    return r;
  },
});
