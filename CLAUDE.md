# veazen 项目背景（CLAUDE.md）

> **用户是编程新手**，请始终用中文、用通俗语言沟通，操作步骤要具体到"点哪个按钮"。

## 项目是什么

veazen —— 商品防伪验证 SaaS 平台。消费者扫码/刮码验证真伪，品牌方通过控制台管理产品、批次和防伪码，另有 WordPress/WooCommerce 插件供商家集成。

- 仓库：`veazen/Veazen-Code`（**私有**；2026-07-12 从 `duyuanping9798/My-claude-code-project` 转移到 veazen 组织，同日改名为 Veazen-Code，旧地址均自动跳转）
- 主项目代码全部在 `veazen/` 子目录（Turborepo monorepo）
- 详细规格看 `veazen/PROJECT_PLAN.md`，架构看 `veazen/docs/ARCHITECTURE.md`

## 仓库结构

```
veazen/
  apps/api        NestJS API（Prisma + PostgreSQL RLS + BullMQ + Redis）
  apps/web        Next.js 消费者验证页 + 品牌控制台（i18n×5）
  apps/marketing  Astro 官网（含 waitlist 表单，mailto 降级）
  apps/wp-plugin  WordPress 插件（PHP，PHPCS 0 错误）
  packages/       crypto（信封加密）、shared 等公共包
  infra/          Dockerfile×2、deploy-boot（启动时自动迁移）、R2/S3 存储驱动
  docs/           ARCHITECTURE、DEPLOY_GUIDE_zh（部署手册）、PART2
  HUMAN_TODO.md   用户待办清单（Railway/Cloudflare 等人工步骤）
.github/workflows/veazen-ci.yml   CI（注意：node 检查前必须先 prisma generate）
```

## 已完成（Phase 0 → 4a 全部完成，CI 全绿）

1. Phase 0：monorepo 脚手架 + CI + 文档
2. Phase 1：数据库 Schema/RLS/种子、JWT+API Key 双认证、产品/批次/码生成（BullMQ）、公开验证+刮码状态机、风控规则、Webhook、审计日志、Merkle 摘要、OpenAPI；e2e + 500rps 压测通过
3. Phase 2：消费者验证页（三态、GS1、Lite 码）、官网 v1 + waitlist、控制台五页面；Playwright e2e 通过
4. Phase 3：WP 插件全套（凭据加密、产品同步、批次申请、订单绑定、前台组件、看板 Widget、i18n POT、打包脚本）
5. Phase 4a：S3/R2 存储驱动、生产 Dockerfile、boot 迁移、部署手册 v2 + PART2、生产加固
6. 仓库清理：已删除测试项目 `dice_game/` 及其 CI 工作流，根 README 改为 veazen 项目介绍
7. 品牌 LOGO 接入官网（`apps/marketing/public/brand/`），官网已改为 Cloudflare Workers Builds 自动部署（推 main 自动上线 veazen.app，Worker 项目名 `veazen-site`）
8. 官网中英双语（/zh/ + 语言建议条）；WP 插件简体中文翻译（107 条）
9. 演示商店上线（EasyWP + WooCommerce + 插件），2026-07-13 实弹演习五项全过（扫码/刮码/二次核销警示/告警邮件/GeoIP）；告警邮件走 Resend HTTP API（Railway 封 SMTP）且已中文化
10. 中小企业套件**第一批（M2+M3 退货全流程）交付**（2026-07-13）：retired/refurbished 状态机、rma/release/relabel 接口、控制台 /dashboard/returns 核验台、Settings 显示策略开关、插件「退货核验」区块、lite_duplicate_scan 规则、邮件分级（仅 critical 发信）——方案与批示见 `veazen/docs/SME_SUITE_PLAN_zh.md`

## 生产环境（2026-07-12 全量上线）

- 官网 veazen.app：Cloudflare Workers Builds 自动部署（推 main 即上线）
- API api.veazen.app：Railway（Hobby 套餐），Neon 直连串（无 -pooler）+
  **Railway 内网 Redis**（redis://…railway.internal，单 s 无 TLS——2026-07-13
  从 Upstash 迁来：免费版 50 万条/月被 BullMQ 轮询耗尽导致宕机）+ R2；
  显式 `PORT=4000`；Resend 走 HTTP API、MaxMind GeoIP、ANONYMIZE_IP=true；
  UptimeRobot 监控 health
- 验证页/控制台 verify.veazen.app：Railway，显式 `PORT=3000`
- Cloudflare DNS：api/verify 两条 CNAME 均为灰云（DNS only），橙云会挡
  Railway 域名验证；Railway 部署经验教训见 `veazen/HUMAN_TODO.md` 备忘

## 待办（按优先级）

1. **第一批实操验收**：用户用真码在控制台 Returns 页走一遍释放/翻新流程
   （插件需更新到新版 zip：停用删除旧版→上传新包→重连 API key）
2. **企业版路线图 E1~E6**（PD-004，`veazen/docs/PRODUCT_DECISIONS_zh.md`）：
   权限体系+仓库账号+摄像头扫码 → 码段工坊 → 分销管理 → 产品批量导入 →
   自定义域名落地页 → PWA。**等老板批示 E1 开工时机与 E2/E3 先后**
3. 用户吊销聊天截图中泄露的两把 API key 并重新生成（HUMAN_TODO 有记录）
4. **韧性加固**：Redis 断连时 API 应降级运行（验证页可用、队列重连），
   而非整体崩溃——2026-07-13 Upstash 配额事故暴露，待排期
5. WordPress.org 账号等批复；设置页等 UI 细节持续精修

## 工作约定

- 提交信息用 conventional commits（feat:/fix:/chore:），正文可中文
- 每阶段完成都要跑验收（turbo test/lint/typecheck、e2e），CI 绿了才算完成
- 重要改动先跑本地验收再推送；CI 里 node 检查前必须 `prisma generate`
- 用户的人工步骤统一记录到 `veazen/HUMAN_TODO.md`
