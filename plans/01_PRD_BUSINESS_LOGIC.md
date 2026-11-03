# 01_PRD_BUSINESS_LOGIC.md

**Project:** CarVision — AI car tuning & detailing visualizer with a parts marketplace
**Document type:** Product Requirements Document (PRD) and business rules
**Audience:** AI coding agents (Gemini in Antigravity), engineers, the product owner
**Status:** Normative. Requirements have IDs (`FR-xxx-nn`). Code, tests and build prompts reference these IDs.
**Read together with:** `04_ARCHITECTURE.md`, `05_CODING_STANDARDS.md`
**Owner decisions needed:** see section 12 (items marked **OWNER**). Each has a safe default so work is never blocked.

---

## 0. How to use this document

- Every requirement has an ID, a priority (P0/P1/P2) and an acceptance criterion (AC). An implementation is correct only if the AC is true.
- **Priority meaning:** **P0** = needed to onboard and charge the first paying shop. **P1** = needed for growth and a complete product; built right after P0, same launch window. **P2** = after launch.
- Numbers (prices, percentages, limits, credit costs) are **defaults stored in the database** (`plans`, `system_settings`), never hard-coded. This document gives their initial values.
- When this document and a spec file for a specific area disagree, the more specific file wins for details (`08` for camera, `07` for AI, `06` for schema). For business rules, this file wins.

---

## 1. Product summary

**CarVision** lets a tuning or detailing shop photograph a customer's car and instantly show that exact car with the parts and services the customer is considering (wheels, bumpers, lights, spoilers, paint/wrap, tint, polish), rendered realistically in 4K, with a live price total and a before/after comparison. A B2C marketplace lets car owners do the same from home with parts from verified shops, then book an installation with a deposit.

**Why shops buy it:** customers decide faster and spend more when they can *see* the result on their own car (higher conversion, bigger baskets, fewer "I'll think about it" exits).

**Business model:** B2B subscription by image credits, assigned manually by the admin after payment. B2C is free to use and drives shop leads, monetized by a 3% booking deposit credited to the customer's bill.

**Launch markets:** Uzbekistan first (primary focus). Clients are also ready in the UAE (Dubai), Kyrgyzstan and Turkey and are served from day one, without market-specific code beyond language and currency display.

### 1.1 Product principles
1. **The car is the hero.** The vehicle image dominates every screen. Controls float and get out of the way.
2. **Premium and simple.** Few choices per screen, large touch targets, no clutter, no dense tables for customers.
3. **Never lie to the customer.** Show only parts that fit this car. Never show invented ratings, fake reviews or fake data.
4. **Never lose money silently.** Credits and money are exact, idempotent and auditable.
5. **Never clip, never overlap.** The UI works on every screen size, orientation and language (including Arabic RTL).
6. **Manual where cheap, automatic where it matters.** Billing is manual at the start; everything customer-facing is instant.

---

## 2. Roles and personas

| Role (`profiles.role`) | Who | Main goal |
|---|---|---|
| `b2b_seller` | Shop owner / staff using the shop account (usually on a shared tablet) | Show results, sell more, manage stock |
| `b2c_user` | Car owner at home | Try parts on own car, find a shop, book |
| `super_admin` | Product owner | Run the business: plans, money, quality, fraud |
| *(no account)* | Walk-in customer at the shop | Holds the tablet; uses the shop's session, no registration |
| *(no account)* | Person opening a Tuning Passport link | Reviews a quote and may register to book |

Shop staff sub-accounts are P2; in v1 staff share the shop account within the plan's device limit.

---

## 3. Glossary

- **Credit:** unit of AI usage. One credit buys one rendered angle image (see 5.2).
- **Angle:** one of eight standard camera views of a car (IDs 1–8, section 7.1).
- **Session:** one car being worked on: its photos, selected items, generated results, passport, bookings.
- **Part:** a physical item (wheels, bumper, headlights...). **Service item:** paint/wrap color, polish, ceramic coating, tint. Both are **Items**.
- **Slot:** a position on the car an item occupies (front bumper, wheels, hood...). One item per slot.
- **Build:** the set of items currently selected in a session.
- **Master Catalog:** CarVision-curated reference items (images, fitment, no prices).
- **Inventory item:** a shop's offer for an item (price, labor, availability), based on a Master item or custom.
- **Showroom mode:** studio showing only the signed-in shop's inventory. **Marketplace mode:** studio for `b2c_user` showing all verified shops' offers.
- **Deposit:** 3% payment that unlocks a shop's contact details and creates a booking.
- **Passport:** shareable link/QR with a saved build, results, and prices.

