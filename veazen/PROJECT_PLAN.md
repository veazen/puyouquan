# 项目计划书：Veazen — 云端防伪溯源平台 + WordPress/WooCommerce 接入插件

> **品牌与主体**：品牌名 **Veazen**（法律主体 VEAZEN LLC，美国怀俄明州；品牌名与主体同名，法律页脚统一写 "Veazen™ is a product of VEAZEN LLC"）。主域名 **veazen.app**（已在 Namecheap 注册；.app 后缀全域 HSTS 预加载、强制 HTTPS，协议层杜绝验证页降级劫持，可作为安全卖点写入白皮书。veazen.com 由无关联的中国乐器品牌持有，不可用；SEO 需以 "Veazen + traceability/anti-counterfeit" 组合词建立区隔）。中文产品名：**信磐**。
> **Slogan（以"信任基石"为核）**：主用 **"Trust, set in stone."**（双关：基石之石 + set in stone 的"不可篡改"义，呼应 §1.10 证据链）／中文 **"信任，坚如磐石。"** 备选："The bedrock of trust." ／ "信任基石"。营销物料从这两组中取用。

> ## ⚠️ 文档状态（2026-07-14 校准）
> **本文档是项目的「原始规格 + 前瞻 Backlog」，不再承担进度跟踪职责。**
> - **当前实际状态、生产拓扑、验收纪律 → 以 `docs/PROJECT_HANDOVER_zh.md` 为准**（唯一状态真相源）
> - **与本规格的任何偏离 → 以 `docs/ARCHITECTURE.md` 的 ADR 为准**（ADR 优先级高于本文）
> - **人工待办 → 以 `HUMAN_TODO.md` 为准**
>
> **进度快照**：Phase 0~4a 已交付，**2026-07-12 生产全量上线**（veazen.app / api.veazen.app / verify.veazen.app）。
> 计划外新增并已交付：SME 退货套件（M2/M3）、E1 权限体系、P1 收款闭环（Lemon Squeezy，默认关闸）。
> **当前瓶颈已从"代码不足"转为"客户不足"**——插件未上架、零付费客户、零设计伙伴。
> 因此 §12 Backlog 中的一切**均设触发条件，无触发不启动**（见 §12 冻结纪律）。

> 本文档最初面向 Claude Code 作为权威规格说明（Spec）。文中所有代码标识符、API 路径、数据库字段均为约定命名，实施时保持一致。

---

## 0. 一句话定位

为全球中小品牌提供"一物一码"防伪验证 + 供应链溯源的 SaaS 平台（云端），并以 WordPress/WooCommerce 插件作为首个接入渠道。介于企业级方案（Scantrust 等，太贵太重）与本地小插件（无云端安全性）之间的空档市场。

---

## 1. 核心架构决策（不可更改的前提）

1. **插件是壳，云端是脑。** 所有码的生成、签名、验证、核销、风控逻辑只存在于云端 SaaS。WordPress 插件仅负责：站点注册/鉴权、产品同步、码批次申请、验证组件嵌入、数据看板展示。插件本地数据库不存任何码的明文或密钥。
2. **一物一码 + 密码学签名。** 每个码是唯一序列号 + 服务端签名，验证必须回源云端。
3. **明暗双码机制。** 明码（QR，公开可扫，展示溯源+真伪状态）+ 暗码（刮开涂层的一次性核销码）。
4. **码默认未激活。** 印刷厂拿到的码是 `inactive` 状态，产品出厂扫描激活后才可通过消费者验证。防印刷环节泄露。
5. **URL 标准采用 GS1 Digital Link 兼容格式**：`https://{tenant-domain}/01/{GTIN}/21/{serial}`；无 GTIN 的客户使用内部替代路径 `https://{tenant-domain}/v/{serial}`。
6. **溯源事件模型对齐 GS1 EPCIS 2.0** 的核心语义（what/where/when/why），但 MVP 阶段用简化的内部 schema，字段命名保持可映射。
7. **多租户 SaaS。** 单实例多租户，租户隔离通过 `tenant_id` 行级隔离 + PostgreSQL RLS（Row Level Security）双保险。
8. **验证接口是全系统最高并发路径**，设计目标：p99 < 150ms（不含网络），单实例 ≥ 500 rps，可水平扩展。
9. **验证域名默认由平台控制（战略锁定）。** 所有码默认指向平台域名（`verify.veazen.app` 或租户子域 `{slug}.veazen.app`；后续购入超短域名后可作为 QR 专用跳转域，302 至前者）。自定义域名（`custom_domain`）仅企业版开放，且实现上必须 CNAME 到平台边缘节点（域名可换皮，解析和数据始终经过平台）。任何实现不得引入"客户完全自持验证端点"的模式。
10. **证据级日志（中立第三方存证）。** `scan_events` 为追加写（append-only），应用层禁止 UPDATE/DELETE（DB 权限层面对应用账号 REVOKE）；每日生成扫码日志的 Merkle 根摘要存入 `scan_digests` 表，使历史记录可证明未被篡改。这是"平台数据可作为打假/渠道纠纷证据"的技术基础。
11. **消费者验证路径永不受计费状态影响（批次 R A2）。** `GET /verify/:serial` 与 `POST /verify/:serial/scratch` 在租户欠费、订阅取消、降级为 free、乃至插件被卸载后，仍必须照常工作（返回真实状态与基础品牌信息，刮码可正常核销）；按档位闸门降级的只能是品牌侧能力（新批次生成、导出、看板分析、告警、Webhook、API key 通道）。理由：① 消费者手中的码不得因商家欠费变砖；② 无品牌敢把防伪押在"欠费即砖化"的系统上；③ 已印出的码是持续导流资产。详见 `docs/ARCHITECTURE.md` ADR-012，由 `apps/api/test/verify-billing-invariant.e2e-spec.ts` 锁死。

---

## 2. 技术栈

### 2.1 云端后台（`apps/api`）
- 运行时：Node.js 22 LTS + TypeScript 5.x
- 框架：NestJS 10（模块化、依赖注入、易测试）
- 数据库：PostgreSQL 16（Prisma ORM；码表按 `tenant_id` HASH 分区预留设计，MVP 单表 + 索引即可，但 schema 注释中标明分区键）
- 缓存/限流：Redis 7（ioredis）
- 队列：BullMQ（批量生成码、导出文件、Webhook 投递）
- 对象存储：S3 兼容接口（本地开发用 MinIO）
- 鉴权：租户 API Key（HMAC 签名请求）+ 后台用户 JWT（access 15min / refresh 7d）
- 文档：OpenAPI 3.1 自动生成（@nestjs/swagger），输出到 `docs/openapi.json`

