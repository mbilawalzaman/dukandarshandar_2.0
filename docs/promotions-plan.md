# Promotions & Discounts: Review and Improvement Plan

> **Status (2026-09-13): all five phases implemented.** The legacy `discounts` module has been
> replaced by the `promotions` module described below. Remaining manual steps for an existing
> database:
>
> ```bash
> npm run migrate:promotions -- --dry-run   # preview legacy discounts -> promotions
> npm run migrate:promotions                # run it (add --drop-legacy to rename old collections)
> npm run seed:promotion-types              # insert system presets (or "Restore presets" in admin)
> npm run test:promotions                   # engine unit tests
> ```
>
> Key entry points: `src/lib/promotionEngine.ts` (pure pricing), `src/services/promotionService.ts`
> (CRUD, quote, redemptions), `/admin/promotions` (builder + list), `/api/promotions/*` (storefront),
> `PromotionProvider` (client cache + instant quotes), `/vouchers` (customer wallet).

Reviewed on 2026-09-13 against the uncommitted discount work on `main`
(`src/services/discountService.ts`, `src/services/discountTypeService.ts`,
`src/app/admin/discounts/*`, `src/app/api/admin/discounts/*`,
`src/app/api/discounts/validate`, `DiscountFormModal`, `SendPromoModal`,
checkout promo box).

Goal: a Daraz Seller Center style promotion builder where the admin creates
promotion *types* and *promotions* from the admin portal, and customers see
them on the storefront (product cards, product page, cart, checkout, account).

---

## Part 1. Review of the current implementation

### What is already good

- Clear service layer (`discountService`, `discountTypeService`) separated from routes.
- A reasonable rule vocabulary already exists: target scope (all / category / products),
  conditions (min order amount, min item quantity), reward (percentage / fixed /
  free shipping / buy X get Y), caps, dates, usage limits, public vs private.
- Admin UI is split sensibly into Promotions, Promo Codes and Discount Types with a
  shared `DiscountFormModal`, and "Send Promo" email flow is a genuinely useful channel.
- Checkout already sends cart context (product id, category, price, quantity) to the
  validator, which is the right shape for a rules engine.

### Blocking bugs (fix before committing this work)

1. **Admin discount routes are unauthenticated.**
   `requireAdmin()` returns `{ ok, response }`, never `null`. Every discount route
   checks `if (!admin)` which is always false, so anyone can list, create, edit,
   delete discounts and trigger promo emails to arbitrary addresses and user IDs.
   Every other admin route in the repo uses `if (!admin.ok) return admin.response;`.
   Files: `api/admin/discounts/route.ts`, `api/admin/discounts/[id]/route.ts`,
   `api/admin/discounts/[id]/send-email/route.ts`, `api/admin/discount-types/route.ts`,
   `api/admin/discount-types/[id]/route.ts`.

2. **The discount is never applied to the order.**
   Checkout shows the reduced total, but `POST /api/orders` and the Safepay session
   recompute `subtotal + shipping` from items and ignore the promo. Customers are
   charged the full amount and the order record has no discount fields.

3. **Usage is never counted.** `incrementDiscountUsage` has no callers, so
   `usageLimit` never trips and `limitPerCustomer` is not enforced anywhere.

4. **Category-scoped promos apply to the whole cart.** `addToCart()` never stores
   `category`, so cart items have no category. The validator then finds zero
   qualifying items, and the fallback `qualifyingSubtotal > 0 ? ... : orderAmount`
   silently discounts the entire order instead of rejecting the code.

5. **Admin cards render `undefined`.** Promotions page, Promo Codes page and
   `SendPromoModal` read the legacy `discount.type` / `discount.value`, which
   `serialize()` never populates. They should read `rewardType` / `rewardValue`.

6. **Free-shipping reward uses the hard-coded 250** (`SHIPPING_FEE`) instead of the
   admin-configured delivery fee, and still subtracts 250 when the store-wide
   free-delivery toggle is already on (double discount).

### Design gaps

- `specific_products` scope has no product picker; `targetProductIds` is never sent
  from the form, so the scope is dead.
- `buy_x_get_y` is implemented as a flat amount off. There is no X, no Y, no free item.
- Public promotions (`is_public: true`) are not visible anywhere on the storefront.
  There is no public list endpoint, no product badge, no auto-apply, no voucher list.
  "Public" currently only changes which admin tab the row appears in.
- Discount Types are copy-on-select templates. Nothing links a promotion back to its
  type, so editing a type changes nothing, and there is no edit endpoint for types.
- `durationMonths` duplicates `startDate`/`endDate`, and the email says "valid for
  1 month" regardless of the real end date.
- `endDate` is parsed as UTC midnight, so a promo "ending 30 Sept" expires at the
  start of 30 Sept.
