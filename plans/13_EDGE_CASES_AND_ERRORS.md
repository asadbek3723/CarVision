# 13_EDGE_CASES_AND_ERRORS.md

**Project:** CarVision — AI car tuning & detailing visualizer with a parts marketplace  
**Document type:** Failure Modes, Edge Cases Matrix, Circuit Breakers, Fraud Mitigations & Self-Healing Workflows  
**Version:** 2.0.0 (Production Specification)  
**Status:** Normative. Every unexpected state, hardware failure, network outage, or malicious action must be handled as specified herein.  
**Read together with:** `01_PRD_BUSINESS_LOGIC.md`, `04_ARCHITECTURE.md`, `05_CODING_STANDARDS.md`, `06_DATABASE_AND_RLS.md`, `07_AI_PIPELINE.md`.

---

## 1. RESILIENCE PHILOSOPHY: ZERO SILENT FAILURES, ZERO LOSS OF USER MONEY

In automotive repair boxes, noisy workshops, and intermittent cellular conditions, failures are guaranteed. CarVision adheres to five non-negotiable resilience commandments:
1. **Never swallow an error:** Every failure records structured logs, provides clear user-facing guidance, and never leaves the screen frozen in an infinite spinner.
2. **Never steal user credits:** Any failure in the AI pipeline, network timeout, or render error triggers an atomic, idempotent database credit rollback (`rollback_credits`).
3. **No technical jargon:** Users never see raw exceptions, SQL errors, or provider names (e.g., *"Fal.ai 504 Gateway Timeout"* is strictly forbidden). The UI states what happened and what the next action is in clear, translated human terms.
4. **Resilient against bad actors:** Defends against Photoshop receipts, account credential sharing, bot spamming, and location spoofing at the database and edge layer.
5. **Fail-soft client degradation:** If advanced features (gyroscope, WebGL, WebCodecs) fail, the UI degrades gracefully to accessible fallbacks (manual shutter, 2D SVG overlay, MediaRecorder).

---

## 2. THE MASTER 25 FAILURE MODES & RECOVERY MATRIX

