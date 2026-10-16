# 08_SMART_CAMERA.md

**Project:** CarVision — AI car tuning & detailing visualizer with a parts marketplace  
**Document type:** Live Camera Viewport, Three.js 3D Wireframe Overlay, Gyroscope Spatial Guidance, Green Lock Auto-Shutter & Desktop QR Bridge  
**Version:** 2.0.0 (Deep Production Specification)  
**Status:** Normative. Implementation must strictly adhere to the WebRTC video constraints, iOS orientation permission protocols, and client-side compression budgets defined herein.  
**Read together with:** `01_PRD_BUSINESS_LOGIC.md` (FR-CAP), `02_DESIGN_SYSTEM.md` (section 8), `04_ARCHITECTURE.md` (section 10), `06_DATABASE_AND_RLS.md`.

---

## 1. PURPOSE & CORE OPERATIONAL CHALLENGE

High-quality, photorealistic AI visualization requires high-quality source photographs. In automotive workshops, staff frequently capture vehicles from warped angles, excessive ground tilt, or poorly cropped frames, which degrades AI inpainting output.

**The Solution:** The Smart Camera provides a live, interactive **Automotive Augmented HUD**:
1. Renders a transparent 3D wireframe vehicle mesh over the live camera stream.
2. Reads device accelerometer and gyroscope sensors to compute pitch, roll, and distance alignment errors.
3. Provides a single, clear, translated imperative instruction (*"Level phone"*, *"Move closer"*).
4. Fires **Green Lock Auto-Shutter** when spatial tolerances align steadily for 400 ms.
5. Scales and encodes the raw image to WebP (< 400 KB) with stripped EXIF entirely client-side.
6. Connects seamlessly with Desktop / Smart TV showroom displays via a wireless WebSocket QR bridge.

---

## 2. WEBRTC MEDIA TRACK CONSTRAINTS & PERMISSION PROTOCOLS

### 2.1 Camera Hardware Constraints
To guarantee ultra-sharp edge recognition and natural focal length without barrel distortion:
```typescript
export const CAMERA_MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: 'environment' }, // Back camera
    width: { ideal: 2560, min: 1920 },
    height: { ideal: 1440, min: 1080 },
    aspectRatio: { ideal: 16 / 9 },
    frameRate: { ideal: 30, max: 60 }
  }
};
```

### 2.2 iOS Safari `DeviceOrientationEvent` Permission Protocol
On Apple iOS (Safari 13+), device sensors cannot be read automatically without an explicit user gesture:
```typescript
export async function requestOrientationPermission(): Promise<'GRANTED' | 'DENIED' | 'UNSUPPORTED'> {
  // Check if DeviceOrientationEvent requires permission (iOS WebKit)
  const DeviceOrientationEventAny = window.DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };

  if (typeof DeviceOrientationEventAny?.requestPermission === 'function') {
    try {
      const response = await DeviceOrientationEventAny.requestPermission();
      return response === 'granted' ? 'GRANTED' : 'DENIED';
    } catch {
      return 'DENIED';
    }
  }

  // Android and desktop Chromium grant automatically if hardware exists
  if ('DeviceOrientationEvent' in window) {
    return 'GRANTED';
  }

  return 'UNSUPPORTED';
}
```
**UI Rule:** On iOS, when the camera opens, if permission is ungranted, a sleek glass button appears: `[Enable Motion Guidance 🧭]`. Tapping it triggers `requestPermission()`. If dismissed, the 3D wireframe mesh remains active while gyro-based text guidance disables gracefully without crashing.

---

## 3. THE 8 STANDARD ANGLES & 3D WIREFRAME SYSTEM

```
                      [Angle 1: FRONT 0°]
                              ▲
     [Angle 8: FR 315°] ↖     │     ↗ [Angle 2: FL 45°]
                           ┌─────┐
  [Angle 7: RIGHT 270°] ◀──│ CAR │──▶ [Angle 3: LEFT 90°]
                           └─────┘
     [Angle 6: RR 225°] ↙     │     ↘ [Angle 4: RL 135°]
                              ▼
                      [Angle 5: REAR 180°]
```

### 3.1 Canonical Angle Parameter Matrix