### 2.2 消费者验证页 + 租户控制台（`apps/web`）
- Next.js 14（App Router）+ TypeScript + Tailwind CSS
- 验证落地页：SSR，极致轻量（首屏 < 100KB JS），多语言（next-intl，首发 en/zh/es/de/ja）
- 租户控制台（Dashboard）：SPA 风格路由组，功能见 §6

### 2.3 WordPress 插件（`apps/wp-plugin`，插件 slug: `veazen`）
- PHP 8.1+，WordPress 6.4+，WooCommerce 8.x+（声明 HPOS 兼容）
- 遵循 WordPress Coding Standards（PHPCS + WPCS ruleset）
- 构建：插件内 admin 界面用 React（@wordpress/scripts 打包），前台验证组件提供 shortcode `[veazen_verify]` + Gutenberg block
- 与云端通信：仅服务端到服务端（wp-cron / admin-ajax 触发），API Key 存 options 表（加密，用 `wp_salt` 派生密钥 AES-256-GCM）

### 2.4 密码学规范
- 码序列号：`serial = base32(crockford)(96-bit CSPRNG)`，去除易混淆字符，长度 20 字符
- 签名：每租户一对 Ed25519 密钥（服务端保管私钥，DB 中私钥用 KMS/主密钥信封加密存储）；QR URL 携带 `sig = base64url(Ed25519(serial || tenant_id || batch_id))[:16]` 截断签名，完整验证在服务端做全签名校验 + 查库
- 暗码（scratch code）：12 位数字+字母（去混淆），DB 只存哈希、明文只出现在一次性导出文件。哈希算法原定 `argon2id`，经 **ADR-007** 改为**带服务端 pepper 的 HMAC-SHA256**（pepper 由 `MASTER_KEY` 环境变量派生、永不入库）：暗码是 60-bit CSPRNG 高熵随机串而非用户口令，无需抗暴力破解的慢哈希；拖库拿不到 pepper 即无法离线爆破；argon2id 置于公开验证热路径会构成内存 DoS 向量与延迟负担，且与"10 万码 <60s 生成"的 §8 预算物理冲突。argon2id 仍用于用户密码
- 所有随机数用 `crypto.randomBytes`，禁止 Math.random
- **展示格式化（display format）**：serial 与暗码均定义"存储版本"与"展示版本"两种形态。存储/校验永远使用无分隔符的规范形式；展示（验证页、导出文件、PDF 标签、插件 UI）按 4-5 字符分组插入连字符（如 `A1B2C-D3E4F-...`）。所有验证入口在校验前自动剥离 `-`、`:`、空格等分隔符并统一大小写（crockford base32 天然不区分大小写与易混字符）。`packages/crypto` 提供 `formatForDisplay(serial)` 与 `normalizeInput(raw)` 纯函数，全端复用，测试向量须覆盖含分隔符/混合大小写/易混字符（0/O、1/I/L）的输入。

### 2.5 品牌设计令牌（apps/marketing 与验证页共用，已由临时官网确立）
- **色板**：basalt `#16191d`（主背景）、basalt-deep `#101317`、limestone `#e9e4d8`（主文字）、limestone-dim `#a9a498`（次级文字）、jade `#3fa37c`（唯一强调色，用于"已验证/正品"语义）、jade-deep `#2c7a5c`、etch `rgba(233,228,216,.07)`（蚀刻线/边框）。验证页三态在此基础上扩展：绿=jade，黄/红另定但饱和度与明度须与该色板协调。
- **字体**：Marcellus（展示标题，全大写 + 宽字距，罗马碑刻血统呼应 slogan）；Inter（正文）；IBM Plex Mono（序列号、代码、标签类 utility）。
- **签名元素**：序列号验证条（monospace 分组序列 + 扫描光带 + Verified 徽章的入场动画），作为品牌的视觉母题在官网 hero、验证页、文档中复用；动画须尊重 prefers-reduced-motion。
- **文案声线**：短句、主动语态、具体不炫技；slogan 主用 "Trust, set in stone."（中文"信任，坚如磐石。"）。
- **现状（2026-07 更新）**：apps/marketing 正式官网已上线（EN + /zh/ 双语），经 Cloudflare **Workers Builds** git 集成自动部署（项目 `veazen-site`，推 main 即上线 veazen.app）；临时页已退役；waitlist 为真实表单入库。

---

## 3. Monorepo 目录结构

```
veazen/
├── apps/
│   ├── api/                 # NestJS 云端后台
│   ├── web/                 # Next.js 验证页 + 控制台
│   ├── marketing/           # 官网营销站（Astro 静态，部署 Cloudflare Pages）
│   └── wp-plugin/           # WordPress 插件（独立 composer + npm）
├── packages/
│   ├── shared/              # TS 共享类型、常量、API client SDK
│   └── crypto/              # 签名/序列号生成的纯函数库（含测试向量）
├── infra/
│   ├── docker-compose.yml   # 本地开发：postgres + redis + minio + mailhog
│   └── deploy/              # Dockerfile、部署文档
├── docs/
│   ├── openapi.json
│   ├── ARCHITECTURE.md
│   └── PRINT_VENDOR_GUIDE.md  # 给印刷厂的码文件说明（后期）
├── turbo.json               # Turborepo
└── PROJECT_PLAN.md          # 本文档
```

---

## 4. 数据模型（PostgreSQL / Prisma）

> 全部表含 `created_at`, `updated_at`；除 `tenants` 外全部含 `tenant_id`（分区键预留）。启用 RLS：`tenant_id = current_setting('app.tenant_id')`。

### tenants
| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | |
| name | text | 企业名 |
| slug | text unique | 子域用 |
| plan | enum(free, starter, growth, enterprise) | |
| custom_domain | text nullable | 企业版自定义验证域名 |
| public_key / encrypted_private_key | bytea | Ed25519 |
| settings | jsonb | 品牌色、logo、验证页配置 |

### users（租户后台用户）
id, tenant_id, email unique, password_hash(argon2id), role enum(owner, admin, viewer), locale

### api_keys
id, tenant_id, key_prefix(8字符明文可查), key_hash, label, scopes text[], last_used_at, revoked_at

### products
id, tenant_id, name, sku, gtin nullable, description, images jsonb, attributes jsonb, trace_template_id nullable, external_refs jsonb（存 WooCommerce product_id 映射：`{"woo:site_hash": 123}`）

### batches（码批次）
id, tenant_id, product_id, quantity int, status enum(pending, generating, ready, exported, failed)（failed 为批次 R A3 追加：补偿扫描 ≥3 次仍卡死 → failed，控制台提供「重试」）, kind enum(bulk, on_demand) default bulk（on_demand 为 Lite 发货标签池，见 §7.5）, auto_activate bool default false（true 时生成完成即 active，见 §7.5）, export_format enum(csv, pdf), intended_market text nullable（授权销售区域，窜货检测用，ISO 3166 国家码数组）, activated_count int default 0, generation_attempts int default 0（A3 补偿重试计数）

