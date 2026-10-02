// v60.3 一键登录页；v60.85 过审整改（1.1.3 两条驳回）：
//   ① 协议由「登录即同意」改为**默认不勾的勾选框**——未勾选时 open-type 按钮不渲染
//      （渲染了点击就直接弹授权=默认同意），点普通按钮只提示；短信通道同样把关。
//   ② 按钮文案去「微信」字样（混淆腾讯官方元素），按审核指引改「手机号快捷登录」。
//   ③ 《用户协议》《隐私政策》此前只复制链接打不开正文，重审必再挨——现走 pages/web
//      在小程序内打开 site 的 terms.html / privacy.html（站内域名白名单内）。
// 为什么用手机号（getPhoneNumber）而不是头像昵称授权：本站账号以**手机号唯一**，
// 拿到真实手机号即可与网页短信登录合并成同一个账号，不依赖开放平台 unionid，
// 也不受「用户先在哪一端注册」影响。wx.getUserProfile 早已返回匿名数据，拿不到真昵称。
// 前提（小程序后台）：非个人主体 + 已认证 + 开通「手机号快速验证」（微信付费能力，有免费额度）。
const { phoneLogin, mergeAccount, API } = require('../../utils/login');

Page({
  data: { busy: false, err: '', agreed: false },
  toggleAgree() { this.setData({ agreed: !this.data.agreed, err: '' }); },
  needAgree() { wx.showToast({ title: '请先阅读并同意《用户协议》与《隐私政策》', icon: 'none' }); },
  onPhone(e) {
    const d = e.detail || {};
    if (!d.code) {                       // 用户点了「拒绝」，或基础库过低 / 未开通该能力
      const denied = d.errMsg && d.errMsg.indexOf('deny') >= 0;
      this.setData({ err: denied ? '' : '快捷登录当前不可用，可用下方「手机号验证码登录」' });
      return;
    }
    this.setData({ busy: true, err: '' });
    phoneLogin(d.code).then(ok => {
      this.setData({ busy: false });
      /* 失败多为小程序后台未开通「手机号快速验证」（付费能力）或额度用尽——
         不让用户卡死在这里，直接指向等价的短信登录 */
      if (!ok) { this.setData({ err: '快捷登录暂不可用，请用下方「手机号验证码登录」' }); return; }
      const go = () => wx.redirectTo({ url: '/pages/index/index' });
      /* v62.6：之前在小程序里用过一个没绑手机号的账号、里面有内容——问用户要不要并过来（不替用户做主） */
      const mg = ok.merge;
      if (!mg || !mg.token) return go();
      const parts = [mg.scores ? mg.scores + ' 首曲谱' : '', mg.marks ? mg.marks + ' 条收藏/谱架记录' : '', mg.paid ? '已开通的权益' : ''].filter(Boolean).join('、');
      wx.showModal({
        title: '发现之前的小程序账号',
        content: '你之前在小程序里用过一个没有绑定手机号的账号，里面有' + (parts || '一些内容') + '。要合并到当前手机号账号吗？不合并的话，那些内容会留在旧账号里。',
        confirmText: '合并', cancelText: '暂不',
        success: r => {
          if (!r.confirm) return go();
          mergeAccount(mg.token).then(done => {
            wx.showToast({ title: done ? '已合并到当前账号' : '合并失败，可稍后联系客服', icon: done ? 'success' : 'none' });
            setTimeout(go, 900);
          });
        },
        fail: go,
      });
    });
  },
  /* 短信验证码登录：进 web-view 打开网页端个人中心，那里就是完整的手机号登录卡。
     登录后 Cookie 落在 webview 里，回首页继续看谱即已登录——与一键登录殊途同归。
     同样要求先勾选协议——这条通道也是本页提供的登录入口，规则一体适用。 */
  onSms() {
    if (!this.data.agreed) { this.needAgree(); return; }
    try { wx.setStorageSync('pyq_skip', 1); } catch (_) {}   // 走过这条路就别再拦首页
    wx.redirectTo({ url: '/pages/web/web?u=' + encodeURIComponent(API + '/me.html') });
  },
  onSkip() {
    try { wx.setStorageSync('pyq_skip', 1); } catch (_) {}   // 本次安装内不再拦截，避免每次启动都挡路
    wx.redirectTo({ url: '/pages/index/index' });
  },
  /* v60.85 协议正文在小程序内打开（此前只复制链接——审核员点不开正文过不了审） */
  onTos() { this.open(API + '/terms.html'); },
  onPri() { this.open(API + '/privacy.html'); },
  open(u) { wx.navigateTo({ url: '/pages/web/web?u=' + encodeURIComponent(u) }); },
});
