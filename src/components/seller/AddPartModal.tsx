'use client';

import * as React from 'react';
import {
  X,
  Sparkles,
  Camera,
  CheckCircle2,
  AlertCircle,
  Wand2,
} from 'lucide-react';

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface AddPartModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: CategoryOption[];
  onSuccess?: () => void;
  onProductSaved?: () => void;
  onProductCreated?: () => void;
}

const VEHICLE_PRESETS = [
  'Chevrolet Malibu 2',
  'Chevrolet Tracker 2',
  'Chevrolet Onix',
  'BMW M4 Competition',
  'BYD Seal',
  'BYD Song Plus',
  'Porsche 911 (992)',
  'Mercedes-Benz C63 AMG',
];

export function AddPartModal({
  isOpen,
  onClose,
  categories,
  onSuccess,
  onProductSaved,
  onProductCreated,
}: AddPartModalProps) {
  const [internalCategories, setInternalCategories] = React.useState<CategoryOption[]>(categories || []);
  const activeCategories = (categories && categories.length > 0) ? categories : internalCategories;

  // Form states
  const [name, setName] = React.useState('');
  const [categoryId, setCategoryId] = React.useState(activeCategories[0]?.id || '');
  const [brand, setBrand] = React.useState('');
  const [price, setPrice] = React.useState<number | ''>('');
  const [currency, setCurrency] = React.useState<'USD' | 'UZS'>('UZS');
  const [stock, setStock] = React.useState<number>(1);
  const [spec, setSpec] = React.useState('');
  const [selectedVehicles, setSelectedVehicles] = React.useState<string[]>(['Chevrolet Malibu 2']);
  const [customVehicle, setCustomVehicle] = React.useState('');

  // Image states
  const [rawImage, setRawImage] = React.useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = React.useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = React.useState(false);
  const [enhancementDone, setEnhancementDone] = React.useState(false);

  // Submitting states
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (categories && categories.length > 0) {
      setInternalCategories(categories);
      if (!categoryId) {
        setCategoryId(categories[0]?.id || '');
      }
    } else if (isOpen) {
      fetch('/api/v1/seller/inventory')
        .then((r) => r.json())
        .then((d) => {
          if (d.success && Array.isArray(d.categories) && d.categories.length > 0) {
            setInternalCategories(d.categories);
            if (!categoryId) {
              setCategoryId(d.categories[0].id);
            }
          }
        })
        .catch(() => {});
    }
  }, [categories, categoryId, isOpen]);

  if (!isOpen) return null;

  // Handle image upload from computer or phone
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setRawImage(result);
      setEnhancedImage(null);
      setEnhancementDone(false);
    };
    reader.readAsDataURL(file);
  };

  // Trigger AI studio enhancement (cutout + studio lighting)
  const handleEnhanceImage = async () => {
    if (!rawImage || isEnhancing) return;

    setIsEnhancing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/seller/improve-part-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: rawImage,
          partName: name || 'Custom Tuning Part',
          category: activeCategories.find((c) => c.id === categoryId)?.name,
        }),
      });

      const data = await res.json();
      if (data.success && data.enhancedImageUrl) {
        setEnhancedImage(data.enhancedImageUrl);
        setEnhancementDone(true);
      } else {
        setEnhancedImage(rawImage);
        setEnhancementDone(true);
      }
    } catch {
      setEnhancedImage(rawImage);
      setEnhancementDone(true);
    } finally {
      setIsEnhancing(false);
    }
  };

  const toggleVehicle = (v: string) => {
    setSelectedVehicles((prev) =>
      prev.includes(v) ? prev.filter((item) => item !== v) : [...prev, v]
    );
  };

  const addCustomVehicle = () => {
    if (!customVehicle.trim()) return;
    if (!selectedVehicles.includes(customVehicle.trim())) {
      setSelectedVehicles((prev) => [...prev, customVehicle.trim()]);
    }
    setCustomVehicle('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Mahsulot nomini kiriting');
      return;
    }
    if (!price || Number(price) <= 0) {
      setErrorMessage('To‘g‘ri narx kiriting');
      return;
    }
    const finalImage = enhancedImage || rawImage;
    if (!finalImage) {
      setErrorMessage('Iltimos, ehtiyot qismning rasmini yuklang');
      return;
    }
    if (selectedVehicles.length === 0) {
      setErrorMessage('Kamida bitta mos avtomobil modelini tanlang');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/seller/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          categoryId,
          brand: brand.trim() || 'Custom Tuning',
          price: Number(price),
          currency,
          stock,
          compatibility: selectedVehicles,
          spec: spec.trim() || undefined,
          imageUrl: finalImage,
          installationAvailable: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess?.();
        onProductSaved?.();
        onProductCreated?.();
        onClose();
      } else {
        setErrorMessage(data.error || 'Mahsulotni qo‘shishda xatolik yuz berdi');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Server bilan aloqa uzildi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayImage = enhancedImage || rawImage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#0D0E12] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9)] p-6 sm:p-8 my-8 text-foreground max-h-[90vh] overflow-y-auto [scrollbar-width:none]">
        {/* Header */}
        <div className="flex items-center justify-between pb-6">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-light tracking-wide text-white">
              Yangi Ehtiyot Qism Qo‘shish
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Omboringizga yangi detal qo‘shing va AI yordamida uning rasmini yaxshilang
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-destructive/10 px-4 py-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Image Capture & AI Studio Enhancement */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              1. Ehtiyot Qism Surati
            </label>

            <div className="relative rounded-2xl bg-[#12141A] p-4 text-center">
              {displayImage ? (
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-black/40">
                  <img
                    src={displayImage}
                    alt="Preview"
                    className="h-full w-full object-contain p-2 transition duration-500"
                  />
                  {enhancementDone && (
                    <div className="absolute top-3 end-3 flex items-center gap-1.5 rounded-full bg-[#19D3FF]/20 px-3 py-1 text-[10px] font-semibold text-[#19D3FF] backdrop-blur">
                      <Sparkles className="h-3 w-3" /> AI Studio 4K Tayyor
                    </div>
                  )}

                  <div className="absolute bottom-3 inset-x-3 flex justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-full bg-black/70 hover:bg-black px-4 py-2 text-xs text-white backdrop-blur transition cursor-pointer"
                    >
                      Boshqa surat tanlash
                    </button>
                    {!enhancementDone && (
                      <button
                        type="button"
                        onClick={handleEnhanceImage}
                        disabled={isEnhancing}
                        className="flex items-center gap-1.5 rounded-full bg-gold-gradient px-4 py-2 text-xs font-bold text-black shadow-gold transition hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <Wand2 className="h-3.5 w-3.5" />
                        {isEnhancing ? 'AI Studio yaxshilamoqda...' : 'AI bilan fonni tozalash'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="grid place-items-center py-10 cursor-pointer transition hover:opacity-80"
                >
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-white/5 text-primary mb-3">
                    <Camera className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-white">
                    Detalni rasmga oling yoki faylni yuklang
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    AI avtomatik tarzda fonni tozalab, studiya sifatiga keltiradi
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* 2. Part Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mahsulot nomi
              </label>
              <input
                type="text"
                required
                placeholder="masalan, VZ-01 Forged Monoblock"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-[#12141A] px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Kategoriya
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl bg-[#12141A] px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {activeCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Brand, Price & Stock */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Brend / Ishlab chiqaruvchi
              </label>
              <input
                type="text"
                placeholder="BBS, HRE, Akrapovič..."
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-xl bg-[#12141A] px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Narxi ({currency})
                </label>
                <div className="flex gap-1 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setCurrency('UZS')}
                    className={`px-1.5 py-0.5 rounded ${
                      currency === 'UZS' ? 'bg-primary text-black font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    UZS
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`px-1.5 py-0.5 rounded ${
                      currency === 'USD' ? 'bg-primary text-black font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    USD
                  </button>
                </div>
              </div>
              <input
                type="number"
                required
                min="0"
                placeholder={currency === 'UZS' ? '2400000' : '185'}
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-xl bg-[#12141A] px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ombordagi soni (Dona)
              </label>
              <input
                type="number"
                min="1"
                value={stock}
                onChange={(e) => setStock(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full rounded-xl bg-[#12141A] px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          </div>

          {/* Description & Technical Specs */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Qo‘shimcha Tavsif va O‘lchamlar
            </label>
            <input
              type="text"
              placeholder="Masalan: R19 5x114.3, Forged alyuminiy, Mat qora"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              className="w-full rounded-xl bg-[#12141A] px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* 4. Vehicle Compatibility Multi-Select */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mos keladigan avtomobil modellari
            </label>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_PRESETS.map((v) => {
                const isSelected = selectedVehicles.includes(v);
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleVehicle(v)}
                    className={`rounded-full px-3.5 py-1.5 text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-black font-semibold shadow-gold'
                        : 'bg-[#12141A] text-muted-foreground hover:text-white'
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>

            {/* Add custom vehicle model */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Boshqa model (masalan, Kia K5, Genesis G70)..."
                value={customVehicle}
                onChange={(e) => setCustomVehicle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomVehicle();
                  }
                }}
                className="flex-1 rounded-xl bg-[#12141A] px-4 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={addCustomVehicle}
                className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-xs text-white transition cursor-pointer"
              >
                Qo‘shish
              </button>
            </div>
          </div>

          {/* 5. Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/5 hover:bg-white/10 px-6 py-3 text-xs font-semibold text-muted-foreground hover:text-white transition cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-full bg-gold-gradient px-8 py-3 text-xs font-bold uppercase tracking-wider text-black shadow-gold transition hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? 'Saqlanmoqda...' : 'Omborga saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
