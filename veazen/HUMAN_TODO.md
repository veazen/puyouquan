# Human TODO（只有人能做的事）

> 唯一权威清单（README 只保留指针）。完成一项就把 `[ ]` 改成 `[x]` 并注明日期。

## 部署相关（当前批次）

- [ ] **仓库迁移**：GitHub 仓库转移到组织 `veazen` 并改名 `veazen`
      （Settings → Danger Zone → Transfer ownership）。
      ⚠️ 迁移后必须在 **Railway 重新授权 GitHub**（Railway → Account →
      Integrations → GitHub → Configure，勾选 veazen 组织）并在服务的
      Source 里**重连仓库**，否则自动部署会断。
- [ ] 按 DEPLOY_GUIDE_zh.md v2 完成 API / 验证页部署（分支一律 `main`）
- [ ] health 通过后在 **UptimeRobot** 添加
      `https://api.veazen.app/api/v1/health` 监控（5 分钟间隔，通知到 hello@）
- [ ] 按 DEPLOY_GUIDE_PART2_zh.md 完成 Resend（SPF/DKIM/DMARC）、
      MaxMind GeoIP、ANONYMIZE_IP 三项
- [ ] **ANONYMIZE_IP 决策记录**：选择 `______`（true/false），日期 `______`，
      理由：＿＿＿＿（建议 true，见 PART2 ③）
- [ ] 生产 `MASTER_KEY` 已生成并离线备份两份（丢失不可恢复）

## 账号 / 商务（既有清单）

- [x] 域名 veazen.app 注册 + Cloudflare NS + 官网上线（Workers 静态资产部署）
- [x] GitHub 组织 `veazen` 创建
- [x] Neon / Upstash / Railway 账号注册
- [ ] WordPress.org 账号（用户名 `veazen`）——申请中，等批复
- [ ] 演示商店：WP 主机（$5-15/月）→ demo.veazen.app 装 WooCommerce + 插件
      （等 API 上线 + Claude 给保姆级步骤）
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
