'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { requestMotionAccess } from '@/features/camera/hooks/useDeviceLevel';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCartSync } from '@/features/shop/useCartSync';

/** Part the customer wanted before photographing the side that shows it (picked once the photo is in). */
export const PENDING_PART_KEY = 'carvision_pending_part';

type CameraModalComponent = typeof import('@/components/camera/VeloceSmartCameraModal').VeloceSmartCameraModal;

// The camera (≈800 lines + animation + QR code) is not part of every page. It is downloaded quietly
// a moment after the app opens (see the provider), so the first tap on "Create" finds it ready
// instead of waiting for the download; the same promise is shared by every caller.
let cameraChunk: Promise<CameraModalComponent> | null = null;
function loadCameraModal(): Promise<CameraModalComponent> {
  cameraChunk ??= import('@/components/camera/VeloceSmartCameraModal').then((m) => m.VeloceSmartCameraModal);
  return cameraChunk;
}
/** Starts downloading the camera (safe to call often); the "Create" button calls it the moment a finger touches it. */
export function preloadCamera(): void {
  void loadCameraModal();
}

interface VeloceStoreContextType {
  cart: Record<string, number>;
  /** False until the saved cart has been read from storage: an empty `cart` before that means "not known yet". */
  hydrated: boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  clearCart: () => void;
  /** Removes whole lines (every unit) from the cart. */
  removeLines: (ids: string[]) => void;
  count: number;
  /** Cart lines the customer unticked; every other line is selected (new items arrive selected). */
  cartUnselected: string[];
  setCartSelected: (id: string, selected: boolean) => void;
  setAllCartSelected: (ids: string[], selected: boolean) => void;
  photo: string | null;
  setPhoto: (photo: string | null) => void;
  selectedPartIds: string[];
  setSelectedPartIds: (ids: string[]) => void;
  toggleSelectedPart: (id: string) => void;
  multiAngles: Record<string, string>;
  setMultiAngles: (angles: Record<string, string>) => void;
  generatedAngles: Record<string, string>;
  setGeneratedAngles: (angles: Record<string, string>) => void;
  /** Changes with every new photo set; lets screens know the car must be re-confirmed. */
  captureStamp: string;
  openCamera: () => void;
  /**
   * Opens the camera for one side only (e.g. `rear`). The new photo is added to the ones already
   * taken; `pendingPartId` is remembered so the studio can pick that part once the photo is in.
   */
  openCameraForSide: (side: string, pendingPartId?: string) => void;
  closeCamera: () => void;
  isCameraOpen: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const VeloceStoreContext = React.createContext<VeloceStoreContextType | null>(null);

export function VeloceStoreProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';
  const tCommon = useTranslations('common');

