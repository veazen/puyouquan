import type { Dict } from './types';

/** English copy — the source language, served at the root paths. */
export const en: Dict = {
  meta: {
    home: {
      title: 'Veazen — Anti-counterfeit verification & traceability for growing brands',
      description:
        'One cryptographically signed code per item. Consumers scan, you see every scan. Anti-counterfeit protection and supply-chain traceability that installs in minutes on WooCommerce.',
    },
    features: {
      title: 'Features — Veazen',
      description:
        'Signed one-per-item codes, scratch confirmation, evidence-grade scan logs, gray-market detection and white-label options.',
    },
    pricing: {
      title: 'Pricing — Veazen',
      description:
        'Anti-counterfeit verification plans from free self-print labels to fully white-labeled enterprise deployments.',
    },
    supplements: {
      title: 'For supplement brands — Veazen',
      description:
        'Put your COA inside the scan. Lot, expiry and the third-party lab report on every bottle — anti-counterfeit verification built for DTC supplement brands.',
    },
  },
  nav: {
    features: 'Features',
    pricing: 'Pricing',
    waitlist: 'Join the waitlist',
  },
  footer: {
    company: 'Veazen™ is a product of VEAZEN LLC.',
    privacy: 'Privacy',
    terms: 'Terms',
  },
  banner: {
    text: '切换到中文版？',
    switchLabel: '切换',
    dismissLabel: '关闭，不再提示',
  },
  serialBar: {
    verified: 'Verified',
    ariaLabel: 'Example verified serial {serial}',
  },
  waitlist: {
    emailPlaceholder: 'Work email *',
    brandPlaceholder: 'Brand name',
    websitePlaceholder: 'Website',
    unitsAria: 'Units per month',
    unitsPlaceholder: 'Units / month',
    unitsLt1k: '< 1,000',
    units1k10k: '1,000 – 10,000',
    units10k100k: '10,000 – 100,000',
    unitsGt100k: '> 100,000',
    submit: 'Request early access',
    ok: "You're on the list — we'll be in touch.",
    rateLimited: 'Too many attempts — please try again in a minute.',
    fallbackPrefix: 'Our signup service is briefly unreachable — ',
    fallbackLink: 'send us your request by email instead →',
    mailtoSubject: 'Early access request',
  },
  home: {
    heroKicker: 'Anti-counterfeit · Traceability',
    heroSub:
      'Every item gets a unique, cryptographically signed code. Consumers scan it; you see every scan on a map. Counterfeits and gray-market diversion stop being invisible.',
    ctaPrimary: 'Request early access',
    ctaSecondary: 'See how it works',
    stepsKicker: 'Three steps',
    stepsHeading: 'From install to first verified scan in minutes',
    steps: [
      {
        title: 'Generate',
        body: 'Connect the WooCommerce plugin, pick a product, and generate signed codes in the cloud — or print-ready label sheets for small batches.',
      },
      {
        title: 'Attach',
        body: 'Print QR labels yourself or send the batch file to your print shop. Codes stay inactive until you activate them at factory exit.',
      },
      {
        title: 'Scan',
        body: 'Customers verify with one scan — green, yellow or red. You get scan locations, duplicate alerts and gray-market signals in real time.',
      },
    ],
    whyKicker: 'Why Veazen',
    whyHeading: 'Enterprise-grade protection without the enterprise contract',
    why: [
      {
        title: 'Signed, not just unique',
        body: 'Every code carries an Ed25519 signature verified server-side. Guessing serial numbers gets counterfeiters nowhere.',
      },
      {
        title: 'Evidence-grade logs',
        body: 'Scan history is append-only and anchored in a daily Merkle digest chain — usable as evidence in takedowns and channel disputes.',
      },
      {
        title: 'Dark-code confirmation',
        body: 'A scratch-off hidden code gives buyers a one-time proof of purchase authenticity. Second redemptions raise instant alerts.',
      },
      {
        title: 'HTTPS everywhere, by domain design',
        body: "Verification lives on veazen.app — a domain with HSTS preloading enforced at the protocol level, so verify pages can't be downgraded.",
      },
    ],
    waitlistKicker: 'Early access',
    waitlistHeading: 'Join the waitlist',
    waitlistIntro:
      "We're onboarding a first cohort of brands. Tell us where to reach you and roughly how many units you ship — we'll reserve your spot.",
  },
  features: {
    kicker: 'Features',
    heading: 'Built like the expensive systems. Priced like a plugin.',
    items: [
      {
        title: 'One code per item, cryptographically signed',
        body: 'Each unit gets a unique 20-character serial backed by a per-brand Ed25519 signature. Verification always round-trips to the cloud — codes cannot be minted or replayed offline.',
      },
      {
        title: 'Light & dark dual codes',
        body: 'A public QR shows provenance and authenticity state to anyone. A scratch-off hidden code gives the buyer a one-time redemption that flips the item to "verified" — and any second attempt triggers a critical alert.',
      },
      {
        title: 'Codes ship inactive',
        body: 'Print shops receive inactive codes. Only your factory-exit activation makes them verifiable, so a leak at the printer produces nothing but dead codes.',
      },
      {
        title: 'Evidence-grade scan history',
        body: 'Scan events are append-only at the database-permission level and anchored into a daily Merkle digest chain. When you fight a counterfeiter or a rogue distributor, your logs hold up.',
      },
      {
        title: 'Risk radar',
        body: 'Duplicate redemptions, impossible geography (two countries hours apart), and out-of-market scan ratios raise alerts automatically — by email, dashboard and webhook.',
      },
      {
        title: 'Lite mode for micro-brands',
        body: 'No factory? Print your own labels at home on standard Avery sheets. Codes activate on generation and lock to the first scan. From plugin install to first scannable label in under ten minutes.',
      },
      {
        title: 'Traceability aligned with GS1',
        body: 'QR URLs follow the GS1 Digital Link format and trace events map to EPCIS 2.0 semantics, so your data stays portable and standards-friendly.',
      },
      {
        title: 'White-label when you grow',
        body: 'Your own verify domain, your code format, your page design — while signatures, scan data and evidence chains stay anchored to the platform.',
      },
    ],
  },
  pricing: {
    kicker: 'Pricing',
    heading: 'Start free. Scale to white-label.',
    introBefore: 'Early-access cohort pricing is being finalized — ',
    introLink: 'join the waitlist',
    introAfter: " and we'll share it first.",
    tiers: [
      {
        name: 'Free',
        tagline: 'Try it on your store',
        features: [
          '500 codes / month',
          'Lite mode (self-print labels)',
          'First-scan lock',
          'Scan analytics (30 days)',
          '"Powered by Veazen" badge',
        ],
      },
      {
        name: 'Starter',
        tagline: 'For small brands shipping steadily',
        features: [
          'Everything in Free',
          'Higher code volume',
          'Scratch hidden codes',
          'Risk alerts (duplicates, geo)',
          'Email support',
        ],
      },
      {
        name: 'Growth',
        tagline: 'Serious anti-counterfeit posture',
        features: [
          'Everything in Starter',
          'Custom code formats',
          'Verify-page theme tokens',
          'Webhooks & API access',
          'Reduced badge',
        ],
        highlight: true,
      },
      {
        name: 'Enterprise',
        tagline: 'White-label everything',
        features: [
          'Everything in Growth',
          'Your own verify domain',
          'BYO serial import',
          'Custom CSS + no badge',
          'Evidence report exports',
          'SLA & priority support',
        ],
      },
    ],
  },
  supplements: {
    kicker: 'For supplement brands',
    heading: 'Your COA is your best salesperson. Stop hiding it in a PDF link.',
    sub: 'Every bottle gets a cryptographically signed QR. One scan shows genuine-product status, the batch lot and expiry, and the third-party lab report for that exact batch. Trust is the selling point — anti-counterfeiting comes free.',
    painsKicker: 'The problems',
    painsHeading: 'Three things every DTC supplement brand fights',
    pains: [
      {
        title: 'Amazon co-mingling',
        body: "Your genuine stock and someone else's counterfeit can share the same FBA bin — and the returns and one-star reviews land on your listing. Per-bottle codes make every unit provable, and give you evidence-grade scan logs to fight back with.",
      },
      {
        title: 'Ingredient skepticism',
        body: "Supplement buyers doubt what's inside the capsule — the industry earned that. A third-party Certificate of Analysis behind every scan answers the question before it's asked.",
      },
      {
        title: 'Lot, expiry & recall discipline',
        body: 'Batch records and expiry management are the regulatory baseline (21 CFR 111). Veazen binds lot number, dates and COA to every code, so a recall becomes a filter query — not a fire drill.',
      },
    ],
    coaKicker: 'The COA module',
    coaHeading: 'Put the lab report inside the scan',
    coaBody: 'Right now your COA sits behind a PDF link nobody opens. Move it to the verify page instead: the first thing a customer does with a new bottle is scan it — and they see authenticity, lot, expiry and the lab report for that exact batch on one screen. Verification is the feature; trust is the product.',
    coaHighlight: 'Scan → genuine ✓ → lot & expiry → third-party COA. One screen, every bottle.',
    flowKicker: 'How it works',
    flowHeading: 'From sign-up to verified bottles in seven steps',
    flowSteps: [
      'Create the product and upload its COA in the console or the WooCommerce plugin.',
      'Request a code batch bound to the lot number, manufacture date and expiry.',
      'Print the QR labels — Avery sheets at home, or a label roll from your print shop.',
      'Stick the label as you bottle or as you ship; Lite codes activate on generation.',
      'Ship DTC with order binding, or send stock onward to your 3PL / FBA.',
      'Customers scan: green status, batch info — and the COA one tap away.',
      'Scan data flows back: locations, duplicate alerts and gray-market signals.',
    ],
    flowNote: 'Lite mode (self-printed labels): about 30 minutes from sign-up to the first scannable bottle — COA upload included.',
    ctaKicker: 'Early access',
    ctaHeading: 'Put your next batch on Veazen',
    ctaBody: "We're onboarding a first cohort of supplement and functional-food brands. Join the waitlist and we'll reserve your spot.",
    ctaButton: 'Join the waitlist',
  },
};
