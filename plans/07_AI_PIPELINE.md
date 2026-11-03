# 07_AI_PIPELINE.md

**Project:** CarVision — AI car tuning & detailing visualizer with a parts marketplace  
**Document type:** AI Architecture, Reference-Guided Inpainting (IP-Adapter / FLUX Redux), Vision LLM Taxonomy, Auto-Masking (SAM 2), Queue & Webhook Protocols, Micro-Cost Accounting  
**Version:** 2.0.0 (Deep Production Specification)  
**Status:** Normative. Implementation must strictly adhere to the reference image conditioning, mask inversion, and webhook contracts defined herein.  
**Read together with:** `01_PRD_BUSINESS_LOGIC.md` (FR-FIT, FR-STU, FR-CRD), `04_ARCHITECTURE.md` (sections 8, 11), `06_DATABASE_AND_RLS.md`.

---

## 1. PURPOSE & CRITICAL ARCHITECTURAL DIRECTIVE

### 1.1 The Fundamental Flaw of Text-Only Inpainting (The Reference Problem)
Traditional text-to-image inpainting (e.g., prompting `"car fitted with Vossen HF-5 wheels"`) is **unacceptable for automotive commerce**. If a workshop has a specific physical set of Vossen rims or an OEM+ spoiler in stock, a text prompt will generate an arbitrary, hallucinated interpretation of that wheel. When the customer visits the shop, the physical product will not match the rendered visualization, destroying trust and creating chargebacks.

**The CarVision Core Law:**
Visualizations MUST use **Dual-Conditioning / Reference-Guided Inpainting**:
1. **Input A (Spatial Conditioning):** The customer's original vehicle photograph (`session_photos.original_image_url`).
2. **Input B (Segmentation Mask):** The exact component boundary generated via Meta SAM 2 (`session_photos.sam2_mask_data`).
3. **Input C (Physical Product Reference):** The transparent, isolated studio photograph of the actual inventory part (`shop_inventory.image_url`).
4. **Input D (Dynamic Synthetic Prompt):** Procedurally synthesized text describing reflections, lighting angle, and environment matching.

The rendering model (FLUX.1 Fill conditioned with IP-Adapter / FLUX Redux visual embeddings) extracts the **exact spoke geometry, concave profile, finish color, and branding** from the reference part image and implants it into the car photo while matching ambient shadows, focal depth, and wheel well occlusion.

---

## 2. HIGH-LEVEL AI PIPELINE DATAFLOW

```
[CUSTOMER / WORKSHOP DEVICE]
  │
  ├─ 1. Captures photo (Angle 1..8)
  ├─ 2. Compresses via Canvas WebP (max 2048px, target ≤ 400KB)
  └─ 3. Uploads directly to Supabase Storage `originals/<session_id>/<angle_id>.webp`
         │
         ▼
[CARVISION NEXT.JS SERVERLESS RUNTIME]
  │
  ├─ STAGE A: VEHICLE VISION TAXONOMY & QUALITY INSPECTOR
  │    Provider: Gemini 2.5 Flash / GPT-4o-mini Vision API (Latency ~1.1s, Cost $0.0008)
  │    - Validates: Vehicle presence, blur index, lighting luma, camera angle
  │    - Extracts: Make, Model, Generation, Body Type, Dominant Color
  │
  ├─ STAGE B: COMPONENT ISOLATION & MASKING (META SAM 2)
  │    Provider: Fal.ai (`fal-ai/sam-2`) (Latency ~0.8s, Cost $0.0010)
  │    - Computes bounding-box & point-prompted segmentation for wheels, bumpers, optics, glass
  │    - Caches binary mask coordinate vector into `session_photos.sam2_mask_data`
  │    - Subsequent part changes on the same angle REUSE this cached mask ($0.00 cost)
  │
  ├─ STAGE C: ATOMIC CREDIT RESERVATION & PART FITMENT CHECK
  │    - Validates angle compatibility matrix (01_PRD 7.2)
  │    - PostgreSQL RPC `reserve_credits(user_id, shop_id, credits, gen_id)`
  │
  ├─ STAGE D: REFERENCE-GUIDED INPAINTING DISPATCH
  │    Provider: Fal.ai Queue API (`fal-ai/flux-general/fill` + Visual Reference Image)
  │    - Submits: Original photo + SAM 2 Mask + Part Reference Image + Lighting Prompt
  │    - Receives: HTTP 202 Accepted { generationId, status: "queued" }
  │
  └─ STAGE E: CLARITY 4K UPSCALING & DELIVER
       - Webhook receives 1080p raster -> dispatches fast Clarity Upscaler -> 4K output
       - Commits credits via `commit_credits(gen_id, cost_micro_usd)`
       - Broadcasts over Supabase Realtime channel `generations:{id}`
```