### codes（核心大表，预留 HASH(tenant_id) 分区）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigserial PK | |
| tenant_id | uuid | |
| batch_id | uuid | |
| product_id | uuid | |
| serial | text unique | 20字符 crockford base32 |
| sig | text | 截断签名（进 QR URL） |
| scratch_hash | text | 暗码哈希：HMAC-SHA256+pepper（ADR-007；原定 argon2id） |
| status | enum(inactive, active, verified, flagged, voided) | 状态机见 §5.3 |
| flag_reason | enum(risk_rule, stolen, recalled, manual) nullable | status=flagged 时必填；stolen 由商家标记（商品被盗报备），验证页对 stolen 展示专属警示文案并提示联系品牌方 |
| first_verified_at | timestamptz nullable | |
| scratch_redeemed_at | timestamptz nullable | |
| order_ref | jsonb nullable | 绑定的 Woo 订单 `{site, order_id, line_item}` |

索引：`(serial)` unique、`(tenant_id, batch_id)`、`(tenant_id, status)`

### scan_events（验证/扫码日志，追加写，按月分区，应用账号无 UPDATE/DELETE 权限）
id, tenant_id, code_id, kind enum(public_scan, scratch_verify, activation, inspector_scan), result enum(ok, already_verified, invalid, inactive, flagged), ip inet, geo jsonb（country, region, city — GeoIP 解析）, device_fp text（sha256(salt + ua + accept_language + ip/24)，跨租户风控信号用，salt 全局固定且不进日志）, user_agent, locale, created_at

### scan_digests（证据级日志的每日摘要）
id, date date unique, event_count bigint, merkle_root text, prev_digest_hash text（与前一日摘要链接成链）, created_at
> 每日 UTC 00:10 由 BullMQ 定时任务计算前一日全量 scan_events 的 Merkle 根并落库。

### risk_signals（跨租户风控情报层 — 脱敏聚合，无 tenant_id 归属）
id, signal_type enum(suspicious_device_fp, hot_geo_cell, invalid_serial_probe_source), signal_value text（device_fp / geohash5 / ip_prefix）, evidence_count int, tenant_count int（涉及的租户数，仅计数不留身份）, first_seen_at, last_seen_at, score numeric
> 设计约束：本表**不含任何可反查到具体租户或消费者的字段**。写入方为风控 consumer 的聚合任务；读取方为风控规则引擎（对所有租户的验证请求生效）。这是"接入平台=接入全行业风险图谱"的数据基础。

### audit_logs（SOC 2 就绪：后台操作审计，追加写）
id, tenant_id, actor_user_id nullable, actor_api_key_id nullable, action text（如 batch.create / code.void / settings.update / user.invite）, target jsonb, ip inet, created_at

### trace_events（溯源事件，EPCIS 语义简化版）
id, tenant_id, subject enum(batch, code), subject_id, event_type enum(commissioned, quality_checked, shipped, received, activated, retail_activated, custom), biz_step text nullable, location jsonb（name, geo, country）, occurred_at timestamptz, data jsonb, source enum(api, dashboard, wp_plugin, csv_import)

### alerts（风控告警）
id, tenant_id, rule enum(duplicate_scratch, geo_velocity, out_of_market, scan_burst), severity enum(info, warning, critical), code_id nullable, batch_id nullable, payload jsonb, acknowledged_at nullable

### wp_sites（已连接的 WordPress 站点）
id, tenant_id, site_url, site_hash(sha256(site_url)), plugin_version, wc_version, last_seen_at

### webhook_endpoints（租户出站 Webhook 配置）
id, tenant_id, url, secret（HMAC-SHA256 签名密钥，信封加密存储）, events text[]（订阅的事件类型）, active bool, failure_count int default 0（连续失败 20 次自动停用并告警）

### webhook_deliveries（投递日志，保留 30 天）
id, tenant_id, endpoint_id, event_type, payload jsonb, response_status int nullable, attempts int, delivered_at nullable, created_at
> 投递由 BullMQ 执行：指数退避重试 5 次（1m/5m/30m/2h/12h）；请求头携带 `X-Veazen-Signature: HMAC-SHA256(secret, timestamp + body)` 与 `X-Veazen-Timestamp` 防重放。
> **事件类型（MVP 集合）**：`code.verified`（暗码核销成功）、`code.duplicate_attempt`（重复核销尝试）、`code.flagged`、`batch.ready`、`alert.created`。事件语义与 §5.3 状态机保持一致。

### serial_profiles（企业自定义编码方案，见 §7.6）
id, tenant_id, name, mode enum(platform, custom_format, byo), prefix text nullable（如企业内部前缀或 GS1 公司前缀段）, length int, charset enum(crockford32, upper_alnum, digits), random_bits int（平台生成部分的熵，check ≥ 64）, display_group_size int default 5, status enum(active, archived)
> mode=platform 为默认（§2.4 规范）；custom_format 允许企业定义前缀/长度/字符集但随机段熵值强制 ≥64 bit；byo 为企业导入自有序列号（ERP 既有码段），导入时全租户命名空间去重校验。**三种模式的码一律由云端 Ed25519 签名，sig 参数缺失或不匹配时 byo/低熵码直接返回 invalid（防枚举）。**

### custom_hostnames（企业自定义验证域名，见 §7.6）
id, tenant_id, hostname unique, dns_ownership_token, status enum(pending_dns, verifying, active, failed), tls_status enum(pending, issued, renewing, failed), created_at
> 接入流程：企业在 DNS 添加 TXT 所有权记录 + CNAME 至平台边缘 → 平台自动验证并经 ACME 签发证书（Cloudflare for SaaS custom hostnames 或等价方案）。所有权校验不通过绝不激活，防域名劫持。

---

## 5. API 设计（`apps/api`，前缀 `/api/v1`）

### 5.1 公开验证接口（无鉴权，Redis 限流：IP 60 req/min）

```
GET  /verify/:serial?sig=xxx
```
返回：产品公开信息、溯源时间线（脱敏）、码状态语义化结果：
```json
{
  "result": "authentic | already_verified | invalid | inactive | flagged",
  "product": { "name": "...", "images": [...], "brand": {...} },
  "trace": [ { "step": "commissioned", "location": "Shenzhen, CN", "date": "..." } ],
  "first_verified_at": null,
  "scan_count_hint": "first_scan | scanned_before",
  "verify_page_config": { ... 租户品牌化配置 ... }
}
```
副作用：写入 `scan_events`，异步触发风控规则评估（BullMQ job）。

```
POST /verify/:serial/scratch   body: { "scratch_code": "XXXX-XXXX-XXXX" }
```
核销暗码。暗码哈希校验（HMAC-SHA256+pepper，ADR-007；原定 argon2id）→ 成功则 `status: active → verified`，记录 `scratch_redeemed_at`；若已核销过，返回 `already_verified` + 首次核销的时间与国家（模糊化到国家级），并创建 `duplicate_scratch` 告警。此接口限流更严：IP 10 req/min + 单 serial 5 次尝试后锁定 1 小时。

