'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { VeloceSmartCameraModal } from '@/components/camera/VeloceSmartCameraModal';

interface VeloceStoreContextType {
  cart: Record<string, number>;
  add: (id: string) => void;
  remove: (id: string) => void;
  count: number;
  photo: string | null;
  setPhoto: (photo: string | null) => void;
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
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Restore state from sessionStorage on mount
  React.useEffect(() => {
    try {
      const savedCart = sessionStorage.getItem('veloce_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
      const savedPhoto = sessionStorage.getItem('veloce_photo');
      if (savedPhoto && (savedPhoto.startsWith('data:image/') || savedPhoto.startsWith('/'))) {
        setPhotoState(savedPhoto);
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
      setIsCameraOpen(false);
      router.push(`/${locale}/customize?captured=1`);
    },
    [locale, router, setPhoto]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPhoto(result);
        router.push(`/${locale}/customize?captured=1`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <VeloceStoreContext.Provider
      value={{
        cart,
        add,
        remove,
        count,
        photo,
        setPhoto,
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