---

## 3. COMPONENT-BY-COMPONENT MASKING ENGINE (META SAM 2)

### 3.1 Bounding Box & Class Target Dictionary
Meta SAM 2 operates via targeted spatial bounding coordinates and positive/negative point prompts to prevent bleeding into adjacent components:

| Target Category | SAM 2 Detection Class | Masking Rule & Inversion Protection |
|---|---|---|
| `WHEELS_RIMS` | `wheel rim, wheel hub, wheel spokes` | Masks the circular rim face. **Strictly preserves:** tire rubber, brake rotor, red/yellow calipers, and inner wheel well shadows. |
| `TIRES` | `automotive tire sidewall and tread` | Masks tire rubber only, preserving rim and fender arch. |
| `FRONT_BUMPER` | `front bumper fascia, front lower valence, front lip` | Bounded by headlight lower seam, radiator grille perimeter, and front wheel arch. |
| `REAR_BUMPER` | `rear bumper fascia, lower diffuser, exhaust surrounds` | Bounded by trunk shutline, taillight lower cluster, and rear quarter panel seams. |
| `HEADLIGHTS` | `headlight glass enclosure and internal reflectors` | Left and right optical enclosures. Preserves hood and fender sheet metal. |
| `TAILLIGHTS` | `taillight assembly and rear light bar` | Rear optical clusters. Preserves trunk lid and quarter panel paint. |
| `SPOILER` | `trunk lid spoiler, rear wing, lip spoiler` | Trunk trailing edge or roofline ducktail zone. |
| `DIFFUSER` | `rear lower aerodynamic diffuser and exhaust tips` | Undertray and tailpipe cutouts. |
| `SIDE_SKIRTS` | `lower rocker panels, side sill extensions` | Bottom door threshold to floor pan sill. |
| `HOOD` | `engine hood bonnet` | Engine bay shutlines, cowl vent, and grille header. |
| `BODY_COLOR` | `all exterior painted metal and composite panels` | **Compound Inverse Mask:** Body silhouette MINUS windows, MINUS headlights, MINUS taillights, MINUS wheels, MINUS black plastic/rubber trim. |
| `WINDOW_TINT` | `front side, rear side, rear windshield, front windshield` | Transparent and semi-transparent glass panes only. Rubber gaskets preserved. |

### 3.2 The Body Wrap / Paint Mask Inversion Formula
When a user selects a full vehicle wrap or paint change (`BODY_COLOR`), inpainting must never tint the glass, black rubber door seals, chrome badges, or headlights.
The mask generator executes a pixel-level binary subtraction:

$$\mathbf{M}_{\text{paint}} = \mathbf{M}_{\text{car\_silhouette}} \setminus (\mathbf{M}_{\text{glass}} \cup \mathbf{M}_{\text{wheels}} \cup \mathbf{M}_{\text{lights}} \cup \mathbf{M}_{\text{grille}} \cup \mathbf{M}_{\text{rubber\_trim}})$$

---

## 4. REFERENCE-GUIDED INPAINTING (IP-ADAPTER & FLUX REDUX)

### 4.1 Provider Job Payload Contract
When calling the Fal.ai Queue API, the payload combines the spatial mask and the reference product image:

```typescript
export interface FalFluxReferenceInpaintPayload {
  image_url: string;               // Original car photo (WebP)
  mask_url: string;                // SAM 2 binary mask (PNG with black background, white mask)
  reference_image_urls: string[];  // Isolated part photos from shop_inventory (PNG alpha)
  prompt: string;                  // Dynamic synthetic environmental prompt
  negative_prompt: string;         // Universal artifact suppressors
  strength: number;                // 0.88 - 0.95 (Allows seamless edge blending)
  guidance_scale: number;          // 3.5 - 4.5 (FLUX optimal range)
  num_inference_steps: number;     // 28 steps (Fast preview)
  enable_safety_checker: false;    // Automotive parts are strictly G-rated
  output_format: 'webp';
}
```

