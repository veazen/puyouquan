<?php
/**
 * Cloud API client.
 *
 * @package Veazen
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Thin wrapper over wp_remote_request for the Veazen cloud API
 * (PROJECT_PLAN §7.2): 5-second timeout, silent degradation — every failure
 * returns a WP_Error that callers surface as an admin notice, never a fatal.
 */
final class Veazen_Api_Client {

	/**
	 * Default cloud API base.
	 */
	const DEFAULT_BASE_URL = 'https://api.veazen.app/api/v1';

	/**
	 * Resolve the API base URL (settings override → filter → default).
	 *
	 * @return string
	 */
	public static function base_url() {
		$settings = get_option( 'veazen_settings', array() );
		$base     = is_array( $settings ) && ! empty( $settings['api_base_url'] )
			? (string) $settings['api_base_url']
			: self::DEFAULT_BASE_URL;

		/**
		 * Filter the Veazen cloud API base URL.
		 *
		 * @param string $base Base URL without trailing slash.
		 */
		return untrailingslashit( apply_filters( 'veazen_api_base_url', $base ) );
	}

	/**
	 * Perform an authenticated JSON request against the cloud API.
	 *
	 * @param string     $method HTTP method.
	 * @param string     $path   Path beginning with '/', e.g. '/products'.
	 * @param array|null $body   JSON-serializable body, or null.
	 * @return array|WP_Error Decoded JSON array on success.
	 */
	public static function request( $method, $path, $body = null ) {
		$api_key = Veazen_Credentials::get();
		if ( null === $api_key ) {
			return new WP_Error( 'veazen_not_connected', __( 'The store is not connected to Veazen yet.', 'veazen' ) );
		}

		$args = array(
			'method'  => $method,
			'timeout' => 5,
			'headers' => array(
				'authorization' => 'Bearer ' . $api_key,
				'content-type'  => 'application/json',
			),
		);
		if ( null !== $body ) {
			$args['body'] = wp_json_encode( $body );
		}

		$response = wp_remote_request( self::base_url() . $path, $args );
		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$status  = (int) wp_remote_retrieve_response_code( $response );
		$decoded = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( $status < 200 || $status >= 300 ) {
			$message = is_array( $decoded ) && isset( $decoded['message'] )
				? ( is_array( $decoded['message'] ) ? implode( '; ', $decoded['message'] ) : (string) $decoded['message'] )
				/* translators: %d: HTTP status code. */
				: sprintf( __( 'Cloud request failed with status %d.', 'veazen' ), $status );

			return new WP_Error( 'veazen_api_error', $message, array( 'status' => $status ) );
		}

		return is_array( $decoded ) ? $decoded : array();
	}

	/**
	 * Convenience GET.
	 *
	 * @param string $path Request path.
	 * @return array|WP_Error
	 */
	public static function get( $path ) {
		return self::request( 'GET', $path );
	}

	/**
	 * Convenience POST.
	 *
	 * @param string $path Request path.
	 * @param array  $body Request body.
	 * @return array|WP_Error
	 */
	public static function post( $path, $body = array() ) {
		return self::request( 'POST', $path, $body );
	}
}
