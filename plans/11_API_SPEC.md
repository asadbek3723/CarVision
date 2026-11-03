# 11_API_SPEC.md

**Project:** CarVision — AI car tuning & detailing visualizer with a parts marketplace  
**Document type:** REST API Endpoints Specification, Zod Schemas, Response Envelopes & Webhook Contracts  
**Version:** 2.0.0 (Production Specification)  
**Status:** Normative. All Next.js route handlers (`src/app/api/v1/**`) must adhere strictly to these schemas and contracts.  
**Read together with:** `01_PRD_BUSINESS_LOGIC.md`, `04_ARCHITECTURE.md`, `06_DATABASE_AND_RLS.md`, `07_AI_PIPELINE.md`, `10_ADMIN_AND_SECURITY.md`.

---

## 1. API ARCHITECTURE & PROTOCOL CONVENTIONS

### 1.1 Base URL & Content Negotiation
- **Base Path:** `/api/v1`
- **Content-Type:** `application/json; charset=utf-8`
- **Binary/Media Uploads:** Client requests pre-signed upload URLs via `POST /api/v1/storage/upload-url` and uploads directly to Supabase Storage. Large raw images or video binaries **never** stream through Next.js serverless functions.
- **Timestamps:** ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- **Monetary Units:** Strictly non-negative integers in minor units (e.g., USD cents: `$29.00` $\to$ `2900`). Floating-point currency values are strictly prohibited.
- **Idempotency:** All state-mutating requests (`POST`, `PUT`, `DELETE`) affecting credits, sessions, and payments must include an `X-Idempotency-Key: <UUIDv4>` header.

### 1.2 Unified Response Envelope
Every endpoint returns a discriminated JSON envelope matching the following TypeScript definitions:

```typescript
// Successful Response Envelope
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    pagination?: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
    };
  };
}

// Error Response Envelope
export type AppErrorCode =
  // Auth & Permissions
  | 'AUTH_UNAUTHORIZED'
  | 'AUTH_FORBIDDEN'
  | 'AUTH_SESSION_EVICTED'
  | 'AUTH_MFA_REQUIRED'
  | 'AUTH_ACCOUNT_BANNED'
  // Validation & Input
  | 'VALIDATION_FAILED'
  | 'RESOURCE_NOT_FOUND'
  | 'CONFLICT_DUPLICATE_KEY'
  // Credits & Money
  | 'CREDITS_INSUFFICIENT'
  | 'CREDITS_LOCK_FAILED'
  | 'DEPOSIT_AMOUNT_INVALID'
  | 'PAYMENT_RECEIPT_DUPLICATE'
  // AI & Generation Pipeline
  | 'ANGLE_INCOMPATIBLE'
  | 'VEHICLE_NOT_DETECTED'
  | 'IMAGE_QUALITY_DEGRADED'
  | 'AI_PROVIDER_TIMEOUT'
  | 'AI_PROVIDER_FAILED'
  | 'CIRCUIT_BREAKER_OPEN'
  // Marketplace & Sessions
  | 'SESSION_CLOSED'
  | 'PART_OUT_OF_STOCK'
  | 'VOUCHER_ALREADY_REDEEMED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_SERVER_ERROR';

export interface ApiErrorResponse {
  success: false;
  error: {
    code: AppErrorCode;
    messageKey: string; // Translation key for user-facing UI
    details?: Record<string, unknown>;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}
```

---

## 2. STORAGE & PRE-SIGNED UPLOADS

### 2.1 POST `/api/v1/storage/upload-url`
Issues a signed upload URL directly to Supabase Storage, enforcing file type, size, and destination bucket isolation.

* **Authentication:** Required (`b2c_user` or `b2b_seller`).
* **Zod Request Schema:**
```typescript
export const createUploadUrlSchema = z.object({
  bucket: z.enum(['originals', 'receipts', 'custom-parts']),
  fileName: z.string().min(3).max(120),
  contentType: z.enum(['image/webp', 'image/jpeg', 'image/png']),
  fileSizeBytes: z.number().int().min(1024).max(15 * 1024 * 1024), // Max 15MB
  sha256Hash: z.string().length(64).optional() // Required for receipts to prevent duplicates
}).strict();
```