| Angle ID | Name Code | Target Azimuth ($\theta$) | Target Pitch ($\beta$) | Level Roll ($\gamma$) | Target Viewport Coverage |
|---|---|---|---|---|---|
| **1** | `FRONT_CENTER` | $0^\circ \pm 8^\circ$ | $10^\circ \pm 4^\circ$ | $0^\circ \pm 3^\circ$ | 72% – 82% width |
| **2** | `FRONT_LEFT_45` | $45^\circ \pm 10^\circ$ | $12^\circ \pm 4^\circ$ | $0^\circ \pm 3^\circ$ | 75% – 85% width |
| **3** | `LEFT_SIDE_90` | $90^\circ \pm 6^\circ$ | $6^\circ \pm 3^\circ$ | $0^\circ \pm 3^\circ$ | 80% – 90% width |
| **4** | `REAR_LEFT_45` | $135^\circ \pm 10^\circ$ | $12^\circ \pm 4^\circ$ | $0^\circ \pm 3^\circ$ | 75% – 85% width |
| **5** | `REAR_CENTER` | $180^\circ \pm 8^\circ$ | $10^\circ \pm 4^\circ$ | $0^\circ \pm 3^\circ$ | 72% – 82% width |
| **6** | `REAR_RIGHT_45` | $225^\circ \pm 10^\circ$ | $12^\circ \pm 4^\circ$ | $0^\circ \pm 3^\circ$ | 75% – 85% width |
| **7** | `RIGHT_SIDE_90` | $270^\circ \pm 6^\circ$ | $6^\circ \pm 3^\circ$ | $0^\circ \pm 3^\circ$ | 80% – 90% width |
| **8** | `FRONT_RIGHT_45` | $315^\circ \pm 10^\circ$ | $12^\circ \pm 4^\circ$ | $0^\circ \pm 3^\circ$ | 75% – 85% width |

### 3.2 Dynamic Three.js Mesh Implementation
Loaded strictly via `next/dynamic` with `ssr: false`:
```typescript
// src/features/camera/components/Camera3DOverlay.tsx
import { Canvas } from '@react-three/fiber';
import { Center } from '@react-three/drei';
import { Euler } from 'three';

interface Camera3DOverlayProps {
  activeAngleId: number;
  alignmentScore: number; // 0.0 to 1.0
  isAligned: boolean;
}

export function Camera3DOverlay({ activeAngleId, alignmentScore, isAligned }: Camera3DOverlayProps) {
  // Derive rotation in radians from angle index (0°, 45°, 90°, etc.)
  const rotationY = ((activeAngleId - 1) * 45 * Math.PI) / 180;
  
  // Color transitions from Electric Cyan to Warning Amber to Green Lock
  const wireframeColor = isAligned 
    ? '#2BD67B' 
    : alignmentScore > 0.65 
      ? '#FFB020' 
      : 'rgba(25, 211, 255, 0.65)';

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <Canvas camera={{ position: [0, 1.1, 4.2], fov: 45 }}>
        <ambientLight intensity={1.2} />
        <Center>
          <primitive 
            object={lowPolyCarMesh} 
            rotation={new Euler(0.15, rotationY, 0)} 
            scale={[1.35, 1.35, 1.35]}
          >
            <meshBasicMaterial 
              wireframe 
              color={wireframeColor} 
              transparent 
              opacity={isAligned ? 0.95 : 0.55} 
            />
          </primitive>
        </Center>
      </Canvas>
    </div>
  );
}
```

---

## 4. GYROSCOPIC GUIDANCE ENGINE & ERROR COMPUTATION

Device motion listeners measure physical phone orientation relative to the horizon and floor:

```typescript
export interface SpatialOrientationState {
  rollDeg: number;    // gamma: -90 to +90 (Horizon tilt)
  pitchDeg: number;   // beta: -180 to +180 (Vertical tilt)
  isLevel: boolean;
  instructionKey: string;
  arrowDirection: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';
  canAutoShutter: boolean;
}

export function evaluateSpatialGuidance(
  beta: number,
  gamma: number,
  targetPitch: number
): SpatialOrientationState {
  const rollError = Math.abs(gamma);
  const pitchError = beta - targetPitch;

  // Priority 1: Horizon Level Check (Prevent diagonal tilted shots)
  if (rollError > 4.0) {
    return {
      rollDeg: gamma,
      pitchDeg: beta,
      isLevel: false,
      instructionKey: 'studio.camera_guidance.level_phone',
      arrowDirection: gamma > 0 ? 'LEFT' : 'RIGHT',
      canAutoShutter: false
    };
  }

  // Priority 2: Vertical Pitch Check (Prevent aiming too high into sky or too low at asphalt)
  if (pitchError < -5.0) {
    return {
      rollDeg: gamma,
      pitchDeg: beta,
      isLevel: true,
      instructionKey: 'studio.camera_guidance.tilt_down',
      arrowDirection: 'DOWN',
      canAutoShutter: false
    };
  }
  if (pitchError > 7.0) {
    return {
      rollDeg: gamma,
      pitchDeg: beta,
      isLevel: true,
      instructionKey: 'studio.camera_guidance.tilt_up',
      arrowDirection: 'UP',
      canAutoShutter: false
    };
  }

  // Priority 3: Perfect Alignment Achieved
  return {
    rollDeg: gamma,
    pitchDeg: beta,
    isLevel: true,
    instructionKey: 'studio.camera_guidance.hold_steady',
    arrowDirection: 'NONE',
    canAutoShutter: true
  };
}
```

