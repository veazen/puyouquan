// 看谱页：分享卡片/扫码进入 → 直达指定发布谱（SSR 落地页自动转在线观看）
Page({
  data: { src: 'https://puku.puyouquan.com/' },
  onLoad(q) {
    const id = String((q && q.id) || '').replace(/[^A-Za-z0-9_-]/g, '');
    this.id = id;
    if (id) this.setData({ src: 'https://puku.puyouquan.com/pub/' + id });
  },
  onShareAppMessage() {
    if (this.id) return { title: '给你分享一首谱 - 谱友圈', path: '/pages/score/score?id=' + this.id };
    return { title: '谱友圈谱库', path: '/pages/index/index' };
  },
});
