import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Phone-camera hand-off sessions, stored in Postgres so they work across serverless
 * instances (the previous in-memory Map lost sessions between requests).
 */

export type CameraSessionKind = 'car' | 'product';

export interface CameraSessionData {
  id: string;
  kind: CameraSessionKind;
  createdAt: number;
  status: 'waiting' | 'connected' | 'captured';
  imageUrl?: string;
  angles?: Record<number, string>;
  lastHeartbeat?: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000;
export const MAX_SESSION_UPLOADS = 12;
const ID_PATTERN = /^cv_[a-z0-9]{20,40}$/;

export function isValidSessionId(id: string): boolean {
  return ID_PATTERN.test(id);
}

interface Row {
  id: string;
  kind: CameraSessionKind;
  status: 'waiting' | 'connected' | 'captured';
  image_url: string | null;
  angles: Record<string, string> | null;
  uploads: number;
  created_at: string;
  last_heartbeat: string;
}

function toData(r: Row): CameraSessionData {
  const angles: Record<number, string> = {};
  for (const [k, v] of Object.entries(r.angles ?? {})) angles[Number(k)] = v;
  return {
    id: r.id,
    kind: r.kind,
    createdAt: new Date(r.created_at).getTime(),
    status: r.status,
    ...(r.image_url ? { imageUrl: r.image_url } : {}),
    angles,
    lastHeartbeat: new Date(r.last_heartbeat).getTime(),
  };
}

export async function createCameraSession(kind: CameraSessionKind = 'car', userId?: string): Promise<CameraSessionData> {
  const db = createAdminClient();
  const id = `cv_${crypto.randomBytes(16).toString('hex')}`;
  // Housekeeping: drop expired sessions
  await db.from('camera_sessions').delete().lt('created_at', new Date(Date.now() - SESSION_TTL_MS).toISOString());
  const { data, error } = await db.from('camera_sessions').insert({ id, kind, user_id: userId ?? null }).select().single();
  if (error || !data) throw new Error(error?.message || 'Could not create camera session');
  return toData(data as Row);
}

export async function getCameraSession(id: string): Promise<CameraSessionData | null> {
  if (!isValidSessionId(id)) return null;
  const { data } = await createAdminClient().from('camera_sessions').select().eq('id', id).maybeSingle();
  if (!data) return null;
  const row = data as Row;
  if (Date.now() - new Date(row.created_at).getTime() > SESSION_TTL_MS) return null;
  return toData(row);
}

/** Status-only view for polling: never loads the (multi-MB) photo columns. */
export interface CameraSessionLight {
  id: string;
  kind: CameraSessionKind;
  status: 'waiting' | 'connected' | 'captured';
  uploads: number;
  lastHeartbeat: number;
}

export async function getCameraSessionLight(id: string): Promise<CameraSessionLight | null> {
  if (!isValidSessionId(id)) return null;
  const { data } = await createAdminClient()
    .from('camera_sessions')
    .select('id, kind, status, uploads, created_at, last_heartbeat')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const row = data as Pick<Row, 'id' | 'kind' | 'status' | 'uploads' | 'created_at' | 'last_heartbeat'>;
  if (Date.now() - new Date(row.created_at).getTime() > SESSION_TTL_MS) return null;
  return { id: row.id, kind: row.kind, status: row.status, uploads: row.uploads, lastHeartbeat: new Date(row.last_heartbeat).getTime() };
}

export async function getSessionRow(id: string): Promise<(CameraSessionData & { uploads: number; userId: string | null }) | null> {
  if (!isValidSessionId(id)) return null;
  const { data } = await createAdminClient().from('camera_sessions').select('*, user_id').eq('id', id).maybeSingle();
  if (!data) return null;
  const row = data as Row & { user_id: string | null };
  if (Date.now() - new Date(row.created_at).getTime() > SESSION_TTL_MS) return null;
  return { ...toData(row), uploads: row.uploads, userId: row.user_id };
}

export async function updateCameraSession(
  id: string,
  updates: { status?: CameraSessionData['status']; imageUrl?: string; angleId?: number }
): Promise<CameraSessionData | null> {
  const existing = await getSessionRow(id);
  if (!existing) return null;

  const angles: Record<number, string> = { ...(existing.angles ?? {}) };
  const patch: Record<string, unknown> = { last_heartbeat: new Date().toISOString() };
  if (updates.status) patch['status'] = updates.status;
  if (updates.imageUrl) {
    patch['image_url'] = updates.imageUrl;
    patch['uploads'] = existing.uploads + 1;
    if (updates.angleId !== undefined) angles[updates.angleId] = updates.imageUrl;
    patch['angles'] = angles;
  }
  const { data, error } = await createAdminClient().from('camera_sessions').update(patch).eq('id', id).select().single();
  if (error || !data) return null;
  return toData(data as Row);
}
