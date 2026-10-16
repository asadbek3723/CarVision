# 12_I18N_AND_PWA.md

**Project:** CarVision — AI car tuning & detailing visualizer with a parts marketplace  
**Document type:** Internationalization (i18n), Arabic RTL Engineering, Multi-Currency Display & Serwist PWA Architecture  
**Version:** 2.0.0 (Production Specification)  
**Status:** Normative. All localization dictionaries, layout direction rules, manifest properties, and service workers must strictly implement this document.  
**Read together with:** `01_PRD_BUSINESS_LOGIC.md`, `02_DESIGN_SYSTEM.md`, `04_ARCHITECTURE.md`, `08_SMART_CAMERA.md`.

---

## 1. PURPOSE & CORE PRINCIPLES

CarVision operates across multilingual automotive hubs: Uzbekistan, the United Arab Emirates (Dubai), Turkey, and Central Asia.
1. **Zero Hardcoded Strings:** Every label, error message, toast, badge, input placeholder, and accessibility attribute originates strictly from typed dictionary files (`messages/<locale>.json`).
2. **First-Class Arabic RTL:** In Arabic (`ar`), the interface smoothly flips horizontally using CSS Logical Properties. The 3D vehicle canvas, physical Before/After slider orientation, and numeric counters remain in physical coordinates without distortion.
3. **Internal USD Minor Units, Presentational Local Currencies:** The core platform calculates and stores all amounts in USD integer cents. The UI dynamically presents values in `UZS`, `AED`, `TRY`, or `KGS` using live exchange rates configured in `system_settings`.
4. **Standalone Hardware-Accelerated PWA:** Operates seamlessly on Android, iOS, and tablets, with client-side image buffering and offline resilience in weak 4G garage environments.

---

## 2. THE 8 SUPPORTED LOCALES & TYPOGRAPHY SPECIFICATION

| Locale | Native Language Name | Script | Direction | Font Family | Modifier / Special Characters |
|---|---|---|---|---|---|
| `uz` *(Default)* | Oʻzbekcha | Latin | LTR | Inter | U+02BB ʻ (oʻ, gʻ modifiers) |
| `ru` | Русский | Cyrillic | LTR | Inter | Full Cyrillic glyph set |
| `en` | English | Latin | LTR | Inter | Standard Latin ASCII/Extended |
| `ar` | العربية | Arabic | **RTL** | **Noto Sans Arabic** | Full Tashkeel and Ligature support |
| `tr` | Türkçe | Latin | LTR | Inter | Turkish dotted/dotless İ/ı, Ş/ş, Ğ/ğ |
| `kk` | Қазақша | Cyrillic | LTR | Inter | Kazakh Cyrillic: Ә, Ғ, Қ, Ң, Ө, Ұ, Ү, Һ, І |
| `ky` | Кыргызча | Cyrillic | LTR | Inter | Kyrgyz Cyrillic: Ө, Ң, Ү |
| `tg` | Тоҷикӣ | Cyrillic | LTR | Inter | Tajik Cyrillic: Ғ, Ӣ, Қ, Ӯ, Ҳ, Ҷ |

---

## 3. MASTER DICTIONARY SCHEMA (`messages/en.json`)

All 8 locale JSON files implement the exact same schema structure. Below is the authoritative master English dictionary:

