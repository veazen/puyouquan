<?php
/**
 * Admin settings page: connection wizard, product sync, batch management.
 *
 * @package Veazen
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Renders the Veazen admin screen and handles its form submissions
 * (PROJECT_PLAN §7.1 features 1–3). All actions are nonce-checked and
 * capability-gated to manage_woocommerce (§9.5).
 */
final class Veazen_Settings_Page {

	/**
	 * Wire admin hooks.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'register_menu' ) );
		add_action( 'admin_post_veazen_connect', array( __CLASS__, 'handle_connect' ) );
		add_action( 'admin_post_veazen_disconnect', array( __CLASS__, 'handle_disconnect' ) );
		add_action( 'admin_post_veazen_sync_products', array( __CLASS__, 'handle_sync_products' ) );
		add_action( 'admin_post_veazen_create_batch', array( __CLASS__, 'handle_create_batch' ) );
		add_action( 'admin_post_veazen_export_batch', array( __CLASS__, 'handle_export_batch' ) );
		add_action( 'admin_post_veazen_activate_batch', array( __CLASS__, 'handle_activate_batch' ) );
		add_action( 'admin_notices', array( __CLASS__, 'render_notices' ) );
	}

	/**
	 * Register the top-level admin menu.
	 *
	 * @return void
	 */
	public static function register_menu() {
		add_menu_page(
			__( 'Veazen', 'veazen' ),
			__( 'Veazen', 'veazen' ),
			'manage_woocommerce',
			'veazen',
			array( __CLASS__, 'render' ),
			'dashicons-shield-alt',
			56
		);
	}

	/**
	 * Queue a one-shot admin notice for the current user.
	 *
	 * @param string $message Notice text (plain).
	 * @param string $type    One of success|error|warning|info.
	 * @return void
	 */
	public static function notice( $message, $type = 'success' ) {
		set_transient( 'veazen_notice_' . get_current_user_id(), array( $message, $type ), 60 );
	}

	/**
	 * Print and clear the queued notice.
	 *
	 * @return void
	 */
	public static function render_notices() {
		$key    = 'veazen_notice_' . get_current_user_id();
		$notice = get_transient( $key );
		if ( ! is_array( $notice ) ) {
			return;
		}
		delete_transient( $key );
		printf(
			'<div class="notice notice-%1$s is-dismissible"><p>%2$s</p></div>',
			esc_attr( $notice[1] ),
			esc_html( $notice[0] )
		);
	}

