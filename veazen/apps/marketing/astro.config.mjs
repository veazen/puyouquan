import { defineConfig } from 'astro/config';

// Static output for Cloudflare Pages (project `veazen`, bound to veazen.app).
// Phase 2 takes over the Pages project via git integration — see PROJECT_PLAN §2.5/§8.
export default defineConfig({
  site: 'https://veazen.app',
  output: 'static',
});
