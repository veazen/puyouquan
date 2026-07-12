<?php
/**
 * Uninstall routine for Veazen.
 *
 * Removes plugin options from this WordPress installation only. Cloud data
 * (serials, batches, scan events, tenant account) is NEVER deleted on
 * uninstall — see PROJECT_PLAN.md §7.2. The tenant keeps full control of
 * their cloud account independently of this plugin's lifecycle.
 *
 * @package Veazen
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

$veazen_option_keys = array(
	'veazen_settings',
	'veazen_encrypted_api_key',
);

foreach ( $veazen_option_keys as $veazen_option_key ) {
	delete_option( $veazen_option_key );
}

delete_transient( 'veazen_dashboard_stats' );
