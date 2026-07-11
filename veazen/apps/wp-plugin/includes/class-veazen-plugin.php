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
 * Core plugin singleton.
 *
 * Phase 0 skeleton: only wires the text domain loader and a placeholder
 * admin page. Real features (cloud-connection wizard, product sync, batch
 * requests, order binding, verify shortcode/block) arrive in Phase 3.
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
		add_action( 'admin_menu', array( $this, 'register_admin_menu' ) );
	}

	/**
	 * Load the plugin text domain for translations.
	 *
	 * @return void
	 */
	public function load_textdomain() {
		load_plugin_textdomain( 'veazen', false, dirname( plugin_basename( VEAZEN_PLUGIN_FILE ) ) . '/languages' );
	}

	/**
	 * Register the top-level Veazen admin menu page.
	 *
	 * @return void
	 */
	public function register_admin_menu() {
		add_menu_page(
			__( 'Veazen', 'veazen' ),
			__( 'Veazen', 'veazen' ),
			'manage_woocommerce',
			'veazen',
			array( $this, 'render_settings_page' ),
			'dashicons-shield-alt',
			56
		);
	}

	/**
	 * Render the placeholder settings screen.
	 *
	 * @return void
	 */
	public function render_settings_page() {
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Veazen', 'veazen' ); ?></h1>
			<p><?php esc_html_e( 'Veazen links this store to the Veazen cloud platform for anti-counterfeit verification and product traceability.', 'veazen' ); ?></p>
			<p><?php esc_html_e( 'This is a Phase 0 placeholder screen. The cloud-connection wizard arrives in Phase 3.', 'veazen' ); ?></p>
		</div>
		<?php
	}
}