### 4.2 Dynamic Procedural Prompt Synthesizer
Prompts are generated dynamically on the server by reading the original vehicle's detected lighting environment and camera angle:

```typescript
export function generateProceduralInpaintPrompt(params: {
  vehicleModel: string;
  angleId: number;
  partNames: string[];
  partBrands: string[];
  ambientColorHex: string;
  isNightMode: boolean;
}): { prompt: string; negativePrompt: string } {
  const angleDescriptions: Record<number, string> = {
    1: 'direct front center view, eye-level camera',
    2: 'front three-quarter 45-degree angle showing front bumper and left front wheel stance',
    3: 'direct left side profile showing both front and rear wheels flush with fenders',
    4: 'rear three-quarter 45-degree angle showing rear bumper, taillights and left rear wheel',
    5: 'direct rear center view showing diffuser, dual exhaust tips and trunk spoiler',
    6: 'rear three-quarter right angle showing rear bumper and right wheels',
    7: 'direct right side profile view',
    8: 'front three-quarter right angle showing front bumper and right front wheel'
  };

  const angleContext = angleDescriptions[params.angleId] ?? 'three-quarter automotive stance';
  const partsSummary = params.partNames.join(', ');

  let prompt = `commercial automotive photograph of ${params.vehicleModel}, ${angleContext}. ` +
    `Seamlessly fitted with authentic [${partsSummary}]. ` +
    `The installed components exactly match the reference product geometry, metal luster, spoke curvature, and bolt configuration. ` +
    `Cast realistic contact shadows under chassis and inside wheel arches. ` +
    `Natural specular paint reflections matching the environment (${params.ambientColorHex}). ` +
    `Factory panel shutlines, 8k resolution, extreme mechanical realism.`;

  if (params.isNightMode) {
    prompt += ` Set in a dark nocturnal urban environment with wet asphalt reflections. ` +
      `Headlights projecting volumetric light beams, glowing DRL light signatures, illuminated taillights.`;
  }

  const negativePrompt = 
    `deformed wheels, crooked rims, warped body panels, mismatched paint tones, cartoon, low resolution, ` +
    `blurry edges, floating parts, double wheels, extra exhaust pipes, changed background surroundings, ` +
    `misaligned panel gaps, oversaturated, artificial glare.`;

  return { prompt, negativePrompt };
}
```

---

## 5. VEHICLE VISION RECOGNITION (STAGE A SPECIFICATION)

The Vision LLM call (`Gemini 2.5 Flash` or `GPT-4o-mini Vision`) takes the first uploaded image and returns a typed JSON response within 1.2 seconds:

```typescript
// Zod Schema for Vision Vehicle Validation
export const vehicleInspectionSchema = z.object({
  isValidVehicle: z.boolean(),
  detectedMake: z.string().nullable(),
  detectedModel: z.string().nullable(),
  detectedGeneration: z.string().nullable(),
  detectedYearRange: z.string().nullable(),
  bodyType: z.enum(['SEDAN', 'SUV', 'COUPE', 'HATCHBACK', 'CROSSOVER', 'PICKUP', 'VAN', 'UNKNOWN']),
  detectedAngleId: z.number().int().min(1).max(8),
  dominantColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  confidence: z.number().min(0.0).max(1.0),
  qualityAssessment: z.object({
    isBlurry: z.boolean(),
    isTooDark: z.boolean(),
    isCropped: z.boolean(),
    blurScore: z.number().min(0).max(100) // Lower = sharper
  }),
  rejectionReason: z.enum(['NONE', 'NOT_A_VEHICLE', 'SEVERE_BLUR', 'EXTREME_DARKNESS']).default('NONE')
});
```

### 5.1 Automotive Taxonomy Aliasing & Normalization
To prevent catalog mismatches, the vision service normalizes regional naming conventions:
* `"Gentra"` / `"Lacetti 2"` $\to$ `Make: "Chevrolet", Model: "Gentra", Years: "2013-2024"`
* `"Malibu Premier"` / `"Malibu XL"` $\to$ `Make: "Chevrolet", Model: "Malibu 2", Years: "2019-2024"`
* `"G-Wagon"` / `"G63 AMG"` $\to$ `Make: "Mercedes-Benz", Model: "G-Class W463A", Years: "2018-2024"`
* `"LC300"` $\to$ `Make: "Toyota", Model: "Land Cruiser 300", Years: "2021-2025"`