- No per-customer redemption record, so `limitPerCustomer` cannot be enforced even
  after wiring usage counting.
- `validate` endpoint is public with no rate limit (code enumeration) and
  `search` / type-name lookups build regexes from raw user input.
- Discount Types GET seeds the collection as a side effect.
- Delete uses `window.confirm` / `alert` although `ConfirmDeleteModal` exists.
- Naming drift: `is_public` (snake) next to camelCase fields.

---

## Part 2. Target design (Daraz-style)

### Promotion kinds

| Kind | What the admin configures | Where the customer sees it |
|---|---|---|
| `product_discount` | products/categories + % or fixed off, optional per-product sale price and stock cap | strike-through price + "-20%" badge on cards, product page, cart lines |
| `flash_sale` | same as above + short window | countdown badge, homepage flash strip |
| `voucher` (code or collectible) | code, reward, conditions, limits, public/private | "Collect" chips on product page, voucher picker at checkout, "My Vouchers" |
| `free_shipping` | conditions (min spend / min items / scope) | shipping line shows 0 with label, cart nudge "Add Rs. X more for free delivery" |
| `bundle` (buy X get Y) | buy qty X of scope, get qty Y of scope at Z% off or free | product page "Buy 2 get 1" badge, cart auto-applies |

Promotion Types become **type presets**: a named, reusable definition of
`kind + default rules + badge label + colour` that the admin can edit. A promotion
stores `typeId` plus its own resolved rules, so editing a preset only affects future
promotions (Daraz behaviour).

### Data model

Collection `promotions` (rename of `discounts`; one document per campaign):

```ts
{
  _id, name, kind, typeId?,
  code?: string,                // vouchers only, unique, uppercase
  visibility: "public" | "private",
  status: "draft" | "scheduled" | "active" | "expired" | "paused",  // derived + paused flag
  startAt, endAt,               // stored as Date, endAt = end of day local
  scope: { type: "all" | "categories" | "products", categories?: string[], productIds?: string[] },
  conditions: { minOrderAmount?, minItemQuantity?, firstOrderOnly?, customerIds?: string[] },
  reward: { type: "percentage" | "fixed" | "free_shipping" | "bundle",
            value?, maxDiscount?, buyQty?, getQty?, getDiscountPercent? },
  perProduct?: [{ productId, salePrice, stockLimit?, sold }],   // product_discount / flash_sale
  limits: { totalUses?, perCustomer?, budget? },
  stats: { timesUsed, totalDiscountGiven, revenue },
  stackable: boolean, priority: number,
  badge: { label, color },
  createdBy, createdAt, updatedAt
}
```

Collection `promotion_redemptions`: `{ promotionId, orderId, customerId | email, amount, createdAt }`
with an index on `(promotionId, customerId)`. This is what enforces per-customer limits
and feeds analytics.

Collection `promotion_types`: `{ name, kind, description, defaults: <rules>, badge, isSystem, isActive }`.

Orders gain: `discounts: [{ promotionId, code?, kind, amount }]`, `discount_total`,
and per item `original_price` / `unit_price`.

Users gain: `collectedVouchers: [{ promotionId, collectedAt }]`.

### Promotion engine (single source of truth)

`src/lib/promotionEngine.ts`, pure and shared by server and client:

```ts
applyPromotions({ items, activePromotions, customer?, voucherCode?, deliverySettings })
  -> { lines: [{ productId, unitPrice, originalPrice, appliedPromotionIds }],
       subtotal, itemDiscount, shipping, shippingDiscount,
       voucher?: { promotionId, code, amount },
       total, applied: [...], rejected: [{ promotionId, reason }] }
```

Rules: product-level discounts apply first (best single price per line, respecting
`stockLimit`), then bundles, then one voucher, then free shipping. Non-stackable
promotions short-circuit. The server re-runs the engine at order time; the client only
uses it for display.

---

## Part 3. Implementation plan

### Phase 0. Stabilise what exists (small, do first)

- Fix the `requireAdmin` checks in the five discount routes.
- Pass `category` through `addToCart` (`CartProvider.add`, `ProductCard`, `ProductDetails`)
  and reject codes with zero qualifying items instead of falling back to the full cart.
- Read `rewardType` / `rewardValue` in the two admin list pages and `SendPromoModal`.
- Make `POST /api/orders` and the Safepay session accept `promoCode`, re-validate
  server-side, store `discount_code` / `discount_amount`, and call `incrementDiscountUsage`
  atomically (`updateOne({ _id, $or: [{usageLimit: null}, {$expr: {$lt: ["$timesUsed", "$usageLimit"]}}] }, { $inc })`).
