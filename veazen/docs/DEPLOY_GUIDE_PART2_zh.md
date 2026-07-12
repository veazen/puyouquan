# Veazen 上线补充手册 PART 2（上线后 30 分钟内完成）

> 前提：已按 DEPLOY_GUIDE_zh.md v2 完成部署，`api.veazen.app/api/v1/health`
> 返回 ok。本手册补三件事：①告警邮件 ②扫码地理定位 ③IP 隐私开关。
> 三件都是"不配也能跑，但配了才完整"——各自的降级行为已写明。

---

## ① 告警邮件（Resend，15 分钟）

**不配置会怎样**：风控告警（重复核销、异地扫码等）依然会进控制台 Alerts
页和 Webhook，但**邮件通知不会发出**（系统只在内部日志记录，不报错）——
你必须主动看控制台才知道出事。建议尽快配置。

### 1. 注册并验证发件域

1. 打开 **resend.com** → Sign Up（用 hello@veazen.app）。
2. 左侧 **Domains** → **Add Domain** → 填 **`veazen.app`** → 区域随意。
3. 页面会给出 **3 条 DNS 记录**（通常：2 条 TXT + 1 条 MX，或含 DKIM 的
   CNAME/TXT，以页面显示为准）。逐条抄到 Cloudflare：
   - Cloudflare → `veazen.app` → DNS → 添加记录；
   - **类型、名称、内容**三项严格照抄 Resend 页面（名称只填子域部分，
     比如 Resend 显示 `resend._domainkey.veazen.app` 时名称填
     `resend._domainkey`）；
   - 这几条记录**橙云关闭**（灰色云朵，DNS only）。
4. 回 Resend 点 **Verify DNS Records**，几分钟内全部变绿 ✅。
5. （推荐）再加一条 DMARC：Cloudflare DNS 添加 TXT，名称 `_dmarc`，内容
   `v=DMARC1; p=none; rua=mailto:hello@veazen.app`。

### 2. 拿 SMTP 凭据并配置 Railway

1. Resend 左侧 **API Keys** → **Create API Key**（权限 Full access 或
   Sending access）→ 复制 `re_` 开头的密钥（只显示一次）。
2. Railway → **api 服务** → Variables → 追加四条：
   ```
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=587
   SMTP_USER=resend
   SMTP_PASS=【re_ 开头的 API Key】
   ```
3. 保存后 Railway 自动重启。验证：控制台里任意触发一条告警（比如对同一个
   码连续核销两次暗码），hello@veazen.app 应收到告警邮件。

## ② 扫码地理定位（MaxMind GeoIP，10 分钟）

**不配置会怎样**：扫码记录没有国家/城市信息；控制台的地理分布为空；
风控三规则中的"异地飞行"（geo_velocity）和"窜货检测"（out_of_market）
**静默不生效**（不报错，只是永远不触发）。防伪产品的核心卖点之一，建议配置。

1. 打开 **maxmind.com** → 顶部 **GeoLite2 Free** →
   **Sign up for GeoLite2**（免费，注册用 hello@veazen.app）。
2. 登录后 → 左侧 **Manage License Keys** → **Generate new license key** →
   名字随意（如 `veazen-prod`）→ 复制生成的 License Key（只显示一次）。
3. Railway → api 服务 → Variables → 追加一条：
   ```
   MAXMIND_LICENSE_KEY=【License Key】
   ```
4. 保存后自动重启。服务器**每次启动会自动下载最新的地理数据库**
   （日志里能看到 `[boot] GeoLite2-City ready`）；下载失败也不影响启动，
   只是继续没有地理数据。
5. 验证：手机扫任意一个测试码后，控制台 Overview 的国家分布出现数据。

> 自托管（docker compose）场景：也可以手动下载 `GeoLite2-City.mmdb`
> 挂载进容器，并设置 `GEOIP_DB_PATH=/路径/GeoLite2-City.mmdb`——
> 设了此变量就不会再自动下载。

## ③ IP 隐私开关 ANONYMIZE_IP（2 分钟，需要你拍板）

**这是什么**：每次扫码会记录来源 IP 用于风控。开关打开后，系统只存
**截断后的 IP**（IPv4 去掉最后一段），个人不可识别，但城市级地理定位精度
略降（国家级不受影响，风控规则照常工作）。

**建议**：只要产品可能被欧盟消费者扫码（跨境电商几乎必然），**设为 true**
——这是 GDPR 下最稳妥的默认值，等正式隐私政策法务审核后再按律师意见调整。

操作：Railway → api 服务 → Variables → 追加：
```
ANONYMIZE_IP=true
```
并在 HUMAN_TODO.md 的决策记录行写上你的选择和日期。

## 常见问题

| 现象 | 处理 |
|---|---|
| Resend 域名验证一直不绿 | Cloudflare 里那几条记录的橙云必须是灰色（DNS only）；等 10 分钟再 Verify |
| 收不到告警邮件 | 先查垃圾箱；再查 Railway 日志有无 `alert email ... failed`；SMTP_PASS 是否完整 |
| 日志出现 `GeoIP unavailable (HTTP 401)` | License Key 抄错或过期，MaxMind 后台重新生成一个 |
| 想确认地理库已加载 | Deployments 日志找 `[boot] GeoLite2-City ready` |
