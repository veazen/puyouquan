<?php
/**
 * Order-side features: serial binding and Lite shipping labels.
 *
 * @package Veazen
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Order binding (§7.1.4) and the Lite "print shipping label" flow (§7.5.2).
 * HPOS-compatible: works from the order object, never from post meta APIs.
 */
final class Veazen_Orders {

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'add_meta_boxes', array( __CLASS__, 'register_meta_box' ) );
		add_action( 'admin_post_veazen_bind_order', array( __CLASS__, 'handle_bind' ) );
		add_action( 'admin_post_veazen_shipping_label', array( __CLASS__, 'handle_shipping_label' ) );
	}

	/**
	 * Register the Veazen box on both HPOS and legacy order screens.
	 *
	 * @return void
	 */
	public static function register_meta_box() {
		$screens = array( 'shop_order' );
		if ( function_exists( 'wc_get_container' ) && function_exists( 'wc_get_page_screen_id' ) ) {
			$screens[] = wc_get_page_screen_id( 'shop-order' );
		}
		foreach ( array_unique( array_filter( $screens ) ) as $screen ) {
			add_meta_box(
				'veazen-order',
				__( 'Veazen', 'veazen' ),
				array( __CLASS__, 'render_meta_box' ),
				$screen,
				'side'
			);
		}
	}

	/**
	 * Resolve the WC_Order from either screen's callback argument.
	 *
	 * @param mixed $post_or_order Post or order object.
	 * @return WC_Order|null
	 */
	private static function resolve_order( $post_or_order ) {
		if ( $post_or_order instanceof WC_Order ) {
			return $post_or_order;
		}
		if ( isset( $post_or_order->ID ) && function_exists( 'wc_get_order' ) ) {
			$order = wc_get_order( $post_or_order->ID );
			return $order instanceof WC_Order ? $order : null;
		}

		return null;
	}

	/**
	 * Render the order box: bound serial, binding form, Lite label button.
	 *
	 * @param mixed $post_or_order Post or order object.
	 * @return void
	 */
	public static function render_meta_box( $post_or_order ) {
		$order = self::resolve_order( $post_or_order );
		if ( null === $order ) {
			return;
		}
		if ( ! Veazen_Credentials::is_connected() ) {
			echo '<p>' . esc_html__( 'Connect the store to Veazen first.', 'veazen' ) . '</p>';
			return;
		}

		$bound = $order->get_meta( '_veazen_serial' );
		if ( is_string( $bound ) && '' !== $bound ) {
			echo '<p><strong>' . esc_html__( 'Bound serial:', 'veazen' ) . '</strong><br /><code>' . esc_html( $bound ) . '</code></p>';
		}
		?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="margin-bottom:8px;">
			<?php wp_nonce_field( 'veazen_bind_order' ); ?>
			<input type="hidden" name="action" value="veazen_bind_order" />
			<input type="hidden" name="order_id" value="<?php echo esc_attr( (string) $order->get_id() ); ?>" />
			<input type="text" name="veazen_serial" class="widefat" placeholder="<?php esc_attr_e( 'Scan or type a serial…', 'veazen' ); ?>" />
			<p><button type="submit" class="button"><?php esc_html_e( 'Bind serial to order', 'veazen' ); ?></button></p>
		</form>
		<?php
		$product_id = self::first_synced_cloud_product( $order );
		if ( null !== $product_id ) {
			$label_url = wp_nonce_url(
				admin_url( 'admin-post.php?action=veazen_shipping_label&order_id=' . $order->get_id() ),
				'veazen_shipping_label'
			);
			echo '<a class="button button-primary" href="' . esc_url( $label_url ) . '" target="_blank" rel="noopener">'
				. esc_html__( 'Print Veazen shipping label', 'veazen' ) . '</a>';
			echo '<p class="description">' . esc_html__( 'Pulls a code from the on-demand pool, activates it and binds it to this order in one step (Lite).', 'veazen' ) . '</p>';
		}
	}

	/**
	 * First line item whose product is synced to the cloud.
	 *
	 * @param WC_Order $order Order.
	 * @return string|null Cloud product id.
	 */
	private static function first_synced_cloud_product( $order ) {
		foreach ( $order->get_items() as $item ) {
			if ( ! method_exists( $item, 'get_product_id' ) ) {
				continue;
			}
			$cloud_id = get_post_meta( $item->get_product_id(), Veazen_Product_Sync::META_CLOUD_ID, true );
			if ( is_string( $cloud_id ) && '' !== $cloud_id ) {
				return $cloud_id;
			}
		}

		return null;
	}

	/**
	 * Bind a scanned serial to the order (§5.2 bind-order).
	 *
	 * @return void
	 */
	public static function handle_bind() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( esc_html__( 'You are not allowed to manage Veazen.', 'veazen' ) );
		}
		check_admin_referer( 'veazen_bind_order' );

		$order_id = isset( $_POST['order_id'] ) ? absint( $_POST['order_id'] ) : 0;
		$serial   = isset( $_POST['veazen_serial'] ) ? sanitize_text_field( wp_unslash( $_POST['veazen_serial'] ) ) : '';
		$order    = function_exists( 'wc_get_order' ) ? wc_get_order( $order_id ) : null;

		if ( ! $order instanceof WC_Order || '' === $serial ) {
			Veazen_Settings_Page::notice( __( 'Order or serial missing.', 'veazen' ), 'error' );
			self::back_to_order( $order_id );
		}

		$result = Veazen_Api_Client::post(
			'/codes/' . rawurlencode( $serial ) . '/bind-order',
			array(
				'order_ref' => array(
					'site'     => home_url(),
					'order_id' => $order_id,
				),
			)
		);
		if ( is_wp_error( $result ) ) {
			/* translators: %s: error message. */
			Veazen_Settings_Page::notice( sprintf( __( 'Binding failed: %s', 'veazen' ), $result->get_error_message() ), 'error' );
		} else {
			$order->update_meta_data( '_veazen_serial', isset( $result['serial'] ) ? (string) $result['serial'] : $serial );
			$order->save();
			Veazen_Settings_Page::notice( __( 'Serial bound to order.', 'veazen' ) );
		}
		self::back_to_order( $order_id );
	}

	/**
	 * Lite shipping label (§7.5.2): pool code → activate → bind → label file.
	 *
	 * @return void
	 */
	public static function handle_shipping_label() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( esc_html__( 'You are not allowed to manage Veazen.', 'veazen' ) );
		}
		check_admin_referer( 'veazen_shipping_label' );

		$order_id = isset( $_GET['order_id'] ) ? absint( $_GET['order_id'] ) : 0;
		$order    = function_exists( 'wc_get_order' ) ? wc_get_order( $order_id ) : null;
		if ( ! $order instanceof WC_Order ) {
			wp_die( esc_html__( 'Order not found.', 'veazen' ) );
		}
		$product_id = self::first_synced_cloud_product( $order );
		if ( null === $product_id ) {
			wp_die( esc_html__( 'No synced Veazen product on this order.', 'veazen' ) );
		}

		$result = Veazen_Api_Client::post(
			'/orders/shipping-label',
			array(
				'order_ref'  => array(
					'site'     => home_url(),
					'order_id' => $order_id,
				),
				'product_id' => $product_id,
			)
		);
		if ( is_wp_error( $result ) ) {
			/* translators: %s: error message. */
			Veazen_Settings_Page::notice( sprintf( __( 'Label failed: %s', 'veazen' ), $result->get_error_message() ), 'error' );
			self::back_to_order( $order_id );
		}

		if ( isset( $result['serial'] ) ) {
			$order->update_meta_data( '_veazen_serial', (string) $result['serial'] );
			$order->save();
		}
		wp_redirect( Veazen_Api_Client::base_url() . $result['label_download_path'] ); // phpcs:ignore WordPress.Security.SafeRedirect.wp_redirect_wp_redirect -- signed, short-lived cloud URL outside this site.
		exit;
	}

	/**
	 * Redirect back to the order edit screen.
	 *
	 * @param int $order_id Order id.
	 * @return void
	 */
	private static function back_to_order( $order_id ) {
		$url = function_exists( 'wc_get_order' ) && wc_get_order( $order_id )
			? wc_get_order( $order_id )->get_edit_order_url()
			: admin_url();
		wp_safe_redirect( $url );
		exit;
	}
}