### 5.2 租户 API（`Authorization: Bearer <api_key>`，HMAC 请求签名头 `X-Signature` 可选启用）

```
POST   /products                      # 创建/更新产品（upsert by external_ref 或 sku）
GET    /products?query=
POST   /batches                       # { product_id, quantity(≤100000), intended_market?, auto_activate?, kind?, serial_profile_id? }
GET    /batches/:id                   # 含生成进度
GET    /batches/:id/export?format=csv|pdf   # 就绪后返回带签名的临时下载 URL
POST   /batches/:id/activate          # 批量激活（出厂）：{ serials: [...] } 或 { all: true }
POST   /batches/:id/import-serials    # BYO 模式：上传自有序列号 CSV（≤10 万/批，全租户去重校验，异步任务返回冲突报告）
POST   /serial-profiles · GET /serial-profiles · PATCH /serial-profiles/:id   # 自定义编码方案 CRUD（§7.6）
POST   /custom-hostnames · GET /custom-hostnames/:id · DELETE /custom-hostnames/:id   # 白标域名接入与状态轮询（§7.6）
POST   /orders/shipping-label         # Lite：{ order_ref, product_id, label_format } 从 on_demand 池取码 → 激活 + 绑定订单 + 返回标签 PDF 临时 URL（见 §7.5）
POST   /codes/:serial/bind-order      # Woo 发货时绑定订单
POST   /codes/:serial/flag            # { reason: "stolen" | "recalled" | "manual", note? } 商家标记（被盗/召回）
POST   /codes/:serial/unflag          # 解除标记，回到 flagged 之前的状态
POST   /trace-events                  # 上报溯源事件（单条或数组，≤500/req）
GET    /alerts?status=open
GET    /stats/overview                # 看板聚合：验证量、地理分布、告警数
GET    /webhooks · POST /webhooks · PATCH /webhooks/:id · DELETE /webhooks/:id   # Webhook 端点 CRUD
POST   /webhooks/:id/test             # 发送测试事件，返回投递结果
POST   /wp/handshake                  # 插件首次连接：换取 site 注册 + 能力协商
```
> 所有接收 serial 的接口（含 §5.1 公开验证）先经 `normalizeInput()` 处理（剥离分隔符、统一大小写、映射易混字符），见 §2.4 展示格式化。

### 5.3 码状态机（服务端强制，非法迁移返回 409）

```
inactive ──activate──▶ active ──scratch_verify──▶ verified
   │                     │                            │
   └──void──▶ voided ◀───┴────────void───────────────┘
active/verified ──风控触发──▶ flagged（可由管理员解除回原状态）
```
公开扫码（public_scan）不改变状态，只记日志；唯一改变状态的消费者动作是暗码核销。
进入 flagged 的两个来源共用同一状态：风控规则（flag_reason=risk_rule）与商家主动标记（stolen/recalled/manual，经 `/codes/:serial/flag`）。验证页按 flag_reason 区分文案：stolen 显示"该商品已被品牌方报备为被盗，请联系品牌方"，其余显示通用警示。unflag 恢复到进入 flagged 前的状态（需在 codes 表记录 prev_status）。

### 5.4 风控规则（MVP 三条，跑在 BullMQ consumer）

1. **duplicate_scratch**：同一 serial 第二次暗码核销尝试 → critical 告警。
2. **geo_velocity**：同一 serial 的 public_scan 在 24h 内出现两个距离 > 2000km 的国家 → warning。
3. **out_of_market**：批次设置了 `intended_market`，且该批次的扫码国家不在列表内的比例在滚动 7 天窗口 > 20%（且样本 ≥ 10 次）→ warning（窜货嫌疑）。
4. **cross_tenant_signal**（骨架先行，Phase 4 启用）：验证请求的 `device_fp` 或 IP 前缀命中 `risk_signals` 高分记录（score ≥ 阈值）→ info 级标记进 scan_events.result 旁路字段，不直接告警；同时聚合任务将"同一 device_fp 在 ≥3 个租户产生 invalid/already_verified 结果"写入 risk_signals。

告警产生后：写 `alerts` 表 + 给租户 owner 发邮件（MVP 用 SMTP/mailhog，接口抽象成 NotificationService 以便日后换 SendGrid）+ 向订阅了 `alert.created` 的 webhook_endpoints 投递事件（见 §4 webhook 表定义）。

---

## 6. 租户控制台（`apps/web` 的 /dashboard）

MVP 页面：
1. **Overview**：近 30 天扫码量曲线、扫码地理分布地图（用 SVG 世界地图 + 国家着色即可，不引入重型地图库）、开放告警列表。
2. **Products**：产品 CRUD + 溯源页模板配置（可排序的展示模块：产品信息 / 溯源时间线 / 质检报告文件 / 自定义富文本）。
3. **Batches**：创建批次、查看生成进度、下载 CSV/PDF、批量激活。**单码查询**：输入 serial（自动 normalize）查看状态/扫码历史，提供"标记为被盗/召回"与解除标记操作（调 §5.2 flag/unflag）。
4. **Alerts**：告警列表、确认处理。
5. **Settings**：品牌化（logo、主色、验证页文案多语言覆盖）、**白标中心**（自定义验证域名接入向导与状态、编码方案 serial_profiles 管理、角标开关按 plan 显示、Verify Widget 嵌入代码生成，§7.6）、API Keys 管理、**Webhooks 管理**（端点 CRUD、事件订阅勾选、投递日志查看、发送测试事件）、团队成员、站点连接状态。

消费者验证页（/v/[serial] 与 GS1 路径）要求：移动优先、租户品牌化、语言自动检测（Accept-Language）+ 手动切换、明确的三态视觉（绿=正品首验 / 黄=已被验证过请注意 / 红=无效码）。

---

## 7. WordPress 插件规格（`apps/wp-plugin`）

