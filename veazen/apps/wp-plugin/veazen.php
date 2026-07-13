<?php
/**
 * Plugin Name:       Veazen
 * Plugin URI:        https://veazen.app
 * Description:       Anti-counterfeit verification and product traceability for WooCommerce, powered by the Veazen cloud.
 * Version:           0.1.0
 * Requires at least: 6.4
 * Requires PHP:      8.1
 * Author:            Veazen
 * Author URI:        https://veazen.app
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       veazen
 * Domain Path:       /languages
 *
 * WC requires at least: 8.0
 *
 * @package Veazen
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'VEAZEN_VERSION', '0.1.0' );
define( 'VEAZEN_PLUGIN_FILE', __FILE__ );
define( 'VEAZEN_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );

require_once VEAZEN_PLUGIN_DIR . 'includes/class-veazen-credentials.php';
require_once VEAZEN_PLUGIN_DIR . 'includes/class-veazen-api-client.php';
require_once VEAZEN_PLUGIN_DIR . 'includes/class-veazen-settings-page.php';
require_once VEAZEN_PLUGIN_DIR . 'includes/class-veazen-returns.php';
require_once VEAZEN_PLUGIN_DIR . 'includes/class-veazen-product-sync.php';
require_once VEAZEN_PLUGIN_DIR . 'includes/class-veazen-orders.php';
require_once VEAZEN_PLUGIN_DIR . 'includes/class-veazen-verify-widget.php';
require_once VEAZEN_PLUGIN_DIR . 'includes/class-veazen-dashboard-widget.php';
require_once VEAZEN_PLUGIN_DIR . 'includes/class-veazen-plugin.php';

/**
 * Declare compatibility with WooCommerce High-Performance Order Storage (HPOS).
 *
 * @return void
 */
function veazen_declare_hpos_compatibility() {
	if ( class_exists( 'Automattic\WooCommerce\Utilities\FeaturesUtil' ) ) {
		\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
	}
}
add_action( 'before_woocommerce_init', 'veazen_declare_hpos_compatibility' );

/**
 * Boot the plugin singleton once all plugins are loaded.
 *
 * @return void
 */
function veazen_boot() {
	Veazen_Plugin::instance();
}
add_action( 'plugins_loaded', 'veazen_boot' );
