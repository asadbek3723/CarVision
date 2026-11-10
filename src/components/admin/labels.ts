/** Audit actions and failed-attempt kinds that have a translation in `adm.actions` / `adm.attempts`. */
const ACTIONS = new Set([
  'ADMIN_LOGIN',
  'ASSIGN_PLAN',
  'ADJUST_CREDITS',
  'BAN_USER',
  'UNBAN_USER',
  'VERIFY_SHOP',
  'UNVERIFY_SHOP',
  'APPROVE_DEPOSIT',
  'REJECT_DEPOSIT',
  'APPROVE_PAYMENT',
  'REJECT_PAYMENT',
  'MARK_PAYOUT_PAID',
  'MARK_REFUND_DONE',
  'SET_BANNER',
  'REMOVE_BANNER',
  'ADMIN_LOGOUT',
  'OPEN_GARAGE',
  'REFUND_REJECTED',
  'SET_PAYOUT_DETAILS',
]);
const ATTEMPTS = new Set(['login', 'admin_pin', 'register', 'otp', 'camera_session', 'redeem_code']);

type Translate = (key: string) => string;

/** `t` is `useTranslations('adm.actions')`; unknown actions are shown as-is. */
export function actionLabel(t: Translate, action: string): string {
  return ACTIONS.has(action) ? t(action) : action;
}

/** `t` is `useTranslations('adm.attempts')`. */
export function attemptLabel(t: Translate, kind: string): string {
  return ATTEMPTS.has(kind) ? t(kind) : kind;
}