### 7.1 功能清单（MVP）
1. **连接向导**：输入 API Key → 调 `/wp/handshake` → 保存加密凭据，显示连接状态。
2. **产品同步**：WooCommerce 产品单向同步到云端（手动全量 + save_post_product 钩子增量）。支持选择哪些产品参与防伪。
3. **码批次申请**：在产品编辑页侧栏或插件页面发起批次申请，展示进度，提供导出文件下载链接（代理云端 URL）。
4. **订单绑定**：订单状态变为 `completed`/`shipped` 时（钩子 `woocommerce_order_status_changed`），若商家启用"发货绑定"，弹出/后台记录该订单行项目对应的 serial 录入（扫码枪输入框），调 `bind-order`。
5. **前台验证组件**：shortcode `[veazen_verify]` + Gutenberg block，渲染一个输入框/相机扫码入口，提交到云端公开验证接口（前端直连云端，不经过 WP 服务器），结果本地化展示。
6. **看板 Widget**：WP 后台 dashboard widget 显示近 7 天验证量与告警数（服务端拉取，transient 缓存 15 分钟）。
7. **PDF 发票插件联动（可选集成，Phase 4）**：检测到 "WooCommerce PDF Invoices & Packing Slips"（Ewout Fernhout / WP Overnight，高装机量）已激活时，提供开关：在发票/装箱单上打印该订单已绑定的 serial（展示格式化版本，见 §2.4）。通过该插件的模板钩子（`wpo_wcpdf_after_order_details`）注入，无该插件时功能项隐藏。实现为独立集成类（`integrations/class-pdf-invoices.php`），为日后对接其他发票插件留扩展点。

### 7.2 工程约束
- 所有远程调用用 `wp_remote_post/get`，超时 5s，失败静默降级 + admin notice
- 国际化：全部字符串 `__( '...', 'veazen' )`，提供 POT 文件
- 卸载钩子清理 options；绝不在卸载时调用云端删除数据
- 兼容性声明：`Requires at least: 6.4`, `WC requires at least: 8.0`, HPOS: `FeaturesUtil::declare_compatibility('custom_order_tables', ...)`
- 免费版限制逻辑放云端（plan=free 每月 500 码），插件不做本地限制判断

### 7.5 Lite 模式（微型企业机制，横跨云端 / 验证页 / 插件）

**背景**：WooCommerce 用户约六成为小企业主、多为单人/微型团队，无工厂、无印刷厂、无出厂扫描环节。Lite 模式为其提供平行的简化流程；它是免费档与 Starter 档的默认形态，也是漏斗健康度的关键。

**红线（不可简化的部分）**：Lite 的码与标准模式完全同源——云端 Ed25519 签名、同一验证域名、scan_events 全量回流、风控规则照常生效。简化的只是操作流程，不是密码学与数据链路。

**模式选择**：onboarding 首步分叉——"我有工厂/印刷厂（标准模式）" vs "我自己打包发货（简易模式）"，存 `tenants.settings.mode = 'standard' | 'lite'`。可随时切换，数据全部延续；Lite → 标准仅是打开批次激活、暗码、EPCIS 等能力，无迁移动作。

**四个机制**：
1. **生成即激活**：Lite 下 `POST /batches` 默认 `auto_activate=true`，生成完成即 `active` 状态（状态机不变，等价于系统代做 activate；trace_events 同时写入 commissioned + activated）。威胁模型依据：自打印场景不存在印刷厂泄露风险。
2. **发货即绑定（核心简化）**：Lite 产品各维护一个 `kind=on_demand` 的码池（低水位自动补充，BullMQ）。WooCommerce 订单完成时，插件在订单页提供"打印防伪发货标签"按钮 → 调 `POST /orders/shipping-label` → 云端取码、激活、绑定订单，一次调用返回含 QR + 展示格式 serial 的标签 PDF。打印贴上即完成激活+订单绑定+消费者关联三件事。
3. **first-scan 锁定替代暗码**：Lite 码无 scratch。验证页分支：首扫显示绿色"首次验证成功 + 时间地点已记录"；后续任何扫码显示黄色"此码已于 {date} 在 {country} 首次验证"。`GET /verify` 响应已含 `first_verified_at` 与 `scan_count_hint`，仅需文案与视觉分支。
4. **产品故事页**：trace_template 增加 `story` 模块（富文本 + 图片画廊）。Lite 默认验证页模板 = 验证状态 + 产品信息 + 品牌故事，不渲染 EPCIS 时间线。数据结构复用（trace_events 的 custom 类型），仅模板差异。

**自打印支持**：标签 PDF 提供标准标签纸模板（Avery 5160 / L7160 等，参数化行列与边距），家用打印机 A4/Letter 直接输出；单枚发货标签模板含店铺 logo 位。

**北极星指标**：安装插件 → 贴出第一个可扫描的码 ≤ 10 分钟。onboarding 各步埋点（匿名事件计数即可），Phase 4 验收含一次全流程计时演练。

### 7.6 企业定制化与白标（White-label，横跨云端 / 验证页 / 报告）

**设计原则：白标体验层，保留基建层。** 消费者可见的一切（域名、页面、编码、邮件、报告视觉）可 100% 品牌化；但 DNS 必须 CNAME 经平台边缘、签名私钥永在云端、scan_events 全量回流、scan_digests 照常记账。任何实现不得以"白标"为由让验证流量绕开平台（与 §1.9 一致）。

**1. 自定义编码（serial_profiles，表定义见 §4）**：三种模式——platform（默认）；custom_format（企业自定义前缀/长度/字符集，随机段熵 ≥64 bit 硬约束）；byo（导入 ERP 既有码段）。企业可将码 URL 结构定为 `https://verify.{brand}.com/{custom_path}/{serial}`（路径段可配置）。GS1 模式：企业提供自己的 GS1 公司前缀时按 Digital Link 标准出 URL。安全铁律：无论何种模式，验证必须携带且校验平台签名 `sig`；byo/低熵码缺失 sig 时一律 invalid，且此类租户的验证接口启用更严的枚举限流。

**2. 白标验证域名（custom_hostnames，表定义见 §4）**：企业版在自己的子域（如 `verify.brand.com`）承载全部验证页；接入向导自动化 TXT 所有权验证 + CNAME + ACME 证书签发。营销层面对消费者完全无 Veazen 痕迹。

**3. 落地页深度定制**：验证页模板系统升级为三层——主题令牌（logo、色板、字体、圆角）；模块编辑器（验证状态/产品信息/溯源时间线/故事/富文本/FAQ 的增删排序，多语言内容）；**自定义 CSS**（企业版，服务器端 sanitize：仅允许样式规则，剥离 @import/url(外链)/expression，页面 CSP 禁内联脚本）。"Powered by Veazen" 角标：free/starter 强制显示，growth 可弱化，enterprise 可关闭。

**4. Headless 验证（彻底自建前端的企业）**：公开验证接口本身即无鉴权 JSON API（§5.1），企业可完全自渲染；另提供 `<script>` 嵌入式 **Verify Widget**（约 15KB，无依赖，品牌主题继承宿主页面），一行代码嵌入企业官网任意页面。Widget 请求仍打到平台验证域（数据回流不变）。

**5. 白标邮件与报告**：告警/通知邮件支持企业发件域（SPF/DKIM 引导配置，未配置则用平台域）；导出的看板 PDF、窜货报告使用企业 logo 与配色。**唯一例外——证据存证报告（§Phase 4）保留 Veazen 出具方署名与 merkle 校验说明**：中立第三方身份正是其法律证据力的来源，向客户按"公证书"逻辑销售此特性，而非视作白标缺口。

