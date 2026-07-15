# Lemon Squeezy 收款配置手册（P1 收款闭环）

> 面向：编程新手（照着点按钮即可）。
> 前置：你已有 Lemon Squeezy 账号（店铺已通过审核）、Railway 上的
> `api` 服务、Neon 数据库控制台的访问权限。
> 方案背景见 `docs/MONETIZATION_PLAN_zh.md`（2026-07-13 批示方案 B）。

## 这套东西是怎么转起来的（30 秒看懂）

1. 客户在控制台 Settings → Plan & Billing 点「Upgrade to Starter/Growth」，
   跳到 Lemon Squeezy 的付款页（链接里我们悄悄带上了租户 ID）；
2. 付款成功后，Lemon Squeezy 往我们的 API 发一条「订阅创建」通知
   （webhook），API 验签后把该租户的档位改成 starter/growth；
3. 以后每次续费/取消/到期，Lemon Squeezy 都会再发通知，档位自动同步；
4. `BILLING_ENFORCEMENT=on` 打开后，免费档才会真正被限制
   （500 码/月、无刮码批次、无退货套件等）——不开就完全不拦，
   跟现在一模一样。

---

## 第一步：在 Lemon Squeezy 建两个订阅产品

1. 登录 <https://app.lemonsqueezy.com>，左侧点 **Store → Products**；
2. 点右上角 **+ New product**：
   - Name 填 `Veazen Starter`；
   - Pricing 选 **Subscription**，填月费（定价按老板批示）；
   - 点 **Publish product** 保存；
3. 同样方法再建一个 `Veazen Growth`。

> 建议先打开右上角的 **Test Mode**（测试模式）把整个流程演练一遍，
> 测试模式下可以用假信用卡 `4242 4242 4242 4242` 付款，不产生真实扣款。
> 演练通过后切回正式模式，**正式模式要重新建产品、重新拿下面的
> 三样东西**（variant id、购买链接、webhook secret 测试和正式是分开的）。

### 1a. 拿购买链接（checkout URL）

1. 在 Products 列表里点产品行右侧的 **…（三个点）→ Share**；
2. 弹窗里有一条 `https://你的店.lemonsqueezy.com/buy/xxxxxxxx` 的链接，
   点 **Copy** 复制下来；
3. 两个产品各拿一条，记为「Starter 购买链接」「Growth 购买链接」。

### 1b. 拿 variant id（变体编号）

每个产品都有一个"变体"（variant），webhook 通知里带的是变体编号，
我们靠它判断客户买的是哪一档。拿法（任选其一）：

- **方法一（推荐）**：点进产品编辑页，找到 **Variants** 区块，点进那个
  唯一的变体，此时浏览器地址栏形如
  `https://app.lemonsqueezy.com/products/12345/variants/678901`，
  最后那串数字 `678901` 就是 variant id；
- **方法二**：先把第三步的 webhook 配好，用测试模式买一单，然后到
  **Settings → Webhooks** 点进你的 endpoint 看 **Recent deliveries**
  （最近投递记录），请求体里 `data.attributes.variant_id` 就是它。

两个产品各记一个数字。

---

## 第二步：建 API key（本期备用，先建好存起来）

1. 左下角齿轮 **Settings → API**；
2. 点 **+** 号，Name 随便填（如 `veazen-api`），点 **Create**；
3. 弹出的一长串就是 API key，**只显示一次**，复制存进密码管理器。

> 本期代码只用 webhook 同步档位，还不主动调 Lemon Squeezy 的 API，
> 这把 key 是给后续「客户自助管理订阅」功能预留的，先配上无妨。
> 顺便把 **Settings → Stores** 里你店铺的编号（Store ID，一个数字）
> 也记下来。

---

## 第三步：配 webhook（最关键的一步）

1. **Settings → Webhooks**，点 **+**；
2. **Callback URL** 填：

   ```
   https://api.veazen.app/api/v1/billing/webhooks/lemonsqueezy
   ```

3. **Signing secret** 填一串你自己编的随机密码（40 位以内字母数字，
   比如用密码管理器生成一串），**记下来**，等下 Railway 要填同一串；
4. **Updates** 事件勾选里，把 `subscription_created`、
   `subscription_updated`、`subscription_cancelled`、
   `subscription_expired` 四个都勾上（其他的不勾也行，API 会忽略）；
5. 点 **Save webhook**。

---

## 第四步：在 Railway 给 api 服务填 6 个环境变量

打开 Railway → 你的项目 → **api 服务 → Variables**，逐个添加：

| 变量名 | 填什么 | 示例 |
|---|---|---|
| `LEMONSQUEEZY_WEBHOOK_SECRET` | 第三步你编的那串 signing secret | `k8Qw…（你的随机串）` |
| `LEMONSQUEEZY_VARIANT_PLAN_MAP` | JSON：variant id → 档位 | `{"678901":"starter","678902":"growth"}` |
| `LEMONSQUEEZY_CHECKOUT_URLS` | JSON：档位 → 购买链接 | `{"starter":"https://你的店.lemonsqueezy.com/buy/aaa","growth":"https://你的店.lemonsqueezy.com/buy/bbb"}` |
| `LEMONSQUEEZY_API_KEY` | 第二步的 API key（备用） | `eyJ0…` |
| `LEMONSQUEEZY_STORE_ID` | 你的 Store ID（备用） | `12345` |
| `BILLING_ENFORCEMENT` | **先不填或填 `off`**，走完下面的上线顺序再改 `on` | `off` |

