<?php
/**
 * Front-end verify component: shortcode + Gutenberg block.
 *
 * @package Veazen
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * [veazen_verify] shortcode and the veazen/verify block (§7.1.5).
 * The browser talks directly to the cloud verify API — requests never pass
 * through the WordPress server.
 */
final class Veazen_Verify_Widget {

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function init() {
		add_shortcode( 'veazen_verify', array( __CLASS__, 'render' ) );
		add_action( 'init', array( __CLASS__, 'register_block' ) );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'register_assets' ) );
	}

	/**
	 * Register front-end assets (enqueued only when the widget renders).
	 *
	 * @return void
	 */
	public static function register_assets() {
		wp_register_style(
			'veazen-verify',
			plugins_url( 'assets/verify.css', VEAZEN_PLUGIN_FILE ),
			array(),
			VEAZEN_VERSION
		);
		wp_register_script(
			'veazen-verify',
			plugins_url( 'assets/verify.js', VEAZEN_PLUGIN_FILE ),
			array(),
			VEAZEN_VERSION,
			true
		);
		wp_localize_script(
			'veazen-verify',
			'veazenVerify',
			array(
				'apiBase' => Veazen_Api_Client::base_url(),
				'i18n'    => array(
					'placeholder' => __( 'Enter the code from your product label…', 'veazen' ),
					'button'      => __( 'Verify', 'veazen' ),
					'checking'    => __( 'Checking…', 'veazen' ),
					'authentic'   => __( 'Genuine product — first verification.', 'veazen' ),
					'already'     => __( 'This code has been verified before. Stay alert.', 'veazen' ),
					'inactive'    => __( 'This code has not been activated by the manufacturer.', 'veazen' ),
					'flagged'     => __( 'Warning: the brand has flagged this item.', 'veazen' ),
					'invalid'     => __( 'Invalid code — the product may be counterfeit.', 'veazen' ),
					'error'       => __( 'Verification service unreachable. Try again shortly.', 'veazen' ),
				),
			)
		);
	}

	/**
	 * Shortcode / block render callback.
	 *
	 * @return string
	 */
	public static function render() {
		wp_enqueue_style( 'veazen-verify' );
		wp_enqueue_script( 'veazen-verify' );

		return '<div class="veazen-verify" data-veazen-verify>'
			. '<form class="veazen-verify__form">'
			. '<input class="veazen-verify__input" type="text" autocomplete="off" spellcheck="false" placeholder="'
			. esc_attr__( 'Enter the code from your product label…', 'veazen' ) . '" />'
			. '<button class="veazen-verify__button" type="submit">' . esc_html__( 'Verify', 'veazen' ) . '</button>'
			. '</form>'
			. '<div class="veazen-verify__result" role="status" aria-live="polite"></div>'
			. '</div>';
	}

	/**
	 * Register the Gutenberg block (no build step: classic registration).
	 *
	 * @return void
	 */
	public static function register_block() {
		if ( ! function_exists( 'register_block_type' ) ) {
			return;
		}
		wp_register_script(
			'veazen-verify-block',
			plugins_url( 'assets/verify-block.js', VEAZEN_PLUGIN_FILE ),
			array( 'wp-blocks', 'wp-element', 'wp-i18n' ),
			VEAZEN_VERSION,
			true
		);
		register_block_type(
			'veazen/verify',
			array(
				'editor_script'   => 'veazen-verify-block',
				'render_callback' => array( __CLASS__, 'render' ),
			)
		);
	}
}
