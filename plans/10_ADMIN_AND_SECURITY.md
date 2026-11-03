# 10_ADMIN_AND_SECURITY.md

**Project:** CarVision — AI car tuning & detailing visualizer with a parts marketplace  
**Document type:** Super Admin "God Mode" Console, Manual Multi-Currency Billing, Anti-Leakage Voucher Verification, TOTP MFA & Anti-Sharing  
**Version:** 2.0.0 (Deep Production Specification)  
**Status:** Normative. All administrative endpoints, financial mutations, and security guards must implement this document.  
**Read together with:** `01_PRD_BUSINESS_LOGIC.md` (FR-ADM, FR-DEV, FR-BKG), `04_ARCHITECTURE.md` (sections 7, 16), `06_DATABASE_AND_RLS.md`.

---

## 1. PURPOSE AND ZERO-TRUST SECURITY ARCHITECTURE

The Super Admin Console (`/admin/*`) is the central financial and operational nerve center of CarVision. Because the platform intentionally avoids third-party automated recurring payment gateway lock-in in v1, the Admin Console provides **absolute, sovereign control** over subscriptions, image credit allotments, banking receipts, live generations, and profit auditing with an immutable audit trail.

### 1.1 Non-Negotiable Security Principles
1. **Zero-Trust Role Enforcement:** Role verification (`profiles.role === 'super_admin'`) occurs strictly at the database (PostgreSQL RLS) and Next.js server runtime (`src/server/http/auth-guards.ts`). No client-side role checks are ever trusted.
2. **Mandatory TOTP MFA (`aal2`):** Administrative accounts MUST enforce Supabase TOTP Two-Factor Authentication. Session tokens below authentication assurance level `aal2` receive an immediate `HTTP 403 Forbidden` on all `/admin` routes.
3. **No Code Leakage:** Non-admin bundles never receive a single byte of administrative components, schemas, or actions (enforced via Next.js route groups and server-only modules).
4. **Immutable Append-Only Audit:** Every administrative mutation writes to `admin_audit_log` (`admin_id`, `action_type`, `target_id`, `before_payload`, `after_payload`, `ip_address`). Audit logs can never be updated or deleted.
5. **Telegram for Alerts Only:** Telegram is strictly an egress notification channel for incoming alerts (new receipt, fraud spike, low provider balance). It is **never** used as an authentication factor.

---

## 2. ADMINISTRATIVE ACCESS FLOW & MFA HARDENING

```
┌────────────────────────────────────────────────────────┐
│ 1. Unified Login Form (`/login`)                       │
│    - Submits: email/phone + password                   │
└──────────────────────────┬─────────────────────────────┘
                           │ Valid credentials
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. Server Auth Guard (`requireUserSession`)            │
│    - Resolves `profiles.role`                         │
│    - IF `role === 'super_admin'`                       │
│      -> Inspects JWT `amr` (Auth Method Reference)     │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             │ aal1 (Password only)      │ aal2 (Password + TOTP)
             ▼                           ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│ Prompt Inline TOTP Modal │  │ Redirect to Admin Hub    │
│ (Google Authenticator)   │  │ `/[locale]/admin/overview│
│ Max 5 tries / 15m lockout│  └──────────────────────────┘
└──────────────────────────┘
```

---

## 3. MANUAL MULTI-CURRENCY BILLING HUB (`M-30`)

In v1, workshops pay CarVision directly via local banking channels:
* **Uzbekistan:** Card transfer via Payme / Click / Uzcard in `UZS`.
* **UAE (Dubai):** Bank transfer or card in `AED`.
* **International / Turkey / CIS:** Cash or wire transfer in `USD` or `TRY`.

### 3.1 Multi-Currency Normalization Formula
The database stores all manual payments in **USD cents** (`amount_cents`). When the admin records a payment in local currency, the system normalizes the value against the active exchange rate in `system_settings`:

$$\text{amount\_cents} = \text{ROUND}\left( \frac{\text{input\_amount\_local}}{\text{fx\_rate\_to\_usd}} \times 100 \right)$$

*Example (Uzbekistan):* Workshop pays `1,270,000 UZS` for `MAX_4000` plan ($99).  
Active rate: `12,850 UZS / 1 USD`.  
$$\text{amount\_cents} = \text{ROUND}\left( \frac{1,270,000}{12,850} \times 100 \right) = 9,883\text{ cents (\$98.83)}$$

### 3.2 Plan Activation & Credit Grant Workflow
1. Admin opens **Manual Billing Modal (`M-30`)**:
   - **Target Shop / User:** Search by name, phone, or referral code.
   - **Action Type:** `ACTIVATE_PLAN` | `ADD_CREDITS` | `DEDUCT_CREDITS` | `EXTEND_DURATION`.
   - **Plan Code:** `PRO_800` | `MAX_4000` | `ULTRA_10000` | `CUSTOM`.
   - **Local Currency Received:** Amount, Currency (`UZS`, `AED`, `USD`, `TRY`), Payment Method (`CARD_TRANSFER`, `CASH`, `BANK_WIRE`).
   - **Mandatory Audit Note:** e.g., *"Confirmed Payme screenshot ref #881249 from owner Jamshid"*.
2. **Atomic Transaction:**
   - Updates `shops.current_plan_code`.
   - Increments `shops.credits_balance = shops.credits_balance + delta_credits`.
   - Sets `shops.plan_expires_at = NOW() + INTERVAL '30 days'`.
   - Inserts row into `payments_manual` with both local and normalized USD values.
   - Writes immutable entry to `credit_ledger` with reason `'PLAN_PURCHASE'` or `'MANUAL_ADMIN_GRANT'`.
   - Writes immutable record to `admin_audit_log`.
3. **Realtime Broadcast:** Workshop tablet instantly receives a WebSocket push event, updating the credit meter from `0` to `4,000` with celebratory confetti.

---

## 4. ANTI-LEAKAGE BOOKING ESCROW & QR VOUCHER VERIFICATION

To prevent tuning shops and customers from bypassing CarVision once the address is revealed:

```
[B2C CUSTOMER]                                        [TUNING WORKSHOP]
      │                                                      │
      ├─ 1. Pays 3% deposit ($36)                            │
      ├─ 2. AI OCR verifies receipt                          │
      ├─ 3. Receives QR Voucher + 6-digit Booking Code       │
      │                                                      │
      │   Customer arrives at workshop                       │
      │   Presents QR Voucher to shop staff                  │
      └─────────────────────────────────────────────────────▶│
                                                             │
                                                             ├─ 4. Staff enters code into `S-SEL-08`
                                                             ├─ 5. CarVision checks booking validity
                                                             ├─ 6. Deducts 3% deposit from total bill
                                                             │     Customer pays remaining 97% ($1,164)
                                                             └─ 7. Marks booking `COMPLETED`
