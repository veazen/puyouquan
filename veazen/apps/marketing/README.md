# @veazen/marketing

Astro static marketing site for veazen.app, deployed to the Cloudflare Pages
project `veazen` (currently serving a hand-deployed temp page with the same
§2.5 token system).

**Status: Phase 0-style skeleton.** Site v1 (homepage, pricing, features,
waitlist form wired to the cloud `waitlist` table, privacy/ToS skeletons,
SEO) is a Phase 2 deliverable; at that point this app takes over the Pages
project via git integration and the temp page retires.

`src/tokens.ts` is the typed source of the §2.5 brand tokens (palette, font
stacks, slogans) with tests pinning the exact values.