- Free shipping reward: use the delivery settings fee and skip when the store toggle already waives it.
- Set `endDate` to 23:59:59 local; drop `durationMonths` from the email in favour of the real end date.
- Escape user input before building regexes; add a simple in-memory rate limit on `/api/discounts/validate`.
- Swap `confirm`/`alert` for `ConfirmDeleteModal` and the cart toast.

### Phase 1. Data model and engine

- Introduce the `promotions`, `promotion_types`, `promotion_redemptions` collections
  and types in `src/types/apps/promotionTypes.ts`. Write a one-off migration script
  (`scripts/migrateDiscountsToPromotions.mjs`) that maps the current `discounts` documents.
- Implement `promotionEngine.ts` with unit tests (Node test runner is enough; the repo has no test framework yet).
- Replace `validatePromoCode` with `promotionService.quoteCart()` that loads active
  promotions and runs the engine.
- Add a Zod-style validator (or a hand-written one) for promotion payloads so admin
  POST/PUT reject nonsense such as percentage > 100 or endAt < startAt.

### Phase 2. Admin portal

- **Promotion Types page**: full CRUD, edit modal, "kind" selector that shows only the
  relevant fields, badge preview. System presets seeded by an explicit
  `scripts/seedPromotionTypes.mjs`, not by GET.
- **Promotions list**: one page with tabs Active / Scheduled / Expired / Paused / Drafts,
  filter by kind, search, and columns for period, redemptions, discount given, revenue.
  Keep Promo Codes as a filter (`kind = voucher`) rather than a separate page.
- **Create Promotion modal as a stepper** (the Daraz pattern):
  1. Basic info: name, type preset (auto-fills), visibility, start/end (date-time), badge.
  2. Rules: fields shown depend on `kind` (reward, conditions, limits, stacking).
  3. Products: scope picker with product search (`/api/products?search=`), category
     multi-select, and for product discounts a per-product table with original price,
     sale price or %, stock limit. Bulk "apply % to all selected".
  4. Review and publish: summary card, live preview of the storefront badge and
     checkout line, "Save as draft" or "Publish".
- Detail drawer per promotion: stats, redemption list, pause/resume, duplicate, send email.
- Send Promo modal: add customer segments (all users, users with orders, users without
  orders in 30 days, newsletter subscribers) alongside manual selection; send in
  batches with a background loop rather than a serial `await` per recipient.

### Phase 3. Storefront (client dashboard)

- `GET /api/promotions/active` (public, cached 60 s) returning public promotions with
  scope and reward only.
- `PromotionProvider` on the client that fetches once and exposes
  `getProductPromo(productId, category)` and `quoteCart(items)` via the engine.
- Product cards and product page: strike-through original price, sale price, badge
  (`-20%`, `Flash Sale`, `Buy 2 Get 1`, `Free Delivery`), countdown for flash sales.
- Product page: "Vouchers" strip listing applicable public vouchers with a Collect
  button (`POST /api/promotions/:id/collect`, requires login).
- Cart: auto-applied product discounts on each line, "Add Rs. X more for free delivery"
  nudge, and a "Best voucher" suggestion.
- Checkout: voucher picker showing collected and public vouchers with eligibility
  reasons, plus the existing manual code box. Totals come from the engine and are
  re-quoted whenever the cart changes.
- Account: "My Vouchers" page (collected, used, expired) and discount lines on order history.
- Homepage: replace the hard-coded free-delivery banner with a promotion-driven banner
  (highest-priority active public promotion), falling back to the delivery toggle.
- Email: promo email shows the real reward, period, scope and a deep link that
  pre-fills the code (`/checkout?promo=CODE`).

### Phase 4. Ordering and accounting

- Orders POST and Safepay session: run the engine server-side, persist `discounts[]`,
  `discount_total`, per-line prices, write `promotion_redemptions`, and bump stats in a
  single session where possible. Reject if the quote changed (reuse the existing
  Safepay cart fingerprint idea).
- Order cancel: release the redemption and decrement stats.
- Admin dashboard: add a "Promotions" metric tile and a chart of discount given vs revenue.

### Phase 5. Hardening

- Indexes: `promotions { code: 1 } unique sparse`, `{ status: 1, startAt: 1, endAt: 1 }`,
  `promotion_redemptions { promotionId: 1, customerId: 1 }`.
- Rate limit `validate` and `collect`.
- Audit log entries (`createdBy`, `updatedBy`) on promotions, matching products.
- Tests for the engine (stacking, caps, scope, per-customer limits, expired windows).

---

## Suggested order of work

1. Phase 0 (half a day) and commit the current feature in a working state.
2. Phase 1 engine and model, with the migration script.
3. Phase 2 admin stepper, since it unblocks creating real data.
4. Phase 3 storefront, product badges first, then vouchers, then account page.
5. Phase 4 and 5.

Each phase is independently shippable; Phase 0 alone makes the current branch safe to merge.