* **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://xyz.supabase.co/storage/v1/upload/sign/originals/session-123/angle-1.webp?token=ey...",
    "storagePath": "originals/session-123/angle-1.webp",
    "publicUrl": "https://xyz.supabase.co/storage/v1/object/public/originals/session-123/angle-1.webp",
    "expiresInSeconds": 300
  },
  "meta": {
    "requestId": "req_88f912ab",
    "timestamp": "2026-10-16T18:30:00.000Z"
  }
}
```

---

## 3. AUTHENTICATION, DEVICES & SESSION HYGIENE

### 3.1 POST `/api/v1/auth/register`
Creates a profile and validates referral bonus eligibility.

* **Zod Request Schema:**
```typescript
export const registerUserSchema = z.object({
  role: z.enum(['b2c_user', 'b2b_seller']),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Invalid E.164 phone number'),
  email: z.string().email().optional(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(100),
  preferredLocale: z.enum(['uz', 'en', 'ru', 'ar', 'kk', 'ky', 'tg']),
  deviceFingerprint: z.string().min(16).max(128),
  referralCode: z.string().max(32).optional(),
  shopDetails: z.object({
    shopName: z.string().min(2).max(150),
    city: z.string().min(2).max(100),
    district: z.string().min(2).max(100),
    exactAddress: z.string().min(5).max(250),
    geoLat: z.number().min(-90).max(90),
    geoLng: z.number().min(-180).max(180)
  }).optional()
}).refine(data => {
  if (data.role === 'b2b_seller') return !!data.shopDetails;
  return true;
}, { message: "shopDetails are mandatory for b2b_seller registration", path: ["shopDetails"] });
```

* **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "userId": "d3b07384-d113-4c54-9493-27e1b5f6338b",
    "role": "b2b_seller",
    "creditsBalance": 40,
    "referralCode": "CV-TUNING-8412",
    "shopId": "c41829e0-8b1b-4ec9-8974-9b247fcf1e29"
  },
  "meta": { "requestId": "req_01a", "timestamp": "2026-10-16T18:30:00.000Z" }
}
```

### 3.2 POST `/api/v1/auth/device-session`
Heartbeat sent every 60 seconds and on app wake. Enforces device plan quotas (Free: 1, Pro: 2, Max: 4, Ultra: 8).

* **Zod Request Schema:**
```typescript
export const deviceHeartbeatSchema = z.object({
  deviceFingerprint: z.string().min(16).max(128),
  deviceLabel: z.string().min(2).max(64), // e.g., "iPad Pro 11-inch (Front Desk)"
  platform: z.enum(['ios', 'android', 'desktop_safari', 'desktop_chrome', 'other'])
}).strict();
```

* **Response (200 OK - Active):**
```json
{
  "success": true,
  "data": {
    "isSessionActive": true,
    "allowedDevices": 4,
    "currentActiveDevices": 2
  },
  "meta": { "requestId": "req_01b", "timestamp": "2026-10-16T18:30:00.000Z" }
}
```

* **Response (403 Forbidden - Evicted):**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_SESSION_EVICTED",
    "messageKey": "errors.auth.evicted_by_new_device",
    "details": {
      "evictedAt": "2026-10-16T18:29:45.000Z",
      "newDeviceLabel": "Samsung Galaxy Tab S9"
    }
  },
  "meta": { "requestId": "req_01c", "timestamp": "2026-10-16T18:30:00.000Z" }
}
```

---

## 4. VEHICLE SESSIONS & SMART CAMERA

### 4.1 POST `/api/v1/sessions`
Initializes a new vehicle tuning session.

* **Zod Request Schema:**
```typescript
export const createSessionSchema = z.object({
  captureMode: z.enum(['QUICK', 'FULL_360']),
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().regex(/^\+[1-9]\d{6,14}$/).optional(),
  shopId: z.string().uuid().optional() // Auto-injected from JWT if b2b_seller
}).strict();
```

* **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "sessionId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "captureMode": "QUICK",
    "status": "CAPTURING",
    "requiredAngles": [1, 2, 3, 5],
    "createdAt": "2026-10-16T18:30:00.000Z"
  },
  "meta": { "requestId": "req_02a", "timestamp": "2026-10-16T18:30:00.000Z" }
}
```

