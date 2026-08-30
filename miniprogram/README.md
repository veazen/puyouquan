# 谱友圈小程序（谱库壳 · v45.5，v60.0 修域名，v60.79 分享直达+朋友圈）

小程序定位：**看谱入口**（谱库浏览 / 看谱 / 分享带谱直达），制谱以网页为主。
实现：web-view 承载网页端（备案主体与小程序主体一致才能过审）。

## 页面指向（改动前先读）
| 页面 | src | 为什么是它 |
|---|---|---|
| `pages/index` | `https://www.puyouquan.com/` | 主站首页即搜索型谱库。**不能用 `puku.puyouquan.com/`**——v58.7 谱库并入主站后 puku 根是跳转占位页（`site/view.html`，`meta refresh` + `location.replace` 到 www），web-view 里一跳就撞白名单，报「不支持打开 https://www.puyouquan.com/」 |
| `pages/score` | `https://puku.puyouquan.com/kanpu.html?pub=ID` | 观看页真身，同域不跳转。**不用 `/pub/ID`**——那是给爬虫的 SSR 落地页，真人还要等 1.2s 再跳一次 |

小程序里 web-view **每一次跳转的落地域名**都必须在业务域名白名单里，跳到没加白的域名就是本页顶部那个报错。

## 微信一键登录（v60.3）
入口是独立的 `pages/login`——**`web-view` 会铺满整页且不支持覆盖原生组件**，登录按钮没法浮在谱库之上。

```
<button open-type="getPhoneNumber"> → code
  → POST /api/wx/mini/phone {code, loginCode}
      服务端用小程序 access_token 换真实手机号 → 按手机号找/建账号
      （顺带把 wx.login 拿到的 openid/unionid 绑上；已属他号则不抢占）→ 回 ticket
  → 存 pyq_enter → 跳首页 → web-view 落地即登录态
```

**为什么用手机号而不是头像昵称授权**：本站账号以**手机号唯一**，拿到真实手机号即可与网页短信登录
合并成同一个账号，不依赖开放平台 unionid，也不受「用户先在哪端注册」影响。
另外 `wx.getUserProfile` 自 2022-10 起只返回匿名数据（灰头像 +「微信用户」），拿不到真昵称。

**这个能力需要开通，且入口不一定看得到**：`getPhoneNumber` 是微信付费能力（有免费额度）。
开通入口在不同时期/不同主体下位置不一：**功能 → 手机号快速验证**、**开发管理 → 接口设置**、
或需先在微信开放社区申请；**多数情况要求小程序已发布上线**，开发中的号后台根本不显示该菜单。

**因此一键登录不是唯一通道，也不阻塞上线**：登录页第二个按钮「手机号验证码登录」
走 `pages/web` 打开网页端个人中心 `me.html`——那里本就是完整的短信验证码登录，
账号体系完全一致（同一套 `users` 表、同一个手机号主键）。一键登录失败时错误提示直接指向它。
`pages/web` 的 `u` 参数只接受站内域名，站外一律回落主站（防被诱导跳到仿冒页骗验证码）。

**v60.5 起不再开屏拦截**（方案 A）：进小程序直接进谱库。静默登录已给了可用账号，
缺的只是「绑真实手机号以便换设备接得上」，那用 `me.html` 顶部的提示横幅更合适；
且微信规范禁止「未使用服务前强制登录」，开屏拦截有驳回风险。
`pages/login` 保留不删——待「手机号快速验证」开通后，在 `pages/index` 恢复一行跳转即可重新接上。

## 静默登录（v60.1，一键登录的兜底）
小程序**读不到也写不了 web-view 的 Cookie**，所以走一次性换票，网页端零改动：

```
wx.login() → code
  → POST https://www.puyouquan.com/api/wx/mini/login {code}
      服务端 jscode2session 换 openid(+unionid) → upsertWxUser 建/认号 → 回 ticket（120s，用一次即焚）
  → <web-view src="…/api/wx/mini/enter?t=<ticket>&to=<目标页>">
      服务端校验并作废票据 → Set-Cookie pyq_token → 302 到目标页 → 落地即登录态
```

实现在 `utils/login.js` 的 `enterUrl(target)`；换票失败（网络差 / 未配 `WX_MINI_*` / 审核环境）自动回落直开目标页，
只是没有登录态，**不会白屏**。`to` 走站内域名白名单，站外一律回落主站（防开放重定向）。

要让小程序用户和网页微信登录**并成同一个账号**，需把小程序绑定到与网站应用/公众号**同一个开放平台账号**
——否则 `jscode2session` 不返回 unionid，只能按 openid 建号，会是两个独立账号。

