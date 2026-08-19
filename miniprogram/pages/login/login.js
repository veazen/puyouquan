// v60.3 微信一键登录页。
// 为什么用手机号（getPhoneNumber）而不是头像昵称授权：本站账号以**手机号唯一**，
// 拿到真实手机号即可与网页短信登录合并成同一个账号，不依赖开放平台 unionid，
// 也不受「用户先在哪一端注册」影响。wx.getUserProfile 早已返回匿名数据，拿不到真昵称。
// 前提（小程序后台）：非个人主体 + 已认证 + 开通「手机号快速验证」（微信付费能力，有免费额度）。
const { phoneLogin, API } = require('../../utils/login');

Page({
  data: { busy: false, err: '' },
  onPhone(e) {
    const d = e.detail || {};
    if (!d.code) {                       // 用户点了「拒绝」，或基础库过低 / 未开通该能力
      const denied = d.errMsg && d.errMsg.indexOf('deny') >= 0;
      this.setData({ err: denied ? '' : '一键登录当前不可用，可用下方「手机号验证码登录」' });
      return;
    }
    this.setData({ busy: true, err: '' });
    phoneLogin(d.code).then(ok => {
      this.setData({ busy: false });
      /* 失败多为小程序后台未开通「手机号快速验证」（付费能力）或额度用尽——
         不让用户卡死在这里，直接指向等价的短信登录 */
      if (!ok) { this.setData({ err: '一键登录暂不可用，请用下方「手机号验证码登录」' }); return; }
      wx.redirectTo({ url: '/pages/index/index' });
    });
  },
  /* 短信验证码登录：进 web-view 打开网页端个人中心，那里就是完整的手机号登录卡。
     登录后 Cookie 落在 webview 里，回首页继续看谱即已登录——与一键登录殊途同归。 */
  onSms() {
    try { wx.setStorageSync('pyq_skip', 1); } catch (_) {}   // 走过这条路就别再拦首页
    wx.redirectTo({ url: '/pages/web/web?u=' + encodeURIComponent(API + '/me.html') });
  },
  onSkip() {
    try { wx.setStorageSync('pyq_skip', 1); } catch (_) {}   // 本次安装内不再拦截，避免每次启动都挡路
    wx.redirectTo({ url: '/pages/index/index' });
  },
  onTos()  { this.open('https://www.puyouquan.com/'); },
  onPri()  { this.open('https://www.puyouquan.com/'); },
  open(u)  { wx.setClipboardData({ data: u, success: () => wx.showToast({ title: '链接已复制', icon: 'none' }) }); },
});
