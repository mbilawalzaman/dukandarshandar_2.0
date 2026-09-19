# Dukandar Shandar ecommerce audit

Theme-switcher follow-up: repaired API persistence, shared settings synchronization, preview cleanup, form/media refresh after saves, neutral text contrast and theme-aware shared storefront/admin styling. See `ecommerce-fixes.md` for details and regression coverage. Visual verification of all seven presets on a deployed browser remains required.

Reviewed and updated after defect fixes: 2026-09-19.

**Current verdict:** the defect-fix pass is implemented and local validation passed. The app is not yet certified production-complete: live database/payment verification, operational checks and the deferred ecommerce features below remain outstanding.

This update covers repairs to existing functionality only. See [Ecommerce defect fixes](ecommerce-fixes.md) for implementation details, deployment compatibility and payment-exception procedures.

Scope: repository review of routes, controllers, services, models, storefront/admin components, authentication, payment handling, Firestore rules, configuration and regression tests. “Fixed” below means implemented in source and covered by local checks, not verified against production. Live payments, refunds, email delivery, deployed Firebase rules, courier operations, browser/mobile usability, accessibility and performance have not been validated. External service configuration and deployment infrastructure cannot be certified from this repository.

## Existing functionality

| Area | Implementation found |
| --- | --- |
| Catalog | Product administration, categories, multiple images, product details, search, price/category/stock filters, sorting and pagination |
| Cart | Persistent browser cart, quantity editing, removal and totals |
| Checkout | Registered and guest checkout, shipping fields, Pakistan province/city/area selection, server-priced totals |
| Payments | COD and Safepay session/webhook integration; card, Raast and wallet paths |
| Orders | Customer history, admin listing/filtering/status updates, printable shipping labels, pending-order cancellation |
| Refunds | Shared customer/admin cancellation with eligible full online refunds, duplicate-submission protection and explicit exception states |
| Promotions | Vouchers, collection, quotes, campaign administration, flash sales, redemption tracking and promotion emails |
| Reviews | Delivered-purchase eligibility, product reviews and rating aggregation |
| Accounts | Password and Firebase social login, profile editing, access/refresh sessions, admin/user roles |
| Engagement | Contact/newsletter endpoints, support chat, notifications and push integration |
| Administration | Dashboard, products, customers, orders, payments, promotions, pages and delivery/store settings |

Implementation present does not establish that its deployed integration works.

## Defect status after fixes

The numbering and severity below refer to the original audit findings. Fixed findings are retained for traceability, rather than listed as unresolved launch blockers.

| # | Original severity / finding | Current status | Implemented behavior and remaining limits |
| --- | --- | --- | --- |
| 1 | High — email used as order ownership | **Fixed** | Order listing, cancellation and order-review access use customer ID. Notifications also use the stored owner. Firebase login no longer auto-links another account by mutable email. Email verification and secure guest-order claiming remain deferred features. |
| 2 | High — payment sessions crossed customer boundaries | **Fixed** | Owner-scoped checkout keys replace email-based reuse and bulk cancellation. Concurrent requests share a durable session claim; retries do not initiate a second provider request. Uncertain attempts require reconciliation. |
| 3 | High — customers could modify global logo/delivery settings | **Fixed** | Customer profile writes cannot change the store logo. The UI only sends this field for administrators. Partial settings writes preserve omitted delivery fees and toggles. |
| 4 | High — invalid quantities corrupted stock | **Fixed** | Checkout rejects negative, zero, fractional, nonfinite, excessive and duplicate quantities/items. Pricing and stock updates use normalized items. Product writes validate price and stock. |
| 5 | High — partial writes and unsafe retries | **Fixed; deployment verification required** | COD stock, order insertion and redemption changes share a transaction. Paid fulfillment is transactional. Request keys, state checks and cancellation claims prevent duplicate orders, deductions and refund submissions. Real MongoDB transaction behavior still needs sandbox verification. |
| 6 | High — paid orders could fail stock reservation silently | **Exception handling implemented** | Online stock is still deducted after payment. If unavailable, the transaction rolls back and the payment is recorded as paid with `payment_review`; an admin alert permits review and existing cancellation/refund handling. This does not guarantee stock before charging. Expiring pre-payment reservations and automatic reconciliation of missed events were not added. |
| 7 | High — admin transitions bypassed stock/refund safeguards | **Fixed** | Allowed transitions and conditional writes replace arbitrary changes. Cancelled orders cannot reopen. Admin/customer cancellations share the refund path and restock only deducted inventory. |
| 8 | High on empty deployments — first signup became admin | **Fixed** | Public signup always creates a customer. Existing admins retain their roles; new deployments require trusted administrator provisioning. |
| 9 | Medium — COD reporting and collection incomplete | **Reporting fixed; collection feature deferred** | Reports count delivered COD sales instead of all noncancelled orders and label collection as unverified. Customer spend now counts only paid online orders or delivered COD orders. Cash collection, courier settlement and reconciliation records remain unimplemented. |
| 10 | Medium — inconsistent checkout validation | **Fixed** | Both checkout paths validate shipping/contact fields and province/city/area relationships. COD only accepts COD; online checkout restricts its payment methods. |
| 11 | Medium — inactive products remained purchasable | **Fixed** | Public catalog/detail, quoting and stock reservation checks enforce active/nondeleted availability. Administrators can still inspect inactive products. Invalid prices are rejected at checkout. |
| 12 | Medium — sensitive user fields returned | **Fixed** | User-detail queries explicitly project public fields, excluding password hashes and refresh-token records. |
| 13 | Medium — auth/order endpoints lacked throttling | **Fixed; deployment configuration required** | Authentication and order/payment-session endpoints use shared MongoDB-backed request limits. The TTL index needs appropriate database permissions; client-IP limits rely on trustworthy proxy headers. |
| 14 | Medium — guest access expired without recovery | **Expiry mismatch fixed; recovery feature deferred** | Guest access now lasts the existing one-day cookie window, and a still-valid guest token is not prematurely refreshed away. Access after expiry/browser loss still requires a future secure recovery flow; unverified email matching is not restored. |

