# S1 补剂行业化包（批次 R · B1）交付记录

> 交付日期：2026-07-15。方案依据：`docs/DIRECTIVE_BATCH_R_zh.md` B1 +
> `docs/INDUSTRY_PLAYBOOKS_zh.md` §3.1（补剂 Playbook）。
> 面向：编程新手（验收步骤照着点按钮即可）。

## 交付清单

| 层 | 内容 | 位置 |
|---|---|---|
| 数据层 | `batches` 新增 `lot_code`（批号）、`mfg_date`（生产日期）、`expiry_date`（有效期）、`coa_key`（COA 存储键），全部可空 | 迁移 `20260715160000_b1_batch_industry_fields` |
| API | `POST /batches` 接受三个可选字段（校验有效期 ≥ 生产日期）；新增 `POST /batches/:id/coa`（multipart 上传 PDF，≤10MB，仅 PDF 魔数校验，覆盖即替换，写 `batch.coa_upload` 审计）；批次详情返回 `coaUrl`（签名下载链接） | `apps/api/src/batches/` |
| 公开验证 | `GET /verify/:serial` 响应新增 `batch_info: { lot_code, mfg_date, expiry_date } \| null` 与 `coa_url: string \| null`（签名链接 TTL 1 小时；只在码属于该批次且批次有 COA 时给出） | `apps/api/src/verify/verify.service.ts` |
| 验证页 | 新增「批次信息」模块（批号/生产日期/有效期，过期红色警示「已过保质期」）与「质检报告 COA」模块（按钮打开 PDF）；两个模块只在有数据时渲染；五语 i18n（en/zh/de/es/ja）全覆盖 | `apps/web/components/verify/VerifyView.tsx` + `apps/web/messages/*.json` |
| 控制台 | 批次创建表单加批号/生产日期/有效期三个可选字段；批次列表 ready/exported 行有「Upload COA / Replace COA」按钮（错误会显示在页面顶部），已传 COA 的批次显示「COA ✓」徽标 | `apps/web/app/dashboard/batches/page.tsx` |
| WP 插件 | 批次申请表单加批号/生产日期/有效期三个可选输入（nonce/capability/sanitize 纪律不变，PHPCS 0 错误）；中文翻译补 5 条（共 112 条）。COA 上传只在控制台做 | `apps/wp-plugin/includes/class-veazen-settings-page.php` |
| 官网 | 新增 `/supplements` 行业落地页（EN + `/zh/supplements`），内容取材 Playbook §3.1：三大痛点（亚马逊混仓/成分怀疑/批次合规）、七步流程、COA 卖点（「你的 COA 躺在 PDF 链接里没人看」改写为主标题文案）；CTA 指向 waitlist；已加入 sitemap | `apps/marketing/src/components/SupplementsPage.astro` |
| 测试 | e2e 新增 `supplements-coa.e2e-spec.ts`（7 项：字段校验/持久化/COA 上传下载替换/验证响应/无数据批次为 null） | `apps/api/test/` |

## 演示商店验收步骤（建产品 → 传 COA → 生成带批号批次 → 扫码看到 COA）

1. **建产品**：打开 `https://verify.veazen.app/dashboard/login` 登录你的
   演示租户 → 左侧点 **Products** → 表单里填产品名和 SKU（比如
   `Omega-3 Softgels` / `OMEGA3-90`）→ 点 **Create product**。
   （用演示商店 WooCommerce 同步过来的产品也一样可以。）
2. **生成带批号的批次**：左侧点 **Batches** → 在表单里：
   - Product 下拉选刚才的产品；
   - Quantity 填 `50`；
   - **Lot number (optional)** 填一个批号，比如 `LOT-2607-A`；
   - **Mfg date** 点开日历选生产日期（比如今天）；
   - **Expiry date** 选两年后的日期；
   - 点 **Generate batch**，等表格里状态变成绿色 `ready`。
3. **上传 COA**：在这一行右侧点 **Upload COA** 按钮 → 文件选择框里
   选一个 PDF（≤10MB，真实的第三方检测报告或任意 PDF 都行）→
   上传成功后该行出现绿色 **COA ✓** 徽标，按钮变成 **Replace COA**。
4. **导出并激活**：同一行点 **CSV** 下载码文件，点 **Activate all**
   激活整批。
5. **扫码看效果**：从 CSV 里随便挑一行，用手机扫 `qr_url` 列的二维码
   （或直接浏览器打开该链接）。验证页上应看到：
   - 绿色「正品」状态；
   - **批次信息**模块：批号 `LOT-2607-A`、生产日期、有效期；
   - **质检报告 COA** 模块：点「查看检测报告（PDF）」按钮，浏览器
     打开你上传的那份 PDF。
6. **反向验证（可选）**：
   - 把有效期改选成昨天再生成一个批次 → 扫码时有效期显示红色并出现
     「已过保质期」警示；
   - 没填批号/日期、没传 COA 的旧批次 → 验证页不出现这两个模块
     （消费者看不到空壳）。

## 注意事项

- COA 一批一份：重复上传同一批次会**覆盖**旧文件，所有已发出的
  签名链接指向的都是当前版本；
- 验证响应里的 `coa_url` 是 1 小时有效的签名链接，每次扫码都会
  重新签发，无需担心过期；
- 三个字段全部可选，非补剂客户完全无感；行业预设（industry_presets，
  受冻结令约束，见 PROJECT_PLAN §12）未来可把它们标为必填。