**Anti-Flicker Debounce Rule:** The instruction pill updates at a maximum frequency of **once per 500 ms** to eliminate erratic micro-jitter while the user steps around the car.

---

## 5. "GREEN LOCK" AUTO-SHUTTER PROTOCOL

When `canAutoShutter === true`:
1. **The 400ms Stability Gate:** A timer initiates. If the phone maintains level posture ($|\gamma| \le 3^\circ$, $|\Delta \beta| \le 4^\circ$) continuously for 400 ms:
2. **Visual & Taktil Confirmation:**
   - 3D Wireframe pulses bright emerald green (`#2BD67B`).
   - Phone triggers haptic vibration: `navigator.vibrate([25, 45, 25])` (Android).
   - Audio pop plays (Web Audio API synthesized 440 Hz click at 25ms, volume 0.3).
3. **Automatic Shutter Trigger:** Calls `captureFrame()`.
4. **Manual Shutter Override:** A dedicated 72×72 px floating shutter button is **always visible and clickable**. Users who do not wish to wait for auto-shutter can tap the button at any moment.

---

## 6. CLIENT-SIDE CANVASA COMPRESSION & PRIVACY STRIPPING

When the frame is captured, `src/features/camera/lib/client-compressor.ts` executes an immediate 3-step pipeline:

```typescript
export async function processAndCompressFrame(videoElement: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D unavailable');

  // 1. Calculate Clamped Dimensions (Longest side <= 2048px)
  const maxDimension = 2048;
  let { videoWidth: width, videoHeight: height } = videoElement;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  canvas.width = width;
  canvas.height = height;

  // 2. Draw frame onto canvas (Automatically strips all camera EXIF / GPS tags)
  ctx.drawImage(videoElement, 0, 0, width, height);

  // 3. Compress to WebP at 0.82 quality factor (Yields ~280KB - 380KB)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('WebP compression failed'));
      },
      'image/webp',
      0.82
    );
  });
}
```

---

## 7. WIRELESS "QR CAMERA BRIDGE" (DESKTOP & SMART TV)

For workshops where staff configure builds on a large TV or desktop PC while standing outside photographing the vehicle:

```
┌──────────────────────────────────────┐                ┌──────────────────────────────────────┐
│       DESKTOP SHOWROOM DISPLAY       │                │          WORKSHOP PHONE              │
│                                      │                │                                      │
│ 1. `POST /api/v1/camera/bridge`      │                │                                      │
│    Creates session token (10 min TTL)│                │                                      │
│ 2. Displays high-contrast QR Code    │                │                                      │
│                                      │   Scan QR      │ 3. Opens `/bridge/:token`            │
│                                      │◀───────────────│    No login required (Token scoped)  │
│ 4. Subscribes to Supabase Realtime   │                │ 4. Camera HUD opens automatically    │
│    channel `bridge:{sessionId}`      │                │                                      │
│                                      │   WebSocket    │ 5. Snaps Angle 1..8 -> Uploads       │
│ 6. Realtime event received:          │◀───────────────│    Dispatches message to Realtime    │
│    `{ angleId: 1, storageUrl: "..."}`│                │                                      │
│    Photo appears on TV in ~1 second! │                │                                      │
└──────────────────────────────────────┘                └──────────────────────────────────────┘
```

### 7.1 Security Controls
- Tokens are one-time-use, expiring in 600 seconds.
- Phone upload route enforces signed upload URLs restricted strictly to `originals/<session_id>/`.
- The phone cannot access billing, inventory, or customer contact records; it functions purely as an unauthenticated wireless camera peripheral.