### Implementation references

- Findings 1, 8 and 12: [order ownership rules](../src/lib/orderRules.ts), [authentication controller](../src/controllers/authController.ts), [user controller](../src/controllers/userController.ts), [order review service](../src/services/productReviewService.ts).
- Findings 2, 5, 6 and 7: [orders API](../src/app/api/orders/route.ts), [transaction helpers](../src/lib/orderTransaction.ts), [payment service](../src/services/orderPaymentService.ts), [payment controller](../src/controllers/safepayController.ts), [cancellation service](../src/services/orderCancelService.ts).
- Finding 3: [profile API](../src/app/api/profile/route.ts), [delivery settings helper](../src/lib/deliverySettings.server.ts).
- Findings 4, 10 and 11: [checkout validation](../src/lib/checkoutValidation.ts), [shipping validation](../src/lib/checkout.server.ts), [product controller](../src/controllers/productController.ts), [promotion service](../src/services/promotionService.ts).
- Findings 9, 13 and 14: [payment reporting](../src/app/api/admin/payments/route.ts), [shared request limits](../src/lib/rateLimit.server.ts), [sessions](../src/lib/session.ts), [client authentication](../src/lib/authFetch.ts).

### Additional follow-up fixes

- Customer spend summaries now exclude unpaid COD and pending online orders.
- Per-customer promotion redemption and first-order checks prefer the immutable session/customer ID; mutable email is used only when no session ID exists for legacy data.
- Profile and checkout synchronization no longer silently replace a real account email. A real email change now requires a future verified-account flow; synthetic social-profile email completion remains supported.

## Remaining deployment and operational checks

