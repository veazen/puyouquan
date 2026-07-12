<?php
/**
 * API-key storage with at-rest encryption.
 *
 * @package Veazen
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Encrypts the tenant API key with AES-256-GCM under a key derived from
 * wp_salt() (PROJECT_PLAN §2.3). The ciphertext lives in the options table;
 * the plaintext key never does.
 */
final class Veazen_Credentials {

	const OPTION_KEY = 'veazen_encrypted_api_key';

	/**
	 * Derive the 32-byte encryption key from the site's auth salt.
	 *
	 * @return string Raw 32-byte key.
	 */
	private static function derive_key() {
		return hash_hkdf( 'sha256', wp_salt( 'auth' ), 32, 'veazen-api-key-v1' );
	}

	/**
	 * Encrypt and persist the API key.
	 *
	 * @param string $api_key Plaintext API key (vz_...).
	 * @return bool Whether the key was stored.
	 */
	public static function store( $api_key ) {
		$iv         = random_bytes( 12 );
		$tag        = '';
		$ciphertext = openssl_encrypt( $api_key, 'aes-256-gcm', self::derive_key(), OPENSSL_RAW_DATA, $iv, $tag );
		if ( false === $ciphertext ) {
			return false;
		}

		return update_option( self::OPTION_KEY, base64_encode( $iv . $tag . $ciphertext ), false ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- binary ciphertext encoding, not obfuscation.
	}

	/**
	 * Decrypt and return the stored API key.
	 *
	 * @return string|null Plaintext key, or null when absent/undecryptable.
	 */
	public static function get() {
		$stored = get_option( self::OPTION_KEY );
		if ( ! is_string( $stored ) || '' === $stored ) {
			return null;
		}
		$raw = base64_decode( $stored, true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- binary ciphertext decoding, not obfuscation.
		if ( false === $raw || strlen( $raw ) < 29 ) {
			return null;
		}
		$plaintext = openssl_decrypt(
			substr( $raw, 28 ),
			'aes-256-gcm',
			self::derive_key(),
			OPENSSL_RAW_DATA,
			substr( $raw, 0, 12 ),
			substr( $raw, 12, 16 )
		);

		return false === $plaintext ? null : $plaintext;
	}

	/**
	 * Whether a key is currently stored.
	 *
	 * @return bool
	 */
	public static function is_connected() {
		return null !== self::get();
	}

	/**
	 * Remove the stored key (disconnect).
	 *
	 * @return void
	 */
	public static function forget() {
		delete_option( self::OPTION_KEY );
	}
}
