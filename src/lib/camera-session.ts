/**
 * Real-time In-Memory Camera Session Store
 * Bridges desktop QR code hand-off to mobile camera capture
 */

export interface CameraSessionData {
  id: string;
  createdAt: number;
  status: 'waiting' | 'connected' | 'captured';
  imageUrl?: string;
  angles?: Record<number, string>;
  lastHeartbeat?: number;
}

// Global in-memory map to persist across route handler invocations in the same Node.js process
const globalSessions = globalThis as unknown as {
  __carvision_camera_sessions?: Map<string, CameraSessionData>;
};

if (!globalSessions.__carvision_camera_sessions) {
  globalSessions.__carvision_camera_sessions = new Map<string, CameraSessionData>();
}

const sessionStore = globalSessions.__carvision_camera_sessions;

export function createCameraSession(): CameraSessionData {
  const id = `cv_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
  const session: CameraSessionData = {
    id,
    createdAt: Date.now(),
    status: 'waiting',
    lastHeartbeat: Date.now(),
  };
  sessionStore.set(id, session);

  // Clean old sessions (> 30 mins)
  const now = Date.now();
  for (const [key, val] of sessionStore.entries()) {
    if (now - val.createdAt > 30 * 60 * 1000) {
      sessionStore.delete(key);
    }
  }

  return session;
}

export function getCameraSession(id: string): CameraSessionData | null {
  return sessionStore.get(id) || null;
}

export function updateCameraSession(
  id: string,
  updates: Partial<CameraSessionData>
): CameraSessionData | null {
  const existing = sessionStore.get(id);
  if (!existing) return null;

  const updated: CameraSessionData = {
    ...existing,
    ...updates,
    lastHeartbeat: Date.now(),
  };

  sessionStore.set(id, updated);
  return updated;
}
