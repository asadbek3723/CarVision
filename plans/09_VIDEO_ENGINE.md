# 09_VIDEO_ENGINE.md

**Project:** CarVision — AI car tuning & detailing visualizer with a parts marketplace  
**Document type:** Zero-Server-Cost Client-Side Video Rendering, Directional Whip-Pan Transitions, Beat-Synced Camera Shake, and Viral Outro Branding  
**Version:** 2.0.0 (Deep Production Specification)  
**Status:** Normative. Implementation must strictly execute client-side rendering without external AI video API charges.  
**Read together with:** `01_PRD_BUSINESS_LOGIC.md` (FR-VID), `02_DESIGN_SYSTEM.md`, `04_ARCHITECTURE.md` (ADR-008).

---

## 1. PURPOSE & CORE ECONOMIC DIRECTIVE

Automotive enthusiasts and tuning shops thrive on short-form viral video platforms (Instagram Reels, TikTok, YouTube Shorts). Traditional generative AI video providers (Runway Gen-3, Luma Dream Machine, Kling) cost between $0.15 and $0.35 per generation and take 30–60 seconds to process. At scale, this would bankrupt CarVision's unit economics.

**The Solution:** CarVision implements a **0$ Cloud GPU Client-Side Video Engine**:
- Renders **100% locally** in the user's browser using HTML5 Canvas (`CanvasRenderingContext2D`), Web Audio API, and native `MediaRecorder` with hardware H.264 / VP9 encoding.
- Generates an 11.0-second high-octane automotive "Tuning Reel" (1080×1920 vertical 9:16 format at 60/30 FPS).
- Eliminates "ghosting" artifacts by replacing cheap alpha dissolves with **Directional Whip-Pans, Kinetic Zoom-Punches, and 808 Bass-Drop Camera Shakes**.
- Integrates an unskippable viral CarVision outro endcard.

---

## 2. TIMELINE & KINETIC DIRECTING SCRIPT (11.0 SECONDS TOTAL)

```
0.0s              2.2s              4.4s              6.6s              8.8s              11.0s
├─── ANGLE 1 ────┼─── ANGLE 2 ────┼─── ANGLE 3 ────┼─── ANGLE 4 ────┼─── OUTRO ────────┤
│ Front Center   │ Front-Left 45° │ Left Profile   │ Rear 45° / Full│ Branded Endcard  │
│ Zoom-In Punch  │ Whip-Pan Left  │ Parallax Drift │ Snap-Cut Spin  │ Shop + CarVision │
│ [BEAT DROP 1]  │ [BEAT DROP 2]  │ [BEAT DROP 3]  │ [BEAT DROP 4]  │ Music Fadeout    │
```

### 2.1 Scene Breakdown & Transition Physics

