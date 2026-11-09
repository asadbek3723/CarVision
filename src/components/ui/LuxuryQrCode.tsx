'use client';

import * as React from 'react';
import QRCode from 'qrcode';

export interface LuxuryQrCodeProps {
  /** The value (URL or string) to encode */
  value: string;
  /** Size in pixels (used for viewBox and default dimension, default: 300) */
  size?: number;
  /** Error correction level ('L' | 'M' | 'Q' | 'H', default: 'H' when brandLogo is true) */
  level?: 'L' | 'M' | 'Q' | 'H';
  /** Whether to render the luxury CarVision center monogram core (default: true) */
  brandLogo?: boolean;
  /** Foreground module & finder color (default: '#0A0B10') */
  darkColor?: string;
  /** Background & hollow cutout color (default: '#FFFFFF') */
  lightColor?: string;
  /** Border radius curvature multiplier for finder pattern corners (default: 2.2) */
  finderCornerRadius?: number;
  /** Border radius curvature multiplier for individual data dots (default: 0.28) */
  moduleCornerRadius?: number;
  /** Extra container className */
  className?: string;
}

export function LuxuryQrCode({
  value,
  size = 300,
  level: userLevel,
  brandLogo = true,
  darkColor = '#0A0B10',
  lightColor = '#FFFFFF',
  finderCornerRadius = 2.2,
  moduleCornerRadius = 0.28,
  className = '',
}: LuxuryQrCodeProps) {
  // Always use Level 'H' (30% redundancy) when brand logo core is enabled for 100% scan reliability
  const effectiveLevel = userLevel ?? (brandLogo ? 'H' : 'M');

  const qrData = React.useMemo(() => {
    if (!value) return null;
    try {
      const qr = QRCode.create(value, { errorCorrectionLevel: effectiveLevel });
      const moduleCount = qr.modules.size;
      const quietZone = 2; // Clean 2-module breathing margin
      const totalGrid = moduleCount + quietZone * 2;
      const cellSize = size / totalGrid;

      // Identify whether a row/col belongs to any of the 3 finder pattern zones (7x7)
      const isFinderZone = (r: number, c: number) => {
        return (
          (r < 7 && c < 7) ||
          (r < 7 && c >= moduleCount - 7) ||
          (r >= moduleCount - 7 && c < 7)
        );
      };

      // Center brand badge exclusion zone (~22% of QR width, e.g. 7-9 modules)
      const centerSpan = brandLogo ? Math.max(7, Math.floor(moduleCount * 0.24)) : 0;
      const centerStart = Math.floor((moduleCount - centerSpan) / 2);
      const centerEnd = centerStart + centerSpan;

      const isCenterLogoZone = (r: number, c: number) => {
        if (!brandLogo) return false;
        return r >= centerStart && r < centerEnd && c >= centerStart && c < centerEnd;
      };

      // Coordinates for 3 finder patterns
      const finderCoords = [
        { r: 0, c: 0 },
        { r: 0, c: moduleCount - 7 },
        { r: moduleCount - 7, c: 0 },
      ];

      // Extract regular data & timing modules
      const modules: Array<{ x: number; y: number; w: number; h: number; rx: number }> = [];
      const mRx = cellSize * moduleCornerRadius;

      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (qr.modules.get(r, c) && !isFinderZone(r, c) && !isCenterLogoZone(r, c)) {
            modules.push({
              x: (c + quietZone) * cellSize,
              y: (r + quietZone) * cellSize,
              w: cellSize,
              h: cellSize,
              rx: mRx,
            });
          }
        }
      }

      // Compute geometric finder patterns with matching border radius
      const finders = finderCoords.map((pos) => {
        const x = (pos.c + quietZone) * cellSize;
        const y = (pos.r + quietZone) * cellSize;

        return {
          outer: {
            x,
            y,
            w: 7 * cellSize,
            h: 7 * cellSize,
            rx: cellSize * finderCornerRadius,
          },
          innerHole: {
            x: x + cellSize,
            y: y + cellSize,
            w: 5 * cellSize,
            h: 5 * cellSize,
            rx: cellSize * (finderCornerRadius * 0.62),
          },
          centerDot: {
            x: x + 2 * cellSize,
            y: y + 2 * cellSize,
            w: 3 * cellSize,
            h: 3 * cellSize,
            rx: cellSize * (finderCornerRadius * 0.42),
          },
        };
      });

      // Center Brand Core dimensions
      let brandBadge: {
        halo: { x: number; y: number; size: number; rx: number };
        inner: { x: number; y: number; size: number; rx: number };
        centerX: number;
        centerY: number;
      } | null = null;

      if (brandLogo) {
        const haloX = (centerStart + quietZone - 0.25) * cellSize;
        const haloY = (centerStart + quietZone - 0.25) * cellSize;
        const haloSize = (centerSpan + 0.5) * cellSize;
        const innerMargin = cellSize * 0.45;
        const innerSize = haloSize - innerMargin * 2;

        brandBadge = {
          halo: {
            x: haloX,
            y: haloY,
            size: haloSize,
            rx: haloSize * 0.28,
          },
          inner: {
            x: haloX + innerMargin,
            y: haloY + innerMargin,
            size: innerSize,
            rx: innerSize * 0.26,
          },
          centerX: haloX + haloSize / 2,
          centerY: haloY + haloSize / 2,
        };
      }

      return {
        cellSize,
        modules,
        finders,
        brandBadge,
      };
    } catch (err) {
      console.error('LuxuryQrCode generation failed:', err);
      return null;
    }
  }, [value, effectiveLevel, size, brandLogo, finderCornerRadius, moduleCornerRadius]);

  if (!qrData) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`grid place-items-center bg-neutral-100 rounded-3xl ${className}`}
      >
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <svg
      role="img"
      aria-label="CarVision Luxury QR Code"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={`block select-none overflow-hidden ${className}`}
      style={{ shapeRendering: 'geometricPrecision' }}
    >
      {/* Background Fill */}
      <rect width="100%" height="100%" fill={lightColor} />

      {/* 3 Luxury Rounded Finder Patterns (Burchaklar / Eyes) */}
      {qrData.finders.map((finder, idx) => (
        <g key={`finder-${idx}`}>
          {/* Outer Rounded Frame */}
          <rect
            x={finder.outer.x}
            y={finder.outer.y}
            width={finder.outer.w}
            height={finder.outer.h}
            rx={finder.outer.rx}
            ry={finder.outer.rx}
            fill={darkColor}
          />
          {/* Inner Cutout (Hole) */}
          <rect
            x={finder.innerHole.x}
            y={finder.innerHole.y}
            width={finder.innerHole.w}
            height={finder.innerHole.h}
            rx={finder.innerHole.rx}
            ry={finder.innerHole.rx}
            fill={lightColor}
          />
          {/* Center Rounded Dot */}
          <rect
            x={finder.centerDot.x}
            y={finder.centerDot.y}
            width={finder.centerDot.w}
            height={finder.centerDot.h}
            rx={finder.centerDot.rx}
            ry={finder.centerDot.rx}
            fill={darkColor}
          />
        </g>
      ))}

      {/* Data Modules with Subtle Smooth Radius */}
      {qrData.modules.map((m, idx) => (
        <rect
          key={`m-${idx}`}
          x={m.x}
          y={m.y}
          width={m.w}
          height={m.h}
          rx={m.rx}
          ry={m.rx}
          fill={darkColor}
        />
      ))}

      {/* Dynamic Brand Core: Centered CarVision Luxury Monogram */}
      {qrData.brandBadge && (
        <g id="carvision-brand-core">
          {/* Protective White Halo Squircle */}
          <rect
            x={qrData.brandBadge.halo.x}
            y={qrData.brandBadge.halo.y}
            width={qrData.brandBadge.halo.size}
            height={qrData.brandBadge.halo.size}
            rx={qrData.brandBadge.halo.rx}
            ry={qrData.brandBadge.halo.rx}
            fill={lightColor}
          />

          {/* Luxury Inner Obsidian Badge */}
          <rect
            x={qrData.brandBadge.inner.x}
            y={qrData.brandBadge.inner.y}
            width={qrData.brandBadge.inner.size}
            height={qrData.brandBadge.inner.size}
            rx={qrData.brandBadge.inner.rx}
            ry={qrData.brandBadge.inner.rx}
            fill="#08090C"
          />

          {/* Elegant Subtle Gold Rim */}
          <rect
            x={qrData.brandBadge.inner.x}
            y={qrData.brandBadge.inner.y}
            width={qrData.brandBadge.inner.size}
            height={qrData.brandBadge.inner.size}
            rx={qrData.brandBadge.inner.rx}
            ry={qrData.brandBadge.inner.rx}
            fill="none"
            stroke="#E8BF74"
            strokeWidth="1.25"
            strokeOpacity="0.75"
          />

          {/* CarVision / Veloce Precision Monogram (Wings & Apex) */}
          <g
            transform={`translate(${qrData.brandBadge.centerX}, ${qrData.brandBadge.centerY}) scale(${
              qrData.brandBadge.inner.size / 48
            })`}
          >
            {/* Aerodynamic Speed Apex */}
            <circle cx="0" cy="-10.5" r="2.2" fill="#E8BF74" />

            {/* Stylized Veloce Wings / Chevron */}
            <path
              d="M -13 -4.5 L 0 13.5 L 13 -4.5 L 8 -4.5 L 0 6.5 L -8 -4.5 Z"
              fill="#E8BF74"
            />

            {/* Subtle Horizon Line */}
            <line
              x1="-9"
              y1="-8"
              x2="9"
              y2="-8"
              stroke="#E8BF74"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />
          </g>
        </g>
      )}
    </svg>
  );
}