**6. 分层打包**：custom_format 编码 + 主题令牌 → growth 档起；byo 导入、白标域名、自定义 CSS、白标邮件、去角标、Verify Widget → enterprise 档。定价逻辑：白标即企业版毛利的主要来源。

---

## 8. 阶段与任务分解

> 每阶段结束运行验收命令，全绿再进下一阶段。

### Phase 0 — 脚手架（0.5 周）　✅ 已交付
- [ ] Turborepo 初始化，apps/packages 骨架，docker-compose（pg16/redis7/minio/mailhog）
- [ ] `packages/crypto`：serial 生成、Ed25519 签名/验签、scratch 生成与 argon2id 哈希，**附测试向量文件**
- [ ] CI：GitHub Actions — lint + typecheck + unit test（api/web/crypto），wp-plugin 跑 PHPCS
- 验收：`turbo run test lint typecheck` 全绿；crypto 测试向量通过

### Phase 1 — 云端核心（2-3 周）　✅ 已交付（e2e + 500rps 压测通过）
- [ ] Prisma schema（§4 全部表）+ RLS 迁移脚本 + seed（demo 租户）；serial_profiles 三模式的生成/签名/校验逻辑（含 byo 导入去重任务与熵值校验）
- [ ] 鉴权模块：用户注册/登录/JWT、API Key 签发与校验
- [ ] 产品、批次模块；BullMQ 批量生成码（10 万码 < 60s，事务分块 COPY 插入）；batches 支持 kind/auto_activate（§7.5），on_demand 池低水位自动补充任务
- [ ] `POST /orders/shipping-label` 端点（取码 → 激活 → 绑定 → 返回标签 PDF URL；PDF 渲染本体在 Phase 4，此处先返回 CSV 占位）
- [ ] CSV 导出（serial, scratch 明文仅在导出文件中出现一次, qr_url）；PDF 导出后置到 Phase 4
- [ ] 公开验证接口 + 暗码核销 + 状态机 + scan_events + 限流
- [ ] 风控三规则 + 邮件通知
- [ ] Webhook 模块：webhook_endpoints/webhook_deliveries 表、CRUD API、BullMQ 投递（HMAC 签名 + 指数退避重试 + 连续失败自动停用）、MVP 五种事件类型（§4）
- [ ] 商家标记接口 `/codes/:serial/flag|unflag`（flag_reason 语义 + prev_status 恢复）
- [ ] audit_logs 中间件（拦截所有写操作型 controller，自动落审计日志）
- [ ] scan_events 追加写权限约束（迁移脚本中 REVOKE UPDATE/DELETE）+ 每日 Merkle 摘要定时任务（scan_digests）
- [ ] scan_events 写入含 device_fp 计算；risk_signals 表结构就位（聚合任务 Phase 4 实现）
- [ ] OpenAPI 文档生成
- 验收：e2e 测试（supertest）覆盖：生成 1000 码 → 激活 → 明码扫描 → 暗码核销 → 二次核销触发告警 → 状态机非法迁移 409；`autocannon` 压测 verify 接口本地 ≥ 500 rps

### Phase 2 — 验证页与控制台（2 周）　✅ 已交付（含官网 EN/zh + waitlist）
- [ ] 消费者验证页（三态视觉、多语言 5 种、品牌化配置渲染、GS1 路径路由）；Lite 分支：first-scan 锁定文案/视觉 + 产品故事页模板（§7.5）；模板系统按 §7.6 三层结构实现（主题令牌 + 模块编辑器先行，自定义 CSS 留接口 Phase 4 开放）
- [ ] Dashboard 五个页面（§6）；onboarding 模式分叉（standard/lite）与切换设置
- [ ] 官网 v1（apps/marketing，Astro 静态）：**视觉与文案严格沿用 §2.5 品牌设计令牌**（临时官网即设计基准，hero 复用序列号验证条母题）；首页（slogan + 三步流程演示）、定价页（四档对照）、功能页、等待列表表单（替换临时页的 mailto，写入云端 waitlist 表：email、brand、website、category、monthly_units、created_at，接口挂 api 的公开限流端点）、隐私政策与 ToS 页面骨架（占位文案，正式版由律师提供后替换）、基础 SEO（sitemap、OG 标签、"Veazen + traceability/anti-counterfeit" 关键词布局）；以 git 集成接管 Cloudflare Pages 项目 `veazen` 并确认 veazen.app / www 自定义域绑定不中断
- [ ] Lighthouse 移动端验证页 Performance ≥ 90
- 验收：Playwright e2e：注册租户 → 建产品 → 生成批次 → 下载 CSV → 用其中一条码走完整验证流程（浏览器层面）

### Phase 3 — WordPress 插件（2 周）　✅ 已交付（WPCS 0 错误 + zh_CN；⏳ WP.org 上架待账号批复）
- [ ] §7 功能 1–6（功能 7 PDF 发票联动放 Phase 4）
- [ ] Lite 流程（§7.5）：插件 onboarding 模式识别、订单页"打印防伪发货标签"按钮（调 shipping-label 端点并打开返回的 PDF）
- [ ] 本地开发环境：`wp-env`（docker 化 WP + Woo 示例数据）
- [ ] PHPUnit（wp-plugin 核心类）+ 手动测试清单文档
- 验收：wp-env 中完成端到端演示流程：连接 → 同步产品 → 申请批次 → 前台 shortcode 验证成功；PHPCS 0 error
- 交付物：可提交 WordPress.org 的 readme.txt + 截图占位 + 打包脚本 `npm run plugin:zip`

### Phase 4 — 打磨与上线准备（1-2 周）　🔶 部分交付（4a 生产化已完成并上线；计费改用 Lemon Squeezy 而非 Stripe；白标一期未做→§12 Backlog）
- [ ] PDF 码标签导出（每页 N 枚，含 QR + 明文 serial + 刮涂层占位框，用 pdf-lib）；标签纸模板参数化（Avery 5160/L7160 等）+ Lite 单枚发货标签模板（§7.5），shipping-label 端点切换为真实 PDF
- [ ] Lite 全流程计时演练：全新租户从安装插件到打印出第一张可扫描标签 ≤ 10 分钟（onboarding 埋点数据佐证）
- [ ] WooCommerce PDF Invoices & Packing Slips 联动（§7.1 功能 7）：wp-env 中安装该插件做集成测试
- [ ] 溯源事件 CSV 批量导入 + Dashboard 时间线展示
- [ ] 计费骨架：plan 限额强制（免费 500 码/月）、Stripe 接口抽象层（先 stub，真实接入由人工配置密钥后启用）
- [ ] 跨租户风控聚合任务（写 risk_signals）+ 规则 4 启用
- [ ] **证据报告导出**：租户可对指定 code/batch 导出 PDF 存证报告（扫码记录 + 对应日期的 merkle_root + 校验说明），供打假/法务场景使用 — 这是差异化卖点，UI 入口放在 Alerts 详情页
- [ ] 匿名化行业统计物化视图（按国家×品类的验证量/异常率月度聚合，为日后发布行业报告预留数据管道；输出层严禁含租户身份）
- [ ] 白标一期（§7.6）：custom_hostnames 接入向导（TXT 验证 + ACME 自动证书）、自定义 CSS 开放（含 sanitizer 与 CSP）、Powered-by 角标按 plan 分级、byo 导入端到端打通
- [ ] Verify Widget（嵌入式 JS，≤15KB 无依赖，主题继承宿主页），发布到 CDN 并写嵌入文档
- [ ] 部署产物：Dockerfile ×2（api/web）、`infra/deploy/README.md`（含 Cloudflare 前置、环境变量清单、数据库迁移流程、备份策略）
- [ ] 安全自查清单执行（§9）
- 验收：docker compose -f infra/deploy/compose.prod.yml 一键起完整栈并通过冒烟测试脚本

