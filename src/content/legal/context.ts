import { supportEmail } from '@/lib/seo/social';
import { CANCEL_REFUND_BPS, CANCEL_WINDOW_HOURS, PLATFORM_COMMISSION_BPS } from '@/domain/money';

/**
 * Facts the legal texts quote. Business numbers come from the code that enforces them, so the
 * documents can never promise something different from what the platform does.
 *
 * Operator details: fill in the registered legal name, TIN (STIR) and address once known.
 */
export const OPERATOR = {
  /** Trade name shown in the footer. */
  name: 'TRICORP AGENCY',
  brand: 'CarVision',
  site: 'www.carvision.uz',
  /** Leave null until registered: the documents then omit the line instead of printing a placeholder. */
  tin: null as string | null,
  legalAddress: null as string | null,
} as const;

export interface LegalContext {
  operator: string;
  brand: string;
  site: string;
  tin: string | null;
  legalAddress: string | null;
  email: string | null;
  commissionPct: number;
  cancelHours: number;
  refundPct: number;
  retainedPct: number;
  otpMinutes: number;
  otpAttempts: number;
}

export function legalContext(): LegalContext {
  const refundPct = CANCEL_REFUND_BPS / 100;
  return {
    operator: OPERATOR.name,
    brand: OPERATOR.brand,
    site: OPERATOR.site,
    tin: OPERATOR.tin,
    legalAddress: OPERATOR.legalAddress,
    email: supportEmail(),
    commissionPct: PLATFORM_COMMISSION_BPS / 100,
    cancelHours: CANCEL_WINDOW_HOURS,
    refundPct,
    retainedPct: 100 - refundPct,
    otpMinutes: 5,
    otpAttempts: 5,
  };
}