	/**
	 * Capability guard shared by all admin-post handlers.
	 *
	 * @return void
	 */
	private static function require_cap() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( esc_html__( 'You are not allowed to manage Veazen.', 'veazen' ) );
		}
	}

	/**
	 * Redirect back to the Veazen admin screen.
	 *
	 * @return void
	 */
	private static function back() {
		wp_safe_redirect( admin_url( 'admin.php?page=veazen' ) );
		exit;
	}

	/**
	 * Connection wizard submit: store key, handshake, cache tenant info.
	 *
	 * @return void
	 */
	public static function handle_connect() {
		self::require_cap();
		check_admin_referer( 'veazen_connect' );

		$api_key  = isset( $_POST['veazen_api_key'] ) ? sanitize_text_field( wp_unslash( $_POST['veazen_api_key'] ) ) : '';
		$base_url = isset( $_POST['veazen_api_base_url'] ) ? esc_url_raw( wp_unslash( $_POST['veazen_api_base_url'] ) ) : '';

		if ( '' === $api_key || 0 !== strpos( $api_key, 'vz_' ) ) {
			self::notice( __( 'Please paste a valid Veazen API key (it starts with vz_).', 'veazen' ), 'error' );
			self::back();
		}

		$settings = get_option( 'veazen_settings', array() );
		if ( ! is_array( $settings ) ) {
			$settings = array();
		}
		if ( '' !== $base_url ) {
			$settings['api_base_url'] = untrailingslashit( $base_url );
			update_option( 'veazen_settings', $settings, false );
		}

		Veazen_Credentials::store( $api_key );

		$handshake = Veazen_Api_Client::post(
			'/wp/handshake',
			array(
				'site_url'       => home_url(),
				'plugin_version' => VEAZEN_VERSION,
				'wc_version'     => defined( 'WC_VERSION' ) ? WC_VERSION : null,
			)
		);

		if ( is_wp_error( $handshake ) ) {
			Veazen_Credentials::forget();
			/* translators: %s: error message returned by the cloud. */
			self::notice( sprintf( __( 'Connection failed: %s', 'veazen' ), $handshake->get_error_message() ), 'error' );
			self::back();
		}

		$settings['tenant']       = isset( $handshake['tenant'] ) ? $handshake['tenant'] : array();
		$settings['capabilities'] = isset( $handshake['capabilities'] ) ? $handshake['capabilities'] : array();
		update_option( 'veazen_settings', $settings, false );

		self::notice( __( 'Store connected to Veazen.', 'veazen' ) );
		self::back();
	}

	/**
	 * Disconnect: forget credentials, keep cloud data untouched (§7.2).
	 *
	 * @return void
	 */
	public static function handle_disconnect() {
		self::require_cap();
		check_admin_referer( 'veazen_disconnect' );
		Veazen_Credentials::forget();
		self::notice( __( 'Disconnected. Your cloud data is untouched.', 'veazen' ) );
		self::back();
	}

	/**
	 * Manual full product sync (§7.1.2).
	 *
	 * @return void
	 */
	public static function handle_sync_products() {
		self::require_cap();
		check_admin_referer( 'veazen_sync_products' );
		$result = Veazen_Product_Sync::sync_all();
		if ( is_wp_error( $result ) ) {
			/* translators: %s: error message. */
			self::notice( sprintf( __( 'Sync failed: %s', 'veazen' ), $result->get_error_message() ), 'error' );
		} else {
			/* translators: %d: number of synced products. */
			self::notice( sprintf( __( 'Synced %d products to Veazen.', 'veazen' ), (int) $result ) );
		}
		self::back();
	}

	/**
	 * Create a code batch (§7.1.3).
	 *
	 * @return void
	 */
	public static function handle_create_batch() {
		self::require_cap();
		check_admin_referer( 'veazen_create_batch' );

		$cloud_product_id = isset( $_POST['veazen_product'] ) ? sanitize_text_field( wp_unslash( $_POST['veazen_product'] ) ) : '';
		$quantity         = isset( $_POST['veazen_quantity'] ) ? absint( $_POST['veazen_quantity'] ) : 0;
		$kind             = isset( $_POST['veazen_kind'] ) && 'on_demand' === $_POST['veazen_kind'] ? 'on_demand' : 'bulk';

		if ( '' === $cloud_product_id || $quantity < 1 || $quantity > 100000 ) {
			self::notice( __( 'Pick a synced product and a quantity between 1 and 100,000.', 'veazen' ), 'error' );
			self::back();
		}

		$result = Veazen_Api_Client::post(
			'/batches',
			array(
				'product_id' => $cloud_product_id,
				'quantity'   => $quantity,
				'kind'       => $kind,
			)
		);
		if ( is_wp_error( $result ) ) {
			/* translators: %s: error message. */
			self::notice( sprintf( __( 'Batch request failed: %s', 'veazen' ), $result->get_error_message() ), 'error' );
		} else {
			self::notice( __( 'Batch requested — codes are being generated in the cloud.', 'veazen' ) );
		}
		self::back();
	}

	/**
	 * Export a ready batch: fetch the signed URL and redirect to it (§7.1.3).
	 *
	 * @return void
	 */
	public static function handle_export_batch() {
		self::require_cap();
		check_admin_referer( 'veazen_export_batch' );
		$batch_id = isset( $_GET['batch'] ) ? sanitize_text_field( wp_unslash( $_GET['batch'] ) ) : '';
		$result   = Veazen_Api_Client::get( '/batches/' . rawurlencode( $batch_id ) . '/export?format=csv' );
		if ( is_wp_error( $result ) || empty( $result['downloadPath'] ) ) {
			$message = is_wp_error( $result ) ? $result->get_error_message() : __( 'No download available yet.', 'veazen' );
			/* translators: %s: error message. */
			self::notice( sprintf( __( 'Export failed: %s', 'veazen' ), $message ), 'error' );
			self::back();
		}
		wp_redirect( Veazen_Api_Client::base_url() . $result['downloadPath'] ); // phpcs:ignore WordPress.Security.SafeRedirect.wp_redirect_wp_redirect -- signed, short-lived cloud URL outside this site.
		exit;
	}

	/**
	 * Activate all codes of a batch (factory exit).
	 *
	 * @return void
	 */
	public static function handle_activate_batch() {
		self::require_cap();
		check_admin_referer( 'veazen_activate_batch' );
		$batch_id = isset( $_GET['batch'] ) ? sanitize_text_field( wp_unslash( $_GET['batch'] ) ) : '';
		$result   = Veazen_Api_Client::post( '/batches/' . rawurlencode( $batch_id ) . '/activate', array( 'all' => true ) );
		if ( is_wp_error( $result ) ) {
			/* translators: %s: error message. */
			self::notice( sprintf( __( 'Activation failed: %s', 'veazen' ), $result->get_error_message() ), 'error' );
		} else {
			/* translators: %d: number of activated codes. */
			self::notice( sprintf( __( 'Activated %d codes.', 'veazen' ), isset( $result['activated'] ) ? (int) $result['activated'] : 0 ) );
		}
		self::back();
	}

	/**
	 * Render the admin screen.
	 *
	 * @return void
	 */
	public static function render() {
		$connected = Veazen_Credentials::is_connected();
		$settings  = get_option( 'veazen_settings', array() );
		$tenant    = is_array( $settings ) && isset( $settings['tenant'] ) && is_array( $settings['tenant'] ) ? $settings['tenant'] : array();
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Veazen', 'veazen' ); ?></h1>

			<?php if ( ! $connected ) : ?>
				<div class="card" style="max-width:640px;">
					<h2><?php esc_html_e( 'Connect your store', 'veazen' ); ?></h2>
					<p><?php esc_html_e( 'Paste an API key from your Veazen console (Settings → API keys). The key is stored encrypted and codes never leave the cloud.', 'veazen' ); ?></p>
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
						<?php wp_nonce_field( 'veazen_connect' ); ?>
						<input type="hidden" name="action" value="veazen_connect" />
						<p>
							<input type="password" name="veazen_api_key" class="regular-text" placeholder="vz_..." autocomplete="off" required />
						</p>
						<details>
							<summary><?php esc_html_e( 'Advanced: custom API endpoint', 'veazen' ); ?></summary>
							<p>
								<input type="url" name="veazen_api_base_url" class="regular-text" placeholder="<?php echo esc_attr( Veazen_Api_Client::DEFAULT_BASE_URL ); ?>" />
							</p>
						</details>
						<?php submit_button( __( 'Connect to Veazen', 'veazen' ) ); ?>
					</form>
				</div>
				<?php
				return;
			endif;
			?>

			<p>
				<strong><?php esc_html_e( 'Status:', 'veazen' ); ?></strong>
				<span style="color:#2c7a5c;">●</span>
				<?php
				printf(
					/* translators: 1: tenant name, 2: plan name. */
					esc_html__( 'Connected to %1$s (%2$s plan)', 'veazen' ),
					esc_html( isset( $tenant['name'] ) ? $tenant['name'] : '—' ),
					esc_html( isset( $tenant['plan'] ) ? $tenant['plan'] : '—' )
				);
				?>
			</p>

			<h2><?php esc_html_e( 'Product sync', 'veazen' ); ?></h2>
			<p><?php esc_html_e( 'Sync your WooCommerce catalog to Veazen. Tick "Veazen protection" on a product to keep it synced automatically on every save.', 'veazen' ); ?></p>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<?php wp_nonce_field( 'veazen_sync_products' ); ?>
				<input type="hidden" name="action" value="veazen_sync_products" />
				<?php submit_button( __( 'Sync all products now', 'veazen' ), 'secondary' ); ?>
			</form>

			<h2><?php esc_html_e( 'Code batches', 'veazen' ); ?></h2>
			<?php self::render_batches_section(); ?>

			<h2><?php esc_html_e( 'Disconnect', 'veazen' ); ?></h2>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<?php wp_nonce_field( 'veazen_disconnect' ); ?>
				<input type="hidden" name="action" value="veazen_disconnect" />
				<?php submit_button( __( 'Disconnect this store', 'veazen' ), 'delete' ); ?>
			</form>
		</div>
		<?php
	}

	/**
	 * Render the batch creation form and recent-batch table.
	 *
	 * @return void
	 */
	private static function render_batches_section() {
		$products = Veazen_Product_Sync::synced_products();
		if ( empty( $products ) ) {
			echo '<p>' . esc_html__( 'Sync at least one product first, then request code batches here.', 'veazen' ) . '</p>';
			return;
		}
		?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="margin-bottom:1em;">
			<?php wp_nonce_field( 'veazen_create_batch' ); ?>
			<input type="hidden" name="action" value="veazen_create_batch" />
			<select name="veazen_product" required>
				<option value=""><?php esc_html_e( 'Product…', 'veazen' ); ?></option>
				<?php foreach ( $products as $cloud_id => $label ) : ?>
					<option value="<?php echo esc_attr( $cloud_id ); ?>"><?php echo esc_html( $label ); ?></option>
				<?php endforeach; ?>
			</select>
			<input type="number" name="veazen_quantity" min="1" max="100000" value="100" required />
			<select name="veazen_kind">
				<option value="bulk"><?php esc_html_e( 'Bulk (factory labels, scratch codes)', 'veazen' ); ?></option>
				<option value="on_demand"><?php esc_html_e( 'On-demand pool (Lite shipping labels)', 'veazen' ); ?></option>
			</select>
			<?php submit_button( __( 'Request batch', 'veazen' ), 'primary', 'submit', false ); ?>
		</form>
		<?php
		$batches = Veazen_Api_Client::get( '/batches' );
		if ( is_wp_error( $batches ) ) {
			echo '<p>' . esc_html( $batches->get_error_message() ) . '</p>';
			return;
		}
		if ( empty( $batches ) ) {
			echo '<p>' . esc_html__( 'No batches yet.', 'veazen' ) . '</p>';
			return;
		}
		?>
		<table class="widefat striped" style="max-width:900px;">
			<thead>
				<tr>
					<th><?php esc_html_e( 'Product', 'veazen' ); ?></th>
					<th><?php esc_html_e( 'Quantity', 'veazen' ); ?></th>
					<th><?php esc_html_e( 'Status', 'veazen' ); ?></th>
					<th><?php esc_html_e( 'Activated', 'veazen' ); ?></th>
					<th><?php esc_html_e( 'Actions', 'veazen' ); ?></th>
				</tr>
			</thead>
			<tbody>
				<?php foreach ( $batches as $batch ) : ?>
					<tr>
						<td><?php echo esc_html( isset( $batch['product']['name'] ) ? $batch['product']['name'] : '—' ); ?></td>
						<td><?php echo esc_html( (string) $batch['quantity'] ); ?></td>
						<td><?php echo esc_html( (string) $batch['status'] ); ?></td>
						<td><?php echo esc_html( (string) $batch['activatedCount'] ); ?></td>
						<td>
							<?php if ( in_array( $batch['status'], array( 'ready', 'exported' ), true ) ) : ?>
								<a class="button button-small" href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=veazen_export_batch&batch=' . rawurlencode( $batch['id'] ) ), 'veazen_export_batch' ) ); ?>">
									<?php esc_html_e( 'Download CSV', 'veazen' ); ?>
								</a>
								<?php if ( empty( $batch['autoActivate'] ) && (int) $batch['activatedCount'] < (int) $batch['quantity'] ) : ?>
									<a class="button button-small" href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=veazen_activate_batch&batch=' . rawurlencode( $batch['id'] ) ), 'veazen_activate_batch' ) ); ?>">
										<?php esc_html_e( 'Activate all', 'veazen' ); ?>
									</a>
								<?php endif; ?>
							<?php endif; ?>
						</td>
					</tr>
				<?php endforeach; ?>
			</tbody>
		</table>
		<?php
	}
}
