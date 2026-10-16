# CarVision — AI-Powered Automotive Tuning & Detailing Visualizer

CarVision is a state-of-the-art AI-powered platform for auto tuning and detailing workshops, enabling customers to visualize modifications on their exact vehicle in photorealistic 4K before any physical work begins.

## Key Features
- **Smart Guided Camera:** 8-angle 3D wireframe overlay with real-time gyroscope guidance and "Green Lock" auto-shutter.
- **Dual-Conditioning AI Visualizer:** Inpaints real workshop inventory parts (wheels, bumpers, lights, diffusers) using Meta SAM 2 spatial masking and FLUX Fill inpainting.
- **Dynamic Cashier & 3% Escrow:** Real-time parts + labor breakdown with 3% deposit booking system to prevent workshop leakage.
- **Client-Side Video Reels:** 0$ cloud cost 60 FPS vertical video generator synchronized to 808 bass drops with viral outro endcards.
- **8-Language i18n & Arabic RTL:** Full support for Uzbek, Russian, English, Arabic (RTL), Turkish, Kazakh, Kyrgyz, and Tajik.

## Tech Stack
- **Framework:** Next.js 15 (App Router, TypeScript strict)
- **Styling:** Tailwind CSS (Carbon Dark `#0A0B0F` design tokens, logical CSS)
- **Components:** shadcn/ui primitives + Framer Motion
- **Database & Auth:** Supabase (PostgreSQL with RLS, Storage, Realtime)
- **AI Pipeline:** Fal.ai (FLUX.1 Fill + Meta SAM 2 + 4K Upscale)
- **PWA:** Serwist standalone service worker