### Phase 5+ → 已迁移至 §12 Backlog（见下）
原 Phase 5 的方向列表已重构为带触发条件的 Backlog，统一在 §12 管理。

---

## 9. 安全要求（实施时逐条对照）

1. 私钥信封加密：环境变量 `MASTER_KEY`（32B）→ AES-256-GCM 加密租户私钥；`MASTER_KEY` 缺失时 API 拒绝启动。
2. 暗码明文只出现在：生成时的导出文件流中；DB 永远只有暗码哈希（HMAC-SHA256+pepper，ADR-007；原定 argon2id），pepper 由 MASTER_KEY 派生、永不入库；日志全链路禁止打印 serial 之外的敏感字段。
3. 所有公开接口：Redis 滑动窗口限流 + 输入 zod/class-validator 校验 + 统一错误响应（不泄露内部信息）。
4. SQL 全部经 Prisma 参数化；RLS 作为纵深防御第二层。
5. WP 插件：nonce 校验所有 admin 动作、capability 检查（`manage_woocommerce`）、所有输出 escape、API Key 加密存储。
6. scan_events 的 IP 存储需支持匿名化开关（GDPR）：`ANONYMIZE_IP=true` 时存 /24 截断。
7. 依赖审计进 CI：`npm audit --audit-level=high` + `composer audit`。
8. 上线前人工安排第三方渗透测试（代码内不体现，README 中标注）。
9. scan_events / audit_logs 的不可变性由 DB 权限强制（应用连接账号 REVOKE UPDATE/DELETE），迁移中固化；任何数据订正走带审计的管理员专用通道。
10. device_fp 与 risk_signals 全链路不得出现原始 IP、原始 UA 的可逆存储；GDPR 模式（ANONYMIZE_IP=true）下 device_fp 的 ip 分量同样使用截断值。
11. 白标相关：custom_hostnames 未通过 DNS TXT 所有权验证绝不激活；自定义 CSS 服务器端 sanitize + 验证页 CSP（禁内联/外链脚本）；byo 与 custom_format 低熵码强制 sig 校验 + 独立枚举限流桶；serial_profiles 的 random_bits < 64 在 API 层直接 422。

## 10. 工程约定

- 语言：代码与注释用英文；面向用户的文案走 i18n 资源文件（en 为源语言，zh/es/de/ja 翻译）
- 提交：Conventional Commits；每个 Phase 一个里程碑分支合入 main
- 测试底线：packages/crypto 覆盖率 100%；api 核心模块（verify/codes/batches）≥ 85%
- 任何偏离本文档的架构变更，先在 `docs/ARCHITECTURE.md` 写 ADR（Architecture Decision Record）再实施

## 11. 环境变量清单（apps/api）

```
DATABASE_URL=postgres://...   # 本地/CI 直接配置；托管部署中由启动脚本从 MIGRATE_DATABASE_URL 派生（ADR-010）
MIGRATE_DATABASE_URL=         # 托管部署：owner 角色直连串（Neon Direct，含 sslmode=require），用于迁移与派生运行时连接
APP_DATABASE_URL=             # 可选：显式覆盖运行时连接（如横向扩容时的 -pooler 串 + pgbouncer=true）
REDIS_URL=redis://...
S3_ENDPOINT / S3_BUCKET / S3_ACCESS_KEY / S3_SECRET_KEY
MASTER_KEY=            # 32 bytes hex，信封加密主密钥
JWT_SECRET=
PUBLIC_VERIFY_BASE_URL=https://verify.veazen.app
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
GEOIP_DB_PATH=         # MaxMind GeoLite2-City.mmdb（人工下载放置；或配 MAXMIND_LICENSE_KEY 由启动脚本自动下载）
MAXMIND_LICENSE_KEY=   # 可选：设置后容器启动时自动拉取 GeoLite2-City
ANONYMIZE_IP=false
```

## 12. Backlog（原 Phase 5+ 重构；**全部设触发条件，无触发不启动**）

### 12.0 冻结纪律（高于本节任何条目）
产品已具备完整可售形态并在生产运行，**瓶颈是零客户、零设计伙伴、插件未上架**。在拿到第一个付费客户或明确的客户需求之前，本节任何条目**均不得启动**。出现"这个很快就能做"的冲动 → 记入 `CLAUDE.md` Backlog，不实现。触发条件由**人（老板）确认**，不由实现方自行判定。

### 12.1 已排队（交接书既有队列，触发条件见 `docs/PROJECT_HANDOVER_zh.md`）
E2 码段工坊（自定义生成 + BYO CSV）｜E3 分销管理（分销商层级、渠道分配、窜货逐件定位）｜E4 产品批量导入｜E5 自定义域名/白标（对应本文 §7.6 白标一期）｜E6 PWA｜P1b 开闸｜插件上架

### 12.2 来自《行业流程手册》（`docs/INDUSTRY_PLAYBOOKS_zh.md`）
| 条目 | 内容 | 触发条件 |
|---|---|---|
| **批次 lot/expiry 字段** | 补剂/食品/美妆/宠物刚需 + 法规要求 | ✅ **已进批次 R 的 S1，无需等待** |
| `industry_presets` 框架 | 行业预设包（码角色/必填字段/验证页模块/风控权重/标签模板）+ onboarding 行业下拉 | **第 2 个行业的付费客户出现时**。第一个行业（补剂）由 S1 直接硬编码交付，不需要框架 |
| **R5 层级聚合** | `cases`（SSCC）+ `code_case_links`，箱↔件父子绑定；美妆窜货、汽配分销的追责基础 | 与 E3 分销管理同时触发 |
| 码角色模型 R1-R5 | 术语统一（品类码/批次码/单品码/核销码/物流码）；"机身码"=R3+DPM 载体 | **文档与销售资产，非开发任务** |
| 四问诊断话术 / 行业一页纸 | 销售侧应用 | **老板任务，非 Claude Code 任务** |

