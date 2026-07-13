<?php
/**
 * Returns check desk: warehouse lookup + release / RMA actions.
 *
 * @package Veazen
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * SME suite M3 for the plugin admin: look up a returned item's code (the
 * lookup is side-effect free in the cloud — no scan events, no risk), show
 * a status summary and offer the release / RMA actions the cloud allows.
 * Both actions are nonce-checked and capability-gated like every other
 * Veazen admin form.
 */
final class Veazen_Returns {

	/**
	 * Wire the admin-post handlers.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'admin_post_veazen_returns_release', array( __CLASS__, 'handle_release' ) );
		add_action( 'admin_post_veazen_returns_rma', array( __CLASS__, 'handle_rma' ) );
	}

	/**
	 * Human-readable label for a cloud code status.
	 *
	 * @param string $status Cloud status value.
	 * @return string
	 */
	public static function status_label( $status ) {
		switch ( $status ) {
			case 'active':
				return __( 'Active (in circulation)', 'veazen' );
			case 'verified':
				return __( 'Verified — locked by the first buyer', 'veazen' );
			case 'retired':
				return __( 'Retired (replaced by a new label)', 'veazen' );
			case 'refurbished':
				return __( 'Officially refurbished', 'veazen' );
			case 'inactive':
				return __( 'Inactive (not activated yet)', 'veazen' );
			case 'flagged':
				return __( 'Flagged by the brand', 'veazen' );
			default:
				return $status;
		}
	}

	/**
	 * Which returns actions apply to a looked-up code. Mirrors the cloud's
	 * own eligibility rules (release = scratchless + first-scan locked;
	 * RMA→refurbished = a redeemed scratch code): the buttons only appear
	 * when the cloud would accept the call.
	 *
	 * @param array $code Decoded GET /codes/:serial response.
	 * @return string[] Zero or more of 'release', 'rma'.
	 */
	public static function available_actions( $code ) {
		$status      = isset( $code['status'] ) ? (string) $code['status'] : '';
		$has_scratch = ! empty( $code['has_scratch'] );
		$locked      = 'verified' === $status
			|| ( 'active' === $status && ! empty( $code['first_verified_at'] ) );

		$actions = array();
		if ( ! $has_scratch && $locked ) {
			$actions[] = 'release';
		}
		if ( 'verified' === $status && $has_scratch && ! empty( $code['scratch_redeemed_at'] ) ) {
			$actions[] = 'rma';
		}

		return $actions;
	}

	/**
	 * Release a first-scan-locked code for resale.
	 *
	 * @return void
	 */
	public static function handle_release() {
		self::require_cap();
		check_admin_referer( 'veazen_returns_release' );
		$serial = isset( $_POST['veazen_serial'] ) ? sanitize_text_field( wp_unslash( $_POST['veazen_serial'] ) ) : '';

		$result = Veazen_Api_Client::post( '/codes/' . rawurlencode( $serial ) . '/release' );
		if ( is_wp_error( $result ) ) {
			/* translators: %s: error message returned by the cloud. */
			Veazen_Settings_Page::notice( sprintf( __( 'Release failed: %s', 'veazen' ), $result->get_error_message() ), 'error' );
		} else {
			/* translators: %d: how many times this code has been released. */
			Veazen_Settings_Page::notice( sprintf( __( 'Code released for resale (release #%d) — the next scan shows green again.', 'veazen' ), isset( $result['release_count'] ) ? (int) $result['release_count'] : 1 ) );
		}
		self::back_to_lookup( $serial );
	}

