// 看谱页：分享卡片/扫码进入 → 直达指定发布谱。
// 直接开 puku 的观看页 kanpu.html（同域、不跳转）；不用 /pub/:id SSR 落地页——那是给爬虫的，
// 真人要等 1.2s 再 location.replace，web-view 里白等一次跳转。无 id 时回落主站谱库首页。
// v60.1：同样先换静默登录票据，进来就是登录态（收藏/谱架能直接用）。
const { enterUrl, pubIdFrom } = require('../../utils/login');

Page({
  data: { src: '', spa: false },
  onLoad(q) {
    const id = String((q && q.id) || '').replace(/[^A-Za-z0-9_-]/g, '');
    this.id = id;
    /* v60.79 朋友圈单页模式（scene 1154）：web-view 不可用，原生占位页兜底；
       顶部微信自带「前往小程序」，点击后以完整模式重开本页（id 原样带回）。 */
    const scene = (wx.getEnterOptionsSync ? wx.getEnterOptionsSync() : wx.getLaunchOptionsSync()).scene;
    if (scene === 1154) { this.setData({ spa: true }); return; }
    wx.showShareMenu({ withShareTicket: false, menus: ['shareAppMessage', 'shareTimeline'] });   // v60.79 点亮朋友圈
    const target = id ? ('https://puku.puyouquan.com/kanpu.html?pub=' + id) : 'https://www.puyouquan.com/';
    enterUrl(target).then(src => this.setData({ src }));
  },
  /* v60.79 用户可能在 web-view 里又点开了别的谱——跟着落地地址更新，分享永远指向正在看的这首 */
  onWvLoad(e) { const nid = pubIdFrom(e.detail && e.detail.src); if (nid) this.id = nid; },
  onMsg(e) {  // 网页 postMessage 上报的谱 ID+标题（分享/后退时送达；补卡片标题）
    const list = (e.detail && e.detail.data) || [];
    const last = list[list.length - 1] || {};
    if (last.pubId) this.pubId = String(last.pubId).replace(/[^A-Za-z0-9_-]/g, '');
    if (last.title) this.pubTitle = String(last.title).slice(0, 30);
  },
  onShareAppMessage(e) {
    const id = pubIdFrom(e && e.webViewUrl) || this.id;   /* v60.79 以 web-view 当前地址为准 */
    if (id) {
      const t = (this.pubId === id && this.pubTitle) ? this.pubTitle : '给你分享一首谱';
      return { title: t + ' - 谱友圈', path: '/pages/score/score?id=' + id };
    }
    return { title: '谱友圈谱库', path: '/pages/index/index' };
  },
  onShareTimeline() {   /* v60.79 朋友圈卡片：本页 + id，单页模式由占位页兜底 */
    const id = this.id || '';
    const t = (id && this.pubId === id && this.pubTitle) ? this.pubTitle + ' - 谱友圈' : '谱友圈 · 在线曲谱';
    return id ? { title: t, query: 'id=' + id } : { title: t };
  },
});