---

## 4. Scope

### 4.1 In scope (v1)
Authentication and roles, language selection, vehicle sessions with guided capture, vehicle recognition and fitment filtering, Master Catalog and shop inventory, studio with price ticker and before/after, AI generation with credits, manual plans and top-ups, watermarking, showroom mode, marketplace mode, deposits and bookings, referrals, device limits, admin console, Tuning Passport, video/reel export, PWA.

### 4.2 Out of scope (v1)
Automatic payments and recurring billing, native apps, 3D scanning of parts, shop staff sub-accounts, in-app chat, shipping/fulfillment, AI-generated video, third-party API, shop-to-shop trading.

---

## 5. Business model

### 5.1 Plans (initial values)

| Plan code | Price (USD) | Credits | Duration | Watermark | Devices | Custom items | Intended for |
|---|---:|---:|---:|:---:|---:|---:|---|
| `FREE_TRIAL` | 0 | 40 | no expiry for trial credits | Yes | 1 | 10 | Evaluation |
| `PRO_800` | 29 | 800 | 30 days | No | 2 | 200 | Small shops |
| `MAX_4000` | 99 | 4,000 | 30 days | No | 4 | 1,000 | Busy shops |
| `ULTRA_10000` | 199 | 10,000 | 30 days | No | 8 | 10,000 | Large centers |

`b2c_user` accounts get 40 free credits, watermark on, 2 devices (**OWNER**, see OD-8).
Plans are rows in `plans`; the admin can edit them or add `CUSTOM` plans without a deploy.

### 5.2 What one credit buys
- **1 credit = 1 rendered angle image** delivered successfully, regardless of how many items (up to 8) are in the build.
- **Night variant** of an angle: **+1 credit** (a second render). Available on all plans (changed from earlier drafts, which gated it).
- **Free (0 credits):** browsing, capturing photos, vehicle recognition, price calculation, switching angles, reusing a cached result, exporting the reel video, creating a passport.
- **Cached results are free:** if the same photo + same item set + same mode was already rendered, return the stored result and charge nothing (FR-CRD-06).
- **Failed renders cost nothing:** credits are refunded automatically (FR-CRD-04).
- **Render all angles (360 mode):** costs one credit per captured angle where at least one selected item is visible (see 7.1). The user sees the exact cost before confirming.

### 5.3 Credit buckets and expiry (**OWNER**, OD-4)
- `plan` credits come with a plan and **expire when the plan period ends**.
- `bonus` credits (referral, admin grants, trial) expire after **12 months**.
- Spending order: the bucket expiring soonest first.
- When a plan period ends with no renewal, the shop becomes **`EXPIRED`**: it keeps its inventory and history, cannot generate, sees an upgrade prompt. Nothing is deleted.

### 5.4 Unit economics and the Pricing Guard

Assumed provider cost: **about $0.01 per credit** (rough estimate, to be replaced by the measured value from the AI spike in `07_AI_PIPELINE.md`).

| Plan | Revenue per credit | Estimated cost at $0.01 | Margin if fully used |
|---|---:|---:|---:|
| `PRO_800` | $0.03625 | $0.01 | 72.4% |
| `MAX_4000` | $0.02475 | $0.01 | 59.6% |
| `ULTRA_10000` | $0.01990 | $0.01 | 49.7% |

**Pricing Guard (launch gate, FR-ADM-12):** before selling plans, the measured blended cost per credit (including failed jobs, retries, masks, vision calls, storage) must be no higher than:

| Plan | Max cost for 50% margin | Break-even cost |
|---|---:|---:|
| `PRO_800` | $0.0181 | $0.0363 |
| `MAX_4000` | $0.0124 | $0.0248 |
| `ULTRA_10000` | $0.0100 | $0.0199 |

If the measured cost is higher, plan prices or credit rules change **before** launch. The admin dashboard shows live margin per plan from real provider costs. Unused credits improve real margin; do not plan on it.

### 5.5 Savings display (anchor pricing)
Baseline = the per-credit price of `PRO_800` (`29 / 800 = $0.03625`). For a larger plan with `C` credits and price `P`:

```
anchorPrice = C × 0.03625
savingsUsd  = anchorPrice − P
savingsPct  = round(savingsUsd / anchorPrice × 100)
```

| Plan | Anchor | Price | Saving shown |
|---|---:|---:|---|
| `MAX_4000` | $145.00 | $99 | $46 (32%) |
| `ULTRA_10000` | $362.50 | $199 | $163.50 (45%) |

These values are computed from the `plans` table at render time, never typed into the UI. The comparison is honest: it compares against buying the same credits on the Pro plan.