| Scene | Time Window | Source Imagery | Kinetic Camera Motion & Transition | Audio Synced Beat Marker |
|---|---|---|---|---|
| **Scene 1: Stance Reveal** | `0.0s – 2.2s` | Angle 1 (Front Center) | Slow focal zoom-in ($1.0\times \to 1.08\times$). Dark ambient vignette. | Sub-bass riser $\to$ **Beat Drop #1 at 1.8s** (Camera shake 8px). |
| **Transition 1 $\to$ 2** | `2.1s – 2.2s` | Angle 1 $\to$ Angle 2 | **Whip-Pan Left:** 120ms directional motion blur to simulate rapid head turn. | Hard 808 snare strike. |
| **Scene 2: Front 45° Stance** | `2.2s – 4.4s` | Angle 2 (Front-Left 45°) | Dynamic drift toward left wheel assembly. Wheel metallic reflections highlighted. | Rolling hi-hat cadence $\to$ **Beat Drop #2 at 3.6s**. |
| **Transition 2 $\to$ 3** | `4.3s – 4.4s` | Angle 2 $\to$ Angle 3 | **Kinetic Zoom-Punch:** Quick zoom-out ($0.95\times$) snap-cut to side profile. | Heavy kick drum. |
| **Scene 3: Side Silhouette** | `4.4s – 6.6s` | Angle 3 (Left 90°) | 3D Parallax: Wheels and side skirt scale faster than the background pavement. | Bassline groove $\to$ **Beat Drop #3 at 5.4s**. |
| **Transition 3 $\to$ 4** | `6.5s – 6.6s` | Angle 3 $\to$ Angle 4 | **Whip-Pan Counter-Clockwise:** Simulates camera speeding around the rear bumper. | Cymbal crash. |
| **Scene 4: Rear & Aero** | `6.6s – 8.8s` | Angle 4 (Rear-Left 45°) or Angle 5 | Low-angle perspective drift highlighting spoiler and rear diffuser tips. | Climax drum roll $\to$ **Final Beat Drop at 8.6s**. |
| **Scene 5: Branded Outro** | `8.8s – 11.0s` | Procedural Endcard | Pure Obsidian Black (`#070709`), cyan particles, glowing vector logo, workshop attribution. | Reverb tail decay and sub-bass drop. |

---

## 3. ANTI-GHOSTING TRANSITION ALGORITHMS

Fading two car photos over each other creates an amateur "double exposure" ghost effect. The engine strictly utilizes two procedural transition techniques:

### 3.1 Directional Whip-Pan Motion Blur
During the 120 ms transition window ($t \in [t_0, t_0 + 0.12]$):
```typescript
export function renderWhipPanTransition(
  ctx: CanvasRenderingContext2D,
  currentImg: ImageBitmap,
  nextImg: ImageBitmap,
  progress: number, // 0.0 to 1.0 over 120ms
  width: number,
  height: number
) {
  ctx.save();
  // Cubic ease-in-out acceleration
  const ease = progress < 0.5 
    ? 4 * progress * progress * progress 
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;

  const offset = ease * width;

  // Apply horizontal motion blur via directional displacement
  ctx.filter = `blur(${Math.sin(progress * Math.PI) * 18}px)`;

  // Draw exiting image shifting left
  ctx.drawImage(currentImg, -offset, 0, width, height);

  // Draw entering image arriving from right
  ctx.drawImage(nextImg, width - offset, 0, width, height);

  ctx.restore();
}
```

### 3.2 Procedural Camera Shake Formula
On beat drop timestamps ($t_{\text{drop}} \in [1.8, 3.6, 5.4, 7.2, 8.6]$):
$$\Delta x(t) = A \cdot e^{-\lambda (t - t_{\text{drop}})} \cdot \sin(2\pi f (t - t_{\text{drop}}))$$
$$\Delta y(t) = A \cdot e^{-\lambda (t - t_{\text{drop}})} \cdot \cos(2\pi f (t - t_{\text{drop}}))$$

Where:
* Amplitude $A = 10.0\text{ px}$
* Damping factor $\lambda = 16.0$ (dissipates within 180 ms)
* Shake frequency $f = 32\text{ Hz}$

---

## 4. ZERO-DEPENDENCY BROWSER ENCODING ENGINE

To prevent memory leaks and mobile Safari crashes, the engine uses **native browser media streams** with direct audio stream muxing:

