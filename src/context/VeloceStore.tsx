'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { VeloceSmartCameraModal } from '@/components/camera/VeloceSmartCameraModal';

interface VeloceStoreContextType {
  cart: Record<string, number>;
  add: (id: string) => void;
  remove: (id: string) => void;
  clearCart: () => void;
  count: number;
  photo: string | null;
  setPhoto: (photo: string | null) => void;
  selectedPartIds: string[];
  setSelectedPartIds: (ids: string[]) => void;
  toggleSelectedPart: (id: string) => void;
  multiAngles: Record<string, string>;
  setMultiAngles: (angles: Record<string, string>) => void;
  generatedAngles: Record<string, string>;
  setGeneratedAngles: (angles: Record<string, string>) => void;
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
  const [photo, setPhotoState] = React.useState<string | null>(null);
  const [selectedPartIds, setSelectedPartIdsState] = React.useState<string[]>([]);
  const [multiAngles, setMultiAnglesState] = React.useState<Record<string, string>>({});
  const [generatedAngles, setGeneratedAnglesState] = React.useState<Record<string, string>>({});
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Restore state from sessionStorage on mount
  React.useEffect(() => {
    try {
      const savedCart = sessionStorage.getItem('veloce_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
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
        sessionStorage.setItem('veloce_cart', JSON.stringify(next));
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
        sessionStorage.setItem('veloce_cart', JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const clearCart = React.useCallback(() => {
    setCart({});
    try {
      sessionStorage.removeItem('veloce_cart');
    } catch {
      // Ignore
    }
  }, []);

  const count = React.useMemo(
    () => Object.values(cart).reduce((sum, q) => sum + q, 0),
    [cart]
  );

  const openCamera = React.useCallback(() => {
    setIsCameraOpen(true);
  }, []);

  const closeCamera = React.useCallback(() => {
    setIsCameraOpen(false);
  }, []);

  const handleCameraCaptured = React.useCallback(
    (dataUrl: string) => {
      setPhoto(dataUrl);
      try {
        const savedAngles = sessionStorage.getItem('carvision_multi_angles');
        if (savedAngles) {
          setMultiAnglesState(JSON.parse(savedAngles));
        }
      } catch {
        // Ignore
      }
      setIsCameraOpen(false);
      router.push(`/${locale}/customize?captured=1`);
    },
    [locale, router, setPhoto]
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
        count,
        photo,
        setPhoto,
        selectedPartIds,
        setSelectedPartIds,
        toggleSelectedPart,
        multiAngles,
        setMultiAngles,
        generatedAngles,
        setGeneratedAngles,
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
      <VeloceSmartCameraModal
        isOpen={isCameraOpen}
        onClose={closeCamera}
        onCaptured={handleCameraCaptured}
      />
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
