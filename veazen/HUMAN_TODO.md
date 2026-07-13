# Human TODO（只有人能做的事）

> 唯一权威清单（README 只保留指针）。完成一项就把 `[ ]` 改成 `[x]` 并注明日期。

## 部署相关（当前批次）

- [x] **仓库迁移**（2026-07-12）：已转移到组织 `veazen`，改名
      `Veazen-Code`，并设为**私有**；Claude 的 GitHub 应用已授权 veazen
      组织（All repositories）。
      ⚠️ 首次连接 Railway 时需授权 GitHub 访问 veazen 组织——私有仓库
      授权后才会出现在 Railway 的仓库列表里。
- [x] API 部署完成（2026-07-12）：`api.veazen.app/api/v1/health` 返回 ok。
      落地备忘：Neon 用不带 -pooler 的直连串；Railway 需显式设 `PORT=4000`；
      Cloudflare 的 api 记录保持灰云（DNS only）；Railway 封锁出站 SMTP
      端口（表现为 Connection timeout），告警邮件已改走 Resend HTTP API
      （复用 SMTP_PASS 里的 re_ 密钥，无需新变量）
- [x] 验证页部署完成（2026-07-12）：verify.veazen.app 上线，Railway 已升级
      Hobby；web 服务同样显式设 `PORT=3000`
- [x] 第 6 步三项确认全部通过（2026-07-12）：官网 waitlist 表单真实入库 ✓、
      品牌账号注册 ✓、API key 生成 ✓（截图泄露的两把 key 待吊销，见下）
- [ ] 吊销截图中泄露的 API key（vz_CZSZYYF5…、vz_0VF1RZY4…），重新生成
      并只存密码管理器
- [x] UptimeRobot 已添加 health 监控（2026-07-12，5 分钟间隔）
- [x] Redis 迁移至 Railway 内网（2026-07-13）：Upstash 免费版 50 万条/月
      被 BullMQ 轮询耗尽 → API 宕机；现用 railway.internal 单 s 连接串，
      无命令数限制；Upstash 旧库可删
- [x] PART2 三项收尾完成（2026-07-12）：Resend 发件域已验证（DKIM/SPF/
      DMARC 全绿，SMTP 变量已配）、MaxMind GeoIP 已装载（日志
      `GeoLite2-City ready`）、ANONYMIZE_IP 已开启
      （告警邮件的实弹验证留到演示商店阶段：同一码刮两次应收到邮件）
- [x] **ANONYMIZE_IP 决策记录**：选择 `true`，日期 `2026-07-12`，
      理由：可能被欧盟消费者扫码，GDPR 下最稳妥默认值；国家级定位与
      风控不受影响，待正式隐私政策法务审核后按律师意见复核
- [x] 生产 `MASTER_KEY` 已生成并离线备份两份（2026-07-12，用户确认）

## 账号 / 商务（既有清单）

- [x] 域名 veazen.app 注册 + Cloudflare NS + 官网上线（Workers 静态资产部署）
- [x] 官网接入 Cloudflare Git 自动部署（2026-07-12）：Workers 项目
      `veazen-site` 连接 `Veazen-Code` 仓库（根目录 veazen/apps/marketing），
      推 main 自动构建上线；`veazen.app` 域名已从旧临时页切到新项目
- [x] GitHub 组织 `veazen` 创建
- [x] Neon / Upstash / Railway 账号注册
- [ ] WordPress.org 账号（用户名 `veazen`）——申请中，等批复
- [ ] 演示商店：WP 主机（$5-15/月）→ demo.veazen.app 装 WooCommerce + 插件
      （保姆级手册已就绪：`docs/DEMO_STORE_GUIDE_zh.md`，2026-07-13）
- [ ] 4–6 字符超短 QR 跳转域选购；商标下证后防御性注册 veazen.net/.io
- [ ] 商标：VEAZEN（第 9、42 类），律师检索要点见 PROJECT_PLAN §12
- [ ] Stripe：法律名 VEAZEN LLC，公开业务名 VEAZEN
- [ ] 加州 foreign qualification + BOI 申报确认（如实际运营地在加州）
- [ ] GDPR 隐私政策与 DPA 法务审核（覆盖 device_fp 与跨租户风控）
- [ ] 第三方渗透测试采购（上线前）
- [ ] SOC 2 Type II 流程启动
- [ ] GS1 会员注册（GTIN 能力）
- [ ] 印刷厂合作认证商务谈判（Phase 5）；NFC 芯片供应链（Phase 5）
- [ ] 行业报告发布前法务复核