### 4.2 POST `/api/v1/sessions/:id/photos`
Registers an uploaded angle photo, runs quality evaluation, and triggers background car recognition.

* **Zod Request Schema:**
```typescript
export const registerPhotoSchema = z.object({
  angleId: z.number().int().min(1).max(8),
  storagePath: z.string().min(5).max(255),
  lumaScore: z.number().min(0).max(255),
  isBlurry: z.boolean(),
  gyroRoll: z.number(),
  gyroPitch: z.number()
}).strict();
```

* **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "photoId": "e5b87198-d144-4822-b9cf-14f7b2a61111",
    "angleId": 2,
    "qualityPassed": true,
    "warningMessageKey": null
  },
  "meta": { "requestId": "req_02b", "timestamp": "2026-10-16T18:30:00.000Z" }
}
```

### 4.3 POST `/api/v1/sessions/:id/detect-car`
Invokes Vision LLM on the primary angle photo (Angle 1 or 2) to identify make, model, year range, and body color.

* **Zod Request Schema:**
```typescript
export const detectCarSchema = z.object({
  photoStoragePath: z.string().min(5),
  angleId: z.number().int().min(1).max(8)
}).strict();
```

* **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "isValidVehicle": true,
    "detectedMake": "Chevrolet",
    "detectedModel": "Malibu 2",
    "detectedYearRange": "2019-2024",
    "bodyType": "SEDAN",
    "boltPattern": "5x115",
    "baseBodyColor": "#1C1C1E",
    "confidence": 0.96,
    "requiresManualConfirmation": false
  },
  "meta": { "requestId": "req_02c", "timestamp": "2026-10-16T18:30:00.000Z" }
}
```

---

## 5. ASYNCHRONOUS AI GENERATION PIPELINE

### 5.1 POST `/api/v1/generations`
Queues a dual-conditioned realistic inpainting generation.

* **Zod Request Schema:**
```typescript
export const createGenerationSchema = z.object({
  sessionId: z.string().uuid(),
  angleId: z.number().int().min(1).max(8),
  // Selected parts with optional custom styling parameters
  buildItems: z.array(z.object({
    inventoryId: z.string().uuid(),
    slot: z.enum([
      'WHEELS_RIMS', 'FRONT_BUMPER', 'REAR_BUMPER', 'REAR_DIFFUSER', 
      'SIDE_SKIRTS', 'HEADLIGHTS', 'TAILLIGHTS', 'HOOD', 
      'TRUNK_SPOILER', 'BODY_COLOR', 'WINDOW_TINT', 'POLISH_COAT'
    ]),
    options: z.object({
      paintHexColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      finishStyle: z.enum(['GLOSS', 'SATIN', 'MATTE', 'METALLIC']).optional(),
      tintVltPercent: z.enum(['5', '15', '35', '70']).optional(),
      rimDiameterInches: z.number().int().min(15).max(24).optional()
    }).optional()
  })).min(1).max(8),
  isNightMode: z.boolean().default(false),
  idempotencyKey: z.string().uuid()
}).strict();
```

* **Execution Pipeline (Atomic & Asynchronous):**
  1. Validates angle-to-part compatibility via `src/domain/angle-validator.ts`.
  2. Resolves reference image URLs from `shop_inventory` or `master_catalog`.
  3. Executes atomic PostgreSQL RPC `reserve_credits(user_id, shop_id, 1, generation_id)`.
  4. Enqueues job to Fal.ai (`fal-ai/flux-general/image-to-image` or `flux-fill`) with reference image IP-Adapter conditioning and SAM 2 target mask.
  5. Sets webhook callback: `https://carvision.app/api/v1/webhooks/fal`.
  6. Returns HTTP 202 Accepted in under 150ms.