### 5.6 Running-low prompts
- **Warning:** remaining credits ≤ 10% of the plan, or ≤ 16, whichever is higher: soft banner with upgrade/contact action.
- **Critical:** ≤ 8 credits (one full car): modal on app open with a one-tap "Contact admin" action (opens the configured Telegram link).
- **Empty:** generation is blocked with a clear message and the same action. Capturing, browsing and passports still work.

### 5.7 Manual billing procedure
1. Shop pays the owner by agreement (card transfer, cash, etc.).
2. Admin finds the shop, selects a plan or a custom grant, enters **amount received, currency, method, note**, and confirms.
3. The system sets the plan, period, and credits, writes `payments_manual`, `credit_ledger` and `admin_audit_log`, and the shop's screen updates immediately with a confirmation animation.
4. Revenue figures in the admin console come only from `payments_manual`. Provider cost comes from generation records. Net profit = recorded revenue − provider cost.

There is no auto-recharge and no card storage. "Top-ups" are admin grants of extra credits.

---

## 6. Functional requirements

### 6.1 Onboarding, authentication, language (FR-ONB)

| ID | Pri | Requirement | Acceptance criteria |
|---|:--:|---|---|
| FR-ONB-01 | P0 | First visit shows a full-screen language picker (uz default, ru, en, tr, ar, ky; kk and tg follow). | Choice persists in cookie and profile; whole UI switches immediately; Arabic switches to RTL. |
| FR-ONB-02 | P0 | One `/login` and one `/register` for all roles. Registration asks role: car owner or shop. | No role-specific login URL exists; admin role cannot be chosen at registration. |
| FR-ONB-03 | P0 | Registration by phone number or email with password (or OTP when available). | Duplicate phone/email rejected with a clear message; password rules shown inline. |
| FR-ONB-04 | P0 | Shop registration collects: shop name, owner name, phone, city, district, address, map pin, working hours, optional referral code. | Address and pin stored as private; district/city used for marketplace display. |
| FR-ONB-05 | P0 | After shop registration, offer **Master Catalog quick import**: pick vehicle brands served, tick items in stock, enter prices. | A shop can reach 30+ priced items in under 5 minutes; skipping is allowed. |
| FR-ONB-06 | P0 | After login, redirect by role: shop → showroom studio, car owner → marketplace studio, admin → admin console. | Verified server-side; a non-admin hitting `/admin` gets 403. |
| FR-ONB-07 | P0 | New accounts receive 40 trial credits and a unique referral code (shops). | Code format `CV-<PREFIX>-<4 digits>`; ledger entry created. |
| FR-ONB-08 | P1 | Terms of Service and Privacy Policy acceptance at registration, in the user's language. | Acceptance timestamp and version stored. |

### 6.2 Vehicle session and capture (FR-CAP) — details in `08_SMART_CAMERA.md`

| ID | Pri | Requirement | Acceptance criteria |
|---|:--:|---|---|
| FR-CAP-01 | P0 | User starts a session in **Quick** (1–2 angles) or **360°** (8 angles) mode and can upgrade Quick → 360° later without losing work. | Mode switch keeps captured angles and the selected build. |
| FR-CAP-02 | P0 | A guided camera shows the target angle outline and live guidance (move closer, left, right, higher, lower). | Guidance text is translated; haptic/visual confirmation when aligned. |
| FR-CAP-03 | P0 | Photos are compressed on the device (WebP, longest side ≤ 2048 px, target ≤ 400 KB) before upload. | Upload completes within 2 s on typical weak 4G; EXIF stripped. |
| FR-CAP-04 | P0 | Users can upload existing photos instead of using the live camera. | An uploaded image is assigned to an angle; quality checks run (blur, darkness, vehicle visible). |
| FR-CAP-05 | P0 | Quality gate: reject or warn on blurry, dark, cropped or non-car images with a clear reason and a retake action. | A cat photo or a black frame never reaches the AI. |
| FR-CAP-06 | P1 | On a large screen, the phone can act as the camera through a QR bridge. | Scan QR → phone camera opens → photos appear on the large screen within about 1 s each. |
| FR-CAP-07 | P0 | Captured photos survive a refresh or lost connection until uploaded. | Reopen shows pending uploads with retry. |

### 6.3 Vehicle recognition and fitment (FR-FIT)

