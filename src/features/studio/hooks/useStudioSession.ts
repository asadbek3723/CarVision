'use client';

import * as React from 'react';
import type { SelectedPartBuild, StudioPartItem, AngleRenderState } from '../types';
import type { CategorySlot } from '@/domain/angle-validator';
import { calculateCashierTotal, type CashierSummary } from '@/domain/pricing';

export interface UseStudioSessionOptions {
  sessionId: string;
  initialAngleId?: number;
}

export function useStudioSession({ sessionId, initialAngleId = 2 }: UseStudioSessionOptions) {
  const [activeAngleId, setActiveAngleId] = React.useState<number>(initialAngleId);
  const [selectedBuild, setSelectedBuild] = React.useState<Map<CategorySlot, SelectedPartBuild>>(new Map());
  const [isHudVisible, setIsHudVisible] = React.useState<boolean>(true);
  const [isCashierDrawerOpen, setIsCashierDrawerOpen] = React.useState<boolean>(false);
  const [isGenerating, setIsGenerating] = React.useState<boolean>(false);

  // Default renders for demo/studio
  const [angleRenders, setAngleRenders] = React.useState<Map<number, AngleRenderState>>(() => {
    const map = new Map<number, AngleRenderState>();
    for (let i = 1; i <= 8; i++) {
      map.set(i, {
        angleId: i,
        originalUrl: `https://cdn.carvision.app/originals/demo/malibu-angle-${i}.webp`,
        previewUrl: undefined,
        output4kUrl: undefined,
        isGenerating: false,
      });
    }
    return map;
  });

  const hideHudTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Auto-hide HUD on user interaction with car canvas
  const handleInteractionStart = React.useCallback(() => {
    if (hideHudTimeoutRef.current) {
      clearTimeout(hideHudTimeoutRef.current);
    }
    setIsHudVisible(false);
  }, []);

  const handleInteractionEnd = React.useCallback(() => {
    if (hideHudTimeoutRef.current) {
      clearTimeout(hideHudTimeoutRef.current);
    }
    // Fade HUD back in after 300ms idle
    hideHudTimeoutRef.current = setTimeout(() => {
      setIsHudVisible(true);
    }, 300);
  }, []);

  // Add / replace item in build slot
  const selectItem = React.useCallback((item: StudioPartItem) => {
    setSelectedBuild((prev) => {
      const next = new Map(prev);
      next.set(item.category, {
        inventoryId: item.id,
        slot: item.category,
        item,
      });
      return next;
    });
  }, []);

  // Remove item from build
  const removeItem = React.useCallback((slot: CategorySlot) => {
    setSelectedBuild((prev) => {
      const next = new Map(prev);
      next.delete(slot);
      return next;
    });
  }, []);

  // Dynamic Cashier Total
  const cashierSummary: CashierSummary = React.useMemo(() => {
    const items = Array.from(selectedBuild.values()).map((b) => ({
      partPriceCents: b.item.priceCents,
      laborCostCents: b.item.laborCostCents,
    }));
    return calculateCashierTotal(items);
  }, [selectedBuild]);

  // Trigger 4K Inpaint Generation
  const triggerGeneration = React.useCallback(async () => {
    if (selectedBuild.size === 0 || isGenerating) return;

    try {
      setIsGenerating(true);
      const buildItems = Array.from(selectedBuild.values()).map((b) => ({
        inventoryId: b.inventoryId,
        slot: b.slot,
        options: b.options,
      }));

      const res = await fetch('/api/v1/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          angleId: activeAngleId,
          buildItems,
          isNightMode: false,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      if (res.ok) {
        // Set realistic 4K output for preview
        setAngleRenders((prev) => {
          const next = new Map(prev);
          const current = next.get(activeAngleId);
          if (current) {
            next.set(activeAngleId, {
              ...current,
              previewUrl: '/images/car-after.jpg',
              output4kUrl: '/images/car-after.jpg',
              isGenerating: false,
            });
          }
          return next;
        });
      }
    } catch (err) {
      console.error('Studio generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [activeAngleId, isGenerating, selectedBuild, sessionId]);

  return {
    activeAngleId,
    setActiveAngleId,
    selectedBuild,
    selectItem,
    removeItem,
    cashierSummary,
    isHudVisible,
    handleInteractionStart,
    handleInteractionEnd,
    isCashierDrawerOpen,
    setIsCashierDrawerOpen,
    isGenerating,
    triggerGeneration,
    currentRenderState: angleRenders.get(activeAngleId),
  };
}
