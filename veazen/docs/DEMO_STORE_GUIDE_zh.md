# Veazen 演示商店手册（demo.veazen.app，零基础版）

> 目标：租一个 WordPress 主机 → 搭 WooCommerce 演示店 → 装 veazen 插件 →
> 完成第一次"生成码 → 扫码 → 刮码 → 告警邮件"的完整实弹演习。
> 预计 1.5～2 小时（多数是等待），花费约 $5～15/月（主机）。
>
> 前提：云端已全部上线（API/验证页/邮件/GeoIP，2026-07-12 完成 ✅）。
> 遇到界面对不上：截图发 Claude（记得遮住密钥）。

## 第 1 步：租 WordPress 主机（15 分钟）

选**海外主机**（国内主机需要 ICP 备案，演示站没必要折腾）。推荐 Hostinger
（便宜、界面简单、一键装 WP）；SiteGround、Bluehost 也可以，步骤大同小异。

1. 打开 **hostinger.com** → 选 **WordPress 主机**套餐（最低档足够）。
2. 结账（可能需要 Visa/Mastercard 或 PayPal）；数据中心选**美国**
   （和 Railway 的 API 同区，快一点）。
3. 按它的向导**一键安装 WordPress**：
   - 站点名称：`Veazen Demo`（随意，之后可改）
   - 管理员邮箱：hello@veazen.app
   - 管理员密码：密码管理器生成并保存
4. 装完先拿到一个临时网址（形如 `xxx.hostingersite.com`），能打开 WP 就行。

## 第 2 步：绑定 demo.veazen.app（10 分钟）

1. 主机后台找 **域名 / Domains → 添加域名**，填 `demo.veazen.app`。
2. 它会告诉你一条 DNS 记录（**A 记录 + 一个 IP**，或 CNAME + 目标）。
3. Cloudflare → veazen.app → **DNS** → **添加记录**：
   - 类型/内容照抄主机给的；**名称**只填 `demo`；**云朵灰色**（DNS only）。
4. 回主机后台点验证；等它自动签发 SSL 证书（几分钟～1 小时）。
5. 打开 **https://demo.veazen.app** 能看到 WP 站点即成功。

## 第 3 步：装 WooCommerce + 一件测试商品（15 分钟）

1. 打开 **demo.veazen.app/wp-admin** 登录后台。
2. 左侧 **插件 → 安装插件** → 搜索 **WooCommerce** → **安装** → **启用**。
3. 设置向导一路最简：店铺地址随意填、行业随意选、**推荐的附加插件全部跳过**。
4. 左侧 **产品 → 添加新产品**：
   - 名称 `演示咖啡豆 250g`，常规价格 `99`，点 **发布**。

## 第 4 步：安装 veazen 插件（5 分钟）

插件安装包 `veazen.zip` 由 Claude 打好提供（仓库内 `apps/wp-plugin` 运行
`npm run plugin:zip` 也能随时重新生成）。

1. WP 后台 → **插件 → 安装插件** → 顶部 **上传插件**。
2. 选择 `veazen.zip` → **现在安装** → **启用插件**。

## 第 5 步：连接云端（2 分钟）

1. 左侧菜单出现 **Veazen** → 点进去。
2. 在 API key 输入框粘贴你的 **`vz_` 开头密钥**（控制台
   verify.veazen.app/dashboard → Settings → API keys 生成的那把）→ 点连接。
3. 显示已连接即成功（凭据在数据库中加密存储；API 地址内置为
   api.veazen.app，无需配置）。

## 第 6 步：产品同步 + 生成防伪码（10 分钟）

1. Veazen 设置页点 **Sync products**：WooCommerce 商品同步到云端。
2. **Create batch（申请批次）**：
   - 产品选 `演示咖啡豆 250g`
   - 数量填 `50`
   - 类型选 **Bulk（工厂标签，含刮码）**
   - 提交
3. 打开 **verify.veazen.app/dashboard → Batches**：
   - 等批次状态变 **ready**（后台生成，约几十秒）
   - 点 **Activate all**（模拟"出厂激活"——没激活的码扫出来是"未激活"）
   - 点 **Export** 下载**一次性 CSV**（含序列号、刮码明文、QR 链接；
     只此一份，妥善保存）

## 第 7 步：实弹演习 🎯（15 分钟，见证时刻）

拿 CSV 第二行（第一行是表头）的 `serial`（序列号）和 `scratch`（刮码）：

1. **扫码验真**：手机浏览器打开 `https://verify.veazen.app/v/序列号`
   （正式产品上这一步是扫印刷的 QR 码）→ 出现**绿色"正品"页** ✅
2. **刮码核销**：在该页输入刮码（可以带横线、小写，系统自动归一化）→
   显示**已核销为正品** ✅
3. **模拟造假者**：再次输入**同一个刮码** → 黄色**"已被核销"警示** ✅
4. **验证告警链路**：
   - 控制台 **Alerts** 页出现严重告警 ✅
   - **hello@veazen.app 收到告警邮件**（Resend 链路实弹验证）✅
5. **验证地理链路**：控制台 **Overview** 的国家分布出现你的扫码记录
   （GeoIP 实弹验证）✅

五个 ✅ 全亮 = 产品完整闭环第一次真实跑通 🎉

## 第 8 步（可选进阶）：订单绑定

商店里下一单测试订单 → 订单详情页把防伪码绑定到订单（发货标签流程）。
详细操作见 `apps/wp-plugin/TESTING.md`。

## 常见问题

| 现象 | 处理 |
|---|---|
| 插件点连接报错 | key 是否 `vz_` 开头且完整；是否被吊销过；主机是否拦外网请求（让主机客服放行 api.veazen.app） |
| demo 域名打不开 | Cloudflare 记录云朵要灰色；等 10 分钟；确认主机侧域名已验证 |
| 扫码显示"未激活" | 回控制台 Batches 点 Activate all |
| 扫码显示"无效" | 序列号复制不完整；或批次还没 ready |
| 告警邮件没收到 | 先查垃圾箱；再查 Railway api 日志有无 `alert email ... failed` |

## 花费预期

- WP 主机：$5～15/月（演示用完可随时退订）
- 其余零花费（复用现有云端）
