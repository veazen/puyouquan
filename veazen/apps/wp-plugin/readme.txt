=== Veazen ===
Contributors: veazen
Tags: anti-counterfeit, traceability, woocommerce, qr-code, verification
Requires at least: 6.4
Tested up to: 6.7
Requires PHP: 8.1
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Cloud-powered anti-counterfeit verification and product traceability for WooCommerce stores.

== Description ==

Veazen connects your WooCommerce store to the Veazen cloud SaaS platform (https://veazen.app) so every product you ship can carry a cryptographically signed, individually verifiable QR code.

The plugin is a shell, the cloud is the brain: serial generation, Ed25519 signing, scan analytics, and risk detection all live in the Veazen cloud. The plugin's job is to wire your store into that brain — syncing products, requesting code batches, binding serials to orders at shipping time, and giving your customers a verification entry point on your storefront.

Planned features (arriving in Phase 3):

* Connection wizard — paste an API key, and the plugin securely handshakes with the cloud.
* Product sync — choose which WooCommerce products participate in anti-counterfeit protection.
* Code batch requests — request signed QR serial batches and download print-ready export files.
* Order binding — record which serials shipped with which order, straight from a barcode scanner.
* Storefront verification — a `[veazen_verify]` shortcode and Gutenberg block for customers to check authenticity.
* Dashboard widget — verification volume and alerts at a glance in wp-admin.

This release (0.1.0) is the plugin skeleton only: it installs and activates cleanly, declares WooCommerce HPOS compatibility, and registers a placeholder admin page. No data is sent anywhere yet.

Uninstalling the plugin removes only its local WordPress options. Your cloud data — serials, batches, and scan history — is never deleted by the plugin.

== Installation ==

1. Upload the `veazen` folder to `/wp-content/plugins/`, or install through the WordPress Plugins screen.
2. Activate the plugin through the Plugins screen in WordPress.
3. Open the Veazen menu in wp-admin. The cloud-connection wizard arrives in a future release.

== Frequently Asked Questions ==

= Does this plugin work without WooCommerce? =

The plugin activates without WooCommerce, but all verification and traceability features are built for WooCommerce stores (8.0 or newer).

= Is my verification data deleted when I uninstall? =

No. Uninstalling removes only local plugin settings. All cloud data stays in your Veazen account.

== Changelog ==

= 0.1.0 =
* Initial plugin skeleton: activation-safe main file, HPOS compatibility declaration, placeholder admin page, uninstall cleanup of local options.