| ID | Pri | Requirement | Acceptance criteria |
|---|:--:|---|---|
| FR-FIT-01 | P0 | After the first accepted photo, recognize make, model, generation/year range and body type. | Result shown as "Detected: Chevrolet Malibu 2 (2019–2023) [Change]" within 3 s. |
| FR-FIT-02 | P0 | Recognition is always overridable manually (make → model → generation). | Manual choice persists for the session and overrides AI. |
| FR-FIT-03 | P0 | If confidence is below the configured threshold or the model is unknown, ask the user to choose manually and show universal items only until chosen. | Never silently guess when unsure. |
| FR-FIT-04 | P0 | The catalog shows only items that fit the selected vehicle plus universal items (paint, wrap, polish, tint, universal wheels by size rule). | An item without a fitment match to the vehicle never appears. |
| FR-FIT-05 | P1 | Unknown vehicles can be reported; admin receives them to extend the taxonomy. | One tap "My car is missing" creates a report. |

### 6.4 Catalog and inventory (FR-CAT)

| ID | Pri | Requirement | Acceptance criteria |
|---|:--:|---|---|
| FR-CAT-01 | P0 | Item categories: wheels, tires, front bumper, rear bumper, grille, headlights, taillights, hood, spoiler, diffuser, side skirts, body color/wrap, polish/ceramic, window tint. | Each category maps to slots and valid angles (7.1, 7.2). |
| FR-CAT-02 | P0 | Admin curates the **Master Catalog**: reference images (clean, background removed), names per locale, fitment (vehicle generations), category, optional brand/size attributes. | Master items have no price. |
| FR-CAT-03 | P0 | A shop creates inventory items from Master items by ticking and entering **price**, **labor cost**, and availability (in stock / on order). | Price and labor are required, positive, integer minor units. |
| FR-CAT-04 | P0 | A shop can add **custom items** by photographing the item (guided: 2–4 views); the system removes the background and prepares it for rendering. | Item gets an `image_status`: processing / ready / rejected with reason. |
| FR-CAT-05 | P0 | Custom item count is limited by plan (5.1). | At limit, creation is blocked with an upgrade message. |
| FR-CAT-06 | P0 | A shop edits or deactivates items; deactivated items vanish from studio and marketplace immediately. | No deleted item can be booked. |
| FR-CAT-07 | P1 | Bulk edit prices (percentage or fixed) for a category. | Applies in one transaction with an undo for 10 minutes. |
| FR-CAT-08 | P0 | In Showroom mode the catalog contains **only that shop's** active items. | Verified by RLS tests. |
| FR-CAT-09 | P0 | Catalog image and card show: image, name, price, and a fit badge. Nothing else (details open in a sheet). | Cards never exceed 2 text lines plus price. |

### 6.5 Studio (FR-STU)

| ID | Pri | Requirement | Acceptance criteria |
|---|:--:|---|---|
| FR-STU-01 | P0 | The vehicle image occupies at least 85% of the viewport area when controls are hidden; controls float above it. | Verified at all breakpoints in `02_DESIGN_SYSTEM.md`. |
| FR-STU-02 | P0 | Category chips and item cards scroll horizontally with snap. Selecting a card adds the item to the build; selecting another item in the same slot replaces it. | One item per slot; replaced item is removed from the total. |
| FR-STU-03 | P0 | A **price ticker** shows the live total (items + labor) with an animated update and an itemized sheet where any item can be removed. | Total is computed from database prices on the server for any commitment; the client value is display only. |
| FR-STU-04 | P0 | **Generate** renders the build for the current angle. Cost shown before the tap ("1 credit"). | Insufficient credits → blocked with a clear upgrade/contact action. |
| FR-STU-05 | P0 | Choosing an item whose slot is not visible from the current angle switches to a captured angle where it is visible; if none exists, prompt the user to capture one. | Matches the matrix in 7.2. The AI is never asked to render an invisible part. |
| FR-STU-06 | P0 | After the build changes, an existing result is marked **outdated** until regenerated. | Outdated badge visible; price already reflects the new build. |
| FR-STU-07 | P0 | **Before/After slider** compares the original and the result of the same angle. While dragging or zooming, all controls hide within 200 ms and return on release. | Works with touch and mouse; keyboard accessible. |
| FR-STU-08 | P0 | While rendering, show a progress animation (never a bare spinner), a fast preview first, then upgrade to 4K when ready. | First visible result typically within 4 s; failure shows a retry and confirms credits were refunded. |
| FR-STU-09 | P0 | Result history per session (last 10 versions) with compare. | Older versions are viewable; deletion removes stored assets. |
| FR-STU-10 | P1 | **Night mode** renders a night variant of the angle (+1 credit) to show lights and glow. | Cost shown before confirm. |
| FR-STU-11 | P0 | **Report issue** on a result sends it to the admin queue with the images and build. | The admin can grant a refund credit manually. |
| FR-STU-12 | P0 | Studio layout is a first-class citizen in portrait phone, landscape phone, tablet, desktop and TV. | In landscape phone the item panel moves to the side; no overlap in any language. |

