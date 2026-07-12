<?php
/**
 * Main plugin class.
 *
 * @package Veazen
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Core plugin singleton: loads the text domain and wires every feature
 * module (PROJECT_PLAN §7.1 features 1–6 + §7.5 Lite flow).
 */
final class Veazen_Plugin {

	/**
	 * Shared plugin instance.
	 *
	 * @var Veazen_Plugin|null
	 */
	private static $instance = null;

	/**
	 * Return the shared plugin instance, creating it on first call.
	 *
	 * @return Veazen_Plugin
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Register hooks. Private: use instance() instead of new.
	 */
	private function __construct() {
		add_action( 'init', array( $this, 'load_textdomain' ) );

		Veazen_Settings_Page::init();
		Veazen_Product_Sync::init();
		Veazen_Orders::init();
		Veazen_Verify_Widget::init();
		Veazen_Dashboard_Widget::init();
	}

	/**
	 * Load the plugin text domain for translations.
	 *
	 * @return void
	 */
	public function load_textdomain() {
		load_plugin_textdomain( 'veazen', false, dirname( plugin_basename( VEAZEN_PLUGIN_FILE ) ) . '/languages' );
	}
}
