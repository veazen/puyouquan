<?php
/**
 * WP-admin dashboard widget.
 *
 * @package Veazen
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Dashboard widget (§7.1.6): last-7-day verification volume and open alert
 * count, fetched server-side and cached in a 15-minute transient.
 */
final class Veazen_Dashboard_Widget {

	const TRANSIENT = 'veazen_dashboard_stats';

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'wp_dashboard_setup', array( __CLASS__, 'register' ) );
	}

	/**
	 * Register the widget when the store is connected.
	 *
	 * @return void
	 */
	public static function register() {
		if ( ! current_user_can( 'manage_woocommerce' ) || ! Veazen_Credentials::is_connected() ) {
			return;
		}
		wp_add_dashboard_widget( 'veazen_stats', __( 'Veazen — verifications', 'veazen' ), array( __CLASS__, 'render' ) );
	}

	/**
	 * Fetch stats through the 15-minute cache (§7.1.6).
	 *
	 * @return array|WP_Error
	 */
	public static function stats() {
		$cached = get_transient( self::TRANSIENT );
		if ( is_array( $cached ) ) {
			return $cached;
		}
		$stats = Veazen_Api_Client::get( '/stats/overview' );
		if ( ! is_wp_error( $stats ) ) {
			set_transient( self::TRANSIENT, $stats, 15 * MINUTE_IN_SECONDS );
		}

		return $stats;
	}

	/**
	 * Render the widget body.
	 *
	 * @return void
	 */
	public static function render() {
		$stats = self::stats();
		if ( is_wp_error( $stats ) ) {
			echo '<p>' . esc_html( $stats->get_error_message() ) . '</p>';
			return;
		}

		$by_day  = isset( $stats['scans_by_day'] ) && is_array( $stats['scans_by_day'] ) ? $stats['scans_by_day'] : array();
		$last7   = 0;
		$horizon = gmdate( 'Y-m-d', time() - 7 * DAY_IN_SECONDS );
		foreach ( $by_day as $day => $count ) {
			if ( $day >= $horizon ) {
				$last7 += (int) $count;
			}
		}
		?>
		<p>
			<strong><?php echo esc_html( number_format_i18n( $last7 ) ); ?></strong>
			<?php esc_html_e( 'verifications in the last 7 days', 'veazen' ); ?>
		</p>
		<p>
			<strong><?php echo esc_html( number_format_i18n( isset( $stats['open_alerts'] ) ? (int) $stats['open_alerts'] : 0 ) ); ?></strong>
			<?php esc_html_e( 'open risk alerts', 'veazen' ); ?>
		</p>
		<p><a href="<?php echo esc_url( admin_url( 'admin.php?page=veazen' ) ); ?>"><?php esc_html_e( 'Open Veazen →', 'veazen' ); ?></a></p>
		<?php
	}
}