### 6.6 Credits (FR-CRD)

| ID | Pri | Requirement | Acceptance criteria |
|---|:--:|---|---|
| FR-CRD-01 | P0 | Credits live in an account owned by a shop or a car owner; every change is a ledger row (who, why, bucket, amount, reference). | Balance equals the sum of ledger rows; ledger is append-only. |
| FR-CRD-02 | P0 | Reserve credits atomically at job creation; the same idempotency key never charges twice. | Concurrency test: parallel requests never overdraw. |
| FR-CRD-03 | P0 | Commit on success, refund on failure or timeout (default 90 s). | Stuck jobs are swept and refunded exactly once. |
| FR-CRD-04 | P0 | Every provider failure path leads to a refund and a user-visible message. | No scenario ends with a charge and no image. |
| FR-CRD-05 | P0 | Spending order: expiring buckets first. | Unit-tested. |
| FR-CRD-06 | P0 | Identical request (photo hash + item set + mode + night flag) returns the cached result at 0 credits. | Cache hit is flagged in the ledger as `cache_hit` with amount 0. |
| FR-CRD-07 | P0 | Fair-use limits for free actions (recognition, background removal): configurable per hour/day per account. | Exceeding returns a friendly rate-limit message. |

### 6.7 Showroom mode and Tuning Passport (FR-SHW, FR-PSP)

| ID | Pri | Requirement | Acceptance criteria |
|---|:--:|---|---|
| FR-SHW-01 | P0 | A shop hands the tablet to a customer; the customer uses the studio in the shop's session without registering. | Customer cannot see settings, other sections, credits or shop admin screens (Customer View lock). |
| FR-SHW-02 | P0 | Staff exit Customer View with a PIN set by the shop. | Wrong PIN attempts are rate-limited. |
| FR-SHW-03 | P0 | Customer photos in showroom mode belong to the shop and are deleted after the retention period (default 180 days, configurable). | Verified by scheduled job test. |
| FR-PSP-01 | P1 | **Passport:** saving a build creates a unique link and QR containing: car (before/after), items, itemized prices, shop details, validity date (default 7 days). | The link needs no login to view; token is unguessable and revocable by the shop. |
| FR-PSP-02 | P1 | The passport offers "Reserve with deposit" (the same 3% flow, with the same shop). Shops can disable this. | Opening the passport after expiry shows an "expired — ask the shop" state, not the prices. |
| FR-PSP-03 | P1 | Passport pages are localized and look premium on phones. | Works in all supported locales. |

### 6.8 Marketplace (FR-MKT)

| ID | Pri | Requirement | Acceptance criteria |
|---|:--:|---|---|
| FR-MKT-01 | P0 | `b2c_user` sees items from **active, admin-verified** shops that opted into the marketplace. | Unverified or expired shops never appear. |
| FR-MKT-02 | P0 | The same Master item offered by several shops is grouped: "from $X at N shops"; the user picks the shop's offer. | Selecting an offer ties that item to that shop. |
| FR-MKT-03 | P0 | Shops are shown as **masked partners**: masked title ("Premium Partner #409"), district, rounded distance, rating (or "New"). | The API response and database view contain no name, address, phone or coordinates. |
| FR-MKT-04 | P0 | Distance is rounded to whole kilometers and requires user consent to coarse location; without consent, show city only. | Rate limits prevent repeated queries from triangulating a shop. |
| FR-MKT-05 | P1 | Ratings are given only after a booking is completed; until then the shop shows "New". | No fake or placeholder ratings anywhere. |
| FR-MKT-06 | P0 | A build can mix items from several shops for visualization. Booking splits by shop (one booking and deposit per shop). | The checkout summary lists each shop's subtotal and deposit. |
| FR-MKT-07 | P0 | A shop can pause its marketplace listing at any time. | Takes effect immediately. |

### 6.9 Booking, deposit, unlock (FR-BKG)

Money model (**OWNER**, OD-1; default below): the deposit is CarVision's **booking fee/commission collected up front and credited against the customer's total**. The shop collects the remaining amount from the customer directly. CarVision never pays out to shops, so no payout system is needed.