```json
{
  "common": {
    "appName": "CarVision",
    "save": "Save",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "delete": "Delete",
    "retry": "Retry",
    "back": "Back",
    "next": "Next",
    "loading": "Loading...",
    "offlineNotice": "Offline Mode — Changes will sync when connected",
    "currencySymbol": "$",
    "usdCents": "{amount} USD"
  },
  "auth": {
    "welcomeTitle": "Next-Gen Automotive Tuning Visualizer",
    "selectRole": "Select Account Type",
    "roleB2c": "Car Owner (Marketplace)",
    "roleB2b": "Tuning / Detailing Workshop",
    "phoneLabel": "Phone Number",
    "passwordLabel": "Password",
    "loginAction": "Sign In",
    "registerAction": "Create Account",
    "shopNameLabel": "Workshop Name",
    "cityLabel": "City",
    "districtLabel": "District",
    "addressLabel": "Exact Street Address",
    "referralInput": "Referral Code (Optional)",
    "termsNotice": "By continuing, you agree to our Terms and Escrow Policy"
  },
  "camera": {
    "title": "Smart Guided Capture",
    "angleIndicator": "Angle {current} of {total}",
    "angles": {
      "1": "Front View (0°)",
      "2": "Front 3/4 Driver (45°)",
      "3": "Driver Profile (90°)",
      "4": "Rear 3/4 Driver (135°)",
      "5": "Rear View (180°)",
      "6": "Rear 3/4 Passenger (225°)",
      "7": "Passenger Profile (270°)",
      "8": "Front 3/4 Passenger (315°)"
    },
    "guidance": {
      "levelDevice": "Level your phone",
      "stepBack": "Step back",
      "stepCloser": "Move closer",
      "turnRight": "Move slightly right",
      "turnLeft": "Move slightly left",
      "holdStill": "Hold still — capturing",
      "locked": "Locked & Aligned"
    },
    "switchMode": "Switch to Quick Mode (4 Angles)",
    "retake": "Retake",
    "accept": "Use Photo",
    "qrBridgeTitle": "Continue on Phone Camera",
    "qrBridgeDesc": "Scan this QR code to capture high-res photos on your phone and beam them directly to this screen."
  },
  "studio": {
    "title": "Tuning Studio",
    "beforeLabel": "Original",
    "afterLabel": "Tuned 4K",
    "cashierTotal": "Build Total",
    "itemizedBreakdown": "Itemized Summary",
    "partsCost": "Parts Total",
    "laborCost": "Labor & Installation",
    "depositRequired": "3% Escrow Deposit",
    "generateAction": "Visualize Tuning (1 Credit)",
    "generating": "Rendering 4K Preview...",
    "nightModeToggle": "Night Studio Mode",
    "categories": {
      "wheels": "Wheels & Rims",
      "bumpers": "Bumpers & Body Kits",
      "diffusers": "Diffusers & Splitters",
      "spoilers": "Spoilers & Wings",
      "optics": "Headlights & Taillights",
      "wrap": "Vinyl Wrap & Paint",
      "tint": "Window Tinting",
      "detailing": "Polishing & Ceramic"
    },
    "customerViewLock": "Customer View Active (Locked)",
    "customerViewUnlock": "Staff PIN Unlock",
    "passportCta": "Create Tuning Passport",
    "videoReelCta": "Export Video Reel"
  },
  "marketplace": {
    "title": "Verified Tuning Partners",
    "maskedPartner": "Verified Partner #{id}",
    "distance": "{km} km away",
    "rating": "{rating} ({count} reviews)",
    "bookInstallation": "Book Installation with 3% Deposit",
    "depositExplainer": "The 3% deposit guarantees your parts reservation and is fully deducted from your final bill at the shop.",
    "uploadReceipt": "Upload Payment Receipt",
    "autoVerifying": "AI scanning payment receipt...",
    "voucherUnlocked": "Booking Confirmed! Shop Details Unlocked",
    "voucherCode": "Redemption Code: {code}"
  },
  "seller": {
    "dashboardTitle": "Workshop Console",
    "creditsRemaining": "Credits Balance",
    "creditsFomoWarning": "Only {count} credits left! Upgrade plan to prevent walk-in interruptions.",
    "planLabel": "Current Plan: {plan}",
    "quickActions": "Quick Actions",
    "stockManager": "Inventory Catalog",
    "oneClickImport": "1-Click Master Catalog Importer",
    "customPartAdd": "Add Custom Part",
    "redeemVoucherAction": "Redeem Customer 3% Voucher"
  },
  "admin": {
    "title": "Super Admin Console",
    "manualBilling": "Manual Plan Assignment",
    "liveFeed": "Live Generation Stream",
    "receiptAudit": "Receipt Verification Queue",
    "deviceLimits": "Device Session Inspector",
    "approveAction": "Approve",
    "rejectAction": "Reject",
    "banAction": "Fraud Ban"
  },
  "errors": {
    "networkOffline": "No internet connection detected.",
    "cameraPermissionDenied": "Camera access was denied. Please enable camera permissions in your browser settings.",
    "vehicleNotDetected": "No automobile recognized. Please frame the vehicle inside the 3D wireframe guide.",
    "insufficientCredits": "You have run out of image credits.",
    "sessionEvicted": "This tablet was logged out because your account reached its active device limit on another device.",
    "renderFailed": "Render could not be completed. Your credit has been fully refunded.",
    "receiptDuplicate": "This receipt has already been submitted for another booking."
  }
}
```

---

## 4. ARABIC RTL (RIGHT-TO-LEFT) ENGINEERING ARCHITECTURE

When `locale === 'ar'`:
1. The root layout automatically applies `<html lang="ar" dir="rtl">`.
2. **The Zero Physical Class Rule:** Tailwind physical direction classes are blocked in CI by `scripts/check-physical-direction.mjs`:
   - 🚫 **Forbidden:** `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `text-right`, `border-l`, `border-r`, `rounded-l`, `rounded-r`.
   - ✅ **Required Logical Equivalents:** `ms-*` (margin-inline-start), `me-*` (margin-inline-end), `ps-*` (padding-inline-start), `pe-*` (padding-inline-end), `start-*`, `end-*`, `text-start`, `text-end`, `border-s`, `border-e`, `rounded-s`, `rounded-e`.
3. **Physical Preservation Exceptions:**
   - **Vehicle 3D Scene / Canvas Viewport:** Three.js coordinates $(x, y, z)$ remain strictly in physical space. A car's left driver door is always the left driver door; it must **never** be inverted or mirrored.
   - **Before/After Split-View Slider:** The dividing line moves naturally across physical pixels, but the label badges ("Before" / "After") swap places so "Before" points to the original side.
   - **Tabular Numerals & Monospaced Prices:** Numbers retain standard LTR digit order (`1,450 USD` remains `1,450 USD`, not `054,1`).

---

## 5. DYNAMIC MULTI-CURRENCY CONVERSION SYSTEM

All internal state and database records store prices in **integer USD minor units (`price_cents`)**.
At render time, the client-side currency utility converts values for local presentation based on the user's active locale:

```typescript
// src/domain/currency.ts
export interface CurrencyFormatOptions {
  locale: string;
  priceCents: number;
  rates: {
    UZS: number; // e.g. 13000
    AED: number; // e.g. 3.6725
    TRY: number; // e.g. 34.20
    KGS: number; // e.g. 86.50
  };
}