	/**
	 * Register the QC of a returned item (RMA).
	 *
	 * @return void
	 */
	public static function handle_rma() {
		self::require_cap();
		check_admin_referer( 'veazen_returns_rma' );
		$serial = isset( $_POST['veazen_serial'] ) ? sanitize_text_field( wp_unslash( $_POST['veazen_serial'] ) ) : '';
		$note   = isset( $_POST['veazen_note'] ) ? sanitize_text_field( wp_unslash( $_POST['veazen_note'] ) ) : '';

		$result = Veazen_Api_Client::post( '/codes/' . rawurlencode( $serial ) . '/rma', array( 'note' => $note ) );
		if ( is_wp_error( $result ) ) {
			/* translators: %s: error message returned by the cloud. */
			Veazen_Settings_Page::notice( sprintf( __( 'Return registration failed: %s', 'veazen' ), $result->get_error_message() ), 'error' );
		} else {
			/* translators: %s: resulting code status. */
			Veazen_Settings_Page::notice( sprintf( __( 'Return registered — code status is now "%s".', 'veazen' ), isset( $result['status'] ) ? (string) $result['status'] : '—' ) );
		}
		self::back_to_lookup( $serial );
	}

	/**
	 * Render the "Returns check" block on the Veazen admin screen.
	 *
	 * @return void
	 */
	public static function render_section() {
		$serial = self::requested_serial();
		?>
		<h2><?php esc_html_e( 'Returns check', 'veazen' ); ?></h2>
		<p><?php esc_html_e( 'Look up a returned item without changing its state, then release it for resale or register the return. Pasted serials may keep their hyphens.', 'veazen' ); ?></p>
		<form method="get" action="<?php echo esc_url( admin_url( 'admin.php' ) ); ?>" style="margin-bottom:1em;">
			<input type="hidden" name="page" value="veazen" />
			<?php wp_nonce_field( 'veazen_returns_lookup', 'veazen_returns', false ); ?>
			<input type="text" name="veazen_serial" class="regular-text code" placeholder="<?php esc_attr_e( 'Serial from the product label…', 'veazen' ); ?>" autocomplete="off" spellcheck="false" value="<?php echo esc_attr( $serial ); ?>" required />
			<?php submit_button( __( 'Check code', 'veazen' ), 'secondary', 'submit', false ); ?>
		</form>
		<?php
		if ( '' === $serial ) {
			return;
		}

		$code = Veazen_Api_Client::get( '/codes/' . rawurlencode( $serial ) );
		if ( is_wp_error( $code ) ) {
			/* translators: %s: error message returned by the cloud. */
			echo '<p style="color:#b32d2e;">' . esc_html( sprintf( __( 'Lookup failed: %s', 'veazen' ), $code->get_error_message() ) ) . '</p>';
			return;
		}

		self::render_summary( $code );
		self::render_actions( $code );
	}

	/**
	 * Print the status summary table for a looked-up code.
	 *
	 * @param array $code Decoded GET /codes/:serial response.
	 * @return void
	 */
	private static function render_summary( $code ) {
		if ( ! empty( $code['has_scratch'] ) ) {
			$scratch = empty( $code['scratch_redeemed_at'] )
				? __( 'intact', 'veazen' )
				: __( 'revealed by the buyer', 'veazen' );
		} else {
			$scratch = __( 'none (scan-only code)', 'veazen' );
		}
		$rows = array(
			__( 'Status', 'veazen' )        => self::status_label( isset( $code['status'] ) ? (string) $code['status'] : '' ),
			__( 'Product', 'veazen' )       => isset( $code['product']['name'] ) ? (string) $code['product']['name'] : '—',
			__( 'Scans', 'veazen' )         => isset( $code['scan_count'] ) ? (string) (int) $code['scan_count'] : '0',
			__( 'Last scan', 'veazen' )     => empty( $code['last_scan_at'] ) ? '—' : str_replace( 'T', ' ', substr( (string) $code['last_scan_at'], 0, 16 ) ),
			__( 'Releases', 'veazen' )      => isset( $code['release_count'] ) ? (string) (int) $code['release_count'] : '0',
			__( 'Scratch layer', 'veazen' ) => $scratch,
		);
		if ( ! empty( $code['replaced_by'] ) ) {
			$rows[ __( 'Replaced by', 'veazen' ) ] = (string) $code['replaced_by'];
		}
		?>
		<table class="widefat striped" style="max-width:640px;margin-bottom:1em;">
			<tbody>
				<tr>
					<th style="width:160px;"><?php esc_html_e( 'Serial', 'veazen' ); ?></th>
					<td><code><?php echo esc_html( isset( $code['serial'] ) ? (string) $code['serial'] : '' ); ?></code></td>
				</tr>
				<?php foreach ( $rows as $label => $value ) : ?>
					<tr>
						<th><?php echo esc_html( $label ); ?></th>
						<td><?php echo esc_html( $value ); ?></td>
					</tr>
				<?php endforeach; ?>
			</tbody>
		</table>
		<?php
	}

