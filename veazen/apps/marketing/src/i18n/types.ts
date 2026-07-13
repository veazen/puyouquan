/**
 * Shared shape of the locale dictionaries. `en.ts` and `zh.ts` must both
 * satisfy `Dict`, so a missing or extra key in either file fails `astro check`.
 */

export interface TitledItem {
  title: string;
  body: string;
}

export interface Tier {
  name: string;
  tagline: string;
  features: string[];
  /** presentational flag carried with the tier so templates stay data-driven */
  highlight?: boolean;
}

export interface Dict {
  meta: {
    home: { title: string; description: string };
    features: { title: string; description: string };
    pricing: { title: string; description: string };
  };
  nav: {
    features: string;
    pricing: string;
    waitlist: string;
  };
  footer: {
    company: string;
    privacy: string;
    terms: string;
  };
  /**
   * Language-suggestion banner shown on English pages to zh-preferring
   * browsers — its copy is Chinese by design in both dictionaries.
   */
  banner: {
    text: string;
    switchLabel: string;
    dismissLabel: string;
  };
  serialBar: {
    verified: string;
    /** `{serial}` is replaced with the rendered serial */
    ariaLabel: string;
  };
  waitlist: {
    emailPlaceholder: string;
    brandPlaceholder: string;
    websitePlaceholder: string;
    unitsAria: string;
    unitsPlaceholder: string;
    unitsLt1k: string;
    units1k10k: string;
    units10k100k: string;
    unitsGt100k: string;
    submit: string;
    ok: string;
    rateLimited: string;
    fallbackPrefix: string;
    fallbackLink: string;
    mailtoSubject: string;
  };
  home: {
    heroKicker: string;
    heroSub: string;
    ctaPrimary: string;
    ctaSecondary: string;
    stepsKicker: string;
    stepsHeading: string;
    steps: TitledItem[];
    whyKicker: string;
    whyHeading: string;
    why: TitledItem[];
    waitlistKicker: string;
    waitlistHeading: string;
    waitlistIntro: string;
  };
  features: {
    kicker: string;
    heading: string;
    items: TitledItem[];
  };
  pricing: {
    kicker: string;
    heading: string;
    introBefore: string;
    introLink: string;
    introAfter: string;
    tiers: Tier[];
  };
}