## 上线步骤（需小程序管理员操作）
1. **确认主体不是「个人」**：个人主体小程序**不支持 web-view**，业务域名配了也无效，会一直报「不支持打开」。企业 / 个体工商户等非个人主体才可用。
2. **微信公众平台 → 小程序后台 → 开发 → 开发管理 → 开发设置 → 业务域名**，添加：
   - `www.puyouquan.com`（首页/谱库/个人中心，**必填**）
   - `puku.puyouquan.com`（观看页 kanpu.html，**必填**——首页卡片点开就到这里）
   - `zhipu.puyouquan.com`（可选；只有需要小程序内点进制谱器才加）
   每个域名后台会给一个校验文件（`xxxxxxxx.txt`）。**把这些 txt 提交到仓库 `muse-tab/site/` 根目录**，
   推送部署后即在 www / puku 根可访问；`deploy/publish.sh` 第 4 步会自动把 site 根级 txt（robots.txt 除外）
   复制一份到 zhipu 根，三个域名一次覆盖。部署完成再回后台点「校验」。
   > 备案通过 ≠ 业务域名已配置，这是两件事，必须单独做。
3. **服务器域名（request 合法域名）**：同一页 → **服务器域名 → request 合法域名**，添加 `https://www.puyouquan.com`。
   > 这和上一步的**业务域名是两个不同的设置项**：业务域名管 `web-view` 能打开哪些网页，
   > request 合法域名管 `wx.request` 能请求哪些接口。静默登录要调 `/api/wx/mini/login`，所以两个都得配。
4. **（可选）开通手机号快速验证**：一键登录用得上，但**不是上线必需**——没开通时用户走「手机号验证码登录」按钮，
   体验只差一步输验证码。入口见上文说明，多数要求小程序已发布才显示。
5. **后端凭据**：服务器 `/etc/puyouquan/api.env` 里加两行（小程序后台 → 开发管理 → 开发设置 → AppID/AppSecret），
   然后 `sudo systemctl restart pyq-api`：
   ```
   WX_MINI_APPID=wx********
   WX_MINI_SECRET=********
   ```
   验证：`curl -s https://www.puyouquan.com/api/health` 里 `"wx_mini":true` 即已生效（未配时为 false，
   登录接口返回 503，小程序自动回落到不登录直接看谱）。
6. **微信开发者工具**：导入本 `miniprogram/` 目录，`project.config.json` 里填入小程序 AppID。
7. 预览真机验证 → 上传体验版 → 提交审核（类目建议：教育-在线教育 或 工具-信息查询）。

> 开发者工具里调试时可临时勾选「不校验合法域名」，但真机/体验版仍以后台白名单为准——
> **工具里能开、手机上打不开**，基本都是白名单没配或校验文件没落位。

## 分享（v60.79 重做——产品报告：好友点开不是谱的直达链接、无法分享到朋友圈）
**发送给朋友（直达修正）**：此前分享直达依赖网页 `postMessage` 上报 pubId，而网页端从没发过
这条消息——从谱库点进谱再分享，好友打开的永远是谱库首页。现在两页的 `onShareAppMessage(e)`
以微信给的 **`e.webViewUrl`（web-view 当前地址）为准**解析谱 ID（`utils/login.js` 的 `pubIdFrom`：
认 `kanpu.html?pub=ID`、`/pub/ID`、enter 换票链接的 `to=` 参数），再落到
`/pages/score/score?id=ID`——不依赖网页配合，用户在 web-view 里点到哪首分享的就是哪首。
网页端（v60.79 起 `wxShareCard`）在小程序环境下会补发 `wx.miniProgram.postMessage({pubId,title})`，
只用来给卡片补**歌名标题**（消息在分享/后退时才送达，ID 不靠它）。

**分享到朋友圈**：两页均实现 `onShareTimeline`（无参数，谱 ID 取 `bindload` 记下的当前地址）
并在 onLoad `wx.showShareMenu({menus:['shareAppMessage','shareTimeline']})` 点亮入口。
朋友圈卡片以「本页+query」重开：看谱页带 `id=` 直达；首页收到 `id=` 时 redirectTo 看谱页。
⚠️ 朋友圈点开先进**单页模式**（scene 1154），该模式**不支持 web-view**——两页检测到 1154 就渲染
原生占位页（歌名+「点击上方『前往小程序』查看完整曲谱」），微信自带的「前往小程序」按钮会以
完整模式重开本页、query 原样带回，随后正常进 web-view。
**改完必须重新上传并发布小程序新版本才生效**；旧版本的「分享到朋友圈」按钮保持灰色是正常的。

## 说明
- 支付合规：小程序内**不做虚拟支付**（iOS 禁止）；会员购买入口只在网页端。
