<?php
/**
 * Cloud API client tests (§7.2 constraints).
 *
 * @package Veazen
 */

use PHPUnit\Framework\TestCase;

/**
 * Veazen_Api_Client: auth headers, timeout, base-url override, error shape.
 */
final class ApiClientTest extends TestCase {

	protected function setUp(): void {
		$GLOBALS['veazen_test_options']   = array();
		$GLOBALS['veazen_test_requests']  = array();
		$GLOBALS['veazen_test_responses'] = array();
		Veazen_Credentials::store( 'vz_AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHJJJJKKK' );
	}

	public function test_not_connected_returns_wp_error(): void {
		Veazen_Credentials::forget();
		$result = Veazen_Api_Client::get( '/products' );
		$this->assertInstanceOf( WP_Error::class, $result );
	}

	public function test_request_carries_bearer_and_five_second_timeout(): void {
		$GLOBALS['veazen_test_responses'][] = array(
			'response' => array( 'code' => 200 ),
			'body'     => '{"ok":true}',
		);
		$result  = Veazen_Api_Client::post( '/wp/handshake', array( 'site_url' => 'https://x.test' ) );
		$request = $GLOBALS['veazen_test_requests'][0];

		$this->assertSame( array( 'ok' => true ), $result );
		$this->assertSame( 5, $request['args']['timeout'] );
		$this->assertStringStartsWith( 'Bearer vz_', $request['args']['headers']['authorization'] );
		$this->assertSame( Veazen_Api_Client::DEFAULT_BASE_URL . '/wp/handshake', $request['url'] );
	}

	public function test_settings_base_url_override(): void {
		$GLOBALS['veazen_test_options']['veazen_settings'] = array( 'api_base_url' => 'http://localhost:4000/api/v1/' );
		$this->assertSame( 'http://localhost:4000/api/v1', Veazen_Api_Client::base_url() );
	}

	public function test_non_2xx_becomes_wp_error_with_cloud_message(): void {
		$GLOBALS['veazen_test_responses'][] = array(
			'response' => array( 'code' => 422 ),
			'body'     => '{"message":["quantity must not be greater than 100000"]}',
		);
		$result = Veazen_Api_Client::post( '/batches', array( 'quantity' => 999999 ) );
		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertStringContainsString( 'quantity', $result->get_error_message() );
	}
}