| ID | Pri | Requirement | Acceptance criteria |
|---|:--:|---|---|
| FR-BKG-01 | P0 | Deposit = **3% of that shop's subtotal**, calculated server-side from database prices, rounded to the minor unit, with a configurable minimum. | Client-sent amounts are ignored. |
| FR-BKG-02 | P0 | The user chooses a preferred date and time slot, sees the deposit and remaining amount, then the payment instructions (card details from `system_settings`) and uploads a receipt. | The summary shows: total, deposit (credited), remaining at the shop. |
| FR-BKG-03 | P0 | Receipt check: file validity, amount, date, recipient card match, duplicate hash. The result is stored with confidence. | A reused receipt image is rejected. |
| FR-BKG-04 | P0 | **Unlock policy** is configurable: `admin_only` (default), `ocr_trusted_users` (OCR passes and the user had a previous verified booking), `ocr_all`. | Default is `admin_only`; the admin gets an instant Telegram alert with the receipt and two buttons (Confirm / Reject). |
| FR-BKG-05 | P0 | On confirmation the user sees the shop name, address, map link, phone and a 6-digit booking code; the shop receives the booking (customer name, phone, build, preferred time, code). | Before confirmation the shop does not know the customer exists. |
| FR-BKG-06 | P0 | Rejected receipts cancel the booking and may flag the account; repeated fake receipts block the account and device. | Admin actions are audited. |
| FR-BKG-07 | P1 | The shop can **check in** a customer by booking code and mark the booking **completed**. | Completion triggers the rating invitation. |
| FR-BKG-08 | P0 | Cancellation/refund rules are configurable (default in OD-6) and refunds are recorded by the admin. | Every refund has a reason and an audit entry. |
| FR-BKG-09 | P0 | While awaiting confirmation, the user sees a clear state with the expected response time and a contact action. | The user is never left on a blank or spinning screen. |

**Booking states:** `draft → awaiting_receipt → pending_review → confirmed → checked_in → completed`, with exits to `cancelled`, `rejected`, `refunded`, `expired`.

### 6.10 Referrals (FR-REF)

| ID | Pri | Requirement | Acceptance criteria |
|---|:--:|---|---|
| FR-REF-01 | P1 | **Shop → car owner.** A car owner registering with a shop's code (or via its QR) is linked to that shop. | Link stored once; cannot be changed by the user. |
| FR-REF-02 | P1 | The referring shop earns **+8 bonus credits each time the referred user reaches 8, 16, 24, 32 and 40 successful generations** (maximum 5 rewards = 40 credits per referred user). | Counted only for succeeded, non-refunded, non-cached generations. |
| FR-REF-03 | P1 | Anti-fraud: one reward chain per device fingerprint; per-IP daily cap; a reward cycle needs at least 2 distinct item categories; shops cannot refer themselves (same owner phone/device). | Suspect links are flagged `is_fraud_suspect` and excluded. |
| FR-REF-04 | P1 | **Shop → shop.** A new shop registering with another shop's code creates a verification ticket for the admin. | The referrer gets nothing until the admin approves. |
| FR-REF-05 | P1 | On approval the referrer receives **30 extra days on the current plan and +800 bonus credits** (if on trial: `PRO_800` for 30 days). Max 6 approved rewards per shop per 12 months (configurable). | Approval is one admin tap; entirely audited. |
| FR-REF-06 | P1 | The shop dashboard shows its referral code, printable QR poster, referred users and rewards earned. | Poster is printable (A4) and localized. |

### 6.11 Device limits (FR-DEV)

| ID | Pri | Requirement | Acceptance criteria |
|---|:--:|---|---|
| FR-DEV-01 | P0 | Active devices per account are limited by plan (5.1). Logging in on an extra device signs out the **oldest** device. | The signed-out device is told why. |
| FR-DEV-02 | P0 | More than 3 evictions in 24 hours raises an admin alert. | Alert includes account and recent device hashes. |
| FR-DEV-03 | P0 | The user can view and revoke their own devices. | Revocation is immediate. |

### 6.12 Admin console (FR-ADM) — details in `10_ADMIN_AND_SECURITY.md`