注意：

- 两个 JSON 变量要一行写完、用英文双引号，别带多余空格换行；
  填错了也不会把 API 弄挂（会按空配置降级），但档位就同步不动了；
- 六个变量全部是可选的：一个都不填，API 照常跑，只是收款功能不开。
- Railway 保存变量后会自动重新部署，等它转完。

---

## 第五步：上线顺序（照这个次序做，生产零风险）

1. **先配变量、不开闸门**：按第四步把前五个变量填好，
   `BILLING_ENFORCEMENT` 保持不填/off。此时一切照旧，谁也不受影响；
2. **验证 webhook 通了**：在 Lemon Squeezy 开 Test Mode 买一单
   （买之前把测试模式的 variant id 临时填进 VARIANT_PLAN_MAP，
   或者直接看 Webhooks 页面的 Recent deliveries 有没有绿色 200）。
   如果显示 401，是 secret 两边不一致；404 是 Railway 变量没生效；
3. **给自己的演示租户先升档**（防止闸门打开后自己的演示店被拦）：
   打开 Neon 控制台 → 你的数据库 → **SQL Editor**，执行：

   ```sql
   UPDATE tenants SET plan='growth' WHERE slug='<你的租户slug>';
   ```

   slug 就是你控制台 Settings 页「Tenant:」后面那个词。
   执行后刷新控制台 Settings，Plan & Billing 徽章应显示 growth；
4. **打开闸门**：Railway 把 `BILLING_ENFORCEMENT` 改成 `on`，
   等自动部署完成；
5. **验收**：
   - 用一个新注册的免费账号建「标准批次」→ 应被拦并提示升级（402）；
   - 免费账号的 Settings → Plan & Billing 应出现
     「Upgrade to Starter / Growth」按钮，点开是 Lemon Squeezy 付款页；
   - 你自己的演示租户（growth）一切功能照常。

## 出问题怎么退

把 Railway 的 `BILLING_ENFORCEMENT` 改回 `off`（或删掉），
自动重新部署后所有闸门立即失效，档位数据原样保留，随时可再打开。

## 档位规则在哪儿改

配额与功能矩阵只有一处：`apps/api/src/billing/plans.ts`
（free 500 码/月 → starter 5,000 → growth 50,000 → enterprise 不限；
刮码 Starter 起、webhook/码段/团队邀请 Growth 起、退货套件 Starter 起）。
改完跑 `npm test` 里的 plans 单测会帮你把关。

---

# 码包（Code Packs）配置（批次 R · B2）

## 码包是什么（30 秒看懂）

订阅供养「验证服务永远在线」这项永久义务；**码包**则匹配客户按批次
生产的心智：当月订阅额度用完后，生成批次会**先扣订阅额度、用尽后按
先买先用（FIFO）扣码包余额**。扣减发生在**批次生成完成时**——生成
失败的批次一枚都不扣。额度和码包都不够时，接口返回 402，响应体里
带着可购买的码包清单（`purchase_options`），控制台不会是一堵死墙。

- 定价占位（待前 10 个客户反馈后定稿）：**1 万码 $60 / 10 万码 $400**，
  单一来源在 `apps/api/src/billing/plans.ts` 的 `CODE_PACK_OPTIONS`；
- `BILLING_ENFORCEMENT` 不是 `on` 时一切照旧——不扣、不拦、零影响；
- **红线**：码包/额度耗尽绝不影响已生成码的消费者验证（ADR-012）。

## 第一步：在 Lemon Squeezy 建两个一次性商品

1. **Store → Products → + New product**：
   - Name 填 `Veazen Code Pack 10k`；
   - Pricing 选 **Single payment**（一次性付款，不是 Subscription），
     价格填 $60；
   - **Publish product** 保存；
2. 同样方法再建 `Veazen Code Pack 100k`（$400）；
3. 按上文「1a/1b」的方法各拿一条**购买链接**和一个 **variant id**。

## 第二步：在 Railway 给 api 服务加 2 个环境变量

| 变量名 | 填什么 | 示例 |
|---|---|---|
| `LEMONSQUEEZY_VARIANT_PACK_MAP` | JSON：variant id → 码数 | `{"777001":"10000","777002":"100000"}` |
| `LEMONSQUEEZY_PACK_CHECKOUT_URLS` | JSON：码包档 id → 购买链接（id 固定是 `pack_10k` / `pack_100k`） | `{"pack_10k":"https://你的店.lemonsqueezy.com/buy/ccc","pack_100k":"https://你的店.lemonsqueezy.com/buy/ddd"}` |

注意：

- webhook 沿用订阅那条（第三步已配好的 endpoint），只需在
  Lemon Squeezy 的 webhook 事件勾选里**追加勾上 `order_created`**；
- 两个变量都可选：不配 `PACK_CHECKOUT_URLS` 时 402 里只有定价没有
  链接；不配 `VARIANT_PACK_MAP` 时 order_created 通知会被安全忽略；
- 同一订单的重复通知自动去重（按 LS 订单号幂等），每次购买都写
  `billing.pack_purchased` 审计。

## 验收

1. 免费档租户把当月 500 码额度用完后再建批次 → 402，响应体含
   `purchase_options`（带你配置的购买链接）；
2. 测试模式买一单码包 → Settings → Plan & Billing 出现
   「Code pack balance」余额；
3. 再建批次 → 放行，批次 ready 后余额按超额部分减少；
4. 全程用旧批次的码扫码验证 → 一直正常（不受额度影响）。
