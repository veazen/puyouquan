<?php
/**
 * Returns check desk tests (SME suite M3).
 *
 * @package Veazen
 */

use PHPUnit\Framework\TestCase;

/**
 * Veazen_Returns::available_actions must mirror the cloud's eligibility
 * rules so the admin never sees a button the API would 409.
 */
final class ReturnsTest extends TestCase {

	public function test_locked_lite_code_offers_release_only(): void {
		$this->assertSame(
			array( 'release' ),
			Veazen_Returns::available_actions(
				array(
					'status'            => 'active',
					'has_scratch'       => false,
					'first_verified_at' => '2026-07-13T00:00:00.000Z',
				)
			)
		);
	}

	public function test_redeemed_scratch_code_offers_rma_only(): void {
		$this->assertSame(
			array( 'rma' ),
			Veazen_Returns::available_actions(
				array(
					'status'              => 'verified',
					'has_scratch'         => true,
					'first_verified_at'   => '2026-07-13T00:00:00.000Z',
					'scratch_redeemed_at' => '2026-07-13T00:00:00.000Z',
				)
			)
		);
	}

	public function test_untouched_and_terminal_codes_are_read_only(): void {
		// fresh active code: nothing to release, nothing returned
		$this->assertSame(
			array(),
			Veazen_Returns::available_actions(
				array(
					'status'            => 'active',
					'has_scratch'       => false,
					'first_verified_at' => null,
				)
			)
		);
		foreach ( array( 'retired', 'refurbished', 'inactive', 'flagged' ) as $status ) {
			$this->assertSame(
				array(),
				Veazen_Returns::available_actions(
					array(
						'status'      => $status,
						'has_scratch' => false,
					)
				),
				$status
			);
		}
	}

	public function test_status_labels_cover_the_sme_states(): void {
		$this->assertNotSame( '', Veazen_Returns::status_label( 'retired' ) );
		$this->assertNotSame( 'refurbished', Veazen_Returns::status_label( 'refurbished' ) );
		// unknown statuses fall through verbatim instead of crashing
		$this->assertSame( 'voided', Veazen_Returns::status_label( 'voided' ) );
	}
}
