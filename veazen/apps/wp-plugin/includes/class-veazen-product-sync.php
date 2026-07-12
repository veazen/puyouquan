<?php
/**
 * One-way WooCommerce → cloud product sync.
 *
 * @package Veazen
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Product sync (PROJECT_PLAN §7.1.2): manual full sync plus incremental
 * sync on save for products with Veazen protection enabled. Mapping key is
 * external_refs {"woo:<site_hash>": product_id} on the cloud side; locally
 * each synced product stores its cloud id in _veazen_cloud_id.
 */
final class Veazen_Product_Sync {

	const META_ENABLED  = '_veazen_enabled';
	const META_CLOUD_ID = '_veazen_cloud_id';

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'save_post_product', array( __CLASS__, 'on_product_save' ), 20, 2 );
		add_action( 'add_meta_boxes', array( __CLASS__, 'register_meta_box' ) );
		add_action( 'save_post_product', array( __CLASS__, 'save_meta_box' ), 10 );
	}

	/**
	 * The sha256 of the site URL, matching the cloud's wp_sites.site_hash.
	 *
	 * @return string
	 */
	public static function site_hash() {
		return hash( 'sha256', home_url() );
	}

	/**
	 * Push one product to the cloud.
	 *
	 * @param WC_Product $product WooCommerce product.
	 * @return array|WP_Error Cloud product payload.
	 */
	public static function push_product( $product ) {
		$sku    = $product->get_sku();
		$result = Veazen_Api_Client::post(
			'/products',
			array(
				'name'         => $product->get_name(),
				'sku'          => '' !== $sku ? $sku : 'woo-' . $product->get_id(),
				'description'  => wp_strip_all_tags( (string) $product->get_short_description() ),
				'externalRefs' => array( 'woo:' . self::site_hash() => $product->get_id() ),
			)
		);
		if ( ! is_wp_error( $result ) && isset( $result['id'] ) ) {
			update_post_meta( $product->get_id(), self::META_CLOUD_ID, sanitize_text_field( $result['id'] ) );
		}

		return $result;
	}

	/**
	 * Full catalog sync.
	 *
	 * @return int|WP_Error Number of synced products.
	 */
	public static function sync_all() {
		if ( ! function_exists( 'wc_get_products' ) ) {
			return new WP_Error( 'veazen_no_wc', __( 'WooCommerce is not active.', 'veazen' ) );
		}
		$products = wc_get_products(
			array(
				'limit'  => 200,
				'status' => 'publish',
			)
		);
		$count    = 0;
		foreach ( $products as $product ) {
			$result = self::push_product( $product );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
			++$count;
		}

		return $count;
	}

	/**
	 * Incremental sync when a protected product is saved (§7.1.2).
	 *
	 * @param int     $post_id Post ID.
	 * @param WP_Post $post    Post object.
	 * @return void
	 */
	public static function on_product_save( $post_id, $post ) {
		if ( wp_is_post_revision( $post_id ) || 'publish' !== $post->post_status ) {
			return;
		}
		if ( '1' !== get_post_meta( $post_id, self::META_ENABLED, true ) ) {
			return;
		}
		if ( ! Veazen_Credentials::is_connected() || ! function_exists( 'wc_get_product' ) ) {
			return;
		}
		$product = wc_get_product( $post_id );
		if ( $product ) {
			// Silent degradation (§7.2): a failed push never blocks saving.
			self::push_product( $product );
		}
	}

	/**
	 * Products already synced to the cloud, keyed by cloud id.
	 *
	 * @return array<string,string> cloud_id => "Name (SKU)".
	 */
	public static function synced_products() {
		if ( ! function_exists( 'wc_get_products' ) ) {
			return array();
		}
		$out      = array();
		$products = wc_get_products(
			array(
				'limit'        => 200,
				'status'       => 'publish',
				'meta_key'     => self::META_CLOUD_ID, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- bounded admin-screen query.
				'meta_value'   => '', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
				'meta_compare' => '!=',
			)
		);
		foreach ( $products as $product ) {
			$cloud_id = get_post_meta( $product->get_id(), self::META_CLOUD_ID, true );
			if ( is_string( $cloud_id ) && '' !== $cloud_id ) {
				$out[ $cloud_id ] = $product->get_name() . ' (' . ( $product->get_sku() ? $product->get_sku() : 'woo-' . $product->get_id() ) . ')';
			}
		}

		return $out;
	}

	/**
	 * "Veazen protection" checkbox on the product edit screen.
	 *
	 * @return void
	 */
	public static function register_meta_box() {
		add_meta_box(
			'veazen-protection',
			__( 'Veazen protection', 'veazen' ),
			array( __CLASS__, 'render_meta_box' ),
			'product',
			'side'
		);
	}

	/**
	 * Render the product meta box.
	 *
	 * @param WP_Post $post Current post.
	 * @return void
	 */
	public static function render_meta_box( $post ) {
		wp_nonce_field( 'veazen_product_meta', 'veazen_product_nonce' );
		$enabled  = get_post_meta( $post->ID, self::META_ENABLED, true );
		$cloud_id = get_post_meta( $post->ID, self::META_CLOUD_ID, true );
		?>
		<label>
			<input type="checkbox" name="veazen_enabled" value="1" <?php checked( '1', $enabled ); ?> />
			<?php esc_html_e( 'Enable anti-counterfeit codes for this product', 'veazen' ); ?>
		</label>
		<p class="description">
			<?php
			if ( is_string( $cloud_id ) && '' !== $cloud_id ) {
				esc_html_e( 'Synced to Veazen. Saved changes sync automatically.', 'veazen' );
			} else {
				esc_html_e( 'Not synced yet — save with this box ticked, or run a full sync from the Veazen page.', 'veazen' );
			}
			?>
		</p>
		<?php
	}

	/**
	 * Persist the meta box checkbox.
	 *
	 * @param int $post_id Post ID.
	 * @return void
	 */
	public static function save_meta_box( $post_id ) {
		if ( ! isset( $_POST['veazen_product_nonce'] ) ) {
			return;
		}
		if ( ! wp_verify_nonce( sanitize_key( $_POST['veazen_product_nonce'] ), 'veazen_product_meta' ) ) {
			return;
		}
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		update_post_meta( $post_id, self::META_ENABLED, isset( $_POST['veazen_enabled'] ) ? '1' : '0' );
	}
}
