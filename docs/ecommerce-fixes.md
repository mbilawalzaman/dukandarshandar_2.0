# Ecommerce defect fixes

Footer/sidebar appearance follow-up: Temu, Daraz, eBay, Walmart and AliExpress now use their marketplace colors for these surfaces; Default and Amazon retain navy. Footer text, links, icons, newsletter action and sidebar normal/selected/hover states use contrasting surface tokens. Calculated text contrast passes 4.5:1 for all seven presets; browser visual verification remains separate.

## Marketplace theme follow-up

- Theme selection is validated and included in settings API reads and writes; missing legacy values retain Default.
- Delivery-settings consumers share the store provider. Navigation refreshes settings, and stale requests cannot overwrite a successful save.
- Save responses refresh the complete admin form, including uploaded media URLs. Cancelling a preview resets the selection; navigating away or changing authentication clears previews.
- Ordinary text uses a neutral readable color independent of marketplace accents. Shared brand styles, checkout actions, navbar, page banners, admin sidebar and surfaces consume theme values.
- Regression tests cover all seven theme keys through API save/read, invalid keys and customer permission denial. Uploaded artwork, social-platform colors and status indicators retain their distinct appearance.

Scope: repairs to the existing app following `ecommerce-audit.md`. No wishlist, variants, returns/exchanges module, password-recovery flow, invoice generator, courier integration or COD settlement feature was added.

## Changes

- Order listing, cancellation and order-review access use customer ID, never unverified contact email. Notification recipients also use the saved customer ID. Firebase login no longer automatically links an unrelated account by matching its mutable email address.
- Public signup always creates a customer. Existing administrators keep their roles. User detail responses use an explicit field projection that excludes password hashes and refresh-token records.
- Ordinary customer profile requests cannot change the store logo. The profile UI only sends this field for administrators. Partial store-setting writes preserve omitted delivery fee settings.
- Checkout validates product IDs, positive whole-number quantities, duplicate items, shipping fields, phone/email formats, supported province/city/area combinations and payment method. Catalog and quote availability checks reject inactive/deleted products. Product writes validate prices and stock. Search expressions are escaped.
- COD stock deductions, order insertion and promotion redemption updates share a MongoDB transaction. A partial failure rolls back the entire write. The browser supplies a stable idempotency key, and owner-scoped deterministic order IDs prevent repeated requests from creating duplicate orders.
- Online attempts also use owner-scoped idempotency keys. The old email-based reuse and bulk cancellation were removed. Ready sessions are reused only for that request and owner. An uncertain provider call is retained for review instead of creating another session on retry. Client payment tokens are stored separately from order documents.
- Paid fulfillment is transactional and checks the saved tracker. Duplicate success callbacks do not repeat stock deductions; failure callbacks cannot overwrite paid/refunded or cancelled orders. Metadata cannot bind an unrelated tracker to an order.
- If payment arrives after stock is unavailable or after cancellation, the payment is recorded as paid with `payment_review` status. The stock transaction is rolled back. The administrator is notified and can use existing cancellation to refund; the order cannot be shipped accidentally.
- Admin status changes follow allowed transitions with conditional updates. Cancelled orders cannot be reopened. Admin/customer cancellation share one service and restock only inventory that was actually deducted.
- A durable cancellation claim prevents repeated refund submissions. Confirmed refund acceptance is saved before transactional restocking. Ambiguous provider failures remain pending for reconciliation, preventing blind duplicate refunds. The admin UI displays pending cancellations and refund status accurately.
- Delivered COD sales no longer include pending orders; the label explicitly distinguishes sales from verified collection. No cash-collection workflow was added. Customer spend excludes unpaid online attempts.
- Authentication and order/payment-session endpoints use shared MongoDB-backed request limits across app instances.
- Guest access now matches the existing one-day guest cookie instead of expiring after 15 minutes. The client does not attempt refresh just before a still-valid guest token expires. Secure guest order recovery after expiry remains deferred as a separate feature.
- Customer spend summaries now count only paid online orders and delivered COD orders, so unpaid/pending orders cannot inflate “total spent”.
- Promotion per-customer redemption and first-order checks prefer the session/customer ID whenever one exists. Mutable email is retained only as a legacy fallback for records without a session ID.
- Real account emails can no longer be silently replaced through profile or checkout synchronization. Email changes require a future verified flow; synthetic social-profile emails can still be completed.