| ID | Failure Scenario | Technical Trigger | Algorithmic Mitigation & System Reaction | User-Facing Experience |
|---|---|---|---|---|
| **EC-01** | **Camera permission denied** | User clicks "Block" or system policy restricts camera access. | `navigator.mediaDevices.getUserMedia` throws `NotAllowedError`. System displays interactive 2-step instructional modal. | Interactive guide shows how to unblock in browser settings + **"Upload from Gallery"** fallback button. |
| **EC-02** | **WebGL context lost during 3D wireframe render** | Heavy memory pressure on older tablet or GPU crash. | `canvas.addEventListener('webglcontextlost')` fires. System immediately dismounts `@react-three/fiber` canvas. | Gracefully swaps to a lightweight SVG 2D wireframe overlay without reloading the page or losing current angle progress. |
| **EC-03** | **Device gyroscope unavailable or uncalibrated** | Budget Android tablet without gyro or user denied sensor permission. | `DeviceOrientationEvent` returns null alpha/beta/gamma or event never fires within 500ms. | Gyroscope alignment guides hide; 3D wireframe remains static; a prominent 72px manual shutter button becomes primary. |
| **EC-04** | **Camera stream freeze on iOS tab backgrounding** | User switches apps while camera is active; iOS Safari pauses `MediaStreamTrack`. | `document.addEventListener('visibilitychange')` detects `visible`. Inspects `stream.getVideoTracks()[0].readyState`. | If muted/ended, restarts camera pipeline automatically in 300ms without user having to refresh. |
| **EC-05** | **Dirty lens / extreme low lighting** | Photo taken in dim garage bay or with greasy phone lens. | Client-side Canvas Luma evaluation: `avgLuma < 24` OR Laplacian variance $< 40$. | Soft warning banner: *"Lighting is dim or lens is smudged. For best 4K render quality, please clean lens or turn on bay lights."* (User can proceed or retake). |
| **EC-06** | **Captured image is not an automobile** | User captures shop floor, wall, pet, or human face. | Vision LLM returns `is_valid_vehicle = false` (`confidence < 0.30`). | Shutter vibrates (haptic error); session prompts: *"No car recognized. Please frame the vehicle inside the wireframe."* **(0 credits deducted)**. |
| **EC-07** | **Heavy aftermarket body kit confuses Vision Model** | Custom bumper makes a Chevrolet Gentra look like a Lacetti/Cobalt. | Vision LLM returns low confidence (`< 0.65`) or user clicks `[Edit Vehicle ✎]`. | Modal `M-04` opens: User selects Make $\to$ Model $\to$ Generation in 2 taps. Catalog immediately re-filters to correct fitment. |
| **EC-08** | **Network drops during 8-angle walkaround shoot** | Workshop metal structure blocks 4G cellular signal. | Pre-signed upload fetch fails. Raw WebP binary is written to IndexedDB `carvision_offline_queue`. | Status bar displays amber badge: *"Offline: Photos saved locally. Syncing when connection returns."* Zero photos lost. |
| **EC-09** | **User closes browser tab during AI generation** | Customer or technician accidentally swipes app away. | Render continues on Fal.ai asynchronous queue. Database record remains `QUEUED` / `PROCESSING`. | Upon reopening app, session state rehydrates from Supabase Realtime channel; rendered 4K image displays immediately. |
| **EC-10** | **Fal.ai generation timeout (> 90 seconds)** | External AI provider queue spike or regional network outage. | The Sweeper Cron job detects `status = 'QUEUED'` older than 90s. Executes `rollback_credits(user_id, shop_id, 1, gen_id)`. | Toast: *"AI server experienced a temporary delay. Your 1 credit was fully refunded."* Prompts `[Retry Render]` button. |
| **EC-11** | **Fal.ai inpainting returns HTTP 500 / Model Crash** | Incompatible resolution or unhandled model exception. | Webhook receives `status = 'FAILED'`. Server triggers `rollback_credits()` and logs error payload to Sentry. | Toast: *"Unable to fit this accessory on the current angle. Credit refunded. Try rendering from a 3/4 angle."* |
| **EC-12** | **High-concurrency generation race condition** | Two tablets on a 1-credit balance tap "Generate" at the exact same millisecond. | PostgreSQL RPC `reserve_credits()` locks profile row with `FOR UPDATE`. First request succeeds; second fails. | Tablet 1 begins rendering; Tablet 2 receives HTTP 402 with Modal `M-06` (*"Insufficient credits — Upgrade plan"*). Balances never go negative. |
| **EC-13** | **Shop attempts referral self-dealing fraud** | Technician registers fake accounts with their own referral code to harvest credits. | Layer 1: WebGL/Canvas device fingerprint comparison. Layer 2: IP rate limiter (> 3 signups/day from same subnet). | Account creates successfully, but `profiles.is_fraud_suspect = true`. Referral credit bonus is withheld and flagged for Admin. |
| **EC-14** | **Plan device limit exceeded (Account sharing)** | Max Plan shop (limit: 4 tablets) logs in on a 5th personal phone. | `active_devices` count reaches 5. Oldest session record is updated with `is_evicted = true`. | On the oldest tablet, next heartbeat receives HTTP 403: *"Account active on another device. Session ended."* (Screen `S-SYS-04`). |
| **EC-15** | **Fraudulent / Photoshop deposit receipt submitted** | B2C user uploads an edited or fake banking screenshot to unlock shop contacts. | AI Vision OCR inspects recipient card PAN, payment date, and transaction sum. If mismatch or low confidence (< 0.85): | Booking shifts to `PENDING_ADMIN_APPROVAL`. Admin receives Telegram alert. If verified fake, Admin clicks `[Ban User]`. |
| **EC-16** | **Duplicate payment receipt submitted** | User re-submits a screenshot from a previous transaction. | System computes SHA-256 hash of the uploaded image. Database table `bookings` enforces `UNIQUE(receipt_image_hash)`. | Form validation error: *"This receipt has already been submitted for another booking. Please upload a valid payment proof."* |
| **EC-17** | **Late night 3% deposit payment (23:00 / Weekend)** | Customer pays deposit while admin is asleep. | `system_settings.unlock_mode = 'AUTO_OCR'`. Vision model confirms recipient card and sum in 2.2 seconds. | Instant unlock (0 wait): Full workshop name, phone, address, and 6-digit redemption QR code display on screen immediately. |
| **EC-18** | **Workshop rejects or cancels customer appointment** | Workshop runs out of physical shop capacity or parts supply. | Workshop clicks `[Cancel Booking]` in `S-SEL-08` with a mandatory reason. | Booking status shifts to `CANCELLED_BY_SHOP`. System records a 100% refund of the 3% escrow deposit to customer's account. |
| **EC-19** | **Customer No-Show at appointment time** | Customer does not show up within 24 hours of scheduled slot. | Workshop clicks `[Mark No-Show]` in `S-SEL-08`. | Status shifts to `NO_SHOW`. The 3% deposit is forfeited by customer to cover workshop reservation slot and visualizer usage. |
| **EC-20** | **Inventory part deleted while customer has it in cart** | Workshop sells the last set of wheels and toggles item inactive. | Studio revalidation checks `shop_inventory.is_active` prior to generation or booking checkout. | Cart displays warning banner: *"Vossen HF-5 is currently out of stock. Removed from total."* Prompts selection of alternative. |
| **EC-21** | **Tuning Passport public link expired** | Customer opens a shared quote link 30 days after creation. | Server evaluates `passports.expires_at < NOW()`. | Screen renders formatted notice: *"This Tuning Passport has expired. Contact the workshop to receive an updated quote."* |
| **EC-22** | **Video export low-memory / thermal throttle on mobile** | User exports 60 FPS 9:16 video reel on an overheating phone. | `VideoEncoder.encode()` throws `QuotaExceededError` or frame drop rate $> 40\%$. | Video engine automatically falls back to 30 FPS 720p sequential Canvas pipeline, ensuring successful export without crashing. |
| **EC-23** | **OS Accessibility 200% large font scaling** | User has high-contrast large typography enabled on OS level. | All UI containers adhere to `min-w-0`, `flex-wrap`, and `clamp()` viewport units. | Buttons expand vertically; labels wrap cleanly onto two lines; no text is ever clipped, truncated mid-word, or hidden behind HUD. |
| **EC-24** | **Booking QR Voucher double-redemption attempt** | Dishonest customer attempts to reuse the 6-digit code at multiple branches. | Database RPC `redeem_booking_voucher()` executes atomic check `status = 'UNLOCKED'` and transitions to `REDEEMED`. | Technician console displays: *"Voucher already redeemed on 2026-10-16 14:22 at Central Branch."* Prevents double discount. |
| **EC-25** | **Supabase database connection pool saturation** | Sudden viral traffic spike pushes Postgres connections past 90%. | Edge API switches non-critical reads to `stale-while-revalidate` cached edge responses. | High-priority transactions (`reserve_credits`, `bookings`) are prioritized; studio browsing remains fast and responsive. |

