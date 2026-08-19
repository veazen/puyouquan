// v60.3 微信一键登录页。
// 为什么用手机号（getPhoneNumber）而不是头像昵称授权：本站账号以**手机号唯一**，
// 拿到真实手机号即可与网页短信登录合并成同一个账号，不依赖开放平台 unionid，
// 也不受「用户先在哪一端注册」影响。wx.getUserProfile 早已返回匿名数据，拿不到真昵称。
// 前提（小程序后台）：非个人主体 + 已认证 + 开通「手机号快速验证」（微信付费能力，有免费额度）。
const { phoneLogin } = require('../../utils/login');

Page({
  data: { busy: false, err: '' },
  onPhone(e) {
    const d = e.detail || {};
    if (!d.code) {                       // 用户点了「拒绝」或基础库过低
      this.setData({ err: d.errMsg && d.errMsg.indexOf('deny') >= 0 ? '' : '当前微信版本不支持一键登录，可先随便看看' });
      return;
    }
    this.setData({ busy: true, err: '' });
    phoneLogin(d.code).then(ok => {
      this.setData({ busy: false });
      if (!ok) { this.setData({ err: '登录未成功，请稍后重试，或先随便看看' }); return; }
      wx.redirectTo({ url: '/pages/index/index' });
    });
  },
  onSkip() {
    try { wx.setStorageSync('pyq_skip', 1); } catch (_) {}   // 本次安装内不再拦截，避免每次启动都挡路
    wx.redirectTo({ url: '/pages/index/index' });
  },
  onTos()  { this.open('https://www.puyouquan.com/'); },
  onPri()  { this.open('https://www.puyouquan.com/'); },
  open(u)  { wx.setClipboardData({ data: u, success: () => wx.showToast({ title: '链接已复制', icon: 'none' }) }); },
});