* **Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "generationId": "5a415a78-2d88-466d-8f92-23c21a4f3299",
    "status": "QUEUED",
    "creditsCharged": 1,
    "estimatedWaitSeconds": 3.8,
    "realtimeChannel": "generations:5a415a78-2d88-466d-8f92-23c21a4f3299"
  },
  "meta": { "requestId": "req_03a", "timestamp": "2026-10-16T18:30:00.000Z" }
}
```

### 5.2 POST `/api/v1/webhooks/fal`
Receives asynchronous completion payloads from Fal.ai.

* **Security:** Verifies `x-fal-webhook-secret` header against `process.env.FAL_WEBHOOK_SECRET` and validates HMAC SHA-256 signature.
* **Payload Handler Logic:**
  - If `status === 'OK'`:
    - Downloads rendered raster and stores to `outputs/` bucket (both 1080p preview and 4K final).
    - Updates `generations` row to `status = 'COMPLETED'`.
    - Dispatches Supabase Realtime event `{ event: 'COMPLETED', previewUrl, output4kUrl }`.
  - If `status === 'ERROR'`:
    - Executes atomic PostgreSQL function `rollback_credits(user_id, shop_id, 1, generation_id)`.
    - Updates `generations` row to `status = 'FAILED'`.
    - Dispatches Supabase Realtime event `{ event: 'FAILED', messageKey: 'errors.ai.render_failed' }`.
* **Response (200 OK):** `{ "received": true }`

---

## 6. B2C MARKETPLACE, BOOKING & 3% ESCROW DEPOSIT

### 6.1 GET `/api/v1/marketplace/shops`
Returns verified partner shops with contact details masked.

* **Zod Query Schema:**
```typescript
export const listMarketplaceShopsSchema = z.object({
  city: z.string().default('Tashkent'),
  district: z.string().optional(),
  userLat: z.coerce.number().min(-90).max(90).optional(),
  userLng: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page: z.coerce.number().int().min(1).default(1)
});
```

* **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "7f8b919d-6484-4827-86c3-16279f6bb123",
      "maskedLabel": "Verified Partner #B123",
      "district": "Yunusobod",
      "distanceKm": 3.8,
      "ratingAvg": 4.9,
      "ratingCount": 42,
      "logoUrl": "https://cdn.carvision.app/logos/partner-b123.webp",
      "activeOffersCount": 68
    }
  ],
  "meta": {
    "requestId": "req_04a",
    "timestamp": "2026-10-16T18:30:00.000Z",
    "pagination": { "page": 1, "limit": 20, "totalItems": 14, "totalPages": 1, "hasNextPage": false }
  }
}
```

### 6.2 POST `/api/v1/bookings`
Initiates a booking, calculates total parts + labor, and generates the 3% escrow deposit requirement.

* **Zod Request Schema:**
```typescript
export const createBookingSchema = z.object({
  sessionId: z.string().uuid(),
  shopId: z.string().uuid(),
  selectedInventoryIds: z.array(z.string().uuid()).min(1),
  preferredAppointmentDate: z.string().datetime(),
  customerNote: z.string().max(500).optional()
}).strict();
```

* **Calculation:**
  - `total_price_cents = sum(item.price_cents + item.labor_cost_cents)`
  - `deposit_amount_cents = max(1000, round(total_price_cents * 0.03))` (Min $10.00 / 130,000 UZS)
* **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "bookingId": "2c64b73a-4be2-44f2-9596-f08914611111",
    "bookingNumber": "CV-BKG-9082",
    "status": "AWAITING_PAYMENT",
    "totalPriceCents": 145000,
    "depositAmountCents": 4350,
    "paymentDetails": {
      "recipientName": "CarVision Escrow",
      "cardPanMasked": "8600 •••• •••• 9921",
      "bankName": "Kapitalbank",
      "currency": "UZS",
      "amountLocalFormatted": "565,500 UZS",
      "exchangeRateUsed": 13000
    },
    "depositExpiresAt": "2026-10-16T19:30:00.000Z"
  },
  "meta": { "requestId": "req_04b", "timestamp": "2026-10-16T18:30:00.000Z" }
}
```

### 6.3 POST `/api/v1/bookings/:id/submit-receipt`
Receives payment receipt screenshot, computes SHA-256 hash to prevent reuse, and triggers autonomous OCR verification.

* **Zod Request Schema:**
```typescript
export const submitReceiptSchema = z.object({
  receiptStoragePath: z.string().min(5),
  receiptSha256: z.string().length(64)
}).strict();
```

* **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "bookingId": "2c64b73a-4be2-44f2-9596-f08914611111",
    "status": "UNLOCKED",
    "verificationMethod": "AUTO_OCR",
    "unlockedShop": {
      "shopName": "Autotune Pro Tashkent",
      "phone": "+998 90 123 45 67",
      "exactAddress": "Amir Temur ko'chasi 108A, Yunusobod tumani",
      "geoLat": 41.3521,
      "geoLng": 69.2891,
      "bookingRedemptionCode": "748-912",
      "qrVoucherUrl": "https://carvision.app/vouchers/CV-BKG-9082.svg"
    }
  },
  "meta": { "requestId": "req_04c", "timestamp": "2026-10-16T18:30:00.000Z" }
}
```