```

### 4.1 Shop Enforcement Incentive
Why does the workshop enter the booking code?
- If the workshop honors the booking through CarVision, they keep the customer's 3% deposit credited toward the job.
- Completing verified bookings increases the workshop's **Marketplace Trust Score & Search Rank** (`rating_count`, `completed_builds_count`).
- If a shop repeatedly accepts customers but cancels bookings in CarVision (*"Customer never showed up"*), the platform detects fraud via customer survey feedback and **suspends the shop's account**.

---

## 5. FINANCIAL LEDGER & REAL-TIME NET PROFIT AUDITING

The finance console (`S-ADM-08`) calculates true business profitability in real time:

$$\text{Net Profit} = \sum \text{Manual Payments (USD)} - \sum \text{Actual Fal.ai Provider Costs (USD)}$$

```sql
-- View: Real-Time Financial Aggregation (Integer Cents)
CREATE OR REPLACE VIEW admin_profit_ledger AS
SELECT
    date_trunc('day', p.created_at) AS report_date,
    SUM(p.amount_cents) AS gross_revenue_cents,
    COALESCE(ai.total_ai_cost_cents, 0) AS total_ai_cost_cents,
    (SUM(p.amount_cents) - COALESCE(ai.total_ai_cost_cents, 0)) AS net_profit_cents,
    CASE 
        WHEN SUM(p.amount_cents) > 0 
        THEN ROUND(((SUM(p.amount_cents) - COALESCE(ai.total_ai_cost_cents, 0))::NUMERIC / SUM(p.amount_cents)) * 100, 2)
        ELSE 0 
    END AS net_margin_percent
FROM payments_manual p
LEFT JOIN (
    SELECT 
        date_trunc('day', created_at) AS ai_date,
        SUM(actual_fal_cost_cents) AS total_ai_cost_cents
    FROM generations
    WHERE status = 'SUCCESS'
    GROUP BY 1
) ai ON ai.ai_date = date_trunc('day', p.created_at)
GROUP BY 1, ai.total_ai_cost_cents
ORDER BY 1 DESC;
```

---

## 6. 24/7 AUTONOMOUS RECEIPT VERIFICATION & FRAUD SUSPENSION

When a customer uploads a deposit receipt screenshot (`S-MKT-05`):
1. **Under `AUTO_OCR` mode (Default):**
   - Vision OCR checks: (a) valid banking layout, (b) current date/time, (c) amount matches deposit $\pm 3\%$, (d) recipient card matches `system_settings.payment_card_last4`.
   - If `confidence >= 0.85`, booking unlocks immediately.
   - Telegram bot alert is sent to the admin for background monitoring.
2. **If OCR Confidence < 0.85 or Amount Mismatch:**
   - Booking transitions to `PENDING_ADMIN_APPROVAL`.
   - Pushed to Admin Review Queue (`S-ADM-06`).
   - Admin presses `A` to Approve or `R` to Reject with reason modal (`M-32`).
3. **Fraud Suspension Trigger:**
   - If an image is flagged as a Photoshop forgery, clicking **"Ban Fraudulent User"**:
     1. Revokes user session tokens immediately.
     2. Sets `profiles.is_banned = true` and `is_fraud_suspect = true`.
     3. Adds device fingerprint to `blacklisted_devices`.

---

## 7. ANTI-ACCOUNT SHARING & SESSION EVICTION POLICY

To ensure a large workshop cannot purchase a single $99 plan and share credentials across 15 unmetered devices:

### 7.1 Plan Device Quotas
* `FREE_TRIAL`: Max 1 active device.
* `PRO_800`: Max 2 active devices.
* `MAX_4000`: Max 4 active devices.
* `ULTRA_10000`: Max 8 active devices.
* `b2c_user`: Max 2 active devices.

### 7.2 Eviction Algorithm
When device $N+1$ authenticates:
- The system identifies the oldest active session by `last_login_at`.
- Sets `active_devices.is_evicted = true`.
- Emits a WebSocket event to that specific device: `SESSION_EVICTED_DEVICE_LIMIT`.
- The evicted device displays screen `S-SYS-04`: *"Your account was signed in on another device."*
- If an account triggers **more than 3 evictions within 24 hours**, `S-ADM-11` (Security Alerts) raises an amber warning: *"Suspected account sharing"*.
