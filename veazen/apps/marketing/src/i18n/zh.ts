import type { Dict } from './types';

/**
 * 简体中文文案 — 面向品牌方的 B2B 语气，专业简洁。
 * 术语约定：QR → 二维码；scratch code → 刮码/暗码；batch → 批次；
 * gray-market diversion → 窜货；counterfeit → 假货/仿冒品；
 * traceability → 溯源；waitlist → 等待列表。品牌名 Veazen 不译。
 */
export const zh: Dict = {
  meta: {
    home: {
      title: 'Veazen — 面向成长型品牌的防伪验证与溯源平台',
      description:
        '每件商品一枚加密签名防伪码。消费者扫码验证，品牌方掌握每一次扫码。数分钟即可在 WooCommerce 上完成部署的防伪与供应链溯源方案。',
    },
    features: {
      title: '功能 — Veazen',
      description:
        '一物一码加密签名、刮码验真、证据级扫码日志、窜货检测与白标定制。',
    },
    pricing: {
      title: '价格 — Veazen',
      description:
        '从免费自打印标签到全白标企业级部署，覆盖各阶段的防伪验证方案。',
    },
    supplements: {
      title: '面向补剂品牌 — Veazen',
      description:
        '把 COA 检测报告放进扫码页：批号、有效期与第三方检测结果随瓶可查——为 DTC 补剂品牌打造的防伪验证方案。',
    },
  },
  nav: {
    features: '功能',
    pricing: '价格',
    waitlist: '加入等待列表',
  },
  footer: {
    company: 'Veazen™ 是 VEAZEN LLC 旗下产品。',
    privacy: '隐私政策',
    terms: '服务条款',
  },
  banner: {
    text: '切换到中文版？',
    switchLabel: '切换',
    dismissLabel: '关闭，不再提示',
  },
  serialBar: {
    verified: '验证通过',
    ariaLabel: '已验证防伪码示例 {serial}',
  },
  waitlist: {
    emailPlaceholder: '工作邮箱 *',
    brandPlaceholder: '品牌名称',
    websitePlaceholder: '官网地址',
    unitsAria: '月发货量',
    unitsPlaceholder: '月发货量',
    unitsLt1k: '1,000 件以下',
    units1k10k: '1,000 – 10,000 件',
    units10k100k: '10,000 – 100,000 件',
    unitsGt100k: '100,000 件以上',
    submit: '申请抢先体验',
    ok: '已加入等待列表——我们会尽快与您联系。',
    rateLimited: '请求过于频繁——请一分钟后再试。',
    fallbackPrefix: '报名服务暂时无法连接——',
    fallbackLink: '改为通过邮件发送申请 →',
    mailtoSubject: '抢先体验申请',
  },
  home: {
    heroKicker: '防伪 · 溯源',
    heroSub:
      '每件商品都拥有一枚唯一的加密签名防伪码。消费者扫码验证，您在地图上看到每一次扫码。假货与窜货从此无所遁形。',
    ctaPrimary: '申请抢先体验',
    ctaSecondary: '了解工作原理',
    stepsKicker: '三步上手',
    stepsHeading: '从安装到首次验证扫码，只需几分钟',
    steps: [
      {
        title: '生成',
        body: '连接 WooCommerce 插件，选择产品，在云端生成签名防伪码——小批量也可直接导出可打印的标签文件。',
      },
      {
        title: '贴标',
        body: '自行打印二维码标签，或将批次文件发给印刷厂。防伪码在出厂激活前始终处于未激活状态。',
      },
      {
        title: '扫码',
        body: '消费者扫码即可验证——绿、黄、红三色结果一目了然。您可实时获取扫码位置、重复扫码告警与窜货信号。',
      },
    ],
    whyKicker: '为什么选择 Veazen',
    whyHeading: '企业级防护，无需企业级合同',
    why: [
      {
        title: '签名防伪，而不只是唯一编号',
        body: '每枚防伪码都带有 Ed25519 签名，并在服务端完成校验。仿冒者即使穷举序列号也一无所获。',
      },
      {
        title: '证据级日志',
        body: '扫码记录只增不改，并锚定至每日 Merkle 摘要链——可作为打假下架与渠道纠纷中的有效证据。',
      },
      {
        title: '刮码验真',
        body: '刮开式暗码为买家提供一次性的正品确认。同一暗码被二次兑验将立即触发告警。',
      },
      {
        title: '全站 HTTPS，域名层面强制',
        body: '验证服务运行在 veazen.app——该域名在协议层强制 HSTS 预加载，验证页面无法被降级到明文连接。',
      },
    ],
    waitlistKicker: '抢先体验',
    waitlistHeading: '加入等待列表',
    waitlistIntro:
      '我们正在接入首批品牌客户。留下您的联系方式与大致月发货量，我们将为您保留名额。',
  },
  features: {
    kicker: '功能',
    heading: '企业级系统的实力，插件级的价格。',
    items: [
      {
        title: '一物一码，加密签名',
        body: '每件商品分配一枚唯一的 20 位序列号，由品牌专属 Ed25519 密钥签名。验证始终回源云端完成——防伪码无法离线伪造或重放。',
      },
      {
        title: '明码与暗码双重防线',
        body: '公开二维码向任何人展示商品来源与真伪状态；刮开式暗码供买家一次性兑验，将商品置为“已验证”——任何二次兑验都会触发严重告警。',
      },
      {
        title: '防伪码出厂前不激活',
        body: '印刷厂收到的只是未激活的码。只有经过您的出厂激活才能被验证，即使印厂环节泄露，得到的也只是一堆无效码。',
      },
      {
        title: '证据级扫码历史',
        body: '扫码事件在数据库权限层即为只增不改，并锚定至每日 Merkle 摘要链。面对仿冒者或违规经销商时，您的日志经得起检验。',
      },
      {
        title: '风险雷达',
        body: '重复兑验、不可能的地理位移（数小时内跨国扫码）、市场外扫码比例异常等都会自动触发告警——通过邮件、控制台与 Webhook 送达。',
      },
      {
        title: '面向微型品牌的 Lite 模式',
        body: '没有工厂？在家用标准 Avery 标签纸自行打印。防伪码生成即激活，并锁定首次扫码。从安装插件到打出第一张可扫码标签，不到十分钟。',
      },
      {
        title: '对齐 GS1 标准的溯源',
        body: '二维码 URL 遵循 GS1 Digital Link 格式，追溯事件映射 EPCIS 2.0 语义，您的数据始终可迁移、符合行业标准。',
      },
      {
        title: '业务成长后可白标',
        body: '使用您自己的验证域名、码格式与页面设计——而签名、扫码数据与证据链仍锚定在平台之上。',
      },
    ],
  },
  pricing: {
    kicker: '价格',
    heading: '免费起步，随业务成长升级到白标。',
    introBefore: '首批客户的专属价格正在最终确定——',
    introLink: '加入等待列表',
    introAfter: '，我们将第一时间通知您。',
    tiers: [
      {
        name: '免费版',
        tagline: '在您的店铺先试起来',
        features: [
          '每月 500 枚防伪码',
          'Lite 模式（自行打印标签）',
          '首扫锁定',
          '扫码分析（30 天）',
          '“Powered by Veazen” 标识',
        ],
      },
      {
        name: '入门版',
        tagline: '适合稳定出货的小型品牌',
        features: [
          '包含免费版全部功能',
          '更高的码量额度',
          '刮开式暗码',
          '风险告警（重复兑验、地理异常）',
          '邮件支持',
        ],
      },
      {
        name: '成长版',
        tagline: '认真对待防伪的品牌之选',
        features: [
          '包含入门版全部功能',
          '自定义码格式',
          '验证页主题定制',
          'Webhook 与 API 接入',
          '弱化平台标识',
        ],
        highlight: true,
      },
      {
        name: '企业版',
        tagline: '全面白标',
        features: [
          '包含成长版全部功能',
          '专属验证域名',
          '自有序列号导入',
          '自定义 CSS、无平台标识',
          '证据报告导出',
          'SLA 与优先支持',
        ],
      },
    ],
  },
  supplements: {
    kicker: '面向补剂品牌',
    heading: '你的 COA 是最好的销售员，别再把它藏在没人点的 PDF 链接里。',
    sub: '每一瓶都有一枚加密签名二维码。消费者扫一次码，就能看到正品状态、批号与有效期，以及这一批次的第三方检测报告。信任才是卖点——防伪是顺带的。',
    painsKicker: '行业痛点',
    painsHeading: 'DTC 补剂品牌绕不开的三件事',
    pains: [
      {
        title: '亚马逊混仓（co-mingling）',
        body: '你的正品和别人的假货可能被混在同一个 FBA 库位——退货和差评砸的却是你的 Listing。一瓶一码让每件商品都可自证，证据级扫码日志则是你申诉与反击的弹药。',
      },
      {
        title: '成分真实性的天然怀疑',
        body: '消费者对补剂里到底装了什么天然存疑——这是行业自己挣来的原罪。每次扫码背后都有一份第三方 COA 检测报告，在疑问出口之前就给出答案。',
      },
      {
        title: '批次、有效期与召回管理',
        body: '批记录与有效期管理是法规底线（21 CFR 111）。Veazen 把批号、日期和 COA 绑定到每一枚码上，召回从消防演习变成一条筛选查询。',
      },
    ],
    coaKicker: 'COA 模块',
    coaHeading: '把检测报告放进扫码页',
    coaBody: '现在你的 COA 躺在官网某个没人点开的 PDF 链接里。把它搬进验证页：消费者拿到新瓶子的第一件事就是扫码——正品确认、批号、有效期和这一批次的检测报告，一屏看完。验证是功能，信任才是产品。',
    coaHighlight: '扫码 → 正品 ✓ → 批号与有效期 → 第三方 COA。一屏之内，每瓶如此。',
    flowKicker: '如何运作',
    flowHeading: '从注册到可验证的瓶子，七步走完',
    flowSteps: [
      '在控制台或 WooCommerce 插件里建产品、上传 COA。',
      '申请码批次，绑定批号、生产日期与有效期。',
      '打印二维码标签——家用 Avery 标签纸或印刷厂标签卷都可以。',
      '灌装或发货时贴标；Lite 码生成即激活。',
      'DTC 发货绑定订单，或把货发往 3PL / FBA。',
      '消费者扫码：绿色正品状态、批次信息，COA 一键可达。',
      '数据回流：扫码地图、二次核销告警与窜货信号。',
    ],
    flowNote: 'Lite 模式（自打印标签）：从注册到第一个可扫码的瓶子约 30 分钟——含 COA 上传。',
    ctaKicker: '抢先体验',
    ctaHeading: '让下一批货用上 Veazen',
    ctaBody: '我们正在接入第一批补剂与功能食品品牌。加入等待列表，我们为你保留名额。',
    ctaButton: '加入等待列表',
  },
};
