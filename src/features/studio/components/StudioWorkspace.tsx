'use client';

import * as React from 'react';
import { useStudioSession } from '../hooks/useStudioSession';
import { VehicleViewport } from './VehicleViewport';
import { FloatingBottomDock } from './FloatingBottomDock';
import { AngleSelectorBar } from './AngleSelectorBar';
import { ItemizedSummaryDrawer } from './ItemizedSummaryDrawer';
import { PriceTicker } from '@/components/ui/PriceTicker';
import { Button } from '@/components/ui/Button';
import { Sparkles, ReceiptText } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StudioWorkspaceProps {
  sessionId: string;
  className?: string;
}

export function StudioWorkspace({ sessionId, className }: StudioWorkspaceProps) {
  const {
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
    currentRenderState,
  } = useStudioSession({ sessionId });

  const selectedSlotIds = React.useMemo(() => {
    return new Set(Array.from(selectedBuild.values()).map((b) => b.inventoryId));
  }, [selectedBuild]);

  return (
    <div className={cn('relative w-screen h-screen overflow-hidden bg-[#0A0B0F] flex flex-col', className)}>
      {/* 1. Main Vehicle Viewport (Dominates 62% - 85% of screen) */}
      <div className="flex-1 w-full h-full relative z-0">
        <VehicleViewport
          renderState={currentRenderState}
          onInteractionStart={handleInteractionStart}
          onInteractionEnd={handleInteractionEnd}
        />
      </div>

      {/* 2. Top Header HUD (Auto-hides on canvas touch) */}
      <header
        className={cn(
          'absolute top-0 inset-x-0 p-4 flex items-center justify-between z-20 transition-all duration-300 pointer-events-none',
          isHudVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        )}
      >
        {/* Cashier Badge (Tappable) */}
        <button
          onClick={() => setIsCashierDrawerOpen(true)}
          className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-2xl glass-panel hover:border-accent-cyan/60 transition-all active:scale-95 shadow-lg group"
        >
          <ReceiptText className="w-4 h-4 text-accent-cyan" />
          <PriceTicker amountCents={cashierSummary.grandTotalCents} />
          {cashierSummary.itemCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-accent-cyan text-[#0A0B0F] text-[10px] font-bold flex items-center justify-center ms-1">
              {cashierSummary.itemCount}
            </span>
          )}
        </button>

        {/* Generate Button */}
        <div className="pointer-events-auto flex items-center gap-3">
          <Button
            onClick={triggerGeneration}
            disabled={selectedBuild.size === 0 || isGenerating}
            isLoading={isGenerating}
            variant="primary"
            size="md"
            className="shadow-glow"
          >
            <Sparkles className="w-4 h-4 me-2" />
            <span>{isGenerating ? 'Rendering 4K...' : 'Visualize (1 Credit)'}</span>
          </Button>
        </div>
      </header>

      {/* 3. Floating Angle Selector Bar */}
      <div
        className={cn(
          'absolute bottom-60 sm:bottom-64 inset-x-0 flex justify-center z-20 transition-all duration-300 pointer-events-none',
          isHudVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}
      >
        <div className="pointer-events-auto">
          <AngleSelectorBar
            activeAngleId={activeAngleId}
            onAngleSelect={setActiveAngleId}
          />
        </div>
      </div>

      {/* 4. Floating Bottom Dock (Auto-hides on canvas touch) */}
      <div className="absolute bottom-4 inset-x-0 z-20">
        <FloatingBottomDock
          selectedSlotIds={selectedSlotIds}
          onItemSelect={selectItem}
          isVisible={isHudVisible}
        />
      </div>

      {/* 5. Itemized Breakdown Drawer */}
      <ItemizedSummaryDrawer
        isOpen={isCashierDrawerOpen}
        onClose={() => setIsCashierDrawerOpen(false)}
        selectedBuild={selectedBuild}
        cashierSummary={cashierSummary}
        onRemoveItem={removeItem}
      />
    </div>
  );
}