### 12.3 来自《平台生态分析》（`docs/PLATFORM_ECOSYSTEM_ANALYSIS_zh.md`）
| 条目 | 内容 | 触发条件 |
|---|---|---|
| **卸载/欠费不砖化** | 消费者验证路径永不受计费状态影响 | ✅ **已进批次 R 的 A2（架构不变量 + e2e 锁死）** |
| `ChannelAdapter` 抽象 | `packages/adapters/{shared,woocommerce,shopify}`，核心只认接口 | **决定做 Shopify 时才做**。⚠️ 原分析建议"现在就做"**已撤回**：零客户下基于猜测的抽象劣于事后重构，且 AI 时代重构成本低 |
| Shopify App | 技术清单见分析 §3.3（App Bridge session token、Polaris 双皮肤、Theme App Extension、三个强制隐私 webhook、**强制 Billing API**、首 100 万美元 0% 抽成、审核 2-8 周） | 老板决策"启动第二渠道"时 |
| `tenants.billing_source` 多源 | stripe/lemonsqueezy/shopify 并存；同品牌跨平台必须同租户（否则风控数据割裂） | 随 Shopify App |
| 工厂端 PWA 离线优先 | 中文界面 + IndexedDB 缓存 + 批量上传 + CSV 兜底（工厂穿墙网络慢） | 首个使用中国代工厂的客户 |
| 中国跨境卖家客群 | 消费者在欧美扫码 → ICP/PIPL/防火墙问题全部消失；渠道走店匠/Shopline + 中文社群 | 市场动作，非开发任务 |
| **中国大陆场景 A（内销）** | ❌ **明确不做**：经营性 ICP 许可证要求外资 ≤50%（VEAZEN LLC 100% 美资不可持有）；`.app` 等 TLD 在 ICP 备案中常被拒；境内数据须留境内；政府体系 + 本土价格战 | **永不启动**（除非出现愿承担合资/境内部署成本的企业客户） |

### 12.4 亚马逊（2026-07 新增调研结论）
| 条目 | 内容 | 触发条件 |
|---|---|---|
| **不做"亚马逊卖家工具"** | FBA 下商家不发货 →"发货即贴码"流程不存在，订单绑定不可能（亚马逊拣哪件是哪件）；仓库级拦截是亚马逊自有能力，无法竞争 | ❌ 不启动 |
| **Transparency Interoperability** | 亚马逊允许品牌用**自有序列号**接入 Transparency（要求：唯一、7-20 字符、1D/QR/2D，可 API 实时提交）→ Veazen 的码可喂给 Transparency，实现"一个码通吃所有渠道，含亚马逊"。⚠️ 待验证：单枚 QR 能否同时满足亚马逊仓库扫描与消费者跳转 | **首个多渠道（Amazon + DTC）客户提出时** |
| 多渠道论证话术 | Transparency 只保护亚马逊，却要求**所有制造单元都贴码**（无论在哪销售）→ 品牌付全部成本只得局部保护；且数据归亚马逊 | **销售资产，立即可用，零开发** |

### 12.5 长期方向（无触发条件，仅记录）
窜货地图可视化增强、EPCIS 2.0 JSON 导出、NFC（NTAG 424 DNA SUN）、区块链锚定（scan_digests 日摘要上链，衔接 §1.10）、DPP 合规导出模板、印刷厂伙伴门户（partner 角色）、行业假货态势报告自动化、白标二期（发件域 SPF/DKIM 向导、报告品牌化、验证页 A/B）

---

## 13. 需要人工完成的事项（Claude Code 无法代办，实施中遇到时在 `HUMAN_TODO.md` 追加）

- ✅ 域名/DNS/邮箱/官网/生产环境**全部完成**（2026-07-12 上线；拓扑见交接书 §4.4）。剩余：另购 4-6 字符超短 QR 跳转域；商标下证后防御性收 veazen.net/.io
- ✅ 账号矩阵基本就位（GitHub org `veazen` / Cloudflare+R2 / Neon / Railway / Resend / MaxMind / UptimeRobot / EasyWP 演示店）。⏳ **WordPress.org 账号待批复**（批复后立即上架——这是通往第一个客户的路）
- 🔴 **Neon 升级付费档（$19/月）**：免费档 PITR 窗口过短；数据库是全部已印出码的唯一身份来源，丢失=所有在市商品同时失效，属不可逆事故。批次 R 的 A1 前置
- 🔴 **收款主体地址（根因）**：Lemon Squeezy KYC 受阻——Stripe 轨道拒 PMB 地址。**换支付平台大概率无效**（Paddle 底层同为 Stripe 系风控）。真解法是取得非 PMB 的商业实体地址（虚拟办公室，约数十美元/月）。该问题连锁影响 Stripe 直连、银行、未来 Shopify Billing，值得一次性解决
- 🔴 **设计伙伴客户开发**：从美国补剂/功能食品 DTC 品牌接触 20 家，目标 3-5 家内测。**软件已经够了，前十个客户只能靠人**（话术见《行业流程手册》§5 四问诊断）
- 商标：以 VEAZEN LLC 为申请人注册 VEAZEN 商标（第 9、42 类）。**律师检索重点**：Justia 上已存在 "VEAZEN LLC" 商标持有人记录——确认其是否为本公司自有申请；核查中国乐器品牌 VEAZEN费森 在美/欧的注册是否越出第 15 类（尤其第 9 类电子乐器相关子类）；确认后按马德里体系扩展 T1/T2 市场
- 收款：法律名 VEAZEN LLC，账单描述符 VEAZEN（品牌与主体同名，无需 DBA）。**现行方案已改为 Lemon Squeezy**（记录商户），配置手册见 `docs/BILLING_SETUP_zh.md`；Wise Business 已开户
- ✅ 演示商店已建（EasyWP + WooCommerce + 本插件，实弹演习五项全过），可用于销售演示："扫这个真实商品的码"
- 若实际运营地在加州：办理加州外州公司登记（foreign qualification）并预算每年 $800 特许经营税；与会计师确认 BOI（FinCEN 受益所有人）申报的最新要求
- ✅ 生产环境 MASTER_KEY 已生成，用户离线备份两份（2026-07-12）
- GDPR 隐私政策与 DPA 法务审核（须覆盖 device_fp 指纹与跨租户风控数据的合法性基础）
- 第三方渗透测试采购
- SOC 2 Type II 流程启动（观察期 6-12 个月，越早启动越好；audit_logs 即为其证据基础）
- GS1 会员注册（获取 GTIN 能力与标准背书）
- 印刷厂合作认证体系的商务谈判（技术承接见 §12.5 伙伴门户）
- 行业报告发布前的法务复核（确保聚合数据无法反识别客户）
- NFC 芯片供应链（Phase 5）