```typescript
// src/features/video/lib/reel-renderer.ts
export async function renderCarReel(
  images: ImageBitmap[],
  audioUrl: string,
  metadata: { shopName?: string; isWatermarked: boolean }
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('2D context failed');

  // 1. Setup AudioContext and AudioDestinationStream
  const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const audioResponse = await fetch(audioUrl);
  const audioBuffer = await audioCtx.decodeAudioData(await audioResponse.arrayBuffer());
  
  const sourceNode = audioCtx.createBufferSource();
  sourceNode.buffer = audioBuffer;
  const destination = audioCtx.createMediaStreamDestination();
  sourceNode.connect(destination);

  // 2. Capture Combined Video + Audio MediaStream
  const videoStream = canvas.captureStream(60); // 60 FPS target
  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...destination.stream.getAudioTracks()
  ]);

  // 3. Initialize MediaRecorder with Hardware Acceleration
  const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
    ? 'video/mp4;codecs=avc1'
    : 'video/webm;codecs=vp9';

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 8_500_000 // 8.5 Mbps High Definition
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  // 4. Execute Render Loop & Start Recording
  recorder.start();
  sourceNode.start(0);

  await executeTimelineAnimation(ctx, images, canvas.width, canvas.height, metadata);

  recorder.stop();
  sourceNode.stop();
  audioCtx.close();

  return new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });
}
```

---

## 5. HARDWARE PROFILES & MEMORY SAFEGUARDS

Processing four to eight 4K images on low-tier mobile devices will trigger browser tab crashes (Out-Of-Memory). The engine strictly enforces resolution scaling:

| Device Hardware Tier | Detection Criteria | Reel Canvas Resolution | Target FPS | Bitrate | Source Image Tier |
|---|---|---|---|---|---|
| **High Tier (Modern PC/iPhone)** | $\ge 6\text{ cores}$ & $\ge 6\text{ GB RAM}$ | $1080 \times 1920$ | 60 FPS | 8.5 Mbps | `output_1080p_url` (Not raw 4K!) |
| **Mid Tier (Standard Android)** | 4–6 cores & 3–4 GB RAM | $1080 \times 1920$ | 30 FPS | 5.5 Mbps | `output_1080p_url` |
| **Budget Tier (Old Tablets)** | $< 4\text{ cores}$ or $< 3\text{ GB RAM}$ | $720 \times 1280$ | 30 FPS | 3.2 Mbps | Scaled 720p thumbnails |

**Memory Golden Rule:** The video engine NEVER loads raw 4K (`3840×2160`) image rasters into canvas memory. It strictly fetches the `output_1080p_url` tier, reducing VRAM consumption by 75% while maintaining flawless clarity on phone screens.

---

## 6. OUTRO ENDCARD & VIRAL WATERMARK SPECIFICATION

The final 2.2 seconds ($t \in [8.8\text{s}, 11.0\text{s}]$) feature the CarVision attribution endcard:

```typescript
export function renderBrandedOutro(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  shopName: string | undefined,
  progress: number // 0.0 to 1.0 over outro duration
) {
  // Deep Carbon Background with soft radial cyan glow
  ctx.fillStyle = '#070709';
  ctx.fillRect(0, 0, width, height);

  // Radiant cyan ambient back-light
  const gradient = ctx.createRadialGradient(width / 2, height / 2 - 120, 20, width / 2, height / 2 - 120, 480);
  gradient.addColorStop(0, 'rgba(25, 211, 255, 0.22)');
  gradient.addColorStop(1, 'rgba(7, 7, 9, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Animated CarVision Wordmark
  ctx.textAlign = 'center';
  ctx.font = '700 72px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#F8FAFC';
  ctx.fillText('CARVISION', width / 2, height / 2 - 80);

  ctx.font = '500 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#19D3FF';
  ctx.fillText('AI AUTOMOTIVE TUNING', width / 2, height / 2 - 25);

  // Subtitle / Attribution
  ctx.font = '400 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#94A3B8';
  if (shopName) {
    ctx.fillText(`MODIFIED BY ${shopName.toUpperCase()}`, width / 2, height / 2 + 80);
  } else {
    ctx.fillText('VISUALIZE YOUR BUILD ON CARVISION', width / 2, height / 2 + 80);
  }

  // Domain Call-to-Action
  ctx.font = '600 26px "Space Grotesk", monospace';
  ctx.fillStyle = '#F8FAFC';
  ctx.fillText('carvision.app', width / 2, height / 2 + 160);
}
```
