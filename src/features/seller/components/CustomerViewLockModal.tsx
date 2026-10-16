'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Lock, Unlock, ShieldAlert } from 'lucide-react';

export interface CustomerViewLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLocked: boolean;
  onToggleLock: (pin: string) => boolean;
}

export function CustomerViewLockModal({
  isOpen,
  onClose,
  isLocked,
  onToggleLock
}: CustomerViewLockModalProps) {
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError(true);
      return;
    }
    const success = onToggleLock(pin);
    if (success) {
      setPin('');
      setError(false);
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isLocked ? 'Staff PIN Unlock' : 'Lock Customer View'}
      description={
        isLocked
          ? 'Enter your 4-digit workshop PIN to unlock staff controls and settings.'
          : 'Set a 4-digit PIN before handing the tablet to the walk-in customer. Hides credits, wholesale prices, and settings.'
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col items-center p-2">
        <div className="w-14 h-14 rounded-2xl bg-[#181B22] border border-[#232733] flex items-center justify-center text-accent-cyan mb-6 shadow-inner">
          {isLocked ? <Unlock className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
        </div>

        <div className="w-full max-w-xs mb-6">
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              setError(false);
              setPin(e.target.value.replace(/\D/g, ''));
            }}
            placeholder="••••"
            className="w-full text-center text-3xl font-mono tracking-[1em] py-3 rounded-xl bg-[#0A0B0F] border border-[#232733] text-white focus:outline-none focus:border-accent-cyan transition-colors"
            autoFocus
          />
          {error && (
            <p className="text-xs text-red-400 mt-2 text-center flex items-center justify-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Incorrect PIN. Try again.
            </p>
          )}
        </div>

        <Button type="submit" variant="primary" className="w-full h-12">
          {isLocked ? 'Unlock Staff View' : 'Lock Tablet'}
        </Button>
      </form>
    </Modal>
  );
}
