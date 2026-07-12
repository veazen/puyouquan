# Manual test checklist (Phase 3 acceptance, §8)

Environment: `npx wp-env start` (docker), or any WP 6.4+ / WooCommerce 8+
site. Point the plugin at a running cloud API via the connection wizard's
"Advanced: custom API endpoint" field (e.g. `http://host.docker.internal:4000/api/v1`).

## 1. Connection wizard
- [ ] Activate plugin → Veazen menu appears (shield icon), placeholder asks for an API key
- [ ] Paste an invalid key → error notice, still disconnected
- [ ] Paste a valid `vz_` key (from console → Settings → API keys) → "Store connected", tenant name + plan shown
- [ ] Cloud console → Settings → Connected stores lists this site with plugin version
- [ ] Disconnect → key forgotten; reconnect works

## 2. Product sync
- [ ] Create a WooCommerce product with SKU → "Sync all products now" → success notice with count
- [ ] Product appears in the cloud console Products page (external_refs carries woo:<site_hash>)
- [ ] Product edit screen shows the "Veazen protection" box; tick + save → auto-resync on every save
- [ ] Cloud unreachable → saving the product still succeeds (silent degradation, §7.2)

## 3. Code batches
- [ ] Veazen page → request batch (product, qty 100, bulk) → notice; batch row appears
- [ ] Status flips pending → ready on refresh; "Download CSV" streams serial,scratch_code,qr_url
- [ ] "Activate all" → activated count = quantity; verify page shows authentic for a serial
- [ ] Request an on-demand pool batch → autoActivate true, no scratch column in CSV

## 4. Order binding
- [ ] Create an order containing a synced product → Veazen box on the order screen
- [ ] Enter a serial from the CSV (display format with hyphens is accepted) → "Serial bound"
- [ ] Cloud single-code lookup shows the order_ref {site, order_id}

## 5. Lite shipping label (§7.5)
- [ ] With an on-demand pool present, order screen shows "Print Veazen shipping label"
- [ ] Click → label file opens (CSV placeholder until Phase 4 PDF); serial bound to order automatically
- [ ] Pool below 20 codes → cloud auto-refills (new on_demand batch appears)

## 6. Front-end verify
- [ ] Add `[veazen_verify]` to a page → input + Verify button rendered with brand styles
- [ ] Gutenberg: insert the "Veazen Verify" block → editor placeholder; front end renders the widget
- [ ] Enter an active serial (messy format: lowercase + hyphens) → green authentic message
- [ ] Garbage serial → red invalid message; cloud down → service-unreachable message
- [ ] Network tab: requests go straight to the cloud API, never to the WP server

## 7. Dashboard widget
- [ ] WP Dashboard shows "Veazen — verifications" with 7-day count + open alerts
- [ ] Second load within 15 min does not hit the cloud (transient cache)

## 8. Uninstall
- [ ] Delete plugin → veazen_settings + encrypted key + transients removed
- [ ] Cloud tenant data untouched (log into console: products/batches still there)
