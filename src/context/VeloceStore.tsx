'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { requestMotionAccess } from '@/features/camera/hooks/useDeviceLevel';

// The camera (≈800 lines + animation + QR code) is its own chunk: not part of every page's first
// download, but fetched in idle time right after the app starts (see the provider), so tapping
// "Create" opens it at once. If it is still on its way, a black camera screen shows immediately
// instead of nothing happening.
const loadCameraModal = () => import('@/components/camera/VeloceSmartCameraModal').then((m) => m.VeloceSmartCameraModal);
const VeloceSmartCameraModal = dynamic(loadCameraModal, {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#050507]" role="status" aria-busy="true">
      <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-gold-500" />
    </div>
  ),
});

interface VeloceStoreContextType {
  cart: Record<string, number>;
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
  closeCamera: () => void;
  isCameraOpen: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const VeloceStoreContext = React.createContext<VeloceStoreContextType | null>(null);

export function VeloceStoreProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.['locale'] as string) || 'uz';

  const [cart, setCart] = React.useState<Record<string, number>>({});
  const [cartUnselected, setCartUnselected] = React.useState<string[]>([]);
  const [photo, setPhotoState] = React.useState<string | null>(null);
  const [selectedPartIds, setSelectedPartIdsState] = React.useState<string[]>([]);
  const [multiAngles, setMultiAnglesState] = React.useState<Record<string, string>>({});
  const [generatedAngles, setGeneratedAnglesState] = React.useState<Record<string, string>>({});
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  // Once opened the modal stays mounted (it keeps its own state between openings).
  const [cameraWanted, setCameraWanted] = React.useState(false);
  React.useEffect(() => {
    if (isCameraOpen) setCameraWanted(true);
  }, [isCameraOpen]);
  const [captureStamp, setCaptureStamp] = React.useState('none');

  // Warm the camera chunk once the app is idle, so the first "Create" tap opens it instantly.
  React.useEffect(() => {
    const ric = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const warm = () => void loadCameraModal().catch(() => {});
    if (typeof ric === 'function') ric(warm, { timeout: 4000 });
    else window.setTimeout(warm, 2500);
  }, []);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Restore state from localStorage & sessionStorage on mount, keep live across tabs & components
  React.useEffect(() => {
    const syncCart = () => {
      try {
        const savedCart = localStorage.getItem('veloce_cart_v2') ?? sessionStorage.getItem('veloce_cart');
        if (savedCart) {
          setCart(JSON.parse(savedCart));
        }
        const savedUnselected = localStorage.getItem('veloce_cart_unselected_v2') ?? sessionStorage.getItem('veloce_cart_unselected');
        if (savedUnselected) {
          const parsed: unknown = JSON.parse(savedUnselected);
          if (Array.isArray(parsed)) setCartUnselected(parsed.filter((x): x is string => typeof x === 'string'));
        }
      } catch {
        // Ignore
      }
    };

    syncCart();

    window.addEventListener('storage', syncCart);
    window.addEventListener('veloce-cart-sync', syncCart);

    try {
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

    return () => {
      window.removeEventListener('storage', syncCart);
      window.removeEventListener('veloce-cart-sync', syncCart);
    };
  }, []);

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
        const json = JSON.stringify(next);
        localStorage.setItem('veloce_cart_v2', json);
        sessionStorage.setItem('veloce_cart', json);
        window.dispatchEvent(new Event('veloce-cart-sync'));
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
        const json = JSON.stringify(next);
        localStorage.setItem('veloce_cart_v2', json);
        sessionStorage.setItem('veloce_cart', json);
        window.dispatchEvent(new Event('veloce-cart-sync'));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const saveUnselected = (next: string[]) => {
    try {
      if (next.length === 0) {
        localStorage.removeItem('veloce_cart_unselected_v2');
        sessionStorage.removeItem('veloce_cart_unselected');
      } else {
        const json = JSON.stringify(next);
        localStorage.setItem('veloce_cart_unselected_v2', json);
        sessionStorage.setItem('veloce_cart_unselected', json);
      }
      window.dispatchEvent(new Event('veloce-cart-sync'));
    } catch {
      // Ignore
    }
  };

  const clearCart = React.useCallback(() => {
    setCart({});
    setCartUnselected([]);
    try {
      localStorage.removeItem('veloce_cart_v2');
      localStorage.removeItem('veloce_cart_unselected_v2');
      sessionStorage.removeItem('veloce_cart');
      sessionStorage.removeItem('veloce_cart_unselected');
      window.dispatchEvent(new Event('veloce-cart-sync'));
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
        const json = JSON.stringify(next);
        localStorage.setItem('veloce_cart_v2', json);
        sessionStorage.setItem('veloce_cart', json);
        window.dispatchEvent(new Event('veloce-cart-sync'));
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

  const closeCamera = React.useCallback(() => {
    setIsCameraOpen(false);
  }, []);

  const handleCameraCaptured = React.useCallback(
    (dataUrl: string, angles: Record<string, string>) => {
      const stamp = Date.now().toString();
      setPhoto(dataUrl);
      setMultiAngles(angles);
      setCaptureStamp(stamp);
      try {
        sessionStorage.setItem('carvision_captured_at', stamp);
      } catch {
        // storage full: the in-memory state above is what the studio uses
      }
      setIsCameraOpen(false);
      router.push(`/${locale}/customize?captured=1`);
    },
    [locale, router, setPhoto, setMultiAngles]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = '';
    setIsCameraOpen(true);
  };

  return (
    <VeloceStoreContext.Provider
      value={{
        cart,
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
      {(cameraWanted || isCameraOpen) && (
        <VeloceSmartCameraModal
          isOpen={isCameraOpen}
          onClose={closeCamera}
          onCaptured={handleCameraCaptured}
        />
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
