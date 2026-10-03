// 看谱页：分享卡片/扫码进入 → 直达指定发布谱。
// 直接开 puku 的观看页 kanpu.html（同域、不跳转）；不用 /pub/:id SSR 落地页——那是给爬虫的，
// 真人要等 1.2s 再 location.replace，web-view 里白等一次跳转。无 id 时回落主站谱库首页。
// v60.1：同样先换静默登录票据，进来就是登录态（收藏/谱架能直接用）。
const { enterUrl, pubIdFrom, track } = require('../../utils/login');

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
    /* v63.4 A7：从好友卡片进来的带 f=mp，观看页据此记 share_open（渠道＝小程序） */
    const f = /^[a-z]{2,8}$/.test(String((q && q.f) || '')) ? q.f : '';
    const target = id ? ('https://puku.puyouquan.com/kanpu.html?pub=' + id + (f ? '&f=' + f : '')) : 'https://www.puyouquan.com/';
    enterUrl(target).then(src => this.setData({ src }));
  },
  /* v60.79 用户可能在 web-view 里又点开了别的谱——跟着落地地址更新，分享永远指向正在看的这首 */
  onWvLoad(e) { const nid = pubIdFrom(e.detail && e.detail.src); if (nid) this.id = nid; },
  onMsg(e) {  // 网页 postMessage 上报的分享素材（分享/后退时送达；补卡片标题/缩图）
    const list = (e.detail && e.detail.data) || [];
    const last = list[list.length - 1] || {};
    if (last.pubId) this.pubId = String(last.pubId).replace(/[^A-Za-z0-9_-]/g, '');
    if (last.title) this.pubTitle = String(last.title).slice(0, 30);
    /* v60.84 完整标题（歌名 - 演唱者 · 谱类）与谱面缩略图直链（只认谱库域，防外链） */
    if (last.share) this.pubShare = String(last.share).slice(0, 44);
    if (last.img && /^https:\/\/puku\.puyouquan\.com\//.test(String(last.img))) this.pubImg = String(last.img);
  },
  onShareAppMessage(e) {
    const id = pubIdFrom(e && e.webViewUrl) || this.id;   /* v60.79 以 web-view 当前地址为准 */
    /* v60.84 imageUrl 必设：不设时微信自动截屏 web-view 常得空白图（产品报告「截图丢失」）；
       优先网页报来的谱面缩略图，回落品牌方图。标题优先完整版（歌名 - 演唱者 · 谱类）。 */
    if (id) {
      const mine = this.pubId === id;
      const t = (mine && this.pubShare) || ((mine && this.pubTitle) ? this.pubTitle + ' - 谱友圈' : '给你分享一首谱 - 谱友圈');
      track('mp_share', id);
      return { title: t, path: '/pages/score/score?id=' + id + '&f=mp',
        imageUrl: (mine && this.pubImg) || 'https://www.puyouquan.com/share-icon.png' };
    }
    track('mp_share', 'home');
    return { title: '谱友圈谱库', path: '/pages/index/index',
      imageUrl: 'https://www.puyouquan.com/share-icon.png' };
  },
  /* 朋友圈（v60.84 实测修正）：微信对含 web-view 的页面整体禁分享朋友圈（菜单置灰
     「当前页面不可分享」），平台限制无法绕过；本函数与 1154 占位页保留待微信放开。
     朋友圈晒谱走观看页顶栏「分享卡」长按保存图片（含二维码）。 */
  onShareTimeline() {
    const id = this.id || '';
    const mine = !!id && this.pubId === id;
    const t = (mine && this.pubShare) || ((mine && this.pubTitle) ? this.pubTitle + ' - 谱友圈' : '谱友圈 · 在线曲谱');
    const r = id ? { title: t, query: 'id=' + id } : { title: t };
    r.imageUrl = (mine && this.pubImg) || 'https://www.puyouquan.com/share-icon.png';
    return r;
  },
});