1. Verify multi-document transactions on the target MongoDB replica set/sharded deployment. There is no unsafe standalone-server fallback.
2. Deploy checkout frontend and APIs together. Both creation endpoints require a stable `Idempotency-Key` for retries of the same checkout.
3. Run a disposable sandbox order/payment/refund lifecycle, including duplicate and reordered callbacks, concurrent buyers and cancellation retries. Verify customer emails and mobile checkout separately.
4. Reconcile historical stock discrepancies and malformed legacy records. No existing inventory/customer/order data was migrated. Orders missing a customer ID need independently verified ownership before administrative linking.
5. Confirm administrator provisioning, request-limit index permissions and proxy configuration. Review backup restoration, monitoring, alerts and deployed Firebase rules.
6. Reconcile ambiguous payment/refund results with Safepay before retrying. Durable claims prevent duplicate submissions but do not automatically resolve uncertain provider outcomes. Follow the [payment exception procedures](ecommerce-fixes.md#payment-exception-handling).

## Missing or partial ecommerce functionality

| Function | Assessment and priority |
| --- | --- |
| Forgot/reset/change password | No customer flow found. Important before launch. |
| Email verification and secure email changes | **Security guard added; verification flow deferred.** Email is no longer accepted as proof of order ownership, automatic account linking by email was removed, and changing a real account email is blocked until a verified flow exists. Synthetic social-profile emails can still be completed with a real address. |
| Returns and exchanges | Pending cancellation exists; no post-delivery return request, approval, receipt/inspection, exchange or partial refund workflow found. |
| Refund management | Cancellation/refund safeguards and exception states are implemented. A complete refund ledger, partial refunds and automated reconciliation remain deferred. |
| Courier tracking | Printable internal labels exist. The PostEx specification below is a plan, not a verified working integration. Booking, live tracking and courier cancellation remain deferred. |
| Shipping calculation | Flat configurable fee and promotion support exist; no weight/destination-based rate engine or delivery ETA found. Needed if operations require these rules. |
| Customer policies | Dedicated terms, privacy, shipping and returns/refund pages and links remain deferred; no implementation was found in the checked footer/settings/routes. Existing social links are separate from customer policies. |
| Invoices/receipts | Confirmation emails and shipping labels exist; no customer downloadable invoice/receipt workflow found. |
| Product variants | No variant-level size/color/pack options, SKU/barcode, price and stock model found. Needed only if selling variant products. |
| Address book | One saved profile address exists; no multiple saved shipping/billing addresses found. |
| Wishlist | No wishlist functionality found. Optional enhancement. |
| Cross-device cart | Cart is localStorage-based; no account-backed cart synchronization/merge found. Optional enhancement. |
| Inventory operations | Quantity editing/low-stock alerts exist; no stock movement ledger, supplier receiving, stock adjustment reasons or purchase-order workflow found. |
| Tax calculations | No tax line/calculation configuration found. Determine business requirements separately; this is not a legal compliance assessment. |
| SEO | Basic global metadata exists; no product-specific metadata, product structured data, sitemap or robots file found. |
| Marketing operations | Newsletter signup exists; no unsubscribe flow found. Blog page explicitly says coming soon. |
| Operational readiness | Implementation/deployment notes and mocked checkout/payment regression suites now exist. README remains the starter template. Real-service integration tests, browser tests, backup restoration, monitoring and deployment verification remain outstanding. |

## Recommended next steps

1. Complete the deployment and operational checks above before treating the repaired paths as production-verified.
2. Keep additional feature implementation deferred, as requested. In a later phase, prioritize account/password recovery, email verification, secure guest recovery, customer policies, returns/refunds, COD collection and courier tracking according to store operations.
3. Prioritize catalog-specific enhancements such as variants, address books and wishlist after those operational requirements are agreed.

## Validation after fixes

### Account, navigation and wishlist follow-up

- Password-reset and email-verification tokens are stored as hashes, rate-limited, expire server-side and are single-use. A completed password reset revokes active refresh sessions.
- Email-confirmation links work from the recipient's browser without relying on the old account session. Profile email changes now send a confirmation request after other profile updates save.
- Social profile and banner destinations accept only HTTPS URLs or same-site paths, preventing unsafe link schemes.
- Logged-in customers can save active products to a server-owned wishlist through product-card/detail heart controls and manage them at `/wishlist`.

Re-audit fixes also validate and normalize admin product ratings, and add bounded input, email safety checks and IP rate limits to contact/newsletter endpoints.

- **25 new regression cases passed** across [checkout validation](../tests/checkoutValidation.test.ts), [access control](../tests/accessControl.test.ts) and [order lifecycle](../tests/orderLifecycle.test.ts).
- Existing date/promotion tests passed through `npm run test:promotions`; despite its legacy name, that script runs all `tests/*.test.ts` files.
- `npm run lint`: passed with no lint warnings/errors; the CLI printed a `next lint` deprecation notice.
- `tsc --noEmit --incremental false`: passed.
- Final `npm run build`: passed, including compilation, type/lint validation, all 52 static pages and build traces.
- Regression coverage includes malicious quantities, ownership attempts, store-setting permissions, first-signup role assignment, sensitive-field projection, idempotency, concurrent sessions/callbacks/cancellations, partial rollback, competition for the final unit, late payments and ambiguous refunds.
- Database/provider boundaries were mocked. Transaction fixtures simulate rollback and serialize concurrent test transactions; these results do not certify real MongoDB isolation or live Safepay behavior.
- Application source was changed during the defect-fix pass. No live orders, charges, refunds or customer records were created by the tests. This audit-document update does not add application functionality or rerun those checks; it records the completed validation.

## PostEx Courier Integration Specification

**Status: planned/deferred, not implemented or validated by this fix pass.** The specification below is preserved as the proposed PostEx Pakistan integration. Endpoint paths and configuration details require confirmation against the merchant API before implementation; their presence here is not evidence of working courier functionality.

PostEx Pakistan is proposed as the primary COD logistics & courier provider for order booking and real-time tracking.

### Key Components & Endpoints
1. **Order Booking (`POST /api/v1/order/create`)**:
   - Triggered from Admin Order Management (`/admin/orders`) when booking a parcel.
   - Generates a PostEx Waybill / Tracking Number (`trackingNumber`) saved directly to the MongoDB order document.
2. **Real-Time Parcel Tracking (`GET /api/v1/order/track/{trackingNumber}`)**:
   - Displayed on the customer's `/orders` page via a "Track Shipment" modal/button.
   - Renders live parcel timeline (*Booked $\rightarrow$ In Transit $\rightarrow$ Out for Delivery $\rightarrow$ Delivered*).
3. **Pre-Pickup Cancellation (`POST /api/v1/order/cancel`)**:
   - Allows admins to cancel booked shipments before courier pickup.
4. **Environment Configuration**:
   - `POSTEX_API_TOKEN`: Merchant API authorization token.
   - `POSTEX_PICKUP_ADDRESS_CODE`: Store/Warehouse pickup address code registered on PostEx Merchant Portal.