	/**
	 * Print the action buttons the cloud would accept for this code.
	 *
	 * @param array $code Decoded GET /codes/:serial response.
	 * @return void
	 */
	private static function render_actions( $code ) {
		$actions = self::available_actions( $code );
		$serial  = isset( $code['serial'] ) ? (string) $code['serial'] : '';
		if ( empty( $actions ) ) {
			echo '<p>' . esc_html__( 'No returns action applies to this code — shown read-only.', 'veazen' ) . '</p>';
			return;
		}

		if ( in_array( 'release', $actions, true ) ) {
			?>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline-block;margin-right:1em;">
				<?php wp_nonce_field( 'veazen_returns_release' ); ?>
				<input type="hidden" name="action" value="veazen_returns_release" />
				<input type="hidden" name="veazen_serial" value="<?php echo esc_attr( $serial ); ?>" />
				<?php
				submit_button(
					__( 'Release for resale', 'veazen' ),
					'primary',
					'submit',
					false,
					array( 'onclick' => 'return confirm("' . esc_js( __( 'Clear the first-scan lock so the next customer scan shows green again? The release is audited and counted.', 'veazen' ) ) . '");' )
				);
				?>
			</form>
			<?php
		}
		if ( in_array( 'rma', $actions, true ) ) {
			?>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline-block;">
				<?php wp_nonce_field( 'veazen_returns_rma' ); ?>
				<input type="hidden" name="action" value="veazen_returns_rma" />
				<input type="hidden" name="veazen_serial" value="<?php echo esc_attr( $serial ); ?>" />
				<input type="text" name="veazen_note" class="regular-text" placeholder="<?php esc_attr_e( 'QC note (optional)…', 'veazen' ); ?>" autocomplete="off" />
				<?php
				submit_button(
					__( 'Register return (RMA)', 'veazen' ),
					'secondary',
					'submit',
					false,
					array( 'onclick' => 'return confirm("' . esc_js( __( 'Register this return? A revealed scratch code becomes officially refurbished on the verify page.', 'veazen' ) ) . '");' )
				);
				?>
			</form>
			<?php
		}
	}

	/**
	 * The nonce-verified serial from the lookup form, or ''.
	 *
	 * @return string
	 */
	private static function requested_serial() {
		if ( ! isset( $_GET['veazen_returns'], $_GET['veazen_serial'] ) ) {
			return '';
		}
		if ( ! wp_verify_nonce( sanitize_key( wp_unslash( $_GET['veazen_returns'] ) ), 'veazen_returns_lookup' ) ) {
			return '';
		}

		return sanitize_text_field( wp_unslash( $_GET['veazen_serial'] ) );
	}

	/**
	 * Capability guard shared by the admin-post handlers.
	 *
	 * @return void
	 */
	private static function require_cap() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( esc_html__( 'You are not allowed to manage Veazen.', 'veazen' ) );
		}
	}

	/**
	 * Redirect back to the Veazen screen with the lookup card refreshed.
	 *
	 * @param string $serial Serial to re-display.
	 * @return void
	 */
	private static function back_to_lookup( $serial ) {
		wp_safe_redirect(
			add_query_arg(
				array(
					'page'           => 'veazen',
					'veazen_serial'  => rawurlencode( $serial ),
					'veazen_returns' => wp_create_nonce( 'veazen_returns_lookup' ),
				),
				admin_url( 'admin.php' )
			)
		);
		exit;
	}
}
