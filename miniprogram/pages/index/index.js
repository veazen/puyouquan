// 首页：web-view 直载谱库。
// ⚠️ v58.7 谱库并入主站后，puku 根路径变成跳转占位页（view.html → location.replace 到 www）——
//    web-view 里跳到未加白的域名，微信直接报「不支持打开 …」。故此处必须指向**不会跳转**的真身：
//    www.puyouquan.com 首页即搜索型谱库。业务域名白名单需同时含 www / puku（卡片链观看页在 puku）。
// v60.1：先换静默登录票据再喂 src，落地即登录态（换票失败自动回落直开，不阻塞看谱）。
const { enterUrl, pubIdFrom } = require('../../utils/login');
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
    if (id) { wx.redirectTo({ url: '/pages/score/score?id=' + id }); return; }
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
  onMsg(e) {  // 网页 postMessage 上报的谱 ID+标题（微信在分享/后退时才送达；用于补卡片标题）
    const list = (e.detail && e.detail.data) || [];
    const last = list[list.length - 1] || {};
    if (last.pubId) this.pubId = String(last.pubId).replace(/[^A-Za-z0-9_-]/g, '');
    if (last.title) this.pubTitle = String(last.title).slice(0, 30);
  },
  onShareAppMessage(e) {
    /* v60.79 直达修正（产品报告：好友点开不是谱的直达链接）：
       以 webViewUrl（微信在分享时给的 web-view 当前地址）为准解析谱 ID。
       此前只认网页 postMessage 的 pubId，而网页端从没发过这条消息——
       于是从谱库点进谱再分享，好友打开的永远是谱库首页而不是那首谱。 */
    const id = pubIdFrom(e && e.webViewUrl) || pubIdFrom(this.curUrl) || this.pubId || '';
    if (id) {
      const t = (this.pubId === id && this.pubTitle) ? this.pubTitle : '给你分享一首谱';
      return { title: t + ' - 谱友圈', path: '/pages/score/score?id=' + id };
    }
    return { title: '谱友圈谱库 · 在线看谱/移调/跟谱', path: '/pages/index/index' };
  },
  /* v60.79 朋友圈分享。此前注释记的是「web-view 页面不支持分享到朋友圈」——不准确：
     不支持的是朋友圈**单页模式渲染** web-view，分享入口本身可以点亮（showShareMenu +
     本函数），单页模式由 onLoad 的原生占位页兜底。注意 onShareTimeline 没有参数，
     拿不到 webViewUrl，谱 ID 只能取 bindload 记下的 curUrl。 */
  onShareTimeline() {
    const id = pubIdFrom(this.curUrl) || this.pubId || '';
    const t = (id && this.pubId === id && this.pubTitle) ? this.pubTitle + ' - 谱友圈' : '谱友圈谱库 · 在线看谱/移调/跟谱';
    return id ? { title: t, query: 'id=' + id } : { title: t };
  },
});
