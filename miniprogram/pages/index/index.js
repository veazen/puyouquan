// 首页：web-view 直载谱库（业务域名须在小程序后台配置 puku.puyouquan.com 并放校验文件）
Page({
  data: { src: 'https://puku.puyouquan.com/' },
  onMsg(e) {  // 网页可 postMessage 上报当前浏览的谱（用于分享卡片带谱直达）
    const list = (e.detail && e.detail.data) || [];
    const last = list[list.length - 1] || {};
    if (last.pubId) this.pubId = String(last.pubId).replace(/[^A-Za-z0-9_-]/g, '');
    if (last.title) this.pubTitle = String(last.title).slice(0, 30);
  },
  onShareAppMessage() {
    if (this.pubId) return { title: (this.pubTitle || '曲谱') + ' - 谱友圈谱库', path: '/pages/score/score?id=' + this.pubId };
    return { title: '谱友圈谱库 · 在线看谱/移调/跟谱', path: '/pages/index/index' };
  },
  onShareTimeline() { return { title: '谱友圈谱库 · 在线看谱/移调/跟谱' }; },
});