## Deployment and compatibility

- **MongoDB must support multi-document transactions** (a replica set or sharded deployment, such as an appropriate Atlas deployment). There is intentionally no unsafe fallback to partial writes on a standalone server. This deployment capability has not been tested against the user's database.
- Deploy the checkout frontend and API together. Both order-creation endpoints now require `Idempotency-Key`; integrations must keep the same key for retries of the same checkout payload and use a fresh key for an intentional new order.
- No existing customer/order data or administrator roles were migrated. Historical orders missing a customer ID are no longer exposed through a guessed email match. Link such records only after independently verifying the customer, through a trusted administrative/database operation.
- On a new empty database, provision the administrator through trusted database administration. Public signup intentionally cannot bootstrap administrator privileges.
- Existing stock errors cannot be inferred safely from current quantities. Reconcile historical inventory before relying on it; the fixes prevent further partial writes and duplicate adjustments.
- Missing/invalid prices, missing active status, duplicate lines or malformed legacy quantities fail safely instead of being silently coerced. Review legacy records if those conditions are present.
- The `request_limits` collection gets a TTL index. Ensure application database credentials can create the index. IP-based limits assume the deployment's proxy supplies trustworthy client IP headers.

## Payment exception handling

`payment_review` means money was received but fulfillment could not be completed. Inspect the order and its tracker in Safepay. Existing admin cancellation initiates a full refund and does not add stock that was never reserved.

A cancellation with `refund_state: review_required` (or a long-stalled `requested`) must be reconciled with Safepay before another refund is attempted. The app does not assume a timeout means failure. After independently confirming refund acceptance, an operator can set `refund_state: succeeded`, `payment_status: refunded` and `refunded_at` on that same cancelling order, then use **Retry cancellation** to finish stock/redemption cleanup. If no refund occurred, independently confirm that fact before restoring the saved `cancellation_previous_status` and removing the claim to permit a fresh cancellation. Never release a refund claim merely because a timeout elapsed.

Uncertain payment session attempts are retained in `payment_sessions` for investigation. An operator should match the provider tracker/order metadata before retrying or binding a session. This avoids automatically issuing a second session when the first provider request may have succeeded.

## Validation

Wishlist/account follow-up: introduced authenticated, ownership-scoped saved items; hardened password-reset/email-verification token handling and session revocation; restricted social/banner destinations to safe HTTPS or same-site links.

Re-audit fixes also validate and normalize admin product ratings, and add bounded input, email safety checks and IP rate limits to contact/newsletter endpoints.

- 25 new regression cases passed across checkout validation, access-control and order-lifecycle suites.
- Existing date/promotion tests passed through `npm run test:promotions` (the legacy script runs all `tests/*.test.ts` files).
- TypeScript and lint checks passed; lint reported no warnings/errors.
- Final `npm run build` passed, including compilation, type/lint validation, all 52 static pages and build traces.


The regression suites exercise real repository validation, access-control, stock, payment and cancellation functions with mocked database/provider boundaries. The database test fixture simulates transaction rollback and serializes concurrent test transactions; it does not certify real MongoDB isolation or a deployed Safepay integration.

Covered cases include malformed quantities/shipping, email-based ownership attempts, customer logo writes, first-signup role assignment, sensitive-field projection, request identity binding, duplicate/concurrent callbacks, partial stock failure, two buyers competing for the last unit, simultaneous cancellation, unpaid-order cancellation, ambiguous refunds and late/reordered callbacks.

No live orders, charges, refunds or customer records were created by these tests. Validate real MongoDB transactions and the full payment/refund flow in a disposable sandbox deployment before production deployment.