| ID | Pri | Requirement | Acceptance criteria |
|---|:--:|---|---|
| FR-ADM-01 | P0 | Admin signs in with the normal login plus TOTP MFA. | Admin routes reject sessions below the required assurance level. |
| FR-ADM-02 | P0 | Search any shop or user; view plan, credits, devices, usage, inventory count, recent activity. | Result in under 1 s for 10k accounts. |
| FR-ADM-03 | P0 | **Manual billing:** assign plan, extend period, grant or deduct credits, with amount received, currency, method, note. | Section 5.7 is implemented exactly. |
| FR-ADM-04 | P0 | Suspend, unsuspend, ban account/device; with reason. | Effective immediately across sessions. |
| FR-ADM-05 | P0 | **Live generation feed:** who, which car, which build, before/after, status, provider cost, duration. | Photos viewed by the admin are logged (privacy audit). |
| FR-ADM-06 | P0 | **Finance view:** revenue (from `payments_manual`), provider cost, net profit, per-plan margin, by day/week/month. | Matches ledger totals. |
| FR-ADM-07 | P0 | **Receipt queue** and **referral verification queue** with approve/reject. | Telegram alerts on new items. |
| FR-ADM-08 | P0 | Master Catalog management: items, fitment, images, categories, vehicle taxonomy, translations. | Changes are versioned. |
| FR-ADM-09 | P0 | System settings: plans, FX display rates, thresholds, deposit percentage and minimum, card details, unlock policy, retention, fair-use limits. | Every change audited; takes effect without a deploy. |
| FR-ADM-10 | P0 | Issue reports queue with refund-credit action. | Linked to the generation. |
| FR-ADM-11 | P1 | Device-abuse and fraud dashboard. | Lists accounts by eviction count and suspect referrals. |
| FR-ADM-12 | P0 | **Pricing Guard report:** measured cost per credit vs the limits in 5.4. | Highlights any plan below target margin. |

### 6.13 Video and sharing (FR-VID) — details in `09_VIDEO_ENGINE.md`

| ID | Pri | Requirement | Acceptance criteria |
|---|:--:|---|---|
| FR-VID-01 | P1 | After a build has results for the captured angles, the user can create a short cinematic reel on the device (smooth rotation through angles, music, subtle motion). | No server cost; works offline after assets load; exportable MP4/WebM supported by the device. |
| FR-VID-02 | P1 | The last 2 seconds show the CarVision brand and the shop name (the marketplace shows a masked partner until unlock). | Branding cannot be removed on free-trial outputs. |
| FR-VID-03 | P1 | Share to Instagram/TikTok/Telegram through the system share sheet. | Falls back to download. |
| FR-VID-04 | P2 | Number plates are blurred in shared videos and images. | Detection failure blocks the public share, not the private view. |

### 6.14 Notifications (FR-NTF)

| ID | Pri | Requirement | Acceptance criteria |
|---|:--:|---|---|
| FR-NTF-01 | P0 | Admin alerts via Telegram: new receipt, referral ticket, device abuse, issue report, low credits at provider balance. | Delivered within 10 s; contain deep links to the admin item. |
| FR-NTF-02 | P0 | In-app notifications for users: plan changes, bonus credits, booking status. | Shown as unobtrusive banners and a notification list. |
| FR-NTF-03 | P2 | Web push for booking updates and new compatible parts ("My Garage" alerts). | Opt-in only. |

---

## 7. Rule tables

### 7.1 Standard angles

| ID | Code | Azimuth | Main visible items |
|---:|---|---|---|
| 1 | `FRONT_CENTER` | 0° | Front bumper, grille, headlights, hood |
| 2 | `FRONT_LEFT_45` | 45° | Front bumper, headlight, left wheels, side skirt |
| 3 | `LEFT_SIDE_90` | 90° | Wheels, tires, side skirts, side windows |
| 4 | `REAR_LEFT_45` | 135° | Rear bumper, taillights, spoiler, left wheels |
| 5 | `REAR_CENTER` | 180° | Rear bumper, diffuser, taillights, spoiler |
| 6 | `REAR_RIGHT_45` | 225° | Rear bumper, taillights, spoiler, right wheels |
| 7 | `RIGHT_SIDE_90` | 270° | Wheels, tires, side skirts, side windows |
| 8 | `FRONT_RIGHT_45` | 315° | Front bumper, headlight, right wheels, hood |

Tolerances, camera pitch and guidance math are in `08_SMART_CAMERA.md`.

### 7.2 Category → valid angles (single source of truth)

| Category | Valid angles |
|---|---|
| Front bumper, grille, headlights, hood | 1, 2, 8 |
| Wheels, tires, side skirts | 2, 3, 4, 6, 7, 8 |
| Window tint | 2, 3, 4, 6, 7, 8 |
| Rear bumper, taillights, spoiler, diffuser | 4, 5, 6 |
| Body color/wrap, polish/ceramic | 1–8 |

Resolution order when the user selects an item (FR-STU-05): (1) current angle valid → use it; (2) another captured angle valid → switch to it; (3) none → prompt to capture the first valid angle.

### 7.3 Generation states
`queued → running → succeeded | failed | timed_out | cancelled`. Only `succeeded` commits credits. All other terminal states refund.

