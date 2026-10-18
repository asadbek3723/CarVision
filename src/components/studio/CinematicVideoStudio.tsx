'use client';

import * as React from 'react';
import {
  Play,
  Pause,
  Download,
  Film,
  Volume2,
  VolumeX,
  Sparkles,
  Check,
  X,
  Smartphone,
  Monitor,
  Music,
  RefreshCw,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';
import type { VeloceProduct } from '@/domain/veloce-catalog';

export interface CinematicAngleFrame {
  id: string;
  label: string;
  beforeUrl: string;
  afterUrl: string;
}

interface CinematicVideoStudioProps {
  isOpen: boolean;
  onClose: () => void;
  angles: CinematicAngleFrame[];
  selectedParts: VeloceProduct[];
  carName?: string;
}

type AspectMode = '9:16' | '16:9';
type TrackId = 'phonk' | 'luxury' | 'synth';

interface MusicTrack {
  id: TrackId;
  name: string;
  bpm: number;
  sub: string;
}

const MUSIC_TRACKS: MusicTrack[] = [
  { id: 'phonk', name: 'Drift Phonk Bass', bpm: 132, sub: 'Kuchli 808 bass va tez dinamik ritm' },
  { id: 'luxury', name: 'Luxury Showroom Beat', bpm: 114, sub: 'Sokinsifat premium trap ritm' },
  { id: 'synth', name: 'Night Turbo Synth', bpm: 124, sub: 'Kinematik elektron atmosfera' },
];

const DURATION_SEC = 10.0;

interface BokehParticle {
  x: number;
  y: number;
  r: number;
  speedY: number;
  speedX: number;
  alpha: number;
}

const BOKEH_PARTICLES: BokehParticle[] = Array.from({ length: 34 }, (_, i) => ({
  x: ((i * 37) % 100) / 100,
  y: ((i * 61) % 100) / 100,
  r: 1.5 + (i % 4) * 1.4,
  speedY: 0.025 + (i % 5) * 0.01,
  speedX: ((i % 3) - 1) * 0.012,
  alpha: 0.18 + (i % 5) * 0.1,
}));

export function CinematicVideoStudio({
  isOpen,
  onClose,
  angles,
  selectedParts,
  carName = 'CarVision 4K Tuning Loyihasi',
}: CinematicVideoStudioProps) {
  const [aspect, setAspect] = React.useState<AspectMode>('9:16');
  const [trackId, setTrackId] = React.useState<TrackId>('phonk');
  const [isEnhancing, setIsEnhancing] = React.useState(true);
  const [enhanceProgress, setEnhanceProgress] = React.useState(0);
  const [liveAiBadge, setLiveAiBadge] = React.useState<string>('4K Neural Studio');
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [isExportingVideo, setIsExportingVideo] = React.useState(false);
  const [exportProgress, setExportProgress] = React.useState(0);
  const [exportComplete, setExportComplete] = React.useState(false);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const loadedBeforeImagesRef = React.useRef<HTMLImageElement[]>([]);
  const loadedAfterImagesRef = React.useRef<HTMLImageElement[]>([]);
  const loadedPartImagesRef = React.useRef<HTMLImageElement[]>([]);
  const rafRef = React.useRef<number | null>(null);
  const startTimeRef = React.useRef<number>(0);

  // Web Audio Context & MediaStreamDestination for muxing real music into exported video
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const audioDestRef = React.useRef<MediaStreamAudioDestinationNode | null>(null);
  const beatTimerRef = React.useRef<number | null>(null);

  const activeTrack = React.useMemo(
    () => MUSIC_TRACKS.find((t) => t.id === trackId) ?? MUSIC_TRACKS[0]!,
    [trackId]
  );

  // Initialize / get Web Audio graph with MediaStreamDestination
  const ensureAudioGraph = React.useCallback(() => {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioCtxRef.current) {
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;
      try {
        audioDestRef.current = ctx.createMediaStreamDestination();
      } catch {
        audioDestRef.current = null;
      }
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return {
      ctx: audioCtxRef.current,
      dest: audioDestRef.current,
    };
  }, []);

  // Preload all angle images & call /api/v1/video-edit for live AI 4K restoration
  React.useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      return;
    }

    setIsEnhancing(true);
    setEnhanceProgress(10);
    setExportComplete(false);

    let cancelled = false;

    const loadImg = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img);
        img.src = src;
      });

    const prepare = async () => {
      let workingAngles: CinematicAngleFrame[] =
        angles.length > 0
          ? angles
          : [
              {
                id: 'front-left',
                label: 'Oldi-Chap 45°',
                beforeUrl: '/assets/hero-car-1-Bi4wq3bK.jpg',
                afterUrl: '/images/studio/studio_coupe_tuned.jpg',
              },
            ];

      // Call server AI Video-Edit API (activates FAL_KEY / GEMINI_API_KEY / OPENAI_API_KEY automatically)
      try {
        setEnhanceProgress(28);
        const res = await fetch('/api/v1/video-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            angles: workingAngles,
            parts: selectedParts.map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category || 'Wheels',
              spec: p.spec || '',
              image: p.image,
              angleImage: p.angleImage,
              swatch: p.swatch,
            })),
            trackId,
          }),
        });
        const data = await res.json();
        if (!cancelled && data.success && Array.isArray(data.angles)) {
          workingAngles = data.angles;
          if (data.liveAiActive && data.providerUsed) {
            setLiveAiBadge(`AI: ${String(data.providerUsed).toUpperCase()}`);
          }
        }
      } catch {
        // Continue with client-side 4K studio frames
      }

      const beforeList: HTMLImageElement[] = [];
      const afterList: HTMLImageElement[] = [];

      for (let i = 0; i < workingAngles.length; i++) {
        const item = workingAngles[i]!;
        const [bImg, aImg] = await Promise.all([
          loadImg(item.beforeUrl),
          loadImg(item.afterUrl),
        ]);
        beforeList.push(bImg);
        afterList.push(aImg);
        if (!cancelled) {
          setEnhanceProgress(40 + Math.round(((i + 1) / workingAngles.length) * 50));
        }
      }

      const partImgs = await Promise.all(
        selectedParts.slice(0, 4).map((p) => loadImg(p.image || '/images/garage/bbs_wheel.jpg'))
      );

      if (cancelled) return;
      loadedBeforeImagesRef.current = beforeList;
      loadedAfterImagesRef.current = afterList;
      loadedPartImagesRef.current = partImgs;

      setTimeout(() => {
        if (cancelled) return;
        setEnhanceProgress(100);
        setIsEnhancing(false);
        startTimeRef.current = performance.now();
        setCurrentTime(0);
        setIsPlaying(true);
      }, 350);
    };

    prepare();

    return () => {
      cancelled = true;
    };
  }, [isOpen, angles, selectedParts, trackId]);

  // Multi-Layered Procedural Web Audio Synthesizer (808 Sub-Bass + Snare + Hi-Hat + Lead Synth)
  // Connects to BOTH speakers AND MediaStreamAudioDestinationNode so exported video has real sound!
  const triggerStudioBeatStep = React.useCallback(
    (sixteenthStep: number, elapsedSec: number, forceSoundForExport = false) => {
      if ((isMuted && !forceSoundForExport) || !isOpen) return;
      try {
        const graph = ensureAudioGraph();
        if (!graph) return;
        const { ctx, dest } = graph;
        const now = ctx.currentTime;

        const connectOut = (node: AudioNode) => {
          if (!isMuted) {
            node.connect(ctx.destination);
          }
          if (dest) {
            node.connect(dest);
          }
        };

        const isLaserDrop = elapsedSec >= 2.35 && elapsedSec <= 2.95;
        const isAfterDrop = elapsedSec >= 2.4;

        // 1. Laser Riser / Impact Sweep at 2.4s
        if (Math.abs(elapsedSec - 2.4) < 0.14) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(32, now + 0.48);
          gain.gain.setValueAtTime(0.38, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc.connect(gain);
          connectOut(gain);
          osc.start(now);
          osc.stop(now + 0.52);
        }

        // 2. 808 Sub-Bass Kick (Every 4 sixteenth steps, or double-kick before transitions)
        if (sixteenthStep % 4 === 0 || (isAfterDrop && sixteenthStep % 8 === 6)) {
          const kickOsc = ctx.createOscillator();
          const kickGain = ctx.createGain();
          kickOsc.type = 'sine';
          const startFreq = isAfterDrop ? 155 : 115;
          kickOsc.frequency.setValueAtTime(startFreq, now);
          kickOsc.frequency.exponentialRampToValueAtTime(36, now + 0.24);

          kickGain.gain.setValueAtTime(isAfterDrop ? 0.34 : 0.18, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

          kickOsc.connect(kickGain);
          connectOut(kickGain);
          kickOsc.start(now);
          kickOsc.stop(now + 0.28);
        }

        // 3. Crisp Trap Hi-Hat ticks (Every 2 sixteenth steps after drop)
        if (isAfterDrop && sixteenthStep % 2 === 0) {
          const hatOsc = ctx.createOscillator();
          const hatGain = ctx.createGain();
          hatOsc.type = 'square';
          hatOsc.frequency.setValueAtTime(6800, now);
          hatGain.gain.setValueAtTime(0.025, now);
          hatGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.045);
          hatOsc.connect(hatGain);
          connectOut(hatGain);
          hatOsc.start(now);
          hatOsc.stop(now + 0.05);
        }

        // 4. Lead Phonk Cowbell / Luxury Pluck / Synth Arpeggio
        if (isAfterDrop && (sixteenthStep % 2 === 1 || isLaserDrop)) {
          const leadOsc = ctx.createOscillator();
          const leadGain = ctx.createGain();
          leadOsc.type =
            trackId === 'phonk' ? 'square' : trackId === 'luxury' ? 'triangle' : 'sawtooth';

          const melody =
            trackId === 'phonk'
              ? [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 493.88, 523.25]
              : trackId === 'luxury'
                ? [392.0, 466.16, 523.25, 587.33, 523.25, 466.16, 392.0, 349.23]
                : [440.0, 554.37, 659.25, 880.0, 659.25, 554.37, 493.88, 440.0];

          const noteFreq = melody[sixteenthStep % melody.length] || 523.25;
          leadOsc.frequency.setValueAtTime(noteFreq, now);

          leadGain.gain.setValueAtTime(0.075, now);
          leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

          leadOsc.connect(leadGain);
          connectOut(leadGain);
          leadOsc.start(now);
          leadOsc.stop(now + 0.17);
        }
      } catch {
        // Ignore audio context restrictions
      }
    },
    [isMuted, isOpen, trackId, ensureAudioGraph]
  );

  // Beat scheduler while playing
  React.useEffect(() => {
    if (!isPlaying || isEnhancing || !isOpen) {
      if (beatTimerRef.current) {
        window.clearInterval(beatTimerRef.current);
        beatTimerRef.current = null;
      }
      return;
    }

    let step = 0;
    const sixteenthMs = Math.round((60 / activeTrack.bpm / 4) * 1000);
    beatTimerRef.current = window.setInterval(() => {
      const elapsed = ((performance.now() - startTimeRef.current) / 1000) % DURATION_SEC;
      triggerStudioBeatStep(step, elapsed, false);
      step += 1;
    }, sixteenthMs);

    return () => {
      if (beatTimerRef.current) {
        window.clearInterval(beatTimerRef.current);
        beatTimerRef.current = null;
      }
    };
  }, [isPlaying, isEnhancing, isOpen, activeTrack.bpm, triggerStudioBeatStep]);

  // Master 4-Act Scripted Frame Renderer at timestamp `t` (0.0s .. 10.0s)
  const renderFrameAtTime = React.useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
      ctx.save();
      ctx.fillStyle = '#06070B';
      ctx.fillRect(0, 0, w, h);

      const beforeImgs = loadedBeforeImagesRef.current;
      const afterImgs = loadedAfterImagesRef.current;
      const partImgs = loadedPartImagesRef.current;

      const beatPeriod = 60 / activeTrack.bpm;
      const beatPhase = (t % beatPeriod) / beatPeriod;
      // Exponential ease-out punch on every beat
      const beatPulse = Math.exp(-beatPhase * 6.0);

      const drawGradedFrame = (
        img: HTMLImageElement | undefined,
        zoom: number,
        panX: number,
        panY: number,
        isTunedGrade: boolean
      ) => {
        if (!img || !img.complete || img.naturalWidth === 0) return;
        ctx.save();
        ctx.filter = isTunedGrade
          ? 'contrast(1.18) saturate(1.24) brightness(1.05)'
          : 'contrast(1.05) saturate(0.82) brightness(0.92)';

        const imgRatio = img.naturalWidth / img.naturalHeight;
        const canvasRatio = w / h;
        let drawW = w;
        let drawH = h;
        if (imgRatio > canvasRatio) {
          drawH = h;
          drawW = h * imgRatio;
        } else {
          drawW = w;
          drawH = w / imgRatio;
        }

        const finalW = drawW * zoom;
        const finalH = drawH * zoom;
        const dx = (w - finalW) / 2 + panX * w;
        const dy = (h - finalH) / 2 + panY * h;

        ctx.drawImage(img, dx, dy, finalW, finalH);
        ctx.filter = 'none';
        ctx.restore();
      };

      let stageBadge = '1-SAHNA · ZAVOD HOLATI (OLDIN)';
      let isTunedStage = false;

      // =======================================================================
      // ACT 1 (0.0s - 2.35s): STOCK INTRO (Cold Grade + Slow Dolly Zoom)
      // =======================================================================
      if (t < 2.35) {
        const idx = t < 1.2 ? 0 : Math.min(1, beforeImgs.length - 1);
        const segP = (t % 1.2) / 1.2;
        const easeP = 1 - Math.pow(1 - segP, 3);
        const zoom = 1.03 + easeP * 0.07;
        const panX = (easeP - 0.5) * 0.035;
        drawGradedFrame(beforeImgs[idx] || beforeImgs[0], zoom, panX, 0, false);
        stageBadge = `OLDINGI HOLAT · ${(angles[idx]?.label || 'Zavod').toUpperCase()}`;
      }
      // =======================================================================
      // ACT 2 (2.35s - 2.95s): AI GOLDEN LASER SCANLINE WIPE (Before -> After!)
      // =======================================================================
      else if (t >= 2.35 && t < 2.95) {
        isTunedStage = true;
        const wipeP = Math.min(1, Math.max(0, (t - 2.35) / 0.6));
        const shakeX = wipeP > 0.85 ? Math.sin(t * 90) * 0.008 : 0;
        const zoom = 1.06 + beatPulse * 0.04;

        // Draw Stock (Before) full frame
        drawGradedFrame(beforeImgs[0], zoom, shakeX, 0, false);

        // Clip & reveal 4K Tuned (After) behind the sweeping Golden Laser
        const laserX = w * wipeP;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, laserX, h);
        ctx.clip();
        drawGradedFrame(afterImgs[0], zoom, shakeX, 0, true);
        ctx.restore();

        // Draw Glowing Golden AI Scanline Beam
        const beamGrad = ctx.createLinearGradient(laserX - 36, 0, laserX + 12, 0);
        beamGrad.addColorStop(0, 'rgba(212, 174, 98, 0)');
        beamGrad.addColorStop(0.75, 'rgba(212, 174, 98, 0.85)');
        beamGrad.addColorStop(0.95, '#FFF8E1');
        beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(laserX - 36, 0, 48, h);

        stageBadge = 'AI 4K TRANSFORMATSIYA · DETALLAR O‘RNATILMOQDA';
      }
      // =======================================================================
      // ACT 3 (2.95s - 8.2s): 5-ANGLE BEAT-SYNCED TUNED SHOWCASE
      // =======================================================================
      else if (t >= 2.95 && t < 8.2) {
        isTunedStage = true;
        const showcaseDur = 8.2 - 2.95;
        const localT = t - 2.95;
        const numAngles = Math.max(1, afterImgs.length);
        const segDur = showcaseDur / numAngles;
        const angleIdx = Math.min(numAngles - 1, Math.floor(localT / segDur));
        const segP = (localT % segDur) / segDur;

        // Speed-ramp ease-out cubic + beat kick zoom punch
        const easeOut = 1 - Math.pow(1 - segP, 3);
        const zoom = 1.05 + easeOut * 0.09 + beatPulse * 0.038;
        const dir = angleIdx % 2 === 0 ? 1 : -1;
        const panX = dir * (easeOut - 0.5) * 0.055;
        const panY = (0.5 - easeOut) * 0.02;

        drawGradedFrame(afterImgs[angleIdx] || afterImgs[0], zoom, panX, panY, true);

        // Cut transition flash at the start of each new angle
        if (segP < 0.12) {
          const cutFlash = (1 - segP / 0.12) * 0.35;
          ctx.fillStyle = `rgba(255, 240, 200, ${cutFlash})`;
          ctx.fillRect(0, 0, w, h);
        }

        stageBadge = `4K TUNING · ${(angles[angleIdx]?.label || 'Studiya Rakursi').toUpperCase()}`;
      }
      // =======================================================================
      // ACT 4 (8.2s - 10.0s): SPLIT BEFORE / AFTER COMPARISON FINALE
      // =======================================================================
      else {
        isTunedStage = true;
        const finP = (t - 8.2) / 1.8;
        const splitRatio = 0.5 + Math.sin(finP * Math.PI * 2) * 0.22;

        // Full Tuned After
        drawGradedFrame(afterImgs[0], 1.05, 0, 0, true);

        // Clipped Stock Before on start side
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, w * splitRatio, h);
        ctx.clip();
        drawGradedFrame(beforeImgs[0], 1.05, 0, 0, false);
        ctx.restore();

        // Golden Split Divider Line
        ctx.save();
        ctx.strokeStyle = '#D4AE62';
        ctx.lineWidth = Math.max(3, w * 0.004);
        ctx.shadowColor = '#D4AE62';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(w * splitRatio, 0);
        ctx.lineTo(w * splitRatio, h);
        ctx.stroke();
        ctx.restore();

        stageBadge = 'OLDIN VA KEYIN · JONLI TAQQOSLASH';
      }

      // =======================================================================
      // CINEMA ATMOSPHERE OVERLAYS (Anamorphic Glow + Floating Gold Bokeh)
      // =======================================================================
      const vignette = ctx.createRadialGradient(
        w * 0.5,
        h * 0.44,
        w * 0.18,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.76
      );
      vignette.addColorStop(0, isTunedStage ? 'rgba(212, 174, 98, 0.08)' : 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(5, 6, 10, 0.74)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      // Floating Golden Studio Bokeh Particles during Tuned Stage
      if (isTunedStage) {
        ctx.save();
        for (const p of BOKEH_PARTICLES) {
          const px = ((p.x + t * p.speedX + 10) % 1) * w;
          const py = ((p.y - t * p.speedY + 10) % 1) * h;
          const radius = p.r * (1 + beatPulse * 0.45);
          ctx.fillStyle = `rgba(212, 174, 98, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Bottom Cinema Gradient for Crisp Typography
      const bottomGrad = ctx.createLinearGradient(0, h * 0.58, 0, h);
      bottomGrad.addColorStop(0, 'rgba(6, 7, 11, 0)');
      bottomGrad.addColorStop(1, 'rgba(6, 7, 11, 0.94)');
      ctx.fillStyle = bottomGrad;
      ctx.fillRect(0, h * 0.58, w, h * 0.42);

      // Top Status Pill
      const pad = Math.round(w * 0.045);
      ctx.save();
      ctx.fillStyle = isTunedStage ? 'rgba(212, 174, 98, 0.94)' : 'rgba(16, 19, 27, 0.86)';
      const pillH = Math.round(Math.max(30, h * 0.042));
      const pillW = Math.min(w - pad * 2, Math.round(w * 0.68));
      ctx.beginPath();
      ctx.roundRect(pad, pad, pillW, pillH, pillH / 2);
      ctx.fill();

      ctx.fillStyle = isTunedStage ? '#08090D' : '#EDE8DF';
      const pillFont = Math.max(11, Math.round(pillH * 0.42));
      ctx.font = `800 ${pillFont}px sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText(stageBadge, pad + 16, pad + pillH / 2);
      ctx.restore();

      // Bottom Fitted Parts Dock & Build Title
      if (isTunedStage && selectedParts.length > 0) {
        const titleFont = Math.max(17, Math.round(w * 0.038));
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `800 ${titleFont}px sans-serif`;
        ctx.fillText(carName, pad, h - pad - 76);

        const subFont = Math.max(12, Math.round(w * 0.024));
        ctx.fillStyle = '#D4AE62';
        ctx.font = `700 ${subFont}px sans-serif`;
        const namesLine = selectedParts.map((p) => p.name).join('  •  ');
        ctx.fillText(namesLine.slice(0, 62), pad, h - pad - 48);

        const thumbSize = Math.round(Math.max(40, w * 0.082));
        partImgs.forEach((pImg, idx) => {
          if (!pImg || !pImg.complete || pImg.naturalWidth === 0) return;
          const tx = pad + idx * (thumbSize + 12);
          const ty = h - pad - thumbSize + 4;
          ctx.save();
          ctx.fillStyle = '#12151E';
          ctx.beginPath();
          ctx.roundRect(tx, ty, thumbSize, thumbSize, 10);
          ctx.fill();
          ctx.clip();
          ctx.drawImage(pImg, tx, ty, thumbSize, thumbSize);
          ctx.restore();
        });
      }

      ctx.restore();
    },
    [activeTrack.bpm, angles, carName, selectedParts]
  );

  // Main 60FPS playback loop
  React.useEffect(() => {
    if (!isOpen || isEnhancing) return;

    const loop = (now: number) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          let t = currentTime;
          if (isPlaying) {
            t = ((now - startTimeRef.current) / 1000) % DURATION_SEC;
            setCurrentTime(t);
          }
          renderFrameAtTime(ctx, canvas.width, canvas.height, t);
        }
      }
      if (isPlaying) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen, isEnhancing, isPlaying, currentTime, renderFrameAtTime]);

  // Export & Download Real Video File WITH Embedded Web Audio Track
  const handleDownloadVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isExportingVideo) return;

    setIsExportingVideo(true);
    setExportProgress(2);
    setExportComplete(false);

    try {
      const graph = ensureAudioGraph();
      const canvasStream = canvas.captureStream(60);
      const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

      if (graph?.dest) {
        const audioTracks = graph.dest.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          combinedTracks.push(...audioTracks);
        }
      }

      const combinedStream = new MediaStream(combinedTracks);

      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      const supportedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      const recorder = supportedMime
        ? new MediaRecorder(combinedStream, {
            mimeType: supportedMime,
            videoBitsPerSecond: 8_000_000,
          })
        : new MediaRecorder(combinedStream);

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const exportDonePromise = new Promise<void>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: supportedMime || 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const ext = supportedMime.includes('mp4') ? 'mp4' : 'webm';
          a.href = url;
          a.download = `carvision-4k-edit-${Date.now()}.${ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          resolve();
        };
      });

      recorder.start(100);

      // Record full 10-second scripted edit with synchronized beat audio
      const fps = 30;
      const totalFrames = DURATION_SEC * fps;
      const sixteenthSec = 60 / activeTrack.bpm / 4;
      let lastBeatStep = -1;
      const ctx = canvas.getContext('2d');

      for (let f = 0; f <= totalFrames; f++) {
        const simTime = (f / totalFrames) * DURATION_SEC;
        if (ctx) {
          renderFrameAtTime(ctx, canvas.width, canvas.height, simTime);
        }

        const currentBeatStep = Math.floor(simTime / sixteenthSec);
        if (currentBeatStep !== lastBeatStep) {
          lastBeatStep = currentBeatStep;
          triggerStudioBeatStep(currentBeatStep, simTime, true);
        }

        setExportProgress(Math.round((f / totalFrames) * 100));
        await new Promise((r) => setTimeout(r, 18));
      }

      recorder.stop();
      await exportDonePromise;
      setExportComplete(true);
    } catch {
      handleDownloadPhoto();
    } finally {
      setIsExportingVideo(false);
    }
  };

  // Download 4K Enhanced Tuned Photo
  const handleDownloadPhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      renderFrameAtTime(ctx, canvas.width, canvas.height, 4.2);
    }
    const dataUrl = canvas.toDataURL('image/jpeg', 0.96);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `carvision-4k-photo-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  const canvasWidth = aspect === '9:16' ? 720 : 1280;
  const canvasHeight = aspect === '9:16' ? 1280 : 720;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050609]/95 p-4 md:p-8 backdrop-blur-2xl overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-[32px] bg-[#0C0E15] p-5 md:p-8 shadow-[0_32px_95px_rgba(0,0,0,0.9)]">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#D4AE62]/15 text-[#D4AE62]">
              <Film className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg md:text-xl font-extrabold text-white">
                  AI Video Edit Studio
                </h2>
                <span className="rounded-full bg-[#D4AE62]/15 px-3 py-0.5 text-[11px] font-bold text-[#D4AE62]">
                  {liveAiBadge}
                </span>
              </div>
              <p className="text-xs text-[#A69F92]">
                4-Bosqichli Ssenariy: Zavod holati → AI Lazer Skaner → 5 Rakurs Beat-Sync → Taqqoslash
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.06] text-white/70 hover:bg-white/[0.12] hover:text-white transition cursor-pointer"
            aria-label="Yopish"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Studio Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_1fr] items-center">
          {/* Left: Video Canvas Player */}
          <div className="flex flex-col items-center justify-center">
            <div
              className={`relative overflow-hidden rounded-[28px] bg-[#06070B] shadow-[0_28px_70px_rgba(0,0,0,0.85)] transition-all duration-300 ${
                aspect === '9:16'
                  ? 'w-full max-w-[310px] aspect-[9/16]'
                  : 'w-full aspect-[16/9]'
              }`}
            >
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="h-full w-full object-cover"
              />

              {/* AI Enhancement Loading Overlay */}
              {isEnhancing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#06070B]/92 p-6 text-center backdrop-blur-xl">
                  <Sparkles className="h-11 w-11 text-[#D4AE62] animate-spin mb-4" />
                  <p className="text-sm font-bold text-white">
                    AI barcha rakurslarni 4K aniqlikda tiniqlashtirmoqda...
                  </p>
                  <p className="mt-1 text-xs text-[#A69F92]">
                    Aynan shu joy va shu mashina musiqa ritmiga moslashtirilmoqda ({enhanceProgress}%)
                  </p>
                  <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-[#D4AE62] transition-all duration-300"
                      style={{ width: `${enhanceProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Playback Controls Overlay */}
              {!isEnhancing && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4">
                  <button
                    onClick={() => {
                      ensureAudioGraph();
                      if (!isPlaying) {
                        startTimeRef.current = performance.now() - currentTime * 1000;
                      }
                      setIsPlaying(!isPlaying);
                    }}
                    className="grid h-10 w-10 place-items-center rounded-full bg-[#D4AE62] text-black shadow-lg cursor-pointer"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>

                  {/* Interactive Scrubber Timeline */}
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = Math.max(
                        0,
                        Math.min(1, (e.clientX - rect.left) / rect.width)
                      );
                      const nextT = ratio * DURATION_SEC;
                      setCurrentTime(nextT);
                      startTimeRef.current = performance.now() - nextT * 1000;
                    }}
                    className="flex-1 py-2 cursor-pointer"
                  >
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                      <div
                        className="h-full bg-[#D4AE62] transition-all duration-75"
                        style={{ width: `${(currentTime / DURATION_SEC) * 100}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Controls, Script Stages & Download Actions */}
          <div className="space-y-5">
            {/* Script Stages Indicator */}
            <div className="rounded-2xl bg-[#131722] p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#D4AE62]">
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  <span>AVTOMATIK VIDEO SSENARIYSI</span>
                </span>
                <span className="font-mono text-white/70">
                  {currentTime.toFixed(1)}s / {DURATION_SEC.toFixed(1)}s
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-[10px] font-semibold">
                <div
                  className={`rounded-lg p-2 text-center transition ${
                    currentTime < 2.35
                      ? 'bg-[#D4AE62] text-black font-bold'
                      : 'bg-white/[0.04] text-white/60'
                  }`}
                >
                  1. Zavod Holat
                </div>
                <div
                  className={`rounded-lg p-2 text-center transition ${
                    currentTime >= 2.35 && currentTime < 2.95
                      ? 'bg-[#D4AE62] text-black font-bold'
                      : 'bg-white/[0.04] text-white/60'
                  }`}
                >
                  2. AI Lazer Drop
                </div>
                <div
                  className={`rounded-lg p-2 text-center transition ${
                    currentTime >= 2.95 && currentTime < 8.2
                      ? 'bg-[#D4AE62] text-black font-bold'
                      : 'bg-white/[0.04] text-white/60'
                  }`}
                >
                  3. 5 Rakurs Edit
                </div>
                <div
                  className={`rounded-lg p-2 text-center transition ${
                    currentTime >= 8.2
                      ? 'bg-[#D4AE62] text-black font-bold'
                      : 'bg-white/[0.04] text-white/60'
                  }`}
                >
                  4. Oldin / Keyin
                </div>
              </div>
            </div>

            {/* Format Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#A69F92]">
                Video Formati
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAspect('9:16')}
                  className={`flex items-center justify-center gap-2.5 rounded-2xl py-3.5 px-4 text-sm font-semibold transition cursor-pointer ${
                    aspect === '9:16'
                      ? 'bg-[#D4AE62] text-black shadow-lg'
                      : 'bg-[#131722] text-white/80 hover:bg-[#191E2C]'
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  <span>9:16 Reels / Shorts</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAspect('16:9')}
                  className={`flex items-center justify-center gap-2.5 rounded-2xl py-3.5 px-4 text-sm font-semibold transition cursor-pointer ${
                    aspect === '16:9'
                      ? 'bg-[#D4AE62] text-black shadow-lg'
                      : 'bg-[#131722] text-white/80 hover:bg-[#191E2C]'
                  }`}
                >
                  <Monitor className="h-4 w-4" />
                  <span>16:9 Keng Ekran</span>
                </button>
              </div>
            </div>

            {/* Music Track Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#A69F92]">
                Musiqa va Ritm Ssenariysi
              </label>
              <div className="space-y-2">
                {MUSIC_TRACKS.map((t) => {
                  const active = t.id === trackId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        ensureAudioGraph();
                        setTrackId(t.id);
                        startTimeRef.current = performance.now();
                        setCurrentTime(0);
                        setIsPlaying(true);
                      }}
                      className={`flex w-full items-center justify-between rounded-2xl p-3.5 text-start transition cursor-pointer ${
                        active
                          ? 'bg-[#D4AE62]/15 text-white shadow-md'
                          : 'bg-[#131722] text-white/75 hover:bg-[#191E2C]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid h-9 w-9 place-items-center rounded-xl ${
                            active ? 'bg-[#D4AE62] text-black' : 'bg-white/[0.06] text-[#D4AE62]'
                          }`}
                        >
                          <Music className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{t.name}</p>
                          <p className="text-xs text-[#A69F92]">{t.sub}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-mono text-[#D4AE62]">
                        {t.bpm} BPM
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Download Actions */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleDownloadVideo}
                disabled={isEnhancing || isExportingVideo}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#D4AE62] py-4 px-6 text-sm font-extrabold text-black shadow-[0_12px_32px_rgba(212,174,98,0.35)] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition cursor-pointer"
              >
                {isExportingVideo ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Musiqali Video Yozilmoqda ({exportProgress}%)...</span>
                  </>
                ) : exportComplete ? (
                  <>
                    <Check className="h-5 w-5" />
                    <span>Video Yuklab Olindi (Yana yuklash)</span>
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    <span>Videoni Yuklab Olish (Musiqa Bilan)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadPhoto}
                disabled={isEnhancing}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#131722] py-3.5 px-6 text-sm font-semibold text-white hover:bg-[#191E2C] transition cursor-pointer"
              >
                <ImageIcon className="h-4 w-4 text-[#D4AE62]" />
                <span>4K Rasmni Yuklab Olish</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
