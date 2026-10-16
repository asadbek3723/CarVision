'use client';

import * as React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Tablet, Smartphone, Laptop, LogOut } from 'lucide-react';

export interface ActiveDeviceRecord {
  id: string;
  shopName: string;
  deviceLabel: string;
  platform: 'ios' | 'android' | 'desktop';
  lastSeen: string;
}

const DEMO_DEVICES: ActiveDeviceRecord[] = [
  {
    id: 'dev-01',
    shopName: 'Autotune Pro Tashkent',
    deviceLabel: 'iPad 10th Gen (Front Bay)',
    platform: 'ios',
    lastSeen: '10s ago',
  },
  {
    id: 'dev-02',
    shopName: 'Autotune Pro Tashkent',
    deviceLabel: 'Samsung Galaxy Tab S9 (Dyno Room)',
    platform: 'android',
    lastSeen: '25s ago',
  },
  {
    id: 'dev-03',
    shopName: 'Dubai Custom Wheels',
    deviceLabel: 'MacBook Pro 16" (Admin Desk)',
    platform: 'desktop',
    lastSeen: '1m ago',
  },
];

export function DeviceQuotaInspector() {
  const [devices, setDevices] = React.useState<ActiveDeviceRecord[]>(DEMO_DEVICES);

  const handleEvict = (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    console.info(`Device ${id} evicted from active quota`);
  };

  const getPlatformIcon = (platform: ActiveDeviceRecord['platform']) => {
    switch (platform) {
      case 'ios':
        return <Tablet className="w-5 h-5 text-accent-cyan" />;
      case 'android':
        return <Smartphone className="w-5 h-5 text-accent-green" />;
      default:
        return <Laptop className="w-5 h-5 text-white" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tablet className="w-5 h-5 text-accent-cyan" />
          <h3 className="text-lg font-bold text-white">Active Device Session Inspector</h3>
        </div>
        <span className="text-xs text-[#94A3B8]">{devices.length} active sessions</span>
      </div>

      <div className="space-y-3">
        {devices.map((device) => (
          <GlassCard key={device.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0A0B0F] border border-[#232733] flex items-center justify-center shrink-0">
                {getPlatformIcon(device.platform)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{device.deviceLabel}</h4>
                <p className="text-xs text-[#94A3B8]">
                  {device.shopName} • Last heartbeat: <span className="text-accent-cyan">{device.lastSeen}</span>
                </p>
              </div>
            </div>

            <Button
              onClick={() => handleEvict(device.id)}
              variant="secondary"
              size="sm"
              className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <LogOut className="w-3.5 h-3.5 me-1" /> Evict Session
            </Button>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