### 7.4 Plan states
`TRIAL → ACTIVE → EXPIRED`, `ACTIVE → ACTIVE` (renewal by admin), any state `→ SUSPENDED` (admin). `SUSPENDED` blocks generation and marketplace listing but preserves data.

---

## 8. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | First preview ≤ 4 s typical, p95 ≤ 8 s; item selection and price update ≤ 100 ms |
| Reliability | Generation success rate ≥ 98% after retry; zero double charges; zero orphan charges |
| Availability | ≥ 99.5% monthly for the app (managed hosting) |
| Security | RLS on everything, defense in depth, admin MFA, audit logs (see `04`, `10`) |
| Privacy | Customer photos are personal data: private storage, retention limits, deletion on request |
| Accessibility | WCAG AA contrast on the dark theme, keyboard and screen-reader support |
| Responsiveness | No clipped or overlapping UI at any supported size, orientation or language |
| Localization | Every string translatable; RTL for Arabic; currency display for USD, UZS, AED, KGS, TRY |
| Offline/weak network | Clear states for slow and lost connections; uploads resume |

---

## 9. Data retention and privacy

| Data | Default retention |
|---|---|
| Showroom customer photos and results | 180 days, then deleted (shop may delete earlier) |
| Car-owner photos and results | Until the user deletes them or the account |
| Receipts | 12 months after booking completion, then deleted |
| Passport links | Valid 7 days (configurable), revocable |
| Ledgers and audit logs | Kept (financial and security records) |

Users can request account deletion; personal data is removed, financial records are anonymized. Terms and privacy texts are required in all launch languages before public launch. Handling customers' deposit money may carry local licensing and tax obligations; the product owner should confirm requirements with a local accountant/lawyer (**OWNER**).

---

## 10. Success metrics

| Metric | Target for the first 90 days |
|---|---|
| Shop activation (first generation within 24 h of sign-up) | ≥ 60% |
| Generations per active shop per week | ≥ 40 |
| Trial → paid conversion | ≥ 25% |
| Measured provider cost per credit | within Pricing Guard limits |
| Generation failure rate | ≤ 2% |
| Marketplace visit → booking deposit | tracked from day one |
| Shop referral conversions | tracked from day one |

---

## 11. Changes from the earlier drafts (so nothing is a surprise)

1. Admin 2FA uses TOTP, Telegram is for alerts only.
2. Night mode is available on all plans at +1 credit (was gated).
3. Car-owner device limit is 2 (was 1).
4. Referral reward rules are made precise: rewards at 8/16/24/32/40 generations, counted only on successful, non-cached ones.
5. Deposit money model is defined (commission credited against the bill) because the earlier text left it ambiguous.
6. The marketplace lists only admin-verified shops; ratings appear only after real completed bookings.
7. Credits have buckets and expiry rules; auto-recharge is removed (no payment system).
8. Cached identical renders are free; failed renders always refund.
9. Money is integer minor units; amounts in UI are display only.
10. Vehicle recognition uses a vision API call, not self-hosted detection models.

---

## 12. Open decisions and assumptions (defaults apply until the owner decides)

| ID | Decision | Default used now | Who |
|---|---|---|---|
| OD-1 | Deposit money model | Commission credited against the bill; shop collects the rest | **OWNER** |
| OD-2 | What a car owner can do after the 40 free credits | Request more credits from admin; shops sponsor credits through referral rewards; paid packs for owners later | **OWNER** |
| OD-3 | Receipt unlock policy (`ADR-006`) | `admin_only` | **OWNER** |
| OD-4 | Credit expiry | Plan credits expire at period end; bonus credits 12 months | **OWNER** |
| OD-5 | Passport/quote validity | 7 days | **OWNER** |
| OD-6 | Deposit cancellation and refund | Full refund if the shop cancels or does not respond within 48 h of confirmation; non-refundable if the customer cancels within 24 h of the appointment; otherwise refundable | **OWNER** |
| OD-7 | AI pipeline and real cost per credit | Decided by the spike (`07_AI_PIPELINE.md`), gated by the Pricing Guard | Engineering + **OWNER** |
| OD-8 | Car-owner device limit | 2 | **OWNER** |
| OD-9 | Vehicle brands in the initial Master Catalog per market | Defined in `14_CATALOG_AND_LAUNCH.md` from real customer data | **OWNER** |

---

## 13. Traceability rules

- Pull requests list the requirement IDs they implement.
- Each P0 requirement has at least one automated test (unit, SQL, or E2E) named with its ID.
- Build prompts in `15_ANTIGRAVITY_BUILD_PROMPTS.md` cite requirement IDs as their acceptance criteria.
- A requirement is changed only by editing this file first.
