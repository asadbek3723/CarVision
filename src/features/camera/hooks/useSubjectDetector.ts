'use client';

import * as React from 'react';
import type { ObjectDetector } from '@mediapipe/tasks-vision';
import { classifyFrame, createSubjectSmoother, type Subject } from '../lib/subject-classify';

/** Pinned to the installed package version so the WASM always matches the JS. */
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm';
/** EfficientDet-Lite0 (COCO, int8, ~4.6 MB): fast enough for phones. */
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite';
/** ~4 checks a second is plenty for a colour hint and keeps the phone cool. */
const INTERVAL_MS = 250;

let detectorPromise: Promise<ObjectDetector> | null = null;

/** One shared detector per page load (the model is downloaded once). */
function loadDetector(): Promise<ObjectDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const { FilesetResolver, ObjectDetector } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      // CPU on purpose: with this int8 model the GPU delegate loads but silently returns no
      // detections at all (measured), and Lite0 is fast enough on a phone CPU at 4 checks/second.
      return ObjectDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
        runningMode: 'VIDEO',
        scoreThreshold: 0.35,
        maxResults: 5,
      });
    })().catch((err) => {
      detectorPromise = null; // allow a retry next time the camera opens
      throw err;
    });
  }
  return detectorPromise;
}

/**
 * Tells what the live camera is pointed at: 'car', 'person' or 'other'.
 * Returns null until the detector is ready, or for good when it cannot load (no network, old
 * browser): the camera then works exactly as before, without the colour hint.
 */
export function useSubjectDetector(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean
): Subject | null {
  const [subject, setSubject] = React.useState<Subject | null>(null);

  React.useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const smooth = createSubjectSmoother(4);
    let lastTs = 0;

    loadDetector()
      .then((detector) => {
        const tick = () => {
          if (stopped) return;
          const video = videoRef.current;
          if (video && video.readyState >= 2 && video.videoWidth > 0 && !document.hidden) {
            try {
              // Timestamps must strictly increase in VIDEO mode.
              const ts = Math.max(performance.now(), lastTs + 1);
              lastTs = ts;
              const result = detector.detectForVideo(video, ts);
              const frameArea = video.videoWidth * video.videoHeight;
              const objects = result.detections.map((d) => ({
                label: d.categories[0]?.categoryName ?? '',
                score: d.categories[0]?.score ?? 0,
                area: d.boundingBox ? (d.boundingBox.width * d.boundingBox.height) / frameArea : 0,
              }));
              const next = smooth(classifyFrame(objects));
              setSubject((prev) => (prev === next ? prev : next));
            } catch {
              // A dropped frame is harmless; try again on the next tick.
            }
          }
          timer = setTimeout(tick, INTERVAL_MS);
        };
        tick();
      })
      .catch((err) => {
        console.warn('smart camera: object detector unavailable', err);
        if (!stopped) setSubject(null);
      });

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, videoRef]);

  return enabled ? subject : null;
}