### 6.4 POST `/api/v1/bookings/redeem-voucher`
Used by workshop technicians (`b2b_seller`) to verify and redeem the customer's 6-digit booking code or QR voucher.

* **Zod Request Schema:**
```typescript
export const redeemVoucherSchema = z.object({
  redemptionCode: z.string().regex(/^\d{3}-\d{3}$/, 'Format must be XXX-XXX')
}).strict();
```

* **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "bookingId": "2c64b73a-4be2-44f2-9596-f08914611111",
    "customerName": "Sardor Aliyev",
    "customerPhone": "+998 90 999 88 77",
    "depositCreditAppliedCents": 4350,
    "finalInvoiceDeductionLocal": "565,500 UZS",
    "status": "COMPLETED_IN_WORKSHOP"
  },
  "meta": { "requestId": "req_04d", "timestamp": "2026-10-16T18:30:00.000Z" }
}
```

---

## 7. TUNING PASSPORT (PUBLIC SHARING)

### 7.1 GET `/api/v1/passports/:publicToken`
Returns the read-only before/after visualizer and itemized quote for customer sharing.

* **Authentication:** Public (No auth required).
* **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "vehicleTitle": "Chevrolet Malibu 2 Redline",
    "workshopName": "Autotune Pro",
    "angles": [
      {
        "angleId": 2,
        "beforeUrl": "https://cdn.carvision.app/originals/session-1/angle-2.webp",
        "after4kUrl": "https://cdn.carvision.app/outputs/session-1/angle-2-4k.webp"
      }
    ],
    "installedItems": [
      {
        "category": "WHEELS_RIMS",
        "partName": "Vossen HF-5 20\" Satin Black",
        "priceCents": 85000,
        "laborCostCents": 10000
      }
    ],
    "grandTotalCents": 95000,
    "expiresAt": "2026-10-30T18:30:00.000Z"
  },
  "meta": { "requestId": "req_05a", "timestamp": "2026-10-16T18:30:00.000Z" }
}
```

---

## 8. SUPER ADMIN RESTRICTED ENDPOINTS

### 8.1 POST `/api/v1/admin/billing/assign-plan`
Manually credits a workshop upon receiving manual offline payment.

* **Authentication:** Required (`super_admin` with Supabase `aal2` TOTP MFA).
* **Zod Request Schema:**
```typescript
export const adminAssignPlanSchema = z.object({
  shopId: z.string().uuid(),
  planCode: z.enum(['PRO_800', 'MAX_4000', 'ULTRA_10000', 'CUSTOM']),
  creditsToAdd: z.number().int().min(1).max(50000),
  paidAmountCents: z.number().int().min(0),
  paymentCurrency: z.enum(['USD', 'UZS', 'AED', 'EUR']),
  paymentMethod: z.enum(['BANK_TRANSFER', 'CASH', 'OCTO', 'CLICK_PAYME_MANUAL']),
  durationDays: z.number().int().min(1).max(365).default(30),
  adminNotes: z.string().min(3).max(500)
}).strict();
```

* **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "shopId": "c41829e0-8b1b-4ec9-8974-9b247fcf1e29",
    "newCreditsBalance": 4840,
    "planExpiresAt": "2026-11-15T18:30:00.000Z",
    "auditLogId": "a190b221-1244-469b-90b1-124508aa7789"
  },
  "meta": { "requestId": "req_06a", "timestamp": "2026-10-16T18:30:00.000Z" }
}
```
