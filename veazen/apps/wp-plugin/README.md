# @veazen/wp-plugin

WordPress/WooCommerce plugin (slug: `veazen`) that connects a store to the Veazen
anti-counterfeit cloud platform. See `PROJECT_PLAN.md` §2.3 and §7 at the monorepo root.

## Layout

- `veazen.php` — main plugin file: header, constants, HPOS compatibility declaration, singleton boot.
- `includes/class-veazen-plugin.php` — `Veazen_Plugin` singleton (text domain + placeholder admin page).
- `uninstall.php` — deletes local options only; cloud data is never touched.
- `languages/` — translation files (POT arrives with Phase 3 strings).
- `readme.txt` — WordPress.org readme stub.
- `phpcs.xml.dist` — WordPress Coding Standards + PHPCompatibilityWP (PHP 8.1+) ruleset.

## Status: Phase 3 complete

Full feature set: connection wizard (encrypted credentials), product sync,
batch requests, order binding, `[veazen_verify]` shortcode/block, dashboard
widget, i18n POT. Build the installable zip with `npm run plugin:zip`
(outputs `dist/veazen.zip`). Demo-store walkthrough:
`docs/DEMO_STORE_GUIDE_zh.md` at the monorepo docs root.

## Development

PHP dependencies are managed with Composer, separately from the npm workspace:

```sh
cd apps/wp-plugin
composer install
composer lint      # phpcs (WordPress Coding Standards)
composer lint:fix  # phpcbf auto-fixes
```

The npm scripts (`build` / `test` / `typecheck`) are Phase 0 shims so Turborepo
pipelines pass; `npm run lint` runs phpcs when `vendor/bin/phpcs` exists.
