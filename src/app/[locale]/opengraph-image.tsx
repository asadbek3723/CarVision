import { ImageResponse } from 'next/og';

export const alt = 'CarVision — AI Car Tuning Visualizer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Brand preview card for Telegram, WhatsApp, Facebook, X, LinkedIn (1200x630). */
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'linear-gradient(135deg, #0A0B0F 0%, #14161D 60%, #1D1A12 100%)',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 14, height: 14, borderRadius: 14, background: '#E8BF74' }} />
          <div style={{ fontSize: 30, letterSpacing: 8, color: '#E8BF74', textTransform: 'uppercase' }}>AI Tuning</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 132, fontWeight: 700, letterSpacing: -3, color: '#E6C687' }}>CarVision</div>
          <div style={{ fontSize: 46, marginTop: 12, color: 'rgba(255,255,255,0.85)' }}>AI Car Tuning Visualizer</div>
          <div style={{ fontSize: 30, marginTop: 20, color: 'rgba(255,255,255,0.5)' }}>
            Wheels · Body kits · Wraps — preview before you buy
          </div>
        </div>
        <div style={{ height: 6, width: 220, background: '#E8BF74', borderRadius: 6 }} />
      </div>
    ),
    size
  );
}