export function formatPresentationalPrice({ locale, priceCents, rates }: CurrencyFormatOptions): string {
  const usdAmount = priceCents / 100;

  switch (locale) {
    case 'uz': {
      // Round to nearest 1,000 UZS
      const uzs = Math.round(usdAmount * rates.UZS / 1000) * 1000;
      return new Intl.NumberFormat('uz-UZ').format(uzs) + " so'm";
    }
    case 'ar': {
      const aed = Math.round(usdAmount * rates.AED);
      return new Intl.NumberFormat('ar-AE').format(aed) + ' د.إ';
    }
    case 'tr': {
      const tryVal = Math.round(usdAmount * rates.TRY);
      return new Intl.NumberFormat('tr-TR').format(tryVal) + ' ₺';
    }
    case 'ky': {
      const kgs = Math.round(usdAmount * rates.KGS);
      return new Intl.NumberFormat('ky-KG').format(kgs) + ' сом';
    }
    default: {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usdAmount);
    }
  }
}
```

---

## 6. SERWIST PWA ARCHITECTURE & RUNTIME CACHING

### 6.1 Service Worker Implementation (`src/app/sw.ts`)

```typescript
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist, CacheFirst, StaleWhileRevalidate, NetworkOnly } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // 1. Static 3D vehicle wireframes & GLB assets -> CacheFirst (1 Year)
    {
      matcher: ({ url }) => url.pathname.startsWith('/models/') || url.pathname.endsWith('.glb'),
      handler: new CacheFirst({
        cacheName: 'carvision-3d-wireframes-v1',
        plugins: [{
          cacheWillUpdate: async ({ response }) => response.status === 200 ? response : null
        }]
      })
    },
    // 2. Catalog & Item Reference Images (CDN) -> StaleWhileRevalidate (30 Days)
    {
      matcher: ({ url }) => url.hostname === 'cdn.carvision.app' && url.pathname.startsWith('/catalog/'),
      handler: new StaleWhileRevalidate({
        cacheName: 'carvision-catalog-thumbs-v1'
      })
    },
    // 3. UI Google Fonts & Static Fonts -> CacheFirst
    {
      matcher: ({ url }) => url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com'),
      handler: new CacheFirst({
        cacheName: 'google-fonts-cache-v1'
      })
    },
    // 4. API Endpoints, Supabase Auth, Webhooks & Realtime -> STRICTLY NetworkOnly
    {
      matcher: ({ url }) => 
        url.pathname.startsWith('/api/') || 
        url.hostname.includes('supabase.co') || 
        url.hostname.includes('fal.run'),
      handler: new NetworkOnly()
    },
    ...defaultCache
  ]
});

serwist.addEventListeners();
```

---

## 7. WEAK 4G WORKSHOP OFFLINE RESILIENCE (INDEXEDDB QUEUE)

In automotive repair boxes where cellular signal drops during a walkaround photo shoot:
1. Captured images are compressed into clean WebP blobs (< 400KB) and stored immediately into an **IndexedDB store (`carvision_offline_queue`)**.
2. A background synchronization worker polls connection state via `navigator.onLine` and `window.addEventListener('online')`.
3. When network connectivity is re-established, the queue synchronizes photos to `POST /api/v1/sessions/:id/photos` sequentially without data loss or user intervention.

```typescript
// src/lib/offline-photo-queue.ts
import { openDB, type DBSchema } from 'idb';

interface CarVisionDB extends DBSchema {
  offline_photos: {
    key: string;
    value: {
      id: string;
      sessionId: string;
      angleId: number;
      blob: Blob;
      timestamp: number;
      syncStatus: 'PENDING' | 'UPLOADING' | 'FAILED';
    };
    indexes: { 'by_session': string };
  };
}

export async function getOfflineDB() {
  return openDB<CarVisionDB>('carvision_offline_db', 1, {
    upgrade(db) {
      const store = db.createObjectStore('offline_photos', { keyPath: 'id' });
      store.createIndex('by_session', 'sessionId');
    }
  });
}
```
