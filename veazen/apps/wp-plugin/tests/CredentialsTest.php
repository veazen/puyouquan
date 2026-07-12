<?php
/**
 * Credentials encryption tests (§2.3).
 *
 * @package Veazen
 */

use PHPUnit\Framework\TestCase;

/**
 * Veazen_Credentials: AES-256-GCM round-trip under the wp_salt-derived key.
 */
final class CredentialsTest extends TestCase {

	protected function setUp(): void {
		$GLOBALS['veazen_test_options'] = array();
	}

	public function test_round_trip(): void {
		$key = 'vz_TESTPREFIXSECRETSECRETSECRETSECRETSECR';
		$this->assertTrue( Veazen_Credentials::store( $key ) );
		$this->assertSame( $key, Veazen_Credentials::get() );
		$this->assertTrue( Veazen_Credentials::is_connected() );
	}

	public function test_ciphertext_never_contains_plaintext(): void {
		$key = 'vz_SUPERSECRETAPIKEYVALUE0000000000000000';
		Veazen_Credentials::store( $key );
		$stored = $GLOBALS['veazen_test_options'][ Veazen_Credentials::OPTION_KEY ];
		$this->assertStringNotContainsString( $key, $stored );
		$this->assertStringNotContainsString( 'SUPERSECRET', base64_decode( $stored ) );
	}

	public function test_tampered_ciphertext_fails_closed(): void {
		Veazen_Credentials::store( 'vz_AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHJJJJKKK' );
		$raw = base64_decode( $GLOBALS['veazen_test_options'][ Veazen_Credentials::OPTION_KEY ] );
		// flip one ciphertext bit — GCM authentication must reject it
		$raw[ strlen( $raw ) - 1 ] = chr( ord( $raw[ strlen( $raw ) - 1 ] ) ^ 0x01 );
		$GLOBALS['veazen_test_options'][ Veazen_Credentials::OPTION_KEY ] = base64_encode( $raw );
		$this->assertNull( Veazen_Credentials::get() );
		$this->assertFalse( Veazen_Credentials::is_connected() );
	}

	public function test_forget_disconnects(): void {
		Veazen_Credentials::store( 'vz_AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHJJJJKKK' );
		Veazen_Credentials::forget();
		$this->assertNull( Veazen_Credentials::get() );
	}

	public function test_absent_or_garbage_option_yields_null(): void {
		$this->assertNull( Veazen_Credentials::get() );
		$GLOBALS['veazen_test_options'][ Veazen_Credentials::OPTION_KEY ] = 'not-base64!!!';
		$this->assertNull( Veazen_Credentials::get() );
	}
}