---

## 3. CIRCUIT BREAKER ARCHITECTURE FOR EXTERNAL AI PROVIDER

When communicating with Fal.ai, CarVision employs an in-memory / edge-cached **Circuit Breaker** to prevent cascading failures, conserve user credits, and maintain platform stability:

```
                  ┌────────────────────────────────────────┐
                  │                 CLOSED                 │
                  │   All generation requests pass through │
                  └───────────────────┬────────────────────┘
                                      │ 5 consecutive failures
                                      │ or > 50% error rate in 60s
                                      ▼
                  ┌────────────────────────────────────────┐
                  │                  OPEN                  │
                  │   Fail fast immediately (0 credits)    │
                  │   Show friendly maintenance notice     │
                  └───────────────────┬────────────────────┘
                                      │ Reset timeout expires (45s)
                                      ▼
                  ┌────────────────────────────────────────┐
                  │               HALF-OPEN                │
                  │   Allow 1 canary probe generation      │
                  └─────────┬────────────────────┬─────────┘
                            │ Probe succeeds     │ Probe fails
                            ▼                    ▼
                        [ CLOSED ]           [ OPEN ]
```

### 3.1 Circuit Breaker Implementation Contract
```typescript
// src/server/providers/ai/circuit-breaker.ts
export interface CircuitBreakerConfig {
  failureThreshold: number; // 5 consecutive failures
  samplingWindowMs: number; // 60,000 ms
  cooldownPeriodMs: number; // 45,000 ms
}

export class FalCircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private consecutiveFailures = 0;
  private lastFailureTime = 0;

  public canExecute(): boolean {
    const now = Date.now();
    if (this.state === 'OPEN') {
      if (now - this.lastFailureTime > 45000) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    return true;
  }

  public recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
  }

  public recordFailure(): void {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    if (this.consecutiveFailures >= 5) {
      this.state = 'OPEN';
      // Trigger emergency Telegram alert to Super Admin
      this.notifySuperAdmin();
    }
  }

  private notifySuperAdmin(): void {
    // Sends P0 Critical Incident notification via Telegram Bot API
  }
}
```

---

## 4. FRAUD MITIGATION & RECEIPT HASHING ENGINE

To guarantee that B2C marketplace users cannot circumvent the 3% escrow deposit:
1. **Perceptual + Cryptographic Hashing:**
   - Every uploaded receipt screenshot undergoes client-side SHA-256 calculation prior to upload.
   - The hash is verified server-side against the `bookings.receipt_image_hash` index.
2. **Autonomous AI Receipt OCR Inspection:**
   - Vision LLM inspects four mandatory fields:
     1. Recipient Card PAN (Must match `system_settings.escrow_card_pan`).
     2. Transfer Amount (Must equal or exceed `deposit_amount_cents`).
     3. Timestamp (Must be within 45 minutes of booking creation).
     4. Transaction Status (Must state "Muvaffaqiyatli" / "Success" / "Оплачено").
   - If confidence $\ge 0.85$, booking status transitions immediately to `UNLOCKED`.
   - If confidence $< 0.85$, booking transitions to `PENDING_ADMIN_APPROVAL` with immediate Telegram push notification to the Super Admin.
