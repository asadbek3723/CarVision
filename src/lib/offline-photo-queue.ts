import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface OfflinePhotoRecord {
  id: string;
  sessionId: string;
  angleId: number;
  blob: Blob;
  timestamp: number;
  syncStatus: 'PENDING' | 'UPLOADING' | 'SYNCED' | 'FAILED';
  retryCount?: number | undefined;
  errorMessage?: string | undefined;
}

interface CarVisionDB extends DBSchema {
  offline_photos: {
    key: string;
    value: OfflinePhotoRecord;
    indexes: { by_session: string };
  };
}

const DB_NAME = 'carvision_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<CarVisionDB>> | null = null;

export async function getOfflineDB(): Promise<IDBPDatabase<CarVisionDB>> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only accessible in browser environments.');
  }

  if (!dbPromise) {
    dbPromise = openDB<CarVisionDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('offline_photos')) {
          const store = db.createObjectStore('offline_photos', { keyPath: 'id' });
          store.createIndex('by_session', 'sessionId');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveOfflinePhoto(
  photo: Omit<OfflinePhotoRecord, 'timestamp' | 'syncStatus'>
): Promise<void> {
  const db = await getOfflineDB();
  const record: OfflinePhotoRecord = {
    ...photo,
    timestamp: Date.now(),
    syncStatus: 'PENDING',
    retryCount: 0,
  };
  await db.put('offline_photos', record);
}

export async function getPendingPhotos(sessionId?: string): Promise<OfflinePhotoRecord[]> {
  const db = await getOfflineDB();
  let photos: OfflinePhotoRecord[];

  if (sessionId) {
    photos = await db.getAllFromIndex('offline_photos', 'by_session', sessionId);
  } else {
    photos = await db.getAll('offline_photos');
  }

  return photos.filter((p) => p.syncStatus === 'PENDING' || p.syncStatus === 'FAILED');
}

export async function updatePhotoStatus(
  id: string,
  syncStatus: OfflinePhotoRecord['syncStatus'],
  errorMessage?: string
): Promise<void> {
  const db = await getOfflineDB();
  const existing = await db.get('offline_photos', id);
  if (!existing) return;

  const updated: OfflinePhotoRecord = {
    ...existing,
    syncStatus,
    errorMessage,
    retryCount: (existing.retryCount ?? 0) + (syncStatus === 'FAILED' ? 1 : 0),
  };

  await db.put('offline_photos', updated);
}

export async function deleteOfflinePhoto(id: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete('offline_photos', id);
}

export async function clearSessionPhotos(sessionId: string): Promise<void> {
  const db = await getOfflineDB();
  const photos = await db.getAllFromIndex('offline_photos', 'by_session', sessionId);
  const tx = db.transaction('offline_photos', 'readwrite');
  await Promise.all(photos.map((p) => tx.store.delete(p.id)));
  await tx.done;
}

/**
 * Synchronizes pending offline photos sequentially
 */
export async function syncOfflineQueue(
  sessionId?: string,
  uploadHandler?: (photo: OfflinePhotoRecord) => Promise<boolean>
): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const pending = await getPendingPhotos(sessionId);
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await updatePhotoStatus(item.id, 'UPLOADING');

      let success = false;
      if (uploadHandler) {
        success = await uploadHandler(item);
      } else {
        // Default sync via standard multipart endpoint
        const formData = new FormData();
        formData.append('angle_id', String(item.angleId));
        formData.append('file', item.blob, `angle-${item.angleId}.webp`);

        const res = await fetch(`/api/v1/sessions/${item.sessionId}/photos`, {
          method: 'POST',
          body: formData,
        });
        success = res.ok;
      }

      if (success) {
        await updatePhotoStatus(item.id, 'SYNCED');
        await deleteOfflinePhoto(item.id);
        synced++;
      } else {
        await updatePhotoStatus(item.id, 'FAILED', 'Server responded with error');
        failed++;
      }
    } catch (err) {
      await updatePhotoStatus(
        item.id,
        'FAILED',
        err instanceof Error ? err.message : 'Network error'
      );
      failed++;
    }
  }

  return { synced, failed };
}

/**
 * Registers an automatic online listener to sync photos when network recovers
 */
export function registerAutoSync(
  uploadHandler?: (photo: OfflinePhotoRecord) => Promise<boolean>
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    void syncOfflineQueue(undefined, uploadHandler);
  };

  window.addEventListener('online', handleOnline);
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