---

## 6. CLARITY 4K RESOLUTION & UPSCALING PROTOCOL

To satisfy the sub-4-second LCP target without sending massive raw 4K rasters across cell networks:

1. **Step 1 (Fast Preview Tier):**
   - FLUX Fill renders native `1024×1024` (or `1344×768`) in ~2.2 seconds.
   - Server receives webhook, verifies HMAC signature, saves as `output_1080p_url`.
   - Realtime event emits `{ status: "PREVIEW_READY", previewUrl: output_1080p_url }`.
   - Client displays preview image immediately.

2. **Step 2 (Ultra-HD 4K Tier):**
   - Server background worker immediately pipes `output_1080p_url` into Clarity Upscaler (`fal-ai/clarity-upscaler`):
     - Scale Factor: `2.0` (Produces `2048×2048` or `2688×1536`) or `4.0` for 4K desktop screens (`3840×2160`).
     - Creativity Factor: `0.15` (Prevents hallucinating new shapes; only sharpens metallic edges, tire treads, and badge lettering).
   - Output stored as `output_4k_url`.
   - Realtime event emits `{ status: "4K_READY", highResUrl: output_4k_url }`.
   - Client crossfades smoothly from preview to 4K layer over 300 ms.

---

## 7. SELLER AI STUDIO: BACKGROUND REMOVAL & ASSET NORMALIZATION

When a workshop owner adds an exclusive physical part (`S-SEL-04`):
1. Shop photographs the item on the shop floor (e.g., a wheel rim leaning against a tire rack).
2. Client uploads photo to `catalog/raw/<shop_id>/<item_id>.webp`.
3. Server submits image to BiRefNet (`fal-ai/birefnet`):
   - Extracts foreground object boundary.
   - Discards all background clutter, tools, and concrete floor.
   - Centers product in a square `1024×1024` PNG canvas with 8% padding.
4. Output saved to `catalog/processed/<shop_id>/<item_id>.webp` (Lossless WebP with Alpha).
5. Item marked `image_processing_status = 'READY'`.
6. This clean alpha PNG becomes the **Visual Reference Image** input for all future inpainting jobs.

---

## 8. SWEPPER CRON & TIMEOUT ROLLBACK PROTOCOL

Any network glitch between Vercel and Fal.ai must never leave a user's credits trapped in `QUEUED` or `PROCESSING` state:

```typescript
// src/server/crons/sweeper.ts
export async function sweepStuckGenerations() {
  const timeoutThresholdSeconds = 90;
  
  // 1. Fetch generations stuck past timeout threshold
  const { data: stuckJobs } = await supabaseAdmin
    .from('generations')
    .select('id, session_id, credits_charged')
    .in('status', ['QUEUED', 'PROCESSING'])
    .lt('created_at', new Date(Date.now() - timeoutThresholdSeconds * 1000).toISOString());

  for (const job of stuckJobs ?? []) {
    // 2. Fetch session owner
    const { data: session } = await supabaseAdmin
      .from('car_sessions')
      .select('user_id, shop_id')
      .eq('id', job.session_id)
      .single();

    if (session) {
      // 3. Execute atomic rollback
      await supabaseAdmin.rpc('rollback_credits', {
        p_user_id: session.user_id,
        p_shop_id: session.shop_id,
        p_amount: job.credits_charged,
        p_generation_id: job.id
      });

      // 4. Update status to terminal failure
      await supabaseAdmin
        .from('generations')
        .update({ 
          status: 'FAILED_TIMEOUT', 
          error_message: 'AI provider timeout (exceeded 90s). Credits automatically refunded.' 
        })
        .eq('id', job.id);

      // 5. Broadcast rollback notification to client Realtime channel
      await supabaseAdmin.realtime.channel(`generations:${job.id}`).send({
        type: 'broadcast',
        event: 'GENERATION_FAILED_REFUNDED',
        payload: { generationId: job.id, message: 'Server timeout. Your credit was refunded.' }
      });
    }
  }
}
```