  const [cart, setCart] = React.useState<Record<string, number>>({});
  const [hydrated, setHydrated] = React.useState(false);
  const [cartUnselected, setCartUnselected] = React.useState<string[]>([]);
  const [photo, setPhotoState] = React.useState<string | null>(null);
  const [selectedPartIds, setSelectedPartIdsState] = React.useState<string[]>([]);
  const [multiAngles, setMultiAnglesState] = React.useState<Record<string, string>>({});
  const [generatedAngles, setGeneratedAnglesState] = React.useState<Record<string, string>>({});
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  // Once opened the modal stays mounted (it keeps its own state between openings).
  const [CameraModal, setCameraModal] = React.useState<CameraModalComponent | null>(null);
  // Download the camera in idle time shortly after the app opens, and at once if it is opened sooner.
  React.useEffect(() => {
    let cancelled = false;
    const start = () => {
      void loadCameraModal().then((C) => {
        if (!cancelled) setCameraModal(() => C);
      });
    };
    if (isCameraOpen) {
      start();
      return () => {
        cancelled = true;
      };
    }
    const w = window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    let handle = 0;
    const timer = window.setTimeout(() => {
      if (typeof w.requestIdleCallback === 'function') handle = w.requestIdleCallback(start, { timeout: 4000 });
      else start();
    }, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (handle && typeof w.cancelIdleCallback === 'function') w.cancelIdleCallback(handle);
    };
  }, [isCameraOpen]);
  const [captureStamp, setCaptureStamp] = React.useState('none');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Restore state from storage on mount
  React.useEffect(() => {
    try {
      // The cart lives in localStorage so it survives closing the app (sessionStorage is wiped then).
      // A cart saved by an older version is still in sessionStorage: picked up once, then moved.
      const savedCart = localStorage.getItem('veloce_cart') ?? sessionStorage.getItem('veloce_cart');
      if (savedCart) {
        const parsed: unknown = JSON.parse(savedCart);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const clean = Object.fromEntries(
            Object.entries(parsed as Record<string, unknown>).filter(([, q]) => typeof q === 'number' && Number.isInteger(q) && q > 0 && q < 1000)
          ) as Record<string, number>;
          setCart(clean);
          localStorage.setItem('veloce_cart', JSON.stringify(clean));
          sessionStorage.removeItem('veloce_cart');
        }
      }
      const savedUnselected = localStorage.getItem('veloce_cart_unselected') ?? sessionStorage.getItem('veloce_cart_unselected');
      if (savedUnselected) {
        const parsed: unknown = JSON.parse(savedUnselected);
        if (Array.isArray(parsed)) setCartUnselected(parsed.filter((x): x is string => typeof x === 'string'));
      }
      setCaptureStamp(sessionStorage.getItem('carvision_captured_at') || 'none');
      const savedPhoto = sessionStorage.getItem('veloce_photo') || sessionStorage.getItem('carvision_captured_image');
      if (savedPhoto && (savedPhoto.startsWith('data:image/') || savedPhoto.startsWith('/'))) {
        setPhotoState(savedPhoto);
      }
      const savedSelected = sessionStorage.getItem('carvision_tablet_selected_parts');
      if (savedSelected) {
        const parsed = JSON.parse(savedSelected);
        if (Array.isArray(parsed)) setSelectedPartIdsState(parsed);
      }
      const savedAngles = sessionStorage.getItem('carvision_multi_angles');
      if (savedAngles) {
        const parsed = JSON.parse(savedAngles);
        if (parsed && typeof parsed === 'object') setMultiAnglesState(parsed);
      }
      const savedGenerated = sessionStorage.getItem('carvision_tablet_generated_angles');
      if (savedGenerated) {
        const parsed = JSON.parse(savedGenerated);
        if (parsed && typeof parsed === 'object') setGeneratedAnglesState(parsed);
      }
    } catch {
      // Ignore sessionStorage issues
    }
    setHydrated(true);
  }, []);

  // The cart follows the account across devices (saved on the server, local copy for guests/offline).
  const { user } = useAuth();
  const applyCart = React.useCallback((next: { items: Record<string, number>; unselected: string[] }) => {
    setCart(next.items);
    setCartUnselected(next.unselected);
    try {
      if (Object.keys(next.items).length === 0) localStorage.removeItem('veloce_cart');
      else localStorage.setItem('veloce_cart', JSON.stringify(next.items));
      if (next.unselected.length === 0) localStorage.removeItem('veloce_cart_unselected');
      else localStorage.setItem('veloce_cart_unselected', JSON.stringify(next.unselected));
    } catch {
      // Ignore
    }
  }, []);
  useCartSync({ userId: user?.id ?? null, hydrated, cart, unselected: cartUnselected, apply: applyCart });

  const setPhoto = React.useCallback((p: string | null) => {
    setPhotoState(p);
    try {
      if (p && (p.startsWith('data:image/') || p.startsWith('/'))) {
        sessionStorage.setItem('veloce_photo', p);
        sessionStorage.setItem('carvision_captured_image', p);
        sessionStorage.setItem('carvision_captured_at', Date.now().toString());
      } else {
        sessionStorage.removeItem('veloce_photo');
      }
    } catch {
      // Storage quota or disabled
    }
  }, []);

  const setSelectedPartIds = React.useCallback((ids: string[]) => {
    setSelectedPartIdsState(ids);
    try {
      sessionStorage.setItem('carvision_tablet_selected_parts', JSON.stringify(ids));
    } catch {
      // Ignore
    }
  }, []);

  const toggleSelectedPart = React.useCallback((id: string) => {
    setSelectedPartIdsState((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        sessionStorage.setItem('carvision_tablet_selected_parts', JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const setMultiAngles = React.useCallback((angles: Record<string, string>) => {
    setMultiAnglesState(angles);
    try {
      sessionStorage.setItem('carvision_multi_angles', JSON.stringify(angles));
    } catch {
      // Ignore
    }
  }, []);

  const setGeneratedAngles = React.useCallback((angles: Record<string, string>) => {
    setGeneratedAnglesState(angles);
    try {
      sessionStorage.setItem('carvision_tablet_generated_angles', JSON.stringify(angles));
    } catch {
      // Ignore
    }
  }, []);

  const add = React.useCallback((id: string) => {
    setCart((prev) => {
      const next = { ...prev, [id]: (prev[id] ?? 0) + 1 };
      try {
        localStorage.setItem('veloce_cart', JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const remove = React.useCallback((id: string) => {
    setCart((prev) => {
      const next = { ...prev };
      const current = next[id];
      if (current !== undefined && current > 1) {
        next[id] = current - 1;
      } else {
        delete next[id];
      }
      try {
        localStorage.setItem('veloce_cart', JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const saveUnselected = (next: string[]) => {
    try {
      if (next.length === 0) localStorage.removeItem('veloce_cart_unselected');
      else localStorage.setItem('veloce_cart_unselected', JSON.stringify(next));
    } catch {
      // Ignore
    }
  };

  const clearCart = React.useCallback(() => {
    setCart({});
    setCartUnselected([]);
    try {
      localStorage.removeItem('veloce_cart');
      localStorage.removeItem('veloce_cart_unselected');
    } catch {
      // Ignore
    }
  }, []);

  const removeLines = React.useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const drop = new Set(ids);
    setCart((prev) => {
      const next = Object.fromEntries(Object.entries(prev).filter(([id]) => !drop.has(id)));
      try {
        localStorage.setItem('veloce_cart', JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
    setCartUnselected((prev) => {
      const next = prev.filter((id) => !drop.has(id));
      saveUnselected(next);
      return next;
    });
  }, []);

  const setCartSelected = React.useCallback((id: string, selected: boolean) => {
    setCartUnselected((prev) => {
      const next = selected ? prev.filter((x) => x !== id) : prev.includes(id) ? prev : [...prev, id];
      saveUnselected(next);
      return next;
    });
  }, []);

  const setAllCartSelected = React.useCallback((ids: string[], selected: boolean) => {
    setCartUnselected((prev) => {
      const set = new Set(prev);
      for (const id of ids) {
        if (selected) set.delete(id);
        else set.add(id);
      }
      const next = [...set];
      saveUnselected(next);
      return next;
    });
  }, []);

  const count = React.useMemo(
    () => Object.values(cart).reduce((sum, q) => sum + q, 0),
    [cart]
  );

  const openCamera = React.useCallback(() => {
    // Runs inside the tap that opens the camera: the only moment iOS lets us ask for the motion
    // sensor, which the camera needs to notice a phone held sideways under rotation lock.
    requestMotionAccess();
    setIsCameraOpen(true);
  }, []);

  const [cameraOnly, setCameraOnly] = React.useState<string | null>(null);
  const openCameraForSide = React.useCallback((side: string, pendingPartId?: string) => {
    requestMotionAccess();
    try {
      // Remembered with the current photo set: the studio acts on it only once a new photo is in.
      if (pendingPartId) sessionStorage.setItem(PENDING_PART_KEY, JSON.stringify({ partId: pendingPartId, stamp: captureStamp }));
    } catch {
      // the part simply is not picked automatically
    }
    setCameraOnly(side);
    setIsCameraOpen(true);
  }, [captureStamp]);

  const closeCamera = React.useCallback(() => {
    setIsCameraOpen(false);
    setCameraOnly(null);
  }, []);

  const handleCameraCaptured = React.useCallback(
    (dataUrl: string, angles: Record<string, string>) => {
      const stamp = Date.now().toString();
      if (cameraOnly) {
        // One extra side: keep every photo already taken and add this one.
        if (!photo) setPhoto(dataUrl);
        setMultiAngles({ ...multiAngles, ...angles });
      } else {
        setPhoto(dataUrl);
        setMultiAngles(angles);
      }
      setCameraOnly(null);
      setCaptureStamp(stamp);
      try {
        sessionStorage.setItem('carvision_captured_at', stamp);
      } catch {
        // storage full: the in-memory state above is what the studio uses
      }
      setIsCameraOpen(false);
      router.push(`/${locale}/customize?captured=1`);
    },
    [locale, router, setPhoto, setMultiAngles, cameraOnly, photo, multiAngles]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = '';
    setIsCameraOpen(true);
  };

  return (
    <VeloceStoreContext.Provider
      value={{
        cart,
        hydrated,
        add,
        remove,
        clearCart,
        removeLines,
        count,
        cartUnselected,
        setCartSelected,
        setAllCartSelected,
        photo,
        setPhoto,
        selectedPartIds,
        setSelectedPartIds,
        toggleSelectedPart,
        multiAngles,
        setMultiAngles,
        generatedAngles,
        setGeneratedAngles,
        captureStamp,
        openCamera,
        openCameraForSide,
        closeCamera,
        isCameraOpen,
        fileInputRef,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      {children}
      {CameraModal && <CameraModal isOpen={isCameraOpen} onClose={closeCamera} onCaptured={handleCameraCaptured} onlySlug={cameraOnly} />}
      {/* Tapped before the camera arrived (slow connection): show something at once, never a frozen screen. */}
      {isCameraOpen && !CameraModal && (
        <div role="dialog" aria-modal="true" aria-busy="true" aria-label={tCommon('loading')} className="fixed inset-0 z-[70] grid place-items-center bg-[#050507]">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[#FDC902]" />
        </div>
      )}
    </VeloceStoreContext.Provider>
  );
}

export function useVeloceStore(): VeloceStoreContextType {
  const context = React.useContext(VeloceStoreContext);
  if (!context) {
    throw new Error('useVeloceStore must be used within a VeloceStoreProvider');
  }
  return context;
}
