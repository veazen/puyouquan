# veazen 三视角逻辑图（2026-07-13）

> GitHub 网页版可直接渲染以下 Mermaid 图。
> 三张图分别面向：技术、企业客户（品牌方）、消费者。

## 1. 技术执行与流程逻辑图

```mermaid
flowchart TB
  subgraph BRAND["🏭 品牌方侧"]
    WP["WooCommerce 商店<br/>veazen 插件"]
    CONSOLE["品牌控制台<br/>verify.veazen.app/dashboard"]
  end

  subgraph CLOUD["☁️ Veazen 云端（Railway）"]
    API["NestJS API · api.veazen.app<br/>JWT + API Key 双认证"]
    QUEUE["BullMQ 任务队列<br/>（Upstash Redis）"]
    WORKER["码生成 Worker<br/>Ed25519 逐码签名"]
    DB[("Neon PostgreSQL<br/>租户行级隔离 RLS<br/>扫码/审计日志只增不改")]
    R2[("Cloudflare R2<br/>一次性导出 CSV<br/>刮码明文仅此一份")]
    RISK["风控引擎<br/>重复核销 · 异地飞行 · 窜货"]
    MERKLE["每日 Merkle 摘要链<br/>证据级锚定"]
  end

  subgraph CONSUMER["📱 消费者侧"]
    SCAN["手机扫二维码"]
    VERIFY["验证页 verify.veazen.app<br/>绿/黄/红三态 + 刮码核销"]
  end

  subgraph EXT["🔌 外部服务"]
    RESEND["Resend 告警邮件"]
    GEO["MaxMind GeoIP<br/>IP 截断存储"]
    HOOK["品牌方 Webhook"]
    UPTIME["UptimeRobot<br/>每 5 分钟健康检查"]
  end

  WP -->|"API Key（本地加密存储）"| API
  CONSOLE -->|JWT| API
  API -->|申请批次| QUEUE --> WORKER --> DB
  WORKER -->|导出文件| R2
  SCAN --> VERIFY -->|"公开验证接口（免登录）"| API
  API --> RISK
  RISK -->|严重告警| RESEND
  RISK -->|事件推送| HOOK
  API -->|扫码定位| GEO
  DB --> MERKLE
  UPTIME -.-> API
```

交付流水线：`GitHub main 分支 → CI 全绿 → Railway（API/验证页）与
Cloudflare Workers（官网）自动部署`。

## 2. 企业用户（品牌方）视角

```mermaid
flowchart LR
  A["① 接入<br/>WooCommerce 装插件<br/>或直接用网页控制台"] --> B["② 同步商品<br/>商品目录一键同步"]
  B --> C["③ 生成防伪码<br/>按批次申请<br/>每枚码带加密签名<br/>无法伪造或猜测"]
  C --> D["④ 贴标出厂<br/>自印或交给印刷厂<br/>出厂前始终未激活<br/>（印刷厂泄漏也无效）"]
  D --> E["⑤ 出厂激活<br/>控制台一键激活"]
  E --> F["⑥ 消费者扫码<br/>数据实时回流"]
  F --> G1["📍 扫码地图<br/>看清产品流向与热区"]
  F --> G2["🚨 假货告警<br/>重复核销即时邮件通知"]
  F --> G3["🔀 窜货检测<br/>异地/越区扫码自动标记"]
  F --> G4["📜 证据级日志<br/>打假下架与渠道纠纷可用"]
```

一句话卖点：**每件商品一枚不可伪造的码，假货和窜货第一次变得看得见。**

## 3. 消费者使用视角

```mermaid
flowchart TD
  BUY["🛒 购买商品"] --> SCAN["📱 扫描包装上的二维码<br/>（无需安装任何 App）"]
  SCAN --> RESULT{"验证结果"}
  RESULT -->|"绿色 ✅"| GREEN["正品（首次验证）<br/>展示品牌官方页面"]
  RESULT -->|"黄色 ⚠️"| YELLOW["此码已被验证过<br/>提高警惕：可能是回收包装"]
  RESULT -->|"红色 ❌"| RED["无效码<br/>可能是假货，建议反馈品牌方"]
  GREEN --> SCRATCH["刮开涂层<br/>输入隐藏暗码"]
  SCRATCH --> CONFIRM{"暗码核销"}
  CONFIRM -->|"首次核销 ✅"| OK["锁定确认：正品到手<br/>本码完成使命"]
  CONFIRM -->|"已被核销 ⚠️"| DUP["强警示：此暗码已被使用<br/>品牌方即时收到告警邮件"]
```

补充：Lite 模式（自印码）无刮码环节，采用**首扫锁定**——第一次扫码即绑定，
之后再扫显示"已验证过"。
