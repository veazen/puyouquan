<?php
/**
 * PHPUnit bootstrap: minimal WordPress stubs so the pure-logic plugin
 * classes (credentials, API client) can be tested without a WP install.
 * Full-stack behavior is covered by the wp-env manual checklist (Phase 3)
 * and CI e2e once wp-env runs in the pipeline.
 *
 * @package Veazen
 */

define( 'ABSPATH', __DIR__ . '/' );
define( 'VEAZEN_VERSION', '0.1.0' );
define( 'VEAZEN_PLUGIN_FILE', dirname( __DIR__ ) . '/veazen.php' );

$GLOBALS['veazen_test_options']   = array();
$GLOBALS['veazen_test_requests']  = array();
$GLOBALS['veazen_test_responses'] = array();

/** Minimal WP_Error double. */
class WP_Error { // phpcs:ignore Generic.Files.OneObjectStructurePerFile.MultipleFound, Squiz.Commenting.ClassComment.Missing

	/**
	 * Constructor.
	 *
	 * @param string $code    Error code.
	 * @param string $message Error message.
	 * @param mixed  $data    Extra data.
	 */
	public function __construct( public $code = '', public $message = '', public $data = null ) {}

	/**
	 * Error message accessor.
	 *
	 * @return string
	 */
	public function get_error_message() {
		return $this->message;
	}
}

// phpcs:disable Squiz.Commenting.FunctionComment.Missing, WordPress.NamingConventions -- WP core stubs.
function wp_salt( $scheme = 'auth' ) {
	return 'unit-test-salt-' . $scheme;
}

function update_option( $key, $value, $autoload = true ) {
	$GLOBALS['veazen_test_options'][ $key ] = $value;
	return true;
}

function get_option( $key, $default_value = false ) {
	return array_key_exists( $key, $GLOBALS['veazen_test_options'] )
		? $GLOBALS['veazen_test_options'][ $key ]
		: $default_value;
}

function delete_option( $key ) {
	unset( $GLOBALS['veazen_test_options'][ $key ] );
	return true;
}

function apply_filters( $hook, $value ) {
	return $value;
}

function untrailingslashit( $value ) {
	return rtrim( $value, '/' );
}

function wp_json_encode( $value ) {
	return json_encode( $value ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode
}

function is_wp_error( $thing ) {
	return $thing instanceof WP_Error;
}

function __( $text, $domain = 'default' ) {
	return $text;
}

function wp_remote_request( $url, $args ) {
	$GLOBALS['veazen_test_requests'][] = array(
		'url'  => $url,
		'args' => $args,
	);
	return array_shift( $GLOBALS['veazen_test_responses'] );
}

function wp_remote_retrieve_response_code( $response ) {
	return isset( $response['response']['code'] ) ? $response['response']['code'] : 0;
}

function wp_remote_retrieve_body( $response ) {
	return isset( $response['body'] ) ? $response['body'] : '';
}
// phpcs:enable

require_once dirname( __DIR__ ) . '/includes/class-veazen-credentials.php';
require_once dirname( __DIR__ ) . '/includes/class-veazen-api-client.php';
