# veazen

商品防伪验证 SaaS 平台。消费者扫码/刮码即可验证商品真伪，品牌方通过控制台管理产品、批次和防伪码，并提供 WordPress/WooCommerce 插件供商家集成。

## 快速导航

- 主项目代码：[`veazen/`](veazen/)（Turborepo monorepo）
- 项目规格：[`veazen/PROJECT_PLAN.md`](veazen/PROJECT_PLAN.md)
- 架构说明：[`veazen/docs/ARCHITECTURE.md`](veazen/docs/ARCHITECTURE.md)
- 部署手册：[`veazen/docs/DEPLOY_GUIDE_zh.md`](veazen/docs/DEPLOY_GUIDE_zh.md)

## 组成部分

| 目录 | 说明 |
| --- | --- |
| `veazen/apps/api` | NestJS API（Prisma + PostgreSQL RLS + BullMQ + Redis） |
| `veazen/apps/web` | Next.js 消费者验证页 + 品牌控制台 |
| `veazen/apps/marketing` | Astro 官网 |
| `veazen/apps/wp-plugin` | WordPress 插件 |
| `veazen/packages` | 公共包（信封加密、共享类型等） |
| `veazen/infra` | Dockerfile、部署与存储驱动 |
