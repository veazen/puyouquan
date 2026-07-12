=== Veazen ===
Contributors: veazen
Tags: anti-counterfeit, traceability, woocommerce, qr-code, verification
Requires at least: 6.4
Tested up to: 6.7
Requires PHP: 8.1
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

One code per item. Cryptographically signed anti-counterfeit verification and traceability for WooCommerce, powered by the Veazen cloud.

== Description ==

Veazen gives every product you ship a unique, cryptographically signed
verification code. Customers scan the QR (or type the code on your site) and
instantly see whether the item is genuine — while you see every scan,
duplicate-code alerts and gray-market signals in your Veazen console.

The plugin is a shell; the cloud is the brain. Code generation, signing,
verification and risk analysis run in the Veazen cloud — this plugin never
stores code plaintext or signing keys in your WordPress database.

**Features**

* Connection wizard — paste one API key, done (key stored encrypted)
* One-way product sync from WooCommerce, per-product opt-in
* Request code batches (factory bulk with scratch codes, or Lite on-demand pools)
* One-time CSV export with QR URLs for your printer or label sheets
* Bind serials to orders at shipping; scan-gun friendly
* Lite mode: one click prints a shipping label that activates and binds a code
* `[veazen_verify]` shortcode + Gutenberg block for on-site verification
* Dashboard widget: 7-day verifications and open risk alerts

A Veazen account is required (free tier available) — https://veazen.app

== External services ==

This plugin talks to the Veazen cloud API (api.veazen.app) to sync products,
request code batches and read statistics, authenticated with your tenant API
key. The on-site verification widget sends the visitor's entered code
directly from the visitor's browser to the Veazen verification endpoint.
See https://veazen.app/privacy for the privacy policy.

== Installation ==

1. Install and activate the plugin (WooCommerce 8+ required).
2. Create an API key in your Veazen console (Settings → API keys).
3. WP-Admin → Veazen → paste the key → Connect.
4. Sync products, request a batch, print labels — first scannable code in minutes.

== Frequently Asked Questions ==

= Do codes keep working if I deactivate the plugin? =

Yes. Verification runs in the Veazen cloud; printed codes keep verifying.
Uninstalling the plugin never deletes any cloud data.

= Does the verify widget slow down my store? =

No. Verification requests go straight from the visitor's browser to the
Veazen cloud and never pass through your server.

== Screenshots ==

1. Connection wizard (placeholder — captured from wp-env before submission)
2. Batch management screen (placeholder)
3. Front-end verify widget (placeholder)

== Changelog ==

= 0.1.0 =
* Initial release: connection wizard, product sync, code batches with CSV
  export, order binding, Lite shipping labels, verify shortcode/block,
  dashboard widget.
