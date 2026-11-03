'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check, X, Car } from 'lucide-react';

/**
 * Mobile and Desktop Configurator Dock (Hick's Law, Progressive Disclosure):
 * Top row: Body parts & customization categories with selection indicator dots.
 * Bottom row: Swatches or transparent part cards for the active category.
 * Fully compatible with Arabic RTL (zero physical CSS direction classes).
 */

export interface DockOption {
  /** Variant code or part id */
  value: string;
  label: string;
  swatch?: string;
  image?: string | null;
  caption?: string;
  inStock?: boolean;
}

export interface DockGroup {
  key: string;
  label: string;
  icon?: React.ElementType;
  options: DockOption[];
}

interface OptionCardProps {
  option: DockOption | null;
  groupLabel: string;
  selected: boolean;
  onClick: () => void;
}

function OptionCard({
  option,
  groupLabel,
  selected,
  onClick,
}: OptionCardProps) {
  const label = option?.label ?? 'None';

  const handleClick = () => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch {
        // ignore
      }
    }
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={selected}
      aria-label={`${groupLabel}: ${label}`}
      className={cn(
        'relative shrink-0 snap-start rounded-xl border p-2.5 text-start transition-all cursor-pointer select-none',
        option?.image ? 'w-[124px]' : 'w-[96px]',
        'outline-none focus-visible:ring-2 focus-visible:ring-[#19D3FF]',
        selected
          ? 'border-[#19D3FF] bg-[#19D3FF]/10 shadow-[0_0_20px_rgba(25,211,255,0.25)] ring-1 ring-[#19D3FF]/60'
          : 'border-white/10 bg-[#12141A]/90 hover:border-white/25 hover:bg-[#181B22]'
      )}
    >
      <span
        className={cn(
          'mb-2 flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-white/10 transition-transform duration-300',
          option?.image && 'bg-black/40',
          selected && 'scale-102'
        )}
        style={option?.swatch ? { backgroundColor: option.swatch } : undefined}
      >
        {!option && <X className="w-5 h-5 text-[#94A3B8]" />}
        {option?.image && (
          <img
            src={option.image}
            alt={option.label}
            loading="lazy"
            draggable={false}
            className="h-full w-full object-contain p-1.5"
          />
        )}
        {option && !option.swatch && !option.image && (
          <Car className="w-5 h-5 text-[#94A3B8]" />
        )}
      </span>

      <span
        className={cn(
          'line-clamp-2 block text-[11px] leading-tight font-medium',
          selected ? 'text-white font-semibold' : 'text-[#94A3B8]'
        )}
      >
        {label}
      </span>
      {option?.caption && (
        <span className="mt-1 block text-[11px] font-mono font-bold text-[#19D3FF] tabular-nums">
          {option.caption}
        </span>
      )}

      {selected && (
        <span className="absolute top-1.5 end-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#19D3FF] text-[#0A0B0F] shadow-[0_0_8px_rgba(25,211,255,0.8)]">
          <Check className="w-2.5 h-2.5 stroke-[3]" />
        </span>
      )}
    </button>
  );
}

export interface ConfiguratorDockProps {
  groups: DockGroup[];
  activeKey: string;
  options: Record<string, string>;
  onSelectGroup: (key: string) => void;
  onSelectOption: (groupKey: string, value: string | null) => void;
  children?: React.ReactNode;
  className?: string;
}

export function ConfiguratorDock({
  groups,
  activeKey,
  options,
  onSelectGroup,
  onSelectOption,
  children,
  className,
}: ConfiguratorDockProps) {
  const optionsRef = React.useRef<HTMLDivElement>(null);

  const activeGroup = groups.find((group) => group.key === activeKey) ?? groups[0];
  if (!activeGroup) return null;
  const activeValue = options[activeGroup.key];

  return (
    <div
      className={cn(
        'shrink-0 border-t border-white/10 bg-[#0A0B0F]/95 backdrop-blur-xl lg:flex lg:h-full lg:w-[440px] lg:flex-col lg:border-t-0 lg:border-s xl:w-[480px]',
        className
      )}
    >
      {/* Desktop Header */}
      <div className="hidden px-6 pt-6 pb-2 text-[12px] font-bold tracking-[0.18em] text-[#94A3B8] uppercase lg:flex items-center justify-between">
        <span>Vehicle Components</span>
        <span className="text-[#19D3FF] font-mono">{groups.length} Slots</span>
      </div>

      {/* ------------------------------------- Category Tabs */}
      <div
        className="flex gap-1.5 overflow-x-auto border-b border-white/10 px-4 py-2 no-scrollbar lg:shrink-0 lg:flex-wrap lg:gap-2 lg:border-b-0 lg:px-6 lg:py-3"
        role="tablist"
        aria-label="Vehicle Components"
      >
        {groups.map((group) => {
          const isActive = group.key === activeGroup.key;
          const hasSelection = Boolean(options[group.key]);
          const Icon = group.icon;

          return (
            <button
              key={group.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
                  try {
                    navigator.vibrate(6);
                  } catch {
                    // ignore
                  }
                }
                onSelectGroup(group.key);
                optionsRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
              }}
              className={cn(
                'relative flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs whitespace-nowrap transition-all cursor-pointer active:scale-95',
                isActive
                  ? 'border-[#19D3FF] bg-[#19D3FF] text-[#0A0B0F] font-bold shadow-[0_0_18px_rgba(25,211,255,0.4)]'
                  : 'border-white/10 bg-white/5 text-[#94A3B8] hover:border-white/25 hover:text-white'
              )}
            >
              {Icon && <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-[#0A0B0F]' : 'text-[#19D3FF]')} />}
              <span>{group.label}</span>
              {hasSelection && (
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isActive ? 'bg-[#0A0B0F]' : 'bg-[#19D3FF]'
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* --------------------------------- Variant Cards */}
      <div
        ref={optionsRef}
        className="flex snap-x gap-2.5 overflow-x-auto px-4 py-3 no-scrollbar lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:content-start lg:gap-3 lg:overflow-x-visible lg:overflow-y-auto lg:px-6 lg:py-4"
        role="tabpanel"
        aria-label={activeGroup.label}
      >
        {/* Reset / Empty Option */}
        <OptionCard
          option={null}
          groupLabel={activeGroup.label}
          selected={!activeValue}
          onClick={() => onSelectOption(activeGroup.key, null)}
        />

        {/* Available Part Options */}
        {activeGroup.options.map((option) => (
          <OptionCard
            key={option.value}
            option={option}
            groupLabel={activeGroup.label}
            selected={activeValue === option.value}
            onClick={() => onSelectOption(activeGroup.key, option.value)}
          />
        ))}
      </div>

      {children && <div className="lg:shrink-0 lg:border-t lg:border-white/10">{children}</div>}
    </div>
  );
}
