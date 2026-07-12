# veazen 项目背景（CLAUDE.md）

> **用户是编程新手**，请始终用中文、用通俗语言沟通，操作步骤要具体到"点哪个按钮"。

## 项目是什么

veazen —— 商品防伪验证 SaaS 平台。消费者扫码/刮码验证真伪，品牌方通过控制台管理产品、批次和防伪码，另有 WordPress/WooCommerce 插件供商家集成。

- 仓库：`veazen/veazen`（2026-07-12 从 `duyuanping9798/My-claude-code-project` 转移并改名而来，旧地址自动跳转）
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

## 待办（按优先级）

1. **陪用户走 Railway 部署**：按 `veazen/docs/DEPLOY_GUIDE_zh.md` 手册，用户在 Railway 重新授权 GitHub 时需选择 veazen 组织下的仓库。用户操作遇到界面对不上会发截图求助。
2. 部署后按手册 PART2 做验收检查。

## 工作约定

- 提交信息用 conventional commits（feat:/fix:/chore:），正文可中文
- 每阶段完成都要跑验收（turbo test/lint/typecheck、e2e），CI 绿了才算完成
- 重要改动先跑本地验收再推送；CI 里 node 检查前必须 `prisma generate`
- 用户的人工步骤统一记录到 `veazen/HUMAN_TODO.md`
